#!/usr/bin/env node
/**
 * migrate-edge-ids-include-role.cjs
 *
 * One-shot: recompute edge IDs for monetary edges now that role is part
 * of the ID hash (see relationship-edge-validator.cjs:258). Required by
 * ADR-0013's upstream pas2 ingest fix, which starts emitting multiple
 * edges per (donor, candidate, cycle) split by transaction bucket
 * (direct-donor, ie-support, ie-oppose). Without this migration, the
 * first ingest run after the change would produce ID collisions against
 * the 22K existing role-tagged edges.
 *
 * Safe to re-run: only rewrites lines whose computed ID differs.
 *
 * Usage:
 *   node scripts/migrate-edge-ids-include-role.cjs            # dry-run
 *   node scripts/migrate-edge-ids-include-role.cjs --write    # apply
 */

const fs = require('fs');
const path = require('path');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const WRITE = process.argv.includes('--write');

const lines = fs.readFileSync(FILE, 'utf-8').split('\n');
const out = [];
const idSeen = new Set();
let updated = 0, unchanged = 0, collisions = 0;

for (const line of lines) {
  if (!line.trim()) { out.push(line); continue; }
  let e;
  try { e = JSON.parse(line); } catch { out.push(line); continue; }
  const newId = computeEdgeId(e);
  if (idSeen.has(newId)) {
    collisions++;
    console.error(`COLLISION: ${newId} — ${e.from} → ${e.to} (${e.type}/${e.role}/${e.cycle})`);
    out.push(line);
    continue;
  }
  idSeen.add(newId);
  if (e.id === newId) { unchanged++; out.push(line); continue; }
  updated++;
  e.id = newId;
  out.push(JSON.stringify(e));
}

console.log(`total lines: ${lines.length}`);
console.log(`unchanged: ${unchanged}`);
console.log(`updated:   ${updated}`);
console.log(`collisions: ${collisions}`);

if (collisions > 0) {
  console.error('\nABORT: collisions detected. Fix upstream before applying.');
  process.exit(1);
}

if (!WRITE) {
  console.log('\n[dry-run] no writes. Use --write to apply.');
  process.exit(0);
}

fs.writeFileSync(FILE, out.join('\n'));
console.log(`\nWrote ${out.length} lines to ${FILE}`);
