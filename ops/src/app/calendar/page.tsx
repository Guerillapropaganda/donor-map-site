import { parseSprintSchedule, SprintScheduleNotFoundError } from "@/lib/sprint-schedule-parser"
import { loadSprintState } from "@/lib/sprint-state"
import { Calendar } from "./Calendar"

// Server component — reads the schedule fresh on every request (no cache).
// If the schedule file is missing, renders a readable error per acceptance criteria.
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function CalendarPage() {
  try {
    const [schedule, initialState] = await Promise.all([
      parseSprintSchedule(),
      loadSprintState(),
    ])
    return <Calendar schedule={schedule} initialState={initialState} />
  } catch (err) {
    const message =
      err instanceof SprintScheduleNotFoundError
        ? err.message
        : err instanceof Error
        ? err.message
        : "unknown error loading sprint schedule"
    return (
      <div className="p-8">
        <div className="border border-[var(--color-red)] bg-[var(--color-bg-card)] p-6">
          <div className="text-xs tracking-widest text-[var(--color-red)] mb-2">
            SPRINT SCHEDULE ERROR
          </div>
          <div className="text-sm text-[var(--color-text)] font-mono">{message}</div>
          <div className="text-[11px] text-[var(--color-text-dim)] mt-4 font-mono">
            Expected file: content/Admin Notes/sprint-schedule.md
          </div>
        </div>
      </div>
    )
  }
}
