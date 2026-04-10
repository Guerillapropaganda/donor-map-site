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
| FEC | `FEC_API_KEY` | `FECAPI` | https://www.fec.gov/developers/ |
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

## Auto-Promotion & Staleness Decay

Pipelines can auto-promote profiles through readiness tiers:

| Transition | Trigger | Automatic? |
|-----------|---------|-----------|
| `raw → draft` | Any substantive content added (body > 100 chars or Tier 1 source) | Yes |
| `draft → ready` | Body > 500 chars + Tier 1 sources + enriched + connections exist | Yes |
| `ready → verified` | 2+ Tier 1 source types + no contradictions + human sign-off | **NO — requires editorial** |
| `verified → ready` | 90 days without re-enrichment (staleness decay) | Yes (automatic) |
| `ready → draft` | 180 days without any update (staleness decay) | Yes (automatic) |

### Reclassification Script

Audits all profiles against the 4-tier criteria and reclassifies:
```bash
node scripts/reclassify-readiness.cjs                    # dry run (report)
node scripts/reclassify-readiness.cjs --write            # apply changes
node scripts/reclassify-readiness.cjs --profile="Name"   # single profile
```

Also computes `source-types`, `corroboration-count`, and `known-gaps` for each profile.

### Staleness Decay Script

Demotes stale profiles automatically:
```bash
node scripts/staleness-decay.cjs                          # dry run (report)
node scripts/staleness-decay.cjs --write                  # apply demotions
```

## Reports

Pipeline output goes to `reports/` (gitignored). Key files:
- `{pipeline}-cache.json` — persistent cache per pipeline
- `enrichment-hashes.json` — hash tracking for auto-block conflict detection
- `enrichment-log.json` — what was written, when, any conflicts
- `opensecrets-replacement.json` — URL replacement mapping

---

# Pipeline Cheatsheets

Per-pipeline operational reference. Code Claude reads these when building or debugging pipeline scripts. Research Claude reads the "Canonical URL format" and "Data field → Frontmatter mapping" sections when citing sources in Verified sections or when verifying auto-block output during editorial review.

**Template:** each cheatsheet follows the standardized structure below. Blank sections marked `(TODO)` need Perplexity research.

**Rule for both Claudes:** when you use a cheatsheet during work, check the `Last verified` date. If it's older than 90 days, flag it for refresh. APIs change.

## Perplexity Research Checklist

Priority order — fill in from top to bottom. One per day during the sprint (Apr 10-22) is the target cadence.

- [ ] **1. FEC** — campaign finance (highest volume, every politician + donor profile)
- [ ] **2. Congress.gov** — member profiles, bills, committees (A000383 history)
- [ ] **3. Senate LDA** — lobbying disclosures (domain migration issue, auth broken)
- [ ] **4. USASpending.gov** — federal contracts, grants
- [ ] **5. SAM.gov** — contract awards, entity registration (QVT false-positive history)
- [ ] **6. ProPublica Nonprofit Explorer** — 501c 990 filings
- [ ] **7. SEC EDGAR** — corporate filings, insider trading
- [ ] **8. GovTrack** — voting records, cache invalidation history
- [ ] **9. FARA** — foreign agent registration, low volume / high signal
- [ ] **10. GLEIF** — Legal Entity Identifiers, corporate verification
- [ ] **11. DOJ Press** — enforcement actions (264K false positive history)
- [ ] **12. LobbyView** — academic lobbying database
- [ ] **13. NHTSA** — vehicle recalls (hedge fund bug history, auto-adjacent only)
- [ ] **14. Federal Register** — rulemaking, proposed rules, notices
- [ ] **15. CourtListener** — federal court dockets, RECAP
- [ ] **16. EPA ECHO** — environmental violations, facility compliance
- [ ] **17. OSHA** — workplace safety inspections, penalties
- [ ] **18. CPSC Recalls** — consumer product safety
- [ ] **19. FCC** — political ad buys (per-station only)
- [ ] **20. Stock Watcher** — congressional stock trades
- [ ] **21. OFAC SDN** — sanctions list screening
- [ ] **22. OpenSanctions** — PEP screening
- [ ] **23. Public Accountability Project** — UC Berkeley 1.9B records

As each is completed, replace `(TODO)` blocks with real data and check the box. Top 12 are sprint priority. Items 13-23 are Phase 2+ (post-launch).

