---
title: Ops Calendar Tab , Code Claude Spec
type: admin-note
note-type: code
priority: normal
status: open
last-updated: '2026-04-10'
spec-owner: research-claude
build-owner: code-claude
target-completion: 2026-04-10 # Phase 1 Day 1
note-kind: reference
---

# Ops Calendar Tab. Build Spec

**To Code Claude:** build a calendar/schedule tab for the Ops app at `localhost:3333` that reads the sprint schedule from `content/Admin Notes/sprint-schedule.md` and renders a month-grid view with phase coloring, daily task lists, and progress tracking.

This spec is self-contained. Read it top-to-bottom, then execute. Ask David only if something is genuinely ambiguous.

## Phase 1 priority

Scope for this spec: **Month grid view with phase coloring.** Research Claude's plan estimated 6-10 hours of your time (2-3 hours of David's review time). Ship this today (Apr 10) if possible, iterate in later phases.

**Do NOT build:**
- Week view, day view (the month grid is the only view for v1)
- Drag-to-reschedule
- Calendar sync (iCal, Google)
- Recurring event engine
- Integration with Stories/Events/Admin Notes (those are separate file trees, outside v1 scope)

**DO build:**
- Month grid April 10-30 (just those 21 days, not the whole month)
- Phase color-coding (Phase 1 / Phase 2 / Phase 3 as three visual bands)
- Per-day task list pulled from sprint-schedule.md
- Per-day completion checkboxes (state persisted outside sprint-schedule.md)
- Today indicator (highlighted current date)
- Phase exit checkpoint markers
- Hard-stop markers (8:30pm visible per day)
- Responsive at 1280px+ (desktop only for v1, mobile is Phase 2)

## File locations

### New files you'll create
```
ops/src/app/calendar/page.tsx          # Next.js route
ops/src/app/calendar/Calendar.tsx       # Main calendar component
ops/src/app/calendar/MonthGrid.tsx      # Grid layout
ops/src/app/calendar/DayCell.tsx        # Individual day cell
ops/src/app/calendar/PhaseBar.tsx       # Horizontal phase banner
ops/src/app/calendar/TaskCheckbox.tsx   # Reusable task checkbox
ops/src/app/calendar/calendar.module.scss  # Scoped styles
ops/src/lib/sprint-schedule-parser.ts   # Parses sprint-schedule.md
ops/src/app/api/sprint-state/route.ts   # GET/POST for mutable completion state
ops/data/sprint-state.json              # Mutable completion state (NOT in git)
```

### Files you'll READ (don't modify)
```
content/Admin Notes/sprint-schedule.md  # Source of truth — parse on every load
```

### Files to add to .gitignore
```
ops/data/sprint-state.json  # Ephemeral state, not version-controlled
```

## Data source: sprint-schedule.md

The sprint schedule lives at `content/Admin Notes/sprint-schedule.md` in the vault. It's markdown with YAML fenced code blocks. Your parser needs to extract the YAML blocks under specific H2 headers.

### YAML blocks to parse

Under each `## {Section Name}` header, there is a ` ```yaml ` fenced block with structured data. The sections you need are:

| Section heading | YAML contents | Purpose |
|---|---|---|
| `## Sprint metadata` | `sprint_id`, `start_date`, `end_date`, `total_hour_budget`, `daily_baseline_hours`, `hard_stop_time` | Calendar boundaries and per-day markers |
| `## North Star targets (priority order)` | Array of targets with `id`, `rank`, `metric`, `baseline`, `goal`, `current`, `description` | Progress bars above the grid |
| `## Phases` | Array of phases with `id`, `name`, `theme`, `start`, `end`, `days`, `hours_budget`, `exit_criteria` | Phase bands across the grid |
| `## Daily block template (weekday)` | Array of time blocks with `time`, `block`, `owner`, `work`, `category`, `duration_hours` | Expanded day-detail popover |
| `## Phase 1, must-complete tasks` | Object with `code_claude`, `research_claude`, `david` arrays of tasks | Task list on Phase 1 days |
| `## Phase 2, must-complete tasks` | Same structure | Task list on Phase 2 days |
| `## Phase 3, must-complete tasks` | Same structure | Task list on Phase 3 days |
| `## Risk register` | Array of risks with `id`, `name`, `likelihood`, `impact`, `mitigation` | Optional risk sidebar (v1: not shown) |
| `## April 30 review process` | Object with `sprint_close`, `verification_checks` | Mark Apr 30 as "SPRINT CLOSE" day |

### Parser implementation hints

