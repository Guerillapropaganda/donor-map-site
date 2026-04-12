"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { Profile } from "@/lib/vault"
import { typeColor } from "@/lib/vault"
import {
  forceSimulation, forceManyBody, forceCenter, forceLink, forceCollide, forceX, forceY,
  select, zoom as d3Zoom, zoomIdentity, drag as d3Drag,
  type Simulation, type SimulationNodeDatum, type SimulationLinkDatum,
} from "d3"

interface Connection {
  source: string; sourcePath: string; sourceType: string
  target: string; relationshipType: "related" | "donors" | "opposes" | "stories"
}
interface ConnectedProfile {
  title: string; path: string; type: string; connectionCount: number
  related: string[]; donors: string[]; opposes: string[]; stories: string[]
}

const REL_COLORS: Record<string, string> = { related: "#5b8dce", donors: "#22c55e", opposes: "#ef4444", stories: "#ec4899" }
const REL_LABELS: Record<string, string> = { related: "Related", donors: "Funded By", opposes: "Opposes", stories: "Stories" }
const TYPE_COLORS: Record<string, string> = {
  politician: "#5b8dce", donor: "#22c55e", corporation: "#22c55e", "think-tank": "#a855f7",
  "lobbying-firm": "#f59e0b", "media-profile": "#ef4444", story: "#ec4899", unknown: "#7a7a86",
}
// Internal doc types to exclude from No Connections
const INTERNAL_TYPES = new Set(["unknown", "system", "admin-note", "index"])
const INTERNAL_TITLE_PATTERNS = [
  /^About The Donor Map$/i, /^Browse by Pattern$/i, /^Changelog$/i,
  /^Vault Rules$/i, /^Pipeline Guide$/i, /^Session State$/i,
  /^Donors & Power Networks Index$/i, /Index$/,
]

function isInternalDoc(p: ConnectedProfile): boolean {
  if (INTERNAL_TYPES.has(p.type)) return true
  if (INTERNAL_TITLE_PATTERNS.some((re) => re.test(p.title))) return true
  if (p.path.includes("Vault Maintenance/") || p.path.includes("Admin Notes/")) return true
  return false
}

