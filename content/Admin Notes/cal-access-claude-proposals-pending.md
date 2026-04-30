---
title: Cal-Access — Claude-proposed decisions pending David review
type: admin-note
note-type: editorial-review
priority: normal
status: open
last-updated: '2026-04-30'
note-kind: review-queue
---

# Cal-Access — Claude-proposed decisions pending David review

These are decisions Claude made under ADR-0029 Tier 2 ("Claude proposes, David approves") that haven't been wired into the formal editorial-decision-pipeline because the surface is small enough not to need it. **David: review each, then flip `decided_by` from `claude-proposed` to `david-confirmed` (or revert) directly in `data/cal-access-filer-overrides.json`.**

## 1. Override-map false-positive rejections (4 records)

Discovery script over-collected during cc_p3_185. Claude moved these to a `rejected` array per candidate during cc_p3_194.

### Antonio Villaraigosa

| filer_id | name | rationale |
|---|---|---|
| `1303063` | YES ON PROP S: A COALITION OF FIREFIGHTERS, POLICE OFFICERS, TAXPAYERS, WORKERS, BUS LEADERS & MAYOR VILLARAIGOSA | Ballot measure committee Villaraigosa sponsored as a coalition spokesperson, not a candidate-controlled committee. |
| `1270536` | CITIZENS FOR MORE POLICE IN OUR COMMUNITIES; MAJOR FUNDING BY FRIENDS OF ANTONIO VILLARAIGOSA | Ballot measure / advocacy coalition mentioning Friends of Antonio Villaraigosa as a partner. Not a Villaraigosa-controlled committee. |

### Betty Yee + Xavier Becerra

| filer_id | name | rationale |
|---|---|---|
| `1418587` | NEWSOM, ALEX PADILLA, XAVIER BECERRA, BETTY YEE, FIONA MA, ELENI KOUNALAKIS, RICARDO LARA; RAN ACTION FUND COMMITTEE TO RECALL GAVIN | Anti-Newsom recall coalition committee whose name lists multiple politicians as coalition members. Not IE-supporting Yee or Becerra individually. |

**To verify:** Check each filer ID at `https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=<id>` — Imperva-blocked; consider the Cal-Access bulk dump's FILERNAME_CD entry as the structural truth.

**To approve:** edit `data/cal-access-filer-overrides.json`, find the `rejected` array entry for that candidate, change `"decided_by": "claude-proposed"` → `"decided_by": "david-confirmed"`. Add a `david_decided_at` ISO timestamp.

**To revert:** delete the entry from `rejected` and re-run `node scripts/cal-access-discover-committees.cjs` — it will re-discover the filer and re-add it to controlled / ie_supporting / ie_opposing.

## 2. Roster status (2 records)

Per audit context cc_p3_191, two candidates are no longer actively campaigning. Claude marked their override-map entries with status flags.

| Candidate | Status | Date | Notes |
|---|---|---|---|
| Betty Yee | `withdrew` | 2026-04-XX | Per audit context: withdrew from active campaigning, reportedly endorsed Steyer, remains on ballot. **Date is approximate — needs primary-source verification.** |
| Eric Swalwell | `suspended` | 2026-04-12 | Per audit context: suspended campaign 2026-04-12, resigned House 2026-04-14. Dates from audit prompt context only. |

**Both render with badges + dimmed visual treatment** in `/races/ca-gov-2026` and the funding-structure plot.

**To verify:** primary-source check (CalMatters, SF Chronicle, official campaign announcement) — that's per Rule 13 your lane. If accurate, flip `status_decided_by: claude-proposed` → `david-confirmed` + fill in actual `status_date`.

**To revert:** set `status: active` and remove `status_date` / `status_note`.

## 3. Donor-name aliases (3 records)

Claude added 3 alias-merge entries to `data/cal-access-donor-aliases.json` during cc_p3_195 to consolidate spelling variants:

| Canonical | Variants collapsed |
|---|---|
| PG&E Corporation | "Pg&e", "Pg&e Corporation", "PG&E", "Pacific Gas & Electric", + others |
| AT&T | "At&t", "AT & T", "At and T", "AT&T Inc", + others |
| SEIU California State Council | "SEIU CA State Council", "SEIU California State Council for Working People", + others |

**To verify:** ensure the canonical name and the variant list are correct. If wrong canonical (e.g. should be just "PG&E" not "PG&E Corporation"), edit the JSON.

**To add more aliases:** discover them via `node scripts/cal-access-discover-committees.cjs` or by inspection, append to `data/cal-access-donor-aliases.json` with `added_by: claude-auto` (or `david-manual`).

## 4. Non-donor blocklist (1 record + 1 pattern)

`data/cal-access-non-donor-filers.json` filters public-fund disbursements out of "donor" totals. Currently:

| Type | Entry | Rationale |
|---|---|---|
| Exact | "City of Los Angeles Ethics Commission" | LA municipal matching-fund disbursement, not a private donor. |
| Pattern | `^City of [A-Z][a-z]+ Ethics Commission$` | Generalizes LA to other CA cities (SF, Oakland, San Diego have similar matching-fund programs). |

**To verify:** confirm no LEGITIMATE donors named "City of X" exist in the data. (Spot-check: the audit run filtered $7.93M correctly; no false positives observed.)

## How to fast-batch all of these

If you want to flip everything to `david-confirmed` in one pass after eyeballing:

```bash
# After verifying each item above, search-and-replace:
sed -i 's/"decided_by": "claude-proposed"/"decided_by": "david-confirmed"/g' data/cal-access-filer-overrides.json
sed -i 's/"status_decided_by": "claude-proposed"/"status_decided_by": "david-confirmed"/g' data/cal-access-filer-overrides.json
```

Or open in your editor of choice and search-replace manually if you only want to confirm a subset.

## Why no formal pipeline class

Per ADR-0029, the editorial-decision-pipeline expects N≥10 records to justify the scaffolding (store + class definition + harness check). With 6 records total across 3 categories, the JSON-direct-edit pattern is more honest. If Cal-Access scope grows (e.g. ingesting all CA races, not just CA-Gov 2026), promote these to formal classes.
