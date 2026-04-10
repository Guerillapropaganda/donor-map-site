---
title: "API Pipeline — Data Collection Layer"
type: infrastructure
content-readiness: draft
last-updated: 2026-04-05
source-tier: null
parent: null
source-types:
  - Congress
  - FEC
  - LDA
  - USASpending
corroboration-count: 4
known-gaps:
  - "No mapped relationships"
related: "[[Research Methodology and Data Sources]] · [[Quality Standards]] · [[Sources Master Node]]"
---
#infrastructure #api #data-pipeline #methodology

---

### Purpose

This document defines the API-first data collection layer for The Donor Map Database. APIs produce cleaner, more reliable data than manual browser research, reduce token consumption by approximately 10x, and eliminate URL fabrication risk.

**Rule: Always use API sources before manual browsing.**

---

### Active APIs

#### 1. FEC API — Tier 1

**Endpoint:** `https://api.open.fec.gov/v1/`
**Auth:** API key required (free) — use `DEMO_KEY` for testing (lower rate limits)
**Rate limit:** 1,000 calls/hour (registered key), 100 results/page
**Data updated:** Nightly

**Key endpoints:**
- `/schedules/schedule_a/` — Individual contributions (the main donor research endpoint)
- `/schedules/schedule_b/` — Disbursements
- `/schedules/schedule_e/` — Independent expenditures
- `/candidates/` — Candidate profiles
- `/committees/` — Committee profiles and financials
- `/candidates/totals/` — Aggregate fundraising totals

**Query parameters for schedule_a (individual contributions):**
- `contributor_name` — Donor name (format: "last, first")
- `contributor_employer` — Employer name
- `contributor_state` — Two-letter state code
- `committee_id` — Specific committee
- `min_date` / `max_date` — Date range (format: MM/DD/YYYY)
- `min_amount` / `max_amount` — Dollar range
- `per_page` — Results per page (max 100)
- `sort` — Sort field (use `-contribution_receipt_date` for newest first)

**Vault citation format for API-sourced FEC data:**

**Exception — FEC individual contributions:** Cite the direct API endpoint with DEMO_KEY. The FEC.gov web interface does NOT aggregate across name variations; the API is the only URL that returns the complete fuzzy-matched record. See [[Quality Standards]] for the canonical citation format and disclaimer template.

**All other FEC data — link to web interface:**
```
- [FEC: [Name] candidate totals](https://www.fec.gov/data/candidate/[CANDIDATE_ID]/) (Tier 1)
- [FEC: [Name] independent expenditures](https://www.fec.gov/data/independent-expenditures/?most_recent=true?q_spender=[committee_name]) (Tier 1)
```

**Do not use raw API endpoint URLs for candidate totals, independent expenditures, or committee data.** These web interfaces display the same underlying data in a browser-friendly format. Only FEC individual contributions use the direct API endpoint — because no other browsable URL returns the complete fuzzy-matched record. The canonical citation rules live in [[Quality Standards]].

**Status:** TESTED AND WORKING (2026-03-26). Confirmed returns structured JSON with full contribution records. Returns more complete data than web interface (162 vs 121 results for test query). Chrome JavaScript execution required (VM proxy blocks direct curl).

---

#### 2. USASpending API — Tier 1

**Endpoint:** `https://api.usaspending.gov/api/v2/`
**Auth:** None required
**Rate limit:** Generous (no published hard limit)

**Key endpoints:**
- `/search/spending_by_award/` — Federal contracts and grants by recipient
- `/recipient/` — Recipient organization profiles
- `/agency/` — Agency spending profiles
- `/references/naics/` — Industry classification lookup

**Use case:** Donation-to-contract pipeline. When a donor gives to a politician, check if that donor's company received federal contracts. This is the missing link the vault hasn't been using.

**Status:** NOT YET TESTED

---

#### 3. Congress.gov API — Tier 1

**Endpoint:** `https://api.congress.gov/v3/`
**Auth:** API key required (free — register at api.congress.gov)
**Rate limit:** 5,000 requests/hour

**Key endpoints:**
- `/bill` — Bill text, status, cosponsors
- `/member` — Member profiles, sponsored legislation
- `/vote` — Roll call votes (House and Senate)
- `/committee` — Committee membership and hearings

**Use case:** Voting records, bill tracking, committee assignments. When we document a policy outcome in a donation-to-policy timeline, the API can provide the exact vote record.

**Status:** NOT YET TESTED

---