---

## Cheatsheet Template

Copy this block for any new pipeline not yet listed:

```markdown
## {Pipeline Name}
**Last verified:** YYYY-MM-DD (source, e.g. David via Perplexity)

### Identity
- **What it is:**
- **What it covers:**
- **Tier classification per Vault Rules:**
- **Authoritative?**
- **Data freshness:**
- **Known staleness risk:**

### API access (Code Claude)
- **Base URL:**
- **Auth:**
- **Key location (env var + GitHub Secret name):**
- **Rate limit:**
- **Pagination:**
- **User-Agent / headers required:**

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
|  |  |  |  |

### Identifiers
- **Primary ID:**
- **Secondary IDs:**
- **How to look up an entity:**
- **Known ID gotchas:**

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
|  |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Entity page:**
- **Search URL:**
- **AVOID:**

### Known quirks / gotchas
-

### Quality signals (how to detect contaminated data)
-

### Fallback sources
-

### Pipeline script location
- `scripts/{pipeline-name}-pipeline.cjs`
- Last known fix: date + commit hash
- Known open issues:
```

---

## 1. FEC
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** (TODO)
- **What it covers:** (TODO)
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO)
- **Known staleness risk:** (TODO)

### API access (Code Claude)
- **Base URL:** api.open.fec.gov
- **Auth:** API key
- **Key location (env var + GitHub Secret name):** (TODO)
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** FEC candidate ID (e.g. `H0NY16143`), FEC committee ID (e.g. `C00709196`)
- **Secondary IDs:** (TODO)
- **How to look up an entity:** (TODO)
- **Known ID gotchas:** (TODO — wrong digit = wrong entity entirely, per CLAUDE.md)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| `total_receipts` | `total-received` | (TODO confirm format) |
| (TODO more) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Candidate page:** `https://www.fec.gov/data/candidate/{id}/`
- **Committee page:** `https://www.fec.gov/data/committee/{id}/`
- **Independent expenditures:** `https://www.fec.gov/data/independent-expenditures/?committee_id={id}`
- **IE opposing candidate:** `https://www.fec.gov/data/independent-expenditures/?candidate_id={id}&support_oppose_indicator=O`
- **AVOID:** complex receipts search URLs like `/data/receipts/?data_type=...&contributor_state=...` — often don't load, no stable deep links. Use committee/candidate pages instead.

### Known quirks / gotchas
- (TODO)

### Quality signals (how to detect contaminated data)
- Verify candidate/committee ID matches entity name on the FEC page before committing any new citation
- If pipeline returns >10K results for a single entity search, suspect API returning index size (per QVT Financial DOJ bug pattern)

### Fallback sources
- (TODO)

### Pipeline script location
- `scripts/fec-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## 2. Congress.gov
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** (TODO)
- **What it covers:** (TODO — member profiles, bills sponsored, committees, policy areas)
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO)
- **Known staleness risk:** committee assignments change mid-Congress, committee chair/ranking member rotations

### API access (Code Claude)
- **Base URL:** api.congress.gov
- **Auth:** API key
- **Key location (env var + GitHub Secret name):** (TODO)
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** bioguide-id (e.g. `B001223` for Jamaal Bowman — format `{last-initial}{6 digits}`)
- **Secondary IDs:** GovTrack ID, FEC candidate ID, Wikidata ID
- **How to look up an entity:** search by bioguide-id (preferred) OR name + state (required — name alone triggered the A000383 bug)
- **Known ID gotchas:** **NEVER accept `data.members[0]` from a name-only search without state AND last-name verification.** A000383 fuzzy-match bug (fixed 2026-04-10) returned wrong member for 95 profiles (Oklahoma Rep polluted Ohio candidate profiles). Engine fix in `scripts/congress-pipeline.cjs` now requires state match + last-name verification.

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Member profile:** `https://www.congress.gov/member/{name-slug}/{bioguide-id}` (e.g. `https://www.congress.gov/member/jamaal-bowman/B001223`)
- **AVOID:** `https://www.congress.gov/member/{bioguide-id}` without the name slug — bioguide-only URLs sometimes 404

