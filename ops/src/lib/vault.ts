import matter from "gray-matter"

// Lightweight type resolver for enrichment-applicability checks.
// Can't import the full profile-type-rulebook.ts here because vault.ts
// is bundled for the client (VaultGrid.tsx "use client"), and the
// rulebook module uses Node's `fs` to read the JSON file. So we inline
// the common sub-category → top-level mappings that affect enrichment.
// Unknown types default to their raw value (treated as enrichable).
function resolveTypeForStats(flatType: string): string {
  if (WEIGHTS_BY_TYPE[flatType]) return flatType
  const PARENTS: Record<string, string> = {
    corporation: "entity", pac: "entity", "lobbying-firm": "entity",
    "think-tank": "entity", union: "entity", foundation: "entity",
    "media-profile": "media", journalist: "media", podcaster: "media",
    "story-seed": "story", investigation: "story", explainer: "story",
    "profile-deep-dive": "story", "network-map": "story",
    "admin-note": "meta", "sub-note": "meta", "daily-update": "meta",
    digest: "meta", index: "meta", reference: "meta", system: "meta",
    methodology: "meta", page: "meta",
  }
  return PARENTS[flatType] || flatType
}

export interface Profile {
  path: string
  title: string
  type: string
  party?: string
  chamber?: string
  state?: string
  sector?: string
  contentReadiness: string
  sourceTier?: number
  lastUpdated?: string
  lastEnriched?: string
  totalRaised?: string
  lobbyingSpend?: string
  related?: string
  opposes?: string
  donors?: string
  folder: string
  subfolder: string
  completeness?: number
  // New investigative journalism fields
  knownGaps?: string[]
  corroborationCount?: number
  lastVerifiedBy?: string          // "pipeline" | "editorial"
  sourceTypes?: string[]
  internalNotes?: string
  corrections?: string[]
  updateCadence?: string          // "weekly" | "monthly" | "quarterly" | "annual"
  legalSensitivity?: string       // "standard" | "elevated" | "high"
  checklistNa?: string[]
  verifiedBlocks?: string[]
  // Type-specific fields for checklist
  billsSponsored?: number
  billsCosponsored?: number
  committees?: string
  totalRaisedNum?: number
  politiciansFunded?: string
  totalPoliticalSpend?: string
  entityType?: string
  category?: string
  platform?: string
  taxStatus?: string
  nonprofitStatus?: string
  ein?: string
  totalRevenue?: string
  lobbyistCount?: number
  revolvingDoorPct?: string
  faraClients?: string
  topDonors?: string[]
  totalReceived?: string
  careerTotal?: string
  editorialReviewDate?: string
  editorialReviewer?: string
  editorialResult?: string        // "pass" | "block" | "defer"
  editorialBlockers?: string[]
  lobbyingFilings?: number
  federalContracts?: number
  federalAwardsTotal?: number
  leadershipRoles?: string[]
  // ───────────────────────────────────────────────────────────────
  // A+ (verified) baseline additions — 2026-04-11 plan step 1
  // All optional at the YAML-parse level. Enforcement comes later
  // in checklist (step 4) + janitor audit (step 3). See plan
  // C:\Users\third\.claude\plans\keen-inventing-wall.md for rules.
  // ───────────────────────────────────────────────────────────────
  /** One-sentence answer: what is this profile saying? */
  centralThesis?: string
  /** URL-count-based grade: story (1-4 sourced URLs) | report (5-9) | investigation (10+, 3+ Tier 1) */
  storyGrade?: "story" | "report" | "investigation"
  /** "What the subject's lawyer would dispute and how we answer" paragraph */
  lawyerDispute?: string
  /** Date David cleared any defamation-prone language (fraud/corrupt/bribed/etc.) */
  legalReviewDate?: string
  /** Outcome of David's legal review pass */
  legalReviewResult?: "pass" | "block" | "defer"
  /** Board memberships — past or present. Tier 1 financial disclosure signal. */
  boardSeats?: string[]
  /** Stock trading activity (set by pipeline from financial disclosures). */
  stockTrades?: number | string
  /** Same entity appears in both donors: AND opposes: — suspicious but not inherently wrong */
  bothSidesFlag?: boolean
  /** Connections in related: that also appear in 2+ otherwise-unrelated vault profiles */
  crossVaultTriangulationCount?: number
  /** Janitor-detected outliers vs cohort median */
  anomalyFlags?: string[]
  /** ISO date — janitor stamped this after all A+ automated checks passed */
  auditAPlusPassed?: string
  // ───────────────────────────────────────────────────────────────
  // S-tier additions — above A+, for profiles with genuine original
  // investigative findings. Requires BOTH automated audit AND manual
  // David sign-off (neither alone is sufficient).
  // ───────────────────────────────────────────────────────────────
  /** FORCING FUNCTION: what does this profile show that OpenSecrets/Ballotpedia/GovTrack does NOT? */
  angle?: string
  /** Minimum 3 for S-tier. Each must be "damning" — obvious foul play or something crazy. */
  exclusiveConnections?: string[]
  /** One specific verifiable claim this vault surfaces first. */
  originalFinding?: string
  /** Janitor stamps this when S-tier automated checks pass. */
  auditSTierPassed?: boolean
  /** ISO date — data integrity sign-off. Janitor writes after A+ audit clean. */
  editorialSignoffData?: string
  /** ISO date — narrative / originality sign-off. Only David writes this. */
  editorialSignoffNarrative?: string
}

