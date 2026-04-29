/**
 * GET /api/money-trail/trails
 *
 * Money Trail rebuild (item #5 of handoff cc_p3_173). Trail-explorer
 * backed by the librarian's Graph.paths() — Thesis A (multi-hop money
 * flow) plus a Thesis C slice (capital_type filter on the source side).
 *
 * Two query modes:
 *
 *   1. Single source → single target (or open):
 *      ?from=<entity name>&to=<entity name>&max_hops=2
 *      Returns paths from `from` to `to` if both given. If `to` empty,
 *      returns the top monetary edges out of `from` as 1-hop trails
 *      (ranked by amount).
 *
 *   2. Capital-type group → single target (or open):
 *      ?capital_type=fossil-capital&to=<entity name>&max_hops=2
 *      Enumerates the top sources of the given capital_type by edge
 *      count, runs paths(source, target) for each, merges + ranks.
 *      `to` empty → top monetary edges from each source aggregated.
 *
 * Edge filter: defaults to money-shape edge types only — `monetary`,
 * `government-contract`, `federal-grant`. Pass `&edge_types=monetary`
 * to narrow further, or `&edge_types=all` to include `related`,
 * `affiliation`, etc.
 *
 * Rationale: 87,030 `monetary` + 943 `government-contract` + 37
 * `federal-grant` edges in the corpus (2026-04-29 count). The default
 * filter keeps the trail explorer focused on dollar-denominated edges
 * — the actual point of "money trail."
 *
 * Response shape:
 *   {
 *     trails: Trail[],     // ranked by total_amount desc
 *     stats: {
 *       sources_used: number,
 *       paths_found: number,
 *       capital_type_used: string | null,
 *     }
 *   }
 *
 * Auth: admin (per ops convention; data is canonical and local-only).
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"
import type { Edge, Node } from "../../../../../../lib/donor-map"

export const dynamic = "force-dynamic"

const DEFAULT_MONEY_TYPES = ["monetary", "government-contract", "federal-grant"]
// Cap on capital_type-mode source enumeration. Scales DOWN as hop depth
// rises because paths() BFS cost is super-linear in hops. Smoke-test
// 2026-04-29: hops=3 with 50 fossil sources took 190s on cold UI.
// Empirically, hops × sources should stay near 100 to keep p95 latency
// under ~5s. The schedule below capping at 50/30/15/8 keeps every
// hop level usable.
function maxSourcesForHops(hops: number): number {
  if (hops <= 1) return 50
  if (hops === 2) return 50
  if (hops === 3) return 8
  return 4  // hops >= 4
}
/** Soft cap on total trails accumulated across all sources before we stop
 * running more paths(). Prevents one big hub-target (Mike Johnson, Schumer)
 * from dragging deep-hop queries to multi-minute latencies. */
const TRAIL_BAILOUT = 300
const HARD_HOP_LIMIT = 4
const HARD_RESULT_LIMIT = 200

interface TrailEdge {
  id: string
  from: string
  to: string
  type: string
  role: string | null
  amount: number | null
  cycle: string | number | null
  confidence: number
  source: string
  source_url: string | null
  status: string
}

interface TrailNode {
  id: string
  name: string
  node_type: string
  capital_type: string | null
  profile_path: string | null
}

interface Trail {
  source: TrailNode
  target: TrailNode
  hops: number
  total_amount: number
  weight: number
  edges: TrailEdge[]
  nodes: TrailNode[]
}

function shapeEdge(e: Edge): TrailEdge {
  return {
    id: e.id,
    from: e.from_raw,
    to: e.to_raw,
    type: e.type,
    role: e.role,
    amount: e.amount,
    cycle: e.cycle,
    confidence: e.confidence,
    source: e.source,
    source_url: e.source_url,
    status: e.status,
  }
}

function shapeNode(n: Node, entityIndex: Map<string, Record<string, unknown>>): TrailNode {
  const entityId = n.ids?.entity_id || n.id
  const ent = entityIndex.get(entityId)
  return {
    id: n.id,
    name: n.name,
    node_type: n.type,
    capital_type: ent && typeof ent.capital_type === "string" ? ent.capital_type : null,
    profile_path: n.profile_path,
  }
}

function trailWeight(edges: Edge[]): number {
  // Mirror Graph paths() weighting: amount when present else confidence.
  // Used for ranking; total_amount is what the UI displays.
  let w = 0
  for (const e of edges) {
    if (typeof e.amount === "number" && Number.isFinite(e.amount)) w += e.amount
    else w += e.confidence
  }
  return w
}

