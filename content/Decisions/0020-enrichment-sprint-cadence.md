---
title: "ADR-0020: Enrichment sprint as a scheduled operation"
type: adr
status: proposed
date: 2026-04-21
related: ADR-0017, ADR-0019
---

# ADR-0020: Enrichment Sprint Cadence

## Context

Today's 25-step `scripts/enrichment-sprint.sh` was built ad-hoc after
Sessions A–K finished — run once at end of day to refresh canonical
stores from local bulk. It completed in 42 minutes and 6 of 25 steps
failed (OOM, missing files, partial runs), but the 19 successful
ingests refreshed enough data to keep the query engine accurate.

Without a scheduled cadence, this degrades over time:
1. Bulk CSVs age on David's machine (FEC publishes cycle-end updates
   every ~6 months, IRS 990 e-file is monthly, STOCK Act PTRs daily)
2. Canonical derived stores drift further from source
3. Query answers get stale
4. data-complete ceiling silently sinks (freshness gate demotes)

The sprint needs to become a routine operation — documented,
scheduled, versioned — instead of a one-off session artifact.

## Decision

Promote `scripts/enrichment-sprint.sh` to a **weekly canonical
refresh** operation, with these properties:

### Cadence

- **Weekly** (Sundays at 02:00 America/Chicago, David's overnight
  window) via `attention-dispatcher.cjs` or a new GitHub Actions
  scheduled workflow (decision below).
- Runtime budget: 2-4 hours (today's run was 42 min because of
  failures + small CSV deltas; a fresh FEC/IRS cycle release could
  push to 3-4 hours).
- Manual trigger available: `bash scripts/enrichment-sprint.sh`
  remains the on-demand entrypoint.

### Scheduling backend

Two options, picking one:

**Option A — GitHub Actions cron**
- `.github/workflows/enrichment-sprint.yml`, `cron: '0 8 * * 0'`
  (08:00 UTC Sunday = 02:00 Chicago)
- Runs on an ubuntu-latest runner
- Requires ADR-0019 (R2 bulk storage) to land first — the runner
  can't access `C:/donor-map-data/bulk/` or David's local
  `data/bulk/`, so fetchBulk must work
- Commits refreshed derived stores back to v4 via a PR or direct push

**Option B (chosen for now) — attention-dispatcher entry**
- Add a producer in `scripts/attention-dispatcher.cjs`:
  ```js
  {
    name: 'enrichment-sprint',
    cron: '0 2 * * 0',  // 02:00 every Sunday
    script: 'scripts/enrichment-sprint.sh',
    mode: 'shell',  // new dispatcher shell mode
  }
  ```
- Runs on David's machine where the bulk data already lives
- No R2 dependency — works today
- Commits results via David's existing git flow after review

Picking B for the initial scheduled run. Once ADR-0019 (R2) lands,
migrate to A so the refresh doesn't depend on David's machine being
awake.

### Failure handling

Today's failures (pac-summary, oppexp partial, oth-bulk, indiv-
aggregate OOM, voteview-bulk) are informative data points. Codify:

1. **Log per-step** — `scripts/enrichment-sprint.sh` already does
   this (`/tmp/enrichment-<timestamp>.log`).
2. **Status log** — compact OK/FAIL per step
   (`/tmp/enrichment-status.log`).
3. **Non-blocking** — one failure doesn't kill the chain.
4. **Post-run admin note** — if ≥1 failure, write a note to
   `content/Admin Notes/enrichment-failures-<date>.md` with the
   failing step, error summary, suggested retry.
5. **Heap escalation for indiv-aggregate** — the 19 GB ingest
   specifically needs `--max-old-space-size=16384`. Codify by
   editing the sprint script to prepend that env for known-heavy
   ingests:
   ```bash
   run_step "ingest-fec-indiv-aggregate" \
     env NODE_OPTIONS="--max-old-space-size=16384" \
     node scripts/ingest-fec-indiv-aggregate.cjs
   ```

### Post-sprint verification

After every sprint run, automatically:

1. Run `scripts/reclassify-readiness.cjs --diagnose`
2. Run `scripts/eval-query-engine.cjs` (28 golden queries as of
   2026-04-21)
3. Run `scripts/phase-6-data-integrity-audit.cjs`
4. If any of the three fail, the admin note generated in step 4
   above flags them as blocking issues.

### Schema evolution

Canonical stores may add or rename fields between ingests (a new FEC
weball column, a new IRS 990 schedule, etc.). The sprint is blind to
this. Add a **schema diff check** at the end:

```
scripts/audit-canonical-schema.cjs  (new)
```

Compares today's canonical JSONL fields to a committed manifest at
`data/schema-manifest.json`. If new fields appear, note them in the
admin report; David can then decide whether to expose them in
ProfileHeader / auto-blocks / query engine.

## Rationale

- **Today's 42-minute sprint demonstrated feasibility** — the wrapper
  script is the right pattern; we just need to automate it.
- **Data freshness is load-bearing** for query accuracy (per ADR-
  0016) and data-complete tier (per ADR-0017). Stale data → wrong
  labels → launch embarrassment.
- **Solo-maintainer resilience** — a scheduled run means David doesn't
  have to remember to refresh. If a sprint fails, the admin note
  surfaces it at the next `/preflight` check.
- **Audit trail** — per-run status log + failure admin notes create
  a history of what was refreshed and when, useful for debugging
  query accuracy issues months later.

## Consequences

### Positive
- Canonical data stays fresh without David's active attention
- Query accuracy degrades gracefully (failure → admin note → human
  fix) rather than silently
- The sprint wrapper becomes documented, evolvable infrastructure
- Post-run eval harness run catches data regressions at refresh time
  instead of production

### Negative
- Sunday 02:00 Chicago means David's machine must be awake OR we
  depend on ADR-0019 for CI-side execution
- Weekly churn in canonical stores → weekly diff noise on v4. May
  be large if a new FEC cycle lands (~100 MB+ canonical stores)
- Failed-ingest-retry policy needs defining (today's script is
  idempotent-ish but not rigorously tested on retry)

### Required changes

1. Bump heap for known-heavy ingests in
   `scripts/enrichment-sprint.sh` (indiv-aggregate,
   irs-990-bulk).
2. Post-run hook: automatic reclassify + eval + audit + admin note
   generation.
3. Add `scripts/audit-canonical-schema.cjs` for schema drift
   detection.
4. Dispatcher / cron entry per the chosen backend (B initially).
5. Document in `content/Admin Notes/enrichment-operations.md` for
   David's ops reference (when to expect runs, how to force,
   what to do if it fails).

## Closes
- Session log open item: "Verify enrichment sprint output once it
  finishes" — codified as automatic post-run verification.

## Opens
- Decision on scheduling backend once ADR-0019 lands (A vs B
  tradeoff).
- Retry mechanism for specific ingest failures.
- Alerting — if 3+ steps fail in one run, is that a "something's
  structurally wrong" signal that warrants a louder notification?
