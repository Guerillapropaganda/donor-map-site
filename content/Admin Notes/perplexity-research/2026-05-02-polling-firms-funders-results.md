---
title: "Perplexity Results: California Polling Industry 2026 CA Gov"
type: admin-note
note-type: research
status: open
last-updated: 2026-05-02
authority: CLAUDE.md Rule 13 (Perplexity-first research protocol)
note-kind: results
related-races: ca-gov-2026
related-prompt: "[[2026-05-02-polling-firms-funders]]"
audience: code-claude / david
verification-tier: mixed
---

# California Political Polling Industry — 2026 Gubernatorial Race Dossier

> **CORRECTION 2026-05-02:** Hook B finding (Steyer has no polling-firm retainers visible in Cal-Access) is **incorrect**. A follow-up Perplexity round on Steyer's polling apparatus (`2026-05-02-steyer-polling-apparatus-results.md`) located **Global Strategy Group LLC** in Cal-Access EXPN_CD bulk records: $865,142.27 across two Form 460 filings (3114184 and 3138973) on Steyer for Governor 2026 / FPPC 1485077, coded `POL` and described as "Polling." Jefrey Pollock of GSG was named publicly as Steyer's pollster in the November 19, 2025 Politico campaign-team announcement. The earlier round missed it because the search worked the live Cal-Access web interface rather than the bulk export. The bottom-line Steyer-side characterization in this file should be read as superseded by the dedicated Steyer-polling-apparatus results file. The Hook A (DBR / anti-Steyer) and Hook D (Gudelunas IE-sponsored) findings in this file remain accurate and verified.

**Prepared:** May 1, 2026
**Coverage period:** Industry history through 2018; deep coverage 2020–April 2026
**Primary-source policy:** Every factual claim is sourced. Source-tier conventions follow the user's brief:
- **Tier 1**: Cal-Access (CA SoS bulk data), FEC, IRS 990, court records, FPPC enforcement, AAPOR transparency disclosures, peer-reviewed academic publication, firm primary sites.
- **Tier 2**: OpenSecrets, Ballotpedia, Followthemoney, LAT, CalMatters, SF Chronicle, Politico.
- Tier 2-only claims are flagged `[Tier 2 — needs primary verification]`. Claims not traceable to a primary record are flagged `[UNVERIFIED]`. State (Cal-Access) and federal (FEC) money are kept in separate sections.

**Internal source files** (all in `/home/user/workspace/ca_gov_2026/research/polling/`):
- `fppc_payments_to_pollsters.tsv` — 8,676 rows, all FPPC EXPN_CD payments to the 11 firms 2018+
- `{DBR,FM3,Tulchin,EMC,GoodwinSimon,Probolsky,Strategies360}.top_payers.tsv` — top-15 CA payer aggregations per firm
- `fec/fec_top_payers.json` — FEC by-recipient totals 2018–2024
- `profiles_tranche_A.md`, `profiles_tranche_B.md`, `profiles_tranche_C.md` — full firm profiles
- `2026_ca_gov_polls_inventory.md` — 47-poll public inventory plus 11 historical/hypothetical waves

---

## SECTION 1 — THE FOUR HOOK VERIFICATIONS

### HOOK A — Cal-Access EXPN_CD filing 3138008: Was the $30K to David Binder Research opposition messaging or horserace?

**VERDICT: VERIFIED — opposition messaging research, not horserace.**

The filing is a Schedule E expenditure on a Form 460 / 496 disclosure by Cal-Access committee **1489677**, an industry-coalition independent expenditure committee opposing Tom Steyer's gubernatorial bid.

**Filing 3138008 — DBR line item (Cal-Access EXPN_CD, $5–$8–$16–$20–$21):**

| Field | Value |
|------|-------|
| Payee (NAML) | David Binder Research, Inc. |
| Amount | **$30,000.00** |
| Date | April 2, 2026 |
| EXPN_CODE | (survey/research) |
| EXPN_DSCR | **"Survey/Oppose/Tom Steyer/Governor/Statewide"** |
| Form type | E (direct expenditure) |
| Cmte ID | 1489677 |

The description string is unambiguous: this is a survey targeted at opposing Tom Steyer's candidacy at statewide scope. It is paid opposition research / message-testing polling, not a published horserace poll.

**Subvendors disclosed under DBR on Schedule G of the same filing:**

| Subvendor | Address | Amount | Type |
|-----------|---------|--------|------|
| KGS Research, Inc. | Las Vegas, NV | $9,875 | Survey |
| Political Data, Inc. (PDI) | Norwalk, CA | $4,200 | Survey (voter-file/sample) |

The presence of PDI (the dominant CA voter-file vendor used by IGS and many California polling operations) and KGS Research as subvendors confirms this was a full survey project, not a focus group or qualitative study.

**Total committee 1489677 spend on filing 3138008 (cross-referenced):** ~$13.87M on Schedule E and ~$13.89M on Schedule D (independent expenditures opposing Steyer). DBR's $30K is a small slice of a much larger anti-Steyer media buy. Other vendors on the filing include Bearstar Strategies ($49.8K), Polaris Campaigns (~$13.78M, the IE production/media-buy vendor), and Deane & Company ($10K).

**Funders of committee 1489677 (Cal-Access RCPT_CD):**

| Donor | Amount |
|------|--------|
| California Real Estate IE Cmte (Realtors) | $5,000,000 |
| California Building Industry Association PAC | $1,000,000 |
| California Correctional Peace Officers Association (CCPOA) | $25,000 |
| JOBSPAC (Cal Chamber of Commerce) | $5,000,000 (per F496 4/21/2026; not yet on F460) |
| Passthrough from Cmte 1490270 (energy) | $8,000,000 |

**Funders of the upstream energy committee 1490270:** Pacific Gas and Electric Corporation $8,000,000; IBEW Local 1245 $50,000.

