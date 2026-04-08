"use client"

import { useState } from "react"

interface SourceResult {
  source: string
  tier: number
  title: string
  description: string
  url: string
  category: string
}

const SOURCE_COLORS: Record<string, string> = {
  FEC: "#22c55e",
  "Congress.gov": "#5b8dce",
  USASpending: "#f59e0b",
  "Federal Register": "#a855f7",
  GovTrack: "#06b6d4",
  "SEC EDGAR": "#ef4444",
  "Senate LDA": "#10b981",
  "SAM.gov": "#f97316",
  CourtListener: "#8b5cf6",
  FARA: "#ec4899",
  "DOJ Press": "#dc2626",
  "ProPublica Nonprofits": "#64748b",
  OSHA: "#eab308",
  OpenSanctions: "#f43f5e",
  LobbyView: "#14b8a6",
}

const CATEGORY_ICONS: Record<string, string> = {
  "Campaign Finance": "$",
  Legislative: "L",
  "Federal Spending": "S",
  Regulatory: "R",
  "Corporate Filings": "C",
  Lobbying: "K",
  "Federal Contracts": "G",
  Judicial: "J",
  "Foreign Lobbying": "F",
  "Nonprofit Filings": "N",
  "Workplace Safety": "W",
  "Sanctions/PEP": "X",
}

export default function SourceHunterPage() {
  const [query, setQuery] = useState("")
  const [type, setType] = useState<"all" | "politician" | "donor">("all")
  const [results, setResults] = useState<SourceResult[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearched(true)
    setResults([])
    setErrors([])

    try {
      const res = await fetch(`/api/sources?q=${encodeURIComponent(query)}&type=${type}`)
      const data = await res.json()
      setResults(data.results || [])
      setErrors(data.errors || [])
    } catch (e) {
      setErrors(["Failed to search"])
    } finally {
      setSearching(false)
    }
  }

  const copyAsSource = (result: SourceResult) => {
    const citation = `[${result.source}: ${result.title}](${result.url}) (Tier ${result.tier})`
    navigator.clipboard.writeText(citation)
    setCopied(result.url)
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAllSources = () => {
    const citations = results.map(
      (r) => `- [${r.source}: ${r.title}](${r.url}) (Tier ${r.tier})`
    ).join("\n")
    navigator.clipboard.writeText(citations)
    setCopied("all")
    setTimeout(() => setCopied(null), 2000)
  }

  // Group results by source
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.source]) acc[r.source] = []
    acc[r.source].push(r)
    return acc
  }, {} as Record<string, SourceResult[]>)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Source Hunter</h1>
        <p className="text-[10px] text-[var(--color-text-dim)]">
          Search government databases for Tier 1 sources on any entity
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder='Search any name — "Koch Industries", "Elizabeth Warren", "Lockheed Martin"...'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] transition-colors"
          />
        </div>

        {/* Type filter */}
        <div className="flex gap-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1">
          {([["all", "All"], ["politician", "Politicians"], ["donor", "Donors/Corps"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setType(val)}
              className={`px-3 py-2 rounded text-xs transition-all ${
                type === val
                  ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={search}
          disabled={searching || !query.trim()}
          className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-6 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40"
        >
          {searching ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Hunting...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Hunt
            </>
          )}
        </button>
      </div>

      {/* API status chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(SOURCE_COLORS).map(([name, color]) => {
          const hasResults = grouped[name]?.length > 0
          const hasError = errors.some((e) => e.startsWith(name))
          return (
            <div
              key={name}
              className="flex items-center gap-1.5 text-[9px] px-2 py-1 rounded border"
              style={{
                borderColor: searched ? (hasResults ? color : hasError ? "var(--color-red)" : "var(--color-border)") : "var(--color-border)",
                color: searched ? (hasResults ? color : hasError ? "var(--color-red)" : "var(--color-text-dim)") : "var(--color-text-dim)",
                backgroundColor: hasResults ? `${color}08` : "transparent",
              }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                !searched ? "bg-[var(--color-text-dim)]" :
                hasResults ? "bg-current" :
                hasError ? "bg-[var(--color-red)]" :
                searching ? "bg-[var(--color-amber)] animate-pulse" :
                "bg-[var(--color-text-dim)]"
              }`} />
              {name}
              {hasResults && <span className="font-bold">{grouped[name].length}</span>}
            </div>
          )
        })}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 text-[10px] text-[var(--color-text-dim)]">
          {errors.map((e, i) => (
            <span key={i} className="mr-3">{e}</span>
          ))}
        </div>
      )}

      {/* Results */}
      {searching ? (
        <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">
          Searching FEC, Congress.gov, USASpending, Federal Register, GovTrack, SEC EDGAR...
        </div>
      ) : results.length > 0 ? (
        <div>
          {/* Copy all button */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider">
              {results.length} sources found
            </span>
            <button
              onClick={copyAllSources}
              className="text-[10px] text-[var(--color-steel)] hover:underline"
            >
              {copied === "all" ? "Copied!" : "Copy All as Citations"}
            </button>
          </div>

          {/* Grouped results */}
          {Object.entries(grouped).map(([source, items]) => (
            <div key={source} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SOURCE_COLORS[source] || "#7a7a86" }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: SOURCE_COLORS[source] || "#7a7a86" }}>
                  {source}
                </span>
                <span className="text-[9px] text-[var(--color-text-dim)]">Tier {items[0]?.tier}</span>
              </div>

              <div className="space-y-1.5">
                {items.map((r, i) => (
                  <div
                    key={i}
                    className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 hover:border-[var(--color-steel)]/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          backgroundColor: `${SOURCE_COLORS[source] || "#7a7a86"}15`,
                          color: SOURCE_COLORS[source] || "#7a7a86",
                        }}
                      >
                        {CATEGORY_ICONS[r.category] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-[var(--color-text)] mb-0.5">{r.title}</p>
                        <p className="text-[9px] text-[var(--color-text-dim)] mb-1">{r.description}</p>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--color-steel)] hover:underline truncate block">{r.url}</a>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                          Open
                        </a>
                        <button
                          onClick={() => copyAsSource(r)}
                          className="text-[8px] px-2 py-1 rounded border border-[var(--color-green)]/30 text-[var(--color-green)] hover:bg-[var(--color-green)]/10 transition-colors"
                        >
                          {copied === r.url ? "Copied!" : "Copy Citation"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : searched && !searching ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <p className="text-xs text-[var(--color-text-dim)]">No results found for &ldquo;{query}&rdquo;</p>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
            Try a different spelling or search for the full entity name
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-xs text-[var(--color-text-dim)]">Search for any person, company, or organization</p>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
            Searches FEC, Congress.gov, USASpending, Federal Register, GovTrack, and SEC EDGAR simultaneously
          </p>
        </div>
      )}
    </div>
  )
}