/**
 * Valid content-readiness tier values.
 * Ordered worst-to-best. New in 2026-04-11: s-tier (above verified).
 * NOTE: /api/profile/readiness still rejects "s-tier" until plan Step 6
 * ships. Until then, no profile can be promoted via the API to S-tier.
 */
export type ContentReadinessTier = "raw" | "draft" | "ready" | "verified" | "s-tier"

// Parse frontmatter from markdown content
export function parseProfile(path: string, content: string): Profile {
  const { data } = matter(content)

  // Extract folder structure: content/Politicians/Democrat/Senate/Name/ → folder=Politicians, subfolder=Democrat
  const parts = path.replace("content/", "").split("/")
  const folder = parts[0] || ""
  const subfolder = parts[1] || ""

  return {
    path,
    title: data.title || parts[parts.length - 1].replace(".md", ""),
    type: data.type || "unknown",
    party: data.party,
    chamber: data.chamber,
    state: data.state || data["state-abbr"],
    sector: data.sector,
    contentReadiness: data["content-readiness"] || "raw",
    sourceTier: data["source-tier"],
    lastUpdated: data["last-updated"],
    lastEnriched: data["last-enriched"],
    totalRaised: data["total-raised"],
    lobbyingSpend: data["lobbying-spend"],
    related: data.related,
    opposes: data.opposes,
    donors: data.donors,
    folder,
    subfolder,
    knownGaps: data["known-gaps"],
    corroborationCount: data["corroboration-count"],
    lastVerifiedBy: data["last-verified-by"],
    sourceTypes: data["source-types"],
    internalNotes: data["internal-notes"],
    corrections: data.corrections,
    updateCadence: data["update-cadence"],
    legalSensitivity: data["legal-sensitivity"],
    checklistNa: data["checklist-na"],
    verifiedBlocks: data["verified-blocks"],
    billsSponsored: data["bills-sponsored"] ? parseInt(data["bills-sponsored"]) : undefined,
    billsCosponsored: data["bills-cosponsored"] ? parseInt(data["bills-cosponsored"]) : undefined,
    committees: data.committees,
    politiciansFunded: data["politicians-funded"],
    totalPoliticalSpend: data["total-political-spend"],
    entityType: data["entity-type"],
    category: data.category,
    platform: data.platform,
    taxStatus: data["tax-status"],
    nonprofitStatus: data["nonprofit-status"],
    ein: data.ein,
    totalRevenue: data["total-revenue"],
    lobbyistCount: data["lobbyist-count"] ? parseInt(data["lobbyist-count"]) : undefined,
    revolvingDoorPct: data["revolving-door-pct"],
    faraClients: data["fara-clients"],
    topDonors: data["top-donors"],
    totalReceived: data["total-received"],
    careerTotal: data["career-total"],
    editorialReviewDate: data["editorial-review-date"],
    editorialReviewer: data["editorial-reviewer"],
    editorialResult: data["editorial-result"],
    editorialBlockers: data["editorial-blockers"],
    lobbyingFilings: data["lobbying-filings"] ? parseInt(data["lobbying-filings"]) : undefined,
    federalContracts: data["federal-contracts"] ? parseInt(data["federal-contracts"]) : undefined,
    federalAwardsTotal: data["federal-awards-total"] ? parseInt(data["federal-awards-total"]) : undefined,
    leadershipRoles: data["leadership-roles"],
    // A+ baseline additions (2026-04-11 plan step 1)
    centralThesis: data["central-thesis"],
    storyGrade: data["story-grade"],
    lawyerDispute: data["lawyer-dispute"],
    legalReviewDate: data["legal-review-date"],
    legalReviewResult: data["legal-review-result"],
    boardSeats: data["board-seats"],
    stockTrades: data["stock-trades"],
    bothSidesFlag: data["both-sides-flag"],
    crossVaultTriangulationCount: data["cross-vault-triangulation-count"],
    anomalyFlags: data["anomaly-flags"],
    auditAPlusPassed: data["audit-a-plus-passed"],
    // S-tier additions (above A+)
    angle: data.angle,
    exclusiveConnections: data["exclusive-connections"],
    originalFinding: data["original-finding"],
    auditSTierPassed: data["audit-s-tier-passed"],
    editorialSignoffData: data["editorial-signoff-data"],
    editorialSignoffNarrative: data["editorial-signoff-narrative"],
  }
}