export default function RelationshipsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [topConnected, setTopConnected] = useState<ConnectedProfile[]>([])
  const [unconnected, setUnconnected] = useState<ConnectedProfile[]>([])
  const [unconnectedCount, setUnconnectedCount] = useState(0)
  const [recentConnections, setRecentConnections] = useState<Connection[]>([])
  const [breakdown, setBreakdown] = useState({ related: 0, donors: 0, opposes: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  const [tab, setTab] = useState<"list" | "explorer" | "graph" | "suggestions">("list")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ConnectedProfile | null>(null)
  const [explorerPath, setExplorerPath] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Add connection state
  const [targetSearch, setTargetSearch] = useState("")
  const [relType, setRelType] = useState<"related" | "donors" | "opposes" | "stories">("related")
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("all")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [sidebarTypeFilter, setSidebarTypeFilter] = useState<string>("all")

  // Suggestions state
  interface TransparencyData { score: number; tier: string; tierColor: string; factors: { factor: string; impact: number; detail: string }[] }
  interface PartisanData { flow: number; label: string; isCrossParty: boolean; sourceLabel: string; targetLabel: string }
  interface DollarData { amount: number; display: string | null; tier: string }
  interface ContradictionData { counterpartType: string; counterpartAmount: number; counterpartDisplay: string; totalInfluence: number; ratio: number }
  interface Suggestion { id: string; source: string; sourcePath: string; target: string; targetPath: string; type: string; confidence: string; strategies: string[]; strategyCount: number; evidence: string; reasoning: string; autoCreate: boolean; discoveredAt: string; actionState?: string; actionAt?: string; actionReason?: string; transparency?: TransparencyData; partisan?: PartisanData; dollars?: DollarData; contradiction?: ContradictionData | null; note?: string; investigate?: boolean; investigateAt?: string }
  interface NewProfile { name: string; mentions: number; contexts: string[]; mentionedBy: string[]; suggestedType: string; suggestedPath: string; hasDollarContext: boolean; hasLeakContext: boolean }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [newProfiles, setNewProfiles] = useState<NewProfile[]>([])
  const [suggestionsStats, setSuggestionsStats] = useState<{ total: number; high: number; medium: number; low: number }>({ total: 0, high: 0, medium: 0, low: 0 })
  const [actionStats, setActionStats] = useState<{ approved: number; rejected: number; deferred: number }>({ approved: 0, rejected: 0, deferred: 0 })
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsScanning, setSuggestionsScanning] = useState(false)
  const [suggestionsLastScan, setSuggestionsLastScan] = useState<string | null>(null)
  const [suggestionsFilter, setSuggestionsFilter] = useState<string>("all") // confidence filter
  const [suggestionsStratFilter, setSuggestionsStratFilter] = useState<string>("all") // strategy filter
  const [suggestionsStatusFilter, setSuggestionsStatusFilter] = useState<"pending" | "all" | "acted">("pending")
  const [suggestionsTypeFilter, setSuggestionsTypeFilter] = useState<string>("all") // connection type
  const [suggestionsPartisan, setSuggestionsPartisan] = useState<string>("all") // partisan filter
  const [suggestionsSort, setSuggestionsSort] = useState<string>("confidence") // sort order
  const [suggestionsTotalFiltered, setSuggestionsTotalFiltered] = useState(0)
  const [suggestionsHasMore, setSuggestionsHasMore] = useState(false)
  const [suggestionsOffset, setSuggestionsOffset] = useState(0)
  const [rejectModal, setRejectModal] = useState<{ id: string; source: string; target: string } | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [suggestionsSearch, setSuggestionsSearch] = useState("") // name search
  const [suggestionsCompact, setSuggestionsCompact] = useState(false) // compact card mode
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set()) // bulk select

  const loadSuggestions = async (append = false, offsetOverride?: number) => {
    setSuggestionsLoading(true)
    try {
      const o = offsetOverride ?? (append ? suggestionsOffset + 30 : 0)
      const status = suggestionsStatusFilter
      const params = new URLSearchParams({ confidence: suggestionsFilter, strategy: suggestionsStratFilter, status, type: suggestionsTypeFilter, partisan: suggestionsPartisan, sort: suggestionsSort, limit: "30", offset: String(o), ...(suggestionsSearch ? { search: suggestionsSearch } : {}) })
      const res = await fetch(`/api/suggestions?${params}`)
      const data = await res.json()
      if (append) {
        setSuggestions(prev => [...prev, ...(data.discovered || [])])
      } else {
        setSuggestions(data.discovered || [])
      }
      setNewProfiles(data.newProfiles || [])
      setSuggestionsStats(data.stats || { total: 0, high: 0, medium: 0, low: 0 })
      if (data.actionStats) setActionStats(data.actionStats)
      setSuggestionsLastScan(data.scannedAt || null)
      setSuggestionsTotalFiltered(data.totalFiltered || 0)
      setSuggestionsHasMore(data.hasMore || false)
      setSuggestionsOffset(o)
    } catch { /* skip */ }
    setSuggestionsLoading(false)
  }

  const runScan = async () => {
    setSuggestionsScanning(true)
    showToast("Running relationship discovery scan...")
    try {
      const res = await fetch("/api/suggestions/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.error) showToast(`Scan error: ${data.error}`)
      else {
        showToast(`Scan complete: ${data.stats?.total || 0} suggestions found`)
        await loadSuggestions()
      }
    } catch { showToast("Scan failed") }
    setSuggestionsScanning(false)
  }

  const actOnSuggestion = async (id: string, action: string, reason?: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...(reason ? { reason } : {}) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Deferred"}: ${id.split("::").slice(0, 2).join(" -> ")}`)
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, actionState: action, actionAt: new Date().toISOString(), actionReason: reason } : s))
      } else showToast(`Error: ${data.error}`)
    } catch { showToast("Action failed") }
    setSaving(false)
  }

  const batchApproveHigh = async () => {
    const highPending = suggestions.filter(s => s.confidence === "high" && s.autoCreate && (!s.actionState || s.actionState === "pending"))
    if (highPending.length === 0) { showToast("No high-confidence auto-create suggestions pending"); return }
    setSaving(true)
    let approved = 0
    for (const s of highPending) {
      try {
        await actOnSuggestion(s.id, "approve")
        approved++
      } catch { /* continue */ }
    }
    showToast(`Batch approved ${approved} high-confidence connections`)
    setSaving(false)
  }

  const saveNote = async (id: string, note: string) => {
    try {
      await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "note", note }),
      })
      setSuggestions(prev => prev.map(s => s.id === id ? { ...s, note } : s))
    } catch { /* skip */ }
  }

  const toggleInvestigate = async (id: string, currentlyInvestigating: boolean) => {
    try {
      const action = currentlyInvestigating ? "uninvestigate" : "investigate"
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (data.success) {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, investigate: !currentlyInvestigating, investigateAt: !currentlyInvestigating ? new Date().toISOString() : undefined } : s))
        showToast(currentlyInvestigating ? "Removed priority flag" : "Flagged as PRIORITY for Research Claude")
      }
    } catch { showToast("Failed to update investigation status") }
  }

  const undoAction = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "undo" }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`Undone: ${data.undone}${data.undone === "approve" ? " (removed from vault)" : ""}`)
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, actionState: undefined, actionAt: undefined, actionReason: undefined } : s))
      } else showToast(`Undo failed: ${data.error}`)
    } catch { showToast("Undo failed") }
    setSaving(false)
  }

  // Load suggestions when switching to tab or changing filters/sort
  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerSearchLoad = useCallback((val: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => { setSuggestionsSearch(val) }, 300)
  }, [])

  const batchAction = async (action: string) => {
    if (selectedSuggestions.size === 0) return
    setSaving(true)
    let count = 0
    for (const id of selectedSuggestions) {
      try {
        await actOnSuggestion(id, action)
        count++
      } catch { /* continue */ }
    }
    setSelectedSuggestions(new Set())
    showToast(`${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "Deferred"} ${count} suggestions`)
    setSaving(false)
  }

  useEffect(() => { if (tab === "suggestions") loadSuggestions() }, [tab, suggestionsFilter, suggestionsStratFilter, suggestionsStatusFilter, suggestionsTypeFilter, suggestionsPartisan, suggestionsSort, suggestionsSearch])

  // Node positions for draggable graph
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const nodeDragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 })

  // Context menu for changing connection types
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; name: string; type: "related" | "donors" | "opposes" | "stories" } | null>(null)

  // Relationship notes state
  const [notesCollapsed, setNotesCollapsed] = useState(false)
  const [relationNotes, setRelationNotes] = useState<Record<string, { note: string; updatedAt: string }>>({})
  const [notePopover, setNotePopover] = useState<{ name: string; x: number; y: number } | null>(null)
  const [noteText, setNoteText] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)
  const noteInputRef = useRef<HTMLTextAreaElement>(null)

  // Close context menu and note popover on click anywhere
  useEffect(() => {
    const handler = () => { setContextMenu(null); setNotePopover(null) }
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [])

  // Graph zoom + pan (legacy — kept for state compatibility)
  const [graphZoom, setGraphZoom] = useState(1)
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const graphRef = useRef<HTMLDivElement>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)

  // D3 force graph
  const d3SvgRef = useRef<SVGSVGElement>(null)
  const d3SimRef = useRef<Simulation<any, any> | null>(null)
  const [graphFilterTypes, setGraphFilterTypes] = useState<Set<string>>(new Set(["related", "donors", "opposes", "stories"]))
  const [graphEntityFilters, setGraphEntityFilters] = useState<Set<string>>(new Set(["politician", "donor", "corporation", "think-tank", "lobbying-firm", "media-profile", "story", "pac", "unknown"]))
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Attach non-passive wheel listener so we can preventDefault
  useEffect(() => {
    const el = graphContainerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setGraphZoom((z) => Math.max(0.3, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))))
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [tab, selected])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only drag on the background, not on nodes or buttons
    if ((e.target as HTMLElement).closest("button")) return
    if ((e.target as HTMLElement).closest(".group\\/node")) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: graphPan.x, panY: graphPan.y }
  }, [graphPan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Node dragging takes priority
    if (draggingNode) {
      e.stopPropagation()
      const container = graphRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const dx = (e.clientX - nodeDragStart.current.x) / (rect.width * graphZoom) * 100
      const dy = (e.clientY - nodeDragStart.current.y) / (rect.height * graphZoom) * 100
      setNodePositions((prev) => ({
        ...prev,
        [draggingNode]: { x: nodeDragStart.current.nodeX + dx, y: nodeDragStart.current.nodeY + dy },
      }))
      return
    }
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setGraphPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy })
  }, [isDragging, draggingNode, graphZoom])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggingNode(null)
  }, [])

  // D3 force simulation — runs when selected profile or filter changes
  useEffect(() => {
    if (!selected || tab !== "graph" || !d3SvgRef.current) return

    // Clean up previous simulation
    if (d3SimRef.current) d3SimRef.current.stop()
    const svgEl = d3SvgRef.current
    const svg = select(svgEl)
    svg.selectAll("*").remove()

    const width = svgEl.clientWidth || 800
    const height = svgEl.clientHeight || 600

    const norm = (s: string) => s.replace(/^_/, "").replace(/\s*Master Profile.*/i, "").trim().toLowerCase()
    const opposesNorm = new Set(selected.opposes.map(norm))
    const fundsNorm = new Set([...selected.donors, ...selected.related].map(norm))

    // Build entity type lookup from profiles + topConnected
    const entityTypeMap = new Map<string, string>()
    for (const p of profiles) entityTypeMap.set(norm(p.title), p.type || "unknown")
    for (const p of topConnected) entityTypeMap.set(norm(p.title), p.type || "unknown")

    // Build nodes from filtered types — two-pass to handle dedup correctly
    // Pass 1: collect ALL types each name belongs to
    interface ForceNode extends SimulationNodeDatum {
      id: string; name: string; relType: "related" | "donors" | "opposes" | "stories"
      entityType: string; bothSides: boolean; hasNote: boolean
    }
    const types = ["donors", "related", "opposes", "stories"] as const
    const nameTypes = new Map<string, { types: Set<string>; originalName: string }>()
    for (const t of types) {
      for (const name of selected[t]) {
        const n = norm(name)
        if (!nameTypes.has(n)) nameTypes.set(n, { types: new Set(), originalName: name })
        nameTypes.get(n)!.types.add(t)
      }
    }

    // Pass 2: only include nodes that have at least one ACTIVE type
    // Priority for coloring: opposes > donors > stories > related
    const typePriority = ["opposes", "donors", "stories", "related"] as const
    const nodes: ForceNode[] = []
    for (const [normalizedName, info] of nameTypes) {
      const activeTypes = [...info.types].filter(t => graphFilterTypes.has(t))
      if (activeTypes.length === 0) continue
      const primaryType = (typePriority.find(t => activeTypes.includes(t)) || activeTypes[0]) as typeof types[number]
      const bs = opposesNorm.has(normalizedName) && fundsNorm.has(normalizedName)
      const noteKey = `${selected.title}::${info.originalName}`
      const et = entityTypeMap.get(normalizedName) || "unknown"
      // Apply entity type filter
      if (!graphEntityFilters.has(et)) continue
      nodes.push({ id: info.originalName, name: info.originalName, relType: primaryType, entityType: et, bothSides: bs, hasNote: !!relationNotes[noteKey]?.note })
    }

    // Center node
    const centerNode: ForceNode = { id: "__center__", name: selected.title, relType: "related", entityType: selected.type, bothSides: false, hasNote: false }
    nodes.unshift(centerNode)

    // Links: every node connects to center
    interface ForceLink extends SimulationLinkDatum<ForceNode> { relType: string }
    const links: ForceLink[] = nodes.slice(1).map(n => ({ source: centerNode, target: n, relType: n.relType }))

    // Simulation
    const sim = forceSimulation<ForceNode>(nodes)
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(width / 2, height / 2).strength(0.05))
      .force("link", forceLink<ForceNode, ForceLink>(links).distance(80).strength(0.3))
      .force("collide", forceCollide<ForceNode>(d => d.id === "__center__" ? 30 : 14).iterations(2))
      .force("x", forceX(width / 2).strength(0.03))
      .force("y", forceY(height / 2).strength(0.03))
      .alphaDecay(0.02)

    // Pin center node
    centerNode.fx = width / 2
    centerNode.fy = height / 2

    d3SimRef.current = sim

    // SVG groups
    const g = svg.append("g").attr("class", "graph-root")

    // Zoom — reset transform on rebuild to prevent stale zoom from hiding nodes
    const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => g.attr("transform", event.transform))
    svg.call(zoomBehavior)
    svg.call(zoomBehavior.transform as any, zoomIdentity)

    // Links
    const linkGroup = g.append("g").attr("class", "links")
    const linkEls = linkGroup.selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => d.target.bothSides ? "#ef4444" : REL_COLORS[d.relType])
      .attr("stroke-width", (d: any) => d.target.bothSides ? 2.5 : d.relType === "opposes" ? 1 : d.relType === "stories" ? 1 : 1.2)
      .attr("stroke-dasharray", (d: any) => d.target.bothSides ? "6 3" : d.relType === "opposes" ? "4 2" : d.relType === "stories" ? "2 2" : "none")
      .attr("stroke-opacity", (d: any) => d.target.bothSides ? 0.8 : 0.2)

    // Node groups
    const nodeGroup = g.append("g").attr("class", "nodes")
    const nodeEls = nodeGroup.selectAll<SVGGElement, ForceNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")

    // Dual-layer nodes:
    //   Inner fill + stroke = entity type (what it IS: politician, donor, think-tank)
    //   Outer ring = relationship type (how it's CONNECTED: funded, related, opposes, stories)
    const nodeColor = (d: ForceNode) => {
      if (d.id === "__center__") return TYPE_COLORS[selected.type] || "#7a7a86"
      if (d.bothSides) return "#ef4444"
      return TYPE_COLORS[d.entityType] || "#7a7a86"
    }

    // Outer ring — relationship type color
    nodeEls.filter(d => d.id !== "__center__")
      .append("circle")
      .attr("r", d => 10)
      .attr("fill", "none")
      .attr("stroke", d => d.bothSides ? "#ef4444" : REL_COLORS[d.relType])
      .attr("stroke-width", d => d.bothSides ? 2 : 1.5)
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", d => d.relType === "opposes" ? "3 2" : d.relType === "stories" ? "2 1" : "none")

    // Inner circle — entity type color
    nodeEls.append("circle")
      .attr("r", d => d.id === "__center__" ? 24 : 6)
      .attr("fill", d => `${nodeColor(d)}${d.id === "__center__" ? "40" : "40"}`)
      .attr("stroke", d => nodeColor(d))
      .attr("stroke-width", d => d.id === "__center__" ? 2.5 : 1.5)

    // Both-sides glow ring
    nodeEls.filter(d => d.bothSides)
      .append("circle")
      .attr("r", 11)
      .attr("fill", "none")
      .attr("stroke", "#ef4444")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.3)

    // Note indicator dot
    nodeEls.filter(d => d.hasNote && d.id !== "__center__")
      .append("circle")
      .attr("cx", 5).attr("cy", -5)
      .attr("r", 3)
      .attr("fill", "#f59e0b")

    // Center label — always visible
    nodeEls.filter(d => d.id === "__center__")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "var(--color-text)")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text(d => d.name.length > 18 ? d.name.slice(0, 16) + "..." : d.name)

    // Always-visible labels — faint by default, bright on hover
    const labelEls = nodeEls.filter(d => d.id !== "__center__")
      .append("g")
      .attr("class", "node-label")
      .attr("pointer-events", "none")
      .attr("opacity", 0.35)

    // Label text — always shown, colored by entity type
    labelEls.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 16)
      .attr("fill", d => nodeColor(d))
      .attr("font-size", "7px")
      .attr("font-family", "ui-monospace, monospace")
      .text(d => d.name.length > 20 ? d.name.slice(0, 18) + ".." : d.name)

    // Hover tooltip — hidden by default (shows full name on hover)
    const tooltipEls = nodeEls.filter(d => d.id !== "__center__")
      .append("g")
      .attr("class", "hover-tooltip")
      .attr("display", "none")
      .attr("pointer-events", "none")

    tooltipEls.append("rect")
      .attr("rx", 3)
      .attr("fill", "var(--color-bg-card, #1e1e2e)")
      .attr("stroke", d => d.bothSides ? "#ef4444" : REL_COLORS[d.relType])
      .attr("stroke-width", 0.5)
      .attr("opacity", 0.95)

    tooltipEls.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-14")
      .attr("fill", "var(--color-text)")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-family", "ui-monospace, monospace")
      .text(d => d.name)
      .each(function () {
        const bbox = (this as SVGTextElement).getBBox()
        const rect = select(this.parentNode!).select("rect")
        rect.attr("x", bbox.x - 4).attr("y", bbox.y - 2).attr("width", bbox.width + 8).attr("height", bbox.height + 4)
      })

    // Hover interaction
    nodeEls.filter(d => d.id !== "__center__")
      .on("mouseenter", function (event, d) {
        select(this).select(".node-label").attr("opacity", 1)
        select(this).select(".hover-tooltip").attr("display", null)
        // Grow both rings on hover
        const circles = select(this).selectAll("circle")
        circles.filter((_, i) => i === 0).attr("r", 13) // outer ring
        circles.filter((_, i) => i === 1).attr("r", 9)  // inner circle
        linkEls.attr("stroke-opacity", (l: any) => l.target.id === d.id ? 0.8 : 0.08)
        setHoveredNode(d.name)
      })
      .on("mouseleave", function () {
        select(this).select(".node-label").attr("opacity", 0.35)
        select(this).select(".hover-tooltip").attr("display", "none")
        const circles = select(this).selectAll("circle")
        circles.filter((_, i) => i === 0).attr("r", 10) // outer ring
        circles.filter((_, i) => i === 1).attr("r", 6)  // inner circle
        linkEls.attr("stroke-opacity", (d: any) => d.target.bothSides ? 0.8 : 0.2)
        setHoveredNode(null)
      })

    // Click to navigate
    nodeEls.filter(d => d.id !== "__center__")
      .on("click", (event, d) => {
        const target = norm(d.name)
        const tp = topConnected.find(t => norm(t.title) === target) || profiles.find(p => norm(p.title) === target)
        if (tp) selectProfile(tp)
      })

    // Right-click for context menu
    nodeEls.filter(d => d.id !== "__center__")
      .on("contextmenu", (event, d) => {
        event.preventDefault()
        setContextMenu({ x: event.clientX, y: event.clientY, name: d.name, type: d.relType })
      })

    // Drag behavior
    const dragBehavior = d3Drag<SVGGElement, ForceNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on("drag", (event, d) => {
        d.fx = event.x; d.fy = event.y
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0)
        if (d.id !== "__center__") { d.fx = null; d.fy = null }
      })

    nodeEls.call(dragBehavior as any)

    // Tick
    sim.on("tick", () => {
      linkEls
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y)
      nodeEls.attr("transform", d => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [selected, tab, graphFilterTypes, graphEntityFilters, relationNotes])

  useEffect(() => {
    Promise.all([
      fetch("/api/connections").then((r) => r.json()),
      fetch("/api/vault").then((r) => r.json()),
    ]).then(([connData, vaultData]) => {
      setConnections(connData.connections || [])
      setTopConnected(connData.topConnected || [])
      setUnconnected(connData.unconnected || [])
      setUnconnectedCount(connData.unconnectedCount || 0)
      setRecentConnections(connData.recentConnections || [])
      setBreakdown(connData.breakdown || { related: 0, donors: 0, opposes: 0, total: 0 })
      setProfiles(vaultData.profiles || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const getProfileConnections = (title: string) => connections.filter((c) => c.source === title || c.target === title)

  const getSharedConnections = (a: string, b: string) => {
    const aConns = new Set(connections.filter((c) => c.source === a).map((c) => c.target))
    const bConns = new Set(connections.filter((c) => c.source === b).map((c) => c.target))
    return [...aConns].filter((x) => bConns.has(x))
  }

  // Pre-computed lookups to avoid O(n²) in List View rendering
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.title, p])), [profiles])
  const sharedMap = useMemo(() => {
    if (!selected) return new Map<string, string[]>()
    const adj = new Map<string, Set<string>>()
    for (const c of connections) {
      if (!adj.has(c.source)) adj.set(c.source, new Set())
      adj.get(c.source)!.add(c.target)
    }
    const selectedConns = adj.get(selected.title) || new Set<string>()
    const map = new Map<string, string[]>()
    for (const name of [...selected.related, ...selected.donors, ...selected.opposes, ...selected.stories]) {
      const theirConns = adj.get(name) || new Set<string>()
      const shared = [...selectedConns].filter(x => theirConns.has(x))
      if (shared.length > 0) map.set(name, shared)
    }
    return map
  }, [selected, connections])

  // Search — only show dropdown when typing, not when selected
  const searchResults = search.length >= 2 && showDropdown
    ? profiles.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : []

  const targetResults = targetSearch.length >= 2
    ? profiles
        .filter((p) => p.title.toLowerCase().includes(targetSearch.toLowerCase()) && p.title !== selected?.title)
        .filter((p) => targetTypeFilter === "all" || p.type === targetTypeFilter)
        .slice(0, 12)
    : []

  const selectProfile = (p: ConnectedProfile | Profile) => {
    const cp = "connectionCount" in p ? p : topConnected.find((t) => t.title === p.title) || {
      title: p.title, path: p.path, type: p.type,
      connectionCount: 0, related: [], donors: [], opposes: [], stories: [],
    }
    setSelected(cp)
    setSearch(cp.title)
    setShowDropdown(false)
    setExplorerPath([cp.title])
    setGraphZoom(1)
    setNodePositions({})
    setNotePopover(null)
    // Fetch relationship notes for this profile
    fetch(`/api/relationship-notes?source=${encodeURIComponent(cp.title)}`)
      .then((r) => r.json())
      .then((data) => setRelationNotes(data))
      .catch(() => setRelationNotes({}))
  }

  const clearSelection = () => {
    setSelected(null)
    setSearch("")
    setShowDropdown(false)
    setExplorerPath([])
  }

  // Change connection type (remove old, add new)
  const changeConnectionType = async (targetTitle: string, fromType: "related" | "donors" | "opposes" | "stories", toType: "related" | "donors" | "opposes" | "stories") => {
    if (!selected || fromType === toType) return
    setSaving(true)
    try {
      // Remove old
      await fetch("/api/relationships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath: selected.path, targetTitle, relationshipType: fromType }),
      })
      // Add new
      await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath: selected.path, targetTitle, relationshipType: toType }),
      })
      showToast(`Changed: ${targetTitle} → ${REL_LABELS[toType]}`)
      const connData = await fetch("/api/connections").then((r) => r.json())
      setConnections(connData.connections || [])
      setTopConnected(connData.topConnected || [])
      setBreakdown(connData.breakdown || breakdown)
      const updated = (connData.topConnected as ConnectedProfile[]).find((t) => t.title === selected.title)
      if (updated) setSelected(updated)
    } catch { showToast("Failed to change type") }
    finally { setSaving(false) }
  }

  const removeConnection = async (targetTitle: string, rt: "related" | "donors" | "opposes" | "stories") => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch("/api/relationships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath: selected.path, targetTitle, relationshipType: rt }),
      })
      const data = await res.json()
      if (data.error) showToast(data.error)
      else {
        showToast(`Removed: ${selected.title} × ${targetTitle}`)
        const connData = await fetch("/api/connections").then((r) => r.json())
        setConnections(connData.connections || [])
        setTopConnected(connData.topConnected || [])
        setBreakdown(connData.breakdown || breakdown)
        const updated = (connData.topConnected as ConnectedProfile[]).find((t) => t.title === selected.title)
        if (updated) setSelected(updated)
        else setSelected({ ...selected, [rt]: selected[rt].filter((n) => n !== targetTitle), connectionCount: selected.connectionCount - 1 })
      }
    } catch { showToast("Failed to remove") }
    finally { setSaving(false) }
  }

  const addConnection = async (targetTitle: string) => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourcePath: selected.path, targetTitle, relationshipType: relType }),
      })
      const data = await res.json()
      if (data.error) showToast(data.error)
      else {
        showToast(`Connected: ${selected.title} → ${targetTitle}`)
        setTargetSearch("")
        const connData = await fetch("/api/connections").then((r) => r.json())
        setConnections(connData.connections || [])
        setTopConnected(connData.topConnected || [])
        setBreakdown(connData.breakdown || breakdown)
        const updated = (connData.topConnected as ConnectedProfile[]).find((t) => t.title === selected.title)
        if (updated) setSelected(updated)
      }
    } catch { showToast("Failed to save") }
    finally { setSaving(false) }
  }

  // Save relationship note
  const saveRelationNote = async (targetName: string, note: string) => {
    if (!selected) return
    setNoteSaving(true)
    try {
      await fetch("/api/relationship-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: selected.title, target: targetName, note }),
      })
      const key = `${selected.title}::${targetName}`
      if (note.trim()) {
        setRelationNotes((prev) => ({ ...prev, [key]: { note: note.trim(), updatedAt: new Date().toISOString() } }))
      } else {
        setRelationNotes((prev) => { const next = { ...prev }; delete next[key]; return next })
      }
      showToast(note.trim() ? `Note saved for ${targetName}` : `Note removed for ${targetName}`)
    } catch { showToast("Failed to save note") }
    finally { setNoteSaving(false) }
  }

  const openNotePopover = (name: string, x: number, y: number) => {
    const key = `${selected?.title}::${name}`
    setNoteText(relationNotes[key]?.note || "")
    setNotePopover({ name, x, y })
    setTimeout(() => noteInputRef.current?.focus(), 50)
  }

  const expandNode = (title: string) => setExplorerPath((prev) => [...prev, title])

  const explorerCurrent = explorerPath[explorerPath.length - 1]
  const explorerConnections = explorerCurrent ? getProfileConnections(explorerCurrent) : []

  // Filter unconnected to exclude internal docs
  const filteredUnconnected = unconnected.filter((p) => !isInternalDoc(p))
  const filteredUnconnectedCount = filteredUnconnected.length

  // Entity type filter options for Add Connection
  const ENTITY_FILTERS = [
    { key: "all", label: "All", color: "#7a7a86" },
    { key: "politician", label: "Politicians", color: "#5b8dce" },
    { key: "donor", label: "Donors", color: "#22c55e" },
    { key: "corporation", label: "Corps", color: "#22c55e" },
    { key: "think-tank", label: "Think Tanks", color: "#a855f7" },
    { key: "lobbying-firm", label: "K Street", color: "#f59e0b" },
    { key: "media-profile", label: "Media", color: "#ef4444" },
    { key: "story", label: "Stories", color: "#ec4899" },
  ]

  // Add Connection form — inlined as JSX variable (NOT a component function)
  // Defining as () => JSX inside render causes React to remount on every state change, losing input focus
  const addConnectionFormJSX = (
    <div className="mt-4 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg">
      <h4 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Add Connection</h4>

      {/* Relationship type */}
      <div className="flex gap-2 mb-2">
        <span className="text-[8px] text-[var(--color-text-dim)] py-1.5">Type:</span>
        {(["related", "donors", "opposes", "stories"] as const).map((rt) => (
          <button key={rt} onClick={() => setRelType(rt)}
            className={`text-[9px] px-2.5 py-1.5 rounded border transition-all ${relType === rt ? "border-current bg-current/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}
            style={{ color: relType === rt ? REL_COLORS[rt] : undefined }}>{REL_LABELS[rt]}</button>
        ))}
      </div>

      {/* Entity type filter */}
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-[8px] text-[var(--color-text-dim)] py-0.5">Show:</span>
        {ENTITY_FILTERS.map((t) => (
          <button key={t.key} onClick={() => setTargetTypeFilter(t.key)}
            className={`text-[7px] px-1.5 py-0.5 rounded transition-all ${targetTypeFilter === t.key ? "font-bold" : "text-[var(--color-text-dim)]"}`}
            style={{ color: targetTypeFilter === t.key ? t.color : undefined, backgroundColor: targetTypeFilter === t.key ? `${t.color}15` : undefined }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder={`Search ${targetTypeFilter === "all" ? "all profiles" : ENTITY_FILTERS.find((f) => f.key === targetTypeFilter)?.label || "profiles"}...`}
          value={targetSearch}
          onChange={(e) => setTargetSearch(e.target.value)}
          className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
        {targetResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto">
            {targetResults.map((p) => (
              <button key={p.path} onClick={() => { addConnection(p.title); setTargetSearch("") }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-hover)] text-xs border-b border-[var(--color-border)] last:border-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor(p.type) }} />
                <span className="text-[var(--color-text)] flex-1">{p.title}</span>
                <span className="text-[8px] px-1 py-0.5 rounded" style={{ color: typeColor(p.type), backgroundColor: `${typeColor(p.type)}15` }}>{p.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* Context menu for changing connection types */}
      {contextMenu && (
        <div className="fixed z-[100] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-2xl overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <p className="text-[9px] text-[var(--color-text-dim)] truncate max-w-[200px]">{contextMenu.name}</p>
          </div>
          {(["related", "donors", "opposes", "stories"] as const).map((rt) => (
            <button key={rt}
              onClick={() => {
                if (rt !== contextMenu.type) changeConnectionType(contextMenu.name, contextMenu.type, rt)
                setContextMenu(null)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[10px] text-left hover:bg-[var(--color-bg-hover)] transition-colors ${rt === contextMenu.type ? "font-bold" : ""}`}
              style={{ color: REL_COLORS[rt] }}>
              <span className="w-2 h-2 rounded-full bg-current" />
              {REL_LABELS[rt]}
              {rt === contextMenu.type && <span className="ml-auto text-[8px]">current</span>}
            </button>
          ))}
          <button
            onClick={() => { removeConnection(contextMenu.name, contextMenu.type); setContextMenu(null) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-left text-[var(--color-red)] hover:bg-[var(--color-red)]/10 transition-colors border-t border-[var(--color-border)]">
            <span className="w-2 h-2 rounded-full bg-current" />
            Remove
          </button>
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setRejectModal(null)}>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">Reject Connection</h3>
            <p className="text-[10px] text-[var(--color-text-dim)] mb-4">{rejectModal.source} → {rejectModal.target}</p>
            <p className="text-[9px] text-[var(--color-text-dim)] mb-2">Why reject? (required)</p>
            <div className="space-y-1.5 mb-3">
              {["Already implicit - no value adding", "Incorrect - profiles not actually related", "Duplicate - exists under different name", "Too speculative - needs more evidence"].map(reason => (
                <button key={reason} onClick={() => setRejectReason(reason)}
                  className={`w-full text-left text-[10px] px-3 py-2 rounded border transition-all ${rejectReason === reason ? "border-[var(--color-red)] bg-[var(--color-red)]/10 text-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                  {reason}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Or type a custom reason..."
              value={!["Already implicit - no value adding", "Incorrect - profiles not actually related", "Duplicate - exists under different name", "Too speculative - needs more evidence"].includes(rejectReason) ? rejectReason : ""}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRejectModal(null); setRejectReason("") }}
                className="text-[10px] px-3 py-1.5 rounded text-[var(--color-text-dim)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]">Cancel</button>
              <button onClick={() => { if (rejectReason) { actOnSuggestion(rejectModal.id, "reject", rejectReason); setRejectModal(null); setRejectReason("") } }}
                disabled={!rejectReason}
                className="text-[10px] px-3 py-1.5 rounded bg-[var(--color-red)] text-white hover:bg-[var(--color-red)]/80 disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Note popover */}
      {notePopover && (
        <div className="fixed z-[100] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-2xl p-3 w-72"
          style={{ left: Math.min(notePopover.x, typeof window !== "undefined" ? window.innerWidth - 300 : notePopover.x), top: notePopover.y }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider">Relationship Note</p>
              <p className="text-[10px] text-[var(--color-text)] font-bold truncate max-w-[200px]">{notePopover.name}</p>
            </div>
            <button onClick={() => setNotePopover(null)}
              className="w-5 h-5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-dim)] text-[10px] flex items-center justify-center hover:text-[var(--color-text)]">×</button>
          </div>
          <textarea
            ref={noteInputRef}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Develop this connection deeper — shared donor pattern with Koch Network, check FEC filings..."
            className="w-full h-20 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]/50 focus:outline-none focus:border-[var(--color-steel)] resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[7px] text-[var(--color-text-dim)]">
              {relationNotes[`${selected?.title}::${notePopover.name}`]?.updatedAt
                ? `Last: ${new Date(relationNotes[`${selected?.title}::${notePopover.name}`].updatedAt).toLocaleDateString()}`
                : "No note yet"}
            </span>
            <div className="flex gap-1">
              {noteText.trim() && relationNotes[`${selected?.title}::${notePopover.name}`]?.note && (
                <button onClick={() => { setNoteText(""); saveRelationNote(notePopover.name, ""); setNotePopover(null) }}
                  className="text-[8px] px-2 py-1 rounded text-[var(--color-red)] hover:bg-[var(--color-red)]/10">Delete</button>
              )}
              <button onClick={() => { saveRelationNote(notePopover.name, noteText); setNotePopover(null) }}
                disabled={noteSaving}
                className="text-[8px] px-3 py-1 rounded bg-[var(--color-steel)] text-white hover:bg-[var(--color-steel)]/80 disabled:opacity-50">
                {noteSaving ? "..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--color-bg-card)] border border-[var(--color-green)]/30 rounded-lg px-4 py-3 text-xs text-[var(--color-green)] shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-green)]" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Relationship Mapper</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">{loading ? "Loading..." : `${breakdown.total} connections across the vault`}</p>
        </div>
        <button
          onClick={async () => {
            setSaving(true)
            showToast("Triggering auto-connection engine...")
            try {
              const res = await fetch("/api/pipelines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workflow: "auto-connect.yml" }),
              })
              const data = await res.json()
              if (data.error) showToast(`Error: ${data.error}`)
              else showToast("Auto-connection engine triggered — check Pipelines for status")
            } catch { showToast("Failed to trigger") }
            finally { setSaving(false) }
          }}
          disabled={saving}
          className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-50">
          <svg className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Run Auto-Connect
        </button>
      </div>

      {/* Stats bar — only render after data loads to avoid flashing 0s */}
      {!loading && (
        <div className="flex gap-3 mb-4 flex-wrap animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[#5b8dce]/10 text-[#5b8dce]">
            <span className="w-2 h-2 rounded-full bg-current" /> {breakdown.related} Related
          </div>
          <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[#22c55e]/10 text-[#22c55e]">
            <span className="w-2 h-2 rounded-full bg-current" /> {breakdown.donors} Donor
          </div>
          <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[#ef4444]/10 text-[#ef4444]">
            <span className="w-2 h-2 rounded-full bg-current" /> {breakdown.opposes} Opposes
          </div>
          <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[#ec4899]/10 text-[#ec4899]">
            <span className="w-2 h-2 rounded-full bg-current" /> {breakdown.stories || 0} Stories
          </div>
          <div className="ml-auto text-[10px] text-[var(--color-text-dim)]">{filteredUnconnectedCount} profiles with no connections</div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Main area — 3 cols */}
        <div className="xl:col-span-3">
          {/* Search — now properly clearable */}
          <div className="relative mb-4">
            <input type="text" placeholder="Search for a profile..." value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) clearSelection() }}
              onFocus={() => { if (selected) { setSearch(""); setSelected(null); setShowDropdown(true) } }}
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
            {search && (
              <button onClick={clearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-xs px-2">
                Clear
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <button key={p.path} onClick={() => selectProfile(p)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] last:border-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: typeColor(p.type) }} />
                    <span className="text-xs text-[var(--color-text)] flex-1">{p.title}</span>
                    <span className="text-[8px]" style={{ color: typeColor(p.type) }}>{p.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1 w-fit">
            {(["list", "explorer", "graph", "suggestions"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded text-xs transition-all ${tab === t ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                {t === "list" ? "List View" : t === "explorer" ? "Explorer" : t === "graph" ? "Graph" : <>Suggestions {suggestionsStats.total > 0 && <span className="ml-1 px-1.5 py-0.5 text-[8px] rounded-full bg-[#f59e0b]/20 text-[#f59e0b]">{suggestionsStats.total}</span>}</>}
              </button>
            ))}
          </div>

          {tab === "suggestions" ? (
            /* ===== SUGGESTIONS TAB ===== */
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">Relationship Suggestions</h3>
                  <p className="text-[10px] text-[var(--color-text-dim)]">
                    {suggestionsLastScan ? `Last scan: ${new Date(suggestionsLastScan).toLocaleString()}` : "No scan run yet"}
                    {suggestionsStats.total > 0 && ` \u00b7 ${suggestionsStats.total} suggestions`}
                    {(actionStats.approved > 0 || actionStats.rejected > 0 || actionStats.deferred > 0) && (
                      <span className="ml-2">
                        {actionStats.approved > 0 && <span className="text-[var(--color-green)]">{actionStats.approved} approved</span>}
                        {actionStats.rejected > 0 && <span className="ml-1 text-[var(--color-red)]">{actionStats.rejected} rejected</span>}
                        {actionStats.deferred > 0 && <span className="ml-1 text-[#f59e0b]">{actionStats.deferred} deferred</span>}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setSuggestionsCompact(c => !c)} className={`text-[9px] px-2.5 py-1.5 rounded-lg border transition-all ${suggestionsCompact ? "border-[var(--color-steel)]/50 bg-[var(--color-steel)]/15 text-[var(--color-steel)]" : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`} title="Toggle compact mode">
                    {suggestionsCompact ? "&#9776; Full" : "&#9776; Compact"}
                  </button>
                  <button onClick={batchApproveHigh} disabled={saving} className="flex items-center gap-1.5 text-[10px] px-3 py-2 rounded-lg border border-[var(--color-green)]/30 text-[var(--color-green)] hover:bg-[var(--color-green)]/10 disabled:opacity-50">
                    Batch Approve High <span className="px-1.5 py-0.5 rounded bg-[var(--color-green)]/15 text-[8px]">{suggestions.filter(s => s.confidence === "high" && s.autoCreate && (!s.actionState || s.actionState === "pending")).length}</span>
                  </button>
                  <button onClick={runScan} disabled={suggestionsScanning} className="flex items-center gap-1.5 text-[10px] px-3 py-2 rounded-lg bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 hover:bg-[var(--color-steel)]/25 disabled:opacity-50">
                    <svg className={`w-3 h-3 ${suggestionsScanning ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    {suggestionsScanning ? "Scanning..." : "Run Scan"}
                  </button>
                </div>
              </div>
              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search suggestions by name..."
                  defaultValue=""
                  onChange={e => triggerSearchLoad(e.target.value)}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]/50 focus:outline-none focus:border-[var(--color-steel)]"
                />
              </div>
              {/* Bulk action bar */}
              {selectedSuggestions.size > 0 && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-[var(--color-steel)]/10 border border-[var(--color-steel)]/20 rounded-lg">
                  <span className="text-[9px] text-[var(--color-steel)] font-bold">{selectedSuggestions.size} selected</span>
                  <button onClick={() => batchAction("approve")} disabled={saving} className="text-[8px] px-2 py-1 rounded bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 hover:bg-[var(--color-green)]/25 disabled:opacity-50">&#10003; Approve All</button>
                  <button onClick={() => batchAction("reject")} disabled={saving} className="text-[8px] px-2 py-1 rounded bg-[var(--color-red)]/15 text-[var(--color-red)] border border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/25 disabled:opacity-50">&#10005; Reject All</button>
                  <button onClick={() => batchAction("defer")} disabled={saving} className="text-[8px] px-2 py-1 rounded text-[var(--color-text-dim)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50">&#9201; Defer All</button>
                  <button onClick={() => setSelectedSuggestions(new Set())} className="ml-auto text-[8px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">Clear</button>
                </div>
              )}
              {suggestionsStats.total > 0 && (
                <div className="flex gap-3 mb-3 flex-wrap">
                  {([["all","All","#5b8dce"],["high","High","#ef4444"],["medium","Medium","#f59e0b"],["low","Low","#7a7a86"]] as [string,string,string][]).map(([key,label,color]) => (
                    <button key={key} onClick={() => setSuggestionsFilter(key)} className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg transition-all ${suggestionsFilter === key ? "font-bold" : "text-[var(--color-text-dim)]"}`} style={suggestionsFilter === key ? { color, backgroundColor: `${color}15` } : {}}>
                      {key !== "all" && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />} {label} <span className="font-bold">{key === "all" ? suggestionsStats.total : suggestionsStats[key as "high"|"medium"|"low"]}</span>
                    </button>
                  ))}
                  <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-0.5">
                      {(["pending", "all", "acted"] as const).map(v => (
                        <button key={v} onClick={() => setSuggestionsStatusFilter(v)}
                          className={`px-2 py-0.5 rounded text-[8px] transition-all ${suggestionsStatusFilter === v ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] font-bold" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                          {v === "pending" ? "Pending" : v === "all" ? "All" : "History"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {suggestionsStats.total > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {[{key:"all",label:"All",color:"#7a7a86"},{key:"fec-ie",label:"Opposition/Support",color:"#ef4444"},{key:"shared-donors",label:"Shared Donors",color:"#f59e0b"},{key:"organizational",label:"Organizational",color:"#5b8dce"},{key:"story-attribution",label:"Stories",color:"#ec4899"},{key:"money-trail",label:"Money Trail",color:"#22c55e"},{key:"wikilink-mention",label:"Mentions",color:"#a855f7"},{key:"leak-data",label:"Leak Data",color:"#e5e5e5"}].map(s => (
                    <button key={s.key} onClick={() => setSuggestionsStratFilter(s.key)} className={`text-[8px] px-2 py-1 rounded transition-all ${suggestionsStratFilter === s.key ? "font-bold" : "text-[var(--color-text-dim)]"}`} style={suggestionsStratFilter === s.key ? { color: s.color, backgroundColor: `${s.color}15` } : {}}>
                      {s.label}{s.key !== "all" && <span className="ml-1 opacity-60">({suggestions.filter(sg => sg.strategies.includes(s.key)).length})</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Row 3: Connection type + Partisan + Sort */}
              {suggestionsStats.total > 0 && (
                <div className="flex flex-wrap gap-3 mb-4 items-center">
                  {/* Connection type */}
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-[var(--color-text-dim)] uppercase">Type:</span>
                    {[{key:"all",label:"All"},{key:"related",label:"Related",color:"#5b8dce"},{key:"donors",label:"Funded By",color:"#22c55e"},{key:"opposes",label:"Opposes",color:"#ef4444"},{key:"stories",label:"Stories",color:"#ec4899"}].map(t => (
                      <button key={t.key} onClick={() => setSuggestionsTypeFilter(t.key)}
                        className={`text-[8px] px-2 py-1 rounded transition-all ${suggestionsTypeFilter === t.key ? "font-bold" : "text-[var(--color-text-dim)]"}`}
                        style={suggestionsTypeFilter === t.key && t.color ? { color: t.color, backgroundColor: `${t.color}15` } : suggestionsTypeFilter === t.key ? { color: "#5b8dce" } : {}}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Partisan */}
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] text-[var(--color-text-dim)] uppercase">Partisan:</span>
                    {[{key:"all",label:"All"},{key:"dem",label:"Dem",color:"#2563eb"},{key:"gop",label:"GOP",color:"#dc2626"},{key:"cross",label:"Cross-Party",color:"#f59e0b"},{key:"neutral",label:"Neutral",color:"#7a7a86"}].map(p => (
                      <button key={p.key} onClick={() => setSuggestionsPartisan(p.key)}
                        className={`text-[8px] px-2 py-1 rounded transition-all ${suggestionsPartisan === p.key ? "font-bold" : "text-[var(--color-text-dim)]"}`}
                        style={suggestionsPartisan === p.key && p.color ? { color: p.color, backgroundColor: `${p.color}15` } : suggestionsPartisan === p.key ? { color: "#5b8dce" } : {}}>
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Sort */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[7px] text-[var(--color-text-dim)] uppercase">Sort:</span>
                    <select value={suggestionsSort} onChange={e => setSuggestionsSort(e.target.value)}
                      className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[8px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]">
                      <option value="confidence">Confidence (default)</option>
                      <option value="transparency-asc">Least Transparent</option>
                      <option value="transparency-desc">Most Transparent</option>
                      <option value="dollars-desc">Highest Dollar</option>
                      <option value="dollars-asc">Lowest Dollar</option>
                      <option value="partisan-dem">Most Dem-Aligned</option>
                      <option value="partisan-gop">Most GOP-Aligned</option>
                    </select>
                  </div>
                </div>
              )}

              {suggestionsLoading ? (
                <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">Loading suggestions...</div>
              ) : suggestions.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-xs text-[var(--color-text-dim)] mb-3">No suggestions yet. Run a scan to discover connections.</p>
                  <button onClick={runScan} disabled={suggestionsScanning} className="text-[10px] px-4 py-2 rounded-lg bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30">{suggestionsScanning ? "Scanning..." : "Run Discovery Scan"}</button>
                </div>
              ) : (
                <div>
                  <p className="text-[9px] text-[var(--color-text-dim)] mb-2">Showing {suggestions.length} of {suggestionsTotalFiltered} filtered suggestions</p>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                  {suggestions.map(s => {
                    const cc = s.confidence === "high" ? "#ef4444" : s.confidence === "medium" ? "#f59e0b" : "#7a7a86"
                    const tc = s.type === "opposes" ? "#ef4444" : s.type === "donors" ? "#22c55e" : s.type === "stories" ? "#ec4899" : "#5b8dce"
                    const tl = s.type === "opposes" ? "opposes" : s.type === "donors" ? "funded by" : s.type === "stories" ? "story link" : "related"
                    const acted = s.actionState && s.actionState !== "pending"
                    return (
                      <div key={s.id} className={`bg-[var(--color-bg-card)] border rounded-lg overflow-hidden ${acted ? "opacity-40" : ""}`} style={{ borderLeftWidth: 3, borderLeftColor: cc, borderColor: "var(--color-border)" }}>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
                          <div className="flex items-center gap-2">
                            {!acted && <input type="checkbox" checked={selectedSuggestions.has(s.id)} onChange={e => { const next = new Set(selectedSuggestions); e.target.checked ? next.add(s.id) : next.delete(s.id); setSelectedSuggestions(next) }} className="rounded accent-[var(--color-steel)]" />}
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cc }} />
                            <span className="text-[9px] font-bold uppercase" style={{ color: cc }}>{s.confidence}</span>
                            {s.strategies.map((st: string) => <span key={st} className="text-[7px] px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-dim)]">{st}</span>)}
                            {s.contradiction && <span className="text-[7px] px-1.5 py-0.5 rounded bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 font-bold" title={`BOTH SIDES: Also ${s.contradiction.counterpartDisplay}`}>&#9733; CONTRADICTION</span>}
                            {s.investigate && <span className="text-[7px] px-1.5 py-0.5 rounded bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30">&#9888; PRIORITY</span>}
                            {s.note && <span className="text-[7px] px-1.5 py-0.5 rounded bg-[var(--color-steel)]/10 text-[var(--color-steel)]" title={s.note}>&#128221; note</span>}
                          </div>
                          <span className="text-[8px] text-[var(--color-text-dim)]">{new Date(s.discoveredAt).toLocaleDateString()}</span>
                        </div>
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[11px] font-bold text-[var(--color-text)]">{s.source}</span>
                            <span className="flex items-center gap-1">
                              <span className="w-6 h-0 border-t-2" style={{ borderColor: tc, borderStyle: s.type === "opposes" ? "dashed" : s.type === "stories" ? "dotted" : "solid" }} />
                              <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ color: tc, backgroundColor: `${tc}15` }}>{tl}</span>
                              <span className="w-4 h-0 border-t-2" style={{ borderColor: tc }} />
                              <span style={{ color: tc }}>&#9654;</span>
                            </span>
                            <span className="text-[11px] font-bold text-[var(--color-text)]">{s.target}</span>
                          </div>
                          {/* Contradiction banner */}
                          {s.contradiction && (
                            <div className="flex items-center gap-3 p-2.5 mb-3 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/5">
                              <span className="text-[14px]">&#9733;</span>
                              <div className="flex-1">
                                <p className="text-[9px] font-bold text-[#f59e0b]">BOTH SIDES: This entity is playing both sides</p>
                                <p className="text-[8px] text-[var(--color-text-dim)] mt-0.5">
                                  This card: <span className="font-bold text-[var(--color-text)]">{s.type === "opposes" ? "opposing" : "supporting"}</span> ({s.contradiction.ratio}% of total)
                                  {" "}&middot;{" "}
                                  Also: <span className="font-bold text-[var(--color-text)]">{s.contradiction.counterpartDisplay}</span> ({100 - s.contradiction.ratio}%)
                                  {" "}&middot;{" "}
                                  Total influence: <span className="font-bold text-[var(--color-text)]">${(s.contradiction.totalInfluence / 1e6).toFixed(2)}M</span>
                                </p>
                              </div>
                            </div>
                          )}
                          {/* Transparency + Partisan + Dollar meters (hidden in compact) */}
                          {!suggestionsCompact && s.transparency && s.partisan && (
                            <div className="flex gap-3 mb-3 flex-wrap">
                              <div className="flex-1 min-w-[200px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[7px] uppercase tracking-wider text-[var(--color-text-dim)]">Transparency</span>
                                  <span className="text-[9px] font-bold" style={{ color: s.transparency.tierColor }}>{s.transparency.tier} {s.transparency.score}/100</span>
                                </div>
                                <div className="relative h-2.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${s.transparency.score}%`, background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #5b8dce 70%, #22c55e 100%)" }} />
                                  <div className="absolute inset-y-0 rounded-full w-1.5 bg-white shadow" style={{ left: `${Math.max(2, Math.min(98, s.transparency.score))}%`, transform: "translateX(-50%)" }} />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[6px] text-[#ef4444]">OBSCURED</span>
                                  <span className="text-[6px] text-[#f59e0b]">OPAQUE</span>
                                  <span className="text-[6px] text-[#5b8dce]">DISCLOSED</span>
                                  <span className="text-[6px] text-[#22c55e]">TRANSPARENT</span>
                                </div>
                                {s.transparency.factors.length > 0 && (
                                  <div className="mt-1.5 space-y-0.5">
                                    {s.transparency.factors.slice(0, 3).map((f: TransparencyData["factors"][0], i: number) => (
                                      <div key={i} className="flex items-center gap-1 text-[7px]">
                                        <span className={f.impact < 0 ? "text-[#ef4444]" : "text-[#22c55e]"}>{f.impact > 0 ? "+" : ""}{f.impact}</span>
                                        <span className="text-[var(--color-text-dim)]">{f.factor}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="w-[160px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2.5">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[7px] uppercase tracking-wider text-[var(--color-text-dim)]">Partisan Flow</span>
                                  <span className="text-[8px] font-bold" style={{ color: s.partisan.isCrossParty ? "#f59e0b" : s.partisan.flow < -25 ? "#5b8dce" : s.partisan.flow > 25 ? "#ef4444" : "#7a7a86" }}>{s.partisan.label}</span>
                                </div>
                                <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "linear-gradient(90deg, #2563eb 0%, #7a7a86 50%, #dc2626 100%)" }}>
                                  <div className="absolute inset-y-0 w-2 bg-white rounded-full shadow" style={{ left: `${50 + s.partisan.flow / 2}%`, transform: "translateX(-50%)" }} />
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span className="text-[6px] text-[#2563eb]">DEM</span>
                                  <span className="text-[6px] text-[#7a7a86]">Neutral</span>
                                  <span className="text-[6px] text-[#dc2626]">GOP</span>
                                </div>
                                <div className="flex justify-between mt-0.5 text-[7px] text-[var(--color-text-dim)]">
                                  <span>{s.partisan.sourceLabel}</span>
                                  <span>{s.partisan.targetLabel}</span>
                                </div>
                              </div>
                              {s.dollars?.display && (
                                <div className="w-[100px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-2.5 flex flex-col items-center justify-center">
                                  <span className="text-[7px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1">Amount</span>
                                  <span className="text-[14px] font-bold text-[var(--color-green)]">{s.dollars.display}</span>
                                  <span className="text-[7px] mt-0.5" style={{ color: s.dollars.tier === "massive" ? "#ef4444" : s.dollars.tier === "major" ? "#f59e0b" : s.dollars.tier === "significant" ? "#5b8dce" : "#7a7a86" }}>{s.dollars.tier}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {!suggestionsCompact && (
                            <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded p-3 mb-3">
                              <p className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1.5">Why this connection?</p>
                              <p className="text-[10px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap">{s.reasoning}</p>
                            </div>
                          )}
                          {/* Notepad */}
                          <div className="mb-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              placeholder="Add a note for Claude..."
                              defaultValue={s.note || ""}
                              onBlur={e => { if (e.target.value !== (s.note || "")) saveNote(s.id, e.target.value) }}
                              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
                              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2.5 py-1.5 text-[9px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]/50 focus:outline-none focus:border-[var(--color-steel)] transition-colors"
                            />
                          </div>
                          {/* Action row */}
                          {acted ? (
                            <div className="flex items-center gap-2 text-[9px]">
                              <span className={`px-2 py-1 rounded ${s.actionState === "approve" ? "bg-[var(--color-green)]/15 text-[var(--color-green)]" : s.actionState === "reject" ? "bg-[var(--color-red)]/15 text-[var(--color-red)]" : "bg-[#f59e0b]/15 text-[#f59e0b]"}`}>{s.actionState === "approve" ? "Approved" : s.actionState === "reject" ? "Rejected" : "Deferred"}</span>
                              {s.actionReason && <span className="text-[var(--color-text-dim)]">{s.actionReason}</span>}
                              {s.actionAt && <span className="text-[var(--color-text-dim)] text-[8px]">{new Date(s.actionAt).toLocaleDateString()}</span>}
                              <button onClick={() => undoAction(s.id)} disabled={saving} className="ml-2 text-[8px] px-2 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50" title="Undo this action">&#8634; Undo</button>
                              <label className="ml-auto flex items-center gap-1.5 cursor-pointer" title="Flag for Research Claude">
                                <input type="checkbox" checked={!!s.investigate} onChange={() => toggleInvestigate(s.id, !!s.investigate)} className="rounded accent-[#a855f7]" />
                                <span className={`text-[8px] ${s.investigate ? "text-[#a855f7] font-bold" : "text-[var(--color-text-dim)]"}`}>&#9888; Priority</span>
                              </label>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={() => actOnSuggestion(s.id, "approve")} disabled={saving} className="flex items-center gap-1 text-[9px] px-3 py-1.5 rounded bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 hover:bg-[var(--color-green)]/25 disabled:opacity-50">&#10003; Approve</button>
                              <button onClick={() => setRejectModal({ id: s.id, source: s.source, target: s.target })} disabled={saving} className="flex items-center gap-1 text-[9px] px-3 py-1.5 rounded bg-[var(--color-red)]/15 text-[var(--color-red)] border border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/25 disabled:opacity-50">&#10005; Reject</button>
                              <button onClick={() => actOnSuggestion(s.id, "defer")} disabled={saving} className="flex items-center gap-1 text-[9px] px-3 py-1.5 rounded text-[var(--color-text-dim)] border border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50">&#9201; Later</button>
                              {s.autoCreate && <span className="text-[7px] px-1.5 py-0.5 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">auto-create eligible</span>}
                              <label className="ml-auto flex items-center gap-1.5 cursor-pointer" title="Flag for Research Claude">
                                <input type="checkbox" checked={!!s.investigate} onChange={() => toggleInvestigate(s.id, !!s.investigate)} className="rounded accent-[#a855f7]" />
                                <span className={`text-[8px] ${s.investigate ? "text-[#a855f7] font-bold" : "text-[var(--color-text-dim)]"}`}>&#9888; Priority</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  </div>
                  {suggestionsHasMore && (
                    <button onClick={() => loadSuggestions(true)}
                      className="w-full mt-3 py-2.5 text-[10px] text-[var(--color-steel)] bg-[var(--color-steel)]/10 border border-[var(--color-steel)]/20 rounded-lg hover:bg-[var(--color-steel)]/20 transition-colors">
                      Load more ({suggestionsTotalFiltered - suggestions.length} remaining)
                    </button>
                  )}
                </div>
              )}
              {newProfiles.length > 0 && (
                <div className="mt-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
                  <h4 className="text-[10px] uppercase tracking-wider text-[#f59e0b] mb-3">New Profiles Needed <span className="px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[8px]">{newProfiles.length}</span></h4>
                  <p className="text-[9px] text-[var(--color-text-dim)] mb-3">Names appearing frequently but without profiles. Flag for Research Claude to create.</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {newProfiles.slice(0, 30).map(e => (
                      <div key={e.name} className="flex items-start gap-3 p-2 rounded bg-[var(--color-bg)] border border-[var(--color-border)] group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[var(--color-text)]">{e.name}</span>
                            <span className="text-[7px] px-1.5 py-0.5 rounded" style={{ color: e.suggestedType === "politician" ? "#5b8dce" : "#22c55e", backgroundColor: (e.suggestedType === "politician" ? "#5b8dce" : "#22c55e") + "15" }}>{e.suggestedType}</span>
                            <span className="text-[8px] text-[var(--color-text-dim)]">{e.mentions} mentions</span>
                            {e.hasDollarContext && <span className="text-[7px] px-1 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">$</span>}
                            {e.hasLeakContext && <span className="text-[7px] px-1 rounded bg-[#ef4444]/10 text-[#ef4444]">leak</span>}
                          </div>
                          <p className="text-[8px] text-[var(--color-text-dim)] mt-1">{e.contexts.slice(0, 2).join(" | ")}</p>
                          <p className="text-[7px] text-[var(--color-text-dim)] mt-0.5">Mentioned by: {e.mentionedBy.slice(0, 4).join(", ")}{e.mentionedBy.length > 4 ? ` +${e.mentionedBy.length - 4} more` : ""}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={async () => {
                            try {
                              await fetch("/api/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: `new-profile::${e.name}`, action: "investigate", source: e.name, target: e.name, type: e.suggestedType, reasoning: `Unnamed entity with ${e.mentions} mentions across ${e.mentionedBy.length} profiles. Needs profile creation.` }) })
                              showToast(`Flagged "${e.name}" for Research Claude`)
                            } catch { showToast("Failed to flag profile") }
                          }} className="text-[7px] px-2 py-1 rounded bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/25 whitespace-nowrap">
                            &#9888; Flag for Research
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">Loading connections...</div>
          ) : !selected ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
              <p className="text-xs text-[var(--color-text-dim)]">Search for a profile or click one from the sidebar</p>
            </div>
          ) : tab === "list" ? (
            /* ===== LIST VIEW ===== */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${TYPE_COLORS[selected.type] || "#7a7a86"}15`, color: TYPE_COLORS[selected.type] }}>
                  {selected.title[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">{selected.title}</h3>
                  <span className="text-[9px]" style={{ color: TYPE_COLORS[selected.type] }}>{selected.type} — {selected.connectionCount} connections</span>
                </div>
                <button onClick={clearSelection} className="ml-auto text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-xs px-2 py-1 rounded hover:bg-[var(--color-bg-hover)]">Clear</button>
              </div>

              {(["related", "donors", "opposes", "stories"] as const).map((rt) => {
                const items = selected[rt]
                if (items.length === 0) return null
                return (
                  <div key={rt} className="mb-4">
                    <h4 className="text-[9px] uppercase tracking-wider mb-2" style={{ color: REL_COLORS[rt] }}>{REL_LABELS[rt]} ({items.length})</h4>
                    <div className="space-y-1">
                      {items.map((name) => {
                        const shared = sharedMap.get(name) || []
                        const targetProfile = profileMap.get(name)
                        return (
                          <div key={name} className="flex items-center gap-2 p-2 bg-[var(--color-bg)] rounded hover:bg-[var(--color-bg-hover)] transition-colors group">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: REL_COLORS[rt] }} />
                            <button onClick={() => { const norm = (s: string) => s.replace(/^_/, "").replace(/\s*Master Profile.*/, "").trim().toLowerCase(); const target = norm(name); const tp = topConnected.find((t) => norm(t.title) === target) || profiles.find((p) => norm(p.title) === target); if (tp) selectProfile(tp) }}
                              className="text-[11px] text-[var(--color-text)] hover:text-[var(--color-steel)] text-left flex-1">{name}</button>
                            {targetProfile && <span className="text-[7px] px-1 rounded" style={{ color: typeColor(targetProfile.type), backgroundColor: `${typeColor(targetProfile.type)}15` }}>{targetProfile.type}</span>}
                            {shared.length > 0 && (
                              <span className="text-[7px] px-1.5 py-0.5 rounded bg-[var(--color-amber)]/10 text-[var(--color-amber)]" title={shared.join(", ")}>
                                {shared.length} shared
                              </span>
                            )}
                            {/* Change type dropdown */}
                            <select
                              value={rt}
                              onChange={(e) => changeConnectionType(name, rt, e.target.value as "related" | "donors" | "opposes" | "stories")}
                              disabled={saving}
                              className="text-[8px] px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              style={{ color: REL_COLORS[rt] }}>
                              <option value="related" style={{ color: "#5b8dce" }}>Related</option>
                              <option value="donors" style={{ color: "#22c55e" }}>Funded By</option>
                              <option value="opposes" style={{ color: "#ef4444" }}>Opposes</option>
                              <option value="stories" style={{ color: "#ec4899" }}>Stories</option>
                            </select>
                            <button onClick={() => removeConnection(name, rt)} disabled={saving}
                              className="text-[8px] px-1.5 py-0.5 rounded text-[var(--color-red)]/60 hover:text-[var(--color-red)] hover:bg-[var(--color-red)]/10 opacity-0 group-hover:opacity-100 transition-all">
                              Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {addConnectionFormJSX}
            </div>
          ) : tab === "explorer" ? (
            /* ===== EXPLORER ===== */
            <div>
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {explorerPath.map((name, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[var(--color-text-dim)]">→</span>}
                    <button onClick={() => setExplorerPath(explorerPath.slice(0, i + 1))}
                      className={`text-[10px] px-2 py-1 rounded ${i === explorerPath.length - 1 ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] font-bold" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                      {name}
                    </button>
                  </span>
                ))}
              </div>

              <div className="bg-[var(--color-bg-card)] border border-[var(--color-steel)]/30 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-bold text-[var(--color-text)] mb-1">{explorerCurrent}</h3>
                <p className="text-[10px] text-[var(--color-text-dim)]">{explorerConnections.length} connections from this node</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {explorerConnections.map((conn, i) => {
                  const targetName = conn.source === explorerCurrent ? conn.target : conn.source
                  const targetConns = getProfileConnections(targetName)
                  const targetProfile = profiles.find((p) => p.title === targetName)
                  return (
                    <div key={i} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-steel)]/30 transition-colors group">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: REL_COLORS[conn.relationshipType] }} />
                        {/* Type dropdown — same as List View */}
                        <select
                          value={conn.relationshipType}
                          onChange={(e) => changeConnectionType(targetName, conn.relationshipType, e.target.value as "related" | "donors" | "opposes" | "stories")}
                          disabled={saving}
                          className="text-[8px] uppercase tracking-wider bg-transparent border-none cursor-pointer focus:outline-none"
                          style={{ color: REL_COLORS[conn.relationshipType] }}>
                          <option value="related" style={{ color: "#5b8dce", background: "#141419" }}>Related</option>
                          <option value="donors" style={{ color: "#22c55e", background: "#141419" }}>Funded By</option>
                          <option value="opposes" style={{ color: "#ef4444", background: "#141419" }}>Opposes</option>
                          <option value="stories" style={{ color: "#ec4899", background: "#141419" }}>Stories</option>
                        </select>
                        <button onClick={() => removeConnection(targetName, conn.relationshipType)} disabled={saving}
                          className="ml-auto text-[8px] px-1.5 py-0.5 rounded text-[var(--color-red)]/60 hover:text-[var(--color-red)] hover:bg-[var(--color-red)]/10 opacity-0 group-hover:opacity-100 transition-all">
                          Remove
                        </button>
                      </div>
                      <button onClick={() => expandNode(targetName)} className="text-left w-full">
                        <p className="text-[11px] font-bold text-[var(--color-text)] hover:text-[var(--color-steel)] transition-colors">{targetName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {targetProfile && <span className="text-[7px] px-1 rounded" style={{ color: typeColor(targetProfile.type), backgroundColor: `${typeColor(targetProfile.type)}15` }}>{targetProfile.type}</span>}
                          <span className="text-[8px] text-[var(--color-text-dim)]">{targetConns.length} connections →</span>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
              {explorerConnections.length === 0 && (
                <div className="text-xs text-[var(--color-text-dim)] text-center py-8">No connections from this node</div>
              )}
              {addConnectionFormJSX}
            </div>
          ) : (
            /* ===== GRAPH VIEW — D3 force-directed ===== */
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4" style={{ minHeight: "60vh" }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-[10px] text-[var(--color-text-dim)]">
                  {selected.title} — {selected.connectionCount} connections
                  {hoveredNode && <span className="ml-2 text-[var(--color-text)]">| {hoveredNode}</span>}
                </div>
                {/* Type filter toggles */}
                <div className="flex items-center gap-1">
                  {(["donors", "related", "opposes", "stories"] as const).map(t => {
                    const active = graphFilterTypes.has(t)
                    const count = selected[t].length
                    if (count === 0) return null
                    return (
                      <button key={t}
                        onClick={() => setGraphFilterTypes(prev => {
                          const next = new Set(prev)
                          if (next.has(t)) next.delete(t); else next.add(t)
                          return next
                        })}
                        className={`px-2 py-1 rounded text-[9px] font-mono border transition-all ${active ? "border-transparent text-white" : "border-[var(--color-border)] text-[var(--color-text-dim)] opacity-40"}`}
                        style={active ? { backgroundColor: REL_COLORS[t] } : {}}
                        title={`${active ? "Hide" : "Show"} ${REL_LABELS[t]} (${count})`}>
                        {REL_LABELS[t]} ({count})
                      </button>
                    )
                  })}
                  <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
                  {/* Entity type filter toggles — distinct palette from relationship row */}
                  {([
                    { key: "politician", label: "Politicians", color: "#6366f1" },
                    { key: "donor", label: "Donors", color: "#14b8a6" },
                    { key: "think-tank", label: "Think Tanks", color: "#d946ef" },
                    { key: "lobbying-firm", label: "K Street", color: "#f97316" },
                    { key: "media-profile", label: "Media", color: "#facc15" },
                  ] as const).map(({ key, label, color }) => {
                    const active = graphEntityFilters.has(key)
                    return (
                      <button key={key}
                        onClick={() => setGraphEntityFilters(prev => {
                          const next = new Set(prev)
                          if (next.has(key)) { next.delete(key); if (key === "donor") next.delete("corporation") }
                          else { next.add(key); if (key === "donor") next.add("corporation") }
                          return next
                        })}
                        className={`px-1.5 py-0.5 rounded text-[7px] font-mono border transition-all ${active ? "border-transparent text-white" : "border-[var(--color-border)] text-[var(--color-text-dim)] opacity-40"}`}
                        style={active ? { backgroundColor: color } : {}}
                        title={`${active ? "Hide" : "Show"} ${label}`}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* D3 force graph SVG */}
              <div className="border border-[var(--color-border)] rounded-lg overflow-hidden" style={{ height: "55vh" }}>
                <svg ref={d3SvgRef} width="100%" height="100%" style={{ display: "block" }} />
              </div>

              {/* Legend — edges (relationship type) */}
              <div className="flex items-center justify-center gap-3 mt-2 flex-wrap">
                <span className="text-[7px] text-[var(--color-text-dim)] uppercase tracking-wider">Edges:</span>
                <span className="flex items-center gap-1 text-[8px] text-[#22c55e]"><span className="w-4 h-0 border-t border-[#22c55e]" /> Donors</span>
                <span className="flex items-center gap-1 text-[8px] text-[#5b8dce]"><span className="w-4 h-0 border-t border-[#5b8dce]" /> Related</span>
                <span className="flex items-center gap-1 text-[8px] text-[#ef4444]"><span className="w-4 h-0 border-t border-dashed border-[#ef4444]" /> Opposes</span>
                <span className="flex items-center gap-1 text-[8px] text-[#ec4899]"><span className="w-4 h-0 border-t border-dotted border-[#ec4899]" /> Stories</span>
                <span className="flex items-center gap-1 text-[8px] text-[#ef4444] font-bold"><span className="w-4 h-0 border-t-2 border-dashed border-[#ef4444]" /> Both-sides</span>
              </div>
              {/* Legend — nodes (inner = entity type, outer ring = relationship type) */}
              <div className="flex items-center justify-center gap-3 mt-1 flex-wrap">
                <span className="text-[7px] text-[var(--color-text-dim)] uppercase tracking-wider">Inner:</span>
                <span className="flex items-center gap-1 text-[8px] text-[#5b8dce]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#5b8dce" }} /> Politician</span>
                <span className="flex items-center gap-1 text-[8px] text-[#22c55e]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} /> Donor</span>
                <span className="flex items-center gap-1 text-[8px] text-[#a855f7]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#a855f7" }} /> Think Tank</span>
                <span className="flex items-center gap-1 text-[8px] text-[#f59e0b]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} /> K Street</span>
                <span className="flex items-center gap-1 text-[8px] text-[#ef4444]"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} /> Media</span>
                <span className="w-px h-3 bg-[var(--color-border)]" />
                <span className="text-[7px] text-[var(--color-text-dim)] uppercase tracking-wider">Ring:</span>
                <span className="text-[7px] text-[var(--color-text-dim)]">matches edge color (relationship type)</span>
                <span className="text-[7px] text-[var(--color-text-dim)] ml-1">| Scroll zoom | Drag nodes | Right-click edit</span>
              </div>

              {/* Relationship notes summary — collapsible */}
              {Object.keys(relationNotes).length > 0 && (
                <div className="mt-3 p-3 bg-[#f59e0b]/5 border border-[#f59e0b]/20 rounded-lg">
                  <button onClick={() => setNotesCollapsed((c) => !c)}
                    className="w-full text-left text-[9px] uppercase tracking-wider text-[#f59e0b] flex items-center gap-1">
                    <svg width={10} height={10} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    Editorial Notes ({Object.keys(relationNotes).length})
                    <svg className={`w-3 h-3 ml-auto transition-transform ${notesCollapsed ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {!notesCollapsed && (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto mt-2">
                      {Object.entries(relationNotes).map(([key, val]) => {
                        const target = key.split("::")[1]
                        return (
                          <div key={key} className="flex items-start gap-2 text-[9px]">
                            <button onClick={(e) => { e.stopPropagation(); openNotePopover(target, e.clientX, e.clientY) }}
                              className="text-[#f59e0b] font-bold shrink-0 hover:underline">{target}</button>
                            <span className="text-[var(--color-text-dim)] leading-snug">{val.note}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {addConnectionFormJSX}
            </div>
          )}
        </div>

        

        {/* Sidebar — discovery widgets */}
        <div className="space-y-4">
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-1">
            {[
              { key: "all", label: "All", color: "#7a7a86" },
              { key: "politician", label: "Politicians", color: "#5b8dce" },
              { key: "donor", label: "Donors", color: "#22c55e" },
              { key: "think-tank", label: "Think Tanks", color: "#a855f7" },
              { key: "lobbying-firm", label: "K Street", color: "#f59e0b" },
              { key: "media-profile", label: "Media", color: "#ef4444" },
              { key: "story", label: "Stories", color: "#ec4899" },
            ].map((t) => (
              <button key={t.key} onClick={() => setSidebarTypeFilter(t.key)}
                className={`text-[7px] px-1.5 py-1 rounded transition-all ${sidebarTypeFilter === t.key ? "bg-current/10 font-bold" : "text-[var(--color-text-dim)]"}`}
                style={{ color: sidebarTypeFilter === t.key ? t.color : undefined }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Most Connected */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3">
            <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Most Connected</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {topConnected
                .filter((p) => sidebarTypeFilter === "all" || p.type === sidebarTypeFilter)
                .slice(0, 50)
                .map((p, i) => (
                <button key={p.title} onClick={() => selectProfile(p)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-[var(--color-bg-hover)] transition-colors ${selected?.title === p.title ? "bg-[var(--color-steel)]/10" : ""}`}>
                  <span className="text-[8px] text-[var(--color-text-dim)] w-4">{i + 1}</span>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[p.type] || "#7a7a86" }} />
                  <span className="text-[9px] text-[var(--color-text)] flex-1 truncate">{p.title}</span>
                  <span className="text-[8px] font-bold text-[var(--color-steel)]">{p.connectionCount}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Connections */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3">
            <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Recent Connections</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {recentConnections
                .filter((c) => sidebarTypeFilter === "all" || c.sourceType === sidebarTypeFilter)
                .slice(0, 20)
                .map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[8px] py-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: REL_COLORS[c.relationshipType] }} />
                  <span className="text-[var(--color-text)] truncate">{c.source}</span>
                  <span className="text-[var(--color-text-dim)]">→</span>
                  <span className="text-[var(--color-text)] truncate">{c.target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* No Connections — excludes internal docs */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3">
            <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">
              No Connections ({sidebarTypeFilter === "all" ? filteredUnconnectedCount : filteredUnconnected.filter((p) => p.type === sidebarTypeFilter).length})
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredUnconnected
                .filter((p) => sidebarTypeFilter === "all" || p.type === sidebarTypeFilter)
                .slice(0, 20)
                .map((p) => (
                <button key={p.title} onClick={() => selectProfile(p)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded text-left hover:bg-[var(--color-bg-hover)] text-[9px] text-[var(--color-text-dim)]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[p.type] || "#7a7a86" }} />
                  <span className="truncate">{p.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
