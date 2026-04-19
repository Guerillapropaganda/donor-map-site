#!/usr/bin/env node
/**
 * cross-check-totals.cjs
 *
 * Integrity check: for every committee with a known fec_committee_id,
 * verify that our edge-store total matches the upstream indiv-by-
 * committee.jsonl sum within tolerance. Drift indicates silent
 * truncation somewhere in the query stack, a data-ingest regression,
 * or an edge-pruning bug.
 *
 * This was built after two silent-truncation bugs slipped past manual
 * review — first the main-query limit in /api/ask, then the vehicle-
 * query limit. Automating the cross-check means the next regression
 * surfaces as a test failure, not as a user-visible "my numbers are
 * way off" report.
 *
 * What it checks:
 *   For each committee with a resolved fec_committee_id:
 *     edge_sum   = sum of amount across edges TO this entity (active,
 *                  role != ie-oppose)
 *     source_sum = sum of amount across indiv-by-committee.jsonl rows
 *                  for that cmte_id (+ PAS2 via pas2-direct-donors if
 *                  available)
 *   Flag if |edge_sum - source_sum| / source_sum > TOLERANCE.
 *
 * Usage:
 *   node scripts/cross-check-totals.cjs              # top 50 committees
 *   node scripts/cross-check-totals.cjs --all        # every matched committee
 *   node scripts/cross-check-totals.cjs --tolerance 0.05  # 5% drift threshold
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const INDIV_FILE = path.join(FEC_ROOT, 'indiv-by-committee.jsonl');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const CHECK_ALL = args.includes('--all');
const TOLERANCE = parseFloat(argVal('--tolerance', '0.10')); // 10% default
const MIN_AMOUNT = parseFloat(argVal('--min', '1000000')); // only committees with ≥$1M

(async function main() {
  console.log(`[cross-check-totals] tolerance=${(TOLERANCE * 100).toFixed(0)}% min=$${(MIN_AMOUNT / 1e6).toFixed(1)}M\n`);

  // Map cmte_id → vault entity. Mirrors aggregate-indiv-to-edges
  // resolution so our cross-check covers the same committees the
  // aggregator did — otherwise we'd only reconcile committees with
  // explicit fec_committee_id signals (332) and miss the bulk of
  // committees that resolve via fec-committee-registry.json
  // vault_profile paths.
  const ents = loadEntities();
  const cmteToEntity = new Map();
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    if (!e.signals) continue;
    if (e.signals.fec_committee_id) cmteToEntity.set(e.signals.fec_committee_id, e);
    if (Array.isArray(e.signals.fec_committee_ids)) {
      for (const cid of e.signals.fec_committee_ids) {
        if (!cmteToEntity.has(cid)) cmteToEntity.set(cid, e);
      }
    }
  }
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'fec-committee-registry.json'), 'utf-8'));
  const entByPath = new Map(ents.filter((e) => e.profile_path).map((e) => [e.profile_path, e]));
  for (const [cmteId, r] of Object.entries(registry)) {
    if (cmteToEntity.has(cmteId)) continue;
    if (r.vault_profile && entByPath.has(r.vault_profile)) {
      const ent = entByPath.get(r.vault_profile);
      if (ent.entity_type !== 'politician') cmteToEntity.set(cmteId, ent);
    }
  }
  console.log(`  cmte_id → entity mappings: ${cmteToEntity.size}`);

  // Aggregate indiv data by entity name (matches how aggregate-indiv-to-edges
  // resolves them). This is our upstream "truth" for the donor-side total.
  const sourceSumByEntity = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(INDIV_FILE) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const ent = cmteToEntity.get(r.cmte_id);
    if (!ent) continue;
    sourceSumByEntity.set(ent.name, (sourceSumByEntity.get(ent.name) || 0) + (Number(r.total) || 0));
  }

  // Compare against edge-store total
  const edges = loadEdges();
  const edgeSumByEntity = new Map();
  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (!e.amount) continue;
    if (e.role === 'ie-oppose') continue;
    if (e.status === 'deprecated') continue;
    if (e.source !== 'fec-indiv-by-committee') continue; // only compare against indiv source
    edgeSumByEntity.set(e.to, (edgeSumByEntity.get(e.to) || 0) + Number(e.amount));
  }

  // Build comparison rows
  const rows = [];
  for (const [name, sourceSum] of sourceSumByEntity) {
    if (sourceSum < MIN_AMOUNT) continue;
    const edgeSum = edgeSumByEntity.get(name) || 0;
    const delta = sourceSum > 0 ? Math.abs(edgeSum - sourceSum) / sourceSum : 0;
    rows.push({ name, sourceSum, edgeSum, delta, status: delta <= TOLERANCE ? 'OK' : 'DRIFT' });
  }
  rows.sort((a, b) => b.sourceSum - a.sourceSum);

  const display = CHECK_ALL ? rows : rows.slice(0, 50);

  console.log(`\nChecking ${display.length} committees (of ${rows.length} total ≥$${(MIN_AMOUNT / 1e6).toFixed(1)}M):\n`);
  const pad = (s, n) => (s + '').padStart(n);
  console.log(pad('source $', 10) + '  ' + pad('edge $', 10) + '  ' + pad('delta', 6) + '  status  name');
  console.log('─'.repeat(80));

  let okCount = 0, driftCount = 0;
  for (const r of display) {
    const driftPct = (r.delta * 100).toFixed(1) + '%';
    const marker = r.status === 'OK' ? '  ✓  ' : '  ✗  ';
    if (r.status === 'OK') okCount++; else driftCount++;
    console.log(
      pad('$' + (r.sourceSum / 1e6).toFixed(1) + 'M', 10) + '  ' +
      pad('$' + (r.edgeSum / 1e6).toFixed(1) + 'M', 10) + '  ' +
      pad(driftPct, 6) + marker + r.name
    );
  }

  console.log('\n' + '─'.repeat(80));
  console.log(`  ✓ within ±${(TOLERANCE * 100).toFixed(0)}%: ${okCount}`);
  console.log(`  ✗ DRIFT: ${driftCount}`);

  if (driftCount > 0) {
    console.log(`\nDrift indicates: silent truncation in a query path, stale edge data,`);
    console.log(`a deprecated/pruned edge subset, or an ingest that never ran.`);
    process.exitCode = 1; // non-zero so CI can catch regressions
  } else {
    console.log(`\nAll committees reconcile cleanly.`);
  }
})();
