---
title: Cal-Access Pipeline Plan
type: admin-note
note-type: data
priority: high
status: open
last-updated: '2026-04-29'
note-kind: handoff
---

# Cal-Access Pipeline Plan

## Why this exists

The ops `/races/ca-gov-2026` curation page (shipped 2026-04-29) shows
**federal money only** for each candidate — FEC + IRS 990 + USASpending,
whatever the librarian has loaded. For the actual California gubernatorial
race, that's a fraction of reality: California gubernatorial fundraising
is reported to **Cal-Access**, not the FEC. Without a Cal-Access
ingester, the donor-map sees Steyer's $1B from his 2020 federal Pres
run but zero of his California state-level fundraising. Same hole for
Porter (FEC House data shows up; Cal-Access gov fundraising is invisible).

This plan is the build spec for the Cal-Access bulk ingester. Currently
`scripts/ingest-cal-access-bulk.cjs` is a NotImplemented placeholder.

## Source

Cal-Access bulk archive: https://www.sos.ca.gov/campaign-lobbying/cal-access-resources/raw-data-campaign-finance-and-lobbying-activity

Single zipped archive (~200-500MB) containing DBF + TSV tables.

## Tables we need

| Table | What it is | Why we want it |
|-------|------------|----------------|
| `RCPT_CD.TSV` | Receipts (contributions to committees) | Edge source: donor → committee |
| `EXPN_CD.TSV` | Expenditures | Edge source: committee → vendor / candidate / IE target |
| `FILERNAME_CD.TSV` | Committee + filer name registry | Resolves filer_id → human-readable name |
| `FILER_FILINGS_CD.TSV` | Maps filers to their filings | The committee-to-candidate walk |
| `FILER_TO_FILER_TYPE_CD.TSV` | Committee type taxonomy | Distinguishes candidate-controlled vs IE vs ballot-measure |

## Edge schema (target)

Output to `data/derived/cal-access-receipts.jsonl` and
`data/derived/cal-access-expenditures.jsonl`. Schema mirrors FEC
bulk output for librarian compatibility:

```json
{
  "id": "calaccess_rcpt_<sha8>",
  "from": "<donor canonical name>",
  "to": "<committee canonical name>",
  "from_type": "donor",
  "to_type": "donor",
  "type": "monetary",
  "direction": "directed",
  "confidence": 0.95,
  "source": "cal-access-bulk",
  "source_url": "https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=<filer_id>",
  "amount": 5000,
  "cycle": "2026",
  "role": "direct",
  "first_seen": "2024-01-15",
  "evidence": ["Cal-Access RCPT_CD line 12345"]
}
```

## Filer-to-candidate join (the hard part)

Unlike FEC, Cal-Access doesn't have a clean "controlled committee"
flag. The walk is:

1. `FILERNAME_CD` gives you committee names + filer IDs.
2. `FILER_TO_FILER_TYPE_CD` tags committees with type codes
   (CTL = candidate-controlled, IND = independent expenditure, etc.).
3. For candidate-controlled committees, the *committee name itself*
   contains the candidate name (convention: "Friends of <Candidate> for
   Governor 2026"). String-match against the race roster.
4. Build a manual override map for ambiguous cases — there will be
   some. Drop it at `data/cal-access-filer-overrides.json`.

For the 2026 CA-Gov race, the override map should pre-populate:
- Antonio Villaraigosa
- Betty Yee
- Chad Bianco
- Eric Swalwell
- Katie Porter
- Matt Mahan
- Steve Hilton
- Tom Steyer
- Tony Thurmond
- Xavier Becerra

Each candidate may have multiple committees (officeholder accounts,
ballot-measure committees, prior-cycle leftovers). Keep them all
mapped to the canonical entity.

## Edge ID collision with FEC bulk

Same donor + same date + same amount could conceivably show up in
both stores if a federal donor also gave at the state level on the
same day. Mitigate by including `source: "cal-access-bulk"` in the
edge-id hash so they don't collide. The librarian's de-dup logic
already handles same-id-different-source as the same edge.

## Phased build

**Phase 1 (1 session, ~$10-15):** parse bulk, emit raw donor → committee
edges to `data/derived/cal-access-receipts.jsonl`. No candidate join yet.
The /races page just shows committee-level totals. Establishes the
pipeline shape.

**Phase 2 (1 session, ~$10-15):** committee-to-candidate join, override
map, emit donor → committee → candidate triangulation. The /races
page shows candidate-level totals.

**Phase 3 (1 session, ~$8-12):** expenditures pipeline. Emit
committee → vendor / IE target edges. Surfaces self-dealing patterns
(spouse on payroll, donor-aligned consulting fees).

**Phase 4 (deferred):** scheduled refresh. Cal-Access publishes new
dumps weekly during filing season. Wire the dispatcher.

## What "best looking 5" needs from this

For the 2026-04-29 ship-ready 5 (Villaraigosa, Bianco, Mahan, Steyer,
Thurmond) to be genuinely publishable as `verified` rather than
just `data-complete`, we need Cal-Access. Right now their Money
sections show federal only — accurate but incomplete. A reader looking
at "Tom Steyer's donors" would see his 2020 Pres run, not his current
governor race. That's misleading enough to block verification.

Phase 1+2 of this plan unblocks the path to verified.

## What NOT to confuse this with

- **Cal-Access scraping (single-page).** The HTML scraper at
  `scripts/cal-access-scrape.cjs` (if it exists) hits one filer page at
  a time. Useful for ad-hoc lookups, NOT for bulk ingestion. The bulk
  archive is the proper source.
- **FEC California filings.** Some CA candidates also have FEC committees
  (Porter's House, Becerra's HHS, Swalwell's House). Those load through
  the existing FEC bulk pipeline and are already in the librarian. Don't
  re-ingest them via Cal-Access.
- **CA Secretary of State campaign-finance bulk vs lobbying bulk.** They're
  separate dumps. We want campaign-finance for the donor map.

## Where this plan was discovered

Conversation 2026-04-29 with David. He flagged the gap during the
"Perplexity prompt for CA-Gov donor trails" exchange — the prompt
correctly distinguishes Cal-Access from FEC, and David asked to set
up the operations side to ingest CA-specific CSVs. That ask is the
seed for this pipeline.
