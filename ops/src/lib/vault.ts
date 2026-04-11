import matter from "gray-matter"

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

// Profile completeness score (0-100)
// Scored on 5 dimensions: frontmatter, sources, connections, content, enrichment
export function completenessScore(profile: Profile, content: string): number {
  let score = 0

  // 1. Frontmatter (20 points) — has key metadata fields
  const hasFm = [
    !!profile.type && profile.type !== "unknown",
    !!profile.lastUpdated,
    !!profile.sourceTier,
    profile.contentReadiness !== "raw",
  ]
  score += Math.round((hasFm.filter(Boolean).length / hasFm.length) * 20)

  // 2. Sources (20 points) — has Tier 1 sources
  const sources = countSources(content)
  if (sources.tier1 >= 3) score += 20
  else if (sources.tier1 >= 1) score += 15
  else if (sources.total >= 1) score += 5

  // 3. Connections (20 points) — has related/donors/opposes
  const hasRelated = !!(profile.related || content.match(/^related:\s*.+/m))
  const hasDonors = !!(profile.donors || content.match(/^donors:\s*.+/m))
  if (hasRelated && hasDonors) score += 20
  else if (hasRelated || hasDonors) score += 10

  // 4. Content (20 points) — has editorial body text
  const bodyLength = content.split("---").slice(2).join("---").trim().length
  if (bodyLength > 2000) score += 20
  else if (bodyLength > 500) score += 15
  else if (bodyLength > 100) score += 5

  // 5. Enrichment (20 points) — has been enriched by pipelines
  if (profile.lastEnriched) score += 20

  return score
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
    case "raw": return "#6b7280"      // grey — D-F
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
    case "donor":
    case "corporation": return "#22c55e"
    case "think-tank": return "#a855f7"
    case "lobbying-firm": return "#f59e0b"
    case "media-profile": return "#ef4444"
    case "pac": return "#06b6d4"
    case "story": return "#ec4899"
    case "event": return "#8b5cf6"
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

  for (const p of profiles) {
    byType[p.type] = (byType[p.type] || 0) + 1
    byReadiness[p.contentReadiness] = (byReadiness[p.contentReadiness] || 0) + 1
    if (p.lastEnriched) {
      enriched++
      const daysSince = (now - new Date(p.lastEnriched).getTime()) / (24 * 60 * 60 * 1000)
      if (daysSince > 30) staleCount++
      if (p.contentReadiness === "verified" && daysSince > VERIFIED_DECAY_DAYS) verifiedToReady++
      if (p.contentReadiness === "ready" && daysSince > READY_DECAY_DAYS) readyToDraft++
    } else {
      neverEnriched++
      // Ready profiles with no enrichment and no recent update are decay candidates
      if (p.contentReadiness === "ready") {
        const lastUpdate = p.lastUpdated ? new Date(p.lastUpdated).getTime() : 0
        if ((now - lastUpdate) / (24 * 60 * 60 * 1000) > READY_DECAY_DAYS) readyToDraft++
      }
    }
    if (p.sourceTier === 1) withTier1++
  }

  return {
    totalProfiles: profiles.length,
    byType,
    byReadiness,
    enriched,
    notEnriched: profiles.length - enriched,
    withTier1,
    staleCount,
    neverEnriched,
    decayCandidates: { verifiedToReady, readyToDraft },
  }
}

// Determine what a profile needs next
export function profileNeeds(profile: Profile): string {
  if (profile.contentReadiness === "raw") return "Needs basic metadata and content"

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
      if (!profile.lastEnriched) missing.push("pipeline enrichment")
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
    if (!profile.lastEnriched) return "Never enriched — run pipeline"
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
