/**
 * edge-role-taxonomy.cjs — Single source of truth for how edges are
 * categorized and labeled across every surface (Ask engine, auto-
 * blocks, ProfileWidget, per-profile JSON, frontmatter caches).
 *
 * Problem this solves: every surface had its own ad-hoc logic for
 * "what is this edge?". That's how Bernie's profile ended up calling
 * a $4.7M super-PAC IE a "donor" (OpenSecrets would call it outside
 * support, not a contributor) and how $465M of campaign expenditures
 * got rendered as "recipients" of Bernie's political giving.
 *
 * Rule: every consumer imports classifyEdge() and displays whatever
 * it returns. Label changes happen here, once.
 *
 * API:
 *   classifyEdge(edge) → {
 *     category,              // machine-readable enum
 *     label,                 // user-facing section header
 *     bucket,                // which UI section it lives in
 *     countsAsMoneyReceived, // includes in "total received" headline?
 *     countsAsMoneyGiven,    // includes in "total given" headline?
 *     description,           // one-line explainer for tooltip/caveat
 *   }
 *
 * Unknown (type, role) pairs throw. Never silently bucket.
 *
 * This library does NOT decide scope (which cycle to show); that's a
 * separate concern handled by the consumer with a cycle filter.
 */

// ─── Categories ────────────────────────────────────────────────────
// Orthogonal, mutually exclusive. Every edge lands in exactly one.
const CATEGORIES = Object.freeze({
  // Money the recipient actually received from a specific donor.
  // Counts toward "total received" headline. PAC→candidate contributions,
  // individual contributions aggregated by donor, party coordinated.
  DIRECT_CONTRIBUTION: "direct-contribution",

  // Super-PAC / outside-group spending SUPPORTING a candidate. The
  // candidate never received this money — the super PAC spent it on
  // ads on their behalf. OpenSecrets calls this "outside spending."
  // Lives in its own UI section so readers don't confuse it with
  // contributions.
  IE_SUPPORT: "ie-support",

  // Super-PAC / outside-group spending AGAINST a candidate.
  // Explicitly negative; shown in a separate "spent against them"
  // section so it's never mistaken for donor money.
  IE_OPPOSE: "ie-oppose",

  // Money flowing OUT of a campaign to vendors (media buyers,
  // payroll, consultants). NOT political giving. Dedicated
  // Expenditures tab only; hidden from donor snapshots.
  CAMPAIGN_EXPENDITURE: "campaign-expenditure",

  // 527 political org expenditures. Structurally like IE but from
  // 527 vehicles (think Swift Boat Veterans). Shown separately.
  EXPENDITURE_527: "527-expenditure",

  // Money into a 527 org (contributors to the 527). Like
  // direct-contribution but targeting 527s.
  CONTRIBUTION_527: "527-contribution",

  // Philanthropic grants from foundations to nonprofits, per IRS
  // Form 990 Schedule I. NOT campaign finance. Separate surface.
  PHILANTHROPIC_GRANT: "philanthropic-grant",

  // Federal contract awards, per USASpending. Money from government
  // to a contractor. Separate Contracts section.
  GOVERNMENT_CONTRACT: "government-contract",

  // Federal grant awards, per USASpending.
  FEDERAL_GRANT: "federal-grant",

  // Officer / board / director / trustee roles. Non-monetary.
  // Renders in "Affiliations" / "Related Figures" surfaces.
  AFFILIATION: "affiliation",

  // Conduit / intermediary role in a transaction (someone passing
  // money through on behalf of another). Render as annotation, not
  // standalone donor.
  INTERMEDIARY: "intermediary",

  // Generic wikilink relationship — not monetary, not affiliation.
  // Renders in "Related Figures" graph.
  RELATIONSHIP: "relationship",

  // Mentioned-in-a-story link. Renders only on the Stories surface.
  STORY_LINK: "story-link",

  // Explicit political opposition edge (not IE-oppose, which is
  // monetary). E.g. "Bernie formally opposed Brett Kavanaugh."
  POLITICAL_OPPOSITION: "political-opposition",
})

