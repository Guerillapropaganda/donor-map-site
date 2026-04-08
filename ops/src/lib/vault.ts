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
}

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
export type UrlTriageStatus = "verified" | "broken" | "unsure" | "unchecked"

// Extract URLs from markdown content
export function extractUrls(content: string): { url: string; label: string; tier?: number; archived: boolean; triageStatus: UrlTriageStatus; triageNote?: string }[] {
  const urls: { url: string; label: string; tier?: number; archived: boolean; triageStatus: UrlTriageStatus; triageNote?: string }[] = []
  const linkRegex = /(?:~~)?\[([^\]]+)\]\(([^)]+)\)(?:~~)?(?:\s*\((?:was )?Tier (\d)[^)]*\))?(?:\s*\(VERIFIED(?::\s*([^)]*))?\))?(?:\s*\(NEEDS REVIEW(?::\s*([^)]*))?\))?(?:\s*\([^)]*archived by Ops\))?/g
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const full = match[0]
    const isArchived = full.startsWith("~~")
    const isVerified = full.includes("(VERIFIED")
    const isUnsure = full.includes("(NEEDS REVIEW")
    const triageStatus: UrlTriageStatus = isArchived ? "broken" : isVerified ? "verified" : isUnsure ? "unsure" : "unchecked"
    // Extract note from markers: (VERIFIED: note) or (NEEDS REVIEW: note)
    const triageNote = match[4] || match[5] || undefined
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

  if (profile.contentReadiness === "verified") {
    if (profile.lastEnriched) {
      const days = (Date.now() - new Date(profile.lastEnriched).getTime()) / (24 * 60 * 60 * 1000)
      if (days > 90) return "Stale A+ — re-enrich to maintain status"
    }
    return "Up to date (A+)"
  }

  if (profile.contentReadiness === "ready") {
    // Build a checklist of what's needed for A+
    const missing: string[] = []
    if (!profile.lastEnriched) missing.push("pipeline enrichment")
    const sourceCount = (profile.sourceTypes || []).length
    if (sourceCount < 2) missing.push(`${2 - sourceCount} more Tier 1 source type${sourceCount === 1 ? "" : "s"}`)
    if (!profile.lastVerifiedBy) missing.push("editorial sign-off")

    if (missing.length === 0) return "Up to date (B)"
    if (missing.length === 1 && missing[0] === "editorial sign-off") return "Ready for A+ — needs sign-off"
    return `Needs: ${missing.join(", ")}`
  }

  if (profile.contentReadiness === "draft") {
    if (!profile.lastEnriched) return "Never enriched — run pipeline"
    if (!profile.sourceTier || profile.sourceTier > 2) return "Needs Tier 1 sources"
    return "Needs more content and connections"
  }

  return "Up to date"
}
