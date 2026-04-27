"use client"

/**
 * /bugs — unified bug queue + deferred items triage dashboard (Pillar 5)
 *
 * Read-only v1. Shows:
 *   - Top stats: total open, high-severity open, resolved this week,
 *     bug-queue vs deferred-items split
 *   - Bug queue section (2 entries): full detail per bug, expandable
 *   - Deferred items section (267 entries): filterable table grouped
 *     by category
 *
 * Filters: severity, category, status. Search box for free-text.
 * Click any row to expand for full text.
 *
 * Triage in v1 = "see everything in one place." Writes stay in the
 * markdown files (content/Admin Notes/bug-queue.md +
 * content/Phases/phase-6/deferred-items.md) — David edits them
 * directly when he triages. A v2 could add write-back actions.
 */

import { useState, useEffect, useMemo } from "react"
import HarnessChip from "@/components/HarnessChip"
import { PageHeader } from "@/components/PageHeader"

// ─── Types matching bugs-manifest.json ─────────────────────────────

interface BugQueueEntry {
  source: "bug-queue"
  id: string
  title: string
  status: "open" | "resolved"
  severity: string
  reported: string | null
  resolved: string | null
  where: string | null
  what: string | null
  root_cause: string | null
  fix: string | null
  long_term: string | null
  raw_body: string
}

interface DeferredEntry {
  source: "deferred-items"
  category: string
  phase: string
  source_ref: string
  line_number: number | null
  kind: string
  text: string
  id: string
  title: string
  status: "open"
  severity: string
}

interface Manifest {
  generated_at: string
  stats: {
    bug_queue_open: number
    bug_queue_resolved: number
    deferred_items: number
    deferred_by_category: Record<string, number>
    total_open: number
    high_severity_open: number
  }
  bug_queue: {
    source: string
    source_path: string
    exists: boolean
    entries: BugQueueEntry[]
  }
  deferred_items: {
    source: string
    source_path: string
    exists: boolean
    total_reported: number
    by_category: Record<string, number>
    entries: DeferredEntry[]
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  blocker: 0,
  high: 1,
  medium: 2,
  low: 3,
  unknown: 4,
}

function severityBadgeClass(severity: string): string {
  const s = severity.toLowerCase()
  if (s === "blocker") return "bg-red-900 text-red-200 border-red-700"
  if (s === "high") return "bg-amber-900 text-amber-200 border-amber-700"
  if (s === "medium") return "bg-yellow-900/50 text-yellow-300 border-yellow-800"
  if (s === "low") return "bg-neutral-800 text-neutral-400 border-neutral-700"
  return "bg-neutral-800 text-neutral-500 border-neutral-700"
}

function statusBadgeClass(status: string): string {
  if (status === "open") return "bg-blue-900 text-blue-200 border-blue-700"
  if (status === "resolved") return "bg-green-900 text-green-200 border-green-700"
  return "bg-neutral-800 text-neutral-500 border-neutral-700"
}

// ─── Component ─────────────────────────────────────────────────────

export default function BugsPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters for the deferred items table
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [phaseFilter, setPhaseFilter] = useState<string>("all")
  const [kindFilter, setKindFilter] = useState<string>("unchecked-exit-criterion")
  const [search, setSearch] = useState<string>("")

