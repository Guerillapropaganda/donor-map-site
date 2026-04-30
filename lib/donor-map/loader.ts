/**
 * Canonical-store loader for the donor-map graph engine.
 *
 * Reads the on-disk JSONL stores and assembles the raw inputs for the
 * resolver. No validation here — the resolver decides whether the data
 * is consistent enough to start.
 *
 * Mirrors the chunked-read pattern in scripts/lib/relationships-store.cjs
 * so the engine can handle derived files that exceed V8's ~512MB string cap.
 */
import * as fs from "node:fs"
import * as path from "node:path"

const READ_CHUNK = 64 * 1024 * 1024

/** Stream a JSONL file line-by-line, calling `onRecord` for each parsed object. */
export function readJsonl<T = unknown>(filePath: string, onRecord: (rec: T, lineNo: number) => void): void {
  if (!fs.existsSync(filePath)) return
  const fd = fs.openSync(filePath, "r")
  let lineNo = 0
  try {
    const size = fs.fstatSync(fd).size
    let offset = 0
    let carry = ""
    while (offset < size) {
      const len = Math.min(READ_CHUNK, size - offset)
      const buf = Buffer.alloc(len)
      fs.readSync(fd, buf, 0, len, offset)
      offset += len
      const chunk = carry + buf.toString("utf-8")
      const lines = chunk.split(/\r?\n/)
      carry = lines.pop() ?? ""
      for (const line of lines) {
        lineNo++
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          onRecord(JSON.parse(trimmed) as T, lineNo)
        } catch {
          // skip malformed lines — match relationships-store behavior
        }
      }
    }
    if (carry.trim()) {
      lineNo++
      try {
        onRecord(JSON.parse(carry.trim()) as T, lineNo)
      } catch {
        /* skip */
      }
    }
  } finally {
    fs.closeSync(fd)
  }
}

/** Read a JSONL file fully into memory. Convenience wrapper around readJsonl. */
export function loadJsonl<T = unknown>(filePath: string): T[] {
  const out: T[] = []
  readJsonl<T>(filePath, (rec) => out.push(rec))
  return out
}

// ─── Raw record shapes (loose typing — canonical stores are the truth) ──

export interface RawEntity {
  id: string
  name: string
  profile_path: string | null
  entity_type: string
  signals?: Record<string, unknown>
  // remaining fields preserved verbatim
  [key: string]: unknown
}

export interface RawEdge {
  id: string
  from: string
  to: string
  from_type?: string | null
  to_type?: string | null
  from_subcategory?: string | null
  to_subcategory?: string | null
  from_slug?: string | null
  to_slug?: string | null
  type: string
  direction?: "directed" | "undirected"
  confidence?: number
  source: string
  source_url?: string | null
  amount?: number | null
  cycle?: string | number | null
  date_range?: unknown
  role?: string | null
  evidence?: string[]
  first_seen?: string
  last_verified?: string
  status?: string
  [key: string]: unknown
}

export interface RawLegislator {
  bioguide: string
  name_official: string
  name_first?: string
  name_last?: string
  ids?: {
    bioguide?: string
    fec?: string[]
    [key: string]: unknown
  }
  current_term?: { state?: string; party?: string; chamber?: string } | null
  _status?: string
  [key: string]: unknown
}

export interface RawFecRegistryEntry {
  committee_id: string
  fec_name?: string
  vault_profile?: string | null
  vault_slug?: string | null
  aliases?: string[]
  candidate_ids?: string[]
  cycles?: number[]
  status?: string
  [key: string]: unknown
}

export interface RawPolicy {
  id: string
  slug?: string
  title: string
  category?: string
  plain_english?: string
  /** Tags that link policies to donor class-tag dimensions. */
  policy_stakes?: string[]
  [key: string]: unknown
}

export interface RawCanonicalStores {
  entities: RawEntity[]
  edges: RawEdge[]
  legislators: RawLegislator[]
  fec_registry: Record<string, RawFecRegistryEntry>
  /** ADR-0024 Phase 3: policies.jsonl loaded so policy nodes resolve. */
  policies: RawPolicy[]
  /** Path of every file actually read, for diagnostics. */
  files_read: string[]
}

export interface LoaderOptions {
  /** Repo-root data directory. Defaults to <pkg-root>/data. */
  data_dir?: string
  /** Skip derived/ files. Useful for fast tests against canonical edges only. */
  skip_derived?: boolean
}

/** Default data directory: walk up from this file to repo root + /data. */
function defaultDataDir(): string {
  // lib/donor-map/loader.ts → ../../data
  return path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "..", "..", "data")
}

/** Load every canonical store the graph engine reads. */
export function loadCanonicalStores(opts: LoaderOptions = {}): RawCanonicalStores {
  const dataDir = opts.data_dir ?? defaultDataDir()
  const filesRead: string[] = []

  // Entities
  const entitiesFile = path.join(dataDir, "entities.jsonl")
  const entities = loadJsonl<RawEntity>(entitiesFile)
  if (fs.existsSync(entitiesFile)) filesRead.push(entitiesFile)

  // Edges: canonical relationships.jsonl + every derived/*.jsonl
  const edgeFile = path.join(dataDir, "relationships.jsonl")
  const edges: RawEdge[] = []
  if (fs.existsSync(edgeFile)) {
    readJsonl<RawEdge>(edgeFile, (e) => edges.push(e))
    filesRead.push(edgeFile)
  }
  const derivedDir = path.join(dataDir, "derived")
  if (!opts.skip_derived && fs.existsSync(derivedDir)) {
    const derivedFiles = fs
      .readdirSync(derivedDir)
      .filter((f) => f.endsWith(".jsonl"))
      .sort()
    for (const f of derivedFiles) {
      const full = path.join(derivedDir, f)
      readJsonl<RawEdge>(full, (e) => edges.push(e))
      filesRead.push(full)
    }
  }

  // Legislators (bioguide registry)
  const legislatorsFile = path.join(dataDir, "legislator-registry.jsonl")
  const legislators = loadJsonl<RawLegislator>(legislatorsFile)
  if (fs.existsSync(legislatorsFile)) filesRead.push(legislatorsFile)

  // FEC committee registry — single JSON object, keyed by committee_id
  const fecRegistryFile = path.join(dataDir, "fec-committee-registry.json")
  let fecRegistry: Record<string, RawFecRegistryEntry> = {}
  if (fs.existsSync(fecRegistryFile)) {
    const raw = fs.readFileSync(fecRegistryFile, "utf-8")
    fecRegistry = JSON.parse(raw) as Record<string, RawFecRegistryEntry>
    filesRead.push(fecRegistryFile)
  }

  // Policies (ADR-0024 Phase 3)
  const policiesFile = path.join(dataDir, "policies.jsonl")
  const policies = loadJsonl<RawPolicy>(policiesFile)
  if (fs.existsSync(policiesFile)) filesRead.push(policiesFile)

  return { entities, edges, legislators, fec_registry: fecRegistry, policies, files_read: filesRead }
}
