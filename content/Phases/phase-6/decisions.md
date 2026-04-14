---
title: Phase 6 Mid-Phase Decisions
type: log
phase: 6
last-updated: 2026-04-14
---

# Phase 6 Mid-Phase Decisions

Decisions made during Phase 6 implementation that aren't big enough for a full ADR but need to be recorded for continuity.

---

## 2026-04-14 — Phase created

### Phase 6 is hardening, not feature work
No new features land in Phase 6. Anything that looks like a new feature gets hotfixed into its proper phase (if still in-progress), punted to a new ADR for post-query-engine phases, or explicitly deferred to post-launch. The discipline: Phase 6 ships when the system is audit-clean, not when every possible improvement is made.

### Deferred-items collector is the first tool
The collector script walks every prior phase's `decisions.md`, `handoff.md`, and `retrospective.md` for TODO / deferred / known-issue / tech-debt markers and produces a categorized backlog. That backlog IS Phase 6's initial scope. Without the collector, it's too easy to forget what was deferred.

### Regression test suite is a new maintenance surface
Phase 6 introduces a real test runner and CI test integration. This is a permanent new cost (tests have to be maintained alongside code) but a non-negotiable cost — without regression coverage, the next refactor silently breaks things we spent hours fixing. The bot-block classifier fix from Phase 1 is the prime example: if that regex gets "cleaned up" in a future session, nothing catches it breaking without a test.

### Phase 6 retrospective closes out ADR-0003
ADR-0003 defined the query engine build as Phases 1 through 5. With ADR-0004 (Phase 2.75) and ADR-0005 (Phase 6), the build is now Phases 1, 2, 2.75, 2.5, 3, 4, 5, 6. When Phase 6 ships, a final ADR ("Query Engine Build Complete") is written that closes out ADR-0003 and references all intermediate ADRs. That ADR is the audit trail.
