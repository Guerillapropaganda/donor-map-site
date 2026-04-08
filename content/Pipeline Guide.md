---
title: Pipeline Guide
type: system
last-updated: 2026-04-08
---

# Pipeline Guide — The Donor Map

How data flows from government APIs into vault profiles. Code Claude maintains these pipelines. Research Claude reads the output.

---

## API Inventory

| Pipeline | API Source | Tier | Auth | What it provides |
|----------|-----------|------|------|-----------------|
| **FEC** | api.open.fec.gov | 1 | API key | Donor contributions, independent expenditures, politicians-funded |
| **FEC Summary** | api.open.fec.gov | 1 | API key | Total raised/spent, cash on hand, debt per cycle |
| **Congress** | api.congress.gov | 1 | API key | Bills sponsored, policy areas, member details |
| **Committee** | api.congress.gov | 1 | API key | Committee and subcommittee assignments |
| **Senate LDA** | lda.gov (migrated from lda.senate.gov) | 1 | Token | Lobbying filings, spend totals, issues lobbied |
| **LobbyView** | rest-api.lobbyview.org | 1 | Token | Client-bill lobbying networks, NAICS codes |
| **FARA** | fara.us/api | 1 | None | Foreign agent registrations, foreign principals |
| **USASpending** | api.usaspending.gov | 1 | None | Federal contracts, grants, awards |
| **USASpending Awards** | api.usaspending.gov | 1 | None | Subawards, spending breakdowns by agency/NAICS |
| **SAM.gov** | api.sam.gov | 1 | API key | Entity registrations, contract opportunities |
| **GovTrack** | govtrack.us/api | 1 | None | Vote analysis, bill tracking, legislator data |
| **Federal Register** | federalregister.gov/api | 1 | None | Federal rulemaking, proposed rules, notices |
| **SEC EDGAR** | efts.sec.gov | 1 | None | Corporate filings (10-K, 10-Q, DEF 14A, etc.) |
| **SEC Litigation** | efts.sec.gov | 1 | None | SEC enforcement actions, litigation releases |
| **CourtListener** | courtlistener.com/api | 1 | API key | Federal court dockets, RECAP records |
| **DOJ Press** | justice.gov/api | 1 | None | DOJ press releases, enforcement actions |
| **EPA ECHO** | echo.epa.gov/api | 1 | None | Environmental violations, facility compliance |
| **OSHA** | apiprod.dol.gov/v4 | 1 | API key | Workplace safety inspections, penalties |
| **CPSC Recalls** | saferproducts.gov | 1 | None | Consumer product safety recalls |
| **NHTSA Recalls** | api.nhtsa.gov | 1 | None | Vehicle recalls, complaints, investigations |
| **FCC** | publicfiles.fcc.gov | 1 | None | Political ad buys (per-station only, limited) |
| **Stock Watcher** | S3/GitHub bulk data | 1 | None | Congressional stock trades (Senate only) |
| **OFAC SDN** | treasury.gov/ofac | 1 | None | Sanctions list screening (bulk CSV) |
| **GLEIF** | api.gleif.org | 1 | None | Legal Entity Identifiers, corporate ownership |
| **OpenSanctions** | api.opensanctions.org | 2 | API key | PEP screening, international sanctions |
| **Nonprofit 990** | propublica.org/nonprofits | 2 | None | IRS 990 tax filings, revenue, exec comp |
| **Public Accountability** | publicaccountability.org | 2 | None | UC Berkeley public records (1.9B records) |
| **Wikipedia** | wikidata.org + en.wikipedia.org | 3 | None | Entity IDs, descriptions, key facts |
| **Lobbying Cross-Ref** | Local vault analysis | — | None | Influence chains: lobbying → donations → committees |
| **Auto-Connection Engine** | Local vault analysis | — | None | Maps relationships: donor↔politician bidirectional, shared donors, opposition enforcement |
| **RSS** | Various feeds | 2-3 | None | News event matching against profiles |

## Scripts

All scripts live in `donor-map-engine/scripts/`. Run from the engine repo root.

