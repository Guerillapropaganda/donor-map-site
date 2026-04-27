"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { PageHeader } from "@/components/PageHeader"
import { SavedViewsBar } from "@/components/SavedViewsBar"

// Filter snapshot saved + restored by SavedViewsBar. Keep this small — only
// fields a user would meaningfully want to recall later. We deliberately
// don't save `selected` as the full ProfileSummary (large, derivable);
// instead we save the title and re-resolve from `profiles` on load.
interface MoneyTrailViewSnapshot {
  selectedTitle: string | null
  search: string
  connFilter: "all" | "money" | "contract" | "opposition"
  maxNodes: number
}
import {
  forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide, forceX, forceY,
  select, zoom as d3Zoom, zoomIdentity, drag as d3Drag,
  type Simulation, type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3"

interface MoneyConnection {
  name: string; amount: number; cycle: string; type: "money" | "contract" | "opposition"
  entityType: string; party?: string; sector?: string
}

interface ProfileSummary {
  title: string; type: string; party?: string; totalAmount: number
  connections: MoneyConnection[]
}

interface ForceNode extends SimulationNodeDatum {
  id: string; name: string; connType: "money" | "contract" | "opposition"
  entityType: string; party?: string; sector?: string
  amount: number; isCenter: boolean
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  connType: string; amount: number
}

const CONN_COLORS: Record<string, string> = { money: "#22c55e", contract: "#3b82f6", opposition: "#ef4444" }
const PARTY_COLORS: Record<string, string> = { Democrat: "#3b82f6", Republican: "#ef4444" }

function getNodeColor(n: ForceNode): string {
  if (n.isCenter) return PARTY_COLORS[n.party || ""] || "#f59e0b"
  return CONN_COLORS[n.connType] || "#7a7a86"
}

function getNodeRadius(n: ForceNode, maxAmt: number): number {
  if (n.isCenter) return 24
  if (n.amount <= 0 || maxAmt <= 0) return 6
  const logMax = Math.log10(maxAmt + 1)
  const logAmt = Math.log10(n.amount + 1)
  return 5 + (logAmt / logMax) * 18
}

function formatAmt(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B"
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K"
  if (n > 0) return "$" + n.toLocaleString()
  return ""
}

export default function MoneyTrailPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<ForceNode, ForceLink> | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ProfileSummary[]>([])
  const [selected, setSelected] = useState<ProfileSummary | null>(null)
  const [search, setSearch] = useState("")
  const [connFilter, setConnFilter] = useState<"all" | "money" | "contract" | "opposition">("all")
  const [hovered, setHovered] = useState<string>("")
  const [maxNodes, setMaxNodes] = useState(60)

  // Load data from the edges API
  useEffect(() => {
    fetch("/api/profile/edges?title=__all__")
      .then(r => r.json())
      .then(data => {
        // Build profile summaries from per-profile edge data
        if (data.edges && typeof data.edges === "object") {
          const summaries: ProfileSummary[] = []
          for (const [title, edgeData] of Object.entries(data.edges as Record<string, any>)) {
            const conns: MoneyConnection[] = []
            const monetaryDetail = edgeData["monetary-detail"] || []
            const contractDetail = edgeData["contract-detail"] || []
            const opposes = edgeData.opposes || []

            // Aggregate monetary by name
            const byName = new Map<string, { amount: number; cycle: string }>()
            for (const d of monetaryDetail) {
              const existing = byName.get(d.name)
              if (existing) { existing.amount += d.amount }
              else { byName.set(d.name, { amount: d.amount, cycle: d.cycle }) }
            }
            for (const [name, info] of byName) {
              conns.push({ name, amount: info.amount, cycle: info.cycle, type: "money", entityType: "unknown" })
            }

            // Contracts
            const contractByName = new Map<string, { amount: number; cycle: string }>()
            for (const d of contractDetail) {
              const existing = contractByName.get(d.name)
              if (existing) { existing.amount += d.amount }
              else { contractByName.set(d.name, { amount: d.amount, cycle: d.cycle }) }
            }
            for (const [name, info] of contractByName) {
              conns.push({ name, amount: info.amount, cycle: info.cycle, type: "contract", entityType: "unknown" })
            }

            // Opposition
            for (const name of opposes) {
              if (!conns.some(c => c.name === name)) {
                conns.push({ name, amount: 0, cycle: "", type: "opposition", entityType: "unknown" })
              }
            }

            if (conns.length > 0) {
              const totalAmount = conns.reduce((sum, c) => sum + c.amount, 0)
              summaries.push({ title, type: "unknown", totalAmount, connections: conns })
            }
          }
          summaries.sort((a, b) => b.totalAmount - a.totalAmount)
          setProfiles(summaries)
          if (summaries.length > 0) setSelected(summaries[0])
        }
        setLoading(false)
      })
      .catch(() => {
        // Fallback: load from connections API
        fetch("/api/connections").then(r => r.json()).then(data => {
          const summaries: ProfileSummary[] = (data.topConnected || [])
            .filter((p: any) => (p.monetaryDetail?.length || 0) > 0 || (p.contracts?.length || 0) > 0)
            .map((p: any) => {
              const conns: MoneyConnection[] = (p.monetaryDetail || []).map((d: any) => ({
                name: d.name, amount: d.amount, cycle: d.cycle, type: "money" as const, entityType: "unknown",
              }))
              for (const name of (p.contracts || [])) {
                conns.push({ name, amount: 0, cycle: "", type: "contract", entityType: "unknown" })
              }
              return { title: p.title, type: p.type, party: undefined, totalAmount: p.totalAmount || 0, connections: conns }
            })
          summaries.sort((a, b) => b.totalAmount - a.totalAmount)
          setProfiles(summaries)
          if (summaries.length > 0) setSelected(summaries[0])
          setLoading(false)
        }).catch(() => setLoading(false))
      })
  }, [])

  // Build star graph when selected profile changes
  const buildGraph = useCallback(() => {
    if (!selected || !svgRef.current) return
    if (simRef.current) simRef.current.stop()

    const svgEl = svgRef.current
    const svg = select(svgEl)
    svg.selectAll("*").remove()

    // Centering fix 2026-04-27: David reported "graph doesn't load center
    // to my screen." Cause: clientWidth/clientHeight returned 0 on first
    // mount before parent layout settled, so we computed width=900 /
    // height=600 hardcoded fallback and centered the graph at (450,300)
    // — but if the parent rendered wider/taller, that center landed
    // off-axis. Fix: read getBoundingClientRect (more reliable post-mount)
    // and set viewBox so the SVG scales to whatever the container is at
    // render time. preserveAspectRatio "xMidYMid meet" centers any
    // overflow in the viewport.
    const rect = svgEl.getBoundingClientRect()
    const width = Math.max(400, Math.round(rect.width || svgEl.clientWidth || 900))
    const height = Math.max(300, Math.round(rect.height || svgEl.clientHeight || 600))
    svg.attr("viewBox", `0 0 ${width} ${height}`)
    svg.attr("preserveAspectRatio", "xMidYMid meet")

    // Filter connections
    let conns = selected.connections
    if (connFilter !== "all") conns = conns.filter(c => c.type === connFilter)

    // Sort by amount, take top N
    conns.sort((a, b) => b.amount - a.amount)
    conns = conns.slice(0, maxNodes)

    const maxAmt = Math.max(1, ...conns.map(c => c.amount))

    // Build force nodes
    const centerNode: ForceNode = {
      id: "__center__", name: selected.title, connType: "money",
      entityType: selected.type, party: selected.party, sector: undefined,
      amount: selected.totalAmount, isCenter: true,
    }

    const connNodes: ForceNode[] = conns.map(c => ({
      id: c.name, name: c.name, connType: c.type,
      entityType: c.entityType, party: undefined, sector: undefined,
      amount: c.amount, isCenter: false,
    }))

    const nodes: ForceNode[] = [centerNode, ...connNodes]
    const links: ForceLink[] = connNodes.map(n => ({
      source: centerNode, target: n, connType: n.connType, amount: n.amount,
    }))

    // Force simulation — star layout, center pinned
    // Heavier nodes get more collision space so they spread out naturally.
    // Same anti-drift settings as the Relationships graph: distanceMax
    // caps long-range repulsion; stronger link + faster decay keep
    // nodes anchored across repeated drag interactions; warmup ticks
    // give an instant first frame.
    const sim = forceSimulation<ForceNode>(nodes)
      .force(
        "charge",
        forceManyBody<ForceNode>()
          .strength(d => d.isCenter ? -200 : -80 - getNodeRadius(d, maxAmt) * 3)
          .distanceMax(250),
      )
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force("link", forceLink<ForceNode, ForceLink>(links).distance(d => 80 + getNodeRadius(d.target as ForceNode, maxAmt) * 2).strength(0.5))
      .force("collide", forceCollide<ForceNode>(d => getNodeRadius(d, maxAmt) + 6).iterations(3))
      .force("x", forceX(width / 2).strength(0.05))
      .force("y", forceY(height / 2).strength(0.05))
      .alphaDecay(0.05)

    centerNode.fx = width / 2
    centerNode.fy = height / 2
    // Pre-place satellites on a circle around the center so the initial
    // tick has something to work with. d3's default phyllotaxis init
    // packs nodes near (0,0) which combined with our forceCenter strength
    // 0.05 + alphaDecay 0.05 means satellites take many ticks to drift
    // to the rim. Pre-placing on a radius of min(width,height)*0.35 puts
    // them in the right neighborhood from frame 1; the simulation then
    // refines by relevance scoring and collision dynamics.
    const initRadius = Math.min(width, height) * 0.35
    nodes.forEach((n, i) => {
      if (n.isCenter) return
      const angle = (i / Math.max(1, nodes.length - 1)) * 2 * Math.PI
      n.x = width / 2 + Math.cos(angle) * initRadius
      n.y = height / 2 + Math.sin(angle) * initRadius
    })
    simRef.current = sim

    // SVG structure
    const g = svg.append("g")

    // Zoom
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => g.attr("transform", event.transform))
    svg.call(zoomBehavior)
    svg.call(zoomBehavior.transform as any, zoomIdentity)

    // Links
    const linkEls = g.append("g").selectAll("line")
      .data(links).join("line")
      .attr("stroke", (d: any) => CONN_COLORS[d.connType] || "#f59e0b")
      .attr("stroke-width", (d: any) => 0.5 + Math.min((d.amount || 0) / maxAmt * 3, 3))
      .attr("stroke-opacity", 0.25)
      .attr("stroke-dasharray", (d: any) => d.connType === "opposition" ? "4 3" : "none")

    // Flow dots — universal logic for ALL profile types:
    //
    // The center profile is the SUBJECT. The question is always:
    //   "Who funds them?" → dots flow INWARD (green)
    //   "Who do they fund?" → dots flow OUTWARD (green)
    //   "Who gives them contracts?" → dots flow INWARD (blue)
    //   "Who spends against them?" → dots flow INWARD (red)
    //
    // For politicians: donors fund them → inward
    // For donors/corps: they fund politicians → outward
    // For media/lobbyists/think-tanks: whoever funds them → inward
    // For PACs: they fund politicians → outward
    //
    // Simple rule: if the center profile has "donors" (receives money),
    // green flows inward. If it has "politicians-funded" (gives money),
    // green flows outward.
    const receivesMoneyTypes = new Set(["politician", "state-politician", "media-profile", "journalist", "podcaster", "lobbying-firm", "think-tank"])
    const centerReceivesMoney = receivesMoneyTypes.has(selected.type)
    const flowDots = g.append("g").selectAll("circle")
      .data(links).join("circle")
      .attr("r", 2)
      .attr("fill", (d: any) => CONN_COLORS[d.connType] || "#22c55e")
      .attr("opacity", 0.6)

    function animateFlow() {
      const t = Date.now() * 0.001
      flowDots.each(function (d: any, i: number) {
        const phase = (t * 0.3 + i * 0.17) % 1
        const centerX = d.source.x ?? 0, centerY = d.source.y ?? 0
        const outerX = d.target.x ?? 0, outerY = d.target.y ?? 0

        // Determine direction: inward (outer→center) or outward (center→outer)
        let flowInward: boolean
        if (d.connType === "contract") {
          flowInward = true // govt pays corp — money flows in
        } else if (d.connType === "opposition") {
          flowInward = true // opposition spends against center — money flows in
        } else {
          // monetary: depends on who's at center
          flowInward = centerReceivesMoney // politicians/media/lobbyists receive, donors/corps/PACs give
        }

        const fromX = flowInward ? outerX : centerX
        const fromY = flowInward ? outerY : centerY
        const toX = flowInward ? centerX : outerX
        const toY = flowInward ? centerY : outerY
        select(this)
          .attr("cx", fromX + (toX - fromX) * phase)
          .attr("cy", fromY + (toY - fromY) * phase)
      })
      requestAnimationFrame(animateFlow)
    }
    requestAnimationFrame(animateFlow)

    // Nodes
    const nodeEls = g.append("g").selectAll<SVGGElement, ForceNode>("g")
      .data(nodes).join("g").attr("cursor", "pointer")

    // Node circles
    nodeEls.append("circle")
      .attr("r", d => getNodeRadius(d, maxAmt))
      .attr("fill", d => getNodeColor(d) + (d.isCenter ? "" : "60"))
      .attr("stroke", d => getNodeColor(d))
      .attr("stroke-width", d => d.isCenter ? 3 : 1.5)

    // Labels
    nodeEls.append("text")
      .attr("text-anchor", "middle")
      .attr("y", d => getNodeRadius(d, maxAmt) + 12)
      .attr("fill", d => d.isCenter ? "#fff" : getNodeColor(d))
      .attr("font-size", d => d.isCenter ? "11px" : "8px")
      .attr("font-weight", d => d.isCenter ? "bold" : "normal")
      .attr("font-family", "ui-monospace, monospace")
      .attr("opacity", d => d.isCenter ? 1 : 0.5)
      .text(d => d.name.length > 24 ? d.name.slice(0, 22) + ".." : d.name)

    // Amount labels (for nodes with significant amounts)
    nodeEls.filter(d => d.amount > 0 && !d.isCenter)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("y", d => getNodeRadius(d, maxAmt) + 22)
      .attr("fill", d => getNodeColor(d))
      .attr("font-size", "7px")
      .attr("font-weight", "bold")
      .attr("font-family", "ui-monospace, monospace")
      .attr("opacity", 0.7)
      .text(d => formatAmt(d.amount))

    // Hover
    nodeEls
      .on("mouseenter", function (_, d) {
        select(this).select("circle").attr("r", getNodeRadius(d, maxAmt) + 3)
        select(this).selectAll("text").attr("opacity", 1)
        linkEls.attr("stroke-opacity", (l: any) => l.target.id === d.id || l.source.id === d.id ? 0.7 : 0.05)
        setHovered(d.name + (d.amount > 0 ? ` — ${formatAmt(d.amount)}` : ""))
      })
      .on("mouseleave", function (_, d) {
        select(this).select("circle").attr("r", getNodeRadius(d, maxAmt))
        select(this).selectAll("text").attr("opacity", d.isCenter ? 1 : 0.5)
        linkEls.attr("stroke-opacity", 0.25)
        setHovered("")
      })

    // Click to select a different profile
    nodeEls.on("click", (_, d) => {
      if (d.isCenter) return
      const match = profiles.find(p => p.title === d.name)
      if (match) {
        setSelected(match)
      } else {
        window.open(`/editor?search=${encodeURIComponent(d.name)}`, "_blank")
      }
    })

    // Drag is satellite-only at the handler level (NOT via .filter()):
    // d3-drag's filter rejects events so they bubble up to the container's
    // pan handler — clicking the center would pan the whole graph.
    // Instead, attach drag to all nodes (event captured) but no-op the
    // handlers for the center. Center stays anchored at viewport
    // center; satellites draggable. Click a satellite to refocus.
    //
    // 2026-04-27: removed the duplicate `nodeEls.call(d3Drag(...))` block
    // that was here previously. It overrode this handler with one that
    // had NO isCenter guard, which let the center node drag freely while
    // its anchor (centerNode.fx = width/2; .fy = height/2) tried to pull
    // it back. The conflict spun the simulation into the "satellites get
    // heavier and heavier as you drag the main node" failure mode David
    // observed in the prior session. Single drag handler now.
    const dragBehavior = d3Drag<SVGGElement, ForceNode>()
      .on("start", (event, d) => {
        if (d.isCenter) return
        if (!event.active) sim.alphaTarget(0.1).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on("drag", (event, d) => {
        if (d.isCenter) return
        d.fx = event.x; d.fy = event.y
      })
      .on("end", (event, d) => {
        if (d.isCenter) return
        if (!event.active) sim.alphaTarget(0)
        d.fx = null; d.fy = null
      })
    nodeEls.call(dragBehavior as any)

    // Tick handler — runs every animation frame the simulation is alive.
    // Updates link endpoints + node-group positions to current x/y state.
    const tickHandler = () => {
      linkEls.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y)
      nodeEls.attr("transform", d => `translate(${d.x},${d.y})`)
    }
    sim.on("tick", tickHandler)

    // Force initial layout: call the tick handler synchronously so frame
    // 1 has the right positions (from our pre-place circle), then kick
    // the simulation back to alpha=1 so it actively converges from there
    // rather than starting from already-decayed alpha. Without this,
    // satellites empirically render at (0,0) — sim.on("tick") fires
    // but only after the initial render frame, leaving a flash of
    // unconverged layout. (Confirmed via DOM inspection 2026-04-27.)
    tickHandler()
    sim.alpha(1).restart()
  }, [selected, connFilter, maxNodes, profiles])

  useEffect(() => { if (selected) { const t = setTimeout(buildGraph, 50); return () => clearTimeout(t) } }, [selected, buildGraph])

  // Search filter
  const filteredProfiles = profiles.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 50)

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-4">
        <PageHeader
          title="Money Trail"
          whatThisDoes="Star-graph visualization of one profile's monetary connections — donors, recipients, contracts, oppositions. Pick a profile from the left rail; the graph centers on them with their funded counterparties radiating out."
          rightNow={`${profiles.length.toLocaleString()} profiles in the index with monetary data. ${selected ? `Showing ${selected.title} (${selected.connections.length} connections)` : "No profile selected — pick one from the left rail."}`}
          action="Click a profile in the left rail to render. Filter pill above the graph switches between money / contracts / opposition. Search box up top for fuzzy name match."
          freshness={{
            paths: ["data/relationships-per-profile.json", "data/relationships.jsonl"],
            label: "money graph",
            freshWithinDays: 1,
            warnWithinDays: 7,
          }}
        />
      </div>
      {/* Saved-views bar (deferred audit item #10). LocalStorage-backed; per machine. */}
      <div className="px-4 pb-2">
        <SavedViewsBar<MoneyTrailViewSnapshot>
          pageKey="money-trail"
          currentView={{
            selectedTitle: selected?.title ?? null,
            search,
            connFilter,
            maxNodes,
          }}
          onLoadView={(v) => {
            setSearch(v.search)
            setConnFilter(v.connFilter)
            setMaxNodes(v.maxNodes)
            // Resolve the selected profile by title (the snapshot stored
            // just the title, not the full ProfileSummary). Profiles array
            // may not be loaded yet on first render — the find() returns
            // undefined and selected stays null, which is a fine null state.
            if (v.selectedTitle) {
              const target = profiles.find((p) => p.title === v.selectedTitle)
              if (target) setSelected(target)
            } else {
              setSelected(null)
            }
          }}
        />
      </div>
      {/* Lightweight summary strip retained for the hover read-out */}
      <div className="flex items-center gap-3 px-4 pb-2 flex-wrap min-h-[1.25rem]">
        {hovered && <span className="text-[10px] text-[var(--color-text)] font-mono">↳ {hovered}</span>}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar — profile picker */}
        <div className="w-64 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-bg-card)]">
          <div className="p-2 border-b border-[var(--color-border)]">
            <input type="text" placeholder="Search profiles..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredProfiles.map(p => (
              <button key={p.title} onClick={() => setSelected(p)}
                className={`w-full text-left px-3 py-2 text-[10px] border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors ${selected?.title === p.title ? "bg-[var(--color-steel)]/10" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-text)] truncate flex-1">{p.title}</span>
                  <span className="text-[#22c55e] font-mono font-bold ml-2 flex-shrink-0">{formatAmt(p.totalAmount)}</span>
                </div>
                <div className="text-[8px] text-[var(--color-text-dim)]">{p.connections.length} connections</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Controls */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] flex-wrap">
            {(["all", "money", "contract", "opposition"] as const).map(f => (
              <button key={f} onClick={() => setConnFilter(f)}
                className={`text-[8px] px-2 py-1 rounded border transition-all ${connFilter === f
                  ? `border-current ${f === "money" ? "text-[#22c55e] bg-[#22c55e]/15" : f === "contract" ? "text-[#3b82f6] bg-[#3b82f6]/15" : f === "opposition" ? "text-[#ef4444] bg-[#ef4444]/15" : "text-[#f59e0b] bg-[#f59e0b]/15"}`
                  : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
                {f === "all" ? "All" : f === "money" ? "Donations" : f === "contract" ? "Contracts" : "Opposition"}
              </button>
            ))}
            <span className="w-px h-4 bg-[var(--color-border)]" />
            <span className="text-[8px] text-[var(--color-text-dim)]">Show:</span>
            <input type="range" min={10} max={100} value={maxNodes} onChange={e => setMaxNodes(parseInt(e.target.value))}
              className="w-20 h-1 accent-[#f59e0b]" />
            <span className="text-[8px] text-[var(--color-text-dim)]">{maxNodes}</span>
            <span className="w-px h-4 bg-[var(--color-border)]" />
            <span className="text-[8px] text-[var(--color-text-dim)]">
              <span style={{color:"#22c55e"}}>Green</span> = donations | <span style={{color:"#3b82f6"}}>Blue</span> = contracts | <span style={{color:"#ef4444"}}>Red</span> = opposition | Node size = $ amount | Click node to explore
            </span>
          </div>

          {/* Graph */}
          <div className="flex-1 bg-[#0c0c0f] relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-dim)] text-sm animate-pulse">Loading...</div>
            ) : !selected ? (
              <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-dim)] text-sm">Select a profile from the sidebar</div>
            ) : (
              <svg ref={svgRef} width="100%" height="100%" style={{ display: "block" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
