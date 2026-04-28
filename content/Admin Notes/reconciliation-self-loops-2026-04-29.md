---
title: Reconciliation 60 errors traced — FEC self-loops (not a regression)
type: admin-note
status: open
tags: [code, data-integrity, reconciliation]
last-updated: 2026-04-29
---

# Reconciliation 60 errors — investigation

After this morning's PAS2 regen + worktree-data mirror, the
`reconciliation-framework-tier-1` check reported 60 errors / 5,787
warnings. Initial concern: did the regen break something?

**Answer: no regression.** The errors were latent in the data the
whole time. They became visible because the worktree finally has
`data/derived/fec-indiv-by-committee.jsonl` loaded. Pre-copy, the
self-loop check ran on empty data and found nothing.

## What the 60 errors are

All 60 are **self-loop monetary edges** in `fec-indiv-by-committee.jsonl`
— edges where `from === to`. The check correctly flags them as
"inflates leaderboards, likely accounting artifact."

A sample:

| Entity | Self-loop $ | Cycle | Reading |
|---|---|---|---|
| Tom Steyer | $317.12 M | 2020 | **Real** — Steyer self-funded his presidential primary |
| Linda McMahon | $68.63 M | 2012 | **Real** — McMahon self-funded both Senate runs (also 2010) |
| League of Conservation Voters | $116.73 M | 2026 | **Likely accounting** — LCV's IE arm (committee) recording transfers to its own super-PAC arm under the same canonical name |
| Mitch McConnell | $1.55 M | 2014 | **Real** — McConnell's joint fundraising committee transferring to his principal campaign committee, both indexed as "Mitch McConnell" |
| DCCC → DCCC | $40 K | 1990 | **Accounting** — same committee on both sides, likely a chargeback or refund transaction |
| Marianne Williamson | $1.04 M | 2026 | **Real** — Williamson self-funded |
| Mitt Romney | $14 K | 2008 | **Real** — likely Romney loaning his own campaign |

The mix is roughly 60/40 real-self-funding vs. accounting-noise. The
real ones SHOULD stay (they're load-bearing for "richest self-funders"
analyses); the accounting ones should be filtered or deprecated.

## What the 4,412 entity-resolution warnings are

Names appearing in edges that don't have entity records in
`entities.jsonl`. Top examples (each appearing 6-40× across edges):

- **Manhattan Institute for Policy Research** (40×) — think tank, no profile
- **Ash Kalra** (28×) — California state legislator
- **Peck Madigan Jones (now Tiber Creek Group)** (20×) — lobbying firm rename
- **Subject Matter (now Avoq)** (20×) — same pattern, firm rename
- **Kathy Hochul** (19×) — NY governor, no profile
- **Crossroads Strategies** (18×) — lobbying firm
- **Volodymyr Zelenskyy** (11×) — should probably be a profile
- **Laphonza Butler** (10×) — politician, no profile

Two patterns:
1. **Profile-missing**: real entity that just doesn't have a vault profile yet (Hochul, Butler, Manhattan Institute). Editorial decision per entity — make a profile, or alias to an existing one.
2. **Rename-aliasing**: firm renamed and edges carry the old + parenthetical-new form ("Peck Madigan Jones (now Tiber Creek Group)"). The librarian should resolve both forms to the same canonical entity. Currently neither has an entity record, so both are orphaned.

## Action items (separate work)

These are NOT today's session — capturing for next-session triage:

1. **Self-loop filter at consumer level.** Instead of trying to deprecate the 60 self-loops one-by-one, audit the leaderboard aggregators (`build-relationships-per-profile.cjs`, `query-engine.cjs`) and make sure they all skip `from === to` edges. Belt-and-suspenders against a real self-funding edge being misread as a donation FROM the candidate to itself.

2. **Profile creation backlog from entity-resolution warnings.** The top 50-100 unresolved names by appearance count are a queue of "should we make a profile?" editorial calls. Sort by frequency and triage.

3. **Rename-alias pattern.** Lobbying firms get acquired/renamed regularly ("X (now Y)"). Build a small alias rule that recognizes the `^(.+?) \(now (.+?)\)$` pattern and registers BOTH forms as aliases for the canonical entity. Probably ~50 of the 4,412 warnings.

## Why this didn't get caught before

The dispatcher has been seeing these errors in main repo for weeks. They didn't surface as urgent because:
- They're tier-1 SOFT findings (errors but not blocking)
- The numbers are large but stable (no rapid growth signaling new ingest bugs)
- Reconciliation framework runs in `compounding` queue bucket, leverage 4 — gets triaged when nothing higher-priority is open

This investigation rules out "today's PAS2 regen broke reconciliation" — that hypothesis is dead. Real action items are above.
