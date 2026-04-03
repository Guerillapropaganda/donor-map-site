---
title: "Quality Standards — The Donor Map Database"
type: reference
content-readiness: ready
last-updated: 2026-03-26
source-tier: null
parent: null
---

### Quality Standards — The Donor Map Database

### This document is mandatory reading for every session. No exceptions.

This is the constitution of the vault. It defines what quality means, how to verify sources, and what must happen before any content is written. If the operations manual defines procedures, this is the integrity standard.

---

### Source Verification Protocol

### Rule: Always use API sources before manual browsing. Every source URL must be verified before being written to a vault file.

No URL goes into the vault unless it has been confirmed to load a real article. This is the single most important quality rule. It exists because batch URL construction produced 300+ broken links across NPR, WaPo, The Intercept, PBS, and Newsweek — fabricated article IDs and slugs that 404.

### Verification method — API-first, then Chrome:

**Step 1: Check if API data is available (always do this first)**

For donation amounts, fundraising totals, independent expenditures, federal contracts, voting records, bill sponsorship, lobbying expenditures, and revolving door data — use the API pipeline before any manual browsing. See [[API Pipeline]] for full documentation and `api-toolkit.js` for reusable functions.

| Data Type | API Source | Endpoint |
|-----------|-----------|----------|
| Individual donations | FEC API | `/schedules/schedule_a/` |
| Fundraising totals | FEC API | `/candidates/totals/` |
| Independent expenditures | FEC API | `/schedules/schedule_e/` |
| Federal contracts | USASpending API | `/search/spending_by_award/` |
| Voting records | Congress.gov API | `/vote` |
| Bill sponsorship | Congress.gov API | `/bill` |
| Lobbying expenditures | Senate LDA API | `/v1/filings/` |
| State campaign finance | FollowTheMoney API | State-specific endpoints |

API data is Tier 1 by default — it comes directly from government databases. API-sourced data eliminates URL fabrication risk entirely and reduces token consumption by approximately 10x compared to manual Chrome browsing.

**FEC individual contributions — cite the direct API endpoint with DEMO_KEY:**

The FEC.gov web interface does NOT aggregate across contributor name variations (the API does fuzzy matching, the web interface does exact matching). OpenSecrets Donor Lookup also fails (free tier rate-limited, OS Pro has $200 minimum threshold). The direct API endpoint is the only URL that returns the complete record — and it IS browsable (returns JSON that readers can verify directly).

```
- [FEC API: [Name] individual contributions ([N] results, $[total])](https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=[last]%2C+[first]&api_key=DEMO_KEY&per_page=100&sort=-contribution_receipt_date) (Tier 1)
```

When the FEC web interface shows fewer results than the API, add a technical disclaimer below the citation explaining the name-matching limitation. See [[API Pipeline]] for the full disclaimer template.

**Other API citation URLs (web interface — these work correctly):**
```
- [FEC: [Name] candidate totals](https://www.fec.gov/data/candidate/[CANDIDATE_ID]/) (Tier 1)
- [USASpending: [Company] federal contracts](https://www.usaspending.gov/search/?hash=[search_hash]) (Tier 1)
- [Congress.gov: [Name] voting record](https://www.congress.gov/member/[name]/[bioguide_id]) (Tier 1)
- [Senate LDA: [Company] lobbying filings](https://lda.senate.gov/filings/public/filing/search/?registrant=[name]) (Tier 1)
```

**Important:** All API calls must be executed via Chrome browser JavaScript context (`fetch()` through `javascript_tool`). The VM proxy blocks direct HTTP requests (curl, Python requests). See [[API Pipeline]] for implementation details.

**Step 2: Chrome browser load test (for non-API sources)**

For investigative journalism, news articles, and other non-API sources:
1. Navigate to the URL using Chrome browser automation
2. Check `document.title` after the page loads
3. If the title contains the article headline → **VALID**
4. If the title contains "Page Not Found", "404", or the site's generic homepage title → **BROKEN**
5. Log the result in the [[Source URL Audit Log]]

