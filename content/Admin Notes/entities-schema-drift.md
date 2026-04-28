---
title: Entities Schema Drift
status: open
type: cleanup-required
auto-generated: false
last-refresh: 2026-04-28
owners: code-claude, david
---

# Entities Schema Drift

## What this is

`scripts/lib/entities-schema.cjs` (the validator that gates all writes
through `updateEntity()`) requires:

1. `id` matches `/^ent_\d{6}$/` (6-digit zero-padded)
2. `entity_type` is one of: donor / politician / corporation / network /
   union / nonprofit / think_tank / lobbying_firm / other (locked by
   ADR-0001)

The current `data/entities.jsonl` has **152 records that violate one or
both** of these rules. They were written before the validator was added
or via paths that bypassed it. Any subsequent `updateEntity()` call on a
drifted record fails validation — even when the patch only adds aliases
that wouldn't otherwise change anything.

This blocked a 12th alias (Breaking Points → "Breaking Points with
Krystal and Saagar") during the 2026-04-28 PM session. **Surfaced** as
the user-facing pain point; **scoped** as a separate cleanup arc.

## Scope

### 5-digit IDs (152 records)

Padding mismatch only — IDs of the form `ent_01887`, `ent_01911`, etc.
A simple migration to `ent_001887`, `ent_001911`, etc. brings them into
schema. Verified via `grep -rE 'ent_0[12][0-9]{3}\b'` that **no
external code references these IDs** — only `data/entities.jsonl` itself
mentions them. So the migration is purely local file-format work.

### `media-profile` entity_type (97 records)

This is the harder fix because `media-profile` is a real categorization
choice, not a typo. ADR-0001 locked the type vocabulary; "media-profile"
isn't in the list. The 97 entities span media outlets, talking-head
hosts, and meta-narrative pages.

Two paths:

**A. Migrate to `other`.** Preserves the ADR-0001 vocabulary lock. Loses
the categorization signal — every Joe Scarborough / TYT Network / Daily
Wire becomes "other," so `entity_type=media-profile` filters in ops UIs
or harness checks all break.

**B. Amend ADR-0001 to allow `media-profile`.** Extends the locked
vocabulary. Needs a short ADR rationale: media-figure entities behave
distinctly from corporations (they're individuals or small outlets,
typically with no FEC filings) and distinctly from politicians (no
elected role). `media-profile` is editorially meaningful.

**Recommendation: B.** Vocabulary lock exists to prevent ad-hoc drift,
but `media-profile` is consistently used across 97 entities, points at
real profiles in `content/Media & Influence Pipeline/`, and represents
a genuine class. Amending the ADR is cheaper than losing the signal.

### Profile entries

Some `media-profile` records appear to be narrative pages, not entities
proper:
- `The Both-Sides Illusion (Media Edition) — Shared Infrastructure...`
- `The Platform Dependency Spectrum — Revenue Vulnerability...`
- `The Revolving Door (Media) — Government-to-Media Personnel Pipeline`
- `The Shared Sponsor Map — Corporate Advertisers...`

These read as analytical essay pages, not entity records. Worth deciding
case-by-case whether they should be entities at all or moved to a
different store.

## Impact today

- **Blocked: The Daily Wire alias.** Wikilink "[[The Daily Wire]]"
  appears 57 times in vault profiles but won't resolve until the
  Daily Wire entity (`ent_01973`, `media-profile`) can accept an alias.
- **Blocked: ~30+ other media wikilink aliases** that surfaced in the
  gap-audit as `unresolvable` but resolve to drifted entity records.

## Proposed sequence

1. **Decision (this ADR amendment or new ADR):** Path A vs B for
   `entity_type=media-profile`. Recommend B with a short rationale.
2. **Migration script:** zero-pad all 5-digit IDs to 6-digit. Single
   run, atomic file rewrite. ~10 minutes.
3. **Validator update:** if Path B, add `media-profile` to ENTITY_TYPES
   in `entities-schema.cjs` + bump ADR-0001.
4. **Resume alias work:** with the validator passing, the 30+ blocked
   aliases land in one pass. Closes another ~150-200 unresolvable
   appearances in the gap-audit.

Total: ~30-45 minutes once the decision is made. Decision needs David.
