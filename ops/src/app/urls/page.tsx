"use client"

/**
 * URL Manager — ops/src/app/urls/page.tsx
 *
 * RULES (re-learned 2026-04-09; see `content/Vault Rules.md` § URL Policy):
 *
 * 1. URL fixing is EDITOR-ONLY (David). This UI is David's manual triage
 *    workflow. Neither Research Claude nor Code Claude is permitted to
 *    hunt, replace, or auto-verify URLs. The Claudes may FLAG broken URLs
 *    in Session State or Admin Notes, but never edit them.
 * 2. Do NOT add auto-fix, auto-replace, or bulk-URL-hunt buttons to this UI
 *    without explicit sign-off from David. Any such feature must preserve
 *    the rule that URL changes come only from deliberate editor actions.
 * 3. Triage writes (via `/api/urls/save`) are the one place profile body
 *    text gets edited directly (to strikethrough a broken link or add a
 *    `(NEEDS REVIEW)` marker). This is intentional and the one exception
 *    to the frontmatter-only rule.
 * 4. If a future feature needs to auto-fix URLs from a source hunter, that
 *    belongs in a SEPARATE suggestions queue that David approves manually
 *    — never wired directly into this save path.
 */

import { useState, useEffect, useMemo, useCallback } from "react"

interface VaultUrl {
  id: string
  url: string
  label: string
  tier?: number
  archived: boolean
  triageStatus?: "verified" | "broken" | "unsure" | "yellow" | "unchecked"
  profile: string
  profilePath: string
  domain: string
}

type UrlStatus = "unchecked" | "ok" | "broken" | "slow" | "redirect" | "unsure"
type CompletedStatus = "confirmed" | "archived-done" | "flagged-done" | "reviewed"

interface CheckedUrl extends VaultUrl {
  status: UrlStatus
  code?: number
  ms?: number
}

interface CompletedUrl extends VaultUrl {
  completedStatus: CompletedStatus
  completedDate: string
}

// Completed URLs now derived from vault triageStatus — no localStorage needed