**If Chrome is unavailable:** Mark the citation with `(UNVERIFIED)` inline:
```
- [Source Name: Description](https://url) (Tier X) (UNVERIFIED)
```
Future sessions must verify these before promoting the file to `ready`.

**If a URL cannot be found and no alternative exists:** Keep the citation text but remove the URL:
```
- Source Name: Description (Tier X) (URL NEEDED)
```
A described source without a link is better than a link that 404s.

**API data completeness note:** API queries with NO date filter often return MORE results than the web interface or filtered queries. For example, FEC API with no date range returned 7 contributions for a donor vs. 2 with a 2015-2026 filter — missing $4,300+ in older donations. When accuracy matters, run API queries without date filters first, then narrow if needed.

---

### API-First Fallback Hierarchy

When an agent needs quantitative data available via API, follow this order:

1. **Chrome available + API reachable:** Execute API call via Chrome JS context. This is the default.
2. **Chrome available + API rate-limited or erroring:** Fall back to Chrome manual browsing of the same data source's web interface (e.g., FEC.gov web search). Mark data source as `(Web Interface — API unavailable)` in session report.
3. **Chrome unavailable entirely:** Do not attempt API calls or manual browsing. Use web search to locate the specific data point. If found via web search with a Tier 2+ source, cite that source at its actual tier (not Tier 1). If not found, mark the data gap as `(API DATA PENDING — Chrome required)` in the file and move to the next task.
4. **No data obtainable by any method:** Document the gap. Do not fabricate. Do not guess. Move on.

**An agent must never block an entire session because Chrome is unavailable.** Non-API work (formatting, wikilinks, analysis writing, editorial discussion) proceeds normally regardless of Chrome status.

---

### URL Repair Protocol — Fixing Broken and Missing Sources

When a source URL is broken or missing, follow this repair sequence. The `url-fixer` skill implements this protocol — use the skill for all URL repair work. This section documents the canonical rules.

**Step 1 — API triage (always check first):** If the citation's underlying claim is API-resolvable (donation amounts, fundraising totals, voting records, federal contracts, lobbying expenditures), replace the broken citation with an API citation. This is faster, more reliable, and produces a Tier 1 source. See [[API Pipeline]] for citation format.

**Step 2 — WebSearch for article URL:** Extract the citation's descriptive text (source name, article title, topic, date) and search. Try up to 3 searches: article title, `site:[domain]` plus key terms, then broader topic + outlet name. Look for the exact article or a direct equivalent from the same outlet covering the same specific claim.

**Step 3 — Chrome verification gate (mandatory):** Every candidate URL must pass a Chrome load test before being written to the vault. Navigate to the URL, check `document.title`, confirm it matches the article headline. If the title matches a known 404 pattern (see 404 Detection Patterns above), the URL is broken — try the next candidate.

**Step 4 — Write and log:** Update the citation in the vault file, update `last-updated` in YAML, and log the verified URL in the [[Source URL Audit Log]].

**If repair fails after 3 search attempts:** Leave the `(URL NEEDED)` tag in place. Log the failed attempt in the Source URL Audit Log so future sessions don't repeat the same dead ends. A missing URL is better than a fabricated one.

**Single-pass rule:** Process one URL per invocation. Batch URL repair is prohibited — it caused the original 300+ broken link problem.

---

### Trusted Source Registry

Before constructing any URL, check the [[Source URL Audit Log]] for:
1. **Known URL patterns** — each outlet has a specific URL structure. Use it.
2. **Previously verified URLs** — if the URL is already in the audit log as VALID, use it directly.
3. **Known broken URLs** — if the URL is flagged as BROKEN, do not reuse it.

### URL patterns by outlet:

