import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const EvidencePanel: QuartzComponent = ({
  fileData,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "")
  const fm = fileData.frontmatter

  // Skip index pages and the landing page
  if (slug === "index" || slug.endsWith("/index")) return null

  // Only show on content pages that have frontmatter
  if (!fm) return null

  const type = String(fm?.type ?? "")
  const readiness = String(fm?.["content-readiness"] ?? "")
  const sourceTier = String(fm?.["source-tier"] ?? "")
  const lastUpdated = String(fm?.["last-updated"] ?? "")

  // Skip pages without a meaningful type
  if (!type || type === "unknown" || type === "undefined") return null

  // Determine evidence status from content-readiness
  let evidenceStatus = "DRAFT"
  let evidenceClass = "ep-draft"
  if (readiness === "verified") {
    evidenceStatus = "VERIFIED"
    evidenceClass = "ep-verified"
  } else if (readiness === "publication-ready" || readiness === "ready") {
    evidenceStatus = "SOURCED"
    evidenceClass = "ep-sourced"
  } else if (readiness === "in-progress") {
    evidenceStatus = "IN PROGRESS"
    evidenceClass = "ep-progress"
  } else if (readiness === "raw" || readiness === "placeholder") {
    evidenceStatus = "LIMITED SOURCES"
    evidenceClass = "ep-limited"
  } else if (readiness === "needs-review") {
    evidenceStatus = "NEEDS REVIEW"
    evidenceClass = "ep-review"
  }

  // Source tier display
  let tierDisplay = ""
  if (sourceTier === "1") tierDisplay = "PRIMARY SOURCES"
  else if (sourceTier === "2") tierDisplay = "SECONDARY SOURCES"
  else if (sourceTier === "3") tierDisplay = "TERTIARY SOURCES"

  // Count sources from raw content
  const rawContent = fileData.text ?? ""
  const tier1Count = (rawContent.match(/\(Tier 1\)/gi) || []).length
  const tier2Count = (rawContent.match(/\(Tier 2\)/gi) || []).length
  const tier3Count = (rawContent.match(/\(Tier 3\)/gi) || []).length
  const totalSources = tier1Count + tier2Count + tier3Count

  // Count external URLs as fallback if no tiered sources
  const urlCount = totalSources > 0 ? totalSources
    : (rawContent.match(/https?:\/\/[^\s)\]]+/g) || []).length

  // Type badge
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")

  // Entity subtype for donors
  const entityType = String(fm?.["entity-type"] ?? "")
  const sector = String(fm?.sector ?? "")
  const party = String(fm?.party ?? "")
  const chamber = String(fm?.chamber ?? "")
  const state = String(fm?.["state-abbr"] ?? "")

  // FEC party split data (written by fec-pipeline --write)
  const fecPartySplit = String(fm?.["fec-party-split"] ?? "")
  const totalPoliticalSpend = String(fm?.["total-political-spend"] ?? "")
  const isOrgDonor = entityType === "Corporation" || entityType === "PAC"

  // Parse "68% Dem / 32% Rep" → { demPct: 68, repPct: 32 }
  let demPct: number | null = null
  let repPct: number | null = null
  if (fecPartySplit) {
    const demMatch = fecPartySplit.match(/(\d+)%\s*Dem/i)
    const repMatch = fecPartySplit.match(/(\d+)%\s*Rep/i)
    if (demMatch) demPct = parseInt(demMatch[1])
    if (repMatch) repPct = parseInt(repMatch[1])
  }

  // Build context line
  const contextParts: string[] = []
  if (party && party !== "undefined") contextParts.push(party)
  if (chamber && chamber !== "undefined") contextParts.push(chamber)
  if (state && state !== "undefined") contextParts.push(state)
  if (sector && sector !== "undefined") contextParts.push(sector)
  if (entityType && entityType !== "undefined" && entityType !== "Individual Donor") contextParts.push(entityType)

  return (
    <div class={classNames(displayClass, "ep-panel")} data-evidence-status={evidenceStatus.toLowerCase()}>
      <div class="ep-row-top">
        <div class="ep-status-group">
          <span class={`ep-status ${evidenceClass}`}>{evidenceStatus}</span>
          {tierDisplay && <span class="ep-tier">{tierDisplay}</span>}
        </div>
        {lastUpdated && lastUpdated !== "undefined" && (
          <span class="ep-updated">VERIFIED {lastUpdated}</span>
        )}
      </div>

      <div class="ep-row-bottom">
        <div class="ep-source-counts">
          {tier1Count > 0 && (
            <span class="ep-source-badge ep-source-primary">{tier1Count} primary</span>
          )}
          {tier2Count > 0 && (
            <span class="ep-source-badge ep-source-secondary">{tier2Count} investigative</span>
          )}
          {tier3Count > 0 && (
            <span class="ep-source-badge ep-source-tertiary">{tier3Count} secondary</span>
          )}
          {totalSources === 0 && urlCount > 0 && (
            <span class="ep-source-badge ep-source-secondary">{urlCount} sources</span>
          )}
          {urlCount === 0 && (
            <span class="ep-source-badge ep-source-none">NO SOURCES</span>
          )}
        </div>

        {contextParts.length > 0 && (
          <div class="ep-context">{contextParts.join(" · ")}</div>
        )}

        <a href="/About-The-Donor-Map" class="ep-methodology-link">HOW WE VERIFY →</a>
      </div>

      {isOrgDonor && (demPct !== null || totalPoliticalSpend) && (
        <div class="ep-fec-row">
          {totalPoliticalSpend && totalPoliticalSpend !== "undefined" && (
            <span class="ep-spend-label">
              <span class="ep-spend-amount">{totalPoliticalSpend}</span> federal spend
            </span>
          )}
          {demPct !== null && repPct !== null && (
            <div class="ep-party-split">
              <span class="ep-split-label">PARTY SPLIT</span>
              <div class="ep-split-bar">
                <div class="ep-split-dem" style={`width: ${demPct}%`}>
                  {demPct >= 15 && <span class="ep-split-pct">{demPct}% D</span>}
                </div>
                <div class="ep-split-rep" style={`width: ${repPct}%`}>
                  {repPct >= 15 && <span class="ep-split-pct">{repPct}% R</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

EvidencePanel.css = `
/* ═══════════════════════════════════════════════
   EVIDENCE PANEL — Credibility signal on every page
   ═══════════════════════════════════════════════ */

.ep-panel {
  background: #f5f0eb;
  border: 1px solid #ddd;
  border-radius: 0;
  padding: 12px 16px;
  margin-bottom: 24px;
  font-family: 'Space Mono', monospace;
}

.ep-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ep-status-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ep-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 3px 10px;
  border-radius: 0;
}

.ep-verified {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

.ep-sourced {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.ep-progress {
  color: #0a0a0a;
  background: rgba(91, 141, 206, 0.12);
  border: 1px solid rgba(91, 141, 206, 0.25);
}

.ep-draft {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.ep-limited {
  color: #e63946;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.ep-review {
  color: #e63946;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.ep-tier {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #8a8a96;
}

.ep-updated {
  font-size: 10px;
  letter-spacing: 1px;
  color: #999;
}

.ep-row-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.ep-source-counts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ep-source-badge {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  padding: 2px 8px;
  border-radius: 0;
}

.ep-source-primary {
  color: #16a34a;
  background: rgba(34, 197, 94, 0.08);
}

.ep-source-secondary {
  color: #0a0a0a;
  background: rgba(91, 141, 206, 0.08);
}

.ep-source-tertiary {
  color: #777;
  background: rgba(161, 161, 170, 0.08);
}

.ep-source-none {
  color: #e63946;
  background: rgba(239, 68, 68, 0.08);
}

.ep-context {
  font-size: 10px;
  letter-spacing: 1px;
  color: #8a8a96;
}

.ep-methodology-link {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #0a0a0a;
  text-decoration: none;
  padding: 2px 8px;
  border: 1px solid rgba(91, 141, 206, 0.25);
  border-radius: 0;
  background: rgba(91, 141, 206, 0.06);
  white-space: nowrap;
  transition: all 0.15s ease;
  margin-left: auto;
}

.ep-methodology-link:hover {
  background: rgba(91, 141, 206, 0.15);
  border-color: rgba(91, 141, 206, 0.5);
  color: #7ba4de;
}

/* FEC Party Split Row */
.ep-fec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
  flex-wrap: wrap;
}

.ep-spend-label {
  font-size: 10px;
  color: #999;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.ep-spend-amount {
  color: #fbbf24;
  font-weight: 700;
}

.ep-party-split {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 160px;
}

.ep-split-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #8a8a96;
  white-space: nowrap;
}

.ep-split-bar {
  display: flex;
  flex: 1;
  height: 16px;
  border-radius: 0;
  overflow: hidden;
  background: #ddd;
}

.ep-split-dem {
  background: #3b72b8;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2px;
  transition: width 0.3s ease;
}

.ep-split-rep {
  background: #b83b3b;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2px;
  transition: width 0.3s ease;
}

.ep-split-pct {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255,255,255,0.9);
  letter-spacing: 0.5px;
  padding: 0 4px;
}

/* Mobile */
@media (max-width: 800px) {
  .ep-panel {
    padding: 10px 12px;
  }

  .ep-row-top, .ep-row-bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .ep-fec-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .ep-party-split {
    width: 100%;
  }
}
`

export default (() => EvidencePanel) satisfies QuartzComponentConstructor
