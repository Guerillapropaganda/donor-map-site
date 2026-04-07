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
  const [sortBy, setSortBy] = useState<"name" | "readiness" | "updated">("name")

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
            {/* Readiness dot */}
            <div
              className="absolute top-2 right-2 w-2 h-2 rounded-full"
              style={{ backgroundColor: readinessColor(profile.contentReadiness) }}
              title={profile.contentReadiness}
            />

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

            {/* Enrichment indicator */}
            {profile.lastEnriched && (
              <div className="mt-1.5 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
                <span className="text-[8px] text-[var(--color-text-dim)]">Enriched</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
