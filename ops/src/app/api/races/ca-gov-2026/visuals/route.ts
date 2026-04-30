/**
 * GET /api/races/ca-gov-2026/visuals
 *
 * Cal-Access-derived visualization data for the CA-Gov 2026 race:
 *   - sankey:  donor → IE PAC → candidate flow (top-N per PAC, all candidates)
 *   - structure: per-candidate breakdown of {federal, direct, ie_support, ie_oppose}
 *
 * Reads the override map for committee → candidate mapping and the
 * librarian for edges. Frontmatter is NOT consulted (cal-access skipped
 * the cache rebuild — see Pipeline Guide section 5).
 *
 * Auth: admin.
 */
import { NextRequest, NextResponse } from "next/server"
import * as fs from "node:fs"
import * as path from "node:path"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"

export const dynamic = "force-dynamic"

interface OverrideCommittee {
  filer_id: string
  name: string
  role: string
}
interface OverrideCandidate {
  controlled?: OverrideCommittee[]
  ie_supporting?: OverrideCommittee[]
  ie_opposing?: OverrideCommittee[]
}
interface OverrideFile {
  candidates: Record<string, OverrideCandidate>
}

interface SankeyNode {
  id: string
  name: string
  layer: "donor" | "pac" | "candidate"
}
interface SankeyLink {
  source: string
  target: string
  value: number
  ie_role?: "supporting" | "opposing"
}

interface StructureRow {
  candidate: string
  federal: number
  ca_direct: number
  ie_supporting: number
  ie_opposing: number
}

function findRepoRoot(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, "data", "relationships.jsonl"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return path.resolve(process.cwd(), "..")
}

function loadOverrides(repoRoot: string): OverrideFile | null {
  const file = path.join(repoRoot, "data", "cal-access-filer-overrides.json")
  if (!fs.existsSync(file)) return null
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as OverrideFile
  } catch {
    return null
  }
}

