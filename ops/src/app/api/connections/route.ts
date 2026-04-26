/**
 * /api/connections — GET the current relationship graph
 *
 * As of ADR-0024 cutover (2026-04-26): the GET handler is now backed
 * by the librarian (lib/donor-map). Computed via
 * ops/src/lib/donor-map-connections-build.ts → buildConnectionsViaLibrarian.
 * The response shape is unchanged; what changed is the source of truth:
 *
 *   - Profiles: only entities with `profile_path` in entities.jsonl
 *     count as profiles (was: every md file walked from content/).
 *     Drops index pages, story drafts, interactive pages, etc. — they
 *     no longer appear as connection-graph nodes.
 *   - Aliases: FEC committee names ("ANDY BARR FOR SENATE, INC.")
 *     fold onto their candidate node ("Andy Barr") so duplicate
 *     cache keys (KAMALA HARRIS / KAMALA HARRIS FOR SENATE) collapse.
 *   - Edges: both endpoints must resolve to a librarian node, else
 *     the edge is dropped. Story-link edges to Events/Drafts files
 *     without entity records get filtered.
 *
 * The headline impact on flagship profiles' connection counts (computed
 * via the offline A/B diff scanner against the same canonical state):
 *   Trump 878 → 615   AIPAC 334 → 157   Bernie 301 → 201
 *   Riley M. Moore 41 → 99 (FEC committee folds in)
 *
 * Verification artifacts:
 *   - ops/src/lib/donor-map-connections-shadow.ts — runtime diff harness
 *   - scripts/donor-map-connections-shadow-scan.cjs --diff — offline A/B
 *   - Trump ground-truth raw-edge count: cache=878=raw 878,
 *     librarian=615=neighbors+rollup 615 (both mirrors verified faithful
 *     before cutover).
 *
 * Escape hatch: DONOR_MAP_LEGACY_CONNECTIONS=1 reverts to the previous
 * loadEdges()+content/-walk implementation. Kept for one session in case
 * of unexpected downstream regressions; safe to remove next session.
 *
 * POST/DELETE handlers are unchanged — they still write through
 * relationships-store.ts. See /api/relationships/route.ts.
 */
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import {
  loadEdges,
  clearEdgesCache,
  type RelationshipEdge,
  type RelationshipType,
} from "@/lib/relationships-store"
import { shadowConnectionsAndLog } from "@/lib/donor-map-connections-shadow"
import {
  buildConnectionsViaLibrarian,
  type Connection as LibConnection,
  type ConnectedProfile as LibConnectedProfile,
} from "@/lib/donor-map-connections-build"

// Re-export the legacy types under their original names so any external
// consumer importing them from this route still resolves.
export type Connection = LibConnection
export type ConnectedProfile = LibConnectedProfile

type LegacyType = "related" | "donors" | "opposes" | "stories" | "contracts"

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
}

// Cache for 2 minutes; cleared on invalidation from the relationships
// POST/DELETE route.
let cache: { data: unknown; timestamp: number } | null = null
const CACHE_TTL = 120_000
let lastInvalidation = 0

