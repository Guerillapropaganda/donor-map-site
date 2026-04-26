---
title: "FEC candidate-summary ingest bugs — cycle attribution + missing pres committees"
type: admin-note
status: open
lane: code
priority: medium
date: 2026-04-22
discovered_during: raise-reconciliation-feature
note-kind: ticket
---

# FEC candidate-summary ingest bugs

Two separate data-quality issues surfaced during the raise-reconciliation work (Phase 3 of the edge-role-taxonomy effort). Neither blocks the launch; both produce visibly-wrong numbers for specific profiles and should be fixed before the 50-flagship sign-off phase.

## Bug 1 — Presidential committees not rolled up into candidate-summary

**Example:** Ted Cruz's `fec_receipts_by_cycle` shows $6.15M for 2016. His 2016 presidential campaign actually raised ~$90M+ (public record). His `fec_committee_ids` DOES include `C00574624` (Cruz for President), and his `fec_candidate_history` correctly lists 2016 with `office: "P"`. But the receipts rollup only walked his Senate candidate ID.

**Impact:** Any politician who ran for a higher office under a different FEC candidate ID — and where we store both IDs but only aggregate one — will show understated lifetime totals. Potentially affects Cruz, Rubio, Kasich, Walker, etc. Does NOT affect Bernie (his 2016 presidential numbers rolled up correctly — unclear why; may be related to primary-committee linkage).

**Root cause (suspected):** The ingest script (`scripts/ingest-fec-weball-summary.cjs` or related) walks a single FEC candidate ID per profile rather than iterating `fec_candidate_ids`.

**Workaround in place:** Raise-reconciliation narrative uses `fec_candidate_history` as a secondary signal so the 2016 presidential run STILL surfaces in the "big cycles" list even when the amount is understated ($5M history-floor). The label reads "2016 ($6.2M — presidential run)" — technically honest but the number is wrong.

**Fix:** Update the ingest to iterate every entry in `fec_candidate_ids`, aggregate receipts per cycle across all IDs, and write the union into `fec_receipts_by_cycle` and `fec_receipts_lifetime`. Test with Cruz 2016 — expect his lifetime to jump from $176M → ~$266M+.

## Bug 2 — fec-api source flattens IE-oppose into the current cycle

**Example:** Josh Hawley's IE-oppose totals $81M. Of that, $22M is legit 2018 spending (WinSenate, 40 PAS2 transactions — correct cycle attribution). The remaining $57M is 5 edges from the `fec-api` source (Senate Majority PAC, Emily's List / WOMEN VOTE!, Priorities USA, Majority Forward, etc.) all attributed to cycle "2030" (Hawley's next Senate cycle).

These are actually lifetime cumulative aggregates that the fec-api ingest bucketed into the candidate's next election cycle because the API response didn't split by cycle. Hawley is not actually going to receive $57M in attack ads in 2030 — that figure is pre-dated.

**Impact:** Makes any cycle-scoped IE totals wrong for any politician with `fec-api`-sourced IE-oppose edges. Probably affects most senators with big IE histories (Hawley, Warnock, Ossoff, McConnell, etc.).

**Root cause:** The fec-api ingest (not the pas2 bulk) returns candidate-level aggregates, not transaction-level data. Our ingest wrote these as single edges with `cycle` = the candidate's current cycle.

**Fix options:**
1. Stop ingesting fec-api candidate-level aggregates — rely on pas2 bulk transaction data only (loses some coverage but every edge has correct cycle attribution).
2. Rewrite the fec-api ingest to query per-cycle endpoints and write one edge per (candidate, cycle, committee) tuple.
3. Flag fec-api edges with `cycle: null` or `cycle: "lifetime-aggregate"` so consumers know they can't cycle-filter them.

Option 3 is the least invasive; option 2 is the right long-term answer.

## Why this was flagged now

During raise-reconciliation testing, David asked why Cruz's 2016 didn't surface as a big cycle and why Hawley's $81M IE-oppose was so high. Both answers led here.

Neither blocks Phase 3 from shipping — the raise reconciliation feature surfaces Cruz 2016 via the history-floor workaround, and the Hawley $81M total is accurate in aggregate even if the cycle label is wrong. But both should be fixed before the launch of the per-cycle scope feature (Phase 4), where wrong cycle attribution produces directly visible bad numbers.
