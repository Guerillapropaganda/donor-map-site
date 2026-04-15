"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide, forceX, forceY,
  select, zoom as d3Zoom, drag as d3Drag,
  type Simulation, type SimulationNodeDatum, type SimulationLinkDatum, type Selection,
} from "d3"

interface MoneyNode extends SimulationNodeDatum {
  id: string; name: string; type: string; party?: string; sector?: string
  degree: number; bothSides: boolean
}

interface MoneyEdge extends SimulationLinkDatum<MoneyNode> {
  confidence: number
}

const TYPE_COLORS: Record<string, string> = {
  politician: "#5b8dce", donor: "#22c55e", corporation: "#22c55e",
  "think-tank": "#a855f7", "lobbying-firm": "#f59e0b", "media-profile": "#ef4444",
  story: "#ec4899", pac: "#f59e0b", unknown: "#7a7a86",
}

const SECTOR_COLORS: Record<string, string> = {
  "Defense & Intelligence": "#6b7280", "Wall Street": "#eab308", "Tech & Crypto": "#06b6d4",
  "Energy & Utilities": "#f97316", "Pharma & Healthcare": "#10b981", "Real Estate": "#8b5cf6",
  "Dark Money": "#ef4444", "Mega-Donors": "#f59e0b", "Labor Unions": "#3b82f6",
  "Super PACs": "#dc2626", "Healthcare": "#14b8a6", "Education": "#8b5cf6",
  "Foreign": "#7c3aed", "Gig Economy": "#06b6d4", "Carceral State": "#6b7280",
  "Agriculture": "#22c55e", "Corporate": "#94a3b8", "Law Enforcement": "#475569",
}

function getNodeColor(n: MoneyNode, colorMode: string): string {
  if (n.type === "politician") {
    return n.party === "Democrat" ? "#3b82f6" : n.party === "Republican" ? "#ef4444" : "#888"
  }
  if (colorMode === "sector" && n.sector) {
    return SECTOR_COLORS[n.sector] || "#7a7a86"
  }
  if (n.bothSides) return "#f59e0b"
  return TYPE_COLORS[n.type] || "#7a7a86"
}

function getNodeSize(degree: number): number {
  return 4 + Math.min(Math.sqrt(degree) * 2.5, 18)
}