export async function GET() {
  // Check global invalidation flag set by /api/relationships POST/DELETE.
  const inv =
    ((globalThis as Record<string, unknown>).__connectionsInvalidated as number) || 0
  if (inv > lastInvalidation) {
    lastInvalidation = inv
    cache = null
    clearEdgesCache()
  }

  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }

  try {
    const repoRoot = getRepoRoot()

    // Escape hatch: legacy implementation, only if explicitly opted in.
    if (process.env.DONOR_MAP_LEGACY_CONNECTIONS === "1") {
      const legacyResult = buildConnectionsLegacy(repoRoot)
      cache = { data: legacyResult, timestamp: Date.now() }

      // Run the shadow comparator against legacy responses too — useful
      // for confirming both code paths still agree on whatever subset
      // of canonical state currently exists.
      if (process.env.DONOR_MAP_SHADOW_CONNECTIONS === "1") {
        void shadowConnectionsAndLog({
          topConnected: legacyResult.topConnected,
          unconnected: legacyResult.unconnected,
          unconnectedCount: legacyResult.unconnectedCount,
          totalProfiles: legacyResult.totalProfiles,
          breakdown: legacyResult.breakdown,
          connections: legacyResult.connections,
        })
      }
      return NextResponse.json(legacyResult)
    }

    // ─── Primary path (ADR-0024 librarian-backed) ───────────────────
    const result = buildConnectionsViaLibrarian(repoRoot)
    if (!result) {
      return NextResponse.json({ error: "librarian unavailable" }, { status: 503 })
    }
    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ─── Legacy implementation (escape hatch) ──────────────────────────────
// Preserved verbatim from the pre-cutover route so a single env var
// flips back. Will be removed next session if no regressions surface.

interface LegacyResponse {
  connections: LibConnection[]
  topConnected: LibConnectedProfile[]
  unconnected: LibConnectedProfile[]
  unconnectedCount: number
  recentConnections: LibConnection[]
  breakdown: { related: number; donors: number; opposes: number; stories: number; total: number }
  totalProfiles: number
  source: string
}

function typeFromFolder(folder: string): string {
  if (folder === "Politicians") return "politician"
  if (folder === "Donors & Power Networks") return "donor"
  if (folder === "Think Tanks & Policy Groups") return "think-tank"
  if (folder === "Lobbying Firms & K Street") return "lobbying-firm"
  if (folder.includes("Media")) return "media-profile"
  return "unknown"
}

function findMdFiles(dir: string): string[] {
  const results: string[] = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (["Assets", "node_modules", ".obsidian", "Admin Notes", "Vault Maintenance"].includes(entry.name)) continue
        results.push(...findMdFiles(full))
      } else if (entry.name.endsWith(".md") && !entry.name.startsWith("index")) {
        results.push(full)
      }
    }
  } catch {
    /* skip */
  }
  return results
}

function mapToLegacyType(t: RelationshipType | string): LegacyType | null {
  switch (t as string) {
    case "related": return "related"
    case "monetary": return "donors"
    case "political-opposition": return "opposes"
    case "story-link": return "stories"
    case "government-contract": return "contracts"
    default: return null
  }
}

function flipForLegacy(edge: RelationshipEdge): { source: string; target: string } {
  if ((edge.type as string) === "monetary") return { source: edge.to, target: edge.from }
  return { source: edge.from, target: edge.to }
}

