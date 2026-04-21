---
title: Orphan Entities Queue
type: admin-note
note-type: data
status: open
priority: normal
last-updated: '2026-04-21'
---

# Orphan Entities Queue

Names that appear as edge from/to in our ingested data but have no entity record in `data/entities.jsonl`. Classified by heuristic. Review the **Promote candidates** table and promote editorially-interesting orgs to real profiles — that closes money-trail dead-ends.

_Regenerate: `node scripts/audit-orphan-entities.cjs` — last run 2026-04-21._

## Summary

| Bucket | Count | Meaning |
|---|---:|---|
| **promote** | 25218 | Editorially-interesting orgs (≥$1M flow or ≥5 edges). **These are the ones to review.** |
| federal | 295 | Federal agencies as USAspending contract counterparties. Contextual, not editorial subjects. |
| committee | 2450 | FEC committee names already tied to their politician (e.g. "X FOR CONGRESS"). Already covered via politician profile. |
| person | 904750 | Individual donor names from FEC itemization. Not profile-worthy unless they're significant. |
| narrative | 271 | Vault story-page wikilinks that leaked into the graph as edge targets. Fix at ingest; don't promote. |
| lowflow | 979930 | Orgs with <$1M and <5 edges — below the editorial threshold. |

**Total orphan names**: 1,912,914

---

## Promote candidates (top 100 by flow)

