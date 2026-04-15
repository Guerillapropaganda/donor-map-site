---
title: Phase 6 Exit Criteria
type: checklist
phase: 6
last-updated: 2026-04-14
---

# Phase 6 Exit Criteria

All items must be verified before the `phase-transition` skill runs to close out ADR-0003.

## Deferred-items closeout
- [x] `scripts/phase-6-deferred-items-collector.cjs` exists + has run <!-- auto-verified 2026-04-15 -->
- [x] Every item in `content/Phases/phase-6/deferred-items.md` triaged <!-- auto-verified 2026-04-15 -->
- [ ] All fix-required items shipped
- [ ] All explicit deferrals have ADR entries

## Regression test suite
- [ ] Test runner chosen + configured
- [ ] Source registry tests passing
- [ ] Fingerprint classifier tests passing
- [x] Query engine sample-query tests passing <!-- auto-verified 2026-04-15 -->
- [ ] Policy page snapshot tests passing
- [ ] Pre-commit sentinel tests passing
- [ ] CI integration: tests run on every PR

## Data integrity (all must pass)
- [x] `data/relationships.jsonl` validator clean <!-- auto-verified 2026-04-15 -->
- [x] `data/sources.jsonl` validator clean <!-- auto-verified 2026-04-15 -->
- [x] `data/entity-class-tags.jsonl` validator clean <!-- auto-verified 2026-04-15 -->
- [x] `data/events.jsonl` validator clean <!-- auto-verified 2026-04-15 -->
- [x] `data/policies.jsonl` validator clean <!-- auto-verified 2026-04-15 -->
- [ ] No duplicate IDs across any store
- [ ] No orphaned foreign-key references

## Performance
- [ ] Quartz build time benchmarked + documented
- [x] `/api/query` p50/p95 benchmarked + documented <!-- auto-verified 2026-04-15 -->
- [ ] Policy page cold-cache load time benchmarked + documented
- [ ] Profile data panel render time benchmarked + documented
- [ ] Top 3 slow paths addressed or explicitly accepted-slow

## Security
- [ ] Tier-check middleware audited on every /api/* route
- [ ] Rate limit enforcement tested with rapid-fire requests
- [ ] Auth token expiry + refresh tested
- [ ] Git history scanned for secrets
- [ ] Vault open-source posture verified (nothing private leaked)

## Defamation
- [ ] Every policy page prose scanned for banned words
- [ ] Every factual claim has a resolving source ID
- [ ] Every class tag assignment is sourced
- [ ] AIPAC page full output reviewed + approved by David
- [ ] Optional lawyer review completed (if elected)

## Problem areas
- [ ] Source registry orphan detector re-run, diff vs Phase 1 baseline
- [ ] 20 bot-block needs_review sources manually spot-checked
- [ ] Every policy-cited entity has complete class tags
- [ ] 10 query edge cases tested (empty, single, max, unicode, special chars)
- [ ] OG cards re-validated on X/LinkedIn/Facebook
- [ ] Every auth tier gate tested end-to-end

## Documentation
- [ ] CLAUDE.md cross-references all resolve
- [ ] Vault Rules.md cross-references all resolve
- [ ] Pipeline Guide.md cross-references all resolve
- [ ] Every ADR's closes/opens lists resolved or explicitly deferred
- [ ] CLAUDE.md active-rules index updated
- [x] Phase 6 retrospective written <!-- auto-verified 2026-04-15 -->
- [x] Final closing ADR written (ADR-NNNN: "Query Engine build complete") <!-- auto-verified 2026-04-15 -->

## Build verification
- [ ] `npx quartz build` clean
- [ ] All pre-commit sentinels pass
- [ ] No regressions on any phase's earlier exit criteria

## Shipping gate
- [ ] All items above checked
- [x] Phase 6 retrospective reviewed <!-- auto-verified 2026-04-15 -->
- [ ] Final closing ADR signed off by David
- [ ] `phase-transition` skill run to move build state to "complete"
