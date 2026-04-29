#!/usr/bin/env node
/**
 * fix-bug-007-smart-restore.cjs — second-pass repair.
 *
 * The first-pass fix replaced corruption with `[$? — bug-007]` placeholder.
 * For many profiles, the BODY TEXT below the central-thesis still contains
 * the correct dollar amounts (e.g. central-thesis says `[$? — bug-007]65K+`,
 * body says `$165K+`). This script cross-references and substitutes the
 * placeholder back to the correct dollar amount when an unambiguous
 * match is found in the same file.
 *
 * Algorithm per file:
 *   1. Collect all `[$? — bug-007]<survivor>` instances and their suffix
 *      strings (the chars after `bug-007]`, e.g. "65K+", "00K+ fundraiser").
 *   2. For each, search the file body for `\$\d+<suffix>` (a dollar
 *      amount whose tail matches our survivor).
 *   3. If exactly ONE match found → replace placeholder with that amount.
 *   4. If 0 or 2+ matches → leave placeholder, log unresolved.
 *
 * Idempotent. Produces a per-file report.
 *
 * Usage: node scripts/fix-bug-007-smart-restore.cjs [--dry-run]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const PLACEHOLDER_RE = /\[\$\? — bug-007\]([0-9A-Za-z][0-9A-Za-z+\s.\-_]{0,40}?)(?=[)\s,—.])/g;

function findCandidateFiles() {
  const out = [];
  const stack = [path.join(ROOT, 'content')];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'Archive' || e.name === 'Admin Notes') continue;
        stack.push(full);
      } else if (e.name.endsWith('.md')) {
        try {
          const text = fs.readFileSync(full, 'utf-8');
          if (text.includes('[$? — bug-007]')) out.push(full);
        } catch { /* skip */ }
      }
    }
  }
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function smartRestore(text) {
  // Strip frontmatter for body-search context (cross-reference uses body
  // mostly, but we want to allow frontmatter-to-frontmatter recovery too,
  // so we search the WHOLE text minus the central-thesis line itself).
  const result = { restored: 0, unresolved: 0, details: [] };

  let newText = text;
  // We can't iterate using a single regex.replace because we need
  // file-wide context. Walk all placeholder matches first, then do
  // individual substitutions.
  const placeholderMatches = [];
  let m;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
    const survivor = m[1];
    const placeholderText = `[$? — bug-007]${survivor}`;
    placeholderMatches.push({ index: m.index, survivor, placeholderText });
  }
  PLACEHOLDER_RE.lastIndex = 0;

  for (const pm of placeholderMatches) {
    // Look for $<digits><survivor> elsewhere in the file. Survivor is
    // the suffix the corruption left behind (e.g. "65K+", "00K+ fundraiser").
    const survivorTrimmed = pm.survivor.trim();
    if (survivorTrimmed.length < 2) {
      result.unresolved++;
      result.details.push({ survivor: pm.survivor, status: 'unresolved-too-short' });
      continue;
    }
    // Search for $\d{1,3}<survivor>
    const searchRe = new RegExp(`\\$(\\d{1,3})${escapeRegex(survivorTrimmed)}`, 'g');
    const candidates = [...text.matchAll(searchRe)].map((mm) => mm[1]);
    const uniqueDigits = [...new Set(candidates)];
    if (uniqueDigits.length === 1) {
      // Unambiguous restore.
      const restored = `$${uniqueDigits[0]}${pm.survivor}`;
      // Replace ONLY this specific occurrence by index. Use slice:
      // Find the placeholder text in newText starting from the same
      // position (newText has been mutated by prior restores; recompute
      // by string search).
      const idx = newText.indexOf(pm.placeholderText);
      if (idx >= 0) {
        newText = newText.slice(0, idx) + restored + newText.slice(idx + pm.placeholderText.length);
        result.restored++;
        result.details.push({ survivor: pm.survivor, status: 'restored', value: restored, source: `body-match-$${uniqueDigits[0]}${survivorTrimmed}` });
      }
    } else {
      result.unresolved++;
      result.details.push({
        survivor: pm.survivor,
        status: uniqueDigits.length === 0 ? 'unresolved-no-body-match' : `unresolved-ambiguous-${uniqueDigits.length}`,
        candidates: uniqueDigits,
      });
    }
  }
  return { newText, ...result };
}

const files = findCandidateFiles();
const summary = {
  found: files.length,
  files_changed: 0,
  total_restored: 0,
  total_unresolved: 0,
  per_file: [],
};

for (const file of files) {
  const text = fs.readFileSync(file, 'utf-8');
  const result = smartRestore(text);
  if (result.restored === 0 && result.unresolved === 0) continue;
  if (!DRY && result.restored > 0) {
    fs.writeFileSync(file, result.newText, 'utf-8');
    summary.files_changed++;
  }
  summary.total_restored += result.restored;
  summary.total_unresolved += result.unresolved;
  summary.per_file.push({
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    restored: result.restored,
    unresolved: result.unresolved,
    details: result.details,
  });
}

console.log(`fix-bug-007-smart-restore (${DRY ? 'DRY-RUN' : 'APPLY'})`);
console.log(`  files with placeholders: ${summary.found}`);
console.log(`  files changed: ${summary.files_changed}`);
console.log(`  values restored: ${summary.total_restored}`);
console.log(`  values left as placeholder: ${summary.total_unresolved}`);
for (const p of summary.per_file) {
  console.log(`  ${p.file}: ${p.restored} restored, ${p.unresolved} unresolved`);
  for (const d of p.details) {
    if (d.status === 'restored') console.log(`    ✓ ${d.survivor.trim()} → ${d.value}`);
    else console.log(`    ⚠ ${d.survivor.trim()}: ${d.status}${d.candidates && d.candidates.length ? ' (candidates: $' + d.candidates.join(', $') + ')' : ''}`);
  }
}
