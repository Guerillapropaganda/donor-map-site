---
title: "2026-03-27 Connection Audit"
type: daily-update
content-readiness: raw
last-updated: 2026-03-27
source-tier: null
parent: null
---

#vault-maintenance #connection-audit #hub-nodes #cross-section #wikilinks

---

### 2026-03-27 Connection Audit — Cross-Section Link Report

**Task:** Automated scheduled run — connection-mapper
**Method:** Wikilink frequency count across all 6 vault sections; outgoing link analysis on top 10 hub nodes; reciprocal link check on 5 random donor nodes.
**Chrome status:** UNAVAILABLE — no API or URL verification performed. This is a structural audit only.

---

### Part 1: Cross-Section Link Audit

**Hub nodes** are defined as any donor node or politician master profile referenced by 30+ other vault files. The top 10 by reference count are listed below.

The 6 vault sections scanned:
1. **Politicians** — `topics/Politicians/`
2. **Donors & Power Networks** — `topics/Donors & Power Networks/`
3. **Stories** — `topics/Stories/`
4. **Media & Influence Pipeline** — `topics/Media & Influence Pipeline/`
5. **Think Tanks & Policy Infrastructure** — `topics/Think Tanks & Policy Infrastructure/`
6. **Lobbying Firms & K Street** — `topics/Lobbying Firms & K Street/`

#### Hub Reference Counts (Full Vault)

| Rank | Hub Node | Total Vault Refs |
|------|----------|-----------------|
| 1 | _Donald Trump Master Profile | 454 |
| 2 | AIPAC - American Israel Public Affairs Committee | 385 |
| 3 | Koch Network - Charles Koch | 375 |
| 4 | _Gavin Newsom Master Profile | 240 |
| 5 | Goldman Sachs | 214 |
| 6 | Lockheed Martin | 203 |
| 7 | Leonard Leo | 193 |
| 8 | Elon Musk | 162 |
| 9 | Boeing | 157 |
| 10 | Peter Thiel | 154 |

---

#### Cross-Section Link Audit Table

For each hub: **Sections Linked** = sections the hub's own file currently links TO (via outgoing wikilinks). **Missing Sections** = sections where the hub has no outgoing links. **Files in Missing Section** = how many files in each missing section reference this hub (inbound links from that section, no reciprocal outgoing link from hub).

