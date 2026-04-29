"use client"

/**
 * /money-trail — Trail explorer (rebuilt 2026-04-29 per item #5 of
 * handoff cc_p3_173). Replaces the prior single-profile star-graph
 * with a multi-hop dollar-flow explorer.
 *
 * Two query modes:
 *   1. Specific source → target — paths(from, to, maxHops). Renders
 *      each path as a horizontal chain of entity pills with $ amounts
 *      between hops.
 *   2. Capital_type group → target — enumerates top sources of the
 *      chosen capital_type (Path B coverage from item #3, e.g. fossil-
 *      capital, military-industrial), runs paths from each, merges +
 *      ranks. "Show me how fossil-capital money reaches Senator X."
 *
 * If target is empty, surfaces top monetary edges out of the source
 * as 1-hop trails (the "what does this donor fund" view).
 *
 * All numbers come from the librarian (lib/donor-map Graph) — no
 * frontmatter cache reads, per ADR-0024.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { PageHeader } from "@/components/PageHeader"

// ─── shapes (must match /api/money-trail/trails) ──────────────────────────

interface TrailEdge {
  id: string
  from: string
  to: string
  type: string
  role: string | null
  amount: number | null
  cycle: string | number | null
  confidence: number
  source: string
  source_url: string | null
  status: string
}

interface TrailNode {
  id: string
  name: string
  node_type: string
  capital_type: string | null
  profile_path: string | null
}

interface Trail {
  source: TrailNode
  target: TrailNode
  hops: number
  total_amount: number
  weight: number
  edges: TrailEdge[]
  nodes: TrailNode[]
}

interface TrailsResponse {
  trails: Trail[]
  stats: {
    sources_used: number
    paths_found: number
    capital_type_used: string | null
    max_hops: number
    edge_types: string | string[]
  }
}

// Capital types ranked by entity count (2026-04-29 corpus). Locked to
// the ADR-0001 vocabulary; chip order = "where the money is."
const CAPITAL_TYPES: Array<{ value: string; label: string; count: number }> = [
  { value: "dark-money-vehicle", label: "dark money", count: 436 },
  { value: "tech-monopoly", label: "tech", count: 52 },
  { value: "finance-capital", label: "finance", count: 45 },
  { value: "pharma-capital", label: "pharma", count: 31 },
  { value: "fossil-capital", label: "fossil", count: 30 },
  { value: "labor-aligned", label: "labor", count: 22 },
  { value: "rentier-capital", label: "rentier", count: 20 },
  { value: "military-industrial", label: "military", count: 20 },
  { value: "media-capital", label: "media", count: 13 },
  { value: "carceral-capital", label: "carceral", count: 13 },
  { value: "agribusiness-capital", label: "agribusiness", count: 13 },
]

const CAPITAL_TYPE_COLORS: Record<string, string> = {
  "dark-money-vehicle": "bg-gray-700 text-gray-200 border-gray-500",
  "tech-monopoly": "bg-blue-950 text-blue-300 border-blue-700",
  "finance-capital": "bg-green-950 text-green-300 border-green-700",
  "pharma-capital": "bg-purple-950 text-purple-300 border-purple-700",
  "fossil-capital": "bg-orange-950 text-orange-300 border-orange-700",
  "labor-aligned": "bg-rose-950 text-rose-300 border-rose-700",
  "rentier-capital": "bg-amber-950 text-amber-300 border-amber-700",
  "military-industrial": "bg-red-950 text-red-300 border-red-700",
  "media-capital": "bg-pink-950 text-pink-300 border-pink-700",
  "carceral-capital": "bg-stone-900 text-stone-300 border-stone-600",
  "agribusiness-capital": "bg-yellow-950 text-yellow-300 border-yellow-700",
}

function formatAmount(n: number): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B"
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M"
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K"
  if (n > 0) return "$" + n.toLocaleString()
  return "—"
}

function nodeChipClass(n: TrailNode): string {
  if (n.capital_type && CAPITAL_TYPE_COLORS[n.capital_type]) return CAPITAL_TYPE_COLORS[n.capital_type]
  if (n.node_type === "politician") return "bg-yellow-950 text-yellow-300 border-yellow-700"
  return "bg-gray-800 text-gray-300 border-gray-600"
}

// ─── component ────────────────────────────────────────────────────────────

export default function MoneyTrailPage() {
  // Source: either a specific entity name OR a capital_type chip
  const [sourceMode, setSourceMode] = useState<"entity" | "capital_type">("capital_type")
  const [fromName, setFromName] = useState("")
  const [capitalType, setCapitalType] = useState("fossil-capital")
  const [toName, setToName] = useState("")
  const [maxHops, setMaxHops] = useState(2)
  const [limit, setLimit] = useState(25)

  const [trails, setTrails] = useState<Trail[]>([])
  const [stats, setStats] = useState<TrailsResponse["stats"] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [hasRun, setHasRun] = useState(false)

  const runQuery = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedIdx(null)
    try {
      const params = new URLSearchParams()
      if (sourceMode === "entity" && fromName.trim()) params.set("from", fromName.trim())
      else if (sourceMode === "capital_type" && capitalType) params.set("capital_type", capitalType)
      if (toName.trim()) params.set("to", toName.trim())
      params.set("max_hops", String(maxHops))
      params.set("limit", String(limit))

      const res = await fetch(`/api/money-trail/trails?${params}`)
      const data: TrailsResponse | { error: string } = await res.json()
      if (!res.ok) throw new Error("error" in data ? data.error : `HTTP ${res.status}`)
      const d = data as TrailsResponse
      setTrails(d.trails)
      setStats(d.stats)
      setHasRun(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
      setTrails([])
      setStats(null)
      setHasRun(true)
    } finally {
      setLoading(false)
    }
  }, [sourceMode, fromName, capitalType, toName, maxHops, limit])

  // Auto-run on initial load with the default fossil-capital → all view
  useEffect(() => {
    runQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Aggregate stats across visible trails (totals by capital_type)
  const aggregateStats = useMemo(() => {
    const byCapType: Record<string, { count: number; total: number }> = {}
    let grandTotal = 0
    for (const t of trails) {
      grandTotal += t.total_amount
      const ct = t.source.capital_type ?? "(untagged)"
      if (!byCapType[ct]) byCapType[ct] = { count: 0, total: 0 }
      byCapType[ct].count += 1
      byCapType[ct].total += t.total_amount
    }
    return { grandTotal, byCapType }
  }, [trails])

  // Client-side grouping: trails with the same node-sequence (same source,
  // same target, same intermediaries) are collapsed into one card. Multi-
  // cycle FEC contributions and parallel committee transfers all live as
  // distinct edges in canonical stores, but for the reader they're "the
  // same path, fired multiple times." Aggregating sums the amounts and
  // collects the cycles + edge ids for the detail pane.
  const groupedTrails = useMemo(() => {
    interface GroupedTrail extends Trail {
      group_count: number
      cycles: Array<string | number>
    }
    const groups = new Map<string, GroupedTrail>()
    for (const t of trails) {
      const key = t.nodes.map((n) => n.id).join("|")
      const cyc = t.edges.map((e) => e.cycle).filter((c): c is string | number => c !== null)
      const existing = groups.get(key)
      if (existing) {
        existing.total_amount += t.total_amount
        existing.weight += t.weight
        existing.edges = existing.edges.concat(t.edges)
        existing.group_count += 1
        for (const c of cyc) if (!existing.cycles.includes(c)) existing.cycles.push(c)
      } else {
        groups.set(key, { ...t, group_count: 1, cycles: [...new Set(cyc)] })
      }
    }
    const arr = Array.from(groups.values())
    arr.sort((a, b) => b.total_amount - a.total_amount)
    return arr
  }, [trails])

  const selectedTrail = selectedIdx !== null ? groupedTrails[selectedIdx] : null

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Money Trail"
        whatThisDoes="Multi-hop dollar-flow explorer. Pick a source (a specific entity OR a class of capital — fossil, finance, pharma, etc.) and an optional target. Returns ranked trails of monetary edges between them, with the dollar amount at each hop. Backed by the librarian (ADR-0024) — no frontmatter cache reads."
        rightNow={
          loading ? "Loading…"
            : stats ? `${groupedTrails.length} trails · ${stats.sources_used} source${stats.sources_used === 1 ? "" : "s"} · ${formatAmount(aggregateStats.grandTotal)} total`
              : "Ready"
        }
        action="Source: pick a capital class chip to see how that whole tendency funds politics; pick a specific entity for one donor's footprint."
      />

      <div className="px-6 pb-8">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-950 border border-red-800 text-red-200 text-sm rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-4">
          {/* Left rail: query form */}
          <aside className="col-span-3 space-y-4">
            <section className="bg-gray-900 border border-gray-800 rounded p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Source</h3>
              <div className="flex gap-1 mb-3">
                <button
                  onClick={() => setSourceMode("capital_type")}
                  className={`text-xs px-2 py-1 rounded border ${sourceMode === "capital_type" ? "bg-blue-900 border-blue-700 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}
                >
                  capital class
                </button>
                <button
                  onClick={() => setSourceMode("entity")}
                  className={`text-xs px-2 py-1 rounded border ${sourceMode === "entity" ? "bg-blue-900 border-blue-700 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}
                >
                  specific entity
                </button>
              </div>

              {sourceMode === "capital_type" ? (
                <div className="flex flex-wrap gap-1">
                  {CAPITAL_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setCapitalType(ct.value)}
                      className={`text-[11px] px-2 py-1 rounded border ${capitalType === ct.value ? CAPITAL_TYPE_COLORS[ct.value] || "bg-blue-900 border-blue-700 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}
                      title={`${ct.count} entities tagged ${ct.value}`}
                    >
                      {ct.label} <span className="opacity-60">{ct.count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="e.g. Pfizer Inc."
                  className="w-full text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-100 placeholder:text-gray-600"
                />
              )}
            </section>

            <section className="bg-gray-900 border border-gray-800 rounded p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Target <span className="font-normal opacity-60">(optional)</span>
              </h3>
              <input
                type="text"
                value={toName}
                onChange={(e) => setToName(e.target.value)}
                placeholder="e.g. Mike Johnson — leave empty for top flows out"
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-100 placeholder:text-gray-600"
              />
            </section>

            <section className="bg-gray-900 border border-gray-800 rounded p-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Path settings</h3>
              <label className="text-xs text-gray-400 block mb-1">Max hops: <span className="text-gray-100">{maxHops}</span></label>
              <input
                type="range"
                min={1}
                max={4}
                value={maxHops}
                onChange={(e) => setMaxHops(parseInt(e.target.value, 10))}
                className="w-full"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                1 = direct only. 2 = one intermediary (donor → PAC → politician). 3+ explores deeper chains but slower.
              </p>

              <label className="text-xs text-gray-400 block mt-3 mb-1">Limit: <span className="text-gray-100">{limit}</span></label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                className="w-full text-sm bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </section>

            <button
              onClick={runQuery}
              disabled={loading || (sourceMode === "entity" && !fromName.trim())}
              className="w-full text-sm px-3 py-2 rounded bg-blue-800 hover:bg-blue-700 text-blue-100 disabled:opacity-50 border border-blue-600"
            >
              {loading ? "Tracing…" : "Trace trails"}
            </button>

            {stats && (
              <section className="bg-gray-900 border border-gray-800 rounded p-3 text-[11px] text-gray-400 space-y-1">
                <div>{stats.sources_used} source{stats.sources_used === 1 ? "" : "s"} scanned</div>
                <div>{stats.paths_found} paths found ({groupedTrails.length} shown after grouping)</div>
                <div>max hops: {stats.max_hops}</div>
                {stats.capital_type_used && (
                  <div>filter: <span className="text-gray-200">{stats.capital_type_used}</span></div>
                )}
              </section>
            )}
          </aside>

          {/* Center: trail list (vertical cards, big $) */}
          <main className="col-span-6">
            {!loading && hasRun && groupedTrails.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded p-6 text-center text-gray-500">
                No trails found.{" "}
                {toName.trim() && (
                  <span className="block mt-2 text-xs">
                    Try increasing max-hops, or remove the target to see top outgoing flows.
                  </span>
                )}
              </div>
            )}

            <div className="space-y-3">
              {groupedTrails.map((t, i) => (
                <TrailCard
                  key={`${t.source.id}-${t.target.id}-${t.nodes.map((n) => n.id).join("|")}`}
                  trail={t}
                  selected={selectedIdx === i}
                  onClick={() => setSelectedIdx(i)}
                />
              ))}
            </div>
          </main>

          {/* Right: detail pane */}
          <aside className="col-span-3">
            {!selectedTrail ? (
              <div className="bg-gray-900 border border-gray-800 rounded p-6 text-center text-gray-600 text-xs">
                Click a trail to see per-edge details, sources, and cycles.
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded p-3" style={{ position: "sticky", top: "1rem" }}>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Trail breakdown</div>
                <div className="text-sm text-gray-100 mb-1">
                  <span className="font-medium">{selectedTrail.source.name}</span>
                  <span className="text-gray-500 mx-1">→</span>
                  <span className="font-medium">{selectedTrail.target.name}</span>
                </div>
                <div className="text-[11px] text-gray-500 mb-3">
                  {formatAmount(selectedTrail.total_amount)} across {selectedTrail.hops} hop{selectedTrail.hops === 1 ? "" : "s"}
                </div>

                <ol className="space-y-2">
                  {selectedTrail.edges.map((e, i) => (
                    <li key={e.id} className="border-l-2 border-gray-700 pl-3 py-1">
                      <div className="text-[11px] text-gray-400">
                        <span className="text-gray-200">{e.from}</span>
                        <span className="text-gray-600 mx-1">→</span>
                        <span className="text-gray-200">{e.to}</span>
                      </div>
                      <div className="text-xs font-mono text-green-400 mt-0.5">
                        {formatAmount(e.amount ?? 0)}{e.cycle ? <span className="text-gray-500 ml-1">cycle {e.cycle}</span> : null}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {e.type}{e.role ? ` · ${e.role}` : ""}
                        {e.source ? ` · ${e.source}` : ""}
                      </div>
                      {e.source_url && (
                        <a
                          href={e.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:text-blue-400 underline"
                        >
                          source ↗
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>

        {/* Bottom: per-class aggregate (only when capital_type filter is active) */}
        {stats?.capital_type_used && Object.keys(aggregateStats.byCapType).length > 1 && (
          <section className="mt-6 bg-gray-900 border border-gray-800 rounded p-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">By source capital_type</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {Object.entries(aggregateStats.byCapType)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([ct, info]) => (
                  <div key={ct} className="bg-gray-800/40 border border-gray-700 rounded px-2 py-1">
                    <div className="text-gray-400">{ct}</div>
                    <div className="font-mono text-gray-100">{formatAmount(info.total)}</div>
                    <div className="text-gray-500 text-[10px]">{info.count} trails</div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ─── trail card (vertical chain, big $) ─────────────────────────────────

interface GroupedTrail extends Trail {
  group_count: number
  cycles: Array<string | number>
}

/**
 * Detect "same entity referencing itself" — usually an alias bug in the
 * librarian where two FEC name variants (e.g. "CoreCivic" and "CoreCivic
 * - Private Prisons") aren't merged. Surfaced visibly so the reader
 * doesn't think the page is broken; a fix is canonical-side, not UI-side.
 */
function looksLikeSelfLoop(a: TrailNode, b: TrailNode): boolean {
  if (a.id === b.id) return true
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  const an = norm(a.name)
  const bn = norm(b.name)
  if (an === bn) return true
  // Substring containment with ≥80% overlap (catches "CoreCivic" vs "CoreCivic - Private Prisons")
  const shorter = an.length < bn.length ? an : bn
  const longer = an.length < bn.length ? bn : an
  if (shorter.length >= 4 && longer.includes(shorter)) {
    return shorter.length / longer.length >= 0.4
  }
  return false
}

function TrailCard({ trail, selected, onClick }: { trail: GroupedTrail; selected: boolean; onClick: () => void }) {
  // Self-loop detection: source ≈ target → flag visibly
  const isSelfLoop = looksLikeSelfLoop(trail.source, trail.target)

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-gray-900 border-2 rounded-lg p-4 hover:border-gray-600 transition-colors ${selected ? "border-blue-600 bg-gray-900/80" : "border-gray-800"}`}
    >
      {/* Headline row: $ amount + summary stats */}
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <div className="font-mono text-2xl font-bold text-green-300">
          {formatAmount(trail.total_amount)}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{trail.hops} hop{trail.hops === 1 ? "" : "s"}</span>
          {trail.group_count > 1 && (
            <>
              <span>·</span>
              <span className="text-gray-300">{trail.group_count} contributions</span>
            </>
          )}
          {trail.cycles.length > 1 && (
            <>
              <span>·</span>
              <span>{trail.cycles.length} cycles</span>
            </>
          )}
          {trail.source.capital_type && (
            <span className={`px-2 py-0.5 rounded text-[10px] border font-medium ${CAPITAL_TYPE_COLORS[trail.source.capital_type] || "bg-gray-800 border-gray-700"}`}>
              {trail.source.capital_type.replace(/-capital$|-vehicle$/, "")}
            </span>
          )}
        </div>
      </div>

      {/* Self-loop warning */}
      {isSelfLoop && (
        <div className="mb-3 px-2 py-1 text-[10px] bg-amber-950/40 border border-amber-900/60 rounded text-amber-300">
          ⚠ Same entity at both ends — likely an unmerged alias in the librarian (e.g. PAC name variants).
        </div>
      )}

      {/* Vertical chain */}
      <div className="space-y-1">
        {trail.nodes.map((n, i) => (
          <div key={`${n.id}-${i}`}>
            <NodePill node={n} />
            {i < trail.nodes.length - 1 && (
              <div className="flex items-center gap-2 ml-4 my-1">
                <span className="text-gray-700 text-lg leading-none">↓</span>
                <span className="text-sm font-mono text-green-400">
                  {trail.edges[i] && typeof trail.edges[i].amount === "number"
                    ? formatAmount(trail.edges[i].amount as number)
                    : "(non-monetary)"}
                </span>
                {trail.edges[i] && trail.edges[i].role && (
                  <span className="text-[10px] text-gray-500 italic">
                    {trail.edges[i].role}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </button>
  )
}

function NodePill({ node }: { node: TrailNode }) {
  // Distinguish politician (yellow) from donor/corp (capital-class color)
  // from intermediate stub (gray). Politicians get a 👤; orgs get a 🏛️.
  const isPolitician = node.node_type === "politician"
  const icon = isPolitician ? "👤" : "🏛️"
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none" aria-hidden>{icon}</span>
      <span
        className={`text-sm px-3 py-1 rounded border font-medium ${nodeChipClass(node)}`}
        title={node.profile_path || node.id}
      >
        {node.name}
      </span>
    </div>
  )
}
