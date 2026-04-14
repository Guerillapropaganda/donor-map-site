---
title: Phase 2 Exit Criteria
type: checklist
phase: 2
last-updated: 2026-04-14
---

# Phase 2 Exit Criteria

All items must be verified before `phase-transition` skill runs.

## Data
- [ ] `data/entities.jsonl` schema + store + validator
- [ ] `data/entity-class-tags.jsonl` with ~450 donors tagged and approved
- [ ] `data/entity-class-tags.jsonl` with ~231 politicians tagged and approved (mirror vocabulary)
- [ ] `data/events.jsonl` schema + store + validator
- [ ] `data/events.jsonl` populated with votes / hearings / regulations
- [ ] `events.jsonl` records have `policy_id` field (nullable, Phase 2.75 dependency)
- [ ] `events.jsonl` records have `obstruction_type` field (enum, Phase 2.75 dependency)
- [ ] `data/policy-stakes-vocab.jsonl` with initial vocabulary seed

## Tagging workflow
- [ ] `scripts/batch-propose-class-tags.cjs` working for donors
- [ ] `scripts/batch-propose-class-tags.cjs` working for politicians
- [ ] Ops `/class-tags` review page functional
- [ ] 3-second per-proposal approval UX verified
- [ ] Rejection log feeding back into future proposal runs

## Query backend
- [ ] SQLite build-time loader or in-memory equivalent
- [ ] `scripts/lib/query-engine.cjs` with filter composition API
- [ ] Ops `/api/query` endpoint with filter interface
- [ ] Tier-check middleware hook placed (pass-through stub for Phase 2)

## Public UI
- [ ] `/query` top-level Quartz page
- [ ] Form builder renders with all filter controls
- [ ] Class-analysis toggles functional (cross-party, rhetoric-contradiction, timing-proximity, capital-fraction)
- [ ] Result table with per-row source links
- [ ] CSV export
- [ ] Query permalinks shareable + resolve correctly

## Verification
- [ ] 10 test queries executed, results verified against manual counts
- [ ] Each class-analysis filter tested on 2+ known cases
- [ ] `npx quartz build` clean, build time increase <30s
- [ ] All pre-commit sentinels pass
- [ ] No regressions on Phase 1 source registry functionality

## Documentation
- [ ] CLAUDE.md updated with query engine conventions
- [ ] Vault Rules.md updated with entities.jsonl / events.jsonl authority
- [ ] Pipeline Guide.md updated if new pipelines ship
- [ ] Phase 2 retrospective written
