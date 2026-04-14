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

## 2026-04-14 — Phase 2 launch decisions (4 open questions answered)

David delegated these 4 calls to Code Claude at Phase 2 launch. Locked here for session-to-session continuity.

### Class tag approval cadence: batch of 50, resumable
Approvals happen in batches of ~50 at a time, not one giant sitting. The Ops `/class-tags` UI must remember position so David can take breaks naturally. Rationale: 680 total proposals at 3 sec each is ~34 minutes, which is a lot to ask in one sitting when fatigue starts affecting judgment. Smaller batches also let David spot pattern drift early and adjust the heuristics or prompts between batches.

### Query backend: in-memory JSONL for v1, adapter pattern for Phase 6 swap
ADR-0003 proposed SQLite. At current scale (relationships.jsonl ~27k edges, sources.jsonl ~15k records, entities target ~700) everything fits in memory with headroom. In-memory is simpler to build, faster to iterate on, and doesn't require a new dependency. **Bake an adapter interface** (`scripts/lib/query-engine.cjs` exports a common surface area) so Phase 6 hardening can swap to SQLite without touching consumers if perf demands it.

Concrete: `query-engine.cjs` exports `createQueryEngine()` that returns an object with `query(filterSpec)`, `count(filterSpec)`, `explain(filterSpec)`. The v1 implementation loads all JSONL into memory on first call and filters via `Array.filter`. The v2 (if needed) replaces the implementation without touching the interface.

### Polling data sources locked
For Phase 2.75 `data/polling.jsonl`, the authoritative polling organizations are:
- **KFF** — healthcare, Medicare, drug pricing
- **Data for Progress** — economic progressive policy (housing, minimum wage, student debt)
- **Pew** — civic, voting rights, general public opinion
- **Morning Consult** — general political polling + politician approval
- **Gallup** — long-trend data, institutional trust

No other polling source gets cited in v1 without an explicit ADR update. Manual curation is the v1 workflow (~30 entries across 5 policies), automation deferred to a potential v2 polling pipeline.

### Query page UI: ugly-v1-iterate, match the existing brutalist pattern
Design System is "looks like a leaked file, not a government website" — cream background, Inter 900 headlines, Space Mono for data, no rounded corners, no shadows, no gradients. The existing Ops `/urls`, `/sources`, `/relationships` pages already follow this pattern. `/query` will match: raw table, monospace numbers, harsh filter dropdowns, no polish beyond what functionality needs. David iterates on visuals after the data shape proves out.

**Deliberately not doing v1:**
- Sketch/wireframe before coding
- Design review before shipping
- Mobile-first layout (Phase 6 or later)
- Saved queries UI (Phase 2.5, needs auth first)
- "Explain this row" AI button (placeholder disabled in Phase 2, wired in Phase 2.5)

### Phase 2 sprint 1 scope (this session)
Foundation only, not the full Phase 2:
1. `scripts/lib/entities-schema.cjs` + `entities-store.cjs` — store for `data/entities.jsonl`
2. `scripts/batch-gather-entity-signals.cjs` — extracts signals for every donor from `relationships.jsonl` + profile frontmatter
3. Commit, update handoff

The heuristic proposer, Ops `/class-tags` review page, events.jsonl, and query engine come in subsequent sessions. This keeps the sprint contained and each piece shippable independently.
