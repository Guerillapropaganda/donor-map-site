---
title: "ADR-0023: Frontmatter Schema"
type: adr
status: accepted
date: 2026-04-24
accepted: 2026-04-23
---

# ADR-0023: Frontmatter Schema

## Status

Accepted 2026-04-23 by David. Grounded in a full-corpus field survey
(artifact: [frontmatter-schema-survey.json](../Admin%20Notes/frontmatter-schema-survey.json)).
Supersedes the stub placed earlier on 2026-04-24.

## Context

The 2026-04-24 field survey found **184 distinct frontmatter fields**
across 3,200 profiles in 41 distinct type declarations. Consequences
of the drift:

1. **Silent field retirement.** `story-grade` sits unpopulated on
   446/446 publication-tier profiles (Phase 3 finding); `editorial-blockers`,
   `verified-blocks`, `running-for`, `parent-profile`, `claims-slug`,
   `merge-note`, `leadership-role`, `former-committees`, `experiment`,
   `data-quality-flag`, `fec-candidate-id-house`, `opensanctions-status`
   are populated on zero profiles **and** have zero consumers in code.
2. **Schema pollution.** `fec-candidate-id-house` / `fec-senate-id`
   fork a canonical `fec-candidate-id`. `leadership-role` vs
   `leadership-roles` (plural). `parent-profile` vs `parent`.
3. **No retirement policy.** No mechanism declares a field dead.
4. **Auto-fix can't ship.** ADR-0021 Phase 4 (auto-fix triage) needs
   strict per-type schemas to decide what's safe to fill.
5. **No TTL convention.** `internal-notes`, `known-gaps`, `[JANITOR]`
   markers accumulate. Nothing purges stale ones mechanically.

## Decision

### 1. Scope: content types only

This ADR governs **content types** — the 14 types that render to the
public vault:

| type              | profiles | purpose                          |
|-------------------|----------|----------------------------------|
| politician        | 726      | public officials                 |
| donor             | 584      | individuals, orgs giving money   |
| event             | 520      | calendar / policy events         |
| sub-note          | 462      | child profile (scoped to parent) |
| corporation       | 160      | firms                            |
| story-seed        | 159      | auto-generated story candidates  |
| story             | 105      | long-form investigations         |
| media-profile     | 94       | pundits, outlets                 |
| pac               | 43       | PACs, super-PACs                 |
| think-tank        | 29       | 501(c) policy shops              |
| lobbying-firm     | 22       | registered lobby firms           |
| state-politician  | 8        | non-federal officials            |
| policy            | 5        | policy explainers                |
| local-politician  | 2        | city/county officials            |

System / workflow types (`adr`, `decision`, `checklist`, `admin-note`,
`daily-update`, `handoff`, `log`, `digest`, `reference`, `redirect`,
`index`, `system`, `methodology`, `retrospective`, `audit`,
`audit-report`, `backlog`, `meta`, `page`, `draft`, `tip`,
`perplexity-research`, `pipeline-report`, `policy-index`,
`policy-aggregate`, `infrastructure`) are governed by convention, not
schema. Their consumers are ops scripts that already defend against
missing fields. No enforcement here.

### 2. Universal fields (every content type)

| field             | type    | required | notes                                |
|-------------------|---------|----------|---------------------------------------|
| `title`           | string  | required | profile display name                  |
| `type`            | string  | required | one of the 14 content types above     |
| `last-updated`    | date    | required | YYYY-MM-DD, auto-stamped on edit      |
| `content-readiness` | enum  | required | raw / draft / ready / data-complete / verified (ADR-0017) |
| `source-tier`     | enum    | required | t1 / t2 / t3 / t4 (primary source class of the profile) |

Coverage in current corpus: these five are ≥99% populated on every
content type. Codifying the status quo.

### 3. Type-specific required fields

Grounded in ≥90% current coverage. Candidates that don't meet that
bar are listed as **proposed-required** — backfill before enforcement.

#### politician (726)
- required: `chamber`, `party`, `source-types`, `last-enriched`
- proposed-required: `fec-candidate-id` OR `bioguide-id` (currently 80% / 73%)
- proposed-required (A+ gate, ADR-0022): `central-thesis`, `story-grade`

#### donor (584)
- required: `sector`, `entity-type`, `last-enriched`
- proposed-required: `politicians-funded` (currently 100%, codify it)
- proposed-required (A+ gate): `central-thesis`, `story-grade`

#### event (520)
- required: `date`, `status`, `source`, `source-url`, `profiles`
- no editorial gate — events are log-shaped, not analytical

#### sub-note (462)
- required: `parent`, `related`, `last-enriched`
- `content-readiness` inherited from parent (validator rule)