| Hub Node | Total Refs | Sections Linked (outgoing) | Missing Sections | Files Referencing Hub in Missing Section |
|----------|-----------|---------------------------|------------------|------------------------------------------|
| _Donald Trump Master Profile | 454 | Politicians, Donors & Power Networks, Stories | Media & Influence Pipeline | 10 files (Joe Rogan, Tucker Carlson, Megyn Kelly, Laura Ingraham, Dan Bongino, etc.) |
| _Donald Trump Master Profile | 454 | (same) | Think Tanks & Policy Infrastructure | 2 files |
| _Donald Trump Master Profile | 454 | (same) | Lobbying Firms & K Street | 5 files |
| AIPAC - American Israel Public Affairs Committee | 385 | Politicians, Donors & Power Networks, Media & Influence Pipeline, Think Tanks, Lobbying | Stories | 37 files (AIPAC Illinois Shell PAC Operation, 2026 Senate Races, Illinois/Georgia/Michigan primaries) |
| Koch Network - Charles Koch | 375 | **ALL 6 SECTIONS** | — | No missing sections |
| _Gavin Newsom Master Profile | 240 | Politicians, Donors & Power Networks | Stories | 17 files |
| _Gavin Newsom Master Profile | 240 | (same) | Media & Influence Pipeline | 0 files |
| _Gavin Newsom Master Profile | 240 | (same) | Think Tanks & Policy Infrastructure | 0 files |
| _Gavin Newsom Master Profile | 240 | (same) | Lobbying Firms & K Street | 0 files |
| Goldman Sachs | 214 | Politicians, Donors & Power Networks, Stories | Media & Influence Pipeline | 2 files |
| Goldman Sachs | 214 | (same) | Think Tanks & Policy Infrastructure | 17 files (Aspen Institute, Atlantic Council, Brookings, CFR, RAND, Third Way, CAP, etc.) |
| Goldman Sachs | 214 | (same) | Lobbying Firms & K Street | 4 files (Akin Gump, Brownstein Hyatt, Crossroads Strategies) |
| Lockheed Martin | 203 | Politicians, Donors & Power Networks, Stories | Media & Influence Pipeline | 1 file |
| Lockheed Martin | 203 | (same) | Think Tanks & Policy Infrastructure | 4 files |
| Lockheed Martin | 203 | (same) | Lobbying Firms & K Street | 4 files (Akin Gump, Capitol Counsel, Cassidy & Associates, Cornerstone) |
| Leonard Leo | 193 | Politicians, Donors & Power Networks, Think Tanks & Policy Infrastructure | Stories | 8 files |
| Leonard Leo | 193 | (same) | Media & Influence Pipeline | 0 files |
| Leonard Leo | 193 | (same) | Lobbying Firms & K Street | 0 files |
| Elon Musk | 162 | Politicians, Donors & Power Networks | Stories | 22 files (primarily Daily Updates/news scans referencing Musk, plus 7 substantive story files) |
| Elon Musk | 162 | (same) | Media & Influence Pipeline | 7 files (Bari Weiss, Joe Rogan, Tucker Carlson, Matt Taibbi, Don Lemon, Matt Walsh, Lex Fridman) |
| Elon Musk | 162 | (same) | Think Tanks & Policy Infrastructure | 2 files |
| Elon Musk | 162 | (same) | Lobbying Firms & K Street | 1 file |
| Boeing | 157 | Politicians, Donors & Power Networks, Stories | Media & Influence Pipeline | 1 file |
| Boeing | 157 | (same) | Think Tanks & Policy Infrastructure | 3 files |
| Boeing | 157 | (same) | Lobbying Firms & K Street | 5 files (Akin Gump, Capitol Counsel, Cassidy & Associates, Cornerstone, Squire Patton Boggs) |
| Peter Thiel | 154 | Politicians, Donors & Power Networks | Stories | 6 files |
| Peter Thiel | 154 | (same) | Media & Influence Pipeline | 18 files (Bari Weiss, Breaking Points, Glenn Greenwald, Joe Rogan, Lex Fridman, Matt Taibbi, Nate Silver, Russell Brand, Jimmy Dore, Red Scare, etc.) |
| Peter Thiel | 154 | (same) | Think Tanks & Policy Infrastructure | 1 file |
| Peter Thiel | 154 | (same) | Lobbying Firms & K Street | 1 file |

**Notable finding:** Koch Network is the only top-10 hub with outgoing links to all 6 sections — it is the best-connected hub node in the vault. All others have at least one section gap. Goldman Sachs has a particularly notable Think Tank gap: 17 think tank files reference Goldman Sachs but Goldman Sachs itself contains no outgoing links to the Think Tanks section.

---

### Part 2: Shared-Donor Connection Gaps

Five donor nodes selected at random from `topics/Donors & Power Networks/`. For each: which politician master profiles mention this donor but do NOT contain a wikilink back to the donor node?

#### Donor Nodes Audited

1. **[[The 85 Fund]]** (`Donors & Power Networks/Dark Money/The 85 Fund.md`)
2. **[[FTX - Sam Bankman-Fried]]** (`Donors & Power Networks/Tech & Crypto/FTX - Sam Bankman-Fried.md`)
3. **Cargill** (`Donors & Power Networks/Agriculture/Cargill.md`)
4. **[[National Education Association]]** (`Donors & Power Networks/Education/National Education Association.md`)
5. **[[J Street]]** (`Donors & Power Networks/Israel Lobby/J Street.md`)

#### Shared-Donor Connection Gaps Table

