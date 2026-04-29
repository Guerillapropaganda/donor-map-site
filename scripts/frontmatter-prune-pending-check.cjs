#!/usr/bin/env node
/**
 * frontmatter-prune-pending-check.cjs
 *
 * Harness check (ADR-0027 P3 / Phase 2D ops follow-up). Counts records
 * in `data/frontmatter-orphan-candidates.jsonl` that are in state=
 * `approved-prune` — i.e. David clicked "approve prune" but the
 * frontmatter rewrite never landed.
 *
 * Why this matters: under normal flow, a click on Approve in
 * /audit-claude-decisions transitions the record to approved-prune AND
 * spawns rebuild-relationship-caches.cjs --apply-approved in the same
 * call — so the record should be in `resolved` state by the next
 * dispatcher tick. If a record sits in approved-prune for more than a
 * few minutes, something failed silently:
 *
 *   - The rebuilder spawn errored (path missing, frontmatter parse fail,
 *     YAML write error)
 *   - The class apply_decision was bypassed (someone wrote approved-prune
 *     directly via the legacy --report-orphans path?)
 *   - A pipeline error left the record half-applied
 *
 * Findings count = number of records stuck in approved-prune. Zero is
 * the steady state. Any positive count is an attention-queue surface
 * for David to investigate.
 *
 * USAGE:
 *   node scripts/frontmatter-prune-pending-check.cjs --json
 *   node scripts/frontmatter-prune-pending-check.cjs           # human output
 */

'use strict';

const store = require('./lib/frontmatter-orphan-candidates-store.cjs');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');

function main() {
  const all = store.loadAll();
  const pending = all.filter((r) => r.state === 'approved-prune');

  // Age each pending record. Anything older than 1h has missed at least
  // one dispatcher tick (rebuild-relationship-caches runs every 6h, but
  // the pipeline.applyApproved hook should fire synchronously on the
  // approve click — so 1h+ pending is a clear signal of a failed apply,
  // not just "pipeline hasn't run yet").
  const now = Date.now();
  const HOUR_MS = 60 * 60 * 1000;
  const aged = pending
    .map((r) => {
      const decidedAt = r.decided_at ? new Date(r.decided_at).getTime() : null;
      const ageMs = decidedAt ? now - decidedAt : null;
      return { ...r, age_ms: ageMs, age_h: ageMs ? Math.round(ageMs / HOUR_MS * 10) / 10 : null };
    })
    .sort((a, b) => (b.age_ms || 0) - (a.age_ms || 0));

  const overOneHour = aged.filter((r) => r.age_ms !== null && r.age_ms > HOUR_MS);

  const top = aged.slice(0, 10).map((r) => ({
    id: r.id,
    subject: r.subject,
    field: r.field,
    name: r.name,
    profile_path: r.profile_path,
    decided_at: r.decided_at,
    age_h: r.age_h,
    decided_by: r.decided_by,
  }));

  const result = {
    // findings_count is the count of records aged >1h, i.e. genuinely
    // stuck. Newly-approved records that are mid-apply don't fire the
    // harness alarm.
    findings_count: overOneHour.length,
    pending_total: pending.length,
    over_one_hour: overOneHour.length,
    over_one_day: aged.filter((r) => r.age_ms !== null && r.age_ms > 24 * HOUR_MS).length,
    top_pending: top,
    summary: pending.length === 0
      ? 'no records stuck in approved-prune (steady state).'
      : `${pending.length} record(s) in approved-prune; ${overOneHour.length} over 1h old (apply path likely failed).`,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log('═══ frontmatter-prune-pending ═══');
  console.log(result.summary);
  if (top.length > 0) {
    console.log();
    console.log('Top stuck records:');
    for (const r of top) {
      const ageStr = r.age_h !== null ? `${r.age_h}h` : '(no decided_at)';
      console.log(`  [${ageStr}] ${r.subject} [${r.field}] ↛ ${r.name}`);
      console.log(`    ${r.profile_path}`);
      console.log(`    id=${r.id} decided_by=${r.decided_by || '?'}`);
    }
  }
}

main();
