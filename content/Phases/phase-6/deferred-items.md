---
title: "Phase 6 Deferred Items Backlog"
type: backlog
phase: 6
last-updated: 2026-04-14
generator: scripts/phase-6-deferred-items-collector.cjs
editor-vouched: true
---

# Phase 6 Deferred Items Backlog

Auto-extracted from every `content/Phases/phase-*/` doc and every ADR. This is the Phase 6 FIRST CONCRETE ACTION per ADR-0005. Every entry below represents a deferred item, known issue, TODO, or open question from an earlier phase that Phase 6 hardening needs to either FIX, explicitly DEFER with a new ADR, or ACCEPT as permanent.

**Total items:** 267

## By category

- **misc**: 108
- **regression / tests**: 60
- **data integrity**: 24
- **security / auth**: 16
- **phase 2.75 polish**: 12
- **pipelines**: 10
- **class tags**: 10
- **documentation**: 10
- **legal / defamation**: 8
- **performance**: 7
- **phase 4 polish**: 2

## By source phase

- **ADR**: 62
- **phase-1**: 27
- **phase-2**: 39
- **phase-2.5**: 8
- **phase-2.75**: 54
- **phase-6**: 77

## Full backlog

Each item is rendered as `source:line — text`. Click the source link to jump into the file. Phase 6 triage column is where David marks resolution: **fix** / **defer** / **accept** / **wontfix**.

