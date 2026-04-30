/**
 * GET /api/thesis/influence-map?politician=<name>
 *
 * ADR-0024 Phase 3 thesis query. Wraps Graph.influenceMap() — donor-class
 * profile + honest data-gap signal for sponsorship/vote alignment.
 *
 * Auth: admin.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const graph = getGraph()
  if (!graph) {
    return NextResponse.json({ error: "graph engine unavailable" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const politician = (searchParams.get("politician") || "").trim()
  if (!politician) {
    return NextResponse.json({ error: "politician parameter required" }, { status: 400 })
  }

  try {
    const result = graph.influenceMap(politician)
    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
