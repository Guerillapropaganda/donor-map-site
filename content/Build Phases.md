---
title: Build Phases
type: system
status: phase-1-in-progress
last-updated: 2026-04-14
authority: ADR-0003
---

# Build Phases — Query Engine + Source Registry + Class Tags

Sequential phased build. No phase skipping. Each phase has exit criteria that must be met and verified before the next phase starts.

## Status legend
- ⏳ not-started
- 🔨 in-progress
- 🚫 blocked
- ✅ shipped

## Current phase
**Phase 1** — Source Registry + Generic-Link Cleanup — 🔨 in-progress

---

## Phase 1 — Source Registry + Generic-Link Cleanup

**Folder:** `content/Phases/phase-1/`
**Goal:** Central source registry, orphan citation detection, pipeline integration.
**Estimated duration:** 2–3 sessions

### Deliverables
- [x] `data/sources.jsonl` schema defined and documented
- [x] `scripts/lib/sources-store.cjs` writer library with validated schema
- [ ] Content-hash fingerprinting for all new sources
- [ ] Archive.org auto-archive integration for Tier 1 sources
- [ ] Source extractor script: walks vault, populates registry from existing links
- [ ] Generic-link cleanup pass script → `content/Admin Notes/orphan-citations-report.md`
- [ ] Ops `/sources` review page (filter, re-fetch, mark, edit in place)
- [ ] Quartz plugin: `{{src:ID}}` ref resolution at build time
- [ ] Pipeline migration — at least one enrichment pipeline fully migrated
- [ ] Documentation updates: CLAUDE.md, Vault Rules.md, Pipeline Guide.md
- [ ] All new code covered by pre-commit sentinels where applicable

### Exit criteria
- All existing vault links extracted to `data/sources.jsonl` (deduped)
- Orphan citation report generated, David triaged top 50
- At least one pipeline writes to sources-store.cjs end-to-end
- `{{src:ID}}` renders correctly in 3 test profiles
- Ops `/sources` page functional for review workflow
- No regressions: `npx quartz build` clean, all pre-commit gates pass
- Phase retrospective written in `content/Phases/phase-1/retrospective.md`

### Files
- `content/Phases/phase-1/handoff.md` — current state, next action
- `content/Phases/phase-1/exit-criteria.md` — detailed checklist
- `content/Phases/phase-1/decisions.md` — mid-phase decisions
- `content/Phases/phase-1/retrospective.md` — written at phase end

---

## Phase 2 — Query Engine MVP

**Folder:** `content/Phases/phase-2/`
**Goal:** Public `/query` page with class-analysis filters over structured data.
**Estimated duration:** 3–4 sessions
**Depends on:** Phase 1 shipped

### Deliverables
- [ ] Class-tag batch run script (Research Claude proposes for ~450 donors)
- [ ] Class-tag batch run script for ~231 politicians
- [ ] Ops `/class-tags` review page (3-second approval UX)
- [ ] `data/entity-class-tags.jsonl` populated and approved
- [ ] `data/events.jsonl` build (votes, hearings, regulations)
- [ ] SQLite query backend loading all JSONL stores at build time
- [ ] `/api/query` endpoint in Ops with structured filter interface
- [ ] Public `/query` page with form builder
- [ ] Class-analysis filter toggles (cross-party, rhetoric-contradiction, timing-proximity, capital-fraction)
- [ ] Result table with per-row source links + CSV export
- [ ] Query permalink system
- [ ] Auth middleware hooks placed (pass-through for Phase 2, gated in 2.5)

### Exit criteria
- All 450 donors and 231 politicians tagged and approved
- 10 test queries executed and verified against manual counts
- Class-analysis filters each tested on 2+ known cases
- Query permalinks shareable and resolve correctly
- Build integration clean (no slowdown to Quartz build)
- Phase 2 retrospective written

---

## Phase 2.75 — Policy Battles MVP

**Folder:** `content/Phases/phase-2.75/`
**Goal:** Ship the first user-facing product powered by the query engine — 5 policy battle pages + `/who-blocks-us` enemy list + OG card generation. Policy pages are the marketing funnel for the paid tier and remain free forever (ADR-0002).
**Estimated duration:** 2–3 sessions
**Depends on:** Phase 2 shipped (events.jsonl with `policy_id` + `obstruction_type`, class tags populated, SQLite backend)
**Authority:** ADR-0004

### v1 policies (5, locked)
1. Housing affordability / rent control
2. Universal healthcare / Medicare expansion
3. AIPAC / BDS laws (editorial firewall per ADR-0004)
4. Minimum wage
5. Student debt cancellation

Plus `/who-blocks-us` cross-policy enemy list aggregate.

### Deliverables
- [ ] `data/policies.jsonl` schema + store
- [ ] `data/polling.jsonl` schema + store (~30 entries, manual v1)
- [ ] `events.jsonl` extensions: `policy_id` and `obstruction_type` (baked into Phase 2)
- [ ] Quartz plugin — policy page template
- [ ] Quartz plugin — OG card generation (Open Graph + Twitter/X markup)
- [ ] `/who-blocks-us` enemy list page (cross-policy donor overlap query)
- [ ] Contradiction callout component
- [ ] Zip code lookup integration on policy pages
- [ ] Sentinel blocklist extension for policy pages (`bought`, `co-opted`, `bribed`, `corrupt`, `scheme`)
- [ ] 5 plain-English blurbs (Research Claude drafts, David approves)
- [ ] AIPAC page legally reviewed by David

