---
title: "ADR-0004: Phase 2.75 — Policy Battles"
type: decision
adr: 4
date: 2026-04-14
status: approved
authors: [Code Claude, David]
extends: ADR-0003
---

# ADR-0004: Phase 2.75 — Policy Battles

## Context

Phase 2 as originally scoped in ADR-0003 ships a raw query engine at `/query`. This is a research tool for serious users (journalists, researchers, opposition, academics) but has no viral hook and no obvious entry point for casual visitors. Launched in isolation, Phase 2 is plumbing without a story.

A planning session on 2026-04-14 produced the Policy Battles concept: policy-centric pages that compare public support to legislative outcome, expose the donor money trail behind the gap, and make the donor class visible through the issues readers already care about. The killer insight from that session: policies are not a new content type. They are stored queries over existing data (`relationships.jsonl`, `events.jsonl`, `sources.jsonl`) plus a thin editorial prose wrapper. Build cost is one template, five paragraphs of prose, and OG card generation.

Policy pages are also the missing marketing funnel for the paid tier. The free public layer gets the anger. The paid query engine gets the research. Policy pages are the bridge.

## Options considered

1. **Defer policy pages to Phase 6 (after Story Score).** Rejected: leaves Phase 2 without a user-facing product; launches plumbing without narrative.

2. **Fold policy pages into Phase 2 scope.** Rejected: Phase 2 is already a 3–4 session build (query engine + class tagging + events.jsonl + SQLite backend). Adding policy page UX would push it past 5 sessions and delay everything downstream.

3. **New Phase 2.75 between Phase 2 and Phase 2.5 (Auth & Gating).** Approved. Ships Phase 2's first user-facing product before auth gating lands. Policy pages remain free forever (non-negotiable per ADR-0002) so they don't need to wait for Phase 2.5.

## Decision

Add **Phase 2.75 — Policy Battles MVP** between Phase 2 and Phase 2.5 in the build sequence.

### Scope

- **5 policy pages for v1** (in priority order):
  1. Housing affordability / rent control
  2. Universal healthcare / Medicare expansion
  3. AIPAC / BDS laws
  4. Minimum wage
  5. Student debt cancellation
- **Cross-policy enemy list aggregate** at `/who-blocks-us` — donors ranked by policies blocked + total opposition spend
- **OG card generation** for every policy page (Open Graph + Twitter/X markup)
- **Contradiction callouts** — surface politicians with high `contradiction_index` who received money from policy opposition donors
- **Editorial firewall rules** specific to AIPAC/BDS page (defamation-proof framing)

### Data additions

**`data/policies.jsonl`** — policy registry
```yaml
id: pol_housing
title: "Housing Affordability / Rent Control"
slug: housing
category: economic
plain_english: "..." # one paragraph, editorial
public_support_pct: 65
public_support_source: src_XXXXXX
legislative_status: "stalled"
opposition_capital_types: [rentier-capital, finance-capital]
related_events: [evt_id, evt_id, ...]
related_donors_query: "capital_type:rentier OR policy_stake:rent-control-opposition"
class_analysis_tags: [rentier-capital, austerity]
status: draft | published
last-updated: YYYY-MM-DD
```

**`data/polling.jsonl`** — public support tracker (manual curation v1)
```yaml
id: poll_housing_2024
policy: pol_housing
source: "KFF / Pew / Data for Progress / ..."
source_url: src_XXXXXX
support_pct: 65
oppose_pct: 25
undecided_pct: 10
sample_size: 1500
method: "phone + online, national adult"
fielded: "2024-XX-XX"
```

**Extensions to `data/events.jsonl`** (already Phase 2):
- `policy_id` — links event to a policy in `policies.jsonl`
- `obstruction_type` — `floor_vote`, `chair_bottled_up`, `filibustered`, `held_for_concessions`, `pocket_vetoed`, `procedural_kill`

The `obstruction_type` field is load-bearing. Most policies die in committee without a floor vote. Capturing procedural kills (not just voting records) is what makes the "who killed this" list honest. Often the procedural blockers are the most captured politicians because their obstruction is less visible to the public.

### Editorial firewall — AIPAC / BDS page

This is the highest legal risk page in the v1 set and the one no other outlet will publish with receipts. The firewall makes it litigation-proof while keeping the data sharp.

1. **Banned words in prose on this page**: `bought`, `co-opted`, `bribed`, `corrupt`, `scheme`, `paid off`, `bribe`. Add to `self-review-mirror` sentinel blocklist scoped to policy-page files when Phase 2.75 begins.
2. **State facts, let readers conclude.** "Representative X received $Y from AIPAC-affiliated donors. Representative X voted for HR-3016 (anti-BDS)." Never "was paid to vote." Juxtaposition does the work.
3. **Every factual claim requires a source ID.** No raw assertions. Every money figure cites LDA filings. Every vote cites Congress.gov. Every poll cites a polling org. All via `{{src:ID}}`.
4. **Class analysis tags do the opinion work.** The class tag vocabulary (ADR-0001) includes `imperialist-aligned`, `zionist-aligned`, `tax-avoidance-lobby` as `ideological_function` tags. These are structured metadata with source backing, not prose claims. The class analysis section renders tag assignments; the prose stays neutral.
5. **AIPAC described with legal precision.** "AIPAC is a US-based 501(c)(4) lobbying organization funded by US-based donors (largely hedge fund, tech, and real estate wealth) that advocates for US foreign policy aligned with Israeli government interests." Factual, sourceable, unattackable. Never "foreign government influence" or "co-opted by another government" — those framings are legally dangerous and factually imprecise.
6. **David reviews the AIPAC page personally before publication.** Non-negotiable exit criterion. Legal review if possible.

