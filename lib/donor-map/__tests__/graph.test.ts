import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import { Graph } from "../graph"
import { makeStores } from "./fixtures"

describe("Graph.neighbors", () => {
  it("returns active edges by default and skips deprecated", () => {
    const g = new Graph(makeStores())
    const edges = g.neighbors("Jane Senator", { direction: "in" })
    assert.equal(edges.length, 3, "3 active incoming edges (deprecated excluded)")
    for (const e of edges) assert.equal(e.status, "active")
  })

  it("includes deprecated when status='all'", () => {
    const g = new Graph(makeStores())
    const all = g.neighbors("Jane Senator", { direction: "in", status: "all" })
    assert.equal(all.length, 4)
  })

  it("filters by edge type", () => {
    const g = new Graph(makeStores())
    const monetary = g.neighbors("Jane Senator", {
      direction: "in",
      edge_types: ["monetary"],
    })
    assert.equal(monetary.length, 3)
    const nonMatching = g.neighbors("Jane Senator", {
      direction: "in",
      edge_types: ["family"],
    })
    assert.equal(nonMatching.length, 0)
  })

  it("respects min_confidence", () => {
    const g = new Graph(makeStores())
    const high = g.neighbors("Jane Senator", { direction: "in", min_confidence: 0.88 })
    // 0.9 + 0.9 = 2 edges from Acme; FF USA is 0.85 (below threshold)
    assert.equal(high.length, 2)
  })

  it("default direction='both' returns out + in", () => {
    const g = new Graph(makeStores())
    const acme = g.neighbors("Acme Capital")
    // 2 active outgoing (edge_001 + edge_002), 0 incoming (deprecated excluded)
    assert.equal(acme.length, 2)
  })

  it("resolves the seed by FEC alias before walking", () => {
    const g = new Graph(makeStores())
    const fromAlias = g.neighbors("FF PAC", { direction: "out" })
    const fromName = g.neighbors("Future Forward USA", { direction: "out" })
    assert.equal(fromAlias.length, fromName.length)
  })
})

describe("Graph.aggregate", () => {
  it("sums monetary edges, default outgoing", () => {
    const g = new Graph(makeStores())
    const result = g.aggregate("Acme Capital", { edge_types: ["monetary"] })
    // 5000 + 2500 = 7500 (deprecated 99999 excluded by default)
    assert.equal(result.total_amount, 7500)
    assert.equal(result.edge_count, 2)
  })

  it("filters by cycle", () => {
    const g = new Graph(makeStores())
    const cycle2024 = g.aggregate("Acme Capital", { edge_types: ["monetary"], cycle: 2024 })
    assert.equal(cycle2024.total_amount, 5000)
    assert.equal(cycle2024.edge_count, 1)
  })

  it("sums incoming when direction='in'", () => {
    const g = new Graph(makeStores())
    const result = g.aggregate("Jane Senator", { direction: "in", edge_types: ["monetary"] })
    // 5000 + 2500 + 100000 = 107500
    assert.equal(result.total_amount, 107500)
    assert.equal(result.edge_count, 3)
  })

  it("includes deprecated when status='all'", () => {
    const g = new Graph(makeStores())
    const result = g.aggregate("Acme Capital", { edge_types: ["monetary"], status: "all" })
    assert.equal(result.total_amount, 5000 + 2500 + 99999)
    assert.equal(result.edge_count, 3)
  })

  it("returns 0 / 0 / [] for a node with no matching edges", () => {
    const g = new Graph(makeStores())
    const r = g.aggregate("Fairshake PAC", { edge_types: ["monetary"] })
    assert.equal(r.edge_count, 0)
    assert.equal(r.total_amount, 0)
    assert.deepEqual(r.edges, [])
  })
})

