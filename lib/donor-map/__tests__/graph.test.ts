import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import * as nodeFs from "node:fs"
import * as nodeOs from "node:os"
import * as nodePath from "node:path"
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

// ─── ADR-0024 Phase 3 thesis queries ──────────────────────────────────

describe("Graph.bothSidesDonors", () => {
  // Same fixture shape as donorContradictions but viewed donor-centric:
  // we expect to find ONE bothsides record (Acme funded Jane + Bob who oppose).
  function fixture() {
    return makeStores({
      entities: [
        { id: "ent_acme", name: "Acme Capital", profile_path: null, entity_type: "corporation" },
        { id: "ent_globex", name: "Globex Industries", profile_path: null, entity_type: "corporation" },
        { id: "ent_jane", name: "Jane Senator", profile_path: null, entity_type: "politician" },
        { id: "ent_bob", name: "Bob Senator", profile_path: null, entity_type: "politician" },
        { id: "ent_carol", name: "Carol Senator", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "m1", from: "Acme Capital", to: "Jane Senator", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "m2", from: "Acme Capital", to: "Bob Senator", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 30000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "m3", from: "Globex Industries", to: "Jane Senator", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 10000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        // Globex did NOT fund Bob → no bothsides pair for Globex
        { id: "opp", from: "Jane Senator", to: "Bob Senator", type: "political-opposition", direction: "directed", confidence: 0.8, source: "manual", evidence: [], first_seen: "2024-03-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
  }

  it("finds the donor who funded both sides of an opposition pair", () => {
    const g = new Graph(fixture())
    const r = g.bothSidesDonors()
    assert.equal(r.pairs.length, 1, "exactly one bothsides pair")
    assert.equal(r.pairs[0].donor.name, "Acme Capital")
    assert.equal(r.pairs[0].total_to_a + r.pairs[0].total_to_b, 80000, "totals sum across both sides")
    assert.equal(r.truncated, false)
  })

  it("respects min_total_each — drops pairs where one side is below threshold", () => {
    const g = new Graph(fixture())
    const r = g.bothSidesDonors({ min_total_each: 40000 })
    assert.equal(r.pairs.length, 0, "Bob side ($30k) is below $40k threshold")
  })

  it("returns empty when no political-opposition edges exist", () => {
    const stores = fixture()
    stores.edges = stores.edges.filter((e) => e.type !== "political-opposition")
    const g = new Graph(stores)
    const r = g.bothSidesDonors()
    assert.equal(r.pairs.length, 0)
  })
})

describe("Graph.classProfile", () => {
  function fixture() {
    return makeStores({
      entities: [
        { id: "ent_pol", name: "Test Politician", profile_path: null, entity_type: "politician" },
        { id: "ent_donor1", name: "Pharma Inc", profile_path: null, entity_type: "corporation", signals: { capital_type: "pharma-capital" } },
        { id: "ent_donor2", name: "Big Oil Corp", profile_path: null, entity_type: "corporation", signals: { capital_type: "fossil-capital" } },
        { id: "ent_donor3", name: "Pharma Two", profile_path: null, entity_type: "corporation", signals: { capital_type: "pharma-capital" } },
        { id: "ent_donor4", name: "No Tag Donor", profile_path: null, entity_type: "corporation" },
      ],
      edges: [
        { id: "m1", from: "Pharma Inc", to: "Test Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 100000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "m2", from: "Big Oil Corp", to: "Test Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "m3", from: "Pharma Two", to: "Test Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 25000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "m4", from: "No Tag Donor", to: "Test Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 5000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
  }

  it("groups donors by capital_type with totals + ranks descending", () => {
    const g = new Graph(fixture())
    const r = g.classProfile("Test Politician")
    assert.equal(r.total_in, 180000)
    assert.equal(r.capital_clusters.length, 2, "pharma + fossil clusters")
    assert.equal(r.capital_clusters[0].cluster_key, "pharma-capital", "biggest cluster first")
    assert.equal(r.capital_clusters[0].total_amount, 125000)
    assert.equal(r.capital_clusters[0].donor_count, 2)
    assert.equal(r.capital_clusters[1].cluster_key, "fossil-capital")
  })

  it("buckets untagged donors into unclassified", () => {
    const g = new Graph(fixture())
    const r = g.classProfile("Test Politician")
    assert.equal(r.unclassified.donor_count, 1, "No Tag Donor")
    assert.equal(r.unclassified.total_amount, 5000)
  })

  it("caps top_donors_per_cluster", () => {
    const g = new Graph(fixture())
    const r = g.classProfile("Test Politician", { top_donors_per_cluster: 1 })
    assert.equal(r.capital_clusters[0].top_donors.length, 1, "only 1 top donor per cluster")
    assert.equal(r.capital_clusters[0].top_donors[0].node.name, "Pharma Inc", "biggest first")
  })
})

describe("Graph.influenceMap", () => {
  it("returns donor class profile + honest data-gap signal when no policy/vote data", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_pol", name: "Test Politician", profile_path: null, entity_type: "politician" },
        { id: "ent_donor1", name: "Big Donor", profile_path: null, entity_type: "corporation", signals: { capital_type: "finance-capital" } },
      ],
      edges: [
        { id: "m1", from: "Big Donor", to: "Test Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec", amount: 100000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
    const g = new Graph(stores)
    const r = g.influenceMap("Test Politician")
    assert.equal(r.donor_class_profile.total_in, 100000)
    assert.equal(r.policy_signal.available, false, "no sponsorship/vote data → unavailable")
    assert.ok(r.policy_signal.data_gaps.length >= 1, "data gaps explained")
    assert.equal(r.dominant_capital_cluster?.cluster_key, "finance-capital")
  })

  it("influencePipelines returns ranked pipelines from a seed (1-hop)", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_seed", name: "Mega Donor", profile_path: null, entity_type: "donor" },
        { id: "ent_p1", name: "Senator A", profile_path: null, entity_type: "politician" },
        { id: "ent_p2", name: "Senator B", profile_path: null, entity_type: "politician" },
        { id: "ent_p3", name: "Senator C", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "e1", from: "Mega Donor", to: "Senator A", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 5000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "e2", from: "Mega Donor", to: "Senator B", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "e3", from: "Mega Donor", to: "Senator C", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 1000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
    const g = new Graph(stores)
    const r = g.influencePipelines("Mega Donor", { max_hops: 1 })
    assert.equal(r.pipelines.length, 3, "3 reachable terminals at 1 hop")
    assert.equal(r.pipelines[0].weight, 50000, "ranked by weight desc — Senator B first")
    assert.equal(r.pipelines[1].weight, 5000)
    assert.equal(r.pipelines[2].weight, 1000)
    assert.equal(r.truncated, false)
  })

  it("influencePipelines per-terminal dedup keeps highest-weight path", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_seed", name: "Donor", profile_path: null, entity_type: "donor" },
        { id: "ent_pol", name: "Politician", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "small", from: "Donor", to: "Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 100, cycle: 2022, evidence: [], first_seen: "2022-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "big", from: "Donor", to: "Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
    const g = new Graph(stores)
    const r = g.influencePipelines("Donor", { max_hops: 1 })
    assert.equal(r.pipelines.length, 1, "one terminal — Politician")
    assert.equal(r.pipelines[0].weight, 50000, "kept the bigger edge as best path")
  })

  it("influencePipelines respects terminal_types filter", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_seed", name: "Donor", profile_path: null, entity_type: "donor" },
        { id: "ent_pol", name: "Politician", profile_path: null, entity_type: "politician" },
        { id: "ent_corp", name: "Corp", profile_path: null, entity_type: "corporation" },
      ],
      edges: [
        { id: "to_pol", from: "Donor", to: "Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 5000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "to_corp", from: "Donor", to: "Corp", type: "affiliation", direction: "directed", confidence: 0.9, source: "manual-ops", role: "investor", evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
    const g = new Graph(stores)
    const r = g.influencePipelines("Donor", { max_hops: 1, terminal_types: ["politician"] })
    assert.equal(r.pipelines.length, 1, "only politician terminal")
    assert.equal(r.pipelines[0].to_id, "ent_pol")
  })

  it("influencePipelines reaches multi-hop terminals", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_seed", name: "PAC", profile_path: null, entity_type: "donor" },
        { id: "ent_mid", name: "Politician", profile_path: null, entity_type: "politician" },
        { id: "ent_far", name: "Other Politician", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "h1", from: "PAC", to: "Politician", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 10000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
        { id: "h2", from: "Politician", to: "Other Politician", type: "political-opposition", direction: "directed", confidence: 0.9, source: "manual-ops", evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" },
      ],
    })
    const g = new Graph(stores)
    const r = g.influencePipelines("PAC", { max_hops: 2 })
    assert.equal(r.pipelines.length, 2, "1-hop terminal + 2-hop terminal")
    const farPipeline = r.pipelines.find((p) => p.to_id === "ent_far")
    assert.ok(farPipeline, "reaches the 2-hop terminal")
    assert.equal(farPipeline?.hops, 2)
    assert.equal(farPipeline?.edges.length, 2)
  })

  it("influencePipelines returns empty when seed has no edges", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_seed", name: "Lonely Donor", profile_path: null, entity_type: "donor" },
        { id: "ent_other", name: "Politician", profile_path: null, entity_type: "politician" },
      ],
      edges: [],
    })
    const g = new Graph(stores)
    const r = g.influencePipelines("Lonely Donor")
    assert.equal(r.pipelines.length, 0)
    assert.equal(r.truncated, false)
  })

  it("influencePipelines limit cap marks truncated=true", () => {
    const entities: any[] = [{ id: "ent_seed", name: "Hub", profile_path: null, entity_type: "donor" }]
    const edges: any[] = []
    for (let i = 0; i < 30; i++) {
      entities.push({ id: `ent_t${i}`, name: `Target${i}`, profile_path: null, entity_type: "politician" })
      edges.push({ id: `e${i}`, from: "Hub", to: `Target${i}`, type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 1000 + i, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-06-01", status: "active" })
    }
    const g = new Graph(makeStores({ entities, edges }))
    const r = g.influencePipelines("Hub", { limit: 10 })
    assert.equal(r.pipelines.length, 10)
    assert.equal(r.truncated, true)
  })

  it("loads policies from stores into the resolver as policy nodes", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_pol", name: "Test Politician", profile_path: null, entity_type: "politician" },
      ],
      edges: [],
      policies: [
        { id: "pol_housing", slug: "housing", title: "Housing affordability", category: "housing" },
        { id: "pol_climate", slug: "climate", title: "Climate policy", category: "environment" },
      ],
    })
    const g = new Graph(stores)
    const node = g.resolver.tryResolve({ kind: "name", value: "Housing affordability" })
    assert.ok(node, "policy resolves by title")
    assert.equal(node?.type, "policy")
    const bySlug = g.resolver.tryResolve({ kind: "name", value: "housing" })
    assert.ok(bySlug, "policy also resolves by slug alias")
  })
})

describe("Graph.policyAlignment", () => {
  it("groups sponsorship by bill.policy_area, ranks by total bills touched", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_pol", name: "Senator A", profile_path: null, entity_type: "politician", signals: { bioguide_id: "A001" } },
      ],
      edges: [
        { id: "sp1", from: "Senator A", to: "HR.1-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "sp2", from: "Senator A", to: "HR.2-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "sp3", from: "Senator A", to: "HR.3-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
      ],
      bills: [
        { id: "HR.1-119", congress: 119, type: "HR", number: 1, policy_area: "Health" },
        { id: "HR.2-119", congress: 119, type: "HR", number: 2, policy_area: "Health" },
        { id: "HR.3-119", congress: 119, type: "HR", number: 3, policy_area: "Taxation" },
      ],
    })
    const g = new Graph(stores)
    const r = g.policyAlignment("Senator A")
    assert.equal(r.areas.length, 2)
    assert.equal(r.areas[0].policy_area, "Health", "Health ranks first — most bills")
    assert.equal(r.areas[0].bills_sponsored, 2)
    assert.equal(r.areas[0].support_rate, 1.0, "all sponsored = 100% support")
    assert.equal(r.areas[1].policy_area, "Taxation")
    assert.equal(r.bills_indexed, 3)
  })

  it("policyAlignment buckets unmapped bills as (unclassified)", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_pol", name: "Senator B", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "sp_unk", from: "Senator B", to: "S.99-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
      ],
      // bills.jsonl missing this id
      bills: [],
    })
    const g = new Graph(stores)
    const r = g.policyAlignment("Senator B")
    assert.equal(r.areas.length, 1)
    assert.equal(r.areas[0].policy_area, "(unclassified)")
  })

  it("policyAlignment respects policy_area filter", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_pol", name: "Senator C", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "sp1", from: "Senator C", to: "HR.1-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "sp2", from: "Senator C", to: "HR.2-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
      ],
      bills: [
        { id: "HR.1-119", congress: 119, type: "HR", number: 1, policy_area: "Health" },
        { id: "HR.2-119", congress: 119, type: "HR", number: 2, policy_area: "Energy" },
      ],
    })
    const g = new Graph(stores)
    const r = g.policyAlignment("Senator C", { policy_area: "Health" })
    assert.equal(r.areas.length, 1)
    assert.equal(r.areas[0].policy_area, "Health")
    assert.equal(r.areas[0].bills_sponsored, 1)
  })

  it("policyAlignment top_priorities ranks by bills_sponsored", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_pol", name: "Senator D", profile_path: null, entity_type: "politician" },
      ],
      edges: [
        { id: "sp1", from: "Senator D", to: "HR.1-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "sp2", from: "Senator D", to: "HR.2-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "sp3", from: "Senator D", to: "HR.3-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "sp4", from: "Senator D", to: "HR.4-119", from_type: "politician", to_type: "bill", type: "sponsorship", role: "sponsor", direction: "directed", confidence: 1, source: "govinfo-bill-status", evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
      ],
      bills: [
        { id: "HR.1-119", congress: 119, type: "HR", number: 1, policy_area: "Health" },
        { id: "HR.2-119", congress: 119, type: "HR", number: 2, policy_area: "Health" },
        { id: "HR.3-119", congress: 119, type: "HR", number: 3, policy_area: "Health" },
        { id: "HR.4-119", congress: 119, type: "HR", number: 4, policy_area: "Energy" },
      ],
    })
    const g = new Graph(stores)
    const r = g.policyAlignment("Senator D")
    assert.equal(r.top_priorities[0].policy_area, "Health")
    assert.equal(r.top_priorities[0].bills_sponsored, 3)
  })
})

