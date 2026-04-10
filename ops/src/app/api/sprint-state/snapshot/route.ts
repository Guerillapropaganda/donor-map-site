import { NextResponse } from "next/server"
import { appendMetricSnapshot, type MetricSnapshot } from "@/lib/sprint-state"

// POST /api/sprint-state/snapshot
// body: { timestamp: ISO string, metrics: MetricSnapshot }
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { timestamp?: string; metrics?: MetricSnapshot }
    if (!body.timestamp || !body.metrics) {
      return NextResponse.json({ error: "timestamp and metrics required" }, { status: 400 })
    }
    const next = await appendMetricSnapshot(body.timestamp, body.metrics)
    return NextResponse.json(next)
  } catch (err) {
    console.error("[sprint-state/snapshot POST]", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to append snapshot" },
      { status: 500 }
    )
  }
}