#### 4. Senate Lobbying Disclosure API — Tier 1

**Endpoint:** `https://lda.gov/api/`
**Auth:** API key required — pass as `Authorization: Token <key>` header
**Registered key:** `b3e00f77b9db54cd753ca43bb8773f9e8b0ec5c4`
**Documentation:** `https://lda.gov/api/redoc/v1/`
**Note:** The legacy site at `lda.gov` is moving to `lda.gov` by 06/30/2026. API endpoints may migrate — check docs if calls fail.

**Key endpoints:**
- `/v1/filings/` — Lobbying disclosure filings (quarterly reports, registrations)
- `/v1/registrants/` — Registered lobbying firms
- `/v1/clients/` — Lobbying clients
- `/v1/lobbyists/` — Individual lobbyists
- `/v1/contributions/` — Lobbyist political contributions (LD-203 reports)

**Query parameters for filings:**
- `client_name` — Client name (e.g., "American Sugar Alliance")
- `registrant_name` — Lobbying firm name
- `filing_year` — Year filter
- `filing_period` — Quarter (Q1, Q2, Q3, Q4, annual)
- `filing_type` — Type filter (RR = registration, QR = quarterly report)
- `ordering` — Sort field (e.g., `-dt_posted` for newest first)

**Use case:** Revolving door documentation, lobbying expenditures, client lists for K Street profiles. Provides exact quarterly dollar figures for lobbying spend — superior to OpenSecrets aggregates because it's raw government data.

**Vault citation format:**
```
- [Senate LDA: [Client] lobbying filings](https://lda.gov/filings/public/filing/search/?client=[name]&search=search) (Tier 1)
```

**Status:** TESTED AND WORKING (2026-03-31). Key authenticated. Confirmed returns structured JSON with filing records including income (hired firm revenue from client), expenses (client direct lobbying spend), registrant info, filing period, and lobbying activities. Test query: American Sugar Alliance 2023-2025 returned 40 filings across 3 years totaling $6.835M in lobbying expenditures. Chrome JavaScript execution required (VM proxy blocks direct HTTP). Auth header format: `Authorization: Token <key>`.

---

#### 5. ProPublica Congress API — Tier 2

**Endpoint:** `https://api.propublica.org/congress/v1/`
**Auth:** API key required (free)
**Rate limit:** 5,000 requests/day

**Key endpoints:**
- `/{congress}/senate/members.json` — Senate member list
- `/members/{member-id}/votes.json` — Member voting history
- `/bills/search.json` — Bill search

**Use case:** Synthesized congressional data, voting record lookups.

**Status:** NOT YET TESTED

---

#### 6. FollowTheMoney API — Tier 1/2

**Endpoint:** `https://api.followthemoney.org/`
**Auth:** API key required (free for non-commercial)
**Coverage:** All 50 states — state-level campaign finance

**Use case:** State-level campaign finance data (governors, state legislators, AGs). Critical for California profiles (Newsom, Bass, etc.) and state-level donor mapping.

**Status:** NOT YET TESTED

---

### Implementation Notes

**Execution environment:** Chrome JavaScript context (VM proxy blocks direct HTTP requests). All API calls are routed through `fetch()` in Chrome browser tabs.

**Pattern for API calls in sessions:**

```javascript
// Execute in Chrome via javascript_tool
fetch('https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=NAME&api_key=DEMO_KEY&per_page=100')
  .then(r => r.json())
  .then(data => {
    // Process and store in window._apiResult
    window._apiResult = JSON.stringify(processedData, null, 2);
  });
```

**API key storage:** API keys should be stored in a `.env` file or equivalent outside the vault. Never commit API keys to vault files. The DEMO_KEY is acceptable for development and testing.

**Registered API key:** David needs to register a free FEC API key at https://api.open.fec.gov/developers/ to get the 1,000 calls/hour rate limit. DEMO_KEY works but has lower limits.

---

### API-First Research Protocol

1. **Before any manual research session** — check if the data needed is available via API
2. **If API available** — use API, document source as API in session report
3. **If API unavailable** — manual research with standard Chrome sourcing rules
4. **Document method** — note `(API)` or `(Chrome)` in session report for each data source
5. **Cross-reference** — for critical claims, verify API data against web interface

### Citation URL Rule (non-negotiable)

**For FEC individual contributions: cite the direct API endpoint with DEMO_KEY.** The API link is the only URL that returns the complete, fuzzy-matched results from the FEC government database. Readers click the link and see the raw JSON data — every record, every amount, every date. Include a technical disclaimer explaining the format and why the web interface shows fewer results.

