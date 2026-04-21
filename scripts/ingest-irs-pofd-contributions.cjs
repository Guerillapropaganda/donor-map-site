#!/usr/bin/env node
/**
 * ingest-irs-pofd-contributions.cjs
 *
 * Reads the IRS POFD (Political Organization Filing & Disclosure)
 * FullDataFile.txt pipe-delimited bulk file and emits edges for:
 *
 *   A records (Schedule A contributors → 527):
 *     donor_name → 527_org_name (if EIN matches vault entity)
 *     type=monetary, role=527-contribution, source=irs-pofd-8872
 *
 *   B records (Schedule B expenditures from 527 → recipient):
 *     527_org_name → recipient_name (where either side matches vault)
 *     type=monetary, role=527-expenditure, source=irs-pofd-8872
 *
 * The POFD file covers ~17M transactions across 2000–present. Unlike
 * the FEC, which only tracks federal, POFD covers ANY 527 political
 * organization, including state-level ones. Critical for closing the
 * state-level politician edges the FEC misses (Greg Abbott, Glenn
 * Youngkin, etc.) and dark-money flows to 527s.
 *
 * Aggregates by (from, to, report_year) to keep edge count manageable.
 *
 * Usage:
 *   node --max-old-space-size=12288 scripts/ingest-irs-pofd-contributions.cjs --write
 *   (without --write: aggregate counts only, no edges written)
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');
const { upsertEdges } = require('./lib/relationships-store.cjs');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const POFD_FILE = 'C:/donor-map-data/bulk/PolOrgsFullData/var/IRS/data/scripts/pofd/download/FullDataFile.txt';
const WRITE = process.argv.includes('--write');
const MIN_AMOUNT = 1000; // skip small contributions/expenditures below $1K

function normName(s) {
  return (s || '').toUpperCase()
    .replace(/['\u2019\u2018\x60]/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\b(INC|INCORPORATED|LLC|LP|LLP|CORP|CORPORATION|CO|COMPANY|FOUNDATION|FUND|COMMITTEE|PAC|THE|OF|FOR|AND)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async function main() {
  console.log(`[ingest-irs-pofd-contributions] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Build vault indexes: EIN → entity, normalized name → entity.
  const ents = loadEntities();
  const einToEntity = new Map();
  const nameToEntity = new Map();
  for (const e of ents) {
    if (e.signals?.ein) einToEntity.set(String(e.signals.ein).replace(/\D/g, ''), e);
    const n = normName(e.name);
    if (n && n.length >= 3 && !nameToEntity.has(n)) nameToEntity.set(n, e);
    const firstWord = n.split(' ')[0];
    if (firstWord && firstWord.length >= 5 && !nameToEntity.has(firstWord)) nameToEntity.set(firstWord, e);
  }
  console.log(`  vault index: ${einToEntity.size} by EIN, ${nameToEntity.size} by name-token`);

  // Aggregate in memory: key = from|to|year, value = {from, to, amount, count, role}
  const agg = new Map();
  let scannedA = 0, scannedB = 0, emittedA = 0, emittedB = 0, skipAmt = 0;

  const rl = readline.createInterface({ input: fs.createReadStream(POFD_FILE) });
  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount % 500_000 === 0) {
      console.log(`    ...scanned ${(lineCount / 1e6).toFixed(1)}M lines, agg size=${agg.size.toLocaleString()}`);
    }
    if (!line || !line.length) continue;
    const rec = line[0];
    if (rec !== 'A' && rec !== 'B') continue;
    const cols = line.split('|');

    if (rec === 'A') {
      // A|report_id|seq|org_name|org_EIN|contributor_name|...|employer(12)|amount(13)|occupation(14)|agg_ytd(15)
      scannedA++;
      if (cols.length < 14) continue;
      const orgEin = cols[4];
      const contribName = cols[5];
      const amt = Number(cols[13]) || 0;
      if (amt < MIN_AMOUNT) { skipAmt++; continue; }
      const orgEntity = einToEntity.get(String(orgEin).replace(/\D/g, ''));
      if (!orgEntity) continue; // receiver must be vault-known
      // A record = contributor → org. Use raw contributor name if no
      // vault match (individuals typically won't be in vault).
      const contribEnt = nameToEntity.get(normName(contribName));
      const from = contribEnt ? contribEnt.name : contribName;
      const fromType = contribEnt?.entity_type || 'donor';
      // Year from report_id is not reliable; use 2000s-era timestamp from
      // the containing 2-record instead. For now, aggregate all cycles
      // under a single edge per (from,to) — we can refine later with
      // an extra pass that looks up report_id → period_end.
      const key = `${from}|${orgEntity.name}|527-contribution`;
      const cur = agg.get(key) || { from, to: orgEntity.name, fromType, toType: orgEntity.entity_type, role: '527-contribution', amount: 0, count: 0 };
      cur.amount += amt;
      cur.count += 1;
      agg.set(key, cur);
      emittedA++;
    } else {
      // B|report_id|seq|org_name|org_EIN|recipient_name|addr1(6)|addr2(7)|city(8)|state(9)|zip(10)|(11)|employer(12)|amount(13)|purpose(14)|...
      scannedB++;
      if (cols.length < 14) continue;
      const orgEin = cols[4];
      const orgName = cols[3];
      const recipName = cols[5];
      const amt = Number(cols[13]) || 0;
      if (amt < MIN_AMOUNT) { skipAmt++; continue; }
      // Resolve both sides. Either side matching to a vault entity is
      // enough to emit; the unmatched side falls back to raw POFD name
      // (so we preserve the flow even when one endpoint is off-vault).
      const orgEntity = einToEntity.get(String(orgEin).replace(/\D/g, ''));
      const recipEnt = nameToEntity.get(normName(recipName));
      // Skip only if NEITHER side is in vault.
      if (!orgEntity && !recipEnt) continue;
      const from = orgEntity ? orgEntity.name : orgName;
      const to = recipEnt ? recipEnt.name : recipName;
      const fromType = orgEntity ? orgEntity.entity_type : 'donor';
      const toType = recipEnt ? recipEnt.entity_type : 'politician';
      const key = `${from}|${to}|527-expenditure`;
      const cur = agg.get(key) || { from, to, fromType, toType, role: '527-expenditure', amount: 0, count: 0 };
      cur.amount += amt;
      cur.count += 1;
      agg.set(key, cur);
      emittedB++;
    }
  }

  console.log(`\n  scanned: A=${scannedA.toLocaleString()}, B=${scannedB.toLocaleString()}`);
  console.log(`  skipped (below $${MIN_AMOUNT}): ${skipAmt.toLocaleString()}`);
  console.log(`  contributing to agg: A=${emittedA.toLocaleString()}, B=${emittedB.toLocaleString()}`);
  console.log(`  unique edges: ${agg.size.toLocaleString()}`);

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  const nowIso = new Date().toISOString();
  const edges = [];
  for (const a of agg.values()) {
    const edge = {
      from: a.from,
      to: a.to,
      from_type: a.fromType,
      to_type: a.toType,
      type: 'monetary',
      role: a.role,
      direction: 'directed',
      confidence: 0.9,
      amount: Math.round(a.amount),
      cycle: '', // aggregated across all cycles for now
      source: 'irs-pofd-8872',
      source_url: 'https://forms.irs.gov/app/pod/dataDownload/dataDownload',
      evidence: [`IRS 8872 ${a.role === '527-contribution' ? 'Schedule A' : 'Schedule B'}, ${a.count} transactions`],
      metadata: { txn_count: a.count },
      status: 'active',
      first_seen: nowIso,
      last_verified: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    };
    edge.id = computeEdgeId(edge);
    edges.push(edge);
  }

  console.log('\n  upserting in chunks of 100K...');
  const CHUNK = 100_000;
  let added = 0, updated = 0, invalid = 0;
  for (let i = 0; i < edges.length; i += CHUNK) {
    const slice = edges.slice(i, i + CHUNK);
    const res = upsertEdges(slice, { source: 'irs-pofd-8872' });
    added += res.added; updated += res.updated; invalid += res.invalid;
    console.log(`    ${Math.min(i + CHUNK, edges.length).toLocaleString()}/${edges.length.toLocaleString()} ... +${res.added} / ~${res.updated} / ✗${res.invalid}`);
  }
  console.log(`\n  total: added=${added}, updated=${updated}, invalid=${invalid}`);
})().catch((e) => { console.error(e); process.exit(1); });
