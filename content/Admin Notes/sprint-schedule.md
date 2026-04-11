---
title: Sprint Schedule
type: admin-note
note-type: data
priority: normal
status: active
last-updated: '2026-04-11'
sprint-id: "2026-04-sprint"
sprint-start: '2026-04-10'
sprint-end: '2026-04-30'
sprint-goal: "Public launch of thedonormap.org with ≥40 verified profiles, ≥100 draft→ready promotions, all pipeline bugs fixed, 528 conflicts triaged"
---

# Sprint Schedule — April 10-30, 2026

This file is the **single source of truth** for the Apr 10-30 sprint schedule. Both the Ops app calendar component AND both Claude sessions read this file. Edit the frontmatter `last-updated` field whenever you modify the schedule. Phases, daily blocks, tasks, and exit criteria are all in structured form below so the calendar can parse them.

**Companion files:**
- Full strategic plan: `C:\Users\third\.claude\plans\cheeky-knitting-fox.md` (local, not in git)
- Session handoff log: `content/Session State.md`
- Readiness conflict backlog (David-owned): `content/Admin Notes/readiness-conflicts.md`
- This file: `content/Admin Notes/sprint-schedule.md`

---

## Sprint metadata

```yaml
sprint_id: 2026-04-sprint
start_date: 2026-04-10
end_date: 2026-04-30
duration_days: 21
total_hour_budget: 215
daily_baseline_hours: 10
crunch_days_allowed: 3
rest_half_days: 3  # target: Sunday afternoons
hard_stop_time: "20:30"
```

## North Star targets (priority order)

```yaml
targets:
  - id: depth
    rank: 1
    metric: verified_profile_count
    baseline: 3
    goal: 40
    current: 3
    description: "verified (A+) profiles with editorial sign-off (David-only sign-off)"

  - id: breadth
    rank: 2
    metric: draft_to_ready_promotions
    baseline: 288  # draft count at sprint start
    goal: 188       # ≤188 means ≥100 promotions
    current: 319   # 288 − 1 (Summer Lee draft→ready) + 32 (janitor zombie demotions ready→draft). Expected to decrease sharply once the 32 demoted profiles get fresh pipeline data and are re-promoted.
    description: "draft profiles promoted to ready tier"

  - id: systems
    rank: 3
    metric: pipeline_bugs_closed
    baseline: 7
    goal: 0
    current: 22  # 20 previous + 2 fixed in 2026-04-11 night session (updateFrontmatter scalar/list hybrid corruption, 22-profile bioguide contamination cleanup with 4 new quality-check rules)
    description: "known pipeline bugs blocking data integrity. Original 7: A000383, QVT, GovTrack cache, redirect enrichment, NHTSA non-auto, DOJ index-size, SAM fuzzy. Plus Ops API array-toString bug (Whitehouse 2026-04-10 afternoon). Plus updateFrontmatter scalar/list (2026-04-11) and bulk-bioguide contamination (2026-04-11)."

  - id: polish
    rank: 4
    metric: public_launch_shipped
    baseline: false
    goal: true
    current: false
    description: "thedonormap.org publicly shareable with mobile polish + interactive pages + feedback system"
```

## Phases

```yaml
phases:
  - id: phase_1
    name: "Foundation"
    theme: "Fix the plumbing before scaling production"
    start: 2026-04-10
    end: 2026-04-16
    days: 7
    hours_budget: 70
    exit_criteria:
      - verified_count_gte: 12
      - conflicts_resolved_gte: 175
      - draft_to_ready_gte: 25
      - pipeline_bugs_closed_gte: 7
      - ops_rule_files_written: true

  - id: phase_2
    name: "Depth acceleration"
    theme: "Scale depth while systems run clean"
    start: 2026-04-17
    end: 2026-04-23
    days: 7
    hours_budget: 70
    exit_criteria:
      - verified_count_gte: 32
      - draft_to_ready_gte: 75
      - conflicts_resolved_gte: 350
      - mobile_polish_shipped: true
      - interactive_pages_audited: true

  - id: phase_3
    name: "Launch prep"
    theme: "Make what exists credible to a public audience. Ship."
    start: 2026-04-24
    end: 2026-04-30
    days: 7
    hours_budget: 70
    exit_criteria:
      - verified_count_gte: 40
      - draft_to_ready_gte: 100
      - conflicts_resolved_gte: 528
      - legal_review_pass_complete: true
      - soft_launch_shipped: 2026-04-27
      - public_launch_shipped: 2026-04-30
```

## Daily block template (weekday)

