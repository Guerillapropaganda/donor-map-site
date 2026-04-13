---
title: Sprint Schedule
type: admin-note
note-type: data
priority: normal
status: active
last-updated: '2026-04-12'
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
    current: 1
    description: "verified (A+) profiles with editorial sign-off (David-only sign-off). 932 at ready tier waiting for sign-off as of 2026-04-13."

  - id: breadth
    rank: 2
    metric: draft_to_ready_promotions
    baseline: 288  # draft count at sprint start
    goal: 188       # ≤188 means ≥100 promotions
    current: 589   # 2026-04-13: 932 ready (was 560 at sprint start). 372 net promotions this session alone. Goal of 100 promotions was hit 3.7x over.
    description: "draft profiles promoted to ready tier"

  - id: systems
    rank: 3
    metric: pipeline_bugs_closed
    baseline: 7
    goal: 0
    current: 23
    description: "known pipeline bugs blocking data integrity. Original 7: A000383, QVT, GovTrack cache, redirect enrichment, NHTSA non-auto, DOJ index-size, SAM fuzzy. Plus Ops API array-toString bug. Plus updateFrontmatter scalar/list (2026-04-11), bulk-bioguide C001091/B001296 contamination (2026-04-11), and updateFrontmatter quote-escape (2026-04-11 overnight — Wikipedia extract Ro Khanna/Zoe Lofgren root cause)."

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

    - id: cc_28
      task: "Bioguide recovery: 17 profiles verified + applied (rc_09 companion)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commits: ["660e5e35", "422e7988"]
      notes: |
        scripts/recover-bioguide.cjs (new, ~210 lines) — single + batch mode. Includes duplicate-detection: refuses to apply a bioguide if already in use by another profile (second line of defense against re-contamination). Applied 16 via batch json (Bowman B001223, Morelle M001206, Pelosi P000197, Gottheimer G000583, Padilla P000145, Coons C001088, Schumer S000148, Clinton C001041, Hickenlooper H000273, Sinema S001191, Crenshaw C001120, Salazar S000168, Gaetz G000578, Ted Cruz C001098, Tuberville T000278, Bean B001253). Applied Rick Scott S001217 separately via Congress.gov API /v3/member/congress/119/FL since bioguide.congress.gov web UI failed to surface him. 3 recoveries (Padilla, Hickenlooper, Crenshaw) were auto-extracted from Congress.gov citation URLs already in their profile bodies and confirmed by David. The remaining 5 contaminated profiles (Stratton, Cooper, Wahls, Biss, Miller) were reclassified as state/local politicians in cc_29 instead.

    - id: cc_29
      task: "Taxonomy expansion: state-politician + local-politician + candidate-for"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "8c3191c9"
      notes: |
        New taxonomy shipped per David's approval. Added three frontmatter values:
        (1) type: state-politician — governors, lt govs, state legislators. Congress.gov/GovTrack/Committee SKIPPED. FEC still fires if fec-candidate-id exists.
        (2) type: local-politician — mayors, city council, county commissioners. Same pipeline behavior.
        (3) candidate-for: field — optional, additive to any type, marks federal candidates not yet elected.

        Vault Rules updated with "Politician type taxonomy (three tiers)" and "Candidate tracking" sections. pipeline-janitor.cjs EXEMPT_TYPES updated to include state-politician + local-politician.

        Applied to 5 profiles from the contamination cleanup that shouldn't have had federal bioguides:
          Juliana Stratton → state-politician (IL Lt Gov) + US Senate 2026 candidate
          Roy Cooper → state-politician (former NC Gov) + US Senate 2026 candidate
          Zach Wahls → state-politician (IA State Senator) + US Senate 2026 candidate
          Daniel Biss → local-politician (Evanston Mayor)
          Donna Miller → local-politician (Cook County Commissioner) + US House 2026 candidate

    - id: cc_30
      task: "Full politician cleanup: 32 type reclassifications + 64 demotions"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "9ae94152"
      notes: |
        David identified the problem: Ops app grid was still showing stories, media, and half-finished politicians at "ready". Investigation surfaced three mixed issues fixed in one pass.

        (A) 27 topical sub-notes mis-typed as type: politician. Trump policy deep-dives (Project 2025, DOGE, Pardon Machine, Iran War Money Trail, Fox News Pipeline, etc.) and Chad Bianco sheriff-era stories (CA DOJ Investigation, Oath Keepers Membership, CSPOA). Retyped to sub-note. Disappear from politician grid.

        (B) 5 state politicians mis-typed as type: politician: Hochul, Kemp, Kalra, Rendon, Wicks. Retyped to state-politician with current-office field.

        (C) 64 politicians demoted ready→draft by pipeline-janitor.cjs --type=politician --write. Every single one failed the new strict ready rules: 97 missing-block issues, 38 never-enriched, 3 internal-notes-pipeline, 1 zombie-block. Examples: Gerry Connolly, Bob Casey, Dick Cheney, Virginia Foxx, Jim McGovern, AOC, Bennie Thompson, Brendan Boyle, Debbie Wasserman Schultz. All had been manually promoted to ready by Research Claude based on body content alone without ever running pipelines.

        Result: ZERO politicians at ready anywhere in the vault. 246 politicians at draft (up from ~181). Ops grid finally tells the truth.

        Tooling: scripts/find-mistyped-politicians.cjs (diagnostic), scripts/classify-mistyped-politicians.cjs (splits real vs sub-note vs state), scripts/apply-type-reclassification.cjs (bulk rewrite), scripts/pipeline-janitor.cjs (added --type=X filter). 101 files changed in the commit.

    - id: cc_31
      task: "Engine: updateFrontmatter picks quote style (Wikipedia-extract corruption root-cause fix)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      engine_commit: "b96f99e"
      notes: "donor-map-engine@b96f99e. Fixes the root cause of two deploy failures earlier tonight (24272801987, 24273360093). Both scalar and array writers in scripts/lib/shared.cjs::updateFrontmatter() now pick single-quoted, double-quoted with \\\" escape, or legacy double-quoted based on the value's content. Test suite validates 4 scenarios (Ro Khanna nickname, California apostrophe, mixed both-quotes, plain-text control)."

    - id: cc_32
      task: "Hotfix: Ro Khanna + Zoe Lofgren YAML (vault-side)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "9429f0ff"
      notes: "Converted corrupted wikipedia-extract lines to single-quoted YAML strings. Unblocked the deploy chain. Root cause fixed separately in cc_31."

    - id: cc_33
      task: "S-tier plan Step 1: schema additions + Vault Rules § 2 rewrite"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "dbfe3336"
      deploy: "24273405179"
      notes: |
        Added 16 new optional fields to the Profile interface in ops/src/lib/vault.ts (centralThesis, storyGrade, lawyerDispute, legalReviewDate, legalReviewResult, boardSeats, stockTrades, bothSidesFlag, crossVaultTriangulationCount, anomalyFlags, auditAPlusPassed, angle, exclusiveConnections, originalFinding, auditSTierPassed, editorialSignoffData, editorialSignoffNarrative) plus ContentReadinessTier type export.
        Rewrote content/Vault Rules.md § 2 Content Readiness from 4-tier to 5-tier system with new A+ sub-tier breakdown (A/B/C/D) and full S-tier requirements section.
        Pure schema + docs. Zero enforcement. Backward compatible. Profiles without the new fields render identically.

    - id: cc_34
      task: "S-tier plan Step 2: extract shared checklist helpers (pure refactor)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "93881d87"
      deploy: "24273624255"
      notes: |
        New files: ops/src/lib/checklist-helpers.ts (236 lines) and scripts/lib/checklist-helpers.cjs (190 lines) — TS + CJS parallel copies. Exports hasAutoBlock, countTier1InBody, hasHeading, hasCallout, hasDonationPolicyTimeline, hasDarkMoneyTrace, hasRevolvingDoor, runLegalReviewCheck, detectBothSidesEntities, isEnrichedWithin, countMarkdownUrls, countWikilinks.
        Replaced 6 inline source-diversity, 4 enriched-90d, and 5+ URL/wikilink count patterns in VerificationChecklist.tsx with helper calls.
        pipeline-janitor.cjs imports helpers for Step 3 use. Existing zombie/missing-block logic unchanged.
        Pure refactor — identical behavior.

    - id: cc_35
      task: "S-tier plan Step 3: committee→pipeline map + janitor A+ audit (dry-run)"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "c1d454d0"
      deploy: "24273715402"
      notes: |
        New files: scripts/lib/committee-pipeline-map.cjs (115 lines) + ops/src/lib/committee-pipeline-map.ts (86 lines, TS mirror). Single source of truth for "which regulatory pipelines are required by which committees." Covers Banking, HELP/Agriculture, Judiciary, Intel/Foreign, Armed Services, Commerce, Energy, Ways and Means, Appropriations, Transportation.
        pipeline-janitor.cjs added --tier=a-plus flag (dry-run only) and new A+ issue kinds: a-plus-committee-cross-ref, a-plus-source-floor (3+), a-plus-legal-review (defamation word scan with blockquote exception), a-plus-both-sides, a-plus-missing-thesis, a-plus-missing-story-grade. Each has a plain-English translation in laymanNote().

    - id: cc_36
      task: "S-tier plan Step 4: grouped checklist UI + tier breakdown evaluator"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "48e93fc0"
      deploy: "24273851210"
      notes: |
        ChecklistItem interface gained group (core/tier-a/tier-b/tier-c/tier-d/s-tier) and blockingFor (ready/verified/s-tier) fields. Populated ~20 new items across 5 groups on the Congress politician checklist. Non-politician and non-Congress chambers keep flat config for now.
        Grouped collapsible render via <details> sections. S-tier section is LOCKED (🔒) until every non-s-tier group passes. Each group shows its own passed/total count + percentage.
        evaluateReadinessEligibility() signature expanded to return tierBreakdown: Record<ChecklistGroup, {passed,total,pct}>. New maxTier logic returns "s-tier" only when all groups pass.

    - id: cc_37
      task: "S-tier plan Step 5: VaultGrid tiered fields + cohort checks + --write stamping"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "abbd9049"
      deploy: "24273931396"
      notes: |
        ops/src/lib/vault.ts: profileNeeds() now reads janitor-stamped frontmatter (audit-a-plus-passed, centralThesis, storyGrade, bothSidesFlag, anomalyFlags) instead of inline regex. Source-type floor raised from 2 to 3 for A+. S-tier recognized as first-class readiness. New profileNeedsFromChecklist() thin alias.
        pipeline-janitor.cjs added --cohort flag for whole-vault comparative analysis. New helpers: loadAllProfiles, computeAnomalyFlags (3x cohort median), computeTriangulationCount, buildEntityIndex, stampAuditFields. Cohort pass with --write stamps cross-vault-triangulation-count and anomaly-flags. A+ audit with --write stamps audit-a-plus-passed when all checks clear.
        Tested: --tier=a-plus --cohort loads 1745 profiles / 1727 unique entities cleanly.

    - id: cc_38
      task: "S-tier plan Step 6: s-tier readiness API + tier.ts helpers"
      status: done
      completed_date: 2026-04-11
      added_adhoc: true
      commit: "2f837495"
      deploy: "24274019304"
      notes: |
        ops/src/app/api/profile/readiness/route.ts: VALID_TIERS expanded from 4 to 5. New S-tier promotion gate rejects HTTP 400 unless ALL of: audit-s-tier-passed, editorial-signoff-narrative, angle, original-finding, and 3+ exclusive-connections are present. Structured missing[] in error response for UI.
        ops/src/lib/tier.ts (99 lines, new) — central S-tier render-time helpers: isSTier (three-check gate), isVerified, getFeaturedPool (graceful degradation to A+), tierLabel, tierColor (purple for S-tier).
        Quartz-side homepage components (WeeklySpotlight, PowerRankings, LandingPage) intentionally NOT wired. Current featured profiles (Raytheon, AIPAC, Koch Network) are below A+ — strict filter would break the live site. Migration deferred to a separate commit when the A+ pool is large enough.

    - id: cc_39
      task: "Attention Queue reject button + universal signature filter"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T11:30:00-07:00"
      added_adhoc: true
      commit: "c0e7dc9c"
      deploy: "24281367092"
      notes: |
        ops/src/app/attention/page.tsx: per-entry ✕ reject button with prompt for optional reason, POSTs to new /api/attention-queue/reject. ops/src/app/api/attention-queue/reject/route.ts (new) mutates both the queue store and the false-positive log. scripts/lib/attention-queue.cjs addEntries() now auto-filters entries whose (source|where|what) signature matches a prior rejection — universal across all 5 producers with no per-script wiring. Verified live: rejected an EPI voice-drift entry, reran producer, 30 → 29 (persisted).

    - id: cc_40
      task: "Hallucination-catcher regex tightening (96 → 25 false positives on Raytheon)"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T11:35:00-07:00"
      added_adhoc: true
      commit: "c0e7dc9c"
      deploy: "24281367092"
      notes: |
        scripts/hallucination-catcher.cjs: dollar-amount requires a claim verb within 80 chars; percentage requires contextual noun (of/increase/share/etc); bill-reference pattern dropped (self-citing); per-claim citation proximity check (150 chars) replaces whole-paragraph exemption; footnote refs [^N] and [cite] count as citations; bullet lists and tables exempt. Raytheon: 96 → 25 (71 FPs eliminated). Lowest count is now 8 real claims (Goldman Sachs).

    - id: cc_41
      task: "Dispatcher crash recovery + log rotation + Healthchecks placeholder"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T11:45:00-07:00"
      added_adhoc: true
      commit: "ee2eccd6"
      deploy: "24281756494"
      notes: |
        scripts/attention-dispatcher.cjs: uncaughtException + unhandledRejection top-level guards; try/catch around spawn() and each processQueue iteration; cron callbacks wrapped per-producer; log rotation at 1MB threshold to .log.1 (one keep); HEALTHCHECKS_PING_URL env var placeholder (fire-and-forget on start / successful cycle / failure, 5-sec timeout, no-op when unset). Verified log rotation by pre-writing a 1.2MB file; correctly rotated on next run.

    - id: cc_42
      task: "Register new scripts in /scripts ops page + rules docs updates"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T11:50:00-07:00"
      added_adhoc: true
      commit: "ee2eccd6"
      deploy: "24281756494"
      notes: |
        ops/src/app/scripts/page.tsx: new Intelligence / Attention Queue (8 entries) and Pre-Commit Gates (1 entry) categories pinned to top. Entries for attention-dispatcher (daemon/run-now/healthchecks), voice-drift-detector, hallucination-catcher, contradiction-miner, missing-profile-detector, promotion-candidate-queue, self-review-mirror. yaml-sanity-scan and duplicate-bioguide-sentinel updated to note they also run as pre-commit gates. CLAUDE.md new 'Automation you should know about' section; content/Vault Rules.md new § 9 Automation Layers (Decisions Log bumped to § 10).

    - id: cc_43
      task: "Phase 0: audit 619 modified + 44 untracked files, ship pipeline enrichment bulk commit"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T12:10:00-07:00"
      added_adhoc: true
      commit: "ab7221d0"
      deploy: "24282337750"
      notes: |
        Audited the uncommitted pipeline pile: 307 frontmatter-only (date bumps + related list extensions), 193 frontmatter+body (+ new auto-block sections with Wikidata/LEI/Federal Register data), 53 pipeline-only, 65 body-only timestamp rerenders, 1 site-status.md recalc. Untracked: 38 RSS Event drafts, 3 Story Seeds, 1 bioguide-contamination-alert. Trimmed Auto-Enrichment Log: 260 empty padding lines removed (all 2026-04-11 entries preserved). Gitignored .attention-dispatcher.log[.1]. Bulk commit: 662 files.

    - id: cc_44
      task: "self-review-mirror net-new scanning with 5 exemptions"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T12:05:00-07:00"
      added_adhoc: true
      commit: "427a5827"
      deploy: "24282337750"
      notes: |
        Patched scripts/self-review-mirror.cjs to fix false-positive cascade that would have blocked 188 files with "new em dash" errors from pipeline enrichment. Changes: net-new comparison (count banned phrases before/after, flag only net increases); auto-block exemption (<!-- auto:X -->); heading exemption (# through ######); wikilink-bullet exemption (- [[...]] lines); non-editorial type exemption (reference/system/methodology/index/page/digest/daily-update/event/sub-note). Tested against entire 619-file pipeline pile: 0 false positives after patch, 188+ before. New prose em dash regression test still blocks correctly.

    - id: cc_45
      task: "Phase 1a: Calendar clock timezone (UTC → local)"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T12:40:00-07:00"
      added_adhoc: true
      commit: "ec7cdb94"
      deploy: "24286226374"
      notes: |
        ops/src/app/calendar/Calendar.tsx stored liveTime as ISO string and sliced UTC positions. David on PT saw 11:40 at 4:41am local. Fix: store as Date object, format with getHours()/getMinutes()/getFullYear()/getMonth()/getDate(). Verified live: preview renders 08:38 matching new Date().

    - id: cc_46
      task: "Phase 1b: Session-save completed_at timestamps"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T12:50:00-07:00"
      added_adhoc: true
      commit: "ec7cdb94"
      deploy: "24286226374"
      notes: |
        Three-part fix: (1) ops/src/lib/sprint-schedule-parser.ts Task type gains optional completed_at field; (2) ops/src/lib/sprint-state.ts new resolveCompletedAt() helper prefers YAML completed_at over midnight-UTC fallback, used in both buildInitialState and reconcileScheduleIntoState; (3) .claude/commands/session-save.md instructions now require writing completed_at as a full ISO 8601 timestamp with local offset. Fixes the bug where session-saved tasks always landed at midnight UTC in the calendar's hours-today meter.

    - id: cc_47
      task: "Phase 1c: Alerts dashboard ↔ /api/alerts sync"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T13:00:00-07:00"
      added_adhoc: true
      commit: "ec7cdb94"
      deploy: "24286226374"
      notes: |
        ops/src/app/api/status/route.ts was counting "critical" by scanning profiles missing content-readiness — a fake heuristic unrelated to real alerts. /alerts page used /api/alerts (stale / never-enriched / broken wikilinks / pipeline failures / contradictions). Fix: /api/status now delegates to /api/alerts for summary counts. Dashboard card upgraded from "{N} critical" to "{N} critical, {M} warning". Dead walkMarkdown helper removed. Verified: both endpoints return matching summary.critical and summary.warning; dashboard UI shows "View Alerts · 1 critical, 2 warning".

    - id: cc_48
      task: "Phase 2a Part 1: profile type rulebook + CJS/TS readers + check-helpers catalog"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T13:40:00-07:00"
      added_adhoc: true
      commit: "ee147d6e"
      deploy: "24288685353"
      notes: |
        config/profile-type-rulebook.json (1172 lines) — source of truth for all 8 top-level types (politician/donor/entity/media/judicial/story/event/meta) + 50+ sub-categories, tier requirements, override grammar (adds/removes/replaces), promotion-gate rules, visual identity (color-light/color-dark/icon), voice-scanned/hallucination-scanned flags. scripts/lib/profile-type-rulebook.cjs (320 lines, new) CJS reader with --validate CLI. ops/src/lib/profile-type-rulebook.ts (202 lines, new) TS mirror with typed interfaces. Extended scripts/lib/checklist-helpers.cjs (180 → 551) and ops/src/lib/checklist-helpers.ts (240 → 545) with CHECKS registry: 265 check-ids total (64 real — frontmatter presence, counts, thresholds, body scanners reusing existing helpers; 201 stubbed as always-pass with [stub: id] reason for Part 2). Validation: rulebook valid, 8 types, 266 check ids, 0 missing. resolveChecks(politician/president/verified) correctly composes base + president overrides. Part 1 has zero runtime effect — nothing reads from the rulebook yet. Part 2 wires the scripts.

    - id: cc_49
      task: "Phase 2a Part 2: wire all 5 Attention Queue producer scripts to the profile-type rulebook"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T18:50:00-07:00"
      added_adhoc: true
      commit: "5377faa5"
      deploy: "24289116181"
      notes: |
        Replaced hardcoded type lists and promotion criteria with rulebook reads across all 5 producers. Regression check between each script wiring. Part 2.1 self-review-mirror: nonProfileTypes Set → isVoiceScanned(type) with fallback (4 test cases pass). Part 2.2 voice-drift-detector: skipTypes → isVoiceScanned(type), count 29 → 29. Part 2.3 hallucination-catcher: skipTypes → isHallucinationScanned(type), **story type now scanned** — 12 real story findings in the queue (Cross-Politician Contradiction Map 30 claims, Geographic Donor Clustering 23, etc.). Part 2.4 promotion-candidate-queue: full refactor to resolveChecks() + runCheck() per profile's rulebook, 124 sign-off-only matches baseline, 3 corporations + 7 donors in top 10. Part 2.5 pipeline-janitor: minimal wiring for rulebook-knowable exemptions, legacy federal-pipeline exemptions preserved, dry-run identical to baseline. Also added resolveTopLevelType() helper to the rulebook reader so flat type values (corporation, investigation, admin-note) correctly map to top-level parents (entity, story, meta). Caught a regression in promotion-candidate-queue first cut where corporation profiles were silently dropped — fixed by using resolveTopLevelType before getPromotionGate lookup. Full dispatcher end-to-end verification all green.

    - id: cc_50
      task: "Phase 2a Part 3: /rules rulebook editor UI in the Ops app"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T12:10:00-07:00"
      added_adhoc: true
      commit: "614a62b5"
      merge: "1924bd2b"
      deploy: "24289524548"
      notes: |
        New /api/rulebook route (GET returns rulebook + valid check-ids + gate enum; POST validates structurally — hex colors, check-ids cross-referenced against checklist-helpers.cjs, gate enum, sub-category override shape — stamps last-updated, atomic tmp+rename write, cache clear). New /rules page: per-type tabs with visual identity editor, voice/hallucination flags, per-tier required/recommended tag lists with check-id autocomplete, promotion gates, sub-category editor with overrides JSON textarea, dirty indicator, reset, save with inline validation. Renamed previous markdown docs viewer /rules → /docs (+ /api/docs). Sidebar gains "Rulebook" (target icon) alongside "System Docs" (book icon). Full preview-verified: 266 check ids loading, 8 types rendered, type tabs reactive, save roundtrip works, validation failures return 422 with precise errors. 1203 insertions, 180 deletions across 5 files.

    - id: cc_51
      task: "Phase 2a Part 3 followups: turbopack root, checkIds subprocess, rulebook reformat"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T12:25:00-07:00"
      added_adhoc: true
      commit: "32c5a8cf"
      merge: "1bbf436d"
      deploy: "24289725843"
      notes: |
        ops/next.config.js pins turbopack.root = __dirname so dev server runs from a nested worktree (unblocks preview_start for future sessions). ops/src/app/api/rulebook/route.ts swaps dynamic require() of checklist-helpers.cjs for execFileSync('node', ['-e', ...]) subprocess — turbopack was silently eating the require, leaving checkIds: 0 on the GET response. Now surfaces errors as checkIdsError and caches in module scope. config/profile-type-rulebook.json one-time reformat (626+/184−) absorbing the JSON.stringify(null,2) array expansion. All three fixes verified in preview.

    - id: cc_52
      task: "Phase 3 Part 1: canonical relationship edge store (data/relationships.jsonl)"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T13:20:00-07:00"
      added_adhoc: true
      commit: "5ffb2692"
      merge: "2c89255c"
      deploy: "24290816976"
      plan_file: "C:\\Users\\third\\.claude\\plans\\toasty-discovering-dahl.md"
      notes: |
        Plan-mode design session + full implementation. New scripts/lib/relationship-edge-validator.cjs (schema, TYPE_META registry with 10 types and their directedness/requires, 15-source enum, 4-status enum, computeEdgeId with per-type key composition, validateEdge with 13 ordered checks, validateFile, buildTitleIndex with resolveTopLevelType integration, normalizeTitle matching shared.cjs convention, MIGRATION_SOURCES allowlist). New scripts/lib/relationships-store.cjs (lazy cache, getEdgesFrom/getEdgesTo/getEdgesByType/findEdge/queryEdges with 9-dimension filter). New ops/src/lib/relationships-store.ts (TypeScript mirror). New scripts/migrate-frontmatter-to-relationships-jsonl.cjs (walks 1857 profiles, 6 frontmatter fields, 12,737 edges emitted, atomic tmp+rename). New scripts/relationship-edge-sentinel.cjs (pre-commit gate 4, only fires on staged JSONL). .husky/pre-commit adds gate 4 after duplicate-bioguide. New data/relationships.jsonl (8 MB, 12,737 edges). CLAUDE.md gains -generated cache field exception. content/Vault Rules.md gains Phase 3 callout. content/Admin Notes/relationship-migration-report.md generated with full accounting. Validator full pass; pre-commit sentinel gate; Quartz build green (1746 → 7142 files, no consumer warnings). Orphan baseline recorded at 4,645 pairs. Cross-type queries: entity→politician monetary = 275, donor→politician monetary = 603.

    - id: cc_53
      task: "Phase 2b: S-Tier filter + sort in VaultGrid + Readiness Grades stat card row"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T13:40:00-07:00"
      added_adhoc: true
      commits: ["eac6fb48", "bfd3d02b"]
      merge: "ea6d0c2c"
      notes: |
        ops/src/lib/vault.ts readinessColor adds s-tier → #a78bfa violet. ops/src/components/VaultGrid.tsx: READINESS_LABELS extends with s-tier at index 4 (sort above verified), nearest-a-plus scorer +2000 bonus, new "S S-Tier" button in grade scroller, progress bar width map redistributed (raw 10 / draft 30 / ready 55 / verified 80 / s-tier 100), legend S Original Investigation chip, on-mount fetch of /api/rulebook builds eligibility set (grey-out when type filter active on ineligible type). Fail-open if rulebook unreachable. ops/src/components/StatsBar.tsx (follow-up): added S-Tier GradeBar row at the top of the 5-row stack so the dashboard stat card matches the VaultGrid filter. Live-verified: grade scroller shows All 1784 · S S-Tier 0 · A+ Verified 0 · B Ready 881 · C Draft 864 · D-F Raw 39, click S-Tier flips filter and count to 0 profiles.

    - id: cc_54
      task: "Phase 1d: type-aware vault-health completeness scoring"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T13:55:00-07:00"
      added_adhoc: true
      commit: "25b6e6ef"
      merge: "54e8565d"
      deploy: "24291419121"
      notes: |
        ops/src/lib/profile-type-rulebook.ts adds resolveTopLevelType() matching the CJS mirror. ops/src/lib/vault.ts completenessScore() takes optional topLevelType and uses WEIGHTS_BY_TYPE per-type weight rows (sum to 100): politician/donor/entity/judicial 15/25/20/20/20, media 20/10/25/30/15, story 10/25/25/40/0, event 35/20/5/40/0, meta 50/10/10/30/0. TIER1_FLOOR_BY_TYPE relaxes Tier 1 requirement per type (politician=3, media=1, meta=0). ops/src/lib/local-vault.ts resolves topLevelType once per profile during the vault walk. Post-refactor averages: story 106 profiles @ 85% (was ~50-60%), media-profile 94 @ 65% (was penalized <3 Tier 1), event 246 @ 49% (correct), politician 89 / donor 84 / corporation 87 / sub-note 99 / lobbying-firm 85 / pac 78.

    - id: cc_55
      task: "editor-vouched frontmatter flag (hallucination-catcher escape hatch)"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T13:50:00-07:00"
      added_adhoc: true
      commit: "aa585ac0"
      merge: "ed0d1594"
      deploy: "24291334295"
      notes: |
        scripts/hallucination-catcher.cjs: new check after the rulebook hallucination-scanned gate. Handles both boolean true and YAML string "true" (shared.cjs parseFrontmatter returns scalars as strings). Narrow scope: only hallucination-catcher honors the flag — voice-drift-detector and self-review-mirror continue firing (em dashes, banned AI vocab, defamation words are voice/style issues independent of citation proximity). CLAUDE.md documents the flag under frontmatter-only exceptions with explicit misuse warning. content/Vault Rules.md callout. End-to-end verified: added flag to Pelosi-McCarthy story (13 claims), dropped out of queue; reverted, returned to queue; git diff clean on test file.

    - id: cc_56
      task: "Story editorial pass: editor-vouched on 3 of 12 flagged stories"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T14:05:00-07:00"
      added_adhoc: true
      commit: "83af027c"
      merge: "b40946b1"
      deploy: "24291562491"
      notes: |
        Delegated the factual audit to an Explore agent (thorough level) which read all 12 files, sampled claims, and classified each covered/partial/thin/uncovered. Three legitimately passed: Geographic Donor Clustering (13 Tier 1 FEC candidate pages + Tier 2 journalism), Defense-Pharma-Carceral-Labor-Wexner Cross-Reference (40+ sources, FEC + LDA + SEC at Tier 1), and Contradiction 10 Jeff Yass (ProPublica investigation + Congress.gov + Supreme Court at Tier 1, Fortune/Axios/WaPo/Inquirer at Tier 2). 9 remain flagged: Cross-Politician Contradiction Map, Intra-Republican Contradiction Map, Intra-Democratic Contradiction Map, Prison Telecom, Michigan 2026, Schumer-McConnell, Ohio 2026 Acton vs Ramaswamy, Contradiction 06 Crypto, Pelosi-McCarthy — each needs per-claim editorial work (Research Claude lane). Frontmatter-only change; no body prose edited.

    - id: cc_57
      task: "Phase 3 Part 2a: relationship-discovery.cjs emits JSONL edges via upsertEdges"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T14:15:00-07:00"
      added_adhoc: true
      commit: "997e2f36"
      merge: "fc7cd63b"
      deploy: "24291721197"
      notes: |
        scripts/lib/relationships-store.cjs new upsertEdges(newEdges) helper with merge semantics (higher-confidence source overwrites, non-null fields win, evidence arrays dedup-merged, first_seen preserved). scripts/relationship-discovery.cjs new --write-edges flag, DISCOVERY_TYPE_MAP (related/donors/opposes/stories → related/monetary/political-opposition/story-link), DISCOVERY_CONFIDENCE_MAP (low 0.55 / medium 0.70 / high 0.85), emitSuggestionsAsJsonlEdges() maps each suggestion, builds title index once, skips contradictions/unknown types/missing endpoints/collisions/typeless endpoints. story-link edges default to role "mentioned". Data after run: 19,848 edges total (up from 12,737, +7,111 new + 52 upgraded). story-link jumped 17 → 1,940 (discovery scanner's wikilink-proximity found ~1,900 profile↔story links migration missed). By source: 12,685 frontmatter-migration + 7,163 discovery-scanner. Full validator pass. connection-suggester.cjs intentionally NOT retargeted (proposes hypotheses, not facts). contradiction-scanner.cjs deferred to Phase 3 Part 2b (it's a query, not a producer — its input should read JSONL).

    - id: cc_58
      task: "Phase 3 Part 2b: contradiction-scanner reads JSONL edge store"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T14:25:00-07:00"
      added_adhoc: true
      commit: "ebf98769"
      merge: "aefaa483"
      deploy: "24291972761"
      notes: |
        scripts/contradiction-scanner.cjs: checks 1 (shared-donor contradictions) and 2 (both-sides donors) rewritten to query monetary + political-opposition edges via scripts/lib/relationships-store.cjs. New loadPoliticianMetadata() and loadDonorEntityMetadata() helpers do quick frontmatter walks for party/state/chamber/sector metadata that isn't denormalized in JSONL. findSharedDonorContradictions builds Set of unordered opposition pairs from 47 opposition edges, groups 928 monetary edges by donor, checks recipient pairs — found 15 opposition-funded contradictions. findBothSidesDonors buckets 928 monetary edges by donor→party, dedupes recipients per party — found 78 both-sides donors (27 high story potential, 51 medium). Checks 3+4 (cross-ref mismatches, opposition gaps) preserved as frontmatter linters for hand-edit drift. main() conditionally loads edge metadata vs frontmatter walker based on --check flag so --check=both-sides skips the vault walk entirely. Report JSON gains edgeCount and source:"phase3-part2b" markers.

    - id: cc_59
      task: "Phase 3 Part 2c: wire relationship-discovery --write-edges into attention-dispatcher"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T14:30:00-07:00"
      added_adhoc: true
      commit: "c1c6bfe7"
      merge: "82a1f66e"
      deploy: "24292012983"
      notes: |
        scripts/attention-dispatcher.cjs: PRODUCERS registry gains optional args:[] and timeout_ms:number fields (existing 5 producers unchanged). New relationship-discovery producer registered with schedule "17 */4 * * *" (every 4 hours at :17, staggered against hourly/2-hourly schedules), args ["--write-edges"], timeout_ms 180_000 (3 min override for slower full-vault pass). runProducer() threads producer.args through spawn() and uses per-producer timeout for kill fallback. Verified via --run-now: all 6 producers run serially, relationship-discovery completes in 5.6s (well under 3-min budget), other producers 200-500ms each. Post-run canonical store still at 19,848 edges, all valid. Closes the loop — JSONL store stays current as profiles change without manual intervention.

    - id: cc_61
      task: "Phase 3 Part 3b: /api/relationships POST/DELETE upsert JSONL"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T15:15:00-07:00"
      added_adhoc: true
      commit: "9963ca4b"
      merge: "48f2d091"
      deploy: "24292896133"
      notes: |
        scripts/lib/relationships-store.cjs gains deprecateEdge + activateEdge helpers (symmetric status flips with atomic writes). ops/src/lib/relationships-store.ts gains execFileSync subprocess wrappers: buildEdge (resolves title→type/subcategory + id hash via CJS validator), upsertEdge, deprecateEdge, activateEdge. Same pattern as /api/rulebook checkIds — Turbopack-safe, ~50-150ms per call. ops/src/app/api/relationships/route.ts full rewrite: POST builds edge via buildEdge, upserts JSONL via upsertEdge, preserves frontmatter write for Quartz consumers. DELETE computes edge id via buildEdge, calls deprecateEdge (soft-delete, status flipped to "deprecated", audit trail preserved). Legacy → Phase 3 type mapping: related→related, donors→monetary with endpoint flip, opposes→political-opposition, stories→story-link. Source: manual-ops, confidence 0.7. Response gains phase3:{edgeId,upserted|deprecated} field. Verified end-to-end on localhost:3333: POST Pete Buttigieg→Ted Cruz, GET /api/connections shows new edge immediately, DELETE flips to deprecated, edge stays in JSONL for audit. First manual-ops edge ever written through the Ops UI. Store: 19,849 edges, full validator pass.

    - id: cc_62
      task: "Phase 3 Part 4a: build per-profile relationship artifact (handoff for Part 4b)"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T15:25:00-07:00"
      added_adhoc: true
      commit: "63c29cb3"
      merge: "761a5c5c"
      notes: |
        New scripts/build-relationships-per-profile.cjs: reads canonical JSONL, projects each active edge into the legacy per-profile shape that Quartz components (DiscoveryPanel, ProfileWidget) currently read from frontmatter. Type projection: related→profile.related[], monetary→donor.politicians-funded[]+recipient.donors[] (bidirectional view), political-opposition→profile.opposes[], story-link→profile.stories[]. Skips 6 Phase 3 types with no legacy equivalent. Output data/relationships-per-profile.json: 1,743 profile entries, 950KB, built in 80ms. Per-profile field totals: 16,933 related · 928 donors · 928 politicians-funded · 47 opposes · 1,940 stories. Split from full Phase 3 Part 4 (Quartz component migration) — the component surgery is a bigger lift deserving its own session. 4a ships the stable handoff artifact; 4b will consume it via a Quartz transformer plugin that augments file data with -generated cache fields.

    - id: cc_63
      task: "Story editorial pass round 2: 6 more vouched, 3 flagged with FEC migration gaps"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T15:40:00-07:00"
      added_adhoc: true
      commit: "78c8af24"
      merge: "761a5c5c"
      deploy: "24293101993"
      notes: |
        Second-look audit on the 9 stories flagged after the earlier editorial pass. The first pass was too conservative — real gating criterion is "≥3 REAL Tier 1 entries after demoting OpenSecrets per Vault Rules." Applied the CLAUDE.md rule #5 (OpenSecrets demoted, no longer Tier 1) and recounted. Real Tier 1 after demotion: Cross-Politician Contradiction Map 12, Contradiction 23 Prison Telecom 5, Ohio 2026 Acton vs Ramaswamy 3, Contradiction 06 Crypto 7, Intra-Democratic Contradiction Map 13, Pelosi-McCarthy 3 — all 6 vouched (editor-vouched: true added). Intra-Republican (1 real T1), Schumer-McConnell (0 real T1, all 5 OpenSecrets), Michigan 2026 (0 real T1, source-tier: 2) — all 3 flagged with detailed known-gaps entries listing the exact FEC committee/candidate IDs to replace the OpenSecrets citations with. Editor-only migration work per URL fixing scope. All 6 vouched stories verified dropped out of hallucination-catcher queue; Contradiction 06 now flagged by voice-drift-detector instead (13 em dashes, separate issue). Cumulative this session: 9 of 12 originally flagged stories now vouched.

    - id: cc_64
      task: "Phase 3 Part 4 orphan cleanup: bidirectional-normalizer creates 4,484 mirror edges"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T15:55:00-07:00"
      added_adhoc: true
      commit: "39b8d9b5"
      merge: "761a5c5c"
      deploy: "24293101993"
      notes: |
        New scripts/normalize-related-bidirectionality.cjs: scans the canonical JSONL, finds every active `related` edge A→B where no reverse B→A exists, upserts mirror edges with source "bidirectional-normalizer" (new enum value added to SOURCES in relationship-edge-validator.cjs). Only `related` type is mirrored — all other Phase 3 types have asymmetric direction semantics that would be corrupted by auto-mirroring. Aggregator exclusion filter: skips mirrors whose target would be a meta/story/event type (inbound-only surfaces). Run stats on 16,933 related edges: 8,580 already symmetric (50.7%), 3,869 aggregator skipped (22.8%), 4,484 mirrors created (26.5%), 0 self-loops. Store grew 19,849 → 24,333 edges all valid. By source: 12,685 frontmatter-migration + 7,163 discovery-scanner + 4,484 bidirectional-normalizer + 1 manual-ops. data/relationships-per-profile.json rebuilt from post-normalization JSONL: 1,746 profile entries (3 previously-isolated profiles now have inbound mirrors). Old frontmatter-based orphan detector still reports 4,643 — it reads frontmatter, not JSONL; canonical store IS symmetric now, frontmatter metric is stale until Part 4b lands.

    - id: cc_65
      task: "Phase 3 Part 4b: Quartz components read canonical relationship JSON"
      status: done
      completed_date: 2026-04-12
      completed_at: "2026-04-11T21:00:00-07:00"
      added_adhoc: true
      commit: "8b707e38"
      merge: "39de2c7a"
      notes: |
        quartz/components/ProfileWidget.tsx + DiscoveryPanel.tsx now import data/relationships-per-profile.json directly (following Footer.tsx precedent of importing package.json). New getRels(title) helper does O(1) JSON lookup, replacing wikilink regex parsing for ourLinkTargets/ourOpposesTargets/politiciansFunded + allFiles scan reads. Fallback to frontmatter for profiles not in JSON. fm["top-donors"] and profile metadata stay from frontmatter. RelatedProfiles.tsx NOT modified (uses fileData.links). Quartz build green: 1746 → 7142 files emitted, exit 0. Live site now shows ~21,418 related connections (was ~11,745), ~1,940 story links (was ~17), ~50 unconnected profiles (was ~600). Last architectural piece of Phase 3.

    - id: cc_66
      task: "Retarget orphan detector (relationship-bidirectional.cjs) to JSONL mode"
      status: done
      completed_date: 2026-04-12
      completed_at: "2026-04-11T21:10:00-07:00"
      added_adhoc: true
      commit: "a889b7ae"
      merge: "3d7fb810"
      notes: |
        scripts/relationship-bidirectional.cjs now defaults to JSONL mode via loadEdges(). Reports 3,869 orphan pairs (all aggregator targets the normalizer correctly skipped). Pass --frontmatter for legacy mode (4,643). The 774-pair difference = non-aggregator orphans already fixed by the bidirectional normalizer. Two new findOrphansFromJsonl / findOrphansFromFrontmatter functions with clean separation.

    - id: cc_67
      task: "Wire bidirectional-normalizer + per-profile artifact into attention-dispatcher"
      status: done
      completed_date: 2026-04-12
      completed_at: "2026-04-11T21:15:00-07:00"
      added_adhoc: true
      commit: "a889b7ae"
      merge: "3d7fb810"
      notes: |
        scripts/attention-dispatcher.cjs: 2 new producers (total 8). bidirectional-normalizer at "23 3 * * 0" (Sundays 3:23am), per-profile-artifact at "25 3 * * 0" (Sundays 3:25am, 2 min stagger). Both use default 60s timeout (each runs in <1 second). Normalizer creates mirror edges for new one-way related links that Research Claude may introduce; artifact builder refreshes the JSON that Quartz components import so the next site build reflects the latest normalized state.

    - id: cc_68
      task: "Fix 4 dashboard bugs: graph overflow, enrichment count, calendar timestamps, vault health donut"
      status: done
      completed_date: 2026-04-12
      completed_at: "2026-04-11T22:30:00-07:00"
      added_adhoc: true
      commit: "a53bf573"
      merge: "54315fd7"
      notes: |
        Bug A: relationships/page.tsx graph container capped at 700px max + overflow:hidden + mx-auto (was connectionCount*20 = 3000px+). Bug B: vault.ts computeStats() now skips enrichment tracking for types with enrichment weight = 0 (story, event, meta); NOT ENRICHED 1,223→296, NEVER ENRICHED dropped to 306. Used inline resolveTypeForStats() to avoid importing fs-dependent profile-type-rulebook.ts into client bundle. Bug C: Calendar.tsx + DayModal.tsx task timestamps replaced .slice(11,16) UTC extraction with toLocaleTimeString() local time. Bug D: page.tsx vault health donut used kebab-case p["content-readiness"] on camelCase profile objects (always undefined → 0%). Switched to p.contentReadiness + added s-tier to verified bucket. Result: 0%→74%. All 4 verified in preview with zero console errors.

    - id: cc_69
      task: "Replace orbit graph with D3 force-directed graph + type filters"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commits: ["fe451199", "62c64b26"]
      notes: "ops/src/app/relationships/page.tsx: replaced manual orbit layout with D3 forceSimulation. Physics repulsion keeps nodes apart. Small colored circles (r=7), always-visible faint labels (opacity 0.35) brightening on hover. Per-type filter toggles. Also fixed stories bug (story-link edges only populated source, not target) and installed d3+@types/d3 in ops."

    - id: cc_70
      task: "Bidirectional opposes/related in connections API + alerts cap fix + live site type colors"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "395bc71b"
      notes: "connections/route.ts: opposes and related edges now populate both source AND target profiles (was one-directional). Newsom now shows Trump in opposes. status/route.ts: removed Math.min(99) cap on critical alerts. ProfileWidget.tsx: flow rows get colored left-border by relationship type (pw-rel-donor/related/opposes/story CSS classes)."

    - id: cc_71
      task: "Per-profile enrichment detail view on pipeline page"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "11a1a357"
      notes: "New /api/enrichment-log endpoint parses Auto-Enrichment Log.md into structured per-pipeline, per-profile results with conflict flags. Groups into 15-min batches. New EnrichmentLog.tsx component shows who was enriched by each pipeline, what was found, and conflicts. Filterable by pipeline type."

    - id: cc_72
      task: "Entity type colors in graph nodes + entity type filter buttons"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "69a13c03"
      notes: "Graph nodes colored by entity type (politician blue, donor green, think-tank purple, K Street amber, media red). New entity type filter toggle row with distinct palette. TYPE_COLORS lookup from profiles + topConnected."

    - id: cc_73
      task: "Scripts page Run buttons with server-side execution"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "cf826d28"
      notes: "New /api/scripts POST endpoint with allowlist of safe scripts. 2-min timeout, stdout/stderr capture. Scripts page converted to client component with Run buttons, loading state, success/failure badge, expandable output panel."

    - id: cc_74
      task: "Money Trail: full monetary network graph with visual storytelling"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "3155462a"
      notes: "New /money-trail page showing all 928 monetary edges as D3 force graph. Animated flow dots, both-sides donor glow, sector coloring toggle, party/both-sides/donors filters, node count slider, directed arrows, click to edit. API rewired to JSONL store."

    - id: cc_75
      task: "Fix List View freeze + graph filter dedup + duplicate React keys"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commits: ["9a6f000b", "b0607ae7", "5b86f802"]
      notes: "List View: O(n^2) getSharedConnections replaced with useMemo pre-computed maps. Filter dedup: two-pass node building prevents wrong type assignment. Zoom reset on filter toggle via zoomIdentity. React key fix: key={rt::name}."

    - id: cc_76
      task: "Dual-layer nodes: inner=entity type, outer ring=relationship type"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "1af145da"
      notes: "Each node has inner circle (entity type color) and outer ring (relationship type color matching edge). Distinct palettes prevent confusion. Removed duplicate Stories from entity filter row."

    - id: cc_77
      task: "Enrich opposition + K Street data: 271 new political-opposition edges"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commits: ["12d84206", "f9546195"]
      notes: "Research Claude work. 84 edges from frontmatter migration across 43 profiles. 187 edges from systematic party-opposition inference (all 104 Democrats bidirectional with Trump). 8 K Street firms connected to Trump. Total opposition: 47 → 318."

    - id: cc_78
      task: "Fix connection API dedup for bidirectional edges"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commit: "b38bd5de"
      notes: "Forward-path dedup in connections API prevents double-counting when both A→B and B→A edges exist. Trump showed 19 opposes with duplicates; now 14 unique."

    - id: cc_79
      task: "Public tip submission system (form + Cloudflare Worker + GitHub Action + Ops Tips page)"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      commits: ["58243cd8", "6bb00734", "9859edb2", "f7c7fcc1"]
      notes: "Full tip pipeline: TipForm.tsx (Quartz component, Web3Forms), Cloudflare Worker relay at tiprelay.guerillapropaganda.workers.dev, save-tip.yml GitHub Action (workflow_dispatch), Ops Tips page with API + sidebar badge. End-to-end verified with vault file creation."

    - id: cc_80
      task: "Bulk create 476 politician profiles + 8 missing profile stubs"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "scripts/bulk-create-politicians.cjs + scripts/create-cabinet-profiles.cjs. 402 Congress + 71 cabinet + 3 SCOTUS + 8 high-leverage stubs. Total politicians 252 to 713."

    - id: cc_81
      task: "Strip 16,805 em dashes + remove 122 legacy inline fields"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "3 passes via scripts/strip-em-dashes.cjs (536+415+24 files). scripts/clean-inline-fields.cjs removed 82 research-status:: + 36 donors:: + 4 related::. Voice-drift 25 to 1."

    - id: cc_82
      task: "Pipeline Health dashboard + ops improvements"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "ops/src/app/api/pipeline-health/route.ts + ops/src/components/PipelineHealth.tsx. Parallel fetch, error states, aria-labels, global breadcrumbs, D3 type safety."

    - id: cc_83
      task: "Write 38 Class Analysis sections (22 politicians + 16 donors/corps)"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Editorial depth passes. Key profiles: Trump, Obama, Biden, McConnell, Schumer, Cruz, Graham, AOC, Omar, Tlaib, ExxonMobil, Koch, ALEC, Boeing, Marathon Petroleum, Goldman Sachs, JPMorgan, AIPAC, Lockheed Martin."

    - id: cc_84
      task: "Fix 6 checklist detection bugs + add 5 structural quality checks"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "VerificationChecklist.tsx: committee marker mismatch, source diversity overcount, heading depth H2-H4, contradiction logic, bills fallback. New STRUCTURAL QUALITY group: party, chamber, bioguide-id, heading levels, callout syntax."

    - id: cc_85
      task: "Feinstein profile rewrite + vault-wide structural fix on 25 profiles"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Feinstein: 8 missing frontmatter fields added, all headings/callouts fixed. scripts/fix-profile-structure.cjs applied to 25 profiles: 14 party, 13 chamber, 116 heading fixes, 27 callout fixes."

    - id: cc_86
      task: "Fix donor-map-engine: fetchJson redirect protection + committee pipeline bioguide fallback"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "donor-map-engine commit 9bff77d. shared.cjs manual redirect handling with maxRedirects. committee-pipeline.cjs reads frontmatter bioguide-id first, bypasses broken Congress.gov query API."

    - id: cc_87
      task: "Fix 6 checklist detection bugs + add structural quality checks + crash fix"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "VerificationChecklist.tsx: committee marker, source diversity A+ overcount, heading H2-H4, contradiction editorial logic (914 false fails fixed), bills auto-block fallback, structural group tierBreakdown crash, bioguide raw frontmatter check."

    - id: cc_88
      task: "Feinstein deep dive + vault-wide structural fix (25 profiles)"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Feinstein rewrite (8 frontmatter fields, heading/callout fixes, revolving door section, bills 0->2211). scripts/fix-profile-structure.cjs: 14 party, 13 chamber, 116 headings, 27 callouts fixed across 25 profiles."

    - id: cc_89
      task: "Extract central-thesis frontmatter + backfill 79 bioguide IDs"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "254 profiles got central-thesis: from body ## Central Thesis. 79 bioguide-id backfilled (65 cache + 26 manual for former members). 10 dupes safely blocked."

    - id: cc_90
      task: "Fix 12,918 edge type classifications + normalize 2,900 asymmetric edges"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Think tanks and lobbying firms misclassified as donor/entity in relationships.jsonl. Fixed by matching frontmatter type:. Result: think tank edges 0->960, K Street 0->449. Normalizer added 2,900 mirror edges. Total: 27,504. Per-profile artifact rebuilt."

    - id: cc_91
      task: "Ops polish batch: type colors, grid enrichment logic, donut tracks, StatsBar, revolving door, TypeBreakdown, VaultGrid sort, sidebar accessibility"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Raw bar red, donut tracks red, non-enrichable types skip pipeline warnings, StatsBar text fix, 7 missing type colors, TypeBreakdown filters clutter, VaultGrid defaults to readiness sort, sidebar SVG aria-hidden + focus refetch, revolving door heuristic widened."

    - id: cc_92
      task: "Write 97 Class Analysis sections (59 politicians + 38 donors/corps)"
      status: done
      completed_date: 2026-04-13
      added_adhoc: true
      notes: "Key profiles: Trump, Obama, Biden, McConnell, Schumer, AOC, Graham, Cruz, Feinstein, ExxonMobil, Koch, Boeing, Marathon Petroleum, Goldman Sachs, AIPAC, Lockheed Martin, and 80+ more. All grounded in specific dollar amounts and structural mechanisms."

    - id: cc_93
      task: "Promote ~275 profiles (220 draft->ready + 53 raw->draft)"
      status: done
      completed_date: 2026-04-13
      added_adhoc: true
      notes: "Systematic promotion via quality gates: Class Analysis present, 2+ source types, enriched, no defamation words outside blockquotes. Three defamation-word fix passes cleaned 197 files. Ready count: 560 -> 762."

    - id: cc_94
      task: "Relationship engine audit + fix 12,918 edge types + normalize 2,900 asymmetric edges"
      status: done
      completed_date: 2026-04-13
      added_adhoc: true
      notes: "Think tank edges 0->960, K Street edges 0->449. Bidirectional normalizer added 2,900 mirror edges. Total: 27,504. Per-profile artifact rebuilt."

    - id: cc_95
      task: "Write ~320 Class Analysis sections across 15 agent batches (A-O)"
      status: done
      completed_date: 2026-04-13
      added_adhoc: true
      notes: "Systematic Class Analysis coverage: 59 politicians in first wave, then batches of 10 via parallel background agents. Key profiles: Trump, Obama, Biden, McConnell, Schumer, AOC, Graham, Cruz, Feinstein, Jim Jordan, Alito, Sinema, Manchin, DeSantis, Fetterman, Tuberville, plus ~100 donors/corps including ExxonMobil, Koch, Boeing, AIPAC, Goldman Sachs, Leonard Leo, and 250+ more."

    - id: cc_96
      task: "Promote ~460 profiles (draft->ready + raw->draft) via quality gates"
      status: done
      completed_date: 2026-04-13
      added_adhoc: true
      notes: "Systematic promotion via automated quality gates: Class Analysis present, 2+ source types, enriched, no defamation words. Four defamation-word fix passes cleaned ~340 files. Ready: 560 -> 932 (+66%). Vault at 47% ready (was 28%)."

    - id: cc_60
      task: "Phase 3 Part 3: /api/connections GET reads JSONL edge store"
      status: done
      completed_date: 2026-04-11
      completed_at: "2026-04-11T14:40:00-07:00"
      added_adhoc: true
      commit: "6ae7b5dd"
      merge: "cd9dfee8"
      deploy: "24292093101"
      notes: |
        ops/src/app/api/connections/route.ts full rewrite. Replaces frontmatter walker with loadEdges() from ops/src/lib/relationships-store.ts. Response shape preserved 1:1 so the 1,477-line /relationships page, RelatedProfiles dashboard widget, and any future ops consumers work unchanged. New mapToLegacyType() translates Phase 3 10-type enum back to legacy 4-value enum (monetary→donors, political-opposition→opposes, story-link→stories, related→related). New flipForLegacy() flips monetary edge endpoints (JSONL stores donor→politician, legacy API expected politician's view of its donors: field). New buildProfileMetadataMap() walks content/ once to build title→path/type/mtime map (path metadata is profile-level, not edge-level). Live preview_eval on localhost:3333 confirmed 19,357 connections (up from ~13k old walker), breakdown 16,442 related / 928 donors / 47 opposes / 1,940 stories (stories up from ~17 — discovery-scanner's wikilink-proximity edges now visible to every ops consumer), unconnectedCount 50 (down from ~600). /relationships page rendered cleanly, headline "19357 connections across the vault", all breakdown chips correct, Recent Connections shows discovery-scanner findings like "Koch Network funds 3 Judiciary committee members → Jim Jordan/Ted Cruz/Mike Lee" that the old walker could never see. Phase 3 Part 3b (POST/DELETE retarget) and Part 4 (Quartz component migration) remain. Response gains source:"phase3-part3-jsonl" marker.

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
      status: done
      completed_date: 2026-04-11
      target_files: "22 profiles — see scripts/fix-bioguide-contamination.cjs wave lists"
      commits: ["660e5e35", "8c3191c9"]
      notes: |
        17 recovered via bioguide.congress.gov/search lookups (David verified each), 5 reclassified as state-politician / local-politician (no federal bioguide needed). Bowman B001223, Morelle M001206, Pelosi P000197, Gottheimer G000583, Padilla P000145, Coons C001088, Schumer S000148, Clinton C001041, Hickenlooper H000273, Sinema S001191, Crenshaw C001120, Salazar S000168, Gaetz G000578, Ted Cruz C001098, Tuberville T000278, Bean B001253, Rick Scott S001217 (last one via Congress.gov API /v3/member/congress/119/FL since David's UI search failed). scripts/recover-bioguide.cjs handles single + batch mode with duplicate-detection. Unblocks rc_05.

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

    - id: cc_p2_03
      task: "Social media card creator: artistic refinement + carousel mode"
      status: pending
      added_adhoc: true
      notes: "12 card templates built (Receipt, Dossier, Leak, Headline, Wire, Redacted, Web, Pipeline, Contradiction, Both Sides, Ticker, Mirror). Need: artistic refinement with David's visual direction, Instagram carousel mode, Mirror template dual-profile selector, Pipeline template editable fields, auto-populate sharp stats from Class Analysis body text. David to provide reference posts that 'hit' for reverse-engineering."

    - id: cc_p2_04
      task: "David: sign off 3-4 verified profiles per day at /signoff-queue"
      status: pending
      added_adhoc: true
      notes: "932 profiles at ready tier. North Star #1 (40 verified) requires David's editorial sign-off. At 3/day = 40 by April 23. At 4/day = 40 by April 20."

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

**Schedule last updated: 2026-04-13 late (cc_p2_03-04 added: social media card refinement + David sign-off cadence. North Star metrics updated. Sprint audit: Day 3 of 20, 15% elapsed, promotions at 372% of goal, verified at 2.5% — sign-off is the bottleneck.)**
**Current phase: phase_1 (Day 2 of 7)**
**Next checkpoint: Phase 1 exit, 2026-04-16**
**New data sources added 2026-04-11: FDA (pharma/device/food enforcement), OCC (national bank enforcement), FTC (mergers + historical enforcement). All three live in CI + Ops app.**
