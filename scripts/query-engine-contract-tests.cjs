#!/usr/bin/env node
// query-engine-contract-tests.cjs — regression coverage for query engine
//
// The query engine exposes 6 subjects through a single query(spec)
// entrypoint. These tests lock in the OUTPUT CONTRACT — the shape of
// the result, the presence of mandatory fields, and the behavior
// under empty / common / limit-exceeded inputs — so a future refactor
// can't silently drift the API.
//
// Contract under test (from scripts/lib/query-engine.cjs):
//
//   Every query() result has shape { subject, total, returned, rows[] }
//   Every count() result is a non-negative integer
//   Every describe() result is a non-empty string
//
//   Subjects and their row shapes:
//     edges — relationship edges from data/relationships.jsonl
//     entities — entity records from data/entities.jsonl
//     events — event records from data/events.jsonl
//     cross_party_donors — computed class-analysis composer
//     timing_proximity — computed edges × events composer
//     top_opposition_donors — computed cross-policy aggregator
//
// Run: node --test scripts/query-engine-contract-tests.cjs

const { test } = require("node:test")
const assert = require("node:assert/strict")

const { createQueryEngine } = require("./lib/query-engine.cjs")

// Create one engine instance for the whole suite — loads data once
const engine = createQueryEngine()

// ─── Shape contract: every query() returns { subject, total, returned, rows } ───

test("query() on edges returns {subject, total, returned, rows}", () => {
  const result = engine.query({ subject: "edges", filters: { type: "monetary", limit: 5 } })
  assert.equal(result.subject, "edges")
  assert.equal(typeof result.total, "number")
  assert.equal(typeof result.returned, "number")
  assert.ok(Array.isArray(result.rows))
  assert.ok(result.rows.length <= 5, "returned row count must respect limit")
  assert.equal(result.returned, result.rows.length)
})

test("query() on entities returns shape contract", () => {
  const result = engine.query({ subject: "entities", filters: { entity_type: "donor", limit: 5 } })
  assert.equal(result.subject, "entities")
  assert.ok(Array.isArray(result.rows))
  assert.ok(result.rows.length <= 5)
})

test("query() on events returns shape contract", () => {
  const result = engine.query({ subject: "events", filters: { event_type: "floor_vote", limit: 5 } })
  assert.equal(result.subject, "events")
  assert.ok(Array.isArray(result.rows))
})

test("query() on unknown subject throws", () => {
  assert.throws(() => engine.query({ subject: "nonexistent" }), /unknown subject/)
})

// ─── Count contract ───

test("count() on edges with filter returns non-negative integer", () => {
  const c = engine.count({ subject: "edges", filters: { type: "monetary" } })
  assert.equal(typeof c, "number")
  assert.ok(Number.isInteger(c))
  assert.ok(c >= 0)
})

test("count() on entities matches actual entity count", () => {
  const c = engine.count({ subject: "entities", filters: { entity_type: "donor" } })
  const qAll = engine.query({ subject: "entities", filters: { entity_type: "donor", limit: 500 } })
  // count returns full filtered count; query returns paginated slice
  assert.ok(c >= qAll.returned, "count() must be >= returned rows in clamped page")
})

test("count() on unknown subject returns 0 (not throw)", () => {
  // count() is tolerant where query() is strict — it's called from UI
  // code that may pass stale subject names during migration
  const c = engine.count({ subject: "nonexistent" })
  assert.equal(c, 0)
})

// ─── Describe contract ───

test("describe() returns non-empty string", () => {
  const s = engine.describe({ subject: "edges", filters: { from_type: "donor" } })
  assert.equal(typeof s, "string")
  assert.ok(s.length > 0)
  assert.ok(s.includes("subject: edges"))
})

// ─── Pagination contract ───

test("query() pagination: offset + limit are respected", () => {
  const page1 = engine.query({ subject: "edges", filters: { type: "monetary", limit: 10, offset: 0 } })
  const page2 = engine.query({ subject: "edges", filters: { type: "monetary", limit: 10, offset: 10 } })
  if (page1.total > 10) {
    assert.ok(page2.rows.length > 0, "second page should have rows if total > limit")
    // Pages should not overlap
    const ids1 = new Set(page1.rows.map((r) => r.id || JSON.stringify(r)))
    for (const r of page2.rows) {
      const id = r.id || JSON.stringify(r)
      assert.ok(!ids1.has(id), `page 2 row ${id} already in page 1`)
    }
  }
})

