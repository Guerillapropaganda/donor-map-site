---
title: "2026-03-26 Vault Audit"
type: reference
content-readiness: ready
last-updated: 2026-03-26
source-tier: null
parent: null
---

#vault-audit #vault-maintenance

### Vault Audit — March 26, 2026

**Type:** Automated scheduled task
**Scope:** All `.md` files in `topics/` excluding Media & Influence Pipeline, Think Tanks & Policy Infrastructure, and Lobbying Firms & K Street
**Files audited:** 1,258

---

### Status Distribution

| Status | Count | % of Total |
|--------|-------|------------|
| ready | 1,157 | 92.0% |
| developed | 65 | 5.2% |
| raw | 21 | 1.7% |
| draft | 15 | 1.2% |
| **Total** | **1,258** | **100%** |

---

### Type Distribution

| Type | Count |
|------|-------|
| sub-note | 420 |
| politician | 281 |
| donor | 221 |
| corporation | 156 |
| story | 78 |
| pac | 41 |
| reference | 25 |
| daily-update | 24 |
| index | 7 |
| methodology | 5 |

---

### 1. YAML Frontmatter Integrity

**Result: CLEAN**

- Missing YAML frontmatter: **0** files
- Malformed YAML: **0** files
- Missing required fields: **0** files
- Invalid `type` values: **0** files
- Invalid `content-readiness` values: **0** files

**YAML/Footer mismatch found (1):**

| File | YAML Status | Footer Status |
|------|-------------|---------------|
| `Vault Maintenance/Vault Standards and Agent Instructions.md` | ready | raw |

---

### 2. Content-Readiness Accuracy

### Over-Promoted Files: 57 content files marked `ready` with `(UNVERIFIED)` or `(URL NEEDED)` tags

Per Quality Standards: "A file with any `(UNVERIFIED)` or `(URL NEEDED)` tags cannot be `ready`."

**Worst offenders (4+ tags):**

| File | Unverified Tags |
|------|-----------------|
| `Dark Money/Democracy Alliance.md` | 4 |
| `Agriculture/CA Farm Bureau Federation.md` | 2 |
| `Mega-Donors/Reed Hastings.md` | 2 |
| `Gavin Newsom/Healthcare/COVID No-Bid Contracts - Blue Shield and UnitedHealth.md` | 2 |
| `House/_Josh Gottheimer Master Profile.md` | 2 |

**Full list by section:**

Donors & Power Networks (33 files): CA Farm Bureau Federation, Western Growers Association, America Votes, Brady Campaign, Business Council of Alabama, Center for American Progress, Demand Justice, Democracy Alliance, Environmental Law & Policy Center, Gun Owners of America, Media Matters, L3 Technologies, CTA - California Teachers Association, Alabama Power, Consumer Energy Alliance, Drummond Co, Lyft, Ohio AFL-CIO, Sinclair Broadcasting Group, Dustin Moskovitz, Reed Hastings, Reid Hoffman, Invitation Homes, Real Estate Board of New York, Affordable Chicago Now PAC, Democratic Governors Association, DonorsTrust, Elect Chicago Women PAC, SV&B PAC, Sentinel Action Fund, Susan B. Anthony Pro-Life America PAC, Trump Victory, JPMorgan Chase

Politicians (18 files): Tony Thurmond sub-note, Amy Acton (3 sub-notes), Gavin Newsom (4 sub-notes), Bennie Thompson, Jim Himes, Richard Neal sub-note, Josh Gottheimer, Barack Obama sub-note, Jack Reed, Chad Bianco sub-note, Frank Lucas, Trump Jan 6th sub-note

Stories (6 files): 2026-03-24 News Scan, Alaska/Florida/New Hampshire/South Carolina 2026 Senate Races, Ohio 2026 Donor Pipeline Comparison

**Action required:** These 57 files should be demoted to `developed` or have their UNVERIFIED/URL NEEDED sources verified via Chrome.

### Under-Promoted Files: 17 files

**Draft files that may qualify for `developed` (50+ lines AND 3+ sources or sections):**