### Known quirks / gotchas
- **A000383 fuzzy-match bug** (fixed 2026-04-10 at engine layer): name-only search without state match returned wrong member, polluting 95 profiles with "State: Oklahoma" data. Fix: require state + last-name verification, refuse to guess.
- Non-congressional politicians (governors, candidates, cabinet, SCOTUS) should NOT have congress-pipeline auto-blocks. Engine now filters by chamber.
- Former members: accept only with explicit bioguide-id, never name-lookup.

### Quality signals (how to detect contaminated data)
- If `auto:congress-legislation` shows `State: X` but profile frontmatter says `state-abbr: Y` where X≠Y → contamination, strip block and refetch
- If profile `chamber` is Candidate/Governor/SCOTUS/Cabinet but has `auto:congress-legislation` block → wrong pipeline applied, strip block

### Fallback sources
- **GovTrack** for voting record if Congress.gov is down or returns bogus data
- **ProPublica Congress API** (if used) for member details

### Pipeline script location
- `scripts/congress-pipeline.cjs`
- Last known fix: 2026-04-10 commit `bc24819` (chamber filter + state/name verification)
- Known open issues: (TODO — probably none active)

---

## 3. Senate LDA (Lobbying Disclosure Act)
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** (TODO — Senate lobbying disclosure filings)
- **What it covers:** registered lobbying firms, lobbying clients, spend per quarter, issues lobbied, bills touched
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO — quarterly filings)
- **Known staleness risk:** quarterly filings lag by ~45 days

### API access (Code Claude)
- **Base URL:** lda.gov (**migrated from lda.senate.gov sometime 2024-2025**)
- **Auth:** Token (**auth system not yet migrated to new domain, broken as of CLAUDE.md writing; may be fixed now — VERIFY**)
- **Key location (env var + GitHub Secret name):** (TODO)
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** Filing ID
- **Secondary IDs:** Client registrant ID
- **How to look up an entity:** (TODO)
- **Known ID gotchas:** (TODO)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO — lobbying-spend, lobbying-filings) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Filing search:** `https://lda.gov/filings/public/filing/search/?client_name={name}` (VERIFY — new domain)
- **OLD domain to avoid:** `lda.senate.gov` URLs will break

### Known quirks / gotchas
- Domain migration from `lda.senate.gov` to `lda.gov` mid-2025. Old URLs don't redirect cleanly. Archive old URLs, use new domain.
- Auth system may not be fully migrated yet.
- Per CLAUDE.md: "LDA URLs broken until June 2026. lda.gov is mid-migration. Archive LDA URLs as encountered, reinstate after June." — VERIFY current status during Perplexity research.

### Quality signals (how to detect contaminated data)
- If `auto:lda-lobbying` block on a profile that's clearly not a corporation/lobbying firm (e.g. a sitting politician) → likely contamination
- Redirect files (`#redirect` tag or `(Redirect)` in title) should NOT have `auto:lda-lobbying` blocks. Engine fix deployed 2026-04-10.

### Fallback sources
- **LobbyView** (academic alternative)
- **OpenSecrets lobbying** (Tier 2, demoted — not a real replacement)

### Pipeline script location
- `scripts/lda-pipeline.cjs`
- Last known fix: 2026-04-10 commit `d1ceb91` (redirect file skip)
- Known open issues: domain migration auth may still be broken — verify

---

## 4. USASpending.gov
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** (TODO)
- **What it covers:** federal contracts, grants, awards, subawards by agency/NAICS
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO)
- **Known staleness risk:** (TODO)

### API access (Code Claude)
- **Base URL:** api.usaspending.gov
- **Auth:** None (public)
- **Key location (env var + GitHub Secret name):** N/A
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** (TODO — DUNS? UEI? recipient name?)
- **Secondary IDs:** NAICS code
- **How to look up an entity:** (TODO)
- **Known ID gotchas:** (TODO)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO — federal-contracts) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- (TODO)

### Known quirks / gotchas
- (TODO)

### Quality signals (how to detect contaminated data)
- (TODO)

### Fallback sources
- **SAM.gov** for contract awards
- (TODO more)