// ─── Buckets ───────────────────────────────────────────────────────
// Which UI section an edge renders in. Consumers switch on bucket,
// not on raw role. Same category can fan out to different buckets
// based on direction (who's viewing) — that's the consumer's call.
const BUCKETS = Object.freeze({
  MONEY_DIRECT: "money-direct",       // direct-contribution rows
  MONEY_OUTSIDE_FOR: "money-outside-for",   // IE support
  MONEY_OUTSIDE_AGAINST: "money-outside-against", // IE oppose
  MONEY_EXPENDITURES: "money-expenditures", // campaign spending out
  MONEY_527: "money-527",             // 527 in/out
  MONEY_GRANTS: "money-grants",       // IRS 990 grants
  CONTRACTS: "contracts",             // USASpending contracts/grants
  AFFILIATIONS: "affiliations",       // board/officer
  RELATIONSHIPS: "relationships",     // wikilink + story-link + opposition
})

// ─── Normalize role (data quality cleanup) ─────────────────────────
// The affiliation role field has 30+ case-inconsistent variants
// ("BOARD MEMBER", "Board Member", "board member", "DIRECTOR",
// "Director"). Normalize before lookup so we don't need 30 cases.
function normalizeRole(role) {
  if (!role) return ""
  const r = String(role).trim().toLowerCase()
  // Collapse affiliation role variants into canonical buckets
  if (/\b(boards?|bd|trustees?|directors?|chairs?|chairman|chairperson|officers?|presidents?|ceos?|executives?|founders?|secretaries|secretary|treasurers?|vice|vp|vice-president)\b/.test(r)) {
    return "affiliation-role"
  }
  return r
}

// ─── (type, role) → category mapping ──────────────────────────────
// Every known combination. Unknown → throw.
const C = CATEGORIES

function lookupCategory(type, rawRole) {
  const role = normalizeRole(rawRole)

  if (type === "monetary") {
    if (role === "direct-contribution") return C.DIRECT_CONTRIBUTION
    if (role === "employee-contributions") return C.DIRECT_CONTRIBUTION
    if (role === "coordinated-party-expense") return C.DIRECT_CONTRIBUTION
    if (role === "party-coordinated") return C.DIRECT_CONTRIBUTION
    if (role === "ie-support") return C.IE_SUPPORT
    if (role === "ie-oppose") return C.IE_OPPOSE
    if (role === "operating-expense") return C.CAMPAIGN_EXPENDITURE
    if (role === "527-expenditure") return C.EXPENDITURE_527
    if (role === "527-contribution") return C.CONTRIBUTION_527
    // Empty role on monetary edges throws — was previously silently
    // defaulting to DIRECT_CONTRIBUTION, which let pre-classifier legacy
    // fec-bulk edges (14,294 with role=null) read as donations when many
    // were actually IE-oppose. Surfaced 2026-04-28 PM by the
    // Bowman/Fairshake case ($2.08M IE-oppose mis-read as donation).
    // Throwing gives consumers a clean signal to skip; they already
    // wrap classifyEdge in try/catch. Mirror of TS resolver.
    if (role === "") {
      throw new Error(
        `monetary edge has empty role — refusing to default to direct-contribution. ` +
          `Likely a pre-classifier legacy ingest (e.g. fec-bulk role=null). ` +
          `Either re-ingest with the current classifier-aware path, or tag role explicitly.`,
      )
    }
    throw new Error(`unknown monetary role: "${rawRole}" (normalized: "${role}")`)
  }

  if (type === "government-contract") return C.GOVERNMENT_CONTRACT
  if (type === "federal-grant") return C.FEDERAL_GRANT

  if (type === "affiliation") {
    if (role === "officer") return C.AFFILIATION
    if (role === "intermediary") return C.INTERMEDIARY
    if (role === "affiliation-role") return C.AFFILIATION // board/director/etc
    if (role === "") return C.AFFILIATION
    throw new Error(`unknown affiliation role: "${rawRole}" (normalized: "${role}")`)
  }

  if (type === "related") return C.RELATIONSHIP
  if (type === "story-link") return C.STORY_LINK
  if (type === "political-opposition") return C.POLITICAL_OPPOSITION

  throw new Error(`unknown edge type: "${type}" (role: "${rawRole}")`)
}

