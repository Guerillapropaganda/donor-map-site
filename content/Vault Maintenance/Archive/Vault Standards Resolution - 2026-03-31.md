---
title: "Vault Standards Resolution — March 31, 2026"
type: methodology
content-readiness: ready
last-updated: 2026-03-31
source-tier: null
parent: null
---

### Vault Standards Resolution — March 31, 2026

This document records all contradictions identified across vault governing documents, the resolution for each, and the exact patches applied. It is the authoritative record of what changed and why.

---

### SECTION 1 — FINAL RULES

#### Rule 1: API Citation (unified)

**FEC individual contributions:** Cite the direct API endpoint with DEMO_KEY. The API link is the only URL that returns the complete, fuzzy-matched record. Include a technical disclaimer when the web interface shows fewer results.

**All other API-sourced data** (candidate totals, independent expenditures, USASpending, Congress.gov, Senate LDA): Cite the corresponding web interface URL, not the raw API endpoint. These web interfaces display the same underlying data in a browser-friendly format.

**Canonical format:**

```
FEC individual contributions:
- [FEC API: [Name] individual contributions ([N] results, $[total])](https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_name=[last]%2C+[first]&api_key=DEMO_KEY&per_page=100&sort=-contribution_receipt_date) (Tier 1)

All other API data:
- [FEC: [Name] candidate totals](https://www.fec.gov/data/candidate/[CANDIDATE_ID]/) (Tier 1)
- [USASpending: [Company] federal contracts](https://www.usaspending.gov/search/?hash=[search_hash]) (Tier 1)
- [Congress.gov: [Name] voting record](https://www.congress.gov/member/[name]/[bioguide_id]) (Tier 1)
- [Senate LDA: [Company] lobbying filings](https://lda.gov/filings/public/filing/search/?registrant=[name]) (Tier 1)
```

This rule is defined canonically in Quality Standards. API Pipeline and Research Methodology reference Quality Standards and do not restate the rule.

---

#### Rule 2: Content-Readiness "ready" (scoped)

**Content files** (`type: politician`, `sub-note`, `donor`, `pac`, `corporation`, `story`, `daily-update`): A file with any `(UNVERIFIED)` or `(URL NEEDED)` tags in its own source citations cannot be `ready`. No exceptions.

**System files** (`type: reference`, `methodology`, `index`): The `(UNVERIFIED)` / `(URL NEEDED)` gate applies only to the file's own source citations. References to, discussion of, or logging of these tags in other files does not block `ready` status.

**Enforcement:** Agents and audits must check the `type:` YAML field before applying the readiness gate. Content types are strict. System types are exempt from tag-string false positives.

---

#### Rule 3: API-First Fallback Hierarchy

When an agent needs quantitative data available via API:

1. **Chrome available + API endpoint reachable:** Execute API call via Chrome JS context. This is the default.
2. **Chrome available + API rate-limited or erroring:** Fall back to Chrome manual browsing of the same data source's web interface (e.g., FEC.gov web search). Mark data source as `(Web Interface — API unavailable)` in session report.
3. **Chrome unavailable entirely:** Do not attempt API calls. Do not attempt manual browsing. Use web search to locate the specific data point. If found via web search with a Tier 2+ source, cite that source at its actual tier (not Tier 1). If not found, mark the data gap as `(API DATA PENDING — Chrome required)` in the file and move to the next task.
4. **No data obtainable by any method:** Document the gap. Do not fabricate. Do not guess. Move on.

**Rule:** An agent must never block an entire session because Chrome is unavailable. Non-API work (formatting, wikilinks, analysis writing, editorial discussion) proceeds normally.

---

#### Rule 4: Document Authority Hierarchy

**For manual sessions (David present):**

| Priority | Document | Role |
|----------|----------|------|
| 1 | CLAUDE.md | Operating rules, schema, formatting, analytical patterns |
| 2 | Quality Standards | Source verification, readiness gates, citation format |
| 3 | API Pipeline | API endpoints, query patterns, citation URL mapping |
| 4 | State Engine Architecture | State definitions, execution rules, token optimization |
| 5 | Session Timeline | Session history, editorial direction, current priorities |
| 6 | Diff Log | Rolling change log — context for what changed recently |

**For automated state runs:**

| Priority | Document | Role |
|----------|----------|------|
| 1 | State Engine Architecture | State definitions, execution rules, stop conditions |
| 2 | Diff Log | Primary context — what changed, what to process next |
| 3 | Target file(s) | The file being worked on |
| — | CLAUDE.md, Quality Standards, API Pipeline | Referenced by state logic but NOT re-read every run |
| — | Session Timeline | Updated at end of day only. NOT read during automated runs. |

