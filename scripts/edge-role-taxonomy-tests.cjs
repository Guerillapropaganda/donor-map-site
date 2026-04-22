/**
 * edge-role-taxonomy-tests.cjs — unit tests for the classifier.
 *
 * Every (type, role) pair that exists in the production edge store
 * must have an explicit test. Unknown pairs must throw. If this
 * suite fails, the classifier is not safe to release.
 *
 * Run: node --test scripts/edge-role-taxonomy-tests.cjs
 */

const { test } = require("node:test")
const assert = require("node:assert/strict")
const {
  classifyEdge,
  CATEGORIES: C,
  BUCKETS: B,
  _internal,
} = require("./lib/edge-role-taxonomy.cjs")

// ─── Monetary: direct-contribution and its aliases ─────────────────

test("monetary + direct-contribution → DIRECT_CONTRIBUTION", () => {
  const r = classifyEdge({ type: "monetary", role: "direct-contribution", amount: 1000 })
  assert.equal(r.category, C.DIRECT_CONTRIBUTION)
  assert.equal(r.bucket, B.MONEY_DIRECT)
  assert.equal(r.countsAsMoneyReceived, true)
})

test("monetary + employee-contributions → DIRECT_CONTRIBUTION (Google-employees-style aggregation)", () => {
  const r = classifyEdge({ type: "monetary", role: "employee-contributions" })
  assert.equal(r.category, C.DIRECT_CONTRIBUTION)
})

test("monetary + coordinated-party-expense → DIRECT_CONTRIBUTION (party coordinates with candidate)", () => {
  const r = classifyEdge({ type: "monetary", role: "coordinated-party-expense" })
  assert.equal(r.category, C.DIRECT_CONTRIBUTION)
})

test("monetary + party-coordinated (synonym) → DIRECT_CONTRIBUTION", () => {
  const r = classifyEdge({ type: "monetary", role: "party-coordinated" })
  assert.equal(r.category, C.DIRECT_CONTRIBUTION)
})

// ─── Monetary: IE spending ─────────────────────────────────────────

test("monetary + ie-support → IE_SUPPORT (not counted as received)", () => {
  const r = classifyEdge({ type: "monetary", role: "ie-support", amount: 4709370 })
  assert.equal(r.category, C.IE_SUPPORT)
  assert.equal(r.bucket, B.MONEY_OUTSIDE_FOR)
  assert.equal(r.countsAsMoneyReceived, false,
    "IE support money was spent FOR the candidate but they never received it — must NOT count as money received")
})

test("monetary + ie-oppose → IE_OPPOSE (not counted as received)", () => {
  const r = classifyEdge({ type: "monetary", role: "ie-oppose" })
  assert.equal(r.category, C.IE_OPPOSE)
  assert.equal(r.bucket, B.MONEY_OUTSIDE_AGAINST)
  assert.equal(r.countsAsMoneyReceived, false)
})

// ─── Monetary: campaign expenditures ───────────────────────────────

test("monetary + operating-expense → CAMPAIGN_EXPENDITURE (hidden from donor snapshot)", () => {
  const r = classifyEdge({ type: "monetary", role: "operating-expense", amount: 83000000 })
  assert.equal(r.category, C.CAMPAIGN_EXPENDITURE)
  assert.equal(r.bucket, B.MONEY_EXPENDITURES)
  assert.equal(r.countsAsMoneyReceived, false)
  assert.equal(r.countsAsMoneyGiven, false,
    "OLD TOWNE MEDIA getting $83M from Bernie's campaign is NOT Bernie politically giving them money — it's an ad buy")
})

// ─── Monetary: 527 activity ────────────────────────────────────────

test("monetary + 527-expenditure → EXPENDITURE_527", () => {
  const r = classifyEdge({ type: "monetary", role: "527-expenditure" })
  assert.equal(r.category, C.EXPENDITURE_527)
  assert.equal(r.bucket, B.MONEY_527)
})

