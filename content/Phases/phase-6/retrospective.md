---
title: Phase 6 Retrospective — Bug Hunt / Hardening
type: retrospective
phase: 6
last-updated: 2026-04-14
---

# Phase 6 Retrospective

Phase 6 was the hardening pass on the query engine build. Per ADR-0005, its job was to close deferred items, catch bugs from earlier phases, and add regression coverage before ADR-0003 could be closed.

## What shipped

### Sprint 6a — Inventory

- **`scripts/phase-6-deferred-items-collector.cjs`** — walks every `content/Phases/phase-*/` doc and every ADR, extracts lines matching deferred-work markers (TODO, deferred, known issue, tech debt, revisit, fix later, not blocking, follow-up, pending, out of scope, won't fix, XXX/FIXME/HACK) plus entire "Known issues / What this opens / Open questions / Blockers / Deferred" sections. Categorizes into 11 buckets (legal, security, performance, regression, docs, data integrity, pipelines, phase 2.75/4/5 polish, class tags, misc).
- **`content/Phases/phase-6/deferred-items.md`** — **267 items** catalogued with phase source, line link, kind, text, and a triage column. This is the Phase 6 backlog. David triages at his own pace.
- **`scripts/phase-6-data-integrity-audit.cjs`** — schema validation + duplicate ID detection + foreign-key resolution across all 8 data stores.
- **`content/Phases/phase-6/data-integrity-report.md`** — **43,587 records audited, 0 failures.** Every record in sources.jsonl, relationships.jsonl, entities.jsonl, events.jsonl, policies.jsonl, polling.jsonl, users.jsonl, and claims/*.jsonl passes its schema validator, has no duplicate IDs within its store, and every foreign-key reference resolves.

### Sprint 6b — Regression coverage

- **`scripts/phase-6-regression-tests.cjs`** — 20 tests using Node's built-in `node:test` module (zero extra dependencies, runs in ~75ms). Every test maps to a specific bug fixed during Phases 1–5 that would silently regress if a future refactor "cleaned up" the fix.

**Coverage:**
- Source URL normalization — www prefix, trailing slash, utm params, case (Phase 1 FEC migration dedupe)
- Schema validator rejections — sources, entities, events, claims (defamation firewall from Phase 2/2.5/4)
- Tier hierarchy — admin bypasses everything, researcher passes free-auth, anonymous blocks researcher, patron equals researcher (Phase 2.5 auth)
- Story scorer math — recency decay curve, tier thresholds, old stories decayed even with strong signals (Phase 5)
- Heuristic class tag — labor-aligned capital_type vocabulary preservation (the California Nurses Association bug)

### Sprint 6c — Closeout

- **`content/Decisions/0008-query-engine-build-complete.md`** — closing ADR for ADR-0003.
- This retrospective.

## What took longer than expected

- **The deferred items count was higher than expected** (267 items across 11 categories). Expectation going in was "maybe 40-60 items." Reality: every `decisions.md` and every ADR "what this opens" section contributes, and Phase 2.75 alone contributed heavily via the editorial firewall rules. The categorizer was worth building because a flat list of 267 items is unusable; categorized, David can skim the buckets that matter to him first (legal/defamation, security/auth).
- **Regression test scoping** — the first instinct was "write tests for every module." Corrected to "write tests for every bug we actually hit." Much tighter scope. Result: 20 tests covering real regressions instead of 200 tests covering theoretical ones.

## What surprised us

- **Zero data integrity failures across 43,587 records.** Going into the audit, the expectation was at least a handful of orphaned foreign-keys or validator edge cases. Finding zero was a pleasant surprise and is a direct result of putting the validators in place at the schema layer during Phases 1–5 rather than as a post-hoc audit.
- **The ADR-0005 exit criteria were over-ambitious.** Performance benchmarks, OG card re-validation, end-to-end tier gate matrix, AIPAC legal review — these aren't "Phase 6 hardening" work, they're "pre-publication gates" work. The closing ADR (0008) names them explicitly as deferred to ongoing maintenance rather than pretending they'll block closure.
- **`node:test` is actually pleasant.** No jest, no vitest, no config file, no devDependency. `require("node:test")` + `require("node:assert/strict")` and you have a test runner. Worth remembering for anything future that wants zero-dependency tests.

## Lessons to carry forward

1. **Validators at the schema layer beat audits at the end.** The reason the data integrity audit passed with zero failures is that we couldn't have gotten non-conforming records into the stores in the first place — the validators reject on write, not on read. This is the pattern to repeat for any new data store.
2. **Regression tests should cover bugs, not modules.** Map each test to a specific bug. If you can't name the bug the test prevents, the test has no signal.
3. **"Deferred items" are a real asset if categorized.** 267 flat items is noise. 267 items bucketed by legal/security/perf/docs/data is a triage surface. The collector script is reusable every future phase.
4. **Closing ADRs should be honest about what's deferred.** ADR-0008 lists 10 things that didn't get done in Phase 6 and explains why each moved to ongoing maintenance. Pretending everything is done is worse than naming the gaps.
5. **Build phases to ship, not to be pristine.** Trying to check every ADR-0005 exit criteria box would have dragged Phase 6 out indefinitely. The architectural build is complete; polish work continues as maintenance. David's explicit direction ("push the rest of the phasing") made this call easy.

## Tech debt introduced

- **Phase 6 regression test suite is run manually.** Not yet wired into the pre-commit gate or a CI workflow. Low effort to add; deferred to next maintenance pass.
- **Performance benchmarks not captured.** No p50/p95 numbers for `/api/query`, no cold-cache load time for policy pages. Will capture under real load after public launch rather than synthetic benchmarks now.
- **Stripe is scaffolded but not activated.** 20-minute activation walkthrough is documented in `content/Admin Notes/phase-2.5-setup.md`. David flips the switch when ready.

## Commit hashes of major changes

- `Phase 6 sprint 6a` — deferred-items collector + data integrity audit
- `Phase 6 sprint 6b` — regression test harness (20 tests, 0 fail), commit `f0966209a`
- `Phase 6 closeout` — ADR-0008 + this retrospective (final commit, pending)

## Exit criteria — honest status

| Section | Shipped | Deferred to maintenance |
|---|---|---|
| Deferred-items closeout | Collector + 267-item backlog | Item-by-item triage |
| Regression test suite | 20 tests passing, Node `node:test` runner | CI integration |
| Data integrity | All 8 stores clean, 43,587 records | — |
| Performance | — | All benchmarks (post-launch) |
| Security | Tier middleware audited, graceful-degrade pattern verified | Rate limit rapid-fire, git secret scan |
| Defamation | Schema-level firewall, banned-word checks | AIPAC page full review (David) |
| Problem areas | Fingerprint orphans re-run, class tag vocabulary locked | 20-bot-block spot check, OG card re-validation |
| Documentation | ADR-0008 closing, retrospective written | CLAUDE.md / Vault Rules cross-ref sweep |
| Build verification | `node --test` green, pre-commit sentinels pass | — |

Shipping gate: the query engine build is architecturally complete. ADR-0003 is closed. Deferred items tracked as ongoing maintenance.
