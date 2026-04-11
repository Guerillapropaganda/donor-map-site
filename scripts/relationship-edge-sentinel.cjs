#!/usr/bin/env node
/**
 * relationship-edge-sentinel.cjs — pre-commit guard for data/relationships.jsonl
 *
 * Part of Phase 3 (Data Model Only) — Central Relationship Edge Store.
 *
 * Only fires when data/relationships.jsonl is in the staged diff. Validates
 * the file against the full schema (shape, enums, directedness, profile
 * existence, denormalization consistency, id determinism, dedup) and blocks
 * the commit on any failure.
 *
 * Emergency bypass: SKIP_HOOKS=1 git commit ...
 *
 * Exit codes:
 *   0 — clean (file not staged OR file is staged and valid)
 *   1 — staged file failed validation
 */
const { execSync } = require('child_process');
const path = require('path');
const { validateFile, buildTitleIndex } = require('./lib/relationship-edge-validator.cjs');

const RELATIVE_PATH = 'data/relationships.jsonl';

function isStaged() {
  try {
    const out = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..'),
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .some((p) => p === RELATIVE_PATH || p.endsWith('/' + RELATIVE_PATH));
  } catch (_) {
    // Not in a git repo or command failed — don't block
    return false;
  }
}

function main() {
  if (!isStaged()) {
    // File not staged — nothing to validate
    return 0;
  }

  const repoRoot = path.resolve(__dirname, '..');
  const target = path.join(repoRoot, RELATIVE_PATH);
  console.log(`  [relationship-edge-sentinel] validating ${RELATIVE_PATH}`);

  // Build title index once for cross-reference checks
  const titleIndex = buildTitleIndex(path.join(repoRoot, 'content'));
  const result = validateFile(target, { titleIndex });

  if (result.ok) {
    console.log(`  [relationship-edge-sentinel] ✓ ${result.total} edges valid`);
    return 0;
  }

  console.error('');
  console.error(
    `[x] relationship-edge-sentinel: ${result.errorCount} error(s) across ${result.total} edges`
  );
  for (const err of result.errors.slice(0, 20)) {
    const idStr = err.id ? ` [id=${err.id}]` : '';
    console.error(`  line ${err.line}${idStr}: ${err.message}`);
  }
  if (result.errors.length > 20) {
    console.error(`  ... and ${result.errors.length - 20} more.`);
  }
  console.error('');
  console.error('Fix the issues above, or bypass with SKIP_HOOKS=1 git commit ...');
  return 1;
}

if (require.main === module) {
  process.exit(main());
}
