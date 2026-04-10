---
title: Sprint Schedule
type: admin-note
note-type: data
priority: normal
status: active
last-updated: '2026-04-10'
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
    current: 288
    description: "draft profiles promoted to ready tier"

  - id: systems
    rank: 3
    metric: pipeline_bugs_closed
    baseline: 7
    goal: 0
    current: 3   # A000383, QVT, GovTrack, redirect enrichment fixed as of 2026-04-10
    description: "known pipeline bugs blocking data integrity"

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
      status: pending
      notes: "54 files had NUL bytes after content-readiness:: ready pattern. I cleaned the symptoms but the script that writes them needs to be found."

    - id: cc_06
      task: "Add rule comments to Ops profile editor source (frontmatter-only + URL editor-only rules)"
      status: pending
      related_files: ["ops/src/components/ProfileEditor.tsx", "ops/src/app/api/profiles/"]

    - id: cc_07
      task: "Run pipeline enrichment on 12 new stubs"
      status: blocked
      blocker: "GitHub Actions disabled — cannot trigger pipeline runs"
      stubs: ["Summer Lee", "Nina Turner", "George Latimer", "Wesley Bell", "Shontel Brown", "Bernie Marcus", "Mark Mellman", "Brian Armstrong", "Ben Horowitz", "Chris Larsen", "Brad Garlinghouse", "Paul Atkins"]

    - id: cc_08
      task: "Build Ops calendar tab from sprint-schedule.md"
      status: pending
      spec_file: "content/Admin Notes/calendar-spec.md"

  research_claude:
    - id: rc_01
      task: "Write ops/CLAUDE.md (frontmatter-only + URL editor-only rules)"
      status: pending
      target_file: "ops/CLAUDE.md"

    - id: rc_02
      task: "Write ops/RULES.md (frontmatter-only + URL editor-only rules)"
      status: pending
      target_file: "ops/RULES.md"

    - id: rc_03
      task: "Depth work on Squad/leadership verified candidates"
      status: pending
      candidates: ["Rashida Tlaib", "Ilhan Omar", "Ayanna Pressley", "Greg Casar", "Hakeem Jeffries"]
      target: "Flag candidates for David sign-off, do NOT self-promote to verified"

    - id: rc_04
      task: "Build out Summer Lee stub from raw→draft→ready"
      status: pending
      target_file: "content/Politicians/Democrats/House/Summer Lee/_Summer Lee Master Profile.md"
      notes: "Already has substantive body content from stub build"

    - id: rc_05
      task: "Re-review Cori Bush and Jamaal Bowman for verified AFTER fresh pipeline runs"
      status: blocked
      blocker: "Pipeline runs blocked by GitHub Actions disabled (cc_07)"
      notes: "Both demoted ready→draft (Bush) or verified→ready (Bowman) on 2026-04-10 due to A000383 contamination. Re-promote when Congress/GovTrack data is clean."

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

**Schedule last updated: 2026-04-10**
**Current phase: phase_1 (Day 1 of 7)**
**Next checkpoint: Phase 1 exit, 2026-04-16**