```yaml
daily_template:
  - time: "07:00-07:15"
    block: warmup
    owner: david
    work: "Coffee, scan overnight notifications, read Session State"
    category: admin

  - time: "07:15-09:15"
    block: research_claude_deep_editorial
    owner: research_claude
    work: "2 verified-candidate reviews OR 4 draft→ready promotions"
    category: depth
    duration_hours: 2

  - time: "09:15-09:45"
    block: break_and_ops
    owner: david
    work: "Admin Notes triage, emails, Ops check"
    category: admin
    duration_hours: 0.5

  - time: "09:45-11:45"
    block: code_claude_systems_polish
    owner: code_claude
    work: "Pipeline fixes, mobile CSS, Ops features"
    category: systems
    duration_hours: 2

  - time: "11:45-12:45"
    block: lunch
    owner: david
    work: "Lunch — NOT at desk"
    category: rest
    duration_hours: 1

  - time: "12:45-14:45"
    block: research_claude_depth_breadth
    owner: research_claude
    work: "2 more editorial reviews OR draft→ready sweep"
    category: depth
    duration_hours: 2

  - time: "14:45-15:45"
    block: conflict_triage
    owner: david
    work: "Work through 25-30 items from readiness-conflicts.md"
    category: david_only
    duration_hours: 1
    daily_target_items: 27

  - time: "15:45-16:30"
    block: david_only_work
    owner: david
    work: "URL verification, legal review, Ops edge cases"
    category: david_only
    duration_hours: 0.75

  - time: "16:30-17:30"
    block: dinner
    owner: david
    work: "Dinner — NOT at desk"
    category: rest
    duration_hours: 1

  - time: "17:30-19:30"
    block: flex
    owner: either
    work: "Code Claude catch-up OR Stories track OR buffer"
    category: flex
    duration_hours: 2

  - time: "19:30-20:30"
    block: session_save
    owner: either
    work: "Update Session State, commit in chunks, merge to v4, push"
    category: admin
    duration_hours: 1

  - time: "20:30"
    block: hard_stop
    owner: david
    work: "Protect sleep. Window to 23:30 is crunch-only."
```

## Phase 1 — must-complete tasks

