"use client"

import { useState } from "react"
import { PIPELINES, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/pipelines"
import { PipelineCard } from "@/components/PipelineCard"

interface EnrichmentPanelProps {
  onTrigger: (pipeline: string, limit: number) => Promise<void>
  triggering: boolean
}

export function EnrichmentPanel({ onTrigger, triggering }: EnrichmentPanelProps) {
  const [selectedPipelines, setSelectedPipelines] = useState<Set<string>>(new Set(PIPELINES.map((p) => p.id)))
  const [limit, setLimit] = useState(30)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const categories = Array.from(new Set(PIPELINES.map((p) => p.category)))

  const filtered = categoryFilter === "all"
    ? PIPELINES
    : PIPELINES.filter((p) => p.category === categoryFilter)

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
  const selectCategory = (cat: string) => {
    setSelectedPipelines(new Set(PIPELINES.filter((p) => p.category === cat).map((p) => p.id)))
  }

  const handleTrigger = () => {
    if (selectedPipelines.size === PIPELINES.length) {
      onTrigger("all", limit)
    } else if (selectedPipelines.size === 1) {
      onTrigger(Array.from(selectedPipelines)[0], limit)
    } else {
      // Trigger each selected pipeline individually
      // For now, if multiple are selected but not all, we run them one at a time
      const ids = Array.from(selectedPipelines)
      ids.reduce((promise, id) => {
        return promise.then(() => onTrigger(id, limit))
      }, Promise.resolve())
    }
  }

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Category filter chips */}
        <button
          onClick={() => setCategoryFilter("all")}
          className={`text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${
            categoryFilter === "all"
              ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
              : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-text-dim)]"
          }`}
        >
          All ({PIPELINES.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${
              categoryFilter === cat
                ? `border-current bg-current/10`
                : "border-[var(--color-border)] hover:border-[var(--color-text-dim)]"
            }`}
            style={{
              color: categoryFilter === cat ? CATEGORY_COLORS[cat] : "var(--color-text-dim)",
            }}
          >
            {CATEGORY_LABELS[cat]} ({PIPELINES.filter((p) => p.category === cat).length})
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Selection controls */}
        <button onClick={selectAll} className="text-[9px] text-[var(--color-steel)] hover:underline">
          Select All
        </button>
        <button onClick={selectNone} className="text-[9px] text-[var(--color-text-dim)] hover:underline">
          Clear
        </button>
      </div>

      {/* Pipeline grid */}
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
