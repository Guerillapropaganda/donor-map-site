---
title: "ADR-0008: Query Engine Build Complete"
type: decision
adr: 8
date: 2026-04-14
status: approved
authors: [Code Claude, David]
closes: ADR-0003
extends: ADR-0005
---

# ADR-0008: Query Engine Build Complete

## Context

ADR-0003 defined an 8-phase query engine build (Phases 1, 2, 2.5, 2.75, 3, 4, 5, 6). Over a concentrated build window, every phase shipped its core deliverables. ADR-0005 added Phase 6 as a dedicated hardening pass. This ADR closes ADR-0003 and marks the query engine architecturally complete.

"Architecturally complete" means: every data store exists with schema validation, every query path works end-to-end, every phase's headline feature is implemented and wired through the stack. It does NOT mean every deferred-item is fixed — 267 deferred items were catalogued in `content/Phases/phase-6/deferred-items.md` and will be triaged as ongoing maintenance.

## What shipped

### Phase 1 — Source Registry
- `data/sources.jsonl` canonical store (14,681 unique sources extracted from vault)
- `scripts/lib/sources-schema.cjs` + `sources-store.cjs` with URL normalization
- `scripts/sources-fingerprint.cjs` — classifier with bot-block detection (Cloudflare, HTTP 403 → `needs_review`, not `dead`)
- `scripts/migrate-fec-citations-to-refs.cjs` — 907 FEC citations migrated to `{{src:ID}}` format
- `quartz/plugins/transformers/source-refs.ts` — resolves `{{src:ID}}` at build time
- Ops `/source-registry` review UI

### Phase 2 — Entity Store + Class Tags
- `data/entities.jsonl` canonical store (1,167 entities: 453 donors + 714 politicians)
- Class tag vocabulary from ADR-0001 (capital_type, class_position, ideological_function)
- `scripts/batch-gather-entity-signals.cjs`
- `scripts/batch-propose-class-tags-heuristic.cjs` (346 proposals) with labor-aligned override to prevent the "California Nurses Association → ruling-class" bug
- Ops `/class-tags` keyboard-first approval UI (A/R/E shortcuts)

### Phase 2.5 — Auth + Tier Gating
- `data/users.jsonl` canonical store with tier hierarchy
- CJS store + TS mirror (`ops/src/lib/users-store.ts`) to work around webpack dynamic-require
- Clerk v7 integration with pass-through middleware (routes self-gate)
- `ops/src/lib/auth.ts` — `requireTier`, `requireAdmin`, `currentUser` with graceful Clerk SDK degradation
- `/sign-in`, `/sign-up`, `/account`, `/pricing` pages
- Stripe Checkout + webhook scaffold (activation pending — David opted to push Phase 6 first)
- `content/Admin Notes/phase-2.5-setup.md` — 8-step activation walkthrough
- David is seeded as admin (bypasses all tier gates)

### Phase 2.75 — Policy Battles MVP
- `data/policies.jsonl` canonical store with 5 v1 policies (Housing, Healthcare, AIPAC/BDS, Minimum Wage, Student Debt)
- `data/events.jsonl` canonical store with hard `policy_id` + `obstruction_type` deps
- `scripts/build-policy-pages.cjs` — generates 7 Quartz markdown pages from canonical stores
- Editorial firewall enforced at schema level (banned words, source IDs mandatory)
- Perplexity research integrated: 5 prose + 26 polls + 5 legislative + 20 politicians
- AIPAC page flagged for David's personal review before publication

### Phase 3 — Profile Data Panels
- `scripts/build-profile-data-panels.cjs` — 1,167 profiles got auto-block data panels
- `<!-- auto:data-panel start -->` pattern with idempotent rebuild
- `scripts/lib/query-engine.cjs` — in-memory adapter with 6 query subjects including class-analysis composers

### Phase 4 — Claim-Object Experiment
- `scripts/lib/claims-schema.cjs` + `claims-store.cjs` with defamation firewall at the schema layer (claims without `source_ref` OR `source_fallback_url` are rejected)
- `quartz/plugins/transformers/claim-object.ts`
- `data/claims/aoc.jsonl` + `aoc-synthesis.md` — AOC as the first claim-object profile (15 claims with section keys)

