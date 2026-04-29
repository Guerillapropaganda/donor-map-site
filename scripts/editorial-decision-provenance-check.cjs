#!/usr/bin/env node
/**
 * editorial-decision-provenance-check.cjs
 *
 * Harness check (ADR-0029).
 *
 * Verifies that every editorial-decision record in any registered class's
 * canonical store has the required provenance fields. Fires findings on:
 *
 *   - Records in a non-candidate state with no decided_by
 *   - Records with an invalid decided_by value
 *   - Records in a non-candidate state with no decided_at timestamp
 *   - Records with auto_revert_eligible=true but decided_by != claude-auto
 *
 * Why this exists: Rule 16 of CLAUDE.md mandates provenance on every
 * applied decision. Without provenance, a sample-audit can't tell which
 * records Claude touched vs which David touched. Without that, the
 * "weekly spot-check 5% of Claude decisions" workflow doesn't function
 * and the safety net degrades silently.
 *
 * --json: machine-readable for vault-audit.
 */

'use strict';

const path = require('path');
const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));
require(path.join(__dirname, 'classes', 'index.cjs'));

const args = process.argv.slice(2);
const asJson = args.includes('--json');

const VALID_DECIDED_BY = new Set(['david', 'claude-auto', 'claude-batch-approved']);

const findings = [];
const classes = pipeline.listClasses();

for (const meta of classes) {
  const cls = pipeline.getClass(meta.name);
  const records = cls.store.loadAll();
  for (const r of records) {
    if (r.state === 'candidate') continue;  // candidates have no decision yet

    if (!r.decided_by) {
      findings.push({
        class: meta.name,
        id: r.id,
        kind: 'missing-decided-by',
        state: r.state,
        detail: `state=${r.state} but decided_by is null/missing`,
      });
    } else if (!VALID_DECIDED_BY.has(r.decided_by)) {
      findings.push({
        class: meta.name,
        id: r.id,
        kind: 'invalid-decided-by',
        state: r.state,
        decided_by: r.decided_by,
        detail: `decided_by="${r.decided_by}" is not one of ${[...VALID_DECIDED_BY].join('/')}`,
      });
    }

    if (!r.decided_at && r.state !== 'candidate') {
      findings.push({
        class: meta.name,
        id: r.id,
        kind: 'missing-decided-at',
        state: r.state,
        detail: 'no decided_at timestamp',
      });
    }

    if (r.auto_revert_eligible === true && r.decided_by !== 'claude-auto') {
      findings.push({
        class: meta.name,
        id: r.id,
        kind: 'inconsistent-auto-revert-flag',
        decided_by: r.decided_by,
        detail: 'auto_revert_eligible=true but decided_by != claude-auto',
      });
    }
  }
}

if (asJson) {
  console.log(JSON.stringify({
    findings_count: findings.length,
    findings: findings.slice(0, 50),
    classes_inspected: classes.length,
  }));
  process.exit(0);
}

console.log(`editorial-decision-provenance: ${findings.length} finding(s) across ${classes.length} class(es)`);
if (findings.length === 0) {
  console.log('✓ all decision records have valid provenance');
} else {
  for (const f of findings.slice(0, 20)) {
    console.log(`  ✗ ${f.class}:${f.id} — ${f.kind} (${f.detail})`);
  }
  if (findings.length > 20) console.log(`  ... and ${findings.length - 20} more`);
  process.exit(1);
}
