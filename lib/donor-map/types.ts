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
  | "bill"
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

// ─── paths / subgraph / timeline (ADR-0024 plumbing layer phase 1) ─────

export interface PathsOpts {
  /** Maximum number of hops from `from` to `to` (default 3). */
  max_hops?: number
  edge_types?: EdgeType[]
  status?: EdgeStatus | "all"
  min_confidence?: number
  /** Maximum paths to return (default 25). Ranked by weight desc. */
  limit?: number
}

/**
 * One path through the graph from a source to a destination node.
 * Edges appear in traversal order; `weight` is the sum of per-edge
 * weights (amount when present, else confidence) used for ranking.
 */
export interface Path {
  from_id: NodeId
  to_id: NodeId
  hops: number
  weight: number
  edges: Edge[]
  /** Node ids visited, in order: [from_id, ..., to_id]. */
  nodes: NodeId[]
}

export interface SubgraphOpts {
  /** How many hops out from each seed to flood-fill (default 1). */
  max_hops?: number
  edge_types?: EdgeType[]
  status?: EdgeStatus | "all"
  min_confidence?: number
  /** Cap on total nodes returned. Beyond cap, result.truncated=true. */
  max_nodes?: number
}

export interface SubgraphResult {
  nodes: Node[]
  edges: Edge[]
  /** Set true if max_nodes was reached during the traversal. */
  truncated: boolean
}

export interface TimelineOpts {
  edge_types?: EdgeType[]
  cycle?: string | number
  status?: EdgeStatus | "all"
  min_confidence?: number
  direction?: "out" | "in" | "both"
  /** Maximum edges returned (default 500). */
  limit?: number
}

export interface TimelineEntry {
  edge: Edge
  /** Parsed first_seen timestamp; null if unparseable. */
  at: string | null
  /** The other endpoint of this edge from `seed`'s perspective. */
  counterparty: NodeId
}

// ─── Thesis layer (ADR-0024) ────────────────────────────────────────────

export interface DonorContradictionsOpts {
  /** Cycle to constrain the funded set. When omitted, all cycles count. */
  cycle?: string | number
  /** Minimum total dollars to a recipient before they qualify. Default 0. */
  min_total?: number
  status?: EdgeStatus | "all"
  min_confidence?: number
}

/**
 * One contradiction pair: two recipients the donor funded who also have
 * a `political-opposition` edge between them. Pairs are deduplicated
 * (undirected) and ranked by the smaller of the two totals — the
 * "both-sides" intensity heuristic.
 */
export interface DonorContradictionPair {
  a: Node
  b: Node
  total_to_a: number
  total_to_b: number
  /** Every political-opposition edge between a and b that justified the pair. */
  opposition_basis: Edge[]
}

export interface DonorContradictionsResult {
  donor: Node
  pairs: DonorContradictionPair[]
}

// ─── ADR-0024 Phase 3 thesis queries ──────────────────────────────────

export interface BothSidesDonorsOpts {
  status?: EdgeStatus | "all"
  min_confidence?: number
  /** Minimum dollars to EACH of the two opposing politicians. Default 0. */
  min_total_each?: number
  cycle?: string
  /** Cap on returned donors. Default 50. */
  limit?: number
}

export interface BothSidesDonorPair {
  donor: Node
  pol_a: Node
  pol_b: Node
  total_to_a: number
  total_to_b: number
  /** Both edges that justify the bothsides claim. */
  evidence: Edge[]
}

export interface BothSidesDonorsResult {
  pairs: BothSidesDonorPair[]
  /** True when the cap was hit and more candidates were truncated. */
  truncated: boolean
}

export interface ClassProfileOpts {
  status?: EdgeStatus | "all"
  cycle?: string
  /** Top-N donors per cluster. Default 10. */
  top_donors_per_cluster?: number
}

export interface ClassDonorCluster {
  /** capital_type or ideological_function value (e.g. "fossil-capital"). */
  cluster_key: string
  /** Which classification dimension this cluster represents. */
  dimension: "capital_type" | "ideological_function" | "policy_stake" | "unclassified"
  total_amount: number
  donor_count: number
  top_donors: Array<{ node: Node; amount: number }>
}

export interface ClassProfileResult {
  /** The politician whose donor base is profiled. */
  politician: Node
  total_in: number
  edge_count: number
  /** Donors aggregated by capital_type tag. */
  capital_clusters: ClassDonorCluster[]
  /** Donors aggregated by ideological_function tag. */
  ideological_clusters: ClassDonorCluster[]
  /** Donors with no class tags — counts as a data-gap signal. */
  unclassified: { total_amount: number; donor_count: number }
}

export interface InfluenceMapOpts {
  status?: EdgeStatus | "all"
  cycle?: string
  top_donors_per_cluster?: number
}

export interface InfluenceMapResult {
  politician: Node
  /** Same shape as classProfile — donor clusters by capital_type and ideological_function. */
  donor_class_profile: ClassProfileResult
  /** Sponsorship + vote-on-policy data when available; null when the
   * librarian has no such data ingested. */
  policy_signal: {
    available: boolean
    /** When available=true: per-policy alignment scores. */
    alignments?: Array<{
      policy_id: string
      policy_title: string
      score: number
      rationale: string
    }>
    /** When available=false: explanation of why, so callers can show
     * an honest "data gap" UI rather than fabricate alignments. */
    data_gaps: string[]
  }
  /** Convenience: the largest capital_type cluster (often the
   * single-line "this candidate is bankrolled by X" headline). */
  dominant_capital_cluster: ClassDonorCluster | null
}
