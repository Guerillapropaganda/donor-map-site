---
title: Validation Report — Edge Store vs FEC Upstream
type: admin-note
status: open
lane: code
generated: 2026-04-20
source-script: scripts/verify-committee-receipts.cjs
tolerance: 10%
---

# Validation Report — 2026-04-20

Reconciles internal edge-store receipts against authoritative FEC bulk
data (`indiv-by-committee`, `pas2-conduit`, `oth-transfers`,
`pas2-direct-donors`) at the committee × cycle level. The source
sums ARE the FEC upstream — no aggregator step in between — so
confidence on the external number is HIGH across the board.

**21/30 top cycles within ±10%. 9 discrepancies flagged below.**

---

## Discrepancies

```json
[
  {
    "entity": "WinSenate (C00242648)",
    "cycle": "2024",
    "internal_total": "$396,400,000",
    "external_total": "$1,023,500,000",
    "difference_percent": "-61.3%",
    "source_breakdown": { "indiv": "$322.9M", "conduit": "$0M", "transfers": "$700.6M", "pacGifts": "$0M" },
    "likely_cause": "MASSIVE under-ingest of committee-to-committee transfers IN. $700M of transfer receipts exist in oth-transfers.jsonl but are not in the edge store. Either aggregate-committee-transfers-to-edges.cjs did not run to completion for this cmte_id, or a joint-fundraising-committee routing step is dropping these rows.",
    "confidence": "HIGH",
    "recommended_fix": "Re-run scripts/aggregate-committee-transfers-to-edges.cjs scoped to dst_cmte_id=C00242648 cycle=2024 and diff row counts. If the aggregator emits 0 edges, inspect the dst_cmte_id filter. If it emits edges but they aren't landing in relationships.jsonl, check canonical-store write path."
  },
  {
    "entity": "DCCC - Democratic Congressional Campaign Committee",
    "cycle": "2024",
    "internal_total": "$168,800,000",
    "external_total": "$200,500,000",
    "difference_percent": "-15.8%",
    "source_breakdown": { "indiv": "$65.0M", "conduit": "$0M", "transfers": "$135.5M", "pacGifts": "$0M" },
    "likely_cause": "Missing transfer ingest segment — transfers account for 68% of DCCC receipts; a ~$30M slice of oth-transfers.jsonl rows is not represented in the edge store. Likely a src_cmte_id for an affiliated state-party transfer that isn't mapped to DCCC yet.",
    "confidence": "HIGH",
    "recommended_fix": "Query oth-transfers.jsonl for dst_cmte_id in DCCC's committee-id set for 2024, group by src_cmte_id, diff against edges WHERE to='DCCC...' AND cycle=2024. Missing src_cmte_ids are candidates for new entity stubs or registry additions."
  },
  {
    "entity": "NRCC - National Republican Congressional Committee",
    "cycle": "2022",
    "internal_total": "$175,800,000",
    "external_total": "$199,800,000",
    "difference_percent": "-12.0%",
    "source_breakdown": { "indiv": "$26.5M", "conduit": "$0M", "transfers": "$173.3M", "pacGifts": "$0M" },
    "likely_cause": "Same pattern as DCCC 2024: transfers dominate receipts (87%), edge store is missing ~$24M of transfer-in rows. Likely unmapped src_cmte_id affiliates (joint fundraising committees, state parties).",
    "confidence": "HIGH",
    "recommended_fix": "Same diff procedure as DCCC. Add missing src committees to fec-committee-registry.json where they represent new vault entities; otherwise emit bare-entity edges with donor_name=cmte_name and flag for review."
  },
  {
    "entity": "NRSC - National Republican Senatorial Committee",
    "cycle": "2024",
    "internal_total": "$165,100,000",
    "external_total": "$187,700,000",
    "difference_percent": "-12.0%",
    "source_breakdown": { "indiv": "$52.3M", "conduit": "$0M", "transfers": "$135.4M", "pacGifts": "$0M" },
    "likely_cause": "Same transfer-ingest gap pattern. Transfers = 72% of receipts, edge store misses ~$22M.",
    "confidence": "HIGH",
    "recommended_fix": "Same diff procedure as DCCC/NRCC. Likely shares unmapped src committees with the other party-committee UNDER cases, so fixing the registry once may close all three."
  },
  {
    "entity": "MAGA Inc",
    "cycle": "2024",
    "internal_total": "$560,500,000",
    "external_total": "$498,500,000",
    "difference_percent": "+12.4%",
    "source_breakdown": { "indiv": "$519.4M", "conduit": "$0M", "transfers": "-$20.9M", "pacGifts": "$0M" },
    "likely_cause": "DOUBLE-COUNTING, likely between fec-indiv-by-committee aggregation and one of the other ingest slices (irs-990-bulk employer-match, or legacy pre-partition edges from data/derived/ that are also in main relationships.jsonl). Negative transfers value ($-20.9M) confirms FEC recorded net transfer OUT (refunds > inflows), so the +12% overcount is purely on the individual-donor side. Note: Timothy Mellon ($151M) and other mega-gifts make small double-counts visually large.",
    "confidence": "MEDIUM",
    "recommended_fix": "Run scripts/find-duplicate-edges.cjs (if exists, else write) scoped to to='MAGA Inc' cycle=2024: group by (from, amount, date) and flag exact collisions across sources. Prime suspects: employer-contribution rollups double-emitted from both fec-indiv-by-committee and an employer-aggregation script."
  },
  {
    "entity": "MAGA Inc",
    "cycle": "2026",
    "internal_total": "$365,800,000",
    "external_total": "$329,800,000",
    "difference_percent": "+10.9%",
    "source_breakdown": { "indiv": "$329.8M", "conduit": "$0M", "transfers": "$0M", "pacGifts": "$0M" },
    "likely_cause": "Same double-count pattern as MAGA Inc 2024. 2026 has no transfers yet (cycle still open), so the overcount is entirely on indiv. $36M delta suggests a specific source — possibly employee-contributions edges not deprecated from an earlier ingest pass.",
    "confidence": "MEDIUM",
    "recommended_fix": "Duplicate-edge scan. Cross-check whether any 2026 MAGA Inc edges have source=employee-contributions or source=fec-indiv-by-committee overlap — yesterday's session deprecated IE-null edges for super PACs but may have missed inflow dupes."
  },
  {
    "entity": "Fairshake PAC",
    "cycle": "2024",
    "internal_total": "$529,000,000",
    "external_total": "$455,300,000",
    "difference_percent": "+16.2%",
    "source_breakdown": { "indiv": "$373.2M", "conduit": "$0M", "transfers": "$82.1M", "pacGifts": "$0M" },
    "likely_cause": "Double-counting — a 2024 crypto-PAC hot spot. $74M overcount. Could be the same employee-aggregation dupe pattern, OR could be that the Fairshake deprecation pass yesterday (null-role IE edges) missed some donor-side inflow edges that got aggregated twice.",
    "confidence": "MEDIUM",
    "recommended_fix": "Duplicate-edge scan scoped to Fairshake 2024. Also: verify yesterday's Fairshake IE-null deprecation covered ONLY spending edges (role=ie-*), not inflow edges (role=donation). If inflow edges were accidentally deprecated AND re-emitted, that would show as overcount."
  },
  {
    "entity": "SLF PAC (Senate Leadership Fund)",
    "cycle": "2022",
    "internal_total": "$228,800,000",
    "external_total": "$205,500,000",
    "difference_percent": "+11.3%",
    "source_breakdown": { "indiv": "$189.7M", "conduit": "$0M", "transfers": "$15.8M", "pacGifts": "$0M" },
    "likely_cause": "Double-counting ~$23M. Same family as MAGA Inc / Fairshake overcount — almost entirely on the indiv slice. Sherman Mellon-tier megadonors concentrated here.",
    "confidence": "MEDIUM",
    "recommended_fix": "Duplicate-edge scan scoped to SLF PAC cycle=2022. Check for donor-name collisions where the same individual gift appears twice (e.g. once attributed to donor individual, once to donor's company via employer-field)."
  },
  {
    "entity": "SLF PAC (Senate Leadership Fund)",
    "cycle": "2020",
    "internal_total": "$278,600,000",
    "external_total": "$199,000,000",
    "difference_percent": "+40.0%",
    "source_breakdown": { "indiv": "$188.4M", "conduit": "$0M", "transfers": "$10.6M", "pacGifts": "$0M" },
    "likely_cause": "The worst overcount in the sample. $80M double-count on a ~$200M-source committee. Either (a) a full ingest pass was run twice and not deduped for this committee, (b) an affiliate/conduit SuperPAC's receipts got rolled into SLF PAC via a mis-linked parent relationship, or (c) indiv + employer-rollup double-emission is extreme for this cycle.",
    "confidence": "MEDIUM",
    "recommended_fix": "HIGH PRIORITY — inspect first. Run: SELECT from, to, amount, cycle, source, COUNT(*) FROM edges WHERE to='SLF PAC' AND cycle='2020' GROUP BY ... HAVING COUNT(*) > 1. Also check scripts/auto-link-committee-affiliates.cjs output log for any 2020-era committee that may have been over-eagerly parented to SLF PAC."
  }
]
```

