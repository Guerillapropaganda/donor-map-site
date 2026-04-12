"use client"

import { useState, useEffect } from "react"
import type { PipelineHealthResponse, PipelineStatus } from "@/app/api/pipeline-health/route"

const STATUS_COLORS = {
  healthy: "#22c55e",
  stale: "#f59e0b",
  dead: "#ef4444",
}

const STATUS_LABELS = {
  healthy: "Active",
  stale: "Stale",
  dead: "Inactive",
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function StatusDot({ status }: { status: PipelineStatus["status"] }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: STATUS_COLORS[status] }}
      title={STATUS_LABELS[status]}
    />
  )
}

export function PipelineHealth() {
  const [data, setData] = useState<PipelineHealthResponse | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/pipeline-health")
      .then(r => r.json())
      .then(d => {
        if (d.error && !d.pipelines) setError(d.error)
        else setData(d)
      })
      .catch(e => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Pipeline Health</h3>
        <div className="text-[10px] text-[var(--color-red)]">Failed to load: {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Pipeline Health</h3>
        <div className="animate-pulse h-16 bg-[var(--color-bg)] rounded" />
      </div>
    )
  }

  const { summary, pipelines } = data
  const color = summary.healthPct > 60 ? "#22c55e" : summary.healthPct > 30 ? "#f59e0b" : "#ef4444"

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Pipeline Health</h3>

      <div className="flex items-center gap-4 mb-3">
        {/* Donut */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#3a3a45" strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke={color} strokeWidth="3"
              strokeDasharray={`${summary.healthPct}, 100`} strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold" style={{ color }}>
            {summary.healthPct}%
          </span>
        </div>

        {/* Summary stats */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-[#22c55e]">Active (7d)</span>
            <span className="font-bold text-[var(--color-text)]">{summary.healthy}</span>
          </div>
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-[#f59e0b]">Stale (30d)</span>
            <span className="font-bold text-[var(--color-text)]">{summary.stale}</span>
          </div>
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-[#ef4444]">Inactive</span>
            <span className="font-bold text-[var(--color-text)]">{summary.dead}</span>
          </div>
        </div>
      </div>

      {/* Meta line */}
      <div className="flex items-center justify-between text-[8px] text-[var(--color-text-dim)] mb-2">
        <span>{summary.total} pipelines &middot; {summary.totalRunsLast7d} runs this week</span>
        <span>Last: {timeAgo(summary.lastEnrichment)}</span>
      </div>

      {/* Compact bar: colored segments */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--color-bg)] mb-2">
        {summary.healthy > 0 && (
          <div
            className="h-full"
            style={{ width: `${(summary.healthy / summary.total) * 100}%`, backgroundColor: "#22c55e" }}
          />
        )}
        {summary.stale > 0 && (
          <div
            className="h-full"
            style={{ width: `${(summary.stale / summary.total) * 100}%`, backgroundColor: "#f59e0b" }}
          />
        )}
        {summary.dead > 0 && (
          <div
            className="h-full"
            style={{ width: `${(summary.dead / summary.total) * 100}%`, backgroundColor: "#ef4444" }}
          />
        )}
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[8px] text-[var(--color-steel)] hover:underline"
        aria-label={expanded ? "Collapse pipeline details" : "Expand pipeline details"}
      >
        {expanded ? "Hide details" : "Show all pipelines"}
      </button>

      {/* Expanded pipeline list */}
      {expanded && (
        <div className="mt-2 space-y-0.5 max-h-48 overflow-y-auto">
          {pipelines.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-2 py-0.5 px-1 rounded text-[8px] hover:bg-[var(--color-bg-hover)]"
            >
              <StatusDot status={p.status} />
              <span className="flex-1 text-[var(--color-text)] truncate" title={p.label}>
                {p.label}
              </span>
              <span className="text-[var(--color-text-dim)] tabular-nums w-8 text-right">
                {p.runsLast7d > 0 ? `${p.runsLast7d}x` : "—"}
              </span>
              <span className="text-[var(--color-text-dim)] w-12 text-right">
                {timeAgo(p.lastRun)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
