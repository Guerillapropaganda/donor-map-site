---
title: "FEC Weekly Refresh Plan"
type: admin-note
note-type: code
priority: normal
status: open
lane: code
last-updated: '2026-04-18'
generated-by: hand
note-kind: reference
---

# FEC Weekly Refresh — What It Is, How to Build It

## Why weekly

FEC releases new bulk data filings quarterly (committees file their reports every three months), but the website refreshes the bulk zips daily as filings land. Our initial full ingest covers 1980-2026. To keep the vault current we re-ingest just the latest cycle (currently 2026) on a weekly schedule.

## Scope

Only the **current cycle's** zips change meaningfully week-to-week:
- `pas226.zip` — contributions from committees to candidates, 2026 cycle
- `indiv26.zip` — individual contributions, 2026 cycle
- `cm26.zip` — committee master, 2026
- `cn26.zip` — candidate master, 2026
- `ccl26.zip` — candidate-committee linkages, 2026

Older-cycle zips are frozen; no need to re-download.

## How to run the refresh

```bash
# Re-download the 5 current-cycle zips (manual for now; add `fec-download` script later)
# ... or David downloads manually to C:\donor-map-data\bulk\{subdir}\ ...

# Re-ingest just 2026:
node scripts/ingest-fec-pas2-bulk.cjs --cycles 2026
node scripts/ingest-fec-masters-bulk.cjs --resume
node --max-old-space-size=16384 scripts/ingest-fec-indiv-aggregate.cjs --cycles 2026 --resume

# Regenerate profile auto-panels against updated stores:
node scripts/build-profile-data-panels.cjs --write
```

## Wiring as an automated weekly task

Three options, in order of complexity:

### Option A — Manual weekly ritual (simplest)
David runs the four commands above every Monday morning. ~30 min total.
No infrastructure needed. Current plan until scheduling is wired up.

### Option B — `attention-dispatcher.cjs` producer
Add a new producer to `scripts/attention-dispatcher.cjs`:

```javascript
{ name: 'fec-weekly-refresh', interval: '7d',
  cmd: 'node scripts/ingest-fec-pas2-bulk.cjs --cycles 2026 --resume && ...',
  onFailure: 'attention' }
```

Requires attention-dispatcher process to be running persistently. David currently runs it ad-hoc.

### Option C — Windows Scheduled Task
Windows native scheduler. Create a `.bat` that runs all four commands on Sunday night, log to file, alert David on failure.

Tradeoff: runs even when David's laptop is off. Good for always-on desktop, bad for laptop-only setup.

## Blockers / prerequisites

- **No FEC download automation yet.** David manually downloads zips. Would need a small `scripts/fec-download-current-cycle.cjs` that hits FEC download URLs for the 5 files. FEC serves them at fixed URLs — straightforward.
- **No alerting on failure.** Needs Ops dashboard to surface a "FEC refresh failed last Sunday" widget.

## Recommended sequence

1. **Start with Option A (manual)** — prove the refresh works without infrastructure churn.
2. **Add `fec-download-current-cycle.cjs`** — automate the download step.
3. **Promote to Option B or C** based on whether David wants it to run when he's away from his desk.

## Related ADRs

- ADR-0013: FEC transaction taxonomy + anomaly detection
- ADR-0014: FEC full-database ingest pipeline

## Owner

Code Claude (this lane). Triggered when David has bandwidth for the automation layer.
