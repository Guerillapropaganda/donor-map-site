---
title: "ADR-0011: Class-tag vocabulary amendment — add reproductive-rights"
type: decision
adr: 11
status: accepted
date: 2026-04-15
supersedes: none
amends: ADR-0001
---

# ADR-0011: Class-tag vocabulary amendment — add `reproductive-rights`

## Context

ADR-0001 locked the class-tag vocabulary with 21 values in `IDEOLOGICAL_FUNCTIONS` (after ADR-0010 added `surveillance-state`). During the 2026-04-15 Perplexity batch 2 research pass on 43 Bucket B entities, Perplexity tagged 4 entities with `ideological_function: "reproductive-rights"`, a value not in the locked vocabulary. The loader dropped these tags.

Entities affected:
- **EMILY's List** (DSCC entry tagged separately)
- **DSCC - Democratic Senatorial Campaign Committee**
- **Roy Cooper**
- **Juliana Stratton**

These entities share a distinct analytical character: they fund, organize, or legislate around reproductive healthcare access as a primary political identity. None of the existing values capture this:
- `progressive-capital` is too broad (covers climate, labor, housing)
- `electoral-left` describes electoral strategy, not issue positioning
- `movement-left` describes grassroots organizing, not single-issue advocacy

Reproductive rights is a load-bearing political economy axis: it drives billions in PAC spending (EMILY's List alone: $80M+ lifetime), shapes primary endorsements, and is the defining wedge issue in post-Dobbs electoral politics. Omitting it loses information.

## Options

1. **Add `reproductive-rights` to `IDEOLOGICAL_FUNCTIONS`** -- one-line schema change, re-run loader to pick up the 4 dropped tags.
2. **Reject, force existing values** -- force Perplexity to use `progressive-capital` or `electoral-left`. Imprecise.
3. **Create a broader `social-rights` value** -- too vague, would conflate distinct issues.

## Decision

**Add `reproductive-rights` to `IDEOLOGICAL_FUNCTIONS`.** Schema now has 22 values.

## Rationale

- **Evidence density**: 4 of 43 Perplexity proposals wanted this value (9.3%). EMILY's List is the single largest women's PAC in U.S. history; excluding reproductive rights from the analytical framework distorts the class analysis.
- **Analytical precedent**: `religious-right` already captures the opposing pole of this axis. Adding `reproductive-rights` completes the dyad.
- **Low migration cost**: 4 proposals need re-loading. No existing heuristic rules affected.

## Consequences

- `scripts/lib/entities-schema.cjs` IDEOLOGICAL_FUNCTIONS: 21 values to 22
- `scripts/load-perplexity-class-tag-proposals.cjs` normalizer: add alias mapping
- Re-load batch 2 results to pick up the 4 previously dropped tags
- CLAUDE.md and Class Tag Vocabulary.md: update count references

## Closes

The 4 `reproductive-rights` vocab drops from batch 2 loading.

## Opens

Nothing. This is a single-value vocabulary addition.
