/**
 * edge-taxonomy.ts — TypeScript port of scripts/lib/edge-role-taxonomy.cjs.
 *
 * Single source of truth for how edges are categorized and labeled across
 * every TS surface. CJS scripts continue to import the .cjs version; the
 * parity test in __tests__/edge-taxonomy.test.ts asserts the two stay in
 * lockstep until CJS callers have been migrated through the librarian.
 *
 * Per ADR-0024 Phase 3, this unblocks expanding the shadow harness from
 * the `related` field to `donors` + `politicians-funded`.
 */

// ─── Categories ────────────────────────────────────────────────────────
// Orthogonal, mutually exclusive. Every edge lands in exactly one.
export const CATEGORIES = {
  DIRECT_CONTRIBUTION: "direct-contribution",
  IE_SUPPORT: "ie-support",
  IE_OPPOSE: "ie-oppose",
  CAMPAIGN_EXPENDITURE: "campaign-expenditure",
  EXPENDITURE_527: "527-expenditure",
  CONTRIBUTION_527: "527-contribution",
  PHILANTHROPIC_GRANT: "philanthropic-grant",
  GOVERNMENT_CONTRACT: "government-contract",
  FEDERAL_GRANT: "federal-grant",
  AFFILIATION: "affiliation",
  INTERMEDIARY: "intermediary",
  RELATIONSHIP: "relationship",
  STORY_LINK: "story-link",
  POLITICAL_OPPOSITION: "political-opposition",
} as const

export type EdgeCategory = (typeof CATEGORIES)[keyof typeof CATEGORIES]

// ─── Buckets ───────────────────────────────────────────────────────────
export const BUCKETS = {
  MONEY_DIRECT: "money-direct",
  MONEY_OUTSIDE_FOR: "money-outside-for",
  MONEY_OUTSIDE_AGAINST: "money-outside-against",
  MONEY_EXPENDITURES: "money-expenditures",
  MONEY_527: "money-527",
  MONEY_GRANTS: "money-grants",
  CONTRACTS: "contracts",
  AFFILIATIONS: "affiliations",
  RELATIONSHIPS: "relationships",
} as const

export type EdgeBucket = (typeof BUCKETS)[keyof typeof BUCKETS]

// ─── Category metadata ─────────────────────────────────────────────────
export interface CategoryMeta {
  label: string
  bucket: EdgeBucket
  countsAsMoneyReceived: boolean
  countsAsMoneyGiven: boolean
  description: string
}

const C = CATEGORIES
const B = BUCKETS

export const CATEGORY_META: Readonly<Record<EdgeCategory, CategoryMeta>> = Object.freeze({
  [C.DIRECT_CONTRIBUTION]: {
    label: "Direct contribution",
    bucket: B.MONEY_DIRECT,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: true,
    description:
      "Money given directly to the candidate's campaign or the recipient organization. Counts toward 'total received' headline figures.",
  },
  [C.IE_SUPPORT]: {
    label: "Outside spending (supporting)",
    bucket: B.MONEY_OUTSIDE_FOR,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: true,
    description:
      "Independent expenditures — a super PAC or outside group spent this money on ads supporting the candidate. The candidate never received or controlled it.",
  },
  [C.IE_OPPOSE]: {
    label: "Outside spending (against)",
    bucket: B.MONEY_OUTSIDE_AGAINST,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: true,
    description:
      "Independent expenditures spent by a super PAC or outside group AGAINST this candidate (attack ads, opposition campaigns).",
  },
  [C.CAMPAIGN_EXPENDITURE]: {
    label: "Campaign expenditure",
    bucket: B.MONEY_EXPENDITURES,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description:
      "Money the campaign spent on vendors, media buys, payroll, or operations. Not a political contribution — operational expense.",
  },
  [C.EXPENDITURE_527]: {
    label: "527 expenditure",
    bucket: B.MONEY_527,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: true,
    description:
      "Spending by a 527 political organization (tax-exempt political advocacy vehicle). Not campaign contributions.",
  },
  [C.CONTRIBUTION_527]: {
    label: "527 contribution",
    bucket: B.MONEY_527,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: true,
    description: "Money given to a 527 political organization.",
  },
  [C.PHILANTHROPIC_GRANT]: {
    label: "Philanthropic grant",
    bucket: B.MONEY_GRANTS,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: true,
    description:
      "Charitable grant from a foundation or donor-advised fund, per IRS Form 990 Schedule I. Separate from political contributions.",
  },
  [C.GOVERNMENT_CONTRACT]: {
    label: "Federal contract",
    bucket: B.CONTRACTS,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: false,
    description: "Federal contract award, per USASpending.gov.",
  },
  [C.FEDERAL_GRANT]: {
    label: "Federal grant",
    bucket: B.CONTRACTS,
    countsAsMoneyReceived: true,
    countsAsMoneyGiven: false,
    description: "Federal grant award, per USASpending.gov.",
  },
  [C.AFFILIATION]: {
    label: "Affiliation",
    bucket: B.AFFILIATIONS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description: "Board / officer / director / trustee role.",
  },
  [C.INTERMEDIARY]: {
    label: "Intermediary",
    bucket: B.AFFILIATIONS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description:
      "Conduit or pass-through role. This entity moved money on someone else's behalf — not an original source of funds.",
  },
  [C.RELATIONSHIP]: {
    label: "Related",
    bucket: B.RELATIONSHIPS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description: "Wikilink relationship (appears in related figures / graph).",
  },
  [C.STORY_LINK]: {
    label: "Mentioned in story",
    bucket: B.RELATIONSHIPS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description: "Entity mentioned in a story or digest.",
  },
  [C.POLITICAL_OPPOSITION]: {
    label: "Political opposition",
    bucket: B.RELATIONSHIPS,
    countsAsMoneyReceived: false,
    countsAsMoneyGiven: false,
    description:
      "Explicit political opposition edge (voted against, publicly opposed) — non-monetary.",
  },
})

