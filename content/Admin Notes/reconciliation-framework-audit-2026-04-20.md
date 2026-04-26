---
title: Reconciliation Framework Audit
type: admin-note
status: open
lane: code
generated: 2026-04-20
panel: content/Admin Notes/audit-panel-20.json
orchestrator: scripts/verify-all.cjs
note-kind: report
---

# Reconciliation Framework — First Audit

**The structural answer to "why do our numbers keep being wrong."**

Built this session:

- `scripts/verifiers/_framework.cjs` — shared Finding schema
- `scripts/verifiers/amount-sanity.cjs` — tier 1, bounds-check
- `scripts/verifiers/edge-consistency.cjs` — tier 1, internal edge-store integrity
- `scripts/verifiers/entity-resolution.cjs` — tier 1, reference integrity
- `scripts/verifiers/derived-totals.cjs` — tier 1, rendered panels match edge data
- `scripts/verifiers/committee-receipts.cjs` — tier 2, FEC upstream reconciliation
- `scripts/verify-all.cjs` — orchestrator, runs all checkers, writes JSON report

**Run:**
```bash
node scripts/verify-all.cjs --tier 1                  # fast, every commit
node scripts/verify-all.cjs --tier 2                  # slow, runs FEC bulk
node scripts/verify-all.cjs --tier all --panel content/Admin\ Notes/audit-panel-20.json --json report.json
```

---

## Design

**Two tiers, by speed and semantic:**

| Tier | Question | Runs | Source of truth | Cost |
|---|---|---|---|---|
| **1 internal** | Does our data agree with itself? | Every commit | Other local data files | <2s |
| **2 external** | Does our data match authoritative raw source? | On-demand / nightly | FEC bulk, IRS 990 bulk, USASpending bulk | ~30s (grows with data) |

Tier 1 catches the bug classes we keep hitting — corrupted values, self-loops,
duplicate edges, empty rendered tables, unresolved references. These are all
detectable without leaving the vault. **If tier 1 fails, tier 2 is moot.**

Tier 2 catches the harder class — drift between what we ingested and what
upstream actually said. Requires paying the cost of re-reading the raw
bulk data.

Every checker follows the same interface (see `_framework.cjs`) so we can
add new ones cheaply. Next ones to build: `nonprofit-distributions`
(IRS 990 Part IX vs vault), `subaward-totals` (USASpending bulk vs vault
frontmatter).

---

## First audit — 20-profile high-value panel

Panel: `content/Admin Notes/audit-panel-20.json` — 5 politicians, 3 dark-money
operatives, 4 super PACs, 3 party committees, 5 501(c) orgs.

### Tier 1 findings (55 total)

| Checker | Errors | Warns | Notable |
|---|---:|---:|---|
| amount-sanity | 4 | 0 | Leonard Leo + The 85 Fund both have `subawards-issued-amount = $1.0 quintillion` — USASpending-bulk ingest bug. Both fields, both profiles. |
| derived-totals | 0 | 4 | Leonard Leo, JCN, MAGA Inc, Fairshake PAC all have "Top politicians funded" tables with 100% empty amount columns — data panel can't do 2-hop aggregation via controlled vehicles. |
| edge-consistency | 33 | 0 | 33 self-loop edges on DCCC/NRCC/RNC (small amounts, `fec-individual-bulk` source — donors named after the committee itself). |
| entity-resolution | 0 | 14 | Unresolved wikilinks in frontmatter `related:` pointing to story/analysis pages that don't exist as profiles. Low severity. |

### Tier 2 findings (11 total)

| Entity / Cycle | Edge store | FEC upstream | Drift | Severity |
|---|---:|---:|---:|---|
| WinSenate 2024 | $396M | $1,024M | **-61%** | error |
| SLF PAC 2020 | $279M | $199M | **+40%** | error |
| Fairshake 2024 | $529M | $455M | +16% | warn |
| DCCC 2024 | $169M | $201M | -16% | warn |
| NRCC 2024 | $153M | $178M | -14% | warn |
| DCCC 2022 | $153M | $177M | -14% | warn |
| MAGA Inc 2024 | $561M | $499M | +12% | warn |
| NRCC 2022 | $176M | $200M | -12% | warn |
| SLF PAC 2022 | $229M | $206M | +11% | warn |
| MAGA Inc 2026 | $366M | $330M | +11% | warn |

All 9 failing cycles from this morning's initial report are confirmed by
the framework. **Plus 2 new catches** (NRCC 2024, DCCC 2022) that didn't
appear in the top-30 sort but fail ±10% on this panel — proving the
framework finds issues the first pass missed.

