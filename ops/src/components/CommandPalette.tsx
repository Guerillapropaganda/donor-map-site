"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

interface SearchResult {
  title: string
  path: string
  type: string
  contentReadiness: string
  category: "profile" | "page"
  subtitle?: string
}

const PAGES: SearchResult[] = [
  { title: "Dashboard", path: "/", type: "page", contentReadiness: "", category: "page", subtitle: "Home" },
  { title: "Pipelines", path: "/pipelines", type: "page", contentReadiness: "", category: "page", subtitle: "Trigger enrichment" },
  { title: "Notes & Queues", path: "/notes", type: "page", contentReadiness: "", category: "page", subtitle: "Admin notes" },
  { title: "URL Manager", path: "/urls", type: "page", contentReadiness: "", category: "page", subtitle: "Link triage" },
  { title: "Source Hunter", path: "/source-hunter", type: "page", contentReadiness: "", category: "page", subtitle: "Gov API search" },
  { title: "Relationships", path: "/relationships", type: "page", contentReadiness: "", category: "page", subtitle: "Connection mapper" },
  { title: "Editor", path: "/editor", type: "page", contentReadiness: "", category: "page", subtitle: "Profile editor" },
  { title: "Publisher", path: "/publisher", type: "page", contentReadiness: "", category: "page", subtitle: "Create profiles" },
  { title: "Alerts", path: "/alerts", type: "page", contentReadiness: "", category: "page", subtitle: "Stale profiles" },
  { title: "Distribution", path: "/distribution", type: "page", contentReadiness: "", category: "page", subtitle: "Social sharing" },
]

const TYPE_COLORS: Record<string, string> = {
  politician: "#5b8dce",
  donor: "#22c55e",
  corporation: "#22c55e",
  "think-tank": "#a855f7",
  "lobbying-firm": "#f59e0b",
  "media-profile": "#ef4444",
  pac: "#06b6d4",
  story: "#ec4899",
  page: "#7a7a86",
}

const READINESS_COLORS: Record<string, string> = {
  raw: "#6b7280",
  draft: "#f59e0b",
  ready: "#10b981",
  verified: "#fbbf24",
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [profiles, setProfiles] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load profiles once
  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((data) => {
        const p = (data.profiles || []).map((profile: { title: string; path: string; type: string; contentReadiness: string; party?: string; sector?: string; state?: string }) => ({
          title: profile.title,
          path: profile.path,
          type: profile.type,
          contentReadiness: profile.contentReadiness,
          category: "profile" as const,
          subtitle: [profile.party, profile.state, profile.sector].filter(Boolean).join(" · "),
        }))
        setProfiles(p)
      })
      .catch(() => {})
  }, [])

  // Ctrl+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search
  useEffect(() => {
    if (!query) {
      setResults(PAGES)
      setSelectedIndex(0)
      return
    }

    const q = query.toLowerCase()
    const pageMatches = PAGES.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.subtitle || "").toLowerCase().includes(q)
    )
    const profileMatches = profiles
      .filter((p) => p.title.toLowerCase().includes(q) || (p.subtitle || "").toLowerCase().includes(q))
      .slice(0, 15)

    setResults([...pageMatches, ...profileMatches])
    setSelectedIndex(0)
  }, [query, profiles])

  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      if (result.category === "page") {
        router.push(result.path)
      } else {
        // Navigate to unified profile page
        router.push(`/profile?path=${encodeURIComponent(result.path)}`)
      }
    },
    [router]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigate(results[selectedIndex])
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <svg className="w-4 h-4 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search profiles, pages..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
          />
          <kbd className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-dim)]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[var(--color-text-dim)]">No results found</div>
          ) : (
            <>
              {/* Pages section */}
              {results.some((r) => r.category === "page") && (
                <div className="px-3 pt-2 pb-1">
                  <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">Pages</span>
                </div>
              )}
              {results
                .map((result, i) => {
                  const isFirstProfile = result.category === "profile" && (i === 0 || results[i - 1].category === "page")
                  return (
                    <div key={result.path + result.title}>
                      {isFirstProfile && (
                        <div className="px-3 pt-3 pb-1 border-t border-[var(--color-border)]">
                          <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">Profiles</span>
                        </div>
                      )}
                      <button
                        onClick={() => navigate(result)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          selectedIndex === i ? "bg-[var(--color-steel)]/10" : "hover:bg-[var(--color-bg-hover)]"
                        }`}
                      >
                        {/* Type indicator */}
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: TYPE_COLORS[result.type] || "#7a7a86" }}
                        />
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-[var(--color-text)]">{result.title}</span>
                          {result.subtitle && (
                            <span className="ml-2 text-[10px] text-[var(--color-text-dim)]">{result.subtitle}</span>
                          )}
                        </div>
                        {/* Badges */}
                        {result.category === "profile" && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span
                              className="text-[7px] uppercase px-1 py-0.5 rounded"
                              style={{
                                color: READINESS_COLORS[result.contentReadiness] || "#6b7280",
                                backgroundColor: `${READINESS_COLORS[result.contentReadiness] || "#6b7280"}15`,
                              }}
                            >
                              {result.contentReadiness}
                            </span>
                            <span
                              className="text-[7px] px-1 py-0.5 rounded"
                              style={{
                                color: TYPE_COLORS[result.type] || "#7a7a86",
                                backgroundColor: `${TYPE_COLORS[result.type] || "#7a7a86"}15`,
                              }}
                            >
                              {result.type}
                            </span>
                          </div>
                        )}
                        {result.category === "page" && (
                          <svg className="w-3 h-3 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center gap-4 text-[8px] text-[var(--color-text-dim)]">
          <span><kbd className="px-1 py-0.5 rounded border border-[var(--color-border)]">&uarr;&darr;</kbd> Navigate</span>
          <span><kbd className="px-1 py-0.5 rounded border border-[var(--color-border)]">Enter</kbd> Open</span>
          <span><kbd className="px-1 py-0.5 rounded border border-[var(--color-border)]">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  )
}