// ─── Category → display metadata ───────────────────────────────────
// Labels, buckets, accounting rules. Single point of edit.
const CATEGORY_META = Object.freeze({
  [C.DIRECT_CONTRIBUTION]: {
    label: "Direct contribution",
    bucket: BUCKETS.MONEY_DIRECT,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: true,
    description:
      "Money given directly to the candidate's campaign or the recipient organization. Counts toward 'total received' headline figures.",
  },
  [C.IE_SUPPORT]: {
    label: "Outside spending (supporting)",
    bucket: BUCKETS.MONEY_OUTSIDE_FOR,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: true,
    description:
      "Independent expenditures — a super PAC or outside group spent this money on ads supporting the candidate. The candidate never received or controlled it.",
  },
  [C.IE_OPPOSE]: {
    label: "Outside spending (against)",
    bucket: BUCKETS.MONEY_OUTSIDE_AGAINST,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: true,
    description:
      "Independent expenditures spent by a super PAC or outside group AGAINST this candidate (attack ads, opposition campaigns).",
  },
  [C.CAMPAIGN_EXPENDITURE]: {
    label: "Campaign expenditure",
    bucket: BUCKETS.MONEY_EXPENDITURES,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description:
      "Money the campaign spent on vendors, media buys, payroll, or operations. Not a political contribution — operational expense.",
  },
  [C.EXPENDITURE_527]: {
    label: "527 expenditure",
    bucket: BUCKETS.MONEY_527,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: true,
    description:
      "Spending by a 527 political organization (tax-exempt political advocacy vehicle). Not campaign contributions.",
  },
  [C.CONTRIBUTION_527]: {
    label: "527 contribution",
    bucket: BUCKETS.MONEY_527,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: true,
    description:
      "Money given to a 527 political organization.",
  },
  [C.PHILANTHROPIC_GRANT]: {
    label: "Philanthropic grant",
    bucket: BUCKETS.MONEY_GRANTS,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: true,
    description:
      "Charitable grant from a foundation or donor-advised fund, per IRS Form 990 Schedule I. Separate from political contributions.",
  },
  [C.GOVERNMENT_CONTRACT]: {
    label: "Federal contract",
    bucket: BUCKETS.CONTRACTS,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: false,
    description: "Federal contract award, per USASpending.gov.",
  },
  [C.FEDERAL_GRANT]: {
    label: "Federal grant",
    bucket: BUCKETS.CONTRACTS,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: false,
    description: "Federal grant award, per USASpending.gov.",
  },
  [C.AFFILIATION]: {
    label: "Affiliation",
    bucket: BUCKETS.AFFILIATIONS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description: "Board / officer / director / trustee role.",
  },
  [C.INTERMEDIARY]: {
    label: "Intermediary",
    bucket: BUCKETS.AFFILIATIONS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description:
      "Conduit or pass-through role. This entity moved money on someone else's behalf — not an original source of funds.",
  },
  [C.RELATIONSHIP]: {
    label: "Related",
    bucket: BUCKETS.RELATIONSHIPS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description: "Wikilink relationship (appears in related figures / graph).",
  },
  [C.STORY_LINK]: {
    label: "Mentioned in story",
    bucket: BUCKETS.RELATIONSHIPS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description: "Entity mentioned in a story or digest.",
  },
  [C.POLITICAL_OPPOSITION]: {
    label: "Political opposition",
    bucket: BUCKETS.RELATIONSHIPS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description:
      "Explicit political opposition edge (voted against, publicly opposed) — non-monetary.",
  },
})

// ─── Source-based upgrades ─────────────────────────────────────────
// Some edges reach the classifier with a role that maps to a default
// category, but the source tells us a more specific category. E.g.
// monetary + no-role + source=irs-990-bulk is a philanthropic grant,
// not a direct contribution.
function applySourceUpgrade(category, edge) {
  if (category === C.DIRECT_CONTRIBUTION && edge.source === "irs-990-bulk") {
    return C.PHILANTHROPIC_GRANT
  }
  return category
}

// ─── Public API ────────────────────────────────────────────────────

