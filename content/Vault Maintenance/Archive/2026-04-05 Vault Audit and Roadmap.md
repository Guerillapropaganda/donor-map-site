---
title: "2026-04-05 Vault Audit and Roadmap"
type: methodology
content-readiness: draft
last-updated: 2026-04-05
source-tier: 1
parent: null
known-gaps:
  - "No mapped relationships"
---

### Vault Audit and Roadmap: April 5, 2026

### Vault-Wide Statistics

| Metric | Count |
|--------|-------|
| Total .md files | 1,623 |
| Ready | 1,334 (82.2%) |
| Developed | 25 (1.5%) |
| Draft | 51 (3.1%) |
| Raw | 41 (2.5%) |
| No status / missing YAML | ~172 (10.6%) |

| Content Type | Count |
|--------------|-------|
| Politician master profiles | 254 |
| Sub-notes | 407 |
| Donor nodes | 229 |
| PACs | 43 |
| Corporations | 161 |
| Stories | 105 |
| Media profiles | (within 99 Media section files) |
| Think tanks | 33 |
| Lobbying firms | 24 |
| Reference/methodology | 45 |
| Daily updates | 40 |
| Index files | 11 |

### Section Health Breakdown

| Section | Files | Ready | Developed | Draft | Raw |
|---------|-------|-------|-----------|-------|-----|
| Donors & Power Networks | 447 | 419 | 3 | 11 | 13 |
| Politicians (all) | ~661 | ~490 | 15 | 8 | 0 |
| Think Tanks | 33 | 31 | 0 | 1 | 1 |
| Lobbying Firms | 24 | 24 | 0 | 0 | 1 |
| Media & Influence | 99 | 95 | 0 | 0 | 4 |
| Stories | 139 | 109 | 0 | ~22 | 4 |
| Events | 70 | varies | 0 | varies | 0 |

---

### Critical Issue: Em-Dashes

**1,388 files contain em-dashes.** This is the single largest formatting violation in the vault.

| Section | Files with em-dashes |
|---------|---------------------|
| Politicians | 604 |
| Donors & Power Networks | 418 |
| Stories | 135 |
| Media & Influence | 99 |
| Think Tanks | 33 |
| Lobbying Firms | 24 |
| Root-level files | 8 |

The state-structuring daily task handles this, but at its current pace it cannot clear 1,388 files. This needs a dedicated batch pass.

---

### Source Health

| Issue | Count |
|-------|-------|
| Files with (UNVERIFIED) tags | 77 |
| Files with (URL NEEDED) flags | 30 |
| Files with broken URLs | 5 |

The 77 UNVERIFIED files are a mix of new Obama builds (expected, pending Chrome verification) and older donor/PAC nodes that were built without load-testing.

---

### Ghost Profiles: Directories Exist, Files Don't

These 24 politician profiles have folder structures and planned sub-notes but the actual .md files are empty or missing. They show "No such file or directory" errors when grepped, meaning Obsidian shows them in the file tree but they have no content.

**Democrats (10):**
Pete Buttigieg (3 planned files), Andy Beshear (3), Gretchen Whitmer (3), JB Pritzker (4), Josh Shapiro (4), Tim Walz (1), Wes Moore (3), Hillary Clinton (1), Kamala Harris (5), Bernie Sanders (5, Independent but listed here)

**Republicans (5):**
Nikki Haley (3), Ron DeSantis (3), John McCain (1), Mitt Romney (1), JD Vance (5)

**CA Governor 2026 Race (9):**
Antonio Villaraigosa (2), Betty Yee (2), Chad Bianco (2), Eric Swalwell (2), Katie Porter (6), Matt Mahan (5), Tom Steyer (5), Tony Thurmond (2), Xavier Becerra (2)

**Total ghost files: ~72 across 24 politicians**

These were likely planned by the state-node-build task but never completed. The directories and filenames were created as placeholders.

---

### Profiles Without content-readiness (Built But Unrated)

**91 master profiles** have YAML frontmatter but no content-readiness field set. These are "built but unclassified" and range from 112 to 307 lines. They need status assessment and promotion.

Key names in this group: Barack Obama (247L), Joe Biden (228L), AOC (226L), Hakeem Jeffries (215L), Gavin Newsom (204L), Lindsey Graham (187L), Jared Kushner (190L), Joni Ernst (192L), Frank Lucas (307L), Kay Granger (202L), all 6 SCOTUS justices, and many Trump Cabinet members.

---

### Developed Files (25 total, promotable?)

These sit between draft and ready. Most are Obama-related (in-progress tonight) or Biden sub-notes:

**Obama (13):**
Deportation Machine, DACA, ACA, Term Comparison, Executive Orders, PhRMA Deal, Race to the Top, Infrastructure/ARRA, Bank Bailout, Donor Network, Dodd-Frank, ACA Insurance Capture, Climate/All of the Above

**Biden (5):**
CHIPS Act, IRA Climate, Student Loans, Executive Orders, Afghanistan, Donor Network