```typescript
// ops/src/lib/sprint-schedule-parser.ts

import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';  // already in Ops deps

export interface SprintSchedule {
  metadata: SprintMetadata;
  targets: NorthStarTarget[];
  phases: Phase[];
  dailyTemplate: TimeBlock[];
  phaseTasks: Record<string, PhaseTasks>;  // keyed by phase id
  risks: Risk[];
  reviewProcess: ReviewProcess;
}

const SCHEDULE_FILE = path.join(
  process.cwd(),
  '..',  // up from ops/ to repo root
  'content',
  'Admin Notes',
  'sprint-schedule.md'
);

export async function parseSprintSchedule(): Promise<SprintSchedule> {
  const raw = await fs.readFile(SCHEDULE_FILE, 'utf8');
  // Strip frontmatter
  const body = raw.replace(/^---[\s\S]*?---\n/, '');
  // Match H2 sections followed by yaml fenced blocks
  const sectionPattern = /^## (.+?)$\n(?:[\s\S]*?)^```yaml\n([\s\S]*?)^```$/gm;
  const blocks: Record<string, unknown> = {};
  let match;
  while ((match = sectionPattern.exec(body)) !== null) {
    const [, heading, yamlText] = match;
    blocks[heading.trim()] = yaml.load(yamlText);
  }
  return {
    metadata: blocks['Sprint metadata'] as SprintMetadata,
    targets: (blocks['North Star targets (priority order)'] as { targets: NorthStarTarget[] })?.targets ?? [],
    phases: (blocks['Phases'] as { phases: Phase[] })?.phases ?? [],
    dailyTemplate: (blocks['Daily block template (weekday)'] as { daily_template: TimeBlock[] })?.daily_template ?? [],
    phaseTasks: {
      phase_1: (blocks['Phase 1 — must-complete tasks'] as { phase_1_tasks: PhaseTasks })?.phase_1_tasks ?? {} as PhaseTasks,
      phase_2: (blocks['Phase 2 — must-complete tasks'] as { phase_2_tasks: PhaseTasks })?.phase_2_tasks ?? {} as PhaseTasks,
      phase_3: (blocks['Phase 3 — must-complete tasks'] as { phase_3_tasks: PhaseTasks })?.phase_3_tasks ?? {} as PhaseTasks,
    },
    risks: (blocks['Risk register'] as { risks: Risk[] })?.risks ?? [],
    reviewProcess: blocks['April 30 review process'] as ReviewProcess,
  };
}
```

**Re-read the file on every route load**, no caching. The schedule can change mid-sprint and the calendar should reflect edits immediately.

## State persistence: sprint-state.json

Task completion state is MUTABLE and should NOT be written back to sprint-schedule.md (which is the immutable source-of-truth schedule in git). Store it in `ops/data/sprint-state.json` and serve via a simple API route.

### sprint-state.json shape

```json
{
  "sprint_id": "2026-04-sprint",
  "last_updated": "2026-04-10T14:23:11Z",
  "task_states": {
    "cc_01": { "status": "done", "completed_at": "2026-04-10T08:00:00Z" },
    "cc_05": { "status": "pending" },
    "rc_01": { "status": "in_progress", "started_at": "2026-04-10T08:30:00Z" },
    "dc_01": { "status": "in_progress", "progress": { "current": 27, "target": 175 } }
  },
  "day_states": {
    "2026-04-10": {
      "actual_hours_worked": 4.5,
      "crunch_day": false,
      "rest_half_day": false,
      "notes": "Merge cleanup took longer than expected"
    }
  },
  "metric_snapshots": {
    "2026-04-10T20:30:00Z": {
      "verified_count": 3,
      "draft_count": 288,
      "conflicts_resolved": 0,
      "pipeline_bugs_closed": 4
    }
  }
}
```

### API route

```
GET  /api/sprint-state           → returns sprint-state.json (creates if missing)
POST /api/sprint-state           → merges partial update into sprint-state.json
POST /api/sprint-state/task      → body: { taskId, status, ...extras } → updates one task
POST /api/sprint-state/day       → body: { date, ...dayState } → updates one day
POST /api/sprint-state/snapshot  → body: { timestamp, metrics } → appends a metric snapshot
```

All POST handlers write atomically (read → mutate → write with fs.writeFile + rename pattern).

### Initial state on first load
If `ops/data/sprint-state.json` doesn't exist, the GET handler creates it with empty task_states, day_states, and metric_snapshots, populated from the task IDs in sprint-schedule.md.

## Visual design

### Layout (1280px desktop)

