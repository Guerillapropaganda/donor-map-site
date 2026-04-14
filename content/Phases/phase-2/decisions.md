---
title: Phase 2 Mid-Phase Decisions
type: log
phase: 2
last-updated: 2026-04-14
---

# Phase 2 Mid-Phase Decisions

Decisions made during Phase 2 implementation that aren't big enough for a full ADR but need to be recorded for continuity.

---

## 2026-04-14 — Phase 2 initialized

### Phase 2.75 hard dependencies baked into Phase 2 schema
Per ADR-0004, Phase 2.75 Policy Battles needs `events.jsonl` to support `policy_id` and `obstruction_type` fields. These are NOT optional add-ons — they must be in the Phase 2 schema from day 1 or Phase 2.75 has to retrofit, which is expensive. The Phase 2 handoff flags these as hard dependencies.

### Class tag approval workflow is Research Claude proposes, David approves
Neither Claude writes directly to `data/entity-class-tags.jsonl`. The flow: Research Claude runs `batch-propose-class-tags.cjs` which writes to `data/entity-class-tags-proposed.jsonl`, David reviews in Ops `/class-tags` at 3-second-per-proposal target UX, approvals flow to `data/entity-class-tags.jsonl`, rejections to a rejection log that future proposal runs consult to avoid re-proposing.

### Phase 2 does NOT build the query engine's auth layer
That's Phase 2.5. Phase 2 places middleware hooks (pass-through stubs) on every new `/api/*` route so Phase 2.5 can wire them up without retrofitting. Any developer reading the Phase 2 code should see "auth middleware hook here — pass-through until 2.5" as an explicit comment.
