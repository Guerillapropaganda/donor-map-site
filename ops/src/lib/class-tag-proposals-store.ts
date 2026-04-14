/**
 * class-tag-proposals-store.ts — Ops TypeScript store for class tag proposals
 *
 * Part of Phase 2 — Query Engine MVP. Serves the Ops /class-tags review
 * surface that David uses to approve/reject/edit heuristic class tag
 * proposals at the 3-second-per-proposal target UX (decisions.md §Phase 2
 * launch decision #1, batch size 50 with position persistence).
 *
 * Read access to the full entities.jsonl store (via a pass-through) and
 * read/write access to the proposal queue at
 * data/entity-class-tags-proposed.jsonl. On approval, the tags get
 * written back onto the entity record in data/entities.jsonl via the
 * entities-store (not reimplemented here).
 *
 * NOTE: this file is TypeScript for the Ops Next app. The authoritative
 * CJS stores at scripts/lib/{entities-schema,entities-store}.cjs are the
 * single source of truth for schema. Keep in sync.
 */

import fs from "fs"
import path from "path"

// ─── Vocabulary (mirrors scripts/lib/entities-schema.cjs) ─────────────

export type CapitalType =
  | "fossil-capital"
  | "extractive-capital"
  | "finance-capital"
  | "rentier-capital"
  | "tech-monopoly"
  | "retail-monopoly"
  | "military-industrial"
  | "carceral-capital"
  | "pharma-capital"
  | "media-capital"
  | "agribusiness-capital"
  | "small-capital"
  | "professional-class"
  | "labor-aligned"
  | "dark-money-vehicle"
  | "mixed"

export const CAPITAL_TYPES: CapitalType[] = [
  "fossil-capital",
  "extractive-capital",
  "finance-capital",
  "rentier-capital",
  "tech-monopoly",
  "retail-monopoly",
  "military-industrial",
  "carceral-capital",
  "pharma-capital",
  "media-capital",
  "agribusiness-capital",
  "small-capital",
  "professional-class",
  "labor-aligned",
  "dark-money-vehicle",
  "mixed",
]

export type ClassPosition =
  | "ruling-class"
  | "upper-bourgeois"
  | "petty-bourgeois"
  | "labor-aligned"
  | "ambiguous"

export const CLASS_POSITIONS: ClassPosition[] = [
  "ruling-class",
  "upper-bourgeois",
  "petty-bourgeois",
  "labor-aligned",
  "ambiguous",
]

export type IdeologicalFunction =
  | "union-busting"
  | "climate-denial"
  | "deregulatory"
  | "libertarian-ideology"
  | "religious-right"
  | "carceral-expansion"
  | "imperialist-aligned"
  | "zionist-aligned"
  | "nativist"
  | "voter-suppression"
  | "privatization"
  | "austerity"
  | "anti-trust-defender"
  | "tax-avoidance-lobby"
  | "astroturf"
  | "dark-money-networked"
  | "progressive-capital"
  | "labor-organizing"
  | "electoral-left"
  | "movement-left"

export const IDEOLOGICAL_FUNCTIONS: IdeologicalFunction[] = [
  "union-busting",
  "climate-denial",
  "deregulatory",
  "libertarian-ideology",
  "religious-right",
  "carceral-expansion",
  "imperialist-aligned",
  "zionist-aligned",
  "nativist",
  "voter-suppression",
  "privatization",
  "austerity",
  "anti-trust-defender",
  "tax-avoidance-lobby",
  "astroturf",
  "dark-money-networked",
  "progressive-capital",
  "labor-organizing",
  "electoral-left",
  "movement-left",
]

export type WorkerRelationship =
  | "union-busting"
  | "union-hostile"
  | "low-wage-extractive"
  | "neutral"
  | "union-neutral-employer"
  | "union-aligned"
  | "worker-owned"

export const WORKER_RELATIONSHIPS: WorkerRelationship[] = [
  "union-busting",
  "union-hostile",
  "low-wage-extractive",
  "neutral",
  "union-neutral-employer",
  "union-aligned",
  "worker-owned",
]

