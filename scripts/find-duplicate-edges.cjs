#!/usr/bin/env node
/**
 * find-duplicate-edges.cjs
 *
 * Diagnoses OVER-counting in the edge store by finding groups of edges
 * that look like the same underlying transaction emitted more than once.
 * Produced as the follow-up to verify-committee-receipts.cjs flagging
 * +40% drift on SLF PAC 2020 and +10-16% on four other super PACs.
 *
 * Default collision key:
 *   (from, to, amount, cycle)   — IGNORING source
 *
 * The point is specifically to catch cross-source double emission
 * (same gift from fec-indiv-by-committee AND fec-individual-bulk, or
 * employer-rollup + indiv, etc.). Collapsing to one source would hide
 * exactly the bug we're hunting.
 *
 * Usage:
 *   node scripts/find-duplicate-edges.cjs --to "SLF PAC" --cycle 2020
 *   node scripts/find-duplicate-edges.cjs --to "MAGA Inc" --top 30
 *   node scripts/find-duplicate-edges.cjs --to "SLF PAC" --cycle 2020 --show-groups 10
 */

const { loadEdges } = require('./lib/relationships-store.cjs');

const args = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
}
const TO = argVal('--to', null);
const CYCLE = argVal('--cycle', null);
const SHOW_GROUPS = parseInt(argVal('--show-groups', '15'), 10);
const MIN_AMOUNT = parseFloat(argVal('--min', '0'));

const edges = loadEdges();

let scope = edges.filter((e) => {
  if (e.type !== 'monetary') return false;
  if (!e.amount) return false;
  if (e.status === 'deprecated') return false;
  if (e.role === 'ie-oppose') return false;
  if (e.from === e.to) return false;
  if (TO && e.to !== TO) return false;
  if (CYCLE && String(e.cycle || '') !== CYCLE) return false;
  if (e.amount < MIN_AMOUNT) return false;
  return true;
});

console.log(`[find-duplicate-edges] scope: to=${TO || 'ALL'} cycle=${CYCLE || 'ALL'} → ${scope.length} active monetary edges`);

// Group by (from, to, amount, cycle).
const groups = new Map();
for (const e of scope) {
  const key = [e.from, e.to, e.amount, String(e.cycle || '')].join('||');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(e);
}

const collisions = [...groups.values()].filter((arr) => arr.length > 1);
collisions.sort((a, b) => (b[0].amount * (b.length - 1)) - (a[0].amount * (a.length - 1)));

let phantomTotal = 0;
for (const g of collisions) {
  phantomTotal += g[0].amount * (g.length - 1);
}

console.log(`\n${collisions.length} collision groups (same from+to+amount+cycle, different edge IDs)`);
console.log(`phantom overcount if all are dupes: $${(phantomTotal / 1e6).toFixed(2)}M\n`);

if (collisions.length === 0) process.exit(0);

// Source-pair histogram — which source pairs are responsible?
const pairHist = new Map();
for (const g of collisions) {
  const srcs = [...new Set(g.map((e) => e.source))].sort();
  const pairKey = srcs.join(' + ');
  const entry = pairHist.get(pairKey) || { groups: 0, phantom: 0 };
  entry.groups += 1;
  entry.phantom += g[0].amount * (g.length - 1);
  pairHist.set(pairKey, entry);
}
const pairs = [...pairHist.entries()].sort((a, b) => b[1].phantom - a[1].phantom);
console.log('Source composition of collision groups (sorted by phantom $):');
console.log('─'.repeat(85));
for (const [pairKey, { groups: n, phantom }] of pairs) {
  const pad = (s, w) => (s + '').padStart(w);
  console.log(`  ${pad('$' + (phantom / 1e6).toFixed(2) + 'M', 10)}  ${pad(n, 5)} groups  ${pairKey}`);
}

console.log(`\nTop ${SHOW_GROUPS} collision groups by phantom $:\n`);
for (const g of collisions.slice(0, SHOW_GROUPS)) {
  const e = g[0];
  const srcs = g.map((x) => x.source);
  console.log(`  $${e.amount.toLocaleString()} × ${g.length}  cycle ${e.cycle}  ${e.from}  →  ${e.to}`);
  console.log(`    sources: ${srcs.join(', ')}`);
  console.log(`    ids:     ${g.map((x) => x.id).join(', ')}`);
}
