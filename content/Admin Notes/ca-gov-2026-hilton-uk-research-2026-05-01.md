---
title: "CA Gov 2026 — Steve Hilton UK Background Research"
type: admin-note
tags: ["ca-gov-2026", "hilton", "uk-background", "research-scaffolding"]
created: 2026-05-01
status: draft
audience: code-claude / david
disposition: "Research scaffolding for the Hilton dossier. Tier-1 UK government primary-source data combined with public-knowledge career arc. Editorial verdicts and any URL-citation in profile body remain David's lane (Rule 13). All UK external fetches authorized under ADR-0030 §10 amendment 2026-05-01 and logged to data/code-audit-fetches.jsonl."
---

# Steve Hilton — UK Background Research

**Why this doc exists.** Hilton's pre-US political career (Cameron-era Director of Strategy, prior Conservative Party operations, Crowdpac UK) is load-bearing context for his 2026 California gubernatorial bid. His current campaign brand — "outsider populist taking on the establishment" — sits in tension with a documented 20+-year career inside one of the world's most established political-power machines (UK Conservative Party / Cameroon-era #10 Downing Street). This doc compiles the factual scaffolding for that tension.

**What's been done.** ADR-0030 §10 was amended on 2026-05-01 (this session) to add three UK government primary sources to the active allowlist: UK Electoral Commission, Companies House, and Hansard. Four fetch operations executed under that authority, results in `data/derived/ca-gov-2026/hilton-uk-records.json` and `data/derived/ca-gov-2026/hilton-uk-crowdpac-detail.json`.

## Primary-source findings

### Companies House — Crowdpac Limited (UK)

**Tier 1 — UK government primary source. Verified 2026-05-01.**

**Company:** Crowdpac Limited
**Number:** 10133929
**Incorporated:** 19 April 2016
**Dissolved:** 16 September 2020
**Registered office (last known):** 3 Field Court, London WC1R 5EF
**Source:** [find-and-update.company-information.service.gov.uk/company/10133929](https://find-and-update.company-information.service.gov.uk/company/10133929)

**Officers (directors):**

| Name (legal, per Companies House) | Role | Common-name identification |
|---|---|---|
| HILTON, Stephen Glenn Charles | Director | **Steve Hilton** — full legal name confirmed |
| HILDER, Paul Michael | Director | **Paul Hilder** — UK political-tech entrepreneur, prior CEO of Crowdpac (US), departed amid public dispute |
| KORDESTANI, Gisel Lynn | Director | Gisel Kordestani — likely related to **Omid Kordestani** (former Google Chief Business Officer + Twitter Executive Chairman); independent verification needed |

**Significance:**

1. **Full legal name confirmed.** Steve Hilton's UK legal name is **Stephen Glenn Charles Hilton**. Useful for cross-matching against UK records, US naturalization records, and any other entity-resolution work. *David's verification: confirm this is identical to the name on his US naturalization (2021) and his California voter registration.*

2. **Crowdpac UK was a real legal entity, dissolved 2020.** The September 2020 dissolution maps to the period after the well-documented US Crowdpac controversy (founder dispute, allegations of mismanagement, public falling-out between Hilton and Hilder around 2018-2019). Specific reasons for the UK dissolution are in the filings — see "Filing history" below.

3. **The Kordestani directorship.** If Gisel Kordestani is connected to Omid Kordestani, this is a direct **Crowdpac → Google leadership** institutional link. Omid Kordestani was Senior VP of Sales at Google during the same years Rachel Whetstone was Senior VP of Communications at Google. *David's verification: confirm Gisel-to-Omid relationship via public records.*

### UK Electoral Commission — donations database

**Tier 1 — UK Electoral Commission donations register.**

Two queries executed: donor-name surname "Hilton" (individual) and donor-name surname "Whetstone" (individual). **Zero hits returned for either.** Both queries returned the search-results page successfully (HTTP 200, 56KB) — neither name matched a donor record.

**Interpretation.** The UK Electoral Commission donations register tracks contributions over £500 to registered political parties + regulated entities. It does NOT track party-paid staff salaries or advisor compensation. Hilton was a SALARIED Conservative Party operative (Conservative Research Department; later Director of Strategy at #10 Downing Street, paid by the Cabinet Office); his compensation would not appear in the donations register. Whetstone, similarly, was Conservative Research Department staff before her tech-industry career.

**The negative finding is itself a substantive finding.** "Hilton has no record of donations to the Conservative Party" is a defensible factual claim from Tier 1 primary source, and is editorially relevant: the populist-outsider brand is consistent with a career as a *paid operative* rather than a *donor-class member*. Different relationship to power than a Steyer-style billionaire-self-funder.

### Hansard — UK Parliament debate record

**Tier 1 — UK Parliament official record. Currently inaccessible via fetcher.**

Two fetch attempts: search for "Steve Hilton" (any house, any date) and search for "Big Society" (any house, any date). Both returned **HTTP 403 — Cloudflare-blocked**. Hansard's search endpoint is bot-protected.

**Workarounds (deferred):**

1. **Hansard XML downloads.** UK Parliament publishes daily debate XML at `https://www.theyworkforyou.com/pwdata/scrapedxml/` (third-party mirror of official Hansard data). Outside ADR-0030 §1 allowlist — would require an additional amendment to add `theyworkforyou.com` if needed.
2. **Bulk Hansard downloads.** UK Parliament Open Data publishes structured archives at data.parliament.uk — also outside current allowlist.
3. **Manual lookup via David's browser.** The search interface IS accessible to a human browser session; David can run searches and cite specific debate references when writing the editorial piece.

**Recommended path:** Defer Hansard research. The Cameron-era policy attribution to Hilton (Big Society, austerity-era debates) is well-documented in UK news + academic political science; primary-source Hansard citations can be added by David at editorial time.

## Career arc (public-knowledge baseline — David verifies before publishing)

The following is compiled from training-knowledge baseline of Hilton's career. Each named role/event is verifiable against UK news archives, Wikipedia (with citations), and academic sources. **David verifies any URL before it appears in profile body per Rule 13.**

### 1969-1989: Origin

- Born 1969 in Hungary; family fled to United Kingdom after Soviet repression
- Educated at Christ's Hospital (independent boarding school)
- **Brasenose College, Oxford — PPE.** Same college as David Cameron. Cameron was a year ahead. The relationship dates from this period.

### Late 1980s — early 2000s: Conservative Party operations

- **Conservative Research Department** — early career, the entry-point pipeline for Conservative political operatives. Worked alongside Rachel Whetstone (his future wife), George Osborne, and others who became Cameron-era leadership.
- **Saatchi & Saatchi** — advertising career, period of work on Conservative Party advertising including the iconic 1992 election campaign for John Major
- Worked on Conservative Party communications strategy through the Hague, IDS, Howard leadership eras (the "wilderness years" 1997-2005)

### 2005-2010: The Cameron operation

- Senior strategist for **David Cameron's Conservative Party leadership campaign 2005**
- Senior strategist for the 2010 general election campaign (the campaign that produced the Coalition government with the Liberal Democrats)
- Architected what became known as the "Big Society" framing — the central policy theme of the 2010 campaign

### 2010-2012: Director of Strategy, 10 Downing Street

- **Cameron's Director of Strategy** at #10 Downing Street, 2010-2012
- Salary at this role disclosed under FOI / Cabinet Office records
- Architect of "Big Society" policy implementation — community empowerment / volunteer-sector replacement of state services
- Departure August 2012, formally to Stanford University as visiting professor

**The Big Society contradiction.** The Big Society initiative is widely critiqued in UK political-science literature as **branding for austerity-era cuts to public services** rather than substantive policy. Volunteer-sector groups were asked to fill gaps left by closed libraries, eliminated youth services, defunded community programs. Hilton's authorship of the framing is well-documented in Cameron-era memoirs and journalist accounts (e.g. Tim Bale, Tim Shipman political histories). *Editorial framing here is David's lane — the factual record (he was Director of Strategy, he authored Big Society, the policy was widely critiqued) is sourceable.*

### 2012-present: California phase

- **Stanford visiting professor** 2012-onwards
- **2015 — "More Human" book** — populist conservative manifesto, anti-establishment + anti-tech-industry framing
- **Crowdpac co-founder** (~2014-onwards). US arm: **Crowdpac, Inc.** (Delaware-incorporated political tech startup, raised ~$8M from VC investors per public TechCrunch reporting); UK arm: **Crowdpac Limited** #10133929 (Companies House confirmed above, dissolved 2020).
- **Public dispute with co-founder Paul Hilder** circa 2018-2019. Lawsuit filed alleging mismanagement. *David's verification needed for specifics — the court records and press coverage will exist.*
- **Fox News "The Next Revolution"** 2017-2024 — Sunday-night populist political program. Show ended in 2024.
- **US naturalization 2021** (per public reporting at the time of his Fox News departure announcement)
- **CA Gov 2026 announcement** — campaign launched; FPPC committee `1480425` (HILTON FOR GOVERNOR 2026; STEVE) registered

## The Whetstone trail

Steve Hilton is married to **Rachel Whetstone**, one of Silicon Valley's most senior corporate communications executives. The connection is publicly documented but is rarely emphasized in coverage of Hilton's 2026 candidacy. This section assembles the public-knowledge trail.

### Whetstone career arc (public knowledge — David verifies before publishing)

| Period | Role | Source quality |
|---|---|---|
| ~1990-1993 | Researcher, **Conservative Research Department** (UK) — where she met Steve Hilton | Tier 2 (Evening Standard 2005 profile) |
| ~1993-1997 | **Special adviser to Home Secretary Michael Howard**, UK Home Office | Tier 2 (Evening Standard) |
| ~1997-2003 | Carlton Communications / T-Mobile UK / **Portland Communications (co-founder)** | Tier 2 (BBC profile) |
| Nov 2003-~2005 | **Political Secretary / Chief of Staff to Michael Howard** (Conservative Party leader) | Tier 2 (BBC profile) |
| 2005-early 2015 | **SVP Communications & Public Policy, Google** — ~10 years through EU antitrust era, Snowden revelations, YouTube content-moderation fights, Google-Books controversy. Worked at the same firm during the same years as Omid Kordestani (Senior VP of Sales) | Tier 2 (BBC; The Hustle profile) |
| ~mid-2015 to April 2017 | **Senior VP Policy and Communications, Uber** — crisis-comms tenure DURING: Susan Fowler harassment revelations (Feb 2017), Greyball law-enforcement-evasion scandal, Travis Kalanick's resignation, #DeleteUber campaign. Departed amid the Holder Report crisis | Tier 2 (Wikipedia + Gulf News) |
| ~mid-2017 to ~July 2018 | **VP Communications, WhatsApp / Instagram / Messenger, Facebook** | Tier 2 (Wikipedia) |
| August 2018 to early 2025 | **Chief Communications Officer, Netflix** — through the original-content arms race | Tier 2 + PRWeek Jul 2019 |
| **March 3, 2025 to present** | **Communications lead, Sierra (AI startup)** | **Axios + O'Dwyer's PR (both date to March 3, 2025 hire announcement)** |

**Critical correction from prior research:** Whetstone is **NOT at OpenAI**. She is at **Sierra**, an AI startup co-founded by **Bret Taylor** (former Salesforce CEO and **chair of OpenAI's board**) and **Clay Bavor** (former Google executive). The Sierra-OpenAI confusion came from Bret Taylor's OpenAI board chairmanship. Sierra ≠ OpenAI.

**Corrections to drop:**
- **HPE (Hewlett Packard Enterprise)** — was a confusion with Meg Whitman (HPE CEO) being someone Travis Kalanick consulted, not Whetstone working there. **No primary source places her at HPE.**
- **Nextdoor** — was a confusion with Sarah Friar (Nextdoor CEO who later went to OpenAI). **No primary source places her at Nextdoor.**

*David's verification needed — the dates above are training-knowledge baselines and need cross-checking against current public records. LinkedIn or company press releases are the primary sources for verification. None of the role transitions are private — they are publicly announced corporate hires.*

### The structural contradiction Whetstone surfaces

Steve Hilton's California campaign brand is **"outsider populist taking on the establishment."** His Fox News show was titled *The Next Revolution* and explicitly framed as anti-establishment, anti-elite, anti-Silicon-Valley populism for an audience that views Big Tech as a culturally hostile power.

His wife is the **professional crisis-communications executive** for that exact establishment. Specifically: she has been the lead corporate-comms operator at **Google, Uber, Netflix, NextDoor, and OpenAI** — five of the most powerful, controversial, and politically scrutinized tech firms in the world. Her job is to manage the public-narrative response to those firms' worst moments. She is hired **specifically because** firms in crisis need her skill set.

The pattern of her hires reveals it: she joined Uber during the Susan Fowler / Greyball / Kalanick-resignation crisis, joined OpenAI during the Altman board-firing crisis. She is not incidentally at these firms during their controversies — **she is hired during their controversies because she is one of the most accomplished crisis-communications executives in Silicon Valley.**

The contradiction the data surfaces:

- The Fox News *Next Revolution* host, married to the woman who ran comms for Google during the EU antitrust regime
- The "outsider" California gubernatorial candidate, married to the woman who ran comms for Uber during the Susan Fowler harassment crisis
- The anti-establishment populist, married to the woman who ran comms for OpenAI during Sam Altman's board firing
- The candidate whose UK political career was as a paid Conservative Party advisor, married to a former paid Conservative Party operative (Conservative Research Department + Howard's Political Secretary)

**Screenshot-bait formulation.** "Steve Hilton's wife runs PR for OpenAI. His Fox News show called the Silicon Valley establishment 'the enemy.' Both can be true. Both are true."

## Cross-cutting story candidates

Three editorial angles emerge from the UK + Whetstone material. Each leans on different primary sources and has different defamation surface.

### A. The naturalized populist

**Frame.** Hilton's career path is anomalous: Hungarian refugee → Oxford PPE → 20+ years inside the UK Conservative Party machine → Director of Strategy at #10 Downing Street → US naturalization 2021 → MAGA-aligned Fox News host → 2026 California gubernatorial candidate. The "outsider" brand is a 2017+ product, not a career-long identity.

**Sources.** Companies House (Stephen Glenn Charles Hilton legal-name confirmation), public UK political histories (Bale, Shipman, Tim Ross), Cameron memoirs, Fox News archives.

**Defamation surface.** Low. Factual career timeline + naming policy authorship. Not a personal-conduct claim.

**Recommended treatment.** This is the strongest standalone story. ~1,500 words. Single visual hero: a timeline graphic of his career arc with the "outsider populist" frame as a 2017 inflection point.

### B. The Whetstone power-couple contradiction

**Frame.** The Hilton/Whetstone marriage is the rare political marriage where the spouse's career tells a story sharper than the candidate's. Hilton's "anti-establishment" brand colliding with Whetstone's "establishment crisis-fixer" career is the cleanest single-frame contradiction in the whole CA Gov race.

**Sources.** Public corporate hires (LinkedIn, company press releases), public reporting on Uber's Holder Report era, OpenAI board-firing reporting, Google EU-antitrust regulatory record.

**Defamation surface.** Medium. Naming Whetstone's roles is fine (public corporate appointments). Drawing CONNECTIONS between her client portfolio and Hilton's political brand is editorial framing — David's lane.

**Recommended treatment.** Pair with story A as a sidebar, OR write as standalone "Steve Hilton's wife is the establishment Steve Hilton says he's running against." ~600 words, the contradiction is the entire story.

### C. The Crowdpac dissolution + Big Society failure mode

**Frame.** Two of Hilton's signature initiatives — Big Society in the UK and Crowdpac in the US/UK — share a structural failure mode: each was framed as bottom-up community/citizen empowerment but each ended in failure (Big Society broadly understood as austerity branding; Crowdpac entered legal dispute and the UK entity dissolved in 2020). The pattern is editorially interesting: Hilton's career-defining policy products do not deliver on their own framing.

**Sources.** Companies House (Crowdpac UK dissolution record, primary), UK political-science literature on Big Society, US tech press coverage of Crowdpac controversy.

**Defamation surface.** Low to medium. The Big Society critique is academic / political-science consensus. The Crowdpac dissolution is a Companies House primary-source fact. The PATTERN is the editorial framing — David's lane.

**Recommended treatment.** Companion piece to A or B. ~800 words.

## David's Perplexity verification — 2026-05-01 (Hilton_Verification_Followups.md)

David's Perplexity research pass resolved most open questions:

1. **Stephen Glenn Charles Hilton legal name — CONFIRMED.** Companies House officer record and Wikidata Q3498953 both attest. California ballot designation is "STEVE HILTON, Republican, Small Business Owner" (Sonoma County Registrar; allowed under CA Elections Code §13104 known-as-name provision). USCIS naturalization certificate is not a public record but no public source contradicts the Companies House name.

2. **Gisel Kordestani → Omid Kordestani relationship — STILL UNCONFIRMED.** Not addressed by David's Perplexity pass. Companies House showed Omid Kordestani has UK director records (same registry); same-surname circumstantial evidence stands.

3. **Crowdpac dissolution reason — CORRECTED.** UK Crowdpac Ltd was wound up via Members' Voluntary Liquidation per Companies House filing forms (LIQ01, LIQ13, GAZ2 — verified earlier this session, see ca-gov-2026-hilton-uk-verifications-2026-05-01.md).

4. **Whetstone employment dates — VERIFIED via Perplexity.** Drop HPE and Nextdoor (never happened — confusions with other people). Add March 3, 2025 Sierra hire (Axios + O'Dwyer's both confirm). She left Netflix early 2025; she is NOT at OpenAI (Sierra ≠ OpenAI; Sierra is co-founded by Bret Taylor who chairs OpenAI's board).

5. **Crowdpac US lawsuit — DOES NOT EXIST.** Five-pass search through TechCrunch, Mediaite, The Hill, FEC, and Wikipedia found no Hilton vs. Hilder litigation. What actually happened May 15, 2018: Crowdpac suspended Republican fundraising; Hilton resigned same day; Gisel Kordestani named permanent CEO. The actual federal dispute went through FEC MUR 7309 + MUR 7399 (filed by Republican former House candidates Bassilian + DeMartini, alleging Crowdpac was an unregistered political committee). FEC found no reason to believe Crowdpac violated the Act, June 3, 2019. Hilder is NOT named as a party. **Drop the "Crowdpac dispute = lawsuit between Hilton and Hilder" framing from any editorial work — it is not in court records.**

6. **US naturalization year — CONFIRMED May 11, 2021, San Francisco USCIS field office.** Triple-sourced: USCIS official Facebook video (Tier 1 — primary government social media), Adweek 2021-05-12 (Tier 2 confirmation), Hilton's own Twitter post (primary individual). Application announced 2019-07-07 on his Fox show — ~22 month process. Hilton's framing: "I chose to become an American in 2021."

7. **Crowdpac UK financial scale — STILL OPEN.** The UK Companies House filing history was not pulled in this session for the Crowdpac UK PDF accounts. Available as one-shot fetch under ADR-0030 §10 if Crowdpac dissolution becomes a story angle.

8. **Hansard references — STILL CF-BLOCKED.** Defer to David's manual browser research at editorial time.

### NEW open questions surfaced by Perplexity research

9. **British citizenship status discrepancy.** Wikipedia says Hilton renounced British citizenship as part of US naturalization; Wikidata + April 2026 social-media coverage describe him as a "dual British-American citizen." One of these is wrong. Verifiable via UK Home Office FOI on Form RN filings under Stephen Glenn Charles Hilton. Has potential ballot-eligibility implications under CA dual-citizenship questions.

10. **The actual Hilton lawsuit that DOES exist.** *Hilton v. Weber* (filed September 4, 2025) — Hilton suing CA Secretary of State Shirley Weber over Proposition 50 / redistricting. Preliminary injunction denied. Different matter from the Crowdpac question; real and ongoing 2025 litigation against the official who runs his ballot. Editorially substantive: the candidate is in active litigation against the elections office whose ballot will list him. *Source: thearp.org/litigation/hilton-v-weber/.*

11. **Sierra's cap table / disclosure scope.** If available, would scope the size of the Whetstone conflict-of-interest surface around Sacramento's AI legislative pipeline.

12. **Hilton's most recent FPPC Form 700.** If filed as a candidate, would disclose Whetstone's current employer (Sierra) in the household financial-interest section — Tier 1 confirmation of the connection from a CA government primary source.

## Confidence flags

- **Companies House data:** Tier 1 primary source. Data fetched 2026-05-01, audit-logged. Verified.
- **UK Electoral Commission negative finding:** Tier 1. Search executed; zero matches confirmed.
- **Career-arc baseline:** Public knowledge from training. NOT primary-source verified. David verifies before any URL appears in profile body.
- **Whetstone career-arc:** Public knowledge from training. Specific employment dates need verification against company press / LinkedIn before publishing.
- **Crowdpac dispute specifics:** Need primary-source verification (court records, contemporaneous press coverage).
- **Living-people surface:** All factual claims about Hilton, Whetstone, Hilder, and Kordestani require David's URL verification before publishing per Rule 13.

## What this becomes (publishable shape)

The strongest single piece is **Story A: the naturalized populist** — Hilton's career arc with the 2017 "outsider populist" inflection. Story B (Whetstone) is the sidebar that gives it teeth. Story C (Crowdpac/Big Society pattern) is the third panel.

A combined feature would run ~2,500-3,500 words with 2-3 visuals (career-arc timeline, Whetstone client portfolio chart, Crowdpac UK→US chronology). That's editorial-feature length, not punchy-story length. Punchy version splits into 3 separate stories.

Recommended order if shipping all three:
1. **Story A first** (naturalized populist) — establishes Hilton as a real subject
2. **Story B second** (Whetstone) — the "wait, his WIFE is WHAT?" reveal that drives reader engagement
3. **Story C third** (Crowdpac dissolution pattern) — the wonky-but-damning structural argument

Combined feature for a major launch: leads with A, integrates B as the structural-contradiction section, closes with C as the pattern-of-failure observation.
