"use client"

import { useState, useEffect, useRef } from "react"

interface MoneyNode {
  id: string; name: string; type: string; party?: string; sector?: string
  degree: number; totalAmount: number; bothSides: boolean
  x: number; y: number; vx: number; vy: number; r: number
}

interface MoneyEdge {
  source: string; target: string; confidence: number
  amount: number; cycle: string; edgeType: string
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
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [hoveredName, setHoveredName] = useState("")
  const [hoveredAmt, setHoveredAmt] = useState(0)
  const [maxNodes, setMaxNodes] = useState(150)
  const [filter, setFilter] = useState<FilterMode>("all")
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all")
  const [minAmount, setMinAmount] = useState(0)

  // All mutable state in refs (not React state) so the animation loop doesn't re-render React
  const nodesRef = useRef<MoneyNode[]>([])
  const edgesRef = useRef<MoneyEdge[]>([])
  const allDataRef = useRef<{ nodes: MoneyNode[]; edges: MoneyEdge[] }>({ nodes: [], edges: [] })
  const zoomRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const hoveredRef = useRef<string | null>(null)
  const dragRef = useRef<{ active: boolean; nodeId: string | null; panning: boolean; lastX: number; lastY: number }>({
    active: false, nodeId: null, panning: false, lastX: 0, lastY: 0,
  })
  const physicsRef = useRef({ running: true, alpha: 1 })
  const animFrameRef = useRef(0)

  // Build layout when controls change
  useEffect(() => {
    if (loading) return
    const { nodes: allNodes, edges: allEdges } = allDataRef.current
    if (allNodes.length === 0) return

    // Filter edges
    let filteredEdges = allEdges
    if (edgeFilter !== "all") filteredEdges = allEdges.filter(e => e.edgeType === edgeFilter)
    if (minAmount > 0) filteredEdges = filteredEdges.filter(e => e.amount >= minAmount)

    const connectedIds = new Set<string>()
    for (const e of filteredEdges) { connectedIds.add(e.source); connectedIds.add(e.target) }

    let filtered = allNodes.filter(n => connectedIds.has(n.id))

    // Party/type filter
    if (filter === "Democrat" || filter === "Republican") {
      const partyPols = new Set(filtered.filter(n => n.type === "politician" && n.party === filter).map(n => n.id))
      const connected = new Set<string>()
      for (const e of filteredEdges) {
        if (partyPols.has(e.source)) connected.add(e.target)
        if (partyPols.has(e.target)) connected.add(e.source)
      }
      filtered = filtered.filter(n => partyPols.has(n.id) || connected.has(n.id))
    } else if (filter === "donors") {
      const donors = new Set(filtered.filter(n => n.type !== "politician").map(n => n.id))
      const connected = new Set<string>()
      for (const e of filteredEdges) {
        if (donors.has(e.source)) connected.add(e.target)
        if (donors.has(e.target)) connected.add(e.source)
      }
      filtered = filtered.filter(n => donors.has(n.id) || connected.has(n.id))
    } else if (filter === "both-sides") {
      const bs = new Set(filtered.filter(n => n.bothSides).map(n => n.id))
      const connected = new Set<string>()
      for (const e of filteredEdges) {
        if (bs.has(e.source)) connected.add(e.target)
        if (bs.has(e.target)) connected.add(e.source)
      }
      filtered = filtered.filter(n => bs.has(n.id) || connected.has(n.id))
    }

    // Top N by amount
    filtered.sort((a, b) => b.totalAmount - a.totalAmount)
    filtered = filtered.slice(0, maxNodes)
    const nodeIds = new Set(filtered.map(n => n.id))
    const visibleEdges = filteredEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

    // Node radius (log scale)
    const maxAmt = Math.max(1, ...filtered.map(n => n.totalAmount))
    const logMax = Math.log10(maxAmt + 1)
    const w = containerRef.current?.clientWidth || 1200
    const h = containerRef.current?.clientHeight || 700

    const layoutNodes: MoneyNode[] = filtered.map(n => ({
      ...n,
      r: 4 + (n.totalAmount > 0 ? Math.log10(n.totalAmount + 1) / logMax : 0) * 22,
      x: n.x ?? w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: n.y ?? h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: 0, vy: 0,
    }))

    nodesRef.current = layoutNodes
    edgesRef.current = visibleEdges
    physicsRef.current = { running: true, alpha: 1 }
  }, [loading, maxNodes, filter, edgeFilter, minAmount])

