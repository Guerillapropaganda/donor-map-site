/**
 * sources-store.ts — Ops TypeScript mirror of scripts/lib/sources-store.cjs
 *
 * Part of Phase 1 — Source Registry. Read + write access to data/sources.jsonl
 * for Ops API routes and server components. KEEP IN SYNC with the CJS copy;
 * any schema change requires the same edit in scripts/lib/sources-schema.cjs
 * and scripts/lib/sources-store.cjs.
 */
import fs from "fs"
import path from "path"

export type SourceStatus =
  | "unverified"
  | "live"
  | "dead"
  | "redirected"
  | "generic_orphan"
  | "archived"
  | "needs_review"
  | "paywall"

export const SOURCE_STATUSES: SourceStatus[] = [
  "unverified",
  "live",
  "dead",
  "redirected",
  "generic_orphan",
  "archived",
  "needs_review",
  "paywall",
]

export type SourceType =
  | "government_primary"
  | "government_secondary"
  | "court_record"
  | "news_major"
  | "news_regional"
  | "investigative"
  | "academic"
  | "trade_press"
  | "advocacy"
  | "social"
  | "company_direct"
  | "aggregator"
  | "archive"
  | "other"

export const SOURCE_TYPES: SourceType[] = [
  "government_primary",
  "government_secondary",
  "court_record",
  "news_major",
  "news_regional",
  "investigative",
  "academic",
  "trade_press",
  "advocacy",
  "social",
  "company_direct",
  "aggregator",
  "archive",
  "other",
]

export type Tier = 1 | 2 | 3 | 4 | null

export interface SourceRecord {
  id: string
  url: string
  canonical_url: string | null
  final_host: string | null
  title: string | null
  content_hash: string | null
  expected_strings: string[]
  tier: Tier
  source_type: SourceType
  entity_ref: string | null
  claim_ref: string | null
  status: SourceStatus
  first_seen: string
  last_checked: string | null
  last_verified_live: string | null
  archive_url: string | null
  editor_notes: string
}

// ─── File path resolution ─────────────────────────────────────────────

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "sources.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

export function getSourcesFilePath(): string {
  // Ops app typically runs from ops/ subdirectory. Walk up to find data/.
  const root = findRepoRoot(process.cwd())
  return path.join(root, "data", "sources.jsonl")
}

// ─── Read ─────────────────────────────────────────────────────────────

let _cache: SourceRecord[] | null = null
let _cachedPath: string | null = null

export function loadSources(): SourceRecord[] {
  const file = getSourcesFilePath()
  // Invalidate cache if the path changed (shouldn't happen in practice, but
  // protects against dev-server hot reloads that may cwd-flip).
  if (_cache !== null && _cachedPath === file) return _cache

  if (!fs.existsSync(file)) {
    _cache = []
    _cachedPath = file
    return _cache
  }

  const raw = fs.readFileSync(file, "utf-8")
  const records: SourceRecord[] = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      records.push(JSON.parse(trimmed) as SourceRecord)
    } catch {
      // skip malformed
    }
  }
  _cache = records
  _cachedPath = file
  return _cache
}

export function clearSourcesCache(): void {
  _cache = null
  _cachedPath = null
}

export function getSource(id: string): SourceRecord | null {
  const all = loadSources()
  return all.find((r) => r.id === id) ?? null
}

export interface QueryOpts {
  status?: SourceStatus
  tier?: Tier
  source_type?: SourceType
  entity_ref?: string
  host?: string
  search?: string
  limit?: number
  offset?: number
}

export interface QueryResult {
  total: number
  filtered: number
  returned: number
  sources: SourceRecord[]
}

export function querySources(opts: QueryOpts = {}): QueryResult {
  const all = loadSources()
  const total = all.length

  let filtered = all
  if (opts.status) filtered = filtered.filter((r) => r.status === opts.status)
  if (opts.tier !== undefined) filtered = filtered.filter((r) => r.tier === opts.tier)
  if (opts.source_type) filtered = filtered.filter((r) => r.source_type === opts.source_type)
  if (opts.entity_ref)
    filtered = filtered.filter((r) => r.entity_ref === opts.entity_ref)
  if (opts.host) {
    const host = opts.host.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.url.toLowerCase().includes(host) ||
        (r.final_host && r.final_host.toLowerCase().includes(host)),
    )
  }
  if (opts.search) {
    const q = opts.search.toLowerCase()
    filtered = filtered.filter(
      (r) =>
        r.url.toLowerCase().includes(q) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.entity_ref && r.entity_ref.toLowerCase().includes(q)),
    )
  }

  const filteredCount = filtered.length
  const offset = opts.offset ?? 0
  const limit = opts.limit ?? 100
  const page = filtered.slice(offset, offset + limit)

  return {
    total,
    filtered: filteredCount,
    returned: page.length,
    sources: page,
  }
}

export function countByStatus(): Record<SourceStatus, number> {
  const all = loadSources()
  const counts: Record<SourceStatus, number> = {
    unverified: 0,
    live: 0,
    dead: 0,
    redirected: 0,
    generic_orphan: 0,
    archived: 0,
    needs_review: 0,
    paywall: 0,
  }
  for (const r of all) counts[r.status] += 1
  return counts
}

// ─── Write ────────────────────────────────────────────────────────────

/**
 * Update a single source record's status and/or editor_notes.
 * Rewrites the full JSONL file atomically via a temp file.
 */
export function updateSourceStatus(
  id: string,
  patch: { status?: SourceStatus; editor_notes?: string },
): SourceRecord | null {
  const all = loadSources()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return null

  const rec = { ...all[idx] }
  if (patch.status !== undefined) rec.status = patch.status
  if (patch.editor_notes !== undefined) rec.editor_notes = patch.editor_notes
  rec.last_checked = new Date().toISOString()
  all[idx] = rec

  const file = getSourcesFilePath()
  const tmp = file + ".tmp"
  const out = all.map((r) => JSON.stringify(r)).join("\n") + "\n"
  fs.writeFileSync(tmp, out, "utf-8")
  fs.renameSync(tmp, file)
  _cache = all // keep cache in sync with what we just wrote
  return rec
}
