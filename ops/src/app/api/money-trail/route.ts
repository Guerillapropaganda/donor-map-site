import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { loadEdges } from "@/lib/relationships-store"

interface MoneyNode {
  id: string
  name: string
  type: string
  party?: string
  sector?: string
  degree: number
  bothSides: boolean
}

interface MoneyEdge {
  source: string
  target: string
  confidence: number
}

let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 300_000

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const repoRoot = path.resolve(process.cwd(), "..")
    const contentDir = path.join(repoRoot, "content")

    // Load all monetary edges from canonical store
    const allEdges = loadEdges()
    const monetaryEdges = allEdges.filter(e => e.type === "monetary" && e.status === "active")

    // Quick profile metadata scan for type/party/sector
    const profileMeta = new Map<string, { type: string; party?: string; sector?: string }>()
    function walkMeta(dir: string, depth = 0) {
      if (depth > 5) return
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (["Assets", "node_modules", ".obsidian", "Admin Notes", "Vault Maintenance", "Events"].includes(entry.name)) continue
            walkMeta(full, depth + 1)
          } else if (entry.name.endsWith(".md") && !entry.name.startsWith("index")) {
            try {
              const raw = fs.readFileSync(full, "utf-8")
              const m = raw.match(/^---\n([\s\S]*?)\n---/)
              if (!m) continue
              const fm = require("js-yaml").load(m[1]) as Record<string, unknown>
              const title = String(fm.title ?? entry.name.replace(".md", "")).replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
              const rel = path.relative(contentDir, full).replace(/\\/g, "/")
              const folder = rel.split("/")[0]
              let type = "unknown"
              if (folder === "Politicians") type = "politician"
              else if (folder.startsWith("Donors")) type = fm.type ? String(fm.type) : "donor"
              else if (folder.startsWith("Think")) type = "think-tank"
              else if (folder.startsWith("Lobbying")) type = "lobbying-firm"
              else if (folder.includes("Media")) type = "media-profile"
              profileMeta.set(title, {
                type: String(fm.type ?? type),
                party: fm.party ? String(fm.party) : undefined,
                sector: fm.sector ? String(fm.sector) : undefined,
              })
            } catch { /* skip */ }
          }
        }
      } catch { /* skip */ }
    }
    walkMeta(contentDir)

    // Build graph
    const nodeMap = new Map<string, MoneyNode>()
    const edges: MoneyEdge[] = []

    function ensureNode(name: string, edgeType?: string) {
      if (!nodeMap.has(name)) {
        const meta = profileMeta.get(name)
        nodeMap.set(name, {
          id: name, name,
          type: meta?.type ?? edgeType ?? "unknown",
          party: meta?.party, sector: meta?.sector,
          degree: 0, bothSides: false,
        })
      }
    }

    for (const edge of monetaryEdges) {
      ensureNode(edge.from, edge.from_type ?? undefined)
      ensureNode(edge.to, edge.to_type ?? undefined)
      nodeMap.get(edge.from)!.degree++
      nodeMap.get(edge.to)!.degree++
      edges.push({
        source: edge.from,
        target: edge.to,
        confidence: edge.confidence ?? 0.5,
      })
    }

    // Both-sides detection: non-politician nodes funding both D and R
    for (const [name, node] of nodeMap) {
      if (node.type === "politician") continue
      const parties = new Set<string>()
      for (const e of edges) {
        if (e.source === name) {
          const t = nodeMap.get(e.target)
          if (t?.party) parties.add(t.party)
        }
      }
      if (parties.has("Democrat") && parties.has("Republican")) {
        node.bothSides = true
      }
    }

    const nodes = Array.from(nodeMap.values())
    const bothSidesCount = nodes.filter(n => n.bothSides).length

    // Sector breakdown
    const sectorCounts: Record<string, number> = {}
    for (const n of nodes) {
      if (n.type !== "politician" && n.sector) {
        sectorCounts[n.sector] = (sectorCounts[n.sector] || 0) + 1
      }
    }

    const result = {
      nodes,
      edges,
      stats: {
        totalEdges: edges.length,
        totalNodes: nodes.length,
        totalDonors: nodes.filter(n => n.type !== "politician").length,
        totalPoliticians: nodes.filter(n => n.type === "politician").length,
        bothSidesCount,
        topSectors: Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
      },
    }

    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
