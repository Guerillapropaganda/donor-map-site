---
title: "2026-03-24 Vault Audit"
type: methodology
content-readiness: ready
last-updated: 2026-03-24
source-tier: null
parent: null
---

#vault-audit #vault-maintenance

### Vault Audit — March 24, 2026

First comprehensive automated audit of the Donor Map Database vault. No prior audit exists for comparison — this establishes the baseline.

---

### Statistics Dashboard

| Metric | Count | % |
|--------|-------|---|
| **Total files in topics/** | **815** | — |
| content-readiness: ready | 782 | 96.0% |
| content-readiness: draft | 18 | 2.2% |
| content-readiness: raw | 15 | 1.8% |
| content-readiness: developed | 0 | 0.0% |

| Type | Count | % |
|------|-------|---|
| sub-note | 298 | 36.6% |
| politician | 267 | 32.8% |
| donor | 93 | 11.4% |
| story | 61 | 7.5% |
| corporation | 39 | 4.8% |
| pac | 17 | 2.1% |
| daily-update | 16 | 2.0% |
| reference | 15 | 1.8% |
| index | 6 | 0.7% |
| methodology | 3 | 0.4% |

| Activity Metric | Value |
|-----------------|-------|
| Files updated last 7 days | 0 |
| Files updated last 30 days | 0 |
| Avg sources per ready file (20-file sample) | 7.54 |
| Total wikilinks in vault | 11,765 |
| Broken wikilinks | 1,875 |

> [!money] Note on `last-updated` dates: Zero files show updates in the last 30 days. This likely reflects that `last-updated` YAML fields were not updated during recent automated sessions (Sessions 30-43). The vault has been actively edited — the timestamps are stale.

---

### Critical Issues (Must Fix)

### 1. YAML/Footer Status Mismatches — 15 files (AUTO-FIXED)
All 15 mismatches were automatically resolved this session. YAML was treated as canonical. Files fixed:

- 9 files had YAML `ready` but footer `developed` — footers updated to `ready`
- 2 files had deprecated `placeholder` status in footer — updated to `raw`
- 2 files had invalid footer statuses (`redirect`, `reference`) — synced to YAML
- 1 file had malformed footer (`[status]`) — fixed
- 1 file had backwards mismatch (YAML `raw`, footer `ready`) — footer corrected to `raw`

### 2. Duplicate Files — 3 confirmed duplicates
Three donor nodes exist in both `Donors & Power Networks/` (top-level) and `Donors & Power Networks/Mega-Donors/` (proper location):

| Donor | Delete (top-level) | Keep (Mega-Donors) |
|-------|-------------------|-------------------|
| Leonard Leo | `Donors & Power Networks/Leonard Leo.md` | `Donors & Power Networks/Mega-Donors/Leonard Leo.md` |
| Miriam Adelson | `Donors & Power Networks/Miriam Adelson.md` | `Donors & Power Networks/Mega-Donors/Miriam Adelson.md` |
| Timothy Mellon | `Donors & Power Networks/Timothy Mellon.md` | `Donors & Power Networks/Mega-Donors/Timothy Mellon.md` |

Action required: Delete the 3 top-level copies. Verify no wikilinks point to the top-level versions first.

### 3. Broken Wikilinks — 1,875 broken links
The vault contains 11,765 wikilinks, of which 1,875 (15.9%) point to non-existent files. Major categories:

- Planned but unwritten donor nodes (MAGA Inc., Barre Seid, Supreme Court Capture, The 85 Fund, etc.)
- Cross-references to planned story/analysis files (Single Payer vs. Donor Class, The DOGE Agenda, etc.)
- References to Epstein vault files (separate vault, not resolvable from topics/)
- References to spreadsheet files (Master Donor Database.xlsx)
- Planned master profiles not yet created

This is partially by design — the vault uses placeholder wikilinks as build-out breadcrumbs. However, the 15.9% broken rate is high enough to warrant a triage pass.

### 4. Status Accuracy Failures — 3 of 20 sampled "ready" files fail criteria
| File | Deficiency |
|------|-----------|
| `Politicians/Democrats/Senate/Juliana Stratton/_Juliana Stratton Master Profile.md` | 0 source URLs, 0 ### sections — should be `raw` not `ready` |
| `The Donor Map Database.md` | 0 source URLs — index file, may be legitimately ready without sources |
| `Politicians/Democrats/Presidential/JB Pritzker/Offshore Trusts Toilet Schemes and the Tax Avoidance Architecture.md` | Only 47 lines (needs 50+) |

Spot-check pass rate: 85% (17/20). The Stratton profile is clearly miscategorized.

---

### Warnings (Should Fix)

### 5. Source Formatting Issues — 218 ready files have sources missing proper URLs
Many files have source sections but citations don't follow the required format: `[Source Name: Description](URL) (Tier X)`. Common patterns: missing markdown link syntax, truncated URLs, unclosed brackets.

### 6. Missing Tier Ratings — 201 ready files have sources without Tier labels
Sources exist with URLs but lack `(Tier 1-4)` designation. This blocks promotion validation and reader trust.

### 7. Files Missing Sources Section — 86 ready files
Includes reference/index files (legitimately sourceless) and some master profiles/sub-notes that should have sources. Needs triage to separate legitimate cases from gaps.

### 8. (URL needed) Flags — 4 files
- `Donors & Power Networks/Tech & Crypto/Valinor Enterprises.md`
- `Politicians/Democrats/Governors/Amy Acton/The COVID Tenure and the Political Fallout.md`
- `Stories/Vault Maintenance/Research Methodology and Data Sources.md`
- `Stories/Vault Maintenance/Sources Master Node.md`

### 9. Standalone Bold Headers — 507 files
Files use `**Bold Text**` as section headers instead of `### Header`. This is the vault's most widespread formatting deviation. Note: CLAUDE.md mandates `###` headers, but the Research Methodology doc says to use `**Bold Section Labels**` — these instructions conflict. Needs editorial ruling.

### 10. H1/H2 Header Violations — 59 files
H2 (`##`) is only sanctioned in the Session Timeline. 59 files use H1 or H2 headers elsewhere, mostly in index/README files and some politician/donor notes.

### 11. Missing `parent` YAML Field — 520 files
520 files lack a `parent` field entirely. The schema says this field is required (set to `null` for non-sub-notes). These are not errors per se — most are top-level files that correctly have no parent — but the field itself is absent. Low priority; add `parent: null` in bulk if strict schema compliance is desired.

### 12. Missing `source-tier` YAML Field — 39 files
Mostly index/reference files with no sources. Fix: add `source-tier: null`.

---

### Informational

### 13. Architectural Duplicates Requiring Verification
| Issue | Files | Action |
|-------|-------|--------|
| Mike Rogers — appears in both House/ and Senate/ | 2 master profiles | Verify: same person or different? (There are two Mike Rogers in Congress) |
| Alexander Acosta — appears in Presidential/ and Trump Cabinet/ | 2 master profiles | Verify content overlap; consolidate if identical |
| Joni Ernst — archive folder exists alongside current folder | 2 master profiles | Confirm archive is stale; delete if redundant |

### 14. Jeff Yass / Jeffrey Yass Duplicate
`Donors & Power Networks/Jeff Yass.md` and `Donors & Power Networks/Mega-Donors/Jeffrey Yass.md` — same person, different name formats. Should be consolidated.

### 15. Marc Andreessen — Two Donor Nodes
`Donors & Power Networks/Mega-Donors/Marc Andreessen and a16z.md` and `Donors & Power Networks/Tech & Crypto/Marc Andreessen & Horowitz.md` — likely same entity with different framing. Verify and consolidate.

### 16. Daily Updates vs. Research Logs — 237+ similar file pairs
Same-date research appears in both `Stories/Daily Updates/` and `Stories/Research Logs/` with 91-96% filename similarity. Needs editorial decision on whether these serve distinct purposes.

### 17. Valinor Enterprises — Appears in Two Directories
`Donors & Power Networks/Defense & Intelligence/Valinor Enterprises.md` and `Donors & Power Networks/Tech & Crypto/Valinor Enterprises.md` — same entity in two sector folders.

---

### Auto-Fixes Applied

| # | File | Fix Applied |
|---|------|------------|
| 1 | `Donors & Power Networks/_README.md` | Footer `content-readiness:: ready → `content-readiness:: ready` |
| 2 | `Politicians/Democrats/House/Pramila Jayapal.md` | Footer `developed` → `ready` |
| 3 | `Politicians/Democrats/House/Ro Khanna.md` | Footer `developed` → `ready` |
| 4 | `Politicians/Democrats/Senate/Amy Klobuchar.md` | Footer `developed` → `ready` |
| 5 | `Politicians/Democrats/Senate/Bob Casey.md` | Footer `developed` → `ready` |
| 6 | `Politicians/Democrats/Senate/John Fetterman.md` | Footer `developed` → `ready` |
| 7 | `Politicians/Democrats/Senate/Sherrod Brown.md` | Footer `developed` → `ready` |
| 8 | `Donald Trump/Surveillance/The Palantir State - Surveillance as Policy.md` | Footer `developed` → `ready` |
| 9 | `Donald Trump/Veterans & Military/Doug Collins.md` | Footer `placeholder` → `raw` |
| 10 | `Vivek Ramaswamy.md` | Footer `redirect` → `draft` |
| 11 | `Joni Ernst placeholder - archived.md` | Footer `placeholder` → `raw` |
| 12 | `Samuel Alito/_Samuel Alito Master Profile.md` | Footer `developed` → `ready` |
| 13 | `Methodology Compliance Audit - March 2026.md` | Footer `reference` → `draft` |
| 14 | `Vault Standards and Agent Instructions.md` | Footer `ready` → `raw` |
| 15 | `_SESSION_HISTORY_ARCHIVE.md` | Footer `developed` → `ready` |

---

### Comparison to Last Audit

No prior automated audit exists. This is the baseline. Key metrics to track going forward:

| Metric | Baseline (March 24, 2026) |
|--------|--------------------------|
| Total files | 815 |
| Ready files | 782 (96.0%) |
| Broken wikilinks | 1,875 (15.9% of 11,765) |
| YAML/footer mismatches | 0 (15 fixed this session) |
| Source formatting issues | 218 ready files |
| Missing tier ratings | 201 ready files |
| Confirmed duplicates | 3 (+ 4 requiring verification) |
| Spot-check pass rate | 85% |

---

### Recommended Priority Queue

1. **Delete 3 confirmed duplicates** (Leonard Leo, Miriam Adelson, Timothy Mellon top-level copies)
2. **Demote Juliana Stratton Master Profile** from `ready` to `raw`
3. **Resolve formatting instruction conflict** — CLAUDE.md says `###` headers, Research Methodology says `**Bold**`. Pick one.
4. **Triage broken wikilinks** — separate intentional breadcrumbs from errors
5. **Source citation formatting pass** — standardize the 218 files with malformed citations
6. **Verify architectural duplicates** (Mike Rogers, Alexander Acosta, Joni Ernst archive, Jeff/Jeffrey Yass, Marc Andreessen)
7. **Add missing `source-tier: null`** to 39 reference/index files
8. **Update `last-updated` timestamps** — current dates are stale across the vault
