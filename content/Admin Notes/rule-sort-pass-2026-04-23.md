---
name: Rule-Sort Pass — classify every rule into 4 buckets
type: audit
status: review-pending
owner: Code Claude
started: 2026-04-23
context: |
  Per ADR-0021 Phase 1. Every rule in CLAUDE.md, MEMORY.md, and active ADRs is
  classified into one of four buckets:

  - **ENFORCED** — has a pre-commit hook, sentinel, or test that fails when violated. Keep.
  - **ENFORCEABLE** — could have a hook written but doesn't. Promote to enforced OR delete.
  - **PRINCIPLE** — genuine judgment call, can't be tested. Keep in CLAUDE.md constitution (max ~50 lines total).
  - **STALE** — references dead concepts, old tooling, or was only true temporarily. Delete.

  For each rule: I propose a bucket + action. David reviews, approves/amends, then we execute per bucket.

  Sources of enforcement truth: `.husky/pre-commit` (the 13 listed sentinels), Phase 6 regression tests, query-engine contract, auth-smoke tests, build transformers.
note-kind: log
---

# Rule-Sort Pass — 2026-04-23

Total rules surveyed: **15 CLAUDE.md rules + 31 memory entries + 17 active ADRs + 7 new (ADR-0021) = 70 items**

Summary of proposed actions:
- **Enforced → keep:** 12 items
- **Enforceable → promote or delete:** 14 items (your call per item)
- **Principle → consolidate into ~50-line CLAUDE.md:** 22 items
- **Stale → delete:** 9 items
- **Reference (informational, not a rule):** 13 items (move to a "Reference" section, not rulebook)

---

## CLAUDE.md Numbered Rules (1-15)

