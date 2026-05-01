---
title: "Influence Map: Bernie Sanders"
tags:
  - thesis
  - influence-map
content-readiness: data-complete
last-updated: 2026-05-01
last-enriched: "2026-05-01"
---

Total incoming: **$10.93M** across **206** donor edges in the librarian.

**Dominant capital cluster:** dark-money-vehicle — $8.01M from 28 donor(s)

## Capital clusters

Donors grouped by what KIND of capital they represent (fossil-capital, finance-capital, military-industrial, etc. — the [class-tag vocabulary](../../Decisions/0001-class-tag-vocabulary.md) per ADR-0001).

| Cluster | Total | Donors | Top 5 |
|---|---:|---:|---|
| dark-money-vehicle | $8.01M | 28 | National Nurses United for Patient Protection ($4.71M), Future45 ($1.70M), ESAFUND ($803.4K), Friends of the Earth (action) INC ($122.1K), Democratic Senatorial Campaign Committee ($97.3K) |
| labor-aligned | $997.4K | 6 | California Nurses Association ($748.9K), Teamsters - International Brotherhood of Teamsters ($88.9K), IBEW - International Brotherhood of Electrical Workers ($58.5K), AFL-CIO ($43.6K), UA Political Action Committee ($35.0K) |
| rentier-capital | $36.0K | 1 | National Association of Realtors ($36.0K) |
| mixed | $22.8K | 1 | National Rifle Association ($22.8K) |

## Ideological clusters

Donors grouped by ideological function (Republican-establishment, MAGA-coalition, progressive-coalition, corporate-Democrat, etc.).

*(no donors with ideological tags at current threshold)*

## Unclassified

**26** donors representing **$1.86M** of total — class tags pending.

## Policy alignment

**Policy alignment data:** unavailable. Honest data-gap report:

- No vote-on-policy edges — votes.jsonl carries roll-call summaries, not per-legislator yea/nay positions. Per-legislator votes are a separate ingest target.
- Only 5 policy node(s) in librarian — alignment scoring requires a meaningful policy corpus (recommend ≥50). data/policies.jsonl currently has 5 entries.

## How to read this

The map answers: "what KIND of money is buying influence here?" Not which individual donors — that's a different list. Class clusters are about *interest groups* — when fossil-capital is a politician's #1 cluster, that's a structural fact about their political base regardless of which specific PAC wrote which check.

## Sources

Aggregated from FEC bulk + FEC individual contributions + Cal-Access state filings + IRS 8872 dark-money + ICIJ offshore leaks. Class tags applied per [ADR-0001](../../Decisions/0001-class-tag-vocabulary.md) (5-dimension schema).

---

*Auto-generated. Edits to this file will be overwritten on next `scripts/build-thesis-pages.cjs` run.*
