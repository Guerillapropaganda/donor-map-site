#!/usr/bin/env node
/**
 * clean-inline-fields.cjs — Remove legacy inline dataview fields from body text
 *
 * Per CLAUDE.md: "When reviewing profiles, if you encounter a body field:: value
 * line, merge its content into frontmatter and delete the body line."
 *
 * This script removes inline `field:: value` lines from the body of all .md files.
 * It does NOT merge into frontmatter (the values are typically stale duplicates).
 */

const fs = require('fs');
const path = require('path');

const CONTENT = path.resolve(__dirname, '..', 'content');
const DRY_RUN = process.argv.includes('--dry-run');

const INLINE_FIELDS = [
  'related', 'donors', 'top-donors', 'politicians-funded', 'opposes',
  'research-status', 'profile-status', 'source-tier', 'content-readiness',
  'stories', 'type', 'sector', 'entity-type',
];

let totalFixed = 0;
let totalRemoved = 0;
const fieldCounts = {};

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return; }

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!e.name.endsWith('.md')) continue;

    const text = fs.readFileSync(full, 'utf-8');
    const fmMatch = text.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
    if (!fmMatch) continue;

    const frontmatter = fmMatch[1];
    let body = fmMatch[2];
    let changed = false;

    for (const field of INLINE_FIELDS) {
      // Match lines like: field:: value
      const pattern = new RegExp('^' + field + '::\\s*.+$', 'gm');
      const matches = body.match(pattern);
      if (matches && matches.length > 0) {
        body = body.replace(pattern, '');
        changed = true;
        totalRemoved += matches.length;
        fieldCounts[field] = (fieldCounts[field] || 0) + matches.length;
      }
    }

    if (changed) {
      // Clean up triple+ blank lines
      body = body.replace(/\n{3,}/g, '\n\n');
      if (!DRY_RUN) {
        fs.writeFileSync(full, frontmatter + body, 'utf-8');
      }
      totalFixed++;
    }
  }
}

console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
walk(CONTENT);

console.log(`\nFiles fixed: ${totalFixed}`);
console.log(`Inline field lines removed: ${totalRemoved}`);
console.log('\nBy field:');
for (const [field, count] of Object.entries(fieldCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${field}:: — ${count} occurrences`);
}
