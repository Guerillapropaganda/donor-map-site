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

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const violations = [];
for (const f of stagedFiles()) {
  if (!fs.existsSync(f)) continue;
  let size;
  try { size = fs.statSync(f).size; } catch { continue; }
  if (size > THRESHOLD_BYTES) {
    violations.push({ file: f, mb: (size / (1024 * 1024)).toFixed(1) });
  }
}

if (violations.length === 0) {
  process.exit(0);
}

console.error('');
console.error('[x] pre-commit blocked: ' + violations.length + ' staged file(s) exceed ' + THRESHOLD_MB + 'MB');
console.error('');
for (const v of violations) {
  console.error('  ' + v.mb + ' MB  ' + v.file);
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
