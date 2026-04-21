---
title: "ADR-0017: Data-Complete Tier — Ship the Database, Editorialize the Flagships"
type: adr
status: open
date: 2026-04-21
supersedes-partial: Rule 5 (profile template) and Rule 9 (readiness flow) as they apply to non-flagship profiles
---

# ADR-0017: Data-Complete Tier

## Context

The April 30, 2026 launch plan is 50 curated profiles at `content-readiness:
verified`. The other ~1,450 profiles in the vault stay under-construction.
Rule 9 defines the flow `raw → draft → ready → verified`, and Rule 10
establishes that only verified content is publicly exposed.

Nine days from launch, this is not the right trade. The product's moat is
comprehensive structured data (FEC receipts, IRS 990 filings, USASpending
contracts, STOCK Act PTRs, relationship edges, claim objects), not 50
editorialized essays. Rule 15 already names this ("facts are Feist-free"),
but the launch plan doesn't act on it. Meanwhile the editorial bottleneck is
real and not solvable at scale:

- Research Claude's 3 manual sections per profile × 1,450 profiles = not
  shippable by any deadline.
- Rule 13 makes URL verification David-only, so the `verified` gate can
  never move at data-ingest speed.
- "Verified" bundles three independent gates into one: data completeness
  (automatable), editorial prose (human labor), and URL sign-off (David
  only). The bottleneck is the human gates; the public value is mostly the
  automatable one.

The consequence: we hold a shippable database hostage to a labor-bound
editorial gate, launch with 3% of our inventory, and compete at an
editorial-depth game Wikipedia already won.

## Options considered

### Option A — Ship the 50, everything else stays under-construction

Status quo. Launches April 30 with 50 profiles. Remaining 1,450 stay
private until editorially promoted one-by-one. Rejected: this is the path
we're already on, and it's the source of the "database isn't shipping"
frustration. Editorial labor is the bottleneck and no amount of sprinting
changes that.

### Option B — Lower the `verified` bar

Relax the template requirements so more profiles qualify. Rejected:
corrupts the verified signal. `verified` means "editor-signed-off, URLs
confirmed, no flags." Diluting it either breaks the signal or lies to
readers.

### Option C (chosen) — Add a `data-complete` tier below `verified`

Split publication from editorial. Introduce a fourth readiness value:

```
raw → draft → ready → data-complete → verified
```

A profile is `data-complete` when:

1. Every auto-generated section from canonical stores has data (Summary
   Infobox, The Money auto-blocks per ADR-0012, Related Figures from
   `relationships.jsonl`, Sources from citation harvester).
2. Entity resolver matches it to at least one canonical ID (bioguide,
   FEC committee ID, EIN, or stable slug).
3. No `defamation-sanitized` placeholders, no blocking `[JANITOR]` flags.
4. Data-freshness stamp ≤ 90 days on at least one structured source.
5. Auto-generated banner renders on the rendered page (see below).

Data-complete profiles **publish publicly** with a standing banner:

> *This profile is auto-generated from federal disclosures — FEC filings,
> IRS 990s, USASpending contracts, and STOCK Act transactions. Numbers
> and relationships come from government sources, linked below. This
> profile has not yet been editorially reviewed.*

The profile renderer gracefully omits sections with no data rather than
showing empty headers. Class Analysis, Who They Are, and The Contradictions
framing are **optional** at the data-complete tier and **hidden** when
absent (not rendered as empty stubs).

`verified` stays exactly as Rule 9 defines it. The 50 flagships remain
the verified set at launch. Flagships get front-page placement,
cross-linking from landing pages, and "Verified" badges on rendered pages.

## Rationale

- **Rule 4 compliance.** Data-complete profiles are *translations* of
  government records, not new assertions. "AI translates, never generates"
  is satisfied.
- **Rule 15 activation.** Facts-are-Feist-free finally means something
  operationally — we ship the facts.
- **Defamation risk management.** The banner frames every data-complete
  profile as "what the government filed," not "what we concluded." The
  existing legal-response-playbook covers corrections. Content-readiness
  badges and source citations provide the audit trail.
- **Separates the bottlenecks.** Research Claude stops being a launch
  blocker for the 1,450. Editorial becomes a post-launch queue rolling
  profiles from data-complete → verified as they're reviewed. David's
  URL work stays gated on `verified` only — no change to his lane.
- **Aligns with monetization (ADR-0002).** Free-tier ships the facts;
  paid tier is the tools, freshness, and editorial work. More facts in
  the free tier is a feature, not a leak.

## Consequences

### Positive

- April 30 launch ships ~1,500 public profiles instead of 50.
- Editorial work (flagship verification) continues in parallel post-launch
  without blocking new data.
- "Database" becomes a true descriptor of the site.
- Engine-powered discovery (Ask panel, compare, leaderboard) has a real
  corpus to query publicly.
- Data-completeness becomes an engineering-measurable target, not an
  editorial judgment call.

### Negative

- Public-facing profiles now include un-editorialized content.
  Mitigation: banner + source links + the `verified` flagship tier as
  the quality signal.
- More surface area for defamation claims if the renderer ever lets a
  flag through. Mitigation: Rule 8 preserves placeholder markers in
  source; publication-readiness-check must reject any data-complete
  profile containing `URL NEEDED`, `UNVERIFIED`, `NEEDS REVIEW`, or
  `defamation-sanitized` markers.
- Research Claude's output is no longer on the launch critical path.
  This is the intent, not a regression.
- `profile-template-validator` must split its enforcement: strict for
  `verified`, permissive (but still structural) for `data-complete`.

### Required changes before launch

1. Add `data-complete` to the readiness enum in
   `scripts/readiness-adjudicator.cjs`.
2. Promotion rules: `ready → data-complete` requires auto-section
   population + canonical ID + clean flag scan.
3. `scripts/publication-readiness-check.cjs` passes `data-complete` as
   publishable; still rejects any flag markers.
4. `data/public-routes.json` accepts data-complete profiles
   (Rule 10 requires explicit per-route opt-in).
5. Profile renderer: gracefully skip sections with no data at
   `data-complete`; render standing banner.
6. `profile-template-validator`: permissive mode for `data-complete`.
7. Auto-promote pass: one-time backfill that walks every profile with
   sufficient canonical data and stamps `content-readiness:
   data-complete`.
8. CLAUDE.md Rule 5 amended: template applies strictly to `verified`;
   at `data-complete` only auto-sections are required.
9. CLAUDE.md Rule 9 amended: new flow `raw → draft → ready →
   data-complete → verified`.

## Closes
- 50-profile launch constraint as the dominant April 30 gate

## Opens
- `data-complete` renderer work (graceful degradation + banner)
- Auto-promote backfill script
- Flagship-vs-database information architecture on the landing page
- Post-launch queue that rolls data-complete → verified as editorial
  capacity allows
