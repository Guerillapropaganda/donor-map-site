---
title: "Sources Master Node"
type: reference
content-readiness: ready
last-updated: 2026-03-26
source-tier: null
parent: null
---


#sources #methodology #reference #research-tools #databases #vault-maintenance

related: [[Research Methodology and Data Sources]] [[Session Timeline]]

---

### Purpose

One-stop reference for every research database, investigative outlet, and primary source repository used across The Donor Map Database. When building or expanding a profile, start here to know which sources to check, what data each provides, and what tier rating to assign.

---

### Tier 1 — Primary Documents & Government Records

These are the highest-authority sources. Government filings, official records, and primary documents. Always check these first. Every claim backed by a Tier 1 source is on the strongest possible evidentiary footing.

### Federal Campaign Finance

**API-FIRST RULE:** For all federal campaign finance data, use the FEC API before browsing OpenSecrets or FEC.gov manually. The API returns structured JSON with more complete results than the web interface. See [[API Pipeline]] and `api-toolkit.js` for implementation.

| Source | URL | What It Provides | Best For |
|--------|-----|------------------|----------|
| **FEC API** ⭐ | [api.open.fec.gov](https://api.open.fec.gov/v1/) | Raw FEC data via REST API. Individual contributions (`/schedule_a/`), candidate totals (`/candidates/totals/`), independent expenditures (`/schedule_e/`), committee data. Returns structured JSON. | **Primary source for ALL federal donation data.** Use before OpenSecrets or FEC.gov web interface. Open CORS — works from any Chrome page. DEMO_KEY available, registered key for 1,000 calls/hr. **TESTED AND WORKING.** |
| **USASpending API** ⭐ | [api.usaspending.gov](https://api.usaspending.gov/api/v2/) | Federal contracts and grants by recipient, agency spending profiles. No auth required. | **Donation-to-contract pipeline.** When a donor gives to a politician, check if that donor's company received federal contracts. CORS requires being on usaspending.gov domain. **TESTED AND WORKING.** |
| **Senate LDA API** ⭐ | [lda.gov/api](https://lda.gov/api/v1/) | Lobbying disclosure filings, registrants, clients, individual lobbyists. No auth required. | **Revolving door documentation, lobbying expenditures, client lists.** Use `Accept: application/json` header. CORS requires being on lda.gov domain. **TESTED AND WORKING.** |
| **OpenSecrets** | [opensecrets.org](https://www.opensecrets.org/) | Federal campaign contributions by industry, organization, and individual. Lobbying data. Revolving door tracker. Personal financial disclosures. | Top donors, industry breakdowns, career fundraising totals, PAC contributions, lobbyist bundling. Use for synthesis and visualization AFTER checking API data first. |
| **FEC.gov** | [fec.gov](https://www.fec.gov/data/) | Raw Federal Election Commission filings. Committee reports, individual contributions, independent expenditures. | Web interface for visual verification when API data needs confirmation. The API provides the same underlying data programmatically. |
| **FollowTheMoney.org** | [followthemoney.org](https://www.followthemoney.org/) | State-level campaign finance across all 50 states. API available at api.followthemoney.org (not yet tested). | State politicians, governors, state legislators, CA Governor 2026 race candidates. Primary source for state-level donor research. |
| **FPPC** | [fppc.ca.gov](https://www.fppc.ca.gov/) | California Fair Political Practices Commission filings. | California-specific politicians and donors. Raw state filing data. Always Tier 1 for CA races. No API — Chrome only. |

### Congressional & Government Records

**API-FIRST RULE:** For voting records, bill data, and member profiles, use the Congress.gov API before browsing manually. See [[API Pipeline]] for implementation.

| Source | URL | What It Provides | Best For |
|--------|-----|------------------|----------|
| **Congress.gov API** ⭐ | [api.congress.gov](https://api.congress.gov/v3/) | Bill text, voting records, member profiles, committee data, sponsored legislation via REST API. Returns structured JSON. | **Primary source for voting records, bill sponsorship, committee assignments.** Free API key (DEMO_KEY for testing). 5,000 requests/hour. **TESTED AND WORKING.** |
| **Congress.gov** | [congress.gov](https://www.congress.gov) | Same data via web interface. | Visual verification and browsing when API data needs confirmation. |
| **Senate.gov / House.gov** | [senate.gov](https://www.senate.gov) / [house.gov](https://www.house.gov) | Official member pages, press releases, committee pages. | Committee leadership, official statements, press releases from members' own offices. |
| **Senate Roll Call Votes** | [senate.gov/legislative](https://www.senate.gov/legislative/votes.htm) | Individual roll call vote records. | Verifying specific votes on specific bills. URL format: `roll_call_vote_cfm.cfm?congress=X&session=Y&vote=ZZZZZ` |
| **House Clerk** | [clerk.house.gov](https://clerk.house.gov) | House member directory, roll call votes. | House member verification, district information. |
| **GovTrack** | [govtrack.us](https://www.govtrack.us) | Bill tracking, vote records, member analytics, committee assignments. | Quick lookup of voting patterns, bill status, legislative activity metrics. |
| **ProPublica Congress API** | [projects.propublica.org/api-docs/congress-api](https://projects.propublica.org/api-docs/congress-api/) | Machine-readable congressional data. Votes, bills, members, statements. | Cross-referencing voting records against donor lists at scale. Batch analysis. |
| **Court Records (PACER)** | [pacer.uscourts.gov](https://pacer.uscourts.gov) | Federal court filings, case documents. | Legal cases involving politicians, donors, or organizations in the vault. |
| **SEC EDGAR** | [sec.gov/edgar](https://www.sec.gov/cgi-bin/browse-edgar) | Corporate filings, 10-K reports, proxy statements. | Corporate donor entities — executive compensation, lobbying disclosures, business relationships. |

### Nonprofit & Tax Records
| Source | URL | What It Provides | Best For |
|--------|-----|------------------|----------|
| **ProPublica Nonprofit Explorer** | [projects.propublica.org/nonprofits](https://projects.propublica.org/nonprofits) | 990 tax filings for nonprofits. Revenue, grants, executive compensation. | Dark money groups, think tanks, 501(c)(3) and 501(c)(4) organizations. Tides Foundation, Heritage Foundation, any nonprofit donor node. Uses EINs — always verify EIN matches the organization. |
| **IRS Tax Exempt Organization Search** | [apps.irs.gov/app/eos](https://apps.irs.gov/app/eos/) | Tax-exempt status verification. | Confirming nonprofit status, EIN lookup, revocation dates. |

---

### Tier 2 — Investigative Journalism

Major investigative outlets with editorial standards, fact-checking processes, and track records of accountability journalism. These are reliable secondary sources — not primary documents, but well-sourced reporting that builds on primary evidence.

| Source | URL | What It Provides | Best For |
|--------|-----|------------------|----------|
| **ProPublica** | [propublica.org](https://projects.propublica.org/nonprofits) | Deep investigative reporting on government, finance, healthcare, criminal justice. | Long-form donor investigations, dark money tracking, institutional corruption. Dollars for Docs, Represent, Nonprofit Explorer. |
| **The Intercept** | [theintercept.com](https://theintercept.com) | National security, surveillance, criminal justice, political influence reporting. | FISA/surveillance, intelligence community, defense contractor relationships, AIPAC/foreign lobbying. |
| **Capital & Main** | [capitalandmain.com](https://capitalandmain.com/) | California-focused labor, economy, and political power reporting. | California politicians, labor unions, CA Governor 2026 race, real estate and development politics. |
| **CalMatters** | [calmatters.org](https://calmatters.org/search) | Nonpartisan California policy journalism. | California state policy, budget, elections, legislative analysis. Note: frequently restructures URLs — verify before publication. |
| **LA Times** | [latimes.com](https://www.latimes.com/) | California's paper of record. Investigations, politics, state government. | California political coverage, investigations, editorial context. (Paywalled — note when citing.) |
| **Washington Post** | [washingtonpost.com](https://www.washingtonpost.com/search) | National political reporting, investigations, federal government coverage. | Federal politician profiles, White House coverage, national political context. (Paywalled.) |
| **NPR** | [npr.org](https://www.npr.org/search) | Nonpartisan national news and analysis. | General political context, policy analysis, interview transcripts. |
| **CNN** | [cnn.com](https://www.cnn.com/search) | National news coverage, political reporting. | Breaking political news, congressional coverage, election analysis. |
| **The Hill** | [thehill.com](https://thehill.com/) | Congressional insider reporting. | Committee actions, floor votes, leadership dynamics, legislative strategy. |
| **Roll Call** | [rollcall.com](https://rollcall.com/) | Congressional process and politics. | Committee assignments, procedural analysis, Capitol Hill insider coverage. |
| **Politico** | [politico.com](https://www.politico.com/search) | Political news, policy analysis, influence industry coverage. | Lobbying dynamics, K Street analysis, political strategy reporting. |
| **CREW** | [citizensforethics.org](https://www.citizensforethics.org/) | Government ethics investigations, corruption tracking. | Ethics violations, emoluments, conflicts of interest, financial disclosures. |
| **Center for American Progress** | [americanprogress.org](https://www.americanprogress.org/) | Progressive policy research and analysis. | Climate policy, healthcare, economic policy analysis. Note: progressive orientation — cross-reference claims. |
| **Brennan Center** | [brennancenter.org](https://www.brennancenter.org/) | Democracy, voting rights, criminal justice reform research. | Voter suppression, dark money, judicial selection, campaign finance analysis. |
| **Documented** | [documented.net](https://documented.net/) | Corporate influence on politics investigation. | ALEC model legislation, corporate lobbying networks, industry influence campaigns. |

---

### Tier 3 — Secondary Reporting & Reference

Reliable secondary sources with editorial standards but less original investigative depth. Named officials on record. Encyclopedic references. Specialist trade press.

| Source | URL | What It Provides | Best For |
|--------|-----|------------------|----------|
| **Ballotpedia** | [ballotpedia.org](https://ballotpedia.org/) | Encyclopedia of American politics. Elections, officeholders, ballot measures. | Quick biographical facts, election history, committee assignments, district information. |
| **Wikipedia** | [wikipedia.org](https://www.wikipedia.org/) | General reference encyclopedia. | Background context, biographical overview. Always cross-reference claims with primary sources — never cite Wikipedia alone for contested facts. |
| **VoteSmart** | [votesmart.org](https://justfacts.votesmart.org) | Voting records, interest group ratings, biographical information. | Interest group scorecards (NRA, LCV, AFL-CIO ratings), voting record summaries. |
| **Almanac of American Politics** | (print/subscription) | Comprehensive district and member profiles. | District demographics, political context, electoral history. |
| **CQ Roll Call** | [cq.com](https://plus.cq.com/login?jumpto=https:/plus.cq.com/) | Congressional Quarterly — legislative tracking, member profiles. | Legislative process detail, vote analysis, committee activity. (Subscription.) |
| **Ground News** | [ground.news](https://ground.news/) | Media bias analysis, source comparison, story coverage tracking. | Assessing media coverage bias on specific stories. Cross-checking how different outlets cover the same event. Source reliability comparison. |

---

### Tier 4 — Partisan / Single-Sourced

Use with extreme caution. Always flag explicitly in citation. These sources may contain useful information but require independent verification before any claim based on them enters the vault.

| Source | URL | What It Provides | When to Use |
|--------|-----|------------------|-------------|
| **Campaign websites** | Varies | Candidate self-description, policy positions, fundraising appeals. | Understanding how politicians present themselves — compare against donor data for Two-Audience Problem analysis. Never cite as factual authority. |
| **America First Legal** | [aflegal.org](https://aflegal.org/) | Conservative legal activism, FOIA requests, government records. | FOIA documents they've obtained may be valuable primary evidence — but their framing and analysis is partisan. Cite the documents, not the analysis. |
| **Heritage Foundation** | [heritage.org](https://www.heritage.org/) | Conservative policy research, Project 2025. | Understanding conservative policy framework and donor-class priorities. Document their influence, not their conclusions. |
| **Cato Institute** | [cato.org](https://www.cato.org/) | Libertarian/Koch-aligned policy research. | Koch network policy positions, deregulation frameworks. Document as donor-class ideology. |
| **Breitbart / Daily Caller** | Various | Right-wing news with strong editorial slant. | Only when they break original reporting with named sources that can be independently verified. Always flag tier. |
| **Jacobin / Current Affairs** | Various | Left-wing analysis and commentary. | Class analysis perspectives that may surface useful framing, but verify all factual claims independently. |

---

### Specialized Databases

These don't fit neatly into the tier system — they're tools for specific research tasks rather than general sources.

| Tool | URL | What It Does | When to Use |
|------|-----|-------------|-------------|
| **OpenSecrets Revolving Door** | [opensecrets.org/revolving](https://www.opensecrets.org/revolving/) | Tracks staff movement between government, lobbying, and private sector. | Revolving Door analytical pattern — when documenting staff movement between offices, agencies, and donor industries. |
| **OpenSecrets Lobbying** | [opensecrets.org/federal-lobbying](https://lda.gov/filings/public/filing/search/) | Federal lobbying expenditures and registrations. | Connecting lobbying spending to policy outcomes. Which industries lobby which committees. |
| **MapLight** | [maplight.org](https://www.maplight.org/) | Money and politics data connections. | Donation-to-vote correlations, industry influence mapping. |
| **Sunlight Foundation (archived)** | [sunlightfoundation.com](https://sunlightfoundation.com/) | Government transparency tools and data (now archived). | Historical reference for transparency methodology. Some tools still accessible. |
| **LittleSis** | [littlesis.org](https://littlesis.org/) | Power network mapping — relationships between people, organizations, and institutions. | Mapping donor networks, corporate board interlocks, organizational relationships. Useful for visualizing connections documented in the vault. |
| **Influence Explorer** | (Sunlight Foundation — archived) | Cross-referenced lobbying, contributions, earmarks. | Historical data. Some data migrated to OpenSecrets. |
| **DIME (Database on Ideology, Money in Elections)** | [data.stanford.edu/dime](https://data.stanford.edu/dime) | Academic dataset mapping ideology to campaign contributions. | Large-scale ideological analysis of donor networks. Research-grade data for pattern identification. |

---

### Source Usage Protocol

### For every new profile build (API-first order):
1. **FEC API** — pull individual contributions (no date filter for completeness), candidate fundraising totals, independent expenditures for/against. Use `fecDonorLookup()`, `fecCandidateTotals()`, `fecIndependentExpenditures()` from `api-toolkit.js`
2. **Congress.gov API** — pull member profile, sponsored legislation, voting record. Use `congressMemberVotes()` from `api-toolkit.js`
3. **USASpending API** — check if top donors' companies received federal contracts. Use `usaSpendingContracts()` from `api-toolkit.js` (must run from usaspending.gov domain)
4. **Senate LDA API** — check lobbying filings for top donor companies. Use `ldaLobbyingLookup()` from `api-toolkit.js` (must run from lda.gov domain)
5. **OpenSecrets** (Chrome) — for synthesis, industry breakdowns, revolving door data not available via API
6. **FollowTheMoney** — if the politician has state-level history (API available but not yet tested)
7. **Search ProPublica** — for nonprofit connections, investigative coverage
8. **Search investigative outlets** — The Intercept, Capital & Main, CREW for ethics/corruption angles
9. **Ground News** — for media bias context on controversial coverage

**Document method:** Note `(API)` or `(Chrome)` in session reports for each data source used.

### For every source citation in the vault:
Format: `- [Source Name: Description](#URL-needed) (Tier X)`

Example: `- [Congress.gov: Jim Jordan donor profile](https://www.congress.gov/search?q=Jim%20Jordan&searchResultViewType=expanded) (Tier 1)`

### Mandatory rules:
- Every source needs a clickable URL
- No note promoted to `ready` without verified URLs on every source
- Broken links flagged with `(URL broken — replacement needed)`
- Paywalled sources noted with `(paywalled)` after tier
- When URL can't be found: `(URL needed)` flag
- Archive-worthy sources captured at archive.org where possible
- Government URLs verified before each publication cycle (they change frequently)

---

### Source Tier Quick Reference

| Tier | What It Is | Trust Level | Example |
|------|-----------|-------------|---------|
| **1** | Primary documents, government records | Highest — cite directly | FEC filings, FPPC records, voting records, court documents, official transcripts |
| **2** | Major investigative journalism | High — well-sourced reporting | ProPublica, The Intercept, CalMatters, CREW investigations |
| **3** | Secondary reporting, named sources | Moderate — cross-reference | Ballotpedia, Wikipedia, mainstream outlets with officials on record |
| **4** | Partisan/single-sourced | Low — flag explicitly | Campaign sites, Heritage Foundation analysis, America First Legal framing |

---

content-readiness:: ready