// ─── Input shape ───────────────────────────────────────────────────────
/**
 * Minimal edge shape the classifier reads. Mirrors the relevant subset of
 * RawEdge / Edge — kept loose so callers can pass canonical-store records
 * without reshaping.
 */
export interface ClassifiableEdge {
  type?: string | null
  role?: string | null
  source?: string | null
  amount?: number | null
  cycle?: string | number | null
  from?: string | null
  to?: string | null
  metadata?: { cycle_attribution?: string | null } | Record<string, unknown> | null
}

export interface ClassifyResult {
  category: EdgeCategory
  label: string
  bucket: EdgeBucket
  countsAsMoneyReceived: boolean
  countsAsMoneyGiven: boolean
  description: string
}

// ─── Normalize role ────────────────────────────────────────────────────
const AFFILIATION_ROLE_PATTERN =
  /\b(boards?|bd|trustees?|directors?|chairs?|chairman|chairperson|officers?|presidents?|ceos?|executives?|founders?|secretaries|secretary|treasurers?|vice|vp|vice-president)\b/

export function normalizeRole(role: string | null | undefined): string {
  if (!role) return ""
  const r = String(role).trim().toLowerCase()
  if (AFFILIATION_ROLE_PATTERN.test(r)) return "affiliation-role"
  return r
}

// ─── (type, role) → category ───────────────────────────────────────────
export function lookupCategory(type: string, rawRole: string | null | undefined): EdgeCategory {
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
    // FEC bulk edges (14,294 with role=null) read as donations when many
    // were actually IE-oppose. Surfaced 2026-04-28 PM by the
    // Bowman/Fairshake case: $2.08M IE-oppose edge from fec-bulk source
    // was read as "Fairshake funded Bowman" by the cache rebuilder,
    // creating a ghost donation in the vault. Throwing here gives
    // consumers (story-evidence, cache rebuilder) a clean signal to
    // skip the edge instead of silently miscounting it. They already
    // wrap classifyEdge in try/catch, so the throw doesn't crash —
    // just removes the bad data from classification.
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
    if (role === "affiliation-role") return C.AFFILIATION
    if (role === "") return C.AFFILIATION
    throw new Error(`unknown affiliation role: "${rawRole}" (normalized: "${role}")`)
  }

  if (type === "related") return C.RELATIONSHIP
  if (type === "story-link") return C.STORY_LINK
  if (type === "political-opposition") return C.POLITICAL_OPPOSITION

  throw new Error(`unknown edge type: "${type}" (role: "${rawRole}")`)
}

// ─── Source-based upgrades ─────────────────────────────────────────────
export function applySourceUpgrade(category: EdgeCategory, edge: ClassifiableEdge): EdgeCategory {
  if (category === C.DIRECT_CONTRIBUTION && edge.source === "irs-990-bulk") {
    return C.PHILANTHROPIC_GRANT
  }
  return category
}

// ─── Public API ────────────────────────────────────────────────────────
export function classifyEdge(edge: ClassifiableEdge | null | undefined): ClassifyResult {
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

// ─── Cycle helpers ─────────────────────────────────────────────────────
export function currentCycle(nowOverride?: Date): string {
  const override =
    (typeof process !== "undefined" && process.env && process.env.DM_CURRENT_CYCLE) || null
  if (override) return String(override)
  const d = nowOverride instanceof Date ? nowOverride : new Date()
  const y = d.getUTCFullYear()
  return String(y % 2 === 0 ? y : y + 1)
}

export function filterEdgesByCycle<T extends { cycle?: string | number | null }>(
  edges: T[],
  cycle: string | number,
): T[] {
  const target = String(cycle)
  return edges.filter((e) => e && e.cycle != null && String(e.cycle) === target)
}

// ─── Dedup helper ──────────────────────────────────────────────────────
export function normalizeEntityKey(name: string | null | undefined): string {
  if (!name) return ""
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function sumMonetaryEdgesDedup(edges: ClassifiableEdge[]): number {
  const byKey = new Map<string, { lifetimeMax: number; perCycleSum: number }>()
  for (const e of edges) {
    if (!e || typeof e.amount !== "number" || !Number.isFinite(e.amount)) continue
    const from = normalizeEntityKey(e.from)
    const to = normalizeEntityKey(e.to)
    const role = String(e.role || "")
    const k = from + "|" + to + "|" + role
    const md = e.metadata as { cycle_attribution?: string | null } | null | undefined
    const isLifetime = !!(md && md.cycle_attribution === "lifetime-cumulative")
    let slot = byKey.get(k)
    if (!slot) {
      slot = { lifetimeMax: 0, perCycleSum: 0 }
      byKey.set(k, slot)
    }
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
