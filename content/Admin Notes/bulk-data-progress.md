---
title: Bulk Data Ingestion Progress
type: admin-note
note-type: data
priority: normal
status: open
last-updated: 2026-04-16
note-kind: ticket
---

# Bulk Data Ingestion Progress

Tracks what bulk CSV/ZIP files have been parsed, what made it into the canonical stores, and what's still waiting. Updated by Code Claude at the end of each ingest session.

**Bulk files location:** `data/bulk/` (gitignored, physically in the worktree that downloaded them)
**Catalog:** `data/bulk/CATALOG.md`
**Ingest scripts:** `scripts/ingest-*.cjs` and `scripts/screen-*.cjs`

---

## Completed

### ~~FEC Committee-to-Candidate Contributions (PAS2)~~
- **Files:** `fec-cmte-to-candidate-2022.zip`, `fec-cmte-to-candidate-2024.zip`, `fec-cmte-to-candidate-2026.zip`
- **Script:** `scripts/ingest-fec-bulk.cjs`
- **Rows parsed:** 1,583,172
- **Matched to vault:** 164,788
- **Written:** 25,144 monetary edges in `data/relationships.jsonl`
- **Completed:** 2026-04-15

### ~~FEC Candidate Master~~
- **Files:** `fec-candidate-master-16.zip` through `fec-candidate-master-26.zip` (6 files)
- **Script:** `scripts/ingest-fec-candidate-master.cjs`
- **Rows parsed:** 48,709
- **Written:** 231 new `fec-candidate-id` fields added to politician profiles (187→418 total)
- **Completed:** 2026-04-15

### ~~FEC Committee Master~~
- **Files:** `fec-committee-master-16.zip` through `fec-committee-master-26.zip` (6 files)
- **Script:** `scripts/ingest-fec-committee-master.cjs`
- **Rows parsed:** 48,109 unique committees
- **Written:** 559 new entries in `data/fec-committee-registry.json` (293→852 total)
- **Completed:** 2026-04-15

### ~~FEC PAC Summary~~
- **Files:** `fec-pac-summary-16.zip` through `fec-pac-summary-26.zip` (6 files)
- **Script:** `scripts/ingest-fec-pac-summary.cjs`
- **Matched:** 604 PAC summaries
- **Written:** `total-raised`, `total-spent`, `cash-on-hand`, `independent-expenditures`, `individual-contributions`, `contributions-to-committees` frontmatter on 481 profiles
- **Completed:** 2026-04-15

### ~~USASpending Federal Contracts (FY2024-2025)~~
- **Files:** `FY2024_All_Contracts_Full_20260406.zip` (1.9GB, 7 CSVs), `FY2025_All_Contracts_Full_20260406.zip` (1.8GB, 7 CSVs)
- **Script:** `scripts/ingest-usaspending-bulk.cjs`
- **Rows streamed:** 13,325,582
- **Matched to vault:** 215,849
- **Written:** 714 government-contract edges in `data/relationships.jsonl` + `<!-- auto:usaspending -->` auto-blocks on 66 corporation profiles + `federal-contracts` and `federal-awards-total` frontmatter
- **Completed:** 2026-04-15

### ~~EPA Facility Registry Service (FRS)~~
- **Files:** `epa-frs-facilities.zip` (338MB)
- **Script:** `scripts/ingest-epa-frs-bulk.cjs`
- **Rows parsed:** 3,201,874
- **Matched to vault:** 4,779 facility rows → 104 corporations
- **Written:** `<!-- auto:epa-echo -->` auto-blocks on 104 corporation profiles + `epa-facilities` and `epa-states` frontmatter
- **Completed:** 2026-04-15

### ~~ICIJ Offshore Leaks Screening (Panama/Paradise/Pandora Papers)~~
- **Files:** `icij-offshore-leaks-2025-03.zip` (70MB)
- **Script:** `scripts/screen-icij-offshore.cjs`
- **Screened:** 771,369 officers + 814,617 entities + 3,339,272 relationships
- **Result:** 12 officer matches + 142 entity matches (mostly false positives from common company names). Report at `content/Admin Notes/icij-offshore-screening-report.md`
- **Note:** Screening only — matches NOT written to edges. David must triage the report before any editorial action.
- **Completed:** 2026-04-15

### ~~OFAC SDN Sanctions Screening~~
- **Files:** `ofac-sdn-sanctions.zip` (6.3MB)
- **Script:** `scripts/screen-ofac-sdn.cjs`
- **Screened:** 49,091 names
- **Result:** Zero matches. Vault entities are clean against Treasury sanctions list.
- **Completed:** 2026-04-15

### ~~USASpending Federal Grants/Assistance (FY2026)~~
- **Files:** `FY2026_All_Assistance_Full_20260406.zip` (421MB, 2 CSVs inside). Note: 7 copies existed from Chrome re-downloads; all identical (same CRC). Only the base file was ingested.
- **Script:** `scripts/ingest-usaspending-grants-bulk.cjs`
- **Rows streamed:** 2,920,385
- **Matched to vault:** 5,555
- **Written:** 37 federal-grant edges in `data/relationships.jsonl` + `<!-- auto:usaspending-grants -->` auto-blocks on 25 profiles + `federal-grants` and `federal-grants-total` frontmatter
- **Top matches:** Honeywell ($187.5M), Comcast/NBCUniversal ($89.7M), AT&T ($15.4M), AEI ($7.3M), Heritage Foundation ($2.4M)
- **Completed:** 2026-04-16

