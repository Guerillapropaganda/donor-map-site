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
    if (sortBy === "money") return b.federal_money_in - a.federal_money_in
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
        whatThisDoes="Curation surface for the 2026 California gubernatorial race. One row per candidate with readiness state, federal money raised (FEC + IRS 990), connection count, and editorial flags. Click any candidate to open their profile for editing."
        rightNow={`${data.candidate_count} candidates — ${shipReady} ship-ready, ${oneAway} one promotion away, ${needsWork} need work`}
        action="Sort by readiness to see ship-ready candidates first. Click a row to jump to /profile for editing. Cal-Access pipeline pending — federal totals only for now."
      />

      {/* Cal-Access status banner */}
      <div className="border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
        <div className="font-semibold mb-1">📋 Cal-Access ingestion: {data.cal_access_status}</div>
        <div className="text-amber-300/80">
          Numbers below are <strong>federal money only</strong> (FEC + IRS 990 + USASpending).
          California gubernatorial fundraising is reported to Cal-Access, not the FEC. State-side
          totals will appear here once the Cal-Access bulk ingester ships. Drop downloaded
          Cal-Access dumps into <code className="bg-amber-900/40 px-1">data/bulk/california/</code>.
        </div>
      </div>

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
              <th className="text-right p-3">Federal $ in</th>
              <th className="text-right p-3">Connections</th>
              <th className="text-right p-3">Body</th>
              <th className="text-right p-3">Citations</th>
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
                      className="text-zinc-100 hover:text-yellow-300 font-medium"
                    >
                      {c.name}
                    </Link>
                    {c.party && (
                      <span className="ml-2 text-xs text-zinc-500">({c.party})</span>
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
                    {c.resolved ? (
                      formatMoney(c.federal_money_in)
                    ) : (
                      <span className="text-zinc-600" title="Candidate didn't resolve to a librarian node — usually means no federal campaign record">
                        —
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-zinc-400">
                    {c.resolved ? c.total_connections : "—"}
                  </td>
                  <td className="p-3 text-right font-mono text-zinc-400">
                    {(c.body_chars / 1000).toFixed(1)}K
                  </td>
                  <td className="p-3 text-right font-mono">
                    {c.citation_count > 0 ? (
                      <span className="text-green-400">{c.citation_count}</span>
                    ) : (
                      <span className="text-zinc-600" title="No markdown footnote citations. Auto-block sources from FEC pipeline likely present.">
                        0
                      </span>
                    )}
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
          <li>
            <strong>Cal-Access gap</strong> — federal money is a fraction of CA-Gov reality. The
            actual race is funded through Cal-Access committees. Plan in{" "}
            <code className="text-zinc-300">content/Admin Notes/cal-access-pipeline-plan.md</code>.
          </li>
        </ul>
      </div>
    </div>
  )
}
