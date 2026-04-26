---
title: "Class-tag research batch — 2026-04-15"
type: admin-note
note-type: research
priority: normal
status: open
last-updated: '2026-04-15'
generated-by: scripts/tmp-export-class-tag-research-batch.cjs
note-kind: log
---

# Class-tag research batch — 2026-04-15

**40 entities** from Bucket B of `class-tag-research-queue.md`
that the deterministic heuristic couldn't tag. Sorted by canonical-store edge
count (highest-impact first).

This is an executable Perplexity research task, not a template. Copy the
fenced block below, paste into Perplexity, and save the JSONL response back
to `content/Admin Notes/perplexity-research/class-tag-research-2026-04-15-results.md`
as a fenced `jsonl` block.

When results land, Code Claude will write `scripts/load-perplexity-class-tag-proposals.cjs`
to merge them into `data/entity-class-tags-proposed.jsonl` and surface them
in the Ops /class-tags approval queue alongside the heuristic proposals.

---

## The prompt to run

Copy everything inside the fence into Perplexity.

```
You are helping class-tag entities for a political donor accountability database (The Donor Map, thedonormap.org). The analytical framework is class analysis: each entity is tagged along 5 dimensions that locate it in the class structure.

I have 40 donor/corporation entities that need class-tag proposals. The deterministic heuristic proposer already ran and either skipped them (no sector keyword match) or produced low-confidence guesses. Research each one properly: use public FEC filings, IRS 990s, OpenSecrets, ProPublica Nonprofit Explorer, SEC filings, news coverage, and scholarly sources on political economy / class composition.

=== LOCKED VOCABULARY (ADR-0001 — do not invent new values) ===

capital_type — the primary industry / form of capital this entity represents. Pick ONE.
  fossil-capital          — oil, gas, coal, fossil-fuel utilities
  extractive-capital      — mining, timber, commodities, non-fossil extraction
  finance-capital         — banks, hedge funds, private equity, asset managers, Wall Street
  rentier-capital         — real estate, landlords, REITs, intellectual-property licensing
  tech-monopoly           — Big Tech, platform companies, gig-economy labor arbitrage
  retail-monopoly         — Walmart, Amazon retail, logistics giants
  military-industrial     — defense contractors, weapons, intelligence contractors
  carceral-capital        — private prisons, bail bonds, immigration detention, surveillance tech
  pharma-capital          — drug companies, PBMs, health-insurance underwriters
  media-capital           — media conglomerates, entertainment, publishing
  agribusiness-capital    — factory farms, agricultural conglomerates, food processing
  small-capital           — small business, locally owned firms, franchise owners
  professional-class      — law firms, consultancies, professional services (non-capital-owning)
  labor-aligned           — unions, worker co-ops, labor federations
  dark-money-vehicle      — 501(c)(4)s, donor-advised funds, dark-money pass-throughs
  mixed                   — conglomerates or holding companies spanning multiple above (use sparingly)

class_position — where this entity sits in the class structure.
  ruling-class            — ultra-rich individuals (>$100M net worth), billionaire families, strategically-positioned capital
  upper-bourgeois         — owners of significant capital but below ruling class; corporate executives; top 1% earners
  petty-bourgeois         — small business owners, independent professionals, small capital holders
  labor-aligned           — unions and worker-controlled organizations (ALWAYS for any real labor organization, regardless of spend)
  ambiguous               — can't confidently assign; explain why in rationale

ideological_function — what political work the entity does. Multi-select (array, can be empty).
  union-busting           — direct union-busting activity (not just anti-labor)
  climate-denial          — climate denial or delay machine
  deregulatory            — general deregulation / regulatory-capture agenda
  libertarian-ideology    — libertarian / free-market-fundamentalist
  religious-right         — Christian right, religious-right political organizing
  carceral-expansion      — expansion of the carceral state (policing, prisons, detention)
  imperialist-aligned     — pro-imperial foreign policy, regime change, interventionism
  zionist-aligned         — explicitly pro-Israel-lobby positioning (AIPAC, UDP, etc.)
  nativist                — anti-immigration, nativist, "great replacement" rhetoric
  voter-suppression       — voter ID laws, voter purges, election-integrity theater
  privatization           — privatization of public services (schools, infrastructure, etc.)
  austerity               — public-sector austerity advocacy
  anti-trust-defender     — opposing anti-trust enforcement
  tax-avoidance-lobby     — tax-cut lobbying, tax-haven defense
  astroturf               — astroturf / fake grassroots
  dark-money-networked    — embedded in dark-money donor networks
  progressive-capital     — capital-aligned "progressive" (corporate liberalism)
  labor-organizing        — actively organizes workers
  electoral-left          — electoral left politics (DSA-aligned, Squad, etc.)
  movement-left           — movement left (protest movements, abolition, climate justice)

worker_relationship — how the entity relates to the working class. Pick ONE.
  union-busting           — actively busts unions (Amazon, Starbucks, Tesla pattern)
  union-hostile           — resists unionization but not a serial buster
  low-wage-extractive     — business model depends on low-wage workforce (fast food, warehousing)
  neutral                 — no meaningful worker relationship (finance firms, dark-money groups)
  union-neutral-employer  — unionized workforce, management-union relationship is functional
  union-aligned           — explicitly labor-aligned org
  worker-owned            — worker cooperative or worker-owned firm

=== OVERRIDE RULES ===

1. Any real labor union / labor federation → capital_type: labor-aligned AND class_position: labor-aligned AND worker_relationship: union-aligned, regardless of spend or other signals.

2. 501(c)(4)s and 501(c)(3)s funded primarily by billionaire donors that push pro-capital policy → capital_type: dark-money-vehicle, class_position: ruling-class, add ideological_function: dark-money-networked.

3. Trade associations (US Chamber, NAM, etc.) → class_position: upper-bourgeois (NOT ruling-class unless founded/controlled by named billionaires).

4. Individual donors: use net-worth as the class_position signal. >$100M net worth → ruling-class. $10M-$100M → upper-bourgeois. Below that → petty-bourgeois.

5. Foreign government / state-linked actors → class_position: ambiguous (state capital doesn't fit the domestic class framework), ideological_function: imperialist-aligned or nativist as applicable.

6. If you genuinely can't confidently assign → class_position: ambiguous AND confidence: low AND explain why in rationale. Do NOT force a guess.

=== REQUIRED RETURN FORMAT ===

Return ONLY a fenced markdown code block tagged as `jsonl`, containing one JSON object per line. One line per entity. No other prose.

Each record MUST have this exact shape:

{"entity_id":"<ent_NNNNNN from input>","entity_name":"<name>","capital_type":"<one value or null>","secondary_capital_type":"<one value or null>","class_position":"<one value>","ideological_function":["<value>","<value>"],"worker_relationship":"<one value or null>","rationale":"<1-2 sentence class-analysis explanation grounded in specific evidence>","sources":["<url1>","<url2>"],"confidence":"high|medium|low"}

Rules for the fields:
- `entity_id` MUST match the input's ent_NNNNNN. This is how the records get merged back in.
- `capital_type` may be null only if the entity is clearly not a capital holder (e.g. a union — labor-aligned fits there too though).
- `secondary_capital_type` is for entities with meaningful exposure to a second industry (e.g. Koch Industries is fossil-capital primary + finance-capital secondary). Null if not applicable.
- `ideological_function` is an array, can be empty [].
- `worker_relationship` may be null for entities with no direct worker relationship (e.g. a dark-money PAC that doesn't employ anyone).
- `rationale` must cite specific evidence (filing, ruling, policy stance, funding source) — not vague generalizations.
- `sources` is an array of 2-5 URLs you used. Prefer Tier 1 (FEC, IRS 990 via ProPublica Nonprofit Explorer, SEC filings, Congress.gov) over Tier 2 (newspapers, OpenSecrets articles) over Tier 3 (aggregators).
- `confidence` must reflect how much hard evidence you found. high = multiple Tier 1 filings directly support the tags. medium = Tier 2 sources + reasonable inference. low = inference dominates.

=== ENTITIES TO TAG ===

ENTITY: ent_000186
  name:                    Koch Network - Charles Koch
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              27
  total_political_spend:   unknown
  top_politicians_funded:  Chris Wright ($0, 1 edges); Samuel Alito ($0, 1 edges); Lex Fridman ($0, 1 edges); Mike Rogers ($0, 1 edges); Tim Scott ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Koch Network - Charles Koch.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 27 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Chris Wright | — | 1 | | Samuel Alito | — | 1 | | Lex Fridman | — | 1 | | Mike Rogers | — | 1 | | Tim Scott | — | 1 | | John Roberts | — | 1 | | Mike Pompeo | — | 1 | | Greg Abbott | — | 1 | | Gavin Newsom | — 

ENTITY: ent_000200
  name:                    Peter Thiel
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              13
  total_political_spend:   unknown
  top_politicians_funded:  Dan Bongino ($0, 1 edges); Donald Trump ($0, 1 edges); Matt Mahan ($0, 1 edges); Glenn Greenwald ($0, 1 edges); Nate Silver ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Peter Thiel.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 12 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Dan Bongino | — | 1 | | Donald Trump | — | 1 | | Matt Mahan | — | 1 | | Glenn Greenwald | — | 1 | | Nate Silver | — | 1 | | David Sacks | — | 1 | | Vivek Ramaswamy | — | 1 | | Mike Johnson | — | 1 | | Bari Weis

ENTITY: ent_000194
  name:                    Miriam Adelson
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     886063073
  NAICS:                   unknown
  edge_count:              8
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges); Benjamin Netanyahu ($0, 1 edges); Elise Stefanik ($0, 1 edges); Jared Kushner ($0, 1 edges); JD Vance ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Miriam Adelson.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `886063073` **Total political spend:** — **Tracked relationships:** 8 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 | | Benjamin Netanyahu | — | 1 | | Elise Stefanik | — | 1 | | Jared Kushner | — | 1 | | JD Vance | — | 1 | | Marco Rubio | — | 1 | | Kamala Harris | — | 1 | | Pete Hegse

ENTITY: ent_000083
  name:                    Club for Growth
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     204681603
  NAICS:                   unknown
  edge_count:              7
  total_political_spend:   $9,118
  top_politicians_funded:  John Ratcliffe ($5,083, 2 edges); Steve Scalise ($4,035, 1 edges); Mike Lee ($0, 1 edges); Ron DeSantis ($0, 1 edges); Jim Jordan ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Club for Growth.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `204681603` **Total political spend:** — **Tracked relationships:** 5 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Mike Lee | — | 1 | | Ron DeSantis | — | 1 | | Jim Jordan | — | 1 | | John Ratcliffe | — | 1 | | Mike Collins | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/re

ENTITY: ent_000193
  name:                    Michael Bloomberg
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              7
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges); Nancy Pelosi ($0, 1 edges); Gavin Newsom ($0, 1 edges); Josh Shapiro ($0, 1 edges); Kamala Harris ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Michael Bloomberg.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 7 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 | | Nancy Pelosi | — | 1 | | Gavin Newsom | — | 1 | | Josh Shapiro | — | 1 | | Kamala Harris | — | 1 | | Tim Scott | — | 1 | | Tom Steyer | — | 1 | _Data panel computed at build time from `d

