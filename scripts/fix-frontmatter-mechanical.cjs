#!/usr/bin/env node
/**
 * fix-frontmatter-mechanical.cjs — apply safe defaults to frontmatter
 * fields the schema validator (ADR-0023) flagged as missing.
 *
 * What it patches (only safe-default cases):
 *   - source-tier: 1 on policy profiles (categorically gov-primary references)
 *   - related: [] when missing (empty cache; rebuild-relationship-caches
 *     populates from canonical store on next run)
 *   - politicians-funded: [] when missing (same pattern as related)
 *   - last-enriched: copy from last-updated when missing (timestamp default)
 *
 * What it does NOT patch (needs human judgment):
 *   - parent: deriving from folder path can be wrong (e.g. sub-notes vs
 *     top-level profiles). Editor decides.
 *   - source-types: this is a per-profile editorial choice (FEC vs IRS
 *     vs court records, etc.). Editor decides.
 *   - party / chamber / sector: factual but per-entity. Editor or
 *     pipeline-driven backfill.
 *   - fec-candidate-id / bioguide-id / state-candidate-id: identifier
 *     fields, must come from a real upstream source not made up.
 *
 * Usage:
 *   node scripts/fix-frontmatter-mechanical.cjs           # dry-run
 *   node scripts/fix-frontmatter-mechanical.cjs --write   # apply
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const WRITE = process.argv.includes('--write');

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

const files = walk(path.join(ROOT, 'content'));
let scanned = 0;
let patched = 0;
const patchesByKind = new Map();

for (const f of files) {
  const txt = fs.readFileSync(f, 'utf-8');
  const m = txt.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  let fm;
  try { fm = yaml.load(m[1]); } catch { continue; }
  if (!fm || typeof fm !== 'object') continue;
  scanned++;

  const patches = [];

  // Policy profiles: source-tier defaults to 1 (categorically gov-primary)
  if (fm.type === 'policy' && (fm['source-tier'] === undefined || fm['source-tier'] === '')) {
    patches.push({ field: 'source-tier', value: 1 });
  }

  // NOTE: related and politicians-funded are canonical-store-backed
  // (Rule 1). They get rebuilt by scripts/rebuild-relationship-caches.cjs
  // from data/relationships.jsonl. Initializing them to [] here would
  // trip the canonical-store-sentinel without staging the rebuilder.
  // Skip them — let rebuild-relationship-caches own that cache.

  // last-enriched: copy from last-updated when missing on donor/corp
  if (
    (fm.type === 'donor' || fm.type === 'corporation') &&
    fm['last-enriched'] === undefined &&
    fm['last-updated']
  ) {
    patches.push({ field: 'last-enriched', value: fm['last-updated'] });
  }

  if (patches.length === 0) continue;

  // Apply patches
  for (const p of patches) {
    fm[p.field] = p.value;
    patchesByKind.set(p.field, (patchesByKind.get(p.field) || 0) + 1);
  }

  if (WRITE) {
    const newFm = yaml.dump(fm, { lineWidth: -1, noRefs: true, quotingType: '"' });
    const newContent = txt.replace(/^---\r?\n[\s\S]*?\r?\n---/, '---\n' + newFm + '---');
    fs.writeFileSync(f, newContent, 'utf-8');
  }
  patched++;
}

console.log(`scanned: ${scanned} profiles`);
console.log(`patched: ${patched} ${WRITE ? '(written)' : '(dry-run)'}`);
console.log('by field:');
for (const [k, n] of [...patchesByKind.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${k}`);
}
if (!WRITE) console.log('\nRe-run with --write to apply.');
