import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"
import { classNames } from "../util/lang"

const ProfileWidget: QuartzComponent = ({
  fileData,
  allFiles,
  cfg,
  displayClass,
}: QuartzComponentProps) => {
  const slug = String(fileData.slug ?? "").toLowerCase()
  const fm = fileData.frontmatter
  if (!fm) return null

  const fmType = String(fm.type ?? "").toLowerCase()
  const isProfile = slug.includes("master-profile") || fmType === "politician" || fmType === "donor" || fmType === "corporation"
  if (!isProfile) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  const currentTitle = String(fm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
  const party = String(fm.party ?? "")
  const topDonors = Array.isArray(fm["top-donors"]) ? fm["top-donors"] as string[] : []

  if (topDonors.length === 0) {
    return (
      <div class={classNames(displayClass, "pw-widget")}>
        <div class="pw-empty">No donor data tracked yet for {currentTitle}.</div>
      </div>
    )
  }

  // Build donor info map from allFiles
  const donorInfo = new Map<string, { sector: string; slug: string; politiciansFunded: string[] }>()
  const polInfo = new Map<string, { party: string; slug: string; chamber: string }>()

  for (const f of allFiles) {
    const fFm = f.frontmatter
    if (!fFm) continue
    const fSlug = (f.slug ?? "").toLowerCase()
    const fTitle = String(fFm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()

    if (fSlug.startsWith("donors--and--power-networks/")) {
      const sector = String(fFm.sector ?? "")
      const pf = Array.isArray(fFm["politicians-funded"]) ? fFm["politicians-funded"] as string[] : []
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

  // ── FLOW TAB: Top donors with sector ──
  const flowData = topDonors.map((donorName) => {
    const info = donorInfo.get(donorName)
    return {
      donor: donorName,
      sector: info?.sector ?? "",
      slug: info?.slug ?? "",
    }
  })

  // ── BOTH SIDES TAB: Which of my donors also fund the other party? ──
  const oppositeParty = party === "Democrat" ? "Republican" : party === "Republican" ? "Democrat" : ""
  const bothSidesData: { donor: string; donorSlug: string; otherPols: { name: string; party: string; slug: string; chamber: string }[] }[] = []

  if (oppositeParty) {
    for (const donorName of topDonors) {
      const info = donorInfo.get(donorName)
      if (!info || info.politiciansFunded.length <= 1) continue

      const otherPols: { name: string; party: string; slug: string; chamber: string }[] = []
      for (const polName of info.politiciansFunded) {
        if (polName === currentTitle) continue
        const pi = polInfo.get(polName)
        if (pi && pi.party === oppositeParty) {
          otherPols.push({ name: polName, party: pi.party, slug: pi.slug, chamber: pi.chamber })
        }
      }
      if (otherPols.length > 0) {
        bothSidesData.push({
          donor: donorName,
          donorSlug: info.slug,
          otherPols: otherPols.slice(0, 5),
        })
      }
    }
  }

  // ── NETWORK TAB: Which donors fund the MOST politicians? ──
  const networkData = topDonors
    .map((donorName) => {
      const info = donorInfo.get(donorName)
      return {
        donor: donorName,
        slug: info?.slug ?? "",
        reach: info?.politiciansFunded?.length ?? 0,
        sector: info?.sector ?? "",
      }
    })
    .filter((d) => d.reach > 0)
    .sort((a, b) => b.reach - a.reach)

  const hasBothSides = bothSidesData.length > 0
  const hasNetwork = networkData.length > 0

  return (
    <div class={classNames(displayClass, "pw-widget")}>
      {/* Tabs */}
      <div class="pw-tabs">
        <button class="pw-tab pw-tab-active" data-tab="flow">Donors</button>
        {hasBothSides && <button class="pw-tab" data-tab="both">Both Sides</button>}
        {hasNetwork && <button class="pw-tab" data-tab="network">Reach</button>}
      </div>

      {/* Tab: Flow — Top Donors */}
      <div class="pw-panel pw-panel-active" data-panel="flow">
        <div class="pw-section-label">TOP DONORS</div>
        <div class="pw-explain">Organizations and individuals funding {currentTitle}.</div>
        {flowData.map((d) => (
          <a href={d.slug || "#"} class={`pw-flow-row ${d.slug ? "internal" : ""}`}>
            <div class="pw-flow-info">
              <span class="pw-flow-donor">{d.donor}</span>
              {d.sector && d.sector !== "undefined" && (
                <span class="pw-flow-sector">{d.sector}</span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Tab: Both Sides */}
      {hasBothSides && (
        <div class="pw-panel" data-panel="both">
          <div class="pw-section-label">
            {"ALSO FUNDS " + (party === "Democrat" ? "REPUBLICANS" : "DEMOCRATS")}
          </div>
          <div class="pw-explain">
            {"These donors fund " + currentTitle + " and also fund " + (party === "Democrat" ? "Republican" : "Democratic") + " politicians — the same money flows to both sides."}
          </div>
          {bothSidesData.map((b) => (
            <div class="pw-bs-row">
              <a href={b.donorSlug || "#"} class={`pw-bs-donor ${b.donorSlug ? "internal" : ""}`}>
                {b.donor}
              </a>
              <div class="pw-bs-recipients">
                {b.otherPols.map((r) => (
                  <a href={r.slug} class="pw-bs-recip internal">
                    <span class={`pw-bs-party ${r.party === "Democrat" ? "pw-dem" : "pw-rep"}`}>
                      {r.party === "Democrat" ? "D" : "R"}
                    </span>
                    <span class="pw-bs-name">{r.name}</span>
                    {r.chamber && r.chamber !== "undefined" && (
                      <span class="pw-bs-chamber">{r.chamber}</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Network — Donor Reach */}
      {hasNetwork && (
        <div class="pw-panel" data-panel="network">
          <div class="pw-section-label">DONOR REACH</div>
          <div class="pw-explain">How many politicians each donor funds. Higher numbers mean wider influence networks.</div>
          {networkData.map((d) => (
            <a href={d.slug || "#"} class={`pw-flow-row ${d.slug ? "internal" : ""}`}>
              <div class="pw-flow-info">
                <span class="pw-flow-donor">{d.donor}</span>
                {d.sector && d.sector !== "undefined" && (
                  <span class="pw-flow-sector">{d.sector}</span>
                )}
              </div>
              <div class="pw-reach-badge">
                <span class="pw-reach-num">{d.reach}</span>
                <span class="pw-reach-label">funded</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

ProfileWidget.afterDOMLoaded = `
function initProfileWidget() {
  var widget = document.querySelector('.pw-widget');
  if (!widget) return;

  var tabs = widget.querySelectorAll('.pw-tab');
  var panels = widget.querySelectorAll('.pw-panel');

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var target = tab.getAttribute('data-tab');

      tabs.forEach(function(t) { t.classList.remove('pw-tab-active'); });
      panels.forEach(function(p) { p.classList.remove('pw-panel-active'); });

      tab.classList.add('pw-tab-active');
      var panel = widget.querySelector('[data-panel="' + target + '"]');
      if (panel) panel.classList.add('pw-panel-active');
    });
  });
}

initProfileWidget();
document.addEventListener('nav', function() {
  setTimeout(initProfileWidget, 100);
});
`

ProfileWidget.css = `
/* ═══════════════════════════════════════════════
   PROFILE WIDGET — Right sidebar sticky widget
   ═══════════════════════════════════════════════ */

.pw-widget {
  background: #13131a;
  border: 1px solid #1e1e28;
  border-radius: 8px;
  padding: 0;
  margin-top: 16px;
  overflow: visible;
}

.pw-empty {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #7a7a86;
  padding: 16px;
}

/* Tabs */
.pw-tabs {
  display: flex;
  border-bottom: 1px solid #1e1e28;
  background: #0e0e14;
}

.pw-tab {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: none;
  color: #8a8a96;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  border-bottom: 2px solid transparent;
}

.pw-tab:hover {
  color: #a1a1aa;
  background: rgba(91, 141, 206, 0.04);
}

.pw-tab-active {
  color: #5b8dce !important;
  border-bottom-color: #5b8dce !important;
  background: rgba(91, 141, 206, 0.06) !important;
}

/* Panels */
.pw-panel {
  display: none;
  padding: 14px;
  max-height: 400px;
  overflow-y: auto;
}

.pw-panel-active {
  display: block;
}

.pw-panel::-webkit-scrollbar { width: 3px; }
.pw-panel::-webkit-scrollbar-track { background: transparent; }
.pw-panel::-webkit-scrollbar-thumb { background: #1e1e28; border-radius: 2px; }
.pw-panel::-webkit-scrollbar-thumb:hover { background: #2a2a36; }

.pw-section-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #8a8a96;
  margin-bottom: 4px;
}

.pw-explain {
  font-size: 11px;
  line-height: 1.5;
  color: #8a8a96;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1a1a22;
}

/* ─── Flow/Donors tab ───────────────────────────── */

a.pw-flow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 4px;
  margin-bottom: 2px;
  transition: background 0.15s;
  text-decoration: none !important;
  color: inherit !important;
}

a.pw-flow-row:hover {
  background: rgba(91, 141, 206, 0.06);
}

.pw-flow-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pw-flow-donor {
  font-size: 12px;
  font-weight: 600;
  color: #d4d4dc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pw-flow-sector {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #8a8a96;
  letter-spacing: 0.5px;
}

/* ─── Reach badge ────────────────────────────── */

.pw-reach-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.pw-reach-num {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #22c55e;
}

.pw-reach-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #7a7a86;
  letter-spacing: 0.5px;
}

/* ─── Both Sides tab ─────────────────────── */

.pw-bs-row {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #1e1e28;
}

.pw-bs-row:hover {
  border-color: rgba(91, 141, 206, 0.2);
}

a.pw-bs-donor {
  font-size: 12px;
  font-weight: 700;
  color: #5b8dce !important;
  margin-bottom: 6px;
  display: block;
  text-decoration: none !important;
}

a.pw-bs-donor:hover {
  color: #8bb5e8 !important;
}

.pw-bs-recipients {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

a.pw-bs-recip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-decoration: none !important;
  color: inherit !important;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background 0.1s;
}

a.pw-bs-recip:hover {
  background: rgba(91, 141, 206, 0.06);
}

.pw-bs-party {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  flex-shrink: 0;
}

.pw-dem {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.pw-rep {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.15);
}

.pw-bs-name {
  color: #d4d4dc;
  font-weight: 500;
  flex: 1;
}

.pw-bs-chamber {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #8a8a96;
  flex-shrink: 0;
}

/* ─── Hide on mobile (right sidebar hides) ─── */
@media (max-width: 800px) {
  .pw-widget {
    display: none;
  }
}
`

export default (() => ProfileWidget) satisfies QuartzComponentConstructor
