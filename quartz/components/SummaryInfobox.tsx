import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

/**
 * SummaryInfobox — Section 1 of the Profile Template
 *
 * Renders the top-of-page summary box for verified profiles. Per
 * content/Profile Template.md section 1: every big fact in the first
 * viewport. No scrolling to know who this is and why they matter.
 *
 * Data source: frontmatter fields populated by pipelines / CSV ingest +
 * manually curated top-donors list. This component is read-only — it does
 * not query canonical stores at render time (that's the profile data-panel
 * script's job).
 *
 * Only renders for profile types subject to the 9-section template:
 *   politician, state-politician, local-politician, donor, corporation,
 *   pac, think-tank, lobbying-firm
 *
 * Hidden for: sub-notes, stories, events, admin-notes, redirects, etc.
 */

const VERIFIED_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

function formatMoney(value: unknown): string {
  if (value === undefined || value === null || value === "") return ""
  if (typeof value === "string") {
    return value
  }
  if (typeof value === "number") {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value}`
  }
  return ""
}

function toArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === "string") {
    // Try parsing wikilink-pipe format: "[[Name]] · [[Other]]"
    const links = value.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
    if (links) return links.map((l) => l.replace(/\[\[|\]\].*/g, "").split("|")[0].trim())
    return value.split(/[,·]/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

const SummaryInfobox: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const type = String(fm.type ?? "")
  if (!VERIFIED_TYPES.has(type)) return null

  const readiness = String(fm["content-readiness"] ?? "")
  // Optional: hide on raw profiles (too incomplete to show a summary box)
  if (readiness === "raw") return null

  const party = String(fm.party ?? "")
  const chamber = String(fm.chamber ?? "")
  const state = String(fm.state ?? "")
  const stateAbbr = String(fm["state-abbr"] ?? "")
  const district = String(fm.district ?? "")
  const currentOffice = String(fm["current-office"] ?? "")
  const sector = String(fm.sector ?? "")
  const entityType = String(fm["entity-type"] ?? "")

  // Money stats
  const careerTotal = fm["career-total"] ?? fm["total-received"] ?? fm["total-raised"] ?? ""
  const lobbyingSpend = fm["lobbying-spend"] ?? ""
  const totalRevenue = fm["total-revenue"] ?? ""

  // Top connections
  const topDonors = toArray(fm["top-donors"] ?? fm.donors).slice(0, 3)
  const politiciansFunded = toArray(fm["politicians-funded"]).slice(0, 3)

  // Data freshness
  const lastEnriched = String(fm["last-enriched"] ?? fm["last-updated"] ?? "")
  const lastEnrichedDate = lastEnriched ? new Date(lastEnriched) : null
  const daysOld = lastEnrichedDate && !isNaN(lastEnrichedDate.getTime())
    ? Math.floor((Date.now() - lastEnrichedDate.getTime()) / 86400000)
    : null
  const freshnessLabel = daysOld === null ? "" : daysOld < 30 ? "fresh" : daysOld < 90 ? "recent" : "stale"

  // Readiness badge
  const readinessColor =
    readiness === "verified" ? "#16a34a" :
    readiness === "ready" ? "#fbbf24" :
    readiness === "draft" ? "#6b7280" : "#999"

  const isPolitician = type === "politician" || type === "state-politician" || type === "local-politician"
  const isDonorOrPac = type === "donor" || type === "pac"
  const isCorp = type === "corporation"

  // Build context line
  const contextParts: string[] = []
  if (isPolitician) {
    if (party) contextParts.push(party)
    if (chamber) contextParts.push(chamber)
    if (stateAbbr || state) contextParts.push(stateAbbr || state)
    if (district) contextParts.push(`District ${district}`)
  } else {
    if (entityType) contextParts.push(entityType)
    if (sector) contextParts.push(sector)
  }

  return (
    <aside class="summary-infobox" data-profile-type={type}>
      <div class="summary-infobox-header">
        <span class="summary-type-badge">{type.replace(/-/g, " ").toUpperCase()}</span>
        {readiness && (
          <span class="summary-readiness-badge" style={`border-color: ${readinessColor}; color: ${readinessColor};`}>
            {readiness.toUpperCase()}
          </span>
        )}
      </div>

      {contextParts.length > 0 && (
        <div class="summary-context">{contextParts.join(" · ")}</div>
      )}

      {currentOffice && (
        <div class="summary-office">
          <span class="summary-label">CURRENT OFFICE</span>
          <span class="summary-value">{currentOffice}</span>
        </div>
      )}

      {/* Primary money stat */}
      {(isPolitician && careerTotal) && (
        <div class="summary-stat-primary">
          <span class="summary-stat-label">CAREER TOTAL RAISED</span>
          <span class="summary-stat-number">{formatMoney(careerTotal)}</span>
        </div>
      )}
      {(isDonorOrPac && careerTotal) && (
        <div class="summary-stat-primary">
          <span class="summary-stat-label">TOTAL POLITICAL SPEND</span>
          <span class="summary-stat-number">{formatMoney(careerTotal)}</span>
        </div>
      )}
      {(isCorp && (totalRevenue || lobbyingSpend)) && (
        <div class="summary-stat-grid">
          {totalRevenue && (
            <div class="summary-stat">
              <span class="summary-stat-label">REVENUE</span>
              <span class="summary-stat-number">{formatMoney(totalRevenue)}</span>
            </div>
          )}
          {lobbyingSpend && (
            <div class="summary-stat">
              <span class="summary-stat-label">LOBBYING SPEND</span>
              <span class="summary-stat-number">{formatMoney(lobbyingSpend)}</span>
            </div>
          )}
        </div>
      )}

      {/* Top connections */}
      {topDonors.length > 0 && (
        <div class="summary-connections">
          <span class="summary-label">TOP DONORS</span>
          <ul class="summary-connections-list">
            {topDonors.map((name) => (
              <li><a href={`/${name.toLowerCase().replace(/\s+/g, "-")}`}>{name}</a></li>
            ))}
          </ul>
        </div>
      )}
      {politiciansFunded.length > 0 && (
        <div class="summary-connections">
          <span class="summary-label">TOP POLITICIANS FUNDED</span>
          <ul class="summary-connections-list">
            {politiciansFunded.map((name) => (
              <li><a href={`/${name.toLowerCase().replace(/\s+/g, "-")}`}>{name}</a></li>
            ))}
          </ul>
        </div>
      )}

      {/* Freshness */}
      {lastEnriched && (
        <div class="summary-freshness" data-status={freshnessLabel}>
          <span class="summary-label">DATA AS OF</span>
          <span class="summary-value">{lastEnriched.slice(0, 10)}</span>
          {daysOld !== null && daysOld > 90 && (
            <span class="summary-freshness-warning">({daysOld}d stale — needs re-enrichment)</span>
          )}
        </div>
      )}
    </aside>
  )
}

SummaryInfobox.css = `
.summary-infobox {
  border: 2px solid var(--dark);
  background: var(--light);
  padding: 24px;
  margin: 0 0 32px;
  font-family: "Inter", sans-serif;
  max-width: 100%;
}

.summary-infobox-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.summary-type-badge {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--dark);
  border: 1px solid var(--dark);
  padding: 2px 8px;
}

