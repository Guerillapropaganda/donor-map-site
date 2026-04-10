import type {
  SprintSchedule,
  Task,
  Phase,
  TimeBlock,
} from "@/lib/sprint-schedule-parser"
import type { SprintState, TaskStatus } from "@/lib/sprint-state"

export type { SprintSchedule, Task, Phase, TimeBlock, SprintState, TaskStatus }

// Phase colors — hard accent colors that work on the dark ops theme.
// These are calendar-local, not the public site's Design System palette.
export const PHASE_COLORS: Record<string, { hex: string; label: string }> = {
  phase_1: { hex: "#fbbf24", label: "FOUNDATION" }, // yellow
  phase_2: { hex: "#3b82f6", label: "DEPTH" }, // blue
  phase_3: { hex: "#ef4444", label: "LAUNCH PREP" }, // red
}

// North Star target → color hex (dark-theme friendly)
export const TARGET_COLORS: Record<string, string> = {
  depth: "#fbbf24",
  breadth: "#3b82f6",
  systems: "#22c55e",
  polish: "#ef4444",
}

export const OWNER_LABELS: Record<string, string> = {
  code_claude: "CC",
  research_claude: "RC",
  david: "DC",
  either: "??",
}

export const OWNER_COLORS: Record<string, string> = {
  code_claude: "#5b8dce", // steel blue
  research_claude: "#22c55e", // green
  david: "#f59e0b", // amber
  either: "#7a7a86",
}

/**
 * Normalize date comparison. All dates are YYYY-MM-DD UTC strings.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Assign every task to a specific day for rendering. The schedule doesn't
 * explicitly date each task — instead tasks are grouped by phase. We put each
 * task on the first day of its phase unless the task has a `scheduled` field.
 *
 * Returns a map: date → Task[] (with phase + owner tacked on).
 */
export function tasksByDay(schedule: SprintSchedule): Record<string, (Task & { phase: string; owner: string })[]> {
  const map: Record<string, (Task & { phase: string; owner: string })[]> = {}
  for (const phase of schedule.phases) {
    const phaseTasks = schedule.phaseTasks[phase.id]
    if (!phaseTasks) continue
    for (const [owner, list] of Object.entries(phaseTasks) as [string, Task[] | undefined][]) {
      if (!list) continue
      for (const task of list) {
        if (!task.id) continue
        const date = task.scheduled ?? phase.start
        if (!map[date]) map[date] = []
        map[date].push({ ...task, phase: phase.id, owner })
      }
    }
  }
  return map
}

export function numericCurrent(current: number | boolean): number {
  if (typeof current === "boolean") return current ? 1 : 0
  return current
}

export function numericGoal(goal: number | boolean): number {
  if (typeof goal === "boolean") return goal ? 1 : 0
  return goal
}

export function numericBaseline(baseline: number | boolean): number {
  if (typeof baseline === "boolean") return baseline ? 1 : 0
  return baseline
}

/**
 * Compute 0..1 progress for a target. For ranking metrics where higher is
 * better (depth, systems-bugs-closed-inverted, polish boolean), return
 * (current - baseline) / (goal - baseline) clamped. For ranking metrics where
 * lower is better (breadth: draft count going down), invert.
 */
export function progressFraction(target: {
  id: string
  baseline: number | boolean
  goal: number | boolean
  current: number | boolean
}): number {
  const b = numericBaseline(target.baseline)
  const g = numericGoal(target.goal)
  const c = numericCurrent(target.current)
  if (b === g) return c ? 1 : 0
  const frac = (c - b) / (g - b)
  return Math.max(0, Math.min(1, frac))
}