### Exit criteria
- All 5 policy pages render clean
- OG cards validate on Twitter/X + Facebook + LinkedIn
- `/who-blocks-us` renders cross-policy overlap with working click-throughs
- AIPAC page reviewed and approved by David
- Every factual claim has a `{{src:ID}}` reference
- Policy pages free for anonymous visitors (no auth gate)
- `npx quartz build` clean
- Phase 2.75 retrospective written

---

## Phase 2.5 — Auth & Gating

**Folder:** `content/Phases/phase-2.5/`
**Goal:** User accounts, Stripe integration, tier-based rate limits.
**Estimated duration:** 2 sessions
**Depends on:** Phase 2.75 shipped (policy pages launch free before auth lands)

### Deliverables
- [ ] Clerk auth integration
- [ ] User record schema + storage
- [ ] Stripe Checkout flow
- [ ] Stripe webhook → tier update
- [ ] Tier-check middleware on all `/api/*` routes
- [ ] Rate limit counters (SQLite)
- [ ] Free-auth / Researcher / Newsroom tier gates
- [ ] Teaser-card pattern for unauthenticated data panels
- [ ] "Upgrade" CTAs on gated features
- [ ] Student discount application form

### Exit criteria
- Signup → paid → unpaid → resubscribe flow all tested
- Rate limits enforced and tested on all tiers
- At least 1 test user on each tier verifying permissions
- Phase 2.5 retrospective written

---

## Phase 3 — Profile Data Panels

**Folder:** `content/Phases/phase-3/`
**Goal:** Live data panels rendered into profile pages from default queries.
**Estimated duration:** 2 sessions
**Depends on:** Phase 2.5 shipped (panels need gating from day 1)
**Builds on:** Phase 2.75 policy page template pattern (data panels are the same idea, applied to profile pages instead of policy pages)

### Deliverables
- [ ] Quartz plugin reads `default-query` frontmatter
- [ ] Plugin reads `extra-panels` frontmatter
- [ ] Panel renderer with tiered visibility (teaser / free-auth / paid)
- [ ] Politicians profile rollout first
- [ ] Verified donors rollout second
- [ ] Panel data fetch during build (or live via API — decide in ADR)

### Exit criteria
- All 231 politicians have default-query frontmatter
- Panels render correctly across all three tier states
- Performance: build time increase <30s
- Phase 3 retrospective written

---

## Phase 4 — Claim-Object Experiment (AOC)

**Folder:** `content/Phases/phase-4/`
**Goal:** Validate claim-object profile pattern on AOC.
**Estimated duration:** 1–2 sessions
**Depends on:** Phase 3 shipped

### Deliverables
- [ ] `data/claims/aoc.jsonl` schema + content
- [ ] `data/claims/aoc-synthesis.md` interpretive prose
- [ ] Quartz plugin for claim-object rendering (triggered by frontmatter)
- [ ] Side-by-side comparison document (old vs new)
- [ ] ADR deciding migration path (adopt / adopt-for-subset / reject)

### Exit criteria
- AOC profile renders from claims + synthesis
- Reading experience documented with pros/cons
- Decision ADR written and approved
- Phase 4 retrospective written

---

## Phase 5 — Story Score

**Folder:** `content/Phases/phase-5/`
**Goal:** Automated story candidate scoring and ranking in attention queue.
**Estimated duration:** 2 sessions
**Depends on:** Phase 4 shipped (needs structured data from all prior phases)

### Deliverables
- [ ] `data/hot-issues.jsonl` manual weekly update workflow
- [ ] Story score formula implementation in new producer script
- [ ] `story-candidate-scorer` producer wired to `addEntries()`
- [ ] "Stories" bucket in Ops `/attention` sorted by score
- [ ] Manual `editor_boost` field on queue entries
- [ ] Calibration: 20 past stories hand-scored + formula tuned
- [ ] Recency decay and news-cycle relevance multipliers

### Exit criteria
- Formula top-5 matches David's top-5 on calibration set
- First week of live scoring: David approves ≥3 of top-5 suggestions
- Phase 5 retrospective written

---

## Governance

### Session start checklist
1. Read this doc — identify current phase
2. Read `content/Phases/phase-{N}/handoff.md` — pick up where last session left off
3. Read `content/Phases/phase-{N}/decisions.md` — awareness of mid-phase decisions
4. Check `content/Admin Notes/` for any urgent items

### Session end checklist
1. Update `content/Phases/phase-{N}/handoff.md` with today's progress
2. Log any new mid-phase decisions in `decisions.md`
3. Update checkboxes in this doc
4. Update Session State.md with current phase status
5. Commit

### Phase transitions
Use the `phase-transition` skill. It enforces:
- All exit criteria verified
- Retrospective written
- Next phase folder and handoff doc created
- ADR entry for the transition
- Session State updated
- Commit ceremony

Never transition phases without running the skill.
