---
title: 2026-03-27 API Briefing
type: daily-update
content-readiness: ready
last-updated: 2026-03-27T00:00:00.000Z
source-tier: 1
parent: null
source-types:
  - FEC
  - LDA
  - USASpending
corroboration-count: 3
known-gaps:
  - No mapped relationships
related: "[[Donors & Power Networks Index]]"
checklist-na:
  - "regulatory: auto: entity type \"daily-update\" does not typically have EPA/OSHA records (2026-04-15)"
  - "contracts: auto: entity type \"daily-update\" does not typically hold federal contracts (2026-04-15)"
urls-first-triaged: "2026-04-15"
---
#daily-update #api-briefing #fec #usaspending #lda

---

### 2026-03-27. Daily API Briefing

**Run time:** 2026-03-27 (automated scheduled task)
**APIs queried:** FEC (BLOCKED), USASpending (✓), Senate LDA (✓)
**Lookback window:** March 1–27, 2026 (USASpending contracts); March 26, 2026 (LDA filings)

---

### ⚠️ FEC API. RATE LIMITED (Action Required)

**Status:** DEMO_KEY exhausted (40 calls/hour limit hit by prior sessions)

The FEC DEMO_KEY rate limit was exceeded before this run began. No independent expenditure data, no new donation data, and no candidate totals were retrieved this session.

**Action required:** David must register a personal FEC API key at https://www.fec.gov/developers/ to get 1,000 calls/hour. Until then, daily runs will continue to fail on FEC queries. See `API Pipeline.md` for registration instructions.

### Affected queries (skipped this run):
- New large donations from tracked donors (schedule_a)
- Independent expenditures since 03/20/2026 (schedule_e)
- Candidate totals 2026 cycle

---

### Senate LDA. New Lobbying Filings

