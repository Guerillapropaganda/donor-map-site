import { NextResponse } from "next/server"
import { loadSprintState, mergeSprintState, type SprintState } from "@/lib/sprint-state"

// GET /api/sprint-state → full state, auto-creates if missing
export async function GET() {
  try {
    const state = await loadSprintState()
    return NextResponse.json(state)
  } catch (err) {
    console.error("[sprint-state GET]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to load sprint state" },
      { status: 500 }
    )
  }
}

// POST /api/sprint-state → merges a partial update into the state file
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SprintState>
    const next = await mergeSprintState(body)
    return NextResponse.json(next)
  } catch (err) {
    console.error("[sprint-state POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to merge sprint state" },
      { status: 500 }
    )
  }
}