describe("Graph.paths", () => {
  it("finds direct (1-hop) paths between connected nodes", () => {
    const g = new Graph(makeStores())
    const ps = g.paths("Acme Capital", "Jane Senator")
    // 2 active monetary edges Acme→Jane (5000 + 2500)
    assert.equal(ps.length, 2)
    for (const p of ps) {
      assert.equal(p.hops, 1)
      assert.equal(p.from_id, ps[0].from_id)
      assert.equal(p.to_id, ps[0].to_id)
    }
    // Ranked by weight desc → 5000-edge path first
    assert.ok(ps[0].weight >= ps[1].weight)
  })

  it("returns empty when nodes are not connected within max_hops", () => {
    const g = new Graph(makeStores())
    const ps = g.paths("Acme Capital", "Fairshake PAC", { max_hops: 2 })
    assert.equal(ps.length, 0)
  })

  it("walks 2-hop paths through shared neighbors (Acme → Jane → FF)", () => {
    const g = new Graph(makeStores())
    const ps = g.paths("Acme Capital", "Future Forward USA", { max_hops: 2 })
    assert.ok(ps.length >= 1, "at least one path via Jane Senator")
    for (const p of ps) {
      assert.equal(p.hops, 2)
      assert.equal(p.nodes.length, 3)
    }
  })

  it("returns a zero-hop path when from === to", () => {
    const g = new Graph(makeStores())
    const ps = g.paths("Acme Capital", "Acme Capital")
    assert.equal(ps.length, 1)
    assert.equal(ps[0].hops, 0)
    assert.equal(ps[0].weight, 0)
    assert.deepEqual(ps[0].edges, [])
  })

  it("respects min_confidence filter", () => {
    const g = new Graph(makeStores())
    // FF→Jane is confidence 0.85; raise threshold to drop it
    const ps = g.paths("Future Forward USA", "Jane Senator", { min_confidence: 0.9 })
    assert.equal(ps.length, 0)
  })
})

describe("Graph.subgraph", () => {
  it("flood-fills 1 hop from a single seed", () => {
    const g = new Graph(makeStores())
    const r = g.subgraph(["Acme Capital"])
    // Acme + Jane Senator in nodes; 2 active outgoing edges to Jane
    const ids = new Set(r.nodes.map((n) => n.name))
    assert.ok(ids.has("Acme Capital"))
    assert.ok(ids.has("Jane Senator"))
    assert.equal(r.edges.length, 2)
    assert.equal(r.truncated, false)
  })

  it("merges traversal from multiple seeds without dup nodes", () => {
    const g = new Graph(makeStores())
    const r = g.subgraph(["Acme Capital", "Future Forward USA"])
    // 3 unique nodes (Acme, FF, Jane), 3 active edges (2 Acme→Jane + 1 FF→Jane)
    assert.equal(r.nodes.length, 3)
    assert.equal(r.edges.length, 3)
  })

  it("truncates when max_nodes is reached", () => {
    const g = new Graph(makeStores())
    const r = g.subgraph(["Acme Capital", "Future Forward USA"], { max_nodes: 2 })
    // Cap at 2 — at least one of Acme/FF + Jane fits, then truncates.
    assert.equal(r.truncated, true)
    assert.ok(r.nodes.length <= 2 + 1, "may collect one over before flagging")
  })
})

describe("Graph.timeline", () => {
  it("returns edges sorted by first_seen desc", () => {
    const g = new Graph(makeStores())
    const tl = g.timeline("Acme Capital")
    // Acme has 2 active outgoing (2024, 2022). Newest first.
    assert.equal(tl.length, 2)
    assert.equal(tl[0].edge.cycle, 2024)
    assert.equal(tl[1].edge.cycle, 2022)
    assert.equal(tl[0].at, "2024-01-01")
  })

  it("filters by cycle", () => {
    const g = new Graph(makeStores())
    const tl = g.timeline("Acme Capital", { cycle: 2022 })
    assert.equal(tl.length, 1)
    assert.equal(tl[0].edge.cycle, 2022)
  })

  it("includes counterparty for each edge", () => {
    const g = new Graph(makeStores())
    const tl = g.timeline("Jane Senator", { direction: "in" })
    // 3 active incoming edges (2 from Acme + 1 from FF)
    assert.equal(tl.length, 3)
    for (const e of tl) {
      assert.notEqual(e.counterparty, "")
      // counterparty should not equal Jane's own id
      const jane = g.resolver.resolve("Jane Senator")
      assert.notEqual(e.counterparty, jane.id)
    }
  })

  it("respects status='all'", () => {
    const g = new Graph(makeStores())
    const active = g.timeline("Acme Capital")
    const all = g.timeline("Acme Capital", { status: "all" })
    assert.ok(all.length > active.length)
  })
})

