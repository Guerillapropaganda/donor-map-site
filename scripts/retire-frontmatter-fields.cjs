#!/usr/bin/env node
// ADR-0023 Phase A: retire 16 zero-consumer frontmatter fields across the corpus.
// Line-based stripper: finds top-level frontmatter keys matching the retire list,
// removes the key line + all subsequent indented continuation lines.
//
// Non-destructive on untouched fields — preserves exact original formatting
// for everything not being retired.

const fs = require('fs');
const path = require('path');

const RETIRE = new Set([
  'running-for',
  'parent-profile',
  'opensanctions-status',
  'opensanctions-matches',
  'opensanctions-datasets',
  'merge-note',
  'leadership-role',
  'former-committees',
  'fec-candidate-id-house',
  'fec-senate-id',
  'experiment',
  'data-quality-flag',
  'claims-slug',
  'editorial-blockers',
  'verified-blocks',
  'historical',
]);

const DRY = process.argv.includes('--dry');

function stripFrontmatter(fmText) {
  const lines = fmText.split('\n');
  const out = [];
  const removed = [];
  let skipping = null; // name of field being skipped
  for (const line of lines) {
    // A top-level YAML key is a line starting with a non-space char followed by ":".
    const topKeyMatch = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(?:\s|$)/);
    if (topKeyMatch) {
      const key = topKeyMatch[1];
      if (RETIRE.has(key)) {
        skipping = key;
        removed.push(key);
        continue;
      }
      skipping = null;
      out.push(line);
      continue;
    }
    // Continuation of prior key (indented / list item / empty inside block)
    if (skipping !== null) {
      // Keep skipping while line is blank or starts with whitespace/`-`.
      if (line === '' || /^\s/.test(line) || line.startsWith('-')) continue;
      // Otherwise (shouldn't really happen inside frontmatter), stop skipping.
      skipping = null;
      out.push(line);
    } else {
      out.push(line);
    }
  }
  return { stripped: out.join('\n'), removed };
}

function processFile(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!m) return null;
  const { stripped, removed } = stripFrontmatter(m[2]);
  if (removed.length === 0) return null;
  const newText = m[1] + stripped + m[3] + text.slice(m[0].length);
  if (!DRY) fs.writeFileSync(file, newText);
  return removed;
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, acc);
    else if (e.name.endsWith('.md')) acc.push(f);
  }
}

const files = [];
walk('content', files);

let filesChanged = 0;
const fieldCounts = {};
for (const f of files) {
  const removed = processFile(f);
  if (removed) {
    filesChanged++;
    for (const k of removed) fieldCounts[k] = (fieldCounts[k] || 0) + 1;
    console.log((DRY ? '[dry] ' : '') + 'stripped ' + removed.join(',') + ' → ' + f);
  }
}

console.log('\n--- Summary ---');
console.log('Files changed: ' + filesChanged);
console.log('Per-field removals:');
for (const [k, v] of Object.entries(fieldCounts).sort()) console.log('  ' + k + ': ' + v);
if (DRY) console.log('\n(dry run — re-run without --dry to apply)');
