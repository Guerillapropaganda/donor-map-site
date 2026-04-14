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
import { execFileSync } from "node:child_process"

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

// ─── Legacy 4-value enum bridge ────────────────────────────────────────
//
// The Ops app's /relationships page and the /suggestions approve flow
// both speak the legacy 4-value enum: related | donors | opposes | stories.
// These helpers map legacy → Phase 3 RelationshipType and handle the
// donors-field semantic flip (legacy "fm.donors contains X" means X gave
// money TO the profile; canonical stores that as from=X, to=profile).
//
// Both /api/relationships and /api/suggestions call through these so the
// mapping logic stays in exactly one place.

export const LEGACY_RELATIONSHIP_TYPES = ["related", "donors", "opposes", "stories"] as const
export type LegacyRelationshipType = (typeof LEGACY_RELATIONSHIP_TYPES)[number]

export function legacyToPhase3Type(legacy: LegacyRelationshipType): RelationshipType {
  switch (legacy) {
    case "related":
      return "related"
    case "donors":
      return "monetary"
    case "opposes":
      return "political-opposition"
    case "stories":
      return "story-link"
  }
}

/**
 * Resolve canonical from/to titles for a legacy-field write.
 *
 * `editedTitle` is the profile whose frontmatter is being modified;
 * `addedTitle` is the wikilink being appended to that field.
 *
 * For "donors", the edited profile's `donors:` field listing means the
 * added entity donates TO the edited profile, so the canonical edge
 * stores {from: added, to: edited}. All other legacy types keep their
 * natural direction (edited → added).
 */
export function endpointsForLegacyWrite(
  legacy: LegacyRelationshipType,
  editedTitle: string,
  addedTitle: string,
): { from: string; to: string } {
  if (legacy === "donors") return { from: addedTitle, to: editedTitle }
  return { from: editedTitle, to: addedTitle }
}

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

// ─── Write helpers (Phase 3 Part 3b) ───────────────────────────────────
//
// These shell out to the CJS store via a Node subprocess. Same pattern
// as /api/rulebook checkIds: Turbopack can't statically analyze dynamic
// require() calls, and Next's server bundle resolution doesn't reliably
// handle absolute Windows paths via createRequire. A plain `node -e`
// subprocess is the simplest reliable path to the canonical CJS store
// while keeping the schema logic in a single place.
//
// Cost: ~50-150ms per call (Node startup + tiny script evaluation).
// These are user-initiated actions (clicks on the /relationships page),
// not a hot path, so the cost is fine. For batch writes, call upsertEdges
// directly in a long-running Node process instead.