export default function UrlManagerPage() {
  const [urls, setUrls] = useState<CheckedUrl[]>([])
  const [completed, setCompleted] = useState<CompletedUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 })
  const [search, setSearch] = useState("")
  const [domainFilter, setDomainFilter] = useState<string>("all")
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, UrlStatus>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [uncheckedVisible, setUncheckedVisible] = useState(20)
  const [checkResults, setCheckResults] = useState<Record<string, { status: string; code?: number; ms?: number; redirectUrl?: string }>>({})
  const [urlNotes, setUrlNotes] = useState<Record<string, string>>({})

  // Batch selection mode
  const [batchMode, setBatchMode] = useState(false)
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set())

  const toggleBatchItem = (id: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const batchAction = (status: UrlStatus) => {
    const newOverrides = { ...overrides }
    for (const id of batchSelected) newOverrides[id] = status
    setOverrides(newOverrides)
    setHasChanges(true)
    setBatchSelected(new Set())
    showToast(`Marked ${batchSelected.size} URLs as ${status}`)
  }

  // Show toast notification
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Load URLs from vault (single source of truth)
  const loadFromVault = useCallback((refresh = false) => {
    setLoading(true)
    fetch(`/api/urls${refresh ? "?refresh=true" : ""}`)
      .then((r) => r.json())
      .then((data) => {
        const active: CheckedUrl[] = []
        const vaultCompleted: CompletedUrl[] = []

        for (const u of (data.urls || []) as VaultUrl[]) {
          if (u.archived) {
            vaultCompleted.push({ ...u, completedStatus: "archived-done", completedDate: "from vault" })
          } else if (u.triageStatus === "verified") {
            vaultCompleted.push({ ...u, completedStatus: "confirmed", completedDate: "from vault" })
          } else if (u.triageStatus === "unsure") {
            vaultCompleted.push({ ...u, completedStatus: "flagged-done", completedDate: "from vault" })
          } else {
            active.push({ ...u, status: "unchecked" as UrlStatus })
          }
        }

        setUrls(active)
        setCompleted(vaultCompleted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { loadFromVault() }, [loadFromVault])

  const domains = useMemo(() => {
    const d = new Map<string, number>()
    urls.forEach((u) => { if (u.domain) d.set(u.domain, (d.get(u.domain) || 0) + 1) })
    return Array.from(d.entries()).sort((a, b) => b[1] - a[1])
  }, [urls])

  const filtered = useMemo(() => {
    let result = urls
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((u) =>
        u.url.toLowerCase().includes(q) || u.label.toLowerCase().includes(q) ||
        u.profile.toLowerCase().includes(q) || u.domain.toLowerCase().includes(q)
      )
    }
    if (domainFilter !== "all") result = result.filter((u) => u.domain === domainFilter)
    return result
  }, [urls, search, domainFilter])

  const getStatus = (u: CheckedUrl): UrlStatus => overrides[u.id] || u.status

  const greenUrls = filtered.filter((u) => getStatus(u) === "ok")
  const redUrls = filtered.filter((u) => getStatus(u) === "broken")
  const yellowUrls = filtered.filter((u) => getStatus(u) === "slow" || getStatus(u) === "redirect")
  const unsureUrls = filtered.filter((u) => getStatus(u) === "unsure")
  const uncheckedUrls = filtered.filter((u) => getStatus(u) === "unchecked")

  // Filter completed archive with same search/domain filters
  const filteredCompleted = useMemo(() => {
    let result = completed
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.url.toLowerCase().includes(q) || c.label.toLowerCase().includes(q) ||
        c.profile.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q)
      )
    }
    if (domainFilter !== "all") result = result.filter((c) => c.domain === domainFilter)
    return result
  }, [completed, search, domainFilter])

  const completedConfirmed = filteredCompleted.filter((c) => c.completedStatus === "confirmed")
  const completedArchived = filteredCompleted.filter((c) => c.completedStatus === "archived-done")
  const completedFlagged = filteredCompleted.filter((c) => c.completedStatus === "flagged-done")
  const completedReviewed = filteredCompleted.filter((c) => c.completedStatus === "reviewed")

  const checkAll = async () => {
    const toCheck = urls.filter((u) => !u.archived && getStatus(u) === "unchecked")
    setChecking(true)
    setCheckProgress({ done: 0, total: toCheck.length })

    const BATCH = 20
    for (let i = 0; i < toCheck.length; i += BATCH) {
      const batch = toCheck.slice(i, i + BATCH)
      try {
        const res = await fetch("/api/urls/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: batch.map((u) => u.url) }),
        })
        const data = await res.json()
        if (data.results) {
          // Store check results AND auto-triage
          setCheckResults((prev) => {
            const next = { ...prev }
            for (const u of batch) {
              const r = data.results[u.url]
              if (r) next[u.id] = { status: r.status, code: r.code, ms: r.ms, redirectUrl: r.redirectUrl }
            }
            return next
          })
          // Auto-move URLs based on check results
          setOverrides((prev) => {
            const next = { ...prev }
            for (const u of batch) {
              const r = data.results[u.url]
              if (r) {
                if (r.status === "ok") next[u.id] = "ok"
                else if (r.status === "broken") next[u.id] = "broken"
                else if (r.status === "slow" || r.status === "redirect") next[u.id] = "slow"
              }
            }
            return next
          })
          setHasChanges(true)
        }
      } catch { /* skip */ }
      setCheckProgress({ done: Math.min(i + BATCH, toCheck.length), total: toCheck.length })
    }
    setChecking(false)
    showToast(`Checked ${toCheck.length} URLs`)
  }

  const handleDragStart = (id: string) => setDragItem(id)
  const handleDrop = (targetStatus: UrlStatus) => {
    if (!dragItem) return
    setOverrides((prev) => ({ ...prev, [dragItem]: targetStatus }))
    setHasChanges(true)
    setDragItem(null)
  }
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const saveChanges = async () => {
    setSaving(true)
    const changes = Object.entries(overrides).map(([id, status]) => {
      const u = urls.find((u) => u.id === id)
      if (!u) return null
      return {
        id, url: u.url, label: u.label, tier: u.tier,
        profilePath: u.profilePath, profile: u.profile, domain: u.domain,
        newStatus: status === "slow" || status === "redirect" ? "unsure" : status,
      }
    }).filter(Boolean) as (VaultUrl & { newStatus: string; id: string })[]

    try {
      const res = await fetch("/api/urls/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes: changes.map((c) => ({
          url: c.url, label: c.label, tier: c.tier,
          profilePath: c.profilePath, profile: c.profile, newStatus: c.newStatus,
          note: urlNotes[c.id] || undefined,
        })) }),
      })
      const data = await res.json()
      if (data.success) {
        setOverrides({})
        setUrlNotes({})
        setHasChanges(false)
        setShowConfirm(false)
        showToast(`Saved: ${data.summary.archived} archived, ${data.summary.confirmed} confirmed, ${data.summary.flagged} flagged`)
        // Refresh from vault to get updated statuses
        loadFromVault(true)
      }
    } catch { showToast("Save failed") }
    finally { setSaving(false) }
  }

  // Move completed item back to active triage (revert in vault via save API)
  const undoCompleted = async (item: CompletedUrl) => {
    // To truly undo, we need to remove the marker in the vault
    // For now, move it to active locally — the user can re-triage and save
    setCompleted((prev) => prev.filter((c) => c.id !== item.id))
    setUrls((prev) => [...prev, { ...item, status: "unchecked" as UrlStatus }])
    showToast(`Moved "${item.label}" back to Active`)
  }

  // Quick-assign buttons for active URLs
  const quickAssign = (id: string, status: UrlStatus) => {
    setOverrides((prev) => ({ ...prev, [id]: status }))
    setHasChanges(true)
  }

  // URL card — plain function (not a component) to avoid remount/focus-loss on state change
  const renderUrlCard = (u: CheckedUrl | CompletedUrl, isCompleted?: boolean) => {
    const breadcrumb = u.profilePath.replace("content/", "").replace(/_/g, "").replace(/ Master Profile\.md$/, "").replace(/\.md$/, "").split("/").filter(Boolean)
    const isActive = "status" in u && !isCompleted

    return (
      <div
        key={u.id}
        draggable={isActive && !batchMode}
        onDragStart={() => isActive && !batchMode && handleDragStart(u.id)}
        onClick={() => batchMode && isActive ? toggleBatchItem(u.id) : undefined}
        className={`p-2.5 rounded bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] transition-colors border border-transparent hover:border-[var(--color-border)] group ${
          isActive && overrides[u.id] ? "ring-1 ring-[var(--color-steel)]/30" : ""
        } ${batchMode && isActive ? "cursor-pointer" : isActive ? "cursor-grab active:cursor-grabbing" : ""} ${batchMode && batchSelected.has(u.id) ? "ring-1 ring-[var(--color-steel)] bg-[var(--color-steel)]/5" : ""}`}
      >
        <div className="flex items-center gap-1 mb-1">
          {batchMode && isActive && (
            <input type="checkbox" checked={batchSelected.has(u.id)} onChange={() => toggleBatchItem(u.id)}
              className="w-3 h-3 rounded border-[var(--color-border)] accent-[var(--color-steel)] flex-shrink-0" />
          )}
          <span className="text-[8px] text-[var(--color-steel)]">
            {breadcrumb.map((part, i) => (
              <span key={i}>{i > 0 && <span className="text-[var(--color-text-dim)] mx-0.5">/</span>}
                <span className={i === breadcrumb.length - 1 ? "font-bold text-[var(--color-text)]" : ""}>{part}</span>
              </span>
            ))}
          </span>
          {u.tier && <span className="ml-auto text-[7px] px-1 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">T{u.tier}</span>}
        </div>
        <div className="flex items-start gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-[var(--color-text)] truncate">{u.label}</p>
            <div className="flex items-center gap-1.5">
              <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--color-steel)] hover:underline truncate" onClick={(e) => e.stopPropagation()}>{u.url}</a>
              {checkResults[u.id] && (() => {
                const cr = checkResults[u.id]
                const color = cr.status === "ok" ? "#22c55e" : cr.status === "broken" ? "#ef4444" : cr.status === "slow" ? "#f59e0b" : cr.status === "redirect" ? "#f59e0b" : "#7a7a86"
                const label = cr.status === "ok" ? `${cr.code} ${cr.ms}ms` : cr.status === "broken" ? `${cr.code || "err"}` : cr.status === "slow" ? `${cr.ms}ms` : cr.status === "redirect" ? "redirect" : cr.status
                return <span className="flex-shrink-0 text-[7px] px-1 py-0.5 rounded" style={{ color, background: `${color}15` }}>{label}</span>
              })()}
            </div>
            {"completedDate" in u && <span className="text-[7px] text-[var(--color-text-dim)]">Completed {"completedDate" in u ? u.completedDate : ""}</span>}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* Quick assign buttons for active URLs */}
            {isActive && (
              <>
                <button onClick={() => quickAssign(u.id, "ok")} title="Working" className="w-5 h-5 rounded flex items-center justify-center text-[8px] bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/25">&#x2713;</button>
                <button onClick={() => quickAssign(u.id, "broken")} title="Broken" className="w-5 h-5 rounded flex items-center justify-center text-[8px] bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/25">&#x2717;</button>
                <button onClick={() => quickAssign(u.id, "unsure")} title="Unsure" className="w-5 h-5 rounded flex items-center justify-center text-[8px] bg-[#a855f7]/10 text-[#a855f7] hover:bg-[#a855f7]/25">?</button>
                <button onClick={() => quickAssign(u.id, "slow")} title="Slow" className="w-5 h-5 rounded flex items-center justify-center text-[8px] bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/25">!</button>
              </>
            )}
            {/* Undo button for completed URLs */}
            {isCompleted && "completedStatus" in u && (
              <button onClick={() => undoCompleted(u as CompletedUrl)} title="Move back to Active" className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--color-steel)]/10 text-[var(--color-steel)] hover:bg-[var(--color-steel)]/25">Undo</button>
            )}
            {/* Open link */}
            <a href={u.url} target="_blank" rel="noopener noreferrer" className="w-5 h-5 rounded flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-steel)]" title="Open">
              <svg width={12} height={12} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </div>
        {isActive && overrides[u.id] && (
          <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              placeholder="Add a note (optional)..."
              defaultValue={urlNotes[u.id] || ""}
              onBlur={(e) => setUrlNotes(prev => ({ ...prev, [u.id]: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[9px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
            />
          </div>
        )}
      </div>
    )
  }

  const DropZone = ({ status, color, label, items, icon }: {
    status: UrlStatus; color: string; label: string; items: CheckedUrl[]; icon: string
  }) => (
    <div onDrop={() => handleDrop(status)} onDragOver={handleDragOver}
      className="flex-1 min-w-[220px] bg-[var(--color-bg-card)] border rounded-lg overflow-hidden transition-all"
      style={{ borderColor: dragItem ? color : "var(--color-border)" }}>
      <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color }}>{items.length}</span>
      </div>
      <div className="p-2 space-y-1 max-h-[40vh] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-[10px] text-[var(--color-text-dim)] text-center py-6">{dragItem ? "Drop here" : "No URLs"}</div>
        ) : items.map((u) => renderUrlCard(u))}
      </div>
    </div>
  )

  const CompletedBox = ({ color, label, items, icon }: {
    color: string; label: string; items: CompletedUrl[]; icon: string
  }) => (
    <div className="flex-1 min-w-[220px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden opacity-80">
      <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color }}>{items.length}</span>
      </div>
      <div className="p-2 space-y-1 max-h-[30vh] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-[10px] text-[var(--color-text-dim)] text-center py-4">Empty</div>
        ) : items.map((u) => renderUrlCard(u, true))}
      </div>
    </div>
  )

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--color-bg-card)] border border-[var(--color-green)]/30 rounded-lg px-4 py-3 text-xs text-[var(--color-green)] shadow-lg animate-slide-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-green)]" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">URL Manager</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">
            {urls.length} active / {completed.length} completed / {urls.length + completed.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors">
              Save Changes ({Object.keys(overrides).length})
            </button>
          )}
          <button onClick={checkAll} disabled={checking || loading}
            className="flex items-center gap-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 rounded-lg px-4 py-2 text-xs hover:bg-[var(--color-steel)]/25 transition-colors disabled:opacity-50">
            {checking ? `Checking ${checkProgress.done}/${checkProgress.total}...` : "Check All URLs"}
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-4">
        <input type="text" placeholder="Search URLs by domain, label, or profile name..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
        <select value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]">
          <option value="all">All Domains ({urls.length})</option>
          {domains.slice(0, 30).map(([domain, count]) => (
            <option key={domain} value={domain}>{domain} ({count})</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]"><span className="w-2 h-2 rounded-full bg-current" /> {greenUrls.length} OK</div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-red)]/10 text-[var(--color-red)]"><span className="w-2 h-2 rounded-full bg-current" /> {redUrls.length} Broken</div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-amber)]/10 text-[var(--color-amber)]"><span className="w-2 h-2 rounded-full bg-current" /> {yellowUrls.length} Slow</div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-purple)]/10 text-[var(--color-purple)]"><span className="w-2 h-2 rounded-full bg-current" /> {unsureUrls.length} Unsure</div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-text-dim)]/10 text-[var(--color-text-dim)]"><span className="w-2 h-2 rounded-full bg-current" /> {uncheckedUrls.length} Unchecked</div>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-steel)]/10 text-[var(--color-steel)]">{completed.length} Completed</div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">Scanning vault for URLs...</div>
      ) : (
        <>
          {/* Batch mode toggle + batch action bar */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Active Triage</h3>
            <button onClick={() => { setBatchMode((m) => !m); setBatchSelected(new Set()) }}
              className={`text-[8px] px-2 py-1 rounded border transition-all ${batchMode ? "border-[var(--color-steel)] bg-[var(--color-steel)]/10 text-[var(--color-steel)]" : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
              {batchMode ? "Exit Batch Mode" : "Batch Select"}
            </button>
            {batchMode && batchSelected.size > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[8px] text-[var(--color-text-dim)]">{batchSelected.size} selected:</span>
                <button onClick={() => batchAction("ok")} className="text-[8px] px-2 py-1 rounded bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/25">OK</button>
                <button onClick={() => batchAction("broken")} className="text-[8px] px-2 py-1 rounded bg-[#ef4444]/15 text-[#ef4444] hover:bg-[#ef4444]/25">Broken</button>
                <button onClick={() => batchAction("slow")} className="text-[8px] px-2 py-1 rounded bg-[#f59e0b]/15 text-[#f59e0b] hover:bg-[#f59e0b]/25">Slow</button>
                <button onClick={() => batchAction("unsure")} className="text-[8px] px-2 py-1 rounded bg-[#a855f7]/15 text-[#a855f7] hover:bg-[#a855f7]/25">Unsure</button>
              </div>
            )}
          </div>
          <div className="flex gap-3 flex-wrap mb-6">
            <DropZone status="ok" color="#22c55e" label="Working" items={greenUrls} icon="&#x2705;" />
            <DropZone status="broken" color="#ef4444" label="Broken" items={redUrls} icon="&#x274C;" />
            <DropZone status="slow" color="#f59e0b" label="Slow / Redirect" items={yellowUrls} icon="&#x26A0;" />
            <DropZone status="unsure" color="#a855f7" label="Unsure" items={unsureUrls} icon="&#x2753;" />
          </div>

          {/* Completed archive */}
          {completed.length > 0 && (
            <>
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Completed Archive</h3>
              <div className="flex gap-3 flex-wrap mb-6">
                <CompletedBox color="#22c55e" label="Confirmed Working" items={completedConfirmed} icon="&#x2705;" />
                <CompletedBox color="#ef4444" label="Archived (Broken)" items={completedArchived} icon="&#x1F5C4;" />
                <CompletedBox color="#f59e0b" label="Slow/Redirect Confirmed" items={completedReviewed} icon="&#x26A0;" />
                <CompletedBox color="#a855f7" label="Flagged for Review" items={completedFlagged} icon="&#x2753;" />
              </div>
            </>
          )}

          {/* Unchecked */}
          {uncheckedUrls.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Unchecked</span>
                <span className="text-[10px] text-[var(--color-text-dim)]">Showing {Math.min(uncheckedVisible, uncheckedUrls.length)} of {uncheckedUrls.length}</span>
                <span className="ml-auto" />
                <button onClick={checkAll} disabled={checking} className="text-[9px] text-[var(--color-steel)] hover:underline">Check All</button>
              </div>
              <div className="p-2 space-y-1 max-h-[50vh] overflow-y-auto">
                {uncheckedUrls.slice(0, uncheckedVisible).map((u) => renderUrlCard(u))}
              </div>
              {uncheckedUrls.length > uncheckedVisible && (
                <div className="p-3 border-t border-[var(--color-border)] flex items-center justify-center gap-3">
                  <button
                    onClick={() => setUncheckedVisible((v) => v + 20)}
                    className="text-[10px] text-[var(--color-steel)] hover:underline"
                  >
                    Load 20 More
                  </button>
                  <span className="text-[8px] text-[var(--color-text-dim)]">
                    {uncheckedUrls.length - uncheckedVisible} remaining
                  </span>
                  <button
                    onClick={() => setUncheckedVisible(uncheckedUrls.length)}
                    className="text-[8px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  >
                    Show All
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">Confirm Changes</h3>
            <p className="text-[10px] text-[var(--color-text-dim)] mb-4">
              {Object.keys(overrides).length} URL(s) will be saved and moved to Completed Archive.
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto mb-4">
              {Object.entries(overrides).map(([id, status]) => {
                const u = urls.find((u) => u.id === id)
                if (!u) return null
                return (
                  <div key={id} className="flex items-center gap-2 text-[9px]">
                    <span className={`w-2 h-2 rounded-full ${
                      status === "ok" ? "bg-[var(--color-green)]" : status === "broken" ? "bg-[var(--color-red)]" :
                      status === "unsure" ? "bg-[var(--color-purple)]" : "bg-[var(--color-amber)]"
                    }`} />
                    <span className="text-[var(--color-text)] truncate flex-1">{u.label}</span>
                    <span className="text-[var(--color-text-dim)]">{status}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={saveChanges} disabled={saving}
                className="flex-1 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 disabled:opacity-50">
                {saving ? "Saving..." : "Save & Archive"}
              </button>
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-xs text-[var(--color-text-dim)]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
