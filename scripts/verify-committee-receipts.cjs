#!/usr/bin/env node
/**
 * verify-committee-receipts.cjs
 *
 * Tight per-committee, per-cycle reconciliation of edge-store receipts
 * vs FEC raw source data. The previous reconcile-canonical-totals.cjs
 * used ±50% hand-curated bounds ("in the neighborhood"); this one
 * tests for actual accuracy against authoritative upstream at the
 * transaction level.
 *
 * For each committee with a mapped vault entity, sums four derived
 * FEC source slices that together constitute total receipts:
 *
 *   indiv       — natural-person contributions ≥$200 (indiv-by-committee.jsonl)
 *   conduit     — small-dollar pass-throughs via ActBlue/WinRed (pas2-conduit.jsonl)
 *   transfers   — committee-to-committee transfers IN (oth-transfers.jsonl, dst_cmte_id)
 *   pac_gifts   — PAC contributions to candidate committees (pas2-direct-donors.jsonl,
 *                 matched via candidate-committees.jsonl → principal_cmte_id)
 *
 * Sum of those four per cycle = FEC-reported total receipts for the
 * committee. Compare to our edge store sum (all active monetary edges
 * TO the vault entity in that cycle, role != ie-oppose).
 *
 * The delta tells us exactly what we're missing or double-counting:
 *
 *   edge_sum > source_sum  → double-counting or stale edges
 *   edge_sum < source_sum  → missing ingest (haven't pulled this slice yet)
 *   edge_sum ≈ source_sum  → accurate
 *
 * Usage:
 *   node scripts/verify-committee-receipts.cjs                 # all mapped committees
 *   node scripts/verify-committee-receipts.cjs --cmte C00892471
 *   node scripts/verify-committee-receipts.cjs --cycle 2024
 *   node scripts/verify-committee-receipts.cjs --tolerance 0.05
 *   node scripts/verify-committee-receipts.cjs --strict        # exit 1 on any drift
 *   node scripts/verify-committee-receipts.cjs --top 20
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEdges } = require('./lib/relationships-store.cjs');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const STRICT = args.includes('--strict');
const VERBOSE = args.includes('--verbose');
const FILTER_CMTE = argVal('--cmte', null);
const FILTER_CYCLE = argVal('--cycle', null);
const TOLERANCE = parseFloat(argVal('--tolerance', '0.10'));
const TOP_N = parseInt(argVal('--top', '50'), 10);
const MIN_AMOUNT = parseFloat(argVal('--min', '1000000'));

// ─── Stream helpers ─────────────────────────────────────────────────
async function streamSum(file, keyFn, valueFn, cycleFn) {
  const agg = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    let r;
    try { r = JSON.parse(line); } catch { continue; }
    const key = keyFn(r);
    if (!key) continue;
    const cycle = String(cycleFn(r) || '');
    const composite = `${key}|${cycle}`;
    agg.set(composite, (agg.get(composite) || 0) + (valueFn(r) || 0));
  }
  return agg;
}

(async function main() {
  console.log(`[verify-committee-receipts] tolerance=${(TOLERANCE * 100).toFixed(1)}% top=${TOP_N}${STRICT ? ' STRICT' : ''}${FILTER_CMTE ? ` cmte=${FILTER_CMTE}` : ''}${FILTER_CYCLE ? ` cycle=${FILTER_CYCLE}` : ''}\n`);

  // 1. Build cmte_id → vault entity map (same logic as
  //    aggregate-indiv-to-edges.cjs). Include the vault_profile fallback.
  console.log('  building cmte_id → entity map...');
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

  // Build reverse map: entity_name → Set<cmte_id>
  const entityToCmtes = new Map();
  for (const [cmteId, ent] of cmteToEntity) {
    if (!entityToCmtes.has(ent.name)) entityToCmtes.set(ent.name, new Set());
    entityToCmtes.get(ent.name).add(cmteId);
  }

  // Candidate-to-principal-committee map (for pas2 pac_gifts, where
  // pas2 rows key on cand_id, not committee directly)
  console.log('  loading candidate-committees linkages...');
  const candToPrincipal = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'candidate-committees.jsonl')) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.cmte_dsgn === 'P' || r.cmte_dsgn === 'A') {
        // Map candidate → their authorized campaign committees
        if (!candToPrincipal.has(r.cand_id)) candToPrincipal.set(r.cand_id, new Set());
        candToPrincipal.get(r.cand_id).add(r.cmte_id);
      }
    } catch {}
  }

  // 2. Sum FEC sources per (cmte_id, cycle).
  //    Note: pas2-direct-donors is cand_id-keyed; convert via candToPrincipal.
  console.log('  summing indiv-by-committee...');
  const indiv = await streamSum(
    path.join(FEC_ROOT, 'indiv-by-committee.jsonl'),
    (r) => r.cmte_id,
    (r) => r.total,
    (r) => r.last_cycle,
  );
  console.log('  summing pas2-conduit...');
  const conduit = await streamSum(
    path.join(FEC_ROOT, 'pas2-conduit.jsonl'),
    // conduit rows go FROM ActBlue/WinRed TO a candidate committee.
    // But pas2-conduit is cand_id-keyed like pas2-direct-donors.
    // So we need to route to principal committee.
    (r) => r.cand_id,
    (r) => r.amount,
    (r) => r.cycle,
  );
  console.log('  summing oth-transfers (6.9M rows, slow)...');
  const transfers = await streamSum(
    path.join(FEC_ROOT, 'oth-transfers.jsonl'),
    (r) => r.dst_cmte_id,
    (r) => r.amount,
    (r) => r.cycle,
  );
  console.log('  summing pas2-direct-donors (5.4M rows, slow)...');
  const pacGifts = await streamSum(
    path.join(FEC_ROOT, 'pas2-direct-donors.jsonl'),
    (r) => r.cand_id,
    (r) => r.amount,
    (r) => r.cycle,
  );

  // Helper: expand cand_id → committee buckets. For "what total did
  // Trump's campaign committee receive" we roll cand_id totals into
  // the committee(s) linked to that candidate via candToPrincipal.
  function candAggToCmteAgg(candAgg) {
    const out = new Map();
    for (const [candCompositeKey, amount] of candAgg) {
      const [candId, cycle] = candCompositeKey.split('|');
      const cmtes = candToPrincipal.get(candId);
      if (!cmtes) continue;
      for (const cmteId of cmtes) {
        const key = `${cmteId}|${cycle}`;
        out.set(key, (out.get(key) || 0) + amount);
      }
    }
    return out;
  }
  const conduitByCmte = candAggToCmteAgg(conduit);
  const pacGiftsByCmte = candAggToCmteAgg(pacGifts);

  // 3. Sum edge-store receipts per (to-entity, cycle)
  const edges = loadEdges();
  const edgeByEntCycle = new Map();
  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (!e.amount) continue;
    if (e.role === 'ie-oppose') continue;
    if (e.status === 'deprecated') continue;
    if (e.from === e.to) continue;
    const key = `${e.to}|${String(e.cycle || '')}`;
    edgeByEntCycle.set(key, (edgeByEntCycle.get(key) || 0) + e.amount);
  }

  // 4. For each mapped entity, compute per-cycle source and edge
  //    totals, print drift.
  const rows = [];
  for (const [entName, cmteIds] of entityToCmtes) {
    const cycles = new Set();
    for (const cmteId of cmteIds) {
      for (const agg of [indiv, conduitByCmte, transfers, pacGiftsByCmte]) {
        for (const k of agg.keys()) {
          const [cid, cyc] = k.split('|');
          if (cid === cmteId) cycles.add(cyc);
        }
      }
    }
    for (const cycle of cycles) {
      if (FILTER_CYCLE && cycle !== FILTER_CYCLE) continue;
      if (FILTER_CMTE && ![...cmteIds].includes(FILTER_CMTE)) continue;

      let indivSum = 0, conduitSum = 0, transferSum = 0, pacGiftSum = 0;
      for (const cmteId of cmteIds) {
        indivSum += (indiv.get(`${cmteId}|${cycle}`) || 0);
        conduitSum += (conduitByCmte.get(`${cmteId}|${cycle}`) || 0);
        transferSum += (transfers.get(`${cmteId}|${cycle}`) || 0);
        pacGiftSum += (pacGiftsByCmte.get(`${cmteId}|${cycle}`) || 0);
      }
      const sourceSum = indivSum + conduitSum + transferSum + pacGiftSum;
      const edgeSum = edgeByEntCycle.get(`${entName}|${cycle}`) || 0;
      if (sourceSum < MIN_AMOUNT && edgeSum < MIN_AMOUNT) continue;
      const delta = sourceSum > 0 ? (edgeSum - sourceSum) / sourceSum : 0;
      const absDelta = Math.abs(delta);
      const status = absDelta <= TOLERANCE ? 'OK'
                    : edgeSum > sourceSum ? 'OVER'
                    : 'UNDER';
      rows.push({
        entity: entName,
        cycle,
        cmteIds: [...cmteIds],
        indivSum, conduitSum, transferSum, pacGiftSum,
        sourceSum, edgeSum, delta, absDelta, status,
      });
    }
  }

  rows.sort((a, b) => b.sourceSum - a.sourceSum);
  const display = TOP_N > 0 ? rows.slice(0, TOP_N) : rows;

  const pad = (s, n) => (s + '').padStart(n);
  console.log(`\n${display.length} (entity, cycle) pairs with ≥$${(MIN_AMOUNT / 1e6).toFixed(1)}M on either side:\n`);
  console.log(pad('src $', 9) + ' ' + pad('edge $', 9) + ' ' + pad('delta', 7) + '  status  cycle  entity');
  console.log('─'.repeat(95));
  let ok = 0, over = 0, under = 0;
  for (const r of display) {
    const marker = r.status === 'OK' ? '  ✓  '
                  : r.status === 'OVER' ? '  ⬆  '
                  : '  ⬇  ';
    if (r.status === 'OK') ok++; else if (r.status === 'OVER') over++; else under++;
    const pct = (r.delta * 100).toFixed(1) + '%';
    console.log(
      pad('$' + (r.sourceSum / 1e6).toFixed(1) + 'M', 9) + ' ' +
      pad('$' + (r.edgeSum / 1e6).toFixed(1) + 'M', 9) + ' ' +
      pad(pct, 7) + marker + pad(r.cycle, 4) + '  ' + r.entity
    );
    if (VERBOSE) {
      console.log(`          indiv=$${(r.indivSum / 1e6).toFixed(1)}M conduit=$${(r.conduitSum / 1e6).toFixed(1)}M transfers=$${(r.transferSum / 1e6).toFixed(1)}M pacGifts=$${(r.pacGiftSum / 1e6).toFixed(1)}M`);
    }
  }

  console.log('\n' + '─'.repeat(95));
  console.log(`  ✓ within ±${(TOLERANCE * 100).toFixed(0)}%: ${ok}`);
  console.log(`  ⬆ OVER (double-count or stale): ${over}`);
  console.log(`  ⬇ UNDER (missing ingest): ${under}`);

  if (STRICT && (over > 0 || under > 0)) {
    console.log('\nDrift detected. Run with --verbose to see per-source breakdown.');
    process.exitCode = 1;
  }
})();
