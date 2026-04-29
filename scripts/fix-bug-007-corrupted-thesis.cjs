#!/usr/bin/env node
/**
 * fix-bug-007-corrupted-thesis.cjs — one-shot editorial cleanup script.
 *
 * Bug-007 (filed 2026-04-29): a prior reclassify script's String.replace()
 * backreference bug ate dollar-amount text in 18 profile central-thesis
 * fields. `($265K+)` became `(content-readiness: ready65K+)`. The original
 * digit and value are LOST — only the original digits 1 + 5 + K survive
 * (e.g. "65K+" was originally "$265K+", but the prior bug replaced the
 * leading "$2" with the literal text "content-readiness: ready").
 *
 * Editorial repair is impossible without fact-checking each one against
 * external sources (FEC, OpenSecrets). This script does the safe thing:
 * replace each corrupted substring with a placeholder marker. The
 * placeholder is a `[NEEDS REVIEW]` blocking flag (per ADR-0017), which
 * also disqualifies the profile from publishable tiers — preventing the
 * defamation-shaped reading "Adelson gave content-readiness: ready00K+"
 * from reaching public eyes.
 *
 * Replacement: `content-readiness: <state>` → `[$? — bug-007]`
 *
 * Idempotent. Skips profiles that no longer have the corruption pattern.
 * Logs every file touched.
 *
 * Usage:
 *   node scripts/fix-bug-007-corrupted-thesis.cjs            # apply
 *   node scripts/fix-bug-007-corrupted-thesis.cjs --dry-run  # preview
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

// The corruption pattern: `content-readiness: <state>` followed by one or
// more digits or letters (the survivor of the dollar amount). The five
// readiness states are the only candidates. We anchor on the readiness-
// state vocabulary to avoid false positives if anyone legitimately writes
// the phrase "content-readiness:" somewhere.
const CORRUPT_RE = /content-readiness:\s*(raw|draft|ready|data-complete|verified)(?=[0-9A-Za-z])/g;

// We must not touch the actual frontmatter `content-readiness: <state>`
// line. So: skip lines where the WHOLE line is a frontmatter assignment.
function isFrontmatterReadinessLine(line) {
  return /^\s*content-readiness:\s*(raw|draft|ready|data-complete|verified)\s*$/.test(line);
}

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
        if (e.name === 'Archive') continue;
        // Admin Notes legitimately reference the corrupted pattern as
        // documentation (bug-queue.md, audit reports). Skip — only
        // profile files are subject to repair.
        if (e.name === 'Admin Notes') continue;
        stack.push(full);
      } else if (e.name.endsWith('.md')) {
        try {
          const text = fs.readFileSync(full, 'utf-8');
          if (CORRUPT_RE.test(text)) out.push(full);
          CORRUPT_RE.lastIndex = 0;
        } catch { /* skip */ }
      }
    }
  }
  return out;
}

const files = findCandidateFiles();
const summary = { found: files.length, fixed: 0, replacements_total: 0, per_file: [] };

for (const file of files) {
  let text = fs.readFileSync(file, 'utf-8');
  // Process line by line so we never replace the legit frontmatter line.
  const lines = text.split(/\r?\n/);
  let perFileReplacements = 0;
  for (let i = 0; i < lines.length; i++) {
    if (isFrontmatterReadinessLine(lines[i])) continue;
    const replaced = lines[i].replace(CORRUPT_RE, '[$? — bug-007]');
    if (replaced !== lines[i]) {
      perFileReplacements += (lines[i].match(CORRUPT_RE) || []).length;
      lines[i] = replaced;
    }
    CORRUPT_RE.lastIndex = 0;
  }
  if (perFileReplacements === 0) continue;
  const newText = lines.join('\n');
  if (!DRY) {
    fs.writeFileSync(file, newText, 'utf-8');
  }
  summary.fixed++;
  summary.replacements_total += perFileReplacements;
  summary.per_file.push({
    file: path.relative(ROOT, file).replace(/\\/g, '/'),
    replacements: perFileReplacements,
  });
}

console.log(`fix-bug-007 (${DRY ? 'DRY-RUN' : 'APPLY'})`);
console.log(`  scanned files containing corruption: ${summary.found}`);
console.log(`  files fixed: ${summary.fixed}`);
console.log(`  total replacements: ${summary.replacements_total}`);
for (const p of summary.per_file) {
  console.log(`    ${p.file}: ${p.replacements} replacement(s)`);
}