---

## Root cause summary

Two distinct failure modes:

**UNDER (4 cases, all party committees):** WinSenate, DCCC, NRCC, NRSC
all under-count by 12–61% and share a signature — transfer-heavy
receipts with unmapped `src_cmte_id` affiliates. Fix is registry work:
identify the missing source committees in `oth-transfers.jsonl`, add
them to `data/fec-committee-registry.json`, re-run the aggregator. One
fix likely closes all four.

**OVER (5 cases, all super PACs / indiv-heavy):** MAGA Inc (both
cycles), Fairshake 2024, SLF PAC (both cycles) all over-count on the
individual-donor slice. Signature is duplicate edges, most likely
employer-aggregation rollups double-emitted. SLF 2020 at +40% is the
outlier and should be inspected first to rule out a single systemic
bug vs per-committee noise.

---

## Update — 2026-04-20 diagnostic pass

`scripts/find-duplicate-edges.cjs` was written and run. Exact-collision
key (from, to, amount, cycle) found ZERO dupes on SLF PAC 2020 —
ruling out the "same gift emitted twice with matching amount"
hypothesis.

Source-composition inspection found the actual culprit: **two
overlapping FEC individual-donation ingest pipelines are both
active**, emitting parallel edges for the same underlying itemized
contributions at different aggregation grains:

- `fec-indiv-by-committee` — per-(donor,committee,cycle) rollup
- `fec-individual-bulk` — a separate bulk ingest that re-aggregates
  the same underlying itemized transactions and emits its own edges

They don't collide on amount because they roll up differently, which
is why the duplicate finder with a strict (from,to,amount,cycle) key
missed them.

### Effect of dropping `fec-individual-bulk` edges

| Committee / Cycle | Current edge | Minus -bulk | FEC upstream | Residual | Closes? |
|---|---|---|---|---|---|
| SLF PAC 2020 | $278.6M | $197.9M | $199.0M | -0.5% | ✓ |
| SLF PAC 2022 | $228.8M | $197.8M | $205.5M | -3.7% | ✓ |
| MAGA Inc 2026 | $365.8M | $329.8M | $329.8M | 0.0% | ✓ |
| MAGA Inc 2024 | $560.5M | $544.2M | $498.5M | +9.2% | borderline |
| Fairshake 2024 | $529.0M | $514.3M | $455.3M | +13.0% | no — secondary bug |

**Three of five OVER cases close cleanly by deprecating the
fec-individual-bulk source for already-covered committees.** The
remaining two have a secondary bug in transfers — edge transfers
for MAGA 2024 sum to +$36M vs FEC net -$21M (refund-netting
missing); Fairshake 2024 transfers sum to $168M vs FEC $82M
(subsidiary-rollup double-count).

### Revised action plan

1. **Deprecate all `source: "fec-individual-bulk"` edges** (or
   narrow to non-committee-mapped rows only). Confidence: HIGH.
   Validation: re-run verify-committee-receipts; SLF PAC both
   cycles and MAGA Inc 2026 should flip to ✓, total ✓ count
   should go from 21 → 24.
2. **Patch transfer refund-netting.** Audit
   scripts/aggregate-committee-transfers-to-edges.cjs to confirm
   it emits NEGATIVE edges for refund transactions (transaction
   type 24R/24Z) rather than dropping them. MAGA Inc 2024 is the
   clearest test case.
3. **Patch Fairshake subsidiary transfer rollup.** Fairshake has
   multiple affiliated committees via auto-link-committee-affiliates;
   verify we're not summing the same transfer once at the affiliate
   level and again at the parent level.
4. **Dump unmapped `src_cmte_id` list** for the 4 UNDER party
   committees (WinSenate, DCCC, NRCC, NRSC). Still pending.
5. **Re-run `verify-committee-receipts.cjs --strict`** after each
   fix. Goal: 30/30 within ±10%.

All five are Code Claude lane, no ADR needed.

---

## Appendix A — Leonard Leo external-source cross-check

Validation against CREW + ProPublica Nonprofit Explorer (IRS 990).

**External numbers:**

