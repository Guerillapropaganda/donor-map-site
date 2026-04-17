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

const SummaryInfobox: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  const fm = fileData.frontmatter
  if (!fm) return null

  const type = String(fm.type ?? "")
  if (!VERIFIED_TYPES.has(type)) return null

  const readiness = String(fm["content-readiness"] ?? "")
  // Optional: hide on raw profiles (too incomplete to show a summary box)
  if (readiness === "raw") return null

  // Caveat note about the career total (e.g. "$724M from IE only, total ~$1.45B per OpenSecrets")
  const careerTotalNote = String(fm["total-received-note"] ?? fm["career-total-note"] ?? "")

  // Custom outlier stats (Trump's Truth Social stake, $TRUMP coin, etc.)
  // For profiles with extraordinary financials that don't fit the standard schema.
  interface CustomStat {
    label: string
    value: string
    source?: string
  }
  const customStatsRaw = fm["custom-stats"]
  const customStats: CustomStat[] = Array.isArray(customStatsRaw)
    ? customStatsRaw.filter((s: unknown): s is CustomStat =>
        typeof s === "object" && s !== null && "label" in s && "value" in s)
    : []

  // Data freshness
  const lastEnriched = String(fm["last-enriched"] ?? fm["last-updated"] ?? "")
  const lastEnrichedDate = lastEnriched ? new Date(lastEnriched) : null
  const daysOld = lastEnrichedDate && !isNaN(lastEnrichedDate.getTime())
    ? Math.floor((Date.now() - lastEnrichedDate.getTime()) / 86400000)
    : null

  // Don't render anything if there's nothing unique to show.
  // ProfileHeader already shows: type badge, party, chamber, money, top donors.
  // This component only exists for content that ProfileHeader DOESN'T show:
  //   - custom-stats (outlier financials like Trump's Truth Social stake)
  //   - total-received-note (scope/caveat for career total)
  //   - data freshness stamp
  const hasUniqueContent = customStats.length > 0 || careerTotalNote || (lastEnriched && daysOld !== null && daysOld > 90)
  if (!hasUniqueContent) return null

  return (
    <aside class="summary-infobox" data-profile-type={type}>
      {careerTotalNote && (
        <div class="summary-stat-note-standalone">
          <span class="summary-label">ABOUT THE TOTAL</span>
          <p>{careerTotalNote}</p>
        </div>
      )}
      {/* Custom outlier stats (Trump grift numbers, etc.) */}
      {customStats.length > 0 && (
        <div class="summary-custom-stats">
          <span class="summary-label">ADDITIONAL TRACKED FINANCIALS</span>
          <ul class="summary-custom-stats-list">
            {customStats.map((s) => (
              <li>
                <span class="custom-stat-label">{s.label}</span>
                <span class="custom-stat-value">{s.value}</span>
                {s.source && <span class="custom-stat-source">{s.source}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Freshness warning (only show if stale) */}
      {lastEnriched && daysOld !== null && daysOld > 90 && (
        <div class="summary-freshness-warning-standalone">
          <span class="summary-label">⚠ STALE DATA</span>
          <span>Last enriched {lastEnriched.slice(0, 10)} ({daysOld} days ago). Needs re-enrichment.</span>
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

.summary-stat-note {
  font-family: "Space Mono", monospace;
  font-size: 10px;
  color: var(--darkgray);
  line-height: 1.4;
  margin-top: 4px;
  font-style: italic;
}

.summary-custom-stats {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--lightgray);
}

.summary-custom-stats .summary-label {
  display: block;
  margin-bottom: 12px;
}

.summary-custom-stats-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.summary-custom-stats-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--lightgray);
  font-family: "Inter", sans-serif;
  font-size: 12px;
}

.summary-custom-stats-list li:last-child {
  border-bottom: none;
}

.custom-stat-label {
  color: var(--dark);
  font-weight: 600;
}

.custom-stat-value {
  color: var(--dark);
  font-weight: 700;
  font-family: "Space Mono", monospace;
  text-align: right;
}

.custom-stat-source {
  grid-column: 1 / -1;
  color: var(--darkgray);
  font-family: "Space Mono", monospace;
  font-size: 9px;
  font-style: italic;
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