describe("Graph.stats", () => {
  it("reports node + edge totals after construction", () => {
    const g = new Graph(makeStores())
    const s = g.stats()
    assert.ok(s.nodes >= 4, "fixture has 4 entities + at least 1 stub")
    assert.equal(s.edges, 4, "4 raw edges all index cleanly in the fixture")
    assert.equal(s.edges_by_status.active, 3)
    assert.equal(s.edges_by_status.deprecated, 1)
  })

  it("collects unresolved edges separately rather than throwing", () => {
    const stores = makeStores()
    stores.edges.push({
      id: "edge_orphan",
      from: "Ghost Donor That Does Not Exist",
      to: "Another Ghost",
      type: "monetary",
      direction: "directed",
      confidence: 0.5,
      source: "test",
      amount: 1,
      cycle: 2024,
      role: null,
      evidence: [],
      first_seen: "2024-01-01",
      last_verified: "2024-01-01",
      status: "active",
    })
    const g = new Graph(stores)
    assert.equal(g.unresolved_edges.length, 1)
    assert.equal(g.unresolved_edges[0].missing, "both")
  })
})

describe("Graph.donorContradictions", () => {
  // Build a fixture where Acme funds Jane (D) AND Bob (R), and Jane has a
  // political-opposition edge to Bob. Mirrors the UDP-funds-Bowman-and-his-
  // primary-opponent shape.
  function bothSidesStores() {
    const stores = makeStores({
      entities: [
        {
          id: "ent_acme",
          name: "Acme Capital",
          profile_path: "content/Donors/Acme Capital.md",
          entity_type: "corporation",
        },
        {
          id: "ent_jane",
          name: "Jane Senator",
          profile_path: "content/Politicians/Democrats/Senate/Jane Senator/_Jane Senator Master Profile.md",
          entity_type: "politician",
        },
        {
          id: "ent_bob",
          name: "Bob Senator",
          profile_path: "content/Politicians/Republicans/Senate/Bob Senator/_Bob Senator Master Profile.md",
          entity_type: "politician",
        },
        {
          id: "ent_carol",
          name: "Carol Senator",
          profile_path: "content/Politicians/Democrats/Senate/Carol Senator/_Carol Senator Master Profile.md",
          entity_type: "politician",
        },
      ],
      edges: [
        // Acme → Jane $50k, Acme → Bob $30k, Acme → Carol $5k.
        {
          id: "e_acme_jane",
          from: "Acme Capital",
          to: "Jane Senator",
          type: "monetary",
          direction: "directed",
          confidence: 0.9,
          source: "fec",
          amount: 50000,
          cycle: 2024,
          evidence: [],
          first_seen: "2024-01-01",
          last_verified: "2024-06-01",
          status: "active",
        },
        {
          id: "e_acme_bob",
          from: "Acme Capital",
          to: "Bob Senator",
          type: "monetary",
          direction: "directed",
          confidence: 0.9,
          source: "fec",
          amount: 30000,
          cycle: 2024,
          evidence: [],
          first_seen: "2024-02-01",
          last_verified: "2024-06-01",
          status: "active",
        },
        {
          id: "e_acme_carol",
          from: "Acme Capital",
          to: "Carol Senator",
          type: "monetary",
          direction: "directed",
          confidence: 0.9,
          source: "fec",
          amount: 5000,
          cycle: 2024,
          evidence: [],
          first_seen: "2024-03-01",
          last_verified: "2024-06-01",
          status: "active",
        },
        // Jane opposes Bob — the contradiction edge.
        {
          id: "e_jane_opp_bob",
          from: "Jane Senator",
          to: "Bob Senator",
          type: "political-opposition",
          direction: "directed",
          confidence: 0.8,
          source: "manual",
          evidence: [],
          first_seen: "2024-04-01",
          last_verified: "2024-06-01",
          status: "active",
        },
        // Carol has no opposition edge — she should NOT show up.
      ],
      legislators: [
        {
          bioguide: "S000001",
          name_official: "Jane Senator",
          ids: { bioguide: "S000001" },
          current_term: { state: "CA", party: "Democrat", chamber: "senate" },
        },
        {
          bioguide: "S000002",
          name_official: "Bob Senator",
          ids: { bioguide: "S000002" },
          current_term: { state: "TX", party: "Republican", chamber: "senate" },
        },
        {
          bioguide: "S000003",
          name_official: "Carol Senator",
          ids: { bioguide: "S000003" },
          current_term: { state: "OR", party: "Democrat", chamber: "senate" },
        },
      ],
      fec_registry: {},
    })
    return stores
  }

  it("finds the both-sides pair where opposition edge bridges two funded recipients", () => {
    const g = new Graph(bothSidesStores())
    const r = g.donorContradictions("Acme Capital")
    assert.equal(r.pairs.length, 1, "exactly one contradiction pair")
    const names = new Set([r.pairs[0].a.name, r.pairs[0].b.name])
    assert.ok(names.has("Jane Senator"))
    assert.ok(names.has("Bob Senator"))
    assert.equal(r.pairs[0].opposition_basis.length, 1)
  })

  it("attaches the funded totals to each side of the pair", () => {
    const g = new Graph(bothSidesStores())
    const r = g.donorContradictions("Acme Capital")
    const p = r.pairs[0]
    const janeTotal = p.a.name === "Jane Senator" ? p.total_to_a : p.total_to_b
    const bobTotal = p.a.name === "Bob Senator" ? p.total_to_a : p.total_to_b
    assert.equal(janeTotal, 50000)
    assert.equal(bobTotal, 30000)
  })

  it("excludes recipients with no opposition edge to another funded recipient", () => {
    const g = new Graph(bothSidesStores())
    const r = g.donorContradictions("Acme Capital")
    const allNames = new Set<string>()
    for (const p of r.pairs) {
      allNames.add(p.a.name)
      allNames.add(p.b.name)
    }
    assert.ok(!allNames.has("Carol Senator"), "Carol has no opposition edge so doesn't appear")
  })

  it("respects min_total — drops recipients below the floor", () => {
    const g = new Graph(bothSidesStores())
    // Floor at 40000 keeps Jane (50k) but drops Bob (30k). No pair survives.
    const r = g.donorContradictions("Acme Capital", { min_total: 40000 })
    assert.equal(r.pairs.length, 0)
  })

  it("ranks pairs by min(total_to_a, total_to_b) desc", () => {
    // Add a second pair with a smaller min: Acme → Dave $20k, Dave opp Bob.
    const stores = bothSidesStores()
    stores.entities.push({
      id: "ent_dave",
      name: "Dave Senator",
      profile_path: "content/Politicians/Republicans/Senate/Dave Senator/_Dave Senator Master Profile.md",
      entity_type: "politician",
    })
    stores.legislators.push({
      bioguide: "S000004",
      name_official: "Dave Senator",
      ids: { bioguide: "S000004" },
      current_term: { state: "FL", party: "Republican", chamber: "senate" },
    })
    stores.edges.push(
      {
        id: "e_acme_dave",
        from: "Acme Capital",
        to: "Dave Senator",
        type: "monetary",
        direction: "directed",
        confidence: 0.9,
        source: "fec",
        amount: 20000,
        cycle: 2024,
        evidence: [],
        first_seen: "2024-05-01",
        last_verified: "2024-06-01",
        status: "active",
      },
      {
        id: "e_dave_opp_jane",
        from: "Dave Senator",
        to: "Jane Senator",
        type: "political-opposition",
        direction: "directed",
        confidence: 0.8,
        source: "manual",
        evidence: [],
        first_seen: "2024-05-01",
        last_verified: "2024-06-01",
        status: "active",
      },
    )
    const g = new Graph(stores)
    const r = g.donorContradictions("Acme Capital")
    assert.equal(r.pairs.length, 2)
    // First pair: min(50k, 30k) = 30k. Second pair: min(50k, 20k) = 20k.
    const min0 = Math.min(r.pairs[0].total_to_a, r.pairs[0].total_to_b)
    const min1 = Math.min(r.pairs[1].total_to_a, r.pairs[1].total_to_b)
    assert.ok(min0 >= min1, "ranked desc by min total")
    assert.equal(min0, 30000)
    assert.equal(min1, 20000)
  })

  it("deduplicates pair when both directions of opposition exist", () => {
    const stores = bothSidesStores()
    // Add a reverse opposition edge Bob → Jane on top of Jane → Bob.
    stores.edges.push({
      id: "e_bob_opp_jane",
      from: "Bob Senator",
      to: "Jane Senator",
      type: "political-opposition",
      direction: "directed",
      confidence: 0.7,
      source: "manual",
      evidence: [],
      first_seen: "2024-04-15",
      last_verified: "2024-06-01",
      status: "active",
    })
    const g = new Graph(stores)
    const r = g.donorContradictions("Acme Capital")
    assert.equal(r.pairs.length, 1, "still one pair, undirected")
    assert.equal(r.pairs[0].opposition_basis.length, 2, "both opposition edges attached as basis")
  })
})