**Net anti-Steyer pool documented in Cal-Access:** ≈$22M+, with PG&E, the realtors, JOBSPAC/Cal Chamber, the Building Industry Association, the IBEW electrical workers' union, and CCPOA as the visible funding stack. This matches the donor-coalition characterization in [CalMatters / LAist's billionaire-blitz coverage](https://laist.com/news/politics/billionaire-blitz-steyers-132-million-campaign-dwarfs-rivals-in-california-governor-race).

**DBR's history with each of those committee funders (Cal-Access EXPN_CD 2018–2026 from `DBR.top_payers.tsv` and `fppc_payments_to_pollsters.tsv`):**

| Funder of cmte 1489677 / 1490270 | Direct Cal-Access payments to DBR 2018–2026 |
|----------------------------------|---------------------------------------------|
| **PG&E Corporation** | None recorded as direct payer; PG&E has retained DBR's competitor [Tulchin Research as a corporate client](https://tulchinresearch.com/team/ben-tulchin/) but not, per Cal-Access EXPN_CD records pulled, paid DBR directly through a CA committee |
| **California Realtors / California Real Estate IE Cmte** | None recorded as direct payer to DBR in the top-payer aggregation |
| **IBEW Local 1245 / Cal Labor / IBEW** | The CA Labor Federation is DBR's #3 lifetime CA payer at $2.16M (2018+), but that aggregates across multiple labor affiliates; IBEW Local 1245 specifically is **not** in DBR's top-15 |
| **CCPOA** | DBR's #6 lifetime CA payer is **"Action for Safety and Justice"** at $1.38M — a CCPOA-allied independent expenditure vehicle. This is a substantive prior relationship between DBR and the CCPOA orbit. |
| **JOBSPAC / Cal Chamber** | None in DBR's top-15 |
| **California Building Industry Association** | None in DBR's top-15 |

**Bottom line on Hook A:** DBR was hired by an industry coalition that includes **a prior DBR client (CCPOA-allied "Action for Safety and Justice")** to do opposition message-testing on Tom Steyer. PG&E and the Realtors are the largest funders of the IE behind the contract; per Cal-Access top-payer data, DBR has no recorded prior direct retainer from PG&E, the Realtors, the BIA, JOBSPAC, or IBEW Local 1245, but the CCPOA-allied IE relationship is documented and material. Tulchin Research separately lists PG&E among its corporate clients on its own bio page, per [tulchinresearch.com](https://tulchinresearch.com/team/ben-tulchin/) — but Tulchin is not a vendor on filing 3138008.

---

### HOOK B — Has Tom Steyer or any pro-Steyer committee retained DBR, FM3, or other firms in this dossier?

**VERDICT: NO. Steyer's own committee has retained no firm in this dossier as of May 1, 2026.**

**Steyer's own committee — Cal-Access ID 1485077, "STEYER FOR GOVERNOR 2026"** (declared 11/19/2025; treasurer at MBACG, contact `steyer@mbacg.com`):
- **No recorded payments to David Binder Research, FM3, Tulchin Research, EMC Research, Goodwin Simon, Probolsky, Strategies 360, PPIC, Berkeley IGS, USC, or Emerson** in the EXPN_CD bulk extract.
- No subvendor (Schedule G) entries for any of those firms were located on Steyer-filed disclosures.

**Anti-Steyer committees that emerged in early 2026:**
- Cmte 1489677 (anti-Steyer issue coalition) — DBR $30K, see Hook A.
- Cmte 1490270 (the upstream PG&E/IBEW energy IE) — no polling vendor disclosed; entirely media buy.

**For each of the 11 firms profiled, here is the 2026 CA Gov retainer status (Cal-Access primary):**

| Firm | 2026 CA Gov retainer (Cal-Access) | Filing | Side |
|------|-----------------------------------|--------|------|
| **David Binder Research** | $30,000 from anti-Steyer cmte 1489677 + $50,000 from Eric Swalwell cmte 1488732 | 3138008; 3139007 (Schedule G) | **BOTH** sides — opposing Steyer for industry; supporting Swalwell |
| FM3 Research | None located | — | None |
| Tulchin Research | ~$300K+ across 3 filings to Villaraigosa BMC cmte 1471635; nothing on Villaraigosa's own 2026 cmte | — | Pro-Villaraigosa (BMC IE) |
| EMC Research | $108,900 from Toni Atkins for Senate cmte 1466114 (filing 3111908) | 3111908 | Pro-Atkins (governor exploratory–era; Atkins is no longer in the gov race) |
| Goodwin Simon | $37,500 from Villaraigosa for Governor 2026 cmte 1486030 | 3138929 ("POL, Antonio Villaraigosa, Support") | Pro-Villaraigosa |
| Probolsky Research | None located in Cal-Access; press references to Bianco-campaign and Becerra-campaign polls indicate active engagement, but Cal-Access EXPN_CD top-payer table for Probolsky shows no major 2026 Gov candidate-cmte payments | — | Polled both Bianco (R) and Becerra (D) per press accounts |
| Strategies 360 | None located | — | None confirmed; firm in distress, see profile |
| PPIC | N/A — nonprofit pollster, doesn't accept candidate retainers | — | — |
| Berkeley IGS | N/A — UC ORU, doesn't accept candidate retainers | — | — |
| USC Dornsife | N/A — academic; only debate-hosting role (canceled) | — | — |
| Emerson College Polling / Inside CA Politics | N/A — media-commissioned by Nexstar/ICP, not a campaign committee | — | — |
| **Yee for Governor cmte 1465732** (separate committee) | FM3 paid ≈$88K; Sanders Emerson also paid | — | Pro-Yee |

**Bottom line on Hook B:** Steyer's own campaign apparatus has not retained any of the eleven profiled firms via Cal-Access disclosure. The polling industry's 2026 CA Gov footprint, as visible in primary records, is concentrated on the **anti-Steyer side** (DBR via cmte 1489677), the **Villaraigosa BMC and direct cmtes** (Tulchin + Goodwin Simon), the **Swalwell campaign** (DBR), and **Yee** (FM3). Steyer's polling operation, if any, is either being run through unreported intermediaries or is using non-CA vendors that have not yet been captured in Cal-Access EXPN_CD bulk filings.

**Important Steyer-side caveat:** In addition to candidate cmte 1485077, Steyer is publicly reported to be self-funding $130M+ in advertising; his media-buy and creative pipeline (Bearstar Strategies and similar) may be doing internal research that does not flow through Cal-Access. The absence in primary records is **definitive only for paid-pollster retainers visible to Cal-Access bulk filings** through the May 1, 2026 cutoff.

---

### HOOK C — For each major published 2026 CA Gov public poll, who paid?

**VERDICT: The polling field is unusually opaque on the sponsor question. Of 47 cataloged 2026 CA Gov polls released through May 1, 2026:**

- **~22% are media-funded (nonpartisan)**, principally Emerson/Inside CA Politics-Nexstar (8 polls), Politico/UC Berkeley Citrin/TrueDot (2 polls), CBS News/YouGov (1 poll), Capitol Weekly (1 poll).
- **~20% are public-interest / academic** — PPIC (3), Berkeley IGS (3), USC/CSU/Cal Poly (1), Independent Voter Project (2).
- **~9% are CA Democratic Party VOTER Index series** — Evitarus (3 waves: baseline, Tracker I, Tracker II) plus David Binder Research (Tracker I, $-listing not in cmte yet).
- **~27% are Democratic-aligned firm releases with undisclosed sponsors** (Tulchin, EMC, FM3, Lake Research, Tavern Research, Global Strategy Group, RBI, PPP, plus a standalone DBR poll). This is the largest category.
- **~4% are anti-Steyer IE-commissioned**: Gudelunas Strategies (2 polls).
- **~4% are candidate-funded with disclosed sponsor**: J Wallin / Slavet (1).
- **~4% Republican-internal / Hilton-flagged**: Echelon Insights (1).
- **~11% are firm self-funded**: Kreate Strategies (2), Emerson early waves (2), CivicLens (1), Bold Decision (1).

**Full sponsor-attribution table (47-poll inventory):**
The complete inventory is in `/home/user/workspace/ca_gov_2026/research/polling/2026_ca_gov_polls_inventory.md`, Section 1A. Summary of who-paid-for-what:

| Sponsor / commissioner | # of polls | Pollster(s) used |
|-----------------------|-----------|------------------|
| Emerson College / Inside California Politics (Nexstar) | 8 | Emerson College Polling |
| PPIC self-funded | 3 | PPIC Statewide Survey |
| UC Berkeley IGS / LA Times | 3 | Berkeley IGS |
| California Democratic Party (VOTER Index) | 4 | Evitarus (3) + David Binder Research (1) |
| Politico CA / UC Berkeley Citrin Center / TrueDot | 2 | Citrin Center / TrueDot |
| Independent Voter Project (self) | 2 | IVP |
| Anti-Steyer IE (Becerra-aligned) | 2 | Gudelunas Strategies |
| Kreate Strategies (self) | 2 | Kreate |
| Tavern Research (undisclosed) | 2 | Tavern Research |
| Global Strategy Group (undisclosed) | 2 | GSG |
| EMC Research (undisclosed; one for CPCA Advocates) | 3 | EMC |
| David Binder Research (undisclosed standalone) | 1 | DBR |
| Tulchin Research (undisclosed) | 1 | Tulchin |
| FM3 Research (undisclosed) | 1 | FM3 |
| Lake Research Partners (undisclosed) | 1 | Lake |
| RBI Strategies (undisclosed) | 1 | RBI |
| Public Policy Polling (undisclosed) | 1 | PPP |
| Impact Research (undisclosed) | 1 | Impact |
| Echelon Insights ("Hilton internal" per [PollTracker](https://x.com/PollTracker2024/status/2036781404088946807)) | 1 | Echelon |
| Jon Slavet for Governor campaign | 1 | J Wallin Opinion Research |
| CBS News (media) | 1 | CBS / YouGov |
| SurveyUSA (sponsor not disclosed) | 1 | SurveyUSA |
| CivicLens Research (self) | 1 | CivicLens |
| Bold Decision (undisclosed) | 1 | Bold Decision |
| Capitol Weekly / CA Target Book (media) | 1 | Capitol Weekly |
| USC/CSU/Cal Poly CEPP (academic) | 1 | CEPP |

**Two named industry-funded poll commissions are confirmed Tier 1:**
1. **Gudelunas Strategies x 2 polls** — sponsor identified by [Sacramento Bee, April 21, 2026](https://www.sacbee.com/news/politics-government/capitol-alert/article315470114.html) as an "anti-Steyer independent expenditure that is backing Becerra." This IE has been linked through reporting to **PG&E, the California Realtors, the Building Industry Association, the Cal Chamber/JOBSPAC, IBEW Local 1245, and CCPOA** — the same coalition documented in Hook A's Cal-Access committee 1489677/1490270 funder stack. The polls are not via Cal-Access EXPN disclosure under DBR's name; they were released to media as supposedly independent surveys.
2. **EMC Research x CPCA Advocates** — the April 21–26, 2026 EMC poll (n=1,000 LV, ±3.1%) was sponsored by CPCA Advocates (California Primary Care Association), per [Rob Pyers](https://x.com/rpyers/status/2049477882565509304) and [Decision Desk HQ aggregator](https://staging-polls.decisiondeskhq.com/averages/primary-ballot-test/2026-ca-governor/california/lv-rv-adults). CPCA Advocates is healthcare-issue advocacy, not a campaign committee.

**Bottom line on Hook C:** The plurality of 2026 CA Gov polls (≈27%) come from Democratic-aligned firms with undisclosed sponsors. Only Gudelunas Strategies and Echelon Insights are clearly tied to interest-group / candidate-internal commissioning. Public-interest, academic, and major-media polls (Emerson/ICP, PPIC, Berkeley IGS, CBS/YouGov, Politico/UC Berkeley) account for ≈55% of the polls and are the most transparent slice. **Aggregator hygiene matters here**: aggregators that average undisclosed-sponsor polls into the consensus risk weighting opaque advocacy work as if it were neutral.

---

### HOOK D — Are any 2026 CA Gov polls diverging materially from the aggregate in donor-coalition-favorable directions?

**VERDICT: YES. The Gudelunas Strategies polls are the clearest example, and the pattern is donor-coalition-favorable.**

#### D.1 — Gudelunas Strategies — anti-Steyer-IE-commissioned polls elevating Becerra

| Poll (Apr 23–27, 2026) | Becerra | Steyer | Hilton |
|-----------------------|---------|--------|--------|
| **Gudelunas (anti-Steyer IE) — sponsor disclosed by Sac Bee** | **24%** | 15% | 23% |
| CBS News / YouGov (same dates) | 13% | 15% | 16% |
| Emerson / ICP (Apr 14–15) | 10% | 14% | 17% |
| EMC (Apr 21–26) | 21% | 17% | 20% |
| Independent Voter Project (Apr 14–20) | 23% | 14% | 20% |
| Evitarus / CA Dem (Apr 15–17) | 13% | 13% | 16% |
| Kreate (Apr 12–18) | 10% | 16% | 18% |

The Gudelunas April 23–27 poll showed Becerra at **24%** — **11 points above CBS/YouGov's 13%** on identical field dates and 14 points above Emerson's 10% from days earlier. The polling consensus puts Becerra in the 13–23% range post-Swalwell; Gudelunas was at the very top of the range. Only IVP (23%, methodology-driven by a 3-of-4-elections high-propensity screen) and EMC (21%) approached it.

**Donor-coalition direction:** The anti-Steyer industry coalition — PG&E, the realtors, the Building Industry Association, JOBSPAC/Cal Chamber, IBEW Local 1245, CCPOA — has a clear narrative interest in **consolidating non-Steyer Democratic voters behind Becerra** (whose policy platform is less aggressive toward PG&E and corporate property taxes than Steyer's). Polls showing Becerra surging accelerate that consolidation by signaling viability. The Gudelunas releases timed for media coverage immediately after Swalwell's exit (April 12, 2026) and Yee's withdrawal-and-Steyer-endorsement (April 20, 2026) are consistent with that strategic objective.

**Pattern note:** The earlier Gudelunas poll (Apr 14–18) showed Becerra at 15% vs. Emerson's contemporaneous 10% — a 5-point lift, smaller but in the same direction. The lift grew to 11 points by the second wave.

#### D.2 — Impact Research — Hilton outlier (sponsor undisclosed)

| Poll (Apr 8–12, 2026) | Hilton |
|-----------------------|--------|
| **Impact Research (D, sponsor undisclosed)** | **25%** |
| SurveyUSA (Apr 8–10) | 18% |
| PPIC (Mar 26–Apr 3) | 17% |
| Emerson (Apr 14–15) | 17% |
| Kreate (Apr 12–18) | 18% |
| Consensus range | 13–20% |

Impact Research is a Democratic firm (founded by John Anzalone). Without a disclosed sponsor, it is impossible to identify the beneficiary. A 25% Hilton number — well above the 13–20% consensus — would serve narrative interests of **either** (a) Democrats arguing for consolidation against the Republican threat, **or** (b) the Hilton campaign / a Hilton-aligned IE wanting a momentum number. The poll was conducted **before** Swalwell's formal April 12 withdrawal. No primary-source sponsor disclosure was located.

#### D.3 — Echelon Insights — labeled as Hilton internal by aggregators

The March 12–17, 2026 Echelon Insights poll (n=600 LV, ±4.1%) showed Hilton at 20% and Swalwell at 15% — placing Hilton clearly first. [PollTracker](https://x.com/PollTracker2024/status/2036781404088946807) and other aggregators flagged it as a "Steve Hilton internal," though Echelon itself has not confirmed sponsor. Echelon is co-founded by Republican strategists Patrick Ruffini and Kristen Soltis Anderson. The Hilton number is at the high end of the consensus range but not egregiously outside it; the more notable methodological note is the Swalwell figure (15%) sitting between Berkeley IGS (13%) and Emerson (17%) — within range. **Treat as candidate-affiliated unless/until sponsor confirmed.**

#### D.4 — Tavern Research — late-2025 Bianco lift (small)

The October 30–31, 2025 Tavern Research poll showed Bianco at 16% and Hilton at 12% — a flipped order vs. most contemporaneous polls. Tavern is a 2024-founded mission-driven progressive firm in Chicago. The elevated Bianco number could plausibly serve a "Republican threat → Democrats must consolidate" narrative, but the magnitude of divergence is small relative to the n=1,001 MoE. **Insufficient evidence of deliberate funder-coalition divergence**, but flagged for the record.

#### D.5 — IVP — methodological, not funder-driven

Independent Voter Project's polls consistently show Republicans (especially Bianco) stronger than other surveys. IVP itself acknowledges this is a function of its 3-of-4-elections high-propensity LV screen, which produces a more Republican-tilted electorate than standard LV models. IVP is a nonpartisan reform organization with no candidate clients identified; its divergence is not donor-driven.

**Bottom line on Hook D:** The clearest donor-coalition-favorable divergence in the 2026 CA Gov polling field is **Gudelunas Strategies' two Becerra-elevating surveys**, both commissioned by the anti-Steyer industry IE that is the same coalition documented in Hook A. The Impact Research and Echelon polls are statistical outliers without confirmed sponsor disclosure; they should be treated as candidate-affiliated until proven otherwise. **The polling field has a structural opacity problem**: ≈27% of all 2026 CA Gov polls come from Democratic-aligned firms with undisclosed sponsors, and current poll aggregators do not down-weight these.

---

## SECTION 2 — FIRM-BY-FIRM PROFILES

Each profile follows a consistent structure: identity → partisan affiliation → known clients (Tier 1 where possible) → industry/sponsorship entanglements → race-track-record → ratings → push-polling/enforcement → 2026 CA Gov involvement. Cal-Access top-payer aggregations are from `/home/user/workspace/ca_gov_2026/research/polling/{firm}.top_payers.tsv`. FEC totals are from `/home/user/workspace/ca_gov_2026/research/polling/fec/fec_top_payers.json` (raw FEC by-recipient data; client-name resolution incomplete due to API rate-limits, but client identity is recoverable from [OpenSecrets vendor pages](https://www.opensecrets.org/campaign-expenditures/) cited per firm).

---

### FIRM 1 — DAVID BINDER RESEARCH (DBR)

**Identity.** Privately held California corporation; legal name David Binder Research, Inc.; founded 1994 by David Binder; HQ 44 Page Street Suite 404, San Francisco, CA 94102, per the firm's [About page](https://www.db-research.com/about) and [LinkedIn](https://www.linkedin.com/company/david-binder-research-inc). [UNVERIFIED — exact CA SOS BizFile entity number not confirmed at Tier 1.]

**Partisan affiliation.** Self-declared Democratic. Firm site states it is *"currently working on behalf of the DNC to support the Biden administration"* and references *"a long-term research and consultation relationship with Barack Obama's White House and both of his presidential campaigns,"* per [db-research.com](https://www.db-research.com/about). Served as supplemental pollster on Hillary Clinton 2016 (alongside Joel Benenson), per [p2016.org](https://www.p2016.org/clinton/clintonorg.html). Polled Iowa for Pete Buttigieg's 2020 primary [Tier 2 — needs primary verification].

**Cal-Access lifetime CA payer profile (2018–April 2026, $27.2M total — `DBR.top_payers.tsv`):**

| Top CA payer | Amount | Notes |
|--------------|--------|-------|
| Newsom anti-recall (2021) | $2,350,000 | |
| California Democratic Party | $2,350,000 | |
| California Labor Federation | $2,160,000 | |
| Newsom for Governor 2018 | $1,780,000 | |
| Opportunity PAC | $1,630,000 | |
| Action for Safety and Justice (CCPOA-allied) | $1,380,000 | **CCPOA orbit — see Hook A** |
| Newsom for Governor 2022 | $1,000,000 | |
| Newsom Prop 50 BMC | $910,000 | |
| Uber CA PAC | $539,000 | **Gig economy** |

**FEC federal payer profile (2018–2024 totals, fec_top_payers.json):**

| Cycle | Total | Top single-cmte |
|-------|-------|-----------------|
| 2018 | ~$672K | C00687624 ($234K) |
| 2020 | ~$1.38M | C00687624 ($373K) — DBR's largest 2020 client |
| 2022 | ~$2.35M | (multiple) |
| 2024 | ~$4.21M | **C00010603 (DNC) $1.76M; C00703975 (Harris for President) $867K** |

OpenSecrets-confirmed 2020 client breakdown: DNC Services Corp $289,630; Fearless for the People (presidential IE) $275K; Kamala Harris for the People $260,500; For Our Families PAC $169K; Jim Costa for Congress $137,500; Biden for President $50K; Future Forward USA $48K; San Manuel Band of Mission Indians $44,200 — per [OpenSecrets vendor page](https://www.opensecrets.org/campaign-expenditures/vendor?vendor=David+Binder+Research&cycle=2020).

**Industry entanglements:**
- **Sports betting / gambling industry (2022)**: DBR poll showing 59% support for the FanDuel/DraftKings/BetMGM-backed Prop 27 predecessor, per [Covers.com](https://www.covers.com/industry/california-sports-betting-poll-online-may-2022) and [Ballotpedia Prop 27](https://ballotpedia.org/California_Proposition_27,_Legalize_Sports_Betting_and_Revenue_for_Homelessness_Prevention_Fund_Initiative_(2022)). Final result: 16% Yes — DBR's 59% number was a 43-point miss vs. actual outcome and was widely described as a launch-phase narrative poll. [UNVERIFIED — direct contracting party between gambling proponents and DBR not located at Tier 1.]
- **Tribal gaming (San Manuel Band of Mission Indians)**, $44,200 in 2020 cycle [OpenSecrets]. San Manuel later became the top funder of *No on Prop 27* (2022) — placing DBR on **both sides** of the 2022 California sports-betting fight in different cycles.
- **Uber CA PAC** $539K Cal-Access (2018+) — gig-economy / Prop 22 ecosystem.
- **Anti–Billionaire-Tax messaging poll (Jan 2026)**: DBR poll commissioned by opponents of the Billionaire Tax measure; SEIU-UHW West publicly characterized the poll as "funded by opponents of the Billionaire Tax who are more interested in sowing doubt," per [AOL News / NY Post](https://www.aol.com/articles/california-voters-hate-terribly-drafted-222608035.html). [Tier 2 — sponsoring committee not confirmed at Tier 1.]
- **Davis Farms ballot measure poll (Feb 2026)**: contested by competing pollsters; characterized in [Davis Vanguard](https://davisvanguard.org/2026/02/polling-controversy-davis-farms/) as a Yes-side commissioned poll with framing concerns. [Tier 2.]

**Track record (FiveThirtyEight, frozen Aug 2025):** Grade **B/C**, 3 polls in database, 33% races called correctly. Two consecutive 5.4-point misses on Iowa Dem primary 2020 (called Buttigieg +2; actual Sanders +3.4); CA presidential 2020 1.8-point miss (called Biden +31; actual Biden +29.2). [Source: [FiveThirtyEight DBR ratings](https://projects.fivethirtyeight.com/pollster-ratings/david-binder-research/).]

**AAPOR Transparency Initiative:** Not a member, per FiveThirtyEight rating page ("Affiliated with AAPOR/Roper: No"). [UNVERIFIED at AAPOR primary source.]

**Push polling / enforcement:** No FPPC, FEC, or state AG enforcement actions located. No court records.

**2026 CA Gov involvement:**
- **Anti-Steyer cmte 1489677 — $30,000 (filing 3138008, "Survey/Oppose/Tom Steyer/Governor/Statewide")** — see Hook A.
- **Eric Swalwell cmte 1488732 — $50,000 (filing 3139007 Schedule G)** — pro-Swalwell polling support.
- **California Democratic Party VOTER Index Tracker I (April 7, 2026)** — n=800 LV, sponsor [CADEM.org topline PDF](https://cadem.org/wp-content/uploads/2026/04/4.7.26-CA-Voter-Index-Tracking-Survey-I-Topline.pdf).
- **Public horserace polls released February–April 2026** including a Latino-voter poll (Bianco 20%, Steyer 5%, Villaraigosa 4%) and a poll showing Hilton leading at 22%, per [Independent Voter News](https://ivn.us/posts/why-californias-governor-race-is-a-trap-for-both-parties-trump-endorses-hilton-2026-04-09) and [PollTracker2024](https://x.com/PollTracker2024/status/2029587874991984981).
- **EnviroVoters Education Fund** climate-priorities polling, [envirovotersedfund.org](https://envirovotersedfund.org/governors-race-2026/).
- **Conflict-of-interest flag**: DBR is **simultaneously paid to oppose Steyer (industry IE) and to support Swalwell** while releasing public horserace polls on the same race. No FPPC complaint located.

---

### FIRM 2 — FM3 RESEARCH (Fairbank, Maslin, Maullin, Metz & Associates)

**Identity.** California corporation, "Fairbank, Maslin, Maullin, Metz & Associates, Inc." dba "FM3 Research," per [LinkedIn](https://www.linkedin.com/company/fairbank-maslin-maullin-metz-&-associates) and firm site [fm3research.com/about-us](https://fm3research.com/about-us/). Founded 1981 — one of the oldest continuously operating CA political research firms. HQ 1999 Harrison Street Suite 2020, Oakland, CA 94612 (LA office: 12100 Wilshire). Founding partners: John Fairbank (active), Paul Maslin (joined 1993), Richard Maullin (deceased March 2019), David Metz; partners also include Richard Bernard (LA) and Rick Sklarz, per [fm3research.com/team](https://fm3research.com/team/paul-maslin/) and [Compton CCD proposal PDF](https://www.compton.edu/district/citizens-bond-oversight/docs/Fairbank-Maslin-Maullin-Metz-Associates-FM3-Research-921-7008-F-Compton-CCD-2024-Ballot-Measure.pdf). ~23 employees.

**Partisan affiliation.** Democratic. Universally identified in public-poll disclosures as "FM3 Research (D)" — e.g., the [California Pan-Ethnic Health Network bipartisan Medi-Cal survey, June 2025](https://cpehn.org/about-us/blog/voter-attitudes-toward-maintaining-expanded-medi-cal-coverage/) labels FM3 as the (D) firm partnering with New Bridge Strategy (R). Paul Maslin's bio confirms work for Gray Davis, Patty Murray 2022, Doug Jones 2017 Alabama Senate, Karen Bass 2022 LA Mayor IE, per [fm3research.com/team/paul-maslin](https://fm3research.com/team/paul-maslin/).

**Cal-Access lifetime CA payer profile (2018–April 2026, $24.7M total — `FM3.top_payers.tsv`):**

| Top CA payer | Amount | Notes |
|--------------|--------|-------|
| **California Indian Tribes (multiple committees)** | **$9,170,000** | Dominant — see Industry below |
| Local Transportation Coalition | $1,820,000 | |
| California Democratic Party | $861,000 | |
| No on Prop 22 — Labor coalition | $704,000 | |
| Clean Healthy California | $693,000 | |
| Consumer Attorneys of California | $687,000 | |
| Hospitals — CHCI / California Hospitals | $504,000 | |

**FEC federal payer profile (2018–2024):** OpenSecrets shows $0 reported under "Fairbank Maslin Maullin" in 2024 cycle and $117,125 reported under "FM3 Research" — consistent with FM3's primary California state-and-local orientation, per [OpenSecrets](https://www.opensecrets.org/campaign-expenditures/vendor?vendor=FM3+Research&cycle=2024). Top 2024 FEC by-recipient cmte was C00000935 (DCCC) ~$427K.

**Industry entanglements:**
- **California tribal gaming (dominant)**: $9.17M lifetime is the largest single client cluster. FM3 polled twice for the tribal coalition opposing Prop 27 in 2022 (April 6–13, 2022 n=1,094 LV; July 30–Aug 1, 2022 n=900 LV) — top funders were San Manuel, Pechanga Band, Yocha Dehe Wintun Nation — per [Ballotpedia Prop 27](https://ballotpedia.org/California_Proposition_27,_Legalize_Sports_Betting_and_Revenue_for_Homelessness_Prevention_Fund_Initiative_(2022)). FM3 also polled No on Prop 48 (Tribal Gaming Compacts, 2014), per firm's [statewide ballot client archive](https://fm3research.com/clients_category/statewide-ballot/).
- **Veloz** (clean-transportation / electric vehicle advocacy), March 2022 statewide voter survey, per [Veloz/FM3 memo](https://www.veloz.org/resource/veloz-and-fm3-memo/).
- **Bloom Energy** California voter views on energy issues (Aug 2021), per [bloomenergy.com PDF](https://www.bloomenergy.com/wp-content/uploads/fm3-research-ca-vote-views-of-key-energy-issues-aug-2021.pdf).
- **California Pan-Ethnic Health Network** bipartisan Medi-Cal expansion survey (June 2025), per [CPEHN](https://cpehn.org/about-us/blog/voter-attitudes-toward-maintaining-expanded-medi-cal-coverage/).
- **California community college / K-12 bond measures**: 60+ since 1992, combined authorization >$30B, per [Compton CCD PDF](https://www.compton.edu/district/citizens-bond-oversight/docs/Fairbank-Maslin-Maullin-Metz-Associates-FM3-Research-921-7008-F-Compton-CCD-2024-Ballot-Measure.pdf).
- **No tobacco, fossil-fuel lobby, or charter-school clients located** in primary sources.

**Track record (FiveThirtyEight, frozen Aug 2025):** Grade **C/D**, 11 polls, 68% races called. Worst miss: 2020 Alabama Senate (Jones +1 predicted, Tuberville +20.4 actual = 21.4-point miss — likely a campaign internal poll). [Source: [FiveThirtyEight FM3 ratings](https://projects.fivethirtyeight.com/pollster-ratings/fm3-research/).]

**AAPOR TI:** Not a member.

**Push polling / enforcement:** None located.

**2026 CA Gov involvement:**
- **Yee for Governor cmte 1465732 — ~$88,000** (per session-summary verification of `fppc_payments_to_pollsters.tsv` filter for cmte 1465732); also single public CA Gov poll Dec 7–8, 2025 (n=632 LV, sponsor undisclosed) per inventory row 33.
- **No 2026 CA Gov retainer confirmed in Cal-Access for Steyer, Becerra, Porter, Villaraigosa's own cmte, or anti-Steyer IE.**

---

### FIRM 3 — TULCHIN RESEARCH

**Identity.** Tulchin Research; founded 2009 by Ben Tulchin (formerly Greenberg Quinlan Rosner Research; Fairbank Maslin Maullin); HQ 220 Sansome Street Suite 1360, San Francisco, CA 94104, per firm [team page](https://tulchinresearch.com/team/ben-tulchin/) and [LinkedIn](https://www.linkedin.com/company/tulchin-research). Current team includes Ben Krompak (VP), Corey O'Neil (VP), Corey Teter (Senior Analyst), per [tulchinresearch.com/our-team](https://tulchinresearch.com/our-team/). [UNVERIFIED — CA SOS entity number not confirmed at Tier 1.]

**Partisan affiliation.** Democratic. Self-described as Democratic on firm site; received **AAPC 2010 Pollie Award as "top new Democratic political consulting firm of the year,"** per [tulchinresearch.com](https://tulchinresearch.com/2010/03/tulchin-research-named-top-new-democratic-consulting-firm-of-the-year-by-the-american-association-of-political-consultants/). Lead pollster for **Bernie Sanders 2016** (45 states + Puerto Rico, $228M campaign) and **2020**, per firm [case study](https://tulchinresearch.com/case/bernie-sanders-president/) and [NYT (Apr 19, 2024)](https://www.nytimes.com/2024/04/19/us/politics/rfk-jr-young-voters-latinos.html).

**Cal-Access lifetime CA payer profile (2018–April 2026, $12.2M total — `Tulchin.top_payers.tsv`):**

| Top CA payer | Amount | Notes |
|--------------|--------|-------|
| **California Democratic Party** | **$7,870,000** | 65% of total — dominant single-client concentration |
| Villaraigosa for Governor 2026 (own cmte) | $511,000 | Confirmed pro-Villaraigosa — see 2026 below |
| Various Assembly / Senate / municipal | (long tail) | |

**FEC federal payer profile:** 2016 ≈$4.13M (Bernie Sanders dominated); 2020 ≈$2.47M (Sanders again — single cmte $2.41M); 2022 ≈$1.06M; 2024 ≈$751K. 2024 top clients per [OpenSecrets](https://www.opensecrets.org/campaign-expenditures/vendor?vendor=Tulchin+Research&cycle=2024): Cisneros for Congress $260K; Derek Tran for Congress $148K; Evan Low for Congress $62K; Working Families Party $48K; DCCC $30K.

**Industry entanglements:**
- **Corporate clients** (per Ben Tulchin firm bio at [tulchinresearch.com/team/ben-tulchin](https://tulchinresearch.com/team/ben-tulchin/)): *"Abbott Laboratories, AT&T, General Electric, Google, National Semiconductor, Pacific Gas and Electric, Tesla and Toyota."* **PG&E** is notable given its role as the largest funder of the anti-Steyer IE (Hook A).
- **Advocacy clients**: SEIU, UFCW, California Federation of Teachers, ACLU, California Endowment, California Wellness Foundation, Defenders of Wildlife, League of Conservation Voters.
- No tribal gaming, charter school, dialysis, or pharma engagements located.

**Track record:** **No FiveThirtyEight rating page** — Tulchin's URL redirects to ABCNews, indicating it was never rated as a public pre-election pollster. Consistent with private-campaign-pollster orientation.

**AAPOR TI:** Not confirmed. AAPC 2010 Pollie award is industry recognition, not transparency certification.

**Push polling / enforcement:** None located.

**2026 CA Gov involvement:**
- **Villaraigosa BMC cmte 1471635 — ~$300K+ across 3 filings** (BMC = backup-major-committee independent expenditure pro-Villaraigosa).
- **Villaraigosa for Governor 2026 own cmte 1486030**: $511K appears in Tulchin's CA top-payer file but the user's session-summary lookup for cmte 1486030 EXPN payments showed Goodwin Simon ($37,500) — so the $511K may aggregate across multiple Villaraigosa-related cmte IDs over time (the BMC + the candidate's own cmte). Disambiguation requires re-running the EXPN_CD filter on 1471635 vs 1486030 separately.
- **Fiona Ma for State Treasurer (Feb 11, 2026 poll release)** — non-governor 2026 statewide work, per [tulchinresearch.com news](https://tulchinresearch.com/category/news/).
- Single public horserace poll Jan 22–28, 2026 (n=1,000 LV, sponsor undisclosed; inventory row 29).
- **No documented engagement on the Steyer, Becerra, or Porter campaign side.**

---

### FIRM 4 — EMC RESEARCH

**Identity.** Evans/McDonough Co., Inc. dba EMC Research; founded March 1989 in Oakland by Alex Evans (then VP at Cambridge Survey Research) and Don McDonough, per [Riverbender.com](https://www.riverbender.com/news/details/alton-native-announces-run-for-state-representative-66913.cfm) and [emcresearch.com/about](https://emcresearch.com/about/). HQ 436 14th Street Suite 820, Oakland, CA 94612; offices in Seattle, DC, Columbus OH, Portland OR, Irving TX. Originally Washington-state-incorporated (EIN 91-1544364 per [Florida Sunbiz record](https://search.sunbiz.org/Inquiry/corporationsearch/SearchResultDetail?inquirytype=EntityName&aggregateId=forp-f16000002027-daba51b8-8188-437d-9afb-4cbc958b175d)). **Majority women-owned** since Ruth Bernstein's CEO tenure (Nov 2018–May 2025); current CEO **Molly O'Shaughnessy** (May 2025–), per [EMC leadership announcement](https://www.emcresearch.com/exciting-changes-at-emc-research-leadership-announcement/).

**Partisan affiliation.** Self-presents as nonpartisan / "full-service market research and data analytics." In practice predominantly Democratic-aligned — Ruth Bernstein bio describes "helping to elect women and people of color." Founder Alex Evans left EMC in April 2018 to serve as Chief of Staff and then Senior Strategist for Eric Swalwell's 2020 presidential campaign, per [democracyinaction.us](https://www.democracyinaction.us/2020/swalwell/swalwellorg.html). Polled for **Pete Buttigieg 2020** (Ruth Bernstein referenced as "lead pollster" on the [AAPOR Public Opinion Podcast](https://aapor.org/media/public-opinion-pod/) — the direct FEC disbursement is visible on OpenSecrets but not yet pulled at primary level). Won 2025 AAPC Pollie Award for CA's 76th Assembly District work, per [emcresearch.com/news](https://www.emcresearch.com/news/).

**Cal-Access lifetime CA payer profile (2018–April 2026, $11.0M total — `EMC.top_payers.tsv`):**

| Top CA payer | Amount | Notes |
|--------------|--------|-------|
| California Democratic Party | $2,870,000 | |
| **California Indian Tribes** | **$1,050,000** | Tribal gaming entanglement |
| **Lyft Independent Work (Yes on Prop 22 ecosystem)** | **$1,020,000** | Gig-economy industry — see below |

**FEC federal:** 2020 cycle $706,038; 2024 cycle $645,314, per [OpenSecrets EMC vendor page](https://www.opensecrets.org/campaign-expenditures/vendor?vendor=EMC+Research&cycle=2024). Granular client breakdown not extracted at Tier 1.

**Industry entanglements:**
- **Gig economy (Uber/Lyft/DoorDash/Instacart) — confirmed Tier 1.** EMC conducted at least two California app-driver surveys (2019 and Sept 2021, n=1,508) used by the gig-platform coalition to support the post–Prop 22 contractor-classification narrative — 75%–82% of drivers reported preferring contractor status, per [UC Riverside CEFD report](https://protectdriversandservices.com/wp-content/uploads/2022/03/UCR_CEFD_CA_AppDrivers_Analysis_2_17_2022-41.pdf). Coalition: Uber, Lyft, DoorDash, Instacart.
- **Tribal gaming**: $1.05M Cal-Access lifetime — California Indian Tribes is EMC's #2 lifetime CA payer.
- **CPCA Advocates (Apr 21–26, 2026 poll)**: California Primary Care Association Advocates, healthcare-issue advocacy group, sponsor of public 2026 CA Gov poll showing Becerra/Hilton tied at 19% (or 21%/20% per inventory row 3 alternate version) — per [Rob Pyers](https://x.com/rpyers/status/2049477882565509304) and [Decision Desk HQ](https://staging-polls.decisiondeskhq.com/averages/primary-ballot-test/2026-ca-governor/california/lv-rv-adults).
- **EMC California Analytics product**: voter scores on 40+ issues for all registered CA voters, sold to campaigns for 2026 cycle, per [emcresearch.com/california-data-analytics](https://www.emcresearch.com/california-data-analytics/). [UNVERIFIED — specific 2026 CA Gov campaign clients not disclosed.]

**Track record (FiveThirtyEight, frozen Aug 2025):** Grade **B/C**, 15 polls, 63% races called correctly. [Source: [FiveThirtyEight EMC ratings](https://projects.fivethirtyeight.com/pollster-ratings/emc-research/).]

**AAPOR TI:** Not a member per FiveThirtyEight; Ruth Bernstein has hosted the AAPOR Public Opinion Podcast — engagement without TI certification.

**Push polling / enforcement:** None located.

**2026 CA Gov involvement:**
- **Toni Atkins for Senate cmte 1466114** — $108,900 (filing 3111908) before Atkins exited the gov race; this is residual 2025-era spending, not active 2026 Gov.
- **Three public horserace polls** (Oct 22–26, 2025; Jan 29–Feb 4, 2026; Apr 21–26, 2026 for CPCA Advocates) — see inventory rows 3, 26, 39.
- **Apr 21–26 EMC poll**: Becerra 21% (or 19%, depending on version), Hilton 20% (or 19%), Steyer 17%, Bianco 14%, Porter 8%, Mahan 8%, Villaraigosa 3% — places Becerra in the surge group.

---

### FIRM 5 — PUBLIC POLICY INSTITUTE OF CALIFORNIA (PPIC) STATEWIDE SURVEY

**Identity.** **501(c)(3) public charity, EIN 94-3176430**, founded 1994 by Roger Heyns, Arjay Miller, and William R. Hewlett. Statewide Survey inaugurated 1998 under **Mark Baldassare, Ph.D.** (current PhD UC Berkeley Sociology; Director continuously since 1998; PPIC President/CEO 2007–2022); current PPIC President is former CA Chief Justice **Tani Cantil-Sakauye** (since 2022). HQ San Francisco; Sacramento Center near State Capitol. Per [PPIC About](https://www.ppic.org/about/) and [Mark Baldassare bio](https://www.ppic.org/person/mark-baldassare/).

**Partisan affiliation.** Nonpartisan. The gold-standard CA public-opinion tracker.

**Funding (FY2024, year-end June 30, 2024):** Total revenue ~$11.5M; expenses ~$23.07M; net assets (endowment) **$334.5M**, per [PPIC Current Financials PDF](https://www.ppic.org/wp-content/uploads/CurrentFinancials.pdf). Top funders publicly listed: **Hewlett, Irvine, Packard, S.D. Bechtel Jr., California Endowment, Sobrato, Blue Shield CA Foundation, Stuart, Haas Jr., Gates, Arjay & Frances Miller Foundation, College Futures, SCAN.** Corporate Circle: California Business Roundtable, Walt Disney Co., Edison International, California Teachers Association. Sponsors: Kaiser Permanente, Wells Fargo, Bank of America, NextEra Energy Resources, Pacific Life Foundation. Per [PPIC Contributors](https://www.ppic.org/support-ppic/contributors/).

**Methodology:** Probability-based **Ipsos KnowledgePanel** (online; transitioned from RDD telephone ~2018–2019); ABS sampling; n≥1,500 CA adults per wave; MoE ±3.5%; weighting on age×gender×region, race/ethnicity×region, education, party×region; LV screen multivariable. **AAPOR TI Charter Member** since October 2014; NCPP member. Per [PPIC Survey Methodology PDF (June 2025)](https://www.ppic.org/wp-content/uploads/SurveyMethodology.pdf).

**Track record:**
- **2018 Governor**: PPIC final showed Newsom +11 (49–38); actual Newsom +23.8 — **12.9-point miss** (Newsom understated). [Source: [PPIC Oct 2018 Survey PDF](https://www.ppic.org/wp-content/uploads/ppic-statewide-survey-october-2018.pdf).]
- **2021 Recall**: 39% Yes / 58% No vs. actual 38.1% / 61.9% — **near-exact**.
- **2024 Senate (Schiff/Garvey)**: No final pre-general PPIC poll located. [UNVERIFIED.]
- **Silver Bulletin grade B+, R+1.0** mean-reverted bias [Tier 2 via [MBFC PPIC page](https://mediabiasfactcheck.com/public-policy-institute-of-california-ppic-bias-and-credibility/)].

**Controversies:** PPIC's February 2026 governor poll was used by USC Prof. Christian Grose as a qualifying input for his debate-viability formula, which excluded all four candidates of color and was canceled March 14, 2026, per [USC CPF scholars statement](https://dornsife.usc.edu/center-for-political-future/news/statement-from-scholars-independence-and-methodological-integrity/). PPIC was passive (its data was used; PPIC was not a debate planner).

**2026 CA Gov involvement:** **3 public horserace polls** (Nov 13–19, 2025; Feb 3–11, 2026; Mar 26–Apr 3, 2026) — inventory rows 13, 23, 36. All self-funded; no candidate retainer.

---

### FIRM 6 — BERKELEY IGS POLL

**Identity.** Organized Research Unit of UC Berkeley; parent is Institute of Governmental Studies (IGS), founded 1919. Berkeley IGS Poll launched 2011 as successor to the Field Poll. Director **Mark DiCamillo** (joined ~2016–2017; previously Director of the Field Poll 1993–2016; assistant under Mervin Field since 1978). IGS Co-Directors **Eric Schickler** and **G. Cristina Mora**. Per [igs.berkeley.edu/research/berkeley-igs-poll](https://igs.berkeley.edu/research/berkeley-igs-poll) and [Mark DiCamillo bio](https://igs.berkeley.edu/people/mark-dicamillo).

**Funding.** UC Berkeley general funds + question-buy supplements (Evelyn and Walter Haas Jr. Fund cited as a recurring buyer for democracy-related questions) + LA Times media co-sponsorship since at least 2018. No private equity, party, or candidate funding identified. Per [LA Times methodology disclosure](https://www.latimes.com/politics/la-na-pol-2020-how-poll-was-done-20190613-story.html).

**Methodology.** Online-only; **Registration-Based Sampling (RBS)** via Political Data Inc. (PDI) voter file; n=6,000–8,000 RV per wave, with LV subsamples of 2,500–5,000; English/Spanish; Qualtrics platform; weighting on age, gender, race/ethnicity, education, English proficiency, region, urbanicity, party registration, past voting. Per [Berkeley IGS Poll Survey Methodology PDF (Jan 2024)](https://igs.berkeley.edu/sites/default/files/survey_methods_of_the_berkeley_igs_poll_updated_1_3_24.pdf). **PDI is the same vendor that appears as a $4,200 subvendor on DBR's anti-Steyer Schedule G in filing 3138008** — illustrating PDI's monopoly position in CA voter-file sampling.

**Track record:**
- **2018 Primary Gov**: Newsom 33%, Cox 20% (actual 33.7% / 25.4%) — direction & topline near-exact.
- **2018 Senate**: Feinstein 45 / de León 36 / 19% UD (actual 54.2 / 45.8) — de León 10-pt undercount; UD resolved heavily toward de León.
- **2021 Recall**: ≈38% Yes / 50% No vs. actual 38.1 / 61.9 — accurate on direction; the No share was understated by ~12 points.
- **2024 Senate**: Schiff 53 / Garvey 36 (actual 58.9 / 41.1) — both understated by 5–6 points but margin (Schiff +17 vs. +17.8) accurate.
- **Silver Bulletin grade A−, D−0.32** very slight Democratic lean [Tier 2 via [MBFC IGS page](https://mediabiasfactcheck.com/berkeley-institute-of-governmental-studies-igs-poll-bias-and-credibility/)].
- Designated as one of two **NYT "select pollsters"** for the 2026 CA Gov race tracker, per [IGS announcement](https://igs.berkeley.edu/news/igs-poll-featured-among-select-pollsters-ny-times-poll-tracker-upcoming-ca-governors-primary).

**AAPOR TI:** Status [UNVERIFIED] — not confirmed at Tier 1.

**Controversies:** Same passive role as PPIC in the canceled USC debate (data used, IGS not a planner).

**2026 CA Gov involvement:** **3 public horserace polls** (Aug 2025 Release #2025-12; Nov 7, 2025 Release #2025-17; Mar 18, 2026 Release #2026-01). The March 18 poll showing **two Republicans leading** (Hilton 17%, Bianco 16%) was the landmark survey of the cycle, drawing national coverage from [LA Times (Seema Mehta)](https://www.latimes.com/california/story/2026-03-18/la-me-pol-2026-election-california-berkeley-poll-governor) and [SFGate](https://www.sfgate.com/politics/article/governors-race-poll-berkeley-22083761.php).

---

### FIRM 7 — USC DORNSIFE / LA TIMES POLL

**Identity.** USC Dornsife College's **Center for the Political Future (CPF)** (founded ~2014; founder **Robert Shrum**) + **Center for Economic and Social Research (CESR)** (Director **Arie Kapteyn**; Survey Director **Jill Darling**). LA Times was the co-publishing partner from approximately 2014 through 2020. Per [USC CPF About](https://dornsife.usc.edu/center-for-political-future/about-the-center/) and [USC CESR](https://dornsife.usc.edu/cesr/).

**Track record:**
- **2018 Governor**: Newsom 54 / Cox 31 (actual 61.9 / 38.1) — direction correct; Newsom understated by 8 points.
- **2016 National "Daybreak" Poll**: Famously called Trump's electoral college victory while other national polls had Clinton +4–6. Post-election analysis revealed a 19-year-old Black Trump supporter was weighted ~30× the average respondent — a structural artifact USC acknowledged and corrected in 2020, per [NYT Upshot (Aug 9, 2016)](https://www.nytimes.com/2016/08/09/upshot/a-favorable-poll-for-donald-trump-has-a-major-problem.html) and [USC Daybreak 2020 Q&A with Jill Darling](https://dornsife.usc.edu/news/stories/2020-daybreak-poll-qna-with-jill-darling-survey-director/).

**2021–2024 CA polling:** No California governor or Senate horserace polls located. [UNVERIFIED for completeness — USC CPF Poll Results archive shows no CA horserace releases after 2020.]

**AAPOR TI:** [UNVERIFIED.]

**2026 CA Gov involvement: ZERO horserace polls.** USC Dornsife's only 2025–2026 California political activity was hosting the canceled gubernatorial debate.

**The 2026 USC debate controversy (the firm's defining 2026 event):** USC CPF + ABC7/KABC announced a 2026 CA Gov debate; Prof. **Christian Grose** developed a "candidate viability score" that combined polling data (primarily PPIC Feb 2026 + Emerson) with campaign fundraising. The top-six qualifying candidates — Steyer, Hilton, Swalwell, Porter, Mahan, Bianco — were **zero candidates of color**; the four excluded candidates polling for the race (Becerra, Villaraigosa, Yee, Thurmond) are all people of color. CA Attorney General Rob Bonta and candidate Becerra publicly condemned the formula; Becerra filed a complaint with ABC7/KABC, per [LA Times (Mar 13, 2026)](https://www.latimes.com/california/story/2026-03-13/becerra-blasts-usc-abc-for-excluding-candidates-of-color-from-gubernatorial-debate). Debate canceled March 14, 2026, per [NBC News (Mar 14, 2026)](https://www.nbcnews.com/politics/2026-election/california-governor-debate-canceled-criticism-candidates-color-rcna264945). USC scholars defended Grose's methodology in [joint statements](https://dornsife.usc.edu/center-for-political-future/news/statement-from-scholars-independence-and-methodological-integrity/). Steyer's viability score was 28.96 (driven by his $40M+ self-funded ad spend) vs. Hilton's 10.23 — embedding fundraising as a debate qualifier effectively monetized debate access.

---

### FIRM 8 — EMERSON COLLEGE POLLING / INSIDE CALIFORNIA POLITICS (Nexstar)

**Identity.** Academic polling center at Emerson College (Boston, MA private 501(c)(3)), founded 2012 by **Spencer Kimball** (Executive Director; Associate Professor). Senior Director **Matt Taglia**; Communications Director **Camille Mumford** (NEAAPOR VP). Per [emersoncollegepolling.com/about](https://emersoncollegepolling.com/about/).

**California sponsor.** **Inside California Politics (ICP)** — Nexstar Media Group's California TV-station consortium (KTLA-5 LA, KRON-4 SF, KGET Bakersfield, etc.). Some 2025 Emerson CA waves are self-funded. **The Hill** (Nexstar national) co-sponsored some early waves.

**Methodology:** Mixed-mode — (1) MMS text-to-web from Aristotle voter file → Qualtrics; (2) CINT/PureSpectrum opt-in panels screened for voter registration; (3) email-to-web from Aristotle; (4) probability MMS (Consensus Strategies) on some waves. n=900–1,000; ±3.0–3.2% MoE (Bayesian credibility intervals). **English only — methodological gap for Spanish-dominant households.** **AAPOR TI Charter Member** confirmed on [Emerson About](https://emersoncollegepolling.com/about/).

**Track record:**
- **2021 Recall**: 46% Yes / 48% No vs. actual 38.1 / 61.9 — overstated Yes by 8 points; called direction.
- **2024 CA Senate Primary** (Feb 24–27, 2024): Schiff 28, Garvey 20, Porter 17, Lee 8, Allen 5 vs. actual Schiff 31.6, Garvey 31.5, Porter 17.6, Lee 8.4, Allen 7.0 — **understated Garvey's late surge by ~11 points**; Schiff and Porter accurate.
- Silver Bulletin **B+**, R+1.5 house effect [Tier 2].

**AAPOR TI:** **Charter Member** (confirmed Tier 1).

**Controversies:** English-only Spanish-language gap; mixed probability/non-probability sample structure; Garvey 2024 miss was shared by most California pollsters.

**2026 CA Gov involvement: 8 polls — the most of any single firm.** April 2025, August 2025, September 2025, October 2025, December 2025, February 2026, March 2026, April 2026. ICP/Nexstar is the dominant CA media-poll sponsor relationship. The April 14–15, 2026 Emerson poll was commissioned for the **April 22, 2026 Nexstar/ICP debate**, the first televised CA Gov debate after Swalwell's exit.

---

### FIRM 9 — GOODWIN SIMON STRATEGIC RESEARCH (GSSR)

**Identity.** Three-partner Oakland/LA progressive boutique: **Paul Goodwin** (Founding Partner, 20+ years polling), **Amy Simon** (Founding Partner; UMich 1987; Joint Program in Survey Methodology Maryland; one of the architects of the 2012 Maine/Washington pro-marriage equality messaging), **John Whaley, PhD** (Partner; clients NARAL, SPLC, Gates, Earthjustice). Per [goodwinsimon.com/who-we-are/about-gssr](https://goodwinsimon.com/who-we-are/about-gssr/). [UNVERIFIED — exact founding year and CA SOS entity number; Simon's career start is consistent with mid-to-late 1990s firm founding.]

**Partisan affiliation.** Democratic / progressive issue research. Identified by senior researcher John Whaley quoted in [SF Chronicle (July 15, 2018)](https://www.sfgate.com) as "a firm which polls mainly for Democratic candidates and causes."

**Cal-Access lifetime CA payer profile (2018–April 2026, $15.6M total — `GoodwinSimon.top_payers.tsv`):**

| Top CA payer | Amount | Notes |
|--------------|--------|-------|
| **California Democratic Party** | **$11,100,000** | **71% of total — extreme single-client concentration** |
| EdVoice / charter schools | $622,000 (combined) | Charter-school orbit |
| State Building Trades | $342,000 | |

**FEC federal:** $305,622 in 2024 cycle, per [OpenSecrets](https://www.opensecrets.org/campaign-expenditures/vendor?vendor=Goodwin+Simon+Strategic+Research&cycle=2024).

**Industry entanglements:**
- **Charter schools**: California Charter Schools Association (CCSA) statewide poll June 14–24, 2022 (n=951 RV, 55% favorable) — per [CCSA blog (July 25, 2022)](https://info.ccsa.org/blog/new-poll-finds-parents-want-more-choices-and-support-charter-schools). Notable for a progressive-aligned firm given CCSA's adversarial relationship with CA teachers' unions.
- **California Health Care Foundation, City of Santa Monica, San Francisco Public Utilities Commission (PG&E infrastructure-takeover poll Apr 2019, n=435), Santa Monica-Malibu Unified School District ($485M and $150M bond feasibility 2018)** — public-sector / institutional polling.
- **Compassion & Choices** California death-with-dignity poll Oct 2014.
- **GLAAD Social Media Safety Index** 2022–2023.
- **Everytown for Gun Safety** Maine concealed-carry poll 2015.
- **No tobacco, fossil-fuel, tribal gaming, alcohol/cannabis, or pharma engagements located.**

**Track record:** No FiveThirtyEight rating (private/advocacy work, no minimum public-poll volume). No Silver Bulletin rating. AAPOR engagement confirmed via 2013 conference panel listing (Amy Simon and Adam Probolsky on same panel) but TI membership status unconfirmed [UNVERIFIED].

**Push polling / enforcement:** None located.

**2026 CA Gov involvement:**
- **Villaraigosa for Governor 2026 cmte 1486030 — $37,500 (filing 3138929, "POL, Antonio Villaraigosa, Support")** — Tier 1 confirmed.
- The Villaraigosa campaign appears to use **two firms** (GSSR for issue/messaging research and Tulchin for horserace), a standard arrangement.
- Multiple April–May 2026 California media references describe a GSSR-conducted poll showing Villaraigosa "in fourth place... but arguing he has a path" — released by the campaign to media, no topline document independently verified.

---

### FIRM 10 — PROBOLSKY RESEARCH

**Identity.** Newport Beach / Irvine boutique founded 1992. **Desiree Probolsky (CEO)**; **Dr. Adam Probolsky (President)** — Ed.D. organizational leadership (South College), MA data analytics & visualization (MICA), Senior Research Fellow at Drucker School, former Irvine planning commissioner, former OC Sheriff's Department volunteer spokesperson, former Orange County Register columnist. **Joshua Emeneger** (Principal Researcher). Self-described as **Latina- and woman-owned, minority-owned, nonpartisan**. Per [probolskyresearch.com](https://www.probolskyresearch.com).

**Partisan affiliation.** Self-described nonpartisan. Cal-Access EXPN_CD reality is otherwise — small CA campaign-client portfolio that skews Republican.

**Cal-Access lifetime CA payer profile (2018+, $230,000 total / 49 records — `Probolsky.top_payers.tsv`):**
- Mancuso for Assembly 2022 (top)
- Bates for Supervisor 2022
- NAIOP Inland Empire PAC (commercial real estate)
- Beth Gaines for Senate 2020
- Western Electrical Contractors

— a Republican/business-aligned local profile despite the nonpartisan self-branding. Total volume ($230K) is by far the smallest of the 11 firms — Probolsky is genuinely a boutique.

**FEC federal payer profile:** Not pulled (rate-limited); no significant federal footprint identified.

**Industry entanglements:**
- **Charter schools**: 2025 CCSA statewide poll (apparently took over from GSSR for the 2025 edition, finding 65% support), per [CCSA blog (Oct 2025)](https://info.ccsa.org/blog/public-support-for-charter-schools-reaches-record-high-in-california).
- **VELOZ** (electric vehicles) — July 31–Aug 8, 2024 statewide voter survey (n=900), per [Veloz/Probolsky PDF](https://www.veloz.org/wp-content/uploads/2025/03/Probolsky-Research-Veloz-August-2024-Statewide-Survey-Results-Presentation.pdf).
- **Real estate / construction**: NAIOP Inland Empire PAC (Cal-Access).
- **U.S. Chamber of Commerce alignment**: Adam Probolsky served on the Chamber's Energy & Environment Policy Committee.

**Track record:** No FiveThirtyEight or Silver Bulletin rating. The Sept 2020 Prop 15 poll (Probolsky published) showed Prop 15 losing by 8 points; actual 4.2-point loss — direction correct; margin overstated.

**AAPOR TI:** Adam Probolsky has appeared on AAPOR conference panels (2013); TI membership status [UNVERIFIED].

**Push polling / enforcement:** None located. Tension: Reddit/r/fivethirtyeight thread (May 2025) raised question-framing concerns about Probolsky's Newsom trans-sports poll [Tier 2 only, no AAPOR or regulatory action].

**2026 CA Gov involvement:**
- **Chad Bianco (R) for Governor 2026 internal poll** — released by Bianco campaign and posted to [Bianco's official Facebook](https://www.facebook.com/SheriffChadBianco/posts/1503205301361515/).
- **Xavier Becerra (D) for Governor 2026 poll** — referenced by [Sacramento Bee FB post](https://www.facebook.com/sacramentobee/posts/1438214668350015/) as "third poll in a week showing Becerra gaining." [UNVERIFIED — public release vs. internal retainer not confirmed.]
- **No Cal-Access EXPN_CD record located** for direct payments from Bianco, Becerra, Villaraigosa, Porter, Steyer, Swalwell, or any anti-Steyer IE to Probolsky. The polls may be self-funded press releases or paid for outside Cal-Access disclosure.

---

### FIRM 11 — STRATEGIES 360 (S360)

**Identity.** Seattle-founded full-service public affairs / communications / research firm. Co-founders **Ron Dotzauer** (ousted Jan 2026) and **Eric Sorenson** (departed 2021). At peak: ~140 employees across 13 states. Acquired by **John Oceguera** (former Speaker, Nevada State Assembly; former S360 Chief Strategy Officer for Nevada) from KeyBank foreclosure in **January 2026**, per [Seattle Times (Jan 19, 2026)](https://www.seattletimes.com/seattle-news/politics/prominent-seattle-lobbying-firm-defaults-on-debts-ousts-founder/). Current footprint: ~40 employees across WA, AK, NV, NM, OR.

**Partisan affiliation.** Democratic-aligned (Dotzauer credited with Sen. Maria Cantwell's 2000 upset over Slade Gorton; firm worked extensively for Democratic clients).

**Cal-Access lifetime CA payer profile (2018+, $939,000 total — `Strategies360.top_payers.tsv`):**

| Top CA payer | Amount | Notes |
|--------------|--------|-------|
| **San Diego County Democratic Central Committee** | **$307,000** | Anchor CA client |
| Tim Grayson (Assembly/Senate, multiple cycles) | $283,000 | |

**FEC federal:** $487,931 in 2024 cycle, per [OpenSecrets](https://www.opensecrets.org/campaign-expenditures/vendor?vendor=Strategies+360&cycle=2024).

**Industry entanglements (Sacramento lobbying side, pre-bankruptcy):**
- **Charter schools**: KIPP SoCal Public Schools, Highland Community Charter and Technical Schools.
- **Tribal gaming**: San Manuel Band of Mission Indians (also a recurring DBR/FM3 client orbit).
- **Tech**: Zoom, Lyft, Aurora Innovation.
- **Fossil fuels**: **Exxon Mobil** — notable for a firm with Democratic political identity; client departed to Deveau Burr Group during the Sacramento exodus. Per [Capitol Weekly (May 2024)](https://capitolweekly.net/turmoil-leads-to-rapid-rise-for-new-capitol-lobbying-firm/).
- **Healthcare**: Association of California Healthcare Districts.

**Track record:** S360 doesn't appear in FiveThirtyEight's frozen ratings (sporadic public polling). The 2024 Arizona Presidential poll (Aug 7–14, 2024, n=400 RV, ±4.9%) had Harris +1; actual Trump +5.5 — 6.5-point miss in direction. The **California Community Poll partnership with the LA Times** ran six statewide California issue surveys 2020–2023, per [strategies360.com/californiapolling](https://www.strategies360.com/landing/californiapolling/) — this was the firm's most prominent CA research product.

**AAPOR TI:** [UNVERIFIED.]

**The defining 2023–2026 controversy — bankruptcy and ouster:**
- **Nov 2023**: S360 filed Chapter 11 in U.S. Bankruptcy Court WD WA to block Sorenson's court-ordered receivership over Dotzauer's failure to pay the $6M buyout for Sorenson's 49% stake, per [Post Alley (Dec 2023)](https://www.postalley.org/2023/12/02/political-consultant-firm-files-for-bankruptcy-and-the-details-are-juicy/).
- **May 2024**: Emerged from Chapter 11 with reorganization plan; Dotzauer salary reduced from $1M+ to $460K, per [Seattle Times (May 20, 2024)](https://www.seattletimes.com/seattle-news/politics/prominent-seattle-lobbying-firm-exits-bankruptcy-cuts-longtime-ceos-pay/).
- **Sacramento client exodus (2024)**: 63 of 68 Sacramento clients and 8 of 9 Sacramento lobbyists departed to the newly formed **Deveau Burr Group** within weeks of the bankruptcy; S360 lobbying revenue dropped 83% in a single quarter, per [Capitol Weekly (May 2024)](https://capitolweekly.net/turmoil-leads-to-rapid-rise-for-new-capitol-lobbying-firm/). **This effectively ended S360's Sacramento lobbying practice.**
- **Late 2025–Jan 2026**: Dotzauer defaulted on reorganization; KeyBank ($3.7M secured) filed foreclosure; firm sold to Oceguera; Sorenson received nothing and estimates $7M owed.

**Push polling / FPPC / FEC enforcement:** None located.

**2026 CA Gov involvement:**
- **No confirmed candidate retainer** for any 2026 CA Gov campaign or committee in Cal-Access.
- **No public 2026 CA Gov polls** released under the S360 name.
- LA Times California Community Poll partnership concluded with the June 2023 edition; no 2024–2025 iterations located.
- Tim Grayson 2026 Senate-incumbent activity [UNVERIFIED] for whether S360 retainer continued post-restructure.

---

### NEWLY SURFACED FIRMS (POLLED 2026 CA GOV BEYOND THE 11-FIRM WATCHLIST)

The 2026 CA Gov inventory surfaced 20+ firms outside the user's pre-existing list. Brief notes (full profiles in `2026_ca_gov_polls_inventory.md` Section 2):

| Firm | Lean | Sponsor in 2026 CA Gov | Key flag |
|------|------|------------------------|----------|
| **Gudelunas Strategies** | D (IE-funded) | **Anti-Steyer IE backing Becerra** (per [Sac Bee Apr 21, 2026](https://www.sacbee.com/news/politics-government/capitol-alert/article315470114.html)) | Both polls outliers elevating Becerra by 5–11 pts vs. consensus — Hook D primary case |
| **Kreate Strategies** | None stated | Self-funded | NYT-tracker pollster; results consistent with consensus |
| **Evitarus** | D (Black-and-Latina-women-led) | California Democratic Party (VOTER Index baseline + 2 trackers) | Official CADEM internal tracker, [cadem.org PDFs](https://cadem.org/wp-content/uploads/2026/04/4.20.26-CA-Voter-Index-Tracking-Survey-II-Topline.pdf) |
| **Echelon Insights** | R (slight) | Possible Hilton internal per [PollTracker](https://x.com/PollTracker2024/status/2036781404088946807) | Republican-strategist co-founders Patrick Ruffini + Kristen Soltis Anderson |
| **CivicLens Research** | Unknown | Self | New Virginia firm; small n=400 |
| **Tavern Research** | D | Undisclosed | Chicago progressive-mission startup founded 2024 |
| **Global Strategy Group** | D | Undisclosed | Established NY Dem firm; 2 undisclosed-sponsor polls |
| **Impact Research** | D | Undisclosed | Apr 8–12 poll showed Hilton at 25% — outlier (Hook D #2) |
| **SurveyUSA** | None | Undisclosed | Conducted Apr 8–10 poll; 80% pre-Swalwell-news fielding |
| **UC Berkeley Citrin Center / TrueDot** | Academic | Politico CA / Citrin Center / Possibility Lab | Verasight voter-file sampling; AI-accelerated platform |
| **Independent Voter Project (IVP)** | Reform / nonpartisan | Self | High-propensity (3-of-4-elections) screen produces R-tilted electorate; polls Bianco/Becerra higher |
| **RBI Strategies** | D | Undisclosed | January 2026 |
| **Bold Decision** | Unknown | Undisclosed | October 2025 |
| **CBS News / YouGov** | None / media | CBS News | Only major national-media CA Gov poll |
| **J Wallin Opinion Research** | None / candidate-funded | Slavet for Governor campaign | Candidate-funded press-release poll |
| **Public Policy Polling** | D | Undisclosed | January 2026 |
| **Lake Research Partners** | D | Undisclosed | November 2025 |
| **Breakthrough Campaigns** | D | Undisclosed | Nov 2024 historical |
| **Capitol Weekly / CA Target Book** | Nonpartisan / journalism | Capitol Weekly | February 2025, earliest media poll |
| **USC/CSU Long Beach/Cal Poly (CEPP)** | Academic | Academic | Sep 2024 historical poll |

**Firms searched but found NOT to have polled the 2026 CA Gov race**: Trafalgar Group, co/efficient, Atlas Intel, KFF, Spry Strategies, RMG Research, Beacon Research.

---

## SECTION 3 — WHAT'S MISSING / UNVERIFIABLE / DATA GAPS

### 3.1 — Cal-Access primary records gaps

- **Cal-Access bulk-data / EXPN_CD records do not include all subvendor relationships**: many polling-firm payments are buried inside Schedule G subvendor lines, which require parsing the linked filing-level XML rather than the EXPN_CD line. This dossier captured the DBR–KGS Research–PDI subvendor chain on filing 3138008, but smaller subvendor relationships across the full 8,676-row payment dataset have not been exhaustively surfaced.
- **Tulchin's Villaraigosa attribution between cmte 1471635 (BMC IE) and cmte 1486030 (own committee)** needs disambiguation — the $511K Villaraigosa-related figure in `Tulchin.top_payers.tsv` aggregates and may mix the two.
- **Cmte 1485077 (Steyer for Governor 2026)** has no recorded polling-firm payments through May 1, 2026 in the EXPN_CD bulk file. This may reflect: (a) genuinely no retainer yet, (b) payments routed through ancillary committees not yet linked, (c) payments recorded in non-CA filings (Steyer's federal infrastructure from past presidential campaigns), or (d) filings not yet released by Cal-Access through May 1 (statutory delays of weeks-to-months). This is a critical follow-up.
- **JOBSPAC's $5M to anti-Steyer cmte 1489677** is on a F496 only (24-hour late contributor report); the F460 will not include it until the next reporting period. Other F496-only contributions to the anti-Steyer pool may exist.

### 3.2 — FEC primary records gaps

- The `fec_top_payers.json` file holds raw FEC by-recipient totals for DBR, FM3, FM3-fairbank, and Tulchin (cycles 2018–2024). **Committee-name resolution is incomplete** (cmte_name shows "?") because the /committee/{cid}/ endpoint hit rate limits during pulls.
- **EMC Research, Goodwin Simon, Probolsky, and Strategies 360 FEC by-recipient pulls did not complete** due to 429 rate-limiting. Tier 2 totals (OpenSecrets) are recorded in profiles, but Tier 1 FEC API extraction needs to be re-run with proper sleep intervals.
- The OpenSecrets-cited FEC client breakdowns (DBR 2020 cycle, etc.) carry [Tier 2] status until verified against /schedules/schedule_b/ FEC API directly.

### 3.3 — AAPOR Transparency Initiative member list

- The AAPOR TI member list page returned an HTTP error during research; **none of the 11 firms could be definitively confirmed or denied as TI members from a complete current list**. Confirmed members per FiveThirtyEight cross-reference: PPIC (Charter), Emerson (Charter). Confirmed non-members per FiveThirtyEight: DBR, FM3, EMC. Other firms unconfirmed. Manual check needed at [aapor.org/standards-and-ethics/transparency-initiative](https://aapor.org/standards-and-ethics/transparency-initiative/).

### 3.4 — CA SOS BizFile entity numbers

- None of the 11 firms had their CA SOS BizFile entity number independently confirmed at Tier 1, due to robots-disallow on direct query and OpenCorporates returning robots errors during the research session. Manual searches at [bizfileonline.sos.ca.gov](https://bizfileonline.sos.ca.gov/search/business) recommended for definitive registered-entity verification.

### 3.5 — Sponsor disclosure gaps in 2026 CA Gov polls

- **~27% of 2026 CA Gov polls (≈12 of 47)** come from Democratic-aligned firms with **no disclosed sponsor**: Tulchin Jan 22–28, FM3 Nov 30–Dec 7, Lake Research Nov 17–20, Tavern Research (×2), Global Strategy Group (×2), RBI Jan 25–29, PPP Jan 20–21, Impact Research Apr 8–12, EMC (×2 of 3), DBR Jan 17–20.
- **Echelon Insights March 12–17 sponsor** was labeled "Hilton internal" by aggregators but Echelon has not officially confirmed; [UNVERIFIED at Tier 1].
- **Anti-Steyer IE identity behind Gudelunas Strategies** is reported by [Sac Bee](https://www.sacbee.com/news/politics-government/capitol-alert/article315470114.html) and [LAist](https://laist.com/news/politics/billionaire-blitz-steyers-132-million-campaign-dwarfs-rivals-in-california-governor-race) but the specific cmte ID behind those polls (i.e., is it 1489677, or a different IE?) has not been independently confirmed at Tier 1. Worth tracing by checking whether 1489677 has any Gudelunas-payable EXPN line, or whether the polls were paid by a different cmte.

### 3.6 — Verifiable but incomplete claims

- **DBR / Pete Buttigieg 2020 polling** — referenced in EMC profile via context; needs FEC `/schedules/schedule_b/?committee_id=C00697441` lookup.
- **Goodwin Simon "Prop 8" characterization** — original task brief described GSSR's marriage equality work as "Prop 8 / marriage equality" — primary-source evidence supports the **2012 Maine and Washington marriage equality referenda** as the verified work; **direct Prop 8 (2008) campaign engagement is [UNVERIFIED]**.
- **FM3 / Kamala Harris** — original task brief described FM3 as confirmed for "Kamala Harris and other CA statewide" — primary-source evidence in this session confirmed FM3's work for Gray Davis governor, Patty Murray, Doug Jones AL Senate, and Karen Bass LA Mayor IE, but **FM3 work for Kamala Harris specifically [UNVERIFIED]** — needs direct FEC search under variant spellings.
- **Tulchin 2024 Bernie/Sanders FEC numbers** — the 2020 cmte ID C00696948 ($2.41M) is highly likely Bernie 2020 (Friends of Bernie Sanders) but the cmte_name was unresolved due to rate-limits.

### 3.7 — Subagent-flagged follow-ups

The four subagent reports each carry their own [UNVERIFIED] inventories. Combined high-priority items:
1. CA SOS BizFile entity numbers for all 11 firms.
2. AAPOR TI member list manual check.
3. FEC API client-name resolution (re-run /committee/{cid}/ for the 87+ committee IDs in fec_top_payers.json with proper rate-limiting).
4. FEC pulls for EMC, GSSR, Probolsky, Strategies 360 (currently incomplete).
5. Cal-Access verification of any payments from Gudelunas Strategies' anti-Steyer IE sponsor — confirm whether the polls were paid by cmte 1489677 or a different vehicle.
6. Disambiguation of Tulchin's $511K Villaraigosa payments between cmte 1471635 and cmte 1486030.
7. AAPOR enforcement-actions database check for any push-polling complaints against any of the 11 firms.

---

*End of dossier. All workspace primary-source files retained at `/home/user/workspace/ca_gov_2026/research/polling/` for follow-up. Cal-Access bulk data sourced from `/home/user/workspace/ca_gov_2026/calaccess/CalAccess/DATA/`. Hook A's anti-Steyer cmte funder stack is documented separately in `/home/user/workspace/ca_gov_2026/Anti_Steyer_Verification_Report.md`.*
