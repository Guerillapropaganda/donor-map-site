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
