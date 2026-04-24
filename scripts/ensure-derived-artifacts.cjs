#!/usr/bin/env node
/**
 * ensure-derived-artifacts.cjs — regenerate missing derived data files.
 *
 * Some data files in data/ are **derived artifacts**: too big to commit
 * (multi-MB JSON), gitignored, but imported directly by Quartz components.
 * A fresh clone or a new git worktree starts with these files missing,
 * which breaks `tsc --noEmit` and blocks any `git push`. The 2026-04-24
 * Dashboard-rewire session hit exactly this: DiscoveryPanel.tsx +
 * ProfileWidget.tsx couldn't find `data/relationships-per-profile.json`,
 * which is gitignored and had never been generated in that worktree.
 *
 * This script is invoked by the post-checkout and post-merge git hooks
 * (so the missing-artifact state is self-healing after any branch switch
 * or merge) and can also be run manually.
 *
 * For each registered artifact:
 *   - If the file is missing, regenerate it by running its builder.
 *   - If the file exists, skip. (Staleness is handled by the dispatcher,
 *     which schedules `build-relationships-per-profile` weekly. Rebuilding
 *     on every branch switch would add measurable delay for no benefit.)
 *
 * Exit 0 even if a regeneration fails — this is a non-blocking convenience
 * hook. We print a loud warning and let the developer decide what to do.
 * Bypass with SKIP_HOOKS=1.
 *
 * Adding a new derived artifact:
 *   1. Make sure it's gitignored.
 *   2. Add a { path, builder, args? } entry to ARTIFACTS below.
 *   3. Confirm the builder script is idempotent + fast (<10s ideally).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.env.SKIP_HOOKS === '1') {
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');

const ARTIFACTS = [
  {
    path: 'data/relationships-per-profile.json',
    builder: 'scripts/build-relationships-per-profile.cjs',
    args: [],
    why: 'imported by quartz/components/DiscoveryPanel.tsx + ProfileWidget.tsx',
  },
];

let failures = 0;
let regenerated = 0;

for (const a of ARTIFACTS) {
  const abs = path.join(ROOT, a.path);
  if (fs.existsSync(abs)) continue;

  process.stdout.write(`[ensure-derived-artifacts] missing: ${a.path}\n`);
  process.stdout.write(`  reason: ${a.why}\n`);
  process.stdout.write(`  regenerating via: node ${a.builder} ${a.args.join(' ')}\n`);

  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, a.builder), ...a.args],
    { cwd: ROOT, stdio: 'inherit' }
  );

  if (result.status !== 0) {
    process.stderr.write(
      `\n  ⚠  builder failed for ${a.path} (exit ${result.status})\n` +
      `     run manually: node ${a.builder}\n\n`
    );
    failures++;
    continue;
  }

  if (!fs.existsSync(abs)) {
    process.stderr.write(
      `\n  ⚠  builder exited 0 but ${a.path} still missing\n` +
      `     run manually: node ${a.builder}\n\n`
    );
    failures++;
    continue;
  }

  regenerated++;
}

if (regenerated > 0) {
  process.stdout.write(`[ensure-derived-artifacts] regenerated ${regenerated} artifact(s)\n`);
}

// Non-blocking — never fail the parent hook.
process.exit(0);