| Script | Targets | Limit | Key frontmatter |
|--------|---------|-------|-----------------|
| `fec-pipeline.cjs` | Politicians + Donors | 30 | `total-raised`, `total-spent`, `politicians-funded` |
| `fec-summary-pipeline.cjs` | Politicians | 20 | `fec-candidate-id`, `fec-cycle`, `cash-on-hand` |
| `congress-pipeline.cjs` | Politicians | 30 | `congress-id`, `bills-sponsored` |
| `committee-pipeline.cjs` | Politicians | 20 | `committees` |
| `lda-pipeline.cjs` | Donors/Corps | 20 | `lobbying-spend`, `lobbying-filings` |
| `lobbyview-pipeline.cjs` | Donors/Corps | 5 | `lobbyview-bills`, `naics-code` |
| `fara-pipeline.cjs` | All entities | 15 | `fara-registrant`, `fara-principals` |
| `usaspending-pipeline.cjs` | Donors/Corps | 10 | `federal-contracts`, `contract-total` |
| `usaspending-awards-pipeline.cjs` | Donors/Corps | 15 | `subawards-issued`, `top-federal-agency` |
| `sam-pipeline.cjs` | Donors/Corps | 10 | `sam-registered` |
| `govtrack-pipeline.cjs` | Politicians | 5 | `govtrack-id`, `leadership-score` |
| `federal-register-pipeline.cjs` | All entities | 20 | `federal-register-mentions`, `regulatory-agencies` |
| `sec-edgar-pipeline.cjs` | Corps/Donors | 15 | `sec-filings`, `sec-form-types` |
| `sec-litigation-pipeline.cjs` | Corps/Donors | 15 | `sec-enforcement-actions` |
| `courtlistener-pipeline.cjs` | All entities | 15 | `court-cases`, `court-jurisdictions` |
| `doj-press-pipeline.cjs` | All entities | 15 | `doj-press-mentions`, `doj-components` |
| `epa-echo-pipeline.cjs` | Corporations | 15 | `epa-violations`, `epa-facilities` |
| `osha-pipeline.cjs` | Corporations | 15 | `osha-inspections`, `osha-penalties` |
| `recall-pipeline.cjs` | Corporations | 15 | `cpsc-recalls` |
| `nhtsa-recalls-pipeline.cjs` | Corporations | 15 | `nhtsa-recalls`, `nhtsa-complaints` |
| `fcc-political-pipeline.cjs` | All entities | 15 | `fcc-political-files` |
| `stock-watcher-pipeline.cjs` | Politicians | all | `stock-trades`, `stock-trade-tickers` |
| `ofac-sdn-pipeline.cjs` | All entities | all | `ofac-sdn-match`, `ofac-programs` |
| `gleif-pipeline.cjs` | Corps/Donors | 30 | `lei`, `lei-jurisdiction`, `lei-parent` |
| `opensanctions-pipeline.cjs` | All entities | 50 | `opensanctions-status`, `opensanctions-matches` |
| `nonprofit-990-pipeline.cjs` | Corps/Donors/Think-tanks | 20 | `ein`, `nonprofit-status`, `total-revenue` |
| `public-accountability-pipeline.cjs` | All entities | 15 | `public-accountability-records` |
| `wikipedia-pipeline.cjs` | All entities | 30 | `wikidata-id`, `wikipedia-url`, `wikipedia-extract` |
| `lobbying-contrib-pipeline.cjs` | All entities | all | Influence cross-reference (body only) |
| `rss-pipeline.cjs` | All profiles | N/A | Creates event draft files |
| `pipeline-coverage-report.cjs` | All profiles | N/A | Reports only (JSON + MD) |
| `opensecrets-replace.cjs` | All files | N/A | Replaces URLs in body |

## Running Pipelines

**Every script follows the same pattern:**
```bash
node scripts/{name}.cjs                    # dry run (preview only)
node scripts/{name}.cjs --write            # apply changes to vault
node scripts/{name}.cjs --write --verbose  # detailed output
node scripts/{name}.cjs --profile="Name"   # target single profile
node scripts/{name}.cjs --write --limit=10 # cap profiles per run
```

**Local runs** require `CONTENT_DIR` pointed at the site repo:
```bash
cd /c/Users/third/donor-map-engine
CONTENT_DIR=/c/Users/third/donor-map-site/content node scripts/fec-pipeline.cjs --write --verbose
```

**GitHub Actions** runs automatically via `api-enrichment.yml`:
```bash
# Trigger from CLI
cd /c/Users/third/donor-map-engine
gh workflow run api-enrichment.yml --field limit=20 --field pipeline=all
gh workflow run api-enrichment.yml --field limit=5 --field pipeline=lobbyview
```

Pipeline options: `fec`, `fec-summary`, `congress`, `committee`, `propublica`, `nonprofit-990`, `sam`, `lda`, `usaspending`, `usaspending-awards`, `govtrack`, `lobbyview`, `fara`, `courtlistener`, `federal-register`, `sec-edgar`, `sec-litigation`, `public-accountability`, `fcc`, `opensanctions`, `doj-press`, `wikipedia`, `ofac-sdn`, `recall`, `nhtsa-recalls`, `lobbying-contrib`, `stock-watcher`, `gleif`, `epa-echo`, `osha`, `all`

## How Data Lands in Profiles

### 1. Frontmatter (numbers)
Pipeline writes key-value pairs directly into YAML frontmatter:
```yaml
total-raised: 2400000
bills-sponsored: 12
lobbying-spend: 5600000
last-enriched: 2026-04-06
```
Components on the site read these values for live display (Both Sides meter, ProfileWidget stats).

### 2. Auto-blocks (formatted sections)
Pipeline writes formatted content inside HTML comment markers:
```markdown
<!-- auto:fec-fundraising start -->
### FEC Fundraising Summary

| Metric | Value |
|--------|-------|
| Total Raised | $2.4M |
| Individual Contributions | $1.8M |
...

- [Source: FEC](https://www.fec.gov/data/candidate/...) (Tier 1)
<!-- auto:fec-fundraising end -->
```

