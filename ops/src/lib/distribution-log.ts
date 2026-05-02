import fs from "node:fs"
import path from "node:path"

/**
 * Distribution log · per-slot posted/not-posted tracking.
 *
 * Backing store: data/distribution-log.jsonl
 * One entry per (date, platform, slot) tuple. Cells with no entry are
 * implicitly "not-posted" / pending. Clicking a cell creates an entry
 * with status: "posted". Clicking again removes it.
 *
 * Slot strings come from the platform's `best-times` array in
 * distribution-schedule.md (e.g. "07:00", "12:00", "20:00", or special
 * tokens like "weekly Friday").
 *
 * Server pages and the API route both read/write through this lib.
 */

export interface LogEntry {
  /** YYYY-MM-DD */
  date: string
  /** platform id from the schedule (x, bluesky, threads, instagram, facebook, patreon) */
  platform: string
  /** slot identifier - typically a HH:MM time, can be any string */
  slot: string
  /** posted or pending; pending entries are normally just absent from the file */
  status: "posted" | "pending"
  /** ISO timestamp the slot was marked posted */
  postedAt?: string
  /** optional note David adds when logging */
  note?: string
  /** optional URL of the actual post on the platform */
  postUrl?: string
}

const STORE_PATH = path.join(process.cwd(), "..", "data", "distribution-log.jsonl")

export function readLog(): LogEntry[] {
  try {
    if (!fs.existsSync(STORE_PATH)) return []
    const text = fs.readFileSync(STORE_PATH, "utf-8")
    return text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l) as LogEntry
        } catch {
          return null
        }
      })
      .filter((x): x is LogEntry => x !== null)
  } catch {
    return []
  }
}

export function writeLog(entries: LogEntry[]) {
  const text = entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "")
  fs.writeFileSync(STORE_PATH, text, "utf-8")
}

function keyOf(e: { date: string; platform: string; slot: string }): string {
  return `${e.date}|${e.platform}|${e.slot}`
}

/**
 * Toggle the posted status for a given slot.
 * If the slot is not yet logged, mark it posted.
 * If it is already posted, remove the entry (revert to pending).
 * Returns the resulting status.
 */
export function togglePosted(date: string, platform: string, slot: string, opts?: { note?: string; postUrl?: string }): "posted" | "pending" {
  const all = readLog()
  const k = keyOf({ date, platform, slot })
  const idx = all.findIndex((e) => keyOf(e) === k)
  if (idx >= 0) {
    // already logged - remove
    all.splice(idx, 1)
    writeLog(all)
    return "pending"
  } else {
    const entry: LogEntry = {
      date,
      platform,
      slot,
      status: "posted",
      postedAt: new Date().toISOString(),
      note: opts?.note,
      postUrl: opts?.postUrl,
    }
    all.push(entry)
    writeLog(all)
    return "posted"
  }
}

export function getEntriesForWeek(weekStart: string): LogEntry[] {
  const start = new Date(weekStart + "T00:00:00Z")
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return readLog().filter((e) => {
    const d = new Date(e.date + "T00:00:00Z")
    return d >= start && d < end
  })
}

/** Return YYYY-MM-DD for the Monday on or before the given date. */
export function mondayOf(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z")
  const day = d.getUTCDay() // 0 = Sunday, 1 = Monday, ...
  const offset = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().slice(0, 10)
}

export function dayDates(weekStart: string): string[] {
  const start = new Date(weekStart + "T00:00:00Z")
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Compute weekly completion stats for the dashboard meter. */
export function computeWeekStats(weekStart: string, expectedSlotsByDay: Record<string, number>): { posted: number; expected: number; pct: number } {
  const entries = getEntriesForWeek(weekStart)
  const posted = entries.filter((e) => e.status === "posted").length
  const expected = Object.values(expectedSlotsByDay).reduce((a, b) => a + b, 0)
  const pct = expected > 0 ? Math.round((posted / expected) * 100) : 0
  return { posted, expected, pct }
}

/** Add or subtract N days from an ISO date (YYYY-MM-DD). */
export function shiftDate(dateIso: string, days: number): string {
  const d = new Date(dateIso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Recent weeks summary for the archive list.
 *
 * Returns the N most-recent week-Mondays (including the current week)
 * with the count of posted entries for each. Used to render the
 * "Past weeks" archive on the Cadence tab.
 */
export function listRecentWeeks(count: number, fromMondayIso?: string): Array<{ weekStart: string; postedCount: number }> {
  const startMon = fromMondayIso || mondayOf(new Date().toISOString().slice(0, 10))
  const entries = readLog()
  const out: Array<{ weekStart: string; postedCount: number }> = []
  for (let i = 0; i < count; i++) {
    const ws = shiftDate(startMon, -7 * i)
    const start = new Date(ws + "T00:00:00Z")
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 7)
    const inWeek = entries.filter((e) => {
      const d = new Date(e.date + "T00:00:00Z")
      return d >= start && d < end && e.status === "posted"
    })
    out.push({ weekStart: ws, postedCount: inWeek.length })
  }
  return out
}
