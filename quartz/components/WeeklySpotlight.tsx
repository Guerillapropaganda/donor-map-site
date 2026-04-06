import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"

interface SpotlightEntry {
  name: string
  slug: string
  sector: string
  entityType: string
  reason: string
  shareableStat: string
  featuredDate: string
  readiness: string
  politiciansFunded: string[]
  issues: string[]
}

const WeeklySpotlight: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  if (!slug.includes("interactive/weekly-spotlight")) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  // Collect all featured entries
  const spotlights: SpotlightEntry[] = []

  for (const f of allFiles) {
    const fm = f.frontmatter
    if (!fm) continue
    const featuredDate = String(fm["featured-date"] ?? "")
    if (!featuredDate || featuredDate === "undefined" || featuredDate === "null") continue

    const name = String(fm.title ?? "").replace(/^_/, "")
    const sector = String(fm.sector ?? "")
    const entityType = String(fm["entity-type"] ?? "")
    const reason = String(fm["spotlight-reason"] ?? "")
    const shareableStat = String(fm["shareable-stat"] ?? "")
    const readiness = String(fm["content-readiness"] ?? "draft")
    const politiciansFunded = Array.isArray(fm["politicians-funded"]) ? fm["politicians-funded"] as string[] : []
    const issues = Array.isArray(fm.issues) ? fm.issues as string[] : []

    spotlights.push({
      name,
      slug: `${basePath}/${simplifySlug(f.slug!)}`,
      sector,
      entityType,
      reason,
      shareableStat,
      featuredDate,
      readiness,
      politiciansFunded,
      issues,
    })
  }

  // Sort by date descending (most recent first)
  spotlights.sort((a, b) => b.featuredDate.localeCompare(a.featuredDate))

  // Current spotlight = first one whose date is <= today (or most recent)
  const now = new Date().toISOString().split("T")[0]
  const current = spotlights.find((s) => s.featuredDate <= now) ?? spotlights[0]
  const upcoming = spotlights.filter((s) => s.featuredDate > now)
  const past = spotlights.filter((s) => s !== current && s.featuredDate <= now)

  if (!current) return <div class="ws-empty">No spotlights scheduled yet.</div>

  return (
    <div class="ws-spotlight">
      {/* Current spotlight — big hero card */}
      <div class="ws-current">
        <div class="ws-current-label">THIS WEEK'S SPOTLIGHT</div>
        <a href={current.slug} class="ws-hero-card internal">
          <div class="ws-hero-top">
            <div class="ws-hero-info">
              <h2 class="ws-hero-name">{current.name}</h2>
              <div class="ws-hero-meta">
                {current.sector && current.sector !== "undefined" && (
                  <span class="ws-hero-sector">{current.sector}</span>
                )}
                {current.entityType && current.entityType !== "undefined" && (
                  <span class="ws-hero-type">{current.entityType}</span>
                )}
              </div>
            </div>
            <div class="ws-hero-date">
              <span class="ws-date-label">WEEK OF</span>
              <span class="ws-date-value">{current.featuredDate}</span>
            </div>
          </div>

          {current.reason && (
            <p class="ws-hero-reason">{current.reason}</p>
          )}

          {current.shareableStat && (
            <div class="ws-hero-stat">
              <span class="ws-stat-icon">$</span>
              <span class="ws-stat-text">{current.shareableStat}</span>
            </div>
          )}

          <div class="ws-hero-bottom">
            {current.politiciansFunded.length > 0 && (
              <div class="ws-hero-reach">
                <span class="ws-reach-count">{current.politiciansFunded.length}</span>
                <span class="ws-reach-label">politicians funded</span>
              </div>
            )}
            {current.issues.length > 0 && (
              <div class="ws-hero-issues">
                {current.issues.map((issue) => (
                  <span class="ws-issue-tag">{issue}</span>
                ))}
              </div>
            )}
          </div>

          <div class="ws-hero-cta">Read Full Profile →</div>
        </a>
      </div>

      {/* Upcoming spotlights */}
      {upcoming.length > 0 && (
        <div class="ws-upcoming">
          <div class="ws-section-label">COMING UP</div>
          <div class="ws-upcoming-grid">
            {upcoming.map((s) => (
              <a href={s.slug} class="ws-upcoming-card internal">
                <div class="ws-upcoming-date">{s.featuredDate}</div>
                <div class="ws-upcoming-name">{s.name}</div>
                {s.sector && s.sector !== "undefined" && (
                  <div class="ws-upcoming-sector">{s.sector}</div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Past spotlights archive */}
      {past.length > 0 && (
        <div class="ws-archive">
          <div class="ws-section-label">ARCHIVE</div>
          <div class="ws-archive-list">
            {past.map((s) => (
              <a href={s.slug} class="ws-archive-row internal">
                <span class="ws-archive-date">{s.featuredDate}</span>
                <span class="ws-archive-name">{s.name}</span>
                {s.sector && s.sector !== "undefined" && (
                  <span class="ws-archive-sector">{s.sector}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

WeeklySpotlight.css = `
/* ═══════════════════════════════════════════════
   WEEKLY SPOTLIGHT
   ═══════════════════════════════════════════════ */

.ws-spotlight {
  margin-top: 8px;
}

/* Current spotlight hero */
.ws-current-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #f59e0b;
  margin-bottom: 16px;
}

.ws-hero-card {
  display: block;
  background: linear-gradient(135deg, #13131a 0%, #111118 100%);
  border: 2px solid rgba(245, 158, 11, 0.25);
  border-radius: 12px;
  padding: 32px;
  text-decoration: none !important;
  color: inherit !important;
  transition: border-color 0.2s;
}

.ws-hero-card:hover {
  border-color: #f59e0b;
}

.ws-hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.ws-hero-name {
  font-size: 32px !important;
  font-weight: 700 !important;
  color: #e4e4e7 !important;
  margin: 0 0 8px 0 !important;
  border: none !important;
  padding: 0 !important;
  line-height: 1.2;
}

.ws-hero-meta {
  display: flex;
  gap: 8px;
}

.ws-hero-sector {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.1);
  padding: 3px 10px;
  border-radius: 3px;
}

.ws-hero-type {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #63636e;
  letter-spacing: 0.5px;
  padding: 3px 10px;
}

.ws-hero-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.ws-date-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  letter-spacing: 2px;
  color: #7a7a86;
}

.ws-date-value {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: #63636e;
}

.ws-hero-reason {
  font-size: 15px;
  line-height: 1.7;
  color: #b4b4bc;
  margin-bottom: 20px;
}

.ws-hero-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 8px;
  margin-bottom: 20px;
}

.ws-stat-icon {
  font-family: 'Space Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #f59e0b;
}

.ws-stat-text {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
  letter-spacing: 0.5px;
}

.ws-hero-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.ws-hero-reach {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.ws-reach-count {
  font-family: 'Space Mono', monospace;
  font-size: 24px;
  font-weight: 700;
  color: #22c55e;
}

.ws-reach-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #63636e;
  letter-spacing: 0.5px;
}

.ws-hero-issues {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ws-issue-tag {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #a1a1aa;
  background: rgba(161, 161, 170, 0.06);
  padding: 3px 8px;
  border-radius: 3px;
}

.ws-hero-cta {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  color: #f59e0b;
  letter-spacing: 0.5px;
}

/* Upcoming */
.ws-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #63636e;
  margin-top: 32px;
  margin-bottom: 12px;
}

.ws-upcoming-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.ws-upcoming-card {
  display: block;
  background: #111118;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 16px;
  text-decoration: none !important;
  color: inherit !important;
  transition: border-color 0.15s;
}

.ws-upcoming-card:hover {
  border-color: rgba(245, 158, 11, 0.3);
}

.ws-upcoming-date {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #7a7a86;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.ws-upcoming-name {
  font-size: 14px;
  font-weight: 600;
  color: #e4e4e7;
  margin-bottom: 4px;
}

.ws-upcoming-sector {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #5b8dce;
}

/* Archive */
.ws-archive-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ws-archive-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 14px;
  border-radius: 6px;
  text-decoration: none !important;
  color: inherit !important;
  transition: background 0.15s;
}

.ws-archive-row:hover {
  background: rgba(91, 141, 206, 0.04);
}

.ws-archive-date {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #7a7a86;
  flex-shrink: 0;
  width: 90px;
}

.ws-archive-name {
  font-size: 13px;
  font-weight: 600;
  color: #b4b4bc;
  flex: 1;
}

.ws-archive-sector {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #5b8dce;
  background: rgba(91, 141, 206, 0.06);
  padding: 2px 8px;
  border-radius: 3px;
  flex-shrink: 0;
}

/* Mobile */
@media (max-width: 800px) {
  .ws-hero-card {
    padding: 20px;
  }

  .ws-hero-name {
    font-size: 24px !important;
  }

  .ws-hero-top {
    flex-direction: column;
    gap: 12px;
  }

  .ws-hero-date {
    align-items: flex-start;
  }

  .ws-hero-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}
`

export default (() => WeeklySpotlight) satisfies QuartzComponentConstructor
