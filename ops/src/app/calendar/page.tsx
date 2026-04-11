import { parseSprintSchedule, SprintScheduleNotFoundError } from "@/lib/sprint-schedule-parser"
import { loadSprintState } from "@/lib/sprint-state"
import { getLocalProfiles, hasLocalVault } from "@/lib/local-vault"
import type { LiveVaultCounts } from "./types"
import { Calendar } from "./Calendar"

// Server component — reads the schedule fresh on every request (no cache).
// If the schedule file is missing, renders a readable error per acceptance criteria.
export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * Compute the live vault counts that feed the North Star meters.
 * This is the piece David asked for: "the meters at the top should
 * show some type of progress" — they're driven by actual vault state,
 * not the static `current:` field in sprint-schedule.md YAML.
 */
function computeLiveCounts(): LiveVaultCounts {
  if (!hasLocalVault()) {
    return { verifiedCount: 0, sTierCount: 0, readyCount: 0, draftCount: 0, signoffQueue: 0, stampedTotal: 0 }
  }
  const profiles = getLocalProfiles()
  let verifiedCount = 0
  let sTierCount = 0
  let readyCount = 0
  let draftCount = 0
  let signoffQueue = 0
  let stampedTotal = 0
  for (const p of profiles) {
    if (p.contentReadiness === "verified") verifiedCount++
    else if (p.contentReadiness === "s-tier") sTierCount++
    else if (p.contentReadiness === "ready") readyCount++
    else if (p.contentReadiness === "draft") draftCount++
    // Janitor-stamped A+ queue (mechanically passed but not yet signed off)
    if (p.auditAPlusPassed) {
      stampedTotal++
      if (p.lastVerifiedBy !== "editorial") signoffQueue++
    }
  }
  return { verifiedCount, sTierCount, readyCount, draftCount, signoffQueue, stampedTotal }
}

export default async function CalendarPage() {
  try {
    const now = new Date()
    const serverTime = now.toISOString()
    const serverDate = serverTime.slice(0, 10)
    const [schedule, initialState] = await Promise.all([
      parseSprintSchedule(),
      loadSprintState(),
    ])
    const liveCounts = computeLiveCounts()
    return (
      <Calendar
        schedule={schedule}
        initialState={initialState}
        serverDate={serverDate}
        serverTime={serverTime}
        liveCounts={liveCounts}
      />
    )
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