**For all other APIs: cite the web interface URL** (candidate totals, independent expenditures, USASpending, Congress.gov, Senate LDA).

### FEC Individual Contributions — Direct API Citation

**Why API links, not web interface links:** The FEC.gov web interface does NOT aggregate across contributor name variations. The FEC API performs fuzzy matching (e.g., `contributor_name=taibbi, matt` returns records filed under "TAIBBI, MATT", "TAIBBI, MATTHEW", and payroll deductions filed under employer names). The web interface requires exact name matches and will show FEWER results. OpenSecrets Donor Lookup also fails — the free tier is rate-limited (5 searches/month), OS Pro has a $200 minimum threshold, and neither reliably aggregates all name variations.

**The API endpoint is the verifiable citation.** Readers click it, see the raw JSON with `"count": N` at the top, and can verify every record themselves. The DEMO_KEY allows 40 requests/hour per IP — more than enough for readers clicking citation links.

**Citation format for individual FEC contributions:**
```
- [FEC API: [Name] individual contributions ([N] results, $[total])](https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=[last]%2C+[first]&api_key=DEMO_KEY&per_page=100&sort=-contribution_receipt_date) (Tier 1)
```

**Required disclaimer (add below the citation in any note where the FEC web interface shows fewer results than the API):**
```
> **Technical note:** This link returns raw JSON from the FEC government database. The FEC API uses fuzzy name matching, which aggregates records filed under multiple name variations. The FEC.gov web interface ([link]) only shows [N] of [M] results because it requires exact name matches and does not aggregate across filing name variations. The API link above is the complete, verifiable record. If the link returns a rate limit error, wait a few minutes and try again (DEMO_KEY allows 40 requests/hour per IP).
```

**Workflow:**
1. **Query:** Use FEC API (with your registered key) to get complete data
2. **Citation:** Link directly to the API endpoint with DEMO_KEY (public, reader-verifiable)
3. **Disclaimer:** Add the technical note below the citation when the web interface shows fewer results
4. **Profile text:** Include the complete breakdown from the API in the profile body

**Other citation URLs (web interface — these work correctly):**

| API Used for Query | Citation URL |
|--------------------|------------------------------|
| FEC API (candidate totals) | `https://www.fec.gov/data/candidate/[CANDIDATE_ID]/` |
| FEC API (indep. exp.) | `https://www.fec.gov/data/independent-expenditures/?most_recent=true?q_spender=[name]` |
| USASpending API | `https://www.usaspending.gov/search/?hash=[search_hash]` |
| Congress.gov API | `https://www.congress.gov/member/[name]/[bioguide_id]` |
| Senate LDA API | `https://lda.gov/filings/public/filing/search/?registrant=[name]` |

**Important:** Use your registered API key (`K10pqk...`) for research queries (1,000 calls/hour). Use `DEMO_KEY` in citation URLs — it's public and each reader gets their own 40/hour rate limit from their IP. Never put your personal key in vault files or citation URLs.

### ActBlue/WinRed Conduit Double-Counting (critical)

**The FEC API double-counts donations made through conduit committees.** When a donor gives $100 through ActBlue to a candidate, the FEC records TWO entries: one for ActBlue (the conduit) and one for the recipient committee. Both appear in API results. The raw `count` and dollar total from the API are therefore inflated for donors who use ActBlue or WinRed.

**Disambiguation rules for FEC Record sections:**
1. **Report the raw API count and total** (what the API returns) for transparency
2. **Note the de-duplicated count** (excluding ActBlue/WinRed conduit entries) as the actual contribution count
3. **In the FEC Record table, list only unique contributions** (recipient committee entries, not conduit pass-throughs) — do NOT list both the ActBlue entry and the candidate entry for the same donation
4. **For common names** (Ben Shapiro: 665 results, Matt Walsh: 2,647), filter by known state + employer to isolate the actual person. Note the raw API count and the disambiguated count.

**Example:** Kyle Kulinski's API returns 30 results/$8,176 — but half are ActBlue conduit entries for the same donations. The de-duplicated total is ~$4,088 across ~15 unique contributions.

### Claim-to-API Quick Reference

