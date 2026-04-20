/**
 * edge-consistency.cjs — tier 1 checker.
 *
 * Internal consistency checks on data/relationships.jsonl:
 *  1. Active self-loops (from === to) — these inflate rollups
 *  2. Exact duplicate edges from different sources (same from, to, amount, cycle)
 *     — suggests overlapping ingest pipelines
 *  3. Near-dupe edges at the (from, to, cycle) grain where sum of amounts
 *     from one source ≈ a single amount from another source (the
 *     fec-indiv-by-committee vs fec-individual-bulk pattern)
 *
 * Does NOT check against external sources — purely self-consistency.
 */
const { loadEdges } = require('../lib/relationships-store.cjs');
const { finding, fmtMoney } = require('./_framework.cjs');

async function run(opts = {}) {
  const findings = [];
  const entityFilter = opts.entities ? new Set(opts.entities) : null;
  const edges = loadEdges().filter((e) =>
    e.type === 'monetary' &&
    e.status !== 'deprecated' &&
    e.role !== 'ie-oppose' &&
    typeof e.amount === 'number'
  );

  // 1. Self-loops
  for (const e of edges) {
    if (e.from === e.to && e.amount) {
      if (entityFilter && !entityFilter.has(e.from)) continue;
      findings.push(finding({
        severity: 'error',
        entity: e.from,
        metric: `edge:${e.id}`,
        internal: e.amount,
        cause: 'self-loop',
        detail: `self-loop edge ${e.id}: ${e.from} → itself ${fmtMoney(e.amount)} cycle ${e.cycle} source ${e.source} — inflates leaderboards, likely accounting artifact`,
      }));
    }
  }

  // 2. Exact duplicates at (from, to, amount, cycle) across sources
  const exactGroups = new Map();
  for (const e of edges) {
    const key = [e.from, e.to, e.amount, String(e.cycle || '')].join('||');
    if (!exactGroups.has(key)) exactGroups.set(key, []);
    exactGroups.get(key).push(e);
  }
  for (const g of exactGroups.values()) {
    if (g.length < 2) continue;
    const srcs = [...new Set(g.map((x) => x.source))];
    if (srcs.length < 2) continue; // same source multiple times isn't a cross-pipeline dupe
    const e0 = g[0];
    if (entityFilter && !entityFilter.has(e0.to) && !entityFilter.has(e0.from)) continue;
    findings.push(finding({
      severity: 'warn',
      entity: e0.to,
      metric: `dup:${e0.from}→${e0.to}@${e0.cycle}`,
      internal: e0.amount * (g.length - 1),
      cause: 'exact-cross-source-dup',
      detail: `${g.length} identical edges (${fmtMoney(e0.amount)} ${e0.from}→${e0.to} cycle ${e0.cycle}) across sources [${srcs.join(', ')}] — phantom overcount ${fmtMoney(e0.amount * (g.length - 1))}`,
    }));
  }

  // 3. Shape-dupe: same (to, cycle) has edges from two sources that are
  //    both FEC-individual-flavored but with wildly different aggregation
  //    — a strong signal of the indiv-by-committee + individual-bulk
  //    overlap pattern.
  const overlappingSourcePairs = [
    ['fec-indiv-by-committee', 'fec-individual-bulk'],
  ];
  const byToCycle = new Map();
  for (const e of edges) {
    const key = `${e.to}||${e.cycle || ''}`;
    if (!byToCycle.has(key)) byToCycle.set(key, {});
    const bucket = byToCycle.get(key);
    bucket[e.source] = (bucket[e.source] || 0) + e.amount;
  }
  for (const [key, srcSums] of byToCycle) {
    const [to, cycle] = key.split('||');
    if (entityFilter && !entityFilter.has(to)) continue;
    for (const [srcA, srcB] of overlappingSourcePairs) {
      if (srcSums[srcA] && srcSums[srcB]) {
        const overlap = Math.min(srcSums[srcA], srcSums[srcB]);
        if (overlap < 1e6) continue; // skip noise under $1M
        findings.push(finding({
          severity: 'error',
          entity: to,
          metric: `overlap:${srcA}+${srcB}@${cycle}`,
          internal: srcSums[srcA] + srcSums[srcB],
          cause: 'overlapping-ingest',
          detail: `${to} cycle ${cycle} has both ${srcA} (${fmtMoney(srcSums[srcA])}) AND ${srcB} (${fmtMoney(srcSums[srcB])}) — these ingest the same underlying FEC itemized data at different grains; deprecate one`,
        }));
      }
    }
  }

  return findings;
}

module.exports = {
  name: 'edge-consistency',
  tier: 1,
  description: 'Self-loop detection, exact duplicates, and overlapping-ingest patterns in the edge store',
  run,
};