```
┌──────────────────────────────────────────────────────────────────┐
│  SPRINT: 2026-04-SPRINT             DAY 1 OF 21                  │  ← header
│  APRIL 10 → APRIL 30 · 215 HOUR BUDGET · 3 VERIFIED / 40 GOAL    │
├──────────────────────────────────────────────────────────────────┤
│  ▮▮▮▮▮▮▮ depth  ▮▮▮▮▮▮▮▮ breadth  ▮▮▮▮▮▮▮ systems  ▮▮ polish   │  ← progress bars
├──────────────────────────────────────────────────────────────────┤
│  [PHASE 1: FOUNDATION · APR 10-16] [PHASE 2: DEPTH · APR 17-23] │  ← phase bar
│   [PHASE 3: LAUNCH PREP · APR 24-30]                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MON 10    TUE 11    WED 12    THU 13    FRI 14    SAT 15    SUN 16 │
│  ┌────┐    ┌────┐    ┌────┐    ┌────┐    ┌────┐    ┌────┐    ┌────┐│
│  │DAY1│    │DAY2│    │DAY3│    │DAY4│    │DAY5│    │DAY6│    │DAY7││
│  │TODAY│  │    │    │    │    │    │    │    │    │    │    │    ││
│  │    │    │    │    │    │    │    │    │    │    │    │    │    ││
│  │1/12│    │    │    │    │    │    │    │    │    │    │    │    ││
│  │VERIF│  │    │    │    │    │    │    │    │    │    │    │    ││
│  │ ✓3 │    │    │    │    │    │    │    │    │    │    │    │ CHK││
│  └────┘    └────┘    └────┘    └────┘    └────┘    └────┘    └────┘│
│                                                                   │
│  ← Phase 1 ends →                                                 │
│                                                                  │
│  MON 17    ...                                                   │
│  ...                                                             │
│                                                                  │
│  MON 24    ... THU 30                                            │
│  (Phase 3 days)                                                  │
│  Apr 27 = SOFT LAUNCH, Apr 30 = PUBLIC LAUNCH                    │
└──────────────────────────────────────────────────────────────────┘
```

### Color palette (strict, per `content/Design System.md`)

- Base background: cream `#f5f0eb`
- Text primary: black `#0a0a0a`
- Phase 1 accent: yellow `#fbbf24` (foundation = attention/caution)
- Phase 2 accent: blue `#1d4ed8` (depth = focus)
- Phase 3 accent: red `#e63946` (launch prep = urgency)
- Today indicator: yellow background + black text
- Completed task: green `#16a34a` text or check
- Hard stop marker: red `#e63946` border
- Progress bar fill: yellow `#fbbf24`
- Progress bar empty: light gray `#e5e5e5`

**NO rounded corners** (`border-radius: 0` always). **NO shadows.** **NO gradients.** Per Design System brutalist rules.

### Typography

- Headlines and phase labels: **Inter 900** (or 800 if 900 unavailable)
- Body, task text: **Inter 400**
- Editorial/thesis text: **Instrument Serif italic** (not relevant for calendar)
- Dollar amounts, numbers, dates: **Space Mono** (use for day numbers and metrics)

### DayCell contents (per day)

```
┌─────────────────────┐
│ MON  APR 10      ●  │  ← weekday + date, today dot if current
│                     │
│ PHASE 1 · DAY 1/7   │  ← phase id + day index in phase
│                     │
│ TASKS 3/8           │  ← completion fraction
│  ☑ cc_01 A000383    │  ← checkboxes for tasks scheduled this day
│  ☐ rc_01 ops docs   │  (filter tasks where owner+phase match)
│  ☐ dc_01 triage 27  │
│  ...                │
│                     │
│ HARD STOP 20:30 ─── │  ← hard stop marker
└─────────────────────┘
```

Clicking a day cell opens a drawer/modal with the full daily template (all 10 time blocks) plus notes field.

### Phase bar

Horizontal band above the grid showing the three phases as color-coded segments. Width proportional to days in each phase (all 7 days = equal width). Clicking a phase segment scrolls the grid to its days.

### Progress bars

Four horizontal bars stacked near the top, one per North Star target (depth, breadth, systems, polish). Show current/goal ratio. Color matches target rank (depth = yellow, breadth = blue, systems = green `#16a34a`, polish = red).

### Today indicator

The day cell matching `new Date().toISOString().slice(0, 10)` gets:
- Yellow background
- Black text (reversed from normal)
- "TODAY" label above the weekday
- Slightly thicker border

## Interactions

### v1 interactions (must work)

1. **Click a task checkbox** → POST to `/api/sprint-state/task` with `{ taskId, status: 'done' | 'pending' }`. Optimistic UI update.
2. **Click a day cell** → opens modal with daily block template (time-indexed list).
3. **Click a phase bar segment** → scrolls/highlights the grid for that phase.
4. **Hover a task row** → shows full task description in tooltip.

### v1 interactions (DO NOT build)

- Drag to reschedule
- Add new task
- Edit task text
- Delete task
- Navigate to previous/next month
- Calendar sync

