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
export function extractUrls(content: string): { url: string; label: string; tier?: number; archived: boolean; triageStatus: UrlTriageStatus }[] {
  const urls: { url: string; label: string; tier?: number; archived: boolean; triageStatus: UrlTriageStatus }[] = []
  const linkRegex = /(?:~~)?\[([^\]]+)\]\(([^)]+)\)(?:~~)?(?:\s*\(Tier (\d)\))?(?:\s*\(VERIFIED\))?(?:\s*\(NEEDS REVIEW\))?/g
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const full = match[0]
    const isArchived = full.startsWith("~~")
    const isVerified = full.includes("(VERIFIED)")
    const isUnsure = full.includes("(NEEDS REVIEW)")
    const triageStatus: UrlTriageStatus = isArchived ? "broken" : isVerified ? "verified" : isUnsure ? "unsure" : "unchecked"
    urls.push({
      label: match[1],
      url: match[2],
      tier: match[3] ? parseInt(match[3]) : undefined,
      archived: isArchived,
      triageStatus,
    })
  }

  return urls
}

// Readiness color mapping
export function readinessColor(status: string): string {
  switch (status) {
    case "raw": return "#6b7280"      // grey
    case "draft": return "#f59e0b"    // amber
    case "developed": return "#5b8dce" // steel blue
    case "verified": return "#22c55e"  // green
    case "ready": return "#10b981"     // bright green
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
}

export function computeStats(profiles: Profile[]): VaultStats {
  const byType: Record<string, number> = {}
  const byReadiness: Record<string, number> = {}
  let enriched = 0
  let withTier1 = 0

  for (const p of profiles) {
    byType[p.type] = (byType[p.type] || 0) + 1
    byReadiness[p.contentReadiness] = (byReadiness[p.contentReadiness] || 0) + 1
    if (p.lastEnriched) enriched++
    if (p.sourceTier === 1) withTier1++
  }

  return {
    totalProfiles: profiles.length,
    byType,
    byReadiness,
    enriched,
    notEnriched: profiles.length - enriched,
    withTier1,
  }
}