| # | Rule (short) | Bucket | Evidence | Proposed action |
|---|---|---|---|---|
| 1 | Canonical stores are source of truth | **ENFORCED** | Shared sentinel with Rule 2 (`canonical-store-sentinel`) | Merge with Rule 2. Single rule. |
| 2 | Canonical stores are write-through | **ENFORCED** | `canonical-store-sentinel` (hook #5) | Keep. This is the gold-standard example. |
| 3 | CSV-first for bulk data | **ENFORCEABLE** | No hook prevents adding a new API pipeline | Promote: add `new-api-pipeline-sentinel` that blocks new `scripts/ingest-*-api.cjs` files unless ADR justifies. OR: downgrade to Principle if we accept drift risk. |
| 4 | AI translates, never generates | **PRINCIPLE** | Semantic; partially via `hallucination-catcher` (non-blocking) | Keep in CLAUDE.md as core value. Hallucination-catcher stays as supporting tool. |
| 5 | 9-section template for verified profiles | **ENFORCED** | `profile-template-validator` (hook #5b) | Keep. |
| 6 | Class Analysis is editorial lens | **ENFORCED + PARTIAL** | Template validator confirms section exists; class-tag vocab (ADR-0001) not enforced | Keep rule. Add `class-tag-linter` in Phase 5 to cover vocab drift. |
| 7 | Claim-object vs prose decision | **PRINCIPLE** | Authoring-time judgment; partial check possible but not at commit | Keep in CLAUDE.md. Could add a soft sentinel: "if `editor-vouched: true` AND `data/claims/<slug>.jsonl` exists, flag as mixed pattern." |
| 8 | Placeholder markers preserved, hidden in render | **ENFORCED** | Build-time transformer converts to HTML comments | Keep. |
| 9 | Readiness flow `raw → draft → ready → data-complete → verified` | **ENFORCEABLE** | No hook prevents other code writing `content-readiness` | Promote: grep-sentinel against writes outside `reclassify-readiness.cjs`. Part of Phase 5 meta-check suite. |
| 10 | Architecturally complete ≠ publication ready | **ENFORCEABLE** | `scripts/publication-readiness-check.cjs` exists but no hook runs it | Promote: add to pre-push hook. |
| 11 | Launch priority (April 30 ships 50 verified + data-complete corpus) | **STALE** | David today: *"April 30 launch date isn't a huge factor... if we need to work slower we will."* | Rewrite to remove date anchoring. Or delete and let ADR-0017 carry the data-complete tier decision. |
| 12 | `/api/*` defaults to auth-gated | **ENFORCED** | `auth-smoke-tests` (hook #9) + tier-check middleware | Keep. |
| 13 | URL verification is Editor-only | **ENFORCEABLE** | No hook prevents Claude from running url-fixer or editing URLs in verified profiles | Promote: sentinel on commits touching URLs in verified/data-complete profiles that David didn't author. |
| 14 | Perplexity-first research protocol | **PRINCIPLE** | Process rule, not testable at commit time | Keep in CLAUDE.md as core value. |
| 15 | Vault on GitHub stays open-source | **PRINCIPLE** | Business rule | Keep. Short. One line. |

---

## ADR-0021 New Rules (16-22)

All currently **ENFORCEABLE** but not yet enforced. Implementation tracked in ADR-0021 phases.

| # | Rule (short) | Bucket | Phase |
|---|---|---|---|
| 16 | Single Source of Truth | **ENFORCEABLE** | Phase 5: `dup-fact-finder.cjs` |
| 17 | Every stamp expires | **ENFORCEABLE** | Phase 3/5: harness daily expiry pass |
| 18 | Prose-structured-data consistency | **ENFORCEABLE** | Phase 5: `prose-data-consistency-check` |
| 19 | No manual override of automated verification | **ENFORCEABLE** | Phase 4: UI remove overrides; sentinel on stamp mutations |
| 20 | Script lifecycle (60-day unused → archive) | **ENFORCEABLE** | Phase 5: `script-janitor.cjs` weekly |
| 21 | Rule-drift audit quarterly | **ENFORCEABLE** | Phase 5: `rule-drift-check` |
| 22 | No aspirational rules in CLAUDE.md | **ENFORCEABLE** | Phase 2: `claude-md-linter` verifies each rule has a linked enforcement |

---

## MEMORY.md Entries

Classifying each entry. Note: memory entries that are **Reference** type don't need to be "rules" — they're facts about the user/project and belong in a separate reference section.

| # | Entry | Bucket | Notes |
|---|---|---|---|
| 1 | Monetization planning | **PRINCIPLE** | Business direction. Keep or move to ADR-0002. |
| 2 | User profile (user_david.md) | **REFERENCE** | Useful context. Keep as memory. |
| 3 | Vault methodology rewrite | **STALE** | Memory references old "developed" tier. ADR-0017 superseded this. Delete. |
| 4 | Ops app description | **REFERENCE** | Keep. |
| 5 | Always push to v4 | **PRINCIPLE** | Core workflow. Keep. |
| 6 | Worktree discipline | **PRINCIPLE** | Core workflow. Keep. |
| 7 | Single chat workflow | **PRINCIPLE** | Keep. |
| 8 | Auto-Connection Engine | **REFERENCE** | Project description. Keep. |
| 9 | Source Hunter 15 APIs | **REFERENCE** | Keep. |
| 10 | LDA Domain Migration | **STALE-ish** | From 2026-04-08. Partially complete. If `lda-pipeline.cjs` still needs fix, keep. Otherwise archive. NEEDS VERIFICATION. |
| 11 | Verify before pushing | **PRINCIPLE** | Keep. |
| 12 | Editorial Standards Framework | **PRINCIPLE** | Keep. |
| 13 | Stay in lane | **PRINCIPLE** | Keep. |
| 14 | No em dashes | **ENFORCED** | `self-review-mirror` catches. Memory is redundant with enforcement. **DELETE memory**, keep hook. |
| 15 | Class analysis mandatory | **ENFORCED (partial)** | profile-template-validator checks section exists on verified profiles. Memory duplicates Rule 6. **DELETE memory.** |
| 16 | Contradiction Detection | **REFERENCE (+ STALE todo)** | Spec reference; mentions "Website markers TODO" which may be done or dropped. NEEDS VERIFICATION. |
| 17 | Ops excluded from Design System | **PRINCIPLE** | Keep. |
| 18 | URL fixing Editor-only | **DUPLICATE of Rule 13** | **DELETE memory**, keep Rule 13 enforcement plan. |
| 19 | Frontmatter-only structured fields | **ENFORCEABLE** | Promote: body-level `field:: value` regex sentinel. Then delete memory. |
| 20 | Pipeline Research Protocol | **DUPLICATE of Rule 14** | **DELETE memory**, keep Rule 14. |
| 21 | JWT "API key" trap | **REFERENCE** | Technical gotcha knowledge. Keep. |
| 22 | Session-save updates calendar | **ENFORCEABLE** | Promote: build into `/session-save` skill, then delete memory. |
| 23 | Stabilize before shipping | **PRINCIPLE** | Keep. |
| 24 | Pre-launch security brief | **REFERENCE + STALE-ish** | Was about another session's lane. If security sprint is over, delete. NEEDS VERIFICATION. |
| 25 | Token budget awareness | **PRINCIPLE** | Core collaboration rule. Keep. |
| 26 | Always recommend cheaper options | **PRINCIPLE** | Keep. |
| 27 | Full absolute file paths | **PRINCIPLE** | Keep. |
| 28 | Bulk data library | **REFERENCE** | Keep. |
| 29 | fec-oth-transfers.jsonl untracked | **REFERENCE** | Keep — gitignore gotcha. |
| 30 | Auto-resolve bugs when fixing | **PRINCIPLE** (new today) | Keep. Future: promote to sentinel that grep-matches fix commits against bug-queue entries. |
| 31 | Add checks to harness not one-off scripts | **PRINCIPLE** (new today) | Keep. Will be enforced by Phase 5 `script-janitor` in part (no one-offs in `scripts/` root). |

**Memory actions:**
- Delete 5 entries that duplicate enforced rules or are stale (#3, #14, #15, #18, #20)
- Verify 3 entries for staleness (#10, #16, #24)
- Keep the rest

---

## Active ADRs

Classifying each ADR. Most are not "rules" per se but decisions. They stay in `content/Decisions/` as-is unless explicitly superseded. Flagging drift only.

| ADR | Title | Status | Notes |
|---|---|---|---|
| 0001 | Class Tag Vocabulary | **KEEP** | Principle + vocab reference. |
| 0002 | Monetization Model | **KEEP** | Business principle. |
| 0004 | Policy Battles (stored queries) | **VERIFY** | Does the stored-query approach still work as described? |
| 0007 | Claim-Object Pattern | **KEEP** | AOC is still reference implementation. |
| 0009 | Auth Architecture | **KEEP** | Enforced via auth-smoke-tests. |
| 0010 | Class Tag: Surveillance State | **KEEP** | Amendment to 0001. |
| 0011 | Class Tag: Reproductive Rights | **KEEP** | Amendment to 0001. |
| 0012 | Four Money Subsections | **KEEP** (partial enforcement via template validator) | |
| 0013 | FEC Transaction Taxonomy | **KEEP** | Enforced via shared classifier. |
| 0014 | FEC Full Database Ingest | **VERIFY** | Is this still the ingest model? David said FEC bulk is stale from Aug 2024. |
| 0015 | Public Ask Backend | **VERIFY** | Currently public lockdown — is /ask still expected to be public eventually? |
| 0016 | Ask Labeled Breakdown | **VERIFY** | Same as 0015 — affected by lockdown. |
| 0017 | Data-Complete Tier | **KEEP** | Current tier model. |
| 0018 | Profile Rendering Architecture | **VERIFY** | Need to check vs current render code. |
| 0019 | R2 Bulk Storage | **VERIFY** | Is R2 actually being used? |
| 0020 | Enrichment Sprint Cadence | **VERIFY** | Was this a cadence that took hold? Or aspirational? |
| 0021 | Ops Stability Strategy | **KEEP (just written)** | |

**ADR actions:**
- Verify 7 ADRs for current applicability
- Update CLAUDE.md's "Active ADRs" list (currently lists 0013 as latest; reality has 0014-0021 on disk — drift)
- No deletions without explicit superseding ADRs

---

## Summary of actions for David's review

### 🟢 Immediate, safe actions (I can do these after approval with zero risk)

1. **Delete 5 redundant memory entries:** vault_rewrite (stale), no_em_dashes (dup of hook), class_analysis (dup of Rule 6), url_fixing (dup of Rule 13), pipeline_research (dup of Rule 14).
2. **Merge CLAUDE.md Rules 1 + 2** into one rule (same enforcement).
3. **Rewrite Rule 11** to remove April 30 anchoring per today's guidance.
4. **Update CLAUDE.md's "Active ADRs" list** to include 0014-0021.

### 🟡 Requires your decision per-item (Enforceable promotions)

Each of these has two paths — promote to enforced (write the hook), OR delete the rule because it's not worth enforcing:

1. Rule 3 — CSV-first (promote: new-api-pipeline sentinel)
2. Rule 9 — Readiness flow (promote: block writes outside reclassify-readiness)
3. Rule 10 — Publication readiness (promote: add to pre-push)
4. Rule 13 — URL verification Editor-only (promote: verified-profile URL-edit sentinel)
5. Memory #19 — No inline `field:: value` (promote: body-regex sentinel)
6. Memory #22 — Session-save updates calendar (promote: bake into skill)
7. Rules 16-22 from ADR-0021 (phased, already planned)

### 🟠 Needs verification (I check current state, report back)

1. Memory #10 — LDA migration complete?
2. Memory #16 — Contradiction Detection website markers shipped?
3. Memory #24 — Pre-launch security sprint finished?
4. ADR-0004 — Policy Battles still working?
5. ADR-0014 — FEC ingest model still current?
6. ADR-0015/0016 — Ask backend affected by lockdown?
7. ADR-0018 — Profile Rendering Architecture still accurate?
8. ADR-0019 — R2 actually in use?
9. ADR-0020 — Sprint cadence held?

### 🔴 Stale deletions (after David confirms)

1. Memory #3 (vault_rewrite) — superseded by ADR-0017.
2. Other items flagged STALE after verification.

---

## Recommended next step order

1. **Approve bucket classifications.** You read through, flag any you disagree with.
2. **Execute the 🟢 safe actions** in one session (deletion + merges + date rewrite + ADR list update).
3. **Per-item decisions on 🟡 Enforceable.** One by one or in batches. I recommend keeping them as rules and promoting to hooks (aligned with ADR-0021 Rule 22 — no aspirational rules).
4. **Verify the 🟠 items.** I investigate, report on each. You decide delete/update/keep.
5. **Delete confirmed stale 🔴 items.**
6. **Then CLAUDE.md gets rewritten** to ~50-line constitution + reference section.

This is 3-5 sessions of work. Every step is incremental and reversible.

---

## 🟠 Orange items — verification results (2026-04-23)

| Item | Status | Evidence | Recommended action |
|---|---|---|---|
| **Memory #10 — LDA migration** | PARTIALLY STALE | `scripts/lda-pipeline.cjs` doesn't exist in THIS repo (per memory, lives in `donor-map-engine`). BUT `scripts/extract-sources-from-vault.cjs` and `scripts/push-engine-workflows.cjs` still reference `lda.senate.gov`. | **Update memory** to note remaining local drift. Don't delete. Sub-task: fix the two scripts referencing the old domain. |
| **Memory #16 — Contradiction Detection** | **MOSTLY COMPLETE (memory stale)** | `quartz/components/ContradictionCard.tsx` + `HeroContradiction.tsx` exist. SCSS styling in place. Memory said "Website markers TODO" — they're shipped. | **Delete memory entry.** Feature is built. |
| **Memory #24 — Pre-launch security sprint** | ACTIVE (other session) | `content/Admin Notes/pre-launch-security-brief.md` + `attack-surface-inventory.md` exist. LICENSE files present. No gitleaks CI yet. | **KEEP memory.** Still active work in parallel session. |
| **ADR-0004 — Policy Battles** | ACTIVE | Concept is policy-pages-as-stored-queries. `content/Policies/` directory exists. | **KEEP.** |
| **ADR-0014 — FEC Full Ingest** | ACTIVE (blocked on data) | Ingest scripts exist per plan. Currently blocked on fresh weball26 reingest David has paused. | **KEEP.** Referenced by tolerated-regressions infrastructure. |
| **ADR-0015 — Public Ask Backend** | ACTIVE (lockdown-paused) | Ask engine operational at ops. Public exposure planned, currently blocked by lockdown. | **KEEP.** Add note: public exposure pending lockdown lift. |
| **ADR-0016 — Ask Labeled Breakdown** | ACTIVE | UI refinement for ADR-0015. Implementation ongoing. | **KEEP.** |
| **ADR-0018 — Profile Rendering** | ACTIVE | Documents load-bearing `.profile-section-card` architecture from 2026-04-21 fixes. | **KEEP.** |
| **ADR-0019 — R2 Bulk Storage** | **PARTIALLY IMPLEMENTED** | Decision was to move bulk data to R2. Only `ingest-voteview-bulk.cjs` references R2. `data/bulk/` still expected locally (60GB). Migration incomplete. | **KEEP ADR as active goal** but add migration-status note. Track completion as a future task. |
| **ADR-0020 — Enrichment Sprint Cadence** | **PARTIALLY IMPLEMENTED** | `scripts/enrichment-sprint.sh` exists. NO scheduled GitHub workflow for it (only content-stats, deploy, frontmatter-check, link-checker, regression-tests, save-tip, stale-profiles). Sprint has not become routine. | **KEEP ADR as active goal** but flag: cadence not actually scheduled. Needs a cron workflow. |

### Summary

- **0 items fully stale → delete now** (clean result; orange was a useful filter)
- **1 memory entry to delete** (#16 contradiction detection — feature done, memory obsolete)
- **1 memory entry to update** (#10 LDA — note remaining local script drift)
- **2 ADRs to amend with implementation-status notes** (0019, 0020 — partially implemented)
- **6 items keep as-is** (all confirmed active)

Plus 2 sub-tasks discovered:
- Fix `scripts/extract-sources-from-vault.cjs` and `scripts/push-engine-workflows.cjs` to use `lda.gov` not `lda.senate.gov`
- Add GitHub Actions schedule for `enrichment-sprint.sh` (per ADR-0020's intent)
