"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface FlowNode {
  id: string
  label: string
  type: "donor" | "politician" | "committee" | "bill" | "lobbying-firm" | "pac"
  party?: string
  amount?: string
  meta?: Record<string, string>
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number | null
  fy?: number | null
}

interface FlowEdge {
  source: string
  target: string
  label?: string
  amount?: string
  type: "funds" | "serves-on" | "sponsors" | "lobbies" | "contracts"
}

const NODE_COLORS: Record<string, string> = {
  donor: "#f59e0b",
  politician: "#5b8dce",
  committee: "#22c55e",
  bill: "#a855f7",
  "lobbying-firm": "#ef4444",
  pac: "#f97316",
}

const EDGE_COLORS: Record<string, string> = {
  funds: "#f59e0b",
  "serves-on": "#22c55e",
  sponsors: "#a855f7",
  lobbies: "#ef4444",
  contracts: "#f97316",
}

export default function MoneyTrailPage() {
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<FlowEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [profileName, setProfileName] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [allProfiles, setAllProfiles] = useState<string[]>([])
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<FlowNode[]>([])
  const edgesRef = useRef<FlowEdge[]>([])
  const animRef = useRef<number>(0)
  const offsetRef = useRef({ x: 0, y: 0 })
  const scaleRef = useRef(1)

  // Load profile list for search
  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((data) => {
        const names = (data.profiles || [])
          .filter((p: { type: string }) => ["politician", "donor", "corporation"].includes(p.type))
          .map((p: { title: string }) => p.title.replace(/^_/, "").replace(/ Master Profile$/, ""))
          .sort()
        setAllProfiles(names)
      })
      .catch(() => {})
  }, [])

  const loadData = useCallback((name?: string) => {
    setLoading(true)
    const url = name ? `/api/money-trail?profile=${encodeURIComponent(name)}` : "/api/money-trail"
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoading(false); return }
        // Layout: position nodes by type in columns
        const byType: Record<string, FlowNode[]> = {}
        for (const n of data.nodes || []) {
          const t = n.type
          if (!byType[t]) byType[t] = []
          byType[t].push(n)
        }
        const colOrder = ["donor", "pac", "politician", "committee", "bill", "lobbying-firm"]
        const canvas = canvasRef.current
        const w = canvas?.width || 1200
        const h = canvas?.height || 700
        let col = 0
        const totalCols = colOrder.filter((c) => byType[c]?.length).length || 1

        for (const type of colOrder) {
          const group = byType[type]
          if (!group || group.length === 0) continue
          const cx = (w * (col + 0.5)) / totalCols
          for (let i = 0; i < group.length; i++) {
            group[i].x = cx + (Math.random() - 0.5) * 80
            group[i].y = (h * (i + 1)) / (group.length + 1) + (Math.random() - 0.5) * 30
            group[i].vx = 0
            group[i].vy = 0
          }
          col++
        }

        const allNodes = data.nodes || []
        setNodes(allNodes)
        setEdges(data.edges || [])
        nodesRef.current = allNodes
        edgesRef.current = data.edges || []
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Force simulation
  useEffect(() => {
    const simulate = () => {
      const ns = nodesRef.current
      const es = edgesRef.current
      if (ns.length === 0) { animRef.current = requestAnimationFrame(simulate); return }

      const canvas = canvasRef.current
      if (!canvas) { animRef.current = requestAnimationFrame(simulate); return }
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Force: repulsion between nodes
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = (ns[j].x || 0) - (ns[i].x || 0)
          const dy = (ns[j].y || 0) - (ns[i].y || 0)
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 800 / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          if (!ns[i].fx) { ns[i].vx = (ns[i].vx || 0) - fx; ns[i].vy = (ns[i].vy || 0) - fy }
          if (!ns[j].fx) { ns[j].vx = (ns[j].vx || 0) + fx; ns[j].vy = (ns[j].vy || 0) + fy }
        }
      }

      // Force: attraction along edges
      const nodeMap = new Map(ns.map((n) => [n.id, n]))
      for (const e of es) {
        const s = nodeMap.get(e.source)
        const t = nodeMap.get(e.target)
        if (!s || !t) continue
        const dx = (t.x || 0) - (s.x || 0)
        const dy = (t.y || 0) - (s.y || 0)
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 150) * 0.005
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        if (!s.fx) { s.vx = (s.vx || 0) + fx; s.vy = (s.vy || 0) + fy }
        if (!t.fx) { t.vx = (t.vx || 0) - fx; t.vy = (t.vy || 0) - fy }
      }

      // Apply velocity with damping
      for (const n of ns) {
        if (n.fx != null) { n.x = n.fx; n.y = n.fy || 0; continue }
        n.vx = (n.vx || 0) * 0.85
        n.vy = (n.vy || 0) * 0.85
        n.x = (n.x || 0) + (n.vx || 0)
        n.y = (n.y || 0) + (n.vy || 0)
        // Boundary
        n.x = Math.max(40, Math.min(canvas.width - 40, n.x || 0))
        n.y = Math.max(40, Math.min(canvas.height - 40, n.y || 0))
      }

      // Draw
      const scale = scaleRef.current
      const ox = offsetRef.current.x
      const oy = offsetRef.current.y
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(ox, oy)
      ctx.scale(scale, scale)

      // Edges
      for (const e of es) {
        const s = nodeMap.get(e.source)
        const t = nodeMap.get(e.target)
        if (!s || !t) continue
        const isHovered = hovered === e.source || hovered === e.target
        ctx.beginPath()
        ctx.moveTo(s.x || 0, s.y || 0)
        ctx.lineTo(t.x || 0, t.y || 0)
        ctx.strokeStyle = isHovered ? (EDGE_COLORS[e.type] || "#444") : "#333"
        ctx.lineWidth = isHovered ? 2 : 1
        ctx.globalAlpha = isHovered ? 1 : 0.4
        ctx.stroke()
        ctx.globalAlpha = 1

        // Arrow
        const angle = Math.atan2((t.y || 0) - (s.y || 0), (t.x || 0) - (s.x || 0))
        const arrowX = (t.x || 0) - Math.cos(angle) * 18
        const arrowY = (t.y || 0) - Math.sin(angle) * 18
        ctx.beginPath()
        ctx.moveTo(arrowX, arrowY)
        ctx.lineTo(arrowX - Math.cos(angle - 0.3) * 8, arrowY - Math.sin(angle - 0.3) * 8)
        ctx.lineTo(arrowX - Math.cos(angle + 0.3) * 8, arrowY - Math.sin(angle + 0.3) * 8)
        ctx.closePath()
        ctx.fillStyle = isHovered ? (EDGE_COLORS[e.type] || "#444") : "#444"
        ctx.globalAlpha = isHovered ? 1 : 0.4
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // Nodes
      for (const n of ns) {
        const isHovered = hovered === n.id
        const r = isHovered ? 16 : 12
        let color = NODE_COLORS[n.type] || "#888"
        if (n.type === "politician") {
          color = n.party === "Democrat" ? "#3b82f6" : n.party === "Republican" ? "#ef4444" : "#888"
        }

        // Glow
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(n.x || 0, n.y || 0, r + 4, 0, Math.PI * 2)
          ctx.fillStyle = color + "33"
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x || 0, n.y || 0, r, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()
        ctx.strokeStyle = "#0c0c0f"
        ctx.lineWidth = 2
        ctx.stroke()

        // Label
        ctx.fillStyle = "#e0e0e0"
        ctx.font = isHovered ? "bold 11px Space Mono, monospace" : "10px Space Mono, monospace"
        ctx.textAlign = "center"
        ctx.fillText(n.label.length > 25 ? n.label.slice(0, 22) + "..." : n.label, n.x || 0, (n.y || 0) + r + 14)

        // Amount
        if (n.amount && isHovered) {
          ctx.fillStyle = "#f59e0b"
          ctx.font = "9px Space Mono, monospace"
          ctx.fillText(String(n.amount), n.x || 0, (n.y || 0) + r + 26)
        }
      }

      ctx.restore()
      animRef.current = requestAnimationFrame(simulate)
    }

    animRef.current = requestAnimationFrame(simulate)
    return () => cancelAnimationFrame(animRef.current)
  }, [hovered])

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = scaleRef.current
    const ox = offsetRef.current.x
    const oy = offsetRef.current.y
    const mx = (e.clientX - rect.left - ox) / scale
    const my = (e.clientY - rect.top - oy) / scale

    if (dragging) {
      const n = nodesRef.current.find((n) => n.id === dragging)
      if (n) { n.fx = mx; n.fy = my; n.x = mx; n.y = my }
      return
    }

    let found: string | null = null
    for (const n of nodesRef.current) {
      const dx = (n.x || 0) - mx
      const dy = (n.y || 0) - my
      if (dx * dx + dy * dy < 256) { found = n.id; break }
    }
    setHovered(found)
    canvas.style.cursor = found ? "pointer" : "default"
  }, [dragging])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = scaleRef.current
    const ox = offsetRef.current.x
    const oy = offsetRef.current.y
    const mx = (e.clientX - rect.left - ox) / scale
    const my = (e.clientY - rect.top - oy) / scale

    for (const n of nodesRef.current) {
      const dx = (n.x || 0) - mx
      const dy = (n.y || 0) - my
      if (dx * dx + dy * dy < 256) {
        setDragging(n.id)
        n.fx = mx
        n.fy = my
        return
      }
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      const n = nodesRef.current.find((n) => n.id === dragging)
      if (n) { n.fx = null; n.fy = null }
      setDragging(null)
    }
  }, [dragging])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    scaleRef.current = Math.max(0.3, Math.min(3, scaleRef.current * delta))
  }, [])

  const handleSearch = (q: string) => {
    setSearch(q)
    if (q.length > 1) {
      const lower = q.toLowerCase()
      setSuggestions(allProfiles.filter((p) => p.toLowerCase().includes(lower)).slice(0, 10))
    } else {
      setSuggestions([])
    }
  }

  const selectProfile = (name: string) => {
    setProfileName(name)
    setSearch(name)
    setSuggestions([])
    loadData(name)
  }

  // Resize canvas
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)]">
        <h1 className="text-sm font-bold tracking-wider text-[var(--color-steel)]">MONEY TRAIL</h1>
        <span className="text-[9px] text-[var(--color-text-dim)]">Follow the money: donor → politician → committee → bill</span>
        <div className="ml-auto relative">
          <input
            type="text"
            placeholder="Search profile..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] w-64"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded shadow-lg z-50 max-h-60 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => selectProfile(s)}
                  className="w-full text-left px-3 py-1.5 text-[10px] text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] truncate"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {profileName && (
          <button
            onClick={() => { setProfileName(""); setSearch(""); loadData() }}
            className="text-[9px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-steel)]"
          >
            Show All
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {[
          { label: "Donor", color: NODE_COLORS.donor },
          { label: "Democrat", color: "#3b82f6" },
          { label: "Republican", color: "#ef4444" },
          { label: "Committee", color: NODE_COLORS.committee },
          { label: "Bills", color: NODE_COLORS.bill },
          { label: "Lobbying", color: NODE_COLORS["lobbying-firm"] },
          { label: "Contracts", color: NODE_COLORS.pac },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-[var(--color-text-dim)]">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[8px] text-[var(--color-text-dim)]">
          {nodes.length} nodes · {edges.length} edges {loading && "· Loading..."}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-[#0c0c0f]">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full"
        />
      </div>
    </div>
  )
}
