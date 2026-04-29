#!/usr/bin/env node
/**
 * migrate-pre-adr-0029-provenance.cjs
 *
 * One-time migration. Backfills decided_by + decided_at + auto_revert_eligible
 * + change_log on records that pre-date the editorial-decision-pipeline.
 *
 * Records in `candidate` state need nothing (no decision was made; the
 * provenance check intentionally skips candidates).
 *
 * Records in any other state (resolved, kept, blocked-by-librarian-gap,
 * approved-prune, approved-alias, rejected, needs-research) need:
 *   decided_by:        'david'  (best-honest backfill — this happened before
 *                                claude-auto existed; the editor was the
 *                                only writer)
 *   decided_at:        resolved_at if present, else last_seen, else now
 *   auto_revert_eligible: false (only claude-auto Tier 1 is eligible)
 *   change_log:        [{ at: <decided_at>, from: 'candidate', to: <state>,
 *                         decided_by: 'david', note: 'pre-adr-0029-backfill' }]
 *
 * Idempotent — re-runs are safe; records that already have decided_by set
 * are skipped.
 *
 * USAGE:
 *   node scripts/migrate-pre-adr-0029-provenance.cjs           # apply
 *   node scripts/migrate-pre-adr-0029-provenance.cjs --dry-run # preview
 */

'use strict';

const path = require('path');
const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));
require(path.join(__dirname, 'classes', 'index.cjs'));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

let totalNeedsBackfill = 0;
let totalSkipped = 0;
const perClass = {};

for (const meta of pipeline.listClasses()) {
  const cls = pipeline.getClass(meta.name);
  const records = cls.store.loadAll();
  let backfilled = 0;
  let alreadyHas = 0;

  for (const r of records) {
    if (r.state === 'candidate') continue;
    if (r.decided_by) { alreadyHas++; continue; }

    backfilled++;
    if (dryRun) continue;

    const decidedAt = r.resolved_at || r.last_seen || new Date().toISOString();
    r.decided_by = 'david';
    r.decided_at = decidedAt;
    r.auto_revert_eligible = false;
    if (!Array.isArray(r.change_log)) {
      r.change_log = [{
        at: decidedAt,
        from: 'candidate',
        to: r.state,
        decided_by: 'david',
        payload_keys: [],
        note: 'pre-adr-0029-backfill (migration script)',
      }];
    }
  }

  perClass[meta.name] = { backfilled, already_had_provenance: alreadyHas, total: records.length };
  totalNeedsBackfill += backfilled;
  totalSkipped += alreadyHas;

  if (!dryRun && backfilled > 0) cls.store.persistAll(records);
}

console.log(dryRun ? '--- DRY RUN ---' : '--- migration applied ---');
for (const [name, c] of Object.entries(perClass)) {
  console.log(`  ${name}: ${c.backfilled} backfilled, ${c.already_had_provenance} already had provenance, ${c.total} total`);
}
console.log('');
console.log(`Total backfilled: ${totalNeedsBackfill}`);
console.log(`Total already had provenance: ${totalSkipped}`);
if (dryRun) console.log('\nRun without --dry-run to apply.');
