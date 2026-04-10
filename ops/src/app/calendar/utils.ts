// Client-safe pure helpers. Do NOT import anything from sprint-schedule-parser
// here — that module uses fs and cannot be bundled into client components.

import type { Phase, SprintMetadata } from "@/lib/sprint-schedule-parser"

/**
 * Given an ISO date string (YYYY-MM-DD), return the phase that contains it,
 * or null if it falls outside any phase.
 */
export function phaseForDate(phases: Phase[], isoDate: string): Phase | null {
  for (const p of phases) {
    if (isoDate >= p.start && isoDate <= p.end) return p
  }
  return null
}

/**
 * Enumerate every calendar date from sprint start to sprint end, inclusive.
 * Returned as YYYY-MM-DD strings in order.
 */
export function sprintDays(metadata: SprintMetadata): string[] {
  const out: string[] = []
  const start = new Date(metadata.start_date + "T00:00:00Z")
  const end = new Date(metadata.end_date + "T00:00:00Z")
  const cur = new Date(start)
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
