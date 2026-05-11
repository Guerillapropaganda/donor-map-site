---
title: Riverside County Supervisors county-level donors — Gemini Deep Research results
type: research
date: 2026-05-10
session: cc_vibrant-williams-5b0381
status: open
verified: pending URL-pass (Rule 13 — David)
parent: riverside-tusa-pull-2026-05-09.md
---

## Source

Gemini Deep Research run by David, 2026-05-10. Response to PROMPT 2 (Riverside Supervisor county-level donors). Cal-Access + NetFile both partially blocked.

## 🚨 HEADLINE FINDING

**V. Manuel Perez for Supervisor 2026 (FPPC #1396909) is headquartered at 3649 Mission Inn Ave, 2nd Floor — the SAME address as Moving California Forward (#1455936) and Pacheco Moving California Forward (#1461025).**

Implication: Theodore Pacheco's Riverside political-services suite directly houses (or shares administrative infrastructure with) the Riverside County Supervisor District 4 campaign committee. The integration between the IE developer slush PAC and a sitting Riverside supervisor's campaign is now structurally documented at the address-of-record level.

This converts the megabeat from "MCF funds Perez's colleague Gutierrez" to "MCF and Perez's campaign operate from the same building."

## Other load-bearing new facts

1. **Yxstian Gutierrez for Supervisor 2026 = FPPC #1439760**

2. **Gutierrez seed transfer:** $77,100 moved on Dec 27, 2021 from "Dr. Gutierrez for Mayor 2020" → "Gutierrez for Supervisor" launching his 2022 run. Documented committee-laundering technique (money raised for Moreno Valley mayor's race repurposed for county supervisor's race).

3. **Edison International → Gutierrez Mayor 2020.** Utility company with regulatory exposure to LAFCO + Riverside County. Date: Aug 27, 2021.

4. **Bail Hotline Bail Bonds → Gutierrez Mayor 2017: $1,500** on Sept 29, 2017. Bail bonds industry political donation, common pattern for criminal justice / sheriff-adjacent candidates.

5. **Iddo Benzeevi's policy spine = the World Logistics Center.** Major Moreno Valley industrial development project — that's the *underlying interest* driving Highland Fairview's political spending. Worth research for the megabeat — is there a parallel to the Coachella data center pattern?

6. **Stronghold "selected for a major public-private partnership agreement on May 7, 2025"** per Gemini. This is *one year before* the Feb 11, 2026 Coachella Municipal Utility Development agreement we documented. Open question: was May 7, 2025 the original deal-in-principle that the Feb 11, 2026 vote formalized? OR a separate Stronghold project? David verification needed against Coachella council file history.

## ⚠️ Conflicting numbers — Gemini vs. my direct TUSA pull (2026-05-09)

| Donor → Moving California Forward | TUSA direct pull (verified) | Gemini's claim | Status |
|---|---|---|---|
| Stronghold Power Systems Inc | $25,000 | $25,000 | ✅ match |
| Highland Fairview Operating Co | $20,000 | $20,000 | ✅ match |
| Jeffrey Burum and Affiliated Entities | $5,000 | $5,000 | ✅ match |
| Palm Communities | **$19,500** | $10,000 | ❌ Gemini under-reports |
| Lewis Management Corporation | **$22,500** | $7,500 | ❌ Gemini under-reports |

**Trust the TUSA pull on Palm + Lewis.** Direct from TransparencyUSA's server-rendered NUXT state with named line items. Gemini is summarizing partial/older data on these two and missed amounts.

## What's still gapped after this Gemini run

| Question | Gemini's answer |
|---|---|
| V. Manuel Perez 2026 Schedule A donor list | "Data Pending" |
| Yxstian Gutierrez 2026 Schedule A donor list | "Data Pending" |
| Karen Spiegel 2022-2026 donors | "None Found in Primary Snippets" |
| Total raised/spent for any of the three | "Data Pending" |
| Direct Stronghold/Bailey/Burum/Pechanga $$ to supervisors at county level | not surfaced |

**The county-level NetFile system was just as blocked from Gemini as Cal-Access was.** This is the second prompt in a row where the supervisors' actual itemized donor lists came back blank. NetFile (`netfile.com/public/CTRIV/campaign`) needs live-browser access.

## Direct retrieval URLs (for David's manual pull when convenient)

```
https://netfile.com/public/CTRIV/campaign
```

```
https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1396909
```

```
https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1439760
```

## Pattern observation — Gemini's strengths and weaknesses on this beat

Two Gemini prompts in:

- ✅ **Wins on structural facts** — names, addresses, committee IDs, relationships. (Pacheco, the Mission Inn address, Perez's committee at the same address, Gutierrez's $77K transfer, Edison Intl-to-Gutierrez.)
- ❌ **Loses on itemized dollar amounts** — Cal-Access Imperva and NetFile both blocked it. Donor lists come back "Data Pending" or with under-reported amounts.
- ⚠️ **Has internal variance** — Palm + Lewis numbers diverge from TUSA's direct extraction.

**Going-forward rule:** trust Gemini on structural facts (who/what/where/relationships); verify dollar amounts against TUSA or live-browser NetFile/Cal-Access pulls.

## Beat impact

| Beat | Impact |
|---|---|
| Riverside megabeat | UPGRADED — Perez's campaign address = Pacheco's PAC address. Structural integration documented. |
| `/coachella-data-center` | UPDATE — confirm May 7, 2025 vs. Feb 11, 2026 timeline for Stronghold-Coachella deal |
| Moreno Valley sub-card | NEW LEAD — Benzeevi's World Logistics Center is the underlying interest behind HF's political $$ |
| IEHP $320M beat | UNCHANGED — Spiegel still gapped on direct donors |

## Next-priority Gemini prompts

Given the Cal-Access + NetFile primary-source block pattern, the highest-leverage remaining Gemini runs are the ones that DON'T depend on those systems:

1. **The Stronghold May 7, 2025 deal** — what was selected, by whom, was there a council vote, what's the relationship to the Feb 11, 2026 Coachella vote
2. **Benzeevi / World Logistics Center political history** — Moreno Valley council votes, FPPC complaints, lawsuits
3. **California Back to Basics #1487425** (named in the previous Gemini run as a parallel 2026 gubernatorial PAC)
4. **All committees at 3649 Mission Inn Ave Fl 2 Riverside** — to map the full Pacheco operation
