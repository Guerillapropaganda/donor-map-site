#!/usr/bin/env node
/**
 * deprecate-self-loop-edges.cjs
 *
 * One-shot cleanup. Marks every active monetary edge where
 * from === to as status=deprecated, with a reason tag.
 *
 * Why: self-loop monetary edges are accounting artifacts from FEC
 * bulk ingest — a donor's listed employer matches their own
 * organization's entity name. They inflate leaderboards and rollups.
 * Yesterday's session filtered them at query-time; today we
 * deprecate them at rest so the edge-consistency verifier no longer
 * flags them.
 *
 * Preserves audit trail: status=deprecated keeps the row, sets a
 * deprecation_reason, and puts it behind the default 'active'
 * filter. Query path already ignores these (role !== 'ie-oppose',
 * status !== 'deprecated').
 *
 * Rewrites canonical file + each affected data/derived/*.jsonl.
 * Dry-run by default. Pass --write to apply.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CANONICAL = path.join(DATA_DIR, 'relationships.jsonl');
const DERIVED = path.join(DATA_DIR, 'derived');
const WRITE = process.argv.includes('--write');

const REASON = 'self-loop-accounting-artifact';

function rewriteFile(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const lines = text.split(/\r?\n/);
  let changed = 0;
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(trimmed); } catch { out.push(line); continue; }
    if (
      rec.type === 'monetary' &&
      rec.from === rec.to &&
      rec.status !== 'deprecated' &&
      typeof rec.amount === 'number' &&
      rec.amount
    ) {
      rec.status = 'deprecated';
      rec.deprecation_reason = REASON;
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

console.log(`[deprecate-self-loop-edges] ${WRITE ? 'WRITE' : 'dry-run'}`);
let total = 0;
for (const t of targets) {
  if (!fs.existsSync(t)) continue;
  const n = rewriteFile(t);
  if (n > 0) console.log(`  ${path.relative(ROOT, t)}: ${n} deprecated`);
  total += n;
}
console.log(`  TOTAL: ${total} self-loop monetary edges ${WRITE ? 'deprecated' : 'would be deprecated'}`);
if (!WRITE) console.log(`\n  rerun with --write to apply.`);
