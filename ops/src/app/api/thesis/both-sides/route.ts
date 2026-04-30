/**
 * GET /api/thesis/both-sides?min_total_each=<N>&limit=<N>
 *
 * ADR-0024 Phase 3 thesis query. Wraps Graph.bothSidesDonors() — donors
 * who funded politicians on opposite sides of an opposition pair.
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
  const minEach = Math.max(0, parseInt(searchParams.get("min_total_each") || "1000", 10))
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))

  try {
    const result = graph.bothSidesDonors({ min_total_each: minEach, limit })
    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