ENTITY: ent_000166
  name:                    David McIntosh
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              5
  total_political_spend:   $53,369
  top_politicians_funded:  Roy Cooper ($0, 1 edges); Raphael Warnock ($0, 1 edges); Donald Trump ($0, 1 edges); Kamala Harris ($0, 1 edges); Jon Ossoff ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/David McIntosh.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** $53,369 **Tracked relationships:** 5 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Roy Cooper | — | 1 | | Raphael Warnock | — | 1 | | Donald Trump | — | 1 | | Kamala Harris | — | 1 | | Jon Ossoff | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationship

ENTITY: ent_000181
  name:                    Jeffrey Yass
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              5
  total_political_spend:   unknown
  top_politicians_funded:  Tom Cotton ($0, 1 edges); Josh Shapiro ($0, 1 edges); Vivek Ramaswamy ($0, 1 edges); Rand Paul ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Jeffrey Yass.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 5 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Tom Cotton | — | 1 | | Josh Shapiro | — | 1 | | Vivek Ramaswamy | — | 1 | | Rand Paul | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`

ENTITY: ent_000263
  name:                    DMFI - Democratic Majority for Israel
  entity_type:             donor
  sector:                  Israel Lobby
  EIN:                     833298146
  NAICS:                   unknown
  edge_count:              5
  total_political_spend:   unknown
  top_politicians_funded:  Glenn Ivey ($0, 1 edges); George Latimer ($0, 1 edges); Sean Casten ($0, 1 edges); Wesley Bell ($0, 1 edges); Shontel Brown ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Israel Lobby/DMFI - Democratic Majority for Israel.md
  body_snippet:            **Entity type:** donor **Sector:** Israel Lobby **EIN:** `833298146` **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | George Latimer | — | 1 | | Wesley Bell | — | 1 | | Shontel Brown | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node s

ENTITY: ent_000431
  name:                    Bacardi - Bacardi USA
  entity_type:             corporation
  sector:                  Corporate
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              5
  total_political_spend:   unknown
  top_politicians_funded:  Debbie Wasserman Schultz ($0, 1 edges); Mario Diaz-Balart ($0, 1 edges); Marco Rubio ($0, 1 edges); Carlos Gimenez ($0, 1 edges); Maria Elvira Salazar ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Corporate/Bacardi - Bacardi USA.md
  body_snippet:            **Entity type:** corporation **Sector:** Corporate **Total political spend:** — **Tracked relationships:** 5 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Debbie Wasserman Schultz | — | 1 | | Mario Diaz-Balart | — | 1 | | Marco Rubio | — | 1 | | Carlos Gimenez | — | 1 | | Maria Elvira Salazar | — | 1 | _Data panel computed at build time from `data/entities.jso

