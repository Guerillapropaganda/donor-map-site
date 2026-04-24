---
title: "ADR-0022: Type-Specific A+ Bars"
type: adr
status: accepted
date: 2026-04-24
accepted: 2026-04-24
---

# ADR-0022: Type-Specific A+ Bars

## Context

ADR-0021 (2026-04-23) exposed a credibility hole: the A+ quality bar in
[pipeline-janitor.cjs:284](../../scripts/pipeline-janitor.cjs) runs only
for `type === 'politician'`. Every other type — donors, corporations,
think-tanks — skips the real bar and still gets stamped `audit-a-plus-passed`
downstream. The 2026-04-23 audit found that all 125 entries in the Ops
`/signoff-queue` were donors/corporations that had skipped the gate; zero
politicians had actually passed.

Phase 3 of ADR-0021 requires extending the harness to catch this. The
honest fix is not "run the politician checks against all types" — most
politician checks don't apply (a donor doesn't sit on a committee). It's
"define what A+ means per type, grounded in what structured data each type
actually carries."

### Current corpus (as of 2026-04-24)

Publication-tier profiles (`data-complete` or `verified`) by type:

| type              | count | notable universal fields present |
|-------------------|-------|-----------------------------------|
| donor             | 266   | politicians-funded (100%), sector (100%), total-spent (68%), fec-committee-id (49%) |
| politician        | 164   | top-donors (80%), fec-candidate-id (80%), committees (72%), central-thesis (74%) |
| state-politician  | 7     | sparse — treat as politician-subtype |
| corporation       | 6     | federal-contracts (100%), lobbying-spend (100%), employee-contributions (100%) |
| think-tank        | 2     | ein (100%), 990 data (100%) |
| local-politician  | 1     | treat as politician-subtype |
| policy            | 0     | no publication-tier policies yet |

`policy` is out of scope for this ADR — define when there's a corpus to
calibrate against.

## Decision

### Universal floor (all publication-tier types)

Every A+ profile, regardless of type, must pass:

1. **Source floor** — ≥3 distinct Tier 1 source types (already in
   pipeline-janitor; drop the `type === 'politician'` gate).
2. **Legal review** — `runLegalReviewCheck` passes, OR
   `legal-review-result: pass` stamped with a date. Already universal
   in logic, not in invocation.
3. **`central-thesis`** populated.
4. **`story-grade`** populated (one of `story | report | investigation`).

These are genuinely type-agnostic. The `type === 'politician'` gate on
them is a historical accident, not a principled restriction.

### Politician-specific (existing, retained)

5. **Committee-relevant regulatory cross-ref** — via `getRequiredPipelinesForCommittees`.
6. **Both-sides reconciliation** — `detectBothSidesEntities(donors, opposes)`.
7. **`fec-candidate-id` OR `bioguide-id`** populated.

### Donor-specific (new)

8. **`politicians-funded` populated** with ≥3 entries.
   *Rationale:* a donor profile that doesn't name who they fund has no
   analytical value. 100% of current donors have the field populated.
9. **Wealth or spend provenance** — at least one of:
    - `total-spent` populated AND `spend-source` cites a Tier 1 URL
    - `fec-committee-id` populated (for PAC-shaped donors)
    - `individual-contributions` populated (for individual donors via FEC)
   *Rationale:* a donor's political weight claim needs a traceable dollar
   figure. Without provenance, "mega-donor" is editorial opinion, not fact.
10. **Sector and entity-type** populated (100% current coverage — codify it).

### Corporation-specific (new)

11. **Corporate PAC traceability** — if `politicians-funded` is non-empty,
    `fec-committee-id` OR `employee-contributions` must be populated with
    a dollar figure.
    *Rationale:* corporations give via PACs or via employee aggregation.
    Both are traceable. Unsourced corporate giving claims are defamation-adjacent.
12. **Lobbying disclosure** — `lobbying-spend` OR `lobbying-filings`
    populated.
    *Rationale:* if a corp lobbies and it isn't cited, we're missing
    the primary influence channel.
13. **Regulatory footprint** — at least one sector-relevant pipeline
    populated (any of: `federal-contracts`, `nhtsa-recalls`, `osha-findings`,
    `epa-violations`, `sec-filings`, `fara-filings`).
    *Rationale:* corporations exert influence across multiple regulatory
    surfaces; naming only one is underclaiming.

### Think-tank-specific (new)

14. **`ein` populated** (IRS identifier).
15. **990 data present** — `total-revenue` AND `total-assets` populated.
    *Rationale:* think-tanks are 501(c)(3)/(4) entities; 990 data is the
    primary structural disclosure. Without it, funding claims can't be cited.
16. **Donor provenance** — `top-donors` populated (from 990 Schedule B
    or investigative sources) OR `known-gaps` explicitly notes dark-money
    status.

### State-politician / local-politician

Treat as politician. Apply politician bar. FEC IDs may be absent (state
races don't always file federally); allow the bioguide-id OR
state-candidate-id field as a substitute when the chamber is non-federal.

## Implementation

1. **New script `scripts/type-specific-a-plus-bar.cjs`** — scans all
   publication-tier profiles, applies the type-appropriate bar, emits
   `--json` artifact.
2. **New harness check `type-specific-a-plus`** registered in
   `scripts/vault-audit.cjs`. Queue bucket `blocking`, leverage 5,
   cost_min 45 (editorial effort per profile).
3. **Eventually: drop the politician gate in pipeline-janitor.cjs** for
   the universal checks (items 1-4 above). Defer to a follow-up commit
   to keep this ADR reviewable in isolation.

## Rationale

The alternative considered was a single universal bar applied across
all types. Rejected because it either (a) lets everyone pass with a low
floor or (b) forces donors to meet politician-shaped requirements that
don't map. Type-specific bars acknowledge that "A+" means something
different structurally for each type while sharing an editorial floor.

Each type-specific requirement is grounded in a field that ≥50% of
current publication-tier profiles of that type already populate. This
keeps the bar achievable without prospective backfill.

## Consequences

- Ops `/signoff-queue` will show honest A+ status per type. Current
  125-profile queue will likely shrink substantially on first run —
  the point.
- `pipeline-janitor.cjs` becomes partially redundant for the A+ layer;
  long-term it either absorbs the new bars or delegates to the harness
  check (decide in Phase 5 script-pruning per ADR-0021).
- Think-tank corpus is tiny (2 profiles). The think-tank bar may need
  recalibration when the corpus reaches ~20.
- `policy` type remains ungated until a publication-tier policy corpus
  exists.

## Closes

- ADR-0021 Phase 3 requirement: "type-specific A+ bars".

## Opens

- Follow-up: drop politician gate in `pipeline-janitor.cjs` universal checks.
- Follow-up: define `policy` A+ bar when corpus ≥10.
- Follow-up: `story-grade` field needs a scorer — currently populated
  by hand. ADR-0021 Phase 4 territory.
