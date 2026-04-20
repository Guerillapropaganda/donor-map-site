#!/usr/bin/env node
/**
 * corp-federal-id-backfill.cjs
 *
 * Closes the "no-federal-identifier" gap for corporation entities by:
 *
 *   1. Fuzzy-matching the corp name against committee-master.jsonl's
 *      connected_org AND committee name fields — a corp with a federal
 *      PAC shows up under one or both. Populates signals.fec_committee_id.
 *
 *   2. Classifying unmatchable corps by name pattern:
 *      - industry-bloc aggregations (Crypto Industry, Real Estate
 *        Development Industry Bloc) → ein_coverage_expected=false
 *      - family-owned entities (Trump Organization) → explain as
 *        private-holding
 *      - tech/crypto/finance companies that need SEC EDGAR CIK —
 *        flag needs_sec_edgar_cik so the next download step knows
 *        what's missing
 *
 * Dry-run by default. --write applies.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const FEC_ROOT = 'C:/donor-map-data/fec';
const SEC_TICKERS_FILE = 'C:/donor-map-data/bulk/company_tickers.json';
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// Normalize corp names for fuzzy matching. Strip corporate-form words
// (Inc, LLC, Corp, Company) and common filler (The, Of, Inc.'s various
// forms) so "Meta Platforms" matches "META PLATFORMS, INC." etc.
function normalize(s) {
  return (s || '').toUpperCase()
    // Drop apostrophes and quotes entirely (no space), so McDonald's
    // normalizes to MCDONALDS (matching the vault "McDonalds Corporation").
    .replace(/['’‘`]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|THE|OF|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Split a corp name on "-" and take parts (e.g. "Google - Alphabet" →
// ["Google", "Alphabet"]), and also emit individual words for broader
// match. Used to match against committee-master.
function corpSearchTerms(name) {
  const terms = new Set();
  terms.add(normalize(name));
  // Split on " - " or "/" to handle multi-brand vault names.
  for (const part of name.split(/\s+[-/]\s+/)) {
    const p = normalize(part);
    if (p.length >= 3) terms.add(p);
  }
  return [...terms].filter((t) => t.length >= 3);
}

function classifyCorp(name) {
  if (/\b(industry|bloc|sector|network|alliance)\b/i.test(name)
      && !/\bfund|foundation\b/i.test(name)) return 'aggregation';
  if (/\btrump (organization|media)\b/i.test(name)) return 'private-holding';
  if (/\bfamily\b/i.test(name) && !/\bfamily of \b/i.test(name)) return 'family-holding';
  // Tech, crypto, finance corps that have no federal PAC but exist in
  // SEC EDGAR. Flag so the next download step knows what to fetch.
  return 'needs-sec-edgar';
}

(async function main() {
  console.log(`[corp-federal-id-backfill] ${WRITE ? 'WRITE' : 'dry-run'}\n`);

  // Build committee-master indexes by connected_org and committee name,
  // each stored as a list of {id, ...} under multiple normalized key
  // forms (full + first-2-words + first-word).
  console.log('  loading committee-master.jsonl...');
  const cmteByKey = new Map(); // normalized key → array of {id, connected_org, name}
  function indexUnder(key, rec) {
    if (!key || key.length < 4) return;
    if (!cmteByKey.has(key)) cmteByKey.set(key, []);
    const bucket = cmteByKey.get(key);
    if (!bucket.some((x) => x.id === rec.id)) bucket.push(rec);
  }
  {
    const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'committee-master.jsonl')) });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        if (!r.id) continue;
        const rec = { id: r.id, connected_org: r.connected_org || '', name: r.name || '' };
        // Index each candidate source-name: connected_org and committee name.
        for (const src of [r.connected_org, r.name]) {
          if (!src) continue;
          const full = normalize(src);
          indexUnder(full, rec);
          // Also index under first 2 normalized words so "META PLATFORMS"
          // matches vault name "Meta - Facebook" → search term "META".
          const words = full.split(' ').filter(Boolean);
          if (words.length >= 2) indexUnder(words.slice(0, 2).join(' '), rec);
          if (words.length >= 1 && words[0].length >= 4) indexUnder(words[0], rec);
        }
      } catch {}
    }
  }
  console.log(`  committee-master unique keys: ${cmteByKey.size}`);

  // Load SEC EDGAR ticker file: JSON map of {"0": {cik_str, ticker, title}, ...}
  // Every SEC-registered public company. Used to populate signals.sec_cik
  // + signals.ticker for corps lacking FEC identifiers.
  console.log('  loading SEC EDGAR company_tickers.json...');
  const secByName = new Map();   // normalized title → {cik, ticker, title}
  const secByTicker = new Map(); // ticker → same
  try {
    const raw = JSON.parse(fs.readFileSync(SEC_TICKERS_FILE, 'utf-8'));
    for (const k of Object.keys(raw)) {
      const r = raw[k];
      if (!r.cik_str || !r.title) continue;
      const cik = String(r.cik_str).padStart(10, '0');
      const rec = { cik, ticker: r.ticker, title: r.title };
      const n = normalize(r.title);
      if (n.length >= 3 && !secByName.has(n)) secByName.set(n, rec);
      // Also first-2-words form so "META PLATFORMS" can match "Meta - Facebook".
      const words = n.split(' ').filter(Boolean);
      if (words.length >= 2) {
        const k2 = words.slice(0, 2).join(' ');
        if (!secByName.has(k2)) secByName.set(k2, rec);
      }
      if (r.ticker) secByTicker.set(r.ticker.toUpperCase(), rec);
    }
  } catch (e) {
    console.log(`  WARN: could not load SEC tickers (${e.message}) — skipping SEC step`);
  }
  console.log(`  SEC registered companies indexed: ${secByName.size}`);

  const ents = loadEntities();
  const corps = ents.filter((e) => e.entity_type === 'corporation');
  const needsWork = corps.filter((e) => {
    const s = e.signals || {};
    return !s.fec_committee_id && !(s.fec_committee_ids || []).length && !s.uei && !s.ein;
  });
  console.log(`\n  corporations: ${corps.length} (no-federal-id: ${needsWork.length})\n`);

  const updates = new Map();
  const counts = { fec_matched: 0, sec_matched: 0, aggregation: 0, private_holding: 0, family_holding: 0, needs_sec_edgar: 0 };

  for (const e of needsWork) {
    const terms = corpSearchTerms(e.name);
    // Look for a committee-master match. To avoid false positives
    // (e.g. "Ripple" (crypto) matching "RIPPLE OF HOPE PAC INC"), we
    // REQUIRE the connected_org field to start with the search term —
    // connected_org is FEC's authoritative "this PAC belongs to this
    // organization" field. We will NOT rely on committee name alone
    // (committee names often contain the company name incidentally).
    let bestMatch = null;
    for (const t of terms) {
      const hits = cmteByKey.get(t) || [];
      for (const h of hits) {
        const connNorm = normalize(h.connected_org);
        if (connNorm && (connNorm === t || connNorm.startsWith(t + ' '))) {
          bestMatch = h;
          break;
        }
      }
      if (bestMatch) break;
    }

    if (bestMatch) {
      updates.set(e.name, {
        fec_committee_id: bestMatch.id,
        fec_committee_id_source: `cmte-master:${bestMatch.connected_org || bestMatch.name}`,
      });
      counts.fec_matched++;
      continue;
    }

    // 1b. SEC EDGAR CIK lookup. Try each normalized search term; require
    // a match — secByName keys were built from first-2-words + full so
    // "META PLATFORMS" lands Meta. Reject obvious false positives where
    // the vault name is much shorter than the SEC title prefix would
    // imply (e.g. single-word vault name "APPLE" matching some SEC
    // record "APPLE HOSPITALITY REIT INC" — we require at least the
    // first SEC title word to equal the vault term).
    let secHit = null;
    for (const t of terms) {
      const hit = secByName.get(t);
      if (hit) {
        const hitFirstWord = normalize(hit.title).split(' ')[0];
        const termFirstWord = t.split(' ')[0];
        if (hitFirstWord === termFirstWord) { secHit = hit; break; }
      }
    }
    if (secHit) {
      updates.set(e.name, {
        sec_cik: secHit.cik,
        ticker: secHit.ticker,
        sec_cik_source: `sec-edgar:${secHit.title}`,
      });
      counts.sec_matched++;
      continue;
    }

    // Classify unmatchable.
    const cat = classifyCorp(e.name);
    if (cat === 'aggregation') {
      updates.set(e.name, { federal_id_expected: false, federal_id_reason: 'industry-bloc-aggregation' });
      counts.aggregation++;
    } else if (cat === 'private-holding') {
      updates.set(e.name, { federal_id_expected: false, federal_id_reason: 'private-holding-no-federal-filings' });
      counts.private_holding++;
    } else if (cat === 'family-holding') {
      updates.set(e.name, { federal_id_expected: false, federal_id_reason: 'family-owned-entity' });
      counts.family_holding++;
    } else {
      // Don't mark these as "expected false" — they SHOULD have SEC or
      // FEC coverage, we just don't have local data to supply it. Mark
      // so the download-next step knows what to fetch.
      updates.set(e.name, { needs_sec_edgar_cik: true });
      counts.needs_sec_edgar++;
    }
  }

  console.log('  results:');
  console.log(`    FEC committee-id matched:              ${counts.fec_matched}`);
  console.log(`    SEC CIK matched:                       ${counts.sec_matched}`);
  console.log(`    industry-bloc aggregation:             ${counts.aggregation}`);
  console.log(`    private holding / family:              ${counts.private_holding + counts.family_holding}`);
  console.log(`    needs SEC EDGAR CIK (next download):   ${counts.needs_sec_edgar}`);
  console.log(`    total updates:                         ${updates.size}`);

  if (VERBOSE) {
    console.log('\n  sample 20 updates:');
    let i = 0;
    for (const [name, u] of updates) {
      if (i++ >= 20) break;
      const what = u.fec_committee_id ? `fec=${u.fec_committee_id} [${u.fec_committee_id_source}]` :
                   u.sec_cik ? `cik=${u.sec_cik} ticker=${u.ticker || '-'} [${u.sec_cik_source}]` :
                   u.federal_id_expected === false ? `expected=false (${u.federal_id_reason})` :
                   `needs-sec-edgar`;
      console.log(`    ${name} → ${what}`);
    }
  }

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  const text = fs.readFileSync(ENT_FILE, 'utf-8');
  const out = [];
  let touched = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(line); } catch { out.push(line); continue; }
    const u = updates.get(rec.name);
    if (!u) { out.push(line); continue; }
    rec.signals = rec.signals || {};
    if (u.fec_committee_id) {
      if (!rec.signals.fec_committee_ids) rec.signals.fec_committee_ids = [];
      if (!rec.signals.fec_committee_ids.includes(u.fec_committee_id)) {
        rec.signals.fec_committee_ids.push(u.fec_committee_id);
      }
      if (!rec.signals.fec_committee_id) rec.signals.fec_committee_id = u.fec_committee_id;
      rec.signals.fec_committee_id_sourced_from = u.fec_committee_id_source;
    }
    if (u.sec_cik) {
      rec.signals.sec_cik = u.sec_cik;
      if (u.ticker) rec.signals.ticker = u.ticker;
      rec.signals.sec_cik_sourced_from = u.sec_cik_source;
      // Clear the needs_sec_edgar_cik flag if previously set.
      delete rec.signals.needs_sec_edgar_cik;
    }
    if (u.federal_id_expected === false) {
      rec.signals.federal_id_expected = false;
      rec.signals.federal_id_reason = u.federal_id_reason;
    }
    if (u.needs_sec_edgar_cik) rec.signals.needs_sec_edgar_cik = true;
    rec.signals.federal_id_backfilled_at = new Date().toISOString();
    out.push(JSON.stringify(rec));
    touched++;
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));
  console.log(`\n  wrote: ${touched} entities updated in entities.jsonl`);
})();