ENTITY: ent_000097
  name:                    MAGA Inc
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     921057815
  NAICS:                   unknown
  edge_count:              4
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges); Linda McMahon ($0, 1 edges); Tulsi Gabbard ($0, 1 edges); Kash Patel ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/MAGA Inc.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `921057815` **Total political spend:** — **Tracked relationships:** 4 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 | | Linda McMahon | — | 1 | | Tulsi Gabbard | — | 1 | | Kash Patel | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. R

ENTITY: ent_000113
  name:                    United Democracy Project - UDP
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              4
  total_political_spend:   unknown
  top_politicians_funded:  Sarah Elfreth ($0, 1 edges); George Latimer ($0, 1 edges); Melissa Bean ($0, 1 edges); Donna Miller ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/United Democracy Project - UDP.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | George Latimer | — | 1 | | Melissa Bean | — | 1 | | Donna Miller | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-da

ENTITY: ent_000188
  name:                    Larry Ellison
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     943269827
  NAICS:                   unknown
  edge_count:              4
  total_political_spend:   $10,212
  top_politicians_funded:  Kamala Harris ($0, 1 edges); Steve Scalise ($0, 1 edges); Rand Paul ($0, 1 edges); Marco Rubio ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Larry Ellison.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `943269827` **Total political spend:** $10,212 **Tracked relationships:** 4 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Kamala Harris | — | 1 | | Steve Scalise | — | 1 | | Rand Paul | — | 1 | | Marco Rubio | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.json