function trailTotalAmount(edges: Edge[]): number {
  let t = 0
  for (const e of edges) if (typeof e.amount === "number" && Number.isFinite(e.amount)) t += e.amount
  return t
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const graph = getGraph()
  if (!graph) {
    return NextResponse.json({ error: "graph engine unavailable (loader returned empty stores)" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const fromName = (searchParams.get("from") || "").trim()
  const toName = (searchParams.get("to") || "").trim()
  const capitalType = (searchParams.get("capital_type") || "").trim()
  const maxHops = Math.min(HARD_HOP_LIMIT, Math.max(1, parseInt(searchParams.get("max_hops") || "2", 10)))
  const limit = Math.min(HARD_RESULT_LIMIT, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)))
  const edgeTypesParam = (searchParams.get("edge_types") || "").trim()

  let edgeTypes: string[] | undefined
  if (edgeTypesParam === "all") edgeTypes = undefined
  else if (edgeTypesParam) edgeTypes = edgeTypesParam.split(",").map((s) => s.trim()).filter(Boolean)
  else edgeTypes = DEFAULT_MONEY_TYPES

  if (!fromName && !capitalType) {
    return NextResponse.json(
      { error: "specify either `from` (entity name) or `capital_type` (group filter)" },
      { status: 400 },
    )
  }

  // Build an entity-id → entity record index so we can attach capital_type
  // to each Node we surface. Cheap — entities.jsonl is small.
  const entityIndex = new Map<string, Record<string, unknown>>()
  const fs = await import("node:fs")
  const path = await import("node:path")
  function findRepoRoot(start: string): string {
    let dir = start
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, "data", "entities.jsonl"))) return dir
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return start
  }
  const repoRoot = findRepoRoot(process.cwd())
  const entitiesPath = path.join(repoRoot, "data", "entities.jsonl")
  if (fs.existsSync(entitiesPath)) {
    for (const line of fs.readFileSync(entitiesPath, "utf-8").split(/\r?\n/)) {
      if (!line) continue
      try {
        const e = JSON.parse(line) as Record<string, unknown>
        if (typeof e.id === "string") entityIndex.set(e.id, e)
      } catch { /* skip */ }
    }
  }

  // ─── Build source list ────────────────────────────────────────────
  const sources: Node[] = []
  const seenIds = new Set<string>()

  if (fromName) {
    try {
      const node = graph.resolve(fromName)
      sources.push(node)
      seenIds.add(node.id)
    } catch (err) {
      return NextResponse.json(
        { error: `cannot resolve from='${fromName}': ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 },
      )
    }
  } else if (capitalType) {
    // Enumerate entities with this capital_type, rank by edge count.
    const candidates: Array<{ entity: Record<string, unknown>; edgeCount: number }> = []
    for (const e of entityIndex.values()) {
      if (e.capital_type !== capitalType) continue
      if (typeof e.id !== "string") continue
      try {
        const node = graph.resolve({ kind: "entity_id", value: e.id })
        const edgeCount = graph.neighbors(node.id, { status: "active" }).length
        candidates.push({ entity: e, edgeCount })
      } catch {
        // entity_id not in librarian (e.g. policy / event entities); skip
      }
    }
    candidates.sort((a, b) => b.edgeCount - a.edgeCount)
    const sourceCap = maxSourcesForHops(maxHops)
    const topCandidates = candidates.slice(0, sourceCap)
    for (const c of topCandidates) {
      try {
        const node = graph.resolve({ kind: "entity_id", value: c.entity.id as string })
        if (!seenIds.has(node.id)) {
          sources.push(node)
          seenIds.add(node.id)
        }
      } catch { /* skip */ }
    }
  }

  if (sources.length === 0) {
    return NextResponse.json(
      { trails: [], stats: { sources_used: 0, paths_found: 0, capital_type_used: capitalType || null } },
    )
  }

  // ─── Resolve target if given ──────────────────────────────────────
  let target: Node | null = null
  if (toName) {
    try {
      target = graph.resolve(toName)
    } catch (err) {
      return NextResponse.json(
        { error: `cannot resolve to='${toName}': ${err instanceof Error ? err.message : String(err)}` },
        { status: 400 },
      )
    }
  }

  // ─── Build trails ─────────────────────────────────────────────────
  const trails: Trail[] = []

  for (const src of sources) {
    // Bail if we've already collected enough trails — prevents hot
    // hub-targets from making 3+-hop queries unusable.
    if (trails.length >= TRAIL_BAILOUT) break
    if (target) {
      // Specific target: run paths(src, target). Inner limit kept tight
      // for deep-hop queries so paths()'s post-enumeration sort+slice
      // doesn't have to crawl an exploded path space.
      const innerLimit = maxHops >= 3 ? 10 : 50
      const ps = graph.paths(src.id, target.id, { max_hops: maxHops, edge_types: edgeTypes, limit: innerLimit })
      for (const p of ps) {
        if (p.hops === 0) continue  // src === target self-path; not a trail
        const nodes: TrailNode[] = p.nodes
          .map((nid) => graph.resolver.getById(nid))
          .filter((n): n is Node => n !== null)
          .map((n) => shapeNode(n, entityIndex))
        trails.push({
          source: shapeNode(src, entityIndex),
          target: shapeNode(target, entityIndex),
          hops: p.hops,
          total_amount: trailTotalAmount(p.edges),
          weight: p.weight,
          edges: p.edges.map(shapeEdge),
          nodes,
        })
      }
    } else {
      // No target: surface top monetary edges out of src as 1-hop trails.
      // This is the "show me what this donor funds" view.
      const out = graph.aggregate(src.id, { direction: "out", edge_types: edgeTypes, status: "active" })
      const sortedEdges = [...out.edges].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 10)
      for (const e of sortedEdges) {
        const otherNode = graph.resolver.getById(e.to_id)
        if (!otherNode) continue
        trails.push({
          source: shapeNode(src, entityIndex),
          target: shapeNode(otherNode, entityIndex),
          hops: 1,
          total_amount: typeof e.amount === "number" ? e.amount : 0,
          weight: trailWeight([e]),
          edges: [shapeEdge(e)],
          nodes: [shapeNode(src, entityIndex), shapeNode(otherNode, entityIndex)],
        })
      }
    }
  }

  // Rank by total_amount desc; tiebreak by weight desc, then fewer hops first
  trails.sort((a, b) => {
    if (b.total_amount !== a.total_amount) return b.total_amount - a.total_amount
    if (b.weight !== a.weight) return b.weight - a.weight
    return a.hops - b.hops
  })

  return NextResponse.json({
    trails: trails.slice(0, limit),
    stats: {
      sources_used: sources.length,
      paths_found: trails.length,
      capital_type_used: capitalType || null,
      max_hops: maxHops,
      edge_types: edgeTypes ?? "all",
    },
  })
}
