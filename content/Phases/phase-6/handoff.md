---
title: Phase 6 Handoff — Bug Hunt / Hardening
type: handoff
phase: 6
status: not-started
last-updated: 2026-04-14
blocked-by: [phase-1, phase-2, phase-2.75, phase-2.5, phase-3, phase-4, phase-5]
---

# Phase 6 Handoff

## Current state

Not started. Blocked on Phase 5 (Story Score) shipping. This is the final phase of the query engine build (ADR-0003 extended by ADR-0005). No new features — only bug fixes, regression coverage, and audits.

## Goal

Harden the query engine system by closing deferred items accumulated across Phases 1–5, adding regression coverage for fixed bugs, auditing data integrity / performance / security / defamation surface, and running a full documentation sweep. Ship Phase 6 when the system is audit-clean, not when every possible improvement is done.

## When to start Phase 6

Strict prerequisite: Phase 5 must be shipped. Don't start Phase 6 while any earlier phase is still in-progress — hardening a moving target is waste.

## Exactly where to pick up (when Phase 5 ships)

### First concrete action

Build `scripts/phase-6-deferred-items-collector.cjs` — walks every `content/Phases/phase-*/decisions.md`, `handoff.md`, and `retrospective.md`, extracts any line containing "deferred", "TODO", "known issue", "tech debt", "revisit later", or "fix later". Writes a categorized report to `content/Phases/phase-6/deferred-items.md` grouped by source phase.

That becomes Phase 6's initial backlog. Every item gets triaged: fix / explicitly defer via new ADR / accept as permanent.

### Then work through the 8 audit categories in order

1. **Deferred-items closeout** — work through the collector output
2. **Problem-area hunts** — re-run orphan detector, spot-check bot-block classifications, class tag coverage, query edge cases, OG cards, auth middleware
3. **Regression coverage** — add tests for every bug fixed during Phases 1–5
4. **Data integrity audits** — validate every `data/*.jsonl` file against its schema
5. **Performance audit** — benchmark Quartz build time, `/api/query` p50/p95, policy page cold-cache load, profile data panel render
6. **Security audit** — tier-check middleware coverage, rate limit enforcement, auth token handling, secrets in git history
7. **Defamation audit** — AIPAC page prose scan, source ID coverage, class tag sourcing, David's final review
8. **Documentation sweep** — cross-reference resolution, ADR closes/opens lists, CLAUDE.md index of active rules, Phase 6 retrospective

## Deliverables

### Deferred-items closeout
- [x] `scripts/phase-6-deferred-items-collector.cjs` + initial run <!-- auto-verified 2026-04-15 -->
- [x] `content/Phases/phase-6/deferred-items.md` populated <!-- auto-verified 2026-04-15 -->
- [ ] Every item triaged: fix / defer-with-ADR / accept-as-permanent
- [ ] Fixes shipped, deferrals logged

### Problem-area hunts
- [ ] Source registry: orphan detector re-run + diff vs Phase 1 baseline
- [ ] Bot-block spot-check: 20 needs_review sources manually verified
- [ ] Class tag coverage: every policy-cited entity has complete tags
- [ ] Query edge cases: 10 edge queries tested (empty, single, max, unicode, special chars)
- [ ] Policy pages: OG cards re-validated on X/LinkedIn/FB
- [ ] Auth middleware: every tier gate tested end-to-end

### Regression coverage
- [ ] Test suite for source registry (dedupe, URL normalization, schema validation)
- [ ] Test suite for fingerprint classifier (live/dead/bot-block/paywall/orphan/redirected)
- [x] Test suite for query engine (sample queries with expected counts) <!-- auto-verified 2026-04-15 -->
- [ ] Test suite for policy page template (snapshot tests)
- [x] Test suite for pre-commit sentinels (banned words, verified regression, bioguide dupes) <!-- auto-verified 2026-04-15 -->
- [ ] CI integration (tests run on every PR)

### Data integrity audits
- [x] `data/relationships.jsonl` — schema + dedupe + orphan endpoints <!-- auto-verified 2026-04-15 -->
- [x] `data/sources.jsonl` — schema + URL dedupe + staleness check <!-- auto-verified 2026-04-15 -->
- [x] `data/entity-class-tags.jsonl` — vocabulary compliance <!-- auto-verified 2026-04-15 -->
- [x] `data/events.jsonl` — `policy_id` + `obstruction_type` validation <!-- auto-verified 2026-04-15 -->
- [x] `data/policies.jsonl` — `related_events[]` + prose scan <!-- auto-verified 2026-04-15 -->

### Performance audit
- [ ] Quartz build time benchmark
- [x] `/api/query` p50/p95 measurement <!-- auto-verified 2026-04-15 -->
- [ ] Policy page cold-cache load time
- [ ] Profile data panel render time
- [ ] Top 3 slow paths optimized or documented

### Security audit
- [ ] Tier-check middleware audit on every `/api/*` route
- [ ] Rate limit enforcement test (rapid-fire requests)
- [ ] Auth token expiry + refresh test
- [ ] Git history secrets scan
- [ ] Vault open-source posture review

### Defamation audit
- [ ] Every policy page prose scanned for banned words
- [ ] Every factual claim has a resolving source ID
- [ ] Class tag assignments sourced
- [ ] AIPAC page full output reviewed by David
- [ ] Optional lawyer review

### Documentation sweep
- [ ] CLAUDE.md cross-references resolved
- [ ] Vault Rules.md cross-references resolved
- [ ] Pipeline Guide.md cross-references resolved
- [ ] Every ADR's closes/opens lists resolved or explicitly deferred
- [ ] CLAUDE.md active-rules index updated
- [x] Phase 6 retrospective <!-- auto-verified 2026-04-15 -->
- [x] Final ADR closing out ADR-0003 as "query engine build complete" <!-- auto-verified 2026-04-15 -->

## Exit criteria

- Every item in `deferred-items.md` triaged
- Regression test suite running green in CI
- Every data file passes its validator
- Performance benchmarks documented (not necessarily optimized — some may be accepted-slow)
- Security audit complete, no unaddressed findings
- Defamation audit complete, David approved AIPAC page
- Documentation sweep complete, no broken cross-references
- Phase 6 retrospective written
- Final closing ADR written
- `npx quartz build` clean
- All pre-commit sentinels green

## Known issues / concerns

- **Phase 6 scope will expand as earlier phases ship.** Every phase's `decisions.md` adds to the deferred items pile. Estimate will grow.
- **Regression test infrastructure doesn't exist yet.** Need to pick a test runner (Jest? Node's built-in test module?) and wire it into CI. Decision to be made in Phase 6.
- **Performance benchmarks need a baseline** captured before Phase 1 shipped. If we don't have that baseline, Phase 6 has to establish "current" as the new baseline and measure drift going forward.
- **Defamation audit may require legal counsel** for the AIPAC page specifically. That's a David decision and may add cost/time to Phase 6.

## Open questions for David (when Phase 6 begins)

1. Test runner choice (Jest / Vitest / Node built-in)?
2. Performance targets — do we have hard numbers for "acceptable" query latency?
3. Legal counsel for AIPAC page — yes/no/budget?
4. Monitoring / alerting scope — does this belong in Phase 6 or is it a post-launch ops concern?

## Progress log

### 2026-04-14 — ADR-0005 written
David requested Phase 6 as a dedicated bug-hunt/hardening phase. ADR-0005 written. Phase 6 folder created. Blocked on Phase 5 completion.