```yaml
phase_1_tasks:
  code_claude:
    - id: cc_01
      task: "Fix A000383 bioguide pipeline bug"
      status: done  # fixed 2026-04-10 pre-sprint
      completed_date: 2026-04-10
      notes: "Chamber filter + state match + last-name verification deployed in congress-pipeline.cjs. 95 profiles cleaned of contaminated auto-blocks."

    - id: cc_02
      task: "Fix GovTrack query gap (0 bills when real counts exist)"
      status: done  # fixed 2026-04-10 pre-sprint
      completed_date: 2026-04-10
      notes: "Cache invalidation deployed — refetches on impossible 0/0 state. Frontmatter re-enrichment breaks enrichedKey lock."

    - id: cc_03
      task: "Fix QVT Financial false positives (DOJ/NHTSA/SAM)"
      status: done  # fixed 2026-04-10 pre-sprint
      completed_date: 2026-04-10
      notes: "DOJ sanity cap (>10K = API bug), SAM awardee legal name validation, NHTSA auto-adjacent filter."

    - id: cc_04
      task: "Fix pipeline enriching redirect files"
      status: done  # fixed 2026-04-10 pre-sprint
      completed_date: 2026-04-10
      notes: "isRedirectProfile() helper added to shared.cjs, 6 redirect files cleaned."

    - id: cc_05
      task: "Root-cause and fix the content-readiness:: ready NUL-padding script"
      status: done
      completed_date: 2026-04-10
      notes: "Root-caused to legacy Obsidian Dataview inline fields imported at vault creation, not any actively running script. Built scripts/strip-inline-dataview.cjs (199 lines), swept 562 profiles, stripped 731 body-dataview lines. Commits 59e2bd79, 3829e3eb."

    - id: cc_06
      task: "Add rule comments to Ops profile editor source (frontmatter-only + URL editor-only rules)"
      status: done
      completed_date: 2026-04-10
      notes: "Block-comment headers added to 6 Ops source files (editor/page.tsx, api/edit/route.ts, api/profile/readiness/route.ts, lib/local-write.ts, api/urls/save/route.ts, urls/page.tsx). Advisory only, no runtime behaviour changes. Commit 15e76204."

    - id: cc_07
      task: "Run pipeline enrichment on 12 new stubs"
      status: in-progress
      blocker: "Scheduler was stuck since 2026-04-09 17:44Z — kicked via gh workflow disable/enable at 2026-04-10 20:32Z (see cc_14). Verification pending: next scheduled slot (02:00Z or 08:00Z UTC 2026-04-11) will confirm whether the scheduler resumed."
      stubs: ["Summer Lee", "Nina Turner", "George Latimer", "Wesley Bell", "Shontel Brown", "Bernie Marcus", "Mark Mellman", "Brian Armstrong", "Ben Horowitz", "Chris Larsen", "Brad Garlinghouse", "Paul Atkins"]
      partial_progress: "Parallel-step log contamination bug fixed in commit 0bec4b7. Timeout bumped 25→30 min, job timeout 35→40 min. Scheduler toggled in cc_14. Once scheduled runs resume, the 12 stubs will be enriched automatically on the next cron tick."

    - id: cc_08
      task: "Build Ops calendar tab from sprint-schedule.md"
      status: done
      completed_date: 2026-04-10
      notes: "New /calendar route in ops app with month grid Apr 10-30, 3 phase bands, 4 North Star progress bars, 21 day cells, 36 task checkboxes, day-detail modal. Reads sprint-schedule.md live, writes mutable completion state to ops/data/sprint-state.json (gitignored)."

    - id: cc_09
      task: "Fix 13 pipeline bugs across 2 sweeps (2026-04-11 deep-dive)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["0bec4b7", "7cc28d4"]
      notes: |
        First sweep (6 fixes): Congress /member?query= ignored → switched to /member/congress/{N}/{stateCode} state-delegation endpoint (Bernie Sanders + 5 others verified). GovTrack nickname bug (Jim Risch → 0 results) → nickname-aware matcher. ProPublica A000383-class fuzzy fallback (Coinbase → Coinwise Foundation) → strict matching. Wikipedia + OpenSanctions cold-cache short-circuit (cached !== undefined bug, null vs undefined in FileCache) → fixed 4 sites. api-config now accepts both FEC_API_KEY and FECAPI naming via pickKey() helper. api-enrichment.yml stale-log cache contamination (identical per-pipeline counts across commits) → excluded logs from cache, wipe at step start, timeout bumped 25→30 / job 35→40. requireRealKeys() guard added to fec + congress pipelines to hard-fail on DEMO_KEY.

        Second sweep (7 fixes): NHTSA /recalls/recallsByManufacturer + /complaints/complaintsByManufacturer dead (HTTP 403) → swapped recalls to DOT Socrata 6axg-epim dataset, complaints stubbed (Ford verified 500 recalls). DOJ Press /api/v1/press_releases.json keyword filter silently ignored + Akamai bot gate on /news → pipeline dead-guarded, removed from CI. Congress.gov v3 does NOT expose committee membership at all → rewrote committee-pipeline.cjs to use GovTrack /committee_member (Bernie verified 14 assignments in 2 calls, was 33 calls returning 0). committee-pipeline syntax error line 448 fixed. committee-pipeline null-congress bug fixed with DEFAULT_CONGRESS=119. SAM.gov wrong awardee JSON path (coreData.awardeeOrRecipient doesn't exist; real path is awardeeData.awardeeHeader) + stricter per-token match. FEC /candidates/totals/ sort=-cycle returns HTTP 422 → use sort=-election_year. LobbyView three stacked bugs (wrong auth header, missing PostgREST operator prefixes, Firebase JWT expired).

    - id: cc_10
      task: "Katie Porter FEC ID fix + vault-wide audit"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "b6594eed"
      notes: "Vault had fec-candidate-id: H8CA45076 which doesn't exist in FEC. Replaced with S4CA00522 (Senate 2024 primary, $32.5M raised) + new fec-candidate-id-house: H8CA45130 (4 House cycles 2018–2024, $26M in 2022) field. Verified end-to-end on fec-summary-pipeline. Built scripts/verify-fec-candidate-ids.cjs and ran across all 187 politicians with FEC IDs — 186 valid, Katie Porter was the only real broken ID. 5 transient rate-limit false-positives; script needs retry logic (TODO)."

    - id: cc_11
      task: "Drop lobbyview + doj-press from api-enrichment.yml CI"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "0ade14c"
      notes: "LobbyView uses 1-hour Firebase ID tokens incompatible with scheduled CI. Pipeline left in place but commented out in parallel run list. LobbyView is derived from Senate LDA (still in CI), so no essential data lost. doj-press has the dead-guard, also commented out to stop wasting a container slot."

    - id: cc_12
      task: "Document 13 bug fixes + 3 engine-wide incidents in Pipeline Guide + memory"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["0c7b458d", "6a349653"]
      notes: "Per-pipeline 'Known incidents' entries added to FEC, Congress.gov, GovTrack, ProPublica Nonprofit, NHTSA, DOJ Press, LobbyView sections. New 'Engine-wide known incidents' section at top of Pipeline Guide documenting FileCache null/undefined bug, api-config dual env-var naming, requireRealKeys() guard, workflow stale-log contamination. Memory: feedback_jwt_api_key_trap.md (cross-project lesson on JWT-vs-API-key trap)."

    - id: cc_13
      task: "Make session-save skill update sprint-schedule.md going forward"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      notes: "Updated C:\\Users\\third\\.claude\\skills\\session-save\\skill.md AND .claude/commands/session-save.md AND .claude/commands/sessionsave.md with a new Step 3 that requires updating sprint-schedule.md on every session-save. Memory: feedback_session_save_updates_calendar.md. David asked for this after noticing the calendar was showing stale blocked/pending state while the actual work was done."

    - id: cc_14
      task: "Kick stuck api-enrichment.yml scheduler via disable/enable toggle"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      notes: "Scheduled runs had been dead since 2026-04-09 17:44Z (4 missed slots). Ran gh workflow disable + enable. Workflow updated_at refreshed to 2026-04-10 20:32Z. Should resume on next scheduled slot — preflight will verify."

    - id: cc_15
      task: "Infrastructure safety nets: verify-fec-candidate-ids retry + /preflight YAML scan + /deploy polling"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["c9025e8", "de43d755"]
      notes: |
        Three safety nets in one commit batch.
        (1) verify-fec-candidate-ids.cjs: probeCandidate() now retries 3 attempts with 2s/4s backoff. Eliminates the 5 transient false positives from the first audit run.
        (2) /preflight new Step 6: 3-second js-yaml parse scan across content/ at session start. Catches silent build-break states before any session work begins. Treats YAML errors as blocking.
        (3) /deploy new Step 8 + /session-save Step 5: poll deploy.yml for completion after push, hard-fail on failure/cancelled/timed-out. Red Flag #7 from 2026-04-10 lesson log. Validated live on this session's own deploys — run 24263270533 caught on attempt 5, run 24264591063 caught on attempt 1.
        (4) Documented stuck-scheduler incident in Pipeline Guide § Engine-wide known incidents.
        (5) Synced global skills (~/.claude/skills/preflight/deploy/session-save) with the repo-local command versions.

    - id: cc_16
      task: "Build FDA openFDA enforcement pipeline"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "9a7a07e"
      notes: "scripts/fda-pipeline.cjs (420+ lines). Queries /drug/enforcement.json, /device/enforcement.json, /food/enforcement.json per profile. Strict firm verification with corporate-suffix stripping. 38 FDA-adjacent profiles filtered from 384. Verified: Pfizer → 103 recalls (14 Class I), J&J → 110 recalls (2 Class I). Auth optional (no key: 240 req/min/IP, fine for our scale)."

    - id: cc_17
      task: "Build OCC bank enforcement pipeline"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "9a7a07e"
      notes: |
        scripts/occ-pipeline.cjs (460+ lines). Queries /EnforcementActions/list/{variant} and dedupes by DocketNumber. Skips /Institutions/List/1 because it's broken (searching JPMorgan returns Charter 1 = Wells Fargo predecessors — documented in Pipeline Guide). Name variants + word-boundary strict match. Parses Amount-as-string defensively. Verified: Wells Fargo → 116 actions, 95 active, $899M CMPs. JPMorgan Chase → 78 actions, 58 active, $1.22B CMPs. Uses the FEC api.data.gov key automatically via api-config fallback.

    - id: cc_18
      task: "Build FTC enforcement + HSR merger pipeline"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "9a7a07e"
      notes: |
        scripts/ftc-pipeline.cjs (470+ lines). Combines two sources because FTC has NO enforcement search API: (1) three static enforcement CSVs loaded at startup (644 records covering FY1996–FY2021), and (2) HSR Early Termination Notices via /v0/hsr-early-termination-notices. In-tree CSV parser (no dependency). Bug caught in testing: first regex `\\bmeta` matched "Commercial Metals Company" — fixed with full word boundary on both sides, same fix applied to FDA simultaneously. Verified: Meta - Facebook → 1 historical (Facebook/Instagram 2020), 0 false positives. Documents CSV cutoff caveat in every auto-block.

    - id: cc_19
      task: "Wire FDA/OCC/FTC into Ops app"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      notes: "ops/src/lib/pipelines.ts: added FDA/OCC/FTC to PIPELINES array under 'AUTO-FILL — pure data'. ops/src/app/api/enrichment-history/route.ts: added human-readable labels for fda/fda-enforcement/occ/occ-enforcement/ftc/ftc-enforcement so they render in Enrichment History view. ops/src/components/PipelineDataViewer.tsx: added fda-enforcement/occ-enforcement/ftc-enforcement to BLOCK_LABELS for profile data viewer rendering. All three now visible in Ops app pipeline dropdown + trigger UI."

    - id: cc_20
      task: "Build scripts/pipeline-janitor.cjs + demote 32 zombie profiles to draft"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "ad67ffad"
      notes: |
        ~450-line audit tool. Scans all ready/verified profiles for missing pipeline auto-blocks (zombie-block), stale data, and known-gap phrases mentioning pipeline work. Demotes failing profiles to draft, sets needs-reenrichment: true, writes plain-English [JANITOR] note to internal-notes explaining why. Scope strict: pipeline data only (no URLs, no wikilinks, no class analysis). Exempts media-profile/think-tank/story/event types. Self-healing pass clears the flag when auto-blocks return. Modes: dry-run default, --write applies, --zombies-only safest scope.

        First pass with --zombies-only --write demoted 32 profiles (Pressley, Raskin, Porter, Murkowski, Khanna, Booker, Warnock, Whitehouse, Cori Bush, etc). All were A000383 / DOJ false-positive cleanup casualties whose frontmatter enrichment keys stayed set after body auto-blocks were stripped — invisible to the pipeline's skip-logic forever.

    - id: cc_21
      task: "Engine: updateFrontmatter consumes full field (fix Whitehouse-class YAML corruption)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["4b23618"]
      notes: "donor-map-engine@4b23618. Both scalar-write and array-write branches had their own regex that replaced only the key line, leaving indented continuation lines behind when the value type changed. Result: scalar-replacing-list produced invalid YAML (Whitehouse donors: hybrid string+list blocked deploy 24267993437 and 24269003528). Fix: single fullFieldRegex(key) helper consuming `[\\t ]{2,}[^\\n]*` continuation lines. Test suite: scalar→list, array→list, array→scalar, new-key insertion — all pass."

    - id: cc_22
      task: "Engine: selectTargets honors needs-reenrichment flag"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "061c2c7"
      notes: "donor-map-engine@061c2c7. Flagged profiles now bypass the enrichedKey skip and notFoundCache, and run at the front of the queue. Closes the loop: janitor flags zombies → pipeline reprocesses them → janitor self-heals the flag. Without this, flagged profiles sit at draft forever."

    - id: cc_23
      task: "Vault Rules: tighten `ready` tier definition"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "283da862"
      notes: "`ready` now explicitly means '99% done, only David's sign-off remains.' Hard rule: missing auto-blocks, stale data, or any known-gap/internal-notes phrase mentioning 'needs fresh pipeline run' / 'awaits pipeline' / 'not yet enriched' forces draft. Both Claudes must enforce the gate. Prior definition was too loose ('may have gaps or single-source claims') which led to ready profiles sitting in half-finished state."

    - id: cc_24
      task: "Fix Whitehouse YAML corruption (unblock deploy)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "61bda197"
      notes: "donors: had both a scalar string AND a YAML list underneath, invalid YAML, blocking Quartz deploy for two consecutive runs. Root cause was NOT my edits — shipped in 865e0156 'API enrichment: 412 files'. Fixed by removing the scalar duplicate line; 10-element list is canonical. Deploy 24269113665 turned green after the fix."

    - id: cc_25
      task: "Ops app: fix checklist false negatives + GITHUB_TOKEN diagnostic errors"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "e13b8df3"
      notes: "VerificationChecklist source-diversity check was reading only frontmatter source-types array, but stats panel counted (Tier 1) body markers — mismatch produced ✗ N/A on profiles with 6 Tier 1 sources in body (Adam Smith). Fix: check passes if EITHER the frontmatter array has ≥2 entries OR the body has ≥2 (Tier 1) markers. Applied to all checklist variants. Separately: pipelines route now validates GITHUB_TOKEN format (ghp_ / github_pat_ / ghs_ prefix) and returns actionable errors. David's existing PAT had only repo scope, needed repo+workflow for pipeline dispatch — fixed by generating new token."

    - id: cc_26
      task: "Add scripts/yaml-sanity-scan.cjs + Pipeline Guide incident doc"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["2fe6cb70", "b164b099"]
      notes: "yaml-sanity-scan.cjs validates every profile's frontmatter with js-yaml and exits 1 on broken. Current state: 1753 scanned, 0 broken. Pipeline Guide: new 'updateFrontmatter scalar/list hybrid corruption (fixed 2026-04-11)' entry with root cause, fix approach, quality-check rule, and the preventive sanity-scan recipe."

    - id: cc_27
      task: "CRITICAL: Discover + clear 22-profile bioguide contamination (19× C001091 + 3× B001296)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["660e5e35", "3f197d28"]
      notes: |
        Discovered during a depth-pass scan that 22 unrelated profiles shared wrong bioguide IDs (19× C001091 Joaquin Castro, 3× B001296). Same class of bug as A000383: a past bulk-set script fell through to candidates[0]?.bioguideId when Congress.gov q= name search produced no confident match.

        LIVE SAFETY SAVE: Bowman was in today's janitor-flagged needs-reenrichment set. The running enrichment pipeline (24269046614, ~24 min elapsed) was guaranteed to process him thanks to the selectTargets patch. Congress pipeline would have fetched /v3/member/C001091 (Castro), written Castro's data to Bowman's body as fresh auto:congress block — exact repeat of A000383 at bigger scale. Cancelled mid-run via `gh run cancel` before contamination could commit.

        Fix: scripts/fix-bioguide-contamination.cjs CLEARS the wrong bioguide rather than attempting auto-fix (Congress.gov q= has the same name-match weakness — auto-fix would produce a third wave). Per profile: removes wrong bioguide line, adds known-gap entry, sets needs-reenrichment: false with BLOCKED reason, prepends plain-English [JANITOR] note to internal-notes.

        Pipeline Guide incident doc with 4 new quality-check rules (1: never use candidates[0] as fallback; 2: duplicate-bioguide scan belongs in janitor; 3: pipeline-side dedupe defense; 4: q= is not a semantic name search).

        Affected profiles need manual bioguide verification at bioguide.congress.gov/search next session (next session priority #1).

  research_claude:
    - id: rc_01
      task: "Write ops/CLAUDE.md (frontmatter-only + URL editor-only rules)"
      status: done
      completed_date: 2026-04-10
      target_file: "ops/CLAUDE.md"

    - id: rc_02
      task: "Write ops/RULES.md (frontmatter-only + URL editor-only rules)"
      status: done
      completed_date: 2026-04-10
      target_file: "ops/RULES.md"

    - id: rc_03
      task: "Depth work on Squad/leadership verified candidates"
      status: done
      completed_date: 2026-04-10
      candidates: ["Rashida Tlaib", "Ilhan Omar", "Ayanna Pressley", "Greg Casar", "Hakeem Jeffries"]
      target: "Flag candidates for David sign-off, do NOT self-promote to verified"
      notes: "Tlaib (duplicate source fix), Pressley (voting record header), Jeffries (Congress.gov added, flagged verified-candidate), Casar (raw stub created), Omar (no changes needed)."

    - id: rc_04
      task: "Build out Summer Lee stub from raw→draft→ready"
      status: done
      completed_date: 2026-04-10
      target_file: "content/Politicians/Democrats/House/Summer Lee/_Summer Lee Master Profile.md"
      notes: "Promoted draft→ready. Added Class Analysis section, cleaned sources structure, added bioguide-id + corroboration-count to frontmatter. Flagged as ready-candidate."

    - id: rc_05
      task: "Re-review Cori Bush and Jamaal Bowman for verified AFTER fresh pipeline runs"
      status: blocked
      blocker: "Bowman is in the C001091 bioguide contamination set (cc_27). His bioguide-id was cleared 2026-04-11 and needs manual verification before pipeline can re-enrich. Bush is clean — ready for sign-off."
      notes: "Bush has been re-reviewed (editorial-result: pass, corroboration-count 3, source-types [Congress, FEC, GovTrack]) and is ready for David's verified sign-off with no Research Claude work remaining. Bowman is blocked on bioguide recovery."

    - id: rc_06
      task: "Bernie Sanders depth pass"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "b65e6ece"
      target_file: "content/Politicians/Independent/Senate/Bernie Sanders/_Bernie Sanders Master Profile.md"
      notes: |
        Depth review. Body untouched (4-pattern class analysis is the strongest anti-donor case study in the vault). Factual fix: party "Democrat" → "Independent" with caucus "Democratic" (longest-serving Independent in Congress, title/path/body all said Independent, only frontmatter was wrong). Added bioguide-id S000033 (the reason Congress pipeline could never enrich him). Issues 1→9, added committees + former-committees (HELP Ranking Member, Budget Chair 118th), expanded top-donors with small-dollar model, structured opposes (AIPAC, corporate PACs, Koch, Bloomberg), expanded related wikilinks. Removed body inline dataview `donors: [[...]]` + orphan `---` separator + body `research-status::` dataview. Stays draft (Congress/GovTrack blocks missing, FEC auto-block shows stale cycle-2006 data), flagged needs-reenrichment: true.

    - id: rc_07
      task: "Elizabeth Warren depth pass"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "03ef38dd"
      target_file: "content/Politicians/Democrats/Senate/Elizabeth Warren/_Elizabeth Warren Master Profile.md"
      notes: |
        Depth review. Body untouched — central thesis ('what happens when a politician's funding IS clean'), 96.2% individual contributions anti-model, and CFPB architect→CFPB destroyed arc are excellent. Added bioguide-id W000817 (was missing — reason Congress pipeline had never populated). Removed false-positive DOJ from source-types (engine scan artifact, same class of error as Whitehouse's stripped DOJ block). Issues 1→8 (Wall Street, CFPB, wealth tax, student debt, M4A, antitrust, crypto, Big Tech). Added committees (Banking/Finance/Armed Services/HELP), restructured top-donors to lead with small-dollar model, added structured opposes (Fairshake, Griffin, corporate PACs), expanded related. Removed body inline dataview + double `---`. Stays draft, flagged needs-reenrichment: true.

    - id: rc_08
      task: "Pramila Jayapal depth pass"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "03ef38dd"
      target_file: "content/Politicians/Democrats/House/Pramila Jayapal/_Pramila Jayapal Master Profile.md"
      notes: |
        Depth review. Body untouched (CPC leverage case study + Build Back Better + WA-7 Amazon contradiction). bioguide-id J000298 already set, Congress + FEC data already present. Added former-roles (CPC Chair 2021-2024), expanded committees (Judiciary/Antitrust, Budget), restructured issues to lead with Medicare for All + immigration, added structured opposes (Amazon, Microsoft — the WA-7 antitrust contradiction). Expanded related with full Squad + CPC + Big Tech targets. Cleaned known-gaps. Removed body inline dataview. Stays draft (GovTrack missing, BBB timeline + Amazon antitrust need sourcing), NOT flagging needs-reenrichment (normal rotation will hit her).

    - id: rc_09
      task: "Manual bioguide recovery for 22 contaminated profiles (C001091 + B001296 waves)"
      status: pending
      blocker: ""
      target_files: "22 profiles — see scripts/fix-bioguide-contamination.cjs wave lists"
      notes: "Next session priority #1. Look up each at bioguide.congress.gov/search, verify against profile title + state + chamber, write correct bioguide to frontmatter, flip needs-reenrichment from false→true. Estimated 15-20 min for all 22. Unblocks rc_05 (Bowman re-review)."

  david:
    - id: dc_01
      task: "Batch conflict triage from readiness-conflicts.md"
      status: in_progress
      daily_target: 27
      week_target: 175
      backlog_file: "content/Admin Notes/readiness-conflicts.md"

    - id: dc_02
      task: "First URL verification pass"
      status: pending
      priorities: ["AOC 5 URL NEEDED", "Porter 7 URL NEEDED", "Fairshake top UNVERIFIED"]

    - id: dc_03
      task: "Sign off on verified candidates Research Claude flags"
      status: pending
      notes: "Only David's sign-off makes a profile truly verified (A+)"

    - id: dc_04
      task: "Review plan file and sprint schedule before deep execution begins"
      status: pending
      files: ["C:\\Users\\third\\.claude\\plans\\cheeky-knitting-fox.md", "content/Admin Notes/sprint-schedule.md"]

    - id: dc_05
      task: "Perplexity research: FEC cheatsheet → Pipeline Guide section 1"
      status: pending
      daily_target: "1 pipeline cheatsheet per day"
      target_file: "content/Pipeline Guide.md"
      priority_order: ["FEC", "Congress.gov", "Senate LDA", "USASpending", "SAM.gov", "ProPublica Nonprofit", "SEC EDGAR", "GovTrack", "FARA", "GLEIF", "DOJ Press", "LobbyView"]
```

## Phase 2 — must-complete tasks

```yaml
phase_2_tasks:
  research_claude:
    - id: rc_p2_01
      task: "Depth pass on Squad, AIPAC targets, Speaker race, Senate leadership, top donors"
      target: 20  # new verified candidates flagged for David sign-off
      status: pending

    - id: rc_p2_02
      task: "Build out Wesley Bell and Paul Atkins stubs from raw→ready"
      status: pending
      notes: "Highest story-relevance of the 12 stubs after Summer Lee"

    - id: rc_p2_03
      task: "Draft→ready sweep on 50 most-connected draft profiles"
      target: 50
      status: pending
      criteria: "prioritize profiles with highest inbound wikilink counts (network value)"

  code_claude:
    - id: cc_p2_01
      task: "Mobile polish: Signal Bar, ContradictionCard, ProfileHeader at 375px viewport"
      status: pending

    - id: cc_p2_02
      task: "Interactive pages contrast audit"
      status: pending
      pages: ["Power Rankings", "Issue Explorer", "Who Funds Your Rep", "Weekly Spotlight"]

  david:
    - id: dc_p2_01
      task: "Continue conflict triage (~175 more resolved)"
      target: 175
      status: pending

    - id: dc_p2_02
      task: "URL verification pass 2: Fairshake 70+ UNVERIFIED (top 20)"
      target: 20
      status: pending

    - id: dc_p2_03
      task: "Begin say-vs-pay data for top 15 profiles"
      target: 15
      status: pending
      notes: "Feeds the ContradictionCard component currently rendering on Pelosi only"
```

## Phase 3 — must-complete tasks

```yaml
phase_3_tasks:
  research_claude:
    - id: rc_p3_01
      task: "Final depth pass — 8+ more verified candidates to hit 40 target"
      target: 8
      status: pending

    - id: rc_p3_02
      task: "Draft→ready push on remaining high-traffic profiles"
      status: pending

    - id: rc_p3_03
      task: "Legal-review flag pass — grep verified tier for defamation-prone language"
      status: pending
      keywords: ["fraud", "criminal", "corrupt", "illegal", "scheme", "conspired", "bribed", "embezzled"]

  code_claude:
    - id: cc_p3_01
      task: "Launch checklist: SEO meta, sitemap, analytics, 404 handling, RSS, social share cards"
      status: pending

    - id: cc_p3_02
      task: "Feedback form + correction log UI"
      status: pending
      notes: "Readers must be able to report errors"

    - id: cc_p3_03
      task: "Final build + deploy pipeline verification"
      status: pending

  david:
    - id: dc_p3_01
      task: "Legal sanity review — personally read top 20 verified profiles"
      target: 20
      status: pending
      criterion: "Would I be comfortable if the subject's lawyer reads this?"

    - id: dc_p3_02
      task: "Finish remaining conflict triage (~178 → 0)"
      target_end: 0
      status: pending

    - id: dc_p3_03
      task: "Soft launch Apr 27 (Monday) — share with 2-3 trusted readers"
      scheduled: 2026-04-27
      status: pending

    - id: dc_p3_04
      task: "Public launch Apr 30 (Thursday) — announce"
      scheduled: 2026-04-30
      status: pending
```

## Risk register

```yaml
risks:
  - id: r01
    name: "Burnout in week 3"
    likelihood: high
    impact: high
    mitigation: "Hard 8:30pm stop most days; Sunday half-day off; phase exit checkpoints catch drift early"

  - id: r02
    name: "Verified quality tier inflation (Research Claude self-grading)"
    likelihood: medium
    impact: high
    mitigation: "Only David's sign-off makes verified. Research Claude flags candidates, doesn't promote."

  - id: r03
    name: "Scope creep toward breadth (loose draft→ready promotions)"
    likelihood: medium
    impact: medium
    mitigation: "Weekly audit: pull 5 random newly-promoted profiles, spot-check quality"

  - id: r04
    name: "Launch day bugs"
    likelihood: medium
    impact: high
    mitigation: "Soft launch Apr 27 catches most. Final build + deploy rehearsal Apr 29."

  - id: r05
    name: "Legal exposure from a single profile"
    likelihood: low
    impact: very_high
    mitigation: "Phase 3 legal sanity review covers top 20 verified + any defamation-prone keyword hits"

  - id: r06
    name: "Context-switch cost exceeds buffer"
    likelihood: medium
    impact: medium
    mitigation: "Schedule template batches similar work. If buffer burns in week 1, cut breadth target first."

  - id: r07
    name: "Pipeline bugs cascade (fixing one reveals another)"
    likelihood: medium
    impact: medium
    mitigation: "Phase 1 is entirely plumbing — if it takes 10 days not 7, slide Phase 2 by 3 days and cut breadth target"
    notes: "4 of 7 Phase 1 pipeline bugs already fixed pre-sprint — risk is lower than originally estimated"

  - id: r08
    name: "GitHub Actions still disabled — blocks pipeline runs"
    likelihood: certain
    impact: high
    current_state: "disabled"
    mitigation: "Continue editorial work that doesn't depend on pipeline refreshes. Queue pipeline-run-dependent tasks (stub enrichment, Bush/Bowman re-review) for when Actions are re-enabled."
```