### Pipeline script location
- `scripts/usaspending-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## 5. SAM.gov
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** (TODO — System for Award Management)
- **What it covers:** entity registrations, contract awards, contract opportunities
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO)
- **Known staleness risk:** (TODO)

### API access (Code Claude)
- **Base URL:** api.sam.gov
- **Auth:** API key
- **Key location (env var + GitHub Secret name):** (TODO)
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** UEI (Unique Entity Identifier), CAGE code
- **Secondary IDs:** Legacy DUNS
- **How to look up an entity:** search by `awardeeLegalBusinessName` — **MUST validate match before trusting** (per QVT Financial bug)
- **Known ID gotchas:** name-match false positives — QVT Financial got 7,670 bogus contracts attributed because name search was too loose. Fix: validate `awardeeLegalBusinessName` matches search term on first 5 samples (60% threshold) before committing any auto-block data.

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO — federal-contracts) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Entity search:** `https://sam.gov/search/?q={entity-name}`
- (TODO contract-specific URLs)

### Known quirks / gotchas
- **Loose name match bug** (fixed 2026-04-10 at engine layer): name searches returned fuzzy matches, polluting QVT Financial with 7,670 fake contracts. Fix: awardee legal name validation.
- Hedge funds, financial firms, and other non-contracting entities should rarely have SAM contract data — if they do, verify or suspect contamination.

### Quality signals (how to detect contaminated data)
- If entity has >100 contracts but the entity type is hedge fund / pure financial firm / think tank → suspect false positive
- Verify `awardeeLegalBusinessName` on first few contracts matches the profile's title before accepting the auto-block

### Fallback sources
- **USASpending.gov** (same underlying data, different API surface)

### Pipeline script location
- `scripts/sam-pipeline.cjs`
- Last known fix: 2026-04-10 commit `d1ceb91` (legal name validation)
- Known open issues: (TODO)

---

## 6. ProPublica Nonprofit Explorer
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** ProPublica's 501c3/501c4/527 database surfacing IRS 990 filings
- **What it covers:** nonprofit revenue, assets, executive compensation, grants received/made, board members
- **Tier classification per Vault Rules:** **Tier 1 (per Vault Rules — surfaces IRS 990 data which is primary government record). Note: ProPublica news articles are Tier 2, but Nonprofit Explorer specifically is Tier 1.**
- **Authoritative?** Yes (via IRS)
- **Data freshness:** (TODO — 990s filed annually, usually 1-2 year lag)
- **Known staleness risk:** 990 filings lag reality by 1-2 years

### API access (Code Claude)
- **Base URL:** projects.propublica.org/nonprofits/api
- **Auth:** None (public)
- **Key location (env var + GitHub Secret name):** N/A
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** EIN (Employer Identification Number, 9-digit)
- **Secondary IDs:** (TODO)
- **How to look up an entity:** search by name OR direct EIN lookup (preferred — EIN is authoritative)
- **Known ID gotchas:** some organizations share names but have different EINs (e.g. multiple "Center for X" orgs)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| EIN | `ein` |  |
| 501(c) code | `nonprofit-status` | e.g. "501(c)(3)", "501(c)(4)", "527" |
| `totalrevenue` | `total-revenue` | (TODO confirm field name) |
| (TODO more) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Organization page:** `https://projects.propublica.org/nonprofits/organizations/{ein-digits-only}`
- **Example:** `https://projects.propublica.org/nonprofits/organizations/833298146` (DMFI)

### Known quirks / gotchas
- Many 501(c)(4)s don't file detailed 990s (dark money vehicles use this loophole)
- New organizations may not have filings on record for 1-2 years
- Some profiles show "0 filings on record" when the org is real — that's a known gap, not bad data

### Quality signals (how to detect contaminated data)
- EIN format must be 9 digits — any other format is wrong
- Verify organization name on ProPublica page matches profile title

### Fallback sources
- **IRS 990 bulk data** (same source, raw)
- **GuideStar/Candid** (Tier 3, aggregator)