test("monetary + 527-contribution → CONTRIBUTION_527", () => {
  const r = classifyEdge({ type: "monetary", role: "527-contribution" })
  assert.equal(r.category, C.CONTRIBUTION_527)
})

// ─── Monetary: roleless legacy edges (fec-bulk, irs-990-bulk) ──────

test("monetary + no-role + source=fec-bulk → DIRECT_CONTRIBUTION (legacy PAS2)", () => {
  const r = classifyEdge({ type: "monetary", source: "fec-bulk", from: "SEIU COPE", to: "Paul Tonko", amount: 5000 })
  assert.equal(r.category, C.DIRECT_CONTRIBUTION,
    "Legacy fec-bulk edges (20,671 in store) are PAS2 PAC-to-candidate contributions — direct contributions")
})

test("monetary + no-role + source=irs-990-bulk → PHILANTHROPIC_GRANT", () => {
  const r = classifyEdge({ type: "monetary", source: "irs-990-bulk", from: "Silicon Valley Community Foundation", to: "CBPP", amount: 800000 })
  assert.equal(r.category, C.PHILANTHROPIC_GRANT,
    "IRS 990 foundation grants are philanthropic, not political — must route to grants bucket not direct-contribution")
  assert.equal(r.bucket, B.MONEY_GRANTS)
})

// ─── Non-monetary edges ────────────────────────────────────────────

test("government-contract → GOVERNMENT_CONTRACT", () => {
  const r = classifyEdge({ type: "government-contract" })
  assert.equal(r.category, C.GOVERNMENT_CONTRACT)
  assert.equal(r.bucket, B.CONTRACTS)
})

test("federal-grant → FEDERAL_GRANT", () => {
  const r = classifyEdge({ type: "federal-grant" })
  assert.equal(r.category, C.FEDERAL_GRANT)
})

test("related → RELATIONSHIP (wikilink)", () => {
  const r = classifyEdge({ type: "related" })
  assert.equal(r.category, C.RELATIONSHIP)
  assert.equal(r.bucket, B.RELATIONSHIPS)
  assert.equal(r.countsAsMoneyReceived, false)
})

test("story-link + mentioned → STORY_LINK", () => {
  const r = classifyEdge({ type: "story-link", role: "mentioned" })
  assert.equal(r.category, C.STORY_LINK)
})

test("political-opposition → POLITICAL_OPPOSITION", () => {
  const r = classifyEdge({ type: "political-opposition" })
  assert.equal(r.category, C.POLITICAL_OPPOSITION)
})

// ─── Affiliation role normalization (case-chaos cleanup) ───────────

test("affiliation + officer → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "officer" })
  assert.equal(r.category, C.AFFILIATION)
  assert.equal(r.bucket, B.AFFILIATIONS)
})

test("affiliation + intermediary → INTERMEDIARY (conduit, not original source)", () => {
  const r = classifyEdge({ type: "affiliation", role: "intermediary" })
  assert.equal(r.category, C.INTERMEDIARY,
    "Intermediary passes money through — should not render as standalone donor/recipient")
})

test("affiliation + BOARD MEMBER (screaming case) → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "BOARD MEMBER" })
  assert.equal(r.category, C.AFFILIATION)
})

test("affiliation + Trustee → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "Trustee" })
  assert.equal(r.category, C.AFFILIATION)
})

test("affiliation + 'Trustee and Chairman' (mixed phrasing) → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "Trustee and Chairman" })
  assert.equal(r.category, C.AFFILIATION)
})

test("affiliation + 'DIRECTOR - UNTIL 06/2024' (dated variant) → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "DIRECTOR - UNTIL 06/2024" })
  assert.equal(r.category, C.AFFILIATION)
})

test("affiliation + 'BD OF TRUSTEES' (abbreviated + plural) → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "BD OF TRUSTEES" })
  assert.equal(r.category, C.AFFILIATION,
    "Harlan Crow on AEI board appears as 'BD OF TRUSTEES' — abbreviations + plural must be handled")
})

test("affiliation + 'Vice President' → AFFILIATION", () => {
  const r = classifyEdge({ type: "affiliation", role: "Vice President" })
  assert.equal(r.category, C.AFFILIATION)
})

