---
title: "Publication Audit Report"
type: reference
content-readiness: ready
last-updated: 2026-03-27
source-tier: null
parent: null
---

tags: #vault-maintenance #publication #audit #automated

related: [[Publication Manifest]] · [[Website Publication Plan]] · [[Session Timeline]]

---

### Publication Audit Report — The Donor Map Database

**Run date:** 2026-03-27
**Scope:** 181 publication-approved files (free tier)
**Method:** Automated audit via scheduled task. Read-only pass.
**Previous report:** 2026-03-26 (manual)

---

### Executive Summary

| Metric | Result |
|--------|--------|
| Total approved files audited | 181 / 181 |
| Files confirmed present in vault | 181 / 181 |
| Files missing from vault | 0 |
| Files with ERRORS | 2 |
| Files with WARNINGS | 4 |
| UNVERIFIED citations in sub-notes | 0 |
| URL NEEDED citations in sub-notes | 0 |
| Excluded section violations (approved files) | 7 across 2 files |
| Epstein exclusion confirmed | ✅ |
| Previously flagged issues resolved | 5 |

**Verdict: 179 of 181 approved files are publication-ready. 2 files require pre-publication fixes. 4 files have non-blocking warnings.**

---

### ERRORS — Must Fix Before Publication

#### ERROR 1: Excluded Section Links — `Project 2025 - The Blueprint They Followed.md`

**File:** Donald Trump / Governance / `Project 2025 - The Blueprint They Followed.md`
**Status:** `ready`
**Violation:** 2 wikilinks into excluded `Think Tanks & Policy Infrastructure` section

| Wikilink | Resolves To |
|----------|-------------|
| `[[Heritage Foundation]]` | Think Tanks & Policy Infrastructure/Conservative/Heritage Foundation.md |
| `[[Federalist Society]]` | Think Tanks & Policy Infrastructure/Conservative/Federalist Society.md |

**Fix:** Convert both wikilinks to plain text. These organizations are named as narrative actors, not cross-reference targets. Plain text retains the analytical argument without violating section isolation.

---

#### ERROR 2: Excluded Section Links — `Marc Andreessen & Horowitz.md`

**File:** Donors & Power Networks / Tech & Crypto / `Marc Andreessen & Horowitz.md`
**Status:** `developed`
**Violation:** 5 wikilinks into excluded `Media & Influence Pipeline` section

The file contains a "Media pipeline connections" subsection (~line 209) that describes a16z's overlap with independent media infrastructure. The analytical content is valid. The wikilinks are the problem.

| Wikilink | Resolves To |
|----------|-------------|
| `[[Bari Weiss]]` | Media & Influence Pipeline/Centrist/Bari Weiss.md |
| `[[Glenn Greenwald]]` | Media & Influence Pipeline/Centrist/Glenn Greenwald.md |
| `[[Nate Silver]]` | Media & Influence Pipeline/Centrist/Nate Silver.md |
| `[[Lex Fridman]]` | Media & Influence Pipeline/Centrist/Lex Fridman.md |
| `[[Russell Brand]]` | Media & Influence Pipeline/Centrist/Russell Brand.md |

**Fix:** Convert all 5 wikilinks to plain text. The media infrastructure argument stands without live links to unpublished profiles.

**Secondary note:** File is `developed`, not `ready`. Intentional per manifest. Flag for promotion before final publish.

---

### WARNINGS — Should Fix Before Publication

#### WARNING 1: Malformed Wikilink Syntax — `CalRx - The Genuine Win With Caveats.md`

**File:** Gavin Newsom / Healthcare / `CalRx - The Genuine Win With Caveats.md`
**Status:** `ready`

Three wikilinks contain a backslash before the pipe alias separator. Obsidian will not resolve these — they will render as broken links in the published vault.

| Malformed | Correct Syntax |
|-----------|---------------|
| `[[Blue Shield of California\|Blue Shield]]` | `[[Blue Shield of California|Blue Shield]]` |
| `[[UnitedHealth Group - Optum\|UnitedHealth/Optum]]` | `[[UnitedHealth Group - Optum|UnitedHealth/Optum]]` |
| `[[Anthem - Elevance Health\|Anthem]]` | `[[Anthem - Elevance Health|Anthem]]` |

Note: All three targets are unapproved donor nodes, so the links will be dead on publish regardless. Either fix the syntax or convert to plain text.

---

#### WARNING 2: Content-Readiness Below `ready` — `_Lindsey Graham Master Profile.md`

**File:** Republicans / Senate / `_Lindsey Graham Master Profile.md`
**YAML status:** `developed`

Approved for publication in the manifest. The `developed` status is an acceptable publication tier per the website plan, but signals an incomplete citation pass. Recommend promotion to `ready` before going live.

---

#### WARNING 3: Tier 4 Citations — `_JD Vance Master Profile.md`

**File:** Republicans / Presidential / `_JD Vance Master Profile.md`
**Status:** `ready`

Two citations marked `(Tier 4)`:
- New Republic: "JD Vance False Prophet of Blue America"
- Washington Post article on Vance / Hillbilly Elegy

Both are correctly labeled. Confirm URLs load before publication. Per policy, Tier 4 sources should be flagged for independent verification — both appear to be flagged correctly.

---

#### WARNING 4: Wikilinks to Unapproved Donor Nodes (Dead Links on Publish)

The following approved master profiles link to donor nodes or politician profiles that are NOT in the approved publication scope. These will appear as dead links in the published vault.

