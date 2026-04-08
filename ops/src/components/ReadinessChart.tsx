"use client"

import type { VaultStats } from "@/lib/vault"
import { readinessColor } from "@/lib/vault"

const READINESS_ORDER = ["raw", "draft", "ready", "verified"]

export function ReadinessChart({ stats }: { stats: VaultStats | null }) {
  if (!stats) return null

  const max = Math.max(...READINESS_ORDER.map((r) => stats.byReadiness[r] || 0), 1)

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Readiness Distribution</h3>

      <div className="space-y-2">
        {READINESS_ORDER.map((r) => {
          const count = stats.byReadiness[r] || 0
          const pct = max > 0 ? (count / max) * 100 : 0
          return (
            <div key={r} className="flex items-center gap-2">
              <span className="text-[10px] w-20 text-right text-[var(--color-text-dim)] uppercase tracking-wider">{r}</span>
              <div className="flex-1 h-5 bg-[var(--color-bg)] rounded overflow-hidden">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: readinessColor(r),
                    opacity: 0.8,
                  }}
                />
              </div>
              <span className="text-[11px] w-12 text-right font-bold" style={{ color: readinessColor(r) }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
