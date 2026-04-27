"use client"

/**
 * Sources — ops/src/app/sources/page.tsx
 *
 * Phase 1 Source Registry review UI. Lists every source in data/sources.jsonl
 * with filter controls (status, tier, source_type, entity, host, freetext
 * search), paginated results, and per-row status editing.
 *
 * This is the editor triage surface for the 1,622 flagged sources (dead +
 * generic_orphan + needs_review) that came out of the Phase 1 fingerprint
 * pass, plus the live/paywall/redirected/archived buckets for cross-reference.
 *
 * URL editing is NOT exposed here — that stays in the URL Manager at /urls
 * per the Editor-only URL policy.
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { PageHeader } from "@/components/PageHeader"

type SourceStatus =
  | "unverified"
  | "live"
  | "dead"
  | "redirected"
  | "generic_orphan"
  | "archived"
  | "needs_review"
  | "paywall"

const STATUSES: SourceStatus[] = [
  "unverified",
  "live",
  "dead",
  "redirected",
  "generic_orphan",
  "archived",
  "needs_review",
  "paywall",
]

const STATUS_COLORS: Record<SourceStatus, string> = {
  unverified: "#9ca3af",
  live: "#22c55e",
  dead: "#ef4444",
  redirected: "#f59e0b",
  generic_orphan: "#ef4444",
  archived: "#6b7280",
  needs_review: "#f97316",
  paywall: "#a855f7",
}

type SourceType =
  | "government_primary"
  | "government_secondary"
  | "court_record"
  | "news_major"
  | "news_regional"
  | "investigative"
  | "academic"
  | "trade_press"
  | "advocacy"
  | "social"
  | "company_direct"
  | "aggregator"
  | "archive"
  | "other"

const SOURCE_TYPES: SourceType[] = [
  "government_primary",
  "government_secondary",
  "court_record",
  "news_major",
  "news_regional",
  "investigative",
  "academic",
  "trade_press",
  "advocacy",
  "social",
  "company_direct",
  "aggregator",
  "archive",
  "other",
]

interface SourceRecord {
  id: string
  url: string
  canonical_url: string | null
  final_host: string | null
  title: string | null
  tier: 1 | 2 | 3 | 4 | null
  source_type: SourceType
  entity_ref: string | null
  status: SourceStatus
  first_seen: string
  last_checked: string | null
  last_verified_live: string | null
  editor_notes: string
}

interface QueryResponse {
  total: number
  filtered: number
  returned: number
  sources: SourceRecord[]
  counts: Record<SourceStatus, number>
}

const PAGE_SIZE = 100

export default function SourcesPage() {
  const [data, setData] = useState<QueryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [status, setStatus] = useState<SourceStatus | "">("needs_review")
  const [tier, setTier] = useState<string>("")
  const [sourceType, setSourceType] = useState<SourceType | "">("")
  const [host, setHost] = useState("")
  const [search, setSearch] = useState("")
  const [entityRef, setEntityRef] = useState("")
  const [offset, setOffset] = useState(0)

  // Toast
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const queryString = useMemo(() => {
    const p = new URLSearchParams()
    if (status) p.set("status", status)
    if (tier) p.set("tier", tier)
    if (sourceType) p.set("source_type", sourceType)
    if (host) p.set("host", host)
    if (search) p.set("search", search)
    if (entityRef) p.set("entity_ref", entityRef)
    p.set("limit", String(PAGE_SIZE))
    p.set("offset", String(offset))
    return p.toString()
  }, [status, tier, sourceType, host, search, entityRef, offset])

  const fetchSources = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/source-registry?${queryString}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as QueryResponse
      setData(json)
    } catch (e: any) {
      setError(e?.message || "failed to fetch")
    } finally {
      setLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  // Reset to page 0 when any filter changes
  const resetAndSet = (fn: () => void) => {
    fn()
    setOffset(0)
  }

  const updateStatus = async (id: string, newStatus: SourceStatus) => {
    try {
      const res = await fetch(`/api/source-registry?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setToast(`${id} → ${newStatus}`)
      // Reflect locally without full refetch
      if (data) {
        setData({
          ...data,
          sources: data.sources.map((r) =>
            r.id === id ? { ...r, status: newStatus, last_checked: new Date().toISOString() } : r,
          ),
          counts: {
            ...data.counts,
            [newStatus]: (data.counts[newStatus] ?? 0) + 1,
            // we don't know the old status cheaply here; reload to rebalance
          },
        })
      }
    } catch (e: any) {
      setError(e?.message || "update failed")
    }
  }

  const totalPages = data ? Math.ceil(data.filtered / PAGE_SIZE) : 0
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif", color: "#e5e7eb", maxWidth: "1400px", margin: "0 auto" }}>
      <PageHeader
        title="Source Registry"
        whatThisDoes="Triage every flagged source citation in the vault — dead links, broken redirects, low-tier domains, deprecated providers. URL editing is Editor-only (per Vault Rules § URL Policy); this page is your manual triage workflow."
        rightNow={data ? `${data.total.toLocaleString()} sources indexed · ${data.filtered.toLocaleString()} match current filters.` : "loading…"}
        action="Filter by status / tier / source-type / host. Click a row to inspect or update its status. Don't auto-fix URLs — flag dead ones for manual review."
        freshness={{
          paths: ["data/sources.jsonl"],
          label: "source registry",
          freshWithinDays: 7,
          warnWithinDays: 30,
        }}
      />

      {/* Status summary */}
      {data && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <div style={{ padding: "0.5rem 0.75rem", background: "#1f2937", borderRadius: "0.375rem", fontSize: "0.85rem" }}>
            <strong>{data.total.toLocaleString()}</strong> total
          </div>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => resetAndSet(() => setStatus(s))}
              style={{
                padding: "0.5rem 0.75rem",
                background: status === s ? STATUS_COLORS[s] : "#1f2937",
                color: status === s ? "#0f172a" : STATUS_COLORS[s],
                border: `1px solid ${STATUS_COLORS[s]}`,
                borderRadius: "0.375rem",
                fontSize: "0.85rem",
                cursor: "pointer",
                fontWeight: status === s ? 700 : 500,
              }}
            >
              {s}: {(data.counts[s] ?? 0).toLocaleString()}
            </button>
          ))}
          {status && (
            <button
              onClick={() => resetAndSet(() => setStatus(""))}
              style={{
                padding: "0.5rem 0.75rem",
                background: "#1f2937",
                color: "#9ca3af",
                border: "1px solid #374151",
                borderRadius: "0.375rem",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              clear status filter
            </button>
          )}
        </div>
      )}

      {/* Filter row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 2fr",
          gap: "0.5rem",
          marginBottom: "1rem",
          padding: "0.75rem",
          background: "#111827",
          borderRadius: "0.5rem",
          border: "1px solid #1f2937",
        }}
      >
        <select
          value={tier}
          onChange={(e) => resetAndSet(() => setTier(e.target.value))}
          style={inputStyle}
        >
          <option value="">all tiers</option>
          <option value="1">tier 1</option>
          <option value="2">tier 2</option>
          <option value="3">tier 3</option>
          <option value="4">tier 4</option>
          <option value="null">no tier</option>
        </select>

        <select
          value={sourceType}
          onChange={(e) => resetAndSet(() => setSourceType(e.target.value as SourceType | ""))}
          style={inputStyle}
        >
          <option value="">all types</option>
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="host contains..."
          value={host}
          onChange={(e) => resetAndSet(() => setHost(e.target.value))}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="entity exact..."
          value={entityRef}
          onChange={(e) => resetAndSet(() => setEntityRef(e.target.value))}
          style={inputStyle}
        />

        <input
          type="text"
          placeholder="search url / title / entity..."
          value={search}
          onChange={(e) => resetAndSet(() => setSearch(e.target.value))}
          style={inputStyle}
        />
      </div>

      {/* Results info */}
      {data && (
        <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
          {loading ? "Loading..." : `${data.filtered.toLocaleString()} match${data.filtered === 1 ? "" : "es"}`}
          {data.filtered > PAGE_SIZE && (
            <>
              {" · page "}
              {currentPage} of {totalPages}
            </>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#7f1d1d",
            color: "#fecaca",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Results table */}
      {data && data.sources.length > 0 && (
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "0.5rem",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "#1f2937", textAlign: "left" }}>
                <th style={thStyle}>id</th>
                <th style={thStyle}>status</th>
                <th style={thStyle}>tier</th>
                <th style={thStyle}>url / title</th>
                <th style={thStyle}>entity</th>
                <th style={thStyle}>last checked</th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #1f2937" }}>
                  <td style={tdStyle}>
                    <code style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{r.id}</code>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value as SourceStatus)}
                      style={{
                        background: STATUS_COLORS[r.status],
                        color: "#0f172a",
                        border: "none",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: r.tier ? "#f3f4f6" : "#6b7280" }}>
                      {r.tier ?? "—"}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "500px" }}>
                    <a
                      href={r.canonical_url || r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#60a5fa", textDecoration: "none", wordBreak: "break-all" }}
                    >
                      {r.url}
                    </a>
                    {r.title && (
                      <div style={{ color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                        {r.title.slice(0, 120)}
                      </div>
                    )}
                    <div style={{ color: "#6b7280", fontSize: "0.7rem", marginTop: "0.25rem" }}>
                      {r.source_type}
                      {r.final_host && ` · ${r.final_host}`}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, maxWidth: "200px", wordBreak: "break-word" }}>
                    {r.entity_ref ?? <span style={{ color: "#6b7280" }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#9ca3af", fontSize: "0.75rem" }}>
                    {r.last_checked ? new Date(r.last_checked).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.sources.length === 0 && !loading && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            background: "#111827",
            borderRadius: "0.5rem",
            border: "1px dashed #374151",
          }}
        >
          No sources match the current filters.
        </div>
      )}

      {/* Pagination */}
      {data && data.filtered > PAGE_SIZE && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            style={pageButtonStyle(offset === 0)}
          >
            ← prev
          </button>
          <span style={{ padding: "0.5rem 1rem", color: "#9ca3af", fontSize: "0.85rem" }}>
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= data.filtered}
            style={pageButtonStyle(offset + PAGE_SIZE >= data.filtered)}
          >
            next →
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            padding: "0.75rem 1rem",
            background: "#065f46",
            color: "#d1fae5",
            borderRadius: "0.375rem",
            fontSize: "0.85rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

// ─── Inline styles ─────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "0.375rem",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  outline: "none",
}

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
}

const tdStyle: React.CSSProperties = {
  padding: "0.75rem",
  verticalAlign: "top",
  color: "#e5e7eb",
}

function pageButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.5rem 1rem",
    background: disabled ? "#1f2937" : "#374151",
    color: disabled ? "#4b5563" : "#e5e7eb",
    border: "1px solid #374151",
    borderRadius: "0.375rem",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.85rem",
  }
}
