#!/usr/bin/env node
/**
 * ci-prebuild.cjs
 *
 * Regenerates derived artifacts that the Quartz/ops build statically imports
 * but that cannot live in git — either because they exceed GitHub's 100MB
 * file cap, or because they're expensive to keep diff-clean across commits.
 *
 * Runs in `.github/workflows/deploy.yml` immediately after `npm ci` and
 * before `npx quartz build`. Also safe to run locally (`node scripts/ci-prebuild.cjs`)
 * to reproduce the CI environment.
 *
 * HOW TO ADD A NEW DERIVED ARTIFACT:
 *   1. Add an entry to the ARTIFACTS array below with:
 *      - name:   human-readable label for logs
 *      - output: the file path the build will look for
 *      - script: the rebuilder (relative to repo root)
 *   2. Add the output path to .gitignore.
 *   3. Done — CI will regenerate it on every deploy.
 *
 * WHY A SINGLE MANIFEST:
 *   Previously this was an implicit "run X before deploy" convention in a
 *   Session State note. That convention broke (commit 9af0a85c8, 2026-04-20)
 *   when the first derived-but-required artifact hit CI. One explicit
 *   manifest avoids repeat incidents as we add more large derived data.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ARTIFACTS = [
  {
    name: 'relationships-per-profile',
    output: 'data/relationships-per-profile.json',
    script: 'scripts/build-relationships-per-profile.cjs',
    reason: '113MB — static import in quartz/components/{ProfileWidget,DiscoveryPanel}.tsx',
  },
  {
    name: 'profile-search-index',
    output: 'quartz/static/profile-index.json',
    script: 'scripts/build-profile-search-index.cjs',
    reason: 'Client-fetched autocomplete source for ProfileSearch (copied to public/static/ by Plugin.Static during build)',
  },
];

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function main() {
  console.log(`ci-prebuild: rebuilding ${ARTIFACTS.length} derived artifact(s)`);
  const started = Date.now();
  for (const a of ARTIFACTS) {
    console.log(`\n── ${a.name} (${a.reason})`);
    run(`node ${a.script}`);
    const full = path.join(ROOT, a.output);
    if (!fs.existsSync(full)) {
      console.error(`✘ ${a.name}: rebuilder finished but ${a.output} does not exist`);
      process.exit(1);
    }
    const size = (fs.statSync(full).size / 1024 / 1024).toFixed(1);
    console.log(`✓ ${a.name}: ${a.output} (${size} MB)`);
  }
  console.log(`\nci-prebuild: done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main();