### Pipeline script location
- `scripts/nonprofit-990-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## 7. SEC EDGAR
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** SEC Electronic Data Gathering, Analysis, and Retrieval system
- **What it covers:** corporate filings (10-K, 10-Q, DEF 14A, SC 13D/G, 8-K), insider trading forms (3/4/5), enforcement litigation releases
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO — near real-time for new filings)
- **Known staleness risk:** (TODO)

### API access (Code Claude)
- **Base URL:** efts.sec.gov (for search) + data.sec.gov (for filings)
- **Auth:** None (public), but **User-Agent header required**
- **Key location (env var + GitHub Secret name):** N/A (but User-Agent must identify the caller)
- **Rate limit:** 10 requests/second enforced
- **Pagination:** (TODO)
- **User-Agent / headers required:** Yes — SEC requires `User-Agent: YourName your@email.com` — otherwise requests are rejected

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** CIK (Central Index Key, 10-digit zero-padded)
- **Secondary IDs:** Ticker symbol, LEI
- **How to look up an entity:** (TODO — full-text search, company search)
- **Known ID gotchas:** (TODO)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO — sec-filings, sec-form-types) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Company filing history:** `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type=&dateb=&owner=include&count=40`
- **Full-text search:** `https://efts.sec.gov/LATEST/search-index?q=%22{entity-name}%22`
- **Individual filing:** `https://www.sec.gov/Archives/edgar/data/{cik}/{accession-number}/`

### Known quirks / gotchas
- User-Agent required (SEC blocks requests without it)
- CIK must be zero-padded to 10 digits for some endpoints, not for others
- Filing types are strict codes — `10-K` not `10K`, `SC 13D/A` not `13DA`

### Quality signals (how to detect contaminated data)
- Verify CIK matches entity name before trusting filing list
- Form types should be a list of valid SEC codes — any freeform text is suspect

### Fallback sources
- **Bulk data feeds** from SEC directly
- **Direct SEC archives** (slower but authoritative)

### Pipeline script location
- `scripts/sec-edgar-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## 8. GovTrack
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** (TODO)
- **What it covers:** voting records, bill tracking, legislator statistics, ideology scores
- **Tier classification per Vault Rules:** Tier 1 (government record derivative — uses Library of Congress data)
- **Authoritative?** Yes (but derived from LOC/Congress.gov)
- **Data freshness:** (TODO)
- **Known staleness risk:** cache bugs in pipeline have returned stale results

### API access (Code Claude)
- **Base URL:** www.govtrack.us/api/v2
- **Auth:** None (public)
- **Key location (env var + GitHub Secret name):** N/A
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** GovTrack ID (integer, e.g. `456839` for Jamaal Bowman)
- **Secondary IDs:** bioguide-id cross-reference
- **How to look up an entity:** (TODO — bioguide lookup preferred)
- **Known ID gotchas:** (TODO)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| `id` | `govtrack-id` | integer |
| bills sponsored | `bills-sponsored` | count |
| bills cosponsored | `bills-cosponsored` | count |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Member profile:** `https://www.govtrack.us/congress/members/{govtrack-id}`
- **Example:** `https://www.govtrack.us/congress/members/456839` (Jamaal Bowman)

### Known quirks / gotchas
- **Cache invalidation bug** (fixed 2026-04-10 at engine layer): if cached result had `votes>0 but bills==0 AND cosponsored==0`, the cache was wrong but the pipeline kept serving it. Fix: refetch on impossible state pattern.
- **Chamber filter** (fixed 2026-04-10): same A000383 issue affected GovTrack — non-congressional politicians shouldn't get GovTrack auto-blocks.

### Quality signals (how to detect contaminated data)
- If `auto:govtrack` shows 0 bills sponsored AND 0 cosponsored AND votes>0 → impossible state, refetch required
- If bills count in frontmatter (e.g. `bills-sponsored: 39`) doesn't match auto-block (e.g. shows 0) → stale cache, refetch

### Fallback sources
- **Congress.gov** for bill/voting data (authoritative source GovTrack derives from)

### Pipeline script location
- `scripts/govtrack-pipeline.cjs`
- Last known fix: 2026-04-10 commit `bc24819` (cache invalidation + chamber filter + frontmatter re-enrichment for 0/0 states)
- Known open issues: (TODO)

---

## 9. FARA (Foreign Agent Registration Act)
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** DOJ database of foreign agent registrations
- **What it covers:** lobbyists and PR firms representing foreign governments and entities, filings, disbursements, foreign principals
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO)
- **Known staleness risk:** (TODO)

### API access (Code Claude)
- **Base URL:** fara.us/api (unofficial?) or efile.fara.gov (official)
- **Auth:** None (VERIFY — may have changed)
- **Key location (env var + GitHub Secret name):** N/A
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** Registration number
- **Secondary IDs:** (TODO)
- **How to look up an entity:** search by registrant name or foreign principal name
- **Known ID gotchas:** (TODO)

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO — fara-registrations, fara-foreign-principals) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Registration search:** `https://efile.fara.gov/ords/f?p=107:5::SEARCH:` (VERIFY)
- **Direct filing:** (TODO)

