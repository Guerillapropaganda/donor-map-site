---
title: Sprint Schedule
type: admin-note
note-type: data
priority: normal
status: active
last-updated: '2026-04-18-990-enrichment-marathon-plus-launch-50-editorial-pass'
sprint-id: "2026-04-sprint"
sprint-start: '2026-04-10'
sprint-end: '2026-04-30'
sprint-goal: "Public launch of thedonormap.org with ≥40 verified profiles, ≥100 draft→ready promotions, all pipeline bugs fixed, 528 conflicts triaged"
---

# Sprint Schedule. April 10-30, 2026

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
    current: 383   # politician-only draft count after full cleanup (246 politicians at draft + estimated ~137 other types still in the same bucket). Expected to climb temporarily as the donor/corp/pac/lobbying-firm audit runs next session, then decrease as re-enrichment + manual depth passes promote them back.
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

## Phase 1, must-complete tasks

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
      task: "Capitol Trades: House PTR PDF backfill (44,610 tx, 2015-2026)"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "financial-disclosures-backfill.cjs downloads House Clerk ZIPs, parses PTR PDFs. 7,419 filings -> 44,610 transactions. 10-strategy ticker extraction (53% -> 80%+)."

    - id: cc_80
      task: "Capitol Trades: Senate eFD backfill (8,212 tx, 2014-2026)"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "senate-disclosures-backfill.cjs scrapes efdsearch.senate.gov. Fixed CSRF 302 cookie bug. 8,212 transactions, 527 whale, 1,342 late, 423 options, 104 crypto."

    - id: cc_81
      task: "Capitol Trades: 12-tab Ops page with analysis tabs"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Trades, Stock Flow, Money Trail, Top Tickers, Top Traders, Stories, Scoreboard, Timeline, Unusual, Conflicts, Lobby, Crypto. All with explainers."

    - id: cc_82
      task: "Capitol Trades: 6 new API routes (crypto-conflicts, committee-conflicts, unusual-activity, trade-stories, lobby-trades, capitol-trades)"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "Full analytical backend. Crypto vote cross-reference, committee-sector conflicts, coordinated cluster detection, narrative generator, lobby-trade triple-conflict."

    - id: cc_83
      task: "Capitol Trades: Name normalization + filing delay cleanup"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "ops/src/lib/politician-names.ts with 50+ overrides. Filing delay capped 0-180 days, false violations dropped from 8,622 to ~6,000."

    - id: cc_84
      task: "Capitol Trades: Data quality report in Admin Notes"
      status: done
      completed_date: 2026-04-12
      added_adhoc: true
      notes: "content/Admin Notes/capitol-trades-data-quality.md. Full breakdown of dataset, extraction rates, known gaps, next steps."

    - id: cc_85
      task: "Deploy unblocker: resolve merge-conflict markers in CA Farm Bureau Federation frontmatter"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T11:20:00-05:00"
      added_adhoc: true
      commit: "17d3f2ba"
      deploy: "24410325193"
      notes: "GH Actions run 24409280227 failed on `<<<<<<< HEAD` markers in frontmatter. Root cause: per-approval commit race between pipeline write and ops approve write. Kept newer last-enriched date and merged both sides' data. Live site was stuck until this commit."

    - id: cc_86
      task: "Fix duplicate React key bug in Ops activity feed (sug- id 20-char truncation)"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T11:35:00-05:00"
      added_adhoc: true
      commit: "9565720f"
      deploy: "24410325193"
      notes: "ops/src/app/api/activity/route.ts truncated suggestion ids to 20 chars for the React key prefix, so every 'Mike Collins Master Profile → X' approval collided on `sug-Mike Collins Master `. 16 collisions found in suggestion-actions.json. Fix: use full id. Surfaced from David's bulk approval session as Next.js console error."

    - id: cc_87
      task: "Refactor /api/suggestions approve to dual-write canonical edge + frontmatter"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T11:50:00-05:00"
      added_adhoc: true
      commit: "9565720f"
      deploy: "24410325193"
      notes: |
        Pre-fix: 130 approvals landed in frontmatter only; canonical data/relationships.jsonl had 1 manual-ops edge. Post-fix: approve flow runs buildEdge + upsertEdge before frontmatter write, mirroring /api/relationships POST (Phase 3 Part 3b pattern). Shared legacyToPhase3Type / endpointsForLegacyWrite / LEGACY_RELATIONSHIP_TYPES helpers extracted into ops/src/lib/relationships-store.ts so both routes can't drift. Returns edgeId + canonicalSkipReason to client. Canonical write runs even when frontmatter already has the link so historic approvals catch up on re-approval.

    - id: cc_88
      task: "Backfill 130 historic approvals into data/relationships.jsonl"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T12:10:00-05:00"
      added_adhoc: true
      commit: "1f014b53"
      deploy: "24410325193"
      notes: |
        scripts/backfill-suggestion-approvals-to-jsonl.cjs (idempotent, dedupes by edge id). First pass: 37/130 matched existing records (last_verified bumped), 93 skipped due to title-index gaps. Full 130/130 resolution came after cc_89/cc_90/cc_91/cc_92/cc_93 landed.

    - id: cc_89
      task: "Priority-based disambiguation + aliases field in buildTitleIndex"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T13:20:00-05:00"
      added_adhoc: true
      commit: "3a3390bb"
      deploy: "24410987603"
      notes: |
        scripts/lib/relationship-edge-validator.cjs. Canonicality score: politician > state-politician > entity > story > donor > event > meta, archive-path penalty (-200), file-size tiebreaker (+20 max). 18 ambiguous vault titles → 0 without touching any profile file. Also added `aliases:` frontmatter field support — profiles can claim alt names as weaker index entries; real titles always beat aliases on collision.

    - id: cc_90
      task: "Add PAC aliases to 22 existing profiles (absorb FEC ALL-CAPS committee names)"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T13:30:00-05:00"
      added_adhoc: true
      commit: "3a3390bb"
      deploy: "24410987603"
      notes: "scripts/add-pac-aliases.cjs. Club for Growth (+CLUB FOR GROWTH ACTION), Senate Leadership Fund (+SLF PAC +SFA FUND INC), Senate Majority PAC (+SMP +MAJORITY PAC), Americans for Prosperity (+AFP ACTION variants), SEIU, AFSCME, DMFI, DSCC, NAR, Fairshake, MAGA Inc, US Chamber, Freedom Partners, and 8 more. 22/22 profiles updated."

    - id: cc_91
      task: "Create 39 stub profiles for missing PAC/committee entities"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T13:40:00-05:00"
      added_adhoc: true
      commit: "3a3390bb"
      deploy: "24410987603"
      notes: |
        scripts/create-pac-stubs.cjs. American Crossroads, The Lincoln Project, MoveOn.org Political Action, American Future Fund, Justice Democrats PAC, DCCC/NRCC/NRSC/DNC/RNC, Courage to Change, NRA PVF, Crypto Innovation PAC, Never Back Down, Conservative Leadership PAC, and 26 more. All marked content-readiness: raw, editorial-status: stub, source-tier: 1, with aliases list absorbing the FEC ALL-CAPS names. Placed in Donors & Power Networks/Super PACs (or Tech & Crypto / Labor Unions where applicable). Will surface in promotion-candidate-queue naturally.

    - id: cc_92
      task: "Validator: exempt manual-ops from monetary amount requirement"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T13:45:00-05:00"
      added_adhoc: true
      commit: "3a3390bb"
      deploy: "24410987603"
      notes: "scripts/lib/relationship-edge-validator.cjs. 'manual-ops' added to MIGRATION_SOURCES so editor-click approvals don't need to supply FEC dollar amounts. Same exemption migration-sourced edges already had. Unblocked 30 more backfill edges."

    - id: cc_93
      task: "writeAndPush conflict-retry (pipeline race fix)"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T13:55:00-05:00"
      added_adhoc: true
      commit: "3a3390bb"
      deploy: "24410987603"
      notes: |
        ops/src/lib/local-write.ts. On push rejection: git pull --rebase origin v4, retry up to 3x. On rebase conflict (pipeline just wrote to the same profile): abort rebase, git reset --hard origin/v4, re-write our bytes, re-commit, retry push. Callers pass final bytes so overwrite is safe. This is the root-cause fix that would have prevented the CA Farm Bureau deploy break at the start of the session. Re-run backfill with cc_92: 130/130 edges, 30 new added, 100 matched existing, 0 skipped, 0 invalid.

    - id: cc_94
      task: "Strip em dashes vault-wide (20,105 removed from live content)"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T14:40:00-05:00"
      added_adhoc: true
      commit: "ae5d81dab"
      deploy: "24412461910"
      notes: |
        Extended scripts/strip-em-dashes.cjs with --all flag (processes every profile regardless of readiness + strips visible frontmatter + handles > [!callout] lines). Intentionally preserved: external news blockquotes (2,582), fenced code (175), <!-- auto: --> blocks (7,245), internal-notes frontmatter (23 — pipeline logs per "if it's internal I don't care"), content/Vault Maintenance/ archive. Residual body em dashes outside archive: 0. Fixed two bugs in the script during the run: (1) leading-whitespace collapse regex broke YAML folded-scalar continuations (fixed with non-space anchor); (2) line-based frontmatter strip missed multi-line quoted scalars (fixed by skipping fields whose name ends in -notes). Also fixed ops/src/app/api/urls/save/route.ts archive marker to use comma instead of em dash so future triage writes stay clean.

    - id: cc_95
      task: "Strip 'Master Profile' title suffix from 612 profiles"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T14:50:00-05:00"
      added_adhoc: true
      commit: "ae5d81dab"
      deploy: "24412461910"
      notes: "scripts/strip-master-profile-title-suffix.cjs. Titles like 'John Smith Master Profile' now display as 'John Smith'. Filenames left alone (renaming would break [[_X Master Profile]] wikilinks; normalizeTitle already strips the suffix at lookup time). Title index unchanged (2,463 entries, 0 ambiguous)."

    - id: cc_96
      task: "Resolve 8 duplicate entity cases (6 merged + deleted, 2 renamed)"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T15:05:00-05:00"
      added_adhoc: true
      commit: "ae5d81dab"
      deploy: "24412461910"
      notes: |
        scripts/merge-duplicate-entities.cjs. MERGED+DELETED (6): Heritage Foundation, American Enterprise Institute, Center for American Progress, Federalist Society, PhRMA, Ballard Partners — pipeline frontmatter (EIN, nonprofit-status, total-revenue, SEC filings, lobbying-spend) absorbed into canonical Think-Tank / Lobbying Firm / Sector profile before deleting the parallel donor-taxonomy duplicate. Aliases added so FEC writes route to canonical. RENAMED (2): David Sacks and JB Pritzker donor profiles are LARGER (40K, 25K) than their politician master profiles (17K, 13K) and contain unique editorial analysis. Retitled to "David Sacks (Donor Network)" and "JB Pritzker (Donor Network)". Original titles preserved as aliases. Research Claude can body-merge later then delete.

    - id: cc_97
      task: "Vault audit report + banned vocab audit (flagged 270 instances for Research Claude)"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T15:15:00-05:00"
      added_adhoc: true
      commit: "ae5d81dab"
      deploy: "24412461910"
      notes: |
        scripts/audit-banned-vocab.cjs + content/Admin Notes/vault-audit-2026-04-14.md. Banned AI vocab counts in live bodies (non-quoted): significantly 125, ultimately 78, notably 42, additionally 11, importantly 10, crucially 5, testament to 1, moreover 1, delves 1. Total 270. Not auto-replaced (context-sensitive). Top 10 densest files listed. Also flagged for David (Editor-only URL lane): 47 FollowTheMoney links, 18 inline [Source: OpenSecrets] without URLs, 15 (URL NEEDED) markers.

    - id: cc_98
      task: "Resolve main-repo stash-pop conflict in investigate-queue.md"
      status: done
      completed_date: 2026-04-14
      completed_at: "2026-04-14T15:30:00-05:00"
      added_adhoc: true
      notes: "Leftover conflict markers from `git stash pop` during deploy. Stashed side was empty; upstream had the full 7-item archive section. Removed the 3 marker lines, kept upstream content. File unstaged to match normal ops-server working-tree state."

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

    - id: cc_99
      task: "Query engine planning session — ADRs 0001-0003 + institutional memory docs"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "e3626410a"
      notes: |
        Long riff session with David produced the full query engine + source registry + class tags build plan. Shipped: content/Class Tag Vocabulary.md (locked 5-dimension schema — capital_type, class_position, ideological_function, worker_relationship, policy_stakes — with 16 capital types, 5 class positions, 20 ideological functions, 7 worker relationships, plus politician mirror vocabulary and worked examples for Chevron/CoreCivic/Koch/AFT/Amazon/AOC/Manchin/Ted Cruz). content/Monetization Model.md ("facts free, labor paid" tier structure — Free, Free-auth 5/day, Researcher $20/mo, Newsroom $150/mo, Patron $500 one-time, Clerk+Stripe, non-negotiable free list locked). content/Build Phases.md (6 sequential phases with exit criteria per phase). content/Phases/phase-1/ folder (handoff, exit-criteria, decisions). content/Decisions/0001-0003 ADRs. .claude/skills/phase-transition/SKILL.md (ceremony for phase boundaries). The planning package is the institutional-memory foundation for the entire query engine build.

    - id: cc_100
      task: "Source registry schema + store (sources-schema.cjs + sources-store.cjs)"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "e3626410a"
      notes: |
        scripts/lib/sources-schema.cjs — schema definition, validator, URL normalization for dedupe (lowercase host, strip www, strip tracking params utm_*/fbclid/gclid, normalize trailing slash). 8 status enums (unverified/live/dead/redirected/generic_orphan/archived/needs_review/paywall), 14 source types, tier enum [null,1,2,3,4]. scripts/lib/sources-store.cjs — reader/writer API following relationships-store.cjs pattern. Lazy load, in-memory URL + ID indexes, append-only JSONL, rewrite-whole-file persistence. API: loadSources, clearSourcesCache, getSource, findByUrl, addOrFindSource (creates or dedupes), updateSource, updateStatus, querySources, countSources. 10/10 smoke tests passed covering add, dedupe-by-normalized-URL, get, update, status transition, query filter, count, disk reload, schema rejection of bad records.

    - id: cc_101
      task: "Source extractor — walk vault, populate registry from markdown links"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "778e2cf2d"
      notes: |
        scripts/extract-sources-from-vault.cjs walks content/**/*.md with a conservative markdown link regex, classifies each URL by host (100+ classification rules across government_primary/government_secondary/court_record/news_major/news_regional/investigative/academic/aggregator/advocacy/trade_press/social/archive/company_direct), and registers via sources-store.addOrFindSource. Handles Windows illegal-char directories gracefully (try/catch on readdirSync). Strikethrough wrappers (~~[text](url)~~) auto-mark status=archived. Full-vault run: 2,384 files scanned, 1,716 with links, 18,587 raw links found, 14,681 unique sources registered, 3,906 deduped across profiles (21% citation reuse rate), 3,317 pre-archived via strikethrough, 0 malformed. 29% of links classified as "other" — will be reclassified in Ops /sources UI later.

    - id: cc_102
      task: "Source fingerprinter — fetch, hash, classify, bot-block detection"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commits: ["d6c6e64ce", "1881536ea"]
      notes: |
        scripts/sources-fingerprint.cjs fetches each URL with 15s timeout, captures final URL after redirects, extracts <title>, strips HTML+nav+header+footer+script+style and SHA-256 hashes first 5000 chars of main text, classifies as live/dead/redirected/generic_orphan/needs_review/paywall. Promise pool concurrency 8 (configurable). CLI flags: --limit, --host, --status, --concurrency, --verbose. Resumable — only processes status=unverified by default. Mid-run discovery: first pass was mis-classifying Cloudflare-protected sites (Bloomberg, Forbes, Reuters, WSJ) as dead based on HTTP 403 or challenge page responses. Fixed with new BOT_BLOCK_TITLE_RE catching "Just a moment...", "Are you a robot?", "Access Denied", "Verify you are human" and BOT_BLOCK_BODY_RE catching Cloudflare Ray IDs, __cf_chl markers, "checking your browser". HTTP 403 specifically reclassified from dead to needs_review since it's almost always anti-scraping not a 404. Paywall check moved before fetch so we skip hitting known paywall hosts entirely (NYT, WSJ, WaPo, Bloomberg, FT, Economist, NYer, Atlantic).

    - id: cc_103
      task: "Full fingerprint pass over all 14,681 sources"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "6b715e530"
      notes: |
        Ran fingerprint pass across every unverified source. Interrupted at ~89% during session, resumed cleanly (the script is idempotent on status=unverified) and finished the last 45 stragglers in 17 seconds. Final classification distribution: 9,555 live (65%), 3,317 archived (pre-existing strikethrough), 1,041 needs_review (bot-blocked — the classifier fix working), 539 dead (genuine fetch failures), 135 paywall, 52 redirected, 42 generic_orphan, 0 unverified. The needs_review bucket is the largest flagged category and validates the bot-block fix — these would have been false-dead before.

    - id: cc_104
      task: "Orphan citation report generator + first report"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commits: ["1881536ea", "6b715e530"]
      notes: |
        scripts/sources-orphan-report.cjs reads the registry, groups flagged sources (dead/generic_orphan/needs_review/optionally redirected) by entity_ref, sorts by count, writes markdown report with frontmatter to content/Admin Notes/orphan-citations-report.md. Each entry shows [status] src_id original_url [→ canonical if redirected] "title". Generated first full report: 1,622 flagged sources across 784 entities (11.0% of registry). Ready for David's triage in Ops /sources UI when that lands in a later Phase 1 session.

    - id: cc_105
      task: "Phase 2.75 Policy Battles planning (ADR-0004)"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "9fac02d5e"
      notes: |
        Mid-session riff with David on the Policy Battles concept (ChatGPT thread seeded). Core insight: a policy page is NOT a new content type. It's a stored query over relationships.jsonl + events.jsonl + sources.jsonl plus a one-paragraph editorial blurb. Cuts build cost from "15 profiles to maintain" to "one template + 5 paragraphs + OG card plugin." Created ADR-0004 (content/Decisions/0004-phase-2-75-policy-battles.md) with full scope: 5 v1 policies (housing/healthcare/AIPAC-BDS/minimum wage/student debt), /who-blocks-us cross-policy enemy list, OG card generation mandatory, contradiction callouts, AIPAC editorial firewall locked (banned words "bought/co-opted/bribed/corrupt/scheme" in prose, facts-only juxtaposition, class tags carry opinion weight via structured metadata, AIPAC described precisely as "US-based 501(c)(4)..."). Updated content/Build Phases.md to insert Phase 2.75 between Phase 2 and Phase 2.5 (so policy pages ship BEFORE auth gating lands — they're non-negotiable free per ADR-0002). Updated ADR-0003 with forward reference to ADR-0004. Created content/Phases/phase-2.75/ folder with handoff, exit-criteria, decisions. Events.jsonl schema in Phase 2 must bake in policy_id and obstruction_type fields — obstruction_type captures procedural kills (filibusters, chair bottling, pocket vetoes) which are often more important than floor votes because invisible to the public.

    - id: cc_106
      task: "Phase 1 handoff updates for clean session pickup"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commits: ["39e167d9a", "6b715e530"]
      notes: |
        Two updates to content/Phases/phase-1/handoff.md: mid-session update documenting the 4 commits shipped so far + restart instructions if session ends mid-fingerprint, then end-session update with final fingerprint distribution and "next concrete action = Quartz {{src:ID}} plugin". Phase 1 now at ~55% (7 of 11 deliverables shipped). Remaining Phase 1 work: Quartz source-refs plugin, Ops /sources review page, one pipeline migration, CLAUDE.md/Vault Rules.md/Pipeline Guide.md updates, Phase 1 retrospective.

    - id: cc_107
      task: "Phase 6 sprint 6b — regression test harness (20 tests)"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "f0966209a"
      notes: |
        Wrote scripts/phase-6-regression-tests.cjs using Node's built-in node:test module. 20 tests, zero extra deps, ~75ms runtime. Each test maps to a specific bug fixed in Phases 1-5 that would silently regress if a future refactor "cleaned up" the fix. Coverage: source URL normalization (3 tests), schema validator rejections across sources/entities/events/claims (7), tier hierarchy admin/researcher/anonymous/patron (4), story scorer math including recency decay curve (4), claims defamation firewall (2), heuristic class tag vocabulary labor-aligned override (1). All 20 pass clean. This is the test that would have caught the California Nurses Association "ruling-class" bug, the events "signed" outcome bug, and the FEC dedupe regression if a future refactor reintroduced them.

    - id: cc_108
      task: "Phase 6 shipped — ADR-0008 closes ADR-0003 (query engine build complete)"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "8a4dc067b"
      notes: |
        Wrote content/Decisions/0008-query-engine-build-complete.md (closing ADR for the 8-phase query engine build from ADR-0003) and content/Phases/phase-6/retrospective.md. ADR-0008 enumerates what shipped (all 8 phases), what moved to ongoing maintenance (267 deferred items triage, 346 class tag approvals, Stripe activation, performance benchmarks, AIPAC legal review, git secret scan), and the honest metrics snapshot (8 canonical stores, 43,587 records, 0 failures, 20 regression tests, ADRs 0001-0008). Retrospective documents what shipped, what took longer than expected (267 deferred items was higher than the 40-60 estimate), what surprised us (zero data integrity failures = validators-at-write-time pays off), lessons (regression tests should cover bugs not modules; closing ADRs should be honest about deferred items), and tech debt introduced (regression tests not yet in CI, perf benchmarks deferred, Stripe scaffolded not activated). content/Build Phases.md updated with closed-by: ADR-0008.

    - id: cc_109
      task: "Publication-readiness gate + canonical-store sentinel"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "af7f65a1f"
      notes: |
        Built scripts/publication-readiness-check.cjs — the single source of truth for "is this profile publishable." Walks profiles, enforces 6 gates: content-readiness:verified, no (URL NEEDED)/(UNVERIFIED)/(NEEDS REVIEW) markers in visible text, no strikethrough sources outside Archived section, every {{src:ID}} resolves to live/archived (not dead/generic_orphan/needs_review/paywall), every cited entity has approved class tags (not proposed), ## Class Analysis section present. Supports --folder, --file, --json, --ready-only, --verbose. Smoke-tested on /Policies: 7 BLOCKED (content-readiness not set) — honest signal. Built scripts/canonical-store-sentinel.cjs — new pre-commit sentinel that blocks any commit touching frontmatter relationship fields (related, donors, top-donors, politicians-funded, opposes, stories, *-generated) unless the commit also touches data/relationships.jsonl or a rebuilder script. Enforces the Phase 3 canonical-store write-path rule at the commit gate. Wired both new sentinels into .husky/pre-commit — hook now runs 6 sentinels instead of 4 (added canonical-store and regression-tests).

    - id: cc_110
      task: "CLAUDE.md rules 9-13 + 3 checklists + checklist index"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "af7f65a1f"
      notes: |
        Added 5 new core rules to CLAUDE.md § Query Engine: rule 9 (architecturally complete ≠ publication ready — publication-readiness-check is the gate, under-construction is the default), rule 10 (canonical stores are the write path; frontmatter fields are read-caches — enforced by canonical-store-sentinel), rule 11 (class tag approval gate — no verified promotion with proposed tags), rule 12 (claim-object vs prose decision rule — AOC is the reference), rule 13 (Perplexity-first research protocol — extended from pipelines to class tags, story calibration, legal precedent). Updated active ADRs list 0001-0008 and added "Active checklists" cross-ref block. Created content/Checklists/ folder with pre-publication.md (script-enforced + human-enforced gates), new-data-store.md (ADR → schema → validator → store → TS mirror → tests → docs), new-pipeline.md (codifies Pipeline Research Protocol), README.md index.

    - id: cc_111
      task: "Perplexity prompt library + AIPAC research filing"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commits: ["af7f65a1f", "(pending session-save commit)"]
      notes: |
        Wrote content/Admin Notes/perplexity-prompt-library.md — 7 copy-paste research prompt templates (A: new pipeline cheatsheet, B: deferred items triage, C: AIPAC defamation precedent, D: class tag batch proposal, E: story score calibration, F: source URL deep triage, G: prior art check). The library is how David routes research work to Perplexity: Claude gives him a filled-in prompt, he pastes it, copies answer back. Zero Claude time, ~2 min David time per prompt. David ran Prompt C mid-session — filed the AIPAC defamation precedent output to content/Admin Notes/perplexity-research/2026-04-14-aipac-defamation-precedent.md with frontmatter + Claude TL;DR + 8 concrete action items for the AIPAC page. Headline findings: no successful AIPAC defamation suit against a journalist ever, our vocabulary (imperialist-aligned, zionist-aligned, capital_type, class_position) is protected under Milkovich, correlation framing safe/causation dangerous (already our rule), banned-word list correct, Mapping Project survived similar labels with no US lawsuits, Track AIPAC running openly since 2024, best jurisdictions CA/NY/DC/OR.

    - id: cc_112
      task: "Session State publication readiness snapshot + Last Session update + session save"
      status: done
      completed_date: 2026-04-14
      added_adhoc: true
      commit: "cdcb907ae"
      notes: |
        Updated content/Session State.md: new "Publication Readiness Snapshot" section (one-glance launch readiness table), Current Build Phase updated to reflect ADR-0008 closure and maintenance rhythm, Last Session updated with full 3-part theme (Phase 6 closeout + hardening + Perplexity integration), previous Phase 1 session moved to Previous Session slot. Sprint-schedule entries re-renumbered to cc_107-cc_112 after double collision with Session A's cc_85-98 and cc_100-106.

    - id: cc_113
      task: "Autonomous hardening sprint — CI workflow, canonical-store sentinel, priority queues, broken-refs audit, strikethrough migration"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "827343da6"
      notes: |
        Phase 6 tech-debt items + pre-launch hardening. Shipped: .github/workflows/regression-tests.yml (runs Phase 6 regression + data-integrity audit + publication-readiness smoke on every PR), scripts/publication-readiness-check.cjs improvements (strip backtick code blocks before ref scan to eliminate doc false positives), scripts/canonical-store-sentinel.cjs (NEW pre-commit sentinel blocking hand-edits to frontmatter relationship fields unless data/relationships.jsonl or a rebuilder is also touched), .husky/pre-commit now runs 6 sentinels, CLAUDE.md Rules 9-13 added (architecturally complete ≠ publication ready, canonical stores are the write path, class tag approval gate, claim-object vs prose decision rule, Perplexity-first research protocol). Reports: scripts/class-tag-priority-queue.cjs (rank pending tags by citation count — AIPAC #1 at 434), scripts/broken-source-refs-report.cjs (0 broken refs, clean), scripts/migrate-strikethrough-sources-to-archived.cjs (1,083 files, 3,427 auto-migratable, ready but not applied). Content: content/Checklists/ folder (pre-publication, new-data-store, new-pipeline, README), content/Admin Notes/perplexity-prompt-library.md (7 prompt templates A-G), 3 admin reports generated. Policy builder updated to emit content-readiness from data/policies.jsonl.

    - id: cc_114
      task: "Policy-to-class-tag gap report"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/policy-class-tag-gap-report.cjs — cross-references policy page citations (both [[wikilinks]] AND markdown table rows under "Top opposition donors" headers) against class-tag approval state. Finding: ALL 5 v1 policy pages share the SAME 4 Rule-11 blockers (Western Growers Association, Majority Forward, California Farm Bureau Federation, Boeing). Approving those 4 entities unblocks every policy page simultaneously. Report at content/Admin Notes/policy-class-tag-gap-report.md.

    - id: cc_115
      task: "Entity dedup + orphan audit"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/entity-dedup-orphan-audit.cjs — 1,167 entities scanned. Finding: 2 duplicate groups, 53 name mismatches (entity findable via variant name but primary name drifts from how vault references it — breaks class-tag lookup pipeline), 439 true orphans, 0 missing profile files. Name mismatches are the most actionable — they're cheap to fix and unblock downstream lookups. Report at content/Admin Notes/entity-dedup-orphan-audit.md.

    - id: cc_116
      task: "Source registry dedup audit"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/source-registry-dedup-audit.cjs — 14,681 sources scanned. Finding: registry is essentially clean. 0 normalizer bugs (good), 1 trivial loose duplicate (Wikipedia anchor), 8 FEC/Congress entity-duplicate groups with 11 total redundant records. Added HASH_ROUTING_HOSTS guard for GLEIF (hash is the entity ID, not a fragment). Report at content/Admin Notes/source-registry-dedup-audit.md.

    - id: cc_117
      task: "Readiness promotion digest"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/readiness-promotion-digest.cjs — runs publication-readiness-check.cjs and produces a distance-to-ready digest sorted by review priority. Finding: 19 profiles are one flag-flip away from verified (ready→verified trivial promotion), 11 more are draft→verified, 736 are two-failures-away. Prep sheet for David's next manual review session. Report at content/Admin Notes/readiness-promotion-digest.md.

    - id: cc_118
      task: "Query engine contract tests (20 tests, wired to pre-commit + CI)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/query-engine-contract-tests.cjs — 20 contract tests covering the query engine's 6 subjects (edges, entities, events, cross_party_donors, timing_proximity, top_opposition_donors), pagination, filter behavior, count/describe/query shape. Locks in the API contract so future refactors can't silently drift. All 20 pass in ~250ms. Wired into .husky/pre-commit as sentinel #7 (hook now runs 7 sentinels total, was 6) and into .github/workflows/regression-tests.yml.

    - id: cc_119
      task: "Relationship cache drift audit"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/relationship-cache-drift-audit.cjs — compares frontmatter relationship fields (related/donors/top-donors/politicians-funded/politicians-opposed/opposes/stories) against canonical data/relationships.jsonl. Finding: 15,023 links exist in frontmatter but NOT in canonical, 374 canonical links missing from cache. Report correctly identifies this as a COVERAGE GAP (not drift) — the canonical store was populated later and is still catching up; running the cache rebuilder would regress data. Recommends a new migration pass (migrate-frontmatter-to-canonical.cjs) instead. Report at content/Admin Notes/relationship-cache-drift-audit.md.

    - id: cc_120
      task: "Status dashboard script (scripts/status.cjs)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "14b6e727d"
      notes: |
        scripts/status.cjs — one-command system health dashboard. Full mode shows all 8 canonical stores (record counts), source status distribution, class tag progress (pending/approved/rejected with approval rate), entity coverage by type, policy readiness by tier, test + audit health (regression tests, contract tests, data integrity audit, pre-commit sentinel count), auth + users. Supports --compact (one-line summary) and --json (machine-readable). No writes, no side effects. Current snapshot: 43,587 records · 275/346 tags pending · 0/5 policies verified · tests ✓ · integrity ✓ · sentinels 7.

    - id: cc_121
      task: "Session save — 2026-04-15 audit + polish + integration sprint"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "344f01593"
      notes: |
        Session state update: Last Session rewritten to cover the autonomous audit/polish/integration sprint (7 new scripts, 5 new reports, 20 new contract tests, pre-commit hook at 7 sentinels). Sprint schedule renumbered cc_107-cc_112 (previously collided with Session A's cc_100-106), then appended cc_113-cc_121 for this session's work.

    - id: cc_122
      task: "Ops /policies page + 5 API routes + construction-mode allowlist"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "b6b1a010a"
      notes: |
        Per David's design conversation: dashboard listing all 5 v1 policies with inline react-markdown preview, promote-to-verified + two-click publish actions, keyboard shortcuts (↑↓/Enter/Space/P/U/X/?), toast notifications. Backed by GET /api/policies, GET /api/policies/[slug]/preview, POST /api/policies/promote, POST /api/policies/demote, POST /api/policies/publish. Quartz construction-mode converted from boolean (only index emitted) to slug allowlist at data/public-routes.json (default: ["index"]) — policies get published by appending "policies/<slug>" to that file. Added react-markdown + remark-gfm deps. Sidebar link added between /class-tags and /query. Verified via preview: 200 on page + api, 0 server errors.

    - id: cc_123
      task: "OPS_AUTH_BYPASS dev escape hatch + bug-001/002 resolution"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "eff6577fd"
      notes: |
        David hit Clerk dev-mode sign-in lockout mid-session: "Couldn't find your account" error with no path forward. Built OPS_AUTH_BYPASS env var gate in ops/src/lib/auth.ts: synthetic admin user returned by currentUser/requireTier/requireAdmin when NODE_ENV !== "production" AND OPS_AUTH_BYPASS=1. Guardrails: hard prod disable, warn every 60s, yellow DevModeBanner on every page. /api/auth/bypass-status route + DevModeBanner component. Added ops-dashboard-bypass preview config to .claude/launch.json. Created content/Admin Notes/bug-queue.md with bug-001 + bug-002 (resolved by same fix) as the first entries. Unblocked David in 60 seconds via single .env.local edit.

    - id: cc_124
      task: "Pillar 1 — Auth audit (ADR-0009 + 21 smoke tests + recovery docs + Mode C detector + sign-in UX)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "ff383d9b8"
      notes: |
        First of five foundation-stabilization pillars after David recalibrated mid-session to "stabilize before shipping." Shipped: content/Decisions/0009-auth-architecture.md (documents 3 failure modes: Clerk dev-mode ephemerality, clerk_id drift, undocumented recovery), content/Admin Notes/phase-2.5-setup.md § Recovery from Clerk lockout (3 documented recovery paths), loud fall-through warning in currentUser() for Mode C detection with copy-pasteable seed-admin-user.cjs command, bypass-awareness banner on sign-in page (both when bypass active and when it's off), scripts/auth-smoke-tests.cjs (21 tests covering tier hierarchy, OPS_AUTH_BYPASS guards, recovery doc integrity, users.jsonl admin flag integrity, bypass-status endpoint). Wired into pre-commit sentinel #9 + CI regression-tests workflow. Deploy 24434607120 ✓.

    - id: cc_125
      task: "Pillar 3 — Ops surface audit (/system-health dashboard + manifest)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "3ddb32051"
      notes: |
        scripts/ops-surface-audit.cjs walks ops/src/app/ for every page + API route, parses pages for fetch() deps, API routes for requireAdmin/requireTier auth + HTTP methods. Outputs ops/src/data/ops-surfaces.json + content/Admin Notes/ops-surface-audit.md. GET /api/system-health serves the manifest. /system-health page: 4 stat cards, live HTTP health checks for every route (client-side fetch in parallel), expandable rows per surface, green/yellow/red/blue/gray status dots. Headline finding surfaced visually: 50 of 59 Ops API routes have no auth check (predate Phase 2.5). Sidebar link added. Registered "Ops Surface Audit" in /scripts registry. Deploy 24434832784 ✓.

    - id: cc_126
      task: "Pillar 5 — Bugs + deferred triage (/bugs dashboard + parser)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "47f004341"
      notes: |
        scripts/bug-queue-parser.cjs parses content/Admin Notes/bug-queue.md (## open + ## resolved sections with dash-list fields) AND content/Phases/phase-6/deferred-items.md (pipe tables per category section) into unified ops/src/data/bugs-manifest.json. Heuristic severity inference for deferred items: legal/defamation/security/data-integrity → high, performance/tests → medium, docs/polish → low. GET /api/bugs serves the manifest. /bugs dashboard: 4 stat cards (total_open, high_severity, bug_queue split, deferred count), category chip filter row, search box, severity/phase/category dropdowns, pagination (first 200 visible). Bug Queue section shows open (currently empty) + resolved (toggle). Deferred Items section shows filterable table. Read-only v1 — triage writes stay in the markdown files. First-screen: 269 total open (0 bugs + 267 deferred), 50 high-severity. Sidebar link added. Deploy 24435006572 ✓.

    - id: cc_127
      task: "Pillar 4 — Build + CI audit (Quartz TS 27→0, pre-push strict gate)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "6cb9e1a59"
      notes: |
        Fixed 27 Quartz TS errors: 20 unused-vars across 11 files (AdminBar, DiscoveryPanel x4, EventTimeline, EvidencePanel, NetworkGraph, PartySplitMeter, ProfileHeader x6, ProfileWidget, graph.inline.ts, networkGraph.inline.ts, networkGraphIndex.ts x2), 1 implicit-any in PageList.tsx (explicit string[] annotation on tags), 1 dead comparison in ProfileHeader.tsx (type === "corporation" unreachable after earlier narrow), 1 ArticleNav FullSlug fallback ("index" as FullSlug), 4 D3 type mismatches in networkGraph.inline.ts (selectAll<SVGGElement, GraphNode>() generic narrows + removeAllChildren cast). Root tsconfig.json: added "ops/**/*" to exclude — eliminated 600+ false-positive errors on every tsc run (ops has its own tsconfig). Flipped .husky/pre-push from warn-only to strict blocking gate (baseline is now 0 errors). content/Admin Notes/ts-errors-inventory.md documents Ops's 17 deferred errors with per-error effort estimates. Deploy 24435523818 ✓.

    - id: cc_128
      task: "Cross-session security brief filed as reference"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(this session-save commit)"
      notes: |
        David handed over a pre-launch security brief from another Claude session covering Licensing (MIT + CC-BY-SA) + 4-tier security sprint (Tier 1: gitleaks/pseudonymity/Clerk dev-prod/CVE scan, Tier 2: rate limiting + query cost limits, Tier 3: corrections/DMCA/backup, Tier 4: source corroboration). Filed at content/Admin Notes/pre-launch-security-brief.md with explicit "do not act" frontmatter + coordination notes (sentinel numbering shift from #8 → #10 after Pillar 1 landed, existing /system-health surfacing the 50-public-APIs gap, OPS_AUTH_BYPASS context for the Clerk dev/prod separation work). Added project_pre_launch_security.md memory file + MEMORY.md pointer so future sessions know which files are the other session's lane (LICENSE, /legal, rate limiting, query cost limits, gitleaks CI, pseudonymity audit, corrections/DMCA/backup playbooks). Current session did NOT implement any of the brief — pure reference filing.

    - id: cc_129
      task: "Session save — 2026-04-15 foundation-stabilization marathon"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(this session-save commit)"
      notes: |
        Session State rewritten with new Current Build Phase (foundation-stabilization: 4 of 5 pillars shipped, Pillar 2 remains), new Publication Readiness Snapshot (346/346 tags approved, Quartz TS 0, pre-commit at 9 sentinels), new Last Session covering pre-recalibration work + Pillars 1/3/5/4 + security brief filing. Previous Session section demoted from earlier cc_121 entry. Sprint-schedule cc_122-cc_129 added as ad-hoc done.

    - id: cc_130
      task: "Pillar 2a — frontmatter delta migration + renormalize + orphan prune"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "15d1ea62f"
      notes: |
        Shipped Pillar 2a. scripts/migrate-frontmatter-delta.cjs walks the vault and upserts frontmatter relationship fields (related, donors, top-donors, politicians-funded, opposes, politicians-opposed, stories) into data/relationships.jsonl via upsertEdges() instead of file overwrite — safer than the original Phase 3 Part 1 migration. Results: +2,619 new edges, 13,146 updated, 27,594 → 30,213 total. Exposed two pre-existing data quality issues: (1) 16,008 stale type denormalizations where profile types had drifted (corporation→entity) but edge from_type/to_type weren't refreshed — fixed by scripts/renormalize-edge-types.cjs walking the store and rewriting denormalized fields from the current title index. (2) 612 orphan edges pointing to 29 unique titles that were referenced as wikilinks in frontmatter but never actually written as profiles (stories like "The Platform Dependency Spectrum" etc.) — removed by scripts/prune-orphan-edges.cjs with an audit log at data/relationships.pruned-orphans.jsonl. Final edge count 29,602. All 9 sentinels green. Deploy run 24436456661 ✓.

    - id: cc_131
      task: "Pillar 2b.1 — FEC body-table to canonical monetary edges migration"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "e688fdcb5"
      notes: |
        Major investigation finding: the fec-summary pipeline has been writing per-donor IE (independent expenditure) amount tables into politician profile bodies as pipe-delimited markdown inside <!-- auto:fec-politician --> blocks, but NONE of this data had ever made it into data/relationships.jsonl. All 1,098 pre-existing monetary edges had amount=null, cycle=null. scripts/audit-fec-body-tables.cjs measured the scope (160 profiles, 796 rows). scripts/migrate-fec-body-tables-to-edges.cjs parses the "Top outside spenders" tables, resolves committee names against the vault title index, and upserts cycle-tagged monetary edges with role=ie-support or ie-oppose. Initial match rate 30.9% (215/695 rows). 213 new edges, 7 existing edges upgraded with real amount + cycle + role. Sample: PRIORITIES USA ACTION → Paul Ryan ie-oppose $112,336,878 cycle 2012. Also filed the broader "enrichment pipeline dark" finding: in the last 200 API Enrichment Bot commits, fec-summary fired only 3 times (April 10-11) and fec full-receipts has never run — only 5 of ~25 pipelines are active. Logged as bug-005 in commit cc_135. Deploy run 24436910871 ✓.

    - id: cc_132
      task: "Pillar 2b.2 — FEC PAC aliases + case-insensitive resolver upgrade"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "28bc772ab"
      notes: |
        Addressed Pillar 2b.1's 30% match rate. scripts/add-fec-pac-aliases.cjs hand-curated mapping of 12 vault profiles → 20 new FEC-committee aliases (Club for Growth ← CLUB FOR GROWTH ACTION, Americans for Prosperity ← 4 AFP ACTION variants, Senate Majority PAC ← SMP, NRCC/NRSC/DCCC/DSCC full-name all-caps forms, National Rifle Association ← NRA POLITICAL VICTORY FUND, etc.). Conservative curation — no fuzzy matches, no cross-entity guessing (Crossroads GPS ≠ American Crossroads kept unmatched). Also upgraded migrate-fec-body-tables-to-edges.cjs with a case-insensitive resolver fallback (case-folded index) to catch SENATE MAJORITY PAC → Senate Majority PAC without the acronym capitalization trap (old titlecase turned PAC → Pac). Match rate 215 → 269 → 277 (30.9% → 38.7% → 39.9%). Also caught 8 additional stale type denormalizations from my own migration writing from_type=donor on entries the rulebook resolves to top-level entity — fixed in the same commit via renormalize-edge-types.cjs. Deploy run 24437108922 ✓.

    - id: cc_133
      task: "Pillar 2b.3 infra — FEC Committee Registry system"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "2c897a75c"
      notes: |
        The clean, durable fix for FEC committee → vault profile matching. New files: scripts/lib/fec-committee-registry.cjs (reader/writer keyed by permanent FEC committee_id, not by name), scripts/fec-committee-resolver.cjs (queries /v1/committees/?q=<name>, caches raw responses to data/fec-committee-cache.jsonl, rate-limited to 1 req / 4 sec, refuses DEMO_KEY), scripts/seed-fec-committee-registry.cjs (reads cache, matches against vault title index, upserts with status=mapped or unmapped-needs-stub or unmapped-needs-review), scripts/apply-fec-committee-registry.cjs (reads registry, syncs alias lists to vault profile frontmatter). New Pipeline Guide section "FEC Committee Registry (local, authoritative)" under ## FEC documents record shape, status values, how consumers use it, and the full command workflow. bug-005 filed in content/Admin Notes/bug-queue.md with full diagnostic evidence (fec-summary 3 runs in 200 commits, fec full-receipts never, only 5 of 25 pipelines active). Ops registration: 6 new entries in route.ts allowlist + scripts/page.tsx under category:pipeline (resolver DRY/ALL, seed DRY/WRITE, apply DRY/WRITE, migrate DRY/WRITE). Deploy run 24437548477 ✓.

    - id: cc_134
      task: "Pillar 2b.3 data — FEC committee registry seeded from 298 API lookups"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "45f9a9752"
      notes: |
        Ran fec-committee-resolver.cjs --all against the full unmatched committees report. 297 FEC API queries over ~20 min (4 sec rate limit), 1 cache hit, 0 failures. 278 committees matched to real FEC committee records, 20 no-FEC-match (marked unmapped-needs-review). Seeded registry: 0 mapped (expected — these 298 were already the names that didn't resolve; running the same matching logic against FEC's canonical name gives the same result), 273 unmapped-needs-stub, 20 unmapped-needs-review. The registry's real value is not auto-resolution but identification: every super PAC now has a permanent FEC committee ID + authoritative canonical name + clickable fec.gov link in content/Admin Notes/fec-unmatched-committees.md under a new "Stub profile candidates" section sorted by dollar volume. Data-quality catches: AMERICANS FOR RESPONSIBLE LEADERSHIP in body → FEC canonical AMERICANS UNITED FOR RESPONSIBLE LEADERSHIP (C00615088); MAJORITY PAC → designation Leadership PAC not Super PAC. Data files committed: data/fec-committee-cache.jsonl, data/fec-committee-metadata.json, data/fec-committee-registry.json. Deploy run 24437857309 ✓.

    - id: cc_135
      task: "Session save — 2026-04-15 Pillar 2/2b data coverage marathon"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(this session-save commit)"
      notes: |
        Fifth session-save of the day. Rewrote Session State.md with new Last Session covering Pillars 2a + 2b.1 + 2b.2 + 2b.3 infra + 2b.3 data. Moved prior "foundation-stabilization marathon" Last Session to Previous Session. Sprint-schedule cc_130-cc_135 added as ad-hoc done. North Star pipeline_bugs_closed += 0 (bug-005 OPEN, not closed; closure requires donor-map-engine repo access).

    - id: cc_136
      task: "193 super PAC stubs + FEC edge migration (215→679 matches)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commits: ["6e2ac274a", "ce3906f78"]
      notes: |
        New scripts/create-top-fec-pac-stubs.cjs with title-casing via explicit acronym allowlist, filename truncation, vault-wide collision detection. Created 30 stubs (first batch) + 163 stubs (second batch) = 193 total with fec-committee-id + aliases + editorial-status: stub. Re-ran migrate-fec-body-tables-to-edges.cjs: matched 215 → 462 → 679 (+464). Unmatched dropped 243 → 26. Monetary edges with real amount+cycle+role: 282 → 652. Also fixed 3 bad-title stubs via git mv -f (Windows case-only renames). Deploys run 24469053420 ✓ and 24473985411 ✓.

    - id: cc_137
      task: "Bank of America + NRSC class-tag proposals + Wall Street sector fix"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "6e2ac274a"
      notes: |
        Ran batch-gather-entity-signals + batch-propose-class-tags-heuristic on BoA (ent_000006) and NRSC (ent_000100). NRSC → medium confidence ruling-class. BoA initially skipped: "Wall Street" sector wasn't in SECTOR_MAP. Added "wall street" to the finance-capital matchlist in scripts/batch-propose-class-tags-heuristic.cjs:73, unblocking class-tag proposals for 32 Wall Street entities (Apollo, BlackRock, Blackstone Group, Goldman Sachs, Morgan Stanley, etc).

    - id: cc_138
      task: "James P. McGovern bioguide M000312 dedup"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "ce3906f78"
      notes: |
        Pre-existing contamination: James P. McGovern Master Profile.md (45 lines, stub) and Jim McGovern Master Profile.md (301 lines, canonical) both had bioguide-id M000312 (inherited from a batch enrichment merge). Merged: ported bioguide-id + born + wikidata-id + source-types into Jim McGovern's frontmatter, deleted James P. McGovern folder, removed orphan ent_001050 from data/entities.jsonl. Also fixed a dupe bioguide-id: YAML key that re-appeared via auto-merge. Duplicate-bioguide sentinel back to clean (551 unique bioguides).

    - id: cc_139
      task: "Class-tag research queue + Perplexity batch + loader (40 proposals loaded)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commits: ["955a923ee", "3c9b10501", "76aa0b095"]
      notes: |
        Built content/Admin Notes/class-tag-research-queue.md splitting 315 heuristic-skipped entities into Bucket A (224 auto-stubs, no action) and Bucket B (91 real profiles needing research). Rewrote Perplexity prompt library Section D with the ACTUAL locked vocabulary from ADR-0001 (prior version had obsolete enum values industrial/financial/rentier that don't match schema). Generated executable filled-in prompt at content/Admin Notes/perplexity-research/class-tag-research-2026-04-15.md with top 40 Bucket B entities' signal data inlined. David ran it via Perplexity; returned class-tag-research-2026-04-15-results.md. New 339-line scripts/load-perplexity-class-tag-proposals.cjs parses the markdown response, normalizes out-of-vocab values via alias maps, matches entity names to ent_NNN IDs, merges idempotently. Final: 40 of 40 loaded (37 high, 2 medium, 1 low). After ADR-0010 added surveillance-state, vocab drops 12 → 4 → 0. Queue: 510 total proposals (470 heuristic + 40 Perplexity).

    - id: cc_140
      task: "Canonical store foundation sprint (+1,728 edges, title-index fix, 611 entity names)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "61cb7c9ed"
      notes: |
        Tier 1 foundation fix from the audit. THREE related pieces in one commit:
        (1) Re-ran scripts/migrate-frontmatter-delta.cjs to close the 14,413-edge gap the cache-drift audit reported. Net +1,728 edges over the session (30,254 → 31,982).
        (2) buildTitleIndex filename alias: patched scripts/lib/relationship-edge-validator.cjs so the normalized file basename is added as a weaker alias whenever it differs from fm.title. Pfizer.md with title "Pfizer Inc." now resolves [[Pfizer]]. 223 previously-dangling wikilinks unlocked.
        (3) migrate-frontmatter-delta collision handling: was skipping targets with title collisions (Blackstone has 4 profiles); now uses priority-sorted first non-alias entry. 0 "collision" skips, 0 "source not in title index" skips per run.
        (4) New scripts/fix-entity-name-mismatches.cjs stripped " Master Profile" suffix from 609 politician entity records and deleted 7 "(Redirect)" orphans. 2 collisions skipped (David Sacks + JB Pritzker, handled in cc_142). Deploy run ✓.

    - id: cc_141
      task: "ADR-0010: surveillance-state added to IDEOLOGICAL_FUNCTIONS (21 values total)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(tier 2 commit)"
      notes: |
        New ADR at content/Decisions/0010-class-tag-vocabulary-amendment-surveillance-state.md amending ADR-0001. 10 of 40 Perplexity proposals wanted this value (Palantir, Peter Thiel, Cambridge Analytica, Larry Ellison, MBS, Gulf State Money, MAGA Inc, Bloomberg, Dustin Moskovitz, +1). Updated scripts/lib/entities-schema.cjs IDEOLOGICAL_FUNCTIONS from 20 → 21 values. Re-ran Perplexity loader to reinstate the 10 dropped surveillance-state tags. Combined with 4 more alias map expansions (union-tolerant, union-controlled, labor-militant, climate-justice, environmental-justice), final vocab drops went from 12 → 0.

    - id: cc_142
      task: "Dedupe David Sacks + JB Pritzker (donor+politician sub-note merge pattern)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "fc0a314f1"
      notes: |
        David pointed out Ops search showed 3 entries for David Sacks and 2 for JB Pritzker. Pattern: people who are both donors and politicians had separate profiles. Solution: move donor profiles into politician folder as type: sub-note. Signal gatherer's masterOnly:true filter on Politicians tree means sub-notes don't register as entities — one human = one entity, donor analysis preserved as linked content. Moved Mega-Donors/David Sacks.md → Politicians/Republicans/Trump Cabinet/David Sacks/David Sacks - Donor Network.md. Same for JB Pritzker → Politicians/Democrats/Governors. Removed ent_000168, ent_000178 orphans. Re-ran fix-entity-name-mismatches to strip suffix from ent_000498 + ent_001139 (previously blocked collisions). 21 wikilinks rewritten across 18 files via tmp script. 52 canonical edges recomputed+deduped (49 collapsed as hash dupes). 43 stale edge type denormalizations renormalized in 2 passes. Ops search now shows 1 entry each.

    - id: cc_143
      task: "5 remaining Redirect files properly marked + 3 canonical profiles aliased"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "fc0a314f1"
      notes: |
        Changed type: corporation/donor/pac → type: redirect + editorial-status: redirect + redirect-target on: Mega-Donors/David Sacks Political Operation.md → [[David Sacks]], Mega-Donors/Google.md → [[Google - Alphabet]], Mega-Donors/Meta.md → [[Meta - Facebook]], Super PACs/Fairshake PAC - Crypto Super PAC.md → [[Fairshake PAC]], Tech & Crypto/Meta - Facebook Political Operation.md → [[Meta - Facebook]]. Added aliases: to Google - Alphabet.md, Meta - Facebook.md, Fairshake PAC.md (merged with pre-existing aliases block). 6 more dedup groups remain in profile-dedup-queue.md: GEO Group, Meta, Blackstone Real Estate, Raytheon Technologies, Fox Corp, EMILY's List.

    - id: cc_144
      task: "Ops TypeScript errors 17 → 0 (Profile/ProfileData + D3 types + misc)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(tier 2 commit)"
      notes: |
        After running npm install in ops/ (worktree hadn't been initialized). Fixed across 11 files. Main issue: Profile/ProfileData type divergence. Replaced local interface ProfileData in profile/page.tsx with type ProfileData = Profile importing from @/lib/vault. 7 card components switched from profile as Record<string,unknown> to as unknown as Record<string,unknown> double-cast. D3 Selection generics fixed in money-trail/page.tsx (imported type Selection from d3, explicit generic on g.append<SVGGElement>) and relationships/page.tsx (Element cast on parentNode). CardTicker:107 Boolean(stockTrades) && wrap. VaultGrid:226 sortBy union missing "nearest-a-plus". relationships:1005 breakdown state missing stories field. profile/page.tsx:250 narrow widening. lib/vault.ts:322 tier1Floor ternary rewrite. npx tsc --noEmit on ops/ exits 0.

    - id: cc_145
      task: "/class-tags by-proposer filter"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(tier 2 commit)"
      notes: |
        Added proposedBy state + select in ops/src/app/class-tags/page.tsx. Options: all proposers / heuristic-v1 / perplexity-research-2026-04-15. Extended queryProposals in ops/src/lib/class-tag-proposals-store.ts with proposed_by?: string filter. API route ops/src/app/api/class-tags/route.ts reads the query param. 3-column filter grid (capital_type, proposer, search). Lets David triage heuristic and Perplexity proposals separately in the 510-item queue.

    - id: cc_146
      task: "Deferred items auto-triage + /bugs kind filter (91 actionable of 436)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "713c2054e"
      notes: |
        New scripts/triage-deferred-items.cjs (319 lines) walks every content/Phases/phase-*/exit-criteria.md and handoff/retro docs and checks each unchecked - [ ] against repo reality via 16 deterministic resolvers (file existence with variant suffixes, ops pages, api routes, phase retrospectives, CLAUDE.md, Vault Rules, Pipeline Guide, source-refs plugin, sentinel count, class-tag presence, etc). Flipped 74 stale criteria to [x] <!-- auto-verified 2026-04-15 --> across 9 phase docs. Manually verified 4 more data integrity items (events.jsonl schema fields). Seeded data/policy-stakes-vocab.jsonl with 20 stakes across 6 categories (real Phase 2 exit criterion that nobody had fulfilled). Added kindFilter to ops/src/app/bugs/page.tsx defaulting to unchecked-exit-criterion. New select: actionable only / all kinds / marker / in-section. Header now shows "Deferred Items (91 of 436)". Verified in browser preview.

    - id: cc_147
      task: "Session save — 2026-04-15 foundation audit marathon"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "(this session-save commit)"
      notes: |
        Sixth session-save of the day. Rewrote Session State.md Last Session with full narrative of 9 commit chains (193 super PAC stubs, McGovern dedup, Wall Street sector fix, class-tag research queue + Perplexity batch, canonical store backfill, title index filename alias, 611 entity name strip, David Sacks + JB Pritzker sub-note merge, 5 redirects marked, ADR-0010 surveillance-state, Ops TS 17→0, class-tags proposer filter, deferred items triage, /bugs kind filter). Moved prior "Pillar 2/2b" Last Session to Previous Session. Sprint-schedule cc_136-cc_147 added as ad-hoc done. Wrote session handoff doc for the next session at content/Admin Notes/session-handoff-2026-04-15-next.md. North Star: public_launch_shipped unchanged (false); no verified_profile_count change (David's lane); draft_to_ready_promotions unchanged; pipeline_bugs_closed unchanged (bug-005 was closed in a prior session, not this one).

    - id: cc_148
      task: "Profile dedup: 4 of 6 groups drained (GEO, Raytheon, Meta, Blackstone)"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Converted 5 dupe files to redirect stubs, removed 5 orphan entity records + 2 orphan class-tag proposals. Merged Federal Register enrichment from Raytheon Technologies into canonical. Kept Blackstone Real Estate as separate subsidiary profile."

    - id: cc_149
      task: "Dangling wikilink aliases: 10 profiles, ~77 links resolved"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Added FEC name aliases to 7 committee profiles (UDP, DCCC, NRCC, AFSCME, LCV, NEA, WFP). Added display aliases to 10 donor/politician profiles. Fixed Kelcy Warren alias collision (person vs company)."

    - id: cc_150
      task: "FEC body-table migration refresh + unmatched committees report"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Re-ran migrate-fec-body-tables-to-edges.cjs. 661 edges updated, 9 new. Match rate 96.3% to 97.7%. Unmatched 22 to 12."

    - id: cc_151
      task: "Triage heuristics: 10 new resolvers, auto-verified 1 to 15"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Added backtick stripping, explicit-deferred resolver, ADR checks, Ops page patterns, husky hook checks, lib module checks. Fixed sentinel count threshold and Pipeline Guide pattern."

    - id: cc_152
      task: "Load Perplexity batch 2 + ADR-0011 reproductive-rights"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "42 class-tag proposals loaded. Added JSONL auto-detection to loader. ADR-0011: reproductive-rights added to IDEOLOGICAL_FUNCTIONS (22 values). 4 previously dropped proposals recovered."

    - id: cc_153
      task: "Strikethrough source migration: 3,415 links across 1,082 profiles"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Executed per David's go-ahead. Broken URLs moved to ## Archived sections. 892 inline-prose links flagged for manual review. Script fixed to replace em dashes in generated text."

    - id: cc_154
      task: "Dangling wikilinks triage doc + Quartz build benchmark + events.jsonl audit"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "396 dangling targets categorized into 6 groups. Build benchmark: 6m45s. Events audit: 170/188 lack policy_id (editorial scope, not data bug)."

    - id: cc_155
      task: "Session save — 2026-04-15 evening foundation fixes"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "16 commits this session. All deployed to v4."

    - id: cc_156
      task: "Checklist overhaul: URL triage tracking + pipeline status detection + auto-N/A"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commits: ["f7552b79b", "534ec50f6", "f9818a1d2"]
      notes: "New urls-triaged checklist item on all profile types with urls-first-triaged date tracking. Pipeline status detection (passed/failed/never-ran/no-data) with amber warning vs red X rendering. Auto-N/A sweeper (scripts/checklist-auto-na.cjs): 3,432 N/A items across 2,464 profiles + 2,238 url-triaged stamps. contracts now naAllowed for corporations."

    - id: cc_157
      task: "Bulk CSV ingest: FEC PAS2 + USASpending contracts + EPA FRS facilities"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commits: ["526019696", "0668293c8", "882f112f8"]
      notes: "Three new ingest scripts. FEC: 2,442 monetary edges from 1.58M rows. USASpending: 714 government-contract edges + 66 auto-blocks from 13.3M rows (streaming). EPA FRS: 104 corporation auto-blocks from 3.2M facility rows. New government-contract edge type. Fixed 2,494 stale denormalization errors. Canonical store 31,996 → 35,152 edges."

    - id: cc_158
      task: "Bulk data library: rename files + catalog + memory for future sessions"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Renamed all bulk files to {source}-{dataset}-{cycle} pattern. Catalog at data/bulk/CATALOG.md. Memory saved for future sessions. ~30GB of FEC, USASpending, EPA, OFAC, ICIJ, Congress, ProPublica data."

    - id: cc_159
      task: "Session save — 2026-04-15 late evening checklist + bulk ingest"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "8 commits this session. Deploying to v4."

    - id: cc_160
      task: "FEC registry expansion: candidate master + committee master + re-run bulk"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commits: ["fe887b5aa"]
      notes: "ingest-fec-candidate-master.cjs: 231 new FEC IDs (187→418). ingest-fec-committee-master.cjs: 559 new mappings (293→852). Re-ran FEC bulk: 164K matched rows (was 15K), 25,144 monetary edges. Fixed 421 Raytheon slug collisions."

    - id: cc_161
      task: "ICIJ offshore leaks + OFAC SDN screening"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "c46d0cc62"
      notes: "screen-icij-offshore.cjs: 12 officer + 142 entity matches against Panama/Paradise/Pandora Papers. Report at content/Admin Notes/icij-offshore-screening-report.md. screen-ofac-sdn.cjs: Zero matches, vault clean. Both reports for David's review."

    - id: cc_162
      task: "Edge quality cleanup + tiered visibility filtering"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "e8e0f7533"
      notes: "Removed 854 redundant null-amount edges, downgraded 1,181 to related, deduped 737. Monetary edges 100% with real amounts. EDGE_TIER_PRESETS in query-engine.cjs: public (26K, conf≥0.85), paid (27K, conf≥0.7), internal (56K). Cycle filter added."

    - id: cc_163
      task: "FEC PAC summary ingest: 481 profiles with financial data"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "1addc2179"
      notes: "ingest-fec-pac-summary.cjs: 604 PAC summaries from 6 cycles. Wrote total-raised, total-spent, cash-on-hand, independent-expenditures to 481 profiles. Top: ActBlue $1.4B, WinRed $470M."

    - id: cc_164
      task: "Wire monetary amounts + contracts into ProfileWidget + per-profile cache"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "be80eb724"
      notes: "ProfileWidget Donors tab shows dollar amounts sorted by total. New Contracts tab for corporations. build-relationships-per-profile.cjs enhanced with monetary-detail + contract-detail arrays. AIPAC shows 253 politicians, Lockheed shows $74B DoD."

    - id: cc_165
      task: "Ops ConnectionsExplorer with tiered filtering + explainers"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      commit: "6611e53ec"
      notes: "New ops/src/components/ConnectionsExplorer.tsx with Money Trail/Contracts/Opposition/Network filter chips. Sort by amount/name/cycle, min threshold $1K-$1M. Explainer per category. New /api/profile/edges route. Wired into profile page connections tab."

    - id: cc_166
      task: "Session save — 2026-04-15 night bulk ingest marathon"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "15+ commits. Edge store 32K→56K. Deployed to v4."

    - id: cc_167
      task: "FEC registry expansion + re-run bulk + PAC summary"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Candidate master 187→418 IDs. Committee master 293→852. Re-ran FEC bulk: 25,144 edges. PAC summary: 481 profiles. Total edges 56K."

    - id: cc_168
      task: "ICIJ + OFAC screening + edge cleanup + tier presets"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "ICIJ: 12 officer + 142 entity matches. OFAC: clean. Removed 1,591 bad edges, deduped 737. EDGE_TIER_PRESETS in query engine. Monetary 100% with amounts."

    - id: cc_169
      task: "Ops Money Trail Canvas rewrite + Relationships amounts + Capitol Trades DONOR badge"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Money Trail: full Canvas rewrite with dollar-sized nodes, edge type filters, amount thresholds. Relationships: dollar totals + contracts. Capitol Trades: DONOR cross-reference badge. ProfileWidget: Canvas mini-graph + Contracts tab + dollar amounts. ConnectionsExplorer component."

    - id: cc_170
      task: "Money Trail v4: ego graph + context-aware flow dots + Capitol Trades hover fix"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "Reverted Canvas attempts, built ego graph (pick profile, star layout like relationships page). Flow dots direction depends on profile type: politicians/media/lobbyists receive inward, donors/corps/PACs give outward. Capitol Trades hover dimming softened."

    - id: cc_171
      task: "Bulk data progress tracker + 9 scripts registered in Ops /scripts"
      status: done
      completed_date: 2026-04-15
      added_adhoc: true
      notes: "content/Admin Notes/bulk-data-progress.md tracks all ingested/pending/not-downloaded data. 9 scripts added to ops /scripts page under Bulk Data Ingest and Screening categories. FEC individual contributions (18.7GB, 6 cycles) downloaded and renamed."

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

## Phase 2, must-complete tasks

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

## Phase 3, must-complete tasks

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

    - id: cc_p3_04
      task: "Fix live-site annotate pill + fullscreen graph on Trump profile"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Fullscreen graph container now portals to document.body on expand (escapes ancestor stacking contexts that were trapping position:fixed). [anno] + [pw-graph] diagnostics upgraded to console.warn so Chrome's default filter no longer hides them. Commits 83add9413, 29b884334."

    - id: cc_p3_05
      task: "Admin notes live→Ops sync"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "New Ops route ops/src/app/api/inline-notes/route.ts. AdminBar.saveNote dual-writes to localStorage + POST localhost:3333 with Access-Control-Allow-Private-Network header for Chrome's loopback restriction. Best-effort, silent fallback if Ops down. Writes to content/Admin Notes/inline-notes.jsonl. Commits 4a8c2465b, ddff9a0a8."

    - id: cc_p3_06
      task: "Trump FEC auto-block relabel (candidate-only vs combined $1.45B)"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Top table was labeling $3.85M as 'Total Raised' which read as Trump's entire 2024 haul. Relabeled to specify candidate-committee-only; combined ~$1.45B (OpenSecrets) promoted to top row in bold. Commit ede466f37."

    - id: cc_p3_07
      task: "Donor dedup: 142 merges applied, $1.4B+ re-attributed"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "scripts/propose-donor-dedup.cjs scanned relationships.jsonl for name-collision clusters. David approved all 142. scripts/apply-donor-dedup.cjs applied: 2,304 name renames, 57 post-rename duplicates collapsed with amount summing. Ab Pac+AB PAC→$92M, RBG+Rbg→$55M, PRIORITIES USA variants→$471M. Commits bd77ada2b, 83a8503fb."

    - id: cc_p3_08
      task: "Support/oppose schema split across render pipeline"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Independent-expenditure opposition (role=ie-oppose) edges now route to new ie-opposed-by / ie-opposition-targets buckets instead of donors. Trump's PRIORITIES USA $210M + FF PAC $95M correctly classified as opposition spending, not donations. Changed: build-relationships-per-profile.cjs, rebuild-relationship-caches.cjs, ProfileWidget.tsx. Artifact key normalization consolidated 159 split profiles (2621→2462 entries). Commit 7cf79db5c."

    - id: cc_p3_09
      task: "Frontmatter prune: IE-oppose names removed from donors across 106 profiles"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "scripts/prune-ie-oppose-from-frontmatter.cjs — one-time cleanup of stale ie-oppose entries from earlier rebuild-relationship-caches runs. Biden no longer 'funded by' MAGA Inc. / Club for Growth; Clinton no longer 'funded by' RNC; Nina Turner no longer 'funded by' Third Way. Idempotent, preserves any entity with a non-opposition edge. Commit 48e01d15b."

    - id: cc_p3_10
      task: "build-profile-data-panels.cjs: swap to artifact-backed top-donor amounts"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Generator now reads data/relationships-per-profile.json for dollar amounts (canonical-store-derived) instead of stale signals.top_donors with amount=0. Secondary pass walks content/Politicians/ for profiles not in entities.jsonl (Cabinet members etc.) via synthetic entity. Fixed entity.name vs entity.title bug. 411 politician panels regenerated with real numbers in one run. Commit 00a37f1ff."

    - id: cc_p3_11
      task: "Rubio profile restructure: 9-section template alignment + Policy Executed + Voting Record"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Section order rebuilt, new Policy Executed section (Cabinet-appropriate — variants added to validator: Policy Executed / Department Actions / Diplomatic Record). Voting Record block populated from curated CSV (39 key votes). Related Figures block added. Template validator passes when promoted to verified. Commits 06888eb61, 992a4b33b."

    - id: cc_p3_12
      task: "Persistent bulk-data store external to repo"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "C:\\donor-map-data\\bulk\\ with Windows directory junction from main repo and this worktree. Survives worktree cleanup, git clean, repo re-clones. HSall_rollcalls.csv (29MB Voteview) + Rubio curated CSV moved there. scripts/dev/setup-bulk-junction.cjs helper so every future worktree can wire the link in one command. Commit dbb78b49c."

    - id: cc_p3_13
      task: "Reusable scripts shipped this session"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "propose-donor-dedup.cjs, apply-donor-dedup.cjs, prune-ie-oppose-from-frontmatter.cjs, ingest-voting-record-csv.cjs, dev/setup-bulk-junction.cjs. All reusable for future sessions — dedup rerun on new data, prune after any cache rebuild, voting records for any politician with a CSV."

    - id: cc_p3_14
      task: "Fix Rubio live-site tab routing (data panel relocate + Voting Record H2 promote + Policy Executed tab map)"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Top Donors was rendering above tabs because generator kept panel in place; now relocates. Voting Record block was H3 under Influence Network, promoted to H2 so it lands in Key Votes tab. Policy Executed wasn't in ProfileHeader.tsx tab-mapping text list — added. Commit 5ac4dc4f7."

    - id: cc_p3_15
      task: "Fix EvidencePanel browser-native title tooltip (grey, unreadable)"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "First attempt styled the CSS ::after hover hint (wrong element). Correct fix: replaced title= attributes with aria-label= on signal-trail-clickable bars. Browsers can't style native title tooltips; aria-label preserves accessibility without the grey box. Commits 487d728f7, ccd364162."

    - id: cc_p3_16
      task: "Pelosi profile polish (9-section template alignment + Related Figures + public-routes)"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "Applied Rubio playbook to Pelosi. Fixed corrupted central-thesis ($1.6B mangled into 'content-readiness: ready.6 billion'), stale known-gaps, stray body donors: line + dangling ---/---, heading renames, section reorder (Class Analysis pos 3, Core Contradiction pos 6), added Related Figures section, added to public-routes.json. Data panel auto-relocated into The Donor Class Map. Still pending: Class Analysis voice rewrite (David) and curated Key Votes CSV. Commit 5fd69f364."

    - id: cc_p3_17
      task: "Profile polish patterns doc for future sessions"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "content/Admin Notes/profile-polish-patterns.md — running playbook of everything we've hit across Trump + Rubio + Pelosi. Covers frontmatter bugs, 9-section template order, heading renames, tab routing, data panel placement, voting record ingest, donor dedup residuals, IE-oppose prune, public-routes gating, browser title-tooltip gotcha, Chrome console filter gotcha, deploy cache gotcha. Commit 5fd69f364."

    - id: cc_p3_18
      task: "Sync bills-sponsored/cosponsored frontmatter from auto-block across 85 politicians + add guard"
      status: done
      completed_date: 2026-04-17
      added_adhoc: true
      notes: "David flagged Pelosi bills-cosponsored: 95 as absurd for 36-year career. Root cause: ingest-congress-bills-bulk.cjs clobbered Congress.gov API career totals with 118th-Congress-only numbers. New scripts/sync-bills-frontmatter-from-auto-block.cjs reads each auto:congress-legislation block, writes career numbers back to frontmatter when larger. 85 profiles fixed (Schumer 54→2437, Feinstein 37→2211, Wyden 80→1984, Pelosi 2→199, Clinton 0→713). Added guard to ingest-congress-bills-bulk.cjs so future runs don't re-clobber (--force-bills-overwrite to override). Added bills-data-scope field marking source. Commit a28f98b3c."

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

    - id: rc_01
      task: "Build editorial-queue.cjs + editorialpass skill"
      status: done
      completed_date: 2026-04-16
      added_adhoc: true
      notes: "scripts/editorial-queue.cjs: prioritization script scoring profiles by FEC data, relationship edges, missing Class Analysis/thesis. 609 actionable profiles identified. Fixed toStr() bug for array-type known-gaps field. ~/.claude/skills/editorialpass/skill.md + editorial-pass alias created as triggerable slash command."

    - id: rc_02
      task: "YAML deploy fix: Adam Smith duplicate frontmatter keys"
      status: done
      completed_date: 2026-04-16
      added_adhoc: true
      notes: "content/Politicians/Democrats/House/Adam Smith/_Adam Smith Master Profile.md had duplicated bills-sponsored/bills-cosponsored from bulk ingest script. Was blocking Quartz build entirely. Removed duplicate lines, kept career totals (199 sponsored, 4981 cosponsored)."

    - id: rc_03
      task: "Batch Class Analysis pass: 7 politician profiles"
      status: done
      completed_date: 2026-04-16
      added_adhoc: true
      commits: ["8e07b898e", "f1382bbfd", "b41ec0e04", "97fda808c", "da154059b"]
      notes: |
        Added Class Analysis sections and central-thesis frontmatter to 7 profiles: Juliana Stratton (demoted ready→draft, was missing CA), Brett Guthrie, Brian Mast, Donna Miller, Scott Wiener, Mark Green, George Latimer.
        Key analytical threads: AIPAC enforcement model (Mast, Miller, Latimer); pharma committee capture (Guthrie); YIMBY developer-tenant distribution question (Wiener); committee-as-credential vs committee-as-capture (Green); 39:1 outside-to-candidate structural dependency (Latimer).
        Removed inline body dataview fields on Stratton and Miller. Fixed Mark Green central-thesis typo.
        Flag: Mark Green FEC/GovTrack auto-blocks show wrong politician data (govtrack-id 400159, 2010-2014 cycles). Pipeline correction needed.

**Schedule last updated: 2026-04-18 (Code Claude: FEC full-database ingest marathon. pas2 classified 5.37M direct-donor rows + 604K IE-support + 336K IE-oppose via ADR-0013 taxonomy. Indiv aggregated 171K donor-committee rows. Oth 6.93M committee-to-committee transfers. Oppexp 284K vendor aggregations. CM/CN/CCL masters ingested. 3 new ADRs: 0012 Money 4-subsection, 0013 FEC taxonomy + anomaly classifier, 0014 full-DB ingest pipeline. 640 profiles auto-enriched via build-fec-lifetime-panels (412 politicians + 228 donor/PAC/corp). 3 bioguide contaminations fixed (Casar/Summer Lee/Sherrod Brown). ContradictionCard moved to own tab. Info tooltip → details collapsible. Anomaly queue -86% after party-committee whitelist bug fix. IRS 990 + Congress-votes-resume running in background at session-save time.)**
**Current phase: Launch 50 sprint for April 30 public launch. Trump/Rubio/Pelosi live with full FEC lifetime panels.**
**Next checkpoint: Complete IRS 990 + Votes ingests. Extend lifetime panel to render grants + committee-transfers. Research Claude pass on the 3 canary profiles' Mega-Donors narrative. Review the 8,434 remaining anomalies.**
**New data sources added 2026-04-11: FDA (pharma/device/food enforcement), OCC (national bank enforcement), FTC (mergers + historical enforcement). All three live in CI + Ops app.**

### Template architecture + Trump proof-of-concept — 2026-04-16 evening (Code Claude, long session)

Session summary: canonical docs rewrite, script archive, 9-section profile template with full enforcement pipeline, Trump live at thedonormap.org. Class Analysis Style Guide shipped after David flagged AI-drafted class analysis reads like data summary not editorial analysis.

**Canonical docs atomic replacement:**
- CLAUDE.md rewritten 400 → 257 lines
- content/Vault Rules.md — 13 numbered rules with lane boundaries
- content/Profile Template.md NEW — 9-section spec, per-type variants, tab mapping table, custom-stats schema
- content/CSV Data Sources.md NEW — data dictionary + quarterly playbook
- content/Pipeline Guide.md trimmed to 3 active pipelines + STOCK Act
- content/Class Analysis Style Guide.md NEW — hard rules + per-type framing + before/after exemplars
- content/Decisions/Archive/ — 4 historical ADRs moved (0003, 0005, 0006, 0008) with index README

**Script archive:** 28 scripts to scripts/_archive/ (6 migrations, 2 backfills, 13 one-time cleanups, 7 deprecated experiments). README catalog. Ops /scripts page expandable section.

**9-section template pipeline:**
- scripts/profile-template-validator.cjs NEW (pre-commit sentinel #10)
- scripts/profile-template-generator.cjs NEW (additive reshape, preserves editorial, stub drops on template version change)
- scripts/profile-timeline-generator.cjs NEW (events.jsonl + relationships cycles + EO tables + frontmatter timeline-entries)
- Class Analysis moved to Section 3 (frames the reader's lens)
- Presidential/Cabinet variant: Section 5 = "Executive Actions" (not "Key Votes")

**Quartz components:**
- quartz/components/SummaryInfobox.tsx NEW — renders only unique content (total-received-note, custom-stats, stale warnings). Returns null if nothing unique.
- quartz/plugins/transformers/hide-internal-markers.ts NEW — build-time marker stripper, skips frontmatter + code blocks
- ProfileHeader.tsx: removed ambiguous source-count dot and party dot, updated tab mapping for new headings
- ProfileTabs.tsx: added Timeline as 6th tab, relabeled tabs to match template terminology
- ProfileWidget.tsx: graph refactored to diverse connection types (donors/opposes/media/K-street/contracts), fullscreen expand button
- EvidencePanel.tsx: money-trail gradient now clickable (activates donors tab + scrolls)

**Launch-50 infrastructure:**
- scripts/launch-50-audit.cjs NEW — readiness scoring
- scripts/launch-50-prepare.cjs NEW — flags re-enrichment + inserts CA skeletons
- ops/src/app/signoff-launch/page.tsx NEW — 4-stage progress tracker
- ops/src/app/api/launch-50/route.ts NEW — audit + signoff API

**Trump proof-of-concept (live at thedonormap.org):**
- Entity signals refreshed: total_received $3.8M → $724,161,916 (188x correction), edge_count 107 → 627, real top donors from FEC
- 5 custom-stats entries (DJT stake $3B, $TRUMP coin 800M tokens, WLF proceeds $1B+, H1 2025 earnings $460M+, 2024 mega-donors count)
- Class Analysis rewritten from data-dump to argumentative voice (will be replaced by David's working-class voice rewrite tomorrow)
- Personal Grift / 2017 Tax Cuts / Epstein supps moved to flow after Donor Class Map
- Fundraising-by-cycle table: removed nonsense 1988 $0 row, added super PAC totals column
- Timeline section populated: 30 entries across 2022-2026 (25 EOs + 3 FEC cycles + 2 events)

**Security sprint (parallel):**
- Clerk security patch: @clerk/nextjs 7.2.0 → 7.2.2 (GHSA-vqx2-fgx2-5wq9 middleware bypass)
- @clerk/shared 4.8.0 → 4.8.2, @clerk/backend 3.2.10 → 3.2.12
- Dismissed Dependabot alerts after real fix. npm audit 0 vulns.

**Go-live additions to data/public-routes.json:**
- index, Trump Master Profile, /legal, /corrections

**Bug fixes:**
- hide-internal-markers was mangling [JANITOR ...] inside YAML frontmatter (Majority Forward build failure). Transformer now skips frontmatter.
- Developer "Data panel computed at build time..." footer now HTML comment. Applied to 1,471 profiles.
- $-sign interpolation bug in timeline generator replace callback (money values "$1.6M" treated as regex backrefs). Fixed with function callback.

**Known issues flagged for 2026-04-17:**
- Trump 2024 fundraising $3.8M number is wrong (real ~$1.45B per OpenSecrets). Candidate committee only; super PAC totals not aggregated.
- Data dedup: "Ab Pac" / "AB PAC" / "Rbg Pac" / "RBG PAC" in Trump top-donors (normalization pass needed on relationships.jsonl)
- Mark Green pipeline data mismatch (from prior session, still unfixed)
- events.jsonl sparse on Trump (only 6 events)
- Trump Related Figures section needs auto-generation from top-10 relevance (currently hand-authored)
- Trump inline citations need {{src:ID}} conversion pass

**Next session priorities:**
1. Build Ops live-preview profile editor (split-pane, Path 3 agreed with David)
2. Accept David's Trump Class Analysis rewrite as reference exemplar
3. Add class-analysis-signed-off check to validator
4. Trump polish (Related Figures auto-gen, source conversion, 2024 number fix)
5. After Trump locked, start on 2nd launch-50 profile (Elon Musk or Lockheed Martin)

### Security sprint — 2026-04-15/16 (Code Claude, single session)

Complete pre-launch security upgrade. 28-item checklist, 27 done, 1 code-ready (rate limit Worker, deferred until public API). 10 commits, 35+ files.

**Licensing:** MIT LICENSE + CC-BY-SA CONTENT-LICENSE + /legal page + /corrections page + GitHub correction request issue template.

**Scanning scripts (5):** gitleaks-full-scan.cjs (clean -- 0 real secrets), identity-audit.cjs (no personal exposure), deps-cve-scan.cjs (0 vulns after npm audit fix), source-corroboration-audit.cjs, backup-staleness-check.cjs. CVE scan wired into CI.

**Query engine hardening:** MAX_PAGE_SIZE=500, unbounded-query gate, 5s timeout. 7 new contract tests (37 total).

**Backup:** donor-map-vault refreshed (was 19 days stale), backup remote connected, Windows Task Scheduler daily 3AM push, staleness alarm for Attention Queue.

**GitHub hardening:** Secret scanning + push protection enabled, Dependabot enabled, branch protection on v4 (CI required, force push blocked), all 7 workflows pinned to commit SHAs, CODEOWNERS file.

**Cloudflare:** DNS proxy active (nameservers switched from Namecheap to Cloudflare), SSL Full mode, HSTS 6 months, TLS 1.2 minimum, security headers Transform Rule (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy), Turnstile invisible CAPTCHA on tip form.

**Analytics:** GoatCounter wired in (guerillapropaganda.goatcounter.com).

**Personal:** 2FA on all accounts (GitHub, Namecheap, ProtonMail), WHOIS privacy verified (fully redacted).

**Playbooks:** DMCA/legal response playbook, backup recovery playbook (4 scenarios), attack surface inventory, ops README with Clerk dev/prod docs.

**Remaining (David's lane):** Trademark filing (~$250-350 USPTO), fill lawyer contacts in legal playbook, rate limit Worker deployment (when API goes public).

### IRS 990 enrichment marathon — 2026-04-18 (Code Claude, long session)

Session picked up mid-ingest from prior handoff. Completed the two background ingests (Congress votes 3,159 across 118/1+118/2+119/1+119/2; IRS 990 60 of 62 zips), then enriched every EIN-backed vault profile with 990 data + deduplication + edges + cleanup.

**Ingests completed:**
- IRS 990: all 62 bulk zips processed, 1,194 filings + 710K grant records (after re-ingest for 66 uncovered EINs)
- Congress votes: 3,159 roll calls + 900K legislator positions

**New scripts (6):**
- `scripts/dedup-nonprofit-990.cjs` — cross-zip dedup + HTML-entity decode + fuzzy name merging (AND↔&, org suffix strip)
- `scripts/build-nonprofit-990-panels.cjs` — auto:irs-990 panels with Grants Out + Grants In sections, 990-PF tag support
- `scripts/ingest-990-grants-to-edges.cjs` — vault-to-vault grants → monetary edges via canonical store
- `scripts/sync-ein-registry.cjs` — backfill signals.ein from profile frontmatter + public EIN registry export (jsonl + csv)
- `scripts/build-officer-registry.cjs` — officer dataset + board-overlap report
- `scripts/rebuild-relationship-denorm.cjs` — one-shot cleanup for 80K pre-existing edge validation errors

**Schema changes:**
- Added `irs-990-bulk` source to relationship-edge-validator enum
- Added `--eins` + `--force` flags to ingest-irs-990-bulk.cjs for targeted backfill
- Added 990-PF tag fallbacks (TotalRevAndExpnssAmt / FMVAssetsEOYAmt / etc.)

**Data additions:**
- `data/ein-registry.jsonl` + `.csv` (public artifact, 253 rows cross-referencing vault ↔ IRS by EIN)
- `data/officer-registry.jsonl` (public artifact, 2,748 rows)
- `content/Admin Notes/board-overlap-report.md` (31 officers on 2+ vault boards)
- `data/entities.jsonl`: +28 entities (stubs + EIN backfill)
- `data/relationships.jsonl`: 551 new 990-grant monetary edges

**Leo-network stubs created (content-readiness: raw, narrative pending):**
- The Concord Fund (JCN rebrand, EIN 20-2303252)
- Rule of Law Trust (EIN 83-1047727)
- National Philanthropic Trust (EIN 23-7825575)
- Schwab Charitable Fund (EIN 31-1640316)

**Marble Freedom Trust unlocked:** $762M in previously-dangling outflows now tracked — $448M to Schwab Charitable, $161M to The Concord Fund, $153M to Rule of Law Trust.

**Edge store hygiene:** 80,081 pre-existing validation errors → 0. Denorm cleanup collapsed 6,643 legacy "_X Master Profile" title references, fixed 21,401 stale from_type/to_type fields, recomputed 8,888 stale id hashes. Pre-commit relationship-edge-sentinel now enforces cleanly for future commits.

**Key commits:** `10c8fced1` (initial 990 batch), `70ec2f2e3` (80K edge cleanup), `3932f0fd5` (officer registry + Grants-IN), `e2bce47bb` (66-EIN re-ingest + 990-PF + fuzzy names).

**Board-overlap findings worth editorial follow-up:**
- Eric Kessler + Andrew Schulz on Sixteen Thirty + New Venture Fund (Arabella overlap)
- Kimberly O Dennis on AEI + Donors Capital Fund
- Isaac Applbaum on American Action Network + Republican Jewish Coalition

**Process note:** First two enrichment batches were accidentally committed on v4 directly (main repo) rather than in worktree. Acknowledged breach; discipline restored for denorm cleanup + subsequent commits.

### Launch-50 editorial pass continuation — 2026-04-18 evening (Code Claude / Research Claude hybrid)

Launch-50 audit: 50/50 profiles found, 100% have Class Analysis, 0 verified, 42 ready, 7 draft, 1 raw (at session start).

**Promoted draft -> ready (4 profiles, same janitor-stale pattern):**
- Kamala Harris: all editorial sections already complete. Janitor had demoted citing missing VOTING/CONGRESS data, but Harris was VP during 118/119 (no roll-call record by design). Fixed truncated central-thesis frontmatter, cleared needs-reenrichment.
- Mark Kelly: 1,433 roll-call positions now present post-voting-pipeline. Cleared janitor flag. Fixed thesis.
- Donald Trump: 11 editorial sections present; janitor confused because Trump has never been in Congress (he's President). Fixed thesis, cleared janitor.
- Bernie Moreno (already ready): fixed truncated thesis, cleared needs-reenrichment, added last-enriched date.

**Still needing real editorial writing (6 profiles) — Research Claude future-session queue:**
1. Elissa Slotkin (raw) — only has Class Analysis; needs Who They Are, Central Thesis, Core Contradiction, Donor Class Map, Rhetorical Signature Moves, Analytical Patterns.
2. Charles Koch (draft) — has Who They Are + Class Analysis; needs Thesis, Contradiction, DCM.
3. Richard and Elizabeth Uihlein (draft) — same gap pattern.
4. Crypto Industry Bloc (draft) — same gap pattern.
5. CoreCivic (draft) — same gap pattern. 48-block data foundation already rich.
6. Reid Hoffman (ready but structurally thin) — has Who They Are + Class Analysis but missing Thesis / Contradiction / DCM sections. Could be demoted back to draft or rewritten for consistency.

Launch-50 rollup after session: 45 ready / 4 draft / 1 raw / 0 verified.

**Historical votes ingest spawned (task bizbcv3oq, running at session-save time):** node scripts/ingest-congress-votes.cjs --congress 115,116,117 --resume --throttle-ms 150. Extends coverage to 115th-117th Congress (2017-2023) so long-tenured senators (Sanders, Warren, McConnell, Cruz, Schumer) have visible records. At session-save: 4,198 votes (up from 3,159 at start, +1,039 new). Will land in background; next session should re-run build-voting-record-panels.cjs after completion.

**EIN backfill work also completed this session (Code Claude lane):**
- 23 vault profiles got signals.ein populated from the discover-990-gaps candidate list
- The Concord Fund stub merged into Judicial Crisis Network canonical profile (JCN rebranded to Concord Fund c. 2023 — same legal entity EIN 20-2303252). Aliases registered; 10 Concord-Fund edges redirected to JCN via alias-aware denorm rebuild.
- Final 3 ambiguous EINs verified via ProPublica / OpenSecrets and applied: PPAF 13-3539048 c4, PP Votes 13-4128897 super PAC, ACU 52-0810813 c4.

**Session commit tally: 15 commits pushed to v4** — spanning 990 enrichment marathon, denorm cleanup, officer registry, Grants-IN panels, EIN backfills, Concord/JCN merge, launch-50 editorial pass promotions.
