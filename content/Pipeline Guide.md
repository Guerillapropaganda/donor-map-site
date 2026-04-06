---
title: Pipeline Guide
type: system
last-updated: 2026-04-06
---

# Pipeline Guide — The Donor Map

How data flows from government APIs into vault profiles. Code Claude maintains these pipelines. Research Claude reads the output.

---

## API Inventory

| Pipeline | API Source | Tier | Auth | Rate Limit | What it provides |
|----------|-----------|------|------|------------|-----------------|
| **FEC** | api.open.fec.gov | 1 | API key | 1,000/hr | Fundraising totals, donor contributions, independent expenditures, politicians-funded |
| **Congress** | api.congress.gov | 1 | API key | 5,000/hr | Bills sponsored, committees, policy areas, voting record |
| **Senate LDA** | lda.senate.gov | 1 | Token | ~600/hr | Lobbying filings, spend totals, issues lobbied, firms hired |
| **LobbyView** | rest-api.lobbyview.org | 1 | Token | 100/day | Client-bill lobbying networks, NAICS codes, issue areas |
| **USASpending** | api.usaspending.gov | 1 | None | 2,000/hr | Federal contracts, grants, awards |
| **SAM.gov** | api.sam.gov | 1 | API key | 1,000/hr | Entity registrations, contract opportunities |
| **GovTrack** | govtrack.us/api | 1 | None | 1,000/hr | Enhanced bill tracking, vote analysis, legislator data |
| **ProPublica 990s** | projects.propublica.org | 1 | None | 1,000/hr | Nonprofit tax filings, revenue, exec compensation |
| **RSS** | Various feeds | 2-3 | None | N/A | News event matching against profiles |

## Scripts

All scripts live in `donor-map-engine/scripts/`. Run from the engine repo root.

| Script | Targets | Default limit | Key frontmatter written |
|--------|---------|--------------|------------------------|
| `fec-pipeline.cjs` | Politicians + Donors | 30 | `total-raised`, `total-spent`, `politicians-funded` |
| `congress-pipeline.cjs` | Politicians | 30 | `bills-sponsored`, `committees` |
| `lda-pipeline.cjs` | Donors/Corps | 20 | `lobbying-spend`, `lobbying-filings` |
| `lobbyview-pipeline.cjs` | Donors/Corps | 5 | `lobbyview-bills`, `naics-code` |
| `usaspending-pipeline.cjs` | Donors/Corps | 10 | `federal-contracts`, `contract-total` |
| `sam-pipeline.cjs` | Donors/Corps | 10 | `sam-registered` |
| `govtrack-pipeline.cjs` | Politicians | 5 | `govtrack-id`, `leadership-score` |
| `propublica-pipeline.cjs` | Donors/Corps (nonprofits) | 30 | `ein`, `total-revenue`, `total-assets` |
| `rss-pipeline.cjs` | All profiles | N/A | Creates event draft files |
| `opensecrets-replace.cjs` | All files with opensecrets.org URLs | N/A | Replaces URLs in body |
| `url-checker.cjs` | All files | N/A | Reports only |
| `enrich-frontmatter.cjs` | All profiles | N/A | Bulk YAML field population |

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

Pipeline options: `fec`, `congress`, `propublica`, `govtrack`, `sam`, `usaspending`, `lda`, `lobbyview`, `all`

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
- `auto:congress-legislation` — Bills, committees, policy areas
- `auto:lda-lobbying` — Lobbying activity and spend
- `auto:lobbyview-networks` — Bill-level lobbying networks
- `auto:usaspending-contracts` — Federal contract awards
- `auto:sam-registration` — SAM.gov entity data
- `auto:propublica-990` — Nonprofit tax filings
- `auto:govtrack-votes` — Voting record and scores

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

USASpending, GovTrack, ProPublica 990s: no auth required.

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
