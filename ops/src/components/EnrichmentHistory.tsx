"use client"

import { useState, useEffect } from "react"

interface EnrichmentRun {
  sha: string
  date: string
  totalFiles: number
  pipelines: { name: string; count: number; label: string }[]
  profiles: { name: string; path: string; linesChanged: number }[]
}

interface ProfileDiff {
  summary: string[]
  added: { type: string; field?: string; value?: string; line: string }[]
  removed: { type: string; field?: string; value?: string; line: string }[]
}

const PIPELINE_COLORS: Record<string, string> = {
  fec: "#22c55e", "fec-summary": "#22c55e",
  congress: "#5b8dce", committee: "#5b8dce", govtrack: "#5b8dce",
  lda: "#5b8dce", lobbyview: "#5b8dce", "lobbying-contrib": "#5b8dce",
  "voting-record": "#5b8dce",
  usaspending: "#f59e0b", "usaspending-awards": "#f59e0b", sam: "#f59e0b",
  "nonprofit-990": "#22c55e",
  "federal-register": "#a855f7", fara: "#a855f7", "ofac-sdn": "#a855f7",
  recall: "#a855f7", "nhtsa-recalls": "#a855f7", osha: "#a855f7",
  courtlistener: "#ef4444", "sec-edgar": "#ef4444", "sec-litigation": "#ef4444", "doj-press": "#ef4444",
  propublica: "#06b6d4", "public-accountability": "#06b6d4", opensanctions: "#06b6d4",
  gleif: "#f59e0b", wikipedia: "#06b6d4", "auto-connect": "#a855f7",
}

export function EnrichmentHistory() {
  const [runs, setRuns] = useState<EnrichmentRun[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<{ sha: string; path: string; name: string } | null>(null)
  const [diff, setDiff] = useState<ProfileDiff | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)

  useEffect(() => {
    fetch("/api/enrichment-history")
      .then((r) => r.json())
      .then((data) => { setRuns(data.runs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const loadDiff = async (sha: string, filePath: string, name: string) => {
    if (selectedProfile?.sha === sha && selectedProfile?.path === filePath) {
      setSelectedProfile(null); setDiff(null); return
    }
    setSelectedProfile({ sha, path: filePath, name })
    setDiffLoading(true)
    try {
      const res = await fetch(`/api/enrichment-history/diff?sha=${sha}&path=${encodeURIComponent(filePath)}`)
      const data = await res.json()
      setDiff(data.changes || null)
    } catch { setDiff(null) }
    finally { setDiffLoading(false) }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (hours < 1) return "just now"
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  if (loading) return <div className="text-xs text-[var(--color-text-dim)] animate-pulse py-4">Loading enrichment history...</div>
  if (runs.length === 0) return <div className="text-xs text-[var(--color-text-dim)] py-4">No enrichment runs found</div>

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Pipeline Run History</h3>

      {runs.map((run) => (
        <div key={run.sha} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden">
          <button onClick={() => { setExpanded(expanded === run.sha ? null : run.sha); setSelectedProfile(null); setDiff(null) }}
            className="w-full p-4 text-left hover:bg-[var(--color-bg-hover)] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-green)]" />
                <span className="text-xs font-bold text-[var(--color-text)]">{run.totalFiles} profiles updated</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[var(--color-text-dim)]">{formatDate(run.date)}</span>
                <svg width={12} height={12} className={`text-[var(--color-text-dim)] transition-transform ${expanded === run.sha ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {run.pipelines.map((p) => (
                <span key={p.name} className="text-[8px] px-1.5 py-0.5 rounded"
                  style={{ color: PIPELINE_COLORS[p.name] || "#7a7a86", backgroundColor: `${PIPELINE_COLORS[p.name] || "#7a7a86"}15` }}>
                  {p.label}: {p.count}
                </span>
              ))}
            </div>
          </button>

          {expanded === run.sha && (
            <div className="px-4 pb-4 border-t border-[var(--color-border)]">
              <div className="py-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                {run.pipelines.map((p) => (
                  <p key={p.name} className="mb-1">
                    <span style={{ color: PIPELINE_COLORS[p.name] || "#7a7a86" }}>&#9679;</span>{" "}
                    <strong>{p.label}</strong> updated <strong>{p.count}</strong> profile{p.count !== 1 ? "s" : ""}
                  </p>
                ))}
              </div>

              <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-2">
                Click a profile to see what changed
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto mb-3">
                {run.profiles.map((p, i) => (
                  <button key={i} onClick={() => loadDiff(run.sha, p.path, p.name)}
                    className={`text-[9px] px-2 py-1 rounded border transition-colors ${
                      selectedProfile?.sha === run.sha && selectedProfile?.path === p.path
                        ? "border-[var(--color-steel)] bg-[var(--color-steel)]/10 text-[var(--color-steel)]"
                        : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-steel)]/30"
                    }`} title={p.path}>
                    {p.name}
                    {p.linesChanged > 0 && <span className="text-[var(--color-green)] ml-1">+{p.linesChanged}</span>}
                  </button>
                ))}
              </div>

              {/* Diff viewer */}
              {selectedProfile && selectedProfile.sha === run.sha && (
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[11px] font-bold text-[var(--color-text)]">Changes to {selectedProfile.name}</h4>
                    <button onClick={() => { setSelectedProfile(null); setDiff(null) }}
                      className="text-[8px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]">Close</button>
                  </div>

                  {diffLoading ? (
                    <div className="text-[10px] text-[var(--color-text-dim)] animate-pulse">Loading changes...</div>
                  ) : diff ? (
                    <div>
                      {diff.summary.length > 0 && (
                        <div className="mb-3 space-y-1">
                          {diff.summary.map((s, i) => (
                            <p key={i} className="text-[10px] text-[var(--color-text)] flex items-start gap-2">
                              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                s.startsWith("Added") ? "bg-[var(--color-green)]" :
                                s.startsWith("Updated") ? "bg-[var(--color-steel)]" :
                                s.startsWith("Removed") ? "bg-[var(--color-red)]" : "bg-[var(--color-text-dim)]"
                              }`} />
                              {s}
                            </p>
                          ))}
                        </div>
                      )}

                      {(diff.added.length > 0 || diff.removed.length > 0) && (
                        <details className="text-[9px]">
                          <summary className="text-[var(--color-text-dim)] cursor-pointer hover:text-[var(--color-text)] mb-2">
                            Raw diff ({diff.added.length} added, {diff.removed.length} removed)
                          </summary>
                          <div className="space-y-0.5 max-h-40 overflow-y-auto font-mono">
                            {diff.removed.map((c, i) => (
                              <div key={`r${i}`} className="text-[var(--color-red)]/80 bg-[var(--color-red)]/5 px-2 py-0.5 rounded">- {c.line}</div>
                            ))}
                            {diff.added.map((c, i) => (
                              <div key={`a${i}`} className="text-[var(--color-green)]/80 bg-[var(--color-green)]/5 px-2 py-0.5 rounded">+ {c.line}</div>
                            ))}
                          </div>
                        </details>
                      )}

                      {diff.summary.length === 0 && diff.added.length === 0 && <p className="text-[10px] text-[var(--color-text-dim)]">No parseable changes</p>}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[var(--color-text-dim)]">Could not load diff</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
