---
title: Pipeline Guide
type: system
last-updated: 2026-04-16
---

# Pipeline Guide

Reference for the 3 active external-API pipelines + the STOCK Act scraper. Plus archived cheatsheets for retired pipelines.

**As of 2026-04-16:** most former pipelines have been archived in favor of CSV bulk ingest. See `content/CSV Data Sources.md` for the CSV approach. This doc covers only the APIs still called live.

---

## Active pipelines

### 1. Congress.gov API

**Purpose:** committee assignments + bills + legislator metadata. CSVs don't cover committee assignments well.

**Identity:** `scripts/committee-assignments-fetch.cjs` and any ad-hoc scripts using `scripts/lib/shared.cjs` Congress.gov helpers.

**Auth:** API key in `CONGRESS_API_KEY` env var. Get from https://api.congress.gov/sign-up/

**Endpoints:**
- `/v3/member/congress/{N}/{stateCode}` — state delegation (preferred for bulk lookup)
- `/v3/member/{bioguideId}` — single member
- `/v3/committee/{congress}/{chamber}` — committee list
- `/v3/bill/{congress}/{type}/{number}` — bill detail

**Rate limits:** 5,000 req/hour per key.

**Canonical URL format:** `https://www.congress.gov/member/{firstname}-{lastname}/{bioguide}`

**Known quirks:**
- `q=` search parameter is NOT a semantic name search — it returns alphabetical matches
- `committee` endpoint returns assignments but requires separate calls per member
- Returns HTTP 200 with empty `members: []` when no match; don't treat as error

**Known incidents (our vault):**
- A000383 contamination (2026-04-09) — `q=` fuzzy match fell through to `candidates[0]?.bioguideId`. Fixed: chamber + state + last-name verification now mandatory
- Nickname misses (2026-04-11) — "Jim Risch" not matched by strict name search. Fixed: nickname-aware matcher in Congress helper
- State-delegation endpoint fixed Bernie Sanders lookup (2026-04-11) — `?query=` was silently ignored on member endpoint; switched to state delegation

**Quality signals:**
- If `member.depiction.attribution` is empty, data is stub — skip
- If `terms.item` is empty array, member record is incomplete — skip
- Bioguide ID format: `[A-Z]{1}[0-9]{6}` — reject malformed

### 2. GovTrack API

**Purpose:** voting records, ideology scores, bill status. Not in any CSV bulk source.

**Identity:** `scripts/seed-events-from-crypto-votes.cjs` and ad-hoc calls.

**Auth:** none (public). Reasonable rate self-limit (1 req/sec).

**Endpoints:**
- `/api/v2/vote` — floor votes with metadata
- `/api/v2/vote_voter` — individual member vote records
- `/api/v2/person/{id}` — politician detail including GovTrack ideology score
- `/api/v2/committee_member?person={id}` — committee assignments (Congress.gov alternative)

**Canonical URL format:** `https://www.govtrack.us/congress/members/{slug}/{govtrack-id}`

**Known quirks:**
- `person_identifiers` has bioguide as `id_bioguide` key, not `bioguide`
- Ideology score is on a -1 to +1 scale, not 0 to 100
- Historical data before 1989 may have NULL on key fields

**Known incidents (our vault):**
- Cache invalidation fix (2026-04-10) — profiles with 0 bills from GovTrack were cached forever despite frontmatter re-enrichment. Fixed: cache key now includes `last-enriched` timestamp
- Committee membership endpoint (2026-04-11) — switched Bernie Sanders' committee lookup from Congress.gov (0 results in 33 calls) to GovTrack's `/committee_member` (14 assignments in 2 calls)

### 3. RSS digest aggregation

**Purpose:** current-events capture for `content/Events/Drafts/`.

**Location:** lives in the private `donor-map-engine` repo, not this one. Writes event markdown files to `content/Events/Drafts/YYYY-MM-DD Headline.md`.

**Schedule:** daily via GitHub Actions in the engine repo.

**No auth, no rate limit issues.** Standard RSS parsers.

**Known incidents:**
- Special-character filenames break Windows git checkout (single-quote, em-dash, unicode). Engine repo handles normalization but occasional bad filenames slip through — flagged to David when encountered.

### 5. Cal-Access (California campaign finance, bulk TSV)

**Purpose:** California state-level campaign finance — donor → CA committee receipts and IE-PAC support/opposition. Without this, CA gubernatorial candidates appear to have only their federal money (FEC), which is a fraction of their actual fundraising. Steyer's $1B 2020 federal Pres run is in FEC; his current CA-Gov self-funding is in Cal-Access.

**Identity:** `scripts/ingest-cal-access-bulk.cjs` + `scripts/cal-access-discover-committees.cjs` + `scripts/lib/cal-access-helpers.cjs`. Manual run only (the dump is ~9.4GB unzipped — David downloads on cadence; no scheduled hit).