### Keyboard shortcuts (nice to have, not required v1)

- `t` → jump to today
- `1` / `2` / `3` → jump to Phase 1/2/3
- `Esc` → close day modal

## Sidebar integration

Add a new nav item to the Ops sidebar:

```
📅 Calendar
```

Below existing items (Profiles, Notes, Pipelines, etc.). Use the same brutalist sidebar style already in `ops/src/components/Sidebar.tsx`. Badge shows current phase: `P1`, `P2`, `P3`.

## Data flow summary

```
┌──────────────────────────────────┐
│ content/Admin Notes/             │
│   sprint-schedule.md (git)       │  ← immutable source of truth
│   (phases, tasks, template)      │
└─────────┬────────────────────────┘
          │
          │ parse on every load (no cache)
          ▼
┌──────────────────────────────────┐
│ ops/src/lib/                     │
│   sprint-schedule-parser.ts      │  ← YAML block extractor
└─────────┬────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│ ops/src/app/calendar/            │
│   Calendar.tsx                   │  ← renders grid + tasks
└─────────┬────────────────────────┘
          │
          │ GET /api/sprint-state (on load)
          │ POST /api/sprint-state/task (on check)
          ▼
┌──────────────────────────────────┐
│ ops/data/                        │
│   sprint-state.json (gitignored) │  ← mutable completion state
└──────────────────────────────────┘
```

## Acceptance criteria

Ship when all of these are true:

- [ ] Clicking the "Calendar" sidebar link loads the month grid at `/calendar` with no console errors
- [ ] Apr 10-30 renders as 21 day cells grouped into 3 week rows
- [ ] Current day (Apr 10) has visible "TODAY" indicator
- [ ] Phase bar shows 3 segments with correct color coding
- [ ] Progress bars for 4 North Star targets render with real baseline/goal/current numbers parsed from sprint-schedule.md
- [ ] At least 5 task checkboxes appear on at least 3 different day cells
- [ ] Clicking a task checkbox persists to sprint-state.json and survives page reload
- [ ] Clicking a day cell opens a modal showing the 10 time blocks from the daily template
- [ ] Apr 27 and Apr 30 cells show special labels ("SOFT LAUNCH" and "PUBLIC LAUNCH")
- [ ] Phase exit dates (Apr 16, 23, 30) show a checkmark or divider marker
- [ ] No rounded corners anywhere. No shadows. No gradients.
- [ ] Works at 1280px viewport. Below 1024px is allowed to degrade gracefully but not required.
- [ ] If `sprint-schedule.md` is missing, shows a readable error: "Sprint schedule not found at content/Admin Notes/sprint-schedule.md"
- [ ] If `sprint-state.json` is missing, auto-creates it with empty task states

## What to skip / defer to Phase 2

- Week view / day view
- Mobile responsive (< 1280px)
- Drag-to-reschedule
- Task editing in-place
- Integration with Stories/Events
- Analytics on completion velocity
- Notifications for hard-stop approaching
- iCal export
- Multiple concurrent sprints (this is a single-sprint tool for now)

## How to test during development

Since `sprint-schedule.md` lives in the vault (outside the ops directory), make sure the file path resolution works from the Ops dev server. The schedule file should be at `./content/Admin Notes/sprint-schedule.md` relative to `ops/`. Verify `process.cwd()` resolves correctly when the Next.js dev server starts.

Test scenarios:
1. Fresh load with no `sprint-state.json` → should auto-create
2. Click a task → reload → checkbox stays checked
3. Edit `sprint-schedule.md` (add a task) → reload → new task appears in day cell
4. Mark all Phase 1 tasks done → Phase 1 progress bar fills

## Questions Code Claude should resolve before building

(None expected, spec is self-contained. If you hit a genuine ambiguity, ask David in chat, don't guess.)

## When you finish

1. Commit in logical chunks (parser / API route / components / styles)
2. Run `/session-save` at the end of your session
3. Update `content/Session State.md` with a "Calendar tab shipped" entry under your session
4. Tag Research Claude in the next Session State: "Calendar ready at /calendar, check it renders your sprint data correctly"

## Related specs in the vault (for context)

- `content/Design System.md`, brutalist design rules
- `content/Vault Rules.md`, frontmatter-only rule, URL editor-only rule
- `content/Pipeline Guide.md`. API cheatsheet reference (unrelated to calendar but you should read it at session start)
- `C:\Users\third\.claude\plans\cheeky-knitting-fox.md`, the full strategic plan this calendar tracks (local, not in git)

---

**Spec complete. Target ship: 2026-04-10 (today).**
**Research Claude is standing by in a parallel session to answer spec questions if needed.**
