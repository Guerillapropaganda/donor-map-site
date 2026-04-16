---
title: CSV Data Sources
type: system
last-updated: 2026-04-16
---

# CSV Data Sources

The Donor Map runs on bulk CSV downloads from government and regulatory bodies. This doc catalogs every CSV we ingest, what it contains, how it maps to profile fields, and update cadence.

**Storage:** CSVs live in `data/bulk/` (gitignored — too large for the repo). Download URLs and refresh instructions below.

**Ingest scripts:** all in `scripts/ingest-*-bulk.cjs`. These read from `data/bulk/`, write to canonical JSONL stores (`data/relationships.jsonl`, `data/entities.jsonl`), and optionally trigger auto-block generation in profile bodies.

---

## Priority order for each profile type

### Politicians (federal)

| Priority | Source | Coverage |
|----------|--------|----------|
| 1 | FEC Candidate Master CSV | Canonical FEC IDs, office sought, party, state |
| 2 | FEC Committee Master CSV | Principal campaign committees, PACs aligned |
| 3 | FEC PAC Summary CSV | Total raised, spent, cash-on-hand per cycle |
| 4 | FEC Individual Contributions CSV | Who gave how much, by employer |
| 5 | Congress.gov API (live) | Committee assignments, bills sponsored |
| 6 | GovTrack API (live) | Voting records, ideology scores |
| 7 | House/Senate Financial Disclosures (PTR) | Stock trades, assets (daily scraper) |

### Donors (individuals + PACs)

| Priority | Source | Coverage |
|----------|--------|----------|
| 1 | FEC Individual Contributions CSV | Direct federal contributions |
| 2 | FEC Committee Master CSV | Committees affiliated |
| 3 | FEC PAC Summary CSV | Aggregate spending |
| 4 | IRS 990 via ProPublica Nonprofit Explorer | 501(c) funding flows |
| 5 | State campaign finance (FollowTheMoney successor) | State-level giving |

### Corporations

| Priority | Source | Coverage |
|----------|--------|----------|
| 1 | USASpending Contracts CSV | Federal contract awards |
| 2 | USASpending Grants CSV | Federal grants received |
| 3 | Senate LDA (lobbying) | Lobbying spend + issues + registrants (pipeline resumes June 2026) |
| 4 | FEC Committee Master CSV | Corporate PAC affiliations |
| 5 | SEC EDGAR | 10-K financials, officer lists |
| 6 | EPA FRS (Facility Registry) | Environmental violations |
| 7 | FDA enforcement CSVs | Drug/device/food recalls |

### State + local politicians

| Priority | Source | Coverage |
|----------|--------|----------|
| 1 | State FEC-equivalent CSV | Varies by state — see state-specific notes |
| 2 | FollowTheMoney successor (OpenSecrets state) | Cross-state aggregation |
| 3 | Local news aggregation (RSS) | Current events |

---

## CSV catalog

### FEC Candidate Master

- **File:** `data/bulk/fec/candidate-master-YYYY.csv`
- **Source:** https://www.fec.gov/files/bulk-downloads/YYYY/cn[YY].zip
- **Row count:** ~5,000 per 2-year cycle
- **Primary key:** `CAND_ID` (e.g. `P80001571`, `S4CA00522`, `H8CA45130`)
- **Maps to:**
  - `fec-candidate-id` frontmatter (Senate + Presidential)
  - `fec-candidate-id-house` frontmatter (House)
  - `party` frontmatter (via `CAND_PTY_AFFILIATION`)
  - `state` frontmatter (via `CAND_OFFICE_ST`)
  - `data/entities.jsonl` — type: politician
- **Ingest:** `scripts/ingest-fec-candidate-master.cjs`
- **Update cadence:** quarterly (Jan, Apr, Jul, Oct)

### FEC Committee Master

- **File:** `data/bulk/fec/committee-master-YYYY.csv`
- **Source:** https://www.fec.gov/files/bulk-downloads/YYYY/cm[YY].zip
- **Row count:** ~20,000 per cycle
- **Primary key:** `CMTE_ID` (e.g. `C00234120`)
- **Maps to:** `data/relationships.jsonl` as committee → candidate edges (type: monetary, role: principal-campaign)
- **Ingest:** `scripts/ingest-fec-committee-master.cjs`
- **Update cadence:** quarterly

### FEC PAC Summary

- **File:** `data/bulk/fec/pac-summary-YYYY.csv`
- **Source:** https://www.fec.gov/files/bulk-downloads/YYYY/webk[YY].zip
- **Row count:** ~18,000 per cycle
- **Maps to:**
  - `total-raised`, `total-spent`, `cash-on-hand`, `debts-owed` frontmatter
  - `data/relationships.jsonl` — aggregate edges
- **Ingest:** `scripts/ingest-fec-pac-summary.cjs`
- **Update cadence:** quarterly

### FEC Individual Contributions

- **File:** `data/bulk/fec/individual-contributions-YYYY.csv`
- **Source:** https://www.fec.gov/files/bulk-downloads/YYYY/indiv[YY].zip
- **Row count:** ~20 MILLION per cycle (the big one)
- **Primary key:** `SUB_ID` (per-transaction)
- **Filtering:** we only ingest contributions ≥ $500 to reduce volume. Large-donor focus.
- **Maps to:** `data/relationships.jsonl` — individual donor → committee edges, aggregated by employer
- **Ingest:** `scripts/ingest-fec-individual-bulk.cjs`
- **Update cadence:** quarterly
- **Known incidents:** employer field is free-text, not normalized. "Goldman Sachs" vs "Goldman Sachs & Co." vs "GS" vs "The Goldman Sachs Group Inc" all appear. See `scripts/fec-committee-resolver.cjs` for the normalization pass.

