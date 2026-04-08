---
title: "Methodology Compliance Audit - March 2026"
type: methodology
content-readiness: draft
last-updated: 2026-04-08
source-tier: null
parent: null
related: "[[Vault Integrity Audit - Methodology and Tracker]]"
---

tags: #story

#vault-maintenance #audit #methodology #compliance #analysis

related: [[Research Methodology and Data Sources]] [[Session Timeline]]

---

### METHODOLOGY COMPLIANCE AUDIT — March 21, 2026 (Updated)
Audit run against [[Research Methodology and Data Sources]] standards. 540+ files assessed. Updated from March 20 baseline after Sessions 12a-12h.

---

### COMPLIANCE SUMMARY
| Standard | Status | Coverage |
|----------|--------|----------|
| No H1/H2 headers | ⚠ Minor violation | 98.4% compliant — 5 files in [[_JD Vance Master Profile|JD Vance]] folder use H2 |
| Tags at top of file | ✓ Compliant | 100% |
| Related wikilinks | ✓ Compliant | 100% |
| Content-readiness markers | ✓ Substantial | 95%+ |
| `donors:` line in sub-notes | ⚠ **Major gap** | 14.4% — only 38 of 264 sub-notes |
| Inline sources with tier labels | ✓ Compliant | ~95%+ |
| Temporal mapping tables | ✓ **Substantially resolved** | ~80% — 76 of ~95 master profiles |
| Donor names → wikilinks | ⚠ Minor inconsistency | ~90% estimated |
| Underscore prefix on master profiles | ⚠ Minor gap | ~97% — [[_Roy Cooper Master Profile|Roy Cooper]], [[_Michael Whatley Master Profile|Michael Whatley]], [[_Juliana Stratton Master Profile|Juliana Stratton]] missing prefix |
| Vault Standards doc | ✓ **Created** | Canonical reference for all agent prompts |

---

### PRIORITY FIXES — ORDERED BY IMPACT
### 1. Add `donors:` line to all sub-notes (226 files missing)
Currently only [[_Kamala Harris Master Profile|Kamala Harris]] and [[_Bernie Sanders Master Profile|Bernie Sanders]] sub-notes consistently have `donors:` wikilinks. All Trump Cabinet, Senate, SCOTUS, and most other sub-notes lack them. This is the single largest gap between the vault and the methodology. Every sub-note should have a line like:

`donors: [[Koch Network - Charles Koch]] [[Club for Growth]] Heritage Action`

Affected folders (all sub-notes within):
- Politicians/Republicans/Trump Cabinet/ (all 9 master profile folders)
- Politicians/Republicans/Senate/ (McConnell, Cruz, Graham, Collins, Hawley, [[_Rick Scott Master Profile|Rick Scott]], Thune, Cotton)
- Politicians/SCOTUS/ (Thomas, Alito, Kavanaugh, Barrett)
- Politicians/Republicans/House/ (Johnson, Jordan)
- Politicians/Republicans/Presidential/ (Trump, Vance)
- Politicians/Democrats/Presidential/ (Pelosi — partial, Pritzker, Moore, Beshear, Shapiro)
- Politicians/Democrats/CA Governor 2026/ (Porter, Mahan, Steyer)

### 2. ~~Build temporal mapping tables into master profiles~~ — SUBSTANTIALLY RESOLVED
**Status as of March 21:** 76 of ~95 master profiles now have Donation-to-Policy Timeline tables (~80% coverage). Completed in Sessions 11h-11i (batch temporal mapping), 12c-12g (new profiles built with tables), and 12h (final 5: Steyer, Beshear, Moore, Netanyahu, Bianco). ~19 profiles still missing tables — mostly newer 2026 candidate profiles built in Sessions 12c-12g that may need temporal data added as FEC filings accumulate.

Remaining profiles without tables (estimated):
- Some 2026 Senate candidates (Cooper, Whatley, Stratton, Hinson, Mills, Husted, Osborn, Wahls, Platner, El-Sayed, McMorrow)
- Some 2026 House candidates (Biss, Bean, Miller, Lawler)
- Warren, Fetterman, Warnock, Ossoff (Senate incumbents added in 12c-12d)

Many of these newer profiles have temporal data embedded in prose but not structured as tables. Low priority — can be added as election cycle data accumulates.

---

content-readiness:: draft

### 3. Fix [[_JD Vance Master Profile|JD Vance]] folder H2 headers (5 files)
Files to fix:
- `_[[_JD Vance Master Profile|JD Vance]] Master Profile.md`
- `Hillbilly Elegy and the Class Fraud.md`
- `Narya Capital and the Venture Capital Pipeline.md`
- `The 2024 Tech Billionaire Network.md`
- `The Thiel Pipeline - From Yale to VP.md`

All `##` headers should be converted to `###` or replaced with `---` dividers and `**Bold Section Labels**`.

### 4. Audit donor name mentions → ensure wikilinks exist
Known gap: Steve Mnuchin mentioned by name in [[_Kamala Harris Master Profile|Kamala Harris]]/Prosecutor Record without wikilink or vault node. Likely more instances vault-wide. Requires systematic grep for donor names appearing without `Kash Patel, [[_Pam Bondi Master Profile|Pam Bondi]], [[_John Ratcliffe Master Profile|John Ratcliffe]]) but not standardized.
- **Geographic donor clustering** — flagging geographically disconnected donor bases. Documented narratively in some profiles (Graham 86% out-of-state, Collins 95% out-of-state) but not as structured data.
- **Legislative language layer** — ALEC/think tank model legislation matching. Not yet implemented in any profile.
- **Cross-politician contradiction mapping** — shared donors performing opposition. Not yet built as a standalone analysis. Data exists across profiles but not mapped systematically.

---

### CROSS-REFERENCING TASKS (from methodology — run periodically)
- [ ] Every donor node: list all connected politicians, flag shared-donor opposition pairs
- [ ] Every donation date: flag cases where policy outcome follows within 18 months
- [ ] Every politician note: grep for donor names without `[[` wikilinks

---

content-readiness:: draft