## April 30 review process

```yaml
sprint_close:
  date: 2026-04-30
  evening_sequence:
    - step: 1
      task: "Measure actuals against plan targets (verified count, draft→ready, conflicts resolved, launch status, pipeline bugs closed)"
    - step: 2
      task: "Snapshot vault with the same Python script used at sprint start"
      script_location: ".claude/tmp_scripts/vault_snapshot.py (to be built Phase 1)"
    - step: 3
      task: "Write 1-page retrospective: what hit target, what missed, what surprised, what took longer than expected"
    - step: 4
      task: "Delete plan file C:\\Users\\third\\.claude\\plans\\cheeky-knitting-fox.md"
    - step: 5
      task: "Write fresh May plan based on sprint actuals + launch feedback + shifted priorities"
    - step: 6
      task: "Archive this sprint-schedule.md → content/Admin Notes/archive/2026-04-sprint-schedule.md"
    - step: 7
      task: "Write new content/Admin Notes/sprint-schedule.md for May sprint"
    - step: 8
      task: "Update content/Session State.md with April 30 snapshot and May priorities"

verification_checks:
  quantitative:
    - "verified count ≥ 40 (from 3)"
    - "draft count ≤ 188 (from 288)"
    - "readiness conflicts backlog == 0 (from 528)"
    - "URL NEEDED count ≤ 5"
    - "all 7 pipeline bugs closed (4 already done)"
    - "thedonormap.org returns HTTP 200 on Apr 30"
  qualitative:
    - "10 random verified profiles hold up on fresh read"
    - "10 random draft→ready promotions have solid sources + class analysis"
    - "Site works on phone and feels credible"
    - "2 trusted readers understand the thesis without explanation (Apr 28)"
```

