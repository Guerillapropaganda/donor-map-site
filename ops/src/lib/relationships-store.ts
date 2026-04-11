/**
 * relationships-store.ts — TypeScript mirror of scripts/lib/relationships-store.cjs
 *
 * Part of Phase 3 (Data Model Only) — Central Relationship Edge Store.
 *
 * Consumed by the Ops app (API routes, server components, future /relationships
 * page rewire). KEEP IN SYNC with the CJS copy. Any schema change here requires
 * the same edit in scripts/lib/relationships-store.cjs and
 * scripts/lib/relationship-edge-validator.cjs.
 */
import fs from "fs"
import path from "path"

// ─── Shared schema types ───────────────────────────────────────────────

export type RelationshipType =
  | "monetary"
  | "political-support"
  | "political-opposition"
  | "staffing"
  | "media-appearance"
  | "story-link"
  | "affiliation"
  | "legal"
  | "family"
  | "related"

export type RelationshipSource =
  | "fec-api"
  | "lda-api"
  | "propublica-nonprofit"
  | "sec-edgar"
  | "congress-api"
  | "usaspending"
  | "doj-press"
  | "govtrack"
  | "discovery-scanner"
  | "connection-suggester"
  | "contradiction-scanner"
  | "frontmatter-migration"
  | "body-migration-april-9"
  | "manual-ops"
  | "research-claude"

export type RelationshipStatus = "active" | "historical" | "disputed" | "deprecated"

export type RelationshipDirection = "directed" | "undirected"

export interface RelationshipEdge {
  id: string
  from: string
  from_slug?: string | null
  from_type: string
  from_subcategory?: string | null
  to: string
  to_slug?: string | null
  to_type: string
  to_subcategory?: string | null
  type: RelationshipType
  direction: RelationshipDirection
  confidence: number
  source: RelationshipSource
  source_url?: string | null
  evidence?: string[] | null
  amount?: number | null
  cycle?: string | null
  date_range?: string | null
  role?: string | null
  first_seen: string
  last_verified: string
  status: RelationshipStatus
}

// Must match TYPE_META.directed in relationship-edge-validator.cjs
const UNDIRECTED_TYPES: Set<RelationshipType> = new Set(["family"])

// ─── File resolution + cache ───────────────────────────────────────────

// Resolve from the ops working directory (process.cwd() is ops/ when the
// dev server runs) or from the repo root if running a standalone script.
function resolveEdgeFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), "..", "data", "relationships.jsonl"),
    path.resolve(process.cwd(), "data", "relationships.jsonl"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

let _cache: RelationshipEdge[] | null = null

export function loadEdges(): RelationshipEdge[] {
  if (_cache) return _cache
  const file = resolveEdgeFilePath()
  if (!fs.existsSync(file)) {
    _cache = []
    return _cache
  }
  const raw = fs.readFileSync(file, "utf-8")
  const edges: RelationshipEdge[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      edges.push(JSON.parse(trimmed) as RelationshipEdge)
    } catch {
      // Skip malformed lines. Pre-commit sentinel should have blocked these.
    }
  }
  _cache = edges
  return _cache
}

export function clearEdgesCache(): void {
  _cache = null
}

// ─── Query helpers ─────────────────────────────────────────────────────

export interface EdgeQueryOpts {
  status?: RelationshipStatus | "all"
  min_confidence?: number
}

function applyOpts(edges: RelationshipEdge[], opts: EdgeQueryOpts = {}): RelationshipEdge[] {
  const status = opts.status || "active"
  const minConf = typeof opts.min_confidence === "number" ? opts.min_confidence : 0
  return edges.filter((e) => {
    if (status !== "all" && e.status !== status) return false
    if (typeof e.confidence === "number" && e.confidence < minConf) return false
    return true
  })
}

export function getEdgesFrom(title: string, opts?: EdgeQueryOpts): RelationshipEdge[] {
  return applyOpts(
    loadEdges().filter((e) => {
      if (e.from === title) return true
      if (e.to === title && UNDIRECTED_TYPES.has(e.type)) return true
      return false
    }),
    opts,
  )
}

export function getEdgesTo(title: string, opts?: EdgeQueryOpts): RelationshipEdge[] {
  return applyOpts(
    loadEdges().filter((e) => {
      if (e.to === title) return true
      if (e.from === title && UNDIRECTED_TYPES.has(e.type)) return true
      return false
    }),
    opts,
  )
}

export function getEdgesByType(type: RelationshipType, opts?: EdgeQueryOpts): RelationshipEdge[] {
  return applyOpts(
    loadEdges().filter((e) => e.type === type),
    opts,
  )
}

export function findEdge(id: string): RelationshipEdge | null {
  return loadEdges().find((e) => e.id === id) || null
}

export interface EdgeFilter extends EdgeQueryOpts {
  from?: string
  to?: string
  from_type?: string
  to_type?: string
  from_subcategory?: string
  to_subcategory?: string
  type?: RelationshipType
  source?: RelationshipSource
  cycle?: string
}

export function queryEdges(filter: EdgeFilter = {}): RelationshipEdge[] {
  const status = filter.status || "active"
  const minConf = typeof filter.min_confidence === "number" ? filter.min_confidence : 0
  return loadEdges().filter((e) => {
    if (filter.from !== undefined && e.from !== filter.from) return false
    if (filter.to !== undefined && e.to !== filter.to) return false
    if (filter.from_type !== undefined && e.from_type !== filter.from_type) return false
    if (filter.to_type !== undefined && e.to_type !== filter.to_type) return false
    if (filter.from_subcategory !== undefined && e.from_subcategory !== filter.from_subcategory)
      return false
    if (filter.to_subcategory !== undefined && e.to_subcategory !== filter.to_subcategory)
      return false
    if (filter.type !== undefined && e.type !== filter.type) return false
    if (filter.source !== undefined && e.source !== filter.source) return false
    if (filter.cycle !== undefined && e.cycle !== filter.cycle) return false
    if (status !== "all" && e.status !== status) return false
    if (typeof e.confidence === "number" && e.confidence < minConf) return false
    return true
  })
}

export function countEdges(opts?: EdgeQueryOpts): number {
  return applyOpts(loadEdges(), opts).length
}