// ─── Proposal schema ──────────────────────────────────────────────────

export type ProposalStatus = "pending" | "approved" | "rejected" | "edited"

export interface ProposedTags {
  capital_type: CapitalType | null
  secondary_capital_type: CapitalType | null
  class_position: ClassPosition | null
  ideological_function: IdeologicalFunction[]
  worker_relationship: WorkerRelationship | null
  policy_stakes: string[]
}

export interface Proposal {
  entity_id: string
  entity_name: string
  proposed_by: string
  proposed_at: string
  confidence: "high" | "medium" | "low"
  reasoning: string
  tags: ProposedTags
  status: ProposalStatus
  reviewed_at?: string | null
  reviewed_by?: string | null
  reject_reason?: string | null
}

// ─── Entity snapshot (pass-through for review context) ───────────────

export interface EntitySignalsSnapshot {
  id: string
  name: string
  entity_type: string
  profile_path: string | null
  signals: {
    sector?: string | null
    naics?: string | null
    total_political_spend?: number | null
    edge_count?: number
    top_politicians_funded?: Array<{ name: string; amount: number; count: number }>
    body_snippet?: string | null
    [k: string]: any
  }
}

// ─── File resolution ──────────────────────────────────────────────────

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "entities.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

function getProposalsPath(): string {
  const root = findRepoRoot(process.cwd())
  return path.join(root, "data", "entity-class-tags-proposed.jsonl")
}

function getEntitiesPath(): string {
  const root = findRepoRoot(process.cwd())
  return path.join(root, "data", "entities.jsonl")
}

// ─── Proposal reader ──────────────────────────────────────────────────

let _proposals: Proposal[] | null = null
let _proposalsPath: string | null = null

export function loadProposals(): Proposal[] {
  const file = getProposalsPath()
  if (_proposals !== null && _proposalsPath === file) return _proposals
  if (!fs.existsSync(file)) {
    _proposals = []
    _proposalsPath = file
    return _proposals
  }
  const raw = fs.readFileSync(file, "utf-8")
  const out: Proposal[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      out.push(JSON.parse(trimmed))
    } catch {}
  }
  _proposals = out
  _proposalsPath = file
  return _proposals
}

export function clearProposalsCache(): void {
  _proposals = null
  _proposalsPath = null
}

// ─── Entity signals reader ────────────────────────────────────────────

let _entityIndex: Map<string, EntitySignalsSnapshot> | null = null

function loadEntityIndex(): Map<string, EntitySignalsSnapshot> {
  if (_entityIndex) return _entityIndex
  const file = getEntitiesPath()
  const map = new Map<string, EntitySignalsSnapshot>()
  if (!fs.existsSync(file)) {
    _entityIndex = map
    return map
  }
  const raw = fs.readFileSync(file, "utf-8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const rec = JSON.parse(trimmed)
      if (rec && rec.id) {
        map.set(rec.id, {
          id: rec.id,
          name: rec.name,
          entity_type: rec.entity_type,
          profile_path: rec.profile_path,
          signals: rec.signals || {},
        })
      }
    } catch {}
  }
  _entityIndex = map
  return map
}

export function getEntitySnapshot(id: string): EntitySignalsSnapshot | null {
  return loadEntityIndex().get(id) || null
}

// ─── Query API ────────────────────────────────────────────────────────

export interface QueryOpts {
  status?: ProposalStatus
  confidence?: "high" | "medium" | "low"
  capital_type?: CapitalType
  search?: string
  limit?: number
  offset?: number
}

export interface QueryResult {
  total: number
  filtered: number
  returned: number
  proposals: Array<Proposal & { entity?: EntitySignalsSnapshot | null }>
  counts: Record<ProposalStatus, number>
  confidence_counts: Record<"high" | "medium" | "low", number>
}

