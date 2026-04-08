---
title: "2026-03-27 Vault Audit"
type: reference
content-readiness: draft
last-updated: 2026-03-27
source-tier: null
parent: null
source-types:
  - Congress
known-gaps:
  - "No mapped relationships"
---

### 2026-03-27 Vault Audit — The Donor Map Database

**Run type:** Automated scheduled task (vault-audit)
**Date:** 2026-03-27
**Scope:** All `.md` files in `topics/` excluding Media & Influence Pipeline, Think Tanks & Policy Infrastructure, and Lobbying Firms & K Street
**Total files audited:** 1,286

---

### Executive Summary

The vault is in strong overall health. YAML integrity is near-perfect: zero files are missing frontmatter, zero files have missing required fields, and zero files have invalid content-readiness values. The `ready` rate is 88.6% (1,140 of 1,286 files). The primary findings are: (1) a systemic Tier label omission in source citations affecting the majority of files; (2) 93 files with bold headers that block `ready` promotion; (3) 285 broken wikilinks concentrated in a small number of files; and (4) a handful of duplicate donor nodes and a legacy `Stories/Daily Updates/` folder still present alongside the new `Stories/Internal/Daily Updates/` structure.

---

### 1. YAML Frontmatter Integrity

**Result: PASS (near-perfect)**

| Check | Files Affected |
|-------|---------------|
| Missing YAML entirely | 0 |
| Missing required fields | 0 |
| Invalid `type` value | 1 |
| Invalid `content-readiness` value | 0 |
| YAML vs. inline footer mismatch | 6 |

**Invalid type value (1 file):**

- `Vault Maintenance/API Pipeline.md` — type is `infrastructure`, which is not in the schema. Should be `methodology` or `reference`.

**YAML vs. inline footer mismatches (6 files):**

Three master profiles have a formatting artifact in their inline footer — a stray backtick appended to the status value (e.g., `ready\`` instead of `ready`). These are minor rendering issues but create false mismatches. Three vault maintenance files have genuine mismatches:

| File | YAML | Inline Footer |
|------|------|---------------|
| `Politicians/Republicans/Presidential/George W Bush/_George W Bush Master Profile.md` | `ready` | `ready\`` (backtick artifact) |
| `Politicians/Republicans/Presidential/John McCain/_John McCain Master Profile.md` | `ready` | `ready\`` (backtick artifact) |
| `Politicians/Republicans/Presidential/Mitt Romney/_Mitt Romney Master Profile.md` | `ready` | `ready\`` (backtick artifact) |
| `Vault Maintenance/Source URL Audit Log.md` | `ready` | `developed` |
| `Vault Maintenance/Vault Standards and Agent Instructions.md` | `ready` | `raw` |
| `Vault Maintenance/Archive/2026-03-18 Vault Audit.md` | `draft` | *(empty/missing)* |

**Recommended fixes:** Strip the backtick artifacts from the three master profiles. Reconcile the Source URL Audit Log (YAML says `ready`, inline says `developed` — the inline is probably more accurate given its evolving nature). Vault Standards file should be investigated: if `raw` inline reflects content state, demote YAML to match.

---

### 2. Content-Readiness Accuracy

**Result: MOSTLY PASS — 23 files over-promoted, 25 files potentially under-promoted**

#### Over-Promoted Files (23)

These files are marked `ready` but fail the promotion gate due to bold headers or UNVERIFIED tags:

**Vault Maintenance files (5) — bold headers or UNVERIFIED tags in reference docs:**
These are methodological/reference documents, not research content. The `ready` status for these is conventional (they're always-evolving). Flag for awareness but low-priority.

- `Vault Maintenance/2026-03-26 Vault Audit.md` — UNVERIFIED tags + bold headers
- `Vault Maintenance/Publication Audit Report.md` — UNVERIFIED tags + bold headers
- `Vault Maintenance/Publish Roadmap - The Donor Map Database.md` — UNVERIFIED tags (roadmap contains URL examples; expected)
- `Vault Maintenance/Quality Standards.md` — UNVERIFIED tags (the Standards doc *defines* the tag format; expected)
- `Vault Maintenance/Source URL Audit Log.md` — UNVERIFIED tags (by definition the log contains unverified entries)
- `Vault Maintenance/Research Methodology and Data Sources.md` — bold headers
- `Vault Maintenance/Vault Standards and Agent Instructions.md` — UNVERIFIED tags

**Donor nodes (9) — bold headers instead of `###`:**
- `Donors & Power Networks/Dark Money/American Action Network.md`
- `Donors & Power Networks/Dark Money/Ocean Conservancy.md`
- `Donors & Power Networks/Mega-Donors/David Sacks.md`
- `Donors & Power Networks/Mega-Donors/Gates Foundation.md`
- `Donors & Power Networks/Mega-Donors/Jeffrey Katzenberg.md`
- `Donors & Power Networks/Mega-Donors/Kelcy Warren - Energy Transfer Partners.md`
- `Donors & Power Networks/Mega-Donors/Patrick Soon-Shiong.md`
- `Donors & Power Networks/Mega-Donors/Susquehanna International Group.md`
- `Donors & Power Networks/Mega-Donors/Wilks Brothers.md`
- `Donors & Power Networks/Super PACs/Senate Leadership Fund.md`

**Politician master profiles (7) — bold headers instead of `###`:**
- `Politicians/Democrats/House/Jamaal Bowman/_Jamaal Bowman Master Profile.md`
- `Politicians/Democrats/Presidential/Bill Clinton/_Bill Clinton Master Profile.md`
- `Politicians/Democrats/Presidential/Hillary Clinton/_Hillary Clinton Master Profile.md`
- `Politicians/Democrats/Presidential/Tim Walz/_Tim Walz Master Profile.md`
- `Politicians/Democrats/Senate/Harry Reid/_Harry Reid Master Profile.md`
- `Politicians/Democrats/Senate/Tammy Baldwin/_Tammy Baldwin Master Profile.md`

#### Under-Promoted Files (25)

These files meet the `draft → developed` gate criteria (50+ lines AND 3+ URLs or sections) but are marked `draft` or `raw`:

The most notable case is `Donors & Power Networks/Dark Money/ALEC - Comprehensive Donor Profile Research.md` — 628 lines, 26 verified sources, 50 sections — this is functionally a `developed` or `ready` file marked `draft`. Recommend immediate review for promotion.

The bulk of under-promoted files are Daily Updates and Research Logs in `Stories/Internal/`. These internal working files being marked `draft`/`raw` is appropriate by convention — they are not intended for `ready` status. The status mismatch for these is a false positive.

The Session Timeline (`raw`, 16,664 lines) is a special case — it's a living operational log, and `raw` is probably intentional.

**High-priority promotion candidates:**
- `Donors & Power Networks/Dark Money/ALEC - Comprehensive Donor Profile Research.md` — promote to `developed`
- `Vault Maintenance/Connection Map Report.md` — 242 lines, 6 sections; currently `draft`, could be `developed` if citations added
- `Vault Maintenance/Archive/Vault Integrity Audit - Methodology and Tracker.md` — 339 lines, 32 sections; currently `raw`

---

### 3. Formatting Compliance

**Result: PARTIAL FAIL — Tier label omission is systemic; bold headers affect 93 files**

#### H1/H2 Headers in Body Content (13 files)

These files use `#` or `##` headers in the document body, which violates the `###`-only rule:

| File | Issue |
|------|-------|
| `Donors & Power Networks/Dark Money/ALEC - Comprehensive Donor Profile Research.md` | `##` section headers throughout |
| `Stories/_README.md` | `#` README header (acceptable for READMEs) |
| `Stories/Internal/Research Logs/2026-03-18 Finance Research.md` | `#` title header |
| `Stories/Internal/Research Logs/2026-03-21 Finance Research.md` | `#` title header |
| `Vault Maintenance/Session Timeline.md` | `##` section headers (operational doc — acceptable) |
| `Vault Maintenance/Source URL Audit Log.md` | `##` section headers (operational doc — acceptable) |
| `Vault Maintenance/_README - Topics Root.md` | `#` README header (acceptable) |
| `Vault Maintenance/_README.md` | `#` README header (acceptable) |
| `Vault Maintenance/_SESSION_HISTORY.md` | `#` title header |
| `Vault Maintenance/Archive/2026-03-18 Vault Audit.md` | `##` headers (archive — low priority) |
| `Vault Maintenance/Archive/Session Instructions.md` | `#` title header (archive) |
| `Vault Maintenance/Archive/crosslink_audit_report.md` | `#` title header (archive) |
| `Vault Maintenance/Archive/Search URL Upgrade Checklist.md` | `#` title header (archive) |

The ALEC research file is the only content file with this issue. READMEs, session logs, and archive files with H1/H2 are lower priority.

#### Bold Headers in Content Files (93 files)

This is the most widespread formatting violation. 93 files use `**Bold Text**` for section headers instead of `### Headers`. This is a legacy pattern from early vault builds. It directly blocks promotion to `ready` for those files marked as `ready`.

**By location:**

- Vault Maintenance: ~7 files
- Donors & Power Networks: ~40 files
- Politicians: ~40 files
- Stories: ~6 files

The full 93-file list is too long to enumerate here. The 23 over-promoted files above represent the subset that are already marked `ready` — those are the immediate priority. The remaining ~70 files are `developed` or lower, so the bold-header issue will naturally surface when they're promoted.

#### Source Citations Missing Tier Labels (systemic)

**1,201 of 1,286 files** contain at least one source citation that is missing a `(Tier X)` label. This is the single most widespread quality issue in the vault.

This appears to be a systemic pattern from early vault construction, where sources were written with URL links but without the Tier label appended. Example of the problem:

```
- [OpenSecrets: ADM organizational profile](https://www.opensecrets.org/...)
```

Should be:

```
- [OpenSecrets: ADM organizational profile](https://www.opensecrets.org/...) (Tier 1)
```

Note: Many of these are OpenSecrets, FEC, and Congress.gov citations which are clearly Tier 1. A bulk-addition pass could resolve the majority of these in a single session.

**Recommendation:** A dedicated "tier-label-pass" session should run a pattern-replacement across the vault, adding appropriate Tier labels to common source domains (OpenSecrets → Tier 1, FEC → Tier 1, ProPublica → Tier 2, etc.). This is not a blocking issue for most files since the Tier label requirement primarily gates `developed → ready` promotion — but given that 1,140 files are already marked `ready`, this represents a quality debt.

---

### 4. Wikilink Integrity

**Result: PARTIAL FAIL — 285 broken wikilinks across 1,286 files**

**Sample check (50 wikilinks):** 46 valid, 4 broken = **92% pass rate**
**Full check (13,897 wikilinks):** 13,612 valid, 285 broken = **97.9% pass rate**

#### Broken Link Categories

| Category | Count | Notes |
|----------|-------|-------|
| Missing master profiles | 58 | Politicians not yet built as profiles |
| Other missing content nodes | 215 | Donor nodes, sub-notes, topics not yet created |
| Epstein section links (internal) | 8 | Placeholders from multi-section Epstein file |
| Path-based wikilinks (unusual format) | 4 | Full path used instead of filename |

#### Top Missing Targets (referenced most frequently)

| Target | Refs | Action Needed |
|--------|------|---------------|
| `[[AIPAC - American Israel Public Affairs Committee]]` | 10 | File exists with different name — update links to use alias syntax |
| `[[_Tim Scott Master Profile]]` | 7 | Profile not built — create or mark as placeholder |
| `[[UnitedHealth Group - Optum]]` | 6 | Donor node not built |
| `[[_Nancy Pelosi Master Profile]]` | 6 | Profile not built |
| `[[SEIU - Service Employees International Union]]` | 5 | Donor node not built |
| `[[_Gavin Newsom Master Profile]]` | 5 | Profile not built |
| `[[Andreessen Horowitz]]` | 4 | Donor node not built |
| `[[Anduril Industries]]` | 4 | Donor node not built |
| `[[Blue Shield of California]]` | 4 | Donor node not built |
| `[[Anthem - Elevance Health]]` | 4 | Donor node not built |
| `[[League of Conservation Voters]]` | 4 | Donor node not built |
| `[[Donald Trump Master Profile]]` | 4 | Links using wrong syntax — should be `[[_Donald Trump Master Profile]]` |

**Files with most broken links:**

| File | Broken Links | Notes |
|------|-------------|-------|
| `Vault Maintenance/Connection Map Report.md` | 62 | Report references profiles/nodes not yet built — expected |
| `Vault Maintenance/Session Timeline.md` | 27 | Historical references to deleted/renamed files |
| `Stories/Internal/Research Logs/2026-03-25 Finance Research.md` | 19 | Draft research log |
| `Donors & Power Networks/Jeffrey Epstein Network.md` | 9 | Internal section links to Epstein vault structure |
| `Politicians/Republicans/House/John Boehner/_John Boehner Master Profile.md` | 9 | References to unbuilt profiles |

The Connection Map Report is the largest single source of broken links but it's an automatically generated reference document — its broken links reflect content gaps rather than errors in the document itself.

---

### 5. Duplicate Content Flags

Two potential duplicate sets identified:

**CoreCivic duplicate:**
- `Donors & Power Networks/Carceral State/CoreCivic - Private Prisons.md`
- `Donors & Power Networks/Carceral State/CoreCivic.md`

These appear to be two separate files covering the same entity. Recommend review: consolidate into a single authoritative node or merge content and delete the stub.

**California Farm Bureau duplicate:**
- `Donors & Power Networks/Agriculture/CA Farm Bureau Federation.md`
- `Donors & Power Networks/Agriculture/California Farm Bureau Federation.md`
- `Donors & Power Networks/Agriculture/American Farm Bureau Federation.md`

The third file covers the national federation (distinct). The first two cover the same state entity under different names. Recommend consolidating `CA Farm Bureau Federation.md` into `California Farm Bureau Federation.md` (the more complete name).

**Stories/Daily Updates legacy folder:**
`topics/Stories/Daily Updates/` still exists as a legacy location with 1 file (`2026-03-25 Election Cycle Update.md`). The canonical location is now `topics/Stories/Internal/Daily Updates/`. This orphan file should be moved to the Internal folder.

---

### 6. Status Distribution (Excluding Media Pipeline, Think Tanks, Lobbying Firms)

| Status | Count | Percentage |
|--------|-------|-----------|
| `ready` | 1,140 | 88.6% |
| `developed` | 102 | 7.9% |
| `draft` | 22 | 1.7% |
| `raw` | 22 | 1.7% |
| **Total** | **1,286** | **100%** |

### Type Distribution

| Type | Count |
|------|-------|
| `sub-note` | 424 |
| `politician` | 293 |
| `donor` | 223 |
| `corporation` | 155 |
| `story` | 79 |
| `pac` | 41 |
| `reference` | 26 |
| `daily-update` | 32 |
| `methodology` | 5 |
| `index` | 7 |
| `infrastructure` *(invalid)* | 1 |

---

### 7. Priority Action Items

**P1 — Fix Immediately (blocks ready status or creates confusion):**

1. Fix backtick artifacts in three master profile footers (George W Bush, John McCain, Mitt Romney)
2. Correct invalid type `infrastructure` → `methodology` on `API Pipeline.md`
3. Reconcile YAML/footer mismatch on `Source URL Audit Log.md` and `Vault Standards and Agent Instructions.md`
4. Convert bold headers → `###` in the 16 over-promoted content files (donor nodes + master profiles marked `ready`)
5. Move `Stories/Daily Updates/2026-03-25 Election Cycle Update.md` to `Stories/Internal/Daily Updates/`
6. Consolidate CoreCivic duplicate files
7. Consolidate CA/California Farm Bureau Federation duplicate files

**P2 — Near-Term (quality debt):**

8. Promote `ALEC - Comprehensive Donor Profile Research.md` from `draft` to `developed` (628 lines, 26 sources)
9. Fix the 10 broken `[[AIPAC - American Israel Public Affairs Committee]]` links — likely need alias syntax update
10. Fix 4 broken `[[Donald Trump Master Profile]]` links — should be `[[_Donald Trump Master Profile]]`
11. Build placeholder nodes for high-frequency missing targets: Tim Scott, Nancy Pelosi, Gavin Newsom, SEIU, UnitedHealth Group, Andreessen Horowitz, Anduril Industries

**P3 — Systemic (dedicated session):**

12. **Tier-label pass** — bulk-add `(Tier X)` labels to source citations across all files using domain-to-tier mapping. This resolves the single largest quality debt in the vault.
13. Convert remaining bold headers → `###` in the ~70 non-`ready` files with this issue
14. Review and fix remaining 215 "other broken wikilinks" — most are content gaps (nodes not yet built) rather than link errors

---

### Audit Notes

- Vault Maintenance files (Roadmap, Quality Standards, Source URL Audit Log, etc.) flagged as "over-promoted" due to UNVERIFIED tags are expected — these documents define and contain the tag syntax by design. Do not demote.
- The "under-promoted Daily Updates" are false positives — working files appropriately left at `draft`/`raw`.
- The 97.9% wikilink validity rate is strong. The 285 broken links are mostly content gaps (unbuilt profiles/nodes) rather than link errors, which is expected for a vault this size.
- The systemic Tier-label omission (1,201 files) looks severe but is largely an OpenSecrets/FEC citation pattern issue that can be resolved with a targeted batch pass.

---

content-readiness:: ready
