/**
 * GET /api/thesis/policy-alignment?politician=<name>&policy_area=<str>&min_bills_per_area=<N>
 *
 * ADR-0024 Phase 3 thesis query. Wraps Graph.policyAlignment() — groups
 * a politician's sponsored bills by Congress.gov policy_area taxonomy and
 * returns support-rate stats per area.
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
  if (!politician) return NextResponse.json({ error: "politician parameter required" }, { status: 400 })

  const policy_area = (searchParams.get("policy_area") || "").trim() || undefined
  const min_bills_per_area = Math.max(1, parseInt(searchParams.get("min_bills_per_area") || "1", 10))

  try {
    const result = graph.policyAlignment(politician, { policy_area, min_bills_per_area })
    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
