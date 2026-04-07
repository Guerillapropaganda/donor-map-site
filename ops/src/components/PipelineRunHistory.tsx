"use client"

import { useState, useEffect } from "react"

interface WorkflowRun {
  id: number
  status: string
  conclusion: string | null
  createdAt: string
  updatedAt: string
  runNumber: number
  event: string
  title: string
  url: string
}

export function PipelineRunHistory() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)

  const loadRuns = () => {
    setLoading(true)
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then((data) => {
        setRuns(data.runs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadRuns()
    // Poll every 30s for updates while a run is in progress
    const interval = setInterval(loadRuns, 30000)
    return () => clearInterval(interval)
  }, [])

  const statusIcon = (status: string, conclusion: string | null) => {
    if (status === "in_progress" || status === "queued") {
      return <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-amber)] animate-pulse-glow" />
    }
    if (conclusion === "success") {
      return <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-green)]" />
    }
    if (conclusion === "failure") {
      return <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-red)]" />
    }
    return <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-text-dim)]" />
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  const duration = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Pipeline Run History</h3>
        <button
          onClick={loadRuns}
          className="text-[9px] text-[var(--color-steel)] hover:underline"
        >
          Refresh
        </button>
      </div>

      {loading && runs.length === 0 ? (
        <div className="text-xs text-[var(--color-text-dim)] animate-pulse-glow">Loading runs...</div>
      ) : runs.length === 0 ? (
        <div className="text-xs text-[var(--color-text-dim)]">No recent runs found</div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {runs.map((run) => (
            <div key={run.id} className="flex items-start gap-2.5 p-2 rounded bg-[var(--color-bg)] hover:bg-[var(--color-bg-hover)] transition-colors">
              {statusIcon(run.status, run.conclusion)}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[var(--color-text)] truncate">{run.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] text-[var(--color-text-dim)]">#{run.runNumber}</span>
                  <span className="text-[8px] text-[var(--color-text-dim)]">{formatTime(run.createdAt)}</span>
                  {run.status === "completed" && (
                    <span className="text-[8px] text-[var(--color-text-dim)]">{duration(run.createdAt, run.updatedAt)}</span>
                  )}
                  {run.status === "in_progress" && (
                    <span className="text-[8px] text-[var(--color-amber)] font-bold">Running...</span>
                  )}
                  <span className={`text-[7px] px-1 rounded ${
                    run.event === "workflow_dispatch" ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]" : "bg-[var(--color-text-dim)]/15 text-[var(--color-text-dim)]"
                  }`}>
                    {run.event === "workflow_dispatch" ? "manual" : "scheduled"}
                  </span>
                </div>
              </div>
              <a
                href={run.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text-dim)] hover:text-[var(--color-steel)] flex-shrink-0"
                title="View on GitHub"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
