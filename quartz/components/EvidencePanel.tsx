import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

// Sector → color mapping for money trail bar
const SECTOR_COLORS: Record<string, string> = {
  "Pharma & Healthcare": "#16a34a",
  "Healthcare": "#16a34a",
  "Insurance Industry": "#16a34a",
  "Wall Street": "#fbbf24",
  "Finance": "#fbbf24",
  "Defense & Intelligence": "#6b7280",
  "Tech & Crypto": "#3b82f6",
  "Energy & Utilities": "#e63946",
  "Mega-Donors": "#a855f7",
  "Israel Lobby": "#f59e0b",
  "Agriculture": "#84cc16",
  "Real Estate": "#d97706",
  "Labor Unions": "#1d4ed8",
  "Dark Money": "#555",
  "Media & Entertainment": "#a855f7",
}

function getSectorColor(sector: string): string {
  for (const [key, color] of Object.entries(SECTOR_COLORS)) {
    if (sector.toLowerCase().includes(key.toLowerCase())) return color
  }
  return "#999"
}

const EvidencePanel: QuartzComponent = ({
  fileData,
  allFiles,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "")
  const fm = fileData.frontmatter

  if (slug === "index" || slug.endsWith("/index")) return null
  if (!fm) return null

  const type = String(fm?.type ?? "")
  if (!type || type === "unknown" || type === "undefined") return null

  const lastUpdated = String(fm?.["last-updated"] ?? "")
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")

  // Context
  const party = String(fm?.party ?? "")
  const chamber = String(fm?.chamber ?? "")
  const stateAbbr = String(fm?.["state-abbr"] ?? "")
  const sector = String(fm?.sector ?? "")
  const entityType = String(fm?.["entity-type"] ?? "")

  const contextParts: string[] = []
  if (party && party !== "undefined") contextParts.push(party)
  if (chamber && chamber !== "undefined") contextParts.push(chamber)
  if (stateAbbr && stateAbbr !== "undefined") contextParts.push(stateAbbr)
  if (sector && sector !== "undefined") contextParts.push(sector)
  if (entityType && entityType !== "undefined" && entityType !== "Individual Donor") contextParts.push(entityType)

  // ─── Say-vs-pay corruption headline ───
  const svp = fm?.["say-vs-pay"] as any
  const gapStat = svp?.["gap-stat"] ? String(svp["gap-stat"]) : ""

  // ─── Connection counts ───
  let donorCount = 0
  let lobbyCount = 0
  let thinkTankCount = 0
  let polCount = 0

  // Count from frontmatter arrays
  const topDonors = Array.isArray(fm?.["top-donors"]) ? fm["top-donors"] as string[] : []
  const politiciansFunded = Array.isArray(fm?.["politicians-funded"]) ? fm["politicians-funded"] as string[] : []
  const related = Array.isArray(fm?.related) ? fm.related as string[] : []

  // For politicians: top-donors count = donor connections
  if (type === "politician") {
    donorCount = topDonors.length
  }
  // For donors: politicians-funded count
  if (type === "donor" || type === "corporation" || type === "pac") {
    polCount = politiciansFunded.length
  }

  // Count related by type using allFiles lookup
  if (allFiles && related.length > 0) {
    for (const rel of related) {
      const relName = String(rel).replace(/\[\[/g, "").replace(/\]\]/g, "").split("|")[0].toLowerCase()
      const found = allFiles.find((f) => {
        const fSlug = (f.slug ?? "").toLowerCase()
        return fSlug.endsWith(relName.replace(/ /g, "-")) || String(f.frontmatter?.title ?? "").toLowerCase() === relName
      })
      if (found) {
        const fType = String(found.frontmatter?.type ?? "")
        if (fType === "lobbying-firm") lobbyCount++
        else if (fType === "think-tank") thinkTankCount++
        else if (fType === "donor" || fType === "corporation") donorCount++
      }
    }
  }

  const hasConnections = donorCount > 0 || lobbyCount > 0 || thinkTankCount > 0 || polCount > 0

  // ─── FEC party split (for donors) — must be before Both Sides check ───
  const fecPartySplit = String(fm?.["fec-party-split"] ?? "")
  const totalPoliticalSpend = String(fm?.["total-political-spend"] ?? "")
  let demPct: number | null = null
  let repPct: number | null = null
  if (fecPartySplit) {
    const demMatch = fecPartySplit.match(/(\d+)%\s*Dem/i)
    const repMatch = fecPartySplit.match(/(\d+)%\s*Rep/i)
    if (demMatch) demPct = parseInt(demMatch[1])
    if (repMatch) repPct = parseInt(repMatch[1])
  }

  // ─── #2: Both Sides badge (donors who fund both parties) ───
  let fundsBothSides = false
  if ((type === "donor" || type === "corporation" || type === "pac") && politiciansFunded.length > 0 && allFiles) {
    let hasDem = false
    let hasRep = false
    for (const polName of politiciansFunded) {
      const name = String(polName).replace(/\[\[/g, "").replace(/\]\]/g, "").split("|")[0].trim().toLowerCase()
      const polFile = allFiles.find((f) =>
        String(f.frontmatter?.title ?? "").toLowerCase() === name
      )
      if (polFile) {
        const p = String(polFile.frontmatter?.party ?? "").toLowerCase()
        if (p.startsWith("dem")) hasDem = true
        if (p.startsWith("rep")) hasRep = true
      }
      if (hasDem && hasRep) { fundsBothSides = true; break }
    }
  }
  // Also detect from fec-party-split
  if (!fundsBothSides && demPct !== null && repPct !== null && demPct >= 10 && repPct >= 10) {
    fundsBothSides = true
  }

  // ─── Money trail bar (sector breakdown for politicians) ───
  interface SectorSegment { sector: string; color: string; pct: number }
  const sectorSegments: SectorSegment[] = []

  if (type === "politician" && topDonors.length > 0 && allFiles) {
    const sectorCounts: Record<string, number> = {}
    for (const donorName of topDonors) {
      const name = String(donorName).replace(/\[\[/g, "").replace(/\]\]/g, "").split("|")[0].trim()
      const donorFile = allFiles.find((f) =>
        String(f.frontmatter?.title ?? "").toLowerCase() === name.toLowerCase()
      )
      if (donorFile) {
        const s = String(donorFile.frontmatter?.sector ?? "Other")
        sectorCounts[s] = (sectorCounts[s] || 0) + 1
      }
    }
    const total = Object.values(sectorCounts).reduce((a, b) => a + b, 0)
    if (total > 0) {
      for (const [s, count] of Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])) {
        sectorSegments.push({
          sector: s,
          color: getSectorColor(s),
          pct: Math.round((count / total) * 100),
        })
      }
    }
  }

  return (
    <div class={classNames(displayClass, "signal-bar")}>
      {/* Row 1: Corruption headline (if say-vs-pay exists) */}
      {gapStat && (
        <div class="signal-headline">
          <span class="signal-headline-label">THE SIGNAL</span>
          <span class="signal-headline-text">{gapStat}</span>
        </div>
      )}

      {/* Row 1b: Donor signal (for donor profiles) */}
      {!gapStat && (type === "donor" || type === "corporation") && (polCount > 0 || totalPoliticalSpend) && (
        <div class="signal-headline">
          <span class="signal-headline-label">THE SIGNAL</span>
          <span class="signal-headline-text">
            {polCount > 0 && `FUNDS ${polCount} POLITICIANS`}
            {polCount > 0 && fecPartySplit && ` · `}
            {fecPartySplit && fecPartySplit}
            {totalPoliticalSpend && totalPoliticalSpend !== "undefined" && ` · ${totalPoliticalSpend} TOTAL SPEND`}
          </span>
        </div>
      )}

      {/* Row 2: Money trail bar (sector breakdown) — clickable, jumps to The Money tab */}
      {sectorSegments.length > 0 && (
        <a href="#the-money" class="signal-trail signal-trail-clickable" data-target-tab="donors" title="Click to view donor breakdown by sector">
          <div class="signal-trail-bar">
            {sectorSegments.map((seg) => (
              <div
                class="signal-segment"
                style={{ width: `${seg.pct}%`, background: seg.color }}
                title={`${seg.sector}: ${seg.pct}%`}
              />
            ))}
          </div>
          <div class="signal-trail-labels">
            {sectorSegments.slice(0, 4).map((seg) => (
              <span class="signal-trail-label" style={{ color: seg.color }}>
                {seg.sector.replace(/ & /g, "/")} {seg.pct}%
              </span>
            ))}
          </div>
        </a>
      )}

      {/* Row 2b: Party split bar (for donors) — clickable, jumps to Recipients tab */}
      {demPct !== null && repPct !== null && (
        <a href="#politicians-funded" class="signal-trail signal-trail-clickable" data-target-tab="recipients" title="Click to view politicians funded">
          <div class="signal-trail-bar">
            <div class="signal-segment" style={{ width: `${demPct}%`, background: "#1d4ed8" }} title={`Democrat: ${demPct}%`} />
            <div class="signal-segment" style={{ width: `${repPct}%`, background: "#e63946" }} title={`Republican: ${repPct}%`} />
          </div>
        </a>
      )}

      {/* Row 3: Meta bar */}
      <div class="signal-meta">
        <div class="signal-meta-left">
          <span class="signal-type-badge">{typeLabel}</span>
          {fundsBothSides && (
            <span class="signal-both-sides">FUNDS BOTH SIDES</span>
          )}
          {contextParts.length > 0 && (
            <span class="signal-context">{contextParts.join(" · ")}</span>
          )}
          {hasConnections && (
            <span class="signal-counts">
              {donorCount > 0 && <span class="signal-count">{donorCount} donors</span>}
              {lobbyCount > 0 && <span class="signal-count">{lobbyCount} lobbyists</span>}
              {thinkTankCount > 0 && <span class="signal-count">{thinkTankCount} think tanks</span>}
              {polCount > 0 && <span class="signal-count">{polCount} politicians</span>}
            </span>
          )}
        </div>
        <div class="signal-meta-right">
          {lastUpdated && lastUpdated !== "undefined" && (
            <span class="signal-updated">UPDATED {lastUpdated}</span>
          )}
          <a href="/About-The-Donor-Map" class="signal-verify-link">HOW WE VERIFY →</a>
        </div>
      </div>
    </div>
  )
}

