# Perplexity Research — 2026 CA Governor Race
## Pulled: 2026-04-29

Research artifacts from a deep Perplexity query on the 2026 California
gubernatorial primary field. Compiled five weeks before the June 2, 2026
primary. **Preserve permanently** — these are the source-of-truth research
inputs that future canonical relationship edges trace back to.

## Files

| File | Type | Volume | What it is |
|------|------|--------|------------|
| `committees.csv` | structured | 39 rows | Campaign committees per candidate (state + federal + 501c4) with treasurer + status + source URL |
| `donor_overlaps.csv` | structured | 71 rows | Donor → candidate giving relationships, tagged tier 1 (primary source) or tier 2 (aggregator) |
| `independent_expenditures.csv` | structured | 15 rows | IE committees with target + total spend + top funder one level up |
| `2026_CA_Gov_Donor_Report.md` | narrative | 3,774 lines | 9 candidate dossiers (12-section template each) + headline findings + cross-cutting analysis |
| `data_gaps.md` | editorial | 196 lines | What couldn't be retrieved (mostly Cal-Access blocked) — context, not facts |

## Headline findings (from the report)

1. **Steyer self-funds at unprecedented scale** (~$144M raised, ~$132M spent — almost entirely his own money), drawing $21M+ in opposition IE money led by **PG&E ($9.975M)**.
2. **Mahan's machine pre-positioned its dark-money vehicle** (Back to Basics California 501(c)(4)) 19 months before launch.
3. **Tribal gaming, Laborers' Council, PORAC, AltaMed cut max checks across the field** — true "both-sides players."
4. **Cross-party billionaire hedging documented**: Sergey Brin, Chris Larsen, Uber gave to candidates in both parties.
5. **Becerra received the first Chevron USA max contribution to a CA gubernatorial candidate since Jerry Brown in 2014**.
6. **Bianco faces an active CA DOJ civil-rights investigation** of the Riverside County jail while running on "law and order."
7. **Hilton's wife Rachel Whetstone** is Netflix Chief Communications Officer — conflict-of-interest exposure.
8. **Thurmond's union base abandoned him** — CTA endorsed Steyer instead.

## The Cal-Access wall

**Every candidate dossier hit the same wall:** Cal-Access direct portal
(https://cal-access.sos.ca.gov/) is robots-blocked from automated retrieval,
and the NextGen replacement is partially deployed. So even Perplexity's
research relied on Tier 2 aggregators (TheBallotBook, TransparencyUSA,
FPPC top-10 lists) for itemized donor data. The path to Tier 1 is the
manual bulk download — see `../README.md` for the source URL.

## Integration plan

Per Constitution Rules 1, 4, 13 + ADR-0029, this data is **textbook Tier 2
batch-approved territory**. The structured CSVs have high quality but every
URL needs editorial verification before edges land in canonical stores.

- **Phase 1 (planned):** Build `scripts/parse-perplexity-research.cjs` —
  parser that normalizes amounts, maps to canonical edge + entity shape,
  emits to a STAGING file, doesn't touch canonical stores.
- **Phase 2 (planned):** New pipeline class `perplexity-research-edge-ingestion`
  surfaces each proposed edge in `/audit-claude-decisions` for batch approve/
  reject. On approval: emit to canonical with `decided_by:
  claude-batch-approved` + `source: perplexity-research-2026-04-29`.

Tracked in `content/Admin Notes/cal-access-pipeline-plan.md`.

## Sourcing tier definitions (from the report)

- **Tier 1** = primary-source government filings (Cal-Access, FEC, IRS 990s,
  court records, FPPC enforcement docket). Cited inline without flag.
- **Tier 2** = secondary outlets (CalMatters, LAT, SFC, Politico, OpenSecrets,
  Ballotpedia, FollowTheMoney, TransparencyUSA, TheBallotBook, campaign
  press releases). Tagged inline as `[Tier 2 — needs primary verification]`.

When parsing into canonical edges, suggested confidence mapping:
- tier 1 → confidence 0.9
- tier 2 → confidence 0.7