**Block types currently in use:**
- `auto:fec-fundraising` — FEC financial summary
- `auto:fec-donors` — Top donor contributions
- `auto:fec-summary` — Campaign finance totals per cycle
- `auto:congress-legislation` — Bills, committees, policy areas
- `auto:committee-assignments` — Committee and subcommittee assignments
- `auto:lda-lobbying` — Lobbying activity and spend
- `auto:lobbyview-networks` — Bill-level lobbying networks
- `auto:fara-foreign-agent` — FARA foreign agent registrations
- `auto:usaspending-contracts` — Federal contract awards
- `auto:usaspending-subawards` — Subaward details and spending breakdowns
- `auto:sam-registration` — SAM.gov entity data
- `auto:govtrack-votes` — Voting record and scores
- `auto:federal-register` — Federal rulemaking mentions
- `auto:sec-filings` — SEC EDGAR corporate filings
- `auto:sec-enforcement` — SEC enforcement actions
- `auto:courtlistener-cases` — Federal court records
- `auto:doj-press` — DOJ press releases
- `auto:epa-echo` — EPA environmental violations
- `auto:osha-safety` — OSHA workplace inspections
- `auto:cpsc-recalls` — Consumer product recalls
- `auto:nhtsa-recalls` — Vehicle safety recalls
- `auto:fcc-political-files` — FCC political ad buys
- `auto:stock-trades` — Congressional stock trades
- `auto:ofac-sdn` — OFAC sanctions screening
- `auto:gleif-lei` — Legal Entity Identifiers
- `auto:opensanctions` — PEP/sanctions screening
- `auto:nonprofit-990` — IRS 990 tax filings
- `auto:wikipedia` — Wikipedia/Wikidata entity data
- `auto:influence-cross-ref` — Lobbying → donation → committee chains
- `auto:propublica-990` — Nonprofit tax filings (legacy)

### 3. Conflict resolution
- Fresh data overwrites auto-blocks on each run
- If Research Claude has edited inside an auto-block (hash mismatch detected), the pipeline **parks** new data in a `pending-merge` block below
- Research Claude folds pending-merge data into the editorial content during next session
- Hashes tracked in `reports/enrichment-hashes.json`

## API Keys

Keys live in `.env` (gitignored) locally and as GitHub Secrets for CI.

| Key | .env variable | GitHub Secret | Where to get it |
|-----|--------------|---------------|-----------------|
| FEC | `FEC_API_KEY` | `FECAPI` | https://api.open.fec.gov/developers/ |
| Congress.gov | `CONGRESS_API_KEY` | `CONGRESSAPI` | https://api.congress.gov/sign-up/ |
| Senate LDA | `LDA_API_KEY` | `LDAAPI` | Token auth (already configured) |
| SAM.gov | `SAM_API_KEY` | `SAMAPI` | https://sam.gov/content/home |
| LobbyView | `LOBBYVIEW_API_KEY` | `LOBBYVIEWAPI` | https://www.lobbyview.org → Sign in → Data Download → API |
| CourtListener | `COURTLISTENER_API_KEY` | `COURTLISTENERAPI` | Profile page on courtlistener.com |
| OpenSanctions | `OPENSANCTIONS_API_KEY` | `OPENSANCTIONSAPI` | https://opensanctions.org (free non-commercial) |
| DOL/OSHA | `DOL_API_KEY` | `DOLAPI` | https://data.dol.gov (free registration) |

**22 pipelines need zero auth**: USASpending (both), GovTrack, Federal Register, SEC EDGAR, SEC Litigation, FARA, DOJ Press, EPA ECHO, CPSC, NHTSA, FCC, Stock Watcher, OFAC SDN, GLEIF, Wikipedia, Public Accountability, Nonprofit 990, Lobbying Cross-Ref, RSS.

## OpenSecrets URL Replacement

OpenSecrets URLs are being systematically replaced with government equivalents:

| OpenSecrets Category | Count | Replacement |
|---------------------|-------|-------------|
| members-of-congress | 1,132 | FEC candidate pages |
| orgs | 824 | FEC committee pages |
| political-action-committees-pacs | 397 | FEC committee pages |
| federal-lobbying | 382 | Senate LDA search |
| news | 428 | No auto-replacement (manual review) |
| outside-spending | 140 | FEC independent expenditures |
| donor-lookup | 129 | FEC individual contributions |

Run: `node scripts/opensecrets-replace.cjs --write`

Old OpenSecrets URLs move to the **Archived** section in profile sources per Vault Rules.

## Reports

Pipeline output goes to `reports/` (gitignored). Key files:
- `{pipeline}-cache.json` — persistent cache per pipeline
- `enrichment-hashes.json` — hash tracking for auto-block conflict detection
- `enrichment-log.json` — what was written, when, any conflicts
- `opensecrets-replacement.json` — URL replacement mapping
