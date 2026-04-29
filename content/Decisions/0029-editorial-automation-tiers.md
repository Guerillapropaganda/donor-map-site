---
title: "ADR-0029: Editorial Automation Tiers"
type: adr
status: accepted
date: 2026-04-28
relates-to: 0021, 0024, 0025, 0027
amends: null
---

# ADR-0029: Editorial Automation Tiers

## Status

**Accepted 2026-04-28. Implementation begins same day.**

This ADR redraws the lane between Code Claude, Research Claude, and David. It does NOT change the rules around legal exposure, ADR-level architecture, money/auth, or sensitive-word review — those stay David-only. It DOES move mechanical editorial decisions (alias triage, frontmatter-orphan triage, dedup triage, mechanical readiness promotion) from "David approves each one" to a tiered model where Claude operates within confidence bands, the canonical stores carry provenance, and the calibration harness catches drift in the dispatcher cycle.

## Context — why now

The vault has grown faster than David can triage. As of 2026-04-28 the open editorial-decision backlog is:

- **Librarian gap candidates:** 72 surfaced (top item: IAFF PAC, 416 appearances)
- **Frontmatter orphan candidates:** 8,848 across 684 profiles
- **Duplicate-entity profiles:** 11 groups
- **Pathless-stub entities:** 13 (10 partially aliased)
- **Type-specific A+ findings:** 1,323
- **Class-tag staleness:** 8

If every decision requires David, the queue grows faster than it drains. Most of these decisions are not legal-risk-shaped — they're "should X be aliased to Y, given that X appears 400 times and Y is the only nearby librarian node." That's a confidence-band call, not a judgment call.

The 2026-04-28 cascade (Pfizer/ADM/AOC data-panel regression) demonstrated that the system already has the safety net needed to make Claude-write safe:

1. **Calibration harness** (vault-audit check #31, shipped earlier today) — semantic drift fires within the 15-min dispatcher cycle, independent of upstream cause
2. **Canonical stores with state machines** — every decision is one git revert away
3. **Pre-commit sentinels** — structural violations blocked at commit time
4. **Pattern matured** — librarian-gap-decisions store (shipped earlier today) demonstrates the propose → review → apply pattern works end-to-end

What's missing is the codified framework for *which* decisions Claude can make autonomously, *what* provenance gets recorded, and *how* the calibration harness reverts mistakes.

## Decision

Three tiers govern editorial decisions. Every decision class lands in one of them, gated by confidence + risk + reversibility.

### Tier 1 — auto-apply

Claude applies the decision without human review. Provenance recorded. Calibration harness reverts on drift.

**Required for a decision class to qualify for Tier 1:**
1. Mechanical confidence threshold — clear quantitative criteria for when the decision is high-confidence (e.g., edit-distance ≤ 2 AND both names appear ≥ 10× AND exactly one similar match)
2. Calibration coverage — at least one fixture in `data/calibration-fixture.jsonl` covers the blast radius of this decision class. **Without this fixture, Tier 1 auto-apply is disabled for the class.** Forces Claude to add safety coverage *before* taking authority — can't quietly grant itself power.
3. Reversibility — the decision lands in a canonical store with state machine and `decided_by: claude-auto` provenance. One git revert undoes any individual decision; the auto-revert hook reverts a batch when calibration fires.

**Examples accepted at Tier 1:**
- Alias merges: edit-distance ≤ 2 AND both endpoints have ≥ 10 appearances AND exactly one similar match in the librarian
- Pathless-stub aliases: FEC committee_id maps unambiguously to one librarian node (1:1)
- Readiness `raw → draft`: pure mechanical (existing classifier; no editorial judgment)
- Frontmatter-orphan prune: librarian has zero edges of the relevant kind AND name not in `opposes:` AND no similar names found

### Tier 2 — Claude-recommended, batch-approved

Claude makes a recommendation; David reviews a one-screen markdown digest and confirms with a default-approve gesture. Exceptions get flagged.

**Used for medium-confidence decisions:**
- Alias merges with 2-3 plausible candidates (similarity good but ambiguous)
- Dedup merges where FEC ID matches but profiles look distinct
- Class-tag application from fixed vocabulary (vocabulary changes stay Tier 3)
- Story candidate → draft (Claude writes the draft narrative; David reads in Obsidian)
- Readiness `draft → ready`

The `librarian-gap-propose --review-list` pattern shipped today generalizes here: every Tier 2 queue produces a markdown review file with a YAML decisions block; David's default action is approve-all with sample-flagging.

### Tier 3 — David-only (unchanged from current rules)

Decisions with real legal or architectural exposure stay David's sole call:

- URL verification + replacement (Rule 13 — defamation exposure on FEC ID mismatches)
- Defamation-prone language reviews
- Sensitive-word reviews
- ADR-level architectural decisions
- Class-tag *vocabulary* changes (the schema, not the application)
- Money / auth / security architecture
- Promotion to `verified` (the publishable-quality badge)
- Story `published` state (editorial voice goes live)
- Public-route exposure (`data/public-routes.json`)
- Anything involving a real person whose name's appearance Claude isn't certain of

## CLAUDE.md rule revisions

Four changes:

**Rule 9 (readiness flow):** Currently states all promotions are owned by `scripts/reclassify-readiness.cjs` and David approves. Revised: `raw → draft` and `draft → ready` are Tier 2 (Claude-recommended, batch-approved); `ready → data-complete` and `data-complete → verified` remain Tier 3 (David-approved). The classifier script remains the sole writer; what changes is who approves its proposals.

**Rule 13 (URL verification):** **Unchanged.** Real legal exposure. Stays David-only.

**"Stop and ask" list under Code Claude autonomy:** Editorial *mechanics* (alias triage, dedup triage, frontmatter-orphan triage, pathless-stub aliasing, mechanical readiness promotions) move to Tier 1/2 of this ADR. The "stop and ask" boundary now sits at editorial *voice* (Class Analysis prose, Who They Are framing, Central Thesis writing) which remains Research Claude / David's lane.

**New Rule 28 — calibration safety net required for Tier 1.** Any class of decision auto-applied at Tier 1 must have at least one fixture in `data/calibration-fixture.jsonl` covering its blast radius. The new `editorial-decision-pipeline` library refuses to register a Tier 1 class without verified fixture coverage. This rule mechanically prevents the "we let Claude auto-apply but didn't add semantic checks" failure mode.

## Implementation

### Phase 1 — pipeline library (this session)

`scripts/lib/editorial-decision-pipeline.cjs` — reusable abstraction generalizing the librarian-gap pattern. Every editorial-decision queue plugs into it:

```
const pipeline = require('./lib/editorial-decision-pipeline.cjs');
pipeline.register({
  name: 'librarian-gap-aliases',
  store_path: 'data/librarian-gap-decisions.jsonl',
  tier1_predicate: (rec) => rec.similar?.length === 1 && rec.similar[0].distance <= 2 && rec.appearances >= 10,
  calibration_fixtures: ['Pfizer Inc.', 'ADM - Archer Daniels Midland', 'Alexandria Ocasio-Cortez'],
  apply_decision: (rec, decision) => { /* class-specific writer */ },
});
```

The library handles: state machine validation, `decided_by` provenance, calibration-coverage check at registration time, auto-revert hook, sample-audit feed.

### Phase 2 — provenance + auto-revert (this session)

Every canonical-store decision record gains:
- `decided_by: 'david' | 'claude-auto' | 'claude-batch-approved'`
- `decided_at: ISO timestamp`
- `auto_revert_eligible: bool` (tier-1 auto-applied = true)

The calibration harness fires within 15 min of any drift; the auto-revert hook reads the calibration check's `findings`, identifies decisions in the affected blast radius made within the last 24 hours by `claude-auto`, and reverts them to state `candidate` with a `reverted_reason: 'calibration-drift-<fixture-id>'` field. The decision goes back into the editorial queue for human review.

### Phase 3 — queue migrations (partial this session)

In priority order:
1. `librarian-gap-decisions` — refactor to use the pipeline (proves it works)
2. `frontmatter-orphan-candidates` — migrate next (largest queue: 8,848 candidates)
3. `duplicate-entity-profiles` — migrate (smaller queue, mechanical)
4. `pathless-stub-entities` — migrate (already partially mechanical per yesterday)

### Phase 4 — Ops sample-audit page (v1 this session)

`ops/src/app/audit-claude-decisions/page.tsx` — shows 20 random tier-1 decisions made in the last 7 days. Each has: the decision, the input data, the canonical store record. One click → flip to `rejected` → auto-revert + add to "Claude over-confident" learning corpus.

This is the editorial spot-check surface. Expected weekly cadence: 5-10 minutes of sampling, find any drift Claude introduced.

## Rationale

**Why now (not later):** the queue is growing faster than it drains. Every week David doesn't touch alias triage, the IAFF PAC of the world adds another 50 appearances. The 2026-04-28 cascade also proved the safety net is in place — we just have not authorized Claude to use it.

**Why not full automation:** Tier 3 protects real legal exposure. URL verification mistakes are defamation. Class-tag vocabulary changes set precedents that compound. These aren't mechanical confidence calls.

**Why the calibration-fixture requirement:** without it, Claude could quietly grant itself authority on any decision class by writing the predicate. Forcing fixture coverage means the safety net exists *before* the authority is delegated. Pre-mortem instead of post-mortem.

**Why provenance matters:** without `decided_by`, you can't tell "Claude applied this and got it wrong" from "I applied this and got it wrong." Provenance lets the spot-audit corpus accumulate signal — patterns of Claude over-confidence become visible and the predicate gets tightened.

## Consequences

**Closes:**
- Editorial backlog growing faster than David can triage
- Implicit lane confusion in the current "Stop and ask" list (lumps editorial mechanics with editorial voice)
- The "Claude touches a thing it shouldn't have" risk being structural rather than encoded

**Opens:**
- Risk of Claude over-confidence on mechanical decisions — mitigated by calibration auto-revert + spot-audit
- Need to maintain calibration-fixture coverage as new decision classes are added — this is by design (the rule forces coverage before authority)
- Some Tier 2 decisions David would have caught manually now require him to skim a digest — net time-savings expected to be 5-10× per week

**Future ADRs may amend:**
- If sample-audit shows Claude predictably wrong on a Tier 1 class, that class drops to Tier 2 (or its predicate gets tightened).
- New decision classes default to Tier 2 unless explicitly justified for Tier 1 with fixture coverage.
- The `verified` promotion may become Tier 2 in the future once editorial-checklist coverage is mature; not yet.

## Closes

- Implicit "everything goes through David" rule that was creating queue debt
- Lack of provenance on canonical-store decisions
- Lack of auto-revert hook tying calibration drift to recent Claude-auto decisions

## Opens

- Tier-1 expansion via additional calibration-fixture coverage
- Generalized `editorial-decision-pipeline` library that future decision classes use rather than reinventing
- The `audit-claude-decisions` ops page as a permanent spot-check surface

## References

- ADR-0021 — Ops Stability Strategy (foundation: harness owns truth, no one-off scripts)
- ADR-0024 — Unified Graph Engine (foundation: librarian as canonical resolver)
- ADR-0025 — Pipeline Janitor Mechanical-Demote Authority (precedent: tool granted scope-bounded write authority)
- ADR-0027 — Frontmatter Cache Prune Mode (precedent: editor-in-the-loop review queue with canonical store)
