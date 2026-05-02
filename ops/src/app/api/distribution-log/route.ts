import { NextRequest, NextResponse } from "next/server"
import { getEntriesForWeek, togglePosted, mondayOf } from "@/lib/distribution-log"

/**
 * GET  /api/distribution-log?week=YYYY-MM-DD
 *      Returns all log entries for the week starting on the given date
 *      (Monday). If no week param, defaults to the week containing today.
 *
 * POST /api/distribution-log
 *      Body: { date: "YYYY-MM-DD", platform: string, slot: string }
 *      Toggles the posted/pending state for that slot. Returns the
 *      resulting status.
 */

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get("week")
  const weekStart = week || mondayOf(new Date().toISOString().slice(0, 10))
  const entries = getEntriesForWeek(weekStart)
  return NextResponse.json({ weekStart, entries })
}

export async function POST(req: NextRequest) {
  let body: { date?: string; platform?: string; slot?: string; note?: string; postUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const { date, platform, slot } = body
  if (!date || !platform || !slot) {
    return NextResponse.json({ error: "date, platform, and slot are required" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 })
  }
  const newStatus = togglePosted(date, platform, slot, { note: body.note, postUrl: body.postUrl })
  return NextResponse.json({ success: true, date, platform, slot, status: newStatus })
}