### USASpending Contracts

- **File:** `data/bulk/usaspending/contracts-YYYY.csv`
- **Source:** https://www.usaspending.gov/download_center/award_data_archive
- **Row count:** ~2M rows per fiscal year
- **Filtering:** only rows where `action_type` is new award (not modification), federal contracts only
- **Maps to:** `data/relationships.jsonl` — corporation → agency edges (type: government-contract, with amount + cycle)
- **Ingest:** `scripts/ingest-usaspending-bulk.cjs`
- **Update cadence:** quarterly

### USASpending Grants

- **File:** `data/bulk/usaspending/grants-YYYY.csv`
- **Source:** same as contracts, different filter
- **Maps to:** `data/relationships.jsonl` with type: government-grant
- **Ingest:** `scripts/ingest-usaspending-grants-bulk.cjs`
- **Update cadence:** quarterly

### EPA FRS (Facility Registry)

- **File:** `data/bulk/epa/frs-facility.csv`
- **Source:** https://www.epa.gov/frs/epa-frs-national-combined-csv-download
- **Maps to:** corporation profile `auto:epa-echo` blocks with violations + enforcement actions
- **Ingest:** `scripts/ingest-epa-frs-bulk.cjs`
- **Update cadence:** monthly (EPA updates frequently)

### Congress Bills (bulk ingest — not live pipeline)

- **File:** `data/bulk/congress/bills-119.csv`
- **Source:** https://www.congress.gov/bulk-data
- **Maps to:** `data/events.jsonl` as legislative events
- **Ingest:** `scripts/ingest-congress-bills-bulk.cjs`
- **Update cadence:** on-demand; supplements the live Congress.gov API pipeline

---

## Active API pipelines (not CSV)

Three external APIs are still called live because CSVs don't cover what they provide.

### Congress.gov API

- **Script:** `scripts/committee-assignments-fetch.cjs`
- **Provides:** committee assignments for every politician by cycle, bills sponsored/cosponsored
- **Auth:** Congress.gov API key (in `.env`)
- **Rate limits:** 5,000 req/hour
- **Schedule:** on-demand during profile creation + periodic refresh

### GovTrack API

- **Script:** `scripts/seed-events-from-crypto-votes.cjs` (narrow) + general reads via `scripts/lib/*`
- **Provides:** floor votes, ideology scores, bill status
- **Auth:** none (public)
- **Schedule:** on-demand

### RSS Digest aggregation

- **Scripts:** (live in `donor-map-engine` repo, not this one)
- **Provides:** news events for `content/Events/Drafts/`
- **Schedule:** daily

### STOCK Act financial disclosures

- **Script:** `scripts/financial-disclosures-pipeline.cjs`
- **Provides:** Congressional stock trades via PTR filings
- **Schedule:** daily 6am (attention-dispatcher)

---

## Archived pipelines (retired 2026-04-16)

These API pipelines have been retired in favor of CSV bulk ingest. Scripts moved to `scripts/_archive/` for reference.

| Retired pipeline | Replacement |
|------------------|-------------|
| fec-pipeline, fec-summary-pipeline, fec-individual-pipeline | FEC bulk CSVs |
| occ-pipeline, ftc-pipeline, fda-pipeline | Regulatory CSVs (when available) + ad-hoc scraping |
| sec-edgar-pipeline | SEC EDGAR bulk |
| propublica-pipeline | IRS 990 CSVs |
| doj-press-pipeline, nhtsa-pipeline | Cut — low signal |
| lobbyview-pipeline | Senate LDA (resumes June 2026) |

To resurrect an archived pipeline, see `scripts/_archive/README.md`.

---

## Quarterly refresh playbook

Every quarter (Jan, Apr, Jul, Oct):

1. **Download fresh CSVs** to `data/bulk/` from URLs above
2. **Run each ingest script** in this order:
   ```bash
   node scripts/ingest-fec-candidate-master.cjs
   node scripts/ingest-fec-committee-master.cjs
   node scripts/ingest-fec-pac-summary.cjs
   node scripts/ingest-fec-individual-bulk.cjs
   node scripts/ingest-usaspending-bulk.cjs
   node scripts/ingest-usaspending-grants-bulk.cjs
   node scripts/ingest-epa-frs-bulk.cjs
   ```
3. **Run the relationship cache rebuilder:**
   ```bash
   node scripts/rebuild-relationship-caches.cjs
   ```
4. **Bump `last-enriched` stamps** on affected profiles (automatic via ingest scripts)
5. **Check the attention queue** — data drift may surface new contradictions, missing profiles, promotion candidates
6. **Run `scripts/launch-50-audit.cjs`** to verify launch-50 profiles still pass verification

---

## Data freshness commitment

Public profiles show a "data as of [date]" stamp reflecting the most recent ingest. Our commitment to readers is quarterly refresh minimum. Major events (presidential elections, major policy bills) may trigger ad-hoc refreshes.

Profiles with `last-enriched` older than 90 days show a yellow freshness warning. Older than 180 days triggers staleness-decay (demotion from verified to ready).

---

## Known data quality issues

- **FEC individual contribution employer field is free-text.** Same employer appears under many spellings. Normalization in `scripts/fec-committee-resolver.cjs`.
- **USASpending subcontractor field is incomplete** before FY2017. Prime contract amounts are trusted; subcontract pass-through data is not.
- **State campaign finance varies wildly by state.** CA, NY, TX, FL have good data. Many smaller states are paper-only or behind paywalls.
- **IRS 990s are ~18 months delayed.** A 2024 990 typically appears in mid-2026.

Track all new quality issues in `content/Admin Notes/capitol-trades-data-quality.md` (and similar per-source docs).
