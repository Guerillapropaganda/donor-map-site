/**
 * GET /api/thesis/class-profile?politician=<name>&top_donors_per_cluster=<N>
 *
 * ADR-0024 Phase 3 thesis query. Wraps Graph.classProfile() — donor base
 * grouped by capital_type + ideological_function tags.
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
  const topN = Math.min(50, Math.max(1, parseInt(searchParams.get("top_donors_per_cluster") || "10", 10)))

  try {
    const result = graph.classProfile(politician, { top_donors_per_cluster: topN })
    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