### Policy page template

Every policy page renders from the same template. Everything except the editorial blurb at the top is a query result — no manual content maintenance.

```
1. Editorial blurb (hand-written, ~1 paragraph)
2. THE GAP — public support % from polling.jsonl + legislative status from events.jsonl
3. WHO'S BLOCKING IT — lobbying spend sum grouped by capital_type + top donors ranked
4. THE RECEIPT — donors × timing-proximity query: politicians who took money AND opposed
5. THE PATTERN — cross-policy overlap: these same donors also block [list]
6. CONTRADICTION CALLOUT — politicians with stated-position vs voting-record divergence
7. YOUR REP — zip code lookup → your senator → their money from opposition donors
8. SOURCES & METHOD — full source list via {{src:ID}} refs
```

Editor writes ONE paragraph per policy (the blurb in section 1). Everything else is generated.

### `/who-blocks-us` aggregate page

Cross-policy donor overlap analysis. Single SQL-ish query:

```
SELECT donor_id, COUNT(DISTINCT policy_id) AS policies_blocked,
       SUM(opposition_amount) AS total_opposition_spend
FROM policy_opposition_edges
GROUP BY donor_id
HAVING COUNT(DISTINCT policy_id) >= 3
ORDER BY policies_blocked DESC, total_opposition_spend DESC
LIMIT 20
```

URL chosen: `/who-blocks-us` — second-person, visceral, shareable. Descriptive alias `/policies/enemy-list` as a secondary redirect for discoverability.

### OG card generation

Every policy page and the enemy list page need custom Open Graph images. Generated at build time by a Quartz plugin (or @vercel/og if the Ops app hosts them, same canonical image URL). Card content:

- Policy name (large headline)
- Money spent blocking (large number, red)
- Public support % (large number, contrasting color)
- Donor Map branding
- Twitter/X card markup alongside OG markup

Without OG cards, the page is text and loses ~80% of viral potential. OG card generation is a mandatory deliverable, not optional.

## Rationale

- **Phase 2 needs a user-facing product.** A raw query builder launched in isolation gets yawns. Policy pages launched alongside get shared.
- **Policy pages are cheap to build.** Existing data + template + 5 prose paragraphs + OG plugin. Perhaps 2 sessions if Phase 2 events.jsonl is already in place.
- **Policy pages are the marketing funnel for the paid tier.** Free pages surface the pattern; paid tier lets serious users dig in. Clean separation of concerns.
- **The "system becomes visible" moment happens on policy pages.** Reader arrives for housing, sees the donor list, clicks through to donor profile, sees the same donor blocking healthcare, clicks through again. The vault becomes a web you traverse rather than a set of pages you read.
- **The policy page is the weapon.** Per the riff session: nobody wakes up angry at Koch Industries, but everyone wakes up angry at their rent. The policy page creates a common enemy by connecting the thing readers care about to the people blocking it.

## Consequences

- **Phase 2 schema decisions must accommodate `policy_id` and `obstruction_type` in events.jsonl.** Bake into Phase 2 scope now to avoid retrofitting later.
- **Phase 2.5 auth gating must distinguish free policy pages from paid query engine.** Policy pages are non-negotiable free per ADR-0002 and stay that way. The `/query` engine and its filters are paid. Gating middleware must route on page type.
- **New editorial workflow** for prose paragraphs. Editor writes 5 blurbs, one per policy. Research Claude can draft, David approves. Each blurb is ~1 paragraph, factual, non-partisan tone, sources inline via `{{src:ID}}`.
- **New pipeline consideration**: polling data. Manual curation v1 (~30 entries). Potential pipeline automation v2 — not blocking.
- **Sentinel blocklist extension**: the `self-review-mirror` pre-commit gate needs a scoped addition for policy pages with harder defamation words. Implement at Phase 2.75 start.
- **Legal review** on AIPAC/BDS page before publication. David reviews personally; optional lawyer review.
- **OG card plugin**: new Quartz transformer or Next.js route. ~1 day build.

## What this closes

- Ambiguity on where Policy Battles fits in the build sequence
- The "is there a user-facing product before auth lands" question
- The editorial firewall question for the AIPAC page specifically
- Scope question: 5 policies v1, not 15

## What this opens

- Polling pipeline automation (v2 consideration, not blocking)
- v2 policy expansion list: marijuana legalization, drug pricing, climate/carbon tax, gun reform, campaign finance, net neutrality, right to repair, carried interest loophole, big tech antitrust, private prisons, pharmaceutical patent reform
- OG card design decisions (template, colors, typography — should follow Design System)
- Sentinel scoping work (path-based rules for the self-review-mirror)
- Editor workflow for policy prose approval

## v2 policies (deferred — not part of Phase 2.75 scope)

Per David's prioritization direction:
- Marijuana legalization / drug war
- Drug pricing / Medicare negotiation
- Climate action / carbon pricing
- Gun reform
- Campaign finance reform
- Carried interest loophole
- Net neutrality
- Right to repair
- Private prison abolition
- Big Tech antitrust
- Pharmaceutical patent reform

All scoped for post-launch expansion once the v1 pattern proves out.
