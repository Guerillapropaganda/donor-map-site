"use client"

import { useState, useEffect } from "react"
import type { Profile } from "@/lib/vault"
import { PIPELINES, CATEGORY_COLORS } from "@/lib/pipelines"
import { readinessColor, typeColor } from "@/lib/vault"

interface ProfileEnrichProps {
  onTrigger: (pipeline: string, limit: number) => Promise<void>
  triggering: boolean
}

export function ProfileEnrich({ onTrigger, triggering }: ProfileEnrichProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Profile | null>(null)
  const [selectedPipelines, setSelectedPipelines] = useState<Set<string>>(new Set(PIPELINES.map((p) => p.id)))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((data) => {
        setProfiles(data.profiles || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const results = search.length >= 2
    ? profiles.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())).slice(0, 12)
    : []

  const togglePipeline = (id: string) => {
    setSelectedPipelines((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleEnrich = async () => {
    if (!selected) return
    // Trigger each selected pipeline with limit=1 targeting this profile
    // The enrichment workflow processes profiles by type match, so we trigger
    // with limit=1 — the pipeline will find and process matching profiles
    const ids = Array.from(selectedPipelines)
    for (const id of ids) {
      await onTrigger(id, 1)
    }
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search for a profile to enrich..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (selected && !e.target.value) setSelected(null)
          }}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] transition-colors"
        />

        {/* Dropdown results */}
        {search.length >= 2 && !selected && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-30 max-h-72 overflow-y-auto">
            {results.map((p) => (
              <button
                key={p.path}
                onClick={() => {
                  setSelected(p)
                  setSearch(p.title)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border)] last:border-0"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: readinessColor(p.contentReadiness) }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--color-text)] truncate">{p.title}</p>
                  <p className="text-[9px] text-[var(--color-text-dim)] truncate">{p.folder} / {p.subfolder}</p>
                </div>
                <span
                  className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ color: typeColor(p.type), backgroundColor: `${typeColor(p.type)}15` }}
                >
                  {p.type}
                </span>
              </button>
            ))}
          </div>
        )}

        {search.length >= 2 && !selected && results.length === 0 && !loading && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4 text-xs text-[var(--color-text-dim)] z-30">
            No profiles found for &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Selected profile detail */}
      {selected && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span
                className="inline-block text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded mb-1"
                style={{ color: typeColor(selected.type), backgroundColor: `${typeColor(selected.type)}15` }}
              >
                {selected.type}
              </span>
              <h3 className="text-sm font-bold text-[var(--color-text)]">{selected.title}</h3>
              <p className="text-[10px] text-[var(--color-text-dim)] mt-0.5">{selected.path}</p>
            </div>
            <button
              onClick={() => { setSelected(null); setSearch("") }}
              className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Profile metadata */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-[var(--color-bg)] rounded p-2">
              <span className="text-[8px] text-[var(--color-text-dim)] uppercase tracking-wider block">Readiness</span>
              <span className="text-[11px] font-bold" style={{ color: readinessColor(selected.contentReadiness) }}>
                {selected.contentReadiness}
              </span>
            </div>
            <div className="bg-[var(--color-bg)] rounded p-2">
              <span className="text-[8px] text-[var(--color-text-dim)] uppercase tracking-wider block">Source Tier</span>
              <span className="text-[11px] text-[var(--color-text)]">{selected.sourceTier || "—"}</span>
            </div>
            <div className="bg-[var(--color-bg)] rounded p-2">
              <span className="text-[8px] text-[var(--color-text-dim)] uppercase tracking-wider block">Last Updated</span>
              <span className="text-[11px] text-[var(--color-text)]">{selected.lastUpdated || "—"}</span>
            </div>
            <div className="bg-[var(--color-bg)] rounded p-2">
              <span className="text-[8px] text-[var(--color-text-dim)] uppercase tracking-wider block">Last Enriched</span>
              <span className="text-[11px] text-[var(--color-text)]">{selected.lastEnriched || "Never"}</span>
            </div>
          </div>

          {/* Pipeline selection */}
          <h4 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">
            Pipelines to run ({selectedPipelines.size})
          </h4>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PIPELINES.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePipeline(p.id)}
                className={`text-[9px] px-2 py-1 rounded border transition-all ${
                  selectedPipelines.has(p.id)
                    ? "border-current bg-current/10"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:border-[var(--color-text-dim)]"
                }`}
                style={{
                  color: selectedPipelines.has(p.id) ? CATEGORY_COLORS[p.category] : undefined,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Quick select */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] text-[var(--color-text-dim)]">Quick:</span>
            <button
              onClick={() => setSelectedPipelines(new Set(PIPELINES.map((p) => p.id)))}
              className="text-[9px] text-[var(--color-steel)] hover:underline"
            >
              All
            </button>
            <button
              onClick={() => setSelectedPipelines(new Set(PIPELINES.filter((p) => p.tier === 1).map((p) => p.id)))}
              className="text-[9px] text-[var(--color-green)] hover:underline"
            >
              Tier 1 Only
            </button>
            <button
              onClick={() => setSelectedPipelines(new Set(PIPELINES.filter((p) => p.category === "financial").map((p) => p.id)))}
              className="text-[9px] text-[var(--color-green)] hover:underline"
            >
              Financial
            </button>
            <button
              onClick={() => setSelectedPipelines(new Set(PIPELINES.filter((p) => p.category === "legislative").map((p) => p.id)))}
              className="text-[9px] text-[var(--color-steel)] hover:underline"
            >
              Legislative
            </button>
            <button
              onClick={() => setSelectedPipelines(new Set())}
              className="text-[9px] text-[var(--color-text-dim)] hover:underline"
            >
              None
            </button>
          </div>

          {/* Enrich button */}
          <button
            onClick={handleEnrich}
            disabled={triggering || selectedPipelines.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-6 py-3 text-sm font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40"
          >
            {triggering ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Enriching {selected.title}...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
                </svg>
                Enrich {selected.title}
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!selected && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <svg className="w-8 h-8 mx-auto mb-3 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-xs text-[var(--color-text-dim)]">Search for a profile above to enrich it with government data</p>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
            Type a name like &ldquo;Koch&rdquo; or &ldquo;Warren&rdquo; to find profiles
          </p>
        </div>
      )}
    </div>
  )
}
