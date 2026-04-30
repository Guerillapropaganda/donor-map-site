---
title: "Thesis Internal Consistency Audit"
date: 2026-04-30
lane: code
status: open
---

# Thesis Internal Consistency Audit

**Generated:** 2026-04-30T21:02:12.989Z
**Script:** `scripts/audit-thesis-internal-consistency.cjs`

## Audit 1 — Sponsorship-edge target bill integrity

- Sponsorship edges scanned: **73,791**
- Dangling edges (target bill missing from bills.jsonl): **0 (0.00%)**

## Audit 2 — Position → vote integrity

- Position records scanned: **4,788,950**
- Orphan positions (vote_id missing from votes.jsonl): **0 (0.00%)**
- Distinct orphan vote_ids: **0**

**Why this matters:** votingDivergence joins position records to vote outcomes via `vote_id`. Orphan positions are silently invisible — the legislator voted, but the query can't see it.

## Audit 3 — Missing bioguide triage

- Unique sponsor bioguides not in entities.jsonl: **0**
- Bills sponsored by missing bioguides: **0 (0.0% of sponsored bills)**

**Top 30 missing bioguides** (David's lane — Tier 3 editorial: each is a real legislator we need an entity record for so their sponsorships surface in thesis queries):

| Bioguide | Bills sponsored |
|---|---|

Resolution path: David creates Politician profiles for any of these missing legislators that are still active or historically relevant. Once a profile lands with `signals.bioguide_id` set, the librarian auto-picks up their sponsorships on next graph reload.
