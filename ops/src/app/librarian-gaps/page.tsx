"use client"

/**
 * /librarian-gaps — editorial work surface for librarian-gap-aliases (ADR-0029 Tier 2).
 *
 * Companion to /audit-claude-decisions:
 *   - /audit-claude-decisions = "what did Claude do?" (retrospective + revert)
 *   - /librarian-gaps = "what's pending? approve/reject batch" (prospective)
 *
 * Per the discussion 2026-04-29: David asked for editorial work surfaces
 * to live in ops, not just markdown files. This page replaces the
 * librarian-gap-review.md + --apply-approved CLI flow with point-and-
 * click batch approval.
 *
 * Each candidate row shows:
 *   - the unresolved name (what wikilinks point at)
 *   - appearances count (× across guarded fields)
 *   - similar-match candidates from the librarian (typo distance, name)
 *   - sample profiles where the name appears
 *   - action buttons: ✓ approve to <similar>, 🔍 research, ✗ reject
 *
 * Keyboard: j/k = nav, a = approve to top similar, x = reject, ? = research
 *
 * Plain-language explainer at top per the "explain like a child" memory.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { PageHeader } from "@/components/PageHeader"

interface Similar {
  name: string
  distance: number
}

interface GapRecord {
  id: string
  name: string
  gap_class: string
  appearances: number
  by_field: Record<string, number>
  sample_profiles: string[]
  similar: Similar[]
  state: string
  approved_alias_target: string | null
  rejected_reason: string | null
  decided_at: string | null
}

interface ApiResponse {
  records: GapRecord[]
  total_in_state: number
  total_records: number
  by_state: Record<string, number>
}

const STATES = ["candidate", "approved-alias", "rejected", "needs-research", "resolved"] as const
type State = typeof STATES[number]

const STATE_COLORS: Record<string, string> = {
  "candidate": "bg-yellow-900 text-yellow-300",
  "approved-alias": "bg-emerald-900 text-emerald-300",
  "rejected": "bg-red-900 text-red-300",
  "needs-research": "bg-blue-900 text-blue-300",
  "resolved": "bg-green-900 text-green-300",
}

const STATE_DESCRIPTIONS: Record<string, string> = {
  "candidate": "Surfaced by the harness, awaiting your call.",
  "approved-alias": "You approved a merge. The alias is being applied to entities.jsonl (or already applied if the target entity existed).",
  "rejected": "You said no — won't be raised again unless appearance count jumps significantly.",
  "needs-research": "Marked 'don't know yet' — show in queue but don't act.",
  "resolved": "All done. Audit trail only.",
}

export default function LibrarianGapsPage() {
  const [records, setRecords] = useState<GapRecord[]>([])
  const [byState, setByState] = useState<Record<string, number>>({})
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<State>("candidate")
  const [onlyWithSimilar, setOnlyWithSimilar] = useState(false)
  const [minAppearances, setMinAppearances] = useState(0)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIdx, setSelectedIdx] = useState(0)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ state: filterState, limit: "500" })
      if (onlyWithSimilar) params.set("only_with_similar", "true")
      if (minAppearances > 0) params.set("min_appearances", String(minAppearances))
      const res = await fetch(`/api/librarian-gaps?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const data: ApiResponse = await res.json()
      setRecords(data.records)
      setByState(data.by_state || {})
      setTotalRecords(data.total_records || 0)
      setSelectedIdx(0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [filterState, onlyWithSimilar, minAppearances])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const decide = useCallback(async (record: GapRecord, action: "approve" | "reject" | "needs-research" | "candidate", target?: string, reason?: string) => {
    if (action === "approve" && !target) {
      const t = window.prompt(`Approve "${record.name}" as alias of which canonical entity?`, record.similar?.[0]?.name || "")
      if (!t || !t.trim()) return
      target = t.trim()
    }
    if (action === "reject") {
      const r = window.prompt(`Reject "${record.name}" — why? (optional, becomes the audit trail note)`, "")
      if (r === null) return
      reason = r.trim() || undefined
    }
    setSavingId(record.id)
    try {
      const res = await fetch("/api/librarian-gaps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, action, target, reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "decide failed")
      fetchRecords()
    } catch (e: unknown) {
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSavingId(null)
    }
  }, [fetchRecords])

  const filtered = useMemo(() => {
    if (!search) return records
    const lc = search.toLowerCase()
    return records.filter((r) =>
      r.name.toLowerCase().includes(lc) ||
      r.similar?.some((s) => s.name.toLowerCase().includes(lc))
    )
  }, [records, search])

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return
      if (filtered.length === 0) return
      if (e.key === "j") { setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); e.preventDefault() }
      else if (e.key === "k") { setSelectedIdx((i) => Math.max(i - 1, 0)); e.preventDefault() }
      else if (filterState === "candidate") {
        const r = filtered[selectedIdx]
        if (!r) return
        if (e.key === "a" && r.similar?.length) {
          decide(r, "approve", r.similar[0].name); e.preventDefault()
        } else if (e.key === "x") { decide(r, "reject"); e.preventDefault() }
        else if (e.key === "?") { decide(r, "needs-research"); e.preventDefault() }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [filtered, selectedIdx, decide, filterState])

  const stateCount = (s: string) => byState[s] || 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Librarian Gap Review"
        whatThisDoes="Wikilinks across the vault that point at names the librarian can't resolve. Each candidate is a name (e.g. 'IAFF PAC' appears 416× in donors / opposes / politicians-funded fields, but no entity in entities.jsonl carries that name as canonical or alias). Approving merges the name as an alias on a canonical entity — every wikilink resolves at once. Rejecting marks the name as junk so it stops surfacing."
        rightNow={`${totalRecords} total · ${stateCount("candidate")} candidates · ${stateCount("approved-alias")} approved · ${stateCount("rejected")} rejected · ${stateCount("needs-research")} researching`}
        action="j/k = nav · a = approve to top similar · x = reject · ? = research"
      />

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
        {/* Plain-language explainer */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-300">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-xs"
            onClick={() => setShowHelp((v) => !v)}
          >
            <span>{showHelp ? "▼" : "▶"}</span>
            <span>What is this page? (plain words)</span>
          </button>
          {showHelp && (
            <div className="mt-3 space-y-3 leading-relaxed">
              <p>
                Imagine a library where every book has nicknames listed in
                its index. When someone searches "IAFF PAC," the librarian
                checks the index. If the index doesn't have that nickname
                anywhere, the librarian says "I don't know what you mean"
                and gives up — even though the firefighters' union has a
                book on the shelf right there.
              </p>
              <p>
                <strong>Each row on this page is a nickname the librarian
                can't find.</strong> "IAFF PAC" appears 416 times across
                profiles. Every time, the link goes nowhere. Approving
                "IAFF PAC → International Association of Fire Fighters"
                adds the nickname to the index, and all 416 broken links
                fix themselves at once.
              </p>
              <p>
                The <strong>similar matches</strong> on each row are the
                librarian's guesses. <code className="bg-black/30 px-1 rounded">distance</code>{" "}
                = how many character edits away. Distance 1-2 are usually
                typos (Amgen Inc vs AMGEN INC.). Distance 3+ might be a
                real different entity — read carefully.
              </p>
              <p>
                Three buttons per row:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                <li><strong className="text-emerald-400">✓ Approve</strong> — pick a canonical, add the nickname as alias. Every wikilink with this name resolves immediately.</li>
                <li><strong className="text-blue-400">🔍 Research</strong> — "I don't know yet." Stays in queue, doesn't disappear, doesn't act.</li>
                <li><strong className="text-red-400">✗ Reject</strong> — "this is junk / not a real entity." Won't be raised again unless its appearance count jumps significantly.</li>
              </ul>
              <p className="text-xs text-gray-500">
                Decisions land via the editorial-decision-pipeline (provenance
                + change_log on every state transition). Once approved, the
                pipeline immediately tries to apply the alias to{" "}
                <code className="bg-black/30 px-1 rounded">entities.jsonl</code>.
                If the canonical doesn't exist as a row, the record stays
                in <code className="bg-black/30 px-1 rounded">approved-alias</code>{" "}
                state until it does (fail-soft).
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 rounded p-3">
          <select
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value as State)}
          >
            {STATES.map((s) => (
              <option key={s} value={s}>{s} ({stateCount(s)})</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyWithSimilar}
              onChange={(e) => setOnlyWithSimilar(e.target.checked)}
              className="accent-blue-600"
            />
            Only show candidates with librarian guesses
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            min appearances:
            <input
              type="number"
              min="0"
              value={minAppearances}
              onChange={(e) => setMinAppearances(parseInt(e.target.value || "0", 10))}
              className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none"
            />
          </label>

          <input
            type="text"
            placeholder="Search name…"
            className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading && <span className="text-blue-400 text-xs">Loading…</span>}
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-300 text-sm">{error}</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-gray-500 text-sm py-8 text-center bg-gray-900 border border-gray-800 rounded">
            {records.length === 0
              ? `No records in state="${filterState}".`
              : `Search "${search}" matched 0 of ${records.length} records.`}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="text-xs text-gray-500 px-1">
            Showing {filtered.length} of {totalRecords} · highest appearance count first
          </div>
        )}

        <div className="space-y-1">
          {filtered.map((r, idx) => {
            const isSaving = savingId === r.id
            const isSelected = idx === selectedIdx
            const isCandidate = r.state === "candidate"

            return (
              <div
                key={r.id}
                className={`bg-gray-900 border rounded p-3 space-y-2 ${isSelected ? "border-blue-700 ring-1 ring-blue-700/30" : "border-gray-800"}`}
                onClick={() => setSelectedIdx(idx)}
              >
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS[r.state] || "bg-gray-800 text-gray-300"}`}
                    title={STATE_DESCRIPTIONS[r.state] || r.state}
                  >
                    {r.state}
                  </span>
                  <span className="font-medium flex-1 truncate text-gray-100">{r.name}</span>
                  <span className="text-xs text-gray-500">{r.appearances || 0}× appearances</span>
                </div>

                <div className="text-xs text-gray-500">
                  by field:{" "}
                  {Object.entries(r.by_field || {}).map(([f, n]) => (
                    <span key={f} className="mr-2">
                      <span className="text-gray-400">{f}</span>=<span className="text-gray-300">{n}</span>
                    </span>
                  ))}
                </div>

                {/* Similar matches */}
                {r.similar && r.similar.length > 0 && (
                  <div className="text-xs space-y-1 bg-black/30 rounded p-2 border border-gray-800">
                    <div className="text-gray-500 uppercase text-[10px] tracking-wide">librarian's guesses:</div>
                    {r.similar.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-gray-300 flex-1">{s.name}</span>
                        <span className="text-[10px] text-gray-600" title={`Edit distance — ${s.distance} character${s.distance === 1 ? "" : "s"} different`}>
                          d={s.distance}
                        </span>
                        {isCandidate && (
                          <button
                            disabled={isSaving}
                            onClick={(e) => { e.stopPropagation(); decide(r, "approve", s.name) }}
                            className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 hover:bg-emerald-800 text-emerald-200 disabled:opacity-50"
                            title={`Approve as alias of ${s.name}`}
                          >
                            ✓ approve
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Sample profiles */}
                {Array.isArray(r.sample_profiles) && r.sample_profiles.length > 0 && (
                  <details className="text-xs">
                    <summary className="text-gray-500 cursor-pointer hover:text-gray-300">
                      sample profiles where this name appears ({r.sample_profiles.length})
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-3 font-mono">
                      {r.sample_profiles.slice(0, 5).map((p, i) => (
                        <li key={`${p}::${i}`} className="text-gray-500 break-all">{p}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Show resolution metadata when not candidate */}
                {!isCandidate && r.approved_alias_target && (
                  <div className="text-xs text-emerald-400">
                    approved as alias of: <span className="font-medium">{r.approved_alias_target}</span>
                  </div>
                )}
                {!isCandidate && r.rejected_reason && (
                  <div className="text-xs text-red-400">rejected: <span className="italic">"{r.rejected_reason}"</span></div>
                )}

                {/* Actions */}
                {isCandidate && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      disabled={isSaving}
                      onClick={(e) => { e.stopPropagation(); decide(r, "approve") }}
                      className="text-xs px-2 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded disabled:opacity-50"
                      title="Approve as alias of a canonical entity (you'll be prompted for the canonical name). Keyboard: a"
                    >
                      ✓ approve (custom)
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={(e) => { e.stopPropagation(); decide(r, "needs-research") }}
                      className="text-xs px-2 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded disabled:opacity-50"
                      title="Don't know yet — keep visible, don't act. Keyboard: ?"
                    >
                      🔍 research
                    </button>
                    <button
                      disabled={isSaving}
                      onClick={(e) => { e.stopPropagation(); decide(r, "reject") }}
                      className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded disabled:opacity-50"
                      title="This name is junk / not a real entity. Won't be raised again. Keyboard: x"
                    >
                      ✗ reject
                    </button>
                  </div>
                )}
                {!isCandidate && r.state !== "resolved" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      disabled={isSaving}
                      onClick={(e) => { e.stopPropagation(); decide(r, "candidate") }}
                      className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded disabled:opacity-50"
                      title="Send back to candidate triage"
                    >
                      ↶ back to candidate
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