| Name | Edges | Total flow | Out / In | Sources |
|---|---:|---:|---:|---|
| GMMB INC. | 7 | $703.4M | — / $703.4M | fec-oppexp |
| GMMB | 29 | $454.6M | $20K / $454.6M | fec-indiv-by-committee, fec-oppexp |
| FUTURE FORWARD USA ACTION | 2 | $344.6M | $344.6M / — | fec-indiv-by-committee |
| AFSCME International | 2 | $287.7M | $283.2M / $4.4M | irs-pofd-8872 |
| STRATEGIC MEDIA SERVICES, INC. | 15 | $284.0M | — / $284.0M | fec-oppexp |
| Michael R. Bloomberg | 20 | $267.4M | $267.4M / — | fec-indiv-by-committee |
| BULLY PULPIT INTERACTIVE LLC | 8 | $262.0M | $58K / $262.0M | fec-indiv-by-committee, fec-oppexp |
| BUYING TIME LLC | 10 | $254.5M | — / $254.5M | fec-oppexp |
| GMMB INC | 4 | $242.1M | — / $242.1M | fec-oppexp |
| SCREEN STRATEGIES MEDIA | 40 | $234.7M | — / $234.7M | fec-oppexp |
| MAJORITY FORWARD | 6 | $221.0M | $221.0M / — | discovery-scanner, fec-indiv-by-committee |
| ONE NATION | 1 | $190.0M | $190.0M / — | fec-indiv-by-committee |
| Richard E. Uihlein | 26 | $179.8M | $179.8M / — | fec-indiv-by-committee |
| GRASSROOTS MEDIA | 10 | $178.0M | — / $178.0M | fec-oppexp |
| Miriam Dr. Adelson | 56 | $175.3M | $175.3M / — | fec-indiv-by-committee |
| AMERICAN ACTION NETWORK | 3 | $171.9M | $171.9M / — | fec-indiv-by-committee |
| TARGETED VICTORY | 90 | $169.0M | $2.0M / $167.0M | fec-indiv-by-committee, fec-oppexp |
| EMPOWER PARENTS PAC | 3 | $165.2M | $165.0M / $204K | fec-indiv-by-committee, fec-oppexp |
| Association Nea Advocacy Fund | 2 | $160.1M | $160.1M / — | fec-indiv-by-committee |
| GRASSROOTS MEDIA, LLC | 2 | $153.2M | — / $153.2M | fec-oppexp |
| Kenneth C. Griffin | 33 | $146.6M | $146.6M / — | fec-indiv-by-committee |
| Kenneth C. Mr. Griffin | 24 | $145.0M | $145.0M / — | fec-indiv-by-committee |
| GAMBIT STRATEGIES LLC | 6 | $140.7M | $35K / $140.7M | fec-indiv-by-committee, fec-oppexp |
| . National Association Of Realto | 2 | $136.7M | $136.7M / — | fec-indiv-by-committee |
| BUYING TIME, LLC | 15 | $132.8M | — / $132.8M | fec-oppexp |
| SKDKNICKERBOCKER LLC | 20 | $126.8M | $25K / $126.8M | fec-indiv-by-committee, fec-oppexp |
| DUPONT CIRCLE STRATEGIES LLC | 1 | $122.0M | — / $122.0M | fec-oppexp |
| MH MEDIA LLC | 2 | $121.1M | — / $121.1M | fec-oppexp |
| Inc. League Of Conservation Voters | 3 | $118.4M | $118.4M / — | fec-indiv-by-committee |
| ONMESSAGE INC. | 33 | $117.3M | — / $117.3M | fec-oppexp |
| NEXUS DIRECT | 10 | $114.5M | $10K / $114.5M | fec-indiv-by-committee, fec-oppexp |
| ONMESSAGE INC | 10 | $112.8M | — / $112.8M | fec-oppexp |
| WINRED | 59 | $109.8M | $109.8M / — | fec-indiv-by-committee |
| Stephen A. Schwarzman | 29 | $109.4M | $109.4M / — | fec-indiv-by-committee |
| RISING TIDE INTERACTIVE | 11 | $106.4M | $99K / $106.3M | fec-indiv-by-committee, fec-oppexp |
| Dustin A Moskovitz | 1 | $100.2M | $100.2M / — | fec-indiv-by-committee |
| LEFT HOOK | 16 | $98.4M | — / $98.4M | fec-oppexp |
| PAYCHEX | 104 | $97.6M | — / $97.6M | fec-oppexp |
| GUSTO | 99 | $95.1M | — / $95.1M | fec-oppexp |
| GILES-PARSCALE | 2 | $91.9M | — / $91.9M | fec-oppexp |
| TARGETED VICTORY LLC | 43 | $90.4M | $355K / $90.1M | fec-indiv-by-committee, fec-oppexp |
| Sheldon G. Mr. Adelson | 22 | $88.8M | $88.8M / — | fec-indiv-by-committee |
| CANAL PARTNERS MEDIA | 24 | $86.7M | $14K / $86.7M | fec-indiv-by-committee, fec-oppexp |
| Stephen A. Mr. Schwarzman | 24 | $84.7M | $84.7M / — | fec-indiv-by-committee |
| OLD TOWNE MEDIA INC | 1 | $83.0M | — / $83.0M | fec-oppexp |
| Empower Parents PAC | 1 | $82.5M | $82.5M / — | irs-pofd-8872 |
| ADP | 69 | $82.5M | $1K / $82.5M | fec-indiv-by-committee, fec-oppexp, irs-pofd-8872 |
| Sheldon G. Adelson | 30 | $81.6M | $81.6M / — | fec-indiv-by-committee |
| SMART MEDIA GROUP LLC | 19 | $81.6M | — / $81.6M | fec-oppexp |
| SHORR JOHNSON MAGNUS | 15 | $78.1M | $33K / $78.1M | fec-indiv-by-committee, fec-oppexp |
| SAVE AMERICA | 3 | $77.3M | $77.3M / $23K | fec-indiv-by-committee, fec-oppexp |
| HOUSE MAJORITY FORWARD | 1 | $76.5M | $76.5M / — | fec-indiv-by-committee |
| AISLE 518 STRATEGIES, LLC | 12 | $68.0M | — / $68.0M | fec-oppexp |
| Republican Governors Association | 38 | $67.8M | $67.7M / $105K | irs-pofd-8872 |
| AFT SOLIDARITY 527 | 24 | $64.2M | $64.2M / — | fec-indiv-by-committee, irs-pofd-8872 |
| SMP | 8 | $63.0M | $63.0M / — | discovery-scanner, fec-indiv-by-committee |
| INSPERITY | 23 | $61.9M | — / $61.9M | fec-oppexp |
| AL MEDIA, LLC | 2 | $61.5M | — / $61.5M | fec-oppexp |
| AB DATA | 9 | $61.0M | $10K / $61.0M | fec-indiv-by-committee, fec-oppexp |
| ANNE LEWIS STRATEGIES, LLC | 21 | $60.0M | — / $60.0M | fec-oppexp |
| AMALGAMATED BANK | 21 | $58.9M | $54.7M / $4.2M | fec-indiv-by-committee, fec-oppexp |
| James H. Simons | 14 | $58.5M | $58.5M / — | fec-indiv-by-committee |
| KOCH INDUSTRIES INC. | 2 | $58.3M | $58.3M / — | fec-indiv-by-committee |
| Jeff Mr. Yass | 9 | $55.9M | $55.9M / — | fec-indiv-by-committee |
| RWT PRODUCTION LLC | 11 | $55.6M | — / $55.6M | fec-oppexp |
| MENTZER MEDIA SERVICES, INC. | 7 | $55.5M | — / $55.5M | fec-oppexp |
| DEMOCRACY PAC | 15 | $55.5M | $55.5M / — | fec-indiv-by-committee |
| ZENEFITS | 2 | $54.7M | — / $54.7M | fec-oppexp |
| FP1 STRATEGIES | 19 | $53.9M | — / $53.9M | fec-oppexp |
| SECURING AMERICAN GREATNESS | 1 | $52.6M | $52.6M / — | fec-indiv-by-committee |
| MAVERICK MEDIA, INC. | 1 | $51.9M | — / $51.9M | fec-oppexp |
| AMERICAN ISRAEL PUBLIC AFFAIRS COMMITTEE | 1 | $51.5M | $51.5M / — | fec-indiv-by-committee |
| Paul Elliott Singer | 6 | $50.2M | $50.2M / — | fec-indiv-by-committee |
| PAYROLL DATA PROCESSING | 38 | $49.9M | $44K / $49.9M | fec-indiv-by-committee, fec-oppexp |
| RESTORATION PAC | 4 | $49.9M | $49.9M / — | fec-indiv-by-committee |
| GPS IMPACT | 30 | $48.7M | $64K / $48.6M | fec-indiv-by-committee, fec-oppexp |
| SOUTHWEST PUBLISHING | 30 | $48.0M | — / $48.0M | fec-oppexp |
| PRIORITIES USA | 3 | $46.9M | $46.9M / — | fec-indiv-by-committee |
| TAG LLC | 40 | $46.0M | — / $46.0M | fec-oppexp |
| RIVERFRONT MEDIA, LLC | 1 | $45.9M | — / $45.9M | fec-oppexp |
| CONVERGING MEDIA INC | 1 | $45.2M | — / $45.2M | fec-oppexp |
| STAND TOGETHER CHAMBER OF COMMERCE | 1 | $44.8M | $44.8M / — | fec-indiv-by-committee |
| Joint Victory Campaign 2004 | 2 | $44.5M | $44.5M / — | irs-pofd-8872 |
| SIXTEEN THIRTY FUND | 17 | $43.5M | $43.5M / — | fec-indiv-by-committee |
| Rick Gov. Scott | 1 | $42.9M | $42.9M / — | fec-indiv-by-committee |
| Robert T. Bigelow | 4 | $42.0M | $42.0M / — | fec-indiv-by-committee |
| WORKING FOR WORKING AMERICANS - FEDERAL | 1 | $41.5M | $41.5M / — | fec-indiv-by-committee |
| MAVERICK MEDIA INC | 1 | $41.4M | — / $41.4M | fec-oppexp |
| S. Donald Sussman | 136 | $41.2M | $41.2M / — | fec-indiv-by-committee |
| PDR RESOURCES, INC. | 8 | $41.1M | — / $41.1M | fec-oppexp |
| ELON MUSK REVOCABLE TRUST | 2 | $41.0M | $41.0M / — | fec-indiv-by-committee |
| AB FOUNDATION | 2 | $40.9M | $40.9M / — | fec-indiv-by-committee |
| Agency for International Development | 10 | $40.5M | $40.5M / — | usaspending-bulk |
| George M. Marcus | 24 | $40.3M | $40.3M / — | fec-indiv-by-committee |
| Samuel Bankman-fried | 57 | $40.0M | $40.0M / — | fec-indiv-by-committee |
| STRATEGIC MEDIA PLACEMENT | 22 | $39.6M | — / $39.6M | fec-oppexp |
| THE LUKENS COMPANY | 58 | $38.8M | — / $38.8M | fec-oppexp |
| Charles R. Schwab | 27 | $38.7M | $38.7M / — | fec-indiv-by-committee |
| SMART MEDIA GROUP, LLC | 15 | $38.7M | — / $38.7M | fec-oppexp |
| AUTHENTIC CAMPAIGNS | 22 | $38.1M | — / $38.1M | fec-oppexp |

