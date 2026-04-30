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
  BothSidesDonorPair,
  BothSidesDonorsOpts,
  BothSidesDonorsResult,
  ClassDonorCluster,
  ClassProfileOpts,
  ClassProfileResult,
  DonorContradictionPair,
  DonorContradictionsOpts,
  DonorContradictionsResult,
  Edge,
  EdgeStatus,
  EdgeType,
  InfluenceMapOpts,
  InfluenceMapResult,
  InfluencePipeline,
  InfluencePipelinesOpts,
  InfluencePipelinesResult,
  NodeType,
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

/**
 * Edge sources where unresolved endpoints get auto-stubbed instead of
 * dropped. Mirrors MIGRATION_SOURCES in scripts/lib/relationship-edge-
 * validator.cjs. The from-side is typically a raw donor/contributor name
 * with no vault profile.
 *
 * Adding a source here means its edges become queryable via aggregate /
 * neighbors / paths even when the counterparty has no vault entity.
 * Donor-name stubs participate in graph queries but don't have profiles
 * to render — they're terminal leaves in the donor → recipient graph.
 */
const PERMISSIVE_EDGE_SOURCES = new Set<string>([
  "cal-access-bulk",
  "cal-access-expn",
  "cal-access-loans",
  "cal-access-orgs",
  "fec-indiv-by-committee",
  "fec-oth-transfers",
  "irs-pofd-8872",
  "icij-offshore-leaks",
  // Bills are virtual nodes keyed "{TYPE}.{N}-{C}" e.g. "HR.1-119" —
  // not vault entities by construction. Mint name-stubs so sponsorship
  // edges resolve and participate in influenceMap's policy_signal audit.
  "govinfo-bill-status",
])

/**
 * Normalize an edge endpoint's `from_type` / `to_type` to a stub NodeType.
 * Tolerant: unknown or empty type collapses to "donor" since 100% of the
 * cal-access-bulk donors are individual contributors or org-form donors.
 */
