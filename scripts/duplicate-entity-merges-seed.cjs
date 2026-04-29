#!/usr/bin/env node
/**
 * duplicate-entity-merges-seed.cjs
 *
 * Reads duplicate-entity-profiles-check.cjs --json output and upserts
 * each duplicate group into data/duplicate-entity-merges.jsonl. Edits
 * to existing records preserve their editorial state (so re-running
 * doesn't reset David's calls).
 *
 * Wired into the dispatcher every 30 min so newly-detected duplicates
 * surface on /audit-claude-decisions automatically without a manual
 * seed step.
 *
 * Usage:
 *   node scripts/duplicate-entity-merges-seed.cjs            # apply
 *   node scripts/duplicate-entity-merges-seed.cjs --dry-run  # preview
 *   node scripts/duplicate-entity-merges-seed.cjs --json     # machine
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const store = require('./lib/duplicate-entity-merges-store.cjs');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const AS_JSON = args.includes('--json');

// Run the harness check in --json mode and parse its output.
const result = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts/duplicate-entity-profiles-check.cjs'), '--json'],
  { cwd: ROOT, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 }
);

if (result.status !== 0 && result.status !== 1) {
  // exit 1 = has findings (per harness convention), still parseable
  console.error(`duplicate-entity-merges-seed: harness check exited ${result.status}`);
  console.error((result.stderr || '').slice(0, 500));
  process.exit(2);
}

let parsed;
try {
  parsed = JSON.parse(result.stdout || '{}');
} catch (err) {
  console.error(`duplicate-entity-merges-seed: failed to parse harness output — ${err.message}`);
  process.exit(2);
}

const groups = Array.isArray(parsed.duplicates) ? parsed.duplicates
  : Array.isArray(parsed.findings) ? parsed.findings
  : Array.isArray(parsed.groups) ? parsed.groups
  : [];

if (DRY_RUN) {
  const out = { dry_run: true, harness_findings: groups.length };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.log(`duplicate-entity-merges-seed (dry-run): ${groups.length} duplicate group(s) from harness`);
  process.exit(0);
}

const records = store.loadAll();
let created = 0;
let updated = 0;

for (const g of groups) {
  // The harness emits {reason, key, profiles:[{id,name,type,profile_path}]}
  const cand = {
    reason: g.reason,
    key: g.key,
    profiles: Array.isArray(g.profiles) ? g.profiles : [],
  };
  if (!cand.reason || !cand.key || cand.profiles.length < 2) continue;
  const r = store.upsertCandidate(records, cand);
  if (r.status === 'created') created++;
  else if (r.status === 'updated') updated++;
}

if (created > 0 || updated > 0) {
  store.persistAll(records);
}

const summary = {
  harness_findings: groups.length,
  created,
  updated,
  total_in_store: records.length,
};

if (AS_JSON) console.log(JSON.stringify(summary));
else console.log(`duplicate-entity-merges-seed: ${summary.harness_findings} group(s) from harness — ${created} new, ${updated} refreshed, ${records.length} total in store`);
