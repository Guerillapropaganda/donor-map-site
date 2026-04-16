---
title: ADR Archive
type: system
last-updated: 2026-04-16
---

# ADR Archive

Historical Architecture Decision Records preserved for record. These ADRs either closed a build phase, were superseded by a later ADR, or became historical after implementation completed.

Archived here 2026-04-16 during the pre-launch architecture cleanup. The active ADR list lives at `content/Decisions/` (0001, 0002, 0004, 0007, 0009, 0010, 0011).

## Contents

| ADR | Status | Closed/superseded by |
|-----|--------|---------------------|
| [0003 — Phased Query Engine Build](0003-phased-query-engine-build.md) | Closed | ADR-0008 |
| [0005 — Phase 6 Bug Hunt](0005-phase-6-bug-hunt.md) | Closed | Phase 6 complete |
| [0006 — Phase 1 Shipped](0006-phase-1-shipped.md) | Transition log | Phase 1 complete |
| [0008 — Query Engine Build Complete](0008-query-engine-build-complete.md) | Closure record | Build complete |

## Why these are archived

- **ADR-0003** described the 8-phase build plan for the query engine. ADR-0008 recorded the build as complete. Both are historical records of work done, not active decisions. The query engine itself (`scripts/lib/query-engine.cjs`) is very much live.
- **ADR-0005** scoped the Phase 6 hardening pass. Phase 6 is closed, its sentinels are live, its regression test suite is load-bearing. The ADR is a historical record.
- **ADR-0006** logged Phase 1's completion (source registry + FEC citation migration). Phase 1 artifacts (sources.jsonl, `{{src:ID}}` refs) are live. The ADR is a transition log.

## How to reference from new work

If you need to cite a historical decision in a new ADR, do it as a link to this archive (e.g., `See ADR-0003 [archived] for the original query engine plan`). Don't move the ADR back to the active set — write a new superseding ADR instead.

Never edit archived ADRs to reverse their decisions. If an old ADR needs to be superseded, write a new one.
