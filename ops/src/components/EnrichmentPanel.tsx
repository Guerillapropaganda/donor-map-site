"use client"

import { useState } from "react"
import { PIPELINES, ACTION_LABELS, ACTION_COLORS, ACTION_DESCRIPTIONS, CATEGORY_COLORS } from "@/lib/pipelines"
import { PipelineCard } from "@/components/PipelineCard"

interface EnrichmentPanelProps {
  onTrigger: (pipeline: string, limit: number) => Promise<void>
  triggering: boolean
}

const ACTION_ORDER = ["auto-fill", "source-discovery", "investigative", "relationship"] as const

export function EnrichmentPanel({ onTrigger, triggering }: EnrichmentPanelProps) {
  const [selectedPipelines, setSelectedPipelines] = useState<Set<string>>(new Set(PIPELINES.filter((p) => p.action === "auto-fill").map((p) => p.id)))
  const [limit, setLimit] = useState(30)
  const [actionFilter, setActionFilter] = useState<string>("all")

  const filtered = actionFilter === "all"
    ? PIPELINES
    : PIPELINES.filter((p) => p.action === actionFilter)

  const togglePipeline = (id: string) => {
    setSelectedPipelines((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedPipelines(new Set(PIPELINES.map((p) => p.id)))
  const selectNone = () => setSelectedPipelines(new Set())
  const selectAction = (action: string) => {
    setSelectedPipelines(new Set(PIPELINES.filter((p) => p.action === action).map((p) => p.id)))
    setActionFilter(action)
  }

  const handleTrigger = () => {
    if (selectedPipelines.size === PIPELINES.length) {
      onTrigger("all", limit)
    } else if (selectedPipelines.size === 1) {
      onTrigger(Array.from(selectedPipelines)[0], limit)
    } else {
      const ids = Array.from(selectedPipelines)
      ids.reduce((promise, id) => {
        return promise.then(() => onTrigger(id, limit))
      }, Promise.resolve())
    }
  }

  return (
    <div>
      {/* Action type cards — the main way to understand pipelines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {ACTION_ORDER.map((action) => {
          const count = PIPELINES.filter((p) => p.action === action).length
          const selected = PIPELINES.filter((p) => p.action === action && selectedPipelines.has(p.id)).length
          return (
            <button
              key={action}
              onClick={() => selectAction(action)}
              className={`text-left p-3 rounded-lg border transition-all ${
                actionFilter === action
                  ? "border-current bg-current/10"
                  : "border-[var(--color-border)] hover:border-current/30"
              }`}
              style={{ color: ACTION_COLORS[action] }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-current" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{ACTION_LABELS[action]}</span>
                <span className="ml-auto text-[9px] opacity-60">{selected}/{count}</span>
              </div>
              <p className="text-[8px] leading-snug" style={{ color: "var(--color-text-dim)" }}>
                {ACTION_DESCRIPTIONS[action]}
              </p>
            </button>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => { setActionFilter("all"); selectAll() }}
          className={`text-[9px] px-2.5 py-1.5 rounded-full border transition-all ${
            actionFilter === "all" ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"
          }`}
        >
          All ({PIPELINES.length})
        </button>
        <div className="flex-1" />
        <button onClick={selectAll} className="text-[9px] text-[var(--color-steel)] hover:underline">Select All</button>
        <button onClick={selectNone} className="text-[9px] text-[var(--color-text-dim)] hover:underline">Clear</button>
      </div>

      {/* Pipeline grid — grouped by action type */}
      {actionFilter === "all" ? (
        ACTION_ORDER.map((action) => {
          const group = PIPELINES.filter((p) => p.action === action)
          if (group.length === 0) return null
          return (
            <div key={action} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ACTION_COLORS[action] }} />
                <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ACTION_COLORS[action] }}>
                  {ACTION_LABELS[action]}
                </h3>
                <span className="text-[8px] text-[var(--color-text-dim)]">— {ACTION_DESCRIPTIONS[action]}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {group.map((pipeline) => (
                  <PipelineCard
                    key={pipeline.id}
                    pipeline={pipeline}
                    selected={selectedPipelines.has(pipeline.id)}
                    onToggle={togglePipeline}
                  />
                ))}
              </div>
            </div>
          )
        })
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-6">
          {filtered.map((pipeline) => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              selected={selectedPipelines.has(pipeline.id)}
              onToggle={togglePipeline}
            />
          ))}
        </div>
      )}

      {/* Trigger bar */}
      <div className="sticky bottom-0 bg-[var(--color-bg)] border-t border-[var(--color-border)] -mx-6 px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">Limit</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
          >
            <option value={5}>5 profiles</option>
            <option value={10}>10 profiles</option>
            <option value={30}>30 profiles</option>
            <option value={50}>50 profiles</option>
            <option value={100}>100 profiles</option>
          </select>
        </div>
        <div className="flex-1 text-[10px] text-[var(--color-text-dim)]">
          {selectedPipelines.size} of {PIPELINES.length} pipelines selected
        </div>
        <button
          onClick={handleTrigger}
          disabled={triggering || selectedPipelines.size === 0}
          className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-6 py-2.5 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {triggering ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Enriching...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
              </svg>
              {selectedPipelines.size === PIPELINES.length ? "Enrich All" : `Enrich (${selectedPipelines.size})`}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