  // Animation loop — runs physics + renders canvas every frame
  useEffect(() => {
    let running = true

    function frame() {
      if (!running) return
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) { animFrameRef.current = requestAnimationFrame(frame); return }

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const w = container.clientWidth
      const h = container.clientHeight
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
        canvas.style.width = w + "px"
        canvas.style.height = h + "px"
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const nodes = nodesRef.current
      const edges = edgesRef.current
      const zoom = zoomRef.current
      const pan = panRef.current
      const hovId = hoveredRef.current
      const physics = physicsRef.current
      const nodeMap = new Map(nodes.map(n => [n.id, n]))

      // Physics step
      if (physics.running && physics.alpha > 0.001) {
        physics.alpha *= 0.985
        const alpha = physics.alpha

        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j]
            const dx = (a.x - b.x) || 0.1
            const dy = (a.y - b.y) || 0.1
            const dist2 = dx * dx + dy * dy
            const dist = Math.sqrt(dist2)
            const force = 600 * alpha / dist2
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx += fx; a.vy += fy
            b.vx -= fx; b.vy -= fy
          }
        }

        // Springs
        for (const e of edges) {
          const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
          if (!a || !b) continue
          const dx = b.x - a.x, dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 0.008 * (dist - 80) * alpha
          a.vx += (dx / dist) * force; a.vy += (dy / dist) * force
          b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force
        }