ENTITY: ent_000197
  name:                    Palantir Technologies
  entity_type:             corporation
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              4
  total_political_spend:   unknown
  top_politicians_funded:  David Sacks (Donor Network) ($0, 1 edges); JD Vance ($0, 1 edges); Donald Trump ($0, 1 edges); David Sacks ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Palantir.md
  body_snippet:            **Entity type:** corporation **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | JD Vance | — | 1 | | Donald Trump | — | 1 | | David Sacks | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-da

ENTITY: ent_000218
  name:                    Timothy Mellon
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              4
  total_political_spend:   unknown
  top_politicians_funded:  Mitch McConnell ($0, 1 edges); Greg Abbott ($0, 1 edges); Donald Trump ($0, 1 edges); JD Vance ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Timothy Mellon.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 4 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Mitch McConnell | — | 1 | | Greg Abbott | — | 1 | | Donald Trump | — | 1 | | JD Vance | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node sc

ENTITY: ent_000002
  name:                    Jeffrey Epstein Network
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  JD Vance ($0, 1 edges); Steve Bannon ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Jeffrey Epstein Network.md
  body_snippet:            **Entity type:** donor **Sector:** Jeffrey Epstein Network.md **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | JD Vance | — | 1 | | Steve Bannon | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-

ENTITY: ent_000093
  name:                    Great Lakes Conservatives Fund
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Mike Rogers ($0, 1 edges); Abdul El-Sayed ($0, 1 edges); Mallory McMorrow ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Great Lakes Conservatives Fund.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Mike Rogers | — | 1 | | Abdul El-Sayed | — | 1 | | Mallory McMorrow | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile

ENTITY: ent_000095
  name:                    Illinois Future PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     884013706
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Juliana Stratton ($0, 1 edges); JB Pritzker (Donor Network) ($0, 1 edges); JB Pritzker ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Illinois Future PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `884013706` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | JB Pritzker | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Part of 

ENTITY: ent_000098
  name:                    MAGA Small Dollar Base
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Matt Gaetz ($0, 1 edges); Marjorie Taylor Greene ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/MAGA Small Dollar Base.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Matt Gaetz | — | 1 | | Marjorie Taylor Greene | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-prof

ENTITY: ent_000163
  name:                    Cambridge Analytica and the Data Weaponization of Elections
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Ted Cruz ($0, 1 edges); Steve Bannon ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Cambridge Analytica and the Data Weaponization of Elections.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Ted Cruz | — | 1 | | Steve Bannon | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-pa

ENTITY: ent_000183
  name:                    Kelcy Warren
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     367285069
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Greg Abbott ($0, 1 edges); Donald Trump ($0, 1 edges); Ted Cruz ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Kelcy Warren.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `367285069` **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Greg Abbott | — | 1 | | Donald Trump | — | 1 | | Ted Cruz | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/b

ENTITY: ent_000187
  name:                    Koch network
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Mike Lee ($0, 1 edges); John Boehner ($0, 1 edges); Paul Ryan ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Koch network.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Mike Lee | — | 1 | | John Boehner | — | 1 | | Paul Ryan | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panel

ENTITY: ent_000195
  name:                    Narya Capital
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  JD Vance ($0, 1 edges); David Sacks ($0, 1 edges); David Sacks (Donor Network) ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Narya Capital.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | JD Vance | — | 1 | | David Sacks | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Part of

ENTITY: ent_000298
  name:                    Gulf State Money - Saudi Arabia, UAE, Qatar
  entity_type:             donor
  sector:                  Foreign Influence
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Jared Kushner ($0, 1 edges); Benjamin Netanyahu ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Foreign/Gulf State Money - Saudi Arabia, UAE, Qatar.md
  body_snippet:            **Entity type:** donor **Sector:** Foreign Influence **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Jared Kushner | — | 1 | | Benjamin Netanyahu | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/buil

ENTITY: ent_000300
  name:                    Mohammed bin Salman
  entity_type:             donor
  sector:                  Foreign Influence
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              3
  total_political_spend:   unknown
  top_politicians_funded:  Jared Kushner ($0, 1 edges); Donald Trump ($0, 1 edges); Bernie Sanders ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Foreign/Mohammed bin Salman.md
  body_snippet:            **Entity type:** donor **Sector:** Foreign Influence **Total political spend:** — **Tracked relationships:** 3 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Jared Kushner | — | 1 | | Donald Trump | — | 1 | | Bernie Sanders | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-pr

ENTITY: ent_000082
  name:                    Americans for Prosperity
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     753148958
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Nikki Haley ($0, 1 edges); Jodey Arrington ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Americans for Prosperity.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `753148958` **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Nikki Haley | — | 1 | | Jodey Arrington | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-p

