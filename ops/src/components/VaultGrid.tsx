"use client"

import { useState, useMemo } from "react"
import type { Profile } from "@/lib/vault"
import { readinessColor, typeColor } from "@/lib/vault"

interface VaultGridProps {
  profiles: Profile[]
  loading: boolean
  onSelect: (profile: Profile) => void
  selectedPath: string | null
}

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

const READINESS_LABELS = ["raw", "draft", "developed", "verified", "ready"]

export function VaultGrid({ profiles, loading, onSelect, selectedPath }: VaultGridProps) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [readinessFilter, setReadinessFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "readiness" | "updated" | "completeness">("name")

  const types = useMemo(() => {
    const t = new Set(profiles.map((p) => p.type))
    return Array.from(t).sort()
  }, [profiles])

  const filtered = useMemo(() => {
    let result = profiles

    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
    }

    if (typeFilter !== "all") {
      result = result.filter((p) => p.type === typeFilter)
    }

    if (readinessFilter !== "all") {
      result = result.filter((p) => p.contentReadiness === readinessFilter)
    }

    result.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title)
      if (sortBy === "readiness") {
        return READINESS_LABELS.indexOf(b.contentReadiness) - READINESS_LABELS.indexOf(a.contentReadiness)
      }
      if (sortBy === "updated") {
        return (b.lastUpdated || "").localeCompare(a.lastUpdated || "")
      }
      if (sortBy === "completeness") {
        return (b.completeness || 0) - (a.completeness || 0)
      }
      return 0
    })

    return result
  }, [profiles, search, typeFilter, readinessFilter, sortBy])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[var(--color-text-dim)] text-sm animate-pulse-glow">
          Loading vault from GitHub...
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] hover:text-[var(--color-text)] text-xs"
            >
              Clear
            </button>
          )}
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
        >
          <option value="all">All Types</option>
          {types.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
          ))}
        </select>

        {/* Readiness filter */}
        <select
          value={readinessFilter}
          onChange={(e) => setReadinessFilter(e.target.value)}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
        >
          <option value="all">All Readiness</option>
          {READINESS_LABELS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "readiness" | "updated")}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
        >
          <option value="name">Sort: Name</option>
          <option value="readiness">Sort: Readiness</option>
          <option value="updated">Sort: Last Updated</option>
          <option value="completeness">Sort: Completeness</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-3">
        {filtered.length.toLocaleString()} profiles
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
        {filtered.map((profile) => (
          <button
            key={profile.path}
            onClick={() => onSelect(profile)}
            className={`group relative bg-[var(--color-bg-card)] border rounded-lg p-3 text-left transition-all hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-steel)]/50 ${
              selectedPath === profile.path
                ? "border-[var(--color-steel)] ring-1 ring-[var(--color-steel)]/30"
                : "border-[var(--color-border)]"
            }`}
          >
            {/* Completeness ring + readiness badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              {profile.completeness !== undefined && (
                <div className="relative w-6 h-6" title={`${profile.completeness}% complete`}>
                  <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-border)" strokeWidth="2" />
                    <circle cx="12" cy="12" r="10" fill="none"
                      stroke={profile.completeness >= 80 ? "#22c55e" : profile.completeness >= 50 ? "#5b8dce" : profile.completeness >= 25 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="2" strokeLinecap="round"
                      strokeDasharray={`${(profile.completeness / 100) * 62.83} 62.83`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[6px] font-bold text-[var(--color-text-dim)]">
                    {profile.completeness}
                  </span>
                </div>
              )}
              <span
                className="text-[7px] uppercase font-bold px-1.5 py-0.5 rounded"
                style={{
                  color: readinessColor(profile.contentReadiness),
                  backgroundColor: `${readinessColor(profile.contentReadiness)}15`,
                  border: `1px solid ${readinessColor(profile.contentReadiness)}30`,
                }}
              >
                {profile.contentReadiness}
              </span>
            </div>

            {/* Type badge */}
            <span
              className="inline-block text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5"
              style={{
                color: typeColor(profile.type),
                backgroundColor: `${typeColor(profile.type)}15`,
              }}
            >
              {profile.type}
            </span>

            {/* Title */}
            <p className="text-[11px] font-bold text-[var(--color-text)] leading-tight line-clamp-2 mb-1">
              {profile.title}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-1 flex-wrap">
              {profile.party && (
                <span className={`text-[8px] px-1 rounded ${
                  profile.party === "Democrat" ? "bg-blue-500/20 text-blue-400" :
                  profile.party === "Republican" ? "bg-red-500/20 text-red-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>
                  {profile.party === "Democrat" ? "D" : profile.party === "Republican" ? "R" : "I"}
                </span>
              )}
              {profile.state && (
                <span className="text-[8px] text-[var(--color-text-dim)]">{profile.state}</span>
              )}
              {profile.sector && (
                <span className="text-[8px] text-[var(--color-text-dim)] truncate max-w-[80px]">{profile.sector}</span>
              )}
            </div>

            {/* Readiness progress bar */}
            <div className="mt-2 w-full h-1 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  backgroundColor: readinessColor(profile.contentReadiness),
                  width: `${({ raw: 10, draft: 30, developed: 55, verified: 80, ready: 100 }[profile.contentReadiness] || 10)}%`,
                }}
              />
            </div>

            {/* Enrichment + source tier indicators */}
            <div className="mt-1.5 flex items-center gap-1.5">
              {profile.lastEnriched && (
                <span className="text-[7px] px-1 py-0.5 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">Enriched</span>
              )}
              {profile.sourceTier && (
                <span className="text-[7px] px-1 py-0.5 rounded bg-[var(--color-steel)]/10 text-[var(--color-steel)]">Tier {profile.sourceTier}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