**Source:** [Senate LDA API](https://lda.gov/api/v1/filings/?filing_year=2026&page_size=20&ordering=-dt_posted) (Tier 1) (VERIFIED) (API)
**Total 2026 filings in database:** 1,475

#### Tracked Entities. Flagged Filings

### JPMorgan Chase Holdings LLC
- **Registrant:** Dentons US LLP
- **Period:** Q1 2026 (Jan 1 – Mar 31)
- **Income:** $60,000
- **Lobbying issues:** Financial Institutions/Investments/Securities, "Issues regarding tax, budget, regulatory reform, general financial services"
- **Posted:** 2026-03-26
- **Flag:** JPMorgan is lobbying on "regulatory reform" as the Trump administration pursues bank deregulation. Connects to [[Wall Street]] donor network and ongoing rollback of Dodd-Frank remnants. Wikilink: [[JPMorgan Chase]]

> [!money]
> JPMorgan's Q1 2026 lobbying registration at $60K/quarter ($240K annualized pace) lands exactly as the CFPB is being gutted and banking regulators pushed toward deregulation. Follow-the-money: JPMorgan donated $1M+ to Trump inaugural fund; now deploying Dentons lobbying shop to consolidate regulatory gains.

#### Notable Non-Tracked Filings (March 26, 2026 batch)

| Client | Registrant | Income | Issues |
|--------|-----------|--------|--------|
| JPMorgan Chase Holdings LLC | Dentons US LLP | $60,000 | Financial/Securities regulatory reform |
| FedEx Corporation | Dentons US LLP | $80,000 | (issues not returned) |
| Future of Life Institute | Dentons US LLP | $90,000 | (issues not returned) |
| Sysco | Dentons US LLP | $50,000 | (issues not returned) |
| ConocoPhillips | (new registration) | N/A | Energy/fossil fuel (registration filing) |

**ConocoPhillips new registration flag:** ConocoPhillips filed a new lobbying registration on 2026-03-26 (filing type: RR = Registration). This is the first 2026 registration for this entity. Track for subsequent activity reports, they will file expense reports in subsequent quarters.

**Dentons US LLP concentration:** Four of the most recently posted Q1 2026 filings are from Dentons, including JPMorgan. Dentons is one of the largest lobby shops in DC. Worth building out a Dentons registrant node to track their full client portfolio.

---

### USASpending. Federal Contract Activity (March 2026)

**Source:** ~~[USASpending API](https://api.usaspending.gov/api/v2/search/spending_by_award/)~~ (was Tier 1. URL broken, archived by Ops) (Tier 1) (API)
**Filter:** Award actions dated March 1–27, 2026 | Contract award types A/B/C/D

**Note on data interpretation:** USASpending time_period filters by action date, these are contracts with new obligations, modifications, or task order activity in March 2026, not necessarily new contract starts. Dollar amounts represent the top obligation value on record for those contracts.

#### Defense Contractors

### Lockheed Martin

| Contract | Recipient | Amount |
|----------|-----------|--------|
| MSFC0199911DNAS800016 | Lockheed Martin Corp | $2.87B |
| DTFAWA10C00052 | Lockheed Martin Services LLC | $488M |
| (NOAA C-130J production) | Lockheed Martin Corporation | $461M |

- Top contract: External tanks production (NASA Marshall), $2.87B
- FAA NextGen trajectory management (aviation infrastructure)
- NOAA C-130J aircraft modification (4 aircraft, fully modified)
- Wikilink: [[Lockheed Martin]]

### Raytheon Technologies

| Contract | Description | Amount |
|----------|-------------|--------|
| 693KA726C00051 | FAA Radar System Replacement (ATC) | $418M |
| (STARS) | STARS ATC system, ops sustainment | $232M |
| (GEO satellite) | GEO 5/6 service leases | $226M |

- **Flag:** Raytheon's $418M FAA radar contract is a non-DOD defense contract. Federal Aviation Administration paying Raytheon to replace air traffic control radar. Classic dual-use defense/civilian infrastructure capture.
- Wikilink: [[Raytheon Technologies]]

### Northrop Grumman

| Contract | Description | Amount |
|----------|-------------|--------|
| (NextSTEP NRA) | NASA NextSTEP deep space habitat | $2.46B |
| (others) | $1.4B combined |, |

- Wikilink: [[Northrop Grumman]]

### Boeing

| Contract | Description | Amount |
|----------|-------------|--------|
| NAS1510000 | International Space Station | $22.4B |
| NNM07AB03C | Ares I Upper Stage production | $10.4B |
| 80MSFC20C0052 | Space Launch System (SLS) Stages | $2.3B |

- **Flag:** Boeing's March 2026 contract activity is dominated by long-running NASA space programs (ISS, SLS). These are cost-plus development contracts that have historically run billions over budget. The $22.4B ISS contract shows active March obligation modifications.
- Wikilink: [[Boeing]]

### General Dynamics

| Contract | Description | Amount |
|----------|-------------|--------|
| 47QFCA210051 | Navy/NAWCAD IT task order | $815M |
| (others) | $843M combined |, |

#### Tech/Cloud Contractors

### Microsoft Corporation

| Contract | Description | Amount |
|----------|-------------|--------|
| HSTXXX0000002144 | Microsoft Azure Stratus (DHS) | $58.5M |
| (military use) | Military licensing | $11.7M |
| (other) | $5.1M |, |

- **Flag:** Microsoft Azure Stratus is a DHS cloud contract. Microsoft is the primary cloud provider for Department of Homeland Security. March 2026 activity shows active obligations. Connect to [[Microsoft]] and broader [[Tech & Crypto]] donor network.

### Amazon Web Services

| Contract | Description | Amount |
|----------|-------------|--------|
| (Western Area Power) | AWS Cloud, energy sector | $173K |
| (accessories) | iPhone accessories | $25K |
| (data center) | FY26-27 AWS cloud base | $500 |

- Note: Amazon's March 2026 federal contract activity appears modest by these query results. May be captured under different entity names (Amazon.com LLC, AWS Gov Cloud, etc.). Recommend expanded entity search.

#### Wall Street / Financial

### Goldman Sachs

| Contract | Description | Amount |
|----------|-------------|--------|
| (portfolio mgmt) | IGF portfolio management services | $34.4M |

- Goldman Sachs appears in USASpending as a government contractor for portfolio management services. Connects to revolving door narrative. Goldman alumni running Treasury, Goldman receiving federal contracts.
- Wikilink: [[Goldman Sachs]]

---

### Analytical Flags. Items Requiring Deeper Investigation

1. **JPMorgan + Regulatory Reform lobbying (HIGH PRIORITY)**
 - JPMorgan filing Q1 2026 lobbying on regulatory reform while Trump administration dismantles CFPB
 - Connect to JPMorgan's $1M+ Trump inaugural donation and subsequent deregulatory policy outcomes
 - Pattern: [[Donor-Class Override]], deregulation serves donors, harms consumers
 - Next step: Pull JPMorgan's full 2025-2026 lobbying expenditure history via LDA

2. **Raytheon FAA Radar Contract (MEDIUM PRIORITY)**
 - $418M to Raytheon for civilian aviation infrastructure
 - Pattern: defense contractor capture of non-DOD civilian infrastructure budgets
 - Next step: Check if Raytheon has donated to Transportation Committee members

3. **ConocoPhillips New Registration (MEDIUM PRIORITY)**
 - New 2026 lobbying registration filed March 26, track for Q1 expense report
 - Energy sector lobbying likely tied to pipeline approvals, permit streamlining, LNG exports
 - Connect to [[Energy & Utilities]] donor network

4. **Goldman Sachs as Federal Contractor (LOW-MEDIUM)**
 - Goldman receiving $34M+ federal portfolio management contracts while also being major donor
 - Donation-to-contract pipeline to investigate: who are the committee members overseeing Treasury/finance contracts?

5. **Future of Life Institute lobbying ($90K Q1 2026) (FLAG)**
 - AI safety nonprofit filing lobbying registrations at $90K/quarter is notable
 - Future of Life is funded by Elon Musk and other tech billionaires
 - May be lobbying on AI regulation to shape favorable framework
 - Not currently in vault, recommend building donor node

6. **Dentons US LLP client concentration (LOW)**
 - Dentons filed 4+ new Q1 2026 registrations in a single batch, suggests active expansion of DC lobbying practice
 - Build out Dentons registrant node to track full client portfolio

---

### Connections to Existing Vault Profiles

| Finding | Vault Note | Pattern |
|---------|-----------|---------|
| JPMorgan lobbying on regulatory reform | [[JPMorgan Chase]] | Donor-Class Override |
| Goldman Sachs federal contracts | [[Goldman Sachs]] | Revolving Door |
| Boeing NASA cost-plus contracts | [[Boeing]] | Genuine Win + Structural Limit |
| Raytheon FAA radar contract | [[Raytheon Technologies]] | Donor-Class Override |
| Microsoft DHS cloud (Azure Stratus) | [[Microsoft]] | Revolving Door |
| ConocoPhillips new registration | [[Energy & Utilities]] | new entity |

---

### Session Notes

- **FEC DEMO_KEY rate limit** is the primary data gap. This will repeat every daily run until a registered key is obtained. David should register at https://www.fec.gov/developers/, it's free and provides 1,000 calls/hour.
- **LDA API throttling**: The LDA API throttled after ~15 requests. Rate limit appears to be per-minute. The key tracked entity data (JPMorgan, ConocoPhillips) was captured before throttling hit.
- **USASpending date filtering**: The `action_date` filter is working, but `Awarding Agency Name` and `Award Date` fields are not returned by the API for these records (null). The dollar amounts and contract IDs are valid.
- **Next run priority**: Once FEC key is registered, the independent expenditure data (schedule_e) is the highest-value pull, super PAC spending patterns are the core of the vault's thesis.

---

### Sources

- [Senate LDA API: Q1 2026 filings, ordered by post date](https://lda.gov/api/v1/filings/?filing_year=2026&page_size=20&ordering=-dt_posted) (Tier 1) (VERIFIED) (API)
- [Senate LDA: JPMorgan Chase Holdings LLC filing](https://lda.gov/filings/public/filing/30e77a16-2d6c-4794-a28e-34e5c800caa0/print/) (Tier 1) (VERIFIED) (API)
- [Senate LDA: ConocoPhillips registration](https://lda.gov/filings/public/filing/afcef92f-b9d9-49f3-ba4b-4020a7f86f6b/print/) (Tier 1) (VERIFIED) (API)


## Archived

Sources below were broken, redirected, or bot-blocked as of their last fingerprint check. Preserved here for audit trail. Not used as active citations.

- ~~[USASpending API: Federal contracts, March 2026, defense contractors](https://api.usaspending.gov/api/v2/search/spending_by_award/)~~ (was Tier 1. URL broken, archived by Ops) (Tier 1) (API)
- ~~[FEC Developer registration](https://www.fec.gov/developers/)~~ (URL broken, archived by Ops) (reference)
