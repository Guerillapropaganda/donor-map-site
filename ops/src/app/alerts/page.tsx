"use client"

import { useState, useEffect } from "react"

interface Alert {
  id: string
  severity: "critical" | "warning" | "info"
  category: "pipeline" | "stale" | "readiness" | "data" | "source"
  title: string
  description: string
  profiles?: string[]
  count?: number
  timestamp: string
}

interface AlertSummary {
  critical: number
  warning: number
  info: number
  totalProfiles: number
  scannedAt: string
}

const SEVERITY_COLORS = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#5b8dce",
}

const SEVERITY_LABELS = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
}

const CATEGORY_COLORS: Record<string, string> = {
  pipeline: "#22c55e",
  stale: "#f59e0b",
  readiness: "#5b8dce",
  data: "#a855f7",
  source: "#ef4444",
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "critical" | "warning" | "info">("all")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const scan = () => {
    setLoading(true)
    setError(null)
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setAlerts(data.alerts || [])
          setSummary(data.summary || null)
        }
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }

  useEffect(() => { scan() }, [])

  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter)

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Alerts</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">
            {summary ? `Scanned ${summary.totalProfiles} profiles at ${new Date(summary.scannedAt).toLocaleTimeString()}` : "Scanning vault..."}
          </p>
        </div>
        <button
          onClick={scan}
          disabled={loading}
          className="flex items-center gap-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 rounded-lg px-4 py-2 text-xs hover:bg-[var(--color-steel)]/25 transition-colors disabled:opacity-50"
        >
          {loading ? "Scanning..." : "Re-scan Vault"}
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["critical", "warning", "info"] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilter(filter === sev ? "all" : sev)}
              className={`bg-[var(--color-bg-card)] border rounded-lg p-4 text-left transition-all ${
                filter === sev
                  ? `border-current`
                  : "border-[var(--color-border)] hover:border-[var(--color-text-dim)]"
              }`}
              style={{ borderColor: filter === sev ? SEVERITY_COLORS[sev] : undefined }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLORS[sev] }}
                />
                <span className="text-[10px] uppercase tracking-wider" style={{ color: SEVERITY_COLORS[sev] }}>
                  {SEVERITY_LABELS[sev]}
                </span>
              </div>
              <span className="text-2xl font-bold" style={{ color: SEVERITY_COLORS[sev] }}>
                {summary[sev]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded-lg p-4 text-xs text-[var(--color-red)]">
          {error}
        </div>
      )}

      {/* Alerts list */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">
          Scanning vault for issues...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <p className="text-xs text-[var(--color-text-dim)]">
            {alerts.length === 0 ? "No alerts — vault looks healthy" : "No alerts match this filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => (
            <div
              key={alert.id}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden"
            >
              {/* Alert header */}
              <button
                onClick={() => toggleExpand(alert.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                {/* Severity dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-[var(--color-text)]">{alert.title}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-dim)]">{alert.description}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color: CATEGORY_COLORS[alert.category],
                      backgroundColor: `${CATEGORY_COLORS[alert.category]}15`,
                    }}
                  >
                    {alert.category}
                  </span>
                  <span
                    className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color: SEVERITY_COLORS[alert.severity],
                      backgroundColor: `${SEVERITY_COLORS[alert.severity]}15`,
                    }}
                  >
                    {alert.severity}
                  </span>
                  {alert.count && (
                    <span className="text-[10px] font-bold text-[var(--color-text-dim)]">
                      {alert.count}
                    </span>
                  )}
                  <svg
                    width={12} height={12}
                    className={`text-[var(--color-text-dim)] transition-transform ${expanded.has(alert.id) ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded details */}
              {expanded.has(alert.id) && alert.profiles && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-[var(--color-bg)] rounded-lg p-3">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-2">
                      Affected Profiles {alert.count && alert.count > 10 ? `(showing 10 of ${alert.count})` : ""}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {alert.profiles.map((name, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
