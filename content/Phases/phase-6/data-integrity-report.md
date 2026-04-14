---
title: "Phase 6 Data Integrity Audit Report"
type: audit-report
phase: 6
last-updated: 2026-04-14
generator: scripts/phase-6-data-integrity-audit.cjs
editor-vouched: true
---

# Phase 6 Data Integrity Audit Report

Automated schema validation + duplicate detection + foreign key resolution across every canonical `data/*.jsonl` store. One of the Phase 6 audit deliverables per ADR-0005. Re-run with `node scripts/phase-6-data-integrity-audit.cjs --write` any time.

## Summary

| Store | Total | Passed | Failed | Status |
|---|---:|---:|---:|:---|
| sources.jsonl | 14681 | 14681 | 0 | ✅ clean |
| relationships.jsonl | 27504 | 27504 | 0 | ✅ clean |
| entities.jsonl | 1167 | 1167 | 0 | ✅ clean |
| events.jsonl | 188 | 188 | 0 | ✅ clean |
| policies.jsonl | 5 | 5 | 0 | ✅ clean |
| polling.jsonl | 26 | 26 | 0 | ✅ clean |
| users.jsonl | 1 | 1 | 0 | ✅ clean |
| claims/*.jsonl | 15 | 15 | 0 | ✅ clean |

**All audited stores passed.** No schema violations, no duplicate keys, no orphan foreign key references detected.

---

*Regenerate: `node scripts/phase-6-data-integrity-audit.cjs --write`. Idempotent — overwrites this file with the current audit state.*