**Conflict resolution:** When two documents disagree, the higher-priority document wins. If CLAUDE.md and Quality Standards conflict, Quality Standards wins on source/citation matters; CLAUDE.md wins on everything else.

---

#### Rule 5: Data Layer vs. Analysis Layer

**Data layer (strict):** All quantitative claims, source citations, donation amounts, vote records, contract values, dates, and dollar figures. Rules:
- Every data point must be sourced with a Tier-rated citation
- No fabrication, no estimation without disclosure
- `(UNVERIFIED)`, `(URL NEEDED)`, `(API DATA PENDING)` tags are mandatory when data cannot be confirmed
- API-first for all available data types

**Analysis layer (interpretive, grounded):** Analytical claims, pattern identification, class analysis, `[!money]` and `[!contradiction]` callouts, story narratives. Rules:
- Every analytical claim must be grounded in one or more data-layer facts cited in the same file or a linked file
- Inference is permitted when the supporting data is cited. Example: "Koch donations preceded deregulation votes in 4 of 5 cases" is valid if the 4-of-5 data points are cited.
- Causal language ("purchased," "bought," "resulted in") is permitted in analytical sections when temporal mapping data supports the sequence. It must not appear in data-layer sections (timelines, tables, FEC records).
- Speculation is never permitted. "This suggests" is acceptable. "This proves" is not, unless a court ruling or official finding established causation.
- Story drafts may synthesize across multiple profiles. Every factual claim in a story must trace back to a cited source in a vault file.

**Boundary enforcement:** If an agent cannot determine whether a claim is data-layer or analysis-layer, treat it as data-layer (strict).

---

#### Rule 6: System Completion Terminology

**File-ready:** A single file's `content-readiness` status has reached `ready` per the gates in Quality Standards. This is a per-file measure.

**Section-ready:** All files in a vault section (e.g., Think Tanks, Lobbying Firms) have reached `ready`. This is a section-level measure.

**Publish-ready:** The vault meets ALL public launch criteria: 93%+ file-ready rate, zero `(UNVERIFIED)` tags, zero `(URL NEEDED)` tags in content files, no orphan notes, all defined-universe sections populated. This is a system-level measure.

**Scope-complete:** All phases in the Publish Roadmap are finished. The defined universe (Phases 1-12) is fully built. This is the long-term target.

Agents must use these terms precisely. "The vault is 90.5% file-ready" is correct. "The vault is 90.5% ready" is ambiguous and prohibited in session reports and automated outputs.

---

### SECTION 2 — PATCHES APPLIED

#### Patch 1: API Pipeline — Fix internal citation contradiction

**File:** `topics/Vault Maintenance/API Pipeline.md`
**Location:** Lines 51-58 (general FEC citation section)
**Action:** Replace the "CRITICAL: Never" blanket prohibition with a scoped rule that carves out FEC individual contributions. Add cross-reference to Quality Standards as the canonical source.

#### Patch 2: Quality Standards — Scope the READY gate

**File:** `topics/Vault Maintenance/Quality Standards.md`
**Location:** Line 138 (readiness gate rule)
**Action:** Replace the unscoped rule with a rule that distinguishes content files from system files using the `type:` YAML field.

#### Patch 3: Quality Standards — Add API fallback hierarchy

**File:** `topics/Vault Maintenance/Quality Standards.md`
**Location:** After the Chrome verification section (after line 84)
**Action:** Insert the API-first fallback hierarchy (Rule 3 above).

#### Patch 4: CLAUDE.md — Update Quick Start with dual-path reading

**File:** `CLAUDE.md` (vault root)
**Location:** Quick Start section
**Action:** Add automated-run path that references State Engine + Diff Log. Keep manual-session path unchanged. Add precedence hierarchy.

#### Patch 5: State Engine Architecture — Add inference boundary rule

**File:** `topics/Vault Maintenance/State Engine Architecture.md`
**Location:** After Execution Rules section
**Action:** Add data-layer vs. analysis-layer boundary definition for STORY and NODE BUILD states.

#### Patch 6: Session Timeline — Update role declaration

**File:** `topics/Vault Maintenance/Session Timeline.md`
**Location:** Lines 15-16 (purpose statement)
**Action:** Replace "Read this first" with scoped role: primary context for manual sessions, end-of-day summary for automated runs.

