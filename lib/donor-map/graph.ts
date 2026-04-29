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
  Path,
  PathsOpts,
  ResolveArg,
  SubgraphOpts,
  SubgraphResult,
  TimelineEntry,
  TimelineOpts,
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

  /**
   * Paths from `from` to `to`, up to maxHops. Treats edges as undirected
   * for traversal (we want "how is A connected to B" regardless of who
   * gave to whom). Returns paths ranked by sum of per-edge weight desc;
   * edge weight = amount when present, else confidence.
   *
   * Defaults: max_hops=3, status='active', min_confidence=0, limit=25.
   *
   * Filters apply per-edge during traversal (edges that fail filter
   * never extend a path). The ranking only runs after path enumeration.
   */
  paths(from: ResolveArg, to: ResolveArg, opts: PathsOpts = {}): Path[] {
    const fromNode = this.resolver.resolve(from)
    const toNode = this.resolver.resolve(to)
    const maxHops = opts.max_hops ?? 3
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const typeSet = opts.edge_types ? new Set(opts.edge_types) : null
    const limit = opts.limit ?? 25

    if (fromNode.id === toNode.id) {
      return [{ from_id: fromNode.id, to_id: toNode.id, hops: 0, weight: 0, edges: [], nodes: [fromNode.id] }]
    }

    const passes = (e: Edge): boolean => {
      if (status !== "all" && e.status !== status) return false
      if (e.confidence < minConf) return false
      if (typeSet && !typeSet.has(e.type)) return false
      return true
    }

    // BFS exploration. Each frontier entry is a partial path: the node we
    // are at, the edge sequence taken to get there, and the visited node
    // set (so we don't revisit). When we hit `toNode`, the partial becomes
    // a complete Path.
    //
    // Frontier cap: hub-target queries (e.g. money-trail traces ending at
    // Speaker Mike Johnson, who has thousands of incoming edges) blow up
    // the frontier exponentially with hop depth. 2026-04-29 incident:
    // hops=3 query hit 4B+ partials and threw RangeError. Cap = 50k per
    // hop is plenty for honest path enumeration; truncation is silent
    // (caller sees fewer paths but no error).
    const FRONTIER_CAP = 50_000
    interface Partial {
      at: NodeId
      edges: Edge[]
      visited: Set<NodeId>
    }
    const found: Path[] = []
    let frontier: Partial[] = [{ at: fromNode.id, edges: [], visited: new Set([fromNode.id]) }]

    for (let hop = 0; hop < maxHops && frontier.length > 0; hop++) {
      const next: Partial[] = []
      let frontierFull = false
      for (const p of frontier) {
        if (frontierFull) break
        // Walk every adjacent edge from `p.at`, regardless of stored
        // direction (treating undirected for connection-discovery).
        const adj = new Set<number>([
          ...(this.outIdx.get(p.at) ?? []),
          ...(this.inIdx.get(p.at) ?? []),
        ])
        for (const i of adj) {
          const e = this.edges[i]
          if (!passes(e)) continue
          const other = e.from_id === p.at ? e.to_id : e.from_id
          if (p.visited.has(other)) continue
          const newEdges = [...p.edges, e]
          if (other === toNode.id) {
            const nodes = [fromNode.id]
            for (const ed of newEdges) {
              nodes.push(nodes[nodes.length - 1] === ed.from_id ? ed.to_id : ed.from_id)
            }
            found.push({
              from_id: fromNode.id,
              to_id: toNode.id,
              hops: newEdges.length,
              weight: pathWeight(newEdges),
              edges: newEdges,
              nodes,
            })
            continue
          }
          if (next.length >= FRONTIER_CAP) {
            frontierFull = true
            break
          }
          const newVisited = new Set(p.visited)
          newVisited.add(other)
          next.push({
            at: other,
            edges: newEdges,
            visited: newVisited,
          })
        }
        if (frontierFull) break
      }
      frontier = next
    }

    found.sort((a, b) => b.weight - a.weight || a.hops - b.hops)
    return found.slice(0, limit)
  }

  /**
   * Flood-fill from one or more seed nodes outward up to maxHops, returning
   * all nodes and edges reached. Bounded by max_nodes (default 5000); if
   * the cap is hit during traversal the result has truncated=true and the
   * graph is returned with whatever was collected so far.
   *
   * Defaults: max_hops=1, status='active', min_confidence=0, max_nodes=5000.
   *
   * Edge filter applies during traversal — edges that fail filter neither
   * appear in the result nor extend the frontier.
   */
  subgraph(seeds: ResolveArg[], opts: SubgraphOpts = {}): SubgraphResult {
    const maxHops = opts.max_hops ?? 1
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const typeSet = opts.edge_types ? new Set(opts.edge_types) : null
    const maxNodes = opts.max_nodes ?? 5000

    const passes = (e: Edge): boolean => {
      if (status !== "all" && e.status !== status) return false
      if (e.confidence < minConf) return false
      if (typeSet && !typeSet.has(e.type)) return false
      return true
    }

    const seedNodes = seeds.map((s) => this.resolver.resolve(s))
    const visited = new Set<NodeId>(seedNodes.map((n) => n.id))
    const collectedEdges = new Set<number>()
    let frontier: NodeId[] = [...visited]
    let truncated = false

    for (let hop = 0; hop < maxHops && frontier.length > 0 && !truncated; hop++) {
      const next: NodeId[] = []
      for (const id of frontier) {
        const adj = new Set<number>([
          ...(this.outIdx.get(id) ?? []),
          ...(this.inIdx.get(id) ?? []),
        ])
        for (const i of adj) {
          const e = this.edges[i]
          if (!passes(e)) continue
          collectedEdges.add(i)
          const other = e.from_id === id ? e.to_id : e.from_id
          if (visited.has(other)) continue
          if (visited.size >= maxNodes) {
            truncated = true
            break
          }
          visited.add(other)
          next.push(other)
        }
        if (truncated) break
      }
      frontier = next
    }

    const nodes: Node[] = []
    for (const nid of visited) {
      const n = this.resolver.getById(nid)
      if (n) nodes.push(n)
    }
    const edges: Edge[] = []
    for (const i of collectedEdges) edges.push(this.edges[i])
    return { nodes, edges, truncated }
  }

  /**
   * Chronological list of edges incident to `seed`, sorted by first_seen
   * desc (most recent first). Each entry carries the `counterparty` —
   * the other endpoint of the edge from seed's perspective.
   *
   * Defaults: direction='both', status='active', min_confidence=0,
   * limit=500.
   *
   * Edges with unparseable first_seen sort to the end (after dated
   * edges) but are still included in the result.
   */
  timeline(seed: ResolveArg, opts: TimelineOpts = {}): TimelineEntry[] {
    const node = this.resolver.resolve(seed)
    const direction = opts.direction ?? "both"
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const typeSet = opts.edge_types ? new Set(opts.edge_types) : null
    const cycleFilter = opts.cycle
    const limit = opts.limit ?? 500

    const idxs = new Set<number>()
    if (direction === "out" || direction === "both") {
      for (const i of this.outIdx.get(node.id) ?? []) idxs.add(i)
    }
    if (direction === "in" || direction === "both") {
      for (const i of this.inIdx.get(node.id) ?? []) idxs.add(i)
    }

    const entries: TimelineEntry[] = []
    for (const i of idxs) {
      const e = this.edges[i]
      if (status !== "all" && e.status !== status) continue
      if (e.confidence < minConf) continue
      if (typeSet && !typeSet.has(e.type)) continue
      if (cycleFilter !== undefined && e.cycle !== cycleFilter) continue
      const t = e.first_seen && Date.parse(e.first_seen) ? e.first_seen : null
      const counterparty = e.from_id === node.id ? e.to_id : e.from_id
      entries.push({ edge: e, at: t, counterparty })
    }

    // Sort by parsed timestamp desc; null timestamps go to the end.
    entries.sort((a, b) => {
      if (a.at && b.at) return b.at.localeCompare(a.at)
      if (a.at && !b.at) return -1
      if (!a.at && b.at) return 1
      return 0
    })
    return entries.slice(0, limit)
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

/**
 * Sum the per-edge weight for a path. Weight = `amount` if it's a finite
 * number, else `confidence`. Used to rank paths in `paths()` so monetary
 * connections sort above thin "related" associations.
 */
function pathWeight(edges: Edge[]): number {
  let w = 0
  for (const e of edges) {
    if (typeof e.amount === "number" && Number.isFinite(e.amount)) {
      w += e.amount
    } else {
      w += e.confidence
    }
  }
  return w
}