// Cap to keep the sankey readable — top N donors per PAC, top N PACs per
// candidate. Without caps, retail-donor candidates (Porter, Hilton)
// produce thousand-node diagrams that read as visual mush.
const TOP_DONORS_PER_PAC = 6
const TOP_PACS_PER_CANDIDATE = 4
// Min link value to show. Drops noise.
const MIN_LINK_USD = 100_000

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  // Cycle filter — default 2026 per audit Remediation #1.
  const url = new URL(req.url)
  const cycleParam = (url.searchParams.get("cycle") || "2026").trim()
  const cycleFilter = cycleParam === "all" ? null : cycleParam
  const cycleMatches = (e: { cycle?: string | null }) =>
    cycleFilter === null || e.cycle === cycleFilter

  const repoRoot = findRepoRoot()
  const overrides = loadOverrides(repoRoot)
  if (!overrides) {
    return NextResponse.json({ error: "cal-access-filer-overrides.json missing" }, { status: 500 })
  }

  const graph = getGraph()
  if (!graph) {
    return NextResponse.json({ error: "librarian unavailable" }, { status: 500 })
  }

  const candidates = Object.keys(overrides.candidates)
  const sankeyNodes = new Map<string, SankeyNode>()
  const sankeyLinks: SankeyLink[] = []
  const structure: StructureRow[] = []

  function nodeId(layer: SankeyNode["layer"], name: string): string {
    return `${layer}::${name}`
  }
  function ensureNode(layer: SankeyNode["layer"], name: string): string {
    const id = nodeId(layer, name)
    if (!sankeyNodes.has(id)) sankeyNodes.set(id, { id, name, layer })
    return id
  }

  for (const candidate of candidates) {
    const candData = overrides.candidates[candidate]
    let federal = 0
    let caDirect = 0
    let ieSup = 0
    let ieOpp = 0

    // Federal + CA direct: incoming monetary on the candidate's canonical node
    try {
      const moneyIn = graph.aggregate(candidate, {
        direction: "in",
        edge_types: ["monetary"],
      })
      for (const e of moneyIn.edges) {
        if (!cycleMatches(e)) continue
        const amt = e.amount ?? 0
        if (e.source === "cal-access-bulk") caDirect += amt
        else federal += amt
      }
    } catch {
      // candidate doesn't resolve in librarian — skip
    }

    // IE PAC totals: walk each known IE committee for this candidate
    for (const role of ["ie_supporting", "ie_opposing"] as const) {
      for (const committee of candData[role] ?? []) {
        try {
          const ieMoney = graph.aggregate(committee.name, {
            direction: "in",
            edge_types: ["monetary"],
          })
          const caEdges = ieMoney.edges.filter((e) => e.source === "cal-access-bulk" && cycleMatches(e))
          const total = caEdges.reduce((s, e) => s + (e.amount ?? 0), 0)
          if (role === "ie_supporting") ieSup += total
          else ieOpp += total

          // Build sankey: donor → PAC → candidate
          if (caEdges.length > 0 && total >= MIN_LINK_USD) {
            // Aggregate by donor
            const byDonor = new Map<string, number>()
            for (const e of caEdges) {
              if (!e.from_raw) continue
              byDonor.set(e.from_raw, (byDonor.get(e.from_raw) ?? 0) + (e.amount ?? 0))
            }
            // Top N donors per PAC
            const topDonors = [...byDonor.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, TOP_DONORS_PER_PAC)
              .filter(([, amt]) => amt >= MIN_LINK_USD)

            if (topDonors.length === 0) continue

            const pacNode = ensureNode("pac", committee.name)
            const candNode = ensureNode("candidate", candidate)
            for (const [donor, amt] of topDonors) {
              const donorNode = ensureNode("donor", donor)
              sankeyLinks.push({
                source: donorNode,
                target: pacNode,
                value: amt,
                ie_role: role === "ie_supporting" ? "supporting" : "opposing",
              })
            }
            // PAC → candidate link uses sum of the donor flows we kept
            // (so the sankey conserves flow). Width matches the visible donors.
            const visibleSum = topDonors.reduce((s, [, amt]) => s + amt, 0)
            sankeyLinks.push({
              source: pacNode,
              target: candNode,
              value: visibleSum,
              ie_role: role === "ie_supporting" ? "supporting" : "opposing",
            })
          }
        } catch {
          // committee not resolvable — skip
        }
      }
    }

    structure.push({
      candidate,
      federal: Math.round(federal),
      ca_direct: Math.round(caDirect),
      ie_supporting: Math.round(ieSup),
      ie_opposing: Math.round(ieOpp),
    })
  }

  // Cap PACs per candidate (drop the smallest below threshold) — top-N
  // logic on the PAC→candidate side. We keep the top PACs by value.
  const pacToCandidateLinks = sankeyLinks.filter((l) => l.source.startsWith("pac::"))
  const pacByCandidate = new Map<string, SankeyLink[]>()
  for (const link of pacToCandidateLinks) {
    const cand = link.target
    if (!pacByCandidate.has(cand)) pacByCandidate.set(cand, [])
    pacByCandidate.get(cand)!.push(link)
  }
  const keptPacs = new Set<string>()
  for (const [, list] of pacByCandidate) {
    list.sort((a, b) => b.value - a.value)
    for (const link of list.slice(0, TOP_PACS_PER_CANDIDATE)) keptPacs.add(link.source)
  }

  // Filter to kept PACs (drops both donor→PAC and PAC→candidate links)
  const filteredLinks = sankeyLinks.filter((l) => {
    if (l.source.startsWith("pac::")) return keptPacs.has(l.source)
    if (l.target.startsWith("pac::")) return keptPacs.has(l.target)
    return true
  })

  // Drop unused nodes after filtering
  const usedIds = new Set<string>()
  for (const l of filteredLinks) {
    usedIds.add(l.source)
    usedIds.add(l.target)
  }
  const filteredNodes = [...sankeyNodes.values()].filter((n) => usedIds.has(n.id))

  // Sort structure by total descending
  structure.sort(
    (a, b) =>
      (b.federal + b.ca_direct + b.ie_supporting + b.ie_opposing) -
      (a.federal + a.ca_direct + a.ie_supporting + a.ie_opposing),
  )

  return NextResponse.json({
    race: "CA Governor 2026",
    cycle_filter: cycleFilter ?? "all",
    cycle_filter_default: "2026",
    sankey: {
      nodes: filteredNodes,
      links: filteredLinks,
      caps: {
        top_donors_per_pac: TOP_DONORS_PER_PAC,
        top_pacs_per_candidate: TOP_PACS_PER_CANDIDATE,
        min_link_usd: MIN_LINK_USD,
      },
    },
    structure,
  })
}
