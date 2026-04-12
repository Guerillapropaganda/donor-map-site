"use client"

import { useState, useEffect } from "react"

interface LogProfile {
  name: string
  detail: string
  conflict: boolean
}

interface LogEntry {
  date: string
  pipeline: string
  profileCount: number
  profiles: LogProfile[]
  conflictCount: number
}

interface LogBatch {
  date: string
  entries: LogEntry[]
  totalProfiles: number
  totalConflicts: number
}

const PIPELINE_COLORS: Record<string, string> = {
  FEC: "#22c55e",
  ProPublica: "#06b6d4",
  "ofac-sdn": "#a855f7",
  "stock-watcher": "#f59e0b",
  "influence-xref": "#5b8dce",
  "Congress.gov": "#5b8dce",
  courtlistener: "#ef4444",
  USAspending: "#f59e0b",
  GovTrack: "#a855f7",
  fara: "#a855f7",
  "Senate Lobbying Disclosures": "#5b8dce",
  gleif: "#f59e0b",
  "GLEIF Legal Entity Data": "#f59e0b",
}

function getPipelineColor(name: string): string {
  // Try exact match first, then partial
  if (PIPELINE_COLORS[name]) return PIPELINE_COLORS[name]
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(PIPELINE_COLORS)) {
    if (lower.includes(k.toLowerCase())) return v
  }
  return "#7a7a86"
}

export function EnrichmentLog() {
  const [batches, setBatches] = useState<LogBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [pipelineFilter, setPipelineFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/enrichment-log?limit=10")
      .then((r) => r.json())
      .then((data) => { setBatches(data.batches || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-xs text-[var(--color-text-dim)] animate-pulse py-4">Loading enrichment log...</div>
  if (batches.length === 0) return <div className="text-xs text-[var(--color-text-dim)] py-4">No enrichment log entries found</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
          Enrichment Details — Who Was Enriched
        </h3>
        <span className="text-[8px] text-[var(--color-text-dim)]">
          From Auto-Enrichment Log
        </span>
      </div>

      {batches.map((batch, bi) => {
        const isExpanded = expanded === batch.date
        const allPipelines = [...new Set(batch.entries.map(e => e.pipeline))]

        return (
          <div key={bi} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            {/* Header */}
            <button onClick={() => { setExpanded(isExpanded ? null : batch.date); setPipelineFilter("all") }}
              className="w-full p-4 text-left hover:bg-[var(--color-bg-hover)] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-green)]" />
                  <span className="text-xs font-bold text-[var(--color-text)]">
                    {batch.totalProfiles} profiles enriched
                  </span>
                  {batch.totalConflicts > 0 && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#f59e0b]/15 text-[#f59e0b]">
                      {batch.totalConflicts} conflicts
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[var(--color-text-dim)]">{batch.date}</span>
                  <svg width={12} height={12} className={`text-[var(--color-text-dim)] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {batch.entries.map((e, i) => (
                  <span key={i} className="text-[8px] px-1.5 py-0.5 rounded"
                    style={{ color: getPipelineColor(e.pipeline), backgroundColor: `${getPipelineColor(e.pipeline)}15` }}>
                    {e.pipeline}: {e.profileCount}
                  </span>
                ))}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                {/* Pipeline filter */}
                {allPipelines.length > 1 && (
                  <div className="flex flex-wrap gap-1 py-3">
                    <button onClick={() => setPipelineFilter("all")}
                      className={`text-[8px] px-2 py-1 rounded border transition-colors ${pipelineFilter === "all" ? "border-[var(--color-steel)] bg-[var(--color-steel)]/10 text-[var(--color-steel)]" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}>
                      All ({batch.totalProfiles})
                    </button>
                    {allPipelines.map(p => {
                      const entry = batch.entries.find(e => e.pipeline === p)
                      return (
                        <button key={p} onClick={() => setPipelineFilter(p)}
                          className={`text-[8px] px-2 py-1 rounded border transition-colors ${pipelineFilter === p ? "border-transparent text-white" : "border-[var(--color-border)] text-[var(--color-text-dim)]"}`}
                          style={pipelineFilter === p ? { backgroundColor: getPipelineColor(p) } : {}}>
                          {p} ({entry?.profileCount || 0})
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Profile list */}
                <div className="max-h-96 overflow-y-auto space-y-0.5">
                  {batch.entries
                    .filter(e => pipelineFilter === "all" || e.pipeline === pipelineFilter)
                    .map((entry, ei) => (
                      <div key={ei}>
                        {pipelineFilter === "all" && (
                          <div className="text-[9px] uppercase tracking-wider mt-3 mb-1 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getPipelineColor(entry.pipeline) }} />
                            <span style={{ color: getPipelineColor(entry.pipeline) }}>{entry.pipeline}</span>
                            <span className="text-[var(--color-text-dim)]">({entry.profileCount})</span>
                            {entry.conflictCount > 0 && (
                              <span className="text-[#f59e0b]">{entry.conflictCount} conflicts</span>
                            )}
                          </div>
                        )}
                        {entry.profiles.map((p, pi) => (
                          <div key={pi}
                            className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] hover:bg-[var(--color-bg-hover)] ${p.conflict ? "border-l-2 border-[#f59e0b]" : ""}`}>
                            <span className={`font-medium ${p.conflict ? "text-[#f59e0b]" : "text-[var(--color-text)]"}`}>
                              {p.name}
                              {p.conflict && <span className="text-[8px] ml-1 text-[#f59e0b]">CONFLICT</span>}
                            </span>
                            <span className="text-[var(--color-text-dim)] text-[9px] ml-3 truncate max-w-[50%] text-right">
                              {p.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
