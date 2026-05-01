---
title: "Thesis Queries"
tags:
  - interactive
  - tool
content-readiness: data-complete
last-updated: 2026-05-01
---

Pre-computed analysis from the donor map's relationship graph. Each page below answers one specific question by walking the librarian — the canonical resolver of every entity, every edge, every classification.

## Available analyses

- **[Both-Sides Donors](both-sides.md)** — donors who funded politicians on opposite sides of an opposition pair. The same money picks both sides; the question is *whose interests* survive that hedge.

- **Influence Maps** — per-politician portrait of who funds them, what kind of capital it is, and (where data permits) how their voting record diverges from peers funded by the same donors.

  Examples:
  - [Alexandria Ocasio-Cortez](influence/aoc.md)
  - [Joe Manchin](influence/joe-manchin.md)
  - [Mitch McConnell](influence/mitch-mcconnell.md)
  - [Bernie Sanders](influence/bernie-sanders.md)
  - [Elizabeth Warren](influence/elizabeth-warren.md)
  - [Susan Collins](influence/susan-collins.md)
  - [Ted Cruz](influence/ted-cruz.md)
  - [Chuck Schumer](influence/chuck-schumer.md)

## How this is built

Numbers come from the unified librarian (ADR-0024). Sources include FEC bulk + API, FEC individual contributions, IRS 8872 dark-money filings, ICIJ offshore leaks, Cal-Access (California state-level), Voteview roll-call records, and govinfo.gov bill sponsorship + cosponsorship data.

Re-built mechanically by `scripts/build-thesis-pages.cjs`. Last refresh: 2026-05-01 00:05 UTC.