- [CREW, 2026](https://www.citizensforethics.org/reports-investigations/crew-investigations/leonard-leos-firm-continues-to-rake-in-millions-from-his-own-dark-money-network/): The 85 Fund → CRC Advisors $24.9M (2023), $88M all-time (2012–2023). Leo-affiliated → CRC cumulative $116M of $135M (2016–2023). CRC total 2023 revenue $33M, 80% from Leo network.
- [ProPublica Nonprofit Explorer, Marble Freedom Trust EIN 85-0784793](https://projects.propublica.org/nonprofits/organizations/850784793): Revenue 2021 $1.64B, 2022 $27M, 2023 $48M, 2024 $62M. Expenses 2021 $230M, 2022 $185M, 2023 $224M, 2024 $201M. Cumulative expenses 2021–2024 ≈ **$838M**. Assets 2024 $992M.

**Comparison:**

```json
[
  {
    "entity": "Marble Freedom Trust — total distributions 2021-2024",
    "internal_total": "$461M (vault Ask UI 'moved to allies')",
    "external_total": "$838M (sum of IRS 990 Part IX total expenses 2021-2024)",
    "difference_percent": "-45%",
    "likely_cause": "irs-990-bulk ingest is capturing only ~55% of MFT's actual grantmaking. Possible causes: (a) ingest only pulled Schedule I (grants ≥$5K) not full Part IX, (b) the ingest ran against older filing years only, (c) some 990 rows fail name-normalization and aren't linked back to MFT.",
    "confidence": "HIGH",
    "recommended_fix": "Audit data/derived/irs-990-bulk.jsonl for from='Marble Freedom Trust' edges. Group by tax_year, compare row counts to the 4 filing years. If 2023/2024 are thin or missing, the ingest needs a refresh. Also check whether any rows are failing the entity-linker (e.g. 'Marble Freedom' vs 'Marble Freedom Trust')."
  },
  {
    "entity": "Marble Freedom Trust — total assets",
    "internal_total": "(not displayed)",
    "external_total": "$992M (2024 filing)",
    "difference_percent": "n/a — field not tracked",
    "likely_cause": "Vault does not yet store 501(c)(4) balance-sheet state alongside flow data. Without it, a reader can't see that MFT has nearly $1B in corpus still to deploy.",
    "confidence": "HIGH",
    "recommended_fix": "Extend entities.jsonl signals block for dark-money orgs to include {total_assets_by_year, total_revenue_by_year, total_expenses_by_year}. Populate from irs-990-bulk Part I, lines 12/18/20. Low-risk additive change, no ADR needed."
  },
  {
    "entity": "Marble Freedom Trust — 'total lifetime distributed'",
    "internal_total": "$2.2B (claim in profile body, line 112)",
    "external_total": "~$838M (actual 990 expenses 2021-2024)",
    "difference_percent": "+162%",
    "likely_cause": "Narrative-prose claim is inflated. $2.2B does not match any single IRS 990 total — closest is ~$1.78B cumulative REVENUE 2021-2024, or the Seid donation + subsequent investment growth. Somebody conflated 'received' with 'distributed' in the Research-Claude pass.",
    "confidence": "HIGH",
    "recommended_fix": "Research Claude lane — correct the prose claim on line 112 of content/Donors & Power Networks/Leonard Leo.md. Replace '$2.2B distributed' with 'Received $1.6B Seid donation in 2021; distributed ~$838M through 2024; ~$992M in corpus remains.' Flag in editorial queue."
  },
  {
    "entity": "Leonard Leo — subawards-issued-amount frontmatter",
    "internal_total": "$1,009,778,941,592,127,500 (= ~$1.0 quintillion)",
    "external_total": "n/a — field is nonsensical at this magnitude",
    "difference_percent": "DATA CORRUPTION",
    "likely_cause": "Integer overflow or unit error in USASpending-bulk ingest. Leo has no federal contract/subaward relationship; this field should be 0 or absent. The exact value (1.009e18) suggests a subaward UUID or transaction ID was parsed as an amount.",
    "confidence": "HIGH",
    "recommended_fix": "Patch USASpending-bulk ingest to validate amount is a number <$1e13 (above which is impossible for any real federal award). Null out or delete this frontmatter field for Leonard Leo. Sweep entities.jsonl + all profile frontmatter for any other values >$1e13 — likely a systemic bug."
  },
  {
    "entity": "Leonard Leo — politicians-funded table (11 rows)",
    "internal_total": "All amounts show '—'",
    "external_total": "n/a — these are derived edges",
    "difference_percent": "EMPTY VALUES",
    "likely_cause": "Frontmatter lists 11 politicians (Gorsuch, Thomas, McConnell, Kavanaugh, etc.) but build-profile-data-panels.cjs can't attach amounts because Leo's giving runs through 501(c)(4) vehicles (MFT, 85 Fund, JCN) — there are no direct donor→politician edges, only donor→vehicle→politician chains. The data panel queries direct edges only.",
    "confidence": "HIGH",
    "recommended_fix": "Either (a) extend build-profile-data-panels.cjs to walk 2-hop via controlled vehicles and surface aggregated per-politician totals, OR (b) remove the frontmatter list for Leo since it implies direct giving he hasn't done. Option (a) is the durable fix — the 'What This Means' block in the Ask UI already explains this exact pattern, the data panel just isn't using the same logic yet."
  },
  {
    "entity": "Marble Freedom Trust → Schwab Charitable Fund",
    "internal_total": "$154M (appears TWICE in Ask UI 'Support' row)",
    "external_total": "$18M in 2022 per SourceWatch/CRP; additional grants in later years not yet public",
    "difference_percent": "Possibly over; definitely duplicated",
    "likely_cause": "Ask UI shows 'Schwab Charitable Fund $154M, Schwab Charitable Fund $154M' — two identical rows. Either the edge exists twice in the edge store (failed dedup) OR the Ask UI template is double-rendering when an entity has multiple matching edges at the same amount. The $154M figure itself is larger than any single publicly-reported MFT→Schwab grant; may be a cumulative rollup mis-labeled as a single transaction.",
    "confidence": "MEDIUM",
    "recommended_fix": "Run find-duplicate-edges.cjs --to 'Schwab Charitable Fund' to check for exact duplicates. Also audit the Ask UI 'top support' rendering logic in ops/src/app/api/ask for double-render bug. Separately, cross-check the $154M against aggregated 990 Schedule I lines — if it's cumulative, the label should say so."
  }
]
```

### Pattern summary — Leo external check

CREW's CRC Advisors / 85 Fund numbers match our narrative prose almost
exactly ($33M 2023 revenue, 80% from Leo groups — cited identically in
both). The profile text is well-sourced. Where the vault breaks down is
at the **structured-data layer**:

1. **Grant-distribution totals are under-ingested** (MFT at -45% vs 990s).
2. **Balance-sheet state is unrepresented** (no total_assets field).
3. **One data-corruption bug** (quintillion-dollar subawards).
4. **Derived-flow rendering is incomplete** (politicians-funded table empty).
5. **One prose claim is inflated** ($2.2B "distributed" vs $838M actual).

The Leo profile is READY and widely linked (cross-vault-triangulation = 22
other profiles reference him), so these fixes have high leverage.

### Added action items

6. **Research Claude:** correct the $2.2B prose claim on Leonard Leo.md:112.
7. **Code Claude:** null out `subawards-issued-amount: 1e18` on Leo
   frontmatter and sweep entities.jsonl for other >$1e13 values.
8. **Code Claude:** refresh irs-990-bulk ingest for MFT recent years, diff
   against ProPublica Part IX expense totals.
9. **Code Claude:** extend build-profile-data-panels.cjs to do 2-hop
   aggregation via controlled vehicles for dark-money donors, OR emit
   "(via controlled orgs)" labels instead of empty "—".
10. **Code Claude:** audit Ask UI "top support" double-render (Schwab row
    appears twice in screenshot).

---

## Update 2026-04-20 (late PM) — MFT data re-check

The $461M "moved to allies" figure from the Ask UI screenshot was not a
data-ingest problem. Direct inspection of the edge store shows **$803M
total MFT outflows across 2021-2024** — within 4% of the $838M ProPublica
990 Part IX total. Matches IRS Schedule I grant rows exactly:

| Year | Edge store | IRS 990 grant_total |
|---|---:|---:|
| 2021 | $228.6M | $228.6M |
| 2022 | $182.7M | $182.7M |
| 2023 | $209.3M | $216.8M |
| 2024 | $182.4M | $189.2M |

Top recipients match external reporting: Schwab Charitable Fund $447.6M
(cumulative across 4 years), JCN $161.3M, Rule of Law Trust $153.0M,
Donors Trust $41.1M.

**Revised diagnosis:** MFT structured data is correct and well-ingested.
The $461M figure in the Ask UI is either (a) applying a cycle/year
filter not visible in the screenshot, or (b) a query-engine scoping
issue that misses 42% of the true total. **The bug is in the Ask UI
query, not the 990 ingest.**

This also explains why the Ask UI shows "Schwab Charitable Fund $154M"
twice — Schwab appears in every year of MFT grants at ~$150M/cycle,
and the display is collapsing adjacent years into what looks like
duplicate rows.

Revised action for item #1 from Appendix A: **was** "refresh irs-990-
bulk ingest for MFT recent years" — **actually** "audit the Ask UI
query that produces the 'moved to allies' figure; current query returns
$461M where $803M is in the edge store."
