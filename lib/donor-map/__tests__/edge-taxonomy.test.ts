/**
 * edge-taxonomy.test.ts — TS port of scripts/edge-role-taxonomy-tests.cjs.
 *
 * Mirrors the 39 behavior tests of the CJS suite. The 12 parity tests
 * (one per known edge shape) live in edge-taxonomy-parity.test.ts and
 * compare the TS output to the CJS source of truth.
 */
import { describe, it } from "node:test"
import * as assert from "node:assert/strict"
import {
  classifyEdge,
  sumMonetaryEdgesDedup,
  currentCycle,
  filterEdgesByCycle,
  CATEGORIES as C,
  BUCKETS as B,
  CATEGORY_META,
} from "../edge-taxonomy"

describe("classifyEdge — monetary direct contributions and aliases", () => {
  it("monetary + direct-contribution → DIRECT_CONTRIBUTION", () => {
    const r = classifyEdge({ type: "monetary", role: "direct-contribution", amount: 1000 })
    assert.equal(r.category, C.DIRECT_CONTRIBUTION)
    assert.equal(r.bucket, B.MONEY_DIRECT)
    assert.equal(r.countsAsMoneyReceived, true)
  })

  it("monetary + employee-contributions → DIRECT_CONTRIBUTION", () => {
    const r = classifyEdge({ type: "monetary", role: "employee-contributions" })
    assert.equal(r.category, C.DIRECT_CONTRIBUTION)
  })

  it("monetary + coordinated-party-expense → DIRECT_CONTRIBUTION", () => {
    const r = classifyEdge({ type: "monetary", role: "coordinated-party-expense" })
    assert.equal(r.category, C.DIRECT_CONTRIBUTION)
  })

  it("monetary + party-coordinated → DIRECT_CONTRIBUTION", () => {
    const r = classifyEdge({ type: "monetary", role: "party-coordinated" })
    assert.equal(r.category, C.DIRECT_CONTRIBUTION)
  })
})

describe("classifyEdge — IE spending", () => {
  it("monetary + ie-support → IE_SUPPORT (not counted as received)", () => {
    const r = classifyEdge({ type: "monetary", role: "ie-support", amount: 4709370 })
    assert.equal(r.category, C.IE_SUPPORT)
    assert.equal(r.bucket, B.MONEY_OUTSIDE_FOR)
    assert.equal(r.countsAsMoneyReceived, false)
  })

  it("monetary + ie-oppose → IE_OPPOSE (not counted as received)", () => {
    const r = classifyEdge({ type: "monetary", role: "ie-oppose" })
    assert.equal(r.category, C.IE_OPPOSE)
    assert.equal(r.bucket, B.MONEY_OUTSIDE_AGAINST)
    assert.equal(r.countsAsMoneyReceived, false)
  })
})

describe("classifyEdge — campaign expenditures", () => {
  it("monetary + operating-expense → CAMPAIGN_EXPENDITURE (hidden from donor snapshot)", () => {
    const r = classifyEdge({ type: "monetary", role: "operating-expense", amount: 83000000 })
    assert.equal(r.category, C.CAMPAIGN_EXPENDITURE)
    assert.equal(r.bucket, B.MONEY_EXPENDITURES)
    assert.equal(r.countsAsMoneyReceived, false)
    assert.equal(r.countsAsMoneyGiven, false)
  })
})

describe("classifyEdge — 527 activity", () => {
  it("monetary + 527-expenditure → EXPENDITURE_527", () => {
    const r = classifyEdge({ type: "monetary", role: "527-expenditure" })
    assert.equal(r.category, C.EXPENDITURE_527)
    assert.equal(r.bucket, B.MONEY_527)
  })

  it("monetary + 527-contribution → CONTRIBUTION_527", () => {
    const r = classifyEdge({ type: "monetary", role: "527-contribution" })
    assert.equal(r.category, C.CONTRIBUTION_527)
  })
})

describe("classifyEdge — roleless legacy edges", () => {
  it("monetary + no-role + source=fec-bulk → DIRECT_CONTRIBUTION", () => {
    const r = classifyEdge({
      type: "monetary",
      source: "fec-bulk",
      from: "SEIU COPE",
      to: "Paul Tonko",
      amount: 5000,
    })
    assert.equal(r.category, C.DIRECT_CONTRIBUTION)
  })

  it("monetary + no-role + source=irs-990-bulk → PHILANTHROPIC_GRANT", () => {
    const r = classifyEdge({
      type: "monetary",
      source: "irs-990-bulk",
      from: "Silicon Valley Community Foundation",
      to: "CBPP",
      amount: 800000,
    })
    assert.equal(r.category, C.PHILANTHROPIC_GRANT)
    assert.equal(r.bucket, B.MONEY_GRANTS)
  })
})