ENTITY: ent_000094
  name:                    House Majority PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Hakeem Jeffries ($0, 1 edges); Nancy Pelosi ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/House Majority PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Hakeem Jeffries | — | 1 | | Nancy Pelosi | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. 

ENTITY: ent_000106
  name:                    Save America PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     933113620
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Kash Patel ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Save America PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `933113620` **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Kash Patel | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panel

ENTITY: ent_000114
  name:                    Winning for Women PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Ashley Hinson ($0, 1 edges); Elise Stefanik ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Winning for Women PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Ashley Hinson | — | 1 | | Elise Stefanik | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. 

ENTITY: ent_000162
  name:                    Breitbart News and the Mercer-Bannon Media Pipeline
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Steve Bannon ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Breitbart News and the Mercer-Bannon Media Pipeline.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Steve Bannon | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Pa

ENTITY: ent_000169
  name:                    Dustin Moskovitz
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Gavin Newsom ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Dustin Moskovitz.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Gavin Newsom | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Pa

ENTITY: ent_000182
  name:                    Kelcy Warren - Energy Transfer Partners
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges); Greg Abbott ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Kelcy Warren - Energy Transfer Partners.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 | | Greg Abbott | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Par

ENTITY: ent_000190
  name:                    Les Wexner - Wexner Family Enterprises
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Jon Husted ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Les Wexner - Wexner Family Enterprises.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Jon Husted | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Part

ENTITY: ent_000210
  name:                    Rupert Murdoch
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Mitch McConnell ($0, 1 edges); Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Rupert Murdoch.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Mitch McConnell | — | 1 | | Donald Trump | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`.

ENTITY: ent_000238
  name:                    PORAC - Peace Officers Research Association of California
  entity_type:             donor
  sector:                  Law Enforcement
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Gavin Newsom ($0, 1 edges); Chad Bianco ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Law Enforcement/PORAC - Peace Officers Research Association of California.md
  body_snippet:            **Entity type:** donor **Sector:** Law Enforcement **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Gavin Newsom | — | 1 | | Chad Bianco | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`.

ENTITY: ent_000265
  name:                    J Street
  entity_type:             donor
  sector:                  Israel Lobby
  EIN:                     261507828
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Bernie Sanders ($0, 1 edges); Jerry Nadler ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Israel Lobby/J Street.md
  body_snippet:            **Entity type:** donor **Sector:** Israel Lobby **EIN:** `261507828` **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Bernie Sanders | — | 1 | | Jerry Nadler | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data

ENTITY: ent_000335
  name:                    CTA - California Teachers Association
  entity_type:             corporation
  sector:                  Education
  EIN:                     942552809
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Tony Thurmond ($0, 1 edges); Gavin Newsom ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Education/CTA - California Teachers Association.md
  body_snippet:            **Entity type:** corporation **Sector:** Education **EIN:** `942552809` **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Tony Thurmond | — | 1 | | Gavin Newsom | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-da

ENTITY: ent_000336
  name:                    DeVos Family
  entity_type:             donor
  sector:                  Education
  EIN:                     861509286
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges); Virginia Foxx ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Education/DeVos Family.md
  body_snippet:            **Entity type:** donor **Sector:** Education **EIN:** `861509286` **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 | | Virginia Foxx | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-pan

ENTITY: ent_000339
  name:                    Student Loan Servicer Industry
  entity_type:             donor
  sector:                  Education
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Bobby Scott ($0, 1 edges); Virginia Foxx ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Education/Student Loan Servicer Industry.md
  body_snippet:            **Entity type:** donor **Sector:** Education **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Bobby Scott | — | 1 | | Virginia Foxx | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Part

ENTITY: ent_000340
  name:                    Walton Family Foundation
  entity_type:             donor
  sector:                  Education
  EIN:                     472066714
  NAICS:                   unknown
  edge_count:              2
  total_political_spend:   unknown
  top_politicians_funded:  Virginia Foxx ($0, 1 edges); Sarah Huckabee Sanders ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Education/Walton Family Foundation.md
  body_snippet:            **Entity type:** donor **Sector:** Education **EIN:** `472066714` **Total political spend:** — **Tracked relationships:** 2 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Virginia Foxx | — | 1 | | Sarah Huckabee Sanders | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profil

