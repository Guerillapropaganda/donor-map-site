---
title: "Categorization Audit"
type: audit
content-readiness: draft
last-updated: 2026-04-05
source-tier: null
parent: null
auto-generated: false
draft: true
---

# Politician Folder Categorization Audit

**Scope:** Audit of `content/Politicians/*` folder structure to identify mis-filed profiles. Generated after user flagged JD Vance (filed under Presidential while serving as VP) and Chad Bianco (filed under Governors while running for CA governor).

**Already fixed in this session:**
- Merged both `CA Governor 2026` folders (Dem + Rep) into party-neutral `Races/CA Governor 2026/`
- Moved Chad Bianco into `Races/CA Governor 2026/`
- Created `Republicans/Vice Presidential/` and moved JD Vance (frontmatter `chamber` also updated)

---

## Core Problem

The `Presidential/` folder under each party has become a dumping ground for anyone who:
- Has run for president at any point
- Is being discussed as a 2028 candidate
- Was a former president/VP

This conflates **current office-holders**, **former office-holders**, and **active candidates**, making it unclear what a given politician *is* today.

---

## Proposed Folder Taxonomy

```
content/Politicians/
├── Democrats/
│   ├── Presidential/         (sitting Dem president only — currently empty)
│   ├── Vice Presidential/    (sitting Dem VP only — currently empty)
│   ├── Senate/               (sitting Dem senators)
│   ├── House/                (sitting Dem reps)
│   ├── Governors/            (sitting Dem governors)
│   ├── Cabinet/              (current Dem cabinet — currently empty)
│   └── Former/               (retired, lost seat, moved to non-political)
├── Republicans/
│   ├── Presidential/         (Trump only)
│   ├── Vice Presidential/    (Vance — already created)
│   ├── Senate/
│   ├── House/
│   ├── Governors/
│   ├── Trump Cabinet/        (existing)
│   └── Former/               (retired, lost seat, etc.)
├── Races/
│   ├── CA Governor 2026/     (already created)
│   └── Presidential 2028/    (future — if/when declared candidates emerge)
├── SCOTUS/
├── Independent/
└── International/
```

**Rule of thumb:** File by **current office**. If out of politics → `Former/`. Candidacy for another office → note in frontmatter (`race: "CA Governor 2026"`) and potentially wikilink into `Races/` index page.

---

## Democrats/Presidential — Needs Reclassification (13 profiles)

| Profile | Current Status (verify) | Proposed Move |
|---|---|---|
| **Andy Beshear** | Sitting governor of Kentucky | `Democrats/Governors/Andy Beshear` |
| **Barack Obama** | Former president | `Democrats/Former/Barack Obama` (or new `Former Presidents/`) |
| **Bernie Sanders** | Sitting US senator (VT, Independent caucusing with D) | `Independent/Bernie Sanders` or `Democrats/Senate/` |
| **Bill Clinton** | Former president | `Democrats/Former/Bill Clinton` |
| **Gretchen Whitmer** | Sitting governor of Michigan, 2028 hopeful | `Democrats/Governors/Gretchen Whitmer` |
| **Hillary Clinton** | Former SecState, no current office | `Democrats/Former/Hillary Clinton` |
| **JB Pritzker** | Sitting governor of Illinois, 2028 hopeful | `Democrats/Governors/JB Pritzker` |
| **Joe Biden** | Former president (left office Jan 2025) | `Democrats/Former/Joe Biden` |
| **Josh Shapiro** | Sitting governor of Pennsylvania, 2028 hopeful | `Democrats/Governors/Josh Shapiro` |
| **Kamala Harris** | Former VP (left Jan 2025), 2024 nominee | `Democrats/Former/Kamala Harris` |
| **Pete Buttigieg** | Former Transportation Secretary | `Democrats/Former/Pete Buttigieg` |
| **Tim Walz** | Sitting governor of Minnesota, 2024 VP nominee | `Democrats/Governors/Tim Walz` |
| **Wes Moore** | Sitting governor of Maryland, 2028 hopeful | `Democrats/Governors/Wes Moore` |

**After this move, `Democrats/Presidential/` would be empty** (Democrats don't currently hold the presidency).

---

## Republicans/Presidential — Needs Reclassification (7 profiles)

| Profile | Current Status (verify) | Proposed Move |
|---|---|---|
| **Donald Trump** | Sitting president | **Keep** in `Republicans/Presidential/` ✓ |
| **George W Bush** | Former president | `Republicans/Former/George W Bush` |
| **John McCain** | Deceased (2018), former senator/candidate | `Republicans/Former/John McCain` |
| **Mitt Romney** | Former senator (retired Jan 2025) | `Republicans/Former/Mitt Romney` |
| **Nikki Haley** | Former governor, former UN Amb, 2024 candidate | `Republicans/Former/Nikki Haley` |
| **Ron DeSantis** | Sitting governor of Florida | `Republicans/Governors/Ron DeSantis` |
| **Vivek Ramaswamy** | 2024 candidate, reportedly running for OH governor 2026 | `Races/OH Governor 2026/Vivek Ramaswamy` if confirmed, else `Republicans/Former/` |

---

## Open Questions for David / Research Claude

1. **Former Presidents bucket?** Do we want a dedicated `Former Presidents/` folder (party-neutral or nested under party) or lump them in `Democrats/Former/` + `Republicans/Former/`?

2. **Bernie Sanders placement.** He's currently under `Democrats/Presidential/` but caucuses with Dems as an Independent senator. Options:
   - `Independent/Bernie Sanders/` (technically correct)
   - `Democrats/Senate/` (how he's perceived)
   - Pragmatically, keep him in a caucus-based folder

3. **Walz/Harris special case.** 2024 ticket — Walz is still governor, Harris is out. Split them or both in Former?

4. **Race tracking.** Should sitting politicians running for another office get dual listings via:
   - a. Wikilink stub in `Races/{race}/` pointing to canonical profile
   - b. New frontmatter field `running-for: "{race}"` + auto-generated Races index page
   - c. Just leave them in current-office folder + tag

5. **Trump Cabinet convention.** Currently `Republicans/Trump Cabinet/`. Should it be renamed to `Republicans/Cabinet/` (current admin = current cabinet)?

---

## Execution Notes

Moving the 20 profiles above is mechanical (git mv + update `chamber` frontmatter). I can execute in one pass once decisions are finalized. Estimated: 5 minutes of moves + 1 rebuild + 1 push.

Each move also needs a `chamber` frontmatter update to match the new folder (e.g. `chamber: "Presidential"` → `chamber: "Governor"` or `chamber: "Former"`).

Wikilinks inside profiles that reference moved files will need rewriting — Quartz typically handles these via basename matching, but a post-move audit is wise.