| File | Notable Unapproved Links |
|------|--------------------------|
| `_Kash Patel Master Profile` | Save America PAC, MAGA Inc, _Stephen Miller, _Matt Gaetz, _Pete Hegseth |
| `_Amy Coney Barrett Master Profile` | Leonard Leo, Judicial Crisis Network, Chevron |
| `_Neil Gorsuch Master Profile` | Leonard Leo, Judicial Crisis Network, Koch Network - Charles Koch, Marble Freedom Trust, Chevron |
| `_Brett Kavanaugh Master Profile` | Leonard Leo, Judicial Crisis Network, Fossil Fuel Bloc, Chevron |
| `_JD Vance Master Profile` | Elon Musk, AIPAC, Koch Network - Charles Koch, _Jared Kushner, Miriam Adelson |
| `Marc Andreessen & Horowitz` | Peter Thiel, Crypto Industry Bloc, Narya Capital, _David Sacks Master Profile |

**Priority recommendation:** Leonard Leo and Judicial Crisis Network appear as unapproved wikilinks in three separate SCOTUS master profiles. These are central nodes in the judicial dark money layer — the SCOTUS section's analytical argument depends on them. Adding both to the approved publication scope would immediately improve the three SCOTUS profiles and the broader dark money narrative.

**Not blocking.** Dead links degrade the reading experience but do not violate any publication rule.

---

### Resolved — Previously Flagged Issues Confirmed Fixed

All five issues listed in the Publication Manifest as "Pre-Publication Fixes Required" are now resolved:

| Issue | Previous Status | Current Status |
|-------|----------------|---------------|
| `_Gavin Newsom Master Profile` missing content-readiness tag | NEEDS FIX | ✅ `ready` in YAML |
| `_Donald Trump Master Profile` missing content-readiness tag | NEEDS FIX | ✅ `ready` in YAML |
| `_JD Vance Master Profile` missing content-readiness tag | NEEDS FIX | ✅ `ready` in YAML |
| `_Pete Buttigieg Master Profile` empty tags line | NEEDS FIX | ✅ Tags populated |
| `_Jared Kushner Master Profile` dataview format | NEEDS FIX | ✅ Standard YAML (`ready`) |

---

### Full Scope Results by Category

#### Politician Master Profiles (37)

| Group | Count | Readiness |
|-------|-------|-----------|
| Democrats — CA Gov 2026 (9) | 9 | All `ready` |
| Democrats — Presidential (6) | 6 | All `ready` |
| Democrats — Senate/House (5) | 5 | All `ready` |
| Republicans — Presidential (3) | 3 | All `ready` |
| Republicans — Senate (4) | 4 | 3 `ready`, 1 `developed` (Graham) |
| Republicans — Governors (2) | 2 | All `ready` |
| Republicans — Trump Cabinet (3) | 3 | All `ready` |
| SCOTUS (6) | 6 | All `ready` |

**36 of 37 at `ready`. 1 at `developed` (Lindsey Graham).**

#### Trump Sub-Notes (40)

All 40 confirmed present. All at `ready`. Zero UNVERIFIED or URL NEEDED citations. One excluded section violation in `Project 2025` (ERROR above).

#### Newsom Sub-Notes (42)

All 42 confirmed present. All at `ready`. Zero UNVERIFIED or URL NEEDED citations. One malformed wikilink syntax issue in `CalRx` (WARNING above).

#### SCOTUS Sub-Notes (17)

All 17 confirmed present. All at `ready`. No excluded section violations. No broken links.

#### Donor Nodes (9 including Donor Registry)

8 of 9 at `ready`. Marc Andreessen & Horowitz at `developed` (intentional per manifest). Excluded section violations in a16z file (ERROR above).

#### Stories (30)

All 30 confirmed present. All at `ready`. Zero excluded section violations. Zero broken links.

---

### Epstein Exclusion Check

Confirmed: No Epstein content is in the approved publication scope.

| Vault | Publication Status |
|-------|-------------------|
| `GP-Epstein-Research/` (8 files) | ✅ Entirely excluded |
| `epstein_vault/` (15 files) | ✅ Entirely excluded |
| `Jeffrey Epstein Network.md` | ✅ HELD — not in manifest |

---

### Recommended Action Queue

**Before publication — required (3 items):**
1. `Project 2025 - The Blueprint They Followed.md` — convert `[[Heritage Foundation]]` and `[[Federalist Society]]` to plain text
2. `Marc Andreessen & Horowitz.md` — convert 5 Media & Influence Pipeline wikilinks to plain text
3. `CalRx - The Genuine Win With Caveats.md` — fix backslash syntax in 3 wikilinks

**Before publication — recommended (2 items):**
4. Promote `_Lindsey Graham Master Profile` from `developed` to `ready`
5. Add `Leonard Leo.md` and `Judicial Crisis Network.md` to approved publication scope — both appear as wikilinks in 3 separate SCOTUS profiles

**Next manifest update — suggested additions:**
6. Promote Kash Patel sub-notes to approved scope (master profile has 8+ dead links to unapproved sub-notes)
7. Add Miriam Adelson, Elon Musk, and AIPAC to approved donor scope — all appear as wikilinks in approved master profiles

---

### Audit Methodology

- All 181 files located by filename using recursive vault scan (1,386 total vault files indexed)
- Content-readiness verified via YAML frontmatter parse
- Wikilinks extracted with regex, each checked against full vault file index
- Excluded section check: files under `Media & Influence Pipeline/`, `Think Tanks & Policy Infrastructure/`, `Lobbying Firms & K Street/` flagged as violations
- Source quality: scanned for `(UNVERIFIED)` and `(URL NEEDED)` markers
- Tag presence verified post-YAML in file body
- Epstein exclusion: confirmed by checking manifest against both vault directories

---

content-readiness:: ready
