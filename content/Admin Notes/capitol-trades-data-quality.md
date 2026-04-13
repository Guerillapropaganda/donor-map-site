---
title: Capitol Trades Data Quality Report
type: admin-note
note-type: data
priority: normal
status: open
created: '2026-04-12'
created-by: Code Claude
---

# Capitol Trades Data Quality Report

## Dataset Overview

| Source | Transactions | Years | Politicians |
|--------|-------------|-------|------------|
| House (PDF parse) | 44,610 | 2015-2026 | 407 |
| Senate (eFD HTML) | 8,212 | 2014-2026 | 87 |
| **Combined** | **52,822** | **2014-2026** | **494** |

## Detection Flags

| Flag | House | Senate | Combined |
|------|-------|--------|----------|
| Whale ($500K+) | 1,204 | 527 | 1,731 |
| Late disclosure (>45d) | 7,280 raw / ~6,000 cleaned | 1,342 | ~7,300 cleaned |
| Options | 608 | 423 | 1,031 |
| Crypto | 304 | 104 | 408 |

## Ticker Extraction Rate

### House (PDF-based, lower quality)
- **Before improvements:** 53.2% (23,724 of 44,610)
- **After 6-strategy parser:** 79.5% (tested on 2015)
- **After 10-strategy parser:** estimated 85-90% (pending full re-run)

### Senate (HTML-based, high quality)
- **Ticker rate:** 78.8% (6,474 of 8,212)
- **Unknown type:** 0%
- **Missing dates:** 0%

### 10 Ticker Extraction Strategies (House Parser)
1. Standard `(AAPL)[` format
2. `(AAPL)S/P` format (buy/sell character after paren)
3. Case-insensitive `(CoP)S` pattern (OCR mixed case)
4. Case-insensitive ticker in parens anywhere
5. Strip "FIlINg sTaTus:" OCR noise then re-extract
6. Uppercase-only ticker in parens (broadest strict)
7. Subholding text parsing (case-insensitive)
8. Company name to ticker mapping (60+ companies)
9. Crypto keyword detection (Bitcoin, Ethereum, etc.)
10. Crypto ticker set matching

## Known Unrecoverable Data (~10-15% of House trades)

These will never have stock tickers because they are not individual stocks:

| Category | Count | % of no-ticker | Recoverable? |
|----------|-------|----------------|-------------|
| Subholdings (no ticker in text) | ~3,000 | ~15% | No - trust names only |
| Corporate bonds | ~1,587 | ~8% | Partially - could map company bonds to equity tickers |
| Municipal bonds | ~380 | ~2% | No - government debt, not conflict material |
| Funds/ETFs (no ticker) | ~1,053 | ~5% | Partially - could map fund names |
| Treasury bills | ~348 | ~2% | No - government debt |
| Brokerage references | ~68 | ~0.3% | No - account codes only |
| Livestock/agriculture | ~3 | ~0% | No |

## Filing Delay Data Quality

- **Negative delays (data errors):** 111 trades had filing date BEFORE trade date. Discarded.
- **Delays >365 days:** 2,327 trades. Date parsing errors from OCR. Discarded.
- **Cleaned late disclosure count:** ~6,000 (down from 8,622 raw)
- **Cleanup applied at API level** in `enrichTrade()` function, not in stored data.

## Name Normalization

40+ politicians appeared under multiple name variants due to:
- Honorific prefixes: "Hon.", "Mr.", "Mrs."
- OCR artifacts: "Honorable" embedded in name field
- Suffix variations: "Jr.", "Jr", "III"
- Middle initial inclusion/exclusion
- First name variations: "Thomas" vs "Tom", "William" vs "Bill"

**50+ manual overrides** in `ops/src/lib/politician-names.ts`. Applied at API load time.

Notable merges:
- "Hon. Scott Franklin" / "Mr. Scott Franklin" / "Hon. C. Scott Franklin" / "Hon. Scott Mr Franklin" / "Hon. Scott Scott Franklin" -> "Scott Franklin"
- "Hon. Donald Sternoff Beyer Jr" / "Hon. Donald Sternoff Honorable Beyer Jr" -> "Don Beyer"
- "Hon. Neal Patrick MD, Facs Dunn" / "Hon. Neal P. Dunn" -> "Neal Dunn"

## Known Gaps

1. **No Senate data before 2014.** eFD search only goes back that far.
2. **FIT21 and GENIUS Act have no floor vote data.** Both passed by voice vote, so no individual member vote records exist for the crypto conflict cross-reference.
3. **House committee data missing.** GovTrack API has offset>1000 pagination limit. Got Senate committees (98 members) but not House. Committee-trade conflicts only work for senators.
4. **Senate options pre-2021: 0 detected.** Either senators didn't trade options before 2021 or the eFD HTML format for options was different in earlier years.
5. **Lobby entity-to-ticker mapping covers ~50 of 137 entities.** Remaining 87 entities with lobbying data don't have mapped stock tickers.

## Data Files

| File | Size | What it contains |
|------|------|-----------------|
| `data/financial-disclosures-historical.json` | ~5MB | House PTR filings 2012-2026 |
| `data/senate-disclosures-historical.json` | ~1MB | Senate PTR filings 2014-2026 |
| `data/financial-disclosures.json` | ~570KB | Current/recent House filings (daily pipeline) |
| `data/crypto-votes.json` | ~1.7MB | 170 crypto bills, 9 with floor votes |
| `data/committee-assignments.json` | ~32KB | 98 senators, 11 committees with sector mappings |

## Scripts

| Script | What it does |
|--------|-------------|
| `scripts/financial-disclosures-backfill.cjs` | House PTR PDF backfill (2012-2026) |
| `scripts/senate-disclosures-backfill.cjs` | Senate eFD HTML backfill (2012-2026) |
| `scripts/crypto-votes-fetch.cjs` | GovTrack crypto bill + vote scraper |
| `scripts/committee-assignments-fetch.cjs` | GovTrack committee assignment scraper |
| `scripts/financial-disclosures-pipeline.cjs` | Daily pipeline (both chambers, last 90 days) |

## Next Steps (when returning to this)

1. Re-run House backfill with 10-strategy parser (currently running with 6-strategy)
2. Investigate Senate options detection pre-2021
3. Map remaining 87 lobby entities to stock tickers
4. Find alternative source for House committee assignments (bypass GovTrack offset limit)
5. Consider scraping FIT21/GENIUS Act cosponsor lists as proxy for vote-conflict detection
