---
title: "Class-tag research batch 2 — 2026-04-15"
type: admin-note
note-type: research
priority: normal
status: open
last-updated: '2026-04-15'
generated-by: scripts/tmp-export-class-tag-research-batch.cjs
note-kind: log
---

# Class-tag research batch 2 — 2026-04-15

**43 entities** from Bucket B of `class-tag-research-queue.md` (items 41-91,
minus redirects and README entries) that the deterministic heuristic couldn't
tag. Sorted by canonical-store edge count (highest-impact first).

This is batch 2 of 2. Batch 1 covered the top 40 entities; this batch covers
the remaining Bucket B entities. Same format, same instructions.

This is an executable Perplexity research task, not a template. Copy the
fenced block below, paste into Perplexity, and save the JSONL response back
to `content/Admin Notes/perplexity-research/class-tag-research-2026-04-15-batch-2-results.md`
as a fenced `jsonl` block.

When results land, Code Claude will write `scripts/load-perplexity-class-tag-proposals.cjs`
to merge them into `data/entity-class-tags-proposed.jsonl` and surface them
in the Ops /class-tags approval queue alongside the heuristic proposals.

---

## The prompt to run

Copy everything inside the fence into Perplexity.

```
You are helping class-tag entities for a political donor accountability database (The Donor Map, thedonormap.org). The analytical framework is class analysis: each entity is tagged along 5 dimensions that locate it in the class structure.

I have 43 donor/corporation entities that need class-tag proposals. The deterministic heuristic proposer already ran and either skipped them (no sector keyword match) or produced low-confidence guesses. Research each one properly: use public FEC filings, IRS 990s, OpenSecrets, ProPublica Nonprofit Explorer, SEC filings, news coverage, and scholarly sources on political economy / class composition.

=== LOCKED VOCABULARY (ADR-0001 + ADR-0010 — do not invent new values) ===

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
  surveillance-state      — expansion or normalization of mass surveillance infrastructure (ADR-0010, newly added to locked vocabulary)

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

ENTITY: ent_000087
  name:                    DonorsTrust
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     473233646
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Stephen Miller ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/DonorsTrust.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `473233646` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Stephen Miller | — | 1 | _Data panel computed at build time from `data/entities.jsonl` + `data/relationships.jsonl`._

ENTITY: ent_000088
  name:                    DSCC - Democratic Senatorial Campaign Committee
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Chuck Schumer ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/DSCC - Democratic Senatorial Campaign Committee.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Chuck Schumer | — | 1 |

ENTITY: ent_000101
  name:                    National Rifle Association
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     351046434
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/National Rifle Association.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `351046434` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000110
  name:                    Susan B. Anthony Pro-Life America PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Michael Whatley ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Susan B. Anthony Pro-Life America PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Michael Whatley | — | 1 |

ENTITY: ent_000112
  name:                    Trump Victory
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/Trump Victory.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000115
  name:                    WinRed
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     451839927
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Super PACs/WinRed.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `451839927` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000116
  name:                    California Restaurant Association
  entity_type:             corporation
  sector:                  Restaurant & Food
  EIN:                     951241045
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Gavin Newsom ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Restaurant & Food/California Restaurant Association.md
  body_snippet:            **Entity type:** corporation **Sector:** Restaurant & Food **EIN:** `951241045` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Gavin Newsom | — | 1 |

ENTITY: ent_000155
  name:                    Adelson Family
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     223769645
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   $1,000
  top_politicians_funded:  Nikki Haley ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Adelson Family.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `223769645` **Total political spend:** $1,000 **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Nikki Haley | — | 1 |

ENTITY: ent_000156
  name:                    Ajay Royan
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  JD Vance ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Ajay Royan.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | JD Vance | — | 1 |

ENTITY: ent_000164
  name:                    Centene Corporation PAC
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Roy Cooper ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Centene Corporation PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Roy Cooper | — | 1 |

ENTITY: ent_000172
  name:                    Gates Foundation
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     562618866
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Barack Obama ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Gates Foundation.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `562618866` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Barack Obama | — | 1 |

ENTITY: ent_000189
  name:                    Laurene Powell Jobs
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Kamala Harris ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Laurene Powell Jobs.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Kamala Harris | — | 1 |

ENTITY: ent_000196
  name:                    Palantir Technologies Political Operation
  entity_type:             corporation
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Palantir Technologies Political Operation.md
  body_snippet:            **Entity type:** corporation **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000205
  name:                    Reid Hoffman
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Gavin Newsom ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Reid Hoffman.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Gavin Newsom | — | 1 |

ENTITY: ent_000207
  name:                    Richard and Elizabeth Uihlein
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Richard and Elizabeth Uihlein.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000209
  name:                    Ross Stevens
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Vivek Ramaswamy ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Ross Stevens.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Vivek Ramaswamy | — | 1 |

ENTITY: ent_000212
  name:                    Sheldon & Miriam Adelson
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     886063073
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Sheldon Adelson.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `886063073` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000214
  name:                    Susquehanna International Group
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   $500
  top_politicians_funded:  Donald Trump ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Susquehanna International Group.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** $500 **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Donald Trump | — | 1 |

ENTITY: ent_000221
  name:                    Walmart - Walton Family
  entity_type:             corporation
  sector:                  Mega-Donors
  EIN:                     472066714
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  John Boozman ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Walmart - Walton Family.md
  body_snippet:            **Entity type:** corporation **Sector:** Mega-Donors **EIN:** `472066714` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | John Boozman | — | 1 |

ENTITY: ent_000224
  name:                    Winklevoss Twins
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Mike Collins ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Mega-Donors/Winklevoss Twins.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Mike Collins | — | 1 |

ENTITY: ent_000239
  name:                    Riverside Sheriffs Association
  entity_type:             donor
  sector:                  Law Enforcement
  EIN:                     956203844
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Chad Bianco ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Law Enforcement/Riverside Sheriffs Association.md
  body_snippet:            **Entity type:** donor **Sector:** Law Enforcement **EIN:** `956203844` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Chad Bianco | — | 1 |

ENTITY: ent_000334
  name:                    California Charter Schools Association
  entity_type:             donor
  sector:                  Education
  EIN:                     510465703
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Gavin Newsom ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Education/California Charter Schools Association.md
  body_snippet:            **Entity type:** donor **Sector:** Education **EIN:** `510465703` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Gavin Newsom | — | 1 |

ENTITY: ent_000337
  name:                    Eli Broad Foundation
  entity_type:             corporation
  sector:                  Education
  EIN:                     954686318
  NAICS:                   unknown
  edge_count:              1
  total_political_spend:   unknown
  top_politicians_funded:  Gavin Newsom ($0, 1 edges)
  profile_path:            content/Donors & Power Networks/Education/Eli Broad Foundation.md
  body_snippet:            **Entity type:** corporation **Sector:** Education **EIN:** `954686318` **Total political spend:** — **Tracked relationships:** 1 edges in the canonical store | Politician | Amount | Edge count | |---|---:|---:| | Gavin Newsom | — | 1 |

ENTITY: ent_000090
  name:                    Emilys List
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     461067490
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Super PACs/Emilys List.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `461067490` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000104
  name:                    Priorities USA Action
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     833099604
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Super PACs/Priorities USA Action.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `833099604` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000105
  name:                    Reclaim America PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     933113620
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Super PACs/Reclaim America PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `933113620` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000109
  name:                    Sentinel Action Fund
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     824373804
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Super PACs/Sentinel Action Fund.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **EIN:** `824373804` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000111
  name:                    SV&B PAC
  entity_type:             donor
  sector:                  Super PACs
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Super PACs/SV&B PAC.md
  body_snippet:            **Entity type:** donor **Sector:** Super PACs **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000165
  name:                    Charles Koch
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     480918408
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/Charles Koch.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `480918408` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: raytheon_technologies
  name:                    Raytheon Technologies
  entity_type:             corporation
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/Raytheon Technologies.md
  body_snippet:            Redirect stub. Raytheon Technologies rebranded to RTX Corporation in 2023. Note: this entity is a redirect in the vault but included here for completeness. Tag as if it were the active Raytheon/RTX entity.

ENTITY: ent_000206
  name:                    Renaissance Technologies and the 7 Billion Dollar Tax Settlement
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/Renaissance Technologies and the 7 Billion Dollar Tax Settlement.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000216
  name:                    Tim Geithner Political Operation
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/Tim Geithner Political Operation.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000219
  name:                    United Auto Workers
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     420606689
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/United Auto Workers.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **EIN:** `420606689` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000222
  name:                    Wexner Family - Ohio Wealth & Political Networks
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/Wexner Family - Ohio Wealth & Political Networks.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000223
  name:                    Wilks Brothers — Dan and Farris Wilks
  entity_type:             donor
  sector:                  Mega-Donors
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Mega-Donors/Wilks Brothers.md
  body_snippet:            **Entity type:** donor **Sector:** Mega-Donors **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000237
  name:                    International Association of Chiefs of Police
  entity_type:             donor
  sector:                  Law Enforcement
  EIN:                     530227813
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Law Enforcement/International Association of Chiefs of Police.md
  body_snippet:            **Entity type:** donor **Sector:** Law Enforcement **EIN:** `530227813` **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000299
  name:                    Israel - Government Lobbying Operation
  entity_type:             donor
  sector:                  Foreign Influence
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Foreign/Israel - Government Lobbying Operation.md
  body_snippet:            **Entity type:** donor **Sector:** Foreign Influence **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000301
  name:                    Saudi Arabia - Kingdom Investment
  entity_type:             donor
  sector:                  Foreign Influence
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Foreign/Saudi Arabia - Kingdom Investment.md
  body_snippet:            **Entity type:** donor **Sector:** Foreign Influence **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000302
  name:                    Turkey - Erdogan Lobbying Operation
  entity_type:             donor
  sector:                  Foreign Influence
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Foreign/Turkey - Erdogan Lobbying Operation.md
  body_snippet:            **Entity type:** donor **Sector:** Foreign Influence **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000303
  name:                    United Arab Emirates - Influence Operation
  entity_type:             donor
  sector:                  Foreign Influence
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Donors & Power Networks/Foreign/United Arab Emirates - Influence Operation.md
  body_snippet:            **Entity type:** donor **Sector:** Foreign Influence **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000823
  name:                    Zach Wahls
  entity_type:             other
  sector:                  —
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Politicians/Democrats/Senate/Zach Wahls/_Zach Wahls Master Profile.md
  body_snippet:            **Entity type:** other **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000831
  name:                    Roy Cooper
  entity_type:             other
  sector:                  —
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Politicians/Democrats/Senate/Roy Cooper/_Roy Cooper Master Profile.md
  body_snippet:            **Entity type:** other **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store

ENTITY: ent_000846
  name:                    Juliana Stratton
  entity_type:             other
  sector:                  —
  EIN:                     unknown
  NAICS:                   unknown
  edge_count:              0
  total_political_spend:   unknown
  top_politicians_funded:  none
  profile_path:            content/Politicians/Democrats/Senate/Juliana Stratton/_Juliana Stratton Master Profile.md
  body_snippet:            **Entity type:** other **Total political spend:** — **Tracked relationships:** 0 edges in the canonical store
```