function buildConnectionsLegacy(repoRoot: string): LegacyResponse {
  // Profile metadata walk
  const contentDir = path.join(repoRoot, "content")
  const files = findMdFiles(contentDir)
  const profileMeta = new Map<string, { title: string; path: string; type: string; mtime: number }>()
  const fileStats: { file: string; mtime: number }[] = []

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8")
      const { data: fm } = matter(content)
      const relPath = path.relative(repoRoot, file).replace(/\\/g, "/")
      const folder = relPath.replace("content/", "").split("/")[0]
      const rawTitle = (typeof fm.title === "string" && fm.title) || path.basename(file, ".md")
      const title = rawTitle.replace(/^_/, "").replace(/\s+Master Profile\s*$/i, "").trim()
      const type = (typeof fm.type === "string" && fm.type) || typeFromFolder(folder)
      const mtime = fs.statSync(file).mtimeMs
      profileMeta.set(title, { title, path: relPath, type, mtime })
      fileStats.push({ file, mtime })
    } catch {
      /* skip */
    }
  }

  const edges = loadEdges().filter((e) => e.status === "active")
  const connections: LibConnection[] = []
  const profileMap = new Map<string, LibConnectedProfile>()
  for (const [title, meta] of profileMeta) {
    profileMap.set(title, {
      title, path: meta.path, type: meta.type,
      connectionCount: 0, totalAmount: 0,
      related: [], donors: [], opposes: [], stories: [], contracts: [],
      monetaryDetail: [],
    })
  }

  for (const edge of edges) {
    const legacyType = mapToLegacyType(edge.type)
    if (!legacyType) continue
    const { source, target } = flipForLegacy(edge)
    const sourceMeta = profileMeta.get(source)
    if (!sourceMeta) continue

    if (legacyType !== "contracts") {
      connections.push({ source, sourcePath: sourceMeta.path, sourceType: sourceMeta.type, target, relationshipType: legacyType })
    }
    const profile = profileMap.get(source)
    if (profile && !profile[legacyType].includes(target)) {
      profile[legacyType].push(target)
      profile.connectionCount++
    }

    const amt = typeof edge.amount === "number" ? edge.amount : 0
    if (amt > 0 && ((edge.type as string) === "monetary" || (edge.type as string) === "government-contract")) {
      const srcProfile = profileMap.get(source)
      if (srcProfile) {
        srcProfile.totalAmount += amt
        srcProfile.monetaryDetail.push({ name: target, amount: amt, cycle: edge.cycle ?? "" })
      }
      const tgtProfile = profileMap.get(target)
      if (tgtProfile) {
        tgtProfile.totalAmount += amt
        tgtProfile.monetaryDetail.push({ name: source, amount: amt, cycle: edge.cycle ?? "" })
      }
    }

    if (legacyType === "stories" || legacyType === "opposes" || legacyType === "related") {
      const targetProfile = profileMap.get(target)
      if (targetProfile && !targetProfile[legacyType].includes(source)) {
        targetProfile[legacyType].push(source)
        targetProfile.connectionCount++
      }
    }
  }

  const allProfiles = Array.from(profileMap.values())
  const connected = allProfiles.filter((p) => p.connectionCount > 0)
  const unconnected = allProfiles.filter((p) => p.connectionCount === 0)
  const topConnected = [...connected].sort((a, b) => b.connectionCount - a.connectionCount)

  const recentFiles = [...fileStats].sort((a, b) => b.mtime - a.mtime).slice(0, 30)
  const recentConnections: LibConnection[] = []
  const seenRecent = new Set<string>()
  for (const { file } of recentFiles) {
    const relPath = path.relative(repoRoot, file).replace(/\\/g, "/")
    let matchedTitle: string | null = null
    for (const [t, m] of profileMeta) { if (m.path === relPath) { matchedTitle = t; break } }
    if (!matchedTitle) continue
    const profile = profileMap.get(matchedTitle)
    if (!profile || profile.connectionCount === 0) continue
    const emitFor = (targets: string[], relType: LegacyType) => {
      for (const t of targets) {
        const key = `${matchedTitle}||${t}||${relType}`
        if (seenRecent.has(key)) continue
        seenRecent.add(key)
        if (relType === "contracts") continue
        recentConnections.push({
          source: matchedTitle!, sourcePath: profile.path, sourceType: profile.type,
          target: t, relationshipType: relType,
        })
        if (recentConnections.length >= 40) return
      }
    }
    emitFor(profile.related, "related")
    if (recentConnections.length >= 40) break
    emitFor(profile.donors, "donors")
    if (recentConnections.length >= 40) break
    emitFor(profile.opposes, "opposes")
    if (recentConnections.length >= 40) break
  }

  const breakdown = {
    related: connections.filter((c) => c.relationshipType === "related").length,
    donors: connections.filter((c) => c.relationshipType === "donors").length,
    opposes: connections.filter((c) => c.relationshipType === "opposes").length,
    stories: connections.filter((c) => c.relationshipType === "stories").length,
    total: connections.length,
  }

  return {
    connections, topConnected,
    unconnected: unconnected.slice(0, 100),
    unconnectedCount: unconnected.length,
    recentConnections, breakdown,
    totalProfiles: allProfiles.length,
    source: "phase3-part3-jsonl-legacy-fallback",
  }
}