test("query() edges with limit=0 returns no rows", () => {
  const result = engine.query({ subject: "edges", filters: { type: "monetary", limit: 0 } })
  assert.equal(result.rows.length, 0)
})

// ─── Filter contract: entity_type filter actually filters ───

test("entities filter by entity_type=donor returns only donors", () => {
  const result = engine.query({ subject: "entities", filters: { entity_type: "donor", limit: 50 } })
  for (const r of result.rows) {
    assert.equal(r.entity_type, "donor", `expected donor, got ${r.entity_type}`)
  }
})

test("entities filter by entity_type=politician returns only politicians", () => {
  const result = engine.query({
    subject: "entities",
    filters: { entity_type: "politician", limit: 50 },
  })
  for (const r of result.rows) {
    assert.equal(r.entity_type, "politician")
  }
})

test("entities filter by tags_approved=true returns only approved", () => {
  const result = engine.query({
    subject: "entities",
    filters: { tags_approved: true, limit: 200 },
  })
  for (const r of result.rows) {
    assert.equal(r.tags_approved, true)
  }
})

// ─── Composer contract: top_opposition_donors returns aggregate rows ───

test("top_opposition_donors returns an aggregate row shape", () => {
  const result = engine.query({
    subject: "top_opposition_donors",
    filters: { limit: 10 },
  })
  assert.equal(result.subject, "top_opposition_donors")
  assert.ok(Array.isArray(result.rows))
  // If any rows returned, each must have a donor name
  for (const r of result.rows) {
    assert.ok(
      typeof r.donor === "string" || typeof r.name === "string",
      "aggregate row must have donor/name field",
    )
  }
})

// ─── Composer contract: cross_party_donors returns rows with both-parties flag ───

test("cross_party_donors composer returns rows (may be empty)", () => {
  const result = engine.query({ subject: "cross_party_donors", filters: { limit: 10 } })
  assert.equal(result.subject, "cross_party_donors")
  assert.ok(Array.isArray(result.rows))
  assert.ok(typeof result.total === "number")
})

// ─── Composer contract: timing_proximity returns rows ───

test("timing_proximity composer returns rows with day window", () => {
  const result = engine.query({
    subject: "timing_proximity",
    filters: { timing_proximity_days: 30, limit: 10 },
  })
  assert.equal(result.subject, "timing_proximity")
  assert.ok(Array.isArray(result.rows))
})

// ─── Regression: topOppositionDonors is a named public method ───

test("engine exports topOppositionDonors as a direct method", () => {
  assert.equal(typeof engine.topOppositionDonors, "function")
  const rows = engine.topOppositionDonors({ limit: 5 })
  assert.ok(Array.isArray(rows))
})

test("engine exports crossPartyDonors as a direct method", () => {
  assert.equal(typeof engine.crossPartyDonors, "function")
})

test("engine exports timingProximity as a direct method", () => {
  assert.equal(typeof engine.timingProximity, "function")
})

test("engine exports clear() for test teardown", () => {
  assert.equal(typeof engine.clear, "function")
})

// ─── Edge cases: Phase 6 requirement — 10 query edge cases ───────────────

test("query() with no filters on edges throws unbounded-query error", () => {
  // Security hardening: unbounded queries on edges/entities/events are rejected
  assert.throws(
    () => engine.query({ subject: "edges", filters: {} }),
    /Unbounded query on "edges"/,
  )
})

test("query() with null filters on edges throws unbounded-query error", () => {
  // Security hardening: null filters treated as no-filter, rejected for table-scan subjects
  assert.throws(
    () => engine.query({ subject: "edges", filters: null }),
    /Unbounded query on "edges"/,
  )
})

test("query() with limit=1 returns exactly one row when data exists", () => {
  const result = engine.query({ subject: "edges", filters: { type: "monetary", limit: 1 } })
  assert.equal(result.rows.length, 1)
  assert.equal(result.returned, 1)
})

test("query() with very large limit is clamped to MAX_PAGE_SIZE (2000)", () => {
  const result = engine.query({ subject: "entities", filters: { entity_type: "donor", limit: 9999999 } })
  assert.ok(Array.isArray(result.rows))
  assert.ok(result.rows.length <= 2000, "returned rows must not exceed MAX_PAGE_SIZE")
  assert.equal(result.returned, result.rows.length)
})

