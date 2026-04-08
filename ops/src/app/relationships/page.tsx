"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Profile } from "@/lib/vault"
import { typeColor } from "@/lib/vault"

interface Connection {
  source: string; sourcePath: string; sourceType: string
  target: string; relationshipType: "related" | "donors" | "opposes" | "stories"
}
interface ConnectedProfile {
  title: string; path: string; type: string; connectionCount: number
  related: string[]; donors: string[]; opposes: string[]
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

  const [tab, setTab] = useState<"list" | "explorer" | "graph">("list")
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

  // Context menu for changing connection types
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; name: string; type: "related" | "donors" | "opposes" | "stories" } | null>(null)

  // Close context menu on click anywhere
  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [])

  // Graph zoom + pan
  const [graphZoom, setGraphZoom] = useState(1)
  const [graphPan, setGraphPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const graphRef = useRef<HTMLDivElement>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)

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
    // Only drag on the background, not on node buttons
    if ((e.target as HTMLElement).closest("button")) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, panX: graphPan.x, panY: graphPan.y }
  }, [graphPan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setGraphPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy })
  }, [isDragging])

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

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
      connectionCount: 0, related: [], donors: [], opposes: [],
    }
    setSelected(cp)
    setSearch(cp.title)
    setShowDropdown(false)
    setExplorerPath([cp.title])
    setGraphZoom(1)
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

  // Add Connection form (reusable)
  const AddConnectionForm = () => (
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

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--color-bg-card)] border border-[var(--color-green)]/30 rounded-lg px-4 py-3 text-xs text-[var(--color-green)] shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-green)]" />{toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Relationship Mapper</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">{breakdown.total} connections across the vault</p>
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

      {/* Stats bar */}
      <div className="flex gap-3 mb-4 flex-wrap">
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
            {(["list", "explorer", "graph"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded text-xs transition-all ${tab === t ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                {t === "list" ? "List View" : t === "explorer" ? "Explorer" : "Graph"}
              </button>
            ))}
          </div>

          {loading ? (
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
                        const shared = getSharedConnections(selected.title, name)
                        const targetProfile = profiles.find((p) => p.title === name)
                        return (
                          <div key={name} className="flex items-center gap-2 p-2 bg-[var(--color-bg)] rounded hover:bg-[var(--color-bg-hover)] transition-colors group">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: REL_COLORS[rt] }} />
                            <button onClick={() => { const tp = topConnected.find((t) => t.title === name) || profiles.find((p) => p.title === name); if (tp) selectProfile(tp) }}
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
              <AddConnectionForm />
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
              <AddConnectionForm />
            </div>
          ) : (
            /* ===== GRAPH VIEW — zoomable ===== */
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4" style={{ minHeight: "60vh" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-[var(--color-text-dim)]">
                  {selected.title} — {selected.connectionCount} connections
                </div>
                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                  <button onClick={() => setGraphZoom((z) => Math.max(0.3, z - 0.15))}
                    className="w-6 h-6 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-sm flex items-center justify-center">-</button>
                  <span className="text-[9px] text-[var(--color-text-dim)] w-10 text-center">{Math.round(graphZoom * 100)}%</span>
                  <button onClick={() => setGraphZoom((z) => Math.min(3, z + 0.15))}
                    className="w-6 h-6 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-sm flex items-center justify-center">+</button>
                  <button onClick={() => { setGraphZoom(1); setGraphPan({ x: 0, y: 0 }) }}
                    className="text-[8px] px-2 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] ml-1">Reset</button>
                </div>
              </div>

              {/* Draggable + zoomable graph container */}
              <div ref={graphContainerRef}
                className="overflow-hidden border border-[var(--color-border)] rounded-lg select-none"
                style={{ maxHeight: "55vh", cursor: isDragging ? "grabbing" : "grab" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}>
                <div ref={graphRef} className="relative"
                  style={{ height: `${Math.max(500, selected.connectionCount * 20)}px`, width: `${Math.max(500, selected.connectionCount * 20)}px`, transform: `scale(${graphZoom}) translate(${graphPan.x / graphZoom}px, ${graphPan.y / graphZoom}px)`, transformOrigin: "center center" }}>
                  {/* Center node */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full flex items-center justify-center text-center z-10"
                    style={{ backgroundColor: `${TYPE_COLORS[selected.type]}20`, border: `2px solid ${TYPE_COLORS[selected.type]}` }}>
                    <span className="text-[9px] font-bold text-[var(--color-text)] px-2 leading-tight">{selected.title}</span>
                  </div>

                  {/* Orbiting nodes — no limit */}
                  {[...selected.related.map((n, i) => ({ name: n, type: "related" as const, i })),
                    ...selected.donors.map((n, i) => ({ name: n, type: "donors" as const, i: i + selected.related.length })),
                    ...selected.opposes.map((n, i) => ({ name: n, type: "opposes" as const, i: i + selected.related.length + selected.donors.length })),
                  ].map((node, idx, arr) => {
                    const angle = (idx / arr.length) * 2 * Math.PI - Math.PI / 2
                    const radius = Math.min(38, 25 + arr.length * 0.3)
                    const x = 50 + radius * Math.cos(angle)
                    const y = 50 + radius * Math.sin(angle)

                    return (
                      <div key={node.name + idx}>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                          <line x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                            stroke={REL_COLORS[node.type]}
                            strokeWidth={node.type === "opposes" ? 1 : 1.5}
                            strokeDasharray={node.type === "opposes" ? "4 2" : "none"}
                            opacity={0.4} />
                        </svg>
                        <div className="absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 z-10 group/node"
                          style={{ left: `${x}%`, top: `${y}%` }}>
                          <button
                            onClick={() => { const tp = topConnected.find((t) => t.title === node.name) || profiles.find((p) => p.title === node.name); if (tp) selectProfile(tp) }}
                            className="w-full h-full rounded-full flex items-center justify-center text-center hover:scale-110 transition-transform"
                            style={{ backgroundColor: `${REL_COLORS[node.type]}15`, border: `1.5px solid ${REL_COLORS[node.type]}50` }}
                            title={node.name}>
                            <span className="text-[7px] text-[var(--color-text)] px-1 leading-tight line-clamp-3">{node.name}</span>
                          </button>
                          {/* Edit button — opens context menu on click */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, name: node.name, type: node.type }) }}
                            className="absolute -top-1 -left-1 w-5 h-5 rounded-full text-white text-[8px] flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity hover:scale-110"
                            style={{ backgroundColor: REL_COLORS[node.type] }}
                            title="Change type">
                            <svg width={8} height={8} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Remove button */}
                          <button onClick={(e) => { e.stopPropagation(); removeConnection(node.name, node.type) }} disabled={saving}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-red)] text-white text-[8px] flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-opacity hover:scale-110"
                            title="Remove">×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[8px] text-[#5b8dce]"><span className="w-6 h-0 border-t border-[#5b8dce]" /> Related</span>
                <span className="flex items-center gap-1 text-[8px] text-[#22c55e]"><span className="w-6 h-0 border-t border-[#22c55e]" /> Donors</span>
                <span className="flex items-center gap-1 text-[8px] text-[#ef4444]"><span className="w-6 h-0 border-t border-dashed border-[#ef4444]" /> Opposes</span>
                <span className="flex items-center gap-1 text-[8px] text-[#ec4899]"><span className="w-6 h-0 border-t border-dotted border-[#ec4899]" /> Stories</span>
                <span className="text-[7px] text-[var(--color-text-dim)] ml-2">Scroll to zoom · Click+drag to pan</span>
              </div>
              <AddConnectionForm />
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
