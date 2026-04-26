---
title: "Broken Source Refs Report"
type: admin-note
note-type: data
status: done
last-updated: 2026-04-15
generator: scripts/broken-source-refs-report.cjs
auto-resolve-when: 'Total broken refs:\*\* 0'
last-auto-resolved: 2026-04-26T17:15:02.169Z
note-kind: report
---

# Broken Source Refs Report

Every `{{src:ID}}` ref in the vault that doesn't resolve to a record in `data/sources.jsonl`. These are blockers for the publication-readiness gate (CLAUDE.md rule 9) — any profile containing a broken ref can't pass the gate.

**Total broken refs:** 0 across 0 unique IDs

## Category breakdown


## How to fix

For **possible-typo**: bulk-replace with the suggestion after spot-checking 2-3. Fast win.
For **never-registered**: open the profile, find the original URL, register it via `addOrFindSource()` through `scripts/lib/sources-store.cjs`, then the ref will resolve on next publication-readiness check.
For **malformed-id**: open the profile, determine intent from context, fix the ref manually.

---

*Regenerate: `node scripts/broken-source-refs-report.cjs --write`. Re-run after each fix batch to see progress.*
