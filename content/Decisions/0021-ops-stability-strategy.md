---
title: "ADR-0021: Ops Stability Strategy — Self-Healing Harness, Rule Consolidation, No One-Off Scripts"
type: adr
status: accepted
date: 2026-04-23
accepted: 2026-04-23
supersedes-partial: none
---

# ADR-0021: Ops Stability Strategy

## Context

By 2026-04-23 the vault contains ~1,500 profiles and David estimates
500-2,000 individual data/content issues across them (defamation-adjacent
to cosmetic). Every systematic audit script surfaces real bugs. Credibility
debt is compounding faster than manual fixes can close it.

The current pattern: each bug class gets a new one-off audit script.
`scripts/` root has accumulated dozens. Each script runs once, fixes one
instance, dies. The same bug class reappears in new profiles because no
durable check captures the pattern.

This session's deep-dive audit of `/signoff-queue` and `/signoff-launch`
confirmed the system has structural drift beyond individual bugs:

- **Checklists lie.** The sign-off queue reports 125 "A+ passed" profiles
  but the A+ quality checks only run for `type === 'politician'` — all
  125 entries are donors/corporations that skipped the real bar. Zero
  politicians pass.
- **Stamps never expire.** `audit-a-plus-passed` stamped once lives
  forever; drift never clears it.
- **Prose vs structured data never cross-checked.** A profile saying
  "$2.4M" in text while its graph shows "$1.8M" passes every existing
  check.
- **Two checklists disagree.** `/signoff-queue` and `/signoff-launch`
  count sources differently on the same profile.
- **Manual overrides trump audits.** Launch-50 lets David tick "Class
  Analysis ✓" on a profile the audit says has no Class Analysis.
- **Rules aren't enforced.** Of 15 numbered CLAUDE.md rules, 4 have
  hooks/sentinels; 11 are aspirational and drift silently.

David's framing: *"Are my rules good enough to keep a self-sustaining
automatic vault that can keep creating without bugs?"* Honest answer: **no
— 60% of the way there.** The existing rules cover the right territory
(canonical stores, write-through, lane boundaries, claim-object pattern),
but meta-rules and enforcement are missing.

David's mandate: *"I don't want to keep fixing and fixing the same problems."*
The fix pattern must change: every discovered bug class becomes a
permanent auto-check, not a one-off script.

## Options considered

**A. Keep writing one-off audit scripts.** Current pattern. Rejected —
proven to compound debt, not close it.

**B. Delete everything and rebuild.** Considered by David. Rejected — the
canonical data (profiles, stores, bulk CSVs) took years to build and must
be preserved. Tooling rebuild alone is weeks; full rebuild is months of
no tooling.

**C. Unified self-healing audit harness + rule consolidation +
enforcement promotion.** Build a meta-harness that aggregates every check,
runs on every commit + nightly, auto-fixes safe cases and queues
judgment calls. Consolidate the 15 numbered rules into enforced-or-deleted.
Add 7 missing meta-rules.

## Decision

Adopt Option C. This ADR establishes the strategy. Implementation is
phased and approved step-by-step.

## The 7 missing meta-rules (added to the rulebook)

These are additions to the existing 15 numbered CLAUDE.md rules. They fill
the structural gaps that created the current drift.

### Rule 16 — Single Source of Truth

> If two pieces of code compute the same fact, one is wrong. Every fact
> (readiness tier, source count, A+ status, relationship edge count,
> triangulation count, etc.) lives in exactly one function in one file.
> All other code imports or queries. Duplicated computation is a drift
> bug waiting to happen.

Enforcement: code review + `scripts/dup-fact-finder.cjs` (to be built) —
scans for independent re-implementations of the same computation.

### Rule 17 — Every stamp expires

> Every audit stamp, verification flag, or pass-marker on a profile
> carries a TTL. After N days without re-verification, the stamp either
> re-checks automatically or clears. Stamps don't live forever. Specific
> TTLs per stamp type live in `scripts/lib/stamp-ttl.cjs`.

Enforcement: harness daily pass clears expired stamps.

### Rule 18 — Prose-structured-data consistency

> Numbers, names, and factual claims in profile prose must match the
> corresponding structured fields and auto-block data. A profile saying
> "$X" in prose while its auto-block shows "$Y" is a bug, not an
> editorial choice.

Enforcement: `prose-data-consistency-check` added to the harness. Blocks
commits for `content-readiness: verified` profiles; queues warnings for
lower tiers.

### Rule 19 — No manual override of automated verification

> If a check is automated, manual toggles cannot override it. Humans can
> flag false-positives (which the check must learn from). Humans cannot
> silently mark something green when the check says red.

Enforcement: remove manual-override checkboxes from Ops UI; replace with
"flag as false positive" which routes to the check's training data.

### Rule 20 — Script lifecycle policy

> Every script in `scripts/` root has an owner, a last-used date, and is
> either invoked by the harness or explicitly scheduled. Scripts unused
> 60 days move to `scripts/_archive/` automatically.

