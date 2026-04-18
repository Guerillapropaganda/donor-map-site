---
title: "FEC Annual Financial Disclosures (Form A) — Ingest Plan"
type: admin-note
note-type: code
priority: normal
status: open
lane: code
last-updated: '2026-04-18'
generated-by: hand
---

# Annual Financial Disclosures — Extending the Disclosures Pipeline

## What's covered today vs. what's missing

`scripts/financial-disclosures-pipeline.cjs` currently ingests **PTR** (Periodic Transaction Reports = stock trades) from both House Clerk and Senate EFDS. This covers trades, not net worth.

**Missing: Annual Financial Disclosures (Form A / Form B for candidates).** Every sitting Senator and Representative files an annual disclosure covering:
- Assets held by the member and spouse (with value ranges)
- Unearned income (dividends, interest, capital gains) by source
- Liabilities (mortgages, loans) with value ranges
- Earned income outside congressional salary (speaking fees, book advances)
- Positions held in non-government organizations (nonprofit boards, etc.)
- Gifts (with source, value)
- Travel reimbursements (with source, value)

This is the canonical "Wealth Outside Donations" source per ADR-0012 section 3.2.

## Source URLs

- **House:** `https://disclosures-clerk.house.gov/FinancialDisclosure` — same ASP.NET form as PTR search. Annual XML zip at `disclosures-clerk.house.gov/public_disc/financial-pdfs/{year}FD.zip` contains both PTR and annual filings; filter by `<FilingType>A</FilingType>`.
- **Senate:** `https://efdsearch.senate.gov/search/` — EFDS POST API with filing-type filter for "Annual Report".

## Parsing complexity

Annual filings are structurally different from PTR:
- House: XML manifest + per-filing PDF. PDF parsing required (pdfjs or similar).
- Senate: HTML report pages with nested tables per schedule.

Each schedule (Schedule A: Assets, Schedule B: Transactions, Schedule C: Liabilities, Schedule D: Positions, Schedule E: Gifts, etc.) has its own format.

## Recommended implementation

Extend `financial-disclosures-pipeline.cjs`:

1. Extend `downloadSenateDisclosures` + `downloadHouseDisclosures` to accept a filing-type parameter (`'PTR' | 'A' | 'ALL'`).
2. Parse annual filings into `data/financial-disclosures-annual.jsonl` with schema:
   ```
   {
     filer_bioguide, filer_name, filing_year,
     chamber, state, party,
     assets: [{ name, value_low, value_high, income_type, income_low, income_high }],
     liabilities: [{ creditor, type, amount_low, amount_high }],
     earned_income: [{ source, type, amount }],
     positions: [{ organization, role }],
     gifts: [{ source, value_low, value_high, description }],
     travel: [{ sponsor, destination, value_low, value_high }]
   }
   ```
3. Cross-reference filer name to `data/legislator-registry.jsonl` for bioguide.
4. Extend `build-fec-lifetime-panels.cjs` to render the "Wealth Outside Donations" auto-block per ADR-0012 from this store.

## Blockers

- **PDF parsing** for House filings is non-trivial. Reliable third-party APIs exist (ProPublica's public-website scraping has solved this for their internal use) but building our own parser is 1-2 weeks of work.
- **Value ranges** are bucket-based (e.g., "$15,001-$50,000") not precise amounts. Rendering "net worth" requires bucket-midpoint estimation with explicit caveats.

## Alternative: ProPublica Nonprofit Explorer + Congressional Integrity Project

If building the PDF parser is too expensive, cite ProPublica's [Congressional Integrity Project](https://projects.propublica.org/represent/) which has already parsed these filings. Link per member. Cite per Tier 2.

## Owner

Code Claude (this lane). Deferred — after the April 30 soft-launch of 50 profiles (which use the Wealth Outside section in a manually-populated state for those profiles).
