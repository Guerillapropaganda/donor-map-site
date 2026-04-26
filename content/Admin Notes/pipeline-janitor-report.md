---
title: Pipeline Janitor Report
type: admin-note
note-type: data
priority: normal
status: open
last-updated: '2026-04-26'
generated-by: scripts/pipeline-janitor.cjs
note-kind: rollup
harness-check: pipeline-janitor
---

# Pipeline Janitor Report

Generated: 2026-04-26T16:28:55.903Z
Mode: DRY RUN (report only)

## Pipeline Status

**API pipelines paused since 2026-04-24** (7 workflows disabled — see `data/enrichment-state.json`).

Findings below are split into three buckets:
- **Fixable now** — CSV-bulk fallback exists, run the listed command
- **Blocked on paused pipeline** — no local fallback; defer or resume Actions
- **Editorial / advisory** — A+ findings that require David or Research Claude (never auto-demote per ADR-0025)

## Summary

- Profiles scanned: 3252
- Profiles at ready/verified audited: 225
- Profiles with issues: **0**
- Total issues: 0

### By category

- Fixable now (CSV bulk or demote): **0**
- Blocked on paused pipeline: **0**
- Editorial / advisory (no auto-fix): **0**

### By issue kind

