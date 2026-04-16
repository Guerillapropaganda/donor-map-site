"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface MoneyNode {
  id: string; name: string; type: string; party?: string; sector?: string
  degree: number; totalAmount: number; bothSides: boolean
  // Layout (computed client-side)
  x?: number; y?: number; r?: number
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

const PARTY_COLORS: Record<string, string> = {
  Democrat: "#3b82f6", Republican: "#ef4444",
}

function getNodeColor(n: MoneyNode): string {
  if (n.type === "politician") return PARTY_COLORS[n.party || ""] || "#888"
  if (n.bothSides) return "#f59e0b"
  return TYPE_COLORS[n.type] || "#7a7a86"
}

const EDGE_TYPE_COLORS: Record<string, string> = {
  monetary: "#22c55e",
  "government-contract": "#3b82f6",
  "political-opposition": "#ef4444",
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
  const [stats, setStats] = useState<Record<string, number | unknown>>({})
  const [hovered, setHovered] = useState<MoneyNode | null>(null)
  const [maxNodes, setMaxNodes] = useState(150)
  const [filter, setFilter] = useState<FilterMode>("all")
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all")
  const [minAmount, setMinAmount] = useState(0)
  const allDataRef = useRef<{ nodes: MoneyNode[]; edges: MoneyEdge[] }>({ nodes: [], edges: [] })

  // Layout state
  const layoutRef = useRef<{ nodes: MoneyNode[]; edges: MoneyEdge[]; zoom: number; panX: number; panY: number }>({
    nodes: [], edges: [], zoom: 1, panX: 0, panY: 0,
  })
  const dragRef = useRef<{ dragging: boolean; node: MoneyNode | null; lastX: number; lastY: number; panning: boolean }>({
    dragging: false, node: null, lastX: 0, lastY: 0, panning: false,
  })
  const animRef = useRef<number>(0)

  const buildLayout = useCallback(() => {
    const { nodes: allNodes, edges: allEdges } = allDataRef.current
    if (allNodes.length === 0) return

    // Filter edges by type
    let filteredEdges = allEdges
    if (edgeFilter !== "all") {
      filteredEdges = allEdges.filter(e => e.edgeType === edgeFilter)
    }
    if (minAmount > 0) {
      filteredEdges = filteredEdges.filter(e => e.amount >= minAmount)
    }

    // Get connected node IDs from filtered edges
    const connectedIds = new Set<string>()
    for (const e of filteredEdges) {
      connectedIds.add(e.source)
      connectedIds.add(e.target)
    }

    // Filter nodes
    let filtered = allNodes.filter(n => connectedIds.has(n.id))

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

    // Sort by totalAmount (not degree) and take top N
    filtered.sort((a, b) => b.totalAmount - a.totalAmount)
    filtered = filtered.slice(0, maxNodes)
    const nodeIds = new Set(filtered.map(n => n.id))

    // Filter edges to visible nodes only
    const visibleEdges = filteredEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

    // Compute node radius from totalAmount (log scale)
    const maxAmt = Math.max(1, ...filtered.map(n => n.totalAmount))
    const logMax = Math.log10(maxAmt + 1)
    for (const n of filtered) {
      const logAmt = n.totalAmount > 0 ? Math.log10(n.totalAmount + 1) : 0
      n.r = 4 + (logAmt / logMax) * 22
    }

    // Simple force-directed layout using basic spring physics (no D3)
    const w = containerRef.current?.clientWidth || 1200
    const h = containerRef.current?.clientHeight || 700

    // Initialize positions randomly if not set
    for (const n of filtered) {
      if (n.x === undefined) {
        n.x = w / 2 + (Math.random() - 0.5) * w * 0.6
        n.y = h / 2 + (Math.random() - 0.5) * h * 0.6
      }
    }

    // Run physics for a fixed number of iterations (deterministic, instant)
    const nodeMap = new Map(filtered.map(n => [n.id, n]))
    const ITERATIONS = 120
    const REPULSION = 800
    const SPRING = 0.005
    const DAMPING = 0.85
    const vx = new Map<string, number>()
    const vy = new Map<string, number>()
    for (const n of filtered) { vx.set(n.id, 0); vy.set(n.id, 0) }

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const cooling = 1 - iter / ITERATIONS

      // Repulsion (all pairs — but capped at 300 nodes this is fine)
      for (let i = 0; i < filtered.length; i++) {
        for (let j = i + 1; j < filtered.length; j++) {
          const a = filtered[i], b = filtered[j]
          const dx = (a.x! - b.x!) || 0.1
          const dy = (a.y! - b.y!) || 0.1
          const dist2 = dx * dx + dy * dy
          const dist = Math.sqrt(dist2) || 1
          const force = REPULSION * cooling / dist2
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          vx.set(a.id, (vx.get(a.id) || 0) + fx)
          vy.set(a.id, (vy.get(a.id) || 0) + fy)
          vx.set(b.id, (vx.get(b.id) || 0) - fx)
          vy.set(b.id, (vy.get(b.id) || 0) - fy)
        }
      }

      // Spring attraction (edges)
      for (const e of visibleEdges) {
        const a = nodeMap.get(e.source)
        const b = nodeMap.get(e.target)
        if (!a || !b) continue
        const dx = (b.x! - a.x!) || 0
        const dy = (b.y! - a.y!) || 0
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = SPRING * (dist - 80) * cooling
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        vx.set(a.id, (vx.get(a.id) || 0) + fx)
        vy.set(a.id, (vy.get(a.id) || 0) + fy)
        vx.set(b.id, (vx.get(b.id) || 0) - fx)
        vy.set(b.id, (vy.get(b.id) || 0) - fy)
      }

      // Center gravity
      for (const n of filtered) {
        vx.set(n.id, (vx.get(n.id) || 0) + (w / 2 - n.x!) * 0.001 * cooling)
        vy.set(n.id, (vy.get(n.id) || 0) + (h / 2 - n.y!) * 0.001 * cooling)
      }

      // Apply velocities with damping
      for (const n of filtered) {
        const nvx = (vx.get(n.id) || 0) * DAMPING
        const nvy = (vy.get(n.id) || 0) * DAMPING
        n.x = (n.x || 0) + nvx
        n.y = (n.y || 0) + nvy
        vx.set(n.id, nvx)
        vy.set(n.id, nvy)
        // Bounds
        n.x = Math.max(n.r!, Math.min(w - n.r!, n.x!))
        n.y = Math.max(n.r!, Math.min(h - n.r!, n.y!))
      }
    }

    layoutRef.current = { nodes: filtered, edges: visibleEdges, zoom: 1, panX: 0, panY: 0 }
    render()
  }, [maxNodes, filter, edgeFilter, minAmount])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = containerRef.current?.clientWidth || 1200
    const h = containerRef.current?.clientHeight || 700
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + "px"
    canvas.style.height = h + "px"
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { nodes, edges, zoom, panX, panY } = layoutRef.current

    // Background
    ctx.fillStyle = "#0c0c0f"
    ctx.fillRect(0, 0, w, h)

    ctx.save()
    ctx.translate(panX + w / 2, panY + h / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-w / 2, -h / 2)

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const hoveredId = hovered?.id

    // Draw edges
    for (const e of edges) {
      const a = nodeMap.get(e.source)
      const b = nodeMap.get(e.target)
      if (!a || !b) continue

      const isHighlighted = hoveredId === a.id || hoveredId === b.id
      ctx.beginPath()
      ctx.moveTo(a.x!, a.y!)
      ctx.lineTo(b.x!, b.y!)
      ctx.strokeStyle = EDGE_TYPE_COLORS[e.edgeType] || "#f59e0b"
      ctx.globalAlpha = isHighlighted ? 0.6 : (hoveredId ? 0.04 : 0.12)
      ctx.lineWidth = isHighlighted ? 2 : 0.5 + Math.min(e.amount / 1e7, 2)
      if (e.edgeType === "political-opposition") {
        ctx.setLineDash([4, 3])
      } else {
        ctx.setLineDash([])
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    }

    // Draw nodes
    for (const n of nodes) {
      const isHovered = n.id === hoveredId
      const isConnected = hoveredId ? edges.some(e =>
        (e.source === hoveredId && e.target === n.id) ||
        (e.target === hoveredId && e.source === n.id)
      ) : false
      const dimmed = hoveredId && !isHovered && !isConnected

      const color = getNodeColor(n)
      const r = n.r || 5

      // Node circle
      ctx.beginPath()
      ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.globalAlpha = dimmed ? 0.08 : (isHovered ? 1 : 0.8)
      ctx.fill()
      ctx.globalAlpha = 1

      // Border
      ctx.beginPath()
      ctx.arc(n.x!, n.y!, r, 0, 2 * Math.PI)
      ctx.strokeStyle = color
      ctx.lineWidth = isHovered ? 2.5 : (n.bothSides ? 2 : 1)
      ctx.globalAlpha = dimmed ? 0.05 : (isHovered ? 1 : 0.4)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Both-sides dashed ring
      if (n.bothSides && !dimmed) {
        ctx.beginPath()
        ctx.arc(n.x!, n.y!, r + 4, 0, 2 * Math.PI)
        ctx.strokeStyle = "#f59e0b"
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.4
        ctx.setLineDash([3, 2])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }

      // Label (show for large nodes or when hovered/connected)
      const showLabel = r >= 10 || isHovered || isConnected
      if (showLabel && !dimmed) {
        const label = n.name.length > 20 ? n.name.slice(0, 18) + ".." : n.name
        ctx.font = isHovered ? 'bold 11px "Space Mono", ui-monospace, monospace' : '9px "Space Mono", ui-monospace, monospace'
        ctx.fillStyle = isHovered ? "#fff" : color
        ctx.globalAlpha = isHovered ? 1 : (isConnected ? 0.9 : 0.5)
        ctx.textAlign = "center"
        ctx.fillText(label, n.x!, n.y! + r + 11)

        // Amount label for hovered/connected
        if ((isHovered || isConnected) && n.totalAmount > 0) {
          ctx.font = 'bold 9px "Space Mono", ui-monospace, monospace'
          ctx.fillStyle = "#22c55e"
          ctx.globalAlpha = 0.9
          ctx.fillText(formatAmt(n.totalAmount), n.x!, n.y! + r + 21)
        }
        ctx.globalAlpha = 1
      }
    }

    ctx.restore()

    // Legend (fixed position)
    const legendY = h - 16
    const legends = [
      { label: "Funded", color: "#22c55e" },
      { label: "Contracts", color: "#3b82f6" },
      { label: "Opposes", color: "#ef4444" },
      { label: "Democrat", color: "#3b82f6" },
      { label: "Republican", color: "#ef4444" },
      { label: "Both Sides", color: "#f59e0b" },
    ]
    ctx.font = '8px "Space Mono", ui-monospace, monospace'
    let lx = 10
    for (const l of legends) {
      ctx.fillStyle = l.color
      ctx.globalAlpha = 0.7
      ctx.fillRect(lx, legendY - 6, 8, 8)
      ctx.fillStyle = "#888"
      ctx.globalAlpha = 0.6
      ctx.textAlign = "left"
      ctx.fillText(l.label, lx + 10, legendY + 1)
      lx += ctx.measureText(l.label).width + 22
      ctx.globalAlpha = 1
    }
  }, [hovered])

  // Mouse interaction
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function getMousePos(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      const { zoom, panX, panY } = layoutRef.current
      const w = rect.width, h = rect.height
      const mx = (e.clientX - rect.left - panX - w / 2) / zoom + w / 2
      const my = (e.clientY - rect.top - panY - h / 2) / zoom + h / 2
      return { mx, my }
    }

    function findNode(mx: number, my: number): MoneyNode | null {
      for (const n of layoutRef.current.nodes) {
        const dist = Math.sqrt((mx - n.x!) ** 2 + (my - n.y!) ** 2)
        if (dist <= (n.r || 5) + 3) return n
      }
      return null
    }

    function onMouseMove(e: MouseEvent) {
      const { mx, my } = getMousePos(e)
      const dr = dragRef.current

      if (dr.panning) {
        layoutRef.current.panX += e.clientX - dr.lastX
        layoutRef.current.panY += e.clientY - dr.lastY
        dr.lastX = e.clientX
        dr.lastY = e.clientY
        render()
        return
      }

      if (dr.dragging && dr.node) {
        dr.node.x = mx
        dr.node.y = my
        render()
        return
      }

      const node = findNode(mx, my)
      canvas!.style.cursor = node ? "pointer" : "grab"
      setHovered(node)
    }

    function onMouseDown(e: MouseEvent) {
      const { mx, my } = getMousePos(e)
      const node = findNode(mx, my)
      const dr = dragRef.current

      if (node) {
        dr.dragging = true
        dr.node = node
      } else {
        dr.panning = true
        dr.lastX = e.clientX
        dr.lastY = e.clientY
      }
    }

    function onMouseUp() {
      dragRef.current.dragging = false
      dragRef.current.node = null
      dragRef.current.panning = false
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      layoutRef.current.zoom = Math.max(0.1, Math.min(5, layoutRef.current.zoom * delta))
      render()
    }

    function onClick(e: MouseEvent) {
      const { mx, my } = getMousePos(e)
      const node = findNode(mx, my)
      if (node && !dragRef.current.dragging) {
        window.open(`/profile?path=${encodeURIComponent(node.id)}`, "_blank")
      }
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
  }, [render])

  // Re-render when hovered changes
  useEffect(() => { render() }, [hovered, render])

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

  // Rebuild layout when data/controls change
  useEffect(() => {
    if (!loading && allDataRef.current.nodes.length > 0) {
      const t = setTimeout(buildLayout, 50)
      return () => clearTimeout(t)
    }
  }, [loading, buildLayout])

  const AMOUNT_THRESHOLDS = [
    { label: "All", value: 0 },
    { label: "$10K+", value: 10000 },
    { label: "$100K+", value: 100000 },
    { label: "$1M+", value: 1000000 },
    { label: "$10M+", value: 10000000 },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] flex-wrap">
        <h1 className="text-sm font-bold tracking-wider text-[#f59e0b]">MONEY TRAIL</h1>
        <span className="text-[9px] text-[var(--color-text-dim)]">
          {(stats as Record<string, number>).totalEdges || 0} edges | {(stats as Record<string, number>).totalDonors || 0} donors | {(stats as Record<string, number>).totalPoliticians || 0} politicians | {(stats as Record<string, number>).bothSidesCount || 0} both-sides
        </span>
        {hovered && (
          <span className="text-[10px] text-[var(--color-text)] ml-2 font-mono">
            {hovered.name} {hovered.totalAmount > 0 ? `— ${formatAmt(hovered.totalAmount)}` : ""} ({hovered.degree} connections)
          </span>
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

        {/* Edge type filter */}
        {(["all", "monetary", "government-contract", "political-opposition"] as const).map(f => (
          <button key={f} onClick={() => setEdgeFilter(f)}
            className={`text-[8px] px-2 py-1 rounded border transition-all ${edgeFilter === f
              ? `border-current ${f === "monetary" ? "text-[#22c55e] bg-[#22c55e]/15" : f === "government-contract" ? "text-[#3b82f6] bg-[#3b82f6]/15" : f === "political-opposition" ? "text-[#ef4444] bg-[#ef4444]/15" : "text-[#f59e0b] bg-[#f59e0b]/15"}`
              : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
            {f === "all" ? "All Types" : f === "monetary" ? "Money" : f === "government-contract" ? "Contracts" : "Opposition"}
          </button>
        ))}

        <span className="w-px h-4 bg-[var(--color-border)]" />

        {/* Amount threshold */}
        <span className="text-[7px] text-[var(--color-text-dim)] uppercase">Min:</span>
        {AMOUNT_THRESHOLDS.map(t => (
          <button key={t.value} onClick={() => setMinAmount(t.value)}
            className={`text-[8px] px-1.5 py-1 rounded border transition-all ${minAmount === t.value ? "border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
            {t.label}
          </button>
        ))}

        <span className="w-px h-4 bg-[var(--color-border)]" />

        {/* Node count */}
        <span className="text-[8px] text-[var(--color-text-dim)]">Nodes:</span>
        <input type="range" min={20} max={300} value={maxNodes} onChange={e => setMaxNodes(parseInt(e.target.value))}
          className="w-20 h-1 accent-[#f59e0b]" />
        <span className="text-[8px] text-[var(--color-text-dim)] w-8">{maxNodes}</span>
      </div>

      {/* Explainer */}
      <div className="px-4 py-1.5 border-b border-[var(--color-border)] text-[8px] text-[var(--color-text-dim)]">
        Node size = total dollar amount (log scale). Edges colored by type: <span className="text-[#22c55e]">green</span> = donations, <span className="text-[#3b82f6]">blue</span> = contracts, <span className="text-[#ef4444]">red</span> = opposition. Drag nodes, scroll to zoom, click to open profile.
      </div>

      {/* Canvas graph */}
      <div ref={containerRef} className="flex-1 relative bg-[#0c0c0f]">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--color-text-dim)] text-sm animate-pulse">
            Loading edges...
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        )}
      </div>
    </div>
  )
}
