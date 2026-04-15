---
title: "ADR-0010: Class-tag vocabulary amendment — add surveillance-state"
type: decision
adr: 10
status: accepted
date: 2026-04-15
supersedes: none
amends: ADR-0001
---

# ADR-0010: Class-tag vocabulary amendment — add `surveillance-state`

## Context

ADR-0001 locked the class-tag vocabulary with 20 values in `IDEOLOGICAL_FUNCTIONS`: union-busting, climate-denial, deregulatory, libertarian-ideology, religious-right, carceral-expansion, imperialist-aligned, zionist-aligned, nativist, voter-suppression, privatization, austerity, anti-trust-defender, tax-avoidance-lobby, astroturf, dark-money-networked, progressive-capital, labor-organizing, electoral-left, movement-left.

During the 2026-04-15 Perplexity research pass on 40 Bucket B entities (top unresolved class-tag research queue from `content/Admin Notes/class-tag-research-queue.md`), Perplexity consistently tagged 10 entities with `ideological_function: "surveillance-state"` — a value not in the locked vocabulary. The loader (`scripts/load-perplexity-class-tag-proposals.cjs`) dropped these tags with warnings.

Entities affected (and why the tag fits):
- **Mohammed bin Salman / Gulf State Money** — Saudi surveillance apparatus, Pegasus spyware deployments, journalist monitoring
- **Palantir Technologies** — ICE contract, CIA/NSA data integration, predictive policing
- **Cambridge Analytica** — mass psychographic profiling for political manipulation
- **Peter Thiel** — Palantir founder, Clearview AI early investor, explicit surveillance-state advocate
- **Larry Ellison** — Oracle's NSA/CIA contracts, his "total information awareness" comments about global surveillance
- **MAGA Inc, Michael Bloomberg, Dustin Moskovitz** — political operations with surveillance components (data brokerage, opposition research infrastructure)

These 10 entities share a distinct analytical character: they fund, build, or politically advocate for mass surveillance infrastructure. None of the existing 20 values in the locked vocabulary capture this precisely:
- `carceral-expansion` covers prisons and policing but not the data/infrastructure layer
- `imperialist-aligned` covers foreign-policy posture but not domestic surveillance
- `dark-money-networked` is an orthogonal dimension (how funds flow, not what they fund)
- `privatization` is about public→private asset transfer, not surveillance specifically

Treating surveillance-state entities without a dedicated tag loses information the analytical framework is supposed to capture.

## Options

1. **Add `surveillance-state` to `IDEOLOGICAL_FUNCTIONS`** — one-line schema change, one-line alias-map no-op (it's now a direct match), re-run loader to pick up the 10 dropped tags.
2. **Reject the value, re-prompt Perplexity** — force Perplexity to pick from existing values. Loses analytical fidelity; `carceral-expansion` would be the least-bad fallback but it's imprecise.
3. **Create a new dimension** (e.g. `infrastructure_function`) — too heavy for a single gap.

## Decision

**Add `surveillance-state` to `IDEOLOGICAL_FUNCTIONS`.** Schema now has 21 values.

## Rationale

- **Precedent**: `imperialist-aligned`, `zionist-aligned`, `carceral-expansion`, `religious-right` are all dimension-specific analytical categories that ADR-0001 intentionally locked into the ideological function axis rather than forcing them into capital_type or worker_relationship. `surveillance-state` fits the same pattern.
- **Evidence density**: 10 of 40 Perplexity proposals wanted this value. That's 25% signal on a hand-picked high-priority batch — not a fringe edge case.
- **Analytical load-bearing**: the Donor Map's stated framework is class analysis of political economy. Surveillance capitalism is a major axis of contemporary class power (per Zuboff, Snowden revelations, the Palantir model). Omitting it distorts the framework.
- **Low migration cost**: existing heuristic proposals are unaffected (none currently use this value). The 10 Perplexity proposals just need re-loading after the schema change.

## Consequences

- `scripts/lib/entities-schema.cjs` IDEOLOGICAL_FUNCTIONS grows from 20 to 21 values.
- `scripts/load-perplexity-class-tag-proposals.cjs` no longer drops `surveillance-state` during normalization.
- 10 previously-dropped tags on Gulf State Money, MBS, Palantir, Cambridge Analytica, Peter Thiel, Larry Ellison, MAGA Inc, Bloomberg, Dustin Moskovitz, and one other entity will be reinstated when the loader is re-run.
- The Ops `/class-tags` approval queue will surface these 10 enriched proposals for David's review.
- Future Perplexity / heuristic / manual proposals can now use this value directly without normalization.

## Closes
- 10 dropped tags in the 2026-04-15 Perplexity research batch.

## Opens
- Review whether `carceral-capital` (capital_type) should have a parallel `surveillance-capital` for firms whose core business is surveillance tech (Palantir, Clearview, Anduril). Not in scope for this ADR — flagged for future consideration.