describe("Graph.politicianContradictions", () => {
  it("flags votes where target diverges from donor-siblings' majority", () => {
    // Two politicians (target + sibling) share a donor.
    const stores = makeStores({
      entities: [
        { id: "ent_target", name: "Target Senator", profile_path: null, entity_type: "politician", signals: { bioguide_id: "TGT" } },
        { id: "ent_sib1", name: "Sibling One", profile_path: null, entity_type: "politician", signals: { bioguide_id: "SIB1" } },
        { id: "ent_sib2", name: "Sibling Two", profile_path: null, entity_type: "politician", signals: { bioguide_id: "SIB2" } },
        { id: "ent_sib3", name: "Sibling Three", profile_path: null, entity_type: "politician", signals: { bioguide_id: "SIB3" } },
        { id: "ent_donor", name: "Big PAC", profile_path: null, entity_type: "donor" },
      ],
      edges: [
        { id: "d1", from: "Big PAC", to: "Target Senator", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 100000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "d2", from: "Big PAC", to: "Sibling One", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "d3", from: "Big PAC", to: "Sibling Two", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 75000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "d4", from: "Big PAC", to: "Sibling Three", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 25000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
      ],
    })

    // Build a synthetic positions dir.
    const fs = nodeFs
    const os = nodeOs
    const path = nodePath
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "contradictions-"))
    const rows = [
      // v1: target Nay, siblings 3 Yea → contradiction (3-0 lopsided)
      { vote_id: "v1", bioguide: "TGT", position: "Nay", party: "D", state: "X" },
      { vote_id: "v1", bioguide: "SIB1", position: "Yea", party: "D", state: "X" },
      { vote_id: "v1", bioguide: "SIB2", position: "Yea", party: "D", state: "X" },
      { vote_id: "v1", bioguide: "SIB3", position: "Yea", party: "D", state: "X" },
      // v2: target Yea, siblings 2 Yea 1 Nay → no contradiction (target matches majority)
      { vote_id: "v2", bioguide: "TGT", position: "Yea", party: "D", state: "X" },
      { vote_id: "v2", bioguide: "SIB1", position: "Yea", party: "D", state: "X" },
      { vote_id: "v2", bioguide: "SIB2", position: "Yea", party: "D", state: "X" },
      { vote_id: "v2", bioguide: "SIB3", position: "Nay", party: "D", state: "X" },
    ]
    fs.writeFileSync(path.join(tmpDir, "99.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n")

    const g = new Graph(stores)
    const r = g.politicianContradictions("Target Senator", {
      min_donor_amount: 1000,
      min_siblings_per_vote: 3,
      data_dir: tmpDir,
    })

    assert.equal(r.donors_considered.length, 1, "Big PAC is the only donor")
    assert.equal(r.donor_siblings.length, 3, "3 sibling politicians funded by Big PAC")
    assert.equal(r.contradictions.length, 1, "v1 is the contradiction")
    assert.equal(r.contradictions[0].vote_id, "v1")
    assert.equal(r.contradictions[0].position, "Nay")
    assert.equal(r.contradictions[0].siblings_majority, "Yea")
    assert.equal(r.contradictions[0].siblings_yea, 3)
  })

  it("politicianContradictions returns empty when target has no bioguide", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_t", name: "No Bioguide Pol", profile_path: null, entity_type: "politician" },
      ],
      edges: [],
    })
    const g = new Graph(stores)
    const r = g.politicianContradictions("No Bioguide Pol")
    assert.equal(r.contradictions.length, 0)
    assert.equal(r.votes_evaluated, 0)
  })

  it("politicianContradictions skips votes below min_siblings_per_vote", () => {
    const stores = makeStores({
      entities: [
        { id: "ent_t", name: "Target", profile_path: null, entity_type: "politician", signals: { bioguide_id: "TGT" } },
        { id: "ent_s1", name: "Sib1", profile_path: null, entity_type: "politician", signals: { bioguide_id: "S1" } },
        { id: "ent_donor", name: "Donor", profile_path: null, entity_type: "donor" },
      ],
      edges: [
        { id: "d1", from: "Donor", to: "Target", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
        { id: "d2", from: "Donor", to: "Sib1", type: "monetary", direction: "directed", confidence: 0.9, source: "fec-api", amount: 50000, cycle: 2024, evidence: [], first_seen: "2024-01-01", last_verified: "2024-01-01", status: "active" },
      ],
    })
    const fs = nodeFs
    const os = nodeOs
    const path = nodePath
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "contradictions2-"))
    const rows = [
      { vote_id: "v1", bioguide: "TGT", position: "Nay", party: "D", state: "X" },
      { vote_id: "v1", bioguide: "S1", position: "Yea", party: "D", state: "X" },
    ]
    fs.writeFileSync(path.join(tmpDir, "99.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n")
    const g = new Graph(stores)
    const r = g.politicianContradictions("Target", {
      min_donor_amount: 1000,
      min_siblings_per_vote: 3, // need 3 siblings, only have 1
      data_dir: tmpDir,
    })
    assert.equal(r.contradictions.length, 0)
  })
})
