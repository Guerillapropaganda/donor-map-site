#!/usr/bin/env node
/**
 * role-empty-monetary-check.cjs
 *
 * Continuous regression detection for the Bowman/Fairshake bug class.
 *
 * Counts monetary edges with empty/null/undefined role across all sources.
 * Empty role on monetary edges is a structural error: every monetary
 * edge should be classified (direct-contribution, ie-support, ie-oppose,
 * 527-expenditure, etc.) so consumers can distinguish a donation from
 * spending-against-the-target.
 *
 * The Layer 3 throw in lib/donor-map/edge-taxonomy.ts already prevents
 * silent miscounting at consumer level — but this check catches the
 * upstream cause: an ingest path writing roleless monetary edges.
 *
 * USAGE:
 *   node scripts/role-empty-monetary-check.cjs --json
 *   node scripts/role-empty-monetary-check.cjs            # human output
 *
 * BACKGROUND
 *   2026-04-28: started at 16,495 role-empty edges across fec-bulk
 *   (14,294) + irs-990-bulk (2,201). Fixed via:
 *     - Layer 3 throw in edge-taxonomy.ts (consumer-side prevention)
 *     - 990-grants ingester now sets role=direct-contribution
 *     - fec-bulk ingester bucketToRole now sets role=direct-contribution
 *     - In-place migration of legacy edges with amount<=$10k
 *   Final: 525 role-empty edges, all over-$10k from fec-bulk (held
 *   for editorial review — likely mis-aggregated IE-oppose).
 *
 *   findings_count = total role-empty monetary edges. Should stay
 *   stable or drop. Any UPWARD movement means a regression — a new
 *   ingest path forgot to tag roles, a vendor changed CSV format, or
 *   ingest-fec-bulk.cjs's bucketToRole regressed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');

function loadEdges() {
  const { loadEdges } = require('./lib/relationships-store.cjs');
  return loadEdges();
}

function main() {
  const edges = loadEdges();
  const bySourceAndType = {};
  let total = 0;
  let totalAmount = 0;
  const overCapSamples = [];

  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (e.role && e.role !== '') continue;
    // Skip deprecated edges. loadEdges() returns all statuses; consumers
    // filter to active by default. Deprecated edges don't reach
    // classifyEdge in normal use, so they're not regression risk.
    if (e.status && e.status !== 'active') continue;
    total++;
    const src = e.source || '?';
    bySourceAndType[src] = (bySourceAndType[src] || 0) + 1;
    if (typeof e.amount === 'number' && Number.isFinite(e.amount)) {
      totalAmount += e.amount;
      // Edges over $10k are suspicious — direct contributions can't
      // legally exceed $10k cumulative per cycle from a PAC. These
      // are likely mis-aggregated IE-oppose / IE-support.
      if (e.amount > 10000 && overCapSamples.length < 10) {
        overCapSamples.push({
          from: e.from,
          to: e.to,
          amount: e.amount,
          cycle: e.cycle,
          source: e.source,
        });
      }
    }
  }

  const result = {
    findings_count: total,
    total_amount_at_risk: totalAmount,
    by_source: bySourceAndType,
    over_cap_samples: overCapSamples,
    summary:
      total === 0
        ? 'Clean — every monetary edge has an explicit role.'
        : `${total} role-empty monetary edge(s) totaling $${totalAmount.toLocaleString()}. ` +
          'Layer 3 throw skips them at consumer level; ' +
          'this count regressing UP means an ingest path is writing roleless edges again.',
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log('=== role-empty-monetary-check ===');
  console.log(result.summary);
  console.log();
  if (total > 0) {
    console.log('By source:');
    for (const [k, n] of Object.entries(bySourceAndType).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(7)}  ${k}`);
    }
    if (overCapSamples.length > 0) {
      console.log();
      console.log('Top over-$10k samples (likely mis-aggregated IE):');
      for (const s of overCapSamples) {
        console.log(`  $${s.amount.toLocaleString().padStart(12)}  ${s.from} → ${s.to}  (${s.cycle}, ${s.source})`);
      }
    }
  }
}

main();
