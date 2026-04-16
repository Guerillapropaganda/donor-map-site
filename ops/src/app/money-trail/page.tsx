"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide, forceX, forceY,
  type Simulation, type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3"

interface MoneyNode extends SimulationNodeDatum {
  id: string; name: string; type: string; party?: string; sector?: string
  degree: number; totalAmount: number; bothSides: boolean; r: number
}

interface MoneyEdge extends SimulationLinkDatum<MoneyNode> {
  confidence: number; amount: number; cycle: string; edgeType: string
}

const TYPE_COLORS: Record<string, string> = {
  politician: "#5b8dce", donor: "#22c55e", corporation: "#22c55e",
  entity: "#22c55e", "think-tank": "#a855f7", "lobbying-firm": "#f59e0b",
  "media-profile": "#ec4899", pac: "#f59e0b", unknown: "#7a7a86",
}
const PARTY_COLORS: Record<string, string> = { Democrat: "#3b82f6", Republican: "#ef4444" }
const EDGE_COLORS: Record<string, string> = { monetary: "#22c55e", "government-contract": "#3b82f6", "political-opposition": "#ef4444" }

function getNodeColor(n: MoneyNode): string {
  if (n.type === "politician") return PARTY_COLORS[n.party || ""] || "#888"
  if (n.bothSides) return "#f59e0b"
  return TYPE_COLORS[n.type] || "#7a7a86"
}

function formatAmt(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B"
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return "$" + Math.round(n / 1e3) + "K"
  if (n > 0) return "$" + n.toLocaleString()
  return ""
}

type FilterMode = "all" | "Democrat" | "Republican" | "donors" | "both-sides"
type EdgeFilter = "all" | "monetary" | "government-contract" | "political-opposition"

