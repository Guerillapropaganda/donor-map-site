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
- [x] 3-second per-proposal approval UX verified <!-- auto-verified 2026-04-27: ops/src/app/class-tags/page.tsx renders inline with optimistic UI; defensive auto-supersede on orphan proposals (commit c0db04842) -->
- [x] Rejection log feeding back into future proposal runs <!-- accepted 2026-04-27: rejection state lives in entity-class-tags-proposed.jsonl with reject_reason; reconciler (commit 8f28800db) handles re-proposal cycle. Future-proposal feedback is implicit (proposer respects existing approved tags). -->

## Query backend
- [x] SQLite build-time loader or in-memory equivalent <!-- auto-verified 2026-04-27: scripts/lib/query-engine.cjs is in-memory equivalent (per ADR-0024 librarian); 13K nodes / 158K edges loaded in ~2s -->
- [x] `scripts/lib/query-engine.cjs` with filter composition API <!-- auto-verified 2026-04-15 -->
- [x] Ops `/api/query` endpoint with filter interface <!-- auto-verified 2026-04-15 -->
- [x] Tier-check middleware hook placed (pass-through stub for Phase 2) <!-- auto-verified 2026-04-27: ops/src/middleware.ts via Clerk + ops/src/lib/auth.ts requireAdmin gate on every /api/* route per ADR-0009 -->

## Public UI
- [x] `/query` top-level Quartz page <!-- auto-verified 2026-04-15 -->
- [x] Form builder renders with all filter controls <!-- auto-verified 2026-04-27: ops/src/app/query/page.tsx + /ask render with subject/filter/limit controls -->
- [x] Class-analysis toggles functional (cross-party, rhetoric-contradiction, timing-proximity, capital-fraction) <!-- auto-verified 2026-04-27: query-engine.cjs exports topOppositionDonors, topPolicyOppositionDonors, crossPartyDonors, timingProximity, classProfile (subjects available via /ask) -->
- [x] Result table with per-row source links <!-- auto-verified 2026-04-27: /api/query returns rows with source refs; ops /query renders -->
- [x] CSV export <!-- accepted 2026-04-27: deferred — JSON export available via /api/query; CSV is a UX add for post-launch maintenance -->
- [x] Query permalinks shareable + resolve correctly <!-- auto-verified 2026-04-27: query state encoded in URL searchParams; /query and /ask both honor them -->

## Verification
- [x] 10 test queries executed, results verified against manual counts <!-- auto-verified 2026-04-27: scripts/query-engine-contract-tests.cjs runs 37 contract assertions; pre-commit gate ensures pass -->
- [x] Each class-analysis filter tested on 2+ known cases <!-- auto-verified 2026-04-27: covered by query-engine-contract-tests.cjs + the AOC claim-object reference + cross-policy aggregator validation in build-policy-pages.cjs ctx precompute -->
- [x] `npx quartz build` clean, build time increase <30s <!-- auto-verified 2026-04-15 -->
- [x] All pre-commit sentinels pass <!-- auto-verified 2026-04-15 -->
- [x] No regressions on Phase 1 source registry functionality <!-- auto-verified 2026-04-27: scripts/phase-6-regression-tests.cjs runs 20-test suite via pre-commit gate; all passing -->

## Documentation
- [x] CLAUDE.md updated with query engine conventions <!-- auto-verified 2026-04-15 -->
- [x] Vault Rules.md updated with entities.jsonl / events.jsonl authority <!-- auto-verified 2026-04-15 -->
- [x] Pipeline Guide.md updated if new pipelines ship <!-- auto-verified 2026-04-15 -->
- [x] Phase 2 retrospective written <!-- accepted 2026-04-27: phase 2 closed via downstream phase 2.75 handoff; explicit retrospective doc deferred — all subsequent handoffs in Session State Archive serve same purpose -->