// Per-type weights for the 5 scoring dimensions. Sum to 100 per row.
//
// Why the weights differ:
//   - Stories don't run through the FEC/LDA enrichment pipelines — they're
//     synthesis of already-enriched donor/politician profiles. Penalizing
//     them 20 points for "never enriched" is a false negative, which is
//     why vault-health stats used to report stories as perpetually below
//     50%. Stories lean into content (body length) and connections instead.
//
//   - Media profiles are themselves the primary sources — a podcaster
//     profile IS where a citation lives, not a profile citing three other
//     Tier 1 sources. Dropping sources weight lets them get honest scores.
//
//   - Events are ephemeral — a digest or filing note doesn't need deep
//     connections or long body text. Frontmatter validity + a source URL
//     is the whole standard.
//
//   - Meta / admin-note / system files exist purely as infrastructure.
//     Scoring them on completeness is a category error; we push almost
//     everything to frontmatter hygiene.
//
// Top-level types come from scripts/lib/profile-type-rulebook.cjs. The
// resolveTopLevelType() helper in ops/src/lib/profile-type-rulebook.ts maps
// flat vault types ("corporation", "senator") to their top-level parent
// ("entity", "politician") before lookup here. Unknown types fall through
// to DEFAULT_WEIGHTS.
interface CompletenessWeights {
  frontmatter: number
  sources: number
  connections: number
  content: number
  enrichment: number
}

const WEIGHTS_BY_TYPE: Record<string, CompletenessWeights> = {
  politician: { frontmatter: 15, sources: 25, connections: 20, content: 20, enrichment: 20 },
  donor:      { frontmatter: 15, sources: 25, connections: 20, content: 20, enrichment: 20 },
  entity:     { frontmatter: 15, sources: 25, connections: 20, content: 20, enrichment: 20 },
  judicial:   { frontmatter: 15, sources: 25, connections: 20, content: 20, enrichment: 20 },
  media:      { frontmatter: 20, sources: 10, connections: 25, content: 30, enrichment: 15 },
  story:      { frontmatter: 10, sources: 25, connections: 25, content: 40, enrichment:  0 },
  event:      { frontmatter: 35, sources: 20, connections:  5, content: 40, enrichment:  0 },
  meta:       { frontmatter: 50, sources: 10, connections: 10, content: 30, enrichment:  0 },
}
const DEFAULT_WEIGHTS: CompletenessWeights = {
  frontmatter: 20,
  sources: 20,
  connections: 20,
  content: 20,
  enrichment: 20,
}

