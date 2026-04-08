---
title: "State Engine Architecture — The Donor Map Database"
type: methodology
content-readiness: draft
last-updated: 2026-04-05
source-tier: null
parent: null
known-gaps:
  - "No mapped relationships"
---

### State Engine Architecture

This document replaces the current task-based automation model with a state-driven execution system. All vault work — automated or manual — flows through one of five states. No task runs independently. No state is skipped.

---

### The Problem

The current system has 20 scheduled tasks. 14 are enabled and running hourly or every 2 hours. They operate independently, repeat context loading, reprocess unchanged files, and produce overlapping outputs. The result:

- **Token waste.** Every task reads CLAUDE.md, Session Timeline, Quality Standards, and API Pipeline from scratch. That's ~18,000 tokens of context before any work begins — multiplied by 14 tasks × multiple runs per day.
- **Redundant processing.** `thin-profile-expansion`, `donor-node-builder`, `profile-builder`, `media-profile-builder`, `think-tank-builder`, and `lobbying-firm-builder` all do the same thing (expand a profile) in different sections. Six tasks, one function.
- **No coordination.** `url-fix-broken` runs hourly even though it reported 0 broken URLs on March 27. `url-verification` runs every 2 hours on a vault with 1 UNVERIFIED URL (The Block, structurally unverifiable). `profile-freshness-checker` and `connection-mapper` both identify the same cross-section gap.
- **No stop conditions.** Tasks that completed their objective (url-fix-broken, table-format-retrofit) keep running or were only manually disabled.
- **Session Timeline bloat.** Every automated run appends 50-100 lines to the Session Timeline. At current rate: ~1,000+ lines/day of automated entries.

---

### System Diagram

```
                    ┌─────────────────────┐
                    │   TRIGGER LAYER     │
                    │                     │
                    │  David's command    │
                    │  Scheduled cron     │
                    │  File change detect │
                    └────────┬────────────┘
                             │
                             ▼
                    ┌─────────────────────┐
                    │   STATE ROUTER      │
                    │                     │
                    │  Reads vault index  │
                    │  Checks diff log    │
                    │  Selects state      │
                    │  Selects targets    │
                    └────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ STRUCTURING│  │ NODE BUILD │  │   STORY    │
     │            │  │            │  │            │
     │ Format     │  │ Expand     │  │ Discover   │
     │ YAML fix   │  │ Research   │  │ Draft      │
     │ Link audit │  │ Source     │  │ Adapt      │
     │ Header fix │  │ Promote    │  │ Compile    │
     └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │    CONNECTION MAPPING     │
              │                          │
              │  Cross-section links     │
              │  Reciprocal wikilinks    │
              │  Hub node integration    │
              │  Shared-donor bridging   │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │       VALIDATION         │
              │                          │
              │  Source verification     │
              │  Publication audit      │
              │  Freshness check        │
              │  Status accuracy        │
              └──────────────────────────┘
```

**Flow rule:** STRUCTURING → NODE BUILD / STORY → CONNECTION MAPPING → VALIDATION. Any state can be entered directly by David's command (`STATE: X`). Automated runs follow the flow. No state runs out of order in automated mode.

---

### State Definitions

#### STATE: STRUCTURING

**Purpose:** Fix structural problems. Format compliance, YAML errors, wikilink syntax, header formatting. Does NOT process URLs, that is VALIDATION's job.

**When to enter:**
- Vault audit detects structural errors
- New files added without proper YAML
- David commands `STATE: STRUCTURING`

**Operations:**
- Fix YAML frontmatter (missing fields, wrong types, status mismatches)
- Fix broken/malformed wikilinks (backslash syntax, missing aliases, unresolved links)
- Retrofit table formats to standard (Format 1-4)
- Standardize ### headers (convert bold headers)
- Reconcile YAML `content-readiness` with inline footer tags

