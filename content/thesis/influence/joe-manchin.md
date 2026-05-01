---
title: "Influence Map: Joe Manchin"
tags:
  - thesis
  - influence-map
content-readiness: data-complete
last-updated: 2026-05-01
last-enriched: "2026-05-01"
---

Total incoming: **$63.44M** across **286** donor edges in the librarian.

**Dominant capital cluster:** dark-money-vehicle — $61.66M from 32 donor(s)

## Capital clusters

Donors grouped by what KIND of capital they represent (fossil-capital, finance-capital, military-industrial, etc. — the [class-tag vocabulary](../../Decisions/0001-class-tag-vocabulary.md) per ADR-0001).

| Cluster | Total | Donors | Top 5 |
|---|---:|---:|---|
| dark-money-vehicle | $61.66M | 32 | National Republican Senatorial Committee ($25.75M), Senate Leadership Fund ($11.68M), SLF PAC ($7.47M), Senate Majority PAC ($6.95M), WinSenate ($4.13M) |
| labor-aligned | $488.6K | 4 | UA Political Action Committee ($378.1K), AFL-CIO ($47.3K), Teamsters - International Brotherhood of Teamsters ($33.1K), IBEW - International Brotherhood of Electrical Workers ($30.0K) |
| fossil-capital | $165.0K | 14 | Southern Company ($28.0K), Duke Energy ($26.5K), Halliburton ($16.0K), Drummond Co. ($16.0K), Williams Companies ($15.5K) |
| military-industrial | $159.5K | 11 | Honeywell International ($30.0K), Northrop Grumman ($29.5K), Lockheed Martin ($29.5K), Bechtel Corporation ($19.0K), Raytheon (RTX Corporation) ($13.0K) |
| media-capital | $97.5K | 4 | Comcast - NBCUniversal ($34.5K), AT&T ($34.0K), iHeartMedia ($26.5K), Sinclair Broadcast Group ($2.5K) |
| tech-monopoly | $71.0K | 5 | Ford Motor Company ($18.0K), Microsoft ($15.0K), Google - Alphabet ($14.0K), General Motors ($14.0K), Meta - Facebook ($10.0K) |
| pharma-capital | $69.0K | 10 | Pfizer Inc. ($19.0K), Anthem - Elevance Health ($15.0K), CVS Health - Aetna ($13.0K), Tenet Healthcare ($5.0K), Johnson & Johnson ($5.0K) |
| rentier-capital | $52.9K | 2 | National Association of Realtors ($37.9K), National Multifamily Housing Council ($15.0K) |
| finance-capital | $29.5K | 3 | Morgan Stanley ($11.5K), Charles Schwab ($10.0K), Citigroup ($8.0K) |
| retail-monopoly | $25.0K | 1 | Walmart - Walton Family ($25.0K) |

## Ideological clusters

Donors grouped by ideological function (Republican-establishment, MAGA-coalition, progressive-coalition, corporate-Democrat, etc.).

*(no donors with ideological tags at current threshold)*

## Unclassified

**30** donors representing **$616.4K** of total — class tags pending.

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