export default function MoneyTrailPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const simRef = useRef<Simulation<MoneyNode, MoneyEdge> | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<{
    totalEdges?: number; totalDonors?: number; totalPoliticians?: number; bothSidesCount?: number
  }>({})
  const [hovered, setHovered] = useState<string | null>(null)
  const [maxNodes, setMaxNodes] = useState(200)
  const [filter, setFilter] = useState<"all" | "Democrat" | "Republican" | "donors" | "both-sides">("all")
  const [colorMode, setColorMode] = useState<"type" | "sector">("type")
  const [showFlow, setShowFlow] = useState(true)
  const allDataRef = useRef<{ nodes: MoneyNode[]; edges: MoneyEdge[] }>({ nodes: [], edges: [] })

  const buildGraph = useCallback(() => {
    if (!svgRef.current) return
    const svgEl = svgRef.current
    const svg = select(svgEl)
    svg.selectAll("*").remove()
    if (simRef.current) simRef.current.stop()

    const width = svgEl.clientWidth || 1200
    const height = svgEl.clientHeight || 700
    const { nodes: allNodes, edges: allEdges } = allDataRef.current

    // Filter nodes
    let filtered = [...allNodes]
    if (filter === "Democrat" || filter === "Republican") {
      const partyPols = new Set(filtered.filter(n => n.type === "politician" && n.party === filter).map(n => n.id))
      const connected = new Set<string>()
      for (const e of allEdges) {
        const src = typeof e.source === "string" ? e.source : (e.source as MoneyNode).id
        const tgt = typeof e.target === "string" ? e.target : (e.target as MoneyNode).id
        if (partyPols.has(src)) connected.add(tgt)
        if (partyPols.has(tgt)) connected.add(src)
      }
      filtered = filtered.filter(n => partyPols.has(n.id) || connected.has(n.id))
    } else if (filter === "donors") {
      const donors = new Set(filtered.filter(n => n.type !== "politician").map(n => n.id))
      const connected = new Set<string>()
      for (const e of allEdges) {
        const src = typeof e.source === "string" ? e.source : (e.source as MoneyNode).id
        const tgt = typeof e.target === "string" ? e.target : (e.target as MoneyNode).id
        if (donors.has(src)) connected.add(tgt)
        if (donors.has(tgt)) connected.add(src)
      }
      filtered = filtered.filter(n => donors.has(n.id) || connected.has(n.id))
    } else if (filter === "both-sides") {
      const bs = new Set(filtered.filter(n => n.bothSides).map(n => n.id))
      const connected = new Set<string>()
      for (const e of allEdges) {
        const src = typeof e.source === "string" ? e.source : (e.source as MoneyNode).id
        const tgt = typeof e.target === "string" ? e.target : (e.target as MoneyNode).id
        if (bs.has(src)) connected.add(tgt)
        if (bs.has(tgt)) connected.add(src)
      }
      filtered = filtered.filter(n => bs.has(n.id) || connected.has(n.id))
    }

    // Top N by degree
    filtered.sort((a, b) => b.degree - a.degree)
    filtered = filtered.slice(0, maxNodes)
    const nodeIds = new Set(filtered.map(n => n.id))

    // Deep copy nodes for D3 mutation
    const simNodes: MoneyNode[] = filtered.map(n => ({ ...n }))
    const nodeMap = new Map(simNodes.map(n => [n.id, n]))

    // Filter edges to visible nodes
    const simEdges: MoneyEdge[] = allEdges
      .filter(e => {
        const src = typeof e.source === "string" ? e.source : (e.source as MoneyNode).id
        const tgt = typeof e.target === "string" ? e.target : (e.target as MoneyNode).id
        return nodeIds.has(src) && nodeIds.has(tgt)
      })
      .map(e => ({
        source: nodeMap.get(typeof e.source === "string" ? e.source : (e.source as MoneyNode).id)!,
        target: nodeMap.get(typeof e.target === "string" ? e.target : (e.target as MoneyNode).id)!,
        confidence: e.confidence,
      }))
      .filter(e => e.source && e.target)

    // Force simulation
    const sim = forceSimulation<MoneyNode>(simNodes)
      .force("charge", forceManyBody().strength(-80))
      .force("center", forceCenter(width / 2, height / 2).strength(0.03))
      .force("link", forceLink<MoneyNode, MoneyEdge>(simEdges).distance(50).strength(0.2))
      .force("collide", forceCollide<MoneyNode>(n => getNodeSize(n.degree) + 2).iterations(2))
      .force("x", forceX(width / 2).strength(0.02))
      .force("y", forceY(height / 2).strength(0.02))
      .alphaDecay(0.015)

    simRef.current = sim

    // SVG structure
    const g = svg.append("g").attr("class", "money-root")

    // Arrow marker defs
    const defs = svg.append("defs")
    defs.append("marker")
      .attr("id", "money-arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4")
      .attr("fill", "#f59e0b")
      .attr("opacity", 0.6)

    // Zoom
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => g.attr("transform", event.transform))
    svg.call(zoomBehavior)

    // Edges
    const edgeGroup = g.append("g").attr("class", "money-edges")
    const edgeEls = edgeGroup.selectAll("line")
      .data(simEdges)
      .join("line")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", d => 0.5 + d.confidence)
      .attr("stroke-opacity", 0.15)
      .attr("marker-end", "url(#money-arrow)")

    // Animated flow dots (pulsing dots moving along edges)
    let flowGroup: Selection<SVGGElement, unknown, null, undefined> | null = null
    if (showFlow) {
      flowGroup = g.append<SVGGElement>("g").attr("class", "money-flow")
      // Create flow particles — one per edge, staggered
      const flowDots = flowGroup!.selectAll("circle")
        .data(simEdges)
        .join("circle")
        .attr("r", 2)
        .attr("fill", "#f59e0b")
        .attr("opacity", 0.7)

      // Animate flow dots along edges
      function animateFlow() {
        const t = Date.now() * 0.001
        flowDots.each(function (d: any, i: number) {
          const phase = (t * 0.3 + i * 0.17) % 1 // staggered, looping 0→1
          const sx = d.source.x ?? 0, sy = d.source.y ?? 0
          const tx = d.target.x ?? 0, ty = d.target.y ?? 0
          select(this)
            .attr("cx", sx + (tx - sx) * phase)
            .attr("cy", sy + (ty - sy) * phase)
        })
        requestAnimationFrame(animateFlow)
      }
      requestAnimationFrame(animateFlow)
    }

    // Nodes
    const nodeGroup = g.append("g").attr("class", "money-nodes")
    const nodeEls = nodeGroup.selectAll<SVGGElement, MoneyNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")

    // Node circles
    nodeEls.append("circle")
      .attr("r", d => getNodeSize(d.degree))
      .attr("fill", d => getNodeColor(d, colorMode) + "40")
      .attr("stroke", d => getNodeColor(d, colorMode))
      .attr("stroke-width", d => d.bothSides ? 2.5 : 1.5)

    // Both-sides glow
    nodeEls.filter(d => d.bothSides)
      .append("circle")
      .attr("r", d => getNodeSize(d.degree) + 4)
      .attr("fill", "none")
      .attr("stroke", "#f59e0b")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-dasharray", "3 2")

    // Labels — faint, always visible
    const labelEls = nodeEls.append("text")
      .attr("text-anchor", "middle")
      .attr("y", d => getNodeSize(d.degree) + 10)
      .attr("fill", d => getNodeColor(d, colorMode))
      .attr("font-size", d => d.degree > 10 ? "8px" : "6px")
      .attr("font-family", "ui-monospace, monospace")
      .attr("opacity", 0.3)
      .text(d => d.name.length > 22 ? d.name.slice(0, 20) + ".." : d.name)

    // Hover
    nodeEls
      .on("mouseenter", function (event, d) {
        select(this).select("circle").attr("r", getNodeSize(d.degree) + 3)
        select(this).select("text").attr("opacity", 1).attr("font-size", "10px").attr("font-weight", "bold")
        edgeEls.attr("stroke-opacity", (e: any) =>
          e.source.id === d.id || e.target.id === d.id ? 0.8 : 0.05
        )
        setHovered(d.name)
      })
      .on("mouseleave", function (event, d) {
        select(this).select("circle").attr("r", getNodeSize(d.degree))
        select(this).select("text").attr("opacity", 0.3).attr("font-size", d.degree > 10 ? "8px" : "6px").attr("font-weight", "normal")
        edgeEls.attr("stroke-opacity", 0.15)
        setHovered(null)
      })

    // Click to open in editor
    nodeEls.on("click", (event, d) => {
      window.open(`/editor?search=${encodeURIComponent(d.name)}`, "_blank")
    })

    // Drag
    const dragBehavior = d3Drag<SVGGElement, MoneyNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        d.fx = null; d.fy = null
      })
    // D3 drag behavior types don't align with selection types — safe cast
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeEls.call(dragBehavior as any)

    // Tick
    sim.on("tick", () => {
      edgeEls
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
      nodeEls.attr("transform", d => `translate(${d.x},${d.y})`)
    })
  }, [maxNodes, filter, colorMode, showFlow])

  // Load data
  useEffect(() => {
    fetch("/api/money-trail")
      .then(r => r.json())
      .then(data => {
        allDataRef.current = { nodes: data.nodes || [], edges: data.edges || [] }
        setStats(data.stats || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Rebuild graph when data loads or controls change
  useEffect(() => {
    if (!loading && allDataRef.current.nodes.length > 0) {
      // Small delay for SVG to mount
      const t = setTimeout(buildGraph, 100)
      return () => clearTimeout(t)
    }
  }, [loading, buildGraph])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] flex-wrap">
        <h1 className="text-sm font-bold tracking-wider text-[#f59e0b]">MONEY TRAIL</h1>
        <span className="text-[9px] text-[var(--color-text-dim)]">
          {stats.totalEdges || 0} monetary edges | {stats.totalDonors || 0} donors | {stats.totalPoliticians || 0} politicians | {stats.bothSidesCount || 0} both-sides
        </span>
        {hovered && (
          <span className="text-[10px] text-[var(--color-text)] ml-2 font-mono">| {hovered}</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] flex-wrap">
        {/* Party filter */}
        {(["all", "Democrat", "Republican", "donors", "both-sides"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[8px] px-2 py-1 rounded border transition-all ${filter === f ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#f59e0b]" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
            {f === "all" ? "All" : f === "both-sides" ? "Both Sides" : f === "donors" ? "Donors Only" : f}
          </button>
        ))}

        <span className="w-px h-4 bg-[var(--color-border)]" />

        {/* Color mode */}
        <button onClick={() => setColorMode(colorMode === "type" ? "sector" : "type")}
          className="text-[8px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
          Color: {colorMode === "type" ? "Entity Type" : "Sector"}
        </button>

        {/* Flow toggle */}
        <button onClick={() => setShowFlow(!showFlow)}
          className={`text-[8px] px-2 py-1 rounded border transition-all ${showFlow ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#f59e0b]" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
          Flow: {showFlow ? "ON" : "OFF"}
        </button>

        <span className="w-px h-4 bg-[var(--color-border)]" />

        {/* Node count */}
        <span className="text-[8px] text-[var(--color-text-dim)]">Nodes:</span>
        <input type="range" min={50} max={500} value={maxNodes} onChange={e => setMaxNodes(parseInt(e.target.value))}
          className="w-24 h-1 accent-[#f59e0b]" />
        <span className="text-[8px] text-[var(--color-text-dim)] w-8">{maxNodes}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[var(--color-border)] flex-wrap">
        <span className="text-[7px] text-[var(--color-text-dim)] uppercase tracking-wider">Nodes:</span>
        <span className="flex items-center gap-1 text-[7px] text-[#3b82f6]"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Democrat</span>
        <span className="flex items-center gap-1 text-[7px] text-[#ef4444]"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Republican</span>
        <span className="flex items-center gap-1 text-[7px] text-[#22c55e]"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Donor/Corp</span>
        <span className="flex items-center gap-1 text-[7px] text-[#f59e0b]"><span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#f59e0b]" style={{ backgroundColor: "#f59e0b30" }} /> Both-sides</span>
        <span className="w-px h-3 bg-[var(--color-border)]" />
        <span className="text-[7px] text-[var(--color-text-dim)]">Arrows show money flow direction | Size = connection count | Scroll zoom | Drag nodes | Click to edit</span>
      </div>

      {/* Graph */}
      <div className="flex-1 relative bg-[#0c0c0f]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-dim)] text-sm animate-pulse">
            Loading {stats.totalEdges || "..."} monetary edges...
          </div>
        ) : (
          <svg ref={svgRef} width="100%" height="100%" style={{ display: "block" }} />
        )}
      </div>
    </div>
  )
}
