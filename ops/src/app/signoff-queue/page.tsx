"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { Profile } from "@/lib/vault"
import HarnessChip, { type HarnessArtifact } from "@/components/HarnessChip"

/**
 * Sign-Off Queue — surfaces profiles that passed every automated A+
 * check (audit-a-plus-passed stamped by the janitor) and are waiting
 * ONLY on David's manual editorial sign-off.
 *
 * This is the most important page in the ops app right now — 124
 * profiles are stuck here and until this session there was no way
 * to see them. Now they're one click from sign-off.
 *
 * Shows:
 *   - Count of profiles in queue
 *   - Filters (by type, by age, by triangulation count)
 *   - Click-through to profile detail for sign-off
 */

interface QueueItem {
  path: string
  title: string
  type: string
  chamber?: string
  state?: string
  stampedAt: string
  daysOld: number
  triangulation: number
  hasAngle: boolean
  hasOriginalFinding: boolean
  lastUpdated?: string
}

function daysSince(dateStr: string | undefined): number {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

export default function SignoffQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"age" | "triangulation" | "title">("age")
  const [harness, setHarness] = useState<HarnessArtifact | null>(null)

  useEffect(() => {
    // KNOWN GAP (see content/Admin Notes/ops-harness-audit-2026-04-24.md):
    // The queue below is sourced from the audit-a-plus-passed frontmatter
    // stamp — which is exactly the anti-pattern the "Ops display rule" in
    // CLAUDE.md warns against. Fixing it properly requires extending the
    // harness to emit the per-profile pass list (or building a live
    // /api/signoff-queue that recomputes on demand). The HarnessChip +
    // aPlusFailingCount stat card below give a live trust signal in the
    // meantime so a stale janitor doesn't silently mask a broken queue.
    fetch("/api/vault")
      .then((r) => r.json())
      .then((data: { profiles: Profile[] }) => {
        const items: QueueItem[] = data.profiles
          .filter((p) => !!p.auditAPlusPassed && p.lastVerifiedBy !== "editorial")
          .map((p) => ({
            path: p.path,
            title: p.title,
            type: p.type,
            chamber: p.chamber,
            state: p.state,
            stampedAt: p.auditAPlusPassed || "",
            daysOld: daysSince(p.auditAPlusPassed),
            triangulation: p.crossVaultTriangulationCount || 0,
            hasAngle: !!p.angle && p.angle.trim().length > 10,
            hasOriginalFinding: !!p.originalFinding,
            lastUpdated: p.lastUpdated,
          }))
        setQueue(items)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = queue
    .filter((q) => typeFilter === "all" || q.type === typeFilter)
    .sort((a, b) => {
      if (sortBy === "age") return b.daysOld - a.daysOld
      if (sortBy === "triangulation") return b.triangulation - a.triangulation
      return a.title.localeCompare(b.title)
    })

  // Unique types for the filter dropdown
  const types = Array.from(new Set(queue.map((q) => q.type))).sort()

  // Flag S-tier-ready profiles (have angle + original-finding already)
  const sTierReady = queue.filter((q) => q.hasAngle && q.hasOriginalFinding)

  // Live "A+ bar" findings from the harness. The harness type-specific-a-plus
  // check recomputes pass/fail every run; findings_count is the number of
  // *publication-tier profiles still failing the bar* — i.e. the pipeline
  // upstream of this queue. Complements (does not replace) the queue.length
  // below, which still comes from audit-a-plus-passed stamps — see the
  // comment above the fetch in the useEffect for why that's a known gap.
  const aPlusCheck = harness?.checks.find((c) => c.name === "type-specific-a-plus")
  const aPlusFailingCount = aPlusCheck?.findings_count ?? null

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-4">
          <Link href="/" className="hover:text-[var(--color-text)]">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">Sign-off Queue</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Sign-off Queue</h1>
            <p className="text-[12px] text-[var(--color-text-dim)]">
              Profiles that passed every automated A+ check and are waiting on your manual editorial sign-off.
              Open each, verify the narrative reads cleanly, then sign off.
            </p>
          </div>
          <HarnessChip onLoad={setHarness} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">Total in queue</div>
            <div className="text-2xl font-bold mt-1 text-[var(--color-amber)]">{queue.length}</div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
              Oldest waiting
            </div>
            <div className="text-2xl font-bold mt-1">
              {queue.length > 0 ? Math.max(...queue.map((q) => q.daysOld)) : 0}
              <span className="text-sm ml-1 text-[var(--color-text-dim)]">days</span>
            </div>
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
              Already S-tier ready
            </div>
            <div className="text-2xl font-bold mt-1 text-[var(--color-purple)]">{sTierReady.length}</div>
            <div className="text-[9px] text-[var(--color-text-dim)] mt-0.5">
              Have angle + original-finding
            </div>
          </div>
          {/* Live from harness — profiles still failing the A+ bar upstream
              of this queue. If this drops, sign-offs dry up. */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
              Still below A+ bar
            </div>
            <div className="text-2xl font-bold mt-1">
              {aPlusFailingCount === null ? (
                <span className="text-[var(--color-text-dim)]">—</span>
              ) : (
                aPlusFailingCount
              )}
            </div>
            <div className="text-[9px] text-[var(--color-text-dim)] mt-0.5">
              Live · type-specific-a-plus
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 text-[10px]">
          <span className="text-[var(--color-text-dim)] uppercase tracking-wider">Filter:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded px-2 py-1 text-[var(--color-text)]"
          >
            <option value="all">All types ({queue.length})</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t} ({queue.filter((q) => q.type === t).length})
              </option>
            ))}
          </select>

          <span className="text-[var(--color-text-dim)] uppercase tracking-wider ml-4">Sort:</span>
          <button
            onClick={() => setSortBy("age")}
            className={`px-2 py-1 rounded border ${
              sortBy === "age"
                ? "border-[var(--color-steel)] text-[var(--color-steel)]"
                : "border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            Oldest first
          </button>
          <button
            onClick={() => setSortBy("triangulation")}
            className={`px-2 py-1 rounded border ${
              sortBy === "triangulation"
                ? "border-[var(--color-steel)] text-[var(--color-steel)]"
                : "border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            Most connected
          </button>
          <button
            onClick={() => setSortBy("title")}
            className={`px-2 py-1 rounded border ${
              sortBy === "title"
                ? "border-[var(--color-steel)] text-[var(--color-steel)]"
                : "border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            A-Z
          </button>
        </div>

        {/* Queue table */}
        {loading ? (
          <div className="text-center py-12 text-[var(--color-text-dim)] text-[11px]">Loading queue...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-dim)] text-[11px]">
            {queue.length === 0 ? (
              <>
                Queue is empty. Run{" "}
                <code className="text-[var(--color-steel)]">
                  node scripts/pipeline-janitor.cjs --tier=a-plus --cohort --write
                </code>{" "}
                to populate.
              </>
            ) : (
              "No profiles match the current filter."
            )}
          </div>
        ) : (
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  <th className="text-left px-3 py-2">Title</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Waiting</th>
                  <th className="text-right px-3 py-2">Connections</th>
                  <th className="text-center px-3 py-2">S-tier ready</th>
                  <th className="text-right px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr
                    key={q.path}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/profile?path=${encodeURIComponent(q.path)}`}
                        className="hover:text-[var(--color-steel)]"
                      >
                        {q.title}
                      </Link>
                      {q.state && <span className="text-[var(--color-text-dim)] ml-2">({q.state})</span>}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-text-dim)]">{q.type}</td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={
                          q.daysOld > 7
                            ? "text-[var(--color-red)]"
                            : q.daysOld > 3
                            ? "text-[var(--color-amber)]"
                            : "text-[var(--color-text-dim)]"
                        }
                      >
                        {q.daysOld}d
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {q.triangulation > 0 ? (
                        <span
                          className={
                            q.triangulation >= 5
                              ? "text-[var(--color-purple)] font-bold"
                              : "text-[var(--color-text)]"
                          }
                          title={`${q.triangulation} cross-vault triangulations`}
                        >
                          {q.triangulation}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-dim)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {q.hasAngle && q.hasOriginalFinding ? (
                        <span
                          className="text-[var(--color-purple)]"
                          title="Has angle + original-finding fields populated"
                        >
                          ★
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-dim)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/profile?path=${encodeURIComponent(q.path)}`}
                        className="text-[var(--color-steel)] hover:underline"
                      >
                        review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* How-to footer */}
        <div className="mt-8 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[10px] text-[var(--color-text-dim)]">
          <p className="mb-2">
            <strong className="text-[var(--color-text)]">How sign-off works:</strong>
          </p>
          <ol className="list-decimal list-inside space-y-1 ml-1">
            <li>The janitor audit stamps <code className="text-[var(--color-steel)]">audit-a-plus-passed: YYYY-MM-DD</code> on profiles that pass every automated check.</li>
            <li>That stamp means Tier A (data breadth) + Tier B (investigation depth) + Tier C (narrative quality) + Tier D (uniqueness) all mechanically passed.</li>
            <li>You open each profile, verify the narrative reads cleanly, then flip <code className="text-[var(--color-steel)]">last-verified-by: editorial</code> to finalize the A+ promotion.</li>
            <li>Profiles with ★ also have the <code className="text-[var(--color-steel)]">angle:</code> and <code className="text-[var(--color-steel)]">original-finding:</code> fields populated — they're candidates for immediate S-tier promotion after sign-off.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
