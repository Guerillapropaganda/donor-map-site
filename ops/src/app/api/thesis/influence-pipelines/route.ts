/**
 * GET /api/thesis/influence-pipelines?seed=<name>&max_hops=<N>&limit=<N>&terminal_types=<csv>
 *
 * ADR-0024 Phase 3 thesis query. Wraps Graph.influencePipelines() — fan-out
 * from a seed node, returns the strongest path to each reachable terminal.
 *
 * Auth: admin.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"
import type { NodeType } from "../../../../../../lib/donor-map"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const graph = getGraph()
  if (!graph) {
    return NextResponse.json({ error: "graph engine unavailable" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const seed = (searchParams.get("seed") || "").trim()
  if (!seed) return NextResponse.json({ error: "seed parameter required" }, { status: 400 })

  const maxHops = Math.min(4, Math.max(1, parseInt(searchParams.get("max_hops") || "2", 10)))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)))
  const terminalTypesRaw = (searchParams.get("terminal_types") || "").trim()
  const terminal_types = terminalTypesRaw ? (terminalTypesRaw.split(",").map((s) => s.trim()).filter(Boolean) as NodeType[]) : undefined

  try {
    const result = graph.influencePipelines(seed, { max_hops: maxHops, limit, terminal_types })
    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