---

## Entities in this batch (index)

| # | Entity | Type | Sector | Edges | Spend |
|---|--------|------|--------|------:|------:|
| 1 | DonorsTrust | donor | Super PACs | 1 | -- |
| 2 | DSCC - Democratic Senatorial Campaign Committee | donor | Super PACs | 1 | -- |
| 3 | National Rifle Association | donor | Super PACs | 1 | -- |
| 4 | Susan B. Anthony Pro-Life America PAC | donor | Super PACs | 1 | -- |
| 5 | Trump Victory | donor | Super PACs | 1 | -- |
| 6 | WinRed | donor | Super PACs | 1 | -- |
| 7 | California Restaurant Association | corporation | Restaurant & Food | 1 | -- |
| 8 | Adelson Family | donor | Mega-Donors | 1 | $1,000 |
| 9 | Ajay Royan | donor | Mega-Donors | 1 | -- |
| 10 | Centene Corporation PAC | donor | Mega-Donors | 1 | -- |
| 11 | Gates Foundation | donor | Mega-Donors | 1 | -- |
| 12 | Laurene Powell Jobs | donor | Mega-Donors | 1 | -- |
| 13 | Palantir Technologies Political Operation | corporation | Mega-Donors | 1 | -- |
| 14 | Reid Hoffman | donor | Mega-Donors | 1 | -- |
| 15 | Richard and Elizabeth Uihlein | donor | Mega-Donors | 1 | -- |
| 16 | Ross Stevens | donor | Mega-Donors | 1 | -- |
| 17 | Sheldon & Miriam Adelson | donor | Mega-Donors | 1 | -- |
| 18 | Susquehanna International Group | donor | Mega-Donors | 1 | $500 |
| 19 | Walmart - Walton Family | corporation | Mega-Donors | 1 | -- |
| 20 | Winklevoss Twins | donor | Mega-Donors | 1 | -- |
| 21 | Riverside Sheriffs Association | donor | Law Enforcement | 1 | -- |
| 22 | California Charter Schools Association | donor | Education | 1 | -- |
| 23 | Eli Broad Foundation | corporation | Education | 1 | -- |
| 24 | Emilys List | donor | Super PACs | 0 | -- |
| 25 | Priorities USA Action | donor | Super PACs | 0 | -- |
| 26 | Reclaim America PAC | donor | Super PACs | 0 | -- |
| 27 | Sentinel Action Fund | donor | Super PACs | 0 | -- |
| 28 | SV&B PAC | donor | Super PACs | 0 | -- |
| 29 | Charles Koch | donor | Mega-Donors | 0 | -- |
| 30 | Raytheon Technologies | corporation | Mega-Donors | 0 | -- |
| 31 | Renaissance Technologies and the 7 Billion Dollar Tax Settlement | donor | Mega-Donors | 0 | -- |
| 32 | Tim Geithner Political Operation | donor | Mega-Donors | 0 | -- |
| 33 | United Auto Workers | donor | Mega-Donors | 0 | -- |
| 34 | Wexner Family - Ohio Wealth & Political Networks | donor | Mega-Donors | 0 | -- |
| 35 | Wilks Brothers -- Dan and Farris Wilks | donor | Mega-Donors | 0 | -- |
| 36 | International Association of Chiefs of Police | donor | Law Enforcement | 0 | -- |
| 37 | Israel - Government Lobbying Operation | donor | Foreign Influence | 0 | -- |
| 38 | Saudi Arabia - Kingdom Investment | donor | Foreign Influence | 0 | -- |
| 39 | Turkey - Erdogan Lobbying Operation | donor | Foreign Influence | 0 | -- |
| 40 | United Arab Emirates - Influence Operation | donor | Foreign Influence | 0 | -- |
| 41 | Zach Wahls | other | -- | 0 | -- |
| 42 | Roy Cooper | other | -- | 0 | -- |
| 43 | Juliana Stratton | other | -- | 0 | -- |