### Success criteria — all met

- ✓ Framework catches the Leo quintillion bug (tier 1 `amount-sanity`)
- ✓ Framework catches the Leo empty-table bug (tier 1 `derived-totals`)
- ✓ Framework catches the self-loop bug class (tier 1 `edge-consistency`)
- ✓ Framework catches all 9 known FEC drifts (tier 2 `committee-receipts`)
- ✓ Framework finds *new* issues missed by first-pass (NRCC 2024, DCCC 2022)

---

## Vault-wide sample (tier 1, all entities)

Run scoped to no panel:

| Checker | Errors | Warns |
|---|---:|---:|
| amount-sanity | **168** | 0 |
| derived-totals | 0 | **168** |
| edge-consistency | 484 | 1 |
| entity-resolution | 0 | 3,045 |

**Headline numbers:**

- **168 amount-sanity errors** = 168 frontmatter fields with the
  $1 quintillion (or $51.9B) bug. Appears on Fanjul Family, CCPOA, CoreCivic,
  GEO Group, Securus, The 85 Fund, Leo, and many more. The USASpending-bulk
  ingest is broken for any profile it touched.
- **484 self-loop errors** in active edges — inflates leaderboards.
  Yesterday's session filtered 406 at query-time but didn't deprecate
  them in the store; today's count confirms the pattern is larger.
- **168 empty derived-table warns** = 168 profiles where a donor's
  "Top politicians funded" table lists names with no dollar amounts.
  Systemic: the data-panel builder does 1-hop queries but donors route
  money via controlled vehicles (multi-hop).
- **3,045 entity-resolution warns** — most are meta-pages (story
  analyses, index pages) being referenced as entities. Need to filter
  `type=meta` before this check becomes actionable. Mostly noise.

---

## Remediation backlog

Each of these is a structural fix. The pattern: *the checker catches the
bug class forever, the fix eliminates the instances.*

1. **Fix USASpending-bulk ingest** — add an amount sanity clamp (reject
   anything > $1e13). Null out the existing 168 corrupt frontmatter
   values. **Blocks:** launch-50 any time one of these orgs shows up.
2. **Mass-deprecate self-loop edges** — 484 active monetary edges where
   `from === to`. Status=deprecated preserves audit trail. Will remove
   roughly $250M of phantom leaderboard inflation.
3. **Deprecate `fec-individual-bulk`** where `fec-indiv-by-committee`
   covers the same committee — closes 3 of 5 OVER cases (SLF '20, SLF
   '22, MAGA '26 to within ±10%). From this morning's session.
4. **Fill missing FEC transfer-in src mappings** — WinSenate '24 is
   -61%, the 4 party-committee UNDER cases all share this pattern.
   Dump unmapped `src_cmte_id` set from `oth-transfers.jsonl`, add
   to `fec-committee-registry.json`.
5. **Teach build-profile-data-panels.cjs 2-hop aggregation** via
   controlled vehicles for dark-money donors (Leo → MFT → politicians).
   Eliminates the 168 empty-table cases vault-wide.
6. **Filter meta-type entities from entity-resolution checker** — noise
   reduction, not a data fix.

---

## Gate wiring (next session or tail end of this one)

Add to `.husky/pre-commit`:

```bash
node scripts/verify-all.cjs --tier 1 --strict || exit 1
```

Tier 1 runs in <2s — cheap enough to gate every commit. Would block any
commit that:
- Introduces a new absurd-value frontmatter field
- Introduces a self-loop edge
- Introduces a new overlapping-ingest pattern

**Tier 2 is too slow for pre-commit** (~30s reading FEC bulk). Options:
- Nightly GitHub Action → writes report to `content/Admin Notes/`
- Ops app `/validation` page that runs it on demand
- Pre-push hook (slower but less frequent than pre-commit)

Recommend the nightly Action — no developer friction, full signal, and
David can triage results from the Ops attention queue like everything else.

---

## Trust model, restated

Before today: we trusted our numbers because we wrote the scripts. That's
faith, not engineering.

After today: we have an automated check that our numbers still match
(a) themselves and (b) the raw source data. When drift appears, it's
visible in minutes, not discovered by accident weeks later when someone
catches a wrong-looking total.

**This is the infrastructure that makes the database trustworthy.** The
individual bugs above are now part of a bounded, enumerable backlog —
not a cloud of unknown unknowns.