**Other (7):**
Wall Street Finance Networks, Richard Uihlein (donor), Carlos Gimenez, Trump Term Comparison, API Pipeline, State Engine Architecture

---

### Obama Dossier Merge Status

**Source:** `obama-policy-dossiers.md` (2,124 lines, 18 domains)

| Domain | Task | Status |
|--------|------|--------|
| Housing/HAMP | Manual build | Done (prior session) |
| Drones/Defense | Manual build | Done (prior session) |
| Education/Race to the Top | obama-education | Done |
| Climate/Environment | obama-climate | Done |
| Auto Bailout | obama-auto-bailout | Running now |
| Labor | obama-labor | Running now |
| Trade/TPP | obama-trade-tpp | Running now |
| Judicial | obama-judicial | Running now |
| Civil Rights | obama-civil-rights | Running now |
| Pharmaceutical | obama-pharmaceutical | Running now |
| Infrastructure/ARRA | obama-infrastructure | Running now |
| ACA Refresh | obama-aca-refresh | Running now |
| Dodd-Frank Refresh | obama-dodd-frank-refresh | Running now |
| DACA Refresh | obama-daca-refresh | Queued (manual) |
| Deportation Refresh | obama-deportation-refresh | Queued (manual) |
| Silicon Valley Refresh | obama-silicon-valley-refresh | Queued (manual) |
| Post-Presidency Refresh | obama-post-presidency-refresh | Queued (manual) |

**Remaining Obama dossier files not yet merged:**
obama-donor-profile.md (440 lines), obama-executive-actions-catalog.md (525 lines), obama-term-comparison.md (129 lines)

---

### Downloads Inventory: Unprocessed Dossiers

| File | Lines | Target Section |
|------|-------|---------------|
| biden-policy-dossiers.md | 1,524 | Biden profile (same treatment as Obama) |
| biden-executive-actions-complete.md | 4,444 | Biden EO catalog |
| dossier-01-elon-musk.md | 544 | Donor node |
| dossier-02-timothy-mellon.md | 573 | Donor node |
| dossier-06-kenneth-griffin.md | 478 | Donor node |
| dossier-07-yass.md | 626 | Donor node |
| dossier-11-peter-thiel.md | 632 | Donor node |
| dossier-12-wyss.md | 653 | Donor node |
| dossier-B01-aipac-udp.md | 584 | PAC node |
| dossier-B02-democracy-pac.md | 532 | PAC node |
| research-dossier-tier-a-complete.pplx.md | 9,163 | Top 15 donors (reference) |
| research-dossier-tier-a.pplx.md + (1) | 9,057 | Partial earlier versions |
| research-dossier-tier-b.pplx.md | 5,677 | Money networks/PACs |
| research-dossier-tier-c.md | 13,408 | Think tanks/policy factories |

**Total unprocessed: ~48,895 lines across 15 files**

---

### Priority Roadmap

**Immediate (this weekend):**
1. Let tonight's 9 running Obama tasks complete
2. Fire the 4 manual refresh tasks (DACA, Deportation, Silicon Valley, Post-Presidency)
3. QA all 15 Obama outputs once complete
4. Merge remaining 3 Obama supplemental files (donor profile, EO catalog, term comparison)

**Short-term (next week):**
5. Assess and set content-readiness on the 91 unrated master profiles
6. Em-dash batch cleanup (1,388 files, needs dedicated sweep task)
7. Start Biden dossier merge (1,524 lines across ~12 policy domains)
8. Build out the 6 individual donor dossiers into vault nodes (Musk, Mellon, Griffin, Yass, Thiel, Wyss)
9. Build AIPAC and Democracy PAC nodes from dossiers

**Medium-term (next 2 weeks):**
10. Build ghost profiles: start with high-priority names (Kamala Harris, Bernie Sanders, JD Vance, Katie Porter, Josh Shapiro, JB Pritzker)
11. Process research-dossier-tier-a-complete (9,163 lines) for remaining top donors
12. Process research-dossier-tier-b (5,677 lines) for PAC/money network expansion
13. Process research-dossier-tier-c (13,408 lines) for think tank section

**Ongoing (daily tasks handling):**
state-structuring (6 AM): YAML/wikilinks/headers
state-node-build (9 AM): Profile expansion
state-story (12 PM): Story discovery
state-validate (3 PM): Connection mapping + source verification

---

### Active Daily Tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| state-structuring | 6 AM daily | YAML, wikilinks, headers audit |
| state-node-build | 9 AM daily | Profile expansion (1 target/day) |
| state-story | 12 PM daily | Story discovery + weekly roundup |
| state-validate | 3 PM daily | Connection mapping + source verification |

### Disabled Legacy Tasks (available to re-enable)

url-verification, profile-builder, url-fix-broken, weekly-roundup-compiler, publish-audit, crossover-analysis, media-profile-builder, think-tank-builder, lobbying-firm-builder, election-cycle-updater, connection-mapper, profile-freshness-checker
