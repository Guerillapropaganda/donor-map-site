"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"

/**
 * California Governor 2026 — race curation surface.
 *
 * One row per candidate in content/Politicians/Races/CA Governor 2026/.
 * Shows readiness, federal money in, connection count, blocking flags,
 * last update. Click → /profile to edit.
 *
 * Federal money only — California gubernatorial filings live in
 * Cal-Access (no pipeline yet). The "Cal-Access status" banner up top
 * tracks that gap. When the bulk ingester ships, candidate rows will
 * carry both federal_money_in and ca_state_money_in side by side.
 */

interface CandidateRow {
  name: string
  profile_path: string
  readiness: string
  party: string | null
  body_chars: number
  citation_count: number
  url_needed_flags: number
  unverified_flags: number
  needs_review_flags: number
  last_updated: string | null
  has_summary_infobox: boolean
  resolved: boolean
  federal_money_in: number
  monetary_edge_count: number
  total_connections: number
  ca_state_money_in: number
  ca_state_donor_count: number
  ca_ie_supporting: number
  ca_ie_opposing: number
  cal_access_status?: "active" | "withdrew" | "suspended" | "default" | null
  cal_access_status_date?: string | null
}

interface RaceResponse {
  race: string
  candidate_count: number
  candidates: CandidateRow[]
  cal_access_status: string
}

const READINESS_RANK: Record<string, number> = {
  "data-complete": 4,
  ready: 3,
  draft: 2,
  raw: 1,
  "?": 0,
}

const READINESS_LABEL: Record<string, string> = {
  "data-complete": "Ready to ship (federal disclosures only)",
  ready: "One promotion away from publishable",
  draft: "Skeleton in place — needs editorial work",
  raw: "Stub — no editorial content yet",
}

const READINESS_BADGE: Record<string, string> = {
  "data-complete": "✅ data-complete",
  ready: "⚠️ ready",
  draft: "🟡 draft",
  raw: "🔴 raw",
}

