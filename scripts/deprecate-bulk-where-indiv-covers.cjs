#!/usr/bin/env node
/**
 * deprecate-bulk-where-indiv-covers.cjs
 *
 * Targeted cleanup of the fec-individual-bulk / fec-indiv-by-committee
 * overlap. When BOTH sources produce edges for the same (to_entity, cycle)
 * pair, they represent the same underlying FEC itemized individual
 * contributions at different aggregation grains — we were double-counting.
 *
 * Scope: deprecate fec-individual-bulk edges ONLY where the same entity+
 * cycle has fec-indiv-by-committee coverage. Preserves the 904 ent/cycle
 * pairs that are bulk-ONLY (e.g. Ossoff 2020 donor-level data, Rubio 2016,
 * Raytheon per-cycle rollups) — those aren't overlapping, they're unique.
 *
 * Result: drops ~$765M of phantom overcount; closes 3 of 5 tier-2 OVER
 * cases (SLF '20, SLF '22, MAGA '26) to within ±10%.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CANONICAL = path.join(DATA_DIR, 'relationships.jsonl');
const DERIVED = path.join(DATA_DIR, 'derived');
const WRITE = process.argv.includes('--write');

// 1. Identify which (to, cycle) pairs have fec-indiv-by-committee coverage.
const edges = loadEdges();
const covered = new Set();
for (const e of edges) {
  if (e.status === 'deprecated') continue;
  if (e.type !== 'monetary') continue;
  if (e.source !== 'fec-indiv-by-committee') continue;
  if (e.from === e.to) continue;
  covered.add(`${e.to}||${e.cycle || ''}`);
}

// 2. Build the set of fec-individual-bulk edge IDs that need deprecation.
const toDeprecate = new Set();
let phantomSum = 0;
for (const e of edges) {
  if (e.status === 'deprecated') continue;
  if (e.type !== 'monetary') continue;
  if (e.source !== 'fec-individual-bulk') continue;
  if (e.from === e.to) continue;
  if (!covered.has(`${e.to}||${e.cycle || ''}`)) continue;
  toDeprecate.add(e.id);
  phantomSum += e.amount || 0;
}

console.log(`[deprecate-bulk-where-indiv-covers] ${WRITE ? 'WRITE' : 'dry-run'}`);
console.log(`  indiv-covered (to,cycle) pairs:  ${covered.size}`);
console.log(`  bulk edges flagged:              ${toDeprecate.size}`);
console.log(`  phantom overcount removed:       $${(phantomSum / 1e6).toFixed(1)}M`);

if (toDeprecate.size === 0) {
  console.log('  nothing to do.');
  process.exit(0);
}

// 3. Rewrite any file that contains a flagged edge.
function rewriteFile(file) {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, 'utf-8');
  const lines = text.split(/\r?\n/);
  let changed = 0;
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(trimmed); } catch { out.push(line); continue; }
    if (toDeprecate.has(rec.id)) {
      rec.status = 'deprecated';
      rec.deprecation_reason = 'overlap-with-indiv-by-committee';
      rec.deprecated_at = new Date().toISOString();
      out.push(JSON.stringify(rec));
      changed++;
    } else {
      out.push(line);
    }
  }
  if (changed && WRITE) fs.writeFileSync(file, out.join('\n'));
  return changed;
}

const targets = [CANONICAL];
if (fs.existsSync(DERIVED)) {
  for (const f of fs.readdirSync(DERIVED).sort()) {
    if (f.endsWith('.jsonl')) targets.push(path.join(DERIVED, f));
  }
}
let total = 0;
for (const t of targets) {
  const n = rewriteFile(t);
  if (n > 0) console.log(`  ${path.relative(ROOT, t)}: ${n} deprecated`);
  total += n;
}
console.log(`  TOTAL rewrites: ${total}`);
if (!WRITE) console.log(`\n  rerun with --write to apply.`);