EvidencePanel.afterDOMLoaded = `
(function() {
  // Wire up click handlers on signal-trail bars to switch profile tabs.
  // When user clicks the money-trail gradient, activate the "donors" tab
  // (or whichever tab was declared via data-target-tab).
  function wireSignalTrails() {
    var trails = document.querySelectorAll('.signal-trail-clickable');
    trails.forEach(function(trail) {
      if (trail.dataset.clickWired === 'true') return;
      trail.dataset.clickWired = 'true';
      trail.addEventListener('click', function(e) {
        e.preventDefault();
        var targetTab = trail.getAttribute('data-target-tab');
        if (!targetTab) return;
        var article = document.querySelector('article');
        if (!article) return;
        // Find the tab button and click it
        var btn = article.querySelector('.profile-tab-btn[data-tab="' + targetTab + '"]');
        if (btn) {
          btn.click();
          // Scroll to the first card in that tab
          setTimeout(function() {
            var card = article.querySelector('.profile-section-card[data-tab="' + targetTab + '"]:not(.profile-tab-hidden)');
            if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }
      });
    });
  }
  wireSignalTrails();
  document.addEventListener('nav', function() {
    setTimeout(wireSignalTrails, 200);
  });
})();
`

EvidencePanel.css = `
/* ═══════════════════════════════════════════════
   SIGNAL BAR — The gut-punch at the top
   ═══════════════════════════════════════════════ */

.signal-bar {
  margin-bottom: 20px;
  font-family: 'Space Mono', monospace;
}

/* ── Row 1: Corruption headline ── */
.signal-headline {
  background: #0a0a0a;
  padding: 12px 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.signal-headline-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #fbbf24;
  white-space: nowrap;
}

.signal-headline-text {
  font-size: 12px;
  font-weight: 700;
  color: #f5f0eb;
  letter-spacing: 0.5px;
}

/* ── Row 2: Money trail bar ── */
.signal-trail {
  margin-bottom: 8px;
  display: block;
}

.signal-trail-clickable {
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  padding: 4px 0;
  position: relative;
  transition: opacity 0.15s ease;
}

.signal-trail-clickable::after {
  content: "→ view breakdown";
  position: absolute;
  right: 0;
  top: 4px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--darkgray);
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.signal-trail-clickable:hover {
  opacity: 0.85;
}

.signal-trail-clickable:hover::after {
  opacity: 1;
}

.signal-trail-clickable:hover .signal-trail-bar {
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
}

.signal-trail-bar {
  display: flex;
  height: 8px;
  width: 100%;
  overflow: hidden;
}

.signal-segment {
  min-width: 2px;
  transition: width 0.3s ease;
}

.signal-trail-labels {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.signal-trail-label {
  font-size: 9px;
  letter-spacing: 1px;
  font-weight: 700;
}

/* ── Row 3: Meta bar ── */
.signal-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ddd;
}

.signal-meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.signal-meta-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.signal-type-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #0a0a0a;
  padding: 4px 12px;
  background: #fbbf24;
}

.signal-both-sides {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #0a0a0a;
  background: #fbbf24;
  padding: 3px 10px;
}

.signal-context {
  font-size: 10px;
  letter-spacing: 1px;
  color: #999;
}

.signal-counts {
  display: flex;
  gap: 8px;
}

.signal-count {
  font-size: 10px;
  color: #555;
  letter-spacing: 0.5px;
}

.signal-count::before {
  content: '·';
  margin-right: 8px;
  color: #ddd;
}

.signal-updated {
  font-size: 10px;
  letter-spacing: 1px;
  color: #999;
}

.signal-verify-link {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #0a0a0a !important;
  text-decoration: none;
  border-bottom: 2px solid #fbbf24 !important;
  padding-bottom: 1px;
}

.signal-verify-link:hover {
  color: #fbbf24 !important;
}

/* ── Mobile ── */
@media (max-width: 800px) {
  .signal-headline {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .signal-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .signal-trail-labels {
    flex-wrap: wrap;
    gap: 8px;
  }
}
`

export default (() => EvidencePanel) satisfies QuartzComponentConstructor
