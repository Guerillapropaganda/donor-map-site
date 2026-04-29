#!/usr/bin/env node
/**
 * pathless-stub-aliases-seed.cjs
 *
 * Reads pathless-stub-entities-check.cjs --json output and upserts
 * each pathless ghost stub into data/pathless-stub-aliases.jsonl.
 * Existing records' editorial state is preserved.
 *
 * Wired into the dispatcher every 30 min (offset from
 * duplicate-entity-merges-seed) so newly-detected stubs surface on
 * /audit-claude-decisions automatically.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const store = require('./lib/pathless-stub-aliases-store.cjs');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const AS_JSON = args.includes('--json');

const result = spawnSync(
  process.execPath,
  [path.join(ROOT, 'scripts/pathless-stub-entities-check.cjs'), '--json'],
  { cwd: ROOT, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 }
);

if (result.status !== 0 && result.status !== 1) {
  console.error(`pathless-stub-aliases-seed: harness exited ${result.status}`);
  console.error((result.stderr || '').slice(0, 500));
  process.exit(2);
}

let parsed;
try { parsed = JSON.parse(result.stdout || '{}'); }
catch (err) {
  console.error(`pathless-stub-aliases-seed: failed to parse — ${err.message}`);
  process.exit(2);
}

// Harness emits ghost_donors_sample + ghost_politicians_sample. We
// merge both into one pool of candidates.
const ghostsPol = Array.isArray(parsed.ghost_politicians_sample) ? parsed.ghost_politicians_sample : [];
const ghostsDon = Array.isArray(parsed.ghost_donors_sample) ? parsed.ghost_donors_sample : [];
const candidates = [
  ...ghostsPol.map((g) => ({ entity_id: g.id, name: g.name, kind: 'ghost-politician' })),
  ...ghostsDon.map((g) => ({ entity_id: g.id, name: g.name, kind: 'ghost-donor' })),
];

if (DRY_RUN) {
  const out = { dry_run: true, harness_findings: candidates.length };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.log(`pathless-stub-aliases-seed (dry-run): ${candidates.length} ghost stub(s)`);
  process.exit(0);
}

const records = store.loadAll();
let created = 0, updated = 0;
for (const c of candidates) {
  if (!c.entity_id || !c.name) continue;
  const r = store.upsertCandidate(records, c);
  if (r.status === 'created') created++;
  else if (r.status === 'updated') updated++;
}
if (created > 0 || updated > 0) store.persistAll(records);

const summary = {
  harness_findings: candidates.length,
  created,
  updated,
  total_in_store: records.length,
};
if (AS_JSON) console.log(JSON.stringify(summary));
else console.log(`pathless-stub-aliases-seed: ${summary.harness_findings} ghost(s) — ${created} new, ${updated} refreshed, ${records.length} total in store`);