**Source:** https://campaignfinance.cdn.sos.ca.gov/dbwebexport.zip — single bulk archive, ~500MB zipped, daily refresh by CA Secretary of State.

**Auth:** none.

**Tables consumed:**
- `RCPT_CD.TSV` — receipts (~19M rows / 3.6GB). The big one.
- `FILER_FILINGS_CD.TSV` — filing → filer join (filings carry FILING_ID; recipient filer is one hop away, ~2.8M rows / 370MB).
- `FILERNAME_CD.TSV` — filer name registry (~1.3M rows / 178MB).
- `FILER_TO_FILER_TYPE_CD.TSV` — committee classification (CTL / IE / PAC).

**Identifiers:**
- `FILER_ID` (e.g. `1485077`) — opaque CA SoS committee/filer ID.
- Empirically observed taxonomy codes:
  - `CATEGORY=40002` = candidate-controlled committee (CTL)
  - `SUB_CATEGORY=40102` = independent expenditure / supporting committee
  - `SUB_CATEGORY=40101` = ballot measure committee
  - `SUB_CATEGORY=40103` = general-purpose PAC / sponsored committee
  - `CATEGORY=0 + SUB=0` = individual donor / non-committee filer (rejected by ingester)

**Canonical URL:** `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=<FILER_ID>` for committee pages. Documentation: `https://www.sos.ca.gov/campaign-lobbying/cal-access-resources/raw-data-campaign-finance-and-lobbying-activity`. Codebook: `https://www.sos.ca.gov/sites/default/files/2024-04/calaccess-codebook.pdf` (not yet ingested into the cheatsheet — TODO).

**Output:** edges write to `data/derived/cal-access-bulk.jsonl` via `relationships-store.upsertEdges()`. Source registers in `data/sources.jsonl` (`tier: 1, source_type: 'government_primary'`). Run summary in `data/cal-access-bulk-summary.json`. Override map for the candidate-to-filer-id join in `data/cal-access-filer-overrides.json`.

**Edge model (option 2 — IE committees as separate entities):**
- `controlled` committee receipts: edge donor → `<Candidate>` (collapsed to candidate identity)
- `ie_supporting` / `ie_opposing` committee receipts: edge donor → `<Committee Name>` (separate entity), plus a single `political-support` / `political-opposition` edge from committee → candidate

**Filer-to-candidate join:** Cal-Access has no clean "controlled committee" pointer. Discovery uses heuristic name matching (last name + first-name hints) over `FILERNAME_CD`, plus committee-context keywords (GOVERNOR, MAYOR, OFFICEHOLDER, etc.). Common surnames flagged `strict: true` to require first-name match (Yee, Porter, Mahan, Hilton). Output written to the override map for human review before ingest.

**Workflow:**
```
# Drop the unzipped DATA/ directory at C:/donor-map-data/bulk/CalAccess/DATA
# (or set CAL_ACCESS_BULK_DIR env var to elsewhere)
node scripts/cal-access-discover-committees.cjs       # populate override map
# eyeball data/cal-access-filer-overrides.json, remove false positives
node --max-old-space-size=4096 scripts/ingest-cal-access-bulk.cjs --dry-run --verbose
node --max-old-space-size=4096 scripts/ingest-cal-access-bulk.cjs   # for real
```

**Known quirks:**
- TSV rows: tab-separated, NO quoting, NO escaping. Empty fields are consecutive tabs.
- Names are stored ALL CAPS — ingester title-cases for display (preserves all-caps acronyms ≤4 chars like LLC/PAC).
- The same FILER_ID appears multiple times in `FILERNAME_CD` under different xref aliases — ingester keeps first non-empty NAML.
- Self-loops: when a wealthy candidate self-funds (Steyer 2026, Thurmond), donor name and recipient collapse to the same canonical name. The relationships-store validator rejects these as `self-loop: from === to`. Logged but not fatal — data is honest.
- Committee-to-committee transfers: when a candidate has multiple cycles of committees (e.g. "Becerra for Attorney General 2018" → "Becerra for Governor 2026"), both collapse to the candidate's canonical name. The "from" stays as the originating committee name, "to" becomes the candidate, producing an apparent committee → candidate edge that's actually an internal transfer. Future fix: librarian-side alias merging via `duplicate-entity-merges` queue.
- 19.3M RCPT rows scan in ~52s on Windows NVMe at 375k rows/s.
- Override map needs human curation: discovery matches PORTER + KATIE, but also picks up MIA LIVAS PORTER (different person) when `strict: false` — review before ingest.

**Quality signals:**
- ≥1 controlled committee per candidate = the candidate is actively raising money in CA (covers the active race).
- `ie_supporting` count > 0 = there's outside money for the candidate.
- Aggregated edges rounded to cents (the underlying receipts are integer cents but Cal-Access stores them as decimals).
- Donor → committee edges with `confidence: 0.95`, source: `cal-access-bulk`.

