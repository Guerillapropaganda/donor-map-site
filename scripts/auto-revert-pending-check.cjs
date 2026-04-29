#!/usr/bin/env node
/**
 * auto-revert-pending-check.cjs
 *
 * Harness check (ADR-0029).
 *
 * Surfaces editorial decisions that were auto-reverted by the calibration
 * drift hook (Phase 2 wires this up). A reverted decision sits back in
 * `state=candidate` with `reverted_reason=calibration-drift:<fixture>`
 * set, awaiting re-review by David. Until reviewed, the underlying
 * source data may already have been written and may be in a half-state.
 *
 * Findings count = records with non-null reverted_reason in candidate
 * state. These represent decisions Claude was confident in, the
 * calibration disagreed, and a human needs to either:
 *   - re-approve (decide the calibration was a false positive, fix the
 *     fixture)
 *   - confirm the revert (the predicate WAS wrong; tighten it)
 *   - accept reject (the merge was wrong; never re-apply)
 *
 * Phase 2 ships the auto-revert mechanism. This check exists in Phase 1
 * so that when Phase 2 lands, the visibility surface is already in place.
 * Until then, this check returns 0 (no records can be in reverted state
 * since nothing reverts them yet).
 *
 * --json: machine-readable for vault-audit.
 */

'use strict';

const path = require('path');
const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));
require(path.join(__dirname, 'classes', 'index.cjs'));

const args = process.argv.slice(2);
const asJson = args.includes('--json');

const findings = [];
const classes = pipeline.listClasses();

for (const meta of classes) {
  const cls = pipeline.getClass(meta.name);
  const records = cls.store.loadAll();
  for (const r of records) {
    if (!r.reverted_reason) continue;
    if (r.state !== 'candidate') continue;
    findings.push({
      class: meta.name,
      id: r.id,
      name: r.name || r.subject || '(unnamed)',
      reverted_reason: r.reverted_reason,
      decided_at: r.decided_at,
      detail: 'auto-reverted, awaiting human re-review',
    });
  }
}

if (asJson) {
  console.log(JSON.stringify({
    findings_count: findings.length,
    findings: findings.slice(0, 50),
  }));
  process.exit(0);
}

console.log(`auto-revert-pending: ${findings.length} record(s) awaiting re-review`);
if (findings.length === 0) console.log('✓ no auto-reverted decisions pending');
else for (const f of findings.slice(0, 20)) {
  console.log(`  • ${f.class}:${f.id} (${f.name}) — ${f.reverted_reason}`);
}