function formatMoney(n: number): string {
  if (n === 0) return "$0"
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function flagCount(c: CandidateRow): number {
  return c.url_needed_flags + c.unverified_flags + c.needs_review_flags
}

export default function CAGov2026Page() {
  const [data, setData] = useState<RaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"readiness" | "money" | "name" | "updated">("readiness")

  useEffect(() => {
    fetch("/api/races/ca-gov-2026")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((d: RaceResponse) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e))
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-6 text-zinc-300">Loading CA Governor 2026 race…</div>
  if (error) return <div className="p-6 text-red-400">Error: {error}</div>
  if (!data) return null

  const rows = [...data.candidates]
  rows.sort((a, b) => {
    if (sortBy === "readiness") {
      return (READINESS_RANK[b.readiness] ?? 0) - (READINESS_RANK[a.readiness] ?? 0)
    }
    if (sortBy === "money") {
      const aTotal = a.federal_money_in + a.ca_state_money_in + a.ca_ie_supporting
      const bTotal = b.federal_money_in + b.ca_state_money_in + b.ca_ie_supporting
      return bTotal - aTotal
    }
    if (sortBy === "updated") {
      return String(b.last_updated ?? "").localeCompare(String(a.last_updated ?? ""))
    }
    return a.name.localeCompare(b.name)
  })

  const shipReady = rows.filter((r) => r.readiness === "data-complete").length
  const oneAway = rows.filter((r) => r.readiness === "ready").length
  const needsWork = rows.filter((r) => r.readiness === "draft" || r.readiness === "raw").length

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="California Governor 2026"
        whatThisDoes="Curation surface for the 2026 CA gubernatorial race. One row per candidate with readiness state, federal money (FEC + IRS 990), CA state money (Cal-Access direct + IE-supporting + IE-opposing), connection count, and editorial flags."
        rightNow={`${data.candidate_count} candidates — ${shipReady} ship-ready, ${oneAway} one promotion away, ${needsWork} need work`}
        action="Sort by money to rank by total spending. Click a row to jump to /profile. Cal-Access visuals available below the table."
      />

      {/* Visuals link */}
      <div className="flex gap-3 text-sm">
        <Link
          href="/races/ca-gov-2026/visuals"
          className="px-3 py-1.5 border border-yellow-500 text-yellow-300 hover:bg-yellow-500/10 inline-flex items-center gap-2"
        >
          <span>📊</span>
          <span>Donor-flow Sankey + funding-structure plot →</span>
        </Link>
      </div>

      {/* Cal-Access status banner */}
      {data.cal_access_status.startsWith("ingested") ? (
        <div className="border border-emerald-700/50 bg-emerald-950/30 p-4 text-sm text-emerald-200">
          <div className="font-semibold mb-1">✅ Cal-Access: {data.cal_access_status}</div>
          <div className="text-emerald-300/80">
            Cal-Access columns show CA state-level fundraising:{" "}
            <strong>CA $ direct</strong> = donor → candidate-controlled committee.{" "}
            <strong>IE supporting</strong> / <strong>IE opposing</strong> = donor → independent
            expenditure PAC backing or attacking the candidate (separate entities, not collapsed
            into the candidate).
          </div>
        </div>
      ) : (
        <div className="border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
          <div className="font-semibold mb-1">📋 Cal-Access: {data.cal_access_status}</div>
          <div className="text-amber-300/80">
            Numbers below are <strong>federal money only</strong> until Cal-Access ingests. Run:{" "}
            <code className="bg-amber-900/40 px-1">node scripts/cal-access-discover-committees.cjs</code>{" "}
            then{" "}
            <code className="bg-amber-900/40 px-1">node scripts/ingest-cal-access-bulk.cjs</code>.
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex gap-2 text-sm">
        <span className="text-zinc-500">Sort:</span>
        {(["readiness", "money", "name", "updated"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={
              "px-2 py-0.5 border " +
              (sortBy === key
                ? "border-yellow-500 text-yellow-300"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500")
            }
          >
            {key}
          </button>
        ))}
      </div>

      {/* Candidate table */}
      <div className="overflow-x-auto border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="text-left p-3">Candidate</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3" title="FEC + IRS 990 + USASpending">Federal $</th>
              <th className="text-right p-3" title="Donor → candidate-controlled CA committee receipts">CA $ direct</th>
              <th className="text-right p-3" title="Donor → IE PAC supporting candidate">IE support</th>
              <th className="text-right p-3" title="Donor → IE PAC opposing candidate">IE oppose</th>
              <th className="text-right p-3">Conns</th>
              <th className="text-right p-3">Flags</th>
              <th className="text-left p-3">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const flags = flagCount(c)
              const editHref = `/profile?path=${encodeURIComponent(c.profile_path)}`
              return (
                <tr key={c.name} className="border-t border-zinc-800 hover:bg-zinc-900/50">
                  <td className="p-3">
                    <Link
                      href={editHref}
                      className={
                        "font-medium " +
                        (c.cal_access_status === "withdrew" || c.cal_access_status === "suspended"
                          ? "text-zinc-500 hover:text-yellow-300 line-through decoration-zinc-700"
                          : "text-zinc-100 hover:text-yellow-300")
                      }
                    >
                      {c.name}
                    </Link>
                    {c.party && (
                      <span className="ml-2 text-xs text-zinc-500">({c.party})</span>
                    )}
                    {c.cal_access_status === "withdrew" && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400 border border-amber-700/60 px-1 py-0" title={c.cal_access_status_date || ""}>
                        withdrew
                      </span>
                    )}
                    {c.cal_access_status === "suspended" && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-orange-400 border border-orange-700/60 px-1 py-0" title={c.cal_access_status_date || ""}>
                        suspended
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-xs">
                      {READINESS_BADGE[c.readiness] ?? c.readiness}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {READINESS_LABEL[c.readiness] ?? ""}
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">
                    {c.resolved && c.federal_money_in > 0 ? (
                      formatMoney(c.federal_money_in)
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-300">
                    {c.ca_state_money_in > 0 ? formatMoney(c.ca_state_money_in) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-300">
                    {c.ca_ie_supporting > 0 ? formatMoney(c.ca_ie_supporting) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="p-3 text-right font-mono text-red-300">
                    {c.ca_ie_opposing > 0 ? formatMoney(c.ca_ie_opposing) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="p-3 text-right font-mono text-zinc-400">
                    {c.resolved ? c.total_connections : "—"}
                  </td>
                  <td className="p-3 text-right">
                    {flags === 0 ? (
                      <span className="text-zinc-600">clean</span>
                    ) : (
                      <span className="text-orange-400" title={`${c.url_needed_flags} URL NEEDED, ${c.unverified_flags} UNVERIFIED, ${c.needs_review_flags} NEEDS REVIEW`}>
                        {flags}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-zinc-500">
                    {c.last_updated ? c.last_updated.slice(0, 10) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Best-looking-now callout */}
      <div className="border border-zinc-700 bg-zinc-900/40 p-4 text-sm text-zinc-300 space-y-2">
        <div className="font-semibold text-zinc-100">🎯 What to do next</div>
        <ul className="list-disc pl-5 space-y-1 text-zinc-400">
          <li>
            <strong className="text-green-400">{shipReady} ship-ready</strong> profiles — these
            pass every automated check. Review for editorial polish, then promote to{" "}
            <code className="text-zinc-300">verified</code>.
          </li>
          <li>
            <strong className="text-amber-400">{oneAway} ready</strong> — one auto-block populate
            away. Run the per-profile derived-artifacts pipeline to push them up.
          </li>
          <li>
            <strong className="text-red-400">{needsWork} draft</strong> — need editorial body work.
            Open them and write the Who They Are / Class Analysis sections.
          </li>
          {data.cal_access_status.startsWith("ingested") ? (
            <li>
              <strong className="text-emerald-400">Cal-Access live</strong> — donor maps now
              include CA state-level fundraising. Re-run{" "}
              <code className="text-zinc-300">node scripts/ingest-cal-access-bulk.cjs</code> after
              fresh dumps to refresh.
            </li>
          ) : (
            <li>
              <strong>Cal-Access gap</strong> — federal money is a fraction of CA-Gov reality. Plan
              in{" "}
              <code className="text-zinc-300">content/Admin Notes/cal-access-pipeline-plan.md</code>.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