  const [expandedBugs, setExpandedBugs] = useState<Set<string>>(new Set())
  const [expandedDeferred, setExpandedDeferred] = useState<Set<string>>(new Set())
  const [showResolved, setShowResolved] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch("/api/bugs", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.text()
          throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`)
        }
        return r.json()
      })
      .then((data: Manifest) => {
        if (!cancelled) setManifest(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredDeferred = useMemo(() => {
    if (!manifest) return []
    const entries = manifest.deferred_items.entries
    const needle = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false
      if (severityFilter !== "all" && e.severity !== severityFilter) return false
      if (phaseFilter !== "all" && e.phase !== phaseFilter) return false
      if (kindFilter !== "all" && e.kind !== kindFilter) return false
      if (needle && !e.text.toLowerCase().includes(needle) && !e.source_ref.toLowerCase().includes(needle)) return false
      return true
    })
  }, [manifest, categoryFilter, severityFilter, phaseFilter, kindFilter, search])

  // Unique filter values from the data
  const { categories, phases } = useMemo(() => {
    if (!manifest) return { categories: [], phases: [] }
    const cats = new Set<string>()
    const phs = new Set<string>()
    for (const e of manifest.deferred_items.entries) {
      cats.add(e.category)
      phs.add(e.phase)
    }
    return {
      categories: [...cats].sort(),
      phases: [...phs].sort(),
    }
  }, [manifest])

  function toggleBug(id: string) {
    setExpandedBugs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleDeferred(id: string) {
    setExpandedDeferred((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-8 text-neutral-400 font-mono text-sm">
        Loading bug queue manifest...
      </div>
    )
  }
  if (error || !manifest) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700 text-red-200 p-4 font-mono text-sm">
          Error: {error || "unknown"}
        </div>
        <div className="mt-4 font-mono text-xs text-neutral-400">
          Try:{" "}
          <code className="text-amber-400">
            node scripts/bug-queue-parser.cjs --write
          </code>
        </div>
      </div>
    )
  }

  const bugQueueEntries = [...manifest.bug_queue.entries].sort((a, b) => {
    // Open first, then by severity, then by reported date desc
    if (a.status !== b.status) return a.status === "open" ? -1 : 1
    const sa = SEVERITY_ORDER[a.severity] ?? 99
    const sb = SEVERITY_ORDER[b.severity] ?? 99
    if (sa !== sb) return sa - sb
    return (b.reported || "").localeCompare(a.reported || "")
  })

  const visibleBugs = showResolved
    ? bugQueueEntries
    : bugQueueEntries.filter((e) => e.status === "open")

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Bugs & Deferred Items"
        whatThisDoes="Unified view of bug-queue.md + phase-6/deferred-items.md. The bug queue tracks active issues; deferred items are known-but-not-now decisions parked for a later phase. Both sources merge into one filterable table."
        rightNow={`Manifest generated ${new Date(manifest.generated_at).toLocaleString()}. Regenerate via: node scripts/bug-queue-parser.cjs --write`}
        action="Filter by status (open / resolved this week) and source (bugs vs deferred). Click an entry to expand its full body. Bugs auto-resolve when fixed in code (per the auto-resolve memory rule)."
      />
      <div className="mb-6 flex items-start justify-end gap-4">
        {/* Harness chip — the bugs manifest is a separate artifact from the
            vault-audit harness, but showing harness freshness here lets David
            tell at a glance whether the broader ops-health backdrop is alive. */}
        <HarnessChip />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total open"
          value={manifest.stats.total_open.toString()}
          sub={`${manifest.stats.bug_queue_open} bugs + ${manifest.stats.deferred_items} deferred`}
          color="neutral"
        />
        <StatCard
          label="High severity"
          value={manifest.stats.high_severity_open.toString()}
          sub="open + blocker/high"
          color={manifest.stats.high_severity_open > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Bug queue"
          value={`${manifest.stats.bug_queue_open}/${manifest.stats.bug_queue_open + manifest.stats.bug_queue_resolved}`}
          sub="open / total"
          color={manifest.stats.bug_queue_open > 0 ? "amber" : "green"}
        />
        <StatCard
          label="Deferred items"
          value={manifest.stats.deferred_items.toString()}
          sub="from Phase 6 audit"
          color="neutral"
        />
      </div>

      {/* Deferred items category breakdown */}
      <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded p-4">
        <div className="text-xs text-neutral-400 font-mono uppercase mb-2">
          Deferred items by category
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(manifest.stats.deferred_by_category)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <button
                key={cat}
                onClick={() =>
                  setCategoryFilter(categoryFilter === cat ? "all" : cat)
                }
                className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                  categoryFilter === cat
                    ? "bg-amber-900/50 border-amber-600 text-amber-200"
                    : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:border-neutral-600"
                }`}
              >
                {cat} · {count}
              </button>
            ))}
        </div>
      </div>

      {/* Bug Queue Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">
            Bug Queue{" "}
            <span className="text-neutral-500 font-normal text-sm">
              ({bugQueueEntries.length})
            </span>
          </h2>
          <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded"
            />
            Show resolved ({manifest.stats.bug_queue_resolved})
          </label>
        </div>

        {visibleBugs.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded p-6 text-center">
            <div className="text-neutral-400 font-mono text-sm">
              {showResolved
                ? "No bugs in queue."
                : "✓ Zero open bugs. All clean."}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleBugs.map((bug) => {
              const isExpanded = expandedBugs.has(bug.id)
              return (
                <div
                  key={bug.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded cursor-pointer"
                  onClick={() => toggleBug(bug.id)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <code className="text-sm text-amber-400 font-mono">
                            {bug.id}
                          </code>
                          <span
                            className={`px-2 py-0.5 text-xs border rounded ${severityBadgeClass(bug.severity)}`}
                          >
                            {bug.severity}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs border rounded ${statusBadgeClass(bug.status)}`}
                          >
                            {bug.status}
                          </span>
                          {bug.reported && (
                            <span className="text-xs text-neutral-500 font-mono">
                              reported {bug.reported}
                            </span>
                          )}
                          {bug.resolved && bug.resolved !== "" && (
                            <span className="text-xs text-green-500 font-mono">
                              resolved {bug.resolved}
                            </span>
                          )}
                        </div>
                        <div className="text-base text-white font-semibold">
                          {bug.title}
                        </div>
                        {bug.where && (
                          <div className="text-xs text-neutral-400 mt-1">
                            where: {bug.where}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-neutral-800 p-4 space-y-3 font-mono text-xs">
                      {bug.what && (
                        <div>
                          <div className="text-neutral-500 mb-1">what:</div>
                          <div className="text-neutral-200 whitespace-pre-wrap">
                            {bug.what}
                          </div>
                        </div>
                      )}
                      {bug.root_cause && (
                        <div>
                          <div className="text-neutral-500 mb-1">root cause:</div>
                          <div className="text-neutral-200 whitespace-pre-wrap">
                            {bug.root_cause}
                          </div>
                        </div>
                      )}
                      {bug.fix && (
                        <div>
                          <div className="text-neutral-500 mb-1">fix:</div>
                          <div className="text-neutral-200 whitespace-pre-wrap">
                            {bug.fix}
                          </div>
                        </div>
                      )}
                      {bug.long_term && (
                        <div>
                          <div className="text-neutral-500 mb-1">long-term:</div>
                          <div className="text-neutral-200 whitespace-pre-wrap">
                            {bug.long_term}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Deferred Items Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white">
            Deferred Items{" "}
            <span className="text-neutral-500 font-normal text-sm">
              ({filteredDeferred.length} of {manifest.deferred_items.entries.length})
            </span>
          </h2>
        </div>

        {/* Filters */}
        <div className="mb-3 flex flex-wrap gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search text or source..."
            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-1.5 text-xs rounded font-mono w-64"
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1.5 text-xs rounded font-mono"
          >
            <option value="all">all severities</option>
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1.5 text-xs rounded font-mono"
          >
            <option value="all">all phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1.5 text-xs rounded font-mono"
          >
            <option value="all">all categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1.5 text-xs rounded font-mono"
            title="Filter by item kind: unchecked-exit-criterion are real TODOs; markers and in-section are historical annotations"
          >
            <option value="unchecked-exit-criterion">actionable only</option>
            <option value="all">all kinds</option>
            <option value="marker">marker</option>
            <option value="in-section">in-section</option>
          </select>
          {(categoryFilter !== "all" ||
            severityFilter !== "all" ||
            phaseFilter !== "all" ||
            kindFilter !== "unchecked-exit-criterion" ||
            search) && (
            <button
              onClick={() => {
                setCategoryFilter("all")
                setSeverityFilter("all")
                setPhaseFilter("all")
                setKindFilter("unchecked-exit-criterion")
                setSearch("")
              }}
              className="px-2 py-1.5 text-xs text-neutral-400 hover:text-white font-mono"
            >
              clear filters
            </button>
          )}
        </div>

        {filteredDeferred.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded p-6 text-center text-neutral-400 font-mono text-sm">
            No items match the current filters.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredDeferred.slice(0, 200).map((item) => {
              const isExpanded = expandedDeferred.has(item.id)
              return (
                <div
                  key={item.id}
                  className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded cursor-pointer"
                  onClick={() => toggleDeferred(item.id)}
                >
                  <div className="p-3 flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 text-xs border rounded flex-shrink-0 font-mono ${severityBadgeClass(item.severity)}`}
                    >
                      {item.severity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-200 truncate">
                        {item.text.slice(0, 140)}
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-1 flex gap-3 flex-wrap">
                        <span>{item.category}</span>
                        <span>{item.phase}</span>
                        <span>{item.kind}</span>
                        <span>{item.source_ref}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-neutral-800 p-3 font-mono text-xs text-neutral-300 whitespace-pre-wrap">
                      {item.text}
                    </div>
                  )}
                </div>
              )
            })}
            {filteredDeferred.length > 200 && (
              <div className="text-xs text-neutral-500 text-center py-3 font-mono">
                … +{filteredDeferred.length - 200} more items hidden. Narrow filters to see them.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: "neutral" | "green" | "amber" | "red"
}) {
  const borderColor =
    color === "green"
      ? "border-green-800"
      : color === "amber"
        ? "border-amber-800"
        : color === "red"
          ? "border-red-800"
          : "border-neutral-800"
  const valueColor =
    color === "green"
      ? "text-green-400"
      : color === "amber"
        ? "text-amber-400"
        : color === "red"
          ? "text-red-400"
          : "text-white"
  return (
    <div className={`bg-neutral-900 border ${borderColor} rounded p-4`}>
      <div className="text-xs text-neutral-400 font-mono uppercase">{label}</div>
      <div className={`text-2xl font-bold ${valueColor} mt-1`}>{value}</div>
      <div className="text-xs text-neutral-500 mt-1">{sub}</div>
    </div>
  )
}