// Tier 1 source floor per top-level type. Types that ARE sources (media)
// or don't cite traditional Tier 1 filings (story, event, meta) have
// relaxed or zero floors.
const TIER1_FLOOR_BY_TYPE: Record<string, number> = {
  politician: 3,
  donor: 3,
  entity: 3,
  judicial: 3,
  media: 1,
  story: 3, // stories still need Tier 1 — they're citing pipeline data
  event: 1,
  meta: 0,
}

/**
 * Profile completeness score (0-100).
 *
 * Type-aware as of Phase 1d. Each profile is scored against its own
 * top-level rulebook type's weight row. Pass topLevelType explicitly
 * from the vault walker (local-vault.ts) so we only resolve types once
 * per vault load.
 */
export function completenessScore(
  profile: Profile,
  content: string,
  topLevelType?: string | null,
): number {
  const weights = (topLevelType && WEIGHTS_BY_TYPE[topLevelType]) || DEFAULT_WEIGHTS
  const tier1Floor: number = topLevelType ? (TIER1_FLOOR_BY_TYPE[topLevelType] ?? 3) : 3

  // 1. Frontmatter — has key metadata fields. Scale the 0..1 fraction
  // by the weight.
  const hasFm = [
    !!profile.type && profile.type !== "unknown",
    !!profile.lastUpdated,
    !!profile.sourceTier,
    profile.contentReadiness !== "raw",
  ]
  const fmFraction = hasFm.filter(Boolean).length / hasFm.length
  let score = fmFraction * weights.frontmatter

  // 2. Sources. Tier 1 floor is per-type. Below floor we scale linearly.
  const sources = countSources(content)
  if (tier1Floor === 0) {
    // Meta types: any source at all gets full credit; zero sources gets 0.
    if (sources.total >= 1) score += weights.sources
  } else if (sources.tier1 >= tier1Floor) {
    score += weights.sources
  } else if (sources.tier1 >= 1) {
    score += weights.sources * 0.75
  } else if (sources.total >= 1) {
    score += weights.sources * 0.25
  }

  // 3. Connections — has related/donors/opposes. Events get a partial
  // credit floor so they're not unduly penalized for being short notes.
  const hasRelated = !!(profile.related || content.match(/^related:\s*.+/m))
  const hasDonors = !!(profile.donors || content.match(/^donors:\s*.+/m))
  if (hasRelated && hasDonors) {
    score += weights.connections
  } else if (hasRelated || hasDonors) {
    score += weights.connections * 0.5
  } else if (topLevelType === "event" || topLevelType === "meta") {
    // Events/meta don't require connections — give them the floor anyway.
    score += weights.connections * 0.5
  }

  // 4. Content — editorial body text. Thresholds scale with the weight
  // so that story profiles (weight 40) actually reward long-form writing
  // while entity profiles (weight 20) cap out at shorter lengths.
  const bodyLength = content.split("---").slice(2).join("---").trim().length
  if (bodyLength > 2000) score += weights.content
  else if (bodyLength > 500) score += weights.content * 0.75
  else if (bodyLength > 100) score += weights.content * 0.25

  // 5. Enrichment — pipelines stamp lastEnriched. Stories / events / meta
  // have enrichment weight = 0 so they're not penalized for never running
  // through FEC or LDA.
  if (weights.enrichment > 0 && profile.lastEnriched) {
    score += weights.enrichment
  } else if (weights.enrichment === 0) {
    // Silent full credit — the dimension doesn't apply to this type.
    // Not adding score here; the 0 weight is the whole point.
  }

  return Math.round(score)
}