describe("classifyEdge — non-monetary edges", () => {
  it("government-contract → GOVERNMENT_CONTRACT", () => {
    const r = classifyEdge({ type: "government-contract" })
    assert.equal(r.category, C.GOVERNMENT_CONTRACT)
    assert.equal(r.bucket, B.CONTRACTS)
  })

  it("federal-grant → FEDERAL_GRANT", () => {
    const r = classifyEdge({ type: "federal-grant" })
    assert.equal(r.category, C.FEDERAL_GRANT)
  })

  it("related → RELATIONSHIP", () => {
    const r = classifyEdge({ type: "related" })
    assert.equal(r.category, C.RELATIONSHIP)
    assert.equal(r.bucket, B.RELATIONSHIPS)
    assert.equal(r.countsAsMoneyReceived, false)
  })

  it("story-link + mentioned → STORY_LINK", () => {
    const r = classifyEdge({ type: "story-link", role: "mentioned" })
    assert.equal(r.category, C.STORY_LINK)
  })

  it("political-opposition → POLITICAL_OPPOSITION", () => {
    const r = classifyEdge({ type: "political-opposition" })
    assert.equal(r.category, C.POLITICAL_OPPOSITION)
  })
})

describe("classifyEdge — affiliation role normalization", () => {
  it("affiliation + officer → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "officer" })
    assert.equal(r.category, C.AFFILIATION)
    assert.equal(r.bucket, B.AFFILIATIONS)
  })

  it("affiliation + intermediary → INTERMEDIARY", () => {
    const r = classifyEdge({ type: "affiliation", role: "intermediary" })
    assert.equal(r.category, C.INTERMEDIARY)
  })

  it("affiliation + BOARD MEMBER (screaming case) → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "BOARD MEMBER" })
    assert.equal(r.category, C.AFFILIATION)
  })

  it("affiliation + Trustee → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "Trustee" })
    assert.equal(r.category, C.AFFILIATION)
  })

  it("affiliation + 'Trustee and Chairman' → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "Trustee and Chairman" })
    assert.equal(r.category, C.AFFILIATION)
  })

  it("affiliation + 'DIRECTOR - UNTIL 06/2024' → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "DIRECTOR - UNTIL 06/2024" })
    assert.equal(r.category, C.AFFILIATION)
  })

  it("affiliation + 'BD OF TRUSTEES' → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "BD OF TRUSTEES" })
    assert.equal(r.category, C.AFFILIATION)
  })

  it("affiliation + 'Vice President' → AFFILIATION", () => {
    const r = classifyEdge({ type: "affiliation", role: "Vice President" })
    assert.equal(r.category, C.AFFILIATION)
  })
})

describe("classifyEdge — accounting invariants", () => {
  it("IE support must not count toward 'total received'", () => {
    const r = classifyEdge({ type: "monetary", role: "ie-support", amount: 4709370 })
    assert.equal(r.countsAsMoneyReceived, false)
  })

  it("Campaign expenditures do NOT count as political giving", () => {
    const r = classifyEdge({ type: "monetary", role: "operating-expense", amount: 83000000 })
    assert.equal(r.countsAsMoneyGiven, false)
  })

  it("Philanthropic grants render in their own grants bucket", () => {
    const r = classifyEdge({ type: "monetary", source: "irs-990-bulk" })
    assert.equal(r.bucket, B.MONEY_GRANTS)
  })
})

describe("classifyEdge — unknown cases throw", () => {
  it("unknown monetary role throws", () => {
    assert.throws(
      () => classifyEdge({ type: "monetary", role: "some-new-role-we-havent-seen" }),
      /unknown monetary role/,
    )
  })

  it("unknown top-level type throws", () => {
    assert.throws(() => classifyEdge({ type: "mystery-type" }), /unknown edge type/)
  })

  it("unknown affiliation role throws", () => {
    assert.throws(
      () => classifyEdge({ type: "affiliation", role: "sidekick" }),
      /unknown affiliation role/,
    )
  })

  it("null edge throws", () => {
    assert.throws(() => classifyEdge(null), /edge is required/)
  })
})