## Notes for calendar parser (Code Claude)

```yaml
parser_guidance:
  file_format: "Markdown with YAML code blocks"
  yaml_blocks_to_parse:
    - "## Sprint metadata"
    - "## North Star targets (priority order)"
    - "## Phases"
    - "## Daily block template (weekday)"
    - "## Phase 1 — must-complete tasks"
    - "## Phase 2 — must-complete tasks"
    - "## Phase 3 — must-complete tasks"
    - "## Risk register"
    - "## April 30 review process"
  parsing_strategy: "Extract ```yaml fenced blocks under each H2, parse as structured data"
  state_persistence:
    location: "separate ops/data/sprint-state.json (NOT this file)"
    rationale: "This file is the source-of-truth schedule; task completion state is mutable and should not pollute git history with every checkbox click"
    sync_model: "Ops calendar reads schedule from this file (source) + writes completion state to sprint-state.json (mutable)"
  refresh_cadence: "Calendar re-reads this file on every load (not cached) since the schedule can change mid-sprint"
  editable_by_david: "Yes — David can edit this file directly to reschedule or add tasks"
  editable_by_claudes: "Yes — Research Claude and Code Claude can update task status fields during work"
```

---

**Schedule last updated: 2026-04-11 (night session — cc_20 thru cc_27 + rc_06 thru rc_09 added; rc_05 blocked pending bioguide recovery)**
**Current phase: phase_1 (Day 2 of 7)**
**Next checkpoint: Phase 1 exit, 2026-04-16**
**New data sources added 2026-04-11: FDA (pharma/device/food enforcement), OCC (national bank enforcement), FTC (mergers + historical enforcement). All three live in CI + Ops app.**
