# California Cal-Access Bulk Data

Drop downloaded Cal-Access bulk dumps in this directory. The `.gitignore`
at `data/bulk/` already excludes everything here from git — these files
are typically multi-hundred-MB and processed output goes to
`data/derived/cal-access-*.jsonl` instead.

## Source

Cal-Access bulk archive (California Secretary of State):
**https://cal-access.sos.ca.gov/Campaign/Other/Search.aspx?session=2025**

Or the direct dump page:
**https://www.sos.ca.gov/campaign-lobbying/cal-access-resources/raw-data-campaign-finance-and-lobbying-activity**

The bulk file is a single zipped archive (~200-500MB) containing several
DBF + TSV tables. The tables we care about for the donor-map:

| Table | What it is |
|-------|------------|
| `RCPT_CD.TSV` | Receipts (contributions to a committee). One row per donor. The big one — millions of rows. |
| `EXPN_CD.TSV` | Expenditures (committee → vendor / candidate / IE / staff). |
| `LOAN_CD.TSV` | Loans to committees. |
| `FILER_FILINGS_CD.TSV` | Maps filers to filings. Used to walk from a candidate to their committees. |
| `FILERNAME_CD.TSV` | Committee name registry. |
| `FILER_TO_FILER_TYPE_CD.TSV` | Committee type taxonomy (candidate-controlled, ballot-measure, IE-only, etc.). |

## Workflow once dumps are present

1. Drop the unzipped TSV files into this directory.
2. Run `node scripts/ingest-cal-access-bulk.cjs` (currently a NotImplemented
   placeholder — see `content/Admin Notes/cal-access-pipeline-plan.md` for
   the build spec).
3. Output lands in `data/derived/cal-access-receipts.jsonl` etc. — same
   shape as FEC bulk output: one edge per row, joined into the librarian
   on next graph load.

## Race-specific filtering

The 2026 California Governor race candidates' Cal-Access filer IDs
(populate as discovered):

| Candidate | Filer ID | Committee name | Notes |
|-----------|----------|----------------|-------|
| Antonio Villaraigosa | TBD | TBD | |
| Betty Yee | TBD | TBD | |
| Chad Bianco | TBD | TBD | |
| Eric Swalwell | TBD | TBD | Federal background — also has FEC committees |
| Katie Porter | TBD | TBD | Federal background — also has FEC committees |
| Matt Mahan | TBD | TBD | San Jose mayor — may have local committee history |
| Steve Hilton | TBD | TBD | |
| Tom Steyer | TBD | TBD | Federal background (2020 Pres run) — also has FEC committees |
| Tony Thurmond | TBD | TBD | State Superintendent — has prior CA filings |
| Xavier Becerra | TBD | TBD | Federal background (HHS Sec, AG, House) — also has FEC committees |

Once filer IDs are known, the ops `/races/ca-gov-2026` page will
display Cal-Access totals alongside federal totals.
