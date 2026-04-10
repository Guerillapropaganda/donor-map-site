import fs from "fs/promises"
import path from "path"
import yaml from "js-yaml"

// Source file: single source of truth for the current sprint schedule
// Lives in the vault so David can edit it directly; Ops calendar re-reads on every load.
export const SCHEDULE_FILE = path.join(
  process.cwd(),
  "..",
  "content",
  "Admin Notes",
  "sprint-schedule.md"
)

export interface SprintMetadata {
  sprint_id: string
  start_date: string
  end_date: string
  duration_days: number
  total_hour_budget: number
  daily_baseline_hours: number
  crunch_days_allowed: number
  rest_half_days: number
  hard_stop_time: string
}

export interface NorthStarTarget {
  id: string
  rank: number
  metric: string
  baseline: number | boolean
  goal: number | boolean
  current: number | boolean
  description: string
}

export interface PhaseExitCriterion {
  [key: string]: number | boolean | string
}

export interface Phase {
  id: string
  name: string
  theme: string
  start: string
  end: string
  days: number
  hours_budget: number
  exit_criteria: PhaseExitCriterion[]
}

export interface TimeBlock {
  time: string
  block: string
  owner: string
  work: string
  category: string
  duration_hours?: number
  daily_target_items?: number
}

export interface Task {
  id: string
  task: string
  status: "pending" | "in_progress" | "done" | "blocked"
  notes?: string
  completed_date?: string
  blocker?: string
  target?: number | string
  daily_target?: number
  week_target?: number
  stubs?: string[]
  candidates?: string[]
  priorities?: string[]
  pages?: string[]
  keywords?: string[]
  scheduled?: string
  target_file?: string
  spec_file?: string
  backlog_file?: string
  related_files?: string[]
  priority_order?: string[]
  criteria?: string
  criterion?: string
  files?: string[]
  target_end?: number
  progress?: { current: number; target: number }
}

export interface PhaseTasks {
  code_claude?: Task[]
  research_claude?: Task[]
  david?: Task[]
}

export interface Risk {
  id: string
  name: string
  likelihood: string
  impact: string
  mitigation: string
  current_state?: string
  notes?: string
}

export interface SprintCloseStep {
  step: number
  task: string
  script_location?: string
}

export interface ReviewProcess {
  sprint_close: {
    date: string
    evening_sequence: SprintCloseStep[]
  }
  verification_checks: {
    quantitative: string[]
    qualitative: string[]
  }
}

export interface SprintSchedule {
  metadata: SprintMetadata
  targets: NorthStarTarget[]
  phases: Phase[]
  dailyTemplate: TimeBlock[]
  phaseTasks: Record<string, PhaseTasks>
  risks: Risk[]
  reviewProcess: ReviewProcess | null
  // Derived helpers
  allTasks: Task[] // flattened every task with phase+owner tags
}

export interface TaskWithContext extends Task {
  phase: string
  owner: string
}

export class SprintScheduleNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Sprint schedule not found at ${filePath}`)
    this.name = "SprintScheduleNotFoundError"
  }
}

/**
 * Parse the markdown file at SCHEDULE_FILE.
 *
 * Extracts every fenced ```yaml block that sits under an H2 heading,
 * keyed by the heading text (trimmed).
 */
export async function parseSprintSchedule(): Promise<SprintSchedule> {
  let raw: string
  try {
    raw = await fs.readFile(SCHEDULE_FILE, "utf8")
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new SprintScheduleNotFoundError(SCHEDULE_FILE)
    }
    throw err
  }

  // Strip frontmatter (first --- ... --- block if present)
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "")

  // Match: ## Heading\n ... ```yaml\n...\n```
  // We walk the body once, tracking the current H2 heading and capturing
  // the first yaml fence that follows it.
  const blocks: Record<string, unknown> = {}
  const lines = body.split(/\r?\n/)
  let currentHeading: string | null = null
  let inYaml = false
  let yamlBuffer: string[] = []
  let yamlCapturedForHeading: string | null = null

  for (const line of lines) {
    if (line.startsWith("## ")) {
      currentHeading = line.slice(3).trim()
      yamlCapturedForHeading = null
      continue
    }
    if (!inYaml && line.trim() === "```yaml" && currentHeading && yamlCapturedForHeading !== currentHeading) {
      inYaml = true
      yamlBuffer = []
      continue
    }
    if (inYaml && line.trim() === "```") {
      inYaml = false
      if (currentHeading) {
        try {
          // JSON_SCHEMA keeps ISO dates as strings instead of js-yaml's default
          // behavior of constructing Date objects — our downstream code treats
          // every date field as a plain YYYY-MM-DD string.
          const parsed = yaml.load(yamlBuffer.join("\n"), { schema: yaml.JSON_SCHEMA })
          blocks[currentHeading] = parsed
          yamlCapturedForHeading = currentHeading
        } catch (parseErr) {
          console.error(`[sprint-schedule-parser] Failed to parse yaml under "${currentHeading}":`, parseErr)
        }
      }
      yamlBuffer = []
      continue
    }
    if (inYaml) yamlBuffer.push(line)
  }

  const metadata = blocks["Sprint metadata"] as SprintMetadata

  const targetsBlock = blocks["North Star targets (priority order)"] as { targets?: NorthStarTarget[] } | undefined
  const targets = targetsBlock?.targets ?? []

  const phasesBlock = blocks["Phases"] as { phases?: Phase[] } | undefined
  const phases = phasesBlock?.phases ?? []

  const dailyBlock = blocks["Daily block template (weekday)"] as { daily_template?: TimeBlock[] } | undefined
  const dailyTemplate = dailyBlock?.daily_template ?? []

  const p1 = blocks["Phase 1 — must-complete tasks"] as { phase_1_tasks?: PhaseTasks } | undefined
  const p2 = blocks["Phase 2 — must-complete tasks"] as { phase_2_tasks?: PhaseTasks } | undefined
  const p3 = blocks["Phase 3 — must-complete tasks"] as { phase_3_tasks?: PhaseTasks } | undefined
  const phaseTasks: Record<string, PhaseTasks> = {
    phase_1: p1?.phase_1_tasks ?? {},
    phase_2: p2?.phase_2_tasks ?? {},
    phase_3: p3?.phase_3_tasks ?? {},
  }

  const risksBlock = blocks["Risk register"] as { risks?: Risk[] } | undefined
  const risks = risksBlock?.risks ?? []

  const reviewBlock = blocks["April 30 review process"] as ReviewProcess | undefined
  const reviewProcess = reviewBlock ?? null

  // Flatten all tasks with phase + owner context
  const allTasks: Task[] = []
  for (const [phaseId, ownerMap] of Object.entries(phaseTasks)) {
    for (const [owner, list] of Object.entries(ownerMap) as [string, Task[] | undefined][]) {
      if (!list) continue
      for (const task of list) {
        allTasks.push({ ...task } as Task)
        // Attach phase + owner via the TaskWithContext shape on the flattened copy
        ;(allTasks[allTasks.length - 1] as TaskWithContext).phase = phaseId
        ;(allTasks[allTasks.length - 1] as TaskWithContext).owner = owner
      }
    }
  }

  return {
    metadata,
    targets,
    phases,
    dailyTemplate,
    phaseTasks,
    risks,
    reviewProcess,
    allTasks,
  }
}

// Pure helpers (phaseForDate, sprintDays) live in
// ops/src/app/calendar/utils.ts so they can be imported from client components
// without pulling the fs/path imports of this server-only module.
