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
import { PipelineHealth } from "@/components/PipelineHealth"

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

  const [activityError, setActivityError] = useState(false)
  const [statusError, setStatusError] = useState(false)

  const loadActivity = async (type = "all") => {
    try {
      setActivityError(false)
      const res = await fetch(`/api/activity?limit=15&type=${type}`)
      const data = await res.json()
      setActivity(data.items || [])
    } catch {
      setActivityError(true)
    }
  }

  const loadStatus = async () => {
    try {
      setStatusError(false)
      const res = await fetch("/api/status")
      if (res.ok) setStatusData(await res.json())
      else setStatusError(true)
    } catch {
      setStatusError(true)
    }
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

  // Vault-audit harness — single source of truth for "Quality Signals" cards.
  // Reads the artifact from /api/vault-audit (returns the latest run JSON with
  // age_minutes). If the artifact is >15 min old, we auto-POST to re-run the
  // harness so numbers are never stale-forever even if the dispatcher is dead.
  type HarnessCheck = {
    name: string
    description: string
    exit: number
    duration_ms: number
    timed_out: boolean
    findings_count: number
    notes: string
    stdout_tail?: string
  }
  type HarnessArtifact = {
    generated_at: string
    age_minutes: number
    duration_ms: number
    checks: HarnessCheck[]
    error?: string
  }
  const STALE_MINUTES = 15
  const [harness, setHarness] = useState<HarnessArtifact | null>(null)
  const [harnessRunning, setHarnessRunning] = useState(false)
  const [harnessError, setHarnessError] = useState<string | null>(null)

  // Dev-server restart — addresses P-038 (hot-reload can't pick up
  // state-hook additions). Clicking the button POSTs to /api/ops-restart
  // which calls process.exit(0); scripts/ops-dev-loop.bat respawns.
  // The overlay polls /api/ops-restart (GET) until the server is back
  // with a new PID, then hard-reloads the page so fresh code mounts.
  const [restarting, setRestarting] = useState(false)
  const [restartStatus, setRestartStatus] = useState("")
  const doRestart = async () => {
    if (restarting) return
    if (!confirm("Restart the ops dev server? The page will auto-reload when it's back up (~5s).")) return
    setRestarting(true)
    setRestartStatus("Asking server to exit…")
    const originalPid: number | null = await (async () => {
      try {
        const r = await fetch("/api/ops-restart")
        if (!r.ok) return null
        const d = await r.json()
        return typeof d.pid === "number" ? d.pid : null
      } catch { return null }
    })()
    try {
      await fetch("/api/ops-restart", { method: "POST" })
    } catch { /* expected — server is dying */ }
    setRestartStatus("Server exited. Waiting for wrapper to respawn…")
    // Poll /api/ops-restart GET until we see a new pid OR uptime < 10s
    // (wrapper re-launched). Give up after ~30s of no response.
    const started = Date.now()
    while (Date.now() - started < 30000) {
      await new Promise((r) => setTimeout(r, 700))
      try {
        const r = await fetch("/api/ops-restart", { cache: "no-store" })
        if (!r.ok) continue
        const d = await r.json()
        const newServer =
          (originalPid !== null && typeof d.pid === "number" && d.pid !== originalPid) ||
          (typeof d.uptime_sec === "number" && d.uptime_sec < 15)
        if (newServer) {
          setRestartStatus("Back up. Reloading page…")
          setTimeout(() => window.location.reload(), 500)
          return
        }
      } catch { /* still dead, keep polling */ }
    }
    setRestartStatus("Timed out after 30s. Check the wrapper terminal.")
  }

  const loadHarness = async (opts: { autoRerun?: boolean } = {}) => {
    try {
      setHarnessError(null)
      const res = await fetch("/api/vault-audit")
      const data = await res.json()
      if (data.error && !data.generated_at) {
        setHarnessError(data.error)
        return
      }
      setHarness(data as HarnessArtifact)
      if (opts.autoRerun && data.age_minutes > STALE_MINUTES && !harnessRunning) {
        void runHarness()
      }
    } catch (e) {
      setHarnessError(e instanceof Error ? e.message : "failed to load harness")
    }
  }

  const runHarness = async () => {
    if (harnessRunning) return
    setHarnessRunning(true)
    setHarnessError(null)
    try {
      const res = await fetch("/api/vault-audit", { method: "POST" })
      const data = await res.json()
      if (data.error && !data.generated_at) {
        setHarnessError(data.error)
      } else {
        setHarness(data as HarnessArtifact)
      }
    } catch (e) {
      setHarnessError(e instanceof Error ? e.message : "failed to re-run harness")
    } finally {
      setHarnessRunning(false)
    }
  }

  useEffect(() => {
    // Parallel fetch — all independent data sources at once
    loadVault()
    Promise.all([loadActivity(), loadStatus(), loadAttention(), loadHarness({ autoRerun: true })])
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
        <div className="flex items-center gap-2">
          {/* Harness freshness chip — the single trust signal for every number
              in the Quality Signals grid below. Green = fresh, amber = stale,
              red = broken. Clicking re-runs the harness server-side. */}
          {(() => {
            const crashed = harness
              ? harness.checks.filter((c) => c.exit !== 0 || c.timed_out).length
              : 0
            const stale =
              harness && harness.age_minutes > STALE_MINUTES && !harnessRunning
            const isError = !!harnessError || (harness && !!harness.error)
            let color = "#22c55e"
            let label = "Harness fresh"
            if (harnessRunning) {
              color = "#5b8dce"
              label = "Running…"
            } else if (isError) {
              color = "#ef4444"
              label = "Harness error"
            } else if (crashed > 0) {
              color = "#ef4444"
              label = `${crashed} check${crashed === 1 ? "" : "s"} crashed`
            } else if (stale) {
              color = "#f59e0b"
              label = "Harness stale"
            } else if (harness) {
              label = `Harness ${harness.age_minutes}m ago`
            } else {
              color = "#7a7a86"
              label = "Harness loading…"
            }
            return (
              <button
                onClick={() => runHarness()}
                disabled={harnessRunning}
                title={
                  isError
                    ? `Error: ${harnessError || harness?.error}`
                    : "Click to re-run the vault-audit harness now"
                }
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] border transition-colors disabled:opacity-50"
                style={{
                  borderColor: `${color}55`,
                  color,
                  backgroundColor: `${color}15`,
                }}
              >
                <span
                  className={`w-2 h-2 rounded-full ${harnessRunning ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: color }}
                />
                {label}
                {!harnessRunning && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            )
          })()}
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
          {/* Restart dev server — needs scripts/ops-dev-loop.bat wrapper */}
          <button
            onClick={() => doRestart()}
            disabled={restarting}
            title="Kills + respawns the Next.js dev server. Requires ops-dev-loop.bat wrapper."
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] border transition-colors disabled:opacity-50"
            style={{
              borderColor: "#f59e0b55",
              color: "#f59e0b",
              backgroundColor: "#f59e0b15",
            }}
          >
            <svg className={`w-3 h-3 ${restarting ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l-4-4m0 0L8 5m4-4v12m5.657 4.657a8 8 0 11-11.314 0" />
            </svg>
            Restart dev
          </button>
        </div>
      </div>

      {/* Restart overlay */}
      {restarting && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-6 max-w-md">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-5 h-5 animate-spin text-[var(--color-amber)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 5l-4-4m0 0L8 5m4-4v12m5.657 4.657a8 8 0 11-11.314 0" />
              </svg>
              <h3 className="text-sm font-bold text-[var(--color-text)]">Restarting dev server</h3>
            </div>
            <p className="text-[11px] text-[var(--color-text-dim)] mb-2">{restartStatus || "Working…"}</p>
            <p className="text-[9px] text-[var(--color-text-dim)]">
              If this hangs for more than 30 seconds, check the terminal running scripts/ops-dev-loop.bat —
              the wrapper may have caught a syntax error and is stuck trying to restart.
            </p>
          </div>
        </div>
      )}

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

      {/* Vault Health + Pipeline Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Vault Health */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          <h3 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Vault Health</h3>
          {stats ? (() => {
            const total = profiles.length || 1
            // ADR-0017 five-tier readiness flow: raw → draft → ready →
            // data-complete → verified. Retired: s-tier, developed.
            // Scoring weights (out of 4): verified=4, data-complete=3,
            // ready=2, draft=1, raw/missing=0. Previously 446 data-complete
            // profiles were invisible because the filter only matched the
            // old three-tier vocabulary.
            const verified = profiles.filter(p => p.contentReadiness === "verified").length
            const dataComplete = profiles.filter(p => p.contentReadiness === "data-complete").length
            const ready = profiles.filter(p => p.contentReadiness === "ready").length
            const draft = profiles.filter(p => p.contentReadiness === "draft").length
            const raw = profiles.filter(p => p.contentReadiness === "raw" || !p.contentReadiness).length
            const healthPct = Math.round(((verified * 4 + dataComplete * 3 + ready * 2 + draft * 1) / (total * 4)) * 100)
            const color = healthPct > 60 ? "#22c55e" : healthPct > 30 ? "#f59e0b" : "#ef4444"
            return (
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#ef4444" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${healthPct}, 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold" style={{ color }}>{healthPct}%</span>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#16a34a]">Verified</span>
                      <span className="font-bold text-[var(--color-text)]">{verified}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#22c55e]">Data-complete</span>
                      <span className="font-bold text-[var(--color-text)]">{dataComplete}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#a3e635]">Ready</span>
                      <span className="font-bold text-[var(--color-text)]">{ready}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#f59e0b]">Draft</span>
                      <span className="font-bold text-[var(--color-text)]">{draft}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-[#ef4444]">Raw/Missing</span>
                      <span className="font-bold text-[var(--color-text)]">{raw}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[8px] text-[var(--color-text-dim)]">{total} total profiles · ADR-0017 five-tier flow</div>
              </div>
            )
          })() : <div className="animate-pulse h-16 bg-[var(--color-bg)] rounded" />}
        </div>

        {/* Pipeline Health */}
        <PipelineHealth />
      </div>

      {/* Content & Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ContentBreakdown profiles={profiles} />
        <TypeBreakdown stats={stats} />
      </div>

      {/* ─── QUALITY SIGNALS — rewired 2026-04-24 ─────────────────── */}
      {/* Every card reads live findings from the 14-check vault-audit harness
          via /api/vault-audit. No per-profile stamps. If the harness hasn't
          run, the freshness chip at the top turns red; if a specific check
          crashed, its card turns red. The grid below never lies by going out
          of sync with reality — it IS reality.
          Replaces the old "S-Tier Insights" block (retired vocab per ADR-0017)
          that read stale janitor-stamped frontmatter fields. */}
      {(() => {
        const byName = (n: string): HarnessCheck | undefined =>
          harness?.checks.find((c) => c.name === n)

        // Pull both-sides count out of pipeline-janitor's stdout_tail.
        // The janitor prints one line per a-plus sub-check; we parse the
        // a-plus-both-sides line specifically so this card shows the real
        // 11 (or whatever) instead of the broken both-sides-flag stamp.
        const bothSidesCount = (() => {
          const pj = byName("pipeline-janitor")
          if (!pj?.stdout_tail) return null
          const m = pj.stdout_tail.match(/a-plus-both-sides\s+(\d+)/)
          return m ? parseInt(m[1], 10) : null
        })()

        // Each card: [label, harness check name OR override count, link, hint].
        // Crashed/timed-out checks render red with an exit-code note.
        type Card = {
          label: string
          checkName?: string
          count?: number | null
          href: string
          hint: string
        }
        const cards: Card[] = [
          {
            label: "Schema violations",
            checkName: "frontmatter-schema",
            href: "/attention",
            hint: "Frontmatter failing ADR-0023",
          },
          {
            label: "A+ bar failures",
            checkName: "type-specific-a-plus",
            href: "/signoff-queue",
            hint: "Per-type quality floor (ADR-0022)",
          },
          {
            label: "Both-sides conflicts",
            count: bothSidesCount,
            href: "/attention",
            hint: "Same entity in donors + opposes",
          },
          {
            label: "URL policy issues",
            checkName: "url-domain-policy",
            href: "/urls",
            hint: "LDA/OpenSecrets/FTM etc.",
          },
          {
            label: "Reconciliation drift",
            checkName: "reconciliation-framework-tier-1",
            href: "/attention",
            hint: "Canonical totals out of tolerance",
          },
          {
            label: "Stamp expiry",
            checkName: "stamp-expiry",
            href: "/attention",
            hint: "A+ stamps on profiles that drifted",
          },
        ]

        return (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                Quality Signals
              </h2>
              <span className="text-[8px] text-[var(--color-text-dim)]">
                Live from the 14-check harness ·{" "}
                {harness ? `${harness.checks.length} checks, ${harness.duration_ms}ms` : "loading…"}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {cards.map((card) => {
                const check = card.checkName ? byName(card.checkName) : undefined
                const crashed =
                  !!check && (check.exit !== 0 || check.timed_out)
                const count = card.checkName
                  ? check
                    ? check.findings_count
                    : null
                  : card.count
                const display =
                  count === null || count === undefined
                    ? "—"
                    : crashed
                    ? "✗"
                    : count.toLocaleString()
                const color = crashed
                  ? "var(--color-red)"
                  : count && count > 0
                  ? "var(--color-amber)"
                  : count === 0
                  ? "var(--color-green)"
                  : "var(--color-text-dim)"
                const borderColor = crashed ? "var(--color-red)" : "var(--color-border)"
                const title = crashed
                  ? `check crashed (exit=${check?.exit}${check?.timed_out ? ", timed out" : ""})`
                  : check?.notes || card.hint
                return (
                  <Link
                    key={card.label}
                    href={card.href}
                    title={title}
                    className="bg-[var(--color-bg-card)] border rounded p-3 hover:border-[var(--color-text-dim)] transition-colors block"
                    style={{ borderColor }}
                  >
                    <div className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">
                      {card.label}
                    </div>
                    <div className="text-xl font-bold mt-1" style={{ color }}>
                      {display}
                    </div>
                    <div className="text-[7px] text-[var(--color-text-dim)] mt-0.5">
                      {crashed ? `exit=${check?.exit}${check?.timed_out ? " · timed out" : ""}` : card.hint}
                    </div>
                  </Link>
                )
              })}
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
