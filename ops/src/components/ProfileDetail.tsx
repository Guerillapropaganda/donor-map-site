"use client"

import { useState, useEffect } from "react"
import type { Profile } from "@/lib/vault"
import { readinessColor, typeColor } from "@/lib/vault"

interface ProfileDetailProps {
  profile: Profile | null
  onClose: () => void
}

interface ProfileData {
  profile: Profile
  sources: { total: number; tier1: number; tier2: number; tier3: number; tier4: number; broken: number }
  urls: { url: string; label: string; tier?: number; archived: boolean }[]
}

export function ProfileDetail({ profile, onClose }: ProfileDetailProps) {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profile) {
      setData(null)
      return
    }

    setLoading(true)
    fetch(`/api/profile?path=${encodeURIComponent(profile.path)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [profile])

  if (!profile) return null

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-[var(--color-bg-card)] border-l border-[var(--color-border)] overflow-y-auto animate-slide-in z-40">
      {/* Header */}
      <div className="sticky top-0 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] p-4 flex items-start justify-between">
        <div>
          <span
            className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5"
            style={{ color: typeColor(profile.type), backgroundColor: `${typeColor(profile.type)}15` }}
          >
            {profile.type}
          </span>
          <h2 className="text-sm font-bold">{profile.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-[var(--color-text-dim)] hover:text-[var(--color-text)] p-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="p-4 text-xs text-[var(--color-text-dim)] animate-pulse-glow">Loading profile data...</div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Readiness Badge */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: readinessColor(profile.contentReadiness) }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: readinessColor(profile.contentReadiness) }}>
              {profile.contentReadiness}
            </span>
            {profile.sourceTier && (
              <span className="ml-auto text-[10px] text-[var(--color-text-dim)] border border-[var(--color-border)] rounded px-2 py-0.5">
                Tier {profile.sourceTier}
              </span>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2">
            {profile.party && <MetaItem label="Party" value={profile.party} />}
            {profile.chamber && <MetaItem label="Chamber" value={profile.chamber} />}
            {profile.state && <MetaItem label="State" value={profile.state} />}
            {profile.sector && <MetaItem label="Sector" value={profile.sector} />}
            {profile.totalRaised && <MetaItem label="Total Raised" value={profile.totalRaised} />}
            {profile.lobbyingSpend && <MetaItem label="Lobbying" value={profile.lobbyingSpend} />}
            {profile.lastUpdated && <MetaItem label="Updated" value={profile.lastUpdated} />}
            {profile.lastEnriched && <MetaItem label="Enriched" value={profile.lastEnriched} />}
          </div>

          {/* Connections */}
          {(profile.related || profile.opposes || profile.donors) && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Connections</h3>
              {profile.related && <ConnectionRow label="Related" value={profile.related} color="var(--color-steel)" />}
              {profile.donors && <ConnectionRow label="Donors" value={profile.donors} color="var(--color-green)" />}
              {profile.opposes && <ConnectionRow label="Opposes" value={profile.opposes} color="var(--color-red)" />}
            </div>
          )}

          {/* Source Stats */}
          {data?.sources && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Sources</h3>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Tier 1" value={data.sources.tier1} color="var(--color-green)" />
                <MiniStat label="Tier 2" value={data.sources.tier2} color="var(--color-steel)" />
                <MiniStat label="Tier 3-4" value={data.sources.tier3 + data.sources.tier4} color="var(--color-amber)" />
              </div>
              {data.sources.broken > 0 && (
                <div className="mt-2 flex items-center gap-2 text-[var(--color-red)] text-xs">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{data.sources.broken} broken/archived</span>
                </div>
              )}
            </div>
          )}

          {/* URLs */}
          {data?.urls && data.urls.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">
                URLs ({data.urls.length})
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {data.urls.map((u, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-[10px] p-1.5 rounded ${
                      u.archived ? "opacity-50 line-through" : ""
                    }`}
                  >
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      u.archived ? "bg-[var(--color-red)]" : "bg-[var(--color-green)]"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-[var(--color-text)] truncate">{u.label}</p>
                      <p className="text-[var(--color-text-dim)] truncate">{u.url}</p>
                    </div>
                    {u.tier && (
                      <span className="ml-auto flex-shrink-0 text-[8px] text-[var(--color-text-dim)]">T{u.tier}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Path */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <p className="text-[9px] text-[var(--color-text-dim)] break-all">{profile.path}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-bg)] rounded p-2">
      <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] block">{label}</span>
      <span className="text-[11px] text-[var(--color-text)]">{value}</span>
    </div>
  )
}

function ConnectionRow({ label, value, color }: { label: string; value: string; color: string }) {
  // Parse wikilinks: [[Name|Alias]] or [[Name]]
  const links = value.match(/\[\[([^\]]+)\]\]/g)?.map((l) => {
    const inner = l.replace("[[", "").replace("]]", "")
    const parts = inner.split("|")
    return parts[parts.length - 1] // Use alias if available
  }) || [value]

  return (
    <div className="flex items-start gap-2 mb-1.5">
      <span className="text-[9px] uppercase tracking-wider w-16 flex-shrink-0 pt-0.5" style={{ color }}>{label}</span>
      <div className="flex flex-wrap gap-1">
        {links.map((l, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-dim)]">
            {l}
          </span>
        ))}
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[var(--color-bg)] rounded p-2 text-center">
      <span className="text-lg font-bold block" style={{ color }}>{value}</span>
      <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">{label}</span>
    </div>
  )
}