        // Center gravity + apply
        for (const n of nodes) {
          if (dragRef.current.nodeId === n.id) continue // skip dragged node
          n.vx += (w / 2 - n.x) * 0.0005 * alpha
          n.vy += (h / 2 - n.y) * 0.0005 * alpha
          n.vx *= 0.8; n.vy *= 0.8
          n.x += n.vx; n.y += n.vy
          n.x = Math.max(n.r, Math.min(w - n.r, n.x))
          n.y = Math.max(n.r, Math.min(h - n.r, n.y))
        }
      }

      // ─── RENDER ───
      ctx.fillStyle = "#0c0c0f"
      ctx.fillRect(0, 0, w, h)
      ctx.save()
      ctx.translate(w / 2 + pan.x, h / 2 + pan.y)
      ctx.scale(zoom, zoom)
      ctx.translate(-w / 2, -h / 2)

      const t = Date.now() * 0.001 // for flow animation

      // Edges
      for (let ei = 0; ei < edges.length; ei++) {
        const e = edges[ei]
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
        if (!a || !b) continue
        const isHl = hovId === a.id || hovId === b.id

        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = EDGE_COLORS[e.edgeType] || "#f59e0b"
        ctx.globalAlpha = isHl ? 0.6 : (hovId ? 0.03 : 0.1)
        ctx.lineWidth = isHl ? 2 : 0.4 + Math.min(e.amount / 1e7, 1.5)
        if (e.edgeType === "political-opposition") { ctx.setLineDash([4, 3]) } else { ctx.setLineDash([]) }
        ctx.stroke()
        ctx.setLineDash([])

        // Flow dot (animated particle along edge)
        if (e.edgeType === "monetary" && (isHl || !hovId)) {
          const phase = (t * 0.4 + ei * 0.13) % 1
          const fx = a.x + (b.x - a.x) * phase
          const fy = a.y + (b.y - a.y) * phase
          ctx.beginPath()
          ctx.arc(fx, fy, isHl ? 2.5 : 1.5, 0, Math.PI * 2)
          ctx.fillStyle = EDGE_COLORS[e.edgeType] || "#f59e0b"
          ctx.globalAlpha = isHl ? 0.8 : 0.3
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // Nodes
      for (const n of nodes) {
        const isHov = n.id === hovId
        const isConn = hovId ? edges.some(e => (e.source === hovId && e.target === n.id) || (e.target === hovId && e.source === n.id)) : false
        const dim = hovId != null && !isHov && !isConn
        const color = getNodeColor(n)

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.globalAlpha = dim ? 0.06 : (isHov ? 1 : 0.8)
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = isHov ? 2.5 : 1
        ctx.globalAlpha = dim ? 0.03 : 0.4
        ctx.stroke()
        ctx.globalAlpha = 1

        if (n.bothSides && !dim) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2)
          ctx.strokeStyle = "#f59e0b"
          ctx.lineWidth = 1; ctx.globalAlpha = 0.4
          ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
        }

        // Labels
        const showLabel = zoom > 0.7 && (n.r >= 8 || isHov || isConn)
        if (showLabel && !dim) {
          const label = n.name.length > 22 ? n.name.slice(0, 20) + ".." : n.name
          ctx.font = isHov ? 'bold 11px ui-monospace, monospace' : '8px ui-monospace, monospace'
          ctx.fillStyle = isHov ? "#fff" : color
          ctx.globalAlpha = isHov ? 1 : 0.6
          ctx.textAlign = "center"
          ctx.fillText(label, n.x, n.y + n.r + 11)
          if ((isHov || isConn) && n.totalAmount > 0) {
            ctx.font = 'bold 9px ui-monospace, monospace'
            ctx.fillStyle = "#22c55e"
            ctx.fillText(formatAmt(n.totalAmount), n.x, n.y + n.r + 21)
          }
          ctx.globalAlpha = 1
        }
      }

      ctx.restore()

      // Legend
      ctx.font = '8px ui-monospace, monospace'
      let lx = 10
      for (const [label, color] of [["Funded", "#22c55e"], ["Contracts", "#3b82f6"], ["Opposes", "#ef4444"], ["Democrat", "#3b82f6"], ["Republican", "#ef4444"], ["Both Sides", "#f59e0b"]]) {
        ctx.fillStyle = color; ctx.globalAlpha = 0.7
        ctx.fillRect(lx, h - 20, 8, 8)
        ctx.fillStyle = "#888"; ctx.globalAlpha = 0.6; ctx.textAlign = "left"
        ctx.fillText(label, lx + 10, h - 13)
        lx += ctx.measureText(label).width + 22
        ctx.globalAlpha = 1
      }

      animFrameRef.current = requestAnimationFrame(frame)
    }

    animFrameRef.current = requestAnimationFrame(frame)
    return () => { running = false; cancelAnimationFrame(animFrameRef.current) }
  }, []) // empty deps — runs once, reads everything from refs

  // Mouse handlers (write to refs, not React state)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function toWorld(e: MouseEvent): [number, number] {
      const rect = canvas!.getBoundingClientRect()
      const w = rect.width, h = rect.height
      const zoom = zoomRef.current, pan = panRef.current
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const wx = (sx - w / 2 - pan.x) / zoom + w / 2
      const wy = (sy - h / 2 - pan.y) / zoom + h / 2
      return [wx, wy]
    }

    function hitTest(wx: number, wy: number): MoneyNode | null {
      for (const n of nodesRef.current) {
        if (Math.hypot(wx - n.x, wy - n.y) <= n.r + 3) return n
      }
      return null
    }

    function onMouseMove(e: MouseEvent) {
      const dr = dragRef.current
      if (dr.panning) {
        panRef.current.x += e.clientX - dr.lastX
        panRef.current.y += e.clientY - dr.lastY
        dr.lastX = e.clientX; dr.lastY = e.clientY
        return
      }
      const [wx, wy] = toWorld(e)
      if (dr.active && dr.nodeId) {
        const n = nodesRef.current.find(n => n.id === dr.nodeId)
        if (n) { n.x = wx; n.y = wy; n.vx = 0; n.vy = 0 }
        return
      }
      const hit = hitTest(wx, wy)
      hoveredRef.current = hit?.id ?? null
      canvas!.style.cursor = hit ? "pointer" : "grab"
      setHoveredName(hit?.name ?? "")
      setHoveredAmt(hit?.totalAmount ?? 0)
    }

    function onMouseDown(e: MouseEvent) {
      const [wx, wy] = toWorld(e)
      const hit = hitTest(wx, wy)
      if (hit) {
        dragRef.current = { active: true, nodeId: hit.id, panning: false, lastX: 0, lastY: 0 }
        physicsRef.current.alpha = Math.max(physicsRef.current.alpha, 0.3)
        physicsRef.current.running = true
      } else {
        dragRef.current = { active: false, nodeId: null, panning: true, lastX: e.clientX, lastY: e.clientY }
        canvas!.style.cursor = "grabbing"
      }
    }

    function onMouseUp() {
      dragRef.current = { active: false, nodeId: null, panning: false, lastX: 0, lastY: 0 }
      canvas!.style.cursor = hoveredRef.current ? "pointer" : "grab"
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.92 : 1.08
      zoomRef.current = Math.max(0.1, Math.min(5, zoomRef.current * factor))
    }

    function onClick(e: MouseEvent) {
      if (dragRef.current.active) return
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
        {hoveredName && (
          <span className="text-[10px] text-[var(--color-text)] ml-2 font-mono">
            {hoveredName}{hoveredAmt > 0 ? ` — ${formatAmt(hoveredAmt)}` : ""}
          </span>
        )}
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
        <input type="range" min={20} max={300} value={maxNodes} onChange={e => setMaxNodes(parseInt(e.target.value))}
          className="w-20 h-1 accent-[#f59e0b]" />
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