#### Patch 7: Research Methodology — Strip duplicated content

**File:** `topics/Vault Maintenance/Research Methodology and Data Sources.md`
**Action:** Remove all sections that duplicate CLAUDE.md, Quality Standards, or API Pipeline. Keep only unique content (external databases, research layers, analytical framework, cross-referencing task, cross-section integration, YAML expansion roadmap). Add cross-references to canonical sources. Reduce from ~233 lines to ~120.

#### Patch 8: Publish Roadmap — Add terminology precision

**File:** `topics/Vault Maintenance/Publish Roadmap - The Donor Map Database.md`
**Location:** Vault Status Dashboard header
**Action:** Replace "Ready" with "File-Ready" in dashboard display. Add terminology definitions.

---

### SECTION 3 — PRECEDENCE HIERARCHY

```
CLAUDE.md
  ↓ (overrides on source/citation matters only)
Quality Standards
  ↓
API Pipeline
  ↓
State Engine Architecture
  ↓
Session Timeline / Diff Log
  ↓
Research Methodology (reference only — no rules defined here)
  ↓
Publish Roadmap (status tracking — no rules defined here)
```

**Rule of origin:** Each rule lives in exactly one document. That document is the canonical source. Other documents may reference the rule via wikilink but must not restate it. When a rule is restated and the restatement drifts, the canonical source wins.

| Rule Domain | Canonical Source |
|-------------|-----------------|
| Vault structure, YAML schema, note anatomy, formatting | CLAUDE.md |
| Source verification, readiness gates, citation format | Quality Standards |
| API endpoints, query patterns, citation URL mapping | API Pipeline |
| State definitions, execution rules, automation | State Engine Architecture |
| Editorial direction, session history, current priorities | Session Timeline |
| File change tracking, automated context | Diff Log |
| Research layers, analytical framework, external databases | Research Methodology |
| Milestone tracking, phase planning, scope definition | Publish Roadmap |

---

### SECTION 4 — ENFORCEMENT NOTES

#### When agents encounter conflicting rules:

1. Check this resolution document for whether the conflict was already resolved
2. Apply the precedence hierarchy — higher-priority document wins
3. Check the "Rule of origin" table — the canonical source always wins over a restatement
4. If the conflict is not covered here, flag it to David with: the two conflicting statements, the documents they appear in, and which one the agent would follow if forced to choose

#### When agents encounter ambiguous terminology:

1. Use the terminology definitions in Rule 6 (file-ready, section-ready, publish-ready, scope-complete)
2. If a term is used ambiguously in a vault file, fix the usage in the same edit pass (touch-and-fix rule)

#### When automated runs hit Chrome unavailability:

1. Follow the fallback hierarchy in Rule 3
2. Do not block the entire run — proceed with non-API work
3. Log which API queries were skipped and why
4. Next run with Chrome available should prioritize skipped queries

#### When a file's type is ambiguous for readiness gating:

1. If `type:` YAML field is missing, treat as content file (strict rules apply)
2. If `type:` doesn't match the type taxonomy in CLAUDE.md, flag for STRUCTURING state to fix

---

### DOCUMENTS ELIMINATED OR REDUCED

#### Research Methodology — REDUCED (not eliminated)

**Reason:** ~50% of content duplicates CLAUDE.md, Quality Standards, and API Pipeline. When agents read all mandatory docs plus Research Methodology, they process the same source tier system, citation format, API summary, note formatting rules, and analytical patterns twice. This costs ~3,000 tokens per read with zero informational gain.

**What was removed:**
- API Pipeline summary (lines 21-38) — canonical source is API Pipeline.md
- Source tier system (lines 97-103) — canonical source is CLAUDE.md
- Source citation format and rules (lines 105-149) — canonical source is Quality Standards
- Note formatting rules (lines 162-171) — canonical source is CLAUDE.md
- Analytical patterns (lines 89-94, subset) — canonical source is CLAUDE.md

**What was kept:**
- External databases list (unique — not in any other doc)
- Research layers to build (unique analytical methodology)
- Analytical framework questions (unique — more specific than CLAUDE.md patterns)
- Class analysis lens (unique framing)
- Cross-referencing task (unique operational procedure)
- Cross-section integration protocol (unique — operational rules for linking)
- YAML expansion roadmap (unique)
- Version control (unique — but note: git path is stale)

**Result:** Research Methodology drops from mandatory reading to reference document. It is no longer in the Quick Start reading list. Agents consult it when doing cross-section integration or setting up research layers — not every session.

---

content-readiness:: ready
