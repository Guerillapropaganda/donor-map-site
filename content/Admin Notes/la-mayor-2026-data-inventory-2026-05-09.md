---
title: LA Mayor 2026 — Local Data Inventory (Bass + Pratt)
type: admin-note
note-type: data
status: open
last-updated: '2026-05-09'
race: la-mayor-2026
---

# LA Mayor 2026 — Local Data Inventory

Honest snapshot of what local data we have on Karen Bass and Spencer Pratt as of 2026-05-09. Bottom line: **almost nothing financial.** The data we'd need lives outside the sources our donor map has been pulling.

## Karen Bass

### Cal-Access committees registered (FILERNAME_CD)

| Filer ID | Status | Registered | Name |
|---|---|---|---|
| **1471359** | ACTIVE | 2024-07-15 | BASS FOR MAYOR 2026; RE-ELECT KAREN |
| 1448983 | TERMINATED | (term 2024-06-30) | BASS FOR MAYOR 2022 - GENERAL; KAREN |
| 1457599 | TERMINATED | (term 2023-12-22) | Worker Power for Bass for Mayor + others, sponsored by UNITE HERE LOCAL 11 (IE committee) |
| 1272594 | TERMINATED | (term 2007-06-30) | BASS FOR ASSEMBLY 2006 |
| 1306918 | TERMINATED | (term 2012-09-30) | "Protecting CA's Children" issue committee with Bass (2012) |
| 1272593 / 1294231 | ACTIVE | 2004 / 2007 | Treasurer/Responsible Officer entries — "BASS, KAREN" personal officeholder records |

Treasurer for current mayoral committees: **Kaufman Legal Group** (`pcdfilings@kaufmanlegalgroup.com`, `sshin@kaufmanlegalgroup.com`).

### What we DON'T have

- **Receipt data for any of these committees.** Cal-Access RCPT_CD bulk only shows F410 statement-of-organization filings for 1471359 (registration documents). LA city candidate **financial filings (Form 460s with receipts and expenditures) are filed with LA City Ethics Commission**, not Cal-Access. We have no LA Ethics Commission data pulled locally.
- **No FEC data on Bass indexed.** Our `fec-bulk.jsonl`, `fec-pas2.jsonl`, `fec-individual-bulk.jsonl` are pre-processed extracts that only include relationships the librarian has explicitly indexed. Bass's US House years (CA-33 / CA-37, 2013-2022) are in the raw FEC dataset but not in our extracts. To get her career congressional donor record requires a fresh pull from FEC.gov.
- **Zero relationship-graph edges** for Bass (`relationships.jsonl` shows 1 unrelated reference).
- **No vault profile** at `content/Politicians/Democrats/...`.

### Bass committee links to track

UNITE HERE Local 11 IE committee (1457599) is editorially significant — that's organized labor's vehicle for Bass. The Worker Power IE name explicitly lists Bass + Soto + Darling + Mc Osker + Koretz + opposing O'Farrell. That's a 2022 LA labor coalition. Worth checking whether it's been reactivated for 2026 or replaced by a different IE.

## Spencer Pratt

### Cal-Access committees registered

**None.** Searched FILERNAME_CD for "PRATT", "SPENCER PRATT", "PRATT FOR MAYOR", "PRATT 2026", "PRATT FOR LOS ANGELES" — all hits are unrelated individuals (Albert Pratt of Temecula, Anthony Pratt of Oakdale, Rayola Pratt of Shasta, etc.).

### Why this matters

Two possibilities:
1. Pratt's mayoral committee filed AFTER the April 29, 2026 Cal-Access bulk dump date.
2. Pratt's committee is filing with **LA City Ethics Commission only** (city-level), not Cal-Access (state-level).

(2) is more likely. LA City candidates whose donors come exclusively from LA-city-eligible sources can file at the city level only and never appear in Cal-Access. Pratt's campaign — built on small-dollar fire-grievance donations — is the type that wouldn't trigger state-level filings.

**This means our Cal-Access bulk has nothing on Pratt at all.**

### What we'd need