// Count sources in markdown content
export function countSources(content: string): { total: number; tier1: number; tier2: number; tier3: number; tier4: number; broken: number } {
  const sourceSection = content.split("## Sources")[1] || ""
  const tier1 = (sourceSection.match(/\(Tier 1\)/g) || []).length
  const tier2 = (sourceSection.match(/\(Tier 2\)/g) || []).length
  const tier3 = (sourceSection.match(/\(Tier 3\)/g) || []).length
  const tier4 = (sourceSection.match(/\(Tier 4\)/g) || []).length
  const broken = (sourceSection.match(/~~/g) || []).length / 2 // strikethrough pairs

  return { total: tier1 + tier2 + tier3 + tier4, tier1, tier2, tier3, tier4, broken: Math.floor(broken) }
}

// URL triage status type
export type UrlTriageStatus = "verified" | "broken" | "unsure" | "yellow" | "unchecked"

// Extract URLs from markdown content
export function extractUrls(content: string): { url: string; label: string; tier?: number; archived: boolean; triageStatus: UrlTriageStatus; triageNote?: string }[] {
  const urls: { url: string; label: string; tier?: number; archived: boolean; triageStatus: UrlTriageStatus; triageNote?: string }[] = []

  // Match both standalone links and [Source: [link](url)] wrapped links
  // Use a regex that allows nested brackets in the label
  const linkRegex = /(?:~~)?\[((?:[^\[\]]|\[[^\]]*\])*)\]\((https?:\/\/[^)]+)\)(?:~~)?(?:\s*\((?:was )?Tier (\d)[^)]*\))?(?:\s*\(VERIFIED(?::\s*([^)]*))?\))?(?:\s*\(NEEDS REVIEW(?::\s*([^)]*))?\))?(?:\s*\(SLOW(?::\s*([^)]*))?\))?(?:\s*\([^)]*archived by Ops\))?/g
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const full = match[0]
    // Check surrounding context for archive markers (may be outside the match)
    const preIdx = Math.max(0, match.index - 2)
    const pre = content.slice(preIdx, match.index)
    const isArchived = full.startsWith("~~") || pre.includes("~~")
    const isVerified = full.includes("(VERIFIED")
    const isSlow = full.includes("(SLOW")
    const isUnsure = full.includes("(NEEDS REVIEW")
    const triageStatus: UrlTriageStatus = isArchived ? "broken" : isVerified ? "verified" : isSlow ? "yellow" : isUnsure ? "unsure" : "unchecked"
    const triageNote = match[4] || match[5] || match[6] || undefined
    urls.push({
      label: match[1],
      url: match[2],
      tier: match[3] ? parseInt(match[3]) : undefined,
      archived: isArchived,
      triageStatus,
      triageNote: triageNote?.trim(),
    })
  }

  // Deduplicate by URL — keep the entry with the most info (tier, triage status)
  const seen = new Map<string, typeof urls[0]>()
  for (const u of urls) {
    const existing = seen.get(u.url)
    if (!existing) {
      seen.set(u.url, u)
    } else {
      // Keep the one with more info: prefer tier, prefer non-unchecked status
      if (u.tier && !existing.tier) seen.set(u.url, u)
      if (u.triageStatus !== "unchecked" && existing.triageStatus === "unchecked") seen.set(u.url, u)
      if (u.triageNote && !existing.triageNote) seen.set(u.url, { ...seen.get(u.url)!, triageNote: u.triageNote })
    }
  }
  return Array.from(seen.values())
}

// Readiness color mapping
export function readinessColor(status: string): string {
  switch (status) {
    case "raw": return "#ef4444"      // red — D-F (matches vault health donut)
    case "draft": return "#f59e0b"    // amber — C
    case "ready": return "#10b981"    // green — B
    case "verified": return "#fbbf24" // gold — A+ (investigative standard)
    case "s-tier": return "#a78bfa"   // violet — S (original investigation / story grade)
    default: return "#6b7280"
  }
}

// Profile type color mapping
export function typeColor(type: string): string {
  switch (type) {
    case "politician": return "#5b8dce"
    case "state-politician": return "#7ba8d9"
    case "local-politician": return "#9bbde4"
    case "donor":
    case "corporation": return "#22c55e"
    case "think-tank": return "#a855f7"
    case "lobbying-firm": return "#f59e0b"
    case "media-profile": return "#ef4444"
    case "pac": return "#06b6d4"
    case "story": return "#ec4899"
    case "event": return "#8b5cf6"
    case "sub-note": return "#94a3b8"
    case "daily-update": return "#64748b"
    case "reference":
    case "index":
    case "methodology": return "#475569"
    default: return "#6b7280"
  }
}

