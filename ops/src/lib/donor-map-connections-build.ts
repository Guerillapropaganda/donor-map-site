/**
 * Librarian-backed builder for /api/connections.
 *
 * Per ADR-0024 cutover (2026-04-26): produces the same response shape
 * the route used to compute by walking content/ + loadEdges() + manual
 * direction flip + manual title-index. The librarian replaces the
 * title-index walk and the alias-resolution; we still need a thin
 * content/ walk for file mtimes (recentConnections sorting) since those
 * aren't carried in canonical stores.
 *
 * What changes vs legacy on identical canonical state:
 *   - profile count: 3,112 → 1,672 (only entities with profile_path)
 *   - related: -10,159 (drops wikilinks to non-entity targets — story
 *     drafts, index pages, news articles, real entities lacking records)
 *   - donors: +4,181 (FEC committee names fold onto candidate nodes —
 *     Andy Barr +85, Riley Moore +58, etc.)
 *   - stories: -2,393 (story-link edges to non-entity Events/Drafts files)
 *   - opposes: +38 (alias unification)
 *
 * Verification arc that produced the cutover decision:
 *   - donor-map-connections-shadow.ts (in-route shadow harness)
 *   - scripts/donor-map-connections-shadow-scan.cjs --diff (offline A/B)
 *   - independent ground-truth raw-edge count of Trump's neighborhood
 *     (cache=878=raw 878; librarian=615=neighbors+rollup 615; gap = 174
 *     related drops + 4 donors + 0 opposes + 68 stories drops, all of
 *     which are non-entity counterparties dropped per option 1).
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { getGraph } from "./donor-map-singleton"
import type { Edge, EdgeType, Node, NodeType } from "../../../lib/donor-map/types"

// ─── Response shape (preserved from legacy route) ───────────────────────

export interface Connection {
  source: string
  sourcePath: string
  sourceType: string
  target: string
  relationshipType: "related" | "donors" | "opposes" | "stories"
}

export interface ConnectedProfile {
  title: string
  path: string
  type: string
  connectionCount: number
  totalAmount: number
  related: string[]
  donors: string[]
  opposes: string[]
  stories: string[]
  contracts: string[]
  monetaryDetail: { name: string; amount: number; cycle: string }[]
}

export interface ConnectionsResponse {
  connections: Connection[]
  topConnected: ConnectedProfile[]
  unconnected: ConnectedProfile[]
  unconnectedCount: number
  recentConnections: Connection[]
  breakdown: { related: number; donors: number; opposes: number; stories: number; total: number }
  totalProfiles: number
  source: string
}

type LegacyType = "related" | "donors" | "opposes" | "stories" | "contracts"

// ─── Helpers ────────────────────────────────────────────────────────────

function mapToLegacyType(t: EdgeType): LegacyType | null {
  switch (t) {
    case "related": return "related"
    case "monetary": return "donors"
    case "political-opposition": return "opposes"
    case "story-link": return "stories"
    case "government-contract": return "contracts"
    default: return null
  }
}

/** Map librarian NodeType → the legacy display string the UI expects. */
function legacyTypeFromNode(n: Node): string {
  // Prefer a profile-path-derived folder hint so existing UI badge
  // logic ("media-profile" etc.) keeps working when entity_type doesn't
  // align 1:1.
  if (n.profile_path) {
    const folder = n.profile_path.replace(/^content\//, "").split("/")[0]
    if (folder === "Politicians") return "politician"
    if (folder === "Donors & Power Networks") return "donor"
    if (folder === "Think Tanks & Policy Groups") return "think-tank"
    if (folder.startsWith("Think Tanks")) return "think-tank"
    if (folder === "Lobbying Firms & K Street") return "lobbying-firm"
    if (folder.includes("Media")) return "media-profile"
  }
  // Fallback: librarian's NodeType
  const t: NodeType = n.type
  return t === "unknown" ? "unknown" : t
}

/** Same orientation flip as the legacy route, but with canonical names. */
function flipForLegacy(
  edge: Edge,
  canonicalNameById: Map<string, string>,
): { source: string; target: string; sourceId: string; targetId: string } {
  const fromName = canonicalNameById.get(edge.from_id) ?? edge.from_raw
  const toName = canonicalNameById.get(edge.to_id) ?? edge.to_raw
  if (edge.type === "monetary") {
    return { source: toName, target: fromName, sourceId: edge.to_id, targetId: edge.from_id }
  }
  return { source: fromName, target: toName, sourceId: edge.from_id, targetId: edge.to_id }
}

// ─── Builder ────────────────────────────────────────────────────────────

/**
 * Produce the connections-graph response from the librarian + a thin
 * mtime walk of content/ for recent-edges sorting. Returns null only on
 * librarian load failure — caller should surface a 5xx.
 */
export function buildConnectionsViaLibrarian(repoRoot: string): ConnectionsResponse | null {
  const g = getGraph()
  if (!g) return null

  // Canonical-name lookup for ALL nodes (incl. non-profile counterparties).
  const canonicalNameById = new Map<string, string>()
  for (const n of g.resolver.allNodes()) canonicalNameById.set(n.id, n.name)

  // Profile nodes — the only things that get a ConnectedProfile entry.
  const profileNodeIds = new Set<string>()
  const profileByTitle = new Map<string, ConnectedProfile>()
  const titleByNodeId = new Map<string, string>()
  for (const n of g.resolver.allNodes()) {
    if (!n.profile_path) continue
    profileNodeIds.add(n.id)
    titleByNodeId.set(n.id, n.name)
    profileByTitle.set(n.name, {
      title: n.name,
      path: n.profile_path,
      type: legacyTypeFromNode(n),
      connectionCount: 0,
      totalAmount: 0,
      related: [],
      donors: [],
      opposes: [],
      stories: [],
      contracts: [],
      monetaryDetail: [],
    })
  }

  // Bucket sets so we dedup before pushing into the array (legacy used
  // `if (!profile[legacyType].includes(target))`).
  const bucketSets = new Map<string, Record<LegacyType, Set<string>>>()
  function bucketsFor(title: string): Record<LegacyType, Set<string>> {
    let b = bucketSets.get(title)
    if (!b) {
      b = { related: new Set(), donors: new Set(), opposes: new Set(), stories: new Set(), contracts: new Set() }
      bucketSets.set(title, b)
    }
    return b
  }

  const connections: Connection[] = []
  const seenEdgeIds = new Set<string>()
  const breakdown = { related: 0, donors: 0, opposes: 0, stories: 0 }

  // Walk every active edge once via outgoing adjacency on each profile node.
  // Edges outgoing from non-profile nodes are reached via the bidirectional
  // reflection branch when their target is a profile.
  for (const nodeId of profileNodeIds) {
    const edges = g.neighbors(nodeId, { direction: "out", status: "active" })
    for (const edge of edges) {
      if (seenEdgeIds.has(edge.id)) continue
      seenEdgeIds.add(edge.id)
      const legacyType = mapToLegacyType(edge.type)
      if (!legacyType) continue

      const { source, target, sourceId, targetId } = flipForLegacy(edge, canonicalNameById)
      if (!profileNodeIds.has(sourceId)) continue

      const sourceProfile = profileByTitle.get(source)
      if (!sourceProfile) continue

      // Only emit a Connection row + breakdown count for the legacy 4-value
      // enum (contracts is bucketed but not surfaced in `connections[]`
      // or `breakdown` per the legacy route).
      if (legacyType !== "contracts") {
        connections.push({
          source,
          sourcePath: sourceProfile.path,
          sourceType: sourceProfile.type,
          target,
          relationshipType: legacyType,
        })
        breakdown[legacyType] += 1
      }

      // Bucket dedup
      const srcB = bucketsFor(source)
      if (!srcB[legacyType].has(target)) {
        srcB[legacyType].add(target)
        sourceProfile[legacyType].push(target)
        sourceProfile.connectionCount += 1
      }

      // Monetary aggregation — both source and target get the amount
      // (legacy route lines 273-286).
      const amt = typeof edge.amount === "number" && Number.isFinite(edge.amount) ? edge.amount : 0
      if (amt > 0 && (edge.type === "monetary" || edge.type === "government-contract")) {
        sourceProfile.totalAmount += amt
        sourceProfile.monetaryDetail.push({ name: target, amount: amt, cycle: edge.cycle != null ? String(edge.cycle) : "" })
        const targetTitle = titleByNodeId.get(targetId)
        if (targetTitle) {
          const tgtProfile = profileByTitle.get(targetTitle)
          if (tgtProfile) {
            tgtProfile.totalAmount += amt
            tgtProfile.monetaryDetail.push({ name: source, amount: amt, cycle: edge.cycle != null ? String(edge.cycle) : "" })
          }
        }
      }

      // Bidirectional reflection for symmetric-ish types.
      if (legacyType === "stories" || legacyType === "opposes" || legacyType === "related") {
        const targetTitle = titleByNodeId.get(targetId)
        if (targetTitle) {
          const tgtProfile = profileByTitle.get(targetTitle)
          const tgtB = bucketsFor(targetTitle)
          if (tgtProfile && !tgtB[legacyType].has(source)) {
            tgtB[legacyType].add(source)
            tgtProfile[legacyType].push(source)
            tgtProfile.connectionCount += 1
          }
        }
      }
    }
  }

  const allProfiles = Array.from(profileByTitle.values())
  const connected = allProfiles.filter((p) => p.connectionCount > 0)
  const unconnected = allProfiles.filter((p) => p.connectionCount === 0)
  const topConnected = [...connected].sort((a, b) => b.connectionCount - a.connectionCount)

  // Recent connections — same shape as legacy. We need file mtimes so
  // we walk content/ for stat only (no frontmatter parse). Match each
  // file path to the librarian profile by `profile_path`.
  const profileByPath = new Map<string, ConnectedProfile>()
  for (const p of allProfiles) profileByPath.set(p.path, p)

  const fileStats: { path: string; mtime: number }[] = []
  function statWalk(dir: string): void {
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (["Assets", "node_modules", ".obsidian", "Admin Notes", "Vault Maintenance"].includes(entry.name)) continue
          statWalk(full)
        } else if (entry.name.endsWith(".md") && !entry.name.startsWith("index")) {
          try {
            const rel = path.relative(repoRoot, full).replace(/\\/g, "/")
            // Only profiles the librarian knows about — saves work.
            if (!profileByPath.has(rel)) continue
            const m = fs.statSync(full).mtimeMs
            fileStats.push({ path: rel, mtime: m })
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      /* skip */
    }
  }
  statWalk(path.join(repoRoot, "content"))

  const recentFiles = fileStats.sort((a, b) => b.mtime - a.mtime).slice(0, 30)
  const recentConnections: Connection[] = []
  const seenRecent = new Set<string>()
  for (const { path: relPath } of recentFiles) {
    const profile = profileByPath.get(relPath)
    if (!profile || profile.connectionCount === 0) continue
    const emit = (targets: string[], relType: LegacyType): boolean => {
      for (const t of targets) {
        const k = `${profile.title}||${t}||${relType}`
        if (seenRecent.has(k)) continue
        seenRecent.add(k)
        if (relType === "contracts") continue // not in legacy `connections[]`
        recentConnections.push({
          source: profile.title,
          sourcePath: profile.path,
          sourceType: profile.type,
          target: t,
          relationshipType: relType,
        })
        if (recentConnections.length >= 40) return true
      }
      return false
    }
    if (emit(profile.related, "related")) break
    if (emit(profile.donors, "donors")) break
    if (emit(profile.opposes, "opposes")) break
  }

  return {
    connections,
    topConnected,
    unconnected: unconnected.slice(0, 100),
    unconnectedCount: unconnected.length,
    recentConnections,
    breakdown: { ...breakdown, total: connections.length },
    totalProfiles: allProfiles.length,
    source: "adr-0024-librarian",
  }
}
