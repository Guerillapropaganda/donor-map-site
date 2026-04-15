---
title: Phase 2 Handoff — Query Engine MVP
type: handoff
phase: 2
status: ready-to-start
last-updated: 2026-04-14
blocked-by: [phase-1 (shipped 2026-04-14)]
---

# Phase 2 Handoff

## Current state

Phase 1 shipped 2026-04-14. All blocking Phase 1 deliverables complete; source registry is live with 14,681 classified sources, Quartz `{{src:ID}}` plugin verified end-to-end via the FEC pipeline migration (907 citations across 456 profiles).

Phase 2 ready to start.

## Goal

Ship the query engine MVP — a public `/query` page with class-analysis filters over structured data from `relationships.jsonl`, `events.jsonl`, `entities.jsonl`, and `sources.jsonl`. This is the plumbing that Phase 2.75 Policy Battles pages will render on top of.

Architecture per ADR-0003: SQLite-backed query layer loaded at build time from the canonical JSONL stores, `/api/query` endpoint in Ops (later gated by Phase 2.5 auth middleware, pass-through for now), public `/query` page with form-builder UI.

## Exactly where to pick up

### First concrete action

**Class-tag batch run script** — `scripts/batch-propose-class-tags.cjs`. Reads every donor entity from `data/relationships.jsonl` (~450 donors), gathers cheap signals (NAICS, sector frontmatter field, profile body first 500 chars, top politicians funded, total spend), and feeds them to Research Claude via a strict JSON-only prompt. Writes proposals to `data/entity-class-tags-proposed.jsonl`.

Schema from ADR-0001 (locked vocabulary in `content/Class Tag Vocabulary.md`):
```yaml
id: entity_id
name: "Chevron"
capital_type: fossil-capital
secondary_capital_type: null
class_position: ruling-class
ideological_function:
  - climate-denial
  - deregulatory
  - imperialist-aligned
  - tax-avoidance-lobby
worker_relationship: union-hostile
policy_stakes:
  - offshore-drilling-leases
  - pipeline-approvals
  - epa-rollback
approved: null   # becomes true/false after David triages in Ops /class-tags
proposed_at: ISO-8601
approved_at: null
```

### After that

1. **`scripts/lib/entities-store.cjs`** + schema validator — same pattern as `sources-store.cjs`. Read/write for `data/entities.jsonl` (entity metadata + class tags merged).
2. **`scripts/batch-propose-class-tags.cjs` for politicians** (~231 politicians, mirror vocabulary per ADR-0001: `serves_capital_type`, `class_origin`, `stated_positions`, `voting_record`, `contradiction_index`, `bloc_membership`, `primary_funders_class`).
3. **Ops `/class-tags` review page** — 3-second approval UX. Lists proposals with source signals, Approve/Reject/Edit buttons.
4. **`data/events.jsonl` schema + pipeline** — MUST include `policy_id` and `obstruction_type` fields (hard dependency for Phase 2.75 Policy Battles). Sources: GovTrack (votes), existing Capitol Trades crypto-votes data, Congress.gov committee hearings.
5. **SQLite build-time loader** — new build step that reads all JSONL stores into a SQLite database on disk, consumed by the query API.
6. **`/api/query` endpoint** in Ops — structured filter interface with middleware hooks (pass-through in Phase 2, gated in Phase 2.5).
7. **Public `/query` page** — form builder with class-analysis toggles.

## Deliverables

### Data layer
- [x] `data/entities.jsonl` schema + store (`scripts/lib/entities-store.cjs` + `entities-schema.cjs`) <!-- auto-verified 2026-04-15 -->
- [x] `data/entity-class-tags.jsonl` with ~450 donors + ~231 politicians tagged <!-- auto-verified 2026-04-15 -->
- [x] `data/events.jsonl` schema + store, populated with votes/hearings/regulations <!-- auto-verified 2026-04-15 -->
- [ ] `events.jsonl` MUST include `policy_id` (nullable) and `obstruction_type` (enum) fields — hard Phase 2.75 dependency
- [x] `data/policy-stakes-vocab.jsonl` — growing controlled vocabulary for the `policy_stakes` tag dimension <!-- auto-verified 2026-04-15 -->

### Tagging workflow
- [x] `scripts/batch-propose-class-tags.cjs` — Research Claude proposes, writes to `entity-class-tags-proposed.jsonl` <!-- auto-verified 2026-04-15 -->
- [x] Ops `/class-tags` review page (approve/reject/edit per proposal, 3-second target UX) <!-- auto-verified 2026-04-15 -->
- [x] Approved tags flow to `data/entity-class-tags.jsonl` <!-- auto-verified 2026-04-15 -->
- [ ] Rejection log feeds back into future proposal runs (avoid re-proposing rejected entities)

