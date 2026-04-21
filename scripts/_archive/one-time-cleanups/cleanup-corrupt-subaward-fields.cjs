#!/usr/bin/env node
/**
 * cleanup-corrupt-subaward-fields.cjs
 *
 * One-shot cleanup. The frontmatter fields subawards-issued-amount
 * and subawards-received-amount were populated by a since-removed
 * ingest pipeline that parsed a UUID (or similar) into an amount
 * field, producing bogus values like 1,009,778,941,592,127,500 and
 * 51,876,200,000 across 168 profiles.
 *
 * A grep confirms nothing in the codebase reads these fields anymore.
 * The safe move is to delete them; the amount-sanity verifier will
 * catch any re-introduction.
 *
 * This script only deletes values above $1e10 ($10B) — a defensible
 * upper bound that preserves any legitimate subaward totals below
 * that (no legitimate entity has >$10B in tracked subawards).
 *
 * Dry-run by default. Pass --write to actually modify files.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const THRESHOLD = 1e10;
const WRITE = process.argv.includes('--write');

function walkMd(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkMd(full));
    else if (ent.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const FIELDS = ['subawards-issued-amount', 'subawards-received-amount'];
const files = walkMd(path.join(ROOT, 'content'));
let touched = 0;
let removedCount = 0;
const sample = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!m) continue;
  const prefix = m[1];
  let fm = m[2];
  const suffix = m[3];
  let dirty = false;
  for (const field of FIELDS) {
    const re = new RegExp(`^${field}:\\s*(-?\\d+)\\b.*$`, 'gm');
    fm = fm.replace(re, (line, valStr) => {
      const val = Number(valStr);
      if (val >= THRESHOLD) {
        dirty = true;
        removedCount++;
        if (sample.length < 10) sample.push(`${path.relative(ROOT, file)}: ${field}=${val}`);
        return `__DELETE_THIS_LINE__`;
      }
      return line;
    });
  }
  if (dirty) {
    fm = fm.split('\n').filter((l) => l !== '__DELETE_THIS_LINE__').join('\n');
    touched++;
    if (WRITE) {
      fs.writeFileSync(file, prefix + fm + suffix + text.slice(m[0].length));
    }
  }
}

console.log(`[cleanup-corrupt-subaward-fields] ${WRITE ? 'WROTE' : 'dry-run'}`);
console.log(`  files touched:  ${touched}`);
console.log(`  fields removed: ${removedCount}`);
console.log(`  sample:`);
for (const s of sample) console.log(`    ${s}`);
if (!WRITE) console.log(`\n  rerun with --write to apply.`);
