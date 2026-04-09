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
  const PROFILE_TYPES = ["politician", "donor", "corporation", "pac", "think-tank", "lobbying-firm", "media-profile"]
  const isProfile = slug.includes("master-profile") || PROFILE_TYPES.includes(fmType)
  if (!isProfile) return null

  const baseUrl = cfg.baseUrl ?? ""
  const slashIdx = baseUrl.indexOf("/")
  const basePath = slashIdx >= 0 ? "/" + baseUrl.substring(slashIdx + 1) : ""

  const currentTitle = String(fm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
  const party = String(fm.party ?? "")
  const topDonors = Array.isArray(fm["top-donors"]) ? fm["top-donors"] as string[] : []
  const isPolitician = fmType === "politician"
  const isDonorType = fmType === "donor" || fmType === "corporation" || fmType === "pac"

  // Extract wikilink targets from our own related/donors/opposes/stories fields
  const ourRelated = String(fm.related ?? "")
  const ourDonorsField = String(fm.donors ?? "")
  const ourOpposesField = String(fm.opposes ?? "")
  const ourStoriesField = String(fm.stories ?? "")
  const ourAllLinks = ourRelated + " " + ourDonorsField + " " + ourStoriesField
  const ourLinkTargets = new Set<string>()
  const ourOpposesTargets = new Set<string>()
  {
    const lr = /\[\[([^\]|]+)/g
    let m: RegExpExecArray | null
    while ((m = lr.exec(ourAllLinks)) !== null) {
      ourLinkTargets.add(m[1].replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim())
    }
  }
  {
    const lr = /\[\[([^\]|]+)/g
    let m: RegExpExecArray | null
    while ((m = lr.exec(ourOpposesField)) !== null) {
      ourOpposesTargets.add(m[1].replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim())
    }
  }

  // Build lookup maps from allFiles
  const donorInfo = new Map<string, { sector: string; slug: string; politiciansFunded: string[] }>()
  const polInfo = new Map<string, { party: string; slug: string; chamber: string }>()
  // Extended network: think tanks, K Street, media, politicians, donors connected to this profile
  const networkInfo = new Map<string, { type: string; slug: string; category?: string; via?: string; edgeType?: string }>()
  // For donor profiles: track politicians they fund
  const politiciansFunded = isDonorType ? (Array.isArray(fm["politicians-funded"]) ? fm["politicians-funded"] as string[] : []) : []

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

    // Scan think tanks, K Street, media for connections
    const isThinkTank = fSlug.startsWith("think-tanks--and--policy-infrastructure/")
    const isKStreet = fSlug.startsWith("lobbying-firms--and--k-street/")
    const isMedia = fSlug.startsWith("media--and--influence-pipeline/")
    if (isThinkTank || isKStreet || isMedia) {
      const fmType2 = String(fFm.type ?? "").toLowerCase()
      if (!fmType2 || fmType2 === "index" || fmType2 === "framework" || fmType2 === "article" || fmType2 === "story") continue
      if (fTitle.includes("—") || fTitle.startsWith("_") || fTitle.includes(" Index") || fTitle.includes(" Framework")) continue
      if (fTitle === currentTitle) continue // skip self
      const fType = isThinkTank ? "think-tank" : isKStreet ? "lobbying" : "media"
      const category = String(fFm.category ?? "")

      // Check mutual references
      const theirRelated = String(fFm.related ?? "")
      const theirOpposes = String(fFm.opposes ?? "")
      const theyReferenceUs = theirRelated.toLowerCase().includes(currentTitle.toLowerCase())
      const weReferenceThem = topDonors.includes(fTitle) || ourLinkTargets.has(fTitle)
      // Check opposition references (either direction)
      const theyOpposeUs = theirOpposes.toLowerCase().includes(currentTitle.toLowerCase())
      const weOpposeThem = ourOpposesTargets.has(fTitle)

      // Shared-donor bridge (for politician profiles)
      const theirDonors = String(fFm.donors ?? "")
      const theirAllLinks = theirRelated + " " + theirDonors
      const linkTargets = new Set<string>()
      const linkRegex = /\[\[([^\]|]+)/g
      let lm: RegExpExecArray | null
      while ((lm = linkRegex.exec(theirAllLinks)) !== null) {
        linkTargets.add(lm[1].replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim().toLowerCase())
      }
      let sharedDonor = ""
      if (!theyReferenceUs && !weReferenceThem && topDonors.length > 0) {
        for (const d of topDonors) {
          const dLc = d.toLowerCase()
          if (linkTargets.has(dLc)) { sharedDonor = d; break }
          const dShort = dLc.split(" - ")[0].trim()
          for (const lt of linkTargets) {
            if (lt === dShort || lt.startsWith(dShort + " -") || lt.startsWith(dShort + " (")) {
              sharedDonor = d; break
            }
          }
          if (sharedDonor) break
        }
      }
      // Determine edge type: opposition takes priority
      const isOpposition = theyOpposeUs || weOpposeThem
      if (isOpposition || theyReferenceUs || weReferenceThem || sharedDonor) {
        networkInfo.set(fTitle, {
          type: fType,
          slug: `${basePath}/${simplifySlug(f.slug!)}`,
          category,
          via: sharedDonor || undefined,
          edgeType: isOpposition ? "opposition" : "allied",
        })
      }
    }
  }

  // For non-politician profiles: also find connected politicians and donors via our wikilinks
  if (!isPolitician) {
    for (const linkTarget of ourLinkTargets) {
      const pi = polInfo.get(linkTarget)
      if (pi && !networkInfo.has(linkTarget)) {
        networkInfo.set(linkTarget, { type: "politician", slug: pi.slug, category: pi.party, edgeType: "allied" })
        continue
      }
      const di = donorInfo.get(linkTarget)
      if (di && !networkInfo.has(linkTarget)) {
        networkInfo.set(linkTarget, { type: "donor", slug: di.slug, category: di.sector, edgeType: "allied" })
      }
    }
    // Opposition targets from opposes: field
    for (const linkTarget of ourOpposesTargets) {
      if (networkInfo.has(linkTarget)) continue
      const pi = polInfo.get(linkTarget)
      if (pi) {
        networkInfo.set(linkTarget, { type: "politician", slug: pi.slug, category: pi.party, edgeType: "opposition" })
        continue
      }
      const di = donorInfo.get(linkTarget)
      if (di) {
        networkInfo.set(linkTarget, { type: "donor", slug: di.slug, category: di.sector, edgeType: "opposition" })
        continue
      }
      // Check if it's a think tank / K Street / media we already scanned
      // If not found in polInfo/donorInfo, try to find it in allFiles by title
      for (const f of allFiles) {
        const fFm = f.frontmatter
        if (!fFm) continue
        const fTitle = String(fFm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
        if (fTitle !== linkTarget) continue
        const fSlug = (f.slug ?? "").toLowerCase()
        const fType2 = fSlug.startsWith("think-tanks") ? "think-tank" : fSlug.startsWith("lobbying") ? "lobbying" : fSlug.startsWith("media") ? "media" : ""
        if (fType2) {
          networkInfo.set(linkTarget, { type: fType2, slug: `${basePath}/${simplifySlug(f.slug!)}`, edgeType: "opposition" })
        }
        break
      }
    }
    // For donor profiles: add politicians-funded as connections
    for (const polName of politiciansFunded) {
      const pi = polInfo.get(polName)
      if (pi && !networkInfo.has(polName)) {
        networkInfo.set(polName, { type: "politician", slug: pi.slug, category: pi.party, edgeType: "allied" })
      }
    }
  }

  // Add opposition targets for ALL profile types (including politicians)
  for (const linkTarget of ourOpposesTargets) {
    if (networkInfo.has(linkTarget)) {
      // Already in graph — just update edge type to opposition
      const existing = networkInfo.get(linkTarget)!
      existing.edgeType = "opposition"
      continue
    }
    const pi = polInfo.get(linkTarget)
    if (pi) {
      networkInfo.set(linkTarget, { type: "politician", slug: pi.slug, category: pi.party, edgeType: "opposition" })
      continue
    }
    const di = donorInfo.get(linkTarget)
    if (di) {
      networkInfo.set(linkTarget, { type: "donor", slug: di.slug, category: di.sector, edgeType: "opposition" })
      continue
    }
    // Try to find in allFiles by title
    for (const f of allFiles) {
      const fFm = f.frontmatter
      if (!fFm) continue
      const fTitle = String(fFm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()
      if (fTitle !== linkTarget) continue
      const fSlug = (f.slug ?? "").toLowerCase()
      const fType2 = fSlug.startsWith("think-tanks") ? "think-tank" : fSlug.startsWith("lobbying") ? "lobbying" : fSlug.startsWith("media") ? "media" : "politician"
      networkInfo.set(linkTarget, { type: fType2, slug: `${basePath}/${simplifySlug(f.slug!)}`, edgeType: "opposition" })
      break
    }
  }

  // Check if we have any data at all
  const hasAnyConnections = topDonors.length > 0 || networkInfo.size > 0 || ourOpposesTargets.size > 0
  if (!hasAnyConnections) {
    return (
      <div class={classNames(displayClass, "pw-widget")}>
        <div class="pw-empty">No connection data tracked yet for {currentTitle}.</div>
      </div>
    )
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

  // ── GRAPH TAB: Build neighborhood for mini force graph ──
  const miniGraphNodes: { id: string; name: string; type: string; party?: string; sector?: string; slug: string }[] = []
  const miniGraphEdges: { source: string; target: string; edgeType?: string }[] = []
  const miniNodeIds = new Set<string>()

  // Center node type based on profile
  const centerType = isPolitician ? "politician" : isDonorType ? "donor"
    : fmType === "think-tank" ? "think-tank" : fmType === "lobbying-firm" ? "lobbying"
    : fmType === "media-profile" ? "media" : "donor"

  const centerId = slug
  miniGraphNodes.push({
    id: centerId,
    name: currentTitle,
    type: centerType,
    party: party || undefined,
    slug: `${basePath}/${simplifySlug(fileData.slug!)}`,
  })
  miniNodeIds.add(centerId)

  // For politician profiles: add top-donors as compact graph
  // For other profiles: compact = direct connections from related/donors wikilinks
  if (isPolitician) {
    for (const donorName of topDonors.slice(0, 15)) {
      const info = donorInfo.get(donorName)
      const donorId = info?.slug ?? donorName
      if (!miniNodeIds.has(donorId)) {
        miniGraphNodes.push({
          id: donorId,
          name: donorName,
          type: "donor",
          sector: info?.sector,
          slug: info?.slug ?? "",
        })
        miniNodeIds.add(donorId)
      }
      miniGraphEdges.push({ source: centerId, target: donorId })
    }
  }

  // Compact graph: direct connections only (donors for politicians, wikilinks for others)
  const compactNodes = [...miniGraphNodes]
  const compactEdges = [...miniGraphEdges]

  // Add all network connections (extended for politicians, primary for others)
  for (const [name, info] of networkInfo) {
    const nodeId = info.slug || name
    if (!miniNodeIds.has(nodeId)) {
      miniGraphNodes.push({
        id: nodeId,
        name,
        type: info.type,
        party: info.type === "politician" ? info.category : undefined,
        sector: info.type === "donor" ? info.category : undefined,
        slug: info.slug,
      })
      miniNodeIds.add(nodeId)
    }
    miniGraphEdges.push({ source: centerId, target: nodeId, edgeType: info.edgeType || "allied" })
  }

  const compactGraphData = JSON.stringify({ nodes: isPolitician ? compactNodes : miniGraphNodes, edges: isPolitician ? compactEdges : miniGraphEdges })
  const fullGraphData = JSON.stringify({ nodes: miniGraphNodes, edges: miniGraphEdges })
  const hasExtendedNetwork = isPolitician && networkInfo.size > 0
  const hasMiniGraph = miniGraphNodes.length > 1

  return (
    <div class={classNames(displayClass, "pw-widget")}>
      {/* Tabs */}
      <div class="pw-tabs">
        {hasMiniGraph && <button class="pw-tab pw-tab-active" data-tab="graph">Graph</button>}
        {topDonors.length > 0 && (
          <button class={`pw-tab ${hasMiniGraph ? "" : "pw-tab-active"}`} data-tab="flow">
            {isPolitician ? "Donors" : "Connections"}
          </button>
        )}
        {hasBothSides && <button class="pw-tab" data-tab="both">Both Sides</button>}
        {hasNetwork && <button class="pw-tab" data-tab="network">Reach</button>}
      </div>

      {/* Tab: Graph — Mini force-directed graph (first tab) */}
      {hasMiniGraph && (
        <div class="pw-panel pw-panel-active" data-panel="graph">
          <div class="pw-mini-graph" data-graph={compactGraphData} data-full-graph={fullGraphData}></div>
          {/* Full Screen button is added dynamically by networkGraph.inline.ts */}
        </div>
      )}

      {/* Tab: Flow — Top Donors / Connections */}
      {topDonors.length > 0 && (
        <div class={`pw-panel ${hasMiniGraph ? "" : "pw-panel-active"}`} data-panel="flow">
          <div class="pw-section-label">{isPolitician ? "TOP DONORS" : "CONNECTIONS"}</div>
          <div class="pw-explain">
            {isPolitician
              ? `Organizations and individuals funding ${currentTitle}.`
              : `Key connections tracked for ${currentTitle}.`}
          </div>
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
      )}

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

      {/* Graph tab moved to first position above */}
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

      // Trigger mini-graph render when graph tab is shown
      if (target === 'graph' && typeof window.initMiniGraph === 'function') {
        setTimeout(window.initMiniGraph, 50);
      }
    });
  });

  // Full Screen button is created by networkGraph.inline.ts

  // Graph is now the first tab — render it immediately
  if (typeof window.initMiniGraph === 'function') {
    setTimeout(window.initMiniGraph, 100);
  }
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
  background: #ece6dd;
  border: 1px solid #ddd;
  border-radius: 0;
  padding: 0;
  margin-top: 16px;
  overflow: visible;
}

.pw-empty {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #999;
  padding: 16px;
}

/* Tabs */
.pw-tabs {
  display: flex;
  border-bottom: 1px solid #ddd;
  background: #f5f0eb;
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
  color: #777;
  background: rgba(91, 141, 206, 0.04);
}

.pw-tab-active {
  color: #0a0a0a !important;
  border-bottom-color: #0a0a0a !important;
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
.pw-panel::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
.pw-panel::-webkit-scrollbar-thumb:hover { background: #ddd; }

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
  border-bottom: 1px solid #ddd;
}

/* ─── Flow/Donors tab ───────────────────────────── */

a.pw-flow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 0;
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
  color: #333;
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
  color: #16a34a;
}

.pw-reach-label {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #999;
  letter-spacing: 0.5px;
}

/* ─── Both Sides tab ─────────────────────── */

.pw-bs-row {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 0;
  margin-bottom: 8px;
  border: 1px solid #ddd;
}

.pw-bs-row:hover {
  border-color: rgba(91, 141, 206, 0.2);
}

a.pw-bs-donor {
  font-size: 12px;
  font-weight: 700;
  color: #0a0a0a !important;
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
  border-radius: 0;
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
  border-radius: 0;
  flex-shrink: 0;
}

.pw-dem {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.pw-rep {
  color: #e63946;
  background: rgba(239, 68, 68, 0.15);
}

.pw-bs-name {
  color: #333;
  font-weight: 500;
  flex: 1;
}

.pw-bs-chamber {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #8a8a96;
  flex-shrink: 0;
}

/* ─── Mini Graph tab ────────────────────────── */

.pw-mini-graph {
  width: 100%;
  height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0a0a0a;
  border-radius: 0;
  position: relative;
  border: 1px solid #ddd;
}

.pw-mini-graph svg {
  border-radius: 0;
}

/* Expand button */
.pw-mini-expand {
  display: block;
  width: 100%;
  padding: 6px 0;
  background: none;
  border: none;
  border-bottom: 1px solid #ddd;
  color: #0a0a0a;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}

.pw-mini-expand:hover {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
}

/* ─── Expanded overlay ─────────────────────── */

.pw-graph-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pw-graph-overlay-box {
  background: #0a0a0a;
  border: 2px solid #333;
  border-radius: 0;
  padding: 16px;
  box-shadow: none;
  max-width: 95vw;
  max-height: 90vh;
  overflow: hidden;
}

.pw-graph-overlay-close {
  position: fixed;
  top: 16px;
  right: 20px;
  z-index: 10000;
  padding: 6px 16px;
  background: #0a0a0a;
  border: 1px solid #555;
  border-radius: 0;
  color: #ccc;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.pw-graph-overlay-close:hover {
  color: #fbbf24;
  border-color: #fbbf24;
}

/* Full-screen filter bar */
.pw-overlay-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  background: rgba(10, 10, 10, 0.9);
}

.pw-overlay-filter-btn {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid #555;
  border-radius: 0;
  color: #ccc;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.15s;
}

.pw-overlay-filter-btn:hover {
  color: #fff;
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
}

/* Default active — fallback yellow */
.pw-overlay-filter-btn.pw-filter-active {
  color: #fbbf24;
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
}

/* Category-colored active states */
.pw-overlay-filter-btn[data-node-type="donor"].pw-filter-active,
.pw-overlay-filter-btn[data-node-type="corporation"].pw-filter-active,
.pw-overlay-filter-btn[data-node-type="pac"].pw-filter-active {
  color: #16a34a;
  border-color: #16a34a;
  background: rgba(22, 163, 74, 0.15);
}

.pw-overlay-filter-btn[data-node-type="politician"].pw-filter-active {
  color: #3b82f6;
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.pw-overlay-filter-btn[data-node-type="think-tank"].pw-filter-active {
  color: #fbbf24;
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
}

.pw-overlay-filter-btn[data-node-type="lobbying"].pw-filter-active {
  color: #999;
  border-color: #999;
  background: rgba(153, 153, 153, 0.15);
}

.pw-overlay-filter-btn[data-node-type="media"].pw-filter-active {
  color: #a855f7;
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.15);
}

.pw-overlay-filter-btn.pw-filter-off {
  color: #555;
  border-color: #333;
  background: rgba(0, 0, 0, 0.3);
  text-decoration: line-through;
}

.pw-overlay-filter-btn.pw-filter-opposition.pw-filter-active {
  color: #e63946;
  border-color: #e63946;
  background: rgba(239, 68, 68, 0.1);
}

/* ─── Graph Legend — hidden in widget, visible in full screen ─── */
.pw-graph-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(10, 10, 10, 0.85);
  border-top: 1px solid #333;
  border-radius: 0;
}

.pw-graph-legend-compact {
  display: none;
}

.pw-legend-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pw-graph-legend-compact .pw-legend-section {
  gap: 6px;
}

.pw-legend-divider {
  width: 1px;
  height: 12px;
  background: #ddd;
}

.pw-graph-legend-compact .pw-legend-divider {
  display: none;
}

.pw-legend-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  color: #999;
  white-space: nowrap;
}

.pw-graph-legend-compact .pw-legend-item {
  font-size: 8px;
}

/* ─── Hide on mobile (right sidebar hides) ─── */
@media (max-width: 800px) {
  .pw-widget {
    display: none;
  }
}
`

export default (() => ProfileWidget) satisfies QuartzComponentConstructor
