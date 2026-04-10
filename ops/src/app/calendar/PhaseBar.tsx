"use client"

import type { Phase } from "./types"
import { PHASE_COLORS } from "./types"

interface Props {
  phases: Phase[]
  today: string
}

export function PhaseBar({ phases, today }: Props) {
  const totalDays = phases.reduce((sum, p) => sum + p.days, 0)
  return (
    <section className="border border-[var(--color-border)] bg-[var(--color-bg-card)]">
      <div className="flex h-12 relative">
        {phases.map((phase) => {
          const color = PHASE_COLORS[phase.id]?.hex ?? "#fbbf24"
          const label = PHASE_COLORS[phase.id]?.label ?? phase.name.toUpperCase()
          const widthPct = (phase.days / totalDays) * 100
          const isCurrent = today >= phase.start && today <= phase.end
          return (
            <a
              key={phase.id}
              href={`#${phase.id}`}
              className="relative flex items-center justify-center px-3 border-r border-[var(--color-border)] last:border-r-0 hover:brightness-125 transition-all overflow-hidden"
              style={{
                width: `${widthPct}%`,
                backgroundColor: color + "15", // 15 = ~8% alpha
                borderTop: isCurrent ? `3px solid ${color}` : `3px solid transparent`,
              }}
            >
              <div className="text-center">
                <div
                  className="text-[9px] tracking-[0.2em] font-bold font-mono"
                  style={{ color }}
                >
                  {label}
                </div>
                <div className="text-[9px] text-[var(--color-text-dim)] font-mono mt-0.5">
                  {phase.start.slice(5)} → {phase.end.slice(5)} · {phase.days}D · {phase.hours_budget}H
                </div>
              </div>
              {isCurrent && (
                <div
                  className="absolute top-0 left-0 px-1.5 py-0.5 text-[8px] font-bold font-mono"
                  style={{ backgroundColor: color, color: "#000" }}
                >
                  CURRENT
                </div>
              )}
            </a>
          )
        })}
      </div>
      <div className="px-4 py-2 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-dim)] font-mono">
        {phases.find((p) => today >= p.start && today <= p.end)?.theme ?? "Sprint not yet active"}
      </div>
    </section>
  )
}