describe("sumMonetaryEdgesDedup", () => {
  it("single edge returns its amount", () => {
    const total = sumMonetaryEdgesDedup([
      { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 4400000 },
    ])
    assert.equal(total, 4400000)
  })

  it("fec-api lifetime wins when > pas2 sum", () => {
    const total = sumMonetaryEdgesDedup([
      { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 4400000 },
      { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 1000000 },
      {
        from: "Emilys List",
        to: "Josh Hawley",
        role: "ie-oppose",
        amount: 8500000,
        metadata: { cycle_attribution: "lifetime-cumulative" },
      },
    ])
    assert.equal(total, 8500000)
  })

  it("pas2 sum wins when fec-api is stale", () => {
    const total = sumMonetaryEdgesDedup([
      { from: "NRSC", to: "Cortez Masto", role: "ie-oppose", amount: 8000000 },
      { from: "NRSC", to: "Cortez Masto", role: "ie-oppose", amount: 3000000 },
      {
        from: "NRSC",
        to: "Cortez Masto",
        role: "ie-oppose",
        amount: 4359000,
        metadata: { cycle_attribution: "lifetime-cumulative" },
      },
    ])
    assert.equal(total, 11000000)
  })

  it("case-insensitive + apostrophe-normalized key", () => {
    const total = sumMonetaryEdgesDedup([
      { from: "EMILY'S LIST", to: "Josh Hawley", role: "ie-oppose", amount: 4000000 },
      {
        from: "emily's list",
        to: "Josh Hawley",
        role: "ie-oppose",
        amount: 1000000,
        metadata: { cycle_attribution: "lifetime-cumulative" },
      },
    ])
    assert.equal(total, 4000000)
  })

  it("different roles NOT merged (IE-support vs IE-oppose)", () => {
    const total = sumMonetaryEdgesDedup([
      { from: "PAC A", to: "Politician", role: "ie-support", amount: 1000000 },
      { from: "PAC A", to: "Politician", role: "ie-oppose", amount: 500000 },
    ])
    assert.equal(total, 1500000)
  })

  it("skips null / non-numeric amounts", () => {
    const total = sumMonetaryEdgesDedup([
      { from: "A", to: "B", role: "r", amount: 1000 },
      { from: "A", to: "B", role: "r", amount: null },
      { from: "A", to: "B", role: "r", amount: undefined as unknown as number },
      { from: "A", to: "B", role: "r" },
    ])
    assert.equal(total, 1000)
  })

  it("empty input returns 0", () => {
    assert.equal(sumMonetaryEdgesDedup([]), 0)
  })
})

describe("currentCycle / filterEdgesByCycle", () => {
  it("currentCycle: even year returns itself", () => {
    assert.equal(currentCycle(new Date("2026-04-22T00:00:00Z")), "2026")
    assert.equal(currentCycle(new Date("2024-11-15T00:00:00Z")), "2024")
  })

  it("currentCycle: odd year returns next even (FEC convention)", () => {
    assert.equal(currentCycle(new Date("2025-07-01T00:00:00Z")), "2026")
    assert.equal(currentCycle(new Date("2023-03-10T00:00:00Z")), "2024")
  })

  it("currentCycle: DM_CURRENT_CYCLE env var overrides", () => {
    const prev = process.env.DM_CURRENT_CYCLE
    process.env.DM_CURRENT_CYCLE = "2020"
    try {
      assert.equal(currentCycle(new Date("2026-04-22T00:00:00Z")), "2020")
    } finally {
      if (prev == null) delete process.env.DM_CURRENT_CYCLE
      else process.env.DM_CURRENT_CYCLE = prev
    }
  })

  it("filterEdgesByCycle: matches exact cycle", () => {
    const edges = [
      { cycle: "2020", amount: 1 },
      { cycle: "2024", amount: 2 },
      { cycle: 2020, amount: 3 },
      { cycle: "2026", amount: 4 },
    ]
    const got = filterEdgesByCycle(edges, "2020")
    assert.equal(got.length, 2)
  })

  it("filterEdgesByCycle: EXCLUDES null-cycle edges", () => {
    const edges = [
      { cycle: "2026", amount: 1000 },
      { cycle: null, amount: 500, metadata: { cycle_attribution: "lifetime-cumulative" } },
      { cycle: "2026", amount: 250 },
    ]
    const got = filterEdgesByCycle(edges, "2026")
    assert.equal(got.length, 2)
  })

  it("filterEdgesByCycle: empty list returns empty", () => {
    assert.deepEqual(filterEdgesByCycle([], "2026"), [])
  })
})

describe("CATEGORY_META completeness", () => {
  it("every category has full metadata", () => {
    for (const key of Object.values(C)) {
      const meta = CATEGORY_META[key]
      assert.ok(meta, `category ${key} has no metadata`)
      assert.equal(typeof meta.label, "string")
      assert.equal(typeof meta.bucket, "string")
      assert.equal(typeof meta.countsAsMoneyReceived, "boolean")
      assert.equal(typeof meta.countsAsMoneyGiven, "boolean")
      assert.equal(typeof meta.description, "string")
    }
  })
})
