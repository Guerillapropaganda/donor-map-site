/**
 * Graph — the engine itself.
 *
 * Construction loads canonical stores, builds the Resolver (which performs
 * validation + throws on inconsistency), and indexes edges into adjacency
 * lists keyed by NodeId. Queries are constant-time / linear in result size.
 *
 * Per ADR-0024 plumbing layer: this skeleton ships resolve / neighbors /
 * aggregate. paths / subgraph / timeline are deferred to follow-up sessions
 * along with the thesis-layer queries.
 */
import { loadCanonicalStores, type LoaderOptions, type RawCanonicalStores, type RawEdge } from "./loader"
import { Resolver } from "./resolver"
import type {
  AggregateOpts,
  AggregateResult,
  Edge,
  EdgeStatus,
  EdgeType,
  NeighborsOpts,
  Node,
  NodeId,
  ResolveArg,
} from "./types"

export interface GraphStats {
  nodes: number
  edges: number
  edges_by_status: Record<string, number>
  files_read: string[]
}

export class Graph {
  readonly resolver: Resolver
  /** All edges, post-resolution. Indexed by id below. */
  private readonly edges: Edge[] = []
  /** NodeId → outgoing edge indexes (into this.edges). */
  private readonly outIdx = new Map<NodeId, number[]>()
  /** NodeId → incoming edge indexes. */
  private readonly inIdx = new Map<NodeId, number[]>()
  private readonly stores: RawCanonicalStores
  /** Edges whose endpoints could not be resolved — kept for diagnostics. */
  readonly unresolved_edges: { edge: RawEdge; missing: "from" | "to" | "both" }[] = []

  constructor(stores: RawCanonicalStores) {
    this.stores = stores
    this.resolver = new Resolver(stores)
    this.indexEdges(stores.edges)
  }

  /** Convenience: load canonical stores from disk and build the graph. */
  static load(opts?: LoaderOptions): Graph {
    return new Graph(loadCanonicalStores(opts))
  }

  // ─── Plumbing queries (ADR-0024) ───────────────────────────────────

  resolve(input: ResolveArg): Node {
    return this.resolver.resolve(input)
  }

  /**
   * Edges directly connected to `seed`.
   *
   * Defaults: direction='both', status='active', min_confidence=0,
   * no edge-type filter.
   */
  neighbors(seed: ResolveArg, opts: NeighborsOpts = {}): Edge[] {
    const node = this.resolver.resolve(seed)
    const direction = opts.direction ?? "both"
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const typeSet = opts.edge_types ? new Set(opts.edge_types) : null

    const idxs = new Set<number>()
    if (direction === "out" || direction === "both") {
      for (const i of this.outIdx.get(node.id) ?? []) idxs.add(i)
    }
    if (direction === "in" || direction === "both") {
      for (const i of this.inIdx.get(node.id) ?? []) idxs.add(i)
    }

    const out: Edge[] = []
    for (const i of idxs) {
      const e = this.edges[i]
      if (status !== "all" && e.status !== status) continue
      if (e.confidence < minConf) continue
      if (typeSet && !typeSet.has(e.type)) continue
      out.push(e)
    }
    return out
  }

  /**
   * Sum the `amount` field across edges incident to `seed`, with the
   * same filters as neighbors(). Defaults to outgoing direction.
   *
   * Returned `total_amount` ignores edges with null amounts (i.e. only
   * monetary edges contribute to the sum), but the `edges` list includes
   * every edge that matched the filter regardless of amount.
   */
  aggregate(seed: ResolveArg, opts: AggregateOpts = {}): AggregateResult {
    const node = this.resolver.resolve(seed)
    const direction = opts.direction ?? "out"
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const typeSet = opts.edge_types ? new Set(opts.edge_types) : null
    const cycleFilter = opts.cycle

    const idxs = direction === "in" ? this.inIdx.get(node.id) : this.outIdx.get(node.id)
    const matched: Edge[] = []
    let total = 0
    for (const i of idxs ?? []) {
      const e = this.edges[i]
      if (status !== "all" && e.status !== status) continue
      if (e.confidence < minConf) continue
      if (typeSet && !typeSet.has(e.type)) continue
      if (cycleFilter !== undefined && e.cycle !== cycleFilter) continue
      matched.push(e)
      if (typeof e.amount === "number" && Number.isFinite(e.amount)) total += e.amount
    }
    return { edge_count: matched.length, total_amount: total, edges: matched }
  }

  // ─── Diagnostics ───────────────────────────────────────────────────

  stats(): GraphStats {
    const byStatus: Record<string, number> = {}
    for (const e of this.edges) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1
    return {
      nodes: this.resolver.size(),
      edges: this.edges.length,
      edges_by_status: byStatus,
      files_read: this.stores.files_read,
    }
  }

  // ─── Edge indexing ─────────────────────────────────────────────────

  private indexEdges(rawEdges: RawEdge[]): void {
    for (const raw of rawEdges) {
      const fromNode = this.resolver.tryResolve({ kind: "name", value: raw.from })
      const toNode = this.resolver.tryResolve({ kind: "name", value: raw.to })
      if (!fromNode && !toNode) {
        this.unresolved_edges.push({ edge: raw, missing: "both" })
        continue
      }
      if (!fromNode) {
        this.unresolved_edges.push({ edge: raw, missing: "from" })
        continue
      }
      if (!toNode) {
        this.unresolved_edges.push({ edge: raw, missing: "to" })
        continue
      }
      const edge: Edge = {
        id: raw.id,
        from_id: fromNode.id,
        to_id: toNode.id,
        from_raw: raw.from,
        to_raw: raw.to,
        type: (raw.type ?? "related") as EdgeType,
        direction: raw.direction === "undirected" ? "undirected" : "directed",
        confidence: typeof raw.confidence === "number" ? raw.confidence : 0,
        source: raw.source ?? "unknown",
        source_url: raw.source_url ?? null,
        amount: typeof raw.amount === "number" ? raw.amount : null,
        cycle: raw.cycle ?? null,
        date_range: raw.date_range ?? null,
        role: raw.role ?? null,
        evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
        first_seen: raw.first_seen ?? "",
        last_verified: raw.last_verified ?? "",
        status: (raw.status as EdgeStatus) ?? "active",
        raw,
      }
      const idx = this.edges.length
      this.edges.push(edge)
      pushIndex(this.outIdx, edge.from_id, idx)
      pushIndex(this.inIdx, edge.to_id, idx)
      if (edge.direction === "undirected") {
        // Symmetric — also index reverse so neighbors() finds either side.
        pushIndex(this.outIdx, edge.to_id, idx)
        pushIndex(this.inIdx, edge.from_id, idx)
      }
    }
  }
}

function pushIndex(map: Map<NodeId, number[]>, key: NodeId, value: number): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}