| Outlet | URL Pattern | Notes |
|--------|------------|-------|
| **OpenSecrets** | `opensecrets.org/members-of-congress/[name]/summary?cid=[ID]` | CID is stable, findable on the site |
| **FEC** | `fec.gov/data/candidate/[ID]/` or `fec.gov/data/committee/[ID]/` | Candidate/committee IDs are stable |
| **ProPublica** | `propublica.org/article/[slug]` | Slugs are descriptive, no date in path |
| **The Intercept** | `theintercept.com/YYYY/MM/DD/[slug]/` | Date + slug required |
| **NPR** | `npr.org/YYYY/MM/DD/[article-id]/[slug]` | Article ID is numeric or `nx-s1-`/`g-s1-` prefixed. ID must be real — never guess. |
| **WaPo** | `washingtonpost.com/[section]/YYYY/MM/DD/[slug]/[UUID]_story.html` | Older articles need UUID suffix. Newer (2024+) may work without. |
| **PBS NewsHour** | `pbs.org/newshour/[section]/[slug]` | No date in URL path |
| **Newsweek** | `newsweek.com/[slug]-[article-id]` | Numeric article ID at end of slug |
| **CalMatters** | `calmatters.org/[section]/YYYY/MM/[slug]/` | Date uses month only, no day |
| **Ballotpedia** | `ballotpedia.org/[Page_Name]` | Wiki-style page names with underscores |
| **FollowTheMoney** | `followthemoney.org/entity-details?eid=[ID]` | Entity IDs are numeric |
| **FPPC** | `fppc.ca.gov/...` | California-specific, various URL structures |
| **Congress.gov** | `congress.gov/bill/[congress]/[chamber]-bill/[number]` | Stable bill reference format |

**Never fabricate article IDs.** If you don't know the real URL, search for it via Chrome or web search, verify it loads, then use it.

---

### Content Readiness Gates

No file may be promoted to a higher `content-readiness` status unless it passes these gates:

**raw → draft:**
- Any substantive content added beyond tags and wikilinks

**draft → developed:**
- 50+ lines of content
- 3+ source URLs OR 3+ `###` sections
- All source URLs verified (no `UNVERIFIED` tags remaining)

**developed → ready:**
- Full citation pass — every claim has a sourced URL
- All URLs verified via Chrome load test and logged in [[Source URL Audit Log]]
- Source tier label on every citation
- All wikilinks resolve (no broken `[[links]]`)
- `###` header formatting on all sections (no `**bold headers**`)
- Class analysis present
- YAML frontmatter complete and accurate

### Readiness gate — source verification tags

**Content files** (`type: politician`, `sub-note`, `donor`, `pac`, `corporation`, `story`, `daily-update`): A file with any `(UNVERIFIED)` or `(URL NEEDED)` tags in its own source citations cannot be `ready`. No exceptions.

**System files** (`type: reference`, `methodology`, `index`): The tag gate applies only to the file's own source citations. References to, discussion of, or logging of these tags in other files does not block `ready` status. Agents and audits must check the `type:` YAML field before applying this gate.

---

### Session Workflow — Quality Checkpoints

Every session must:

1. **Read mandatory docs first:** CLAUDE.md → Quality Standards (this file) → Session Timeline → Publish Roadmap → [[API Pipeline]]
2. **Check the Source URL Audit Log** before writing any source citations
3. **Use API sources first** for all data available via API (FEC, USASpending, Congress.gov, Senate LDA) — see [[API Pipeline]] and `api-toolkit.js`
4. **Verify every non-API URL via Chrome** before writing it to a vault file
5. **Log verified URLs** in the Source URL Audit Log
6. **Update the Session Timeline** at end of session with work completed
7. **Update the Publish Roadmap** if any milestones were hit
8. **Flag tool limitations immediately** — if a better tool or approach exists for a task, raise it before defaulting to a slower method

---

### API Pipeline — Primary Data Source

