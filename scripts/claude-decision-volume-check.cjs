#!/usr/bin/env node
/**
 * claude-decision-volume-check.cjs
 *
 * Harness check (ADR-0029).
 *
 * Rate-limit watchdog. Counts editorial decisions made by claude-auto in
 * the last hour across every registered class. Fires findings when the
 * rate exceeds a configured threshold, indicating that auto-apply may be
 * running away — e.g. a faulty predicate, a feedback loop where one
 * decision triggers another, or a bug in the apply_decision side effect.
 *
 * Why a rate limit: an unbounded auto-apply could in principle resolve
 * thousands of records in a single dispatcher cycle. Even if each is
 * individually correct, that's an outsized batch with no human review
 * window. The rate limit creates a soft circuit breaker — the harness
 * fires, the calibration check is examined manually, and the predicate
 * is reviewed before the next cycle continues.
 *
 * Threshold defaults:
 *   - 50 decisions/hour across all classes is the alarm threshold
 *   - 200 decisions/hour is hard fail (clamp + freeze auto-apply)
 *   These are conservative for the 2026-04-28 vault scale; revise as
 *   queues drain and steady-state volumes settle.
 *
 * Phase 2 will add the actual freeze mechanism. Phase 1 just observes.
 *
 * --json: machine-readable for vault-audit.
 */

'use strict';

const path = require('path');
const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));
require(path.join(__dirname, 'classes', 'index.cjs'));

const args = process.argv.slice(2);
const asJson = args.includes('--json');

const SOFT_LIMIT_PER_HOUR = 50;
const HARD_LIMIT_PER_HOUR = 200;
const WINDOW_MS = 60 * 60 * 1000;
const cutoff = Date.now() - WINDOW_MS;

const classes = pipeline.listClasses();
const byClass = {};
let total = 0;

for (const meta of classes) {
  const cls = pipeline.getClass(meta.name);
  const records = cls.store.loadAll();
  let count = 0;
  for (const r of records) {
    if (r.decided_by !== 'claude-auto') continue;
    if (!r.decided_at) continue;
    if (new Date(r.decided_at).getTime() < cutoff) continue;
    count++;
  }
  byClass[meta.name] = count;
  total += count;
}

const findings = [];
if (total >= HARD_LIMIT_PER_HOUR) {
  findings.push({
    kind: 'claude-decision-volume-hard-limit',
    total_in_window: total,
    threshold: HARD_LIMIT_PER_HOUR,
    by_class: byClass,
    detail: `${total} claude-auto decisions in the last hour (>= ${HARD_LIMIT_PER_HOUR}). Auto-apply should be reviewed urgently — likely runaway predicate or feedback loop.`,
  });
} else if (total >= SOFT_LIMIT_PER_HOUR) {
  findings.push({
    kind: 'claude-decision-volume-soft-limit',
    total_in_window: total,
    threshold: SOFT_LIMIT_PER_HOUR,
    by_class: byClass,
    detail: `${total} claude-auto decisions in the last hour (>= ${SOFT_LIMIT_PER_HOUR}). Higher than expected steady-state — review the calibration check and recent decision sample.`,
  });
}

if (asJson) {
  console.log(JSON.stringify({
    findings_count: findings.length,
    findings,
    total_in_window: total,
    by_class: byClass,
    soft_limit: SOFT_LIMIT_PER_HOUR,
    hard_limit: HARD_LIMIT_PER_HOUR,
    window_hours: 1,
  }));
  process.exit(0);
}

console.log(`claude-decision-volume: ${total} claude-auto decision(s) in the last hour`);
console.log('  by class:', JSON.stringify(byClass));
console.log(`  soft limit: ${SOFT_LIMIT_PER_HOUR}, hard limit: ${HARD_LIMIT_PER_HOUR}`);
if (findings.length === 0) console.log('✓ within rate budget');
else { for (const f of findings) console.log(`  ✗ ${f.kind}: ${f.detail}`); process.exit(1); }