### ~~FEC Individual Contributions~~
- **Files:** `fec-individual-contributions-16.zip` through `fec-individual-contributions-26.zip` (6 files, 18.7GB total)
- **Script:** `scripts/ingest-fec-individual-bulk.cjs`
- **Rows streamed:** 255,343,066
- **Matched to vault:** 4,491,188 (employer + committee both in vault)
- **Written:** 17,816 monetary edges (role: employee-contributions) in `data/relationships.jsonl` + `<!-- auto:fec-individual -->` auto-blocks on 294 employer profiles + `employee-contributions`, `employee-contributions-total`, `employee-donor-count` frontmatter
- **Top matches:** Las Vegas Sands ($159M), Blackstone ($99.9M), Google/Alphabet ($52.8M), Oracle ($47.8M), FTX/SBF ($45.8M)
- **Note:** Per-cycle flush architecture to handle 255M rows without OOM. Employee counts are approximate (cross-cycle overlap not deduped).
- **Completed:** 2026-04-16

---

## Not Yet Ingested

### USASpending Contracts Delta (All Years)
- **Files:** `FY(All)_All_Contracts_Delta_20260406.zip` (250MB)
- **What it provides:** Incremental contract changes across all fiscal years. Useful for catching contracts missed in FY2024-2025 full files.
- **Script needed:** Same as contracts ingest, just different file
- **Priority:** LOW (FY2024-2025 already covers the active political cycle)

### FEC "Lobbyist Bundling" (actually candidate summary data)
- **Files:** `fec-lobbyist-bundling-24.zip` (120K), `fec-lobbyist-bundling-26.zip` (113K)
- **What they actually contain:** FEC `webl` format — candidate financial summaries (same schema as weball). Mislabeled at download time. Contains total raised/spent/cash-on-hand per candidate. NOT actual lobbyist bundling disclosure data.
- **Script needed:** Could adapt `ingest-fec-pac-summary.cjs` but data overlaps with existing candidate data from FEC API
- **Priority:** LOW (mostly duplicative)

### EPA Enforcement & Compliance (ICIS FE&C)
- **Files:** NOT YET DOWNLOADED — need `case_downloads.zip` (~73MB) from echo.epa.gov/tools/data-downloads
- **What it provides:** Actual EPA enforcement actions with penalty dollar amounts, violation types, settlement dates. Upgrades current EPA data from "has facilities" to "was fined $X for violation Y"
- **Script needed:** New `ingest-epa-enforcement-bulk.cjs`
- **Priority:** HIGH — this is the investigative data

### EPA Facility Tribal/Spatial
- **Files:** `epa-facility-tribal-spatial.zip` (105MB)
- **What it provides:** Geospatial coordinates for EPA-registered facilities. Mapping use only.
- **Priority:** LOW

### ~~Congress 118th Bills Status~~
- **Files:** `congress-118th-bills-status.zip` (66MB, 19,308 XML files)
- **Script:** `scripts/ingest-congress-bills-bulk.cjs`
- **Bills parsed:** 19,308
- **Matched to vault:** 18,633 bills (96.5% match rate via bioguideId)
- **Written:** `bills-sponsored`, `bills-cosponsored`, `bills-enacted`, `top-policy-area` frontmatter + `<!-- auto:congress-bills -->` auto-blocks on 465 politician profiles. Includes enacted laws list and top policy areas.
- **Top sponsors:** Andy Biggs (612), Gary Peters (164, 15 enacted), Cory Booker (156), Ted Cruz (142)
- **Completed:** 2026-04-16

### NHTSA Investigations
- **Files:** `nhtsa-investigations-flat.zip` (44MB)
- **What it provides:** Vehicle safety investigations. Only relevant for auto industry profiles (Tesla, Ford, GM). Known false-match issue with non-auto companies.
- **Script needed:** New script with strict auto-industry filter
- **Priority:** LOW

### ProPublica Free The Files
- **Files:** `ftf-all-filings.zip` (3.6MB)
- **What it provides:** Political TV ad buy data. Shows which candidates are spending on TV ads and where.
- **Script needed:** New script
- **Priority:** LOW

### Perplexity Research Dossiers
- **Files:** Multiple `.md` files in `data/bulk/` (research-dossier-tier-a/b/c, dossier-01 through 12, policy dossiers, etc.)
- **What they provide:** Editorial research from David's Perplexity sessions. Not government data — Research Claude's lane.
- **Script needed:** None (manual editorial integration)
- **Priority:** Research Claude decides

---

## Summary

| Status | Files | Rows Parsed | Data Written |
|---|---|---|---|
| **Completed** | 31 ZIP files | ~281M rows + 19K XMLs | 43,711 edges + 1,410 profiles enriched + 2 screening reports |
| **Not ingested** | ~5 files | est. ~1M rows | EPA enforcement (not downloaded), NHTSA, ProPublica FTF (2012 only, low value), EPA spatial, USASpending delta |
| **Not downloaded** | 1 source | unknown | EPA enforcement |

**Total canonical store after ingest:** ~74,000 edges. 100% of monetary edges have real dollar amounts.

**2026-04-16 session:** +258M rows + 19K bill XMLs. 17,853 new edges, 784 profiles enriched (319 employer + 465 politician).