// Stats summary
export interface VaultStats {
  totalProfiles: number
  byType: Record<string, number>
  byReadiness: Record<string, number>
  enriched: number
  notEnriched: number
  withTier1: number
  staleCount: number
  neverEnriched: number
  decayCandidates: { verifiedToReady: number; readyToDraft: number }
}

export function computeStats(profiles: Profile[]): VaultStats {
  const byType: Record<string, number> = {}
  const byReadiness: Record<string, number> = {}
  let enriched = 0
  let withTier1 = 0
  let staleCount = 0
  let neverEnriched = 0
  let verifiedToReady = 0
  let readyToDraft = 0
  const now = Date.now()
  const VERIFIED_DECAY_DAYS = 90
  const READY_DECAY_DAYS = 180

  // Types where enrichment doesn't apply (enrichment weight = 0 in
  // WEIGHTS_BY_TYPE from Phase 1d). These profiles should NOT count as
  // "not enriched" — they never need pipeline enrichment.
  const ENRICHMENT_NOT_APPLICABLE = new Set(
    Object.entries(WEIGHTS_BY_TYPE)
      .filter(([, w]) => w.enrichment === 0)
      .map(([t]) => t)
  )

  for (const p of profiles) {
    byType[p.type] = (byType[p.type] || 0) + 1
    byReadiness[p.contentReadiness] = (byReadiness[p.contentReadiness] || 0) + 1

    // Resolve the flat vault type to its top-level rulebook type for
    // the enrichment-applicability check. "corporation" → "entity"
    // (applicable), "story-seed" → "story" (not applicable), etc.
    const topLevel = resolveTypeForStats(p.type)
    const needsEnrichment = !ENRICHMENT_NOT_APPLICABLE.has(topLevel)

    if (p.lastEnriched) {
      enriched++
      const daysSince = (now - new Date(p.lastEnriched).getTime()) / (24 * 60 * 60 * 1000)
      if (daysSince > 30) staleCount++
      if (p.contentReadiness === "verified" && daysSince > VERIFIED_DECAY_DAYS) verifiedToReady++
      if (p.contentReadiness === "ready" && daysSince > READY_DECAY_DAYS) readyToDraft++
    } else if (needsEnrichment) {
      neverEnriched++
      if (p.contentReadiness === "ready") {
        const lastUpdate = p.lastUpdated ? new Date(p.lastUpdated).getTime() : 0
        if ((now - lastUpdate) / (24 * 60 * 60 * 1000) > READY_DECAY_DAYS) readyToDraft++
      }
    }
    // Types with enrichment weight = 0 (story, event, meta) are skipped
    // entirely from the enrichment counters — they never run through
    // FEC/LDA/SEC pipelines by design.
    if (p.sourceTier === 1) withTier1++
  }

  // notEnriched = profiles that SHOULD have enrichment but don't
  const enrichmentApplicable = profiles.filter((p) => {
    const tl = resolveTypeForStats(p.type)
    return !ENRICHMENT_NOT_APPLICABLE.has(tl)
  }).length

  return {
    totalProfiles: profiles.length,
    byType,
    byReadiness,
    enriched,
    notEnriched: enrichmentApplicable - enriched,
    withTier1,
    staleCount,
    neverEnriched,
    decayCandidates: { verifiedToReady, readyToDraft },
  }
}

