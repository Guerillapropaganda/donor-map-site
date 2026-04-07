"use client"

import { useState, useEffect } from "react"
import type { Profile, VaultStats } from "@/lib/vault"
import { StatsBar } from "@/components/StatsBar"
import { VaultGrid } from "@/components/VaultGrid"
import { ProfileDetail } from "@/components/ProfileDetail"
import { ActivityFeed } from "@/components/ActivityFeed"
import { ReadinessChart } from "@/components/ReadinessChart"
import { TypeBreakdown } from "@/components/TypeBreakdown"

export default function Dashboard() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats, setStats] = useState<VaultStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

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

  useEffect(() => {
    loadVault()
  }, [])

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

      {/* Stats */}
      <StatsBar stats={stats} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ReadinessChart stats={stats} />
        <TypeBreakdown stats={stats} />
        <ActivityFeed />
      </div>

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