function resolveCjsStorePath(): string {
  const candidates = [
    path.resolve(process.cwd(), "..", "scripts", "lib", "relationships-store.cjs"),
    path.resolve(process.cwd(), "scripts", "lib", "relationships-store.cjs"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

interface UpsertResult {
  added: number
  updated: number
  skipped: number
  invalid: number
  total: number
  errors: Array<{ id?: string; from?: string; to?: string; type?: string; error?: string }>
}

interface StatusFlipResult {
  ok: boolean
  existed: boolean
  total: number
  error?: string
}

function resolveCjsValidatorPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "..", "scripts", "lib", "relationship-edge-validator.cjs"),
    path.resolve(process.cwd(), "scripts", "lib", "relationship-edge-validator.cjs"),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return candidates[0]
}

export interface BuildEdgeInput {
  from: string
  to: string
  type: RelationshipType
  source: RelationshipSource
  confidence: number
  source_url?: string | null
  evidence?: string[] | null
  amount?: number | null
  cycle?: string | null
  date_range?: string | null
  role?: string | null
}

/**
 * Build a schema-complete RelationshipEdge from minimal input. Handles:
 *   - title normalization (strip leading "_" and trailing " Master Profile")
 *   - type + subcategory resolution from the canonical title index
 *   - direction lookup from TYPE_META (directed vs undirected)
 *   - canonical from<to order for undirected edges
 *   - deterministic id hash via computeEdgeId
 *   - first_seen / last_verified / status defaults
 *
 * Shells out to the CJS validator once. Returns a full edge ready for
 * upsertEdge(), or null if either endpoint can't be resolved in the
 * title index (caller should treat as a user error).
 */
export function buildEdge(input: BuildEdgeInput): RelationshipEdge | null {
  const storePath = resolveCjsStorePath()
  const validatorPath = resolveCjsValidatorPath()
  const expr =
    `const v=require(${JSON.stringify(validatorPath)});` +
    `const input=${JSON.stringify(input)};` +
    `const idx=v.buildTitleIndex();` +
    `const fromTitle=v.normalizeTitle(input.from);` +
    `const toTitle=v.normalizeTitle(input.to);` +
    `const fromEntry=idx.get(fromTitle);` +
    `const toEntry=idx.get(toTitle);` +
    `if(!fromEntry||!toEntry){process.stdout.write('null');process.exit(0);}` +
    `if(Array.isArray(fromEntry)||Array.isArray(toEntry)){process.stdout.write('null');process.exit(0);}` +
    `const meta=v.TYPE_META[input.type];` +
    `const direction=meta&&meta.directed===false?'undirected':'directed';` +
    `let edge={id:'',from:fromTitle,from_slug:null,from_type:fromEntry.type,from_subcategory:fromEntry.subcategory,to:toTitle,to_slug:null,to_type:toEntry.type,to_subcategory:toEntry.subcategory,type:input.type,direction,confidence:input.confidence,source:input.source,source_url:input.source_url||null,evidence:input.evidence||null,amount:typeof input.amount==='number'?input.amount:null,cycle:input.cycle||null,date_range:input.date_range||null,role:input.role||null,first_seen:new Date().toISOString(),last_verified:new Date().toISOString(),status:'active'};` +
    `if(meta&&meta.directed===false&&edge.from>edge.to){const tf=edge.from,tft=edge.from_type,tfs=edge.from_subcategory;edge.from=edge.to;edge.from_type=edge.to_type;edge.from_subcategory=edge.to_subcategory;edge.to=tf;edge.to_type=tft;edge.to_subcategory=tfs;}` +
    `edge.id=v.computeEdgeId(edge);` +
    `process.stdout.write(JSON.stringify(edge));`
  try {
    const out = execFileSync("node", ["-e", expr], {
      encoding: "utf-8",
      windowsHide: true,
    })
    if (out.trim() === "null") return null
    return JSON.parse(out) as RelationshipEdge
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return null
  }
  // storePath is referenced to silence unused-var warnings in case of
  // future refactors; buildEdge currently only uses validatorPath.
  void storePath
}

/**
 * Upsert a single edge into the canonical store. Shells out to the
 * CJS upsertEdges helper via a Node subprocess. The caller is
 * responsible for building a schema-complete edge (all required fields
 * present). The server-side CJS validator will reject malformed edges
 * and return them in the `errors` array — check result.invalid.
 *
 * After a successful upsert, calls clearEdgesCache() so the next
 * loadEdges() call reflects the new state.
 */
export function upsertEdge(edge: Partial<RelationshipEdge>): UpsertResult {
  const storePath = resolveCjsStorePath()
  const expr =
    `const s=require(${JSON.stringify(storePath)});` +
    `const edge=${JSON.stringify(edge)};` +
    `process.stdout.write(JSON.stringify(s.upsertEdges([edge])));`
  const out = execFileSync("node", ["-e", expr], {
    encoding: "utf-8",
    windowsHide: true,
  })
  const result = JSON.parse(out) as UpsertResult
  clearEdgesCache()
  return result
}

/**
 * Flip an edge's status to "deprecated" and bump last_verified.
 * Soft-delete: the edge stays in the file for audit trail but is
 * filtered out of the default loadEdges view.
 */
export function deprecateEdge(edgeId: string): StatusFlipResult {
  const storePath = resolveCjsStorePath()
  const expr =
    `const s=require(${JSON.stringify(storePath)});` +
    `process.stdout.write(JSON.stringify(s.deprecateEdge(${JSON.stringify(edgeId)})));`
  const out = execFileSync("node", ["-e", expr], {
    encoding: "utf-8",
    windowsHide: true,
  })
  const result = JSON.parse(out) as StatusFlipResult
  clearEdgesCache()
  return result
}

/**
 * Flip an edge's status back to "active". Use this when a user
 * explicitly un-deprecates through the Ops UI. The scanner will NOT
 * auto-un-deprecate via upsertEdges (that's a one-way rule), so this
 * is the only path back to active.
 */
export function activateEdge(edgeId: string): StatusFlipResult {
  const storePath = resolveCjsStorePath()
  const expr =
    `const s=require(${JSON.stringify(storePath)});` +
    `process.stdout.write(JSON.stringify(s.activateEdge(${JSON.stringify(edgeId)})));`
  const out = execFileSync("node", ["-e", expr], {
    encoding: "utf-8",
    windowsHide: true,
  })
  const result = JSON.parse(out) as StatusFlipResult
  clearEdgesCache()
  return result
}
