---
title: Phase 2 Exit Criteria
type: checklist
phase: 2
last-updated: 2026-04-14
---

# Phase 2 Exit Criteria

All items must be verified before `phase-transition` skill runs.

## Data
- [x] `data/entities.jsonl` schema + store + validator <!-- auto-verified 2026-04-15 -->
- [x] `data/entity-class-tags.jsonl` with ~450 donors tagged and approved <!-- auto-verified 2026-04-15 -->
- [x] `data/entity-class-tags.jsonl` with ~231 politicians tagged and approved (mirror vocabulary) <!-- auto-verified 2026-04-15 -->
- [x] `data/events.jsonl` schema + store + validator <!-- auto-verified 2026-04-15 -->
- [x] `data/events.jsonl` populated with votes / hearings / regulations <!-- auto-verified 2026-04-15 -->
- [x] `events.jsonl` records have `policy_id` field (nullable, Phase 2.75 dependency) <!-- verified 2026-04-15: schema has policy_id on all 188 records -->
- [x] `events.jsonl` records have `obstruction_type` field (enum, Phase 2.75 dependency) <!-- verified 2026-04-15: all 188 records have obstruction_type populated -->

- [x] `data/policy-stakes-vocab.jsonl` with initial vocabulary seed <!-- seeded 2026-04-15: 20 stakes across economic/environment/democracy/civil/labor/foreign -->


## Tagging workflow
- [x] `scripts/batch-propose-class-tags.cjs` working for donors <!-- auto-verified 2026-04-15 -->
- [x] `scripts/batch-propose-class-tags.cjs` working for politicians <!-- auto-verified 2026-04-15 -->
- [x] Ops `/class-tags` review page functional <!-- auto-verified 2026-04-15 -->
- [ ] 3-second per-proposal approval UX verified
- [ ] Rejection log feeding back into future proposal runs

## Query backend
- [ ] SQLite build-time loader or in-memory equivalent
- [x] `scripts/lib/query-engine.cjs` with filter composition API <!-- auto-verified 2026-04-15 -->
- [x] Ops `/api/query` endpoint with filter interface <!-- auto-verified 2026-04-15 -->
- [ ] Tier-check middleware hook placed (pass-through stub for Phase 2)

## Public UI
- [x] `/query` top-level Quartz page <!-- auto-verified 2026-04-15 -->
- [ ] Form builder renders with all filter controls
- [ ] Class-analysis toggles functional (cross-party, rhetoric-contradiction, timing-proximity, capital-fraction)
- [ ] Result table with per-row source links
- [ ] CSV export
- [ ] Query permalinks shareable + resolve correctly

## Verification
- [ ] 10 test queries executed, results verified against manual counts
- [ ] Each class-analysis filter tested on 2+ known cases
- [x] `npx quartz build` clean, build time increase <30s <!-- auto-verified 2026-04-15 -->
- [x] All pre-commit sentinels pass <!-- auto-verified 2026-04-15 -->
- [ ] No regressions on Phase 1 source registry functionality

## Documentation
- [x] CLAUDE.md updated with query engine conventions <!-- auto-verified 2026-04-15 -->
- [x] Vault Rules.md updated with entities.jsonl / events.jsonl authority <!-- auto-verified 2026-04-15 -->
- [x] Pipeline Guide.md updated if new pipelines ship <!-- auto-verified 2026-04-15 -->
- [ ] Phase 2 retrospective written
