/**
 * /api/connections — GET the current relationship graph
 *
 * As of Phase 3 Part 3 (2026-04-11), this route reads from the canonical
 * edge store at data/relationships.jsonl via ops/src/lib/relationships-store.ts
 * instead of walking content/ and parsing frontmatter. This unlocks the
 * ~7000 edges discovered by scripts/relationship-discovery.cjs that never
 * made it into profile frontmatter (most notably the 1,940 story-link edges
 * the scanner's wikilink-proximity strategies find — up from 17 in the
 * frontmatter-only migration).
 *
 * The response shape is UNCHANGED. Downstream consumers — the 1,477-line
 * /relationships page, Quartz components, any ops dashboard widgets —
 * continue to receive Connection[] / ConnectedProfile[] / breakdown /
 * etc. with the legacy relationshipType enum ("related" | "donors" |
 * "opposes" | "stories"). This is done by:
 *
 *   1. Loading edges via relationships-store.ts loadEdges()
 *   2. Mapping the Phase 3 type enum back to the legacy 4-value enum
 *      (monetary → donors, political-opposition → opposes, story-link
 *      → stories, related → related)
 *   3. Flipping monetary edge direction: JSONL stores
 *      {from: donor, to: politician, type: monetary}, but the legacy
 *      Connection shape has {source: politician, target: donor,
 *      relationshipType: "donors"} — it's "politician's view of its
 *      own donors" field. The flip preserves backward compatibility.
 *   4. Loading a quick profile metadata map (title → {path, type}) so
 *      sourcePath and sourceType can be populated from the endpoints.
 *      This is cheap — a single pass over content/.
 *
 * Phase 3 Part 3b (future) will retarget POST/DELETE to upsert JSONL
 * directly. Until then, those handlers still write frontmatter, and the
 * attention-dispatcher's 4-hour relationship-discovery run syncs new
 * frontmatter into the JSONL store.
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

// Legacy API shapes — kept identical to pre-Phase-3-Part-3 for
// downstream compatibility.
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
  related: string[]
  donors: string[]
  opposes: string[]
  stories: string[]
}

type LegacyType = "related" | "donors" | "opposes" | "stories"

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
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

interface ProfileMetadata {
  title: string
  path: string
  type: string
  mtime: number
}

/**
 * Build a title → ProfileMetadata map by walking content/. This is the
 * expensive part (~1,800 files parsed) but js-yaml is fast and the walk
 * takes under 2 seconds. We don't parse the body — just the frontmatter.
 */
function buildProfileMetadataMap(repoRoot: string): {
  byTitle: Map<string, ProfileMetadata>
  files: { file: string; mtime: number }[]
} {
  const contentDir = path.join(repoRoot, "content")
  const files = findMdFiles(contentDir)
  const byTitle = new Map<string, ProfileMetadata>()
  const fileStats: { file: string; mtime: number }[] = []

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8")
      const { data: fm } = matter(content)
      const relPath = path.relative(repoRoot, file).replace(/\\/g, "/")
      const folder = relPath.replace("content/", "").split("/")[0]
      const rawTitle =
        (typeof fm.title === "string" && fm.title) ||
        path.basename(file, ".md")
      // Normalize title: strip leading "_" and trailing " Master Profile"
      const title = rawTitle
        .replace(/^_/, "")
        .replace(/\s+Master Profile\s*$/i, "")
        .trim()
      const type =
        (typeof fm.type === "string" && fm.type) || typeFromFolder(folder)
      const mtime = fs.statSync(file).mtimeMs
      byTitle.set(title, { title, path: relPath, type, mtime })
      fileStats.push({ file, mtime })
    } catch {
      /* skip bad files */
    }
  }

  return { byTitle, files: fileStats }
}

/**
 * Map a Phase 3 relationship type to the legacy Connection enum.
 * Returns null for types that have no legacy equivalent
 * (staffing, media-appearance, affiliation, legal, family) — these
 * are dropped from the legacy API response.
 */
function mapToLegacyType(t: RelationshipType): LegacyType | null {
  switch (t) {
    case "related":
      return "related"
    case "monetary":
      return "donors"
    case "political-opposition":
      return "opposes"
    case "story-link":
      return "stories"
    default:
      return null
  }
}

