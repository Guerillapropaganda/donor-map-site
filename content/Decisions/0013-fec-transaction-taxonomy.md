---
title: "ADR-0013 — FEC Transaction Taxonomy + Anomaly Detection"
type: decision
decision-number: 0013
status: active
date: 2026-04-18
supersedes: null
superseded-by: null
---

# ADR-0013 — FEC Transaction Taxonomy + Anomaly Detection

## Context

The FEC bulk `pas2` dataset (contributions from committees to candidates + independent expenditures) mixes multiple fundamentally different money flows under one file. When the first extractor pass (2026-04-18) treated all pas2 rows as "donors," it produced three classes of error:

1. **Miscoded transactions surfaced as legitimate donors.** National Right to Life Committee (C70003298) appeared as Nancy Pelosi's #1 lifetime donor at $413K. Investigation: NRLC is a C7-prefix IE-only super-PAC; their 2010 disbursements to Pelosi were coded `24N` (party-committee in-kind) but NRLC is not a party committee. They were actually independent expenditures **opposing** Pelosi, miscoded at the FEC filing level. Pelosi is strongly pro-choice; NRLC actively opposes her.

2. **Conduits surfaced as mega-donors.** WinRed (C00694323) appeared as Trump's #3 "donor" at $42.7M. WinRed is the Republican small-dollar donation-processing platform (analog to ActBlue). That $42.7M represents millions of small-dollar individual donations passing through, not a single ideological actor's contribution.

3. **Super-PACs legally cannot give to candidates** (Citizens United / SpeechNow), yet C7-prefix committees appeared with `24K` direct-contribution codes. Any such occurrence is a filing error that must be flagged, not trusted.

The underlying problem: pas2 transaction types (`TRANSACTION_TP`) carry the legal category of the flow, and committee-ID prefix (`CMTE_ID[0:2]`) carries the committee class. Validating them against each other catches the full class of miscoded-filing anomalies.

## Decision

All FEC pas2 / indiv scripts route through a single shared classifier in `scripts/lib/fec-txn-types.cjs`. The classifier sorts transactions into editorial buckets rather than one flat "donors" list:

| Bucket | FEC txn types | Source committee | Editorial framing |
|---|---|---|---|
| `direct-donor` | `24K`, `24Z` | Non-super-PAC | "PAC donors" — the real mega-donor list |
| `party-support` | `24N`, `24C`, `24P` | Whitelisted party committees only | "Party committee support" (DCCC/NRCC/DNC/RNC/DSCC/NRSC) |
| `ie-support` | `24E` | Any | "Super-PAC IE support" — third-party spending FOR the candidate, not a donation |
| `ie-oppose` | `24A` | Any | "IE spent against" — third-party opposition, surfaced on target's profile |
| `conduit-aggregation` | `24K` | Committees on CONDUIT_IDS whitelist (WinRed, ActBlue) | "Small-dollar aggregated via [platform]" — millions of individuals |
| `comm-cost` | `24F` | Any | Low editorial priority |
| `electioneering` | `24R` | Any | Review ad content for attribution |
| `anomaly` | `24K`/`24N`/`24Z` from super-PAC (C7 prefix); `24N`/`24C`/`24P` from non-party | — | Write to `data/anomalies-to-review.jsonl`, block verified-tier publication until resolved |

The classifier lives in one file, imported by every script that touches FEC data. The Mega-Donors profile subsection (per ADR-0012) renders only the `direct-donor` + `conduit-aggregation` + `party-support` buckets. IE-support and IE-oppose render in separate subsections (or the Contradiction Card money trail).

Source of truth for conduit and party-committee whitelists lives in `scripts/lib/fec-txn-types.cjs`. Changes require a new ADR.

## Rationale

**Editorial correctness.** Calling NRLC a "donor" to Pelosi is wrong. Calling WinRed a "mega-donor" to Trump is misleading. The taxonomy fixes both by separating legal transaction type from editorial framing.

**Durability across sessions.** Hardcoding the taxonomy once in a shared library prevents future Claudes from re-implementing a flatter filter and reintroducing the same bugs. The ADR provides the reference any future session can cite.

**Anomaly exposure.** The miscoded-filing class of error is real and distributed across decades of FEC data. Detecting it systematically (via the classifier's `anomaly` bucket) surfaces ~dozens of fake-looking "donor" rows that would otherwise contaminate the Mega-Donors data in profiles.

**Compatible with existing structure.** ADR-0012 defines the 4-subsection Money format. This ADR only refines what rows qualify for the "Mega-Donors" subsection — doesn't change section structure.

## Consequences

**Code Claude's work:**
- `scripts/lib/fec-txn-types.cjs` is the single source of truth. All FEC scripts (`fec-politician-donor-totals.cjs`, `fec-anomaly-scanner.cjs`, future `fec-mega-donor-trace.cjs` and `ingest-fec-pas2-bulk.cjs`) import from it.
- `scripts/fec-anomaly-scanner.cjs` runs periodically and writes to `data/anomalies-to-review.jsonl`. Ops `/attention` queue surfaces flagged records.
- Pre-commit sentinel: if a profile at `content-readiness: verified` references a committee in its Mega-Donors section that is on the active anomaly list, commit blocks until the anomaly is resolved (fixed or dismissed).

**Research Claude's work:**
- Treat the classifier's buckets as the spec for what goes in each subsection.
- When writing profiles, never include an `anomaly`-bucketed committee in the Mega-Donors section without explicit David review.

**David's decisions:**
- Expand PARTY_COMMITTEE_IDS whitelist for state-level party committees as state-politician profiles are added.
- Review and resolve flagged anomalies — either by confirming the data is legitimate (add to allowlist) or confirming the miscoding (add to dismissed-anomaly list with explanation).

## Closes

- The Pelosi/NRLC $413K false-donor attribution
- The Trump/WinRed $42.7M mega-donor mislabeling
- The generic class of super-PAC-using-direct-contribution-codes filing errors
- Ambiguity about where IE-support and IE-oppose spending appears in profile structure

## Opens

- Build `scripts/fec-anomaly-scanner.cjs` as a full-pas2 scan producing the `data/anomalies-to-review.jsonl` review queue
- Wire the anomaly scanner into the pre-commit sentinel stack for verified-tier profiles
- Expand PARTY_COMMITTEE_IDS to cover state parties (needed for state-politician profile ingestion)
- Build `fec-mega-donor-trace.cjs` using the classifier to walk `indiv → pas2` chains (Adelson → Conservative Solutions PAC → Rubio)
