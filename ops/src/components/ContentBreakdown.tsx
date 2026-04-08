"use client"

import type { Profile } from "@/lib/vault"
import { readinessColor } from "@/lib/vault"

const CATEGORIES: { key: string; label: string; types: string[] }[] = [
  { key: "profiles", label: "Profiles", types: ["politician", "donor", "corporation", "think-tank", "lobbying-firm", "media-profile", "pac"] },
  { key: "stories", label: "Stories", types: ["story"] },
  { key: "events", label: "Events", types: ["event"] },
  { key: "subnotes", label: "Sub-Notes", types: ["sub-note"] },
  { key: "updates", label: "Daily Updates", types: ["daily-update"] },
  { key: "other", label: "Other", types: ["reference", "index", "methodology", "meta"] },
]

const TIERS = ["verified", "ready", "draft", "raw"] as const
const TIER_LABELS: Record<string, string> = { verified: "A+", ready: "B", draft: "C", raw: "D-F" }

export function ContentBreakdown({ profiles }: { profiles: Profile[] }) {
  if (!profiles || profiles.length === 0) return null

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Content by Category</h3>

      <div className="space-y-2">
        {CATEGORIES.map((cat) => {
          const items = profiles.filter((p) => cat.types.includes(p.type))
          if (items.length === 0) return null

          const counts: Record<string, number> = {}
          for (const t of TIERS) {
            counts[t] = items.filter((p) => p.contentReadiness === t).length
          }

          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--color-text)]">{cat.label}</span>
                <span className="text-[9px] text-[var(--color-text-dim)]">{items.length}</span>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-bg)]">
                {TIERS.map((t) => {
                  const pct = items.length > 0 ? (counts[t] / items.length) * 100 : 0
                  if (pct === 0) return null
                  return (
                    <div
                      key={t}
                      title={`${TIER_LABELS[t]} ${t}: ${counts[t]}`}
                      className="h-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: readinessColor(t), opacity: 0.85 }}
                    />
                  )
                })}
              </div>
              <div className="flex gap-2 mt-0.5">
                {TIERS.map((t) => {
                  if (counts[t] === 0) return null
                  return (
                    <span key={t} className="text-[7px]" style={{ color: readinessColor(t) }}>
                      {TIER_LABELS[t]} {counts[t]}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