export default function MoneyTrailPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const simRef = useRef<Simulation<MoneyNode, MoneyEdge> | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [hoveredName, setHoveredName] = useState("")
  const [hoveredAmt, setHoveredAmt] = useState(0)
  const [maxNodes, setMaxNodes] = useState(150)
  const [filter, setFilter] = useState<FilterMode>("all")
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all")
  const [minAmount, setMinAmount] = useState(0)
  const allDataRef = useRef<{ nodes: MoneyNode[]; edges: MoneyEdge[] }>({ nodes: [], edges: [] })

  // Mutable refs for interaction (no React re-render needed)
  const nodesRef = useRef<MoneyNode[]>([])
  const edgesRef = useRef<MoneyEdge[]>([])
  const transformRef = useRef({ k: 1, x: 600, y: 350 }) // center of typical viewport, updated in buildGraph
  const hoveredRef = useRef<MoneyNode | null>(null)
  const dragRef = useRef<{ node: MoneyNode | null; panning: boolean; startX: number; startY: number; startTx: number; startTy: number }>({
    node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0,
  })
  const animRef = useRef(0)

  // Canvas render function — called by D3 tick + animation frame
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth
    const h = container.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr; canvas.height = h * dpr
      canvas.style.width = w + "px"; canvas.style.height = h + "px"
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const nodes = nodesRef.current
    const edges = edgesRef.current
    const tf = transformRef.current
    const hov = hoveredRef.current
    const t = Date.now() * 0.001

    ctx.fillStyle = "#0c0c0f"
    ctx.fillRect(0, 0, w, h)
    ctx.save()
    ctx.translate(tf.x, tf.y)
    ctx.scale(tf.k, tf.k)

    // Edges
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i]
      const a = e.source as MoneyNode, b = e.target as MoneyNode
      if (a?.x == null || b?.x == null) continue
      const isHl = hov && (a.id === hov.id || b.id === hov.id)

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = EDGE_COLORS[e.edgeType] || "#f59e0b"
      ctx.globalAlpha = isHl ? 0.7 : (hov ? 0.03 : 0.12)
      ctx.lineWidth = (isHl ? 2 : 0.5) / tf.k
      if (e.edgeType === "political-opposition") { ctx.setLineDash([4 / tf.k, 3 / tf.k]) } else { ctx.setLineDash([]) }
      ctx.stroke()
      ctx.setLineDash([])

      // Flow dot
      if (e.edgeType === "monetary" && (!hov || isHl)) {
        const phase = (t * 0.3 + i * 0.11) % 1
        ctx.beginPath()
        ctx.arc(a.x + (b.x - a.x) * phase, a.y + (b.y - a.y) * phase, (isHl ? 2.5 : 1.5) / tf.k, 0, Math.PI * 2)
        ctx.fillStyle = EDGE_COLORS[e.edgeType]
        ctx.globalAlpha = isHl ? 0.8 : 0.25
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    // Nodes
    for (const n of nodes) {
      if (n.x === undefined || n.y === undefined) continue
      const isHov = hov?.id === n.id
      const isConn = hov ? edges.some(e => {
        const s = (e.source as MoneyNode).id, t = (e.target as MoneyNode).id
        return (s === hov.id && t === n.id) || (t === hov.id && s === n.id)
      }) : false
      const dim = hov != null && !isHov && !isConn
      const color = getNodeColor(n)

      ctx.beginPath()
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = dim ? 0.06 : (isHov ? 1 : 0.85)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = (isHov ? 2.5 : 1) / tf.k
      ctx.globalAlpha = dim ? 0.03 : 0.5
      ctx.stroke()
      ctx.globalAlpha = 1

      if (n.bothSides && !dim) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2)
        ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1 / tf.k; ctx.globalAlpha = 0.4
        ctx.setLineDash([3 / tf.k, 2 / tf.k]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
      }

      const showLabel = tf.k > 0.5 && (n.r * tf.k >= 6 || isHov || isConn)
      if (showLabel && !dim) {
        const fontSize = Math.max(8, Math.min(12, 10 / tf.k))
        ctx.font = `${isHov ? "bold " : ""}${fontSize}px ui-monospace, monospace`
        ctx.fillStyle = isHov ? "#fff" : color
        ctx.globalAlpha = isHov ? 1 : 0.6
        ctx.textAlign = "center"
        const label = n.name.length > 22 ? n.name.slice(0, 20) + ".." : n.name
        ctx.fillText(label, n.x, n.y + n.r + fontSize + 2)
        if ((isHov || isConn) && n.totalAmount > 0) {
          ctx.font = `bold ${fontSize}px ui-monospace, monospace`
          ctx.fillStyle = "#22c55e"
          ctx.fillText(formatAmt(n.totalAmount), n.x, n.y + n.r + fontSize * 2 + 4)
        }
        ctx.globalAlpha = 1
      }
    }

    ctx.restore()

    // Legend
    ctx.font = '8px ui-monospace, monospace'
    let lx = 10
    for (const [label, color] of [["Funded", "#22c55e"], ["Contracts", "#3b82f6"], ["Opposes", "#ef4444"], ["Dem", "#3b82f6"], ["Rep", "#ef4444"], ["Both Sides", "#f59e0b"]] as const) {
      ctx.fillStyle = color; ctx.globalAlpha = 0.7; ctx.fillRect(lx, h - 20, 8, 8)
      ctx.fillStyle = "#888"; ctx.globalAlpha = 0.6; ctx.textAlign = "left"
      ctx.fillText(label, lx + 10, h - 13); lx += ctx.measureText(label).width + 20; ctx.globalAlpha = 1
    }

    animRef.current = requestAnimationFrame(renderCanvas)
  }, [])

  // Build graph when controls change
  const buildGraph = useCallback(() => {
    const { nodes: allNodes, edges: allEdges } = allDataRef.current
    if (allNodes.length === 0) return

    if (simRef.current) simRef.current.stop()

    let filteredEdges = allEdges
    if (edgeFilter !== "all") filteredEdges = allEdges.filter(e => e.edgeType === edgeFilter)
    if (minAmount > 0) filteredEdges = filteredEdges.filter(e => e.amount >= minAmount)

    const connectedIds = new Set<string>()
    for (const e of filteredEdges) { connectedIds.add(e.source as unknown as string); connectedIds.add(e.target as unknown as string) }

    let filtered = allNodes.filter(n => connectedIds.has(n.id))

    if (filter === "Democrat" || filter === "Republican") {
      const partyPols = new Set(filtered.filter(n => n.type === "politician" && n.party === filter).map(n => n.id))
      const conn = new Set<string>()
      for (const e of filteredEdges) { if (partyPols.has(e.source as unknown as string)) conn.add(e.target as unknown as string); if (partyPols.has(e.target as unknown as string)) conn.add(e.source as unknown as string) }
      filtered = filtered.filter(n => partyPols.has(n.id) || conn.has(n.id))
    } else if (filter === "donors") {
      const donors = new Set(filtered.filter(n => n.type !== "politician").map(n => n.id))
      const conn = new Set<string>()
      for (const e of filteredEdges) { if (donors.has(e.source as unknown as string)) conn.add(e.target as unknown as string); if (donors.has(e.target as unknown as string)) conn.add(e.source as unknown as string) }
      filtered = filtered.filter(n => donors.has(n.id) || conn.has(n.id))
    } else if (filter === "both-sides") {
      const bs = new Set(filtered.filter(n => n.bothSides).map(n => n.id))
      const conn = new Set<string>()
      for (const e of filteredEdges) { if (bs.has(e.source as unknown as string)) conn.add(e.target as unknown as string); if (bs.has(e.target as unknown as string)) conn.add(e.source as unknown as string) }
      filtered = filtered.filter(n => bs.has(n.id) || conn.has(n.id))
    }

    filtered.sort((a, b) => b.totalAmount - a.totalAmount)
    filtered = filtered.slice(0, maxNodes)
    const nodeIds = new Set(filtered.map(n => n.id))

    // Compute radii
    const maxAmt = Math.max(1, ...filtered.map(n => n.totalAmount))
    const logMax = Math.log10(maxAmt + 1)
    const simNodes: MoneyNode[] = filtered.map(n => ({
      ...n,
      r: 4 + (n.totalAmount > 0 ? Math.log10(n.totalAmount + 1) / logMax : 0) * 20,
    }))

    const nodeMap = new Map(simNodes.map(n => [n.id, n]))
    const simEdges: MoneyEdge[] = filteredEdges
      .filter(e => nodeIds.has(e.source as unknown as string) && nodeIds.has(e.target as unknown as string))
      .map(e => ({
        source: nodeMap.get(e.source as unknown as string)!,
        target: nodeMap.get(e.target as unknown as string)!,
        confidence: e.confidence, amount: e.amount, cycle: e.cycle, edgeType: e.edgeType,
      }))
      .filter(e => e.source && e.target)

    nodesRef.current = simNodes
    edgesRef.current = simEdges

    // D3 force simulation — O(n log n) via quadtree
    const w = containerRef.current?.clientWidth || 1200
    const h = containerRef.current?.clientHeight || 700
    transformRef.current = { k: 1, x: w / 2, y: h / 2 }

    const sim = forceSimulation<MoneyNode>(simNodes)
      .force("charge", forceManyBody().strength(-60))
      .force("center", forceCenter(0, 0).strength(0.05))
      .force("link", forceLink<MoneyNode, MoneyEdge>(simEdges).distance(60).strength(0.15))
      .force("collide", forceCollide<MoneyNode>(n => n.r + 2).iterations(2))
      .force("x", forceX(0).strength(0.02))
      .force("y", forceY(0).strength(0.02))
      .alphaDecay(0.02)

    simRef.current = sim
  }, [maxNodes, filter, edgeFilter, minAmount])

  // Mouse interaction
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function toWorld(e: MouseEvent): [number, number] {
      const rect = canvas!.getBoundingClientRect()
      const tf = transformRef.current
      return [(e.clientX - rect.left - tf.x) / tf.k, (e.clientY - rect.top - tf.y) / tf.k]
    }

    function hitTest(wx: number, wy: number): MoneyNode | null {
      for (const n of nodesRef.current) {
        if (n.x !== undefined && n.y !== undefined && Math.hypot(wx - n.x, wy - n.y) <= n.r + 3) return n
      }
      return null
    }

    function onMouseMove(e: MouseEvent) {
      const dr = dragRef.current
      if (dr.panning) {
        transformRef.current.x = dr.startTx + (e.clientX - dr.startX)
        transformRef.current.y = dr.startTy + (e.clientY - dr.startY)
        return
      }
      if (dr.node) {
        const [wx, wy] = toWorld(e)
        dr.node.fx = wx; dr.node.fy = wy
        return
      }
      const [wx, wy] = toWorld(e)
      const hit = hitTest(wx, wy)
      hoveredRef.current = hit
      canvas!.style.cursor = hit ? "pointer" : "grab"
      setHoveredName(hit?.name ?? "")
      setHoveredAmt(hit?.totalAmount ?? 0)
    }

    function onMouseDown(e: MouseEvent) {
      const [wx, wy] = toWorld(e)
      const hit = hitTest(wx, wy)
      if (hit) {
        dragRef.current = { node: hit, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 }
        hit.fx = hit.x; hit.fy = hit.y
        simRef.current?.alphaTarget(0.3).restart()
      } else {
        const tf = transformRef.current
        dragRef.current = { node: null, panning: true, startX: e.clientX, startY: e.clientY, startTx: tf.x, startTy: tf.y }
        canvas!.style.cursor = "grabbing"
      }
    }

    function onMouseUp() {
      const dr = dragRef.current
      if (dr.node) {
        dr.node.fx = null; dr.node.fy = null
        simRef.current?.alphaTarget(0)
      }
      dragRef.current = { node: null, panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 }
      canvas!.style.cursor = hoveredRef.current ? "pointer" : "grab"
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const rect = canvas!.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const tf = transformRef.current
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newK = Math.max(0.05, Math.min(8, tf.k * factor))
      // Zoom toward mouse position
      tf.x = mx - (mx - tf.x) * (newK / tf.k)
      tf.y = my - (my - tf.y) * (newK / tf.k)
      tf.k = newK
    }

    function onClick(e: MouseEvent) {
      const [wx, wy] = toWorld(e)
      const hit = hitTest(wx, wy)
      if (hit) window.open(`/editor?search=${encodeURIComponent(hit.name)}`, "_blank")
    }

    canvas.addEventListener("mousemove", onMouseMove)
    canvas.addEventListener("mousedown", onMouseDown)
    canvas.addEventListener("mouseup", onMouseUp)
    canvas.addEventListener("mouseleave", onMouseUp)
    canvas.addEventListener("wheel", onWheel, { passive: false })
    canvas.addEventListener("click", onClick)
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove)
      canvas.removeEventListener("mousedown", onMouseDown)
      canvas.removeEventListener("mouseup", onMouseUp)
      canvas.removeEventListener("mouseleave", onMouseUp)
      canvas.removeEventListener("wheel", onWheel)
      canvas.removeEventListener("click", onClick)
    }
  }, [])

  // Start animation loop once
  useEffect(() => {
    animRef.current = requestAnimationFrame(renderCanvas)
    return () => cancelAnimationFrame(animRef.current)
  }, [renderCanvas])

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

  // Rebuild when data/controls change
  useEffect(() => {
    if (!loading && allDataRef.current.nodes.length > 0) {
      const t = setTimeout(buildGraph, 50)
      return () => clearTimeout(t)
    }
  }, [loading, buildGraph])

  const THRESHOLDS = [
    { label: "All", value: 0 }, { label: "$10K+", value: 10000 },
    { label: "$100K+", value: 100000 }, { label: "$1M+", value: 1000000 }, { label: "$10M+", value: 10000000 },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] flex-wrap">
        <h1 className="text-sm font-bold tracking-wider text-[#f59e0b]">MONEY TRAIL</h1>
        <span className="text-[9px] text-[var(--color-text-dim)]">
          {stats.totalEdges || 0} edges | {stats.totalDonors || 0} donors | {stats.totalPoliticians || 0} politicians | {stats.bothSidesCount || 0} both-sides
        </span>
        {hoveredName && <span className="text-[10px] text-[var(--color-text)] ml-2 font-mono">{hoveredName}{hoveredAmt > 0 ? ` — ${formatAmt(hoveredAmt)}` : ""}</span>}
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] flex-wrap">
        {(["all", "Democrat", "Republican", "donors", "both-sides"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[8px] px-2 py-1 rounded border transition-all ${filter === f ? "border-[#f59e0b] bg-[#f59e0b]/15 text-[#f59e0b]" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
            {f === "all" ? "All" : f === "both-sides" ? "Both Sides" : f === "donors" ? "Donors Only" : f}
          </button>
        ))}
        <span className="w-px h-4 bg-[var(--color-border)]" />
        {(["all", "monetary", "government-contract", "political-opposition"] as const).map(f => (
          <button key={f} onClick={() => setEdgeFilter(f)}
            className={`text-[8px] px-2 py-1 rounded border transition-all ${edgeFilter === f
              ? `border-current ${f === "monetary" ? "text-[#22c55e] bg-[#22c55e]/15" : f === "government-contract" ? "text-[#3b82f6] bg-[#3b82f6]/15" : f === "political-opposition" ? "text-[#ef4444] bg-[#ef4444]/15" : "text-[#f59e0b] bg-[#f59e0b]/15"}`
              : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
            {f === "all" ? "All Types" : f === "monetary" ? "Money" : f === "government-contract" ? "Contracts" : "Opposition"}
          </button>
        ))}
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <span className="text-[7px] text-[var(--color-text-dim)] uppercase">Min:</span>
        {THRESHOLDS.map(t => (
          <button key={t.value} onClick={() => setMinAmount(t.value)}
            className={`text-[8px] px-1.5 py-1 rounded border transition-all ${minAmount === t.value ? "border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
            {t.label}
          </button>
        ))}
        <span className="w-px h-4 bg-[var(--color-border)]" />
        <span className="text-[8px] text-[var(--color-text-dim)]">Nodes:</span>
        <input type="range" min={20} max={300} value={maxNodes} onChange={e => setMaxNodes(parseInt(e.target.value))} className="w-20 h-1 accent-[#f59e0b]" />
        <span className="text-[8px] text-[var(--color-text-dim)] w-8">{maxNodes}</span>
      </div>

      <div className="px-4 py-1.5 border-b border-[var(--color-border)] text-[8px] text-[var(--color-text-dim)]">
        Node size = dollar amount. <span className="text-[#22c55e]">Green</span> = donations, <span className="text-[#3b82f6]">blue</span> = contracts, <span className="text-[#ef4444]">red</span> = opposition. Drag nodes, scroll zoom, click to open.
      </div>

      <div ref={containerRef} className="flex-1 relative bg-[#0c0c0f]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-dim)] text-sm animate-pulse">Loading edges...</div>
        ) : (
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        )}
      </div>
    </div>
  )
}