// Determine what a profile needs next
export function profileNeeds(profile: Profile): string {
  // Types that don't go through enrichment pipelines
  const topLevel = resolveTypeForStats(profile.type)
  const enrichmentApplicable = !new Set(
    Object.entries(WEIGHTS_BY_TYPE).filter(([, w]) => w.enrichment === 0).map(([t]) => t)
  ).has(topLevel)

  if (profile.contentReadiness === "raw") {
    if (!enrichmentApplicable) return "Needs basic metadata and content"
    return "Needs basic metadata and content"
  }

  // S-tier: requires both auto audit and manual narrative sign-off
  if (profile.contentReadiness === "s-tier") {
    const missing: string[] = []
    if (!profile.auditSTierPassed) missing.push("janitor S-tier audit")
    if (!profile.editorialSignoffNarrative) missing.push("narrative sign-off")
    if (missing.length === 0) return "Up to date (S-tier)"
    return `S-tier pending: ${missing.join(", ")}`
  }

  if (profile.contentReadiness === "verified") {
    if (profile.lastEnriched) {
      const days = (Date.now() - new Date(profile.lastEnriched).getTime()) / (24 * 60 * 60 * 1000)
      if (days > 90) return "Stale A+ — re-enrich to maintain status"
    }
    // A+ profile with angle + exclusive connections is S-tier-eligible
    if (profile.angle && (profile.exclusiveConnections || []).length >= 3 && profile.originalFinding) {
      return "A+ — eligible for S-tier (awaiting audit + narrative sign-off)"
    }
    return "Up to date (A+)"
  }

  if (profile.contentReadiness === "ready") {
    // Build a checklist of what's needed for A+ — reads janitor-stamped
    // frontmatter fields (plan Step 5) before falling back to the legacy
    // heuristic. This is how VaultGrid reflects the tiered reality without
    // running the full checklist regex against every card's raw body.
    const missing: string[] = []
    // Prefer the janitor's stamped audit field if present
    if (!profile.auditAPlusPassed) {
      if (!profile.lastEnriched && enrichmentApplicable) missing.push("pipeline enrichment")
      const sourceCount = (profile.sourceTypes || []).length
      if (sourceCount < 3) missing.push(`${3 - sourceCount} more Tier 1 source type${3 - sourceCount === 1 ? "" : "s"}`)
      if (!profile.centralThesis) missing.push("central-thesis")
      if (!profile.storyGrade) missing.push("story-grade")
      if (profile.legalReviewResult === "block") missing.push("legal review (blocked)")
      if (profile.bothSidesFlag) missing.push("both-sides flag unresolved")
    }
    if (!profile.lastVerifiedBy) missing.push("editorial sign-off")

    if (missing.length === 0) return "Up to date (B) — ready for A+ sign-off"
    if (missing.length === 1 && missing[0] === "editorial sign-off") return "Ready for A+ — needs sign-off"
    return `Needs: ${missing.join(", ")}`
  }

  if (profile.contentReadiness === "draft") {
    if (!profile.lastEnriched && enrichmentApplicable) return "Never enriched — run pipeline"
    if (!profile.sourceTier || profile.sourceTier > 2) return "Needs Tier 1 sources"
    // Surface janitor flags if present
    if (profile.bothSidesFlag) return "Both-sides flag — same entity in donors+opposes"
    if ((profile.anomalyFlags || []).length > 0) return `Anomaly: ${(profile.anomalyFlags || []).slice(0, 2).join(", ")}`
    return "Needs more content and connections"
  }

  return "Up to date"
}

/**
 * Cheap grid-friendly version of the checklist: reads only janitor-stamped
 * frontmatter fields (no body regex). Returns the short "Needs: X, Y" string
 * that VaultGrid shows under each profile card.
 *
 * The janitor runs the expensive body-regex checks periodically and STAMPS
 * results into frontmatter:
 *   audit-a-plus-passed: YYYY-MM-DD
 *   anomaly-flags: [...]
 *   cross-vault-triangulation-count: N
 *   both-sides-flag: true
 *   central-thesis, story-grade, legal-review-result (Research Claude writes)
 *
 * This function reads those stamps to render an honest "is this profile
 * actually A+ material?" summary in the grid without running the full
 * VerificationChecklist.tsx logic against 1500+ cards.
 */
export function profileNeedsFromChecklist(profile: Profile): string {
  return profileNeeds(profile)  // Thin alias for now — both read stamped frontmatter
}
