"use client"

import type { Pipeline } from "@/lib/pipelines"
import { CATEGORY_COLORS, ACTION_COLORS, ACTION_LABELS } from "@/lib/pipelines"

interface PipelineCardProps {
  pipeline: Pipeline
  selected: boolean
  onToggle: (id: string) => void
}

export function PipelineCard({ pipeline, selected, onToggle }: PipelineCardProps) {
  const catColor = CATEGORY_COLORS[pipeline.category]

  return (
    <button
      onClick={() => onToggle(pipeline.id)}
      className={`relative text-left rounded-lg border p-3 transition-all ${
        selected
          ? "bg-[var(--color-bg-hover)] border-[var(--color-steel)]"
          : "bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
      }`}
    >
      {/* Toggle indicator */}
      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full border-2 transition-all ${
        selected ? "bg-[var(--color-green)] border-[var(--color-green)]" : "border-[var(--color-border)]"
      }`} />

      {/* Action + Category badges */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: ACTION_COLORS[pipeline.action], backgroundColor: `${ACTION_COLORS[pipeline.action]}15` }}
        >
          {ACTION_LABELS[pipeline.action]}
        </span>
        <span
          className="text-[7px] uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ color: catColor, backgroundColor: `${catColor}15` }}
        >
          {pipeline.category}
        </span>
      </div>

      {/* Name */}
      <p className="text-[11px] font-bold text-[var(--color-text)] mb-0.5 pr-5">{pipeline.name}</p>

      {/* Description */}
      <p className="text-[9px] text-[var(--color-text-dim)] leading-relaxed line-clamp-2">{pipeline.description}</p>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[8px] text-[var(--color-text-dim)]">{pipeline.source}</span>
        <span className={`text-[7px] px-1 rounded ${
          pipeline.tier === 1 ? "bg-[var(--color-green)]/15 text-[var(--color-green)]" :
          pipeline.tier === 2 ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]" :
          "bg-[var(--color-amber)]/15 text-[var(--color-amber)]"
        }`}>
          Tier {pipeline.tier}
        </span>
        {pipeline.requiresAuth && (
          <span className="text-[7px] px-1 rounded bg-[var(--color-amber)]/15 text-[var(--color-amber)]">Auth</span>
        )}
      </div>
    </button>
  )
}
