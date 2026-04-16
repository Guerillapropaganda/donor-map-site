#!/usr/bin/env node
/**
 * strip-master-profile-title-suffix.cjs
 *
 * David's new rule (2026-04-14): profile titles should not end in
 * " Master Profile". That was a legacy naming convention. Strip it from
 * the `title:` field of every profile frontmatter. Filenames are left
 * alone because renaming files breaks the 2000+ `[[_X Master Profile]]`
 * wikilinks scattered across the vault, which Obsidian resolves by
 * filename.
 *
 * Safe changes only: we only touch the YAML `title:` value when it ends
 * in " Master Profile" (case-insensitive). Other title-like fields are
 * not touched. Body content is not touched.
 *
 * Usage:
 *   node scripts/strip-master-profile-title-suffix.cjs            # live
 *   node scripts/strip-master-profile-title-suffix.cjs --dry-run  # preview
 */
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

let changed = 0;
const sample = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/Vault Maintenance$/.test(full)) continue;
      walk(full);
      continue;
    }
    if (!entry.name.endsWith('.md')) continue;
    const text = fs.readFileSync(full, 'utf-8');
    const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---\n)([\s\S]*)$/);
    if (!fmMatch) continue;
    const [, open, fm, close, body] = fmMatch;

    // Match the title line: `title: "X Master Profile"` or `title: X Master Profile`
    // Capture the value WITHOUT surrounding quotes, strip suffix, re-emit with
    // original quote style.
    const titleRe = /^(title:\s*)(["']?)(.*?)\2\s*$/m;
    const m = fm.match(titleRe);
    if (!m) continue;
    const key = m[1];
    const quote = m[2];
    const value = m[3];
    if (!/ Master Profile$/i.test(value)) continue;
    const stripped = value.replace(/ Master Profile$/i, '');
    if (stripped === value) continue;

    const newFm = fm.replace(titleRe, `${key}${quote}${stripped}${quote}`);
    if (newFm === fm) continue;

    if (!DRY_RUN) {
      fs.writeFileSync(full, open + newFm + close + body, 'utf-8');
    }
    changed++;
    if (sample.length < 10) sample.push(`${value} → ${stripped}  @ ${path.relative(process.cwd(), full)}`);
  }
}

walk('content');

console.log(`${DRY_RUN ? 'Would update' : 'Updated'} ${changed} profiles`);
console.log('Sample:');
sample.forEach(s => console.log('  ' + s));