### Known quirks / gotchas
- Low volume in vault (few entities register) but HIGH signal when present
- Foreign principal names may be in non-English scripts
- Registration ≠ active lobbying — verify dates

### Quality signals (how to detect contaminated data)
- (TODO)

### Fallback sources
- **OpenSecrets FARA** (Tier 3, demoted)
- **Direct DOJ filings**

### Pipeline script location
- `scripts/fara-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## 10. GLEIF (Global Legal Entity Identifier Foundation)
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** Global registry of Legal Entity Identifiers (LEIs) — standardized corporate IDs
- **What it covers:** corporate structure, ownership relationships, jurisdiction, entity status
- **Tier classification per Vault Rules:** Tier 1 (authoritative global standard)
- **Authoritative?** Yes (ISO 17442 standard)
- **Data freshness:** (TODO — self-reported, renewed annually)
- **Known staleness risk:** lapsed LEI renewals produce "inactive" status

### API access (Code Claude)
- **Base URL:** api.gleif.org
- **Auth:** None (public)
- **Key location (env var + GitHub Secret name):** N/A
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** LEI (20-character alphanumeric, e.g. `549300JMMSS9C5S2HO30` for QVT Financial LP)
- **Secondary IDs:** (TODO — LEI prefix indicates issuer)
- **How to look up an entity:** LEI direct lookup OR legal name search
- **Known ID gotchas:** LEI is per-legal-entity, so parent/subsidiary have different LEIs

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| `lei` | `lei` | 20-char string |
| `legalJurisdiction` | `lei-jurisdiction` | e.g. "US-DE" |
| (TODO more) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Entity page:** `https://search.gleif.org/#/record/{lei}`
- **Example:** `https://search.gleif.org/#/record/549300JMMSS9C5S2HO30` (QVT Financial)

### Known quirks / gotchas
- Not all entities have LEIs — private companies below reporting thresholds often don't
- LEIs can be "inactive" or "lapsed" — still valid for historical reference
- Parent/child relationships require separate LEI lookups

### Quality signals (how to detect contaminated data)
- LEI must be exactly 20 characters alphanumeric
- Verify legal name on GLEIF page matches profile title

### Fallback sources
- **SEC EDGAR** for publicly traded entities
- **State business registries** for private entities

### Pipeline script location
- `scripts/gleif-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## 11. DOJ Press Releases
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** Department of Justice press releases about enforcement actions, indictments, settlements, convictions
- **What it covers:** criminal cases, civil enforcement, pleas, sentences, by DOJ component (FBI, USAO, divisions)
- **Tier classification per Vault Rules:** Tier 1 (government record)
- **Authoritative?** Yes
- **Data freshness:** (TODO — same-day publication)
- **Known staleness risk:** press releases don't update when cases develop — closed cases may still show in search

### API access (Code Claude)
- **Base URL:** justice.gov/api
- **Auth:** None (public)
- **Key location (env var + GitHub Secret name):** N/A
- **Rate limit:** (TODO)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** Press release URL slug
- **Secondary IDs:** DOJ component code (e.g. "USAO - New York, Southern")
- **How to look up an entity:** full-text search by entity name
- **Known ID gotchas:** name match is fuzzy — "Smith" matches thousands of unrelated press releases

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| total match count | `doj-press-mentions` | **validate <10K or reject as API index size** |
| component list | `doj-components` |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Search URL:** `https://www.justice.gov/news?query=%22{exact-entity-name}%22&sort=date`
- **Individual release:** `https://www.justice.gov/usao-{state}/pr/{slug}`

### Known quirks / gotchas
- **Sanity cap bug** (fixed 2026-04-10 at engine layer): DOJ API sometimes returns index size (>10K results) instead of actual matches. QVT Financial got 264,349 fake DOJ mentions this way. Fix: reject results with >10K total as API bug.
- **Validation required**: verify 60%+ of top 5 press releases actually mention the entity name before accepting count.
- Press releases mentioning "Smith v. United States" are NOT about everyone named Smith.

