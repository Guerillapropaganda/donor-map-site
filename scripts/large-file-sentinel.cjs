#!/usr/bin/env node
/**
 * large-file-sentinel.cjs
 *
 * Blocks commits that stage a file larger than the size threshold.
 * Prevents the 2026-04-23 incident class where `git add -A` swept up
 * 1.7GB FEC dedup .bak files, got past local commit, and was rejected
 * by GitHub's 100MB hard limit — forcing a reset + redo.
 *
 * Threshold: 50MB (safety margin against GitHub's 100MB ceiling).
 *
 * Runs on staged files in pre-commit. Only checks ADD / MODIFY /
 * COPY / RENAME — deletions are never too big.
 *
 * Exit codes:
 *   0 = clean
 *   1 = at least one staged file exceeds threshold
 *
 * Usage:
 *   node scripts/large-file-sentinel.cjs
 *   node scripts/large-file-sentinel.cjs --threshold-mb 100   # custom limit
 */

const { execSync } = require('child_process');
const fs = require('fs');

const thresholdIdx = process.argv.indexOf('--threshold-mb');
const THRESHOLD_MB = thresholdIdx !== -1 ? parseInt(process.argv[thresholdIdx + 1], 10) : 50;
const THRESHOLD_BYTES = THRESHOLD_MB * 1024 * 1024;

// Hard ceiling — even already-tracked large files get blocked if they push
// past this. GitHub rejects > 100MB; we leave a small margin.
const HARD_CEILING_MB = 95;
const HARD_CEILING_BYTES = HARD_CEILING_MB * 1024 * 1024;

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/** Size of `path` at HEAD, or null if not tracked. */
function headSize(path) {
  try {
    const out = execSync(`git cat-file -s HEAD:"${path}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
    return parseInt(out.trim(), 10);
  } catch {
    return null;
  }
}

const violations = [];
for (const f of stagedFiles()) {
  if (!fs.existsSync(f)) continue;
  let size;
  try { size = fs.statSync(f).size; } catch { continue; }
  if (size <= THRESHOLD_BYTES) continue;

  // Hard ceiling — block regardless of history.
  if (size > HARD_CEILING_BYTES) {
    violations.push({ file: f, mb: (size / (1024 * 1024)).toFixed(1), reason: `> ${HARD_CEILING_MB}MB hard ceiling` });
    continue;
  }

  // Allow growth on files already tracked at >= the threshold. Canonical
  // stores like data/relationships.jsonl grow naturally as the corpus
  // expands; we don't want to block every commit that touches them.
  // Only NEW large files or unexpected growth (was small, now huge) get blocked.
  const baseline = headSize(f);
  if (baseline !== null && baseline >= THRESHOLD_BYTES) continue;

  violations.push({ file: f, mb: (size / (1024 * 1024)).toFixed(1), reason: baseline === null ? 'new file' : `grew from ${(baseline / (1024 * 1024)).toFixed(1)}MB` });
}

if (violations.length === 0) {
  process.exit(0);
}

console.error('');
console.error('[x] pre-commit blocked: ' + violations.length + ' staged file(s) exceed ' + THRESHOLD_MB + 'MB');
console.error('');
for (const v of violations) {
  console.error('  ' + v.mb + ' MB  ' + v.file + (v.reason ? '  (' + v.reason + ')' : ''));
}
console.error('');
console.error('  GitHub rejects pushes with files over 100MB. This sentinel blocks');
console.error('  at 50MB so you catch it before the commit, not at push time.');
console.error('');
console.error('  Fix options:');
console.error('    1. Add a pattern for these files to .gitignore, then:');
console.error('         git reset HEAD -- <file>');
console.error('    2. If the file should actually be tracked, use Git LFS');
console.error('         (see https://git-lfs.github.com). Rare — usually the');
console.error('         right call is gitignore.');
console.error('    3. Emergency bypass: SKIP_HOOKS=1 git commit ...');
console.error('       (Only if you are absolutely certain the sentinel is wrong.)');
console.error('');
process.exit(1);
