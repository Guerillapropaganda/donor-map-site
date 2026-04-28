---
title: Rulebook audit 2026-04-29 — CLAUDE.md vs ADR-0017 / 0022 / 0024
type: admin-note
status: open
tags: [code, rulebook, drift]
last-updated: 2026-04-29
---

# Rulebook audit — CLAUDE.md vs ADR-0017 / 0022 / 0024

Continuation of the 2026-04-23 rule sort that rebuilt the active-ADR list. That pass fixed the *index*. This pass checks whether the rule **text** still reflects what 0017, 0022, and 0024 actually decided. Per Rule 22 (ADR-0021), this drift is supposed to be hook-caught — those hooks don't yet exist for these three.

Editorial judgment needed for each item below — I did not edit `CLAUDE.md` because rule changes are David's lane.

## Drift confirmed

### ADR-0017 — Rule 9 readiness criteria don't match the ADR

**`CLAUDE.md` Rule 9 (current):**

> **data-complete** requires: type-specific auto-sections populated, at least one Tier 1 source, mapped relationships, data freshness ≤90 days, zero blocking flags

**ADR-0017 §"data-complete when" actually decides:**

> auto-sections populated, **canonical-ID match** (bioguide / FEC / EIN / slug), no defamation/JANITOR flags, freshness ≤90d, banner renders

Two specific drifts:

1. Rule 9 invents a "≥1 Tier 1 source" requirement. ADR-0017 has no source-tier requirement for data-complete (the whole point: data-complete profiles ARE backed by federal disclosures inherently — Tier 1 by source kind, not by editorial sourcing).
2. Rule 9 invents a "mapped relationships" requirement. ADR-0017 doesn't require this — only the canonical-ID match.
3. Rule 9 omits the **canonical-ID match** requirement, which IS in the ADR.

Same paragraph: Rule 9's `verified` thresholds (2+ Tier 1 source types, body length >500 chars) are also not in ADR-0017. They may be pre-ADR Rule 9 text restated — fine to keep, but citing ADR-0017 for them is misleading.

**Fix shape:** rewrite Rule 9's data-complete bullet to match ADR-0017's actual criteria. Verified bullet stays (or move it to Rule 9's own ADR if these thresholds are load-bearing elsewhere).

### ADR-0022 — Rule 9 doesn't mention type-specific bars at all

ADR-0022 introduced a universal floor + per-type bar (politician/donor/corporation/think-tank) and shipped:

- `scripts/type-specific-a-plus-bar.cjs` ✓ (verified — file exists)
- Registered as a `vault-audit.cjs` check at line 192-194 ✓
- Pipeline-janitor's `type === 'politician'` legacy gates dropped where appropriate ✓ (line 438 still has one but it's correctly scoped — committee oversight is politician-specific)

But Rule 9 in `CLAUDE.md` still describes a single readiness gate with no mention of the type-specific structure. Rule 9 also lacks any pointer to the new harness check. The Reference section's harness/attention-queue list (`CLAUDE.md` lines 116-160) doesn't list `type-specific-a-plus`.

**Fix shape:** add a sentence to Rule 9 noting the type-specific contract (per ADR-0022) and add `type-specific-a-plus` to the attention-queue / harness check list in the Reference section.

### ADR-0024 — the ADR ITSELF is stale, not CLAUDE.md

This is the inverse of typical drift. CLAUDE.md (Stories vs Relationships section, line 171) calls the librarian "the source of truth." The ADR-0024 entry in CLAUDE.md (line 212) says "implementation deferred to subsequent sessions." But the librarian **is built**:

- `lib/donor-map/{graph,resolver,loader,edge-taxonomy,types,errors}.ts` — 7 files, all shipped
- `scripts/lib/canonical-name-resolver.cjs` CJS twin — used by 34+ scripts including vault-audit, the rebuilder, frontmatter-orphan-check, today's contradiction-miner refactor
- `librarian-parity-test` is in the pre-commit gate (CLAUDE.md line 124, verified)

The accurate prose is the Stories-vs-Relationships section. The misleading text is **ADR-0024 itself** ("Accepted 2026-04-25, implementation deferred to subsequent sessions"). The ADR list entry on line 212 inherits that staleness verbatim.

**Fix shape:** amend ADR-0024 (or write ADR-0024-A as a status update) noting the librarian skeleton + CJS twin shipped, listing what's deferred (cutover of remaining frontmatter readers, thesis-layer queries `influenceMap` / `policyAlignment` / `donorContradictions` per ADR-0024 §Opens). Then sync the ADR list entry on line 212.

## Internal contradiction (not a drift, but worth flagging)

Constitution preamble (`CLAUDE.md` line 21) says "no hard launch date." Rule 11 still uses ADR-0017's launch-mode language ("Launch ships the broader `data-complete` corpus..."). Rule 11 patches in date-decoupling per ADR-0021 but the framing is still calendar-shaped. Either a stylistic re-fram, or fine to leave — the rules are internally consistent if you read them in order. Flagging it because it tripped the audit-side reader.

## Spot-check results (no drift)

- ✓ `quartz/components/DataCompleteBanner.tsx` exists — Rule 10 accurate
- ✓ `lib/donor-map/` skeleton shipped — Stories vs Relationships prose accurate
- ✓ `type-specific-a-plus-bar.cjs` exists, registered in vault-audit.cjs (just absent from Rule 9 + Reference list)
- ✓ Janitor's politician-only check at line 438 is correctly scoped (committee oversight ≠ universal)
- ✓ `query-engine-contract-tests` (pre-commit hook line 124) is for the existing 6-subject query engine in `scripts/lib/query-engine.cjs` — pre-existing, unrelated to ADR-0024's future librarian thesis-layer queries

## Recommended order of fixes

Three discrete edits, can land independently:

1. **ADR-0024 status update** (lowest blast radius — one ADR + one line in CLAUDE.md's ADR list). Either amend in-place or write a 0024-A.
2. **Rule 9 rewrite** for data-complete criteria match ADR-0017 + add ADR-0022 type-specific pointer. One paragraph.
3. **Reference section harness list** add `type-specific-a-plus`. One line.

None require new ADRs (these are corrections, not policy changes).