The API pipeline is the primary data collection layer for all quantitative data in the vault. APIs produce cleaner, more reliable data than manual browser research, reduce token consumption by approximately 10x, and eliminate URL fabrication risk.

### When to use APIs (always check first):
- FEC data: individual contributions, candidate totals, independent expenditures, committee data
- USASpending: federal contracts and grants by recipient
- Congress.gov: voting records, bill text, member profiles, committee data
- Senate LDA: lobbying filings, registrants, clients

### API toolkit location:
- Documentation: `topics/Vault Maintenance/API Pipeline.md`
- Reusable functions: `topics/Vault Maintenance/api-toolkit.js`
- Execution: Chrome JavaScript context via `javascript_tool` (VM proxy blocks direct HTTP)

### Chrome Browser — Required Tool for Non-API URL Work

Chrome browser automation is the primary tool for URL verification of non-API sources (journalism, news articles, reference pages). It provides binary confirmation (loads vs. 404) with no guesswork.

### When to use Chrome:
- Verifying non-API source URLs before writing them to the vault
- Batch-checking URLs during audit passes
- Confirming that a web search result actually resolves
- Executing API calls via `javascript_tool` (required — VM proxy blocks direct HTTP)

### When NOT to use Chrome for manual browsing:
- The data is available via API (use API instead — faster, more accurate, Tier 1)
- The URL is already in the Source URL Audit Log as VALID

**404 detection patterns by site:**

| Site | 404 Title Pattern |
|------|------------------|
| WaPo | `Page Not Found - The Washington Post` |
| NPR | `Page Not Found : NPR` |
| The Intercept | `Page not found - The Intercept` |
| PBS | `Page Not Found` or redirect to homepage |
| Newsweek | `Page Not Found` |
| ProPublica | `Page Not Found` |

---

### Archiving Policy

**Session Timeline:** Keep only the last 2-3 weeks of active sessions. Move older entries to `Archive/Session History Archive.md` when the timeline exceeds ~100 recent entries.

**Audit logs:** Completed one-time audits (like vault audits, formatting scans) move to `Archive/` once their action items are resolved. The Source URL Audit Log is permanent and never archived.

**Vault Maintenance folder:** Keep only active, living documents in the top level. Reference material and completed audits go to `Archive/`.

---

### Temporal Mapping Table Standards

Every temporal mapping table in the vault must conform to one of four standardized formats (defined in CLAUDE.md). Non-compliant tables block promotion to `ready`.

**Compliance checklist:**
1. **Exactly 5 columns** — no more, no fewer
2. **Date is column 1, Amount is column 3** — always
3. **Correct format for file type** — Format 1 for politician master profiles, Format 2 for donor nodes, Format 3 for sub-notes/stories, Format 4 for super PACs and dark money entities
4. **Section header is `###`** — not bold text, not `##` or `####`
5. **Minimum 6-8 rows** — tables shorter than 6 rows need expansion or justification
6. **`> [!money]` callout follows the table** with analytical synthesis
7. **Format 1 only:** Rows organized by sector with `####` sub-headers (e.g., `#### Wall Street / Finance`)

**Legacy tables:** Tables created before March 2026 may use non-standard column structures (e.g., `| Date | Event Type | Details | Amount/Value | Time Gap |`). These must be retrofitted to the correct format before the file can be promoted to `ready`.

**Reference implementation:** `_TABLE_FORMAT_EXAMPLES.md` (vault root) contains approved examples of all four formats using real vault data.

---

### Integrity Principles

1. **A broken link is worse than no link.** It creates false confidence. Remove or flag it.
2. **Verification is not optional.** Every URL, every time.
3. **The audit log is the source of truth.** If it's not in the log, it hasn't been verified.
4. **Flag problems immediately.** If you know a better approach exists, say so before grinding through a worse one.
5. **The vault serves the thesis.** Every piece of infrastructure exists to support the claim that donors control politicians. If a process doesn't serve that, simplify it.
