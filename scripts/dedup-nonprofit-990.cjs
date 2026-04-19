#!/usr/bin/env node
/**
 * dedup-nonprofit-990.cjs
 *
 * Cleans up data quality in the 990 ingest outputs:
 *   1. Dedupes filings by (ein, tax_year, tax_period_end, return_type).
 *      When collisions exist (IRS ships same return in both download990xml
 *      and TEOS_XML zip series, or original+amended returns), keeps the
 *      filing with the most grant rows, then highest total_revenue, then
 *      highest total_assets.
 *   2. Re-emits grants.jsonl from the surviving filings only, deduping
 *      within a filing on (recipient_name, recipient_ein, amount, purpose)
 *      in case the filing itself repeats a grant.
 *   3. Normalizes names: decodes HTML entities (&amp; &#39; &quot;), trims,
 *      collapses whitespace, uppercases. Adds grantor_name_normalized and
 *      recipient_name_normalized alongside the original-casing fields.
 *
 * Idempotent. Overwrites outputs in place after writing to .clean tempfiles.
 *
 * Inputs:  C:\donor-map-data\fec\nonprofit-990.jsonl
 *          C:\donor-map-data\fec\nonprofit-grants.jsonl
 * Outputs: same paths, cleaned.
 */

const fs = require('fs');
const readline = require('readline');

const FILINGS = 'C:\\donor-map-data\\fec\\nonprofit-990.jsonl';
const GRANTS = 'C:\\donor-map-data\\fec\\nonprofit-grants.jsonl';

function normName(s) {
  if (!s) return '';
  let n = String(s)
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  // Canonicalize " AND " <-> " & " so ampersand spellings merge.
  // Applied word-boundary-safe so "BRAND" etc. don't get eaten.
  n = n.replace(/\s+AND\s+/g, ' & ');
  // Strip trailing organizational suffixes that don't change entity identity.
  // Conservative list; intentionally leaves e.g. "TRUST" and "FUND" in place
  // because those change meaning ("Marble Freedom Trust" != "Marble Freedom").
  n = n.replace(/,?\s+(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LLC|LLP|LTD|LIMITED)\.?$/i, '');
  // Collapse any resulting double spaces and trailing punctuation.
  n = n.replace(/\s+/g, ' ').replace(/[.,;:]+$/, '').trim();
  return n;
}

function pickBetter(a, b) {
  const ga = a.grants?.length || 0;
  const gb = b.grants?.length || 0;
  if (ga !== gb) return ga > gb ? a : b;
  if ((a.total_revenue || 0) !== (b.total_revenue || 0)) {
    return (a.total_revenue || 0) > (b.total_revenue || 0) ? a : b;
  }
  return (a.total_assets || 0) >= (b.total_assets || 0) ? a : b;
}

(async function main() {
  const t0 = Date.now();
  console.log('[dedup-nonprofit-990] loading filings...');

  const byKey = new Map();
  let rawCount = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(FILINGS) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    rawCount++;
    const f = JSON.parse(line);
    const key = [f.ein, f.tax_year, f.tax_period_end, f.return_type].join('|');
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickBetter(existing, f) : f);
  }
  console.log(`  raw: ${rawCount} filings -> deduped: ${byKey.size} (removed ${rawCount - byKey.size})`);

  const filingsTmp = FILINGS + '.clean';
  const grantsTmp = GRANTS + '.clean';
  const filingsOut = fs.createWriteStream(filingsTmp);
  const grantsOut = fs.createWriteStream(grantsTmp);

  let grantRows = 0;
  let dupGrantsDropped = 0;

  for (const f of byKey.values()) {
    const grantorNorm = normName(f.filer_name);
    const cleaned = { ...f, filer_name_normalized: grantorNorm };
    filingsOut.write(JSON.stringify(cleaned) + '\n');

    if (!Array.isArray(f.grants) || f.grants.length === 0) continue;

    const seenGrants = new Set();
    for (const g of f.grants) {
      const recNorm = normName(g.recipient_name);
      const dedupKey = [recNorm, g.recipient_ein || '', g.total, (g.purpose || '').trim()].join('|');
      if (seenGrants.has(dedupKey)) { dupGrantsDropped++; continue; }
      seenGrants.add(dedupKey);
      grantsOut.write(JSON.stringify({
        grantor_ein: f.ein,
        grantor_name: f.filer_name,
        grantor_name_normalized: grantorNorm,
        tax_year: f.tax_year,
        recipient_name: g.recipient_name,
        recipient_name_normalized: recNorm,
        recipient_ein: g.recipient_ein,
        recipient_irs_section: g.recipient_irs_section,
        amount: g.total,
        purpose: g.purpose,
      }) + '\n');
      grantRows++;
    }
  }

  await new Promise(r => filingsOut.end(r));
  await new Promise(r => grantsOut.end(r));

  fs.renameSync(filingsTmp, FILINGS);
  fs.renameSync(grantsTmp, GRANTS);

  console.log(`  grants emitted: ${grantRows} (dropped ${dupGrantsDropped} intra-filing dupes)`);
  console.log(`[done] ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`[out] ${FILINGS}`);
  console.log(`[out] ${GRANTS}`);
})().catch(err => { console.error(err); process.exit(1); });
