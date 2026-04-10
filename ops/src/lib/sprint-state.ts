import fs from "fs/promises"
import path from "path"
import { parseSprintSchedule } from "./sprint-schedule-parser"

// Mutable sprint completion state. Lives in ops/data/ (gitignored) so
// checkbox clicks don't pollute git history.
export const STATE_FILE = path.join(process.cwd(), "data", "sprint-state.json")

export type TaskStatus = "pending" | "in_progress" | "done" | "blocked"

export interface TaskState {
  status: TaskStatus
  completed_at?: string
  started_at?: string
  blocked_reason?: string
  progress?: { current: number; target: number }
}

export interface DayState {
  actual_hours_worked?: number
  crunch_day?: boolean
  rest_half_day?: boolean
  notes?: string
}

export interface MetricSnapshot {
  verified_count?: number
  draft_count?: number
  conflicts_resolved?: number
  pipeline_bugs_closed?: number
  [k: string]: number | undefined
}

export interface SprintState {
  sprint_id: string
  last_updated: string
  task_states: Record<string, TaskState>
  day_states: Record<string, DayState>
  metric_snapshots: Record<string, MetricSnapshot>
}

async function ensureDataDir(): Promise<void> {
  const dir = path.dirname(STATE_FILE)
  await fs.mkdir(dir, { recursive: true })
}

/**
 * Build a fresh empty state seeded with every task id from the current schedule.
 * Task status is copied from the schedule's status field so already-done Phase 1 tasks
 * stay checked on first load.
 */
async function buildInitialState(): Promise<SprintState> {
  const schedule = await parseSprintSchedule()
  const taskStates: Record<string, TaskState> = {}
  for (const task of schedule.allTasks) {
    if (!task.id) continue
    const status: TaskStatus = (task.status as TaskStatus) || "pending"
    const s: TaskState = { status }
    if (status === "done" && task.completed_date) {
      s.completed_at = task.completed_date + "T00:00:00Z"
    }
    if (status === "blocked" && task.blocker) {
      s.blocked_reason = task.blocker
    }
    taskStates[task.id] = s
  }
  return {
    sprint_id: schedule.metadata?.sprint_id ?? "unknown-sprint",
    last_updated: new Date().toISOString(),
    task_states: taskStates,
    day_states: {},
    metric_snapshots: {},
  }
}

/**
 * Atomic write: tmp file + rename.
 */
async function writeAtomic(state: SprintState): Promise<void> {
  await ensureDataDir()
  state.last_updated = new Date().toISOString()
  const tmp = STATE_FILE + ".tmp"
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), "utf8")
  await fs.rename(tmp, STATE_FILE)
}

/**
 * Load the state file. If missing, auto-create it seeded from the schedule.
 */
export async function loadSprintState(): Promise<SprintState> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8")
    return JSON.parse(raw) as SprintState
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      const initial = await buildInitialState()
      await writeAtomic(initial)
      return initial
    }
    throw err
  }
}

/**
 * Merge a partial update into the state and persist it.
 * Shallow merge at the top level; nested maps are shallow-merged per key.
 */
export async function mergeSprintState(partial: Partial<SprintState>): Promise<SprintState> {
  const current = await loadSprintState()
  const next: SprintState = {
    ...current,
    ...partial,
    task_states: { ...current.task_states, ...(partial.task_states ?? {}) },
    day_states: { ...current.day_states, ...(partial.day_states ?? {}) },
    metric_snapshots: { ...current.metric_snapshots, ...(partial.metric_snapshots ?? {}) },
  }
  await writeAtomic(next)
  return next
}

export async function updateTaskState(
  taskId: string,
  patch: Partial<TaskState> & { status: TaskStatus }
): Promise<SprintState> {
  const current = await loadSprintState()
  const prev = current.task_states[taskId] ?? { status: "pending" }
  const nowIso = new Date().toISOString()
  const next: TaskState = { ...prev, ...patch }
  if (patch.status === "done" && !next.completed_at) next.completed_at = nowIso
  if (patch.status === "in_progress" && !next.started_at) next.started_at = nowIso
  if (patch.status === "pending") {
    delete next.completed_at
    delete next.started_at
  }
  current.task_states[taskId] = next
  await writeAtomic(current)
  return current
}

export async function updateDayState(date: string, patch: DayState): Promise<SprintState> {
  const current = await loadSprintState()
  current.day_states[date] = { ...(current.day_states[date] ?? {}), ...patch }
  await writeAtomic(current)
  return current
}

export async function appendMetricSnapshot(
  timestamp: string,
  metrics: MetricSnapshot
): Promise<SprintState> {
  const current = await loadSprintState()
  current.metric_snapshots[timestamp] = metrics
  await writeAtomic(current)
  return current
}