function normalizeStubType(rawType: string | undefined | null): "donor" | "politician" | "entity" | "bill" | "unknown" {
  switch ((rawType ?? "").toLowerCase()) {
    case "politician": return "politician"
    case "bill": return "bill"
    case "entity":
    case "corporation":
    case "donor": return "donor"
    default: return "donor"
  }
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

  // ─── Thesis queries (ADR-0024) ─────────────────────────────────────

  /**
   * Pairs of politicians the donor funded that have a
   * `political-opposition` edge between them — the "both-sides funding"
   * shape. Returns deduplicated undirected pairs ranked by the smaller
   * of the two totals (the intensity heuristic — both sides being
   * funded substantially is more newsworthy than $5 + $50,000).
   *
   * Reference shapes:
   *   - UDP funded Bowman + Bowman's primary opponent.
   *   - Fairshake PAC funded Cori Bush + Wesley Bell (her opponent).
   *
   * Defaults: status='active', min_confidence=0, min_total=0,
   * cycle=undefined (all cycles).
   *
   * Only counts edges of type `monetary` with a finite positive amount
   * for the funding side. Opposition edges are matched by type
   * `political-opposition` regardless of direction.
   */
  donorContradictions(
    donor: ResolveArg,
    opts: DonorContradictionsOpts = {},
  ): DonorContradictionsResult {
    const donorNode = this.resolver.resolve(donor)
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const minTotal = opts.min_total ?? 0
    const cycle = opts.cycle

    // Step 1: aggregate monetary out-edges, group by recipient.
    interface FundedInfo {
      total: number
      edges: Edge[]
    }
    const funded = new Map<NodeId, FundedInfo>()
    for (const i of this.outIdx.get(donorNode.id) ?? []) {
      const e = this.edges[i]
      if (status !== "all" && e.status !== status) continue
      if (e.confidence < minConf) continue
      if (cycle !== undefined && e.cycle !== cycle) continue
      if (e.type !== "monetary") continue
      if (typeof e.amount !== "number" || !Number.isFinite(e.amount) || e.amount <= 0) continue
      const acc = funded.get(e.to_id) ?? { total: 0, edges: [] }
      acc.total += e.amount
      acc.edges.push(e)
      funded.set(e.to_id, acc)
    }

    // Filter recipients by min_total.
    const recipientSet = new Set<NodeId>()
    for (const [id, info] of funded) {
      if (info.total >= minTotal) recipientSet.add(id)
    }

    // Step 2: walk political-opposition edges incident to each recipient;
    // a hit lands when the other endpoint is also a funded recipient.
    const seen = new Map<string, DonorContradictionPair>()
    for (const aid of recipientSet) {
      const adj = new Set<number>([
        ...(this.outIdx.get(aid) ?? []),
        ...(this.inIdx.get(aid) ?? []),
      ])
      for (const ei of adj) {
        const edge = this.edges[ei]
        if (edge.type !== "political-opposition") continue
        if (status !== "all" && edge.status !== status) continue
        if (edge.confidence < minConf) continue
        const other = edge.from_id === aid ? edge.to_id : edge.from_id
        if (other === aid) continue
        if (!recipientSet.has(other)) continue

        const [lo, hi] = aid < other ? [aid, other] : [other, aid]
        const key = `${lo}|${hi}`
        const existing = seen.get(key)
        if (existing) {
          if (!existing.opposition_basis.includes(edge)) existing.opposition_basis.push(edge)
          continue
        }
        const aNode = this.resolver.getById(lo)
        const bNode = this.resolver.getById(hi)
        if (!aNode || !bNode) continue
        seen.set(key, {
          a: aNode,
          b: bNode,
          total_to_a: funded.get(lo)?.total ?? 0,
          total_to_b: funded.get(hi)?.total ?? 0,
          opposition_basis: [edge],
        })
      }
    }

    const pairs = [...seen.values()].sort(
      (x, y) =>
        Math.min(y.total_to_a, y.total_to_b) - Math.min(x.total_to_a, x.total_to_b),
    )
    return { donor: donorNode, pairs }
  }

  /**
   * bothSidesDonors — find donors who funded politicians on opposite sides
   * of a political-opposition edge. Inverse view of donorContradictions
   * (donor-centric vs the donor's contradiction surface).
   *
   * Returns each (donor, polA, polB) tuple where the donor has monetary
   * out-edges to both polA and polB AND there's a political-opposition
   * edge connecting polA and polB. Pairs deduplicated (donor + min/max
   * politician id). Ranked by min(total_to_a, total_to_b) desc — the
   * intensity heuristic.
   *
   * Cap defaults to 50 donors. Computing this for the full graph is
   * O(donors * politicians_funded^2) so the cap matters at scale.
   */
  bothSidesDonors(opts: BothSidesDonorsOpts = {}): BothSidesDonorsResult {
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const minTotal = opts.min_total_each ?? 0
    const cycle = opts.cycle
    const limit = opts.limit ?? 50

    // Step 1: build the politician-pair → opposition-edge index. We only
    // care about pairs that have an opposition edge between them; donors
    // funding two non-opposed politicians don't qualify.
    const oppositionPairs = new Map<string, Edge>()
    for (const e of this.edges) {
      if (e.type !== "political-opposition") continue
      if (status !== "all" && e.status !== status) continue
      if (e.confidence < minConf) continue
      const [lo, hi] = e.from_id < e.to_id ? [e.from_id, e.to_id] : [e.to_id, e.from_id]
      if (!oppositionPairs.has(`${lo}|${hi}`)) oppositionPairs.set(`${lo}|${hi}`, e)
    }
    if (oppositionPairs.size === 0) return { pairs: [], truncated: false }

    // Step 2: for each donor, build a {politician_id → total} map.
    // Skip donors with fewer than 2 politicians funded.
    interface DonorFunding {
      donorId: NodeId
      byPolitician: Map<NodeId, { total: number; edge: Edge }>
    }
    const donorIndex = new Map<NodeId, DonorFunding>()
    for (const e of this.edges) {
      if (e.type !== "monetary") continue
      if (status !== "all" && e.status !== status) continue
      if (e.confidence < minConf) continue
      if (cycle !== undefined && e.cycle !== cycle) continue
      if (typeof e.amount !== "number" || !Number.isFinite(e.amount) || e.amount <= 0) continue
      let donor = donorIndex.get(e.from_id)
      if (!donor) {
        donor = { donorId: e.from_id, byPolitician: new Map() }
        donorIndex.set(e.from_id, donor)
      }
      const cur = donor.byPolitician.get(e.to_id) ?? { total: 0, edge: e }
      cur.total += e.amount
      donor.byPolitician.set(e.to_id, cur)
    }

    // Step 3: for each donor, walk the opposition pair index and find
    // pairs both of whose politicians are in the donor's byPolitician map.
    const pairs: BothSidesDonorPair[] = []
    for (const donor of donorIndex.values()) {
      if (donor.byPolitician.size < 2) continue
      const fundedIds = [...donor.byPolitician.keys()]
      for (let i = 0; i < fundedIds.length && pairs.length < limit; i++) {
        for (let j = i + 1; j < fundedIds.length && pairs.length < limit; j++) {
          const a = fundedIds[i]
          const b = fundedIds[j]
          const [lo, hi] = a < b ? [a, b] : [b, a]
          const oppEdge = oppositionPairs.get(`${lo}|${hi}`)
          if (!oppEdge) continue
          const aFund = donor.byPolitician.get(a)!
          const bFund = donor.byPolitician.get(b)!
          if (aFund.total < minTotal || bFund.total < minTotal) continue
          const donorNode = this.resolver.getById(donor.donorId)
          const aNode = this.resolver.getById(a)
          const bNode = this.resolver.getById(b)
          if (!donorNode || !aNode || !bNode) continue
          pairs.push({
            donor: donorNode,
            pol_a: aNode,
            pol_b: bNode,
            total_to_a: aFund.total,
            total_to_b: bFund.total,
            evidence: [aFund.edge, bFund.edge, oppEdge],
          })
        }
      }
    }

    // Sort by intensity (min total) and slice
    pairs.sort(
      (x, y) =>
        Math.min(y.total_to_a, y.total_to_b) - Math.min(x.total_to_a, x.total_to_b),
    )
    const truncated = pairs.length >= limit
    return { pairs: pairs.slice(0, limit), truncated }
  }

  /**
   * classProfile — politician's donor base aggregated by class tags
   * (capital_type + ideological_function). Returns clusters with
   * top-N donors each. The "single-line bankrolled-by-X" answer.
   *
   * Class tags come from entity records (entities.jsonl signals.
   * capital_type / signals.ideological_function). Donors with no tag
   * roll up into the `unclassified` bucket — its size is itself a
   * data-gap signal.
   */
  classProfile(politician: ResolveArg, opts: ClassProfileOpts = {}): ClassProfileResult {
    const polNode = this.resolver.resolve(politician)
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const cycle = opts.cycle
    const topN = opts.top_donors_per_cluster ?? 10

    // Aggregate incoming monetary edges by donor node.
    interface DonorAgg {
      node: Node
      amount: number
    }
    const byDonor = new Map<NodeId, DonorAgg>()
    let total = 0
    let edgeCount = 0
    for (const i of this.inIdx.get(polNode.id) ?? []) {
      const e = this.edges[i]
      if (e.type !== "monetary") continue
      if (status !== "all" && e.status !== status) continue
      if (cycle !== undefined && e.cycle !== cycle) continue
      if (typeof e.amount !== "number" || !Number.isFinite(e.amount) || e.amount <= 0) continue
      const donorNode = this.resolver.getById(e.from_id)
      if (!donorNode) continue
      const cur = byDonor.get(donorNode.id) ?? { node: donorNode, amount: 0 }
      cur.amount += e.amount
      byDonor.set(donorNode.id, cur)
      total += e.amount
      edgeCount++
    }

    // Group by capital_type and ideological_function.
    const groupBy = (
      dimension: "capital_type" | "ideological_function",
    ): { clusters: ClassDonorCluster[]; unclassifiedDonors: DonorAgg[] } => {
      const clusters = new Map<string, ClassDonorCluster>()
      const unclassifiedDonors: DonorAgg[] = []
      for (const agg of byDonor.values()) {
        const meta = agg.node.meta as Record<string, unknown> | undefined
        const tag = meta && typeof meta[dimension] === "string" ? (meta[dimension] as string) : null
        if (!tag) {
          unclassifiedDonors.push(agg)
          continue
        }
        let c = clusters.get(tag)
        if (!c) {
          c = {
            cluster_key: tag,
            dimension,
            total_amount: 0,
            donor_count: 0,
            top_donors: [],
          }
          clusters.set(tag, c)
        }
        c.total_amount += agg.amount
        c.donor_count++
        c.top_donors.push({ node: agg.node, amount: agg.amount })
      }
      // Sort top donors per cluster + cap
      for (const c of clusters.values()) {
        c.top_donors.sort((x, y) => y.amount - x.amount)
        c.top_donors = c.top_donors.slice(0, topN)
      }
      return {
        clusters: [...clusters.values()].sort((x, y) => y.total_amount - x.total_amount),
        unclassifiedDonors,
      }
    }

    const cap = groupBy("capital_type")
    const ideo = groupBy("ideological_function")
    // Unclassified is consistent across dimensions — use capital_type's
    // unclassified set (donors lacking BOTH tags will appear in both).
    const uncTotal = cap.unclassifiedDonors.reduce((s, d) => s + d.amount, 0)

    return {
      politician: polNode,
      total_in: total,
      edge_count: edgeCount,
      capital_clusters: cap.clusters,
      ideological_clusters: ideo.clusters,
      unclassified: {
        total_amount: uncTotal,
        donor_count: cap.unclassifiedDonors.length,
      },
    }
  }

  /**
   * influenceMap — marquee thesis query per ADR-0024 Phase 3.
   *
   * Composes classProfile (donor clusters by class tag) with policy/vote
   * alignment IF the librarian has policy + voting-record data. Honest
   * about data gaps: returns `policy_signal.available = false` plus an
   * explanation when the data isn't there, rather than fabricating
   * alignments.
   *
   * As of 2026-04-30 the librarian has 5 policies in policies.jsonl and
   * 0 sponsorship edges + no per-legislator vote data. So
   * `policy_signal.available` is currently always false. The donor-class
   * portion (the more valuable half) works regardless.
   *
   * When future pipelines ingest sponsorship/vote data, the alignment
   * branch lights up automatically — the structural shape stays the same.
   */
  influenceMap(politician: ResolveArg, opts: InfluenceMapOpts = {}): InfluenceMapResult {
    const polNode = this.resolver.resolve(politician)
    // Pass node id (string) — Resolver round-trips own NodeIds via the
    // direct nodes-table lookup. Passing the Node object directly is
    // not a valid ResolveArg.
    const profile = this.classProfile(polNode.id, {
      status: opts.status,
      cycle: opts.cycle,
      top_donors_per_cluster: opts.top_donors_per_cluster,
    })

    // Audit the librarian for sponsorship + vote-on-policy edges to know
    // whether the policy_signal branch can produce real alignments.
    let sponsorshipEdges = 0
    let voteOnPolicyEdges = 0
    for (const e of this.edges) {
      if (e.type === "sponsorship") sponsorshipEdges++
      if (e.type === "vote-on-policy") voteOnPolicyEdges++
    }

    const dataGaps: string[] = []
    if (sponsorshipEdges === 0) {
      dataGaps.push(
        "No sponsorship edges in librarian — bills.jsonl exists but sponsor/cosponsor relations not yet extracted into relationships store.",
      )
    }
    if (voteOnPolicyEdges === 0) {
      dataGaps.push(
        "No vote-on-policy edges — votes.jsonl carries roll-call summaries, not per-legislator yea/nay positions. Per-legislator votes are a separate ingest target.",
      )
    }
    // Count policies in librarian for completeness of the data-gap report.
    let policyNodeCount = 0
    for (const n of this.resolver.allNodes()) if (n.type === "policy") policyNodeCount++
    if (policyNodeCount < 10) {
      dataGaps.push(
        `Only ${policyNodeCount} policy node(s) in librarian — alignment scoring requires a meaningful policy corpus (recommend ≥50). data/policies.jsonl currently has 5 entries.`,
      )
    }

    const available = sponsorshipEdges > 0 && voteOnPolicyEdges > 0 && policyNodeCount >= 10
    const dominant = profile.capital_clusters.length > 0 ? profile.capital_clusters[0] : null

    return {
      politician: polNode,
      donor_class_profile: profile,
      policy_signal: {
        available,
        alignments: available ? [] : undefined, // shape preserved for future
        data_gaps: dataGaps,
      },
      dominant_capital_cluster: dominant,
    }
  }

  /**
   * influencePipelines — fan-out from a seed node up to maxHops, return
   * the strongest path to each reachable terminal.
   *
   * Per ADR-0024 Phase 3: composes over BFS (mirrors paths() shape but
   * without an explicit destination). The "pipeline" framing: trace the
   * influence chain radiating from a donor / PAC / politician — donor →
   * committee → recipient → sponsored bill, etc. Each reachable node
   * within maxHops is a potential terminal.
   *
   * Ranking: weight = sum(amount when present, else confidence) along
   * the chain. Per-terminal dedup keeps only the highest-weight path to
   * each terminal node — so a hub seed's results are unique terminals,
   * not redundant near-identical chains.
   *
   * Filters:
   *   - terminal_types: limit terminals to specified node types
   *     ("donor → politician → bill" pipelines via terminal_types: ['bill'])
   *   - edge_types, status, min_confidence: per-edge during traversal
   *
   * Frontier cap matches paths() at 50k partials per hop to prevent
   * exponential blow-up on hub seeds.
   *
   * Defaults: max_hops=2 (capped at 4), limit=25, status='active'.
   */
  influencePipelines(seed: ResolveArg, opts: InfluencePipelinesOpts = {}): InfluencePipelinesResult {
    const seedNode = this.resolver.resolve(seed)
    const maxHops = Math.min(4, Math.max(1, opts.max_hops ?? 2))
    const status: EdgeStatus | "all" = opts.status ?? "active"
    const minConf = opts.min_confidence ?? 0
    const typeSet = opts.edge_types ? new Set(opts.edge_types) : null
    const terminalTypeSet = opts.terminal_types ? new Set<NodeType>(opts.terminal_types) : null
    const limit = opts.limit ?? 25
    const FRONTIER_CAP = opts.frontier_cap ?? 50_000

    const passes = (e: Edge): boolean => {
      if (status !== "all" && e.status !== status) return false
      if (e.confidence < minConf) return false
      if (typeSet && !typeSet.has(e.type)) return false
      return true
    }

    interface Partial {
      at: NodeId
      edges: Edge[]
      visited: Set<NodeId>
    }
    /** Best partial (by weight) seen for each terminal node. */
    const bestByTerminal = new Map<NodeId, Partial>()
    let frontier: Partial[] = [{ at: seedNode.id, edges: [], visited: new Set([seedNode.id]) }]
    let truncated = false

    for (let hop = 0; hop < maxHops && frontier.length > 0; hop++) {
      const next: Partial[] = []
      let frontierFull = false
      for (const p of frontier) {
        if (frontierFull) break
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
          const newPartial: Partial = {
            at: other,
            edges: newEdges,
            visited: new Set([...p.visited, other]),
          }
          // Record this terminal if it beats the prior best.
          const w = pathWeight(newEdges)
          const prior = bestByTerminal.get(other)
          if (!prior || pathWeight(prior.edges) < w) {
            bestByTerminal.set(other, newPartial)
          }
          // Continue extending unless we've hit the hop limit.
          if (next.length >= FRONTIER_CAP) {
            frontierFull = true
            truncated = true
            break
          }
          next.push(newPartial)
        }
      }
      frontier = next
    }

    // Apply terminal_types filter, rank, and cap.
    const candidates: InfluencePipeline[] = []
    for (const [terminalId, p] of bestByTerminal) {
      if (terminalTypeSet) {
        const node = this.resolver.tryResolve(terminalId)
        if (!node || !terminalTypeSet.has(node.type)) continue
      }
      const nodes = [seedNode.id]
      for (const ed of p.edges) {
        nodes.push(nodes[nodes.length - 1] === ed.from_id ? ed.to_id : ed.from_id)
      }
      candidates.push({
        from_id: seedNode.id,
        to_id: terminalId,
        hops: p.edges.length,
        weight: pathWeight(p.edges),
        edges: p.edges,
        nodes,
      })
    }
    candidates.sort((a, b) => b.weight - a.weight)
    const pipelines = candidates.slice(0, limit)
    if (candidates.length > pipelines.length) truncated = true

    return { seed: seedNode, pipelines, truncated }
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
      let fromNode = this.resolver.tryResolve({ kind: "name", value: raw.from })
      let toNode = this.resolver.tryResolve({ kind: "name", value: raw.to })

      // Permissive sources: edges legitimately reference raw names with
      // no vault profile (Cal-Access RCPT donors, FEC indiv-by-committee
      // contributors). Mint name-only stubs rather than dropping the edge.
      // Without this, ~99% of cal-access-bulk edges silently disappear
      // from query results because the donor side never resolves.
      if (PERMISSIVE_EDGE_SOURCES.has(raw.source ?? "")) {
        if (!fromNode && raw.from) {
          fromNode = this.resolver.findOrCreateNameStub(
            raw.from,
            normalizeStubType(raw.from_type),
          )
        }
        if (!toNode && raw.to) {
          toNode = this.resolver.findOrCreateNameStub(
            raw.to,
            normalizeStubType(raw.to_type),
          )
        }
      }

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