/**
 * Flip the edge's endpoints if the legacy enum expects the reverse
 * direction. In the canonical JSONL, a monetary edge is:
 *
 *   {from: "Koch Industries" (donor), to: "Ted Cruz" (politician),
 *    type: "monetary"}
 *
 * But the legacy Connection shape expresses the same relationship as:
 *
 *   {source: "Ted Cruz", target: "Koch Industries",
 *    relationshipType: "donors"}
 *
 * because the old API model was "politician's view of its donors: field".
 * Monetary is the only type that needs flipping — related, opposes, and
 * story-link are all profile → target in both JSONL and legacy views.
 */
function flipForLegacy(edge: RelationshipEdge): { source: string; target: string } {
  if (edge.type === "monetary") {
    return { source: edge.to, target: edge.from }
  }
  return { source: edge.from, target: edge.to }
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
    const { byTitle: profileMeta, files: fileStats } = buildProfileMetadataMap(repoRoot)

    // Load all active edges from the canonical store.
    const edges = loadEdges().filter((e) => e.status === "active")

    // Build Connection[] and ConnectedProfile[]
    const connections: Connection[] = []
    const profileMap = new Map<string, ConnectedProfile>()

    // Initialize profileMap with every profile so unconnected profiles
    // get a zero-count entry.
    for (const [title, meta] of profileMeta) {
      profileMap.set(title, {
        title,
        path: meta.path,
        type: meta.type,
        connectionCount: 0,
        related: [],
        donors: [],
        opposes: [],
        stories: [],
      })
    }

    for (const edge of edges) {
      const legacyType = mapToLegacyType(edge.type)
      if (!legacyType) continue // Skip types with no legacy equivalent

      const { source, target } = flipForLegacy(edge)
      const sourceMeta = profileMeta.get(source)
      if (!sourceMeta) continue // Edge endpoint not in vault — skip

      connections.push({
        source,
        sourcePath: sourceMeta.path,
        sourceType: sourceMeta.type,
        target,
        relationshipType: legacyType,
      })

      // Aggregate into the source profile's bucket
      const profile = profileMap.get(source)
      if (profile) {
        profile[legacyType].push(target)
        profile.connectionCount++
      }

      // Bidirectional edges: if A→B exists, B should also see A.
      // - stories: target profile shows story that references it
      // - opposes: if Trump opposes Newsom, Newsom also opposes Trump
      // - related: symmetric by definition
      // - donors: NOT symmetric (monetary direction matters, handled by flipForLegacy)
      if (legacyType === "stories" || legacyType === "opposes" || legacyType === "related") {
        const targetProfile = profileMap.get(target)
        if (targetProfile && !targetProfile[legacyType].includes(source)) {
          targetProfile[legacyType].push(source)
          targetProfile.connectionCount++
        }
      }
    }

    // Stats
    const allProfiles = Array.from(profileMap.values())
    const connected = allProfiles.filter((p) => p.connectionCount > 0)
    const unconnected = allProfiles.filter((p) => p.connectionCount === 0)
    const topConnected = [...connected].sort(
      (a, b) => b.connectionCount - a.connectionCount,
    )

    // Recent connections: sort files by mtime, grab the top 30 most-
    // recently-modified profiles, emit each of their Connection rows
    // until we hit 40 connections.
    const recentFiles = [...fileStats].sort((a, b) => b.mtime - a.mtime).slice(0, 30)
    const recentConnections: Connection[] = []
    const seenRecent = new Set<string>()

    for (const { file } of recentFiles) {
      // Reverse-lookup: find the profile whose path matches this file
      const relPath = path.relative(repoRoot, file).replace(/\\/g, "/")
      let matchedTitle: string | null = null
      for (const [t, m] of profileMeta) {
        if (m.path === relPath) {
          matchedTitle = t
          break
        }
      }
      if (!matchedTitle) continue

      const profile = profileMap.get(matchedTitle)
      if (!profile || profile.connectionCount === 0) continue

      // Emit connections for this profile (related + donors + opposes)
      const emitFor = (targets: string[], relType: LegacyType) => {
        for (const t of targets) {
          const key = `${matchedTitle}||${t}||${relType}`
          if (seenRecent.has(key)) continue
          seenRecent.add(key)
          recentConnections.push({
            source: matchedTitle!,
            sourcePath: profile.path,
            sourceType: profile.type,
            target: t,
            relationshipType: relType,
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

    const result = {
      connections,
      topConnected,
      unconnected: unconnected.slice(0, 100),
      unconnectedCount: unconnected.length,
      recentConnections,
      breakdown,
      totalProfiles: allProfiles.length,
      // Phase 3 Part 3 signature so consumers can tell which route
      // version produced the response.
      source: "phase3-part3-jsonl",
    }

    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