### Quality signals (how to detect contaminated data)
- If `doj-press-mentions` > 10,000 → API returning index size, data is bogus
- If entity is a sitting politician or small nonprofit with >1,000 DOJ mentions → suspect
- Spot-check 3 recent press releases: do they actually mention the entity?

### Fallback sources
- Direct DOJ website search
- CourtListener for court docket references

### Pipeline script location
- `scripts/doj-press-pipeline.cjs`
- Last known fix: 2026-04-10 commit `d1ceb91` (sanity cap + 60% name validation)
- Known open issues: (TODO)

---

## 12. LobbyView
**Last verified:** (TODO — David via Perplexity)

### Identity
- **What it is:** Academic lobbying database (MIT) — lobbying disclosure data enriched with bill/client networks
- **What it covers:** client-bill lobbying networks, NAICS industry codes, cross-referenced LDA filings
- **Tier classification per Vault Rules:** Tier 1 (derivative of Senate LDA, which is Tier 1)
- **Authoritative?** Yes (derived from LDA)
- **Data freshness:** (TODO — quarterly, with lag)
- **Known staleness risk:** LDA upstream lag applies here too

### API access (Code Claude)
- **Base URL:** rest-api.lobbyview.org
- **Auth:** Token (academic access)
- **Key location (env var + GitHub Secret name):** (TODO)
- **Rate limit:** (TODO — academic access likely generous)
- **Pagination:** (TODO)
- **User-Agent / headers required:** (TODO)

### Core endpoints
| Endpoint | Purpose | Key params | Response shape highlights |
|---|---|---|---|
| (TODO) |  |  |  |

### Identifiers
- **Primary ID:** LDA filing ID (cross-ref to Senate LDA)
- **Secondary IDs:** NAICS code, bill ID
- **How to look up an entity:** client name search
- **Known ID gotchas:** name match may need disambiguation for common company names

### Data field → Frontmatter mapping
| API response field | Profile frontmatter key | Notes |
|---|---|---|
| (TODO — lobbyview-bills) |  |  |

### Canonical URL format (Research Claude cites these in Sources sections)
- **Client page:** (TODO — verify LobbyView frontend URL pattern)
- **Bill page:** (TODO)

### Known quirks / gotchas
- Academic access token may expire or rotate
- Upstream LDA domain migration affects data quality

### Quality signals (how to detect contaminated data)
- (TODO)

### Fallback sources
- **Senate LDA** directly (authoritative upstream)

### Pipeline script location
- `scripts/lobbyview-pipeline.cjs`
- Last known fix: (TODO)
- Known open issues: (TODO)

---

## Tier 2 priority (post-sprint, for future Perplexity sessions)

These pipelines are in the vault but get less traffic or are lower editorial priority. Fill in after the Top 12 are complete.

- Federal Register
- CourtListener
- EPA ECHO
- OSHA
- CPSC Recalls
- NHTSA Recalls (partial info in Pipeline Guide section 11 DOJ Press — duplicate or expand)
- FCC Public Files
- Stock Watcher (congressional stock trades)
- OFAC SDN
- OpenSanctions
- Public Accountability Project
- Wikipedia / Wikidata
- Auto-Connection Engine (internal, not an external API)
- RSS feeds (internal, not an external API)

---

## How to use these cheatsheets

**Code Claude:**
1. At session start, scan the Perplexity Research Checklist at the top — what's done, what's pending
2. Before touching a pipeline script, read the relevant cheatsheet section
3. When fixing a pipeline bug, update "Known quirks / gotchas" and "Last known fix" fields
4. Reference the canonical URL format when generating auto-block source links

**Research Claude:**
1. When citing a source in a profile's Verified section, use the "Canonical URL format" section of the relevant cheatsheet to get the right URL shape
2. When reviewing an auto-block for editorial sign-off, use "Quality signals" to detect contamination
3. When writing new profiles, reference the "Data field → Frontmatter mapping" to know which schema fields are pipeline-populated vs editor-populated
4. If you spot a Research Claude-relevant gap in a cheatsheet (bad URL format, missing mapping), flag it for David to update during Perplexity research

**David:**
1. Research one pipeline per day from the checklist using Perplexity
2. Paste results into the template sections, check the box
3. If research reveals the pipeline is broken/deprecated, mark the checklist item with a note
4. Refresh cheatsheets older than 90 days (APIs change)