| Donor | Politician Missing Link | Direction of Missing Link | Notes |
|-------|------------------------|--------------------------|-------|
| The 85 Fund | _Sheldon Whitehouse Master Profile | Politician → Donor | Whitehouse's profile discusses The 85 Fund extensively by name but uses no wikilink |
| The 85 Fund | _Neil Gorsuch Master Profile | Politician → Donor | File mentions 85 Fund in Leo pipeline context; no wikilink |
| FTX - Sam Bankman-Fried | _Chuck Schumer Master Profile | Politician → Donor | Schumer profile mentions FTX/SBF in crypto context; no wikilink |
| FTX - Sam Bankman-Fried | _Mitch McConnell Master Profile | Politician → Donor | McConnell profile mentions FTX; no wikilink |
| Cargill | _Amy Klobuchar Master Profile | Politician → Donor | Klobuchar profile names Cargill explicitly in revolving door and donor sections; no wikilink |
| Cargill | _Glenn Thompson Master Profile | Politician → Donor | Thompson profile mentions Cargill; no wikilink |
| Cargill | _Deb Fischer Master Profile | Politician → Donor | Fischer profile mentions Cargill; no wikilink |
| Cargill | _Joni Ernst Master Profile | Politician → Donor | Ernst profile mentions Cargill; no wikilink |
| Cargill | _Tommy Tuberville Master Profile | Politician → Donor | Tuberville profile mentions Cargill; no wikilink |
| National Education Association | _Bobby Scott Master Profile | Politician → Donor | Scott profile mentions NEA; no wikilink |
| National Education Association | _Brendan Boyle Master Profile | Politician → Donor | Boyle profile mentions NEA; no wikilink |
| National Education Association | _Jim McGovern Master Profile | Politician → Donor | McGovern profile mentions NEA; no wikilink |
| National Education Association | _Mark Takano Master Profile | Politician → Donor | Takano profile mentions NEA; no wikilink |
| J Street | _Nancy Pelosi Master Profile | Politician → Donor | Pelosi profile mentions J Street; no wikilink (Nadler, Tlaib, Baldwin DO link correctly) |
| J Street | _Ro Khanna Master Profile | Politician → Donor | Khanna profile mentions J Street; no wikilink |
| J Street | _Daniel Biss Master Profile | Politician → Donor | Biss profile mentions J Street; no wikilink |
| J Street | _John Hickenlooper Master Profile | Politician → Donor | Hickenlooper profile mentions J Street; no wikilink |
| J Street | _Sheldon Whitehouse Master Profile | Politician → Donor | Whitehouse profile mentions J Street; no wikilink |

**Observation:** The J Street gap is the most systemic — 5 of 8 politician profiles that mention J Street lack a wikilink. Cargill has no reciprocal links at all across 5 politician profiles that all name it explicitly. The 85 Fund gap is analytically significant: Sheldon Whitehouse has made The 85 Fund the centerpiece of his dark money crusade, yet his master profile doesn't link to the donor node.

---

### Priority Action List: Top 5 Files to Cross-Link

Ranked by analytical impact and reference volume.

| Priority | Action | Rationale |
|----------|--------|-----------|
| **1** | Add outgoing links from `Elon Musk.md` → Stories section (substantive story files) + Media & Influence Pipeline (7 files) | Elon Musk is 8th most-referenced hub (162 refs) with NO outgoing links to Stories or Media. [[Joe Rogan]], Tucker Carlson, Bari Weiss, Matt Taibbi all tied to Musk editorially. Missing connections weaken the network graph. |
| **2** | Add outgoing links from `Goldman Sachs.md` → Think Tanks & Policy Infrastructure (17 files: Brookings, CFR, Atlantic Council, RAND, CAP, Third Way, Aspen) | Goldman Sachs funds or places alumni at 17 think tank nodes that reference it but receive no link from Goldman Sachs itself. This is the revolving door gap with the highest file count in a single missing section. |
| **3** | Add `[[The 85 Fund]]` wikilink to `_Sheldon Whitehouse Master Profile.md` | Whitehouse has made The 85 Fund his primary rhetorical weapon — it appears prominently in his profile text but has no functional wikilink. Highest-impact single politician→donor link gap. |
| **4** | Add outgoing links from `Peter Thiel.md` → Media & Influence Pipeline (18 files) | Peter Thiel is 10th most-referenced hub (154 refs). 18 media personality files reference him, including Bari Weiss, Glenn Greenwald, Joe Rogan, Lex Fridman, Matt Taibbi — all of whom received Thiel funding or platforming. No outgoing links from Thiel's own file to Media section. |
| **5** | Add `[[Cargill]]` wikilinks to Klobuchar, Thompson, Fischer, Ernst, Tuberville master profiles | Cargill is named in the revolving door section of Klobuchar's profile with specific staff detail (Anne Knapke). Zero reciprocal wikilinks across 5 Agriculture Committee–adjacent senators/representatives is a systematic gap. |

---

### Methodology Notes

- All wikilink counts performed via `grep -roh '\[\[...\]\]'` across vault `.md` files, deduped by `uniq -c`.
- "Sections linked" = outgoing wikilinks in hub file that resolve to a filename in that section.
- "Files referencing hub" = files in a given section containing the hub's name string (whether or not as a formal wikilink).
- SCOTUS profiles are nested under `Politicians/` and counted in the Politicians section for this audit.
- Daily Update files (Internal/Daily Updates/) are included in the Stories section reference counts, which inflates Elon Musk's Stories count (most of the 22 "Stories" files referencing Musk are automated daily news scans, not substantive analytical pieces).

---

