"use client"

import type { VaultStats } from "@/lib/vault"
import { typeColor } from "@/lib/vault"

const TYPE_LABELS: Record<string, string> = {
  politician: "Politicians",
  donor: "Donors",
  corporation: "Corporations",
  "think-tank": "Think Tanks",
  "lobbying-firm": "K Street",
  "media-profile": "Media",
  pac: "PACs",
  story: "Stories",
  event: "Events",
}

export function TypeBreakdown({ stats }: { stats: VaultStats | null }) {
  if (!stats) return null

  const sorted = Object.entries(stats.byType).sort((a, b) => b[1] - a[1])
  const total = stats.totalProfiles

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">By Type</h3>

      <div className="space-y-1.5">
        {sorted.map(([type, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={type} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: typeColor(type) }} />
              <span className="text-[10px] text-[var(--color-text-dim)] flex-1 truncate">
                {TYPE_LABELS[type] || type}
              </span>
              <span className="text-[10px] font-bold" style={{ color: typeColor(type) }}>{count}</span>
              <span className="text-[8px] text-[var(--color-text-dim)] w-8 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