// ─── Accounting invariants (the OpenSecrets credibility fix) ──────

test("IE support must not count toward 'total received' — OpenSecrets invariant", () => {
  const r = classifyEdge({ type: "monetary", role: "ie-support", amount: 4709370 })
  assert.equal(r.countsAsMoneyReceived, false,
    "Bernie's profile was calling NNU's $4.7M IE a 'direct donation' — that's the bug. IE is OUTSIDE spending, not received money.")
})

test("Campaign expenditures do NOT count as political giving — the $465M Bernie bug", () => {
  const r = classifyEdge({ type: "monetary", role: "operating-expense", amount: 83000000 })
  assert.equal(r.countsAsMoneyGiven, false,
    "OLD TOWNE MEDIA got $83M in ad buys from Bernie's campaign. Rendering that as 'Bernie's political recipients' was the $465M credibility bug.")
})

test("Philanthropic grants count as money received by the grantee but are NOT political donations", () => {
  const r = classifyEdge({ type: "monetary", source: "irs-990-bulk" })
  assert.equal(r.bucket, B.MONEY_GRANTS,
    "Philanthropic grants must render in their own grants section, not mixed with political contributions")
})

// ─── Unknown cases must THROW (never silently bucket) ─────────────

test("unknown monetary role throws", () => {
  assert.throws(() =>
    classifyEdge({ type: "monetary", role: "some-new-role-we-havent-seen" }),
  /unknown monetary role/)
})

test("unknown top-level type throws", () => {
  assert.throws(() =>
    classifyEdge({ type: "mystery-type" }),
  /unknown edge type/)
})

test("unknown affiliation role (non-officer/intermediary/role-pattern) throws", () => {
  assert.throws(() =>
    classifyEdge({ type: "affiliation", role: "sidekick" }),
  /unknown affiliation role/)
})

test("null edge throws", () => {
  assert.throws(() => classifyEdge(null), /edge is required/)
})

// ─── Dedup helper (sumMonetaryEdgesDedup) ─────────────────────────

const { sumMonetaryEdgesDedup } = require("./lib/edge-role-taxonomy.cjs")

test("sumMonetaryEdgesDedup: single edge returns its amount", () => {
  const total = sumMonetaryEdgesDedup([
    { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 4400000 },
  ])
  assert.equal(total, 4400000)
})

test("sumMonetaryEdgesDedup: fec-api lifetime wins when > pas2 sum", () => {
  const total = sumMonetaryEdgesDedup([
    { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 4400000 }, // pas2 2018
    { from: "Emily's List", to: "Josh Hawley", role: "ie-oppose", amount: 1000000 }, // pas2 2020
    { from: "Emilys List", to: "Josh Hawley", role: "ie-oppose", amount: 8500000,    // fec-api cumulative; note apostrophe diff
      metadata: { cycle_attribution: "lifetime-cumulative" } },
  ])
  assert.equal(total, 8500000,
    "fec-api cumulative ($8.5M) already includes the pas2 transactions ($4.4M + $1M) — must NOT double-count")
})

test("sumMonetaryEdgesDedup: pas2 sum wins when fec-api is stale (the 9 observed cases)", () => {
  const total = sumMonetaryEdgesDedup([
    { from: "NRSC", to: "Cortez Masto", role: "ie-oppose", amount: 8000000 }, // pas2 cycle A
    { from: "NRSC", to: "Cortez Masto", role: "ie-oppose", amount: 3000000 }, // pas2 cycle B
    { from: "NRSC", to: "Cortez Masto", role: "ie-oppose", amount: 4359000,   // stale fec-api
      metadata: { cycle_attribution: "lifetime-cumulative" } },
  ])
  assert.equal(total, 11000000, "When fec-api is stale (4.3M) < pas2 sum (11M), use pas2 sum — OBSERVED real pair")
})