| File | Lines | Sources | Sections |
|------|-------|---------|----------|
| `ALEC - Comprehensive Donor Profile Research.md` | 627 | 26 | 50 |
| `2026-03-26 Story Discovery.md` | 476 | 31 | 9 |
| `2026-03-25 Finance Research.md` | 363 | 21 | 17 |
| `2026-03-26 Finance Research.md` | 290 | 8 | 13 |
| `2026-03-26 Story Discovery Run 2.md` | 207 | 12 | 10 |
| `2026-03-25 Story Discovery.md` | 176 | 15 | 8 |
| `Connection Map Report.md` | 241 | 0 | 6 |

**Raw files that may qualify for `draft`:**

| File | Lines | Sources | Sections |
|------|-------|---------|----------|
| `2026-03-18 Finance Research.md` | 81 | 2 | 4 |
| `2026-03-21 Finance Research.md` | 78 | 0 | 7 |

**Note:** Session Timeline (9,354 lines) and archived audits are under-promoted by the metrics but are reference/maintenance files where status is less critical.

---

### 3. Formatting Compliance

### Bold Headers Instead of `###` (36 files in developed/ready)

Files using `**Bold Text**` as section headers instead of `###` headers. This blocks promotion to `ready` per vault rules.

**Highest counts:**

| File | Bold Headers |
|------|-------------|
| `AFL-CIO.md` | 7 |
| `Defense Contractors Bloc.md` | 6 |
| `Koch Industries.md` | 6 |
| `Blue Cross Blue Shield Association.md` | 6 |
| `Ohio Democratic Party.md` | 3 |
| `ALEC - American Legislative Exchange Council.md` | 2 |
| `CoreCivic - Private Prisons.md` | 2 |
| `Insurance Industry.md` | 2 |

Additional files with 1 bold header each: GEO Group, American Action Network, Business Roundtable, Judicial Crisis Network, National Association of Manufacturers, Trump Donor Coalition, US Chamber of Commerce, and 21 others.

### H1/H2 Headers (1 file)

| File | Issue |
|------|-------|
| `Stories/_README.md` | 3 H1/H2 headers (should use ###) |

---

### 4. Wikilink Integrity

**Sample size:** 50 random wikilinks from 13,295 total
**Valid:** 49 (98%)
**Broken:** 1 (2%)

**Broken wikilink found:**

| Source File | Target |
|-------------|--------|
| `Vault Maintenance/Connection Map Report.md` | `[[UnitedHealth Group - Optum]]` |

The target file does not exist under that exact name. Likely needs alias correction or the file needs to be created/renamed.

**Extrapolated estimate:** ~2% broken rate across 13,295 wikilinks suggests ~265 potentially broken links vault-wide. A full scan is recommended as a future task.

---

### 5. Total Unverified Source Tags

**172 total `(UNVERIFIED)` or `(URL NEEDED)` tags** across all auditable files.

This is the vault's outstanding verification debt. These tags must be resolved before the files containing them can be promoted to `ready`.

---

### Summary of Action Items

1. **57 over-promoted `ready` files** need either URL verification or demotion to `developed` — this is the highest-priority integrity issue
2. **172 unverified source tags** represent outstanding verification debt
3. **36 files** use bold headers instead of `###` — blocks `ready` compliance
4. **1 YAML/footer mismatch** in Vault Standards and Agent Instructions
5. **1 confirmed broken wikilink** (`UnitedHealth Group - Optum`); full wikilink scan recommended
6. **17 under-promoted files** may deserve status upgrades after review

### Vault Health Score

| Metric | Score | Notes |
|--------|-------|-------|
| YAML integrity | 100% | All 1,258 files have complete, valid YAML |
| Status accuracy | 95.4% | 57 over-promoted + 17 under-promoted = 74 files need review |
| Formatting compliance | 97.1% | 37 files with header issues out of 1,258 |
| Wikilink integrity | ~98% | 1/50 broken in sample |
| Source verification | 86.3% | 172 unverified tags across vault |

content-readiness:: ready