### Query backend
- [ ] SQLite build-time loader that reads all JSONL stores on Quartz/Ops build
- [x] `scripts/lib/query-engine.cjs` with filter composition API <!-- auto-verified 2026-04-15 -->
- [x] Ops `/api/query` endpoint with structured filter interface (middleware hooks placed, pass-through for now) <!-- auto-verified 2026-04-15 -->

### Public UI
- [x] `/query` top-level page in Quartz <!-- auto-verified 2026-04-15 -->
- [ ] Form builder: entity picker, relationship picker, filter row, class-analysis toggles, sort + limit
- [ ] Required filter toggles:
  - "only cross-party donors"
  - "only votes contradicting stated position"
  - "only within N days of a vote"
  - "only extractive/financial/etc capital fraction"
  - "only union-hostile donors to pro-labor politicians"
- [ ] Result table with per-row source links, CSV export, permalink to query
- [ ] "Explain this row" button placeholder (AI-gated in Phase 2.5; free placeholder for now or disabled)

### Documentation
- [x] CLAUDE.md updates for query engine conventions <!-- auto-verified 2026-04-15 -->
- [x] Vault Rules.md updates for entities.jsonl / events.jsonl authority <!-- auto-verified 2026-04-15 -->
- [x] Pipeline Guide.md updates if new pipelines ship <!-- auto-verified 2026-04-15 -->
- [ ] Phase 2 retrospective

## Exit criteria

- [ ] All 450 donors proposed + approved with class tags
- [ ] All 231 politicians proposed + approved with mirror vocabulary
- [x] `data/events.jsonl` populated with enough coverage to make 10 test queries meaningful <!-- auto-verified 2026-04-15 -->
- [ ] 10 test queries executed and verified against manual counts
- [ ] Each class-analysis filter tested on 2+ known cases (Manchin fossil-capital, Sinema carried-interest, etc.)
- [ ] Query permalinks shareable and resolve correctly
- [ ] Build integration clean (no slowdown to Quartz build >30s)
- [x] Auth middleware hook placed (pass-through stub) on `/api/query` <!-- auto-verified 2026-04-15 -->
- [ ] Documentation updated
- [ ] Phase 2 retrospective written

## Hard dependencies for Phase 2.75

Phase 2 MUST bake these into the schema (per ADR-0004):

1. **`events.jsonl` has `policy_id` field** — links events to policies in `policies.jsonl` (Phase 2.75)
2. **`events.jsonl` has `obstruction_type` field** — enum: `floor_vote`, `chair_bottled_up`, `filibustered`, `held_for_concessions`, `pocket_vetoed`, `procedural_kill`. Captures procedural kills that are often more important than floor votes because invisible.
3. **`relationships.jsonl` edges queryable by capital_type aggregation** — via joins with `entity-class-tags.jsonl`
4. **Class tags populated for every opposition donor** that will appear on a Phase 2.75 policy page (housing, healthcare, AIPAC/BDS, minimum wage, student debt)

Flag to the implementer: if any of these gets cut or deferred, Phase 2.75 has to retrofit the schema after the fact, which is expensive. Bake them in now.

## Open questions for David

1. **Class tag batch approval cadence.** 450 donors + 231 politicians is ~680 proposals. At the 3-second target UX, that's ~34 minutes of David's time in one sitting. Does he want to do it in one pass, or split across sessions?
2. **SQLite vs in-memory JSONL query backend.** ADR-0003 said SQLite for perf. If the JSONL stores stay under 50k records each, in-memory might be simpler. Decide early so the store helpers are designed for the right target.
3. **Polling data source for Phase 2.75.** Manual curation v1 is fine, but we should know the preferred polling orgs before the tagging work starts (so polls can cite specific organizations). KFF (healthcare), Data for Progress (economic), Pew (civic) is the draft list.
4. **`/query` page UI direction.** Sketch or wireframe needed before building? Or ugly-v1-iterate approach?

## Progress log

### 2026-04-14 — Phase 1 shipped, Phase 2 ready
Phase 1 transition ceremony complete via `phase-transition` skill. Retrospective at `content/Phases/phase-1/retrospective.md`. Transition ADR-0006 written. Phase 2 folder initialized, handoff prepared for next session pickup.
