---
title: Resnick May 5, 2026 filings (IDs 3149725 + 3149729) — Gemini Deep Research results
type: research
date: 2026-05-10
session: cc_vibrant-williams-5b0381
status: open
verified: pending URL-pass (Rule 13 — David)
---

## Source

Gemini Deep Research, 2026-05-10. David-initiated query on two specific Cal-Access filing IDs.

## TL;DR

- Stewart A. Resnick + Lynda Rae Resnick filed **TWO Form 497 24-hour late-contribution reports on May 5, 2026** (day of the CNN gubernatorial debate)
- Filing IDs: **3149725 (Stewart, committee #499047)** and **3149729 (Lynda, committee #1252697)**
- **The actual recipients of the May 5 contributions are STILL UNKNOWN** — Cal-Access PDF retrieval failed during the verification window. Gemini could not open the line-item disbursement details.
- **Negative inference:** Resnicks are NOT in Becerra for Governor's top-donor list as of May 5, meaning the contributions did NOT go to Becerra at a high-tier level (anything ≥ $115,200 would have displaced his current #2 donor)

## Load-bearing new facts

### Becerra for Governor 2026 (FPPC #1480025) — current top donors

| Rank | Donor | Amount |
|---|---|---|
| 1 | **Laborers Pacific Southwest Regional Organizing Coalition PAC** | **$2,000,000** |
| 2 | California Primary Care Association Advocates Supporting Becerra | $115,200 |

**Implication for `/cop-coddler`:** Becerra's #1 backer is a **construction trades union** ($2M from Laborers PSW). The earlier session's framing was that Becerra had $0 from police unions and pivoted on the Cop-Coddler beat. The $2M from Laborers PSW is a different category — construction labor — and dominates his money. Worth a card update.

### Becerra IE committee

**FPPC #1490885 — "Working Families for Healthy Communities supporting Becerra for Governor 2026 sponsored by labor and community health organizations"**

This is a separate independent expenditure committee, NOT the candidate-controlled committee. Same labor-health coalition pattern. Implication: Becerra has both a $2M direct-PAC backbone AND a separate IE infrastructure.

### Resnick committee structures (confirmed)

| Person | Committee ID | Filer name | Address |
|---|---|---|---|
| Stewart A. Resnick | **#499047** | "Stewart A. Resnick And Affiliated Entities" | 11444 West Olympic Blvd, Los Angeles, CA 90064 (Wonderful Company HQ) |
| Lynda Rae Resnick | **#1252697** | "Lynda Rae Resnick" | Same address |

The Wonderful Company is controlled by the Stewart and Lynda Resnick Revocable Trust (51%) and Wonderful Legacy Inc. (49%). "Affiliated Entities" umbrella covers Wonderful Halos, POM Wonderful, FIJI Water, etc.

## Critical remaining gap

**Where did the May 5 money actually go?** The PDF itemizations were not retrievable. Possible recipients per Gemini's speculation:

- **Matt Mahan** (Becerra rival, more business-friendly)
- **Antonio Villaraigosa** (already in your `/villaraigosa-pledge` beat)
- **2026 CEQA ballot measure** (industrial/agricultural deregulation — would fit Wonderful Company interests)
- Other state-level ballot measure committees

This is the kind of gap that requires David's direct Cal-Access portal pull when the system is responsive, OR a follow-up Gemini run on a different day when Cal-Access PDFs are reachable.

## Filler / not load-bearing

Gemini's report includes a probabilistic-modeling section and "transparency gap" commentary that doesn't surface new findings. Those sections are page-padding, not investigative output. Skip them when building beats.

## Direct retrieval URLs (for David's URL-pass)

```
https://cal-access.sos.ca.gov/PDFGen/pdfgen.prg?filingid=3149725
```

```
https://cal-access.sos.ca.gov/PDFGen/pdfgen.prg?filingid=3149729
```

```
https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=499047
```

```
https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1252697
```

```
https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1480025
```

```
https://cal-access.sos.ca.gov/Campaign/Committees/Detail.aspx?id=1490885
```

## Beat impact summary

| Beat | Impact |
|---|---|
| `/cop-coddler` (Becerra) | UPDATE — add Laborers PSW $2M top donor card + IE committee #1490885 |
| `/the-hedge` (Resnicks anti-wealth-tax) | UPDATE — confirms Resnicks active May 5 with paired filings on debate day; recipient unknown |
| Riverside megabeat (Stronghold / Pacheco / Bianco / IEHP) | No direct hit. Different money network. |

## Why Gemini's Cal-Access failure matters

This is the second time in two days a primary-source pull (Power Search, then PDF retrieval) has been blocked. Cal-Access's Imperva/Distil protection + JS-rendered Power Search create a structural barrier to programmatic access for both Claude AND Gemini. The systemic implication: **research that depends on Cal-Access PDFs needs to be done from a live browser session, not via an AI assistant of either kind.** Worth flagging as a MEMORY-rule candidate for future sessions.