#### corporation (160)
- required: `sector`, `entity-type`, `parent`, `related`, `last-enriched`, `politicians-funded`
- proposed-required (A+ gate, ADR-0022): per-type corporation bar

#### story-seed (159)
- required: `seed-type`, `confidence`, `auto-generated`, `status`
- no editorial gate — auto-generated

#### story (105)
- required: `parent`, `related`, `last-enriched`
- proposed-required: `story-grade`, `central-thesis`

#### media-profile (94)
- required: `parent`, `category`, `related`
- proposed-required: `platform` (currently 91%)

#### pac (43)
- required: `parent`, `sector`, `entity-type`, `related`
- proposed-required: `fec-committee-id`

#### think-tank (29)
- required: `parent`, `related`
- proposed-required (A+ gate, ADR-0022): `ein`, `total-revenue`, `total-assets`

#### lobbying-firm (22)
- required: `parent`, `related`
- proposed-required: `lda-client-count` or equivalent lobbying-disclosure handle

#### state-politician (8), local-politician (2)
- required: `current-office`, `related`
- ID substitute: `fec-candidate-id` OR `bioguide-id` OR `state-candidate-id`

#### policy (5)
- required: TBD — corpus too small. Revisit at ≥20.

### 4. Field retirement

Retire immediately (zero consumers, near-zero data):

- `running-for`, `parent-profile`, `opensanctions-status`,
  `opensanctions-matches`, `opensanctions-datasets`, `merge-note`,
  `leadership-role`, `former-committees`, `fec-candidate-id-house`,
  `fec-senate-id`, `experiment`, `data-quality-flag`, `claims-slug`,
  `editorial-blockers`, `verified-blocks`, `historical`

Retire after migration (low consumers, some data):

- `editorial-review-date`, `editorial-reviewer`, `editorial-result` —
  **retire immediately, do not migrate** (amended 2026-04-23).
  Initial plan was to migrate to `legal-review-*`. On inspection the
  16 affected profiles carry reviewer=`Research Claude` with results
  like `pass`, `verified-candidate`, `ready-candidate`, `stub-created`
  — this is editorial-workflow data, not legal-review data. Moving it
  into `legal-review-*` would pollute the legal-risk namespace (the
  ADR-0022 A+ gate field) with non-legal content. The editorial
  workflow behind these fields ran once 2026-04-08 through 2026-04-10
  and was never adopted. Just retire.
- `custom-stats`, `shareable-stat`, `spotlight-reason`, `featured-date`
  — one-off feature fields that didn't scale. Audit consumers, then remove.
- `say-vs-pay`, `caucus`, `total-received-note` — partial adoption.
  Audit consumers, decide keep-or-retire.

### 5. Variant consolidation

- `leadership-role` (0 populated) → retire; keep `leadership-roles` (plural).
- `parent-profile` → retire; keep `parent`. Any value on `parent-profile`
  migrates to `parent` (caught in Phase A on the David Sacks donor-network
  sub-note — value preserved via Phase A amendment).
- `fec-candidate-id-house`, `fec-senate-id` — **not true variants**.
  These represent distinct FEC candidate IDs for different election
  cycles (e.g. Rubio had `S0FL00338` for his 2010–2022 Senate career
  and `P60006723` for his 2016 Presidential run; Porter had
  `H8CA45130` for 2018–2024 House and `S4CA00522` for her 2024+
  statewide run). Consolidation destroys data. New pattern:

  ```yaml
  fec-candidate-id: "S0FL00338"           # current or most-recent
  fec-previous-ids:
    - id: "P60006723"
      office: "President"
      cycles: "2016"
    - id: "H8CA45130"
      office: "House"
      state: "CA"
      cycles: "2018-2024"
  ```

  `fec-candidate-id` stays as the single canonical / current ID.
  `fec-previous-ids` is a structured list tracking historical IDs
  with their office + cycle context. Amendment applied 2026-04-23
  after Phase A edge-case discovery.

  Rationale: the original "retire as variant" rule assumed these were
  naming drift. They're actually distinct election-cycle records.
  Preserving historical IDs is necessary for lifetime-cumulative
  reconciliation across committees and for queries like "politicians
  who ran for House before Senate." Promoting to a canonical store
  (`data/politician-fec-history.jsonl`) is a reasonable future step
  if the pattern scales; for now 2 profiles, frontmatter works.

### 6. TTL convention for markdown markers

Markers in frontmatter values or body (`[JANITOR YYYY-MM-DD]`,
`internal-notes`, `known-gaps`, `(URL NEEDED)`, `(UNVERIFIED)`,
`(NEEDS REVIEW)`) already take a date suffix in some places. Codify:

- Any marker with an embedded `YYYY-MM-DD` → TTL starts from that date.
- Any marker without a date → TTL starts from the enclosing profile's
  `last-updated`.
- **TTL: 28 days**, with escalating severity surfaced by the
  `stale-markers` harness check:
  - Week 1 (≥7d): info — listed in the queue, no action required.
  - Week 2 (≥14d): warning — flagged in `/system-health`.
  - Week 3 (≥21d): urgent — promoted to blocking severity in the queue.
  - Week 4 (≥28d): **block** — commit-blocking sentinel. Commit
    touching a profile with a ≥28d marker is rejected until the marker
    is resolved (fixed or intentionally removed). The marker text stays
    preserved as a breadcrumb; the sentinel fails until someone
    reconciles it.
- No field change required — all markers are string-embedded.

**Rationale for 28d not 180d:** project velocity is faster than
original ADR draft assumed (David, 2026-04-23). 6-month markers rot;
4-week markers stay live.

This TTL check is a **follow-up harness check**, not in scope for
this ADR to implement. Commit-blocking sentinel lands only after
2 weeks clean as a harness check first (per §8).

### 7. Schema file format

One plain CommonJS module, mirroring the existing
`scripts/lib/profile-type-rulebook.cjs` pattern:

```
scripts/lib/frontmatter-schema.cjs
  module.exports = {
    version: '1',
    universal: { required: [...], optional: [...] },
    types: {
      politician: { required: [...], proposed_required: [...], optional: [...], forbidden: [...] },
      donor: { ... },
      ...
    },
    retired: [ 'running-for', 'parent-profile', ... ],
    variants: { 'parent-profile': 'parent', 'fec-candidate-id-house': 'fec-candidate-id', ... },
  };
```

Rejected alternatives: JSON Schema (too verbose for this use case),
TypeScript types (requires TS toolchain the .cjs scripts don't use).

### 8. Validator placement

Harness check first: `scripts/frontmatter-schema-validator.cjs`
registered in `vault-audit.cjs`. Surfaces violations; does not block
commits. After the schema is proven stable against the current
corpus (no spurious findings for 2 weeks), promote to a pre-commit
sentinel per ADR-0021 Rule 17 (enforcement over aspiration).

Rejected alternative: pre-commit sentinel from day 1. Too blocking
for a schema still being calibrated.

### 9. Backfill plan

Phased, per type, after schema lands:

- **Phase A:** drop zero-consumer retired fields across the whole
  corpus (mechanical; one script, one commit per type batch).
- **Phase B:** consolidate variants (`parent-profile` → `parent`, etc.)
- **Phase C:** backfill proposed-required fields that are achievable
  from existing data (e.g. `politicians-funded` on donors — already 100%).
- **Phase D:** flag proposed-required fields that need manual/editorial
  fill (`central-thesis`, `story-grade`) via the harness — surface to
  `/attention`, don't auto-fill.

Each phase a separate commit, each gated by the harness going clean
on it.

## Rationale

- **Grounded in corpus survey.** Every "required" field has ≥90%
  current coverage for that type. Every retirement candidate has
  zero consumers and near-zero data. The schema codifies reality,
  not aspiration.
- **Soft validator first.** Matches the ADR-0021 "enforcement over
  aspiration" ethos — prove the check is right before blocking
  commits on it.
- **CommonJS module format.** Lowest-friction; every script in the
  vault uses .cjs with declarative objects already.
- **Content types only.** System types have implicit schemas through
  their consumers (ops scripts). Over-specifying them adds drag
  without value.

## Consequences

- ~16 zero-consumer fields retired → cleaner survey output, less
  cognitive load reading a profile's frontmatter.
- New harness check adds one more block to `/system-health` + the
  attention queue.
- `central-thesis` / `story-grade` backfill becomes a visible, tracked
  work stream instead of silent 0/446 coverage.
- Unlocks ADR-0021 Phase 4 (auto-fix triage) — auto-fix can act on
  required fields with known defaults.
- `policy` type stays ungated until its corpus reaches ≥20 — may
  surface via an ADR amendment.

## Closes

- ADR-0023 stub (2026-04-24) — promoted to full ADR.

## Opens

- Implementation: `scripts/lib/frontmatter-schema.cjs`
  (the schema module).
- Implementation: `scripts/frontmatter-schema-validator.cjs`
  (the harness check).
- Implementation: backfill Phases A–D (one commit each).
- Follow-up harness check: `stale-markers` (TTL on
  `[JANITOR ...]` / `(UNVERIFIED)` / `known-gaps` markers).
- Future ADR amendment: policy-type schema once corpus reaches ≥20.
