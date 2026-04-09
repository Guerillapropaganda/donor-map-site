import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"

const MobileProfile: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  // Only on profile pages
  const isPolitician = slug.startsWith("politicians/") && slug.includes("master-profile")
  const isDonor = slug.startsWith("donors--and--power-networks/")
  if (!isPolitician && !isDonor) return null

  const fm = fileData.frontmatter
  if (!fm) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  const currentTitle = String(fm.title ?? "")
    .replace(/^_/, "")
    .replace(/\s*Master Profile.*/, "")
    .trim()
  if (!currentTitle) return null

  const party = String(fm.party ?? "")
  const topDonors = Array.isArray(fm["top-donors"]) ? (fm["top-donors"] as string[]) : []
  const polsFunded = Array.isArray(fm["politicians-funded"]) ? (fm["politicians-funded"] as string[]) : []

  // Build cross-reference maps
  const donorInfo = new Map<string, { sector: string; slug: string; politiciansFunded: string[] }>()
  const polInfo = new Map<string, { party: string; slug: string; chamber: string }>()

  for (const f of allFiles) {
    const fFm = f.frontmatter
    if (!fFm) continue
    const fSlug = (f.slug ?? "").toLowerCase()
    const fTitle = String(fFm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()

    if (fSlug.startsWith("donors--and--power-networks/")) {
      const sector = String(fFm.sector ?? "")
      const pf = Array.isArray(fFm["politicians-funded"]) ? (fFm["politicians-funded"] as string[]) : []
      donorInfo.set(fTitle, {
        sector,
        slug: `${basePath}/${simplifySlug(f.slug!)}`,
        politiciansFunded: pf,
      })
    }

    if (fSlug.startsWith("politicians/") && fSlug.includes("master-profile")) {
      polInfo.set(fTitle, {
        party: String(fFm.party ?? ""),
        slug: `${basePath}/${simplifySlug(f.slug!)}`,
        chamber: String(fFm.chamber ?? ""),
      })
    }
  }

  // ── SECTION 1: Top Donors (for politicians) or Politicians Funded (for donors) ──
  const donorList = topDonors.map((name) => {
    const info = donorInfo.get(name)
    return { name, sector: info?.sector ?? "", slug: info?.slug ?? "" }
  })

  const polList = polsFunded.map((name) => {
    const info = polInfo.get(name)
    return { name, party: info?.party ?? "", slug: info?.slug ?? "", chamber: info?.chamber ?? "" }
  })

  // ── SECTION 2: Both Sides (for politicians) ──
  const oppositeParty = party === "Democrat" ? "Republican" : party === "Republican" ? "Democrat" : ""
  const bothSidesData: { donor: string; donorSlug: string; otherPols: { name: string; party: string; slug: string }[] }[] = []

  if (isPolitician && oppositeParty) {
    for (const donorName of topDonors) {
      const info = donorInfo.get(donorName)
      if (!info || info.politiciansFunded.length <= 1) continue
      const otherPols: { name: string; party: string; slug: string }[] = []
      for (const polName of info.politiciansFunded) {
        if (polName === currentTitle) continue
        const pi = polInfo.get(polName)
        if (pi && pi.party === oppositeParty) {
          otherPols.push({ name: polName, party: pi.party, slug: pi.slug })
        }
      }
      if (otherPols.length > 0) {
        bothSidesData.push({
          donor: donorName,
          donorSlug: info.slug,
          otherPols: otherPols.slice(0, 3),
        })
      }
    }
  }

  // ── SECTION 3: Events ──
  const events: { title: string; date: string; sourceUrl: string; source: string }[] = []
  for (const f of allFiles) {
    const fSlug = (f.slug ?? "").toLowerCase()
    if (!fSlug.startsWith("events/")) continue
    const fFm = f.frontmatter
    if (!fFm) continue
    const profiles = Array.isArray(fFm.profiles) ? (fFm.profiles as string[]) : []
    if (!profiles.some((p) => p.toLowerCase() === currentTitle.toLowerCase())) continue
    events.push({
      title: String(fFm.title ?? "").replace(/^_/, "").trim(),
      date: String(fFm.date ?? ""),
      sourceUrl: String(fFm["source-url"] ?? ""),
      source: String(fFm.source ?? "").replace(/"/g, ""),
    })
  }
  events.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
  const recentEvents = events.slice(0, 5)

  // ── SECTION 4: Reach (for politicians) ──
  const networkData = isPolitician
    ? topDonors
        .map((name) => {
          const info = donorInfo.get(name)
          return { name, reach: info?.politiciansFunded?.length ?? 0, slug: info?.slug ?? "" }
        })
        .filter((d) => d.reach > 0)
        .sort((a, b) => b.reach - a.reach)
        .slice(0, 5)
    : []

  const hasDonors = donorList.length > 0
  const hasPols = polList.length > 0
  const hasBothSides = bothSidesData.length > 0
  const hasEvents = recentEvents.length > 0
  const hasReach = networkData.length > 0

  if (!hasDonors && !hasPols && !hasBothSides && !hasEvents) return null

  // Build sections data for client-side accordion
  const sections: { id: string; label: string; count?: number }[] = []
  if (hasDonors) sections.push({ id: "donors", label: "TOP DONORS", count: donorList.length })
  if (hasPols) sections.push({ id: "funded", label: "FUNDS", count: polList.length })
  if (hasBothSides) sections.push({ id: "both", label: "BOTH SIDES", count: bothSidesData.length })
  if (hasReach) sections.push({ id: "reach", label: "DONOR REACH" })
  if (hasEvents) sections.push({ id: "events", label: "RECENT NEWS", count: events.length })

  return (
    <div class="mp-container">
      <div class="mp-header">
        <span class="mp-title">PROFILE INTEL</span>
        <span class="mp-name">{currentTitle}</span>
      </div>

      {/* Top Donors */}
      {hasDonors && (
        <div class="mp-section" data-section="donors">
          <button class="mp-section-toggle" data-target="donors">
            <span class="mp-section-label">TOP DONORS</span>
            <span class="mp-section-count">{donorList.length}</span>
            <span class="mp-chevron">+</span>
          </button>
          <div class="mp-section-body" id="mp-donors">
            <div class="mp-explain">Organizations and individuals funding {currentTitle}.</div>
            {donorList.map((d) => (
              <a href={d.slug || "#"} class={`mp-row ${d.slug ? "internal" : ""}`}>
                <span class="mp-row-name">{d.name}</span>
                {d.sector && d.sector !== "undefined" && (
                  <span class="mp-row-meta">{d.sector}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Politicians Funded (for donor profiles) */}
      {hasPols && (
        <div class="mp-section" data-section="funded">
          <button class="mp-section-toggle" data-target="funded">
            <span class="mp-section-label">POLITICIANS FUNDED</span>
            <span class="mp-section-count">{polList.length}</span>
            <span class="mp-chevron">+</span>
          </button>
          <div class="mp-section-body" id="mp-funded">
            <div class="mp-explain">Politicians receiving funding from {currentTitle}.</div>
            {polList.map((p) => (
              <a href={p.slug || "#"} class={`mp-row ${p.slug ? "internal" : ""}`}>
                {p.party && (
                  <span class={`mp-party-dot ${p.party === "Democrat" ? "mp-dem" : "mp-rep"}`}>
                    {p.party === "Democrat" ? "D" : "R"}
                  </span>
                )}
                <span class="mp-row-name">{p.name}</span>
                {p.chamber && p.chamber !== "undefined" && (
                  <span class="mp-row-meta">{p.chamber}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Both Sides */}
      {hasBothSides && (
        <div class="mp-section" data-section="both">
          <button class="mp-section-toggle" data-target="both">
            <span class="mp-section-label">BOTH SIDES</span>
            <span class="mp-section-count">{bothSidesData.length}</span>
            <span class="mp-chevron">+</span>
          </button>
          <div class="mp-section-body" id="mp-both">
            <div class="mp-explain">
              {"These donors fund " + currentTitle + " and also fund " + (party === "Democrat" ? "Republican" : "Democratic") + " politicians."}
            </div>
            {bothSidesData.map((b) => (
              <div class="mp-bs-card">
                <a href={b.donorSlug || "#"} class={`mp-bs-donor ${b.donorSlug ? "internal" : ""}`}>
                  {b.donor}
                </a>
                <div class="mp-bs-also">also funds</div>
                <div class="mp-bs-pols">
                  {b.otherPols.map((r) => (
                    <a href={r.slug} class="mp-bs-pol internal">
                      <span class={`mp-party-dot ${r.party === "Democrat" ? "mp-dem" : "mp-rep"}`}>
                        {r.party === "Democrat" ? "D" : "R"}
                      </span>
                      {r.name}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Donor Reach */}
      {hasReach && (
        <div class="mp-section" data-section="reach">
          <button class="mp-section-toggle" data-target="reach">
            <span class="mp-section-label">DONOR REACH</span>
            <span class="mp-chevron">+</span>
          </button>
          <div class="mp-section-body" id="mp-reach">
            <div class="mp-explain">How many politicians each donor funds across the database.</div>
            {networkData.map((d) => (
              <a href={d.slug || "#"} class={`mp-row ${d.slug ? "internal" : ""}`}>
                <span class="mp-row-name">{d.name}</span>
                <span class="mp-reach-num">{d.reach} funded</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent Events */}
      {hasEvents && (
        <div class="mp-section" data-section="events">
          <button class="mp-section-toggle" data-target="events">
            <span class="mp-section-label">RECENT NEWS</span>
            <span class="mp-section-count">{events.length}</span>
            <span class="mp-chevron">+</span>
          </button>
          <div class="mp-section-body" id="mp-events">
            {recentEvents.map((ev) => (
              <div class="mp-event">
                {ev.sourceUrl ? (
                  <a href={ev.sourceUrl} class="mp-event-title" target="_blank" rel="noopener">
                    {ev.title}
                  </a>
                ) : (
                  <span class="mp-event-title">{ev.title}</span>
                )}
                <div class="mp-event-meta">
                  {ev.date && (
                    <span class="mp-event-date">
                      {new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  {ev.source && ev.source !== "undefined" && (
                    <span class="mp-event-source">{ev.source}</span>
                  )}
                </div>
              </div>
            ))}
            {events.length > 5 && (
              <div class="mp-more">+ {events.length - 5} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

MobileProfile.afterDOMLoaded = `
function initMobileProfile() {
  var container = document.querySelector('.mp-container');
  if (!container) return;

  var toggles = container.querySelectorAll('.mp-section-toggle');
  toggles.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var section = btn.closest('.mp-section');
      if (!section) return;
      var body = section.querySelector('.mp-section-body');
      var chevron = btn.querySelector('.mp-chevron');
      if (!body) return;

      var isOpen = body.classList.contains('mp-open');
      if (isOpen) {
        body.classList.remove('mp-open');
        body.style.maxHeight = '0';
        if (chevron) chevron.textContent = '+';
      } else {
        body.classList.add('mp-open');
        body.style.maxHeight = body.scrollHeight + 'px';
        if (chevron) chevron.textContent = '-';
      }
    });
  });

  // Auto-open first section
  var first = container.querySelector('.mp-section-body');
  var firstChevron = container.querySelector('.mp-chevron');
  if (first) {
    first.classList.add('mp-open');
    first.style.maxHeight = first.scrollHeight + 'px';
    if (firstChevron) firstChevron.textContent = '-';
  }
}

initMobileProfile();
document.addEventListener('nav', function() {
  setTimeout(initMobileProfile, 150);
});
`

MobileProfile.css = `
/* ═══════════════════════════════════════════════
   MOBILE PROFILE — Accordion panel below content
   Only visible on mobile (≤800px)
   ═══════════════════════════════════════════════ */

.mp-container {
  display: none;
}

@media (max-width: 800px) {
  .mp-container {
    display: block;
    margin: 24px 0;
    background: #ece6dd;
    border: 1px solid #ddd;
    border-radius: 10px;
    overflow: hidden;
  }

  .mp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: #f5f0eb;
    border-bottom: 1px solid #ddd;
  }

  .mp-title {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #0a0a0a;
  }

  .mp-name {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  /* Sections */
  .mp-section {
    border-bottom: 1px solid #ddd;
  }

  .mp-section:last-child {
    border-bottom: none;
  }

  .mp-section-toggle {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    border: none;
    background: none;
    cursor: pointer;
    gap: 8px;
    transition: background 0.15s;
  }

  .mp-section-toggle:active {
    background: rgba(91, 141, 206, 0.06);
  }

  .mp-section-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: #8a8a96;
    flex: 1;
    text-align: left;
  }

  .mp-section-count {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    color: #0a0a0a;
    background: rgba(91, 141, 206, 0.1);
    padding: 2px 8px;
    border-radius: 10px;
  }

  .mp-chevron {
    font-family: 'Space Mono', monospace;
    font-size: 16px;
    font-weight: 700;
    color: #0a0a0a;
    width: 24px;
    text-align: center;
  }

  /* Collapsible body */
  .mp-section-body {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
    padding: 0 16px;
  }

  .mp-section-body.mp-open {
    padding: 0 16px 14px;
  }

  .mp-explain {
    font-size: 12px;
    line-height: 1.5;
    color: #8a8a96;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #ddd;
  }

  /* Rows — donors, politicians */
  a.mp-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 8px;
    border-radius: 0;
    text-decoration: none !important;
    color: inherit !important;
    transition: background 0.15s;
  }

  a.mp-row:active {
    background: rgba(91, 141, 206, 0.08);
  }

  .mp-row-name {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mp-row-meta {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #999;
    flex-shrink: 0;
  }

  .mp-reach-num {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    color: #16a34a;
    flex-shrink: 0;
  }

  /* Party dots */
  .mp-party-dot {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0;
    flex-shrink: 0;
  }

  .mp-dem {
    color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);
  }

  .mp-rep {
    color: #e63946;
    background: rgba(239, 68, 68, 0.15);
  }

  /* Both Sides cards */
  .mp-bs-card {
    padding: 10px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 0;
    margin-bottom: 8px;
    border: 1px solid #ddd;
  }

  a.mp-bs-donor {
    font-size: 14px;
    font-weight: 700;
    color: #0a0a0a !important;
    text-decoration: none !important;
    display: block;
    margin-bottom: 4px;
  }

  .mp-bs-also {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #999;
    letter-spacing: 1px;
    margin: 4px 0;
  }

  .mp-bs-pols {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  a.mp-bs-pol {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #333 !important;
    text-decoration: none !important;
    padding: 4px 6px;
    border-radius: 0;
  }

  a.mp-bs-pol:active {
    background: rgba(91, 141, 206, 0.08);
  }

  /* Events */
  .mp-event {
    padding: 8px 0;
    border-bottom: 1px solid #ddd;
  }

  .mp-event:last-child {
    border-bottom: none;
  }

  a.mp-event-title,
  span.mp-event-title {
    font-size: 13px;
    font-weight: 600;
    color: #333 !important;
    text-decoration: none !important;
    line-height: 1.4;
    display: block;
  }

  .mp-event-meta {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  .mp-event-date {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #0a0a0a;
    font-weight: 600;
  }

  .mp-event-source {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: #999;
  }

  .mp-more {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #999;
    text-align: center;
    padding: 8px 0;
  }
}
`

export default (() => MobileProfile) satisfies QuartzComponentConstructor
