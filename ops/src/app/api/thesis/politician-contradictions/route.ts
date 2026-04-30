/**
 * GET /api/thesis/politician-contradictions?politician=<name>&congresses=<csv>&min_donor_amount=<N>
 *
 * ADR-0024 Phase 3 thesis query. Wraps Graph.politicianContradictions() —
 * finds votes where the politician voted differently from politicians their
 * top donors also fund. Reframed from the original "stated platform vs
 * donor want" definition (out of scope without scraping campaign promises).
 *
 * Auth: admin.
 */
import { NextRequest, NextResponse } from "next/server"
import * as fs from "node:fs"
import * as path from "node:path"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const graph = getGraph()
  if (!graph) return NextResponse.json({ error: "graph engine unavailable" }, { status: 503 })

  const { searchParams } = new URL(req.url)
  const politician = (searchParams.get("politician") || "").trim()
  if (!politician) return NextResponse.json({ error: "politician parameter required" }, { status: 400 })

  const congressesRaw = (searchParams.get("congresses") || "").trim()
  const congresses = congressesRaw
    ? congressesRaw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n))
    : undefined
  const min_donor_amount = Math.max(0, parseInt(searchParams.get("min_donor_amount") || "5000", 10))
  const top_n_donors = Math.min(50, Math.max(1, parseInt(searchParams.get("top_n_donors") || "10", 10)))
  const min_siblings_per_vote = Math.max(2, parseInt(searchParams.get("min_siblings_per_vote") || "3", 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)))

  // Resolve positions dir from cwd walk-up.
  let dir = process.cwd()
  let positionsDir: string | null = null
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "data", "legislator-positions")
    if (fs.existsSync(candidate)) { positionsDir = candidate; break }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  if (!positionsDir) {
    return NextResponse.json({ error: "data/legislator-positions/ not found from cwd" }, { status: 503 })
  }

  try {
    const result = graph.politicianContradictions(politician, {
      min_donor_amount,
      top_n_donors,
      min_siblings_per_vote,
      limit,
      congresses,
      data_dir: positionsDir,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 404 })
  }
}
