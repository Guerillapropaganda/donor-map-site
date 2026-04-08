"use client"

import type { VaultStats } from "@/lib/vault"

interface StatsBarProps {
  stats: VaultStats | null
  loading: boolean
}

function StatCard({ label, value, color, subtitle }: { label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      {subtitle && <span className="text-[8px] text-[var(--color-text-dim)]">{subtitle}</span>}
    </div>
  )
}

function GradeBar({ label, grade, count, total, color }: { label: string; grade: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold w-6" style={{ color }}>{grade}</span>
      <span className="text-[9px] text-[var(--color-text-dim)] w-14">{label}</span>
      <div className="flex-1 h-3 bg-[var(--color-bg)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.85 }} />
      </div>
      <span className="text-[10px] font-bold w-10 text-right" style={{ color }}>{count}</span>
      <span className="text-[8px] text-[var(--color-text-dim)] w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 h-40 animate-pulse" />
        ))}
      </div>
    )
  }

  const coverage = stats.totalProfiles > 0 ? Math.round((stats.enriched / stats.totalProfiles) * 100) : 0
  const verified = stats.byReadiness["verified"] || 0
  const ready = stats.byReadiness["ready"] || 0
  const draft = stats.byReadiness["draft"] || 0
  const raw = stats.byReadiness["raw"] || 0
  const total = stats.totalProfiles
  const decayVerified = stats.decayCandidates?.verifiedToReady || 0
  const decayReady = stats.decayCandidates?.readyToDraft || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Readiness Grades */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Readiness Grades</h3>
          <span className="text-[9px] text-[var(--color-text-dim)]">{total.toLocaleString()} profiles</span>
        </div>
        <div className="space-y-2">
          <GradeBar label="Verified" grade="A+" count={verified} total={total} color="#fbbf24" />
          <GradeBar label="Ready" grade="B" count={ready} total={total} color="#10b981" />
          <GradeBar label="Draft" grade="C" count={draft} total={total} color="#f59e0b" />
          <GradeBar label="Raw" grade="D-F" count={raw} total={total} color="#6b7280" />
        </div>
      </div>

      {/* Data Quality */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Data Quality</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Pipeline Coverage" value={`${coverage}%`} color="var(--color-steel)" subtitle={`${stats.enriched} of ${total} enriched`} />
          <StatCard label="Tier 1 Sources" value={stats.withTier1.toLocaleString()} color="var(--color-green)" subtitle={`${Math.round((stats.withTier1 / total) * 100)}% of vault`} />
          <StatCard label="Not Enriched" value={stats.notEnriched.toLocaleString()} color="var(--color-amber)" subtitle="Need pipeline run" />
          <StatCard label="Never Enriched" value={(stats.neverEnriched || 0).toLocaleString()} color="var(--color-red)" subtitle="Zero pipeline data" />
        </div>
      </div>

      {/* Health & Alerts */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Health & Freshness</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg)]">
            <span className="text-[10px] text-[var(--color-text-dim)]">Stale profiles (30+ days)</span>
            <span className="text-[11px] font-bold" style={{ color: (stats.staleCount || 0) > 50 ? "var(--color-red)" : "var(--color-amber)" }}>
              {(stats.staleCount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg)]">
            <span className="text-[10px] text-[var(--color-text-dim)]">A+ decay candidates (90d)</span>
            <span className="text-[11px] font-bold text-[var(--color-amber)]">{decayVerified}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg)]">
            <span className="text-[10px] text-[var(--color-text-dim)]">B decay candidates (180d)</span>
            <span className="text-[11px] font-bold text-[var(--color-amber)]">{decayReady}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-[var(--color-bg)]">
            <span className="text-[10px] text-[var(--color-text-dim)]">Ready for A+ review</span>
            <span className="text-[11px] font-bold text-[#fbbf24]">
              {verified > 0 ? `${verified} verified` : "Run reclassify first"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