_(25118 more below threshold; re-run with a cutoff to see more)_

---

## Federal agencies (contextual — do not promote)

| Name | Edges | Total flow |
|---|---:|---:|
| Department of Defense | 115 | $286.10B |
| General Services Administration | 55 | $12.32B |
| Department of Veterans Affairs | 55 | $11.30B |
| National Aeronautics and Space Administration | 45 | $9.32B |
| Department of Health and Human Services | 60 | $8.09B |
| Department of Energy | 37 | $6.36B |
| Department of Transportation | 45 | $5.97B |
| Department of Homeland Security | 63 | $4.03B |
| Department of Justice | 75 | $1.98B |
| Department of Commerce | 40 | $1.15B |
| Department of Agriculture | 35 | $799.7M |
| National Science Foundation | 10 | $796.7M |
| Department of the Treasury | 34 | $737.4M |
| Social Security Administration | 13 | $622.0M |
| Department of State | 39 | $558.1M |
| Department of the Interior | 50 | $510.6M |
| Environmental Protection Agency | 23 | $159.3M |
| Department of Education | 12 | $138.5M |
| Department of Labor | 10 | $125.8M |
| Securities and Exchange Commission | 9 | $123.8M |
| Department of Housing and Urban Development | 14 | $119.1M |
| Federal Communications Commission | 18 | $113.3M |
| Federal Trade Commission | 3 | $71.1M |
| NATIONAL EDUCATION ASSOCIATION | 6 | $49.8M |
| Nuclear Regulatory Commission | 9 | $39.1M |
| National Association Of Realtors | 1 | $24.6M |
| NATIONAL ASSOCIATION OF REALTORS | 3 | $19.2M |
| NATIONAL NURSES UNITED | 6 | $17.3M |
| Small Business Administration | 3 | $15.6M |
| NATIONAL RIGHT TO LIFE COMMITTEE | 5 | $10.1M |

