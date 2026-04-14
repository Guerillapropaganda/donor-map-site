---
title: "ADR-0005: Phase 6 — Bug Hunt / Hardening"
type: decision
adr: 5
date: 2026-04-14
status: approved
authors: [Code Claude, David]
extends: ADR-0003
---

# ADR-0005: Phase 6 — Bug Hunt / Hardening

## Context

ADR-0003 defined a 6-phase query engine build (Phases 1 through 5, with Phase 2.75 added via ADR-0004). Every phase ships features. None of the phases are dedicated to hardening — the "known issues" and "mid-phase decisions" logs accumulate unresolved items across phases, and the build doesn't have a deliberate pass to go back through problem areas and fix them.

Without a hardening phase, two failure modes emerge:
1. **Bug accumulation.** Every mid-phase decision log has "deferred until later" entries. "Later" never arrives because the next phase starts immediately on ship.
2. **Regression drift.** Fixes made in one phase (bot-block classifier in Phase 1, for example) don't get regression coverage, so a future refactor silently breaks them.

David's direction on 2026-04-14: add a dedicated phase that hunts bugs in problem areas discovered during the build, especially areas we flagged but didn't fully resolve.

## Options considered

1. **Fold bug hunts into each phase's exit criteria.** Rejected: phases are already full, and hardening requires stepping back from feature pressure. A phase that's hardening-contaminated tends to ship less reliably.

2. **Continuous hardening between phases.** Rejected: needs enforcement discipline that's hard to sustain; easier to defer hardening indefinitely.

3. **Dedicated Phase 6 at the end of the sequence.** Approved. Runs after Phase 5 (Story Score) ships, dedicated entirely to bug hunting, regression coverage, performance/security/data-integrity audits, and closing out the accumulated deferred-items logs.

## Decision

Add **Phase 6 — Bug Hunt / Hardening** as the final phase of the query engine build. Phase 6 is dedicated entirely to fixing bugs, closing deferred items, adding regression coverage, and auditing problem areas discovered during Phases 1–5.

### Scope

**1. Deferred-items closeout**
- Walk every phase's `decisions.md` for "deferred until later" items.
- Walk every phase's `handoff.md` for "known issues" items.
- Walk every phase's `retrospective.md` for "tech debt introduced" items.
- Triage each: fix / explicitly defer with ADR / accept as permanent.

**2. Problem-area hunts** (specific areas flagged during earlier phases)
- **Source registry**: re-run orphan detector, verify the 1,622 flagged items from Phase 1 were triaged in Ops `/sources`. Hunt for new orphans introduced during Phases 2–5.
- **Bot-block false positives**: spot-check 20 `needs_review` sources manually. Tune `BOT_BLOCK_TITLE_RE` / `BOT_BLOCK_BODY_RE` if patterns drift.
- **Class tag coverage**: verify every entity cited on a policy page has class tags assigned. Flag any `class_position: ambiguous` that should have been resolved.
- **Query engine edge cases**: test each filter with empty result sets, single-result sets, max-results sets, unicode entities, special characters in queries.
- **Policy pages**: re-verify OG cards on Twitter/X/LinkedIn/Facebook validators. Verify every factual claim still has a source ID after any data drift.
- **Auth middleware**: test every tier gate, every rate limit, every upgrade path. Verify free pages stay free.

**3. Regression coverage**
- Add tests for every bug fixed during Phases 1–5 (regression suite).
- Source registry dedupe (URL normalization) — test cases.
- Fingerprint classifier — test cases for live/dead/bot-block/paywall/generic_orphan/redirected.
- Query engine — sample queries with expected counts, run as a smoke suite.
- Policy page template — snapshot tests on rendered output.
- Pre-commit sentinels — test cases for each banned-word rule (positive and negative).

**4. Data integrity audits**
- `data/relationships.jsonl`: validate every edge against schema, check for duplicates, check for orphaned endpoints.
- `data/sources.jsonl`: validate every source, check for URL duplicates after normalization, check for status staleness (>30 days since `last_checked`).
- `data/entity-class-tags.jsonl`: validate every tag assignment against the locked vocabulary, check for approved-but-not-referenced tags.
- `data/events.jsonl`: validate `policy_id` references resolve, validate `obstruction_type` enum values.
- `data/policies.jsonl`: validate `related_events[]` references resolve, check blurb prose for banned words.