- LA City Ethics Commission's campaign finance data for Pratt's committee
- His personal historical political donations (FEC individual-bulk has occasional celebrity donor entries, but our extracts don't include him)
- His business / production-company financial structure if any (Heidi & Spencer Pratt have multiple LLCs from their Hills / merchandise era)

## UPDATE 2026-05-09 — DATA UNLOCK via LA City Open Data Portal

**LA City has a public Socrata API at `data.lacity.org`** with the LA Ethics Commission campaign-contribution dataset (`m6g2-gc6c`). Direct queryable with no auth. Same dataset the Steadfast LA Gemini research already cited.

**Pratt for Mayor 2026 — committee 1485940**

| Metric | Value |
|---|---|
| Total raised (cycle to 2026-04-18) | **$539,616.85** |
| Contributions | 1,634 |
| First contribution date | 2026-01-01 |
| Last contribution date | 2026-04-18 |
| Average contribution | ~$330 |

**Top 12 Pratt donors (after unitemized aggregate of $131,251.74):**

| Donor | Occupation / Employer | Amount |
|---|---|---:|
| Wendy Moniz | Actor (Self) | $3,371.72 |
| Dax Mitchell | Retired | $2,157.59 |
| Eliza Flug | Producer (Self) | $1,983.34 |
| Johnny Leon | Student | $1,885.34 |
| Dean McKillen | Owner, Laurel Hardware Co (West Hollywood restaurant) | $1,885.34 |
| Ben Foster | Property Management, Ritz Properties Inc | $1,885.34 |
| Jeanne Yoon | CEO, Yoonique | $1,885.34 |
| David Wolf | Real Estate Developer, Wolf Residential Development | $1,885.34 |
| **Roy Disney** | **Investor, Shamrock Enterprises** | **$1,885.34** |
| Douglas Reinhardt | Real Estate Developer, ECG | $1,885.34 |
| **Michael Meldman** | **Real Estate Developer, Discovery Land Company** | **$1,885.34** |
| Catherine Adams | Retired | $1,885.08 |

**Editorially significant findings on Pratt's donor base:**

1. **Real-estate developer cluster.** Wolf, Reinhardt, **Meldman (Discovery Land — Casamigos co-founder, Trump-adjacent luxury developer)**, plus Excelsior Partners, Holdsworth Holdings, Beacon Realty, Newmark, Beverly Hills Estates. At least 8 of the top 30 are real estate developers writing max-out checks.
2. **Roy Disney** (Shamrock Enterprises) — Disney heir writing the legal max. Notable Republican-philanthropy figure.
3. **LA hospitality cluster.** Laurel Hardware Co, Palisades Gift Shop, restaurants/hotels.
4. **Geographic distribution:** 69% California ($298K), but a meaningful **31% out-of-state** — Texas at $20K being the largest non-CA. This is a nationally-supported celebrity-grievance candidacy with LA real-estate-developer ballast.
5. **Delta Special Operations Corp** $1,800 — corporate donor worth investigating.
6. The "celebrity-grievance" framing is partial. **It's celebrity grievance + LA real-estate developer money + national MAGA-adjacent small-dollar.**

**Bass for Mayor 2026 — committee 1471359**

| Metric | Value |
|---|---|
| Total raised (cycle to 2026-04-18) | **$3,770,497.12** |
| Contributions | 4,581 |
| First contribution date | 2024-01-01 |
| Last contribution date | 2026-04-18 |

**Top contributors:**

| Donor | Occupation / Employer | Amount |
|---|---|---:|
| **City of Los Angeles** | (public matching funds) | **$873,937.32** |
| Committee Against the Recall of Karen Bass | (internal transfer from recall-defense committee) | $47,157.37 |
| Karen Bass | Mayor, City of Los Angeles (self-funding) | $20,000.00 |
| UNITEMIZED | — | $18,318.77 |
| Kaci Patterson | Owner, Social Good Solutions | $2,400.00 |
| Rick Olivarez | Attorney, Olivarez Madruga Law Organization | $2,300.00 |
| Doug Shiepe | Owner, Douglas Shiepe Property | $1,850.00 |
| ...(then individual max-outs at $1,800) | | |

**Editorially significant findings on Bass's donor base:**

1. **$874K (24%) is City of LA public-matching funds.** Taxpayers are subsidizing her re-election under the LA matching-funds program. Editorial relevance depends on whether the program is being framed as institutional funding.
2. **$47K from her own recall-defense committee.** Internal transfer from "Committee Against the Recall of Karen Bass" — donors who gave to defeat her recall now flowing into her re-elect.
3. **MOXY + AC HOTEL DOWNTOWN LOS ANGELES — $1,800.** ⭐ A downtown LA hotel writing her the legal max. **Direct relevance to Inside Safe Cost Map (C-009) — Inside Safe contracts with hotels/motels for $85K-$100K/room.** Cross-reference angle: is Moxy/AC a current Inside Safe vendor?
4. **Real-estate developer cluster** (smaller than Pratt's): Doug Shiepe, David Houston (Barney's Beanery), various property managers.
5. **Major LA law firms:** O'Melveny & Myers (Richard Goetz), Greenberg Traurig (Emerson Luke), Olivarez Madruga (Rick Olivarez).
6. **Healthcare-adjacent:** Alex Mitchell at HOLA Recuperative Care (homeless services contractor — relevant to Inside Safe).
7. **California Alliance of Family Owned Businesses PAC** $1,800.

**Cross-candidate comparison:**
- Bass: $3.77M over 28 months (Jan 2024 - Apr 2026) — incumbent advantage + public matching
- Pratt: $540K over 3.5 months (Jan - Apr 2026) — fast-build celebrity-grievance candidate
- **On private dollars per month:** Pratt $154K/month vs. Bass roughly $103K/month (excluding public matching + recall-committee transfer + self). Pratt is actually outpacing Bass on private fundraising velocity.

## Path forward

The donor map hasn't indexed LA-city races. To do real Bass + Pratt deep dives, three options:

### Option A — Gemini Deep Research with primary-source citation discipline (fastest)

Same template that worked for Becerra:
- **Bass round:** 2026 mayoral committee top donors (LA Ethics), career US House donor base (FEC), real-estate / labor / hotel-vendor categorical breakdowns, Steadfast LA cross-reference, LWV withdrawal context
- **Pratt round:** committee filings (LA Ethics), donor base composition (small-dollar vs. organized money), MAGA / national-conservative funding cross-check, Hills/merchandise revenue context, fire-grievance fundraising mechanics

David runs the prompts. We verify against primary sources on URL pass. Same model as Becerra.

### Option B — Build LA Ethics Commission pipeline (longer, more durable)

LA Ethics publishes campaign finance data under permissive terms. Building a pipeline to ingest LA Ethics filings would give us local data for every LA-city race forever (mayoral, council, controller, attorney). Multi-day effort, but it's the durable answer for the LA Mayor build-out.

### Option C — Manual LA Ethics pulls beat-by-beat (compromise)

For the immediate Bass + Pratt beats, manually pull their LA Ethics filings (forms 460s as PDF or CSV). Single-shot per candidate, no pipeline.

## Recommendation

**Option A first** — Gemini Deep Research on each candidate, same source-discipline template as Becerra. Fast, gets us editorial material for the immediate beats. Two prompts: one for Bass (deeper, more dimensions), one for Pratt (sharper, narrower).

**Option B second** — once the immediate beats land, build the LA Ethics pipeline so LA mayor 2026 / 2030 / etc. is durably indexed. ADR territory.

## Existing local artifacts that DO inform Bass + Pratt beats

These are not financial-receipt data but contextual material:
- `gemini-research/2026-05-06-steadfast-la-structural-deep-dive.md` — Caruso/Steadfast LA roster + LA Ethics employer-cluster matches (Gensler, Disney, JPMorgan, etc.)
- `la-mayor-debate-2026-05-06.md` — May 6 NBC4 debate recap, including Raman's $85-100K Inside Safe attack
- `emerging-beat-candidates.md` — C-009 (Inside Safe Cost Map) + C-010 (The Apparatus / Steadfast LA)
- `la-mayor-bass-lwv-withdrawal-2026-05-09.md` — May 9 LWV/Pat Brown forum withdrawal
- `distribution-conversations-2026-05-04.md` — distribution-side intel on the race

These give us the editorial frame for both beats. Financial receipts come from Gemini + URL pass.
