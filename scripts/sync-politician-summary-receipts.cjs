#!/usr/bin/env node
/**
 * sync-politician-summary-receipts.cjs
 *
 * Pulls cycle-level total-receipts numbers from candidate-summary.jsonl
 * (built by ingest-fec-weball-summary.cjs) and populates them on each
 * politician's entity record. Solves the "Bernie looks empty" problem
 * for small-dollar politicians whose itemized donor data is thin by
 * design.
 *
 * Per politician, populates:
 *   signals.fec_receipts_by_cycle      { "2020": 218907026, ... }
 *   signals.fec_receipts_lifetime      sum across all known cycles
 *   signals.fec_indiv_contrib_lifetime sum of ttl_indiv_contrib
 *   signals.fec_pac_contrib_lifetime   sum of other_pol_cmte_contrib
 *   signals.fec_summary_synced_at      ISO timestamp
 *
 * Matches via signals.fec_candidate_ids (populated by
 * politician-historical-coverage-backfill.cjs) — so we get every
 * historical cycle the politician competed in, not just their
 * current-cycle principal.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const SUMMARY_FILE = 'C:/donor-map-data/fec/candidate-summary.jsonl';
const WRITE = process.argv.includes('--write');

// Load the summary file into memory — 70K rows ≈ 26MB, trivial to hold.
console.log('  loading candidate-summary.jsonl...');
const byCandId = new Map();
for (const line of fs.readFileSync(SUMMARY_FILE, 'utf-8').split(/\r?\n/)) {
  if (!line.trim()) continue;
  try {
    const r = JSON.parse(line);
    if (!r.cand_id) continue;
    if (!byCandId.has(r.cand_id)) byCandId.set(r.cand_id, []);
    byCandId.get(r.cand_id).push(r);
  } catch {}
}
console.log(`  unique cand_ids in summary: ${byCandId.size}`);

const ents = loadEntities();
const updates = new Map();

for (const e of ents) {
  if (e.entity_type !== 'politician') continue;
  const s = e.signals || {};
  // Merge scalar + array forms that my earlier backfill populated
  const ids = new Set();
  if (s.fec_candidate_id) ids.add(s.fec_candidate_id);
  for (const id of (s.fec_candidate_ids || [])) ids.add(id);
  if (ids.size === 0) continue;

  const matching = [];
  for (const id of ids) {
    for (const row of (byCandId.get(id) || [])) matching.push(row);
  }
  if (matching.length === 0) continue;

  const byCycle = {};
  let lifetime = 0;
  let indivLifetime = 0;
  let pacLifetime = 0;
  for (const row of matching) {
    const c = String(row.cycle);
    byCycle[c] = (byCycle[c] || 0) + (row.ttl_receipts || 0);
    lifetime += row.ttl_receipts || 0;
    indivLifetime += row.ttl_indiv_contrib || 0;
    pacLifetime += row.other_pol_cmte_contrib || 0;
  }

  updates.set(e.name, {
    fec_receipts_by_cycle: byCycle,
    fec_receipts_lifetime: Math.round(lifetime),
    fec_indiv_contrib_lifetime: Math.round(indivLifetime),
    fec_pac_contrib_lifetime: Math.round(pacLifetime),
    fec_summary_synced_at: new Date().toISOString(),
  });
}

console.log(`  politicians gaining receipts data: ${updates.size}`);
console.log(`\n  sample (top 10 by lifetime):`);
const ranked = [...updates.entries()]
  .sort((a, b) => b[1].fec_receipts_lifetime - a[1].fec_receipts_lifetime)
  .slice(0, 10);
for (const [name, u] of ranked) {
  console.log(`    ${name.padEnd(30)}  lifetime=$${(u.fec_receipts_lifetime / 1e6).toFixed(0)}M  cycles=[${Object.keys(u.fec_receipts_by_cycle).sort().join(',')}]`);
}

if (!WRITE) {
  console.log(`\n  rerun with --write to apply.`);
  process.exit(0);
}

// Apply
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
  for (const [k, v] of Object.entries(u)) rec.signals[k] = v;
  out.push(JSON.stringify(rec));
  touched++;
}
fs.writeFileSync(ENT_FILE, out.join('\n'));
console.log(`\n  wrote ${touched} politician entities.`);