**5. Performance audit**
- Quartz build time benchmark — compare to pre-Phase-1 baseline.
- `/api/query` response time p50/p95 for representative queries.
- Policy page load time (cold cache).
- Profile data panel render time.
- Identify the top 3 slow paths and optimize or document as accepted-slow.

**6. Security audit**
- Verify tier-check middleware on every `/api/*` route (no bypass).
- Verify rate limits actually enforce (test with rapid-fire requests).
- Verify auth tokens expire and refresh correctly.
- Check for secrets in git history (`.env`, API keys, tokens).
- Verify the vault's GitHub open-source posture hasn't accidentally leaked anything private.

**7. Defamation audit** (specifically for the AIPAC/BDS page and any other high-risk policy pages)
- Scan every policy page prose block for banned words (`bought`, `co-opted`, `bribed`, `corrupt`, `scheme`).
- Verify every factual claim has a source ID and the source resolves.
- Verify class tag assignments are sourced, not opinion.
- Flag any prose that shifts from fact-statement to interpretation without blockquote attribution.
- David reviews the full AIPAC page output post-audit.

**8. Documentation sweep**
- CLAUDE.md, Vault Rules.md, Pipeline Guide.md — verify all cross-references still resolve.
- Check every ADR's "closes" and "opens" lists for resolution.
- Update the index of active rules in CLAUDE.md.
- Phase 6 retrospective + final decision log entry closing out ADR-0003 as "fully shipped."

## Rationale

- **Bugs accumulate silently without a hardening pass.** Every feature phase leaves deferred items. Phase 6 is the garbage collector.
- **Regression coverage prevents the next refactor from breaking what we just fixed.** The bot-block classifier fix was valuable and non-obvious; without a test, a future "clean up the fingerprint script" change could silently undo it.
- **Problem areas compound.** Phase 1 flagged 1,622 orphan citations. If we don't hunt for new ones introduced by Phase 2–5 pipelines, the registry degrades invisibly.
- **Legal/defamation audit is mandatory** before the AIPAC page can ship publicly. Phase 2.75 locks the editorial firewall, but a full audit of the final rendered output is a separate discipline that belongs in hardening.
- **Security is not a feature, it's a phase gate.** Auth ships in Phase 2.5, but a dedicated security audit that tests the middleware end-to-end has to come after the full surface area exists.

## Consequences

- **Phase 6 is the final gate before "the query engine build is done."** No new features in Phase 6 — only fixes, tests, and audits.
- **Every earlier phase gains a "what's deferred for Phase 6" section** in its `decisions.md`. Phase transition skill should prompt the operator to add any deferrals to that file before the phase ships.
- **Regression test suite is introduced in Phase 6** and becomes the permanent test foundation for post-launch maintenance.
- **The `phase-transition` skill should gain a final "running full audit suite" step** during the Phase 5 → Phase 6 transition specifically.
- **Monitoring / alerting is Phase 6's problem, not a prior phase's.** If anything needs ongoing observability (error rates, slow queries, broken links), it goes in Phase 6 scope.

## What this closes

- Uncertainty about where bug fixes go after the phase they're discovered in
- The "deferred until later" accumulation problem
- The legal review gate for the AIPAC page
- The security gate for the auth middleware

## What this opens

- Permanent regression test suite (new maintenance surface)
- Monitoring / alerting infrastructure (Phase 6 scope, but becomes an ongoing operational cost)
- Phase-6-specific tooling (a "deferred items collector" script that walks all phase folders and extracts open items)

## Notes on scope

Phase 6 is **not** where new features land. If something discovered during Phase 6 is a genuinely new feature, it becomes either:
- A hotfix back-ported into the phase where it belongs (if the phase hasn't shipped yet)
- A new ADR for a post-query-engine phase (Phase 7, Phase 8, etc.)
- Explicitly deferred to post-launch

The discipline: Phase 6 ships when the vault is hardened, not when every possible improvement is done.
