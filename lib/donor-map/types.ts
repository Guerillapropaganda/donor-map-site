/**
 * Donor-map graph engine — type definitions.
 *
 * Per ADR-0024: every read path goes through this library. Types here
 * are load-bearing for ops surfaces, the cache rebuilder, and any future
 * journalist-query tool. Schema changes touch this file first.
 */

// ─── Identifiers ────────────────────────────────────────────────────────

/** Vault-internal canonical id (e.g. "ent_000002"). */
export type EntityId = string

/** Bioguide id from data/legislator-registry.jsonl (e.g. "A000001"). */
export type BioguideId = string

/** FEC committee id from data/fec-committee-registry.json (e.g. "C00865444"). */
export type FecCommitteeId = string

/** Profile path relative to repo root (e.g. "content/Politicians/.../foo.md"). */
export type ProfilePath = string

/** A canonical node id used inside the in-memory graph. Always entity-style. */
export type NodeId = string

// ─── Node taxonomy ──────────────────────────────────────────────────────

/**
 * Top-level node kinds. Aligned with edge from_type / to_type as observed
 * in canonical stores: politician, donor, corporation, entity, meta, etc.
 * Kept as a string union but lenient at the boundary — unknown types load
 * as 'unknown' rather than throwing.
 */
export type NodeType =
  | "politician"
  | "donor"
  | "corporation"
  | "entity"
  | "policy"
  | "event"
  | "media"
  | "think-tank"
  | "meta"
  | "unknown"

/** A node in the in-memory graph. */
export interface Node {
  /** Stable node id — entity id when known, otherwise normalized name slug. */
  id: NodeId
  /** Human-readable canonical name. Matches edge `from`/`to` strings. */
  name: string
  type: NodeType
  /** Path to vault profile if one exists. */
  profile_path: ProfilePath | null
  /** Cross-system identifiers, all optional. */
  ids: {
    entity_id?: EntityId
    bioguide?: BioguideId
    fec_committee_ids?: FecCommitteeId[]
    fec_candidate_ids?: string[]
    ein?: string
  }
  /** All names this node answers to — primary name + aliases from registry. */
  aliases: string[]
  /** Any source-specific metadata kept around verbatim for downstream use. */
  meta: Record<string, unknown>
}

// ─── Edge taxonomy ──────────────────────────────────────────────────────

/**
 * Edge type as stored in canonical relationships.jsonl + derived/.
 * Open string at the boundary — TYPE_META in scripts/lib/relationship-edge-validator.cjs
 * is the canonical enumeration; we don't duplicate it here to avoid drift.
 */
export type EdgeType = string

export type EdgeStatus = "active" | "deprecated" | "disputed" | string

/**
 * A relationship edge, post-resolution.
 *
 * `from_id` / `to_id` are the resolver's verdict — the canonical NodeId
 * the raw `from` / `to` strings mapped to. Original strings are preserved
 * so consumers can audit the resolution.
 */
export interface Edge {
  id: string
  from_id: NodeId
  to_id: NodeId
  /** Original `from` string from the canonical store (typically a name). */
  from_raw: string
  to_raw: string
  type: EdgeType
  direction: "directed" | "undirected"
  confidence: number
  source: string
  source_url: string | null
  amount: number | null
  cycle: string | number | null
  date_range: unknown
  role: string | null
  evidence: string[]
  first_seen: string
  last_verified: string
  status: EdgeStatus
  /** Anything else from the source record — preserved without reshaping. */
  raw: Record<string, unknown>
}

// ─── Resolver inputs ────────────────────────────────────────────────────

/**
 * Inputs the resolver accepts. All routes return the same Node or throw
 * a typed UnresolvableError. Validation enforces global uniqueness:
 * a single bioguide or fec_committee_id may map to at most one node.
 */
export type ResolveInput =
  | { kind: "name"; value: string }
  | { kind: "entity_id"; value: EntityId }
  | { kind: "bioguide"; value: BioguideId }
  | { kind: "fec_committee"; value: FecCommitteeId }
  | { kind: "profile_path"; value: ProfilePath }

/** Convenience overload accepting a bare string and inferring the kind. */
export type ResolveArg = ResolveInput | string

// ─── Query options ──────────────────────────────────────────────────────

export interface NeighborsOpts {
  edge_types?: EdgeType[]
  /** Minimum edge confidence (default 0). */
  min_confidence?: number
  /** Status filter. 'active' (default), 'all', or specific status. */
  status?: EdgeStatus | "all"
  /** Direction relative to the seed: 'out' (from=seed), 'in' (to=seed), 'both' (default). */
  direction?: "out" | "in" | "both"
}

export interface AggregateOpts {
  /** Direction to aggregate. 'out' (default) sums where seed = from_id. */
  direction?: "out" | "in"
  edge_types?: EdgeType[]
  cycle?: string | number
  status?: EdgeStatus | "all"
  min_confidence?: number
}

export interface AggregateResult {
  edge_count: number
  total_amount: number
  /** Edges contributing to the aggregate, post-filter. */
  edges: Edge[]
}
