#!/usr/bin/env node
/**
 * calibration-auto-revert.cjs
 *
 * ADR-0029 Phase 2: closes the safety loop.
 *
 * Runs after the calibration-drift check fires. For each failing fixture,
 * walks every registered editorial-decision class and identifies recent
 * claude-auto decisions in the fixture's blast radius. Reverts them to
 * state=candidate with reverted_reason set, surfacing them via the
 * auto-revert-pending harness check for human re-review.
 *
 * Conservative by design — does NOT undo external side effects (alias
 * appended to entities.jsonl, frontmatter modified, etc.). The decision
 * record state revert is the signal; a class-specific revert helper can
 * be added if a class needs that, but the default is human re-review.
 * This avoids the worst failure mode (auto-revert + auto-reapply ping-
 * pong) and preserves the audit trail.
 *
 * Idempotency:
 *   - Re-runs against the same fixture do not re-revert already-reverted
 *     records (records already in candidate state with reverted_reason
 *     set are skipped — re-revert would zero out the original decided_at).
 *   - Window-bounded by default (last 24h) so old decisions aren't
 *     suddenly re-evaluated against new fixtures.
 *
 * USAGE:
 *   node scripts/calibration-auto-revert.cjs           # apply
 *   node scripts/calibration-auto-revert.cjs --dry-run # preview only
 *   node scripts/calibration-auto-revert.cjs --json    # machine output
 *
 * Dispatcher schedule: every 15 minutes, ~1 minute after calibration-drift
 * runs (so the calibration finding is fresh). See attention-dispatcher.cjs.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));
require(path.join(__dirname, 'classes', 'index.cjs'));

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const asJson = args.includes('--json');

// Window: only revert decisions made in the last 24h. Older decisions are
// presumed reviewed-by-human-or-survived-multiple-checks and shouldn't be
// touched by drift events from today.
const WINDOW_MS = 24 * 60 * 60 * 1000;

// ─── load fixtures (we need the full fixture record to feed blast_radius) ─

function loadFixtureRecords() {
  const fs = require('fs');
  const fixturePath = path.join(ROOT, 'data', 'calibration-fixture.jsonl');
  if (!fs.existsSync(fixturePath)) return new Map();
  const map = new Map();
  for (const line of fs.readFileSync(fixturePath, 'utf-8').split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    try {
      const f = JSON.parse(line);
      if (f.profile) map.set(f.profile, f);
    } catch { /* skip */ }
  }
  return map;
}

// ─── run calibration check ─────────────────────────────────────────

function runCalibrationCheck() {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts/calibration-drift-check.cjs'), '--json'],
    { cwd: ROOT, encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 }
  );
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`calibration check failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

// ─── main ──────────────────────────────────────────────────────────

const calibration = runCalibrationCheck();
const failingFixtures = (calibration.findings || []).filter((f) => f.kind === 'calibration-drift');

if (failingFixtures.length === 0) {
  if (asJson) console.log(JSON.stringify({ revert_runs: 0, reverted_total: 0, reason: 'no-failing-fixtures' }));
  else console.log('✓ no failing calibration fixtures — nothing to revert');
  process.exit(0);
}

const fixtureRecords = loadFixtureRecords();
const classes = pipeline.listClasses();

const summary = {
  failing_fixtures: failingFixtures.length,
  classes_inspected: classes.length,
  reverts: [],
};

for (const fail of failingFixtures) {
  const fixtureRecord = fixtureRecords.get(fail.profile);
  if (!fixtureRecord) {
    summary.reverts.push({
      fixture: fail.profile,
      bucket: fail.bucket,
      skipped: 'fixture record not in calibration-fixture.jsonl',
    });
    continue;
  }
  for (const meta of classes) {
    const cls = pipeline.getClass(meta.name);
    if (!cls.has_tier1) continue;  // only auto-applied decisions are auto-revert eligible

    if (dryRun) {
      // Read-only inspection: which records WOULD be reverted?
      const records = cls.store.loadAll();
      const sinceTime = Date.now() - WINDOW_MS;
      const eligible = records.filter((r) =>
        r.auto_revert_eligible &&
        r.decided_by === 'claude-auto' &&
        (r.state === 'resolved' || r.state === cls.approve_state) &&
        r.decided_at &&
        new Date(r.decided_at).getTime() >= sinceTime &&
        !r.reverted_reason  // already reverted records are NOT eligible (idempotency)
      );
      const inBlastRadius = cls.blast_radius
        ? cls.blast_radius(fixtureRecord, eligible)
        : eligible;
      summary.reverts.push({
        fixture: fail.profile,
        bucket: fail.bucket,
        class: meta.name,
        would_revert: inBlastRadius.length,
        eligible_in_window: eligible.length,
      });
      continue;
    }

    // Actual revert. The pipeline's autoRevert filters records that already
    // have reverted_reason set, providing the idempotency guard.
    const result = pipeline.autoRevert(meta.name, {
      fixture: fail.profile,
      fixture_record: fixtureRecord,
      since_ms: WINDOW_MS,
    });
    summary.reverts.push({
      fixture: fail.profile,
      bucket: fail.bucket,
      class: meta.name,
      ...result,
    });
  }
}

const totalReverted = summary.reverts.reduce((acc, r) => acc + (r.reverted || 0), 0);

if (asJson) {
  console.log(JSON.stringify({ ...summary, reverted_total: totalReverted, dry_run: dryRun }));
  process.exit(0);
}

console.log(`calibration-auto-revert: ${failingFixtures.length} failing fixture(s), ${classes.length} class(es) inspected`);
if (dryRun) console.log('(dry run — no records modified)');
console.log('');
for (const r of summary.reverts) {
  if (r.skipped) {
    console.log(`  - ${r.fixture}/${r.bucket} — skipped: ${r.skipped}`);
  } else if (dryRun) {
    console.log(`  - ${r.fixture}/${r.bucket} via ${r.class}: would revert ${r.would_revert}/${r.eligible_in_window} record(s)`);
  } else {
    console.log(`  - ${r.fixture}/${r.bucket} via ${r.class}: reverted ${r.reverted || 0} record(s)`);
  }
}
console.log('');
console.log(`Total ${dryRun ? 'WOULD revert' : 'reverted'}: ${totalReverted}`);
if (totalReverted > 0 && !dryRun) {
  console.log('');
  console.log('Reverted records are now in state=candidate with reverted_reason set.');
  console.log('They surface via the auto-revert-pending harness check.');
  console.log('Re-review via the librarian-gap-review.md or ops audit page.');
}
