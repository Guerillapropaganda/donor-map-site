---
title: "2026-03-27 Freshness Audit"
type: daily-update
content-readiness: raw
last-updated: 2026-03-27
source-tier: null
parent: null
---

# 2026-03-27 Freshness Audit — Cross-Section Integration Gap Report

**Automated run.** Audits "ready" profiles that predate the three new vault sections completed 2026-03-25: Media & Influence Pipeline, Think Tanks & Policy Infrastructure, and Lobbying Firms & K Street.

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total "ready" files scanned | 551 |
| — Donor nodes (ready) | 349 |
| — Politician master profiles (ready) | 202 |
| Stale files (last-updated before 2026-03-25) | **489** |
| — Stale donor nodes | 321 |
| — Stale politician profiles | 168 |
| Stale files missing ALL three cross-section link types | **466 (95%)** |
| Stale files missing at least one cross-section link type | **489 (100%)** |

**Bottom line:** Every single pre-2026-03-25 "ready" file is missing at least one cross-section link. 95% are missing all three. The three new vault sections (Media, Think Tanks, Lobbying) are effectively unlinked from the existing profile database.

---

## Key Dates for Context

| Section Completed | Date | File Count |
|-------------------|------|-----------|
| Media & Influence Pipeline | 2026-03-25 | 68 profiles |
| Think Tanks & Policy Infrastructure | 2026-03-25 | 25 profiles |
| Lobbying Firms & K Street | 2026-03-25 | 22 profiles |
| Fox News institutional profile | 2026-03-26 | 1 file |
| Cross-Section Integration Protocol adopted | 2026-03-26 | — |

Any "ready" file with `last-updated` before 2026-03-25 was built before these sections existed. These KEY DATES appear current as of this audit run (2026-03-27) — no new sections have been detected since 2026-03-26.

---

## Donor Nodes — Top 20 Flagged Files

Sorted by total vault reference count (most-referenced first). Cross-section links checked via wikilink scan only (not plain-text mention).

| File | Last Updated | Refs | Media | Think Tanks | Lobbying |
|------|-------------|------|-------|-------------|---------|
| Lockheed Martin | 2026-03-24 | 238 | N | N | N |
| Goldman Sachs | 2026-03-23 | 226 | N | N | N |
| Leonard Leo | 2026-03-23 | 218 | N | **Y** | N |
| Elon Musk | 2026-03-23 | 179 | N | N | N |
| Peter Thiel | 2026-03-23 | 159 | N | N | N |
| Fairshake PAC | 2026-03-23 | 157 | N | N | N |
| SEIU - Service Employees International Union | 2026-03-23 | 144 | N | N | N |
| MAGA Inc | 2026-03-23 | 131 | N | N | N |
| Chevron | 2026-03-23 | 119 | N | N | N |
| Miriam Adelson | 2026-03-23 | 107 | N | N | N |
| Fossil Fuel Bloc | 2026-03-23 | 93 | N | N | N |
| PhRMA | 2026-03-23 | 89 | N | N | N |
| UnitedHealth Group - Optum | 2026-03-23 | 87 | N | N | N |
| CoreCivic | 2026-03-24 | 87 | N | N | N |
| ExxonMobil | 2026-03-24 | 77 | N | N | N |
| IBEW - International Brotherhood of Electrical Workers | 2026-03-23 | 69 | N | N | N |
| Michael Bloomberg | 2026-03-23 | 68 | N | N | N |
| United Democracy Project - UDP | 2026-03-23 | 67 | N | N | N |
| ActBlue | 2026-03-23 | 64 | N | N | N |
| Timothy Mellon | 2026-03-23 | 63 | N | N | N |

**Note:** Leonard Leo is the only donor node in the top 20 with any cross-section link (Think Tanks). This is expected given Leo's centrality to the Federalist Society / judicial capture infrastructure.

---

## Politician Master Profiles — Top 20 Flagged Files

Sorted by total vault reference count. All 20 are missing all three cross-section link types.

