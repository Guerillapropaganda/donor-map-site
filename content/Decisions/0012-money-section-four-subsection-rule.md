---
title: "ADR-0012 — The Money: Four Required Subsections"
type: decision
decision-number: 0012
status: active
date: 2026-04-18
supersedes: null
superseded-by: null
---

# ADR-0012 — The Money Section: Four Required Subsections

## Context

Trump's profile (proof-of-concept, live at thedonormap.org) organizes money coverage as four discrete angles:
1. Campaign donations (auto-panel + top 10)
2. Wealth outside donations (media stake, crypto holdings, family revenue)
3. Named mega-donor profiles (character + policy interest + class position per donor)
4. Industry sector ROI (sector → $ → companies → deliverables)

Pelosi and Rubio profiles (also `content-readiness: ready`) cover some of these but inconsistently:
- Pelosi: auto-panel + 4 subnote wikilinks. No quantified mega-donor treatment. No sector ROI table. Wealth-outside is in a subnote, not in the Money section itself.
- Rubio: auto-panel + 4 narrative sub-sections. Named donors appear but without structured character sketches. No quantified per-sector ROI. No wealth-outside layer at all.

The result: readers get inconsistent depth across profiles. "Where do I find Rubio's stock trades?" has no predictable answer.

## Decision

Every verified profile's `## The Money` section MUST contain these four H3 subsections, in this order:

1. **`### The Campaign Chest`** — auto-panel (total, top donors, sector breakdown) + editorial framing paragraph
2. **`### Wealth Outside Donations`** — table of non-campaign wealth flows (required even when empty, with an explicit empty-state string)
3. **`### The Mega-Donors`** — named profiles of top 5 individual or institutional donors, structured as character sketches (who they are, what they want, what they got, source+tier)
4. **`### What They Bought`** — industry sector ROI: sector → total $ → key companies → specific policy deliverables

Empty states are required, not optional. A freshman rep with no outside wealth still has the subsection, populated with: "No reported holdings beyond congressional salary ($174,000) per [year] financial disclosure. [Source: Clerk filing]." Absence-of-wealth is a data point.

Full subsection spec with examples: `content/Profile Template.md` Section 3.

## Rationale

**Consistency across profiles.** Readers scan the same section in every profile and know exactly where to look.

**Legible absence.** Every subsection always renders. An empty subsection says "we checked, nothing to report here" — which is a stronger statement than silent omission.

**Research Claude has a spec.** Writing is faster and more uniform when the slots are defined. Fewer "what goes in The Money?" decisions per profile.

**Mechanical validation.** The template validator can check "does this verified profile have all 4 H3s inside The Money?" without editorial judgment.

**Preserves existing structure.** Trump's current profile already implements all four angles (under different section names). This ADR names and orders them; it doesn't require rewriting his coverage — just renaming H2/H3 structure.

## Consequences

**Code Claude's work:**
- `scripts/profile-template-validator.cjs` enforces the 4-subsection rule for any profile at `content-readiness: verified`.
- New canonical store `data/wealth-disclosures.jsonl` populates "Wealth Outside Donations" tables (STOCK Act events + annual congressional financial disclosures + SEC filings).
- `scripts/build-profile-data-panels.cjs` extended to render the Wealth Outside table.
- `ProfileWidget.tsx` gains a "Money" tab in the right sidebar, summarizing all 4 subsections as a quick-reference card.

**Research Claude's work:**
- Back-fill the 4 subsections into Trump, Pelosi, Rubio to match the spec.
- Going forward, every new verified profile follows this structure.

**Immediate side effect:**
- Trump, Pelosi, Rubio are currently `ready` not `verified`. The validator won't block them at `ready`. Before any of them can be promoted to `verified`, the 4-subsection pattern must be in place.

**What this does not do:**
- Does not change the tab mapping in `content/Profile Template.md` (The Money tab still groups Section 4 + related supps).
- Does not retire `custom-stats` frontmatter; that feeds the Wealth Outside subsection for outlier cases.
- Does not affect claim-object profiles (exempt from template rules per ADR-0007) or `editor-vouched: true` stories.

## Closes

- Inconsistency between Trump (rich) / Pelosi (thin) / Rubio (narrative-but-unstructured) money coverage
- Readers not knowing where to look for wealth-outside-donations data

## Opens

- Build `data/wealth-disclosures.jsonl` canonical store (prerequisite for Wealth Outside auto-rendering)
- Research Claude pass on Pelosi and Rubio to implement the 4 subsections before verified promotion
