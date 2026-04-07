"use client"

import { useState, useEffect, useMemo } from "react"

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

interface CheckedUrl extends VaultUrl {
  status: UrlStatus
  code?: number
  ms?: number
}

export default function UrlManagerPage() {
  const [urls, setUrls] = useState<CheckedUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [checkProgress, setCheckProgress] = useState({ done: 0, total: 0 })
  const [search, setSearch] = useState("")
  const [domainFilter, setDomainFilter] = useState<string>("all")
  const [dragItem, setDragItem] = useState<string | null>(null)

  // Triage overrides — user can drag URLs between sections
  const [overrides, setOverrides] = useState<Record<string, UrlStatus>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ archived: number; confirmed: number; flagged: number } | null>(null)

  // Load all URLs from vault
  useEffect(() => {
    fetch("/api/urls")
      .then((r) => r.json())
      .then((data) => {
        const checked: CheckedUrl[] = (data.urls || []).map((u: VaultUrl) => ({
          ...u,
          status: u.archived ? "broken" : "unchecked",
        }))
        setUrls(checked)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Get unique domains for filter
  const domains = useMemo(() => {
    const d = new Map<string, number>()
    urls.forEach((u) => {
      if (u.domain) d.set(u.domain, (d.get(u.domain) || 0) + 1)
    })
    return Array.from(d.entries()).sort((a, b) => b[1] - a[1])
  }, [urls])

  // Filtered URLs
  const filtered = useMemo(() => {
    let result = urls
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((u) =>
        u.url.toLowerCase().includes(q) ||
        u.label.toLowerCase().includes(q) ||
        u.profile.toLowerCase().includes(q) ||
        u.domain.toLowerCase().includes(q)
      )
    }
    if (domainFilter !== "all") {
      result = result.filter((u) => u.domain === domainFilter)
    }
    return result
  }, [urls, search, domainFilter])

  // Get effective status (override or checked)
  const getStatus = (u: CheckedUrl): UrlStatus => overrides[u.id] || u.status

  // Categorized URLs
  const greenUrls = filtered.filter((u) => getStatus(u) === "ok")
  const redUrls = filtered.filter((u) => getStatus(u) === "broken")
  const yellowUrls = filtered.filter((u) => getStatus(u) === "slow" || getStatus(u) === "redirect")
  const unsureUrls = filtered.filter((u) => getStatus(u) === "unsure")
  const uncheckedUrls = filtered.filter((u) => getStatus(u) === "unchecked")

  // Check all URLs
  const checkAll = async () => {
    const toCheck = urls.filter((u) => !u.archived)
    setChecking(true)
    setCheckProgress({ done: 0, total: toCheck.length })

    const BATCH = 20
    for (let i = 0; i < toCheck.length; i += BATCH) {
      const batch = toCheck.slice(i, i + BATCH)
      const batchUrls = batch.map((u) => u.url)

      try {
        const res = await fetch("/api/urls/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: batchUrls }),
        })
        const data = await res.json()

        if (data.results) {
          setUrls((prev) =>
            prev.map((u) => {
              const result = data.results[u.url]
              if (result) {
                return { ...u, status: result.status, code: result.code, ms: result.ms }
              }
              return u
            })
          )
        }
      } catch { /* skip failed batch */ }

      setCheckProgress({ done: Math.min(i + BATCH, toCheck.length), total: toCheck.length })
    }

    setChecking(false)
  }

  // Drag and drop handlers
  const handleDragStart = (id: string) => setDragItem(id)

  const handleDrop = (targetStatus: UrlStatus) => {
    if (!dragItem) return
    setOverrides((prev) => ({ ...prev, [dragItem]: targetStatus }))
    setHasChanges(true)
    setDragItem(null)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  // Counts
  const counts = {
    green: greenUrls.length,
    red: redUrls.length,
    yellow: yellowUrls.length,
    unsure: unsureUrls.length,
    unchecked: uncheckedUrls.length,
    total: filtered.length,
  }

  // Save changes to vault
  const saveChanges = async () => {
    setSaving(true)
    const changes = Object.entries(overrides).map(([id, status]) => {
      const u = urls.find((u) => u.id === id)
      if (!u) return null
      return {
        url: u.url,
        label: u.label,
        tier: u.tier,
        profilePath: u.profilePath,
        profile: u.profile,
        newStatus: status === "slow" || status === "redirect" ? "unsure" : status,
      }
    }).filter(Boolean)

    try {
      const res = await fetch("/api/urls/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      })
      const data = await res.json()
      if (data.success) {
        setSaveResult(data.summary)
        setOverrides({})
        setHasChanges(false)
        setShowConfirm(false)
      }
    } catch { /* error */ }
    finally { setSaving(false) }
  }

  // URL card component
  const UrlCard = ({ u }: { u: CheckedUrl }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(u.id)}
      className={`flex items-start gap-2 p-2.5 rounded bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-[var(--color-border)] group ${
        overrides[u.id] ? "ring-1 ring-[var(--color-steel)]/30" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--color-text)] truncate">{u.label}</p>
        <a
          href={u.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-[var(--color-steel)] hover:underline truncate block"
          onClick={(e) => e.stopPropagation()}
        >
          {u.url}
        </a>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] text-[var(--color-text-dim)]">{u.profile}</span>
          {u.tier && <span className="text-[7px] px-1 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">T{u.tier}</span>}
          {u.ms && <span className="text-[7px] text-[var(--color-text-dim)]">{u.ms}ms</span>}
          {u.code && <span className="text-[7px] text-[var(--color-text-dim)]">{u.code}</span>}
        </div>
      </div>
      <a
        href={u.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--color-text-dim)] hover:text-[var(--color-steel)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
        title="Open in browser"
      >
        <svg width={12} height={12} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
  )

  // Drop zone component
  const DropZone = ({ status, color, label, items, icon }: {
    status: UrlStatus; color: string; label: string; items: CheckedUrl[]; icon: string
  }) => (
    <div
      onDrop={() => handleDrop(status)}
      onDragOver={handleDragOver}
      className={`flex-1 min-w-[280px] bg-[var(--color-bg-card)] border rounded-lg overflow-hidden transition-all ${
        dragItem ? `border-dashed border-[${color}]/50` : "border-[var(--color-border)]"
      }`}
      style={{ borderColor: dragItem ? color : undefined }}
    >
      <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
        <span className="ml-auto text-[11px] font-bold" style={{ color }}>{items.length}</span>
      </div>
      <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-[10px] text-[var(--color-text-dim)] text-center py-6">
            {dragItem ? "Drop here" : "No URLs"}
          </div>
        ) : (
          items.map((u) => <UrlCard key={u.id} u={u} />)
        )}
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">URL Manager</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">
            {counts.total} URLs across the vault — scan, triage, and clean
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors"
            >
              Save Changes ({Object.keys(overrides).length})
            </button>
          )}
          <button
            onClick={checkAll}
            disabled={checking || loading}
            className="flex items-center gap-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 rounded-lg px-4 py-2 text-xs hover:bg-[var(--color-steel)]/25 transition-colors disabled:opacity-50"
          >
            {checking ? `Checking ${checkProgress.done}/${checkProgress.total}...` : "Check All URLs"}
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search URLs by domain, label, or profile name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
        />
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
        >
          <option value="all">All Domains ({urls.length})</option>
          {domains.slice(0, 30).map(([domain, count]) => (
            <option key={domain} value={domain}>{domain} ({count})</option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">
          <span className="w-2 h-2 rounded-full bg-current" /> {counts.green} OK
        </div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-red)]/10 text-[var(--color-red)]">
          <span className="w-2 h-2 rounded-full bg-current" /> {counts.red} Broken
        </div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-amber)]/10 text-[var(--color-amber)]">
          <span className="w-2 h-2 rounded-full bg-current" /> {counts.yellow} Slow/Redirect
        </div>
        <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-purple)]/10 text-[var(--color-purple)]">
          <span className="w-2 h-2 rounded-full bg-current" /> {counts.unsure} Unsure
        </div>
        {counts.unchecked > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded bg-[var(--color-text-dim)]/10 text-[var(--color-text-dim)]">
            <span className="w-2 h-2 rounded-full bg-current" /> {counts.unchecked} Unchecked
          </div>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">
          Scanning vault for URLs...
        </div>
      ) : (
        <>
          {/* Triage sections — drag and drop */}
          <div className="flex gap-3 flex-wrap">
            <DropZone status="ok" color="#22c55e" label="Working" items={greenUrls} icon="&#x2705;" />
            <DropZone status="broken" color="#ef4444" label="Broken" items={redUrls} icon="&#x274C;" />
            <DropZone status="slow" color="#f59e0b" label="Slow / Redirect" items={yellowUrls} icon="&#x26A0;" />
            <DropZone status="unsure" color="#a855f7" label="Unsure" items={unsureUrls} icon="&#x2753;" />
          </div>

          {/* Save result notification */}
          {saveResult && (
            <div className="mt-4 bg-[var(--color-green)]/10 border border-[var(--color-green)]/30 rounded-lg p-4 text-xs text-[var(--color-green)] flex items-center justify-between">
              <span>Saved: {saveResult.archived} archived, {saveResult.confirmed} confirmed, {saveResult.flagged} flagged for review</span>
              <button onClick={() => setSaveResult(null)} className="text-[var(--color-green)]/60 hover:text-[var(--color-green)]">&times;</button>
            </div>
          )}

          {/* Unchecked section */}
          {uncheckedUrls.length > 0 && (
            <div className="mt-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
              <div className="p-3 border-b border-[var(--color-border)] flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-dim)]">Unchecked</span>
                <span className="ml-auto text-[11px] text-[var(--color-text-dim)]">{uncheckedUrls.length}</span>
                <button
                  onClick={checkAll}
                  disabled={checking}
                  className="text-[9px] text-[var(--color-steel)] hover:underline"
                >
                  Check All
                </button>
              </div>
              <div className="p-2 space-y-1 max-h-[30vh] overflow-y-auto">
                {uncheckedUrls.slice(0, 50).map((u) => <UrlCard key={u.id} u={u} />)}
                {uncheckedUrls.length > 50 && (
                  <p className="text-[9px] text-[var(--color-text-dim)] text-center py-2">
                    ...and {uncheckedUrls.length - 50} more. Run Check All to scan them.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-6 w-96 max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[var(--color-text)] mb-2">Confirm Changes</h3>
            <p className="text-[10px] text-[var(--color-text-dim)] mb-4">
              You&apos;ve moved {Object.keys(overrides).length} URL(s) between sections. Save these changes to the vault?
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto mb-4">
              {Object.entries(overrides).map(([id, status]) => {
                const u = urls.find((u) => u.id === id)
                if (!u) return null
                return (
                  <div key={id} className="flex items-center gap-2 text-[9px]">
                    <span className={`w-2 h-2 rounded-full ${
                      status === "ok" ? "bg-[var(--color-green)]" :
                      status === "broken" ? "bg-[var(--color-red)]" :
                      status === "unsure" ? "bg-[var(--color-purple)]" :
                      "bg-[var(--color-amber)]"
                    }`} />
                    <span className="text-[var(--color-text)] truncate flex-1">{u.label}</span>
                    <span className="text-[var(--color-text-dim)]">{u.status} → {status}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex-1 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Vault"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
