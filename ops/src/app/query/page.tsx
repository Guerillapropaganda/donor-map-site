"use client"

/**
 * Query Engine — ops/src/app/query/page.tsx
 *
 * Phase 2 public query engine researcher UI. Served at /query inside
 * the Ops app. v1 is the "ugly-v1-iterate" approach (phase-2/decisions.md
 * §Phase 2 launch decision #4): raw table output, monospace numbers,
 * brutalist controls, no polish beyond what functionality needs.
 *
 * Six query subjects via dropdown:
 *   entities            — filter the entity registry (class tags)
 *   edges               — filter the relationships.jsonl edge store
 *   events              — filter events.jsonl (votes, hearings, etc.)
 *   cross_party_donors  — class-analysis: donors funding both parties
 *   timing_proximity    — class-analysis: money-within-N-days-of-vote
 *   top_opposition_donors — enemy list aggregate (Phase 2.75 preview)
 *
 * Each subject exposes a different filter pane. Filter changes submit
 * automatically (debounced). CSV export dumps the current result set.
 *
 * AUTH NOTE: this UI and /api/query are currently unauthenticated.
 * Phase 2.5 will add the tier-check middleware gate. Until then the
 * page runs only inside the Ops app (not exposed to the public site).
 */

import { useState, useEffect, useMemo, useCallback } from "react"

type Subject =
  | "entities"
  | "edges"
  | "events"
  | "cross_party_donors"
  | "timing_proximity"
  | "top_opposition_donors"

const SUBJECTS: { value: Subject; label: string; description: string }[] = [
  { value: "entities", label: "Entities", description: "donor / politician / corporation records" },
  { value: "edges", label: "Edges", description: "relationships.jsonl monetary + other edges" },
  { value: "events", label: "Events", description: "votes, hearings, regulations" },
  {
    value: "cross_party_donors",
    label: "Cross-party donors",
    description: "donors funding BOTH major parties",
  },
  {
    value: "timing_proximity",
    label: "Timing proximity",
    description: "money within N days of a vote",
  },
  {
    value: "top_opposition_donors",
    label: "Top opposition donors",
    description: "enemy list aggregate (Phase 2.75 preview)",
  },
]

const CAPITAL_TYPES = [
  "fossil-capital",
  "extractive-capital",
  "finance-capital",
  "rentier-capital",
  "tech-monopoly",
  "retail-monopoly",
  "military-industrial",
  "carceral-capital",
  "pharma-capital",
  "media-capital",
  "agribusiness-capital",
  "small-capital",
  "professional-class",
  "labor-aligned",
  "dark-money-vehicle",
  "mixed",
]

const CLASS_POSITIONS = [
  "ruling-class",
  "upper-bourgeois",
  "petty-bourgeois",
  "labor-aligned",
  "ambiguous",
]

const IDEOLOGICAL_FUNCTIONS = [
  "union-busting",
  "climate-denial",
  "deregulatory",
  "libertarian-ideology",
  "religious-right",
  "carceral-expansion",
  "imperialist-aligned",
  "zionist-aligned",
  "nativist",
  "voter-suppression",
  "privatization",
  "austerity",
  "anti-trust-defender",
  "tax-avoidance-lobby",
  "astroturf",
  "dark-money-networked",
  "progressive-capital",
  "labor-organizing",
  "electoral-left",
  "movement-left",
]

const EDGE_TYPES = [
  "monetary",
  "political-support",
  "political-opposition",
  "staffing",
  "media-appearance",
  "story-link",
  "affiliation",
  "legal",
  "family",
  "related",
]

const OBSTRUCTION_TYPES = [
  "floor_vote",
  "chair_bottled_up",
  "filibustered",
  "held_for_concessions",
  "pocket_vetoed",
  "procedural_kill",
  "voice_vote",
  "n/a",
]

interface QueryResult {
  subject: string
  total: number
  returned: number
  rows: any[]
}

const PAGE_SIZE = 100