### Phase 5 — Story Score
- `scripts/lib/story-scorer.cjs` — formula with recency decay curve (day 0=1.0, day 30=0.5, day 180=0.10 floor)
- `scripts/story-candidate-scorer.cjs` — 20 dark-money candidates wired into the attention queue
- Calibration against hand-scored past stories deferred to ongoing maintenance

### Phase 6 — Bug Hunt / Hardening
- **Sprint 6a — deferred items collector** (`scripts/phase-6-deferred-items-collector.cjs`): walked every phase doc + ADR, extracted **267 items** across 11 categories into `content/Phases/phase-6/deferred-items.md`
- **Sprint 6a — data integrity audit** (`scripts/phase-6-data-integrity-audit.cjs`): schema validation + duplicate detection + FK resolution across all 8 data stores. **Result: 43,587 records, 0 failures.**
- **Sprint 6b — regression test harness** (`scripts/phase-6-regression-tests.cjs`): 20 tests using Node's built-in `node:test`, running in ~75ms. Covers URL normalization, schema validators, tier hierarchy, story scorer math, claim defamation firewall, class tag vocabulary. Each test maps to a specific bug fixed in Phases 1–5 that would silently regress if a future refactor "cleaned up" the fix.

## Deferred as ongoing maintenance

Not every Phase 6 exit criterion was checked before declaring the build complete. The following items move to ongoing maintenance rather than blocking ADR-0003 closure:

1. **267 deferred items triage** — catalogued, not yet decided (fix/defer/accept/wontfix). David triages at his own pace from `content/Phases/phase-6/deferred-items.md`.
2. **346 class tag proposals** — David reviews at `ops/class-tags` keyboard-first UI.
3. **Stripe activation** — scaffolded and tested in degraded mode. David runs the 20-minute activation walkthrough when he's ready to start taking money.
4. **AIPAC page legal review** — flagged `editor-vouched: false` until David personally reviews.
5. **Story score calibration** — 20 past stories need hand-scoring to tune the formula.
6. **Performance benchmarks** — `/api/query` p50/p95, policy page cold-cache, profile data panel render time. Benchmark under load after public launch.
7. **OG card re-validation on X/LinkedIn/Facebook** — runs after any Phase 2.75 polish ships.
8. **End-to-end tier gate test matrix** — manual tested per gate; systematic matrix deferred.
9. **Git secret scan** — run before making the repo fully public.
10. **Optional lawyer review** — David decides based on budget.

Everything in this list is either tracked in `deferred-items.md`, has a dedicated Ops review UI, or is a pre-publication gate that David controls personally.

## Decision

**The query engine build defined by ADR-0003 is architecturally complete.**

- Every phase's headline feature ships and works end-to-end.
- Every data store has a schema validator and passes integrity audit with zero failures.
- The regression test harness exists with 20 passing tests that lock in the fixes for every bug we hit during the build.
- Phase 6 deferred items are catalogued and will be triaged as ongoing maintenance, not as a phase gate.

## Closes
- ADR-0003 (Phased Query Engine Build)
- ADR-0005 (Phase 6 Bug Hunt scope — what Phase 6 actually covered, with explicit deferrals documented above)

## What this opens

- **Public launch preparation** — performance benchmarks under load, final git secret scan, legal review if elected.
- **Ongoing maintenance rhythm** — triage of the 267 deferred items, approval of the 346 class tag proposals, calibration of the story scorer.
- **Stripe activation** — David's call when to flip the switch.
- **Next editorial cycle** — Research Claude can now write claim-object profiles against the new schema (Phase 4 pattern extends beyond AOC).

## Metrics snapshot at close

- **Data stores**: 8 canonical stores, 43,587 records, 0 validation failures
- **Sources**: 14,681 unique, 907 migrated to `{{src:ID}}` format
- **Entities**: 1,167 (453 donors + 714 politicians)
- **Class tag proposals**: 346 pending review
- **Policies**: 5 v1 pages generated
- **Claims (Phase 4)**: 15 on the AOC profile
- **Story candidates**: 20 in the attention queue
- **Deferred items**: 267 catalogued
- **Regression tests**: 20 passing in ~75ms
- **ADRs written during the build**: 0001 through 0008 (8 total)