export function queryProposals(opts: QueryOpts = {}): QueryResult {
  const all = loadProposals()
  const total = all.length

  const counts: Record<ProposalStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
    edited: 0,
  }
  const confidenceCounts: Record<"high" | "medium" | "low", number> = {
    high: 0,
    medium: 0,
    low: 0,
  }
  for (const p of all) {
    counts[p.status] = (counts[p.status] ?? 0) + 1
    if (p.confidence) confidenceCounts[p.confidence] = (confidenceCounts[p.confidence] ?? 0) + 1
  }

  let filtered = all
  if (opts.status) filtered = filtered.filter((p) => p.status === opts.status)
  if (opts.confidence) filtered = filtered.filter((p) => p.confidence === opts.confidence)
  if (opts.capital_type)
    filtered = filtered.filter((p) => p.tags.capital_type === opts.capital_type)
  if (opts.search) {
    const q = opts.search.toLowerCase()
    filtered = filtered.filter((p) => p.entity_name.toLowerCase().includes(q))
  }

  const filteredCount = filtered.length
  const offset = opts.offset ?? 0
  const limit = opts.limit ?? 50
  const page = filtered.slice(offset, offset + limit)

  // Attach entity snapshot for context
  const enriched = page.map((p) => ({
    ...p,
    entity: getEntitySnapshot(p.entity_id),
  }))

  return {
    total,
    filtered: filteredCount,
    returned: page.length,
    proposals: enriched,
    counts,
    confidence_counts: confidenceCounts,
  }
}

// ─── Mutation: update one proposal's status + optional tag overrides ─

export interface UpdateProposalPatch {
  status: ProposalStatus
  tags?: Partial<ProposedTags>
  reject_reason?: string
}

export function updateProposal(entityId: string, patch: UpdateProposalPatch): Proposal | null {
  const all = loadProposals()
  const idx = all.findIndex((p) => p.entity_id === entityId)
  if (idx === -1) return null

  const current = { ...all[idx] }
  current.status = patch.status
  current.reviewed_at = new Date().toISOString()
  current.reviewed_by = "david"

  if (patch.tags) {
    current.tags = { ...current.tags, ...patch.tags }
  }
  if (patch.reject_reason !== undefined) {
    current.reject_reason = patch.reject_reason || null
  }

  all[idx] = current

  // Rewrite the full file (acceptable at ~350 records)
  const file = getProposalsPath()
  const tmp = file + ".tmp"
  fs.writeFileSync(tmp, all.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8")
  fs.renameSync(tmp, file)
  _proposals = all

  return current
}

// ─── Apply an approved proposal to the entities.jsonl record ─────────

/**
 * Writes the approved tags onto the entity record in data/entities.jsonl.
 * Uses plain-file I/O rather than importing the CJS entities-store to
 * avoid cross-module (CJS ↔ ESM/TS) complications in the Next runtime.
 */
export function applyApprovedTagsToEntity(entityId: string, tags: ProposedTags): boolean {
  const file = getEntitiesPath()
  if (!fs.existsSync(file)) return false

  const raw = fs.readFileSync(file, "utf-8")
  const lines = raw.split(/\r?\n/)
  let found = false
  const updated = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return line
    try {
      const rec = JSON.parse(trimmed)
      if (rec.id === entityId) {
        rec.capital_type = tags.capital_type
        rec.secondary_capital_type = tags.secondary_capital_type
        rec.class_position = tags.class_position
        rec.ideological_function = tags.ideological_function || []
        rec.worker_relationship = tags.worker_relationship
        rec.policy_stakes = tags.policy_stakes || []
        rec.tags_approved = true
        rec.tags_approved_at = new Date().toISOString()
        rec.tags_approved_by = "david"
        rec.tags_proposed_by = "heuristic-v1"
        rec.last_updated = new Date().toISOString()
        found = true
        return JSON.stringify(rec)
      }
      return line
    } catch {
      return line
    }
  })

  if (!found) return false

  const tmp = file + ".tmp"
  fs.writeFileSync(tmp, updated.join("\n"), "utf-8")
  fs.renameSync(tmp, file)
  _entityIndex = null // invalidate
  return true
}