test("sumMonetaryEdgesDedup: case-insensitive + apostrophe-normalized key", () => {
  const total = sumMonetaryEdgesDedup([
    { from: "EMILY'S LIST", to: "Josh Hawley", role: "ie-oppose", amount: 4000000 },
    { from: "emily's list", to: "Josh Hawley", role: "ie-oppose", amount: 1000000,
      metadata: { cycle_attribution: "lifetime-cumulative" } },
  ])
  assert.equal(total, 4000000,
    "case/apostrophe variants normalize to same key: max(pas2 sum=4M, lifetime=1M) = 4M — no double-count across case variants")
})

test("sumMonetaryEdgesDedup: different roles NOT merged (IE-support vs IE-oppose)", () => {
  const total = sumMonetaryEdgesDedup([
    { from: "PAC A", to: "Politician", role: "ie-support", amount: 1000000 },
    { from: "PAC A", to: "Politician", role: "ie-oppose", amount: 500000 },
  ])
  assert.equal(total, 1500000, "Different roles are distinct — support and oppose never merge")
})

test("sumMonetaryEdgesDedup: skips null / non-numeric amounts", () => {
  const total = sumMonetaryEdgesDedup([
    { from: "A", to: "B", role: "r", amount: 1000 },
    { from: "A", to: "B", role: "r", amount: null },
    { from: "A", to: "B", role: "r", amount: undefined },
    { from: "A", to: "B", role: "r" },
  ])
  assert.equal(total, 1000)
})

test("sumMonetaryEdgesDedup: empty input returns 0", () => {
  assert.equal(sumMonetaryEdgesDedup([]), 0)
})

// ─── Cycle scope helpers ──────────────────────────────────────────

const { currentCycle, filterEdgesByCycle } = require("./lib/edge-role-taxonomy.cjs")

test("currentCycle: even year returns itself", () => {
  assert.equal(currentCycle(new Date("2026-04-22T00:00:00Z")), "2026")
  assert.equal(currentCycle(new Date("2024-11-15T00:00:00Z")), "2024")
})

test("currentCycle: odd year returns the next even year (FEC convention)", () => {
  assert.equal(currentCycle(new Date("2025-07-01T00:00:00Z")), "2026")
  assert.equal(currentCycle(new Date("2023-03-10T00:00:00Z")), "2024")
})

test("currentCycle: DM_CURRENT_CYCLE env var overrides", () => {
  const prev = process.env.DM_CURRENT_CYCLE
  process.env.DM_CURRENT_CYCLE = "2020"
  assert.equal(currentCycle(new Date("2026-04-22T00:00:00Z")), "2020")
  if (prev == null) delete process.env.DM_CURRENT_CYCLE
  else process.env.DM_CURRENT_CYCLE = prev
})

test("filterEdgesByCycle: matches exact cycle", () => {
  const edges = [
    { cycle: "2020", amount: 1 },
    { cycle: "2024", amount: 2 },
    { cycle: 2020, amount: 3 }, // numeric form — stringified on filter
    { cycle: "2026", amount: 4 },
  ]
  const got = filterEdgesByCycle(edges, "2020")
  assert.equal(got.length, 2)
})

test("filterEdgesByCycle: EXCLUDES null-cycle edges (lifetime-cumulative fec-api aggregates)", () => {
  const edges = [
    { cycle: "2026", amount: 1000 },
    { cycle: null, amount: 500, metadata: { cycle_attribution: "lifetime-cumulative" } },
    { cycle: "2026", amount: 250 },
  ]
  const got = filterEdgesByCycle(edges, "2026")
  assert.equal(got.length, 2,
    "null-cycle edges represent lifetime aggregates that can't be attributed to any cycle — must NEVER appear in cycle-scoped totals")
})

test("filterEdgesByCycle: empty list returns empty", () => {
  assert.deepEqual(filterEdgesByCycle([], "2026"), [])
})

// ─── Sanity: every CATEGORIES entry has metadata ─────────────────

test("every category has full metadata (no dangling enums)", () => {
  const { CATEGORY_META } = require("./lib/edge-role-taxonomy.cjs")
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
