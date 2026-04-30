---
title: "ADR-0029: Editorial Automation Tiers"
type: adr
status: accepted
date: 2026-04-28
last-amended: 2026-04-30
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

---

## §10 — Amendments

### Amendment 2026-04-30 — Vault enrichment Tier 1 expansion

**Authorized by David in session cc_p3_209 ("I approve everything")** to enable autonomous clearance of mechanical findings without expanding into editorial judgment.

**Five new auto-apply behaviors codified:**

#### A. Provenance-state semantics fix (no new class — check correction)

The `editorial-decision-provenance-check` formerly flagged any non-`candidate` state as a "decided" state requiring `decided_by`. The `data-complete-promotion` store uses `stuck` for "auto-detected, fails one gate" — semantically identical to `candidate`, just on a different path. Surfaced 556 false-positive findings (278 records × 2 fields).

Resolution: extended `PRE_DECISION_STATES` exemption in `scripts/editorial-decision-provenance-check.cjs` to cover `stuck`. No data touched. **Cleared: 556 findings.**

#### B. Cross-source role-disagreement dedup (relationships-store internal)

When fec-bulk and fec-pas2 both emit a monetary edge for the same `(from, to, amount, cycle)` but with different roles (e.g. fec-bulk `ie-support` vs fec-pas2 `direct-contribution`), drop fec-bulk's edge at load time. fec-pas2 is the authoritative classifier per ADR-0013. The exact-flow predicate keeps it tight — flows only in fec-bulk are unaffected.

Calibration: existing fec-bulk vs fec-pas2 source-priority is implicit per ADR-0013. The 3 known phantom cases (Jerrold Nadler, Paul Tonko, Josh Riley from cc_p3_207 audit) serve as fixtures. Verbose-mode logging (`RELATIONSHIPS_STORE_VERBOSE=1`) reports drop counts per process.

**Cleared: 1,592 redundant fec-bulk edges dropped at load → 1,360 phantom-overcount warns gone from edge-consistency.**

#### C. Frontmatter schema backfill from registries

Tier 1 mechanical fill of frontmatter fields deterministically derivable from canonical registries (legislator-registry, fec-committee-registry) or from path. Fields covered:

- `entity-type`, `chamber`, `party`, `parent` — from path / folder
- `bioguide-id` — exact-name match against legislator-registry, ambiguous names skipped
- `fec-committee-id`, `fec-committee-ids` — from fec-committee-registry vault_profile mapping

Calibration: schema-driven (only fills schema-required fields per profile-type) plus `field in fm` declared-vs-undeclared check (prevents the JB-Pritzker class of duplicate-mapping-key bug where `parent: null` was overwritten with a duplicate value).

Format-preserving inject — appends new fields as single lines; doesn't round-trip through yaml.dump (which would re-quote, re-wrap, reorder every key). `scripts/backfill-frontmatter-from-registries.cjs`.

**Cleared: 868 fields filled across 866 profiles** (510 single-committee, 353 multi-committee, 2 bioguide, 2 entity-type, 1 parent).

#### D. Story-candidate dedup by evidence-count

Among non-published / non-archived story candidates sharing `(detector_type, subject, counterparty)`, keep the survivor with highest evidence-count (parsed from headline; e.g. "Coinbase funds 17 Agriculture/HELP committee members" → 17). Tie-break by most recent `first_seen` (fresh signal preserves). Archive others with `editorial_notes: superseded-by:{survivor.id}`. `scripts/dedup-story-candidates.cjs`.

**Cleared: 14 stories archived → story-pages-integrity duplicates 24 → 0.**

#### E. Pathless-stub-aliases promoted from Tier 2 → Tier 1

The original ADR-0029 listed "pathless-stub aliases on 1:1 FEC committee mapping" as a Tier 1 class, but `classes/pathless-stub-aliases.cjs` registered it as Tier 2 only. Closing the gap.

Predicate: `rec.state === 'candidate'` AND `rec.name` has an exact `fec_name` match in `data/fec-committee-registry.json` AND that committee maps to a `vault_profile` AND the resolved entity exists. Collisions where two committees share fec_name with different vault_profiles excluded.

`auto_apply_target` returns the canonical entity_id; `apply_decision` falls back to `approved_merge_target` when `canonical_entity_id` not pre-set (Tier 2 path unchanged).

Calibration coverage (Rule 16): Mike Carey (new direct-coverage fixture, `bucket: pathless-stub-merge-target`), AOC, Catherine Cortez Masto, Mark Kelly, Pfizer Inc. (reused from librarian-gap-aliases — protect entity-merge blast radius).

**First fire: CAREY FOR CONGRESS auto-merged into Mike Carey. Future fires automatic via dispatcher.**

### Three small parameter calls (David approved 2026-04-30)

- **Provenance backfill label:** moot — the resolution (B above) was a check-semantics fix, no records carry the label.
- **Story dedup tie-breaker:** most-recent `first_seen` wins on equal evidence_count (fresh signal preserves).
- **A+ auto-block-runner scope:** scope-corrected — A+ findings are missing-FIELD findings, not missing-BLOCK findings. Mechanical subset (~30-50) already covered by C. The remaining 1,250 are editorial-judgment (central-thesis, story-grade, source-floor, legal-review).

### Additional non-Tier-1 work landed same session

These didn't expand Tier 1 but are part of the same enrichment push:

- **Cosponsor edges via BILLSTATUS bulk** — 468,644 cosponsor edges (politicians 117-119) added to `data/derived/govinfo-bill-status.jsonl`. File grew 46MB → 346MB; re-added to .gitignore. Graph went from 326k → ~795k visible edges (+144%). `scripts/derive-cosponsor-edges-from-billstatus.cjs`.
- **Topic-page-as-donor cleanup** — 128 monetary edges where one endpoint matched the article-subtitle pattern (`/\s+-\s+(The|A|An)\s+\w+/`) deprecated. Articles can't give/receive money; deterministic predicate. `scripts/deprecate-monetary-edges-with-topic-endpoints.cjs`.
- **Sync-entities-from-profiles scheduled in dispatcher** — daily 4:30 AM. Catches the Volodymyr Zelenskyy / Laphonza Butler class of gap (profile in vault, no entity record) before reconciliation warns drift upward.

### Net impact summary

| Category | Before | After | Delta |
|---|---|---|---|
| editorial-decision-provenance findings | 556 | 0 | -556 |
| edge-consistency phantom-overcount warns | 1,376 | 16 | -1,360 |
| story-pages-integrity duplicates | 24 | 0 | -24 |
| pathless-stub-entities | 13 | 12 | -1 (Tier 1 first fire) |
| Schema-backfill registry truth landed in frontmatter | — | 868 fields | +868 |
| Cosponsor edges in librarian | 0 | 468,644 | +468,644 |
| Topic-page-as-donor edges (now deprecated) | 128 active | 0 active | -128 |
| Total harness findings | 3,061 | ~1,100 | **-1,961** |

Calibration fixture coverage extended: Mike Carey added to `data/calibration-fixture.jsonl`. All Tier 1 classes registered with valid coverage per Rule 16.
