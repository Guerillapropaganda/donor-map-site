"use client"

import { useState, useEffect, useMemo, useCallback } from "react"

interface VaultUrl {
  id: string
  url: string
  label: string
  tier?: number
  archived: boolean
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

// Persist completed URLs in localStorage
const COMPLETED_KEY = "donor-map-url-completed"

function loadCompleted(): CompletedUrl[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]")
  } catch { return [] }
}

function saveCompleted(items: CompletedUrl[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(COMPLETED_KEY, JSON.stringify(items))
}

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

  // Show toast notification
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Load URLs + completed archive
  useEffect(() => {
    setCompleted(loadCompleted())
    fetch("/api/urls")
      .then((r) => r.json())
      .then((data) => {
        const completedIds = new Set(loadCompleted().map((c) => c.url + c.profilePath))
        const checked: CheckedUrl[] = (data.urls || [])
          .filter((u: VaultUrl) => !completedIds.has(u.url + u.profilePath))
          .map((u: VaultUrl) => ({
            ...u,
            status: u.archived ? "broken" as UrlStatus : "unchecked" as UrlStatus,
          }))
        setUrls(checked)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

  // Completed archive categories
  const completedConfirmed = completed.filter((c) => c.completedStatus === "confirmed")
  const completedArchived = completed.filter((c) => c.completedStatus === "archived-done")
  const completedFlagged = completed.filter((c) => c.completedStatus === "flagged-done")
  const completedReviewed = completed.filter((c) => c.completedStatus === "reviewed")

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
          setUrls((prev) => prev.map((u) => {
            const result = data.results[u.url]
            return result ? { ...u, status: result.status, code: result.code, ms: result.ms } : u
          }))
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
        })) }),
      })
      const data = await res.json()
      if (data.success) {
        // Move triaged URLs to completed archive
        const now = new Date().toISOString().split("T")[0]
        const newCompleted: CompletedUrl[] = changes.map((c) => ({
          id: c.id, url: c.url, label: c.label, tier: c.tier, archived: false,
          profile: c.profile, profilePath: c.profilePath, domain: c.domain,
          completedStatus: (
            c.newStatus === "ok" ? "confirmed" :
            c.newStatus === "broken" ? "archived-done" :
            c.newStatus === "unsure" ? "flagged-done" : "reviewed"
          ) as CompletedStatus,
          completedDate: now,
        }))

        const updatedCompleted = [...completed, ...newCompleted]
        setCompleted(updatedCompleted)
        saveCompleted(updatedCompleted)

        // Remove from active list
        const removedIds = new Set(changes.map((c) => c.id))
        setUrls((prev) => prev.filter((u) => !removedIds.has(u.id)))
        setOverrides({})
        setHasChanges(false)
        setShowConfirm(false)
        showToast(`Saved: ${data.summary.archived} archived, ${data.summary.confirmed} confirmed, ${data.summary.flagged} flagged`)
      }
    } catch { showToast("Save failed") }
    finally { setSaving(false) }
  }

  // URL card
  const UrlCard = ({ u }: { u: CheckedUrl | CompletedUrl }) => {
    const breadcrumb = u.profilePath.replace("content/", "").replace(/_/g, "").replace(/ Master Profile\.md$/, "").replace(/\.md$/, "").split("/").filter(Boolean)
    return (
      <div
        draggable={"status" in u}
        onDragStart={() => "status" in u && handleDragStart(u.id)}
        className={`p-2.5 rounded bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] transition-colors border border-transparent hover:border-[var(--color-border)] group ${
          "status" in u && overrides[u.id] ? "ring-1 ring-[var(--color-steel)]/30" : ""
        } ${"status" in u ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div className="flex items-center gap-1 mb-1">
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
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[var(--color-text)] truncate">{u.label}</p>
            <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--color-steel)] hover:underline truncate block" onClick={(e) => e.stopPropagation()}>{u.url}</a>
            {"completedDate" in u && <span className="text-[7px] text-[var(--color-text-dim)]">Completed {u.completedDate}</span>}
          </div>
          <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-dim)] hover:text-[var(--color-steel)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" title="Open">
            <svg width={14} height={14} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        </div>
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
        ) : items.map((u) => <UrlCard key={u.id} u={u} />)}
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
        ) : items.map((u) => <UrlCard key={u.id + "-done"} u={u} />)}
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
          {/* Active triage — drag and drop */}
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Active Triage</h3>
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
                <CompletedBox color="#f59e0b" label="Flagged for Review" items={completedFlagged} icon="&#x1F3F7;" />
                <CompletedBox color="#a855f7" label="Reviewed" items={completedReviewed} icon="&#x2714;" />
              </div>
            </>
          )}

          {/* Unchecked */}
          {uncheckedUrls.length > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Unchecked</span>
                <span className="ml-auto text-[11px] text-[var(--color-text-dim)]">{uncheckedUrls.length}</span>
                <button onClick={checkAll} disabled={checking} className="text-[9px] text-[var(--color-steel)] hover:underline">Check All</button>
              </div>
              <div className="p-2 space-y-1 max-h-[30vh] overflow-y-auto">
                {uncheckedUrls.slice(0, 50).map((u) => <UrlCard key={u.id} u={u} />)}
                {uncheckedUrls.length > 50 && (
                  <p className="text-[9px] text-[var(--color-text-dim)] text-center py-2">...and {uncheckedUrls.length - 50} more</p>
                )}
              </div>
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
