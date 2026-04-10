import { NextResponse } from "next/server"
import { updateDayState } from "@/lib/sprint-state"

// POST /api/sprint-state/day
// body: { date: "YYYY-MM-DD", actual_hours_worked?, crunch_day?, rest_half_day?, notes? }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      date?: string
      actual_hours_worked?: number
      crunch_day?: boolean
      rest_half_day?: boolean
      notes?: string
    }
    if (!body.date) {
      return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 })
    }
    const { date, ...patch } = body
    const next = await updateDayState(date, patch)
    return NextResponse.json(next)
  } catch (err) {
    console.error("[sprint-state/day POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to update day" },
      { status: 500 }
    )
  }
}