---

## Narrative-page leaks (fix at ingest)

These are vault story-page titles that ended up as edge from/to values. Likely a bulk-ingest script is mis-parsing a wikilink target. Top 20 by edges:

| Name | Edges | Sources |
|---|---:|---|
| Session History Archive | 683 | discovery-scanner, bidirectional-normalizer |
| Donors & Power Networks Index | 291 | discovery-scanner, bidirectional-normalizer, frontmatter-migration |
| Media Pipeline Index | 145 | bidirectional-normalizer, discovery-scanner, frontmatter-migration |
| Donor Registry - Master Index | 142 | bidirectional-normalizer, discovery-scanner, frontmatter-migration |
| Pro-Israel Donor Network Deep Dive | 115 | discovery-scanner, frontmatter-migration, bidirectional-normalizer |
| How Money Captures Media , The Donor Map Media Pipeline | 101 | frontmatter-migration, discovery-scanner |
| 2026-03-22 News Scan | 96 | discovery-scanner, bidirectional-normalizer |
| 2026-03-23 News Scan | 90 | discovery-scanner, bidirectional-normalizer |
| The Iran War - Defense Donors and the DOGE Readiness Gap | 86 | discovery-scanner, frontmatter-migration, bidirectional-normalizer |
| School Choice and the Catholic Church Prosecution as Brand Architecture | 84 | frontmatter-migration, bidirectional-normalizer, discovery-scanner |
| Post-October 7 Positions and Flip History | 80 | frontmatter-migration, bidirectional-normalizer, discovery-scanner |
| FAST Act and the AB 1228 Deal | 78 | frontmatter-migration, bidirectional-normalizer, discovery-scanner |
| Intra-Republican Contradiction Map | 77 | frontmatter-migration, discovery-scanner, bidirectional-normalizer |
| 2026-03-24 Policy Research | 72 | bidirectional-normalizer, discovery-scanner |
| 2026-03-21 Finance Research | 69 | discovery-scanner, bidirectional-normalizer |
| 2026-03-24 News Scan | 67 | discovery-scanner, bidirectional-normalizer |
| 2026-03-25 Story Discovery Run 2 | 63 | discovery-scanner, bidirectional-normalizer |
| 2026-03-23 Policy Research | 60 | discovery-scanner, bidirectional-normalizer |
| 2026-03-22 Policy Research | 60 | discovery-scanner, bidirectional-normalizer |
| Trump Resistance and the 2028 Play | 60 | frontmatter-migration, bidirectional-normalizer, discovery-scanner |

