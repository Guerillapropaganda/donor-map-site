#!/usr/bin/env node
/**
 * leftover-artifacts-check.cjs
 *
 * Harness check (ADR-0021) that flags transient artifact files lying
 * around in the repo. These are things scripts leave behind during
 * dedup / regen / migration runs that should either be committed
 * (converted to real output) or gitignored + deleted (confirmed
 * throwaway). Left floating, they:
 *
 *   1. Get swept up by `git add -A` into the wrong commit (2026-04-23
 *      incident — 1.7GB .bak files landed in a "dispatcher outputs"
 *      commit, blocked the push).
 *   2. Confuse the repo state for the next session — "is this from my
 *      work or someone else's?"
 *   3. Occupy disk space invisibly.
 *
 * The check scans the working tree for known cruft patterns. Patterns
 * that are already gitignored are skipped (they're invisible to git,
 * so they're not a commit-scope risk). Patterns that ARE trackable
 * but haven't been committed yet are the target.
 *
 * Surfaces each finding to the Attention Queue as source
 * "leftover-artifacts" in the compounding bucket — cleanup, not
 * blocking. Links to the harness at /system-health.
 *
 * Usage:
 *   node scripts/leftover-artifacts-check.cjs              # scan + write
 *   node scripts/leftover-artifacts-check.cjs --no-queue   # scan only
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NO_QUEUE = process.argv.includes('--no-queue');

// Known cruft patterns. Each entry:
//   pattern: relative path glob (processed via walk + regex)
//   reason:  plain-English why this is cruft
//   fix:     what to do with it
const PATTERNS = [
  {
    match: (f) => /\.(bak|pre-dedupe\.bak|pre-nickname-dedup\.bak|dedupd-state)$/.test(f),
    reason: 'Dedup/migration script backup — should be gitignored',
    fix: 'Verify original is committed, then delete (or confirm gitignore covers it)',
    category: 'dedup-backup',
  },
  {
    match: (f) => /\.(tmp|temp)$/i.test(f) && !f.startsWith('node_modules/'),
    reason: 'Temp file left behind by a script',
    fix: 'Delete — scripts should clean up after themselves',
    category: 'temp-file',
  },
  {
    match: (f) => /\.log$/i.test(f) && !f.includes('node_modules') && !f.includes('.husky'),
    reason: 'Log file outside a gitignored location',
    fix: 'Confirm gitignore pattern, delete if transient',
    category: 'stray-log',
  },
];

function walk(dir, acc, skipDirs) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc, skipDirs);
    else acc.push(full.replace(/\\/g, '/'));
  }
}

const skipDirs = new Set([
  'node_modules', '.git', '.next', 'public', '.cache',
  '.husky', 'ops', // ops has its own node_modules + artifacts
]);

const allFiles = [];
walk('.', allFiles, skipDirs);

// Filter to files git considers tracked-or-trackable (i.e. not gitignored)
let gitIgnored;
try {
  const rel = allFiles.map(f => f.startsWith('./') ? f.slice(2) : f);
  // Batch check-ignore to keep it fast
  const out = execSync('git check-ignore --stdin', {
    input: rel.join('\n'),
    encoding: 'utf-8',
  });
  gitIgnored = new Set(out.split('\n').filter(Boolean));
} catch (e) {
  // `git check-ignore` exits non-zero when nothing is ignored. stdout still has ignored files though.
  gitIgnored = new Set(
    (e.stdout || '').toString().split('\n').filter(Boolean)
  );
}

const findings = [];
for (const f of allFiles) {
  const relf = f.startsWith('./') ? f.slice(2) : f;
  if (gitIgnored.has(relf)) continue; // Already gitignored — not a commit-scope risk
  for (const p of PATTERNS) {
    if (p.match(relf)) {
      let sizeMb = null;
      try { sizeMb = (fs.statSync(relf).size / (1024 * 1024)); } catch {}
      findings.push({
        file: relf,
        reason: p.reason,
        fix: p.fix,
        category: p.category,
        sizeMb: sizeMb != null ? sizeMb.toFixed(1) : null,
      });
      break;
    }
  }
}

console.log('leftover-artifacts-check: ' + findings.length + ' finding(s)');
if (findings.length > 0) {
  console.log('');
  for (const f of findings.slice(0, 30)) {
    console.log('  ' + (f.sizeMb != null ? (f.sizeMb + ' MB').padEnd(12) : ''.padEnd(12)) + f.category.padEnd(16) + f.file);
  }
  if (findings.length > 30) console.log('  ... and ' + (findings.length - 30) + ' more');
}

if (!NO_QUEUE && findings.length > 0) {
  try {
    const { addEntries } = require('./lib/attention-queue.cjs');
    // Collapse into one entry per category so we don't flood the queue
    const byCategory = {};
    for (const f of findings) {
      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);
    }
    const entries = Object.entries(byCategory).map(([cat, items]) => ({
      bucket: 'compounding',
      what: items.length + ' leftover ' + cat + ' file(s)',
      why: items[0].reason + '. Top: ' + items[0].file + (items.length > 1 ? ' (+' + (items.length - 1) + ' more)' : ''),
      where: '/system-health',
      cost_min: 5,
      leverage: 2,
      metadata: { category: cat, count: items.length, files: items.slice(0, 5).map(i => i.file) },
    }));
    addEntries('leftover-artifacts', entries);
    console.log('');
    console.log('Wrote ' + entries.length + ' entries to the Attention Queue');
  } catch (e) {
    console.error('Queue write failed: ' + e.message);
  }
}

process.exit(0);
