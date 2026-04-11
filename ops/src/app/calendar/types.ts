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
 * Live vault counts computed server-side from getLocalProfiles() and
 * passed into the Calendar. Used to drive the North Star progress bars
 * with real vault state instead of the static `current:` field in
 * sprint-schedule.md YAML.
 *
 * Before: `current: 3` for depth was hand-edited and lied whenever vault
 * state changed. After: verifiedCount reads straight from the file system.
 */
export interface LiveVaultCounts {
  verifiedCount: number  // profiles at content-readiness: verified
  sTierCount: number     // profiles at content-readiness: s-tier
  readyCount: number     // profiles at content-readiness: ready
  draftCount: number     // profiles at content-readiness: draft
  signoffQueue: number   // profiles with audit-a-plus-passed but no last-verified-by: editorial
  stampedTotal: number   // all profiles with audit-a-plus-passed (signed off + not yet)
}

/**
 * Given the static schedule.targets + live vault counts, return an
 * object with the effective `current` value for each target. This is
 * the bridge between "what YAML says" and "what the vault actually looks
 * like right now."
 */
export function effectiveTargetCurrent(
  target: { id: string; current: number | boolean },
  counts: LiveVaultCounts | undefined
): number | boolean {
  if (!counts) return target.current
  switch (target.id) {
    case "depth":
      // Depth = verified + s-tier profiles (both count as A+ or above)
      return counts.verifiedCount + counts.sTierCount
    case "breadth":
      // Breadth was originally "draft profiles promoted to ready tier" with a
      // decreasing-draft-count goal (288 → 188). Showing "ready profiles
      // currently at tier" is a clearer success metric per David's ask.
      return counts.readyCount + counts.verifiedCount + counts.sTierCount
    default:
      // systems / polish stay at the YAML value
      return target.current
  }
}

/**
 * Normalize date comparison. All dates are YYYY-MM-DD UTC strings.
 */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Assign every task to a specific day for rendering. Priority:
 *   1. `completed_date` — done tasks land on the day they were completed
 *   2. `scheduled` — explicit pin in sprint-schedule.md
 *   3. Cross-owner round-robin across ALL the phase's days so undated tasks
 *      spread evenly across every day in the phase, not just the first N days.
 *      (Per-owner round-robin left Apr 15-16 and Apr 20-23 empty.)
 *
 * Returns a map: date → Task[] (with phase + owner tacked on).
 */
export function tasksByDay(schedule: SprintSchedule): Record<string, (Task & { phase: string; owner: string })[]> {
  const map: Record<string, (Task & { phase: string; owner: string })[]> = {}

  for (const phase of schedule.phases) {
    const phaseTasks = schedule.phaseTasks[phase.id]
    if (!phaseTasks) continue

    // Enumerate every day within this phase for distribution.
    const phaseDays: string[] = []
    const start = new Date(phase.start + "T00:00:00Z")
    const end = new Date(phase.end + "T00:00:00Z")
    const cur = new Date(start)
    while (cur <= end) {
      phaseDays.push(cur.toISOString().slice(0, 10))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    const phaseDayCount = phaseDays.length || 1

    // Pass 1: place tasks that have an explicit date anchor.
    // Pass 2: collect undated tasks across ALL owners, then distribute
    //         round-robin so the full phase is populated, not just the first N days.
    const undated: (Task & { phase: string; owner: string })[] = []

    for (const [owner, list] of Object.entries(phaseTasks) as [string, Task[] | undefined][]) {
      if (!list) continue
      for (const task of list) {
        if (!task.id) continue
        if (task.completed_date) {
          const date = task.completed_date
          if (!map[date]) map[date] = []
          map[date].push({ ...task, phase: phase.id, owner })
        } else if (task.scheduled) {
          const date = task.scheduled
          if (!map[date]) map[date] = []
          map[date].push({ ...task, phase: phase.id, owner })
        } else {
          undated.push({ ...task, phase: phase.id, owner })
        }
      }
    }

    // Distribute undated tasks round-robin across all phase days.
    for (let i = 0; i < undated.length; i++) {
      const date = phaseDays[i % phaseDayCount]
      if (!map[date]) map[date] = []
      map[date].push(undated[i])
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
