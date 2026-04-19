---
title: "Board Overlap Report (IRS 990 Officers)"
status: reference
last-updated: 2026-04-19
generated-by: scripts/build-officer-registry.cjs
---

# Board Overlap Report

Officers who appear on 2+ distinct EINs across the IRS 990 filings ingested into the vault. Aggregation is by EIN (not filer name) so multi-year spelling variants collapse correctly.

Generated from 1025 filings, 5,342 officer rows, 2,280 unique names.

## Overlaps where 2+ orgs are in the vault

These are the highest-signal rows — same person on multiple boards of vault-tracked orgs.

| Officer | Boards | Orgs |
|---|---:|---|
| GREG SPEED | 2 | [[America Votes]] / [[Emilys List]] |
| ERIC KESSLER | 2 | [[Sixteen Thirty Fund]] / [[New Venture Fund]] |
| KIMBERLY O DENNIS | 2 | [[American Enterprise Institute]] / [[Donors Capital Fund]] |
| ADAM EICHBERG | 2 | [[New Venture Fund]] / [[Democracy Alliance]] |
| ANDREW SCHULZ | 2 | [[New Venture Fund]] / [[Sixteen Thirty Fund]] |
| ROME ALOISE | 2 | [[California Labor Federation]] / [[Teamsters - International Brotherhood of Teamsters]] |
| MADELYN ALFANO | 2 | [[California Restaurant Association]] / [[National Restaurant Association]] |
| JOHN WOOD | 2 | [[US Chamber of Commerce]] / [[CCPOA - California Correctional Peace Officers Association]] |
| CATHERINE KENNEDY | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| CORALIE GILES | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| DEBORAH BURGER | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| WILLIAM C RUDIN | 2 | [[Real Estate Roundtable]] / [[Real Estate Board of New York]] |
| ROGER KIM | 2 | [[League of Conservation Voters]] / [[New Venture Fund]] |
| ZENAIDA CORTEZ | 2 | [[National Nurses United]] / [[California Nurses Association]] |
| KATY ROEMER | 2 | [[National Nurses United]] / [[California Nurses Association]] |
| ISAAC APPLBAUM | 2 | [[American Action Network]] / [[Republican Jewish Coalition]] |
| KATHY DENNIS | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| MARISSA LEE | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| FONG CHUU | 2 | [[National Nurses United]] / [[California Nurses Association]] |
| ROB SPEYER | 2 | [[Real Estate Board of New York]] / [[Real Estate Roundtable]] |
| WILLIE CHIANG | 2 | [[American Petroleum Institute]] / [[American Fuel and Petrochemical Manufacturers]] |
| THOMAS SCHULTZ | 2 | [[Club for Growth]] / [[American Federation for Children]] |
| WILBUR PRIESTER | 2 | [[Sixteen Thirty Fund]] / [[New Venture Fund]] |

## All overlaps (2+ distinct EINs)

Includes mixed vault / non-vault appearances. Cross-reference for board-to-board discovery.

| Officer | Boards | Vault | Orgs |
|---|---:|---:|---|
| GREG SPEED | 2 | 2 | [[America Votes]] / [[Emilys List]] |
| ERIC KESSLER | 2 | 2 | [[Sixteen Thirty Fund]] / [[New Venture Fund]] |
| KIMBERLY O DENNIS | 2 | 2 | [[American Enterprise Institute]] / [[Donors Capital Fund]] |
| ADAM EICHBERG | 2 | 2 | [[New Venture Fund]] / [[Democracy Alliance]] |
| ANDREW SCHULZ | 2 | 2 | [[New Venture Fund]] / [[Sixteen Thirty Fund]] |
| ROME ALOISE | 2 | 2 | [[California Labor Federation]] / [[Teamsters - International Brotherhood of Teamsters]] |
| MADELYN ALFANO | 2 | 2 | [[California Restaurant Association]] / [[National Restaurant Association]] |
| JOHN WOOD | 2 | 2 | [[US Chamber of Commerce]] / [[CCPOA - California Correctional Peace Officers Association]] |
| CATHERINE KENNEDY | 2 | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| CORALIE GILES | 2 | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| DEBORAH BURGER | 2 | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| WILLIAM C RUDIN | 2 | 2 | [[Real Estate Roundtable]] / [[Real Estate Board of New York]] |
| ROGER KIM | 2 | 2 | [[League of Conservation Voters]] / [[New Venture Fund]] |
| ZENAIDA CORTEZ | 2 | 2 | [[National Nurses United]] / [[California Nurses Association]] |
| KATY ROEMER | 2 | 2 | [[National Nurses United]] / [[California Nurses Association]] |
| ISAAC APPLBAUM | 2 | 2 | [[American Action Network]] / [[Republican Jewish Coalition]] |
| KATHY DENNIS | 2 | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| MARISSA LEE | 2 | 2 | [[California Nurses Association]] / [[National Nurses United]] |
| FONG CHUU | 2 | 2 | [[National Nurses United]] / [[California Nurses Association]] |
| ROB SPEYER | 2 | 2 | [[Real Estate Board of New York]] / [[Real Estate Roundtable]] |
| WILLIE CHIANG | 2 | 2 | [[American Petroleum Institute]] / [[American Fuel and Petrochemical Manufacturers]] |
| THOMAS SCHULTZ | 2 | 2 | [[Club for Growth]] / [[American Federation for Children]] |
| WILBUR PRIESTER | 2 | 2 | [[Sixteen Thirty Fund]] / [[New Venture Fund]] |

## How to use this

- Rows with 2+ vault boards are candidates for Research Claude: write a person profile for that officer, auto-emit `affiliation` edges, and the vault surfaces the board network.
- Rows with 1 vault board + 1 non-vault board are discovery candidates: the non-vault org may warrant a stub profile.
- Data source: IRS Form 990 Schedule A (officers / key employees, Part VII). Compensation is reportable comp from the filing org only.