**Known incidents (our vault):** None yet — first production run shipped 2026-04-29. Add here as anything surprising shows up.

**Skipped:**
- Frontmatter cache rebuild (`rebuild-relationship-caches.cjs`) was NOT run for cal-access edges. Reason: a full rebuild bloated Villaraigosa's profile frontmatter to 473KB (~24k unique donor wikilinks), and the `donors` field was never designed for that scale. The `/races/ca-gov-2026` ops page reads the canonical store via the librarian instead — no frontmatter dependency. If a future change wants per-donor wikilinks on the candidate profile, do it via auto-blocks in the body, not frontmatter.
- Phase 3 of the pipeline plan (EXPN_CD expenditures) is deferred. Receipts only for now.

---

### 4. STOCK Act Financial Disclosures (scraper)

**Purpose:** Congressional stock trades (Periodic Transaction Reports).

**Identity:** `scripts/financial-disclosures-pipeline.cjs`. Runs daily at 6am via `attention-dispatcher.cjs`.

**Sources:**
- House: https://disclosures-clerk.house.gov/FinancialDisclosure
- Senate: https://efdsearch.senate.gov/search/

**Auth:** none, but Senate requires CAPTCHA accept (session cookie handling).

**Output:** writes PTR events to `data/events.jsonl` and corresponding edges to `data/relationships.jsonl`. Ops app renders at `/capitol-trades`.

**Known quirks:**
- House publishes PDFs not CSVs — OCR pipeline required
- Senate search returns HTML only, no API
- Date ranges queried in 30-day windows to avoid timeouts
- Trades over $1M in a single transaction are rare but legally required to disclose within 45 days

**Known incidents:**
- OCR accuracy on hand-filled House PDFs ranges from 70-95% depending on filer. Some trades miss and need manual entry.
- Senate CAPTCHA refreshed cookies every 24 hours — scraper handles re-auth

---

## Archived pipelines (retired 2026-04-16)

The following pipelines have been retired. Scripts moved to `scripts/_archive/` or live in the `donor-map-engine` repo. CSV bulk ingest replaces them. To resurrect see `scripts/_archive/README.md`.

**FEC API pipelines** → replaced by `data/bulk/fec/` CSVs
- fec-pipeline.cjs, fec-summary-pipeline.cjs, fec-individual-pipeline.cjs

**USASpending API** → replaced by `data/bulk/usaspending/` CSVs

**Regulatory APIs** → kept as code but not scheduled, run ad-hoc if needed
- FDA (drug/device/food enforcement)
- OCC (national bank enforcement)
- FTC (mergers + historical enforcement)
- SEC EDGAR
- NHTSA
- DOJ Press

**ProPublica Nonprofit** → replaced by IRS 990 CSV ingest

**Senate LDA (lobbying)** → resumes June 2026 when lda.gov migration completes. Archive all LDA URLs encountered before then.

**LobbyView** → retired. 1-hour Firebase ID tokens incompatible with scheduled CI. Senate LDA is the authoritative replacement.

---

## Building a new pipeline

When a new data source becomes necessary (edge case CSVs don't cover):

1. **Check `content/Admin Notes/perplexity-prompt-library.md`** for a matching research template
2. **Request research from David via Perplexity** before writing any code
3. **Add a cheatsheet section here** before the first line of code
4. **Follow the existing cheatsheet format:** Identity, Auth, Endpoints, Rate limits, Canonical URL, Known quirks, Known incidents, Quality signals
5. **If no research available** (obscure API), revert to generic REST conventions (base URL, offset/limit pagination, JSON responses, 429 backoff) and document prominently: "No research available — implementation uses generic REST conventions"
6. **Never build a pipeline without a cheatsheet section here.**

## Engine-wide known incidents

Incidents that affect multiple pipelines:

### FileCache null/undefined bug (fixed 2026-04-11)
`FileCache.get()` returned `null` for unknown keys, but calling code checked `!== undefined`. Null-caching legitimate "no data" responses resulted in never re-querying. Fixed in `scripts/lib/shared.cjs`.

### api-config dual env-var naming (fixed 2026-04-11)
Some code paths read `FEC_API_KEY`, others read `FECAPI`. Fixed with `pickKey()` helper accepting both forms.

### Workflow stale-log cache contamination (fixed 2026-04-11)
api-enrichment.yml cached per-pipeline logs, producing identical counts across commits even though runs were different. Fixed: logs excluded from cache, wipe at step start.

### requireRealKeys() guard (fixed 2026-04-11)
Pipelines running with `DEMO_KEY` silently produced no-match results. Guard added to hard-fail on DEMO_KEY at pipeline entry.

### Stuck scheduler (fixed 2026-04-11)
api-enrichment.yml scheduled trigger dead since 2026-04-09 17:44Z. Workaround: `gh workflow disable` then `enable` refreshes `updated_at`. Root cause in GitHub Actions scheduler — recurs periodically, documented fix.