| Claim Type | Primary API | Endpoint |
|------------|-------------|----------|
| Donation amounts | FEC API | `/schedules/schedule_a/` |
| Total fundraising | FEC API | `/candidates/totals/` |
| Independent expenditures | FEC API | `/schedules/schedule_e/` |
| Federal contracts | USASpending | `/search/spending_by_award/` |
| Voting records | Congress.gov | `/vote` |
| Bill sponsorship | Congress.gov | `/bill` |
| Lobbying expenditures | Senate LDA | `/v1/filings/` |
| Revolving door | Senate LDA | `/v1/lobbyists/` |
| State campaign finance | FollowTheMoney | State-specific endpoints |

---

### Migration Plan

**Phase 1 (DONE):** FEC API tested and working. Reusable query patterns built in `api-toolkit.js`.
**Phase 2 (DONE):** USASpending, Congress.gov, Senate LDA tested and working. CORS requirements documented.
**Phase 3 (DONE):** Scheduled tasks updated (donor-node-builder, profile-builder, media-profile-builder, finance-research). All vault maintenance docs updated with API-first protocols.
**Phase 4 (next):** Build daily briefing system. Automated API pulls for tracked donors, new filings, new votes. Test FollowTheMoney and ProPublica Congress APIs. Register proper FEC API key for higher rate limits.

---

### Pipeline Reports Integration Protocol

The API pipelines run on a scheduled GitHub Actions job and auto-sync their markdown reports into the vault at `content/Vault Maintenance/Pipeline Reports/`. This folder is gitignored (local-only) and overwritten on each pipeline run. The reports are the canonical source for FEC totals, dead URLs, and Congress enrichment status between refreshes.

**Reports present:**

- `fec-pipeline.md`: donor and politician FEC totals, top recipients, ActBlue/WinRed de-duplicated counts
- `congress-pipeline.md`: committee assignments, bill sponsorship, voting records
- `research-report.md`: unified executive summary across all pipelines, plus top-fundraiser leaderboard
- `rss-pipeline.md`: if present, RSS-scraped event drafts (those land in `content/Events/Drafts/`)

**Note:** The old `url-check.md` pipeline report has been retired (archived April 5, 2026). URL health is now tracked via `Vault Maintenance/dead-source-urls-for-perplexity.csv`, generated from an external Perplexity scan of all 11,544 vault URLs. Bulk URL repair is handled by Perplexity batch scans, not by pipeline-generated reports.

Each report carries a `last-run` ISO timestamp in frontmatter and a pretty `_Last run: MM/DD/YYYY, HH:MM PT_` header line for freshness checks.

**Drafting-agent workflow. Every new sub-note, donor node, or master profile build must follow these steps:**

1. **Pre-draft scan.** Before drafting, open `research-report.md` for the cross-cutting summary, then scan `fec-pipeline.md` for any donors, politicians, or PACs the note will cover. Pull fresh totals rather than relying on dossier numbers alone.
2. **Citation sanity-check.** Before committing a note, grep every URL being cited against `Vault Maintenance/dead-source-urls-for-perplexity.csv` to confirm it is not a known dead link. If a URL is dead, replace before shipping.
3. **Pipeline Intel appendix.** When fresh FEC, Congress, or LDA data materially strengthens a note's argument, add a `### Pipeline Intel (auto-synced from [report], [timestamp])` section at the end of the note. Include a regeneration disclaimer: "This section is regenerated from pipeline data. Do not hand-edit; update by re-running the pipeline and re-syncing."
4. **Dead-link triage.** When touching any existing note, check if the note appears in `dead-source-urls-for-perplexity.csv` (the "files" column lists affected notes). Fix or flag any dead URLs found (route to `url-fixer` skill if Chrome is available).

**Editing-agent workflow. Every vault audit or cleanup pass must:**

1. Check `dead-source-urls-for-perplexity.csv` for any dead URLs in files being audited.
2. Prioritize dead-URL repair by analytical weight: notes with Tier 1 or 2 citations dying get fixed before notes with Tier 3 or 4.
3. Do not hand-edit any file in `Pipeline Reports/`. It is regenerated on each pipeline run.

**Freshness rules:**

- If a report's `last-run` timestamp is more than 7 days old, flag the drafting session and request a pipeline refresh before relying on its numbers.
- If `research-report.md` shows `URL report age` or `FEC report age` over 48 hours, note that age in any Pipeline Intel appendix written during that session.

**Why this is not optional.** The pipelines exist to keep donor totals, dead links, and committee assignments fresh without burning Claude tokens on repetitive API fetches. If the drafting agent does not read the synced reports, the vault drifts into stale numbers and dead citations while fresh data sits one directory away.

---