test("query() entities with unicode search in name filter returns subset", () => {
  // Should not throw on unicode input — filter may return 0 rows, that's fine
  const result = engine.query({ subject: "entities", filters: { search: "Ñ±ü", limit: 10 } })
  assert.ok(Array.isArray(result.rows))
  assert.ok(result.total >= 0)
})

test("query() edges with special chars in from_name filter does not throw", () => {
  const result = engine.query({ subject: "edges", filters: { from_name: "O'Brien & Co.", limit: 5 } })
  assert.ok(Array.isArray(result.rows))
})

test("query() total is stable across repeated calls with same filter", () => {
  const r1 = engine.query({ subject: "edges", filters: { type: "monetary", limit: 100 } })
  const r2 = engine.query({ subject: "edges", filters: { type: "monetary", limit: 100 } })
  assert.equal(r1.total, r2.total, "total should be deterministic")
})

test("count() returns same value as query().total for filtered subjects", () => {
  // Must use real filters now (unbounded-query gate)
  const cases = [
    { subject: "edges", filters: { type: "monetary" } },
    { subject: "entities", filters: { entity_type: "donor" } },
    { subject: "events", filters: { event_type: "floor_vote" } },
  ]
  for (const { subject, filters } of cases) {
    const counted = engine.count({ subject, filters })
    const queried = engine.query({ subject, filters: { ...filters, limit: 0 } }).total
    assert.equal(counted, queried, `count vs query().total mismatch for ${subject}`)
  }
})

test("query() with offset >= total returns empty rows but correct total", () => {
  const all = engine.query({ subject: "entities", filters: { entity_type: "donor", limit: 1 } })
  const beyondEnd = engine.query({ subject: "entities", filters: { entity_type: "donor", limit: 10, offset: all.total + 100 } })
  assert.equal(beyondEnd.rows.length, 0, "no rows beyond total")
  assert.equal(beyondEnd.total, all.total, "total unchanged by offset")
})

test("query() on events returns event records with required shape", () => {
  const result = engine.query({ subject: "events", filters: { event_type: "floor_vote", limit: 5 } })
  assert.ok(Array.isArray(result.rows))
  // Events should have at minimum: id or title
  for (const r of result.rows) {
    const hasId = typeof r.id === "string" || typeof r.title === "string"
    assert.ok(hasId, "event row must have id or title")
  }
})

// ─── Cost limit contract tests (security hardening) ─────────────────────

test("SECURITY: unbounded query on edges is rejected", () => {
  assert.throws(
    () => engine.query({ subject: "edges" }),
    /Unbounded query/,
    "edges with no spec should throw unbounded-query error",
  )
})

test("SECURITY: unbounded query on entities is rejected", () => {
  assert.throws(
    () => engine.query({ subject: "entities", filters: {} }),
    /Unbounded query/,
  )
})

test("SECURITY: unbounded query on events is rejected", () => {
  assert.throws(
    () => engine.query({ subject: "events", filters: { limit: 10 } }),
    /Unbounded query/,
    "limit-only filters (pagination keys) should not count as real filters",
  )
})

test("SECURITY: query with real filter is allowed", () => {
  const result = engine.query({ subject: "edges", filters: { type: "monetary", limit: 5 } })
  assert.equal(result.subject, "edges")
  assert.ok(result.rows.length <= 5)
})

test("SECURITY: limit is clamped to 2000 (MAX_PAGE_SIZE)", () => {
  // Bumped from 500 → 2000 on 2026-04-19 to accommodate the biggest
  // vault committees (MAGA Inc 967 inflow edges, Trump Victory 1,197)
  // after the indiv-aggregation ingest. UI silently truncated MAGA
  // Inc's $973M to $342M under the old 500-row cap.
  const result = engine.query({ subject: "edges", filters: { type: "monetary", limit: 10000 } })
  assert.ok(result.rows.length <= 2000, `returned ${result.rows.length} rows, expected <= 2000`)
})

test("SECURITY: composers (cross_party_donors) still work without unbounded gate", () => {
  // Composers are pre-aggregated and bounded by their own logic
  const result = engine.query({ subject: "cross_party_donors", filters: { limit: 5 } })
  assert.equal(result.subject, "cross_party_donors")
  assert.ok(Array.isArray(result.rows))
})

test("SECURITY: count() on unbounded edges still works (for UI)", () => {
  // count() is tolerant — it does the full scan but only returns a number,
  // which is much cheaper than returning rows. Keep this working for dashboard counts.
  const c = engine.count({ subject: "edges" })
  assert.equal(typeof c, "number")
  assert.ok(c > 0)
})