| File | Last Updated | Refs | Media | Think Tanks | Lobbying |
|------|-------------|------|-------|-------------|---------|
| _Donald Trump Master Profile | 2026-03-23 | 552 | N | N | N |
| _Gavin Newsom Master Profile | 2026-03-23 | 242 | N | N | N |
| _Bernie Sanders Master Profile | 2026-03-23 | 133 | N | N | N |
| _Elizabeth Warren Master Profile | 2026-03-23 | 107 | N | N | N |
| _JD Vance Master Profile | 2026-03-23 | 105 | N | N | N |
| _Chuck Schumer Master Profile | 2026-03-23 | 100 | N | N | N |
| _Kamala Harris Master Profile | 2026-03-23 | 97 | N | N | N |
| _David Sacks Master Profile | 2026-03-23 | 64 | N | N | N |
| _Katie Porter Master Profile | 2026-03-24 | 62 | N | N | N |
| _Nancy Pelosi Master Profile | 2026-03-23 | 60 | N | N | N |
| _Mitch McConnell Master Profile | 2026-03-23 | 60 | N | N | N |
| _Jared Kushner Master Profile | 2026-03-23 | 55 | N | N | N |
| _JB Pritzker Master Profile | 2026-03-24 | 52 | N | N | N |
| _Chad Bianco Master Profile | 2026-03-23 | 52 | N | N | N |
| _Ted Cruz Master Profile | 2026-03-24 | 51 | N | N | N |
| _Pete Hegseth Master Profile | 2026-03-24 | 50 | N | N | N |
| _Susan Collins Master Profile | 2026-03-24 | 43 | N | N | N |
| _Benjamin Netanyahu Master Profile | 2026-03-23 | 41 | N | N | N |
| _Alexandria Ocasio-Cortez Master Profile | 2026-03-24 | 41 | N | N | N |
| _Clarence Thomas Master Profile | 2026-03-24 | 40 | N | N | N |

---

## Priority Action List — Top 10 Files to Update

Ranked by **Score = reference count × number of missing cross-section link types**. Higher score = higher structural impact from integration gap.

| Rank | Score | Refs | Type | Missing Sections | File |
|------|-------|------|------|-----------------|------|
| 1 | 1,656 | 552 | politician | Media, Think Tanks, Lobbying | [[_Donald Trump Master Profile\|Trump]] |
| 2 | 726 | 242 | politician | Media, Think Tanks, Lobbying | [[_Gavin Newsom Master Profile\|Newsom]] |
| 3 | 714 | 238 | donor | Media, Think Tanks, Lobbying | [[Lockheed Martin]] |
| 4 | 678 | 226 | donor | Media, Think Tanks, Lobbying | [[Goldman Sachs]] |
| 5 | 537 | 179 | donor | Media, Think Tanks, Lobbying | [[Elon Musk]] |
| 6 | 477 | 159 | donor | Media, Think Tanks, Lobbying | [[Peter Thiel]] |
| 7 | 471 | 157 | donor | Media, Think Tanks, Lobbying | [[Fairshake PAC]] |
| 8 | 436 | 218 | donor | Media, Lobbying | [[Leonard Leo]] |
| 9 | 432 | 144 | donor | Media, Think Tanks, Lobbying | [[SEIU - Service Employees International Union\|SEIU]] |
| 10 | 399 | 133 | politician | Media, Think Tanks, Lobbying | [[_Bernie Sanders Master Profile\|Sanders]] |

### What "updating" means for each file

For each file, cross-section integration requires adding wikilinks in the appropriate sections:
- **Media links**: Add `[[Media Personality Name]]` references in donor's "What They Want" or politician's "Rhetorical Signature Moves" / "Donor Class Map" sections, pointing to relevant Media & Influence Pipeline profiles (e.g., Fox News anchors for right-wing donors, MSNBC hosts for Dem-aligned donors)
- **Think Tank links**: Add `[[Think Tank Name]]` wikilinks in "Policy Return" analysis sections, pointing to think tanks that received funding or produced policy justifications (e.g., Heritage Foundation for Koch-adjacent donors, Brookings for Wall Street Dems)
- **Lobbying links**: Add `[[Lobbying Firm Name]]` wikilinks in "Revolving Door" or "Policy Return" sections, pointing to K Street firms that lobbied on the donor's behalf or employed their revolving-door staff

---

## Methodology Notes

- **Cross-section link check**: Wikilink scan only (`[[...]]` patterns). Plain-text mentions of firm names are not counted as cross-links.
- **Reference count**: Number of `[[stem]]` wikilinks to the file found across the entire vault (all `.md` files).
- **Stale threshold**: `last-updated` before 2026-03-25 (day the new sections were completed).
- **Excluded from politician scan**: `_README.md` files. Only files starting with `_` are treated as master profiles.
- **Think Tank excluded**: The four cross-analysis files in the Think Tanks section (`Cross-Think-Tank Donor Map`, `The Idea Laundering Pipeline`, `The Revolving Door`, `The Think Tank Money Map`) are excluded from the link-target check since they are analysis files, not entity profiles.

---

## KEY DATES Status Check

As of 2026-03-27, no new vault sections appear to have been completed beyond those listed in the task configuration. The KEY DATES in the scheduled task prompt are current. If David adds new sections (e.g., additional Media Pipeline expansions, new lobbying firm builds), the task configuration should be updated to reflect the new completion date.

---

content-readiness:: raw
