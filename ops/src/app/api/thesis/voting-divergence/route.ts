/**
 * GET /api/thesis/voting-divergence?politician=<name>&congresses=<csv>
 *
 * ADR-0024 Phase 3 thesis query. Resolves the politician via the librarian,
 * then computes voting divergence (votes against same-party majority) by
 * streaming `data/legislator-positions/{N}.jsonl` from voteview.
 *
 * Note: Independents (party=I) and bioguides with only one same-party
 * peer in a chamber-cycle return 0% divergence by construction — there's
 * no "party majority" to diverge from. Surface this honestly to the
 * caller so they can label it correctly.
 *
 * Auth: admin.
 */
import { NextRequest, NextResponse } from "next/server"
import * as path from "node:path"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"
import { computeVotingDivergence } from "../../../../../../lib/donor-map"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const graph = getGraph()
  if (!graph) {
    return NextResponse.json({ error: "graph engine unavailable" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const politicianName = (searchParams.get("politician") || "").trim()
  if (!politicianName) {
    return NextResponse.json({ error: "politician parameter required" }, { status: 400 })
  }
  const congressesRaw = (searchParams.get("congresses") || "").trim()
  const congresses = congressesRaw
    ? congressesRaw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n))
    : undefined

  let politicianNode
  try {
    politicianNode = graph.resolve(politicianName)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Could not resolve politician: ${msg}` }, { status: 404 })
  }

  const bioguide = politicianNode.ids.bioguide
  if (!bioguide) {
    return NextResponse.json({
      error: `Resolved entity "${politicianNode.name}" has no bioguide id — voting positions are bioguide-keyed, so divergence cannot be computed for this profile.`,
    }, { status: 422 })
  }

  // Walk up from the ops cwd to the repo root so positions dir resolves
  // regardless of where the dev server was launched. Mirror of
  // donor-map-singleton's data-dir resolution.
  const fs = await import("node:fs")
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
    const result = computeVotingDivergence(bioguide, { data_dir: positionsDir, congresses })
    return NextResponse.json({
      ok: true,
      politician: { id: politicianNode.id, name: politicianNode.name, bioguide },
      result,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