.summary-readiness-badge {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  border: 1px solid;
  padding: 2px 8px;
}

.summary-context {
  font-family: "Space Mono", monospace;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--darkgray);
  margin-bottom: 20px;
  text-transform: uppercase;
}

.summary-office {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--lightgray);
}

.summary-label {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--darkgray);
}

.summary-value {
  font-family: "Inter", sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--dark);
}

.summary-stat-primary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--lightgray);
}

.summary-stat-number {
  font-family: "Inter", sans-serif;
  font-weight: 900;
  font-size: 42px;
  line-height: 1;
  color: var(--dark);
  letter-spacing: -0.02em;
}

.summary-stat-label {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--darkgray);
}

.summary-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--lightgray);
}

.summary-stat {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary-stat .summary-stat-number {
  font-size: 28px;
}

.summary-connections {
  margin-bottom: 20px;
}

.summary-connections .summary-label {
  display: block;
  margin-bottom: 8px;
}

.summary-connections-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.summary-connections-list li {
  font-family: "Inter", sans-serif;
  font-size: 13px;
  font-weight: 600;
}

.summary-connections-list a {
  color: var(--secondary);
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 1px;
}

.summary-connections-list a:hover {
  color: var(--dark);
}

.summary-freshness {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding-top: 12px;
  border-top: 1px solid var(--lightgray);
  font-family: "Space Mono", monospace;
  font-size: 10px;
}

.summary-freshness .summary-value {
  font-size: 11px;
  font-weight: 400;
  color: var(--dark);
}

.summary-freshness-warning {
  color: #e63946;
  margin-left: 8px;
}

@media (max-width: 600px) {
  .summary-infobox {
    padding: 16px;
    margin: 0 0 20px;
  }
  .summary-stat-number {
    font-size: 32px;
  }
  .summary-stat-grid {
    grid-template-columns: 1fr;
  }
}
`

export default (() => SummaryInfobox) satisfies QuartzComponentConstructor
