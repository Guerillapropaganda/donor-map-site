"use client"

import type { VaultStats } from "@/lib/vault"

interface StatsBarProps {
  stats: VaultStats | null
  loading: boolean
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">{label}</span>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 h-20 animate-pulse" />
        ))}
      </div>
    )
  }

  const coverage = stats.totalProfiles > 0 ? Math.round((stats.enriched / stats.totalProfiles) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <StatCard label="Total Profiles" value={stats.totalProfiles.toLocaleString()} color="var(--color-text)" />
      <StatCard label="Enriched" value={stats.enriched.toLocaleString()} color="var(--color-green)" />
      <StatCard label="Coverage" value={`${coverage}%`} color="var(--color-steel)" />
      <StatCard label="Tier 1 Sources" value={stats.withTier1.toLocaleString()} color="var(--color-green)" />
      <StatCard label="Not Enriched" value={stats.notEnriched.toLocaleString()} color="var(--color-amber)" />
      <StatCard label="Ready" value={(stats.byReadiness["ready"] || 0).toLocaleString()} color="#10b981" />
    </div>
  )
}
