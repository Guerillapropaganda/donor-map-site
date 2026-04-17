import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { simplifySlug } from "../util/path"
import { classNames } from "../util/lang"
// Phase 3 Part 4b: canonical per-profile relationship data from the JSONL edge store.
// Replaces frontmatter wikilink parsing for relationship fields (related, donors,
// opposes, stories, politicians-funded). Falls back to frontmatter when a profile
// isn't in the JSON yet.
import relationshipData from "../../data/relationships-per-profile.json"

type RelEntry = { related: string[]; donors: string[]; "politicians-funded": string[]; opposes: string[]; stories: string[] }

function getRels(title: string): RelEntry | null {
  const normalized = title.replace(/^_/, "").replace(/\s*Master Profile.*/i, "").trim()
  return (relationshipData as Record<string, RelEntry>)[normalized] ?? null
}

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

  // Phase 3 Part 4b: read relationship data from the canonical per-profile JSON
  // instead of parsing wikilinks from frontmatter strings. Falls back to
  // frontmatter regex parsing for profiles not yet in the JSON.
  const rels = getRels(currentTitle)
  const ourLinkTargets = new Set<string>(rels ? [...rels.related, ...rels.donors, ...rels.stories] : [])
  const ourOpposesTargets = new Set<string>(rels?.opposes ?? [])
  if (!rels) {
    // Fallback: parse frontmatter wikilinks (pre-Phase-3 path)
    const ourAllLinks = String(fm.related ?? "") + " " + String(fm.donors ?? "") + " " + String(fm.stories ?? "")
    const lr = /\[\[([^\]|]+)/g
    let m: RegExpExecArray | null
    while ((m = lr.exec(ourAllLinks)) !== null) {
      ourLinkTargets.add(m[1].replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim())
    }
    const lr2 = /\[\[([^\]|]+)/g
    while ((m = lr2.exec(String(fm.opposes ?? ""))) !== null) {
      ourOpposesTargets.add(m[1].replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim())
    }
  }

  // Build lookup maps from allFiles
  const donorInfo = new Map<string, { sector: string; slug: string; politiciansFunded: string[] }>()
  const polInfo = new Map<string, { party: string; slug: string; chamber: string }>()
  // Extended network: think tanks, K Street, media, politicians, donors connected to this profile
  const networkInfo = new Map<string, { type: string; slug: string; category?: string; via?: string; edgeType?: string }>()
  // For donor profiles: track politicians they fund (prefer canonical JSON)
  const politiciansFunded = isDonorType
    ? (getRels(currentTitle)?.["politicians-funded"] ?? (Array.isArray(fm["politicians-funded"]) ? fm["politicians-funded"] as string[] : []))
    : []

  for (const f of allFiles) {
    const fFm = f.frontmatter
    if (!fFm) continue
    const fSlug = (f.slug ?? "").toLowerCase()
    const fTitle = String(fFm.title ?? "").replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim()

    if (fSlug.startsWith("donors--and--power-networks/")) {
      const sector = String(fFm.sector ?? "")
      const pf = getRels(fTitle)?.["politicians-funded"] ?? (Array.isArray(fFm["politicians-funded"]) ? fFm["politicians-funded"] as string[] : [])
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

      // Check mutual references (prefer canonical JSON)
      const fRels = getRels(fTitle)
      const theyReferenceUs = fRels?.related?.includes(currentTitle) ?? String(fFm.related ?? "").toLowerCase().includes(currentTitle.toLowerCase())
      const weReferenceThem = topDonors.includes(fTitle) || ourLinkTargets.has(fTitle)
      // Check opposition references (either direction)
      const theyOpposeUs = fRels?.opposes?.includes(currentTitle) ?? String(fFm.opposes ?? "").toLowerCase().includes(currentTitle.toLowerCase())
      const weOpposeThem = ourOpposesTargets.has(fTitle)

      // Shared-donor bridge (for politician profiles) — prefer canonical JSON.
      // Values are lowercased to match the downstream topDonors comparison.
      const fRelsList = fRels?.related ?? []
      const fDonorsList = fRels?.donors ?? []
      const linkTargets = new Set<string>([...fRelsList, ...fDonorsList].map(t => t.toLowerCase()))
      if (linkTargets.size === 0 && !fRels) {
        // Fallback: parse frontmatter wikilinks if no canonical data
        const theirAllLinks = String(fFm.related ?? "") + " " + String(fFm.donors ?? "")
        const linkRegex = /\[\[([^\]|]+)/g
        let lm: RegExpExecArray | null
        while ((lm = linkRegex.exec(theirAllLinks)) !== null) {
          linkTargets.add(lm[1].replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim().toLowerCase())
        }
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

  // ── FLOW TAB: Top donors with sector + dollar amounts ──
  // monetary-detail has per-connection amounts from the canonical edge store
  type MonetaryDetail = { name: string; amount: number; cycle: string; confidence: number }
  const monetaryDetail: MonetaryDetail[] = (rels as any)?.["monetary-detail"] ?? []
  // Aggregate: sum amounts across cycles per donor, filter by confidence >= 0.7
  const donorAmounts = new Map<string, number>()
  for (const d of monetaryDetail) {
    if (d.confidence < 0.7) continue
    donorAmounts.set(d.name, (donorAmounts.get(d.name) || 0) + d.amount)
  }

  const flowData = topDonors.map((donorName) => {
    const info = donorInfo.get(donorName)
    let relType: "donor" | "related" | "opposes" | "story" = "donor"
    if (rels) {
      if (rels.opposes.includes(donorName)) relType = "opposes"
      else if (rels.stories.includes(donorName)) relType = "story"
      else if (rels.related.includes(donorName)) relType = "related"
    } else if (ourOpposesTargets.has(donorName)) {
      relType = "opposes"
    }
    return {
      donor: donorName,
      sector: info?.sector ?? "",
      slug: info?.slug ?? "",
      relType,
      amount: donorAmounts.get(donorName) || 0,
    }
  }).sort((a, b) => b.amount - a.amount) // sort by dollar amount when available

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

  // ── CONTRACTS TAB: Government contracts for corporation profiles ──
  const contractDetail: MonetaryDetail[] = (rels as any)?.["contract-detail"] ?? []
  // Aggregate by agency across fiscal years
  const agencyTotals = new Map<string, number>()
  for (const d of contractDetail) {
    agencyTotals.set(d.name, (agencyTotals.get(d.name) || 0) + d.amount)
  }
  const contractData = [...agencyTotals.entries()]
    .map(([agency, total]) => ({ agency, total }))
    .sort((a, b) => b.total - a.total)
  const hasContracts = contractData.length > 0

  const compactGraphData = JSON.stringify({ nodes: isPolitician ? compactNodes : miniGraphNodes, edges: isPolitician ? compactEdges : miniGraphEdges })
  const fullGraphData = JSON.stringify({ nodes: miniGraphNodes, edges: miniGraphEdges })
  const hasMiniGraph = miniGraphNodes.length > 1

  // ── CANVAS GRAPH: Diverse connection types by profile category ──
  // Per user feedback: don't just show top 24 donors by amount. Mix types:
  //   - Top donors (by money received)
  //   - Opposition politicians (the contradictions)
  //   - Media profiles referenced in this entity's network
  //   - Think tanks + lobbying firms (K Street)
  //   - Corporate contracts (for presidents/cabinet with contract data)
  // Each gets a type label for color-coding in the canvas render.
  const MAX_GRAPH_NODES = 28
  const QUOTA = {
    donors: 10,
    opposition: 5,
    media: 5,
    kstreet: 5, // think-tank + lobbying-firm combined
    contracts: 3,
  }
  const graphConnections: {
    name: string
    amount: number
    type: "donor" | "contract" | "opposition" | "media" | "kstreet"
    slug: string
  }[] = []

  const addedNames = new Set<string>()
  function addNode(name: string, amount: number, type: typeof graphConnections[0]["type"], slug: string) {
    if (addedNames.has(name)) return
    addedNames.add(name)
    graphConnections.push({ name, amount, type, slug })
  }

  // 1. TOP DONORS (by monetary amount)
  let donorCount = 0
  for (const d of [...(monetaryDetail || [])].sort((a, b) => b.amount - a.amount)) {
    if (d.confidence < 0.7) continue
    const info = donorInfo.get(d.name)
    addNode(d.name, d.amount, "donor", info?.slug || "")
    donorCount++
    if (donorCount >= QUOTA.donors) break
  }

  // 2. OPPOSITION POLITICIANS (contradictions)
  let oppositionCount = 0
  for (const name of (rels?.opposes ?? [])) {
    if (oppositionCount >= QUOTA.opposition) break
    if (addedNames.has(name)) continue
    addNode(name, 0, "opposition", "")
    oppositionCount++
  }
  // Also pull from networkInfo entries marked as opposition
  for (const [name, info] of networkInfo) {
    if (oppositionCount >= QUOTA.opposition) break
    if (info.edgeType === "opposition" && info.type === "politician") {
      addNode(name, 0, "opposition", info.slug || "")
      oppositionCount++
    }
  }

  // 3. MEDIA PROFILES
  let mediaCount = 0
  for (const [name, info] of networkInfo) {
    if (mediaCount >= QUOTA.media) break
    if (info.type === "media" || info.type === "media-profile") {
      addNode(name, 0, "media", info.slug || "")
      mediaCount++
    }
  }

  // 4. K STREET (think tanks + lobbying firms)
  let kstreetCount = 0
  for (const [name, info] of networkInfo) {
    if (kstreetCount >= QUOTA.kstreet) break
    if (info.type === "think-tank" || info.type === "lobbying-firm" || info.type === "lobbying") {
      addNode(name, 0, "kstreet", info.slug || "")
      kstreetCount++
    }
  }

  // 5. CORPORATE CONTRACTS (for presidents/cabinet)
  let contractCount = 0
  for (const d of [...(contractDetail || [])].sort((a, b) => b.amount - a.amount)) {
    if (contractCount >= QUOTA.contracts) break
    addNode(d.name, d.amount, "contract", "")
    contractCount++
  }

  // Fill remaining slots with more donors if any tiers came up short
  if (graphConnections.length < MAX_GRAPH_NODES) {
    for (const d of [...(monetaryDetail || [])].sort((a, b) => b.amount - a.amount)) {
      if (graphConnections.length >= MAX_GRAPH_NODES) break
      if (d.confidence < 0.7) continue
      if (addedNames.has(d.name)) continue
      const info = donorInfo.get(d.name)
      addNode(d.name, d.amount, "donor", info?.slug || "")
    }
  }

  const totalConnections =
    (monetaryDetail?.length || 0) +
    (contractDetail?.length || 0) +
    (rels?.opposes?.length || 0) +
    networkInfo.size
  const canvasGraphData = JSON.stringify({
    center: { name: currentTitle, type: fmType, party },
    connections: graphConnections,
    totalConnections,
  })
  const hasCanvasGraph = graphConnections.length > 0

  return (
    <div class={classNames(displayClass, "pw-widget")}>
      {/* Tabs */}
      <div class="pw-tabs">
        {(hasCanvasGraph || hasMiniGraph) && <button class="pw-tab pw-tab-active" data-tab="graph">Graph</button>}
        {topDonors.length > 0 && (
          <button class={`pw-tab ${hasMiniGraph ? "" : "pw-tab-active"}`} data-tab="flow">
            {isPolitician ? "Donors" : "Connections"}
          </button>
        )}
        {hasContracts && <button class="pw-tab" data-tab="contracts">Contracts</button>}
        {hasBothSides && <button class="pw-tab" data-tab="both">Both Sides</button>}
        {hasNetwork && <button class="pw-tab" data-tab="network">Reach</button>}
      </div>

      {/* Tab: Graph — Canvas radial graph (first tab) */}
      {hasCanvasGraph && (
        <div class="pw-panel pw-panel-active" data-panel="graph">
          <div class="pw-canvas-graph" data-canvas-graph={canvasGraphData}>
            <button class="pw-graph-expand" title="Expand graph to full view" aria-label="Expand graph">⤢</button>
            <svg class="pw-d3-svg" width="100%" height="100%"></svg>
          </div>
          <div class="pw-graph-overflow">
            Showing {graphConnections.length} connections (diverse mix: donors, opposes, media, K Street, contracts). {totalConnections} total in canonical store.
          </div>
        </div>
      )}
      {/* Legacy SVG graph fallback for profiles without monetary data */}
      {!hasCanvasGraph && hasMiniGraph && (
        <div class={`pw-panel ${hasCanvasGraph ? "" : "pw-panel-active"}`} data-panel="graph">
          <div class="pw-mini-graph" data-graph={compactGraphData} data-full-graph={fullGraphData}></div>
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
            <a href={d.slug || "#"} class={`pw-flow-row pw-rel-${d.relType} ${d.slug ? "internal" : ""}`}>
              <div class="pw-flow-info">
                <span class="pw-flow-donor">{d.donor}</span>
                {d.sector && d.sector !== "undefined" && (
                  <span class="pw-flow-sector">{d.sector}</span>
                )}
              </div>
              {d.amount > 0 && (
                <span class="pw-flow-amount">
                  {"$" + (d.amount >= 1e6 ? (d.amount / 1e6).toFixed(1) + "M" : d.amount >= 1e3 ? Math.round(d.amount / 1e3) + "K" : d.amount.toLocaleString())}
                </span>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Tab: Contracts — Government contracts for corporations */}
      {hasContracts && (
        <div class="pw-panel" data-panel="contracts">
          <div class="pw-section-label">FEDERAL CONTRACTS</div>
          <div class="pw-explain">Government agencies awarding contracts to {currentTitle}. Source: USASpending.gov.</div>
          {contractData.map((d) => (
            <div class="pw-flow-row">
              <div class="pw-flow-info">
                <span class="pw-flow-donor">{d.agency}</span>
              </div>
              <span class="pw-flow-amount">
                {"$" + (d.total >= 1e9 ? (d.total / 1e9).toFixed(1) + "B" : d.total >= 1e6 ? (d.total / 1e6).toFixed(1) + "M" : d.total >= 1e3 ? Math.round(d.total / 1e3) + "K" : d.total.toLocaleString())}
              </span>
            </div>
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

  // ── Canvas Radial Graph ──
  initCanvasGraph();
}

// D3 force-directed SVG graph (ported from ops /relationships).
// Loads D3 v7 from CDN on first call, then runs a physics-based simulation
// with draggable nodes, zoom/pan, hover tooltips, and click-to-navigate.
function initCanvasGraph() {
  var container = document.querySelector('.pw-canvas-graph');
  if (!container) return;
  var svg = container.querySelector('svg.pw-d3-svg');
  if (!svg) return;
  var raw = container.getAttribute('data-canvas-graph');
  if (!raw) return;

  var data;
  try { data = JSON.parse(raw); } catch(e) { return; }

  // Wire fullscreen expand button (idempotent onclick, survives SPA nav)
  var expandBtn = container.querySelector('.pw-graph-expand');
  if (expandBtn) {
    expandBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isFullscreen = container.classList.toggle('pw-graph-fullscreen');
      if (isFullscreen) {
        expandBtn.innerHTML = '✕';
        expandBtn.title = 'Close fullscreen';
        document.body.style.overflow = 'hidden';
      } else {
        expandBtn.innerHTML = '⤢';
        expandBtn.title = 'Expand graph to full view';
        document.body.style.overflow = '';
      }
      setTimeout(function() { initCanvasGraph(); }, 50);
      return false;
    };
  }
  if (!window.__pwGraphEscWired) {
    window.__pwGraphEscWired = true;
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var c = document.querySelector('.pw-canvas-graph.pw-graph-fullscreen');
      if (!c) return;
      c.classList.remove('pw-graph-fullscreen');
      var btn = c.querySelector('.pw-graph-expand');
      if (btn) { btn.innerHTML = '⤢'; btn.title = 'Expand graph to full view'; }
      document.body.style.overflow = '';
      setTimeout(function() { initCanvasGraph(); }, 50);
    });
  }

  // D3 loader — CDN with fallback. If D3 can't load (CSP, network blocked,
  // timeout), fall back to a static radial render so the user sees something.
  function loadD3(cb, onFail) {
    if (window.d3 && window.d3.forceSimulation) { cb(window.d3); return; }
    if (window.__d3LoadPromise) {
      window.__d3LoadPromise.then(cb, onFail);
      return;
    }
    window.__d3LoadPromise = new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js';
      s.async = true;
      s.crossOrigin = 'anonymous';
      var loaded = false;
      s.onload = function() {
        if (window.d3 && window.d3.forceSimulation) { loaded = true; resolve(window.d3); }
        else reject(new Error('d3 loaded but forceSimulation missing'));
      };
      s.onerror = function() { reject(new Error('d3 script failed to load')); };
      document.head.appendChild(s);
      // Safety timeout — if script hasn't loaded in 5s, treat as failure
      setTimeout(function() {
        if (!loaded) reject(new Error('d3 load timeout'));
      }, 5000);
    });
    window.__d3LoadPromise.then(cb, onFail);
  }

  loadD3(
    function(d3) { renderGraph(d3, container, svg, data); },
    function(err) {
      console.warn('[pw-graph] D3 load failed, using static fallback:', err && err.message);
      renderStaticFallback(container, svg, data);
    }
  );
}

// Static SVG radial fallback used when D3 can't load. Not as pretty as
// force-directed, but guaranteed to render without any external dependency.
function renderStaticFallback(container, svgEl, data) {
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  var isFullscreenNow = container.classList.contains('pw-graph-fullscreen');
  var width = isFullscreenNow ? window.innerWidth : (container.clientWidth || 280);
  var height = isFullscreenNow ? window.innerHeight : 280;
  svgEl.setAttribute('width', width);
  svgEl.setAttribute('height', height);
  svgEl.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  var NS = 'http://www.w3.org/2000/svg';

  var rawConns = data.connections || [];
  var center = data.center || {};
  var TYPE_COLORS = {
    donor: '#16a34a', money: '#16a34a', contract: '#3b82f6',
    opposition: '#e63946', media: '#a855f7', kstreet: '#f59e0b', related: '#888'
  };
  var PARTY_COLORS = { Democrat: '#3b82f6', Republican: '#e63946' };
  var centerColor = PARTY_COLORS[center.party] || '#fbbf24';

  // Background
  var bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', width); bg.setAttribute('height', height);
  bg.setAttribute('fill', '#0a0a0a');
  svgEl.appendChild(bg);

  var cx = width / 2, cy = height / 2;
  var maxAmt = 1;
  for (var i = 0; i < rawConns.length; i++) if (rawConns[i].amount > maxAmt) maxAmt = rawConns[i].amount;
  function nodeR(c) {
    var amt = c.amount || 0;
    if (amt <= 0) return 8;
    return 8 + (Math.log10(amt + 1) / Math.log10(maxAmt + 1)) * 14;
  }
  function fmtAmt(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return n > 0 ? '$' + n : '';
  }
  function trunc(s, n) { return s.length <= n ? s : s.slice(0, n - 2) + '..'; }

  // Interleave connections by type
  var order = ['donor', 'opposition', 'contract', 'media', 'kstreet', 'related'];
  var buckets = {};
  for (var i = 0; i < rawConns.length; i++) {
    var t = rawConns[i].type || 'related';
    (buckets[t] = buckets[t] || []).push(rawConns[i]);
  }
  var conns = [];
  var maxLen = 0;
  for (var oi = 0; oi < order.length; oi++) {
    if (buckets[order[oi]] && buckets[order[oi]].length > maxLen) maxLen = buckets[order[oi]].length;
  }
  for (var idx = 0; idx < maxLen; idx++) {
    for (var oi = 0; oi < order.length; oi++) {
      var b = buckets[order[oi]];
      if (b && b[idx]) conns.push(b[idx]);
    }
  }
  for (var k in buckets) {
    if (order.indexOf(k) === -1) for (var ii = 0; ii < buckets[k].length; ii++) conns.push(buckets[k][ii]);
  }

  var n = conns.length;
  var ringR = Math.min(width, height) * (isFullscreenNow ? 0.38 : 0.34) + Math.max(0, n - 20) * (isFullscreenNow ? 6 : 2);

  // Links
  for (var i = 0; i < n; i++) {
    var angle = (2 * Math.PI * i / n) - Math.PI / 2;
    var px = cx + ringR * Math.cos(angle);
    var py = cy + ringR * Math.sin(angle);
    var color = TYPE_COLORS[conns[i].type] || '#555';
    var line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy);
    line.setAttribute('x2', px); line.setAttribute('y2', py);
    line.setAttribute('stroke', color); line.setAttribute('stroke-opacity', '0.3');
    line.setAttribute('stroke-width', '1.5');
    if (conns[i].type === 'opposition') line.setAttribute('stroke-dasharray', '4 3');
    svgEl.appendChild(line);
  }

  // Nodes
  for (var i = 0; i < n; i++) {
    var angle = (2 * Math.PI * i / n) - Math.PI / 2;
    var px = cx + ringR * Math.cos(angle);
    var py = cy + ringR * Math.sin(angle);
    var r = nodeR(conns[i]);
    var color = TYPE_COLORS[conns[i].type] || '#888';

    var g = document.createElementNS(NS, 'g');
    if (conns[i].slug) {
      g.style.cursor = 'pointer';
      g.setAttribute('data-slug', conns[i].slug);
      g.addEventListener('click', function(e) {
        var slug = e.currentTarget.getAttribute('data-slug');
        if (slug) window.location.href = '/' + slug;
      });
    }
    var circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', px); circle.setAttribute('cy', py); circle.setAttribute('r', r);
    circle.setAttribute('fill', color); circle.setAttribute('fill-opacity', '0.85');
    circle.setAttribute('stroke', color); circle.setAttribute('stroke-width', '1');
    g.appendChild(circle);

    var text = document.createElementNS(NS, 'text');
    text.setAttribute('x', px); text.setAttribute('y', py + r + 11);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', color); text.setAttribute('font-size', '9');
    text.setAttribute('font-family', '"Space Mono", monospace');
    text.textContent = trunc(conns[i].name, 16);
    g.appendChild(text);

    if (conns[i].amount > 0) {
      var amt = document.createElementNS(NS, 'text');
      amt.setAttribute('x', px); amt.setAttribute('y', py + r + 22);
      amt.setAttribute('text-anchor', 'middle');
      amt.setAttribute('fill', color); amt.setAttribute('font-size', '8');
      amt.setAttribute('font-weight', 'bold');
      amt.setAttribute('font-family', '"Space Mono", monospace');
      amt.textContent = fmtAmt(conns[i].amount);
      g.appendChild(amt);
    }
    svgEl.appendChild(g);
  }

  // Center
  var centerCircle = document.createElementNS(NS, 'circle');
  centerCircle.setAttribute('cx', cx); centerCircle.setAttribute('cy', cy); centerCircle.setAttribute('r', '18');
  centerCircle.setAttribute('fill', centerColor); centerCircle.setAttribute('fill-opacity', '0.95');
  centerCircle.setAttribute('stroke', centerColor); centerCircle.setAttribute('stroke-width', '2.5');
  svgEl.appendChild(centerCircle);
  var centerLabel = document.createElementNS(NS, 'text');
  centerLabel.setAttribute('x', cx); centerLabel.setAttribute('y', cy + 3);
  centerLabel.setAttribute('text-anchor', 'middle');
  centerLabel.setAttribute('fill', '#fff'); centerLabel.setAttribute('font-size', '10');
  centerLabel.setAttribute('font-weight', 'bold');
  centerLabel.setAttribute('font-family', '"Space Mono", monospace');
  centerLabel.textContent = trunc(center.name || '', 14);
  svgEl.appendChild(centerLabel);
}

function renderGraph(d3, container, svgEl, data) {
  var svg = d3.select(svgEl);
  svg.selectAll('*').remove();

  var isFullscreenNow = container.classList.contains('pw-graph-fullscreen');
  var width = isFullscreenNow ? window.innerWidth : (container.clientWidth || 300);
  var height = isFullscreenNow ? window.innerHeight : 280;
  svgEl.setAttribute('width', width);
  svgEl.setAttribute('height', height);
  svgEl.style.width = width + 'px';
  svgEl.style.height = height + 'px';

  var rawConns = data.connections || [];
  var center = data.center || {};

  var TYPE_COLORS = {
    donor: '#16a34a',       // green — money in
    money: '#16a34a',
    contract: '#3b82f6',    // blue — govt contracts
    opposition: '#e63946',  // red — political opposition
    media: '#a855f7',       // purple — media
    kstreet: '#f59e0b',     // amber — lobbying / think tanks
    related: '#888'
  };
  var PARTY_COLORS = { Democrat: '#3b82f6', Republican: '#e63946' };
  var centerColor = PARTY_COLORS[center.party] || '#fbbf24';

  var maxAmt = 1;
  for (var i = 0; i < rawConns.length; i++) {
    if (rawConns[i].amount > maxAmt) maxAmt = rawConns[i].amount;
  }
  function nodeRadius(c) {
    var amt = c.amount || 0;
    if (amt <= 0) return 8;
    var lmax = Math.log10(maxAmt + 1);
    var la = Math.log10(amt + 1);
    return 8 + (la / lmax) * 14;
  }
  function formatAmt(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    if (n > 0) return '$' + n;
    return '';
  }
  function truncName(name, maxLen) {
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 2) + '..';
  }

  // Background
  svg.append('rect')
    .attr('width', width).attr('height', height)
    .attr('fill', '#0a0a0a');

  // Root group (pans + zooms together)
  var g = svg.append('g').attr('class', 'graph-root');

  // Build nodes + links
  var centerNode = {
    id: '__center__', name: center.name || 'Profile', type: 'center',
    fx: width / 2, fy: height / 2, radius: 18
  };
  var nodes = [centerNode];
  for (var i = 0; i < rawConns.length; i++) {
    var c = rawConns[i];
    nodes.push({
      id: 'n' + i,
      name: c.name, type: c.type, amount: c.amount, slug: c.slug,
      radius: nodeRadius(c)
    });
  }
  var links = nodes.slice(1).map(function(n) {
    return { source: centerNode, target: n, type: n.type };
  });

  // Zoom + pan
  var zoomBehavior = d3.zoom()
    .scaleExtent([0.3, 4])
    .on('zoom', function(event) { g.attr('transform', event.transform); });
  svg.call(zoomBehavior);
  svg.call(zoomBehavior.transform, d3.zoomIdentity);

  // Force simulation
  var sim = d3.forceSimulation(nodes)
    .force('charge', d3.forceManyBody().strength(-140))
    .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force('link', d3.forceLink(links).distance(function(d) {
      // Donors with big $ sit closer, opposition a bit further (visual weight)
      if (d.type === 'donor' || d.type === 'contract') return 70;
      return 95;
    }).strength(0.35))
    .force('collide', d3.forceCollide(function(d) { return d.radius + 3; }).iterations(2))
    .force('x', d3.forceX(width / 2).strength(0.04))
    .force('y', d3.forceY(height / 2).strength(0.04))
    .alphaDecay(0.025);

  // Links
  var linkSel = g.append('g').attr('class', 'links')
    .selectAll('line').data(links).join('line')
    .attr('stroke', function(d) { return TYPE_COLORS[d.type] || '#555'; })
    .attr('stroke-width', function(d) {
      if (d.type === 'donor' || d.type === 'contract') return 1.6;
      return 1.2;
    })
    .attr('stroke-dasharray', function(d) {
      if (d.type === 'opposition') return '4 3';
      if (d.type === 'media') return '2 2';
      return 'none';
    })
    .attr('stroke-opacity', 0.3);

  // Node groups
  var nodeSel = g.append('g').attr('class', 'nodes')
    .selectAll('g').data(nodes).join('g')
    .attr('cursor', function(d) { return d.id === '__center__' ? 'default' : (d.slug ? 'pointer' : 'grab'); });

  // Outer ring (relationship type color at lower opacity)
  nodeSel.filter(function(d) { return d.id !== '__center__'; })
    .append('circle')
    .attr('class', 'outer-ring')
    .attr('r', function(d) { return d.radius + 3; })
    .attr('fill', 'none')
    .attr('stroke', function(d) { return TYPE_COLORS[d.type] || '#888'; })
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.55);

  // Inner filled circle
  nodeSel.append('circle')
    .attr('class', 'inner-node')
    .attr('r', function(d) { return d.id === '__center__' ? centerNode.radius : d.radius; })
    .attr('fill', function(d) {
      if (d.id === '__center__') return centerColor;
      return TYPE_COLORS[d.type] || '#888';
    })
    .attr('fill-opacity', function(d) { return d.id === '__center__' ? 0.95 : 0.85; })
    .attr('stroke', function(d) {
      if (d.id === '__center__') return centerColor;
      return TYPE_COLORS[d.type] || '#888';
    })
    .attr('stroke-width', function(d) { return d.id === '__center__' ? 2.5 : 1; });

  // Center label (always visible)
  nodeSel.filter(function(d) { return d.id === '__center__'; })
    .append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.35em')
    .attr('fill', '#fff')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .attr('font-family', '"Space Mono", monospace')
    .attr('pointer-events', 'none')
    .text(function(d) { return truncName(d.name, 14); });

  // Outer labels — faint, visible always
  var labelSel = nodeSel.filter(function(d) { return d.id !== '__center__'; })
    .append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('fill', function(d) { return TYPE_COLORS[d.type] || '#aaa'; })
    .attr('font-size', '9px')
    .attr('font-family', '"Space Mono", monospace')
    .attr('pointer-events', 'none')
    .attr('opacity', 0.7)
    .text(function(d) { return truncName(d.name, 16); });

  // Amount labels (only for $-bearing nodes)
  nodeSel.filter(function(d) { return d.amount && d.amount > 0; })
    .append('text')
    .attr('class', 'amount-label')
    .attr('text-anchor', 'middle')
    .attr('fill', function(d) { return TYPE_COLORS[d.type] || '#888'; })
    .attr('font-size', '8px')
    .attr('font-weight', 'bold')
    .attr('font-family', '"Space Mono", monospace')
    .attr('pointer-events', 'none')
    .attr('opacity', 0.85)
    .text(function(d) { return formatAmt(d.amount); });

  // Hover: highlight node + its link, dim the rest
  nodeSel.filter(function(d) { return d.id !== '__center__'; })
    .on('mouseenter', function(event, d) {
      var sel = d3.select(this);
      sel.select('.inner-node').attr('r', d.radius + 3).attr('fill-opacity', 1);
      sel.select('.outer-ring').attr('stroke-opacity', 0.95).attr('stroke-width', 2);
      sel.select('.node-label').attr('opacity', 1).attr('font-size', '10px');
      linkSel.attr('stroke-opacity', function(l) {
        return l.target === d ? 0.9 : 0.08;
      });
    })
    .on('mouseleave', function(event, d) {
      var sel = d3.select(this);
      sel.select('.inner-node').attr('r', d.radius).attr('fill-opacity', 0.85);
      sel.select('.outer-ring').attr('stroke-opacity', 0.55).attr('stroke-width', 1.5);
      sel.select('.node-label').attr('opacity', 0.7).attr('font-size', '9px');
      linkSel.attr('stroke-opacity', 0.3);
    });

  // Click navigates to profile
  nodeSel.filter(function(d) { return d.id !== '__center__' && d.slug; })
    .on('click', function(event, d) {
      event.stopPropagation();
      window.location.href = '/' + d.slug;
    });

  // Drag behavior — pins node while dragging, releases after
  var dragBehavior = d3.drag()
    .on('start', function(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    })
    .on('drag', function(event, d) {
      d.fx = event.x; d.fy = event.y;
    })
    .on('end', function(event, d) {
      if (!event.active) sim.alphaTarget(0);
      if (d.id !== '__center__') { d.fx = null; d.fy = null; }
    });
  nodeSel.call(dragBehavior);

  // Tick
  sim.on('tick', function() {
    linkSel
      .attr('x1', function(d) { return d.source.x; })
      .attr('y1', function(d) { return d.source.y; })
      .attr('x2', function(d) { return d.target.x; })
      .attr('y2', function(d) { return d.target.y; });
    nodeSel.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    labelSel.attr('dy', function(d) { return d.radius + 12; });
    nodeSel.selectAll('.amount-label').attr('dy', function(d) { return d.radius + 22; });
  });

  // Legend (fixed top-left of SVG, outside zoom group so it stays put)
  var typesPresent = {};
  for (var li = 0; li < rawConns.length; li++) typesPresent[rawConns[li].type] = true;
  var legendItems = [];
  if (typesPresent.donor || typesPresent.money) legendItems.push({ label: 'Donors', color: TYPE_COLORS.donor });
  if (typesPresent.contract) legendItems.push({ label: 'Contracts', color: TYPE_COLORS.contract });
  if (typesPresent.opposition) legendItems.push({ label: 'Opposes', color: TYPE_COLORS.opposition });
  if (typesPresent.media) legendItems.push({ label: 'Media', color: TYPE_COLORS.media });
  if (typesPresent.kstreet) legendItems.push({ label: 'K Street', color: TYPE_COLORS.kstreet });
  var legend = svg.append('g').attr('class', 'graph-legend').attr('transform', 'translate(10,' + (height - 18) + ')');
  var legendX = 0;
  for (var li = 0; li < legendItems.length; li++) {
    var it = legendItems[li];
    legend.append('rect')
      .attr('x', legendX).attr('y', -6)
      .attr('width', 9).attr('height', 9)
      .attr('fill', it.color);
    var tx = legend.append('text')
      .attr('x', legendX + 13).attr('y', 2)
      .attr('fill', '#bbb').attr('font-size', '9px')
      .attr('font-family', '"Space Mono", monospace')
      .text(it.label);
    legendX += 30 + (it.label.length * 6);
  }

  // Help hint (bottom-right)
  svg.append('text')
    .attr('x', width - 10).attr('y', height - 8)
    .attr('text-anchor', 'end')
    .attr('fill', '#555').attr('font-size', '8px')
    .attr('font-family', '"Space Mono", monospace')
    .text('drag • scroll to zoom • click to jump');
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

/* Relationship type color indicators */
a.pw-rel-donor { border-left: 3px solid #16a34a; }
a.pw-rel-related { border-left: 3px solid #5b8dce; }
a.pw-rel-opposes { border-left: 3px solid #e63946; }
a.pw-rel-story { border-left: 3px solid #a855f7; }

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

.pw-flow-amount {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #16a34a;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
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

/* ─── Canvas Graph tab ─────────────────────── */

.pw-canvas-graph {
  width: 100%;
  height: 280px;
  background: #0a0a0a;
  border-radius: 0;
  position: relative;
  border: 1px solid #ddd;
  overflow: hidden;
}

.pw-canvas-graph svg.pw-d3-svg {
  display: block;
  width: 100%;
  height: 100%;
  cursor: move;
}

.pw-canvas-graph canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.pw-graph-expand {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 10;
  background: rgba(251, 191, 36, 0.9);
  border: none;
  color: #0a0a0a;
  width: 28px;
  height: 28px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  font-family: "Space Mono", monospace;
}

.pw-graph-expand:hover {
  background: #fbbf24;
}

/* Fullscreen modal state */
.pw-canvas-graph.pw-graph-fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border: none;
  background: rgba(10, 10, 10, 0.98);
  height: 100vh;
}

.pw-canvas-graph.pw-graph-fullscreen .pw-graph-expand {
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  font-size: 22px;
  background: #fbbf24;
}

.pw-graph-overflow {
  font-family: 'Space Mono', monospace;
  font-size: 9px;
  color: #8a8a96;
  text-align: center;
  padding: 6px 8px;
  border-bottom: 1px solid #ddd;
  background: #f5f0eb;
}

/* ─── Legacy Mini Graph tab ────────────────── */

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
