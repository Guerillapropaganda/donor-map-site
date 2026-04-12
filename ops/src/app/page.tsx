"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { Profile, VaultStats } from "@/lib/vault"
import { StatsBar } from "@/components/StatsBar"
import { VaultGrid } from "@/components/VaultGrid"
import { ProfileDetail } from "@/components/ProfileDetail"
import { ActivityFeed } from "@/components/ActivityFeed"
import { TypeBreakdown } from "@/components/TypeBreakdown"
import { ContentBreakdown } from "@/components/ContentBreakdown"
import { Breadcrumbs } from "@/components/Breadcrumbs"

interface ActivityItem { id: string; type: string; actor: string; action: string; detail: string; timestamp: string; link?: string }

const ACTOR_COLORS: Record<string, string> = {
  "David": "#f59e0b",
  "Code Claude": "#5b8dce",
  "Research Claude": "#a855f7",
  "Pipeline": "#22c55e",
}

export default function Dashboard() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats, setStats] = useState<VaultStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityFilter, setActivityFilter] = useState("all")
  const [statusData, setStatusData] = useState<{
    alerts?: { critical: number; warning?: number }
    suggestions?: { highPending: number }
    notes?: { open: number }
  }>({})

  const loadVault = (refresh = false) => {
    setLoading(true)
    setError(null)
    fetch(`/api/vault${refresh ? "?refresh=true" : ""}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setProfiles(data.profiles)
          setStats(data.stats)
          setLastRefresh(new Date())
        }
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }

  const loadActivity = async (type = "all") => {
    try {
      const res = await fetch(`/api/activity?limit=15&type=${type}`)
      const data = await res.json()
      setActivity(data.items || [])
    } catch { /* skip */ }
  }

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/status")
      if (res.ok) setStatusData(await res.json())
    } catch { /* skip */ }
  }

  // Attention Queue — loaded once on mount, displayed in the priority card
  const [attention, setAttention] = useState<{
    total: number
    blocking: number
    deciding: number
    compounding: number
    top3: Array<{ what: string; bucket: string; leverage: number; cost_min: number }>
  } | null>(null)
  const loadAttention = async () => {
    try {
      const res = await fetch("/api/attention-queue")
      if (!res.ok) return
      const d = await res.json()
      if (d.empty) { setAttention({ total: 0, blocking: 0, deciding: 0, compounding: 0, top3: [] }); return }
      setAttention({
        total: d.total,
        blocking: d.buckets.blocking.length,
        deciding: d.buckets.deciding.length,
        compounding: d.buckets.compounding.length,
        top3: d.ranked.slice(0, 3).map((e: { what: string; bucket: string; leverage: number; cost_min: number }) => ({
          what: e.what,
          bucket: e.bucket,
          leverage: e.leverage,
          cost_min: e.cost_min,
        })),
      })
    } catch { /* skip */ }
  }

  useEffect(() => {
    loadVault()
    loadActivity()
    loadStatus()
    loadAttention()
  }, [])

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  return (
    <div className={`transition-all ${selected ? "mr-96" : ""}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Dashboard</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">
            {lastRefresh ? `Last refreshed ${lastRefresh.toLocaleTimeString()}` : "Loading..."}
          </p>
        </div>
        <button
          onClick={() => loadVault(true)}
          disabled={loading}
          className="flex items-center gap-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 rounded-lg px-4 py-2 text-xs hover:bg-[var(--color-steel)]/25 transition-colors disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh from GitHub
        </button>
      </div>

      {/* Error / Setup Guide */}
      {error && (
        <div className="mb-6 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-6">
          {(error.includes("GITHUB_TOKEN") || error.includes("Bad credentials") || error.includes("placeholder")) ? (
            <div>
              <h2 className="text-sm font-bold text-[var(--color-steel)] mb-3">Setup Required</h2>
              <p className="text-xs text-[var(--color-text-dim)] mb-4">Connect to your GitHub repo to see the vault. Takes 2 minutes.</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-steel)]/15 text-[var(--color-steel)] flex items-center justify-center text-[10px] font-bold">1</span>
                  <div>
                    <p className="text-xs text-[var(--color-text)]">Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)</p>
                    <p className="text-[10px] text-[var(--color-text-dim)] mt-0.5">Or visit: github.com/settings/tokens</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-steel)]/15 text-[var(--color-steel)] flex items-center justify-center text-[10px] font-bold">2</span>
                  <div>
                    <p className="text-xs text-[var(--color-text)]">Generate new token (classic) with <code className="bg-[var(--color-bg)] px-1.5 py-0.5 rounded text-[var(--color-amber)]">repo</code> scope</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-steel)]/15 text-[var(--color-steel)] flex items-center justify-center text-[10px] font-bold">3</span>
                  <div>
                    <p className="text-xs text-[var(--color-text)]">Edit <code className="bg-[var(--color-bg)] px-1.5 py-0.5 rounded text-[var(--color-green)]">ops/.env.local</code> and replace the placeholder:</p>
                    <code className="block mt-1.5 bg-[var(--color-bg)] px-3 py-2 rounded text-[10px] text-[var(--color-amber)]">GITHUB_TOKEN=ghp_your_real_token_here</code>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-steel)]/15 text-[var(--color-steel)] flex items-center justify-center text-[10px] font-bold">4</span>
                  <div>
                    <p className="text-xs text-[var(--color-text)]">Restart the app and hit Refresh</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--color-red)]">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Run Scan", desc: `${statusData.suggestions?.highPending || 0} high pending`, icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", color: "#22c55e", href: "/relationships" },
          { label: "Check URLs", desc: "Triage broken links", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9", color: "#5b8dce", href: "/urls" },
          { label: "Enrich Profiles", desc: "Run pipelines", icon: "M13 10V3L4 14h7v7l9-11h-7z", color: "#f59e0b", href: "/pipelines" },
          {
            label: "View Alerts",
            desc: (() => {
              const c = statusData.alerts?.critical ?? 0
              const w = statusData.alerts?.warning ?? 0
              if (c === 0 && w === 0) return "all clear"
              if (c === 0) return `${w} warning`
              return `${c} critical${w > 0 ? `, ${w} warning` : ""}`
            })(),
            icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
            color: "#ef4444",
            href: "/alerts",
          },
        ].map(qa => (
          <button key={qa.label} onClick={() => router.push(qa.href)}
            className="flex items-center gap-3 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:border-opacity-50 transition-all text-left group"
            style={{ borderLeftWidth: 3, borderLeftColor: qa.color }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: `${qa.color}15` }}>
              <svg width={16} height={16} fill="none" stroke={qa.color} viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={qa.icon} />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-steel)]">{qa.label}</p>
              <p className="text-[8px] text-[var(--color-text-dim)]">{qa.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ─── ATTENTION QUEUE — most prominent card on the dashboard ─── */}
      {/* This is the "start here each morning" card. Every automation
          script contributes to the queue; David works top-to-bottom and
          closes the day. Reads /api/attention-queue. */}
      {attention && (
        <Link
          href="/attention"
          className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 mb-6 hover:border-[var(--color-text-dim)] transition-colors"
          style={{ borderLeftWidth: 4, borderLeftColor: attention.blocking > 0 ? "var(--color-red)" : attention.deciding > 0 ? "var(--color-amber)" : "var(--color-green)" }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-dim)]">🎯 Attention Queue</h3>
              <p className="text-[9px] text-[var(--color-text-dim)] mt-0.5">Everything the automation scripts surfaced, ranked by leverage per minute. Start at the top.</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--color-text)]">{attention.total}</div>
              <div className="text-[8px] text-[var(--color-text-dim)]">total items</div>
            </div>
          </div>

          {/* Bucket breakdown */}
          <div className="flex items-center gap-4 mb-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-red)" }} />
              <span className="text-[var(--color-text-dim)]">Blocking:</span>
              <span className="font-bold text-[var(--color-red)]">{attention.blocking}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-amber)" }} />
              <span className="text-[var(--color-text-dim)]">Deciding:</span>
              <span className="font-bold text-[var(--color-amber)]">{attention.deciding}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-green)" }} />
              <span className="text-[var(--color-text-dim)]">Cleanup:</span>
              <span className="font-bold text-[var(--color-green)]">{attention.compounding}</span>
            </span>
          </div>

          {/* Top 3 items preview */}
          {attention.top3.length > 0 && (
            <div className="space-y-1 pt-3 border-t border-[var(--color-border)]">
              <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1">Top 3 right now</div>
              {attention.top3.map((t, i) => {
                const bucketColor =
                  t.bucket === "blocking"
                    ? "var(--color-red)"
                    : t.bucket === "deciding"
                    ? "var(--color-amber)"
                    : "var(--color-green)"
                return (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="w-3 text-[var(--color-text-dim)]">{i + 1}.</span>
                    <span className="flex-1 text-[var(--color-text)] truncate">{t.what}</span>
                    <span className="text-[9px]" style={{ color: bucketColor }}>{"★".repeat(t.leverage)}</span>
                    <span className="text-[9px] text-[var(--color-text-dim)]">~{t.cost_min}m</span>
                  </div>
                )
              })}
            </div>
          )}

          {attention.total === 0 && (
            <div className="text-[10px] text-[var(--color-text-dim)]">
              Queue is empty. Run <code className="text-[var(--color-steel)]">node scripts/voice-drift-detector.cjs</code> etc. to populate.
            </div>
          )}
        </Link>
      )}

      {/* Vault Health + Pipeline Status + Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Vault Health */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Vault Health</h3>
          {stats ? (() => {
            const total = profiles.length || 1
            const verified = profiles.filter(p => p.contentReadiness === "verified" || p.contentReadiness === "ready" || p.contentReadiness === "s-tier").length
            const draft = profiles.filter(p => p.contentReadiness === "draft" || p.contentReadiness === "developed").length
            const raw = profiles.filter(p => p.contentReadiness === "raw" || !p.contentReadiness).length
            const healthPct = Math.round(((verified * 3 + draft * 1.5) / (total * 3)) * 100)
            const color = healthPct > 60 ? "#22c55e" : healthPct > 30 ? "#f59e0b" : "#ef4444"
            return (
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${healthPct}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold" style={{ color }}>{healthPct}%</span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#22c55e]">Verified/Ready</span>
                      <span className="font-bold text-[var(--color-text)]">{verified}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#f59e0b]">Draft/Developed</span>
                      <span className="font-bold text-[var(--color-text)]">{draft}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#ef4444]">Raw/Missing</span>
                      <span className="font-bold text-[var(--color-text)]">{raw}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[8px] text-[var(--color-text-dim)]">{total} total profiles</div>
              </div>
            )
          })() : <div className="animate-pulse h-16 bg-[var(--color-bg)] rounded" />}
        </div>

        {/* Charts */}
        <ContentBreakdown profiles={profiles} />
        <TypeBreakdown stats={stats} />
      </div>

      {/* ─── S-TIER INSIGHTS — added 2026-04-11 ─────────────────── */}
      {/* These cards surface the new janitor-stamped fields
          (audit-a-plus-passed, cross-vault-triangulation-count,
          anomaly-flags, both-sides-flag) so David doesn't need to
          hunt through profiles to see queue state.
          IMPORTANT: parseProfile() in vault.ts maps hyphenated YAML
          fields to camelCase Profile fields (audit-a-plus-passed →
          auditAPlusPassed). Access via the camelCase names, not the
          original YAML keys. */}
      {(() => {
        type RawProfile = Profile & {
          auditAPlusPassed?: string
          anomalyFlags?: string[]
          crossVaultTriangulationCount?: number
          bothSidesFlag?: boolean
          angle?: string
          originalFinding?: string
          exclusiveConnections?: string[]
        }
        const rp = profiles as RawProfile[]
        const signoffQueue = rp.filter(p => !!p.auditAPlusPassed && p.lastVerifiedBy !== "editorial")
        const anomalies = rp.filter(p => Array.isArray(p.anomalyFlags) && p.anomalyFlags.length > 0)
        const superConnectors = rp
          .filter(p => (p.crossVaultTriangulationCount || 0) >= 3)
          .sort((a, b) => (b.crossVaultTriangulationCount || 0) - (a.crossVaultTriangulationCount || 0))
          .slice(0, 10)
        const bothSides = rp.filter(p => p.bothSidesFlag === true)

        // Duplicate bioguide check (cheap) — Profile interface doesn't expose
        // bioguide-id directly, so cast to any Record to read the raw key.
        const bgCounts: Record<string, number> = {}
        for (const p of profiles) {
          const raw = p as unknown as Record<string, unknown>
          const bg = raw["bioguide-id"] || raw.bioguideId
          if (typeof bg === "string" && bg) bgCounts[bg] = (bgCounts[bg] || 0) + 1
        }
        const dupBioguides = Object.values(bgCounts).filter(c => c > 1).length

        // Stale verified (>90 days)
        const stale = rp.filter(p => {
          if (p.contentReadiness !== "verified") return false
          if (!p.lastEnriched) return false
          const days = (Date.now() - new Date(p.lastEnriched).getTime()) / 86400000
          return days > 90
        })

        return (
          <div className="mb-6">
            <h2 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">
              S-Tier Insights
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Sign-off queue — highest priority */}
              <Link
                href="/signoff-queue"
                className="bg-[var(--color-bg-card)] border border-[var(--color-amber)]/40 rounded p-3 hover:border-[var(--color-amber)] transition-colors block"
              >
                <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Ready for sign-off
                </div>
                <div className="text-xl font-bold mt-1 text-[var(--color-amber)]">
                  {signoffQueue.length}
                </div>
                <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                  Click to review →
                </div>
              </Link>

              {/* Super-connectors (triangulation) */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-3">
                <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Super-connectors
                </div>
                <div className="text-xl font-bold mt-1 text-[var(--color-purple)]">
                  {superConnectors.length}
                </div>
                <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                  3+ triangulations
                </div>
              </div>

              {/* Anomaly flags */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-3">
                <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Anomaly flags
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: anomalies.length > 0 ? "var(--color-amber)" : "var(--color-text-dim)" }}>
                  {anomalies.length}
                </div>
                <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                  Cohort outliers
                </div>
              </div>

              {/* Both-sides conflicts */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-3">
                <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Both-sides conflicts
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: bothSides.length > 0 ? "var(--color-red)" : "var(--color-text-dim)" }}>
                  {bothSides.length}
                </div>
                <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                  Same entity in donors + opposes
                </div>
              </div>

              {/* Contamination sentinel — must always be 0 */}
              <div
                className="bg-[var(--color-bg-card)] rounded p-3 border"
                style={{ borderColor: dupBioguides > 0 ? "var(--color-red)" : "var(--color-border)" }}
              >
                <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Duplicate bioguides
                </div>
                <div
                  className="text-xl font-bold mt-1"
                  style={{ color: dupBioguides > 0 ? "var(--color-red)" : "var(--color-green)" }}
                >
                  {dupBioguides === 0 ? "✓" : dupBioguides}
                </div>
                <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                  {dupBioguides === 0 ? "Clean" : "CONTAMINATION"}
                </div>
              </div>

              {/* Stale A+ */}
              <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-3">
                <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Stale A+
                </div>
                <div className="text-xl font-bold mt-1" style={{ color: stale.length > 0 ? "var(--color-amber)" : "var(--color-text-dim)" }}>
                  {stale.length}
                </div>
                <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                  Enriched &gt; 90 days
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Activity Feed */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Activity Feed</h3>
          <div className="flex gap-1">
            {["all", "git", "suggestion", "url"].map(f => (
              <button key={f} onClick={() => { setActivityFilter(f); loadActivity(f) }}
                className={`text-[7px] px-2 py-0.5 rounded transition-all ${activityFilter === f ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] font-bold" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                {f === "all" ? "All" : f === "git" ? "Git" : f === "suggestion" ? "Suggestions" : "URLs"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-[9px] text-[var(--color-text-dim)] py-4 text-center">No activity yet</p>
          ) : activity.map(item => (
            <div key={item.id} className="flex items-start gap-2.5 py-1.5 px-2 rounded hover:bg-[var(--color-bg-hover)] transition-colors group">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ACTOR_COLORS[item.actor] || "#7a7a86" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold" style={{ color: ACTOR_COLORS[item.actor] || "#7a7a86" }}>{item.actor}</span>
                  <span className="text-[8px] text-[var(--color-text)]">{item.action}</span>
                </div>
                {item.detail && <p className="text-[7px] text-[var(--color-text-dim)] truncate">{item.detail}</p>}
              </div>
              <span className="text-[7px] text-[var(--color-text-dim)] whitespace-nowrap flex-shrink-0">{timeAgo(item.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <StatsBar stats={stats} loading={loading} />

      {/* Vault Grid */}
      <div className="mb-4">
        <h2 className="text-sm font-bold text-[var(--color-text)] mb-3">Vault Profiles</h2>
      </div>
      <VaultGrid
        profiles={profiles}
        loading={loading}
        onSelect={setSelected}
        selectedPath={selected?.path || null}
      />

      {/* Detail Panel */}
      <ProfileDetail profile={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
