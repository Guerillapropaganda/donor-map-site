import fs from "fs/promises"
import path from "path"
import { parseSprintSchedule, type Task } from "./sprint-schedule-parser"

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
 * Coerce a YAML status string (which may use "in-progress" with a hyphen)
 * into the canonical TaskStatus union (which uses underscores).
 */
function normalizeYamlStatus(status: unknown): TaskStatus {
  if (typeof status !== "string") return "pending"
  const s = status.replace(/-/g, "_").toLowerCase()
  if (s === "done" || s === "in_progress" || s === "blocked" || s === "pending") {
    return s as TaskStatus
  }
  return "pending"
}

/**
 * Build a fresh empty state seeded with every task id from the current schedule.
 * Task status is copied from the schedule's status field so already-done Phase 1 tasks
 * stay checked on first load.
 */
/**
 * Resolve a task's completion timestamp. Prefer the full ISO `completed_at`
 * when session-save has written one; fall back to `completed_date` + midnight
 * UTC only if no precise timestamp exists. This is what lets the calendar
 * show "hours today" correctly for tasks that were finished mid-day.
 */
function resolveCompletedAt(task: Task): string | undefined {
  if (task.completed_at) return task.completed_at
  if (task.completed_date) return task.completed_date + "T00:00:00Z"
  return undefined
}

async function buildInitialState(): Promise<SprintState> {
  const schedule = await parseSprintSchedule()
  const taskStates: Record<string, TaskState> = {}
  for (const task of schedule.allTasks) {
    if (!task.id) continue
    const status = normalizeYamlStatus(task.status)
    const s: TaskState = { status }
    if (status === "done") {
      const completedAt = resolveCompletedAt(task)
      if (completedAt) s.completed_at = completedAt
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
 * Merge the current YAML status of each task into the stored state. This is
 * strictly additive: YAML can PROMOTE a task (pending → done/blocked/in_progress),
 * but user clicks that marked a task done won't be reverted if the YAML later
 * shows the same task as pending. Without this reconcile step, a session-save
 * that updates sprint-schedule.md never propagates to the calendar's checkbox
 * state file (which is frozen at initial seed).
 *
 * Returns true if any entry was mutated, so the caller can decide to persist.
 */
function reconcileScheduleIntoState(
  schedule: Awaited<ReturnType<typeof parseSprintSchedule>>,
  state: SprintState
): boolean {
  let mutated = false
  for (const task of schedule.allTasks) {
    if (!task.id) continue
    const yamlStatus = normalizeYamlStatus(task.status)
    const existing = state.task_states[task.id]

    if (!existing) {
      // Task added to YAML after initial seed.
      const s: TaskState = { status: yamlStatus }
      if (yamlStatus === "done") {
        const completedAt = resolveCompletedAt(task)
        if (completedAt) s.completed_at = completedAt
      }
      if (yamlStatus === "blocked" && task.blocker) {
        s.blocked_reason = task.blocker
      }
      state.task_states[task.id] = s
      mutated = true
      continue
    }

    // Promote: YAML says done, state doesn't.
    if (yamlStatus === "done" && existing.status !== "done") {
      state.task_states[task.id] = {
        ...existing,
        status: "done",
        completed_at:
          resolveCompletedAt(task) ?? existing.completed_at ?? new Date().toISOString(),
      }
      mutated = true
      continue
    }

    // Promote: YAML says blocked, state isn't done/blocked.
    if (yamlStatus === "blocked" && existing.status !== "done" && existing.status !== "blocked") {
      state.task_states[task.id] = {
        ...existing,
        status: "blocked",
        blocked_reason: task.blocker ?? existing.blocked_reason ?? "see task",
      }
      mutated = true
      continue
    }

    // Promote: YAML says in_progress, state is still pending.
    if (yamlStatus === "in_progress" && existing.status === "pending") {
      state.task_states[task.id] = { ...existing, status: "in_progress" }
      mutated = true
      continue
    }
  }
  return mutated
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
 * On every load, reconcile YAML status into stored state so session-save
 * updates to sprint-schedule.md propagate to calendar checkboxes without
 * requiring the json file to be deleted.
 */
export async function loadSprintState(): Promise<SprintState> {
  let state: SprintState
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8")
    state = JSON.parse(raw) as SprintState
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === "ENOENT") {
      const initial = await buildInitialState()
      await writeAtomic(initial)
      return initial
    }
    throw err
  }

  try {
    const schedule = await parseSprintSchedule()
    if (reconcileScheduleIntoState(schedule, state)) {
      await writeAtomic(state)
    }
  } catch (err) {
    // Reconcile is best-effort — if the schedule can't be parsed, fall back to
    // the stored state as-is rather than failing the entire calendar load.
    console.error("[sprint-state] reconcile failed:", err)
  }

  return state
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