export default function QueryPage() {
  const [subject, setSubject] = useState<Subject>("entities")
  const [filters, setFilters] = useState<Record<string, any>>({ tags_approved: true })
  const [offset, setOffset] = useState(0)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset filters when subject changes
  useEffect(() => {
    if (subject === "entities") setFilters({ tags_approved: true })
    else if (subject === "timing_proximity") setFilters({ timing_proximity_days: 30 })
    else if (subject === "cross_party_donors") setFilters({ days: 365 })
    else setFilters({})
    setOffset(0)
  }, [subject])

  const runQuery = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const body = {
        subject,
        filters: { ...filters, limit: PAGE_SIZE, offset },
      }
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as QueryResult
      setResult(json)
    } catch (e: any) {
      setError(e?.message || "query failed")
    } finally {
      setLoading(false)
    }
  }, [subject, filters, offset])

  useEffect(() => {
    const t = setTimeout(runQuery, 250)
    return () => clearTimeout(t)
  }, [runQuery])

  const updateFilter = (key: string, value: any) => {
    setOffset(0)
    setFilters((prev) => {
      const next = { ...prev }
      if (value === "" || value === undefined || value === null) delete next[key]
      else next[key] = value
      return next
    })
  }

  const csvExport = () => {
    if (!result || !result.rows.length) return
    const keys = Object.keys(result.rows[0])
    const lines = [keys.join(",")]
    for (const row of result.rows) {
      lines.push(
        keys
          .map((k) => {
            const v = (row as any)[k]
            if (v === null || v === undefined) return ""
            if (typeof v === "object") return `"${JSON.stringify(v).replace(/"/g, '""')}"`
            const s = String(v)
            return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(","),
      )
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `query-${subject}-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      style={{
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e5e7eb",
        maxWidth: "1600px",
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#f3f4f6" }}>Query Engine</h1>
        <p style={{ margin: "0.25rem 0 0", color: "#9ca3af", fontSize: "0.9rem" }}>
          Phase 2 MVP · in-memory query over relationships + entities + events + sources. Auth gating lands in Phase 2.5.
        </p>
      </header>

      {/* Subject picker */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {SUBJECTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSubject(s.value)}
            title={s.description}
            style={{
              padding: "0.5rem 0.875rem",
              background: subject === s.value ? "#fbbf24" : "#1f2937",
              color: subject === s.value ? "#0f172a" : "#e5e7eb",
              border: `1px solid ${subject === s.value ? "#fbbf24" : "#374151"}`,
              borderRadius: "0.375rem",
              fontSize: "0.85rem",
              fontWeight: subject === s.value ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Filter panel — changes per subject */}
      <div
        style={{
          background: "#111827",
          border: "1px solid #1f2937",
          borderRadius: "0.5rem",
          padding: "0.875rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          filters · {SUBJECTS.find((s) => s.value === subject)?.description}
        </div>

        {subject === "entities" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
            <select
              value={filters.entity_type || ""}
              onChange={(e) => updateFilter("entity_type", e.target.value)}
              style={inputStyle}
            >
              <option value="">all entity_types</option>
              <option value="donor">donor</option>
              <option value="corporation">corporation</option>
              <option value="politician">politician</option>
              <option value="nonprofit">nonprofit</option>
              <option value="think_tank">think_tank</option>
              <option value="lobbying_firm">lobbying_firm</option>
              <option value="network">network</option>
              <option value="union">union</option>
            </select>
            <select
              value={filters.capital_type || ""}
              onChange={(e) => updateFilter("capital_type", e.target.value)}
              style={inputStyle}
            >
              <option value="">all capital_types</option>
              {CAPITAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.class_position || ""}
              onChange={(e) => updateFilter("class_position", e.target.value)}
              style={inputStyle}
            >
              <option value="">all class_positions</option>
              {CLASS_POSITIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.tags_approved === undefined ? "" : filters.tags_approved ? "true" : "false"}
              onChange={(e) => updateFilter("tags_approved", e.target.value === "" ? undefined : e.target.value === "true")}
              style={inputStyle}
            >
              <option value="">any approval state</option>
              <option value="true">approved only</option>
              <option value="false">unapproved only</option>
            </select>
            <select
              value={filters.ideological_function || ""}
              onChange={(e) => updateFilter("ideological_function", e.target.value)}
              style={{ ...inputStyle, gridColumn: "span 2" }}
            >
              <option value="">any ideological_function</option>
              {IDEOLOGICAL_FUNCTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="search name..."
              value={filters.search || ""}
              onChange={(e) => updateFilter("search", e.target.value)}
              style={{ ...inputStyle, gridColumn: "span 2" }}
            />
          </div>
        )}

        {subject === "edges" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
            <select
              value={filters.type || ""}
              onChange={(e) => updateFilter("type", e.target.value)}
              style={inputStyle}
            >
              <option value="">all edge types</option>
              {EDGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="from (exact name)"
              value={filters.from || ""}
              onChange={(e) => updateFilter("from", e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="to (exact name)"
              value={filters.to || ""}
              onChange={(e) => updateFilter("to", e.target.value)}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="min amount $"
              value={filters.min_amount ?? ""}
              onChange={(e) => updateFilter("min_amount", e.target.value ? parseFloat(e.target.value) : undefined)}
              style={inputStyle}
            />
            <select
              value={filters.role || ""}
              onChange={(e) => updateFilter("role", e.target.value)}
              style={inputStyle}
              title="Filter by edge role (ie-support, ie-oppose, etc.)"
            >
              <option value="">any role (support + oppose + direct)</option>
              <option value="null">direct donations only (role=null)</option>
              <option value="ie-support">IE-support only</option>
              <option value="ie-oppose">IE-oppose only (attack spending)</option>
              <option value="employee-contributions">employee contributions</option>
            </select>
            <select
              value={filters.exclude_role || ""}
              onChange={(e) => updateFilter("exclude_role", e.target.value)}
              style={inputStyle}
              title="Exclude specific role. Useful: exclude IE-oppose when asking about donors."
            >
              <option value="">include all roles</option>
              <option value="ie-oppose">exclude IE-oppose (attack spending)</option>
              <option value="ie-support">exclude IE-support</option>
            </select>
            <input
              type="text"
              placeholder="source (e.g. fec-bulk)"
              value={filters.source || ""}
              onChange={(e) => updateFilter("source", e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="cycle (e.g. 2024)"
              value={filters.cycle || ""}
              onChange={(e) => updateFilter("cycle", e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {subject === "events" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
            <select
              value={filters.event_type || ""}
              onChange={(e) => updateFilter("event_type", e.target.value)}
              style={inputStyle}
            >
              <option value="">all event types</option>
              <option value="floor_vote">floor_vote</option>
              <option value="committee_vote">committee_vote</option>
              <option value="committee_hearing">committee_hearing</option>
              <option value="bill_introduction">bill_introduction</option>
              <option value="regulation_proposed">regulation_proposed</option>
              <option value="regulation_finalized">regulation_finalized</option>
              <option value="executive_order">executive_order</option>
              <option value="signing">signing</option>
              <option value="veto">veto</option>
            </select>
            <select
              value={filters.obstruction_type || ""}
              onChange={(e) => updateFilter("obstruction_type", e.target.value)}
              style={inputStyle}
            >
              <option value="">all obstruction_types</option>
              {OBSTRUCTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filters.chamber || ""}
              onChange={(e) => updateFilter("chamber", e.target.value)}
              style={inputStyle}
            >
              <option value="">any chamber</option>
              <option value="house">house</option>
              <option value="senate">senate</option>
              <option value="both">both</option>
            </select>
            <input
              type="text"
              placeholder="stakeholder (exact name)"
              value={filters.stakeholder || ""}
              onChange={(e) => updateFilter("stakeholder", e.target.value)}
              style={inputStyle}
            />
          </div>
        )}

        {subject === "cross_party_donors" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <input
              type="number"
              placeholder="window in days (default 365)"
              value={filters.days ?? ""}
              onChange={(e) => updateFilter("days", e.target.value ? parseInt(e.target.value) : undefined)}
              style={inputStyle}
            />
            <div style={{ alignSelf: "center", fontSize: "0.8rem", color: "#9ca3af" }}>
              donors who funded BOTH major parties
            </div>
          </div>
        )}

        {subject === "timing_proximity" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <input
              type="number"
              placeholder="days window around vote (default 30)"
              value={filters.timing_proximity_days ?? ""}
              onChange={(e) => updateFilter("timing_proximity_days", e.target.value ? parseInt(e.target.value) : undefined)}
              style={inputStyle}
            />
            <div style={{ alignSelf: "center", fontSize: "0.8rem", color: "#9ca3af" }}>
              money-in / money-out within N days of a politician's vote
            </div>
          </div>
        )}

        {subject === "top_opposition_donors" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="sector_affected (optional, e.g. pharma-capital)"
              value={filters.sector_affected || ""}
              onChange={(e) => updateFilter("sector_affected", e.target.value)}
              style={inputStyle}
            />
            <div style={{ alignSelf: "center", fontSize: "0.8rem", color: "#9ca3af" }}>
              aggregate enemy list preview (Phase 2.75)
            </div>
          </div>
        )}
      </div>

      {/* Result count + export */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
          color: "#9ca3af",
        }}
      >
        <div>
          {loading ? "Running..." : result ? `${result.total.toLocaleString()} rows · showing ${result.rows.length}` : "—"}
        </div>
        <button
          onClick={csvExport}
          disabled={!result || !result.rows.length}
          style={{
            padding: "0.375rem 0.75rem",
            background: "#374151",
            color: "#e5e7eb",
            border: "1px solid #4b5563",
            borderRadius: "0.25rem",
            fontSize: "0.8rem",
            cursor: result && result.rows.length ? "pointer" : "not-allowed",
            opacity: result && result.rows.length ? 1 : 0.5,
          }}
        >
          export CSV
        </button>
      </div>

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
      {result && result.rows.length > 0 && (
        <div
          style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: "0.5rem",
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.8rem",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <thead>
              <tr style={{ background: "#1f2937", textAlign: "left" }}>
                {Object.keys(result.rows[0]).map((k) => (
                  <th key={k} style={thStyle}>
                    {humanizeColumn(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => {
                const isOppose = (row as any).role === "ie-oppose"
                return (
                  <tr
                    key={i}
                    style={{
                      borderTop: "1px solid #1f2937",
                      background: isOppose ? "#3f1d1d" : undefined,
                    }}
                    title={isOppose ? "IE-oppose: attack spending, NOT a donation" : undefined}
                  >
                    {Object.keys(row).map((k) => (
                      <td key={k} style={tdStyle}>
                        {renderCell((row as any)[k], k)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {result && result.rows.length === 0 && !loading && (
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
          No rows match the current filters.
        </div>
      )}

      {/* Pagination */}
      {result && result.total > PAGE_SIZE && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            style={pageButtonStyle(offset === 0)}
          >
            ← prev
          </button>
          <span style={{ padding: "0.5rem 1rem", color: "#9ca3af", fontSize: "0.85rem" }}>
            {Math.floor(offset / PAGE_SIZE) + 1} / {Math.ceil(result.total / PAGE_SIZE)}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= result.total}
            style={pageButtonStyle(offset + PAGE_SIZE >= result.total)}
          >
            next →
          </button>
        </div>
      )}
    </div>
  )
}

function renderCell(v: any, key?: string): string {
  if (v === null || v === undefined) return "—"
  // Humanize known money columns at natural scale
  if (key && MONEY_KEYS.has(key) && typeof v === "number") return fmtMoney(v)
  // Humanize role values
  if (key === "role" && typeof v === "string") {
    if (v === "ie-oppose") return "IE-oppose (attack)"
    if (v === "ie-support") return "IE-support"
    return v
  }
  if (typeof v === "number") return v.toLocaleString()
  if (typeof v === "boolean") return v ? "✓" : "✗"
  if (Array.isArray(v)) {
    if (!v.length) return "[]"
    if (typeof v[0] === "string") return v.slice(0, 3).join(", ") + (v.length > 3 ? `, +${v.length - 3}` : "")
    return JSON.stringify(v).slice(0, 60)
  }
  if (typeof v === "object") return JSON.stringify(v).slice(0, 80)
  const s = String(v)
  return s.length > 120 ? s.slice(0, 120) + "…" : s
}

const MONEY_KEYS = new Set([
  "amount", "total", "total_spend", "total_amount", "positive_spend", "attack_spend",
  "direct_donations", "ie_support", "ie_oppose", "support_amount", "oppose_amount",
  "donation_amount", "d_spend", "r_spend", "pro_d", "pro_r",
])

function fmtMoney(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "$0"
  const a = Math.abs(n)
  if (a >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B"
  if (a >= 10e6) return "$" + Math.round(n / 1e6) + "M"
  if (a >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (a >= 10e3) return "$" + Math.round(n / 1e3) + "K"
  if (a >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"
  return "$" + Math.round(n).toLocaleString()
}

const COLUMN_LABELS: Record<string, string> = {
  from: "From",
  to: "To",
  type: "Type",
  role: "Role",
  amount: "Amount",
  cycle: "Cycle",
  source: "Source",
  confidence: "Conf.",
  date_range: "Dates",
  from_type: "From type",
  to_type: "To type",
  entity_type: "Entity",
  capital_type: "Capital",
  class_position: "Class",
  ideological_function: "Ideology",
  worker_relationship: "Workers",
  total_spend: "Total spend",
  edge_count: "Edges",
  politicians_count: "Politicians",
  support_amount: "IE support",
  oppose_amount: "IE oppose",
  donation_amount: "Direct $",
  d_spend: "D spend",
  r_spend: "R spend",
  balance: "Balance",
  days_between: "Days ±",
}

function humanizeColumn(k: string): string {
  return COLUMN_LABELS[k] || k.replace(/_/g, " ")
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem",
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "0.375rem",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  outline: "none",
  width: "100%",
}

const thStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  color: "#9ca3af",
  fontWeight: 600,
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
}

const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  verticalAlign: "top",
  color: "#e5e7eb",
  whiteSpace: "nowrap",
  maxWidth: "300px",
  overflow: "hidden",
  textOverflow: "ellipsis",
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