Enforcement: `scripts/script-janitor.cjs` runs weekly, moves stale
scripts, writes a digest to Admin Notes.

### Rule 21 — Rule-drift audit cadence

> Every quarter, or after every ADR that changes vocabulary or
> architecture, all numbered rules and canonical-store references are
> re-checked against current code. Stale rules are deleted, not
> footnoted. The rule audit is itself a harness check.

Enforcement: `rule-drift-check` added to harness; triggered quarterly
and after every ADR commit.

### Rule 22 — No aspirational rules in CLAUDE.md

> If a rule can't be enforced by a test, hook, or sentinel, it doesn't go
> in CLAUDE.md. Aspirational rules go in ADRs with a promotion path —
> either an owner commits to writing the enforcement within a named
> window, or the ADR is archived as "won't-enforce." CLAUDE.md is for
> enforced rules only. Aspirations belong in ADRs.

Enforcement: `claude-md-linter` checks that every rule in CLAUDE.md has
a linked sentinel/hook/test.

## The unified audit harness

Build `scripts/vault-audit.cjs` as the conductor. It:

1. Invokes every existing check in sequence (pipeline-janitor,
   audit-committee-registry, reclassify-readiness, edge-role-taxonomy,
   etc.).
2. Aggregates all findings into `content/Admin Notes/vault-audit-latest.json`
   (a single artifact).
3. Categorizes each finding: `auto-fix`, `queue-for-human`, or `known`.
4. Auto-fixes safe cases (wrong field format, stale cache, known
   mapping errors).
5. Writes queue-for-human findings to the Attention Queue.
6. Runs on: pre-commit hook, nightly cron, on-demand from Ops UI.
7. Ops pages (`/system-health`, `/attention`) read the single artifact.

## Phased implementation

Each phase is its own session(s), approved before starting.

- **Phase 0 (this ADR):** strategy locked in durable form.
- **Phase 1:** rule-sort pass — classify existing rules into 4 buckets
  (enforced / enforceable / principle / stale). Output is a table David
  reviews and approves. No code changes.
- **Phase 2:** execute sort outcomes — bucket 2 gets hooks or deletions,
  bucket 3 consolidates, bucket 4 deletes. Multiple sessions.
- **Phase 3:** harness skeleton — `scripts/vault-audit.cjs` coordinates
  existing scripts. No new checks yet.
- **Phase 4:** Ops app unified surface — `/system-health` and `/attention`
  read the harness artifact. Secondary pages keep working.
- **Phase 5:** missing checks added one at a time (Rules 16-22 get
  enforcement; type-specific A+ bar for donors/corps; prose-data check;
  stamp expiry; etc.). One check per session.
- **Phase 6:** auto-fix triage layer — conservative start (everything
  queues), graduates to auto-fix only when proven safe.
- **Phase 7:** script pruning — archive scripts subsumed by the harness.

No urgency on completion. April 30 is not a hard deadline. Correctness
and self-sustainability are the goals. Sessions are approved one at a time.

## Rationale

Three shifts make this self-sustaining where the current system isn't:

1. **Fact-singularity.** One source of truth per fact. No drift between
   scripts, no cross-tool disagreement.
2. **Stamp ephemerality.** Every claim about a profile's state is
   time-bounded. Drift clears itself.
3. **Enforcement-over-aspiration.** Rules that can't be enforced don't
   belong in the rulebook. The rulebook itself becomes testable.

Combined with the harness and the Claude discipline rule (memory entry
`feedback_harness_not_oneoff.md` — "extend harness, not one-off scripts"),
the vault gets harder to break over time instead of easier, because every
discovered bug class becomes a permanent check.

## Consequences

**Positive:**
- Stops repeated same-class bug discovery
- Consolidates drift surfaces (fewer places for facts to disagree)
- Makes rules testable (so CLAUDE.md stops rotting)
- Ops UI stops lying (surfaces reflect live harness output)
- Claude's discipline becomes hook-enforced, not memory-dependent

**Negative:**
- Multi-session initiative (15-25 sessions estimated)
- Temporary disruption as hooks come online (may block commits during
  bucket-2 promotions)
- Requires archival discipline (stale scripts/docs must actually get
  deleted, not softly deprecated)
- Some existing "accepted" patterns become technical debt to retire
  (manual checkbox overrides, audit-a-plus stamp as one-way marker, etc.)

**Neutral:**
- The harness is coordination, not invention — 80% of the checks exist;
  this ADR aligns them

## Closes

- The "write more docs so Claude remembers" pattern
- One-off audit scripts as the default bug-response pattern
- Aspirational rules in CLAUDE.md without enforcement
- Multiple independent computations of the same fact

## Opens

- Phase 1 (rule-sort pass) — next session
- Rules 16-22 enforcement tickets (one per rule, added to harness over time)
- Retirement path for manual-override UI patterns
- Retirement path for one-way audit stamps
