"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Profile } from "@/lib/vault"
import { readinessColor, typeColor, profileNeeds } from "@/lib/vault"

interface VaultGridProps {
  profiles: Profile[]
  loading: boolean
  onSelect: (profile: Profile) => void
  selectedPath: string | null
}

// Map a flat vault type value (e.g. "corporation", "senator") to its top-level
// rulebook type (e.g. "entity", "politician"). Populated from /api/rulebook on
// mount so client-side S-Tier eligibility checks don't have to walk the rulebook.
function flatToTopLevel(
  flat: string,
  rulebookTypes: Record<string, { "sub-categories"?: Record<string, unknown> }>,
): string | null {
  if (!flat) return null
  if (rulebookTypes[flat]) return flat
  for (const [topName, topEntry] of Object.entries(rulebookTypes)) {
    const subs = topEntry["sub-categories"] || {}
    if (flat in subs) return topName
  }
  return null
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

// Ordered by tier height. Index used as the sort key — higher index = better.
const READINESS_LABELS = ["raw", "draft", "ready", "verified", "s-tier"]

export function VaultGrid({ profiles, loading, onSelect, selectedPath }: VaultGridProps) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [readinessFilter, setReadinessFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "readiness" | "updated" | "completeness" | "stale" | "nearest-a-plus">("readiness")
  const [letterFilter, setLetterFilter] = useState<string>("all")
  const [sTierEligibleTopLevels, setSTierEligibleTopLevels] = useState<Set<string>>(new Set())
  const [flatToTopLevelMap, setFlatToTopLevelMap] = useState<Record<string, string>>({})
  const gridRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Fetch the rulebook once and derive which TOP-LEVEL types have a non-null
  // s-tier promotion gate. A top-level type is "s-tier eligible" when its
  // base-rulebook.promotion-gate.s-tier is present and not "none". Consumers
  // use this to grey out the S-Tier filter when an ineligible type filter
  // is active, and to omit ineligible profiles from s-tier counts.
  useEffect(() => {
    let cancelled = false
    fetch("/api/rulebook")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const types = (data?.rulebook?.types || {}) as Record<
          string,
          {
            "base-rulebook"?: { "promotion-gate"?: { "s-tier"?: string } }
            "sub-categories"?: Record<string, unknown>
          }
        >
        const eligible = new Set<string>()
        const flatMap: Record<string, string> = {}
        for (const [topName, topEntry] of Object.entries(types)) {
          const gate = topEntry["base-rulebook"]?.["promotion-gate"]?.["s-tier"]
          if (gate && gate !== "none") eligible.add(topName)
          flatMap[topName] = topName
          const subs = topEntry["sub-categories"] || {}
          for (const sub of Object.keys(subs)) {
            flatMap[sub] = topName
          }
        }
        setSTierEligibleTopLevels(eligible)
        setFlatToTopLevelMap(flatMap)
      })
      .catch(() => {
        // Rulebook unreachable — fail open: treat all types as eligible.
        // The filter still works; we just can't grey out ineligible ones.
        setSTierEligibleTopLevels(new Set())
      })
    return () => {
      cancelled = true
    }
  }, [])

  const types = useMemo(() => {
    const t = new Set(profiles.map((p) => p.type))
    return Array.from(t).sort()
  }, [profiles])

  // Compute available letters from current profiles
  const availableLetters = useMemo(() => {
    const letters = new Set<string>()
    profiles.forEach((p) => {
      const first = p.title.charAt(0).toUpperCase()
      if (/[A-Z]/.test(first)) letters.add(first)
      else if (/[0-9]/.test(first)) letters.add("#")
    })
    return letters
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

    if (letterFilter !== "all") {
      if (letterFilter === "#") {
        result = result.filter((p) => /^[0-9]/.test(p.title))
      } else {
        result = result.filter((p) => p.title.charAt(0).toUpperCase() === letterFilter)
      }
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
      if (sortBy === "stale") {
        const aTime = a.lastEnriched ? new Date(a.lastEnriched).getTime() : 0
        const bTime = b.lastEnriched ? new Date(b.lastEnriched).getTime() : 0
        return aTime - bTime
      }
      if (sortBy === "nearest-a-plus") {
        // Score: higher = closer to A+. Verified at top, then by source types + completeness + enrichment
        const scoreProfile = (p: typeof a) => {
          let s = 0
          if (p.contentReadiness === "s-tier") s += 2000
          if (p.contentReadiness === "verified") s += 1000
          if (p.contentReadiness === "ready") s += 500
          if (p.contentReadiness === "draft") s += 100
          s += (p.sourceTypes || []).length * 50
          s += (p.completeness || 0) * 2
          if (p.lastEnriched) s += 100
          if (p.related || p.donors) s += 50
          if (p.lastVerifiedBy) s += 200
          return s
        }
        return scoreProfile(b) - scoreProfile(a)
      }
      return 0
    })

    return result
  }, [profiles, search, typeFilter, readinessFilter, sortBy, letterFilter])

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

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "readiness" | "updated" | "completeness" | "stale" | "nearest-a-plus")}
          className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
        >
          <option value="name">Sort: Name</option>
          <option value="nearest-a-plus">Sort: Nearest to A+</option>
          <option value="readiness">Sort: Readiness</option>
          <option value="updated">Sort: Last Updated</option>
          <option value="completeness">Sort: Completeness</option>
          <option value="stale">Sort: Most Stale</option>
        </select>
      </div>

      {/* Readiness Scroller */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
        <span className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider flex-shrink-0">Grade:</span>
        {[
          { value: "all", label: "All", grade: "", color: "#7a7a86" },
          { value: "s-tier", label: "S-Tier", grade: "S", color: "#a78bfa" },
          { value: "verified", label: "Verified", grade: "A+", color: "#fbbf24" },
          { value: "ready", label: "Ready", grade: "B", color: "#10b981" },
          { value: "draft", label: "Draft", grade: "C", color: "#f59e0b" },
          { value: "raw", label: "Raw", grade: "D-F", color: "#6b7280" },
        ].map((r) => {
          // Count only profiles that match this tier AND, for s-tier, only
          // types that are actually s-tier eligible per the rulebook.
          let count: number
          if (r.value === "all") {
            count = profiles.length
          } else if (r.value === "s-tier" && sTierEligibleTopLevels.size > 0) {
            count = profiles.filter((p) => {
              if (p.contentReadiness !== "s-tier") return false
              const topLevel = flatToTopLevelMap[p.type] || p.type
              return sTierEligibleTopLevels.has(topLevel)
            }).length
          } else {
            count = profiles.filter((p) => p.contentReadiness === r.value).length
          }
          const isActive = readinessFilter === r.value
          // Grey out S-Tier when a type filter is active AND that type is
          // not s-tier eligible. Clicking it still works (shows zero), but
          // the visual hint is there.
          let disabledBySTierRule = false
          if (
            r.value === "s-tier" &&
            typeFilter !== "all" &&
            sTierEligibleTopLevels.size > 0
          ) {
            const topLevel = flatToTopLevelMap[typeFilter] || typeFilter
            if (!sTierEligibleTopLevels.has(topLevel)) disabledBySTierRule = true
          }
          return (
            <button
              key={r.value}
              onClick={() => setReadinessFilter(r.value)}
              title={disabledBySTierRule ? `${typeFilter} is not S-Tier eligible per the rulebook` : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                isActive ? "" : "opacity-70 hover:opacity-100"
              } ${disabledBySTierRule ? "opacity-30 hover:opacity-40" : ""}`}
              style={{
                color: r.color,
                backgroundColor: isActive ? `${r.color}20` : `${r.color}08`,
                border: `1px solid ${isActive ? `${r.color}50` : "transparent"}`,
              }}
            >
              {r.grade && <span className="text-[8px]">{r.grade}</span>}
              <span>{r.label}</span>
              <span className="text-[8px] opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* A-Z Navigation Bar */}
      <div className="flex flex-wrap items-center gap-0.5 mb-3">
        <button
          onClick={() => setLetterFilter("all")}
          className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
            letterFilter === "all"
              ? "bg-[var(--color-steel)] text-white"
              : "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => setLetterFilter("#")}
          className={`px-1.5 py-1 text-[10px] font-bold rounded transition-colors ${
            letterFilter === "#"
              ? "bg-[var(--color-steel)] text-white"
              : availableLetters.has("#")
                ? "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
                : "text-[var(--color-text-dim)]/30 cursor-default"
          }`}
          disabled={!availableLetters.has("#")}
        >
          #
        </button>
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <button
            key={letter}
            onClick={() => setLetterFilter(letter)}
            disabled={!availableLetters.has(letter)}
            className={`px-1.5 py-1 text-[10px] font-bold rounded transition-colors ${
              letterFilter === letter
                ? "bg-[var(--color-steel)] text-white"
                : availableLetters.has(letter)
                  ? "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
                  : "text-[var(--color-text-dim)]/30 cursor-default"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[9px]">
        <span className="text-[var(--color-text-dim)] uppercase tracking-wider font-bold">Legend:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#a78bfa", boxShadow:"0 0 4px rgba(167,139,250,0.5)"}} />S Original Investigation</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#fbbf24", boxShadow:"0 0 4px rgba(251,191,36,0.5)"}} />A+ Verified</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#10b981"}} />B Ready</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#f59e0b"}} />C Draft</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:"#6b7280"}} />D-F Raw</span>
        <span className="text-[var(--color-text-dim)]">|</span>
        <span className="flex items-center gap-1">
          <span className="relative w-4 h-4"><svg className="w-4 h-4 -rotate-90" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-border)" strokeWidth="2" /><circle cx="12" cy="12" r="10" fill="none" stroke="#5b8dce" strokeWidth="2" strokeDasharray="31.4 62.83" /></svg></span>
          Completeness %
        </span>
        <span className="text-[var(--color-text-dim)]">|</span>
        <span className="text-[var(--color-red)]">Red text</span><span className="text-[var(--color-text-dim)]">= action needed</span>
        <span className="text-[var(--color-steel)]">Blue text</span><span className="text-[var(--color-text-dim)]">= close to A+</span>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-3">
        {filtered.length.toLocaleString()} profiles
        {letterFilter !== "all" && ` starting with "${letterFilter}"`}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
        {filtered.map((profile) => (
          <button
            key={profile.path}
            onClick={() => onSelect(profile)}
            onDoubleClick={() => router.push(`/profile?path=${encodeURIComponent(profile.path)}`)}
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

            {/* What's needed */}
            {(() => {
              const need = profileNeeds(profile)
              if (need === "Up to date") return null
              const needColor = need.startsWith("Stale") || need.startsWith("Never") ? "var(--color-red)" :
                need.includes("Tier 1") ? "var(--color-amber)" :
                need.includes("raw") ? "var(--color-text-dim)" : "var(--color-steel)"
              return (
                <p className="mt-1.5 text-[8px] leading-tight" style={{ color: needColor }}>
                  {need}
                </p>
              )
            })()}

            {/* Readiness progress bar */}
            <div className="mt-2 w-full h-1 rounded-full bg-[var(--color-bg)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  backgroundColor: readinessColor(profile.contentReadiness),
                  width: `${({ raw: 10, draft: 30, ready: 55, verified: 80, "s-tier": 100 }[profile.contentReadiness] || 10)}%`,
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