**Scope boundaries:**
- Does NOT process URLs or dead link inventory (owned by VALIDATION)
- Does NOT Chrome-verify URLs (owned by VALIDATION)
- Does NOT promote content-readiness status (owned by VALIDATION)

**Exit condition:** Zero structural errors in targeted files. Log changes to diff log. Do not proceed to NODE BUILD if structural errors remain.

**What this replaces:**
- `table-format-retrofit` (ELIMINATED — completed, disabled)
- `url-fix-broken` (ABSORBED into VALIDATION's Audit Log queue)
- `vault-audit` structural fixes (ABSORBED — audit triggers this state)

---

#### STATE: NODE BUILD

**Purpose:** Expand profiles. One unified builder for all six vault sections. No section-specific task logic.

**When to enter:**
- Vault contains raw/draft/thin profiles needing expansion
- New data available (FEC filing, news event, story discovery output)
- David commands `STATE: NODE BUILD`
- Automated schedule (see Recommended Schedule below)

**Operations:**
- Select target by priority score: `(reference_count × missing_sections) + age_penalty`
- Read target file only (not full vault context)
- Research via API-first, then Chrome verification
- Write incremental additions (append sections, not rewrite)
- Update YAML `content-readiness` and `last-updated`
- Log to diff log (file, lines added, sources added, status change)

**Target selection rules:**
1. Raw files with 3+ incoming wikilinks → highest priority
2. Draft files missing required sections → second priority
3. Developed files meeting ready-promotion gates → third priority
4. Ready files with stale data (last-updated > 30 days, high reference count) → fourth priority

**Section-agnostic:** The same logic builds a politician profile, donor node, media personality, think tank, or lobbying firm. The file's `type:` field in YAML determines which note anatomy template to follow. No separate task per section.

**Exit condition:** Target file advanced one status level OR all available data exhausted for target. Log result. Move to next target or exit.

**What this replaces:**
- `donor-node-builder` (ELIMINATED)
- `profile-builder` (ELIMINATED)
- `media-profile-builder` (ELIMINATED)
- `think-tank-builder` (ELIMINATED)
- `lobbying-firm-builder` (ELIMINATED)
- `thin-profile-expansion` (ELIMINATED)
- `finance-research` (ABSORBED — FEC/API pulls happen inside NODE BUILD when target needs data)
- `election-cycle-updater` (ABSORBED — cycle data pulled when target is a politician with stale FEC numbers)

**Six tasks → one state.** The section-specific builders were doing identical work with different file paths.

---

#### STATE: STORY

**Purpose:** Discover, draft, and adapt analytical content. Covers both vault story discovery and Substack content pipeline.

**When to enter:**
- Scheduled story scan (see Recommended Schedule)
- David commands `STATE: STORY`
- Diamond/Gold-tier story identified in prior scan

**Operations:**
- **Discover:** Scan news sources for donor-to-policy stories. Cross-reference against existing vault profiles. Classify Diamond/Gold/Silver/Bronze. Output to Daily Updates.
- **Draft:** Write analytical pieces from discovered stories or David's editorial direction. Output to Stories/Published/.
- **Adapt:** Convert ready vault profiles into Substack-format drafts. Output to Guerilla Propaganda/Substack Ready/.
- **Compile:** Weekly roundup from scan findings. Output to Guerilla Propaganda/Substack Ready/.

**Exit condition:** All discovered stories classified and logged. Adapted drafts saved. No story work runs without either (a) a new discovery, or (b) David's direction.

**What this replaces:**
- `story-discovery` (ABSORBED)
- `substack-content-adapter` (ABSORBED)
- `weekly-roundup-compiler` (ABSORBED)
- `crossover-analysis` (ABSORBED — crossover pieces are a STORY subtype)

---

#### STATE: CONNECTION MAPPING

**Purpose:** Link the vault's sections together. Add missing wikilinks, build reciprocal connections, integrate hub nodes across all six sections.

**When to enter:**
- After NODE BUILD adds new profiles or expands existing ones
- After STORY creates pieces that reference multiple profiles
- Connection audit identifies gaps
- David commands `STATE: CONNECTION MAPPING`

**Operations:**
- Scan modified files for entities that should be wikilinked
- Add outgoing wikilinks from hub nodes to new section profiles
- Add reciprocal wikilinks (if A references B, B should reference A)
- Flag shared-donor connections between politicians who don't link to each other
- Update `related:` fields in modified files

**Targeting rule:** Only process files modified since last CONNECTION MAPPING run (check diff log). Do not re-scan the full vault.

**Exit condition:** All modified files have complete cross-section links. Reciprocal link count logged. Hub node integration score updated.

**What this replaces:**
- `connection-mapper` (ABSORBED)
- `profile-freshness-checker` (ABSORBED — freshness = stale connections, handled here)

---

#### STATE: VALIDATION

**Purpose:** Verify everything. Source URLs, publication readiness, status accuracy, content quality. Process broken link queues.

**When to enter:**
- Before any file is promoted to `ready`
- Before publication batch goes live
- After any NODE BUILD or CONNECTION MAPPING run
- David commands `STATE: VALIDATION`
- A `*Broken Links*` file exists in `topics/Vault Maintenance/`

**Phase 0 — Source URL Repair + Verification:**

**URL health baseline (April 5, 2026):** A full external scan of 11,544 vault URLs was completed by Perplexity. 1,080 verified fixes (redirects + researched replacements) were applied directly to vault source files. 404 dead source URLs remain cataloged in `Vault Maintenance/dead-source-urls-for-perplexity.csv`. This CSV is the canonical dead-URL inventory, replacing the retired Source URL Audit Log.

**Current workflow for VALIDATION URL repair:**

VALIDATION can still use the `url-fixer` skill for individual URL repairs when Chrome is available. The skill processes one URL per invocation using a single-pass pipeline that prevents hallucination. The full pipeline and rules are documented in the skill.

**Integration rules:**
- Process 1-3 URLs per automated VALIDATION run. Token budget matters.
- Priority order: `(UNVERIFIED)` tags in files closest to `ready` → `(URL NEEDED)` in hub nodes → `(URL NEEDED)` in `developed` files → everything else.
- API triage first: if the citation's underlying claim is API-resolvable (donations, votes, contracts, lobbying), replace with an API citation (Tier 1). This skips the search+verify cycle entirely.
- Non-API citations: WebSearch for the article, Chrome-verify the candidate URL loads, then write. Three search attempts max.
- Before searching, check `dead-source-urls-for-perplexity.csv` to see if the URL is a known dead link (saves wasted search cycles).
- Never fabricate URLs. Never guess article slugs or IDs.

**Bulk URL repair:** Handled externally by Perplexity batch scans, not by Claude session-by-session. When David provides a new Perplexity scan, fixes are applied in bulk via Python script. This replaced the old Claude-based URL checker which was heavy on token consumption.

**Phase 1 — Standard Validation Operations:**
- Chrome-verify source URLs in targeted files (prioritize `(UNVERIFIED)` tags)
- Check content-readiness gates (line count, source count, section count, class analysis)
- Verify all wikilinks resolve
- Check YAML/footer status match
- Flag files that fail validation with specific failure reasons
- Log changes to Diff Log

**Exit condition:** Queue batch processed (if queue exists). All targeted files pass or have documented failure reasons. No file promoted to `ready` without passing VALIDATION.

**What this replaces:**
- `url-verification` (ABSORBED)
- `publish-audit` (ABSORBED)
- `vault-audit` quality checks (ABSORBED)

---

### Task Refactor — Complete Mapping

#### ELIMINATED (6 tasks)

| Task | Reason | Action |
|------|--------|--------|
| `donor-node-builder` | Redundant — same function as 5 other builders | Disable. Logic absorbed by NODE BUILD. |
| `profile-builder` | Redundant | Disable. Logic absorbed by NODE BUILD. |
| `media-profile-builder` | Redundant | Disable. Logic absorbed by NODE BUILD. |
| `think-tank-builder` | Redundant | Disable. Logic absorbed by NODE BUILD. |
| `lobbying-firm-builder` | Redundant | Disable. Logic absorbed by NODE BUILD. |
| `thin-profile-expansion` | Redundant — subset of NODE BUILD | Disable. Logic absorbed by NODE BUILD. |

#### ABSORBED INTO STATES (10 tasks)

| Task | Absorbed Into | Notes |
|------|---------------|-------|
| `table-format-retrofit` | STRUCTURING | Already disabled. Completed its objective. Remove. |
| `url-fix-broken` | STRUCTURING | Only runs when broken URLs exist. Currently 0 broken. Disable. |
| `vault-audit` | STRUCTURING + VALIDATION | Split: structural fixes → STRUCTURING, quality checks → VALIDATION |
| `finance-research` | NODE BUILD | FEC/API pulls happen when a target needs data, not on a schedule |
| `election-cycle-updater` | NODE BUILD | Cycle updates happen when politician profiles are targeted |
| `url-verification` | VALIDATION | Runs inside VALIDATION, not independently |
| `publish-audit` | VALIDATION | Pre-publication check is a VALIDATION subtype |
| `connection-mapper` | CONNECTION MAPPING | Direct absorption |
| `profile-freshness-checker` | CONNECTION MAPPING | Freshness = stale connections |
| `story-discovery` | STORY | Direct absorption |

#### ABSORBED INTO STORY STATE (3 tasks)

| Task | Notes |
|------|-------|
| `substack-content-adapter` | Runs inside STORY when David directs content adaptation |
| `weekly-roundup-compiler` | Runs inside STORY on Friday schedule |
| `crossover-analysis` | Crossover pieces are STORY subtypes, not separate tasks |

#### KEPT AS MANUAL TRIGGER ONLY (1 task)

| Task | Notes |
|------|-------|
| `outreach-list-builder` | Not vault work. Runs only on David's command. No schedule needed. |

---

### Recommended Schedule — After Refactor

**From 20 tasks → 4 scheduled entries + manual triggers**

| Schedule | State | What It Does |
|----------|-------|-------------|
| **Daily 6:00 AM** | STRUCTURING | Structural audit + fix pass. Runs only if errors detected. If clean, exits in <30 seconds. |
| **Daily 9:00 AM** | NODE BUILD | Picks highest-priority target. Builds one profile per run. Logs to diff log. |
| **Daily 12:00 PM** | STORY | Story discovery scan. Classify findings. Adapt ready profiles to Substack if queue exists. Weekly roundup on Fridays. |
| **Daily 3:00 PM** | CONNECTION MAPPING + VALIDATION | Links files modified today. Validates any files promoted during NODE BUILD. |

**Manual triggers (David's command only):**

| Command | What It Does |
|---------|-------------|
| `STATE: STRUCTURING` | Run structural fix pass on demand |
| `STATE: NODE BUILD` | Build/expand a specific target or let router pick |
| `STATE: NODE BUILD [target]` | Build a named target (e.g., `STATE: NODE BUILD Goldman Sachs`) |
| `STATE: STORY` | Discover stories or draft content |
| `STATE: STORY ADAPT [profile]` | Adapt a specific profile to Substack format |
| `STATE: CONNECTION MAPPING` | Run cross-section link integration |
| `STATE: VALIDATION` | Run full validation pass |
| `STATE: VALIDATION [target]` | Validate a specific file |

---

### Token Optimization Rules

#### Rule 1: No Full-Vault Context Loading

**Current cost:** Every task reads CLAUDE.md (~3,000 tokens) + Session Timeline (~18,000 tokens) + Quality Standards (~2,000 tokens) + API Pipeline (~2,000 tokens) = ~25,000 tokens before any work.

**New rule:** Automated state runs read only:
- This document (State Engine Architecture) — ~2,000 tokens
- The diff log (last 20 entries) — ~500 tokens
- The target file — variable

Session Timeline is updated at end of day, not per-run. Quality Standards and API Pipeline are referenced by state logic, not re-read every run.

**Estimated savings:** ~22,000 tokens per automated run × 4 runs/day = ~88,000 tokens/day saved on context alone.

#### Rule 2: Diff-Based Processing Only

**Current problem:** Tasks scan entire sections to find work. `url-verification` scans all vault files for UNVERIFIED tags. `thin-profile-expansion` scans all Mega-Donors/ files to find thin stubs.

**New rule:** Maintain a diff log at `topics/Vault Maintenance/Diff Log.md`. Every state logs:

```
| Date | State | File | Action | Lines Changed | Status Before → After |
```

The state router reads the diff log to determine what changed. States only process files that (a) are new since last run, (b) were modified since last run, or (c) are explicitly targeted by David.

**Full scans** happen only in VALIDATION state, and only when David commands `STATE: VALIDATION` without a target (pre-publication audit).

#### Rule 3: Incremental Writes, Not Full Rewrites

**Current problem:** Profile builders read a file, regenerate understanding of its contents, then append. Token cost scales with file size even when adding 10 lines to a 200-line file.

**New rule:**
- Read only the sections relevant to the addition (use offset/limit on Read tool)
- Append new sections using Edit tool (targeted insertion, not full rewrite)
- Never regenerate existing content unless David explicitly requests a rewrite
- Maximum output per automated run: 1 file modified, 100 lines added

#### Rule 4: Compressed Session Timeline Entries

**Current problem:** Each automated run appends 50-100 lines to the Session Timeline. 14 runs/day = 700-1,400 lines/day.

**New rule:** Automated runs log to the diff log only (1-2 lines per file modified). Session Timeline gets one consolidated entry per day, written during the final scheduled run (3:00 PM VALIDATION pass):

```
### [Date] — Daily Summary

| State | Files Modified | Key Changes |
|-------|---------------|-------------|
| STRUCTURING | 0 | Clean pass |
| NODE BUILD | Goldman Sachs.md | Added Think Tank links, 17 outgoing wikilinks. 95→112 lines. developed. |
| STORY | 2026-03-31 Story Discovery.md | 3 stories (1 Gold, 2 Silver) |
| CONNECTION MAPPING | 4 files | 23 reciprocal links added |
| VALIDATION | Goldman Sachs.md | 12 URLs verified. Ready promotion blocked: missing class analysis. |

Next priorities: [2-3 items]
```

**Target:** Session Timeline grows by ~20 lines/day instead of ~1,000.

#### Rule 5: No Repeated FEC API Calls for Known-$0 Records

**Current problem:** Media profile builder runs FEC queries for every personality, including those already confirmed $0 in prior runs. Each FEC API call costs tokens for the Chrome JS execution + result parsing.

**New rule:** Maintain a confirmed-$0 list in the diff log or a separate file. Once a name returns $0 from FEC API, do not query again unless David requests it or 6 months have passed.

---

### Execution Rules

#### How Claude Determines Which State to Run

1. **David's explicit command overrides everything.** `STATE: X` = enter that state immediately.
2. **Automated runs follow the daily schedule.** Each time slot has an assigned state.
3. **If no work exists for a scheduled state, exit immediately.** Do not invent work. Log "No targets" and stop.
4. **If the state router cannot determine a target, ask David.** Do not guess.

#### Stop Conditions (STRICT)

| Condition | Action |
|-----------|--------|
| No structural errors found | Exit STRUCTURING. Log "Clean pass." |
| No raw/draft/thin profiles in target queue | Exit NODE BUILD. Log "No targets." |
| No new stories discovered | Exit STORY discover. Check adapt queue. If empty, exit. |
| No files modified since last CONNECTION MAPPING | Exit. Log "No changes." |
| All targeted files pass VALIDATION | Exit. Log pass count. |
| FEC API DEMO_KEY rate-limited | Log which queries failed. Exit. Do not retry in same run. |
| Chrome unavailable | Mark all URL citations as `(UNVERIFIED)`. Do not fabricate. Exit. |
| Token budget approaching limit | Stop mid-state. Log what was completed and what remains. |

#### When to Request Input Instead of Guessing

- Target file has conflicting signals (e.g., YAML says `ready` but content is thin) → Ask David
- Story discovery finds a claim that contradicts existing vault data → Ask David
- A file needs a rewrite, not an append → Ask David
- Editorial direction unclear (e.g., "should this politician profile emphasize healthcare or defense donors?") → Ask David
- Any Epstein-related content surfaces in main vault work → STOP. Ask David.

---

### Data Layer vs. Analysis Layer — Boundary Rules

All vault content operates on one of two layers. These layers have different strictness requirements.

#### Data layer (strict)

All quantitative claims, source citations, donation amounts, vote records, contract values, dates, and dollar figures. Rules:
- Every data point must be sourced with a Tier-rated citation
- No fabrication, no estimation without disclosure
- `(UNVERIFIED)`, `(URL NEEDED)`, `(API DATA PENDING)` tags are mandatory when data cannot be confirmed
- API-first for all available data types

Applies to: FEC Record sections, temporal mapping tables, donation amounts in any context, vote tallies, contract values, timeline date columns.

#### Analysis layer (interpretive, grounded)

Analytical claims, pattern identification, class analysis, `[!money]` and `[!contradiction]` callouts, story narratives. Rules:
- Every analytical claim must be grounded in one or more data-layer facts cited in the same file or a linked file
- Inference is permitted when the supporting data is cited. Example: "Koch donations preceded deregulation votes in 4 of 5 cases" is valid if the 4-of-5 data points are cited.
- Causal language ("purchased," "bought," "resulted in") is permitted in analytical sections when temporal mapping data supports the sequence. It must not appear in data-layer sections.
- Speculation is never permitted. "This suggests" is acceptable. "This proves" is not, unless a court ruling or official finding established causation.
- Story drafts may synthesize across multiple profiles. Every factual claim in a story must trace back to a cited source in a vault file.

Applies to: `[!money]` callouts, `[!contradiction]` callouts, Class Analysis sections, Who They Are narratives, Central Thesis sections, story files.

**Boundary enforcement:** If an agent cannot determine whether a claim is data-layer or analysis-layer, treat it as data-layer (strict).

**State-specific application:**
- NODE BUILD: Data layer for FEC Record sections and timelines. Analysis layer for Class Analysis and narrative sections.
- STORY: Analysis layer for the story body. Data layer for every factual claim within it — each must trace to a cited source.
- VALIDATION: Checks data-layer compliance only. Does not evaluate analytical quality (that's editorial, not mechanical).

---

### Implementation Steps

To activate this system:

**Step 1: Disable all 14 enabled scheduled tasks.**

Every current task gets disabled. Clean slate.

**Step 2: Create 4 new scheduled tasks.**

| Task ID | Cron | Description |
|---------|------|-------------|
| `state-structuring` | `0 6 * * *` | Daily structural audit and fix pass |
| `state-node-build` | `0 9 * * *` | Daily profile expansion — single highest-priority target |
| `state-story` | `0 12 * * *` | Daily story discovery + content adaptation |
| `state-validate` | `0 15 * * *` | Daily connection mapping + validation pass |

**Step 3: Create the diff log.**

New file: `topics/Vault Maintenance/Diff Log.md` — rolling log of file changes, capped at 50 entries. Oldest entries archived monthly.

**Step 4: Create the confirmed-$0 FEC list.**

Extract all confirmed $0 FEC records from existing media profiles and Session Timeline entries into a single reference file.

**Step 5: Update CLAUDE.md Quick Start.**

Replace the current Quick Start with: "Read State Engine Architecture. Check Diff Log. Enter assigned state."

**Step 6: Archive Session Timeline automated entries.**

Move all March 27 automated entries to the Session History Archive. Keep only human session entries and the new daily summary format going forward.

---

### What Gets Cut — Explicit List

| Current Task | Frequency | Action | Why |
|---|---|---|---|
| `url-verification` | Every 2 hours | **DISABLE** | 1 UNVERIFIED URL remains (unverifiable). Absorbed into VALIDATION. |
| `story-discovery` | Every 3 hours | **DISABLE** | Absorbed into STORY. Once daily is sufficient. |
| `vault-audit` | Daily | **DISABLE** | Split into STRUCTURING + VALIDATION. |
| `donor-node-builder` | Every 2 hours | **DISABLE** | Redundant. Absorbed into NODE BUILD. |
| `profile-builder` | Every 2 hours | **DISABLE** | Redundant. Absorbed into NODE BUILD. |
| `finance-research` | Daily | **DISABLE** | Absorbed into NODE BUILD. |
| `table-format-retrofit` | Hourly | **ALREADY DISABLED** | Completed. Remove. |
| `url-fix-broken` | Hourly | **DISABLE** | 0 broken URLs. Absorbed into STRUCTURING. |
| `thin-profile-expansion` | Hourly | **DISABLE** | Redundant. Absorbed into NODE BUILD. |
| `substack-content-adapter` | Daily | **DISABLE** | Absorbed into STORY. |
| `weekly-roundup-compiler` | Weekly Fri | **DISABLE** | Absorbed into STORY (Friday logic). |
| `publish-audit` | Daily | **DISABLE** | Absorbed into VALIDATION. |
| `outreach-list-builder` | Weekly Mon | **DISABLE** | Manual trigger only. Not vault work. |
| `crossover-analysis` | Tue/Fri | **DISABLE** | Absorbed into STORY. |
| `media-profile-builder` | Hourly | **DISABLE** | Redundant. Absorbed into NODE BUILD. |
| `think-tank-builder` | Hourly | **DISABLE** | Redundant. Absorbed into NODE BUILD. |
| `lobbying-firm-builder` | Hourly | **DISABLE** | Redundant. Absorbed into NODE BUILD. |
| `election-cycle-updater` | Mon/Thu | **DISABLE** | Absorbed into NODE BUILD. |
| `connection-mapper` | Wed/Sat | **DISABLE** | Absorbed into CONNECTION MAPPING. |
| `profile-freshness-checker` | Weekly Sun | **DISABLE** | Absorbed into CONNECTION MAPPING. |

**Result:** 20 tasks → 4 scheduled + manual triggers.

---

### Example Usage

**David opens a session:**
```
STATE: NODE BUILD Goldman Sachs
```
Claude reads State Engine Architecture → reads Goldman Sachs.md (targeted, not full vault) → identifies missing Think Tank outgoing links (17 think tank files reference Goldman) → adds wikilinks and `related:` entries → logs to diff log → reports result.

**David wants to check publication readiness:**
```
STATE: VALIDATION
```
Claude reads State Engine Architecture → reads diff log for files modified since last VALIDATION → Chrome-verifies URLs → checks content-readiness gates → logs pass/fail → reports result.

**Automated daily 9:00 AM run:**
State router reads diff log → reads vault index for highest-priority raw/draft target → enters NODE BUILD → expands one target → logs to diff log → exits.

**Friday 12:00 PM automated run:**
State router enters STORY → runs discovery scan → classifies findings → checks Substack adapt queue → compiles weekly roundup → logs → exits.

---

### Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Scheduled tasks | 20 (14 enabled) | 4 |
| Automated runs per day | ~50+ | 4 |
| Context tokens per automated run | ~25,000 | ~3,000 |
| Session Timeline growth per day | ~1,000 lines | ~20 lines |
| Time to determine current state | Read 18,000-line Session Timeline | Read 50-line diff log |
| FEC API calls wasted on known-$0 | ~10-20/day | 0 |
| Files reprocessed unchanged | ~100+/day | 0 |
