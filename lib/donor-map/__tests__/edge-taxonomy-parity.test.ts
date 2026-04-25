/**
 * edge-taxonomy-parity.test.ts — proves the TS port and CJS source agree.
 *
 * The CJS rulebook (scripts/lib/edge-role-taxonomy.cjs) is consumed by 39
 * Node scripts. The TS port (../edge-taxonomy.ts) is consumed by the
 * librarian + ops Next.js code. Both must classify identical inputs
 * identically until the CJS callers have all been migrated through the
 * librarian (ADR-0024 Phase 3+).
 *
 * If this suite fails, one side has been edited without the other.
 */
import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import { createRequire } from "node:module"
import {
  classifyEdge as classifyTs,
  sumMonetaryEdgesDedup as sumTs,
  currentCycle as currentCycleTs,
  filterEdgesByCycle as filterTs,
  CATEGORIES as C_TS,
  BUCKETS as B_TS,
  CATEGORY_META as META_TS,
  type ClassifiableEdge,
} from "../edge-taxonomy"

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cjs = require("../../../scripts/lib/edge-role-taxonomy.cjs") as {
  classifyEdge: (e: unknown) => Record<string, unknown>
  sumMonetaryEdgesDedup: (edges: unknown[]) => number
  currentCycle: (now?: Date) => string
  filterEdgesByCycle: <T>(edges: T[], cycle: string | number) => T[]
  CATEGORIES: Record<string, string>
  BUCKETS: Record<string, string>
  CATEGORY_META: Record<string, Record<string, unknown>>
}

// Every shape we expect to see in production. Add new ones here when
// new (type, role) pairs land in canonical stores.
const CASES: Array<{ name: string; edge: ClassifiableEdge }> = [
  { name: "monetary direct-contribution", edge: { type: "monetary", role: "direct-contribution", amount: 1000 } },
  { name: "monetary employee-contributions", edge: { type: "monetary", role: "employee-contributions" } },
  { name: "monetary coordinated-party-expense", edge: { type: "monetary", role: "coordinated-party-expense" } },
  { name: "monetary party-coordinated", edge: { type: "monetary", role: "party-coordinated" } },
  { name: "monetary ie-support", edge: { type: "monetary", role: "ie-support", amount: 4709370 } },
  { name: "monetary ie-oppose", edge: { type: "monetary", role: "ie-oppose" } },
  { name: "monetary operating-expense", edge: { type: "monetary", role: "operating-expense", amount: 83000000 } },
  { name: "monetary 527-expenditure", edge: { type: "monetary", role: "527-expenditure" } },
  { name: "monetary 527-contribution", edge: { type: "monetary", role: "527-contribution" } },
  { name: "monetary roleless fec-bulk", edge: { type: "monetary", source: "fec-bulk", amount: 5000 } },
  { name: "monetary roleless irs-990-bulk", edge: { type: "monetary", source: "irs-990-bulk", amount: 800000 } },
  { name: "government-contract", edge: { type: "government-contract" } },
  { name: "federal-grant", edge: { type: "federal-grant" } },
  { name: "related (wikilink)", edge: { type: "related" } },
  { name: "story-link mentioned", edge: { type: "story-link", role: "mentioned" } },
  { name: "political-opposition", edge: { type: "political-opposition" } },
  { name: "affiliation officer", edge: { type: "affiliation", role: "officer" } },
  { name: "affiliation intermediary", edge: { type: "affiliation", role: "intermediary" } },
  { name: "affiliation BOARD MEMBER", edge: { type: "affiliation", role: "BOARD MEMBER" } },
  { name: "affiliation Trustee", edge: { type: "affiliation", role: "Trustee" } },
  { name: "affiliation BD OF TRUSTEES", edge: { type: "affiliation", role: "BD OF TRUSTEES" } },
  { name: "affiliation Vice President", edge: { type: "affiliation", role: "Vice President" } },
  { name: "affiliation DIRECTOR - UNTIL 06/2024", edge: { type: "affiliation", role: "DIRECTOR - UNTIL 06/2024" } },
  { name: "affiliation Trustee and Chairman", edge: { type: "affiliation", role: "Trustee and Chairman" } },
]

describe("edge-taxonomy parity (TS vs CJS)", () => {
  it("CATEGORIES enum matches", () => {
    assert.deepEqual({ ...C_TS }, { ...cjs.CATEGORIES })
  })

  it("BUCKETS enum matches", () => {
    assert.deepEqual({ ...B_TS }, { ...cjs.BUCKETS })
  })

  it("CATEGORY_META matches for every category", () => {
    for (const key of Object.values(C_TS)) {
      const tsMeta = META_TS[key]
      const cjsMeta = cjs.CATEGORY_META[key]
      assert.deepEqual({ ...tsMeta }, { ...cjsMeta }, `meta diverged for ${key}`)
    }
  })

  for (const { name, edge } of CASES) {
    it(`classifyEdge agrees: ${name}`, () => {
      const a = classifyTs(edge)
      const b = cjs.classifyEdge(edge)
      assert.deepEqual({ ...a }, { ...b })
    })
  }

  it("classifyEdge throws identically on unknown monetary role", () => {
    assert.throws(() => classifyTs({ type: "monetary", role: "xxx" }), /unknown monetary role/)
    assert.throws(() => cjs.classifyEdge({ type: "monetary", role: "xxx" }), /unknown monetary role/)
  })

  it("classifyEdge throws identically on unknown top-level type", () => {
    assert.throws(() => classifyTs({ type: "xxx" }), /unknown edge type/)
    assert.throws(() => cjs.classifyEdge({ type: "xxx" }), /unknown edge type/)
  })

  it("sumMonetaryEdgesDedup agrees on a mixed batch", () => {
    const batch = [
      { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 4400000 },
      { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 1000000 },
      {
        from: "Emilys List",
        to: "Josh Hawley",
        role: "ie-oppose",
        amount: 8500000,
        metadata: { cycle_attribution: "lifetime-cumulative" },
      },
      { from: "PAC A", to: "Politician", role: "ie-support", amount: 1000000 },
      { from: "PAC A", to: "Politician", role: "ie-oppose", amount: 500000 },
      { from: "X", to: "Y", role: "r", amount: null as unknown as number },
    ]
    assert.equal(sumTs(batch), cjs.sumMonetaryEdgesDedup(batch))
  })

  it("currentCycle agrees on even/odd/override", () => {
    assert.equal(currentCycleTs(new Date("2026-04-22T00:00:00Z")), cjs.currentCycle(new Date("2026-04-22T00:00:00Z")))
    assert.equal(currentCycleTs(new Date("2025-07-01T00:00:00Z")), cjs.currentCycle(new Date("2025-07-01T00:00:00Z")))
    const prev = process.env.DM_CURRENT_CYCLE
    process.env.DM_CURRENT_CYCLE = "2020"
    try {
      assert.equal(currentCycleTs(), cjs.currentCycle())
    } finally {
      if (prev == null) delete process.env.DM_CURRENT_CYCLE
      else process.env.DM_CURRENT_CYCLE = prev
    }
  })

  it("filterEdgesByCycle agrees", () => {
    const edges = [
      { cycle: "2020", amount: 1 },
      { cycle: "2026", amount: 2 },
      { cycle: null, amount: 3, metadata: { cycle_attribution: "lifetime-cumulative" } },
    ]
    assert.deepEqual(filterTs(edges, "2026"), cjs.filterEdgesByCycle(edges, "2026"))
  })
})