### misc (108)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-1 | [exit-criteria.md:28](/content/Phases/phase-1/exit-criteria.md#L28) | 28 | marker | - [x] Tier 1 sources auto-archived to archive.org — deferred to Phase 6 (not a Phase 1 blocker) | |
| phase-1 | [exit-criteria.md:34](/content/Phases/phase-1/exit-criteria.md#L34) | 34 | unchecked-exit-criterion | - [ ] One-click re-fetch — deferred to Phase 6 (batch re-fingerprint is a separate feature) | |
| phase-1 | [exit-criteria.md:35](/content/Phases/phase-1/exit-criteria.md#L35) | 35 | marker | - [x] Bulk status change — available via the per-row dropdown (bulk-select UI deferred to Phase 6) | |
| phase-1 | [exit-criteria.md:36](/content/Phases/phase-1/exit-criteria.md#L36) | 36 | unchecked-exit-criterion | - [ ] URL edit in place — INTENTIONALLY NOT in this page, URL editing stays in `/urls` per the Editor-only URL rule | |
| phase-1 | [exit-criteria.md:55](/content/Phases/phase-1/exit-criteria.md#L55) | 55 | marker | ## Progress: 22 / 25 items fully checked; 3 items deferred to David (triage) or Phase 6 (hardening features) | |
| phase-1 | [handoff.md:111](/content/Phases/phase-1/handoff.md#L111) | 111 | in-section | ## Known issues / surprises | |
| phase-1 | [handoff.md:113](/content/Phases/phase-1/handoff.md#L113) | 113 | in-section | 1. **Windows illegal-char directories** — `content/Events/Drafts/` has some dirs with trailing spaces. The extractor's `readdirSync` wrapped in try/catch handles gracefully. No cra | |
| phase-1 | [handoff.md:114](/content/Phases/phase-1/handoff.md#L114) | 114 | in-section | 2. **Malformed markdown links** — zero encountered in full-vault run (0/18,587). Either the vault is cleaner than expected or the regex is permissive enough. | |
| phase-1 | [handoff.md:115](/content/Phases/phase-1/handoff.md#L115) | 115 | in-section | 3. **29% "other" source_type** — roughly 5,341 links didn't match any host rule. Not a bug; expected given the diversity of source material. David can reclassify in Ops or add host | |
| phase-1 | [handoff.md:117](/content/Phases/phase-1/handoff.md#L117) | 117 | in-section | 5. **Main repo v4 is still diverged** — 34 local vs 7 remote as of session start. Another session is handling that cleanup. Don't merge from this worktree to v4 until that's resolv | |
| phase-1 | [handoff.md:119](/content/Phases/phase-1/handoff.md#L119) | 119 | in-section | ## Open questions for David | |
| phase-1 | [handoff.md:121](/content/Phases/phase-1/handoff.md#L121) | 121 | in-section | None blocking. Classification vocabulary can be expanded in future sessions. David can triage the orphan report when it lands in `content/Admin Notes/`. | |
| phase-1 | [retrospective.md:108](/content/Phases/phase-1/retrospective.md#L108) | 108 | in-section | ## Tech debt introduced | |
| phase-2 | [exit-criteria.md:23](/content/Phases/phase-2/exit-criteria.md#L23) | 23 | unchecked-exit-criterion | - [ ] `scripts/batch-propose-class-tags.cjs` working for donors | |
| phase-2 | [exit-criteria.md:27](/content/Phases/phase-2/exit-criteria.md#L27) | 27 | unchecked-exit-criterion | - [ ] Rejection log feeding back into future proposal runs | |
| phase-2 | [exit-criteria.md:30](/content/Phases/phase-2/exit-criteria.md#L30) | 30 | unchecked-exit-criterion | - [ ] SQLite build-time loader or in-memory equivalent | |
| phase-2 | [exit-criteria.md:31](/content/Phases/phase-2/exit-criteria.md#L31) | 31 | unchecked-exit-criterion | - [ ] `scripts/lib/query-engine.cjs` with filter composition API | |
| phase-2 | [exit-criteria.md:32](/content/Phases/phase-2/exit-criteria.md#L32) | 32 | unchecked-exit-criterion | - [ ] Ops `/api/query` endpoint with filter interface | |
| phase-2 | [exit-criteria.md:33](/content/Phases/phase-2/exit-criteria.md#L33) | 33 | unchecked-exit-criterion | - [ ] Tier-check middleware hook placed (pass-through stub for Phase 2) | |
| phase-2 | [exit-criteria.md:36](/content/Phases/phase-2/exit-criteria.md#L36) | 36 | unchecked-exit-criterion | - [ ] `/query` top-level Quartz page | |
| phase-2 | [exit-criteria.md:37](/content/Phases/phase-2/exit-criteria.md#L37) | 37 | unchecked-exit-criterion | - [ ] Form builder renders with all filter controls | |
| phase-2 | [exit-criteria.md:38](/content/Phases/phase-2/exit-criteria.md#L38) | 38 | unchecked-exit-criterion | - [ ] Class-analysis toggles functional (cross-party, rhetoric-contradiction, timing-proximity, capital-fraction) | |
| phase-2 | [exit-criteria.md:39](/content/Phases/phase-2/exit-criteria.md#L39) | 39 | unchecked-exit-criterion | - [ ] Result table with per-row source links | |
| phase-2 | [exit-criteria.md:40](/content/Phases/phase-2/exit-criteria.md#L40) | 40 | unchecked-exit-criterion | - [ ] CSV export | |
| phase-2 | [exit-criteria.md:41](/content/Phases/phase-2/exit-criteria.md#L41) | 41 | unchecked-exit-criterion | - [ ] Query permalinks shareable + resolve correctly | |
| phase-2 | [exit-criteria.md:47](/content/Phases/phase-2/exit-criteria.md#L47) | 47 | unchecked-exit-criterion | - [ ] All pre-commit sentinels pass | |
| phase-2 | [exit-criteria.md:51](/content/Phases/phase-2/exit-criteria.md#L51) | 51 | unchecked-exit-criterion | - [ ] CLAUDE.md updated with query engine conventions | |
| phase-2 | [exit-criteria.md:54](/content/Phases/phase-2/exit-criteria.md#L54) | 54 | unchecked-exit-criterion | - [ ] Phase 2 retrospective written | |
| phase-2 | [handoff.md:124](/content/Phases/phase-2/handoff.md#L124) | 124 | in-section | ## Open questions for David | |
| phase-2 | [handoff.md:129](/content/Phases/phase-2/handoff.md#L129) | 129 | in-section | 4. **`/query` page UI direction.** Sketch or wireframe needed before building? Or ugly-v1-iterate approach? | |
| phase-2.5 | [handoff.md:100](/content/Phases/phase-2.5/handoff.md#L100) | 100 | marker | - [ ] Full subscribe → checkout → tier upgrade verified (**deferred**) | |
| phase-2.75 | [exit-criteria.md:26](/content/Phases/phase-2.75/exit-criteria.md#L26) | 26 | unchecked-exit-criterion | - [ ] `/who-blocks-us` page renders from cross-policy query | |
| phase-2.75 | [exit-criteria.md:28](/content/Phases/phase-2.75/exit-criteria.md#L28) | 28 | unchecked-exit-criterion | - [ ] Contradiction callout component with graceful fallback | |
| phase-2.75 | [exit-criteria.md:31](/content/Phases/phase-2.75/exit-criteria.md#L31) | 31 | unchecked-exit-criterion | - [ ] Housing affordability / rent control | |
| phase-2.75 | [exit-criteria.md:32](/content/Phases/phase-2.75/exit-criteria.md#L32) | 32 | unchecked-exit-criterion | - [ ] Universal healthcare / Medicare expansion | |
| phase-2.75 | [exit-criteria.md:34](/content/Phases/phase-2.75/exit-criteria.md#L34) | 34 | unchecked-exit-criterion | - [ ] Minimum wage | |
| phase-2.75 | [exit-criteria.md:35](/content/Phases/phase-2.75/exit-criteria.md#L35) | 35 | unchecked-exit-criterion | - [ ] Student debt cancellation | |
| phase-2.75 | [exit-criteria.md:36](/content/Phases/phase-2.75/exit-criteria.md#L36) | 36 | unchecked-exit-criterion | - [ ] `/who-blocks-us` enemy list | |
| phase-2.75 | [exit-criteria.md:42](/content/Phases/phase-2.75/exit-criteria.md#L42) | 42 | unchecked-exit-criterion | - [ ] Each card shows: policy name, money blocked, public support %, Donor Map branding | |
| phase-2.75 | [exit-criteria.md:46](/content/Phases/phase-2.75/exit-criteria.md#L46) | 46 | unchecked-exit-criterion | - [ ] 5 plain-English blurbs approved by David | |
| phase-2.75 | [exit-criteria.md:47](/content/Phases/phase-2.75/exit-criteria.md#L47) | 47 | unchecked-exit-criterion | - [ ] Every factual claim has a `{{src:ID}}` reference | |
| phase-2.75 | [exit-criteria.md:50](/content/Phases/phase-2.75/exit-criteria.md#L50) | 50 | unchecked-exit-criterion | - [ ] No banned words (`bought`, `co-opted`, `bribed`, `corrupt`, `scheme`) in prose | |
| phase-2.75 | [exit-criteria.md:54](/content/Phases/phase-2.75/exit-criteria.md#L54) | 54 | unchecked-exit-criterion | - [ ] `/who-blocks-us` free for anonymous visitors | |
| phase-2.75 | [exit-criteria.md:59](/content/Phases/phase-2.75/exit-criteria.md#L59) | 59 | unchecked-exit-criterion | - [ ] Vault Rules.md updated with editorial firewall reference | |
| phase-2.75 | [exit-criteria.md:61](/content/Phases/phase-2.75/exit-criteria.md#L61) | 61 | unchecked-exit-criterion | - [ ] Phase 2.75 retrospective written | |
| phase-2.75 | [exit-criteria.md:64](/content/Phases/phase-2.75/exit-criteria.md#L64) | 64 | unchecked-exit-criterion | - [ ] `npx quartz build` clean | |
| phase-2.75 | [exit-criteria.md:65](/content/Phases/phase-2.75/exit-criteria.md#L65) | 65 | unchecked-exit-criterion | - [ ] All pre-commit sentinels pass | |
| phase-2.75 | [exit-criteria.md:67](/content/Phases/phase-2.75/exit-criteria.md#L67) | 67 | unchecked-exit-criterion | - [ ] Shareable permalinks resolve correctly | |
| phase-2.75 | [handoff.md:114](/content/Phases/phase-2.75/handoff.md#L114) | 114 | in-section | ## Known issues / concerns | |
| phase-2.75 | [handoff.md:121](/content/Phases/phase-2.75/handoff.md#L121) | 121 | in-section | ## Open questions for David | |
| phase-2.75 | [handoff.md:123](/content/Phases/phase-2.75/handoff.md#L123) | 123 | in-section | To answer when Phase 2.75 begins, not now: | |
| phase-6 | [decisions.md:19](/content/Phases/phase-6/decisions.md#L19) | 19 | in-section | ### Deferred-items collector is the first tool | |
| phase-6 | [exit-criteria.md:12](/content/Phases/phase-6/exit-criteria.md#L12) | 12 | in-section | ## Deferred-items closeout | |
| phase-6 | [exit-criteria.md:13](/content/Phases/phase-6/exit-criteria.md#L13) | 13 | unchecked-exit-criterion | - [ ] `scripts/phase-6-deferred-items-collector.cjs` exists + has run | |
| phase-6 | [exit-criteria.md:14](/content/Phases/phase-6/exit-criteria.md#L14) | 14 | unchecked-exit-criterion | - [ ] Every item in `content/Phases/phase-6/deferred-items.md` triaged | |
| phase-6 | [exit-criteria.md:15](/content/Phases/phase-6/exit-criteria.md#L15) | 15 | unchecked-exit-criterion | - [ ] All fix-required items shipped | |
| phase-6 | [exit-criteria.md:33](/content/Phases/phase-6/exit-criteria.md#L33) | 33 | unchecked-exit-criterion | - [ ] No duplicate IDs across any store | |
| phase-6 | [exit-criteria.md:34](/content/Phases/phase-6/exit-criteria.md#L34) | 34 | unchecked-exit-criterion | - [ ] No orphaned foreign-key references | |
| phase-6 | [exit-criteria.md:44](/content/Phases/phase-6/exit-criteria.md#L44) | 44 | unchecked-exit-criterion | - [ ] Tier-check middleware audited on every /api/* route | |
| phase-6 | [exit-criteria.md:47](/content/Phases/phase-6/exit-criteria.md#L47) | 47 | unchecked-exit-criterion | - [ ] Git history scanned for secrets | |
| phase-6 | [exit-criteria.md:48](/content/Phases/phase-6/exit-criteria.md#L48) | 48 | unchecked-exit-criterion | - [ ] Vault open-source posture verified (nothing private leaked) | |
| phase-6 | [exit-criteria.md:52](/content/Phases/phase-6/exit-criteria.md#L52) | 52 | unchecked-exit-criterion | - [ ] Every factual claim has a resolving source ID | |
| phase-6 | [exit-criteria.md:58](/content/Phases/phase-6/exit-criteria.md#L58) | 58 | unchecked-exit-criterion | - [ ] Source registry orphan detector re-run, diff vs Phase 1 baseline | |
| phase-6 | [exit-criteria.md:70](/content/Phases/phase-6/exit-criteria.md#L70) | 70 | unchecked-exit-criterion | - [ ] CLAUDE.md active-rules index updated | |
| phase-6 | [exit-criteria.md:71](/content/Phases/phase-6/exit-criteria.md#L71) | 71 | unchecked-exit-criterion | - [ ] Phase 6 retrospective written | |
| phase-6 | [exit-criteria.md:72](/content/Phases/phase-6/exit-criteria.md#L72) | 72 | unchecked-exit-criterion | - [ ] Final closing ADR written (ADR-NNNN: "Query Engine build complete") | |
| phase-6 | [exit-criteria.md:75](/content/Phases/phase-6/exit-criteria.md#L75) | 75 | unchecked-exit-criterion | - [ ] `npx quartz build` clean | |
| phase-6 | [exit-criteria.md:76](/content/Phases/phase-6/exit-criteria.md#L76) | 76 | unchecked-exit-criterion | - [ ] All pre-commit sentinels pass | |
| phase-6 | [exit-criteria.md:80](/content/Phases/phase-6/exit-criteria.md#L80) | 80 | unchecked-exit-criterion | - [ ] All items above checked | |
| phase-6 | [exit-criteria.md:82](/content/Phases/phase-6/exit-criteria.md#L82) | 82 | unchecked-exit-criterion | - [ ] Final closing ADR signed off by David | |
| phase-6 | [exit-criteria.md:83](/content/Phases/phase-6/exit-criteria.md#L83) | 83 | unchecked-exit-criterion | - [ ] `phase-transition` skill run to move build state to "complete" | |
| phase-6 | [handoff.md:34](/content/Phases/phase-6/handoff.md#L34) | 34 | marker | 1. **Deferred-items closeout** — work through the collector output | |
| phase-6 | [handoff.md:45](/content/Phases/phase-6/handoff.md#L45) | 45 | in-section | ### Deferred-items closeout | |
| phase-6 | [handoff.md:46](/content/Phases/phase-6/handoff.md#L46) | 46 | in-section | - [ ] `scripts/phase-6-deferred-items-collector.cjs` + initial run | |
| phase-6 | [handoff.md:47](/content/Phases/phase-6/handoff.md#L47) | 47 | in-section | - [ ] `content/Phases/phase-6/deferred-items.md` populated | |
| phase-6 | [handoff.md:48](/content/Phases/phase-6/handoff.md#L48) | 48 | in-section | - [ ] Every item triaged: fix / defer-with-ADR / accept-as-permanent | |
| phase-6 | [handoff.md:49](/content/Phases/phase-6/handoff.md#L49) | 49 | in-section | - [ ] Fixes shipped, deferrals logged | |
| phase-6 | [handoff.md:106](/content/Phases/phase-6/handoff.md#L106) | 106 | marker | - Every item in `deferred-items.md` triaged | |
| phase-6 | [handoff.md:118](/content/Phases/phase-6/handoff.md#L118) | 118 | in-section | ## Known issues / concerns | |
| phase-6 | [handoff.md:125](/content/Phases/phase-6/handoff.md#L125) | 125 | in-section | ## Open questions for David (when Phase 6 begins) | |
| phase-6 | [handoff.md:130](/content/Phases/phase-6/handoff.md#L130) | 130 | in-section | 4. Monitoring / alerting scope — does this belong in Phase 6 or is it a post-launch ops concern? | |
| ADR | [0001-class-tag-vocabulary.md:48](/content/Decisions/0001-class-tag-vocabulary.md#L48) | 48 | in-section | ## What this opens | |
| ADR | [0002-monetization-model.md:51](/content/Decisions/0002-monetization-model.md#L51) | 51 | in-section | ## What this opens | |
| ADR | [0002-monetization-model.md:53](/content/Decisions/0002-monetization-model.md#L53) | 53 | in-section | - Need for student discount application workflow | |
| ADR | [0002-monetization-model.md:54](/content/Decisions/0002-monetization-model.md#L54) | 54 | in-section | - Ongoing governance: tier changes require new ADR | |
| ADR | [0003-phased-query-engine-build.md:55](/content/Decisions/0003-phased-query-engine-build.md#L55) | 55 | in-section | ## What this opens | |
| ADR | [0003-phased-query-engine-build.md:56](/content/Decisions/0003-phased-query-engine-build.md#L56) | 56 | in-section | - Need for phase-transition ceremony | |
| ADR | [0003-phased-query-engine-build.md:57](/content/Decisions/0003-phased-query-engine-build.md#L57) | 57 | in-section | - Need for session start/end checklists that reference Build Phases | |
| ADR | [0003-phased-query-engine-build.md:58](/content/Decisions/0003-phased-query-engine-build.md#L58) | 58 | in-section | - Ops `/phases` dashboard to surface current state | |
| ADR | [0004-phase-2-75-policy-battles.md:167](/content/Decisions/0004-phase-2-75-policy-battles.md#L167) | 167 | in-section | ## What this opens | |
| ADR | [0005-phase-6-bug-hunt.md:37](/content/Decisions/0005-phase-6-bug-hunt.md#L37) | 37 | marker | **1. Deferred-items closeout** | |
| ADR | [0005-phase-6-bug-hunt.md:39](/content/Decisions/0005-phase-6-bug-hunt.md#L39) | 39 | marker | - Walk every phase's `handoff.md` for "known issues" items. | |
| ADR | [0005-phase-6-bug-hunt.md:40](/content/Decisions/0005-phase-6-bug-hunt.md#L40) | 40 | marker | - Walk every phase's `retrospective.md` for "tech debt introduced" items. | |
| ADR | [0005-phase-6-bug-hunt.md:95](/content/Decisions/0005-phase-6-bug-hunt.md#L95) | 95 | marker | - **Bugs accumulate silently without a hardening pass.** Every feature phase leaves deferred items. Phase 6 is the garbage collector. | |
| ADR | [0005-phase-6-bug-hunt.md:112](/content/Decisions/0005-phase-6-bug-hunt.md#L112) | 112 | marker | - The "deferred until later" accumulation problem | |
| ADR | [0005-phase-6-bug-hunt.md:116](/content/Decisions/0005-phase-6-bug-hunt.md#L116) | 116 | in-section | ## What this opens | |
| ADR | [0005-phase-6-bug-hunt.md:119](/content/Decisions/0005-phase-6-bug-hunt.md#L119) | 119 | in-section | - Monitoring / alerting infrastructure (Phase 6 scope, but becomes an ongoing operational cost) | |
| ADR | [0006-phase-1-shipped.md:80](/content/Decisions/0006-phase-1-shipped.md#L80) | 80 | in-section | 3. **29% "other" source_type classification** — ~5,341 sources don't match any host rule. David reclassifies via Ops `/sources` as he triages. | |
| ADR | [0006-phase-1-shipped.md:81](/content/Decisions/0006-phase-1-shipped.md#L81) | 81 | in-section | 4. **Two `/sources`-adjacent Ops routes** with similar names (`/api/sources` Source Hunter vs `/api/source-registry` Phase 1 registry). Rename deferred to Phase 6 cleanup. | |
| ADR | [0006-phase-1-shipped.md:83](/content/Decisions/0006-phase-1-shipped.md#L83) | 83 | in-section | 6. **Source fingerprint not scheduled to re-run.** Will be a Phase 6 add to `scripts/attention-dispatcher.cjs` as a weekly producer. | |
| ADR | [0006-phase-1-shipped.md:86](/content/Decisions/0006-phase-1-shipped.md#L86) | 86 | in-section | ## Deferred exit criteria items | |
| ADR | [0006-phase-1-shipped.md:88](/content/Decisions/0006-phase-1-shipped.md#L88) | 88 | in-section | - **Archive.org auto-archive for Tier 1** — deferred to Phase 6 (not a Phase 1 blocker, was aspirational) | |
| ADR | [0006-phase-1-shipped.md:89](/content/Decisions/0006-phase-1-shipped.md#L89) | 89 | in-section | - **Ops `/sources` bulk-select UI** — per-row dropdown covers the 80% use case; bulk selection deferred to Phase 6 | |
| ADR | [0006-phase-1-shipped.md:110](/content/Decisions/0006-phase-1-shipped.md#L110) | 110 | in-section | ## What this opens | |
| ADR | [0006-phase-1-shipped.md:113](/content/Decisions/0006-phase-1-shipped.md#L113) | 113 | in-section | - Ongoing: source fingerprint drift (URLs rot over time, titles change, paywalls appear) — needs scheduled re-run in Phase 6 | |
| ADR | [0006-phase-1-shipped.md:115](/content/Decisions/0006-phase-1-shipped.md#L115) | 115 | in-section | - Ongoing: David's triage of the 1,622 flagged sources in the orphan report | |
| ADR | [0007-phase-4-claim-object-experiment.md:104](/content/Decisions/0007-phase-4-claim-object-experiment.md#L104) | 104 | in-section | ## What this opens | |
| ADR | [0007-phase-4-claim-object-experiment.md:108](/content/Decisions/0007-phase-4-claim-object-experiment.md#L108) | 108 | in-section | - **Synthesis prose voice guidelines** — what belongs in synthesis vs what belongs in a claim (no rule yet) | |

### regression / tests (60)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-1 | [handoff.md:116](/content/Phases/phase-1/handoff.md#L116) | 116 | in-section | 4. **Citation reuse rate is 21%** — 18,587 raw links deduped to 14,681 unique. Means each source is cited ~1.3× on average. Once profiles use `{{src:ID}}` refs, fixing one broken U | |
| phase-1 | [retrospective.md:85](/content/Phases/phase-1/retrospective.md#L85) | 85 | marker | The FEC pipeline that ADR-0003 named as "the pipeline to migrate" lives in `~/donor-map-engine`, a separate git repo. Modifying it from this worktree violates the "stay in the work | |
| phase-1 | [retrospective.md:100](/content/Phases/phase-1/retrospective.md#L100) | 100 | marker | - **In-repo migration scripts are cheaper than cross-repo refactors.** For each pending engine-repo pipeline, write a `scripts/migrate-X-citations-to-refs.cjs` first, run it on the | |
| phase-1 | [retrospective.md:111](/content/Phases/phase-1/retrospective.md#L111) | 111 | marker | 1. **Engine-repo pipeline migration** — 9 pipelines in `~/donor-map-engine` still write raw URLs. Migration backlog in `content/Phases/phase-1/decisions.md`. Will be addressed in f | |
| phase-2 | [decisions.md:45](/content/Phases/phase-2/decisions.md#L45) | 45 | marker | No other polling source gets cited in v1 without an explicit ADR update. Manual curation is the v1 workflow (~30 entries across 5 policies), automation deferred to a potential v2 p | |
| phase-2 | [exit-criteria.md:15](/content/Phases/phase-2/exit-criteria.md#L15) | 15 | unchecked-exit-criterion | - [ ] `data/entity-class-tags.jsonl` with ~231 politicians tagged and approved (mirror vocabulary) | |
| phase-2 | [exit-criteria.md:24](/content/Phases/phase-2/exit-criteria.md#L24) | 24 | unchecked-exit-criterion | - [ ] `scripts/batch-propose-class-tags.cjs` working for politicians | |
| phase-2 | [exit-criteria.md:44](/content/Phases/phase-2/exit-criteria.md#L44) | 44 | unchecked-exit-criterion | - [ ] 10 test queries executed, results verified against manual counts | |
| phase-2 | [exit-criteria.md:45](/content/Phases/phase-2/exit-criteria.md#L45) | 45 | unchecked-exit-criterion | - [ ] Each class-analysis filter tested on 2+ known cases | |
| phase-2 | [exit-criteria.md:48](/content/Phases/phase-2/exit-criteria.md#L48) | 48 | unchecked-exit-criterion | - [ ] No regressions on Phase 1 source registry functionality | |
| phase-2 | [handoff.md:126](/content/Phases/phase-2/handoff.md#L126) | 126 | in-section | 1. **Class tag batch approval cadence.** 450 donors + 231 politicians is ~680 proposals. At the 3-second target UX, that's ~34 minutes of David's time in one sitting. Does he want  | |
| phase-2 | [handoff.md:127](/content/Phases/phase-2/handoff.md#L127) | 127 | in-section | 2. **SQLite vs in-memory JSONL query backend.** ADR-0003 said SQLite for perf. If the JSONL stores stay under 50k records each, in-memory might be simpler. Decide early so the stor | |
| phase-2 | [handoff.md:128](/content/Phases/phase-2/handoff.md#L128) | 128 | in-section | 3. **Polling data source for Phase 2.75.** Manual curation v1 is fine, but we should know the preferred polling orgs before the tagging work starts (so polls can cite specific orga | |
| phase-2.75 | [exit-criteria.md:13](/content/Phases/phase-2.75/exit-criteria.md#L13) | 13 | unchecked-exit-criterion | - [ ] `data/policies.jsonl` schema defined with validator | |
| phase-2.75 | [exit-criteria.md:15](/content/Phases/phase-2.75/exit-criteria.md#L15) | 15 | unchecked-exit-criterion | - [ ] 5 policy records populated in `policies.jsonl` | |
| phase-2.75 | [exit-criteria.md:16](/content/Phases/phase-2.75/exit-criteria.md#L16) | 16 | unchecked-exit-criterion | - [ ] ~30 polling entries in `polling.jsonl` covering the 5 policies | |
| phase-2.75 | [exit-criteria.md:19](/content/Phases/phase-2.75/exit-criteria.md#L19) | 19 | unchecked-exit-criterion | - [ ] Class tags exist for every opposition donor cited on any policy page | |
| phase-2.75 | [exit-criteria.md:22](/content/Phases/phase-2.75/exit-criteria.md#L22) | 22 | unchecked-exit-criterion | - [ ] `scripts/lib/policies-store.cjs` with read/write API | |
| phase-2.75 | [exit-criteria.md:39](/content/Phases/phase-2.75/exit-criteria.md#L39) | 39 | unchecked-exit-criterion | - [ ] Tested on Twitter/X card validator | |
| phase-2.75 | [exit-criteria.md:40](/content/Phases/phase-2.75/exit-criteria.md#L40) | 40 | unchecked-exit-criterion | - [ ] Tested on Facebook OG debugger | |
| phase-2.75 | [exit-criteria.md:41](/content/Phases/phase-2.75/exit-criteria.md#L41) | 41 | unchecked-exit-criterion | - [ ] Tested on LinkedIn card validator | |
| phase-2.75 | [handoff.md:119](/content/Phases/phase-2.75/handoff.md#L119) | 119 | in-section | 4. **Contradiction callouts depend on politician rhetoric fields.** If Phase 2 class tagging doesn't populate `stated_positions{}`, contradiction callouts fall back to "no data" ra | |
| phase-2.75 | [handoff.md:128](/content/Phases/phase-2.75/handoff.md#L128) | 128 | in-section | 4. `/who-blocks-us` headline copy — locked phrase or A/B test? | |
| phase-6 | [decisions.md:17](/content/Phases/phase-6/decisions.md#L17) | 17 | marker | No new features land in Phase 6. Anything that looks like a new feature gets hotfixed into its proper phase (if still in-progress), punted to a new ADR for post-query-engine phases | |
| phase-6 | [decisions.md:20](/content/Phases/phase-6/decisions.md#L20) | 20 | in-section | The collector script walks every prior phase's `decisions.md`, `handoff.md`, and `retrospective.md` for TODO / deferred / known-issue / tech-debt markers and produces a categorized | |
| phase-6 | [exit-criteria.md:16](/content/Phases/phase-6/exit-criteria.md#L16) | 16 | unchecked-exit-criterion | - [ ] All explicit deferrals have ADR entries | |
| phase-6 | [exit-criteria.md:19](/content/Phases/phase-6/exit-criteria.md#L19) | 19 | unchecked-exit-criterion | - [ ] Test runner chosen + configured | |
| phase-6 | [exit-criteria.md:20](/content/Phases/phase-6/exit-criteria.md#L20) | 20 | unchecked-exit-criterion | - [ ] Source registry tests passing | |
| phase-6 | [exit-criteria.md:21](/content/Phases/phase-6/exit-criteria.md#L21) | 21 | unchecked-exit-criterion | - [ ] Fingerprint classifier tests passing | |
| phase-6 | [exit-criteria.md:22](/content/Phases/phase-6/exit-criteria.md#L22) | 22 | unchecked-exit-criterion | - [ ] Query engine sample-query tests passing | |
| phase-6 | [exit-criteria.md:23](/content/Phases/phase-6/exit-criteria.md#L23) | 23 | unchecked-exit-criterion | - [ ] Policy page snapshot tests passing | |
| phase-6 | [exit-criteria.md:24](/content/Phases/phase-6/exit-criteria.md#L24) | 24 | unchecked-exit-criterion | - [ ] Pre-commit sentinel tests passing | |
| phase-6 | [exit-criteria.md:25](/content/Phases/phase-6/exit-criteria.md#L25) | 25 | unchecked-exit-criterion | - [ ] CI integration: tests run on every PR | |
| phase-6 | [exit-criteria.md:32](/content/Phases/phase-6/exit-criteria.md#L32) | 32 | unchecked-exit-criterion | - [ ] `data/policies.jsonl` validator clean | |
| phase-6 | [exit-criteria.md:45](/content/Phases/phase-6/exit-criteria.md#L45) | 45 | unchecked-exit-criterion | - [ ] Rate limit enforcement tested with rapid-fire requests | |
| phase-6 | [exit-criteria.md:60](/content/Phases/phase-6/exit-criteria.md#L60) | 60 | unchecked-exit-criterion | - [ ] Every policy-cited entity has complete class tags | |
| phase-6 | [exit-criteria.md:61](/content/Phases/phase-6/exit-criteria.md#L61) | 61 | unchecked-exit-criterion | - [ ] 10 query edge cases tested (empty, single, max, unicode, special chars) | |
| phase-6 | [exit-criteria.md:69](/content/Phases/phase-6/exit-criteria.md#L69) | 69 | unchecked-exit-criterion | - [ ] Every ADR's closes/opens lists resolved or explicitly deferred | |
| phase-6 | [exit-criteria.md:77](/content/Phases/phase-6/exit-criteria.md#L77) | 77 | unchecked-exit-criterion | - [ ] No regressions on any phase's earlier exit criteria | |
| phase-6 | [handoff.md:28](/content/Phases/phase-6/handoff.md#L28) | 28 | marker | Build `scripts/phase-6-deferred-items-collector.cjs` — walks every `content/Phases/phase-*/decisions.md`, `handoff.md`, and `retrospective.md`, extracts any line containing "deferr | |
| phase-6 | [handoff.md:99](/content/Phases/phase-6/handoff.md#L99) | 99 | marker | - [ ] Every ADR's closes/opens lists resolved or explicitly deferred | |
| phase-6 | [handoff.md:120](/content/Phases/phase-6/handoff.md#L120) | 120 | in-section | - **Phase 6 scope will expand as earlier phases ship.** Every phase's `decisions.md` adds to the deferred items pile. Estimate will grow. | |
| phase-6 | [handoff.md:121](/content/Phases/phase-6/handoff.md#L121) | 121 | in-section | - **Regression test infrastructure doesn't exist yet.** Need to pick a test runner (Jest? Node's built-in test module?) and wire it into CI. Decision to be made in Phase 6. | |
| phase-6 | [handoff.md:127](/content/Phases/phase-6/handoff.md#L127) | 127 | in-section | 1. Test runner choice (Jest / Vitest / Node built-in)? | |
| ADR | [0002-monetization-model.md:52](/content/Decisions/0002-monetization-model.md#L52) | 52 | in-section | - Need for pricing validation after Phase 3 launch | |
| ADR | [0004-phase-2-75-policy-battles.md:170](/content/Decisions/0004-phase-2-75-policy-battles.md#L170) | 170 | in-section | - v2 policy expansion list: marijuana legalization, drug pricing, climate/carbon tax, gun reform, campaign finance, net neutrality, right to repair, carried interest loophole, big  | |
| ADR | [0004-phase-2-75-policy-battles.md:171](/content/Decisions/0004-phase-2-75-policy-battles.md#L171) | 171 | in-section | - OG card design decisions (template, colors, typography — should follow Design System) | |
| ADR | [0004-phase-2-75-policy-battles.md:175](/content/Decisions/0004-phase-2-75-policy-battles.md#L175) | 175 | marker | ## v2 policies (deferred — not part of Phase 2.75 scope) | |
| ADR | [0005-phase-6-bug-hunt.md:15](/content/Decisions/0005-phase-6-bug-hunt.md#L15) | 15 | marker | ADR-0003 defined a 6-phase query engine build (Phases 1 through 5, with Phase 2.75 added via ADR-0004). Every phase ships features. None of the phases are dedicated to hardening —  | |
| ADR | [0005-phase-6-bug-hunt.md:18](/content/Decisions/0005-phase-6-bug-hunt.md#L18) | 18 | marker | 1. **Bug accumulation.** Every mid-phase decision log has "deferred until later" entries. "Later" never arrives because the next phase starts immediately on ship. | |
| ADR | [0005-phase-6-bug-hunt.md:33](/content/Decisions/0005-phase-6-bug-hunt.md#L33) | 33 | marker | Add **Phase 6 — Bug Hunt / Hardening** as the final phase of the query engine build. Phase 6 is dedicated entirely to fixing bugs, closing deferred items, adding regression coverag | |
| ADR | [0005-phase-6-bug-hunt.md:38](/content/Decisions/0005-phase-6-bug-hunt.md#L38) | 38 | marker | - Walk every phase's `decisions.md` for "deferred until later" items. | |
| ADR | [0005-phase-6-bug-hunt.md:104](/content/Decisions/0005-phase-6-bug-hunt.md#L104) | 104 | marker | - **Every earlier phase gains a "what's deferred for Phase 6" section** in its `decisions.md`. Phase transition skill should prompt the operator to add any deferrals to that file b | |
| ADR | [0005-phase-6-bug-hunt.md:118](/content/Decisions/0005-phase-6-bug-hunt.md#L118) | 118 | in-section | - Permanent regression test suite (new maintenance surface) | |
| ADR | [0005-phase-6-bug-hunt.md:120](/content/Decisions/0005-phase-6-bug-hunt.md#L120) | 120 | in-section | - Phase-6-specific tooling (a "deferred items collector" script that walks all phase folders and extracts open items) | |
| ADR | [0005-phase-6-bug-hunt.md:127](/content/Decisions/0005-phase-6-bug-hunt.md#L127) | 127 | marker | - Explicitly deferred to post-launch | |
| ADR | [0006-phase-1-shipped.md:79](/content/Decisions/0006-phase-1-shipped.md#L79) | 79 | in-section | 2. **~16 edge-case FEC citations** untouched by the migration (strikethrough archived URLs, wikilinks nested in markdown links, broken `*(source unavailable)*` markers). All intent | |
| ADR | [0006-phase-1-shipped.md:82](/content/Decisions/0006-phase-1-shipped.md#L82) | 82 | in-section | 5. **No regression tests for the source registry.** 10/10 smoke tests passed during dev but aren't checked in. Phase 6 deliverable. | |
| ADR | [0006-phase-1-shipped.md:90](/content/Decisions/0006-phase-1-shipped.md#L90) | 90 | in-section | - **Top-50 orphan triage** — deferred to David (the report is ready and waiting in `content/Admin Notes/orphan-citations-report.md`) | |
| ADR | [0006-phase-1-shipped.md:102](/content/Decisions/0006-phase-1-shipped.md#L102) | 102 | marker | These CANNOT be deferred without forcing a Phase 2.75 retrofit. | |

### data integrity (24)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-1 | [decisions.md:22](/content/Phases/phase-1/decisions.md#L22) | 22 | marker | Following the `relationships-store.cjs` pattern. Store is lazy-loaded on first call, cached for the life of the process. `addOrFindSource` checks the URL dedupe index before writin | |
| phase-1 | [retrospective.md:123](/content/Phases/phase-1/retrospective.md#L123) | 123 | marker | 3. **`data/sources.jsonl` is append-only with full-file rewrite on every update.** At 14,681 records (~7.3 MB), this is fine. At 100k records this would start to hurt. Revisit in P | |
| phase-2 | [exit-criteria.md:13](/content/Phases/phase-2/exit-criteria.md#L13) | 13 | unchecked-exit-criterion | - [ ] `data/entities.jsonl` schema + store + validator | |
| phase-2 | [exit-criteria.md:14](/content/Phases/phase-2/exit-criteria.md#L14) | 14 | unchecked-exit-criterion | - [ ] `data/entity-class-tags.jsonl` with ~450 donors tagged and approved | |
| phase-2 | [exit-criteria.md:16](/content/Phases/phase-2/exit-criteria.md#L16) | 16 | unchecked-exit-criterion | - [ ] `data/events.jsonl` schema + store + validator | |
| phase-2 | [exit-criteria.md:17](/content/Phases/phase-2/exit-criteria.md#L17) | 17 | unchecked-exit-criterion | - [ ] `data/events.jsonl` populated with votes / hearings / regulations | |
| phase-2 | [exit-criteria.md:18](/content/Phases/phase-2/exit-criteria.md#L18) | 18 | unchecked-exit-criterion | - [ ] `events.jsonl` records have `policy_id` field (nullable, Phase 2.75 dependency) | |
| phase-2 | [exit-criteria.md:19](/content/Phases/phase-2/exit-criteria.md#L19) | 19 | unchecked-exit-criterion | - [ ] `events.jsonl` records have `obstruction_type` field (enum, Phase 2.75 dependency) | |
| phase-2 | [exit-criteria.md:20](/content/Phases/phase-2/exit-criteria.md#L20) | 20 | unchecked-exit-criterion | - [ ] `data/policy-stakes-vocab.jsonl` with initial vocabulary seed | |
| phase-2 | [handoff.md:122](/content/Phases/phase-2/handoff.md#L122) | 122 | marker | Flag to the implementer: if any of these gets cut or deferred, Phase 2.75 has to retrofit the schema after the fact, which is expensive. Bake them in now. | |
| phase-2.75 | [exit-criteria.md:14](/content/Phases/phase-2.75/exit-criteria.md#L14) | 14 | unchecked-exit-criterion | - [ ] `data/polling.jsonl` schema defined with validator | |
| phase-2.75 | [exit-criteria.md:17](/content/Phases/phase-2.75/exit-criteria.md#L17) | 17 | unchecked-exit-criterion | - [ ] `events.jsonl` has `policy_id` populated for all policy-related events | |
| phase-2.75 | [exit-criteria.md:18](/content/Phases/phase-2.75/exit-criteria.md#L18) | 18 | unchecked-exit-criterion | - [ ] `events.jsonl` has `obstruction_type` populated where applicable | |
| phase-2.75 | [handoff.md:117](/content/Phases/phase-2.75/handoff.md#L117) | 117 | in-section | 2. **Polling data freshness.** Manual curation means polls go stale. v1 accepts this; v2 considers automation. | |
| phase-6 | [exit-criteria.md:28](/content/Phases/phase-6/exit-criteria.md#L28) | 28 | unchecked-exit-criterion | - [ ] `data/relationships.jsonl` validator clean | |
| phase-6 | [exit-criteria.md:29](/content/Phases/phase-6/exit-criteria.md#L29) | 29 | unchecked-exit-criterion | - [ ] `data/sources.jsonl` validator clean | |
| phase-6 | [exit-criteria.md:30](/content/Phases/phase-6/exit-criteria.md#L30) | 30 | unchecked-exit-criterion | - [ ] `data/entity-class-tags.jsonl` validator clean | |
| phase-6 | [exit-criteria.md:31](/content/Phases/phase-6/exit-criteria.md#L31) | 31 | unchecked-exit-criterion | - [ ] `data/events.jsonl` validator clean | |
| ADR | [0004-phase-2-75-policy-battles.md:155](/content/Decisions/0004-phase-2-75-policy-battles.md#L155) | 155 | marker | - **New pipeline consideration**: polling data. Manual curation v1 (~30 entries). Potential pipeline automation v2 — not blocking. | |
| ADR | [0006-phase-1-shipped.md:84](/content/Decisions/0006-phase-1-shipped.md#L84) | 84 | in-section | 7. **`data/sources.jsonl` rewrite-whole-file persistence** is fine at 14,681 records, fragile at 100k. Revisit in Phase 6 if it matters. | |
| ADR | [0006-phase-1-shipped.md:112](/content/Decisions/0006-phase-1-shipped.md#L112) | 112 | in-section | - Phase 2 work (class tagging + query engine + events.jsonl) | |
| ADR | [0007-phase-4-claim-object-experiment.md:106](/content/Decisions/0007-phase-4-claim-object-experiment.md#L106) | 106 | in-section | - **Source registry migration for the 15 AOC claims** — follow-up task: register each `source_fallback_url` in `sources.jsonl` via `addOrFindSource`, swap to `src_` refs in the cla | |
| ADR | [0007-phase-4-claim-object-experiment.md:109](/content/Decisions/0007-phase-4-claim-object-experiment.md#L109) | 109 | in-section | - **Claim-object editing workflow in Ops** — currently requires direct JSONL editing; a future Ops `/claims` page could make adding claims interactive | |
| ADR | [0007-phase-4-claim-object-experiment.md:110](/content/Decisions/0007-phase-4-claim-object-experiment.md#L110) | 110 | in-section | - **Tier-gating for the data panels the claim-object pattern implies** — the panel would show different claim counts by viewer tier in Phase 2.5 | |

### security / auth (16)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-2 | [exit-criteria.md:52](/content/Phases/phase-2/exit-criteria.md#L52) | 52 | unchecked-exit-criterion | - [ ] Vault Rules.md updated with entities.jsonl / events.jsonl authority | |
| phase-2.5 | [decisions.md:34](/content/Phases/phase-2.5/decisions.md#L34) | 34 | marker | ## 2026-04-14 — Stripe activation deferred | |
| phase-2.5 | [decisions.md:36](/content/Phases/phase-2.5/decisions.md#L36) | 36 | marker | David ran through the Clerk half of Phase 2.5 activation end-to-end during the live session. The Stripe half (creating 4 products, pasting price IDs + webhook secret into `.env.loc | |
| phase-2.5 | [handoff.md:13](/content/Phases/phase-2.5/handoff.md#L13) | 13 | marker | **Sprint 1 shipped + Clerk activated end-to-end. Stripe activation deferred.** | |
| phase-2.5 | [handoff.md:68](/content/Phases/phase-2.5/handoff.md#L68) | 68 | marker | ## What's deferred (Stripe activation) | |
| phase-2.5 | [handoff.md:97](/content/Phases/phase-2.5/handoff.md#L97) | 97 | marker | - [ ] Stripe products created (**deferred**) | |
| phase-2.5 | [handoff.md:98](/content/Phases/phase-2.5/handoff.md#L98) | 98 | marker | - [ ] Stripe webhook endpoint configured (**deferred**) | |
| phase-2.5 | [handoff.md:99](/content/Phases/phase-2.5/handoff.md#L99) | 99 | marker | - [ ] `.env.local` populated with Stripe keys (**deferred**) | |
| phase-2.75 | [exit-criteria.md:53](/content/Phases/phase-2.75/exit-criteria.md#L53) | 53 | unchecked-exit-criterion | - [ ] Policy pages free for anonymous visitors (no auth gate) | |
| phase-2.75 | [exit-criteria.md:55](/content/Phases/phase-2.75/exit-criteria.md#L55) | 55 | unchecked-exit-criterion | - [ ] Confirmed the auth middleware from Phase 2.5 does NOT gate these pages when it ships | |
| phase-2.75 | [handoff.md:126](/content/Phases/phase-2.75/handoff.md#L126) | 126 | in-section | 2. Which polling orgs are authoritative for each policy? KFF for healthcare, Data for Progress for economic, Pew for civic — but housing specifically? | |
| phase-6 | [exit-criteria.md:46](/content/Phases/phase-6/exit-criteria.md#L46) | 46 | unchecked-exit-criterion | - [ ] Auth token expiry + refresh tested | |
| phase-6 | [exit-criteria.md:63](/content/Phases/phase-6/exit-criteria.md#L63) | 63 | unchecked-exit-criterion | - [ ] Every auth tier gate tested end-to-end | |
| ADR | [0003-phased-query-engine-build.md:59](/content/Decisions/0003-phased-query-engine-build.md#L59) | 59 | in-section | - **Policy Battles Page — now Phase 2.75 via ADR-0004.** What started as a noted-but-unscoped idea became a full phase after a riff session on 2026-04-14. Slotted between Phase 2 ( | |
| ADR | [0005-phase-6-bug-hunt.md:29](/content/Decisions/0005-phase-6-bug-hunt.md#L29) | 29 | marker | 3. **Dedicated Phase 6 at the end of the sequence.** Approved. Runs after Phase 5 (Story Score) ships, dedicated entirely to bug hunting, regression coverage, performance/security/ | |
| ADR | [0007-phase-4-claim-object-experiment.md:50](/content/Decisions/0007-phase-4-claim-object-experiment.md#L50) | 50 | marker | 15 starter claims across 6 section keys (identity, funding, positions, votes, alliances, moments) populated via `scripts/seed-aoc-claims.cjs`. Every claim has a `source_fallback_ur | |

### phase 2.75 polish (12)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-2.75 | [exit-criteria.md:23](/content/Phases/phase-2.75/exit-criteria.md#L23) | 23 | unchecked-exit-criterion | - [ ] `scripts/lib/polling-store.cjs` with read/write API | |
| phase-2.75 | [exit-criteria.md:24](/content/Phases/phase-2.75/exit-criteria.md#L24) | 24 | unchecked-exit-criterion | - [ ] Quartz plugin for policy page template | |
| phase-2.75 | [exit-criteria.md:25](/content/Phases/phase-2.75/exit-criteria.md#L25) | 25 | unchecked-exit-criterion | - [ ] Quartz plugin (or Next.js route) for OG card generation | |
| phase-2.75 | [exit-criteria.md:27](/content/Phases/phase-2.75/exit-criteria.md#L27) | 27 | unchecked-exit-criterion | - [ ] Zip code lookup wired into policy pages | |
| phase-2.75 | [exit-criteria.md:48](/content/Phases/phase-2.75/exit-criteria.md#L48) | 48 | unchecked-exit-criterion | - [ ] Sentinel blocklist extension active on policy pages | |
| phase-2.75 | [exit-criteria.md:58](/content/Phases/phase-2.75/exit-criteria.md#L58) | 58 | unchecked-exit-criterion | - [ ] CLAUDE.md updated with policy page workflow rules | |
| phase-2.75 | [exit-criteria.md:66](/content/Phases/phase-2.75/exit-criteria.md#L66) | 66 | unchecked-exit-criterion | - [ ] Every policy page loads in <2s on a cold cache | |
| phase-2.75 | [exit-criteria.md:68](/content/Phases/phase-2.75/exit-criteria.md#L68) | 68 | unchecked-exit-criterion | - [ ] Cross-page links (donor profile → policy page → rep lookup) work end-to-end | |
| phase-2.75 | [handoff.md:125](/content/Phases/phase-2.75/handoff.md#L125) | 125 | in-section | 1. OG card visual design — follow existing Design System (cream/yellow/red brutalist) or new template? | |
| phase-2.75 | [handoff.md:127](/content/Phases/phase-2.75/handoff.md#L127) | 127 | in-section | 3. Zip code lookup — reuse existing component or rebuild? | |
| phase-6 | [exit-criteria.md:51](/content/Phases/phase-6/exit-criteria.md#L51) | 51 | unchecked-exit-criterion | - [ ] Every policy page prose scanned for banned words | |
| phase-6 | [exit-criteria.md:62](/content/Phases/phase-6/exit-criteria.md#L62) | 62 | unchecked-exit-criterion | - [ ] OG cards re-validated on X/LinkedIn/Facebook | |

### pipelines (10)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-1 | [decisions.md:43](/content/Phases/phase-1/decisions.md#L43) | 43 | marker | **For the engine-repo fec-summary-pipeline.cjs (deferred to a follow-up PR):** | |
| phase-1 | [decisions.md:63](/content/Phases/phase-1/decisions.md#L63) | 63 | marker | The same in-repo vault-migration script pattern (grep for raw URLs, register, rewrite to refs) can be applied to each one as a v1 — and then the engine-repo scripts can be migrated | |
| phase-1 | [exit-criteria.md:53](/content/Phases/phase-1/exit-criteria.md#L53) | 53 | unchecked-exit-criterion | - [ ] Ops app starts and /sources page loads in under 2s — **requires runtime verification by David** (Next build has a pre-existing Turbopack workspace-root issue, but `npm run de | |
| phase-1 | [handoff.md:91](/content/Phases/phase-1/handoff.md#L91) | 91 | marker | 3. **Engine-repo FEC pipeline migration** — deferred. The engine repo's `scripts/fec-summary-pipeline.cjs` still writes raw URLs at line 304. A future PR in `~/donor-map-engine` sh | |
| phase-2 | [exit-criteria.md:53](/content/Phases/phase-2/exit-criteria.md#L53) | 53 | unchecked-exit-criterion | - [ ] Pipeline Guide.md updated if new pipelines ship | |
| phase-2.75 | [exit-criteria.md:60](/content/Phases/phase-2.75/exit-criteria.md#L60) | 60 | unchecked-exit-criterion | - [ ] Pipeline Guide.md updated if polling pipeline added | |
| ADR | [0004-phase-2-75-policy-battles.md:169](/content/Decisions/0004-phase-2-75-policy-battles.md#L169) | 169 | in-section | - Polling pipeline automation (v2 consideration, not blocking) | |
| ADR | [0006-phase-1-shipped.md:78](/content/Decisions/0006-phase-1-shipped.md#L78) | 78 | in-section | 1. **Engine-repo pipeline migration backlog** — 9 pipelines in `~/donor-map-engine` still write raw URLs (FEC individual, Congress, LDA, ProPublica, SEC, GovTrack, USAspending, SAM | |
| ADR | [0006-phase-1-shipped.md:91](/content/Decisions/0006-phase-1-shipped.md#L91) | 91 | in-section | - **Ops runtime verification at <2s page load** — deferred to David (Next build has a pre-existing Turbopack workspace-root issue unrelated to Phase 1 code; `npm run dev` is unaffe | |
| ADR | [0006-phase-1-shipped.md:114](/content/Decisions/0006-phase-1-shipped.md#L114) | 114 | in-section | - Ongoing: engine-repo pipeline migration backlog | |

### class tags (10)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-1 | [exit-criteria.md:40](/content/Phases/phase-1/exit-criteria.md#L40) | 40 | unchecked-exit-criterion | - [ ] Top 50 triaged by David — **deferred to David**, report is ready for review | |
| phase-2 | [exit-criteria.md:25](/content/Phases/phase-2/exit-criteria.md#L25) | 25 | unchecked-exit-criterion | - [ ] Ops `/class-tags` review page functional | |
| phase-2 | [exit-criteria.md:26](/content/Phases/phase-2/exit-criteria.md#L26) | 26 | unchecked-exit-criterion | - [ ] 3-second per-proposal approval UX verified | |
| phase-6 | [exit-criteria.md:53](/content/Phases/phase-6/exit-criteria.md#L53) | 53 | unchecked-exit-criterion | - [ ] Every class tag assignment is sourced | |
| phase-6 | [exit-criteria.md:55](/content/Phases/phase-6/exit-criteria.md#L55) | 55 | unchecked-exit-criterion | - [ ] Optional lawyer review completed (if elected) | |
| phase-6 | [exit-criteria.md:59](/content/Phases/phase-6/exit-criteria.md#L59) | 59 | unchecked-exit-criterion | - [ ] 20 bot-block needs_review sources manually spot-checked | |
| phase-6 | [exit-criteria.md:81](/content/Phases/phase-6/exit-criteria.md#L81) | 81 | unchecked-exit-criterion | - [ ] Phase 6 retrospective reviewed | |
| ADR | [0001-class-tag-vocabulary.md:49](/content/Decisions/0001-class-tag-vocabulary.md#L49) | 49 | in-section | - Need for governance on policy_stakes growth (quarterly review) | |
| ADR | [0004-phase-2-75-policy-battles.md:172](/content/Decisions/0004-phase-2-75-policy-battles.md#L172) | 172 | in-section | - Sentinel scoping work (path-based rules for the self-review-mirror) | |
| ADR | [0004-phase-2-75-policy-battles.md:173](/content/Decisions/0004-phase-2-75-policy-battles.md#L173) | 173 | in-section | - Editor workflow for policy prose approval | |

### documentation (10)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-1 | [exit-criteria.md:57](/content/Phases/phase-1/exit-criteria.md#L57) | 57 | marker | **Phase 1 is shipped.** All blocking deliverables complete; deferred items are documented in retrospective + handoff and do not block Phase 2 start. | |
| phase-1 | [retrospective.md:110](/content/Phases/phase-1/retrospective.md#L110) | 110 | marker | ### Acceptable (documented, deferred) | |
| phase-1 | [retrospective.md:118](/content/Phases/phase-1/retrospective.md#L118) | 118 | marker | 4. **Two `/sources`-adjacent Ops routes** with similar names (`/api/sources` for Source Hunter, `/api/source-registry` for the Phase 1 registry). Naming is documented in CLAUDE.md  | |
| phase-6 | [exit-criteria.md:38](/content/Phases/phase-6/exit-criteria.md#L38) | 38 | unchecked-exit-criterion | - [ ] `/api/query` p50/p95 benchmarked + documented | |
| phase-6 | [exit-criteria.md:39](/content/Phases/phase-6/exit-criteria.md#L39) | 39 | unchecked-exit-criterion | - [ ] Policy page cold-cache load time benchmarked + documented | |
| phase-6 | [exit-criteria.md:40](/content/Phases/phase-6/exit-criteria.md#L40) | 40 | unchecked-exit-criterion | - [ ] Profile data panel render time benchmarked + documented | |
| phase-6 | [exit-criteria.md:66](/content/Phases/phase-6/exit-criteria.md#L66) | 66 | unchecked-exit-criterion | - [ ] CLAUDE.md cross-references all resolve | |
| phase-6 | [exit-criteria.md:67](/content/Phases/phase-6/exit-criteria.md#L67) | 67 | unchecked-exit-criterion | - [ ] Vault Rules.md cross-references all resolve | |
| phase-6 | [exit-criteria.md:68](/content/Phases/phase-6/exit-criteria.md#L68) | 68 | unchecked-exit-criterion | - [ ] Pipeline Guide.md cross-references all resolve | |
| ADR | [0006-phase-1-shipped.md:76](/content/Decisions/0006-phase-1-shipped.md#L76) | 76 | in-section | ## Tech debt documented (not addressed in Phase 1) | |

### legal / defamation (8)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-2.75 | [decisions.md:20](/content/Phases/phase-2.75/decisions.md#L20) | 20 | marker | Ship narrow, prove the pattern, expand. 5 policies chosen per David's priority: Housing, Healthcare, AIPAC/BDS, Minimum Wage, Student Debt. v2 candidates deferred (marijuana, drug  | |
| phase-2.75 | [exit-criteria.md:33](/content/Phases/phase-2.75/exit-criteria.md#L33) | 33 | unchecked-exit-criterion | - [ ] AIPAC / BDS laws (legally reviewed) | |
| phase-2.75 | [exit-criteria.md:49](/content/Phases/phase-2.75/exit-criteria.md#L49) | 49 | unchecked-exit-criterion | - [ ] AIPAC page reviewed by David | |
| phase-2.75 | [handoff.md:116](/content/Phases/phase-2.75/handoff.md#L116) | 116 | in-section | 1. **AIPAC page legal risk.** The editorial firewall in ADR-0004 is designed to be litigation-proof but David should still review personally and consider optional lawyer review bef | |
| phase-6 | [exit-criteria.md:54](/content/Phases/phase-6/exit-criteria.md#L54) | 54 | unchecked-exit-criterion | - [ ] AIPAC page full output reviewed + approved by David | |
| phase-6 | [handoff.md:18](/content/Phases/phase-6/handoff.md#L18) | 18 | marker | Harden the query engine system by closing deferred items accumulated across Phases 1–5, adding regression coverage for fixed bugs, auditing data integrity / performance / security  | |
| phase-6 | [handoff.md:123](/content/Phases/phase-6/handoff.md#L123) | 123 | in-section | - **Defamation audit may require legal counsel** for the AIPAC page specifically. That's a David decision and may add cost/time to Phase 6. | |
| phase-6 | [handoff.md:129](/content/Phases/phase-6/handoff.md#L129) | 129 | in-section | 3. Legal counsel for AIPAC page — yes/no/budget? | |

### performance (7)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| phase-2 | [exit-criteria.md:46](/content/Phases/phase-2/exit-criteria.md#L46) | 46 | unchecked-exit-criterion | - [ ] `npx quartz build` clean, build time increase <30s | |
| phase-2.75 | [exit-criteria.md:43](/content/Phases/phase-2.75/exit-criteria.md#L43) | 43 | unchecked-exit-criterion | - [ ] Build time impact acceptable (<30s increase) | |
| phase-2.75 | [handoff.md:118](/content/Phases/phase-2.75/handoff.md#L118) | 118 | in-section | 3. **OG card generation performance.** If every build regenerates all OG cards, build time increases. Cache by policy content hash. | |
| phase-6 | [exit-criteria.md:37](/content/Phases/phase-6/exit-criteria.md#L37) | 37 | unchecked-exit-criterion | - [ ] Quartz build time benchmarked + documented | |
| phase-6 | [exit-criteria.md:41](/content/Phases/phase-6/exit-criteria.md#L41) | 41 | unchecked-exit-criterion | - [ ] Top 3 slow paths addressed or explicitly accepted-slow | |
| phase-6 | [handoff.md:122](/content/Phases/phase-6/handoff.md#L122) | 122 | in-section | - **Performance benchmarks need a baseline** captured before Phase 1 shipped. If we don't have that baseline, Phase 6 has to establish "current" as the new baseline and measure dri | |
| phase-6 | [handoff.md:128](/content/Phases/phase-6/handoff.md#L128) | 128 | in-section | 2. Performance targets — do we have hard numbers for "acceptable" query latency? | |

### phase 4 polish (2)

| Phase | Source | Line | Kind | Text | Triage |
|---|---|---:|---|---|---|
| ADR | [0001-class-tag-vocabulary.md:50](/content/Decisions/0001-class-tag-vocabulary.md#L50) | 50 | in-section | - Need for migration tooling when vocabulary changes | |
| ADR | [0007-phase-4-claim-object-experiment.md:107](/content/Decisions/0007-phase-4-claim-object-experiment.md#L107) | 107 | in-section | - **Editorial policy for new profiles** — which profile types default to claim-object, which default to prose | |

---

*Regenerate: `node scripts/phase-6-deferred-items-collector.cjs --write`. The regeneration is idempotent — re-running overwrites this file with the current state of every prior phase's deferred items.*