ENTITY: ent_000080
  name:                    Affordable Chicago Now PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donna Miller ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Affordable Chicago Now PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donna Miller | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`. Regenerate via `node scripts/build-profile-data-panels.cjs --write`. Part of Phase 3._ Affordable
```

---

## Entities in this batch (index)

| # | Entity | Type | Sector | Edges | Spend |
|---|--------|------|--------|------:|------:|
| 1 | Koch Network - Charles Koch | donor | Mega-Donors | 27 | — |
| 2 | Peter Thiel | donor | Mega-Donors | 13 | — |
| 3 | Miriam Adelson | donor | Mega-Donors | 8 | — |
| 4 | Club for Growth | donor | Super PACs | 7 | $9,118 |
| 5 | Michael Bloomberg | donor | Mega-Donors | 7 | — |
| 6 | David McIntosh | donor | Mega-Donors | 5 | $53,369 |
| 7 | Jeffrey Yass | donor | Mega-Donors | 5 | — |
| 8 | DMFI - Democratic Majority for Israel | donor | Israel Lobby | 5 | — |
| 9 | Bacardi - Bacardi USA | corporation | Corporate | 5 | — |
| 10 | MAGA Inc | donor | Super PACs | 4 | — |
| 11 | United Democracy Project - UDP | donor | Super PACs | 4 | — |
| 12 | Larry Ellison | donor | Mega-Donors | 4 | $10,212 |
| 13 | Palantir Technologies | corporation | Mega-Donors | 4 | — |
| 14 | Timothy Mellon | donor | Mega-Donors | 4 | — |
| 15 | Jeffrey Epstein Network | donor | Mega-Donors | 3 | — |
| 16 | Great Lakes Conservatives Fund | donor | Super PACs | 3 | — |
| 17 | Illinois Future PAC | donor | Super PACs | 3 | — |
| 18 | MAGA Small Dollar Base | donor | Super PACs | 3 | — |
| 19 | Cambridge Analytica and the Data Weaponization of Elections | donor | Mega-Donors | 3 | — |
| 20 | Kelcy Warren | donor | Mega-Donors | 3 | — |
| 21 | Koch network | donor | Mega-Donors | 3 | — |
| 22 | Narya Capital | donor | Mega-Donors | 3 | — |
| 23 | Gulf State Money - Saudi Arabia, UAE, Qatar | donor | Foreign Influence | 3 | — |
| 24 | Mohammed bin Salman | donor | Foreign Influence | 3 | — |
| 25 | Americans for Prosperity | donor | Super PACs | 2 | — |
| 26 | House Majority PAC | donor | Super PACs | 2 | — |
| 27 | Save America PAC | donor | Super PACs | 2 | — |
| 28 | Winning for Women PAC | donor | Super PACs | 2 | — |
| 29 | Breitbart News and the Mercer-Bannon Media Pipeline | donor | Mega-Donors | 2 | — |
| 30 | Dustin Moskovitz | donor | Mega-Donors | 2 | — |
| 31 | Kelcy Warren - Energy Transfer Partners | donor | Mega-Donors | 2 | — |
| 32 | Les Wexner - Wexner Family Enterprises | donor | Mega-Donors | 2 | — |
| 33 | Rupert Murdoch | donor | Mega-Donors | 2 | — |
| 34 | PORAC - Peace Officers Research Association of California | donor | Law Enforcement | 2 | — |
| 35 | J Street | donor | Israel Lobby | 2 | — |
| 36 | CTA - California Teachers Association | corporation | Education | 2 | — |
| 37 | DeVos Family | donor | Education | 2 | — |
| 38 | Student Loan Servicer Industry | donor | Education | 2 | — |
| 39 | Walton Family Foundation | donor | Education | 2 | — |
| 40 | Affordable Chicago Now PAC | donor | Super PACs | 1 | — |