function classifyEdge(edge) {
  if (!edge || typeof edge !== "object") {
    throw new Error("classifyEdge: edge is required")
  }
  const type = edge.type || ""
  const role = edge.role || ""
  let category = lookupCategory(type, role)
  category = applySourceUpgrade(category, edge)
  const meta = CATEGORY_META[category]
  if (!meta) {
    throw new Error(`no metadata for category: ${category}`)
  }
  return {
    category,
    label: meta.label,
    bucket: meta.bucket,
    countsAsMoneyReceived: meta.countsAsMoneyReceived,
    countsAsMoneyGiven: meta.countsAsMoneyGiven,
    description: meta.description,
  }
}

// ─── Cycle scope helpers ───────────────────────────────────────────
// FEC convention: 2-year cycles labeled by their even-year election
// year. Cycle "2026" = Jan 1 2025 through Dec 31 2026. We use a
// single 2-year cycle for every profile type (senators' 6-year
// mental model would require per-politician logic; punted).
//
// CURRENT CYCLE is derived from the system clock — bumps forward
// automatically every two years on January 1. Override via
// DM_CURRENT_CYCLE env var for tests / historical snapshots.

function currentCycle(nowOverride) {
  const override = (typeof process !== "undefined" && process.env && process.env.DM_CURRENT_CYCLE) || null
  if (override) return String(override)
  const d = nowOverride instanceof Date ? nowOverride : new Date()
  const y = d.getUTCFullYear()
  // If year is odd, cycle label is next year's even number.
  // If year is even, the current year IS the cycle label.
  return String(y % 2 === 0 ? y : y + 1)
}

// Filter edges to a specific cycle. Returns edges whose cycle field
// EXACTLY matches `cycle` (after stringification). Null-cycle edges
// — e.g. fec-api lifetime-cumulative aggregates — are EXCLUDED, as
// they represent lifetime totals that cannot be attributed to any
// single cycle without producing false precision.
function filterEdgesByCycle(edges, cycle) {
  const target = String(cycle)
  return edges.filter((e) => e && e.cycle != null && String(e.cycle) === target)
}

// ─── Dedup helper for lifetime monetary sums ───────────────────────
// fec-api ingest writes LIFETIME-CUMULATIVE edges per (from, to,
// role). fec-pas2 ingest writes per-TRANSACTION edges cycle-accurate.
// Summing raw across both sources double-counts any (from, to, role)
// pair where both exist, because the fec-api cumulative number
// already includes the pas2 transactions.
//
// Rule: for each (from, to, role) key, use max(fec-api lifetime
// amount, sum of pas2 amounts). This handles both the common case
// (fec-api > pas2, use fec-api) and the stale-fec-api case (9 out
// of 238 observed; pas2 > fec-api, use pas2 sum).
//
// Keys are normalized (lowercased + alphanumeric-only) to catch
// trivial name variants like "Emily's List" vs "Emilys List". Does
// NOT handle committee-abbreviation matching ("SMP" vs "Senate
// Majority PAC") — that requires entity resolution and is out of
// scope here.
function sumMonetaryEdgesDedup(edges) {
  const byKey = new Map()
  for (const e of edges) {
    if (!e || typeof e.amount !== "number" || !Number.isFinite(e.amount)) continue
    const from = normalizeEntityKey(e.from)
    const to = normalizeEntityKey(e.to)
    const role = String(e.role || "")
    const k = from + "|" + to + "|" + role
    const isLifetime = e.metadata && e.metadata.cycle_attribution === "lifetime-cumulative"
    if (!byKey.has(k)) byKey.set(k, { lifetimeMax: 0, perCycleSum: 0 })
    const slot = byKey.get(k)
    if (isLifetime) {
      if (e.amount > slot.lifetimeMax) slot.lifetimeMax = e.amount
    } else {
      slot.perCycleSum += e.amount
    }
  }
  let total = 0
  for (const slot of byKey.values()) {
    total += slot.lifetimeMax > slot.perCycleSum ? slot.lifetimeMax : slot.perCycleSum
  }
  return total
}

function normalizeEntityKey(name) {
  if (!name) return ""
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "")
}

// ─── Exports ───────────────────────────────────────────────────────
module.exports = {
  classifyEdge,
  sumMonetaryEdgesDedup,
  currentCycle,
  filterEdgesByCycle,
  CATEGORIES,
  BUCKETS,
  CATEGORY_META,
  // Exposed for tests + introspection only; not for direct consumer use.
  _internal: { normalizeRole, lookupCategory, applySourceUpgrade, normalizeEntityKey },
}
