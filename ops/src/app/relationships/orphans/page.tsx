"use client"

/**
 * /relationships/orphans — ADR-0027 P2 ops UI.
 *
 * Editor triage queue for the frontmatter-orphan-candidates store. Each
 * record is a (profile, field, name) tuple where the librarian has no
 * backing edge for the name. The editor decides per case whether to:
 *   ✂ prune  — name is fake / typo / dead alias; remove on next
 *              rebuilder --apply-approved run (P3, not yet shipped)
 *   🔒 keep   — librarian doesn't see it, but it's real editorially
 *              (90-day suppression — re-evaluated then)
 *   🚧 librarian-gap — relationship is real, librarian is incomplete
 *              (e.g. FEC committee mapping not yet in the registry).
 *              Stays visible; auto-resolves when librarian fixes land.
 *
 * Per ADR-0027: no frontmatter writes happen here. State changes flow
 * to data/frontmatter-orphan-candidates.jsonl (canonical store, guarded
 * by canonical-store-sentinel). The actual prune is rebuilder --apply-
 * approved (P3).
 */

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/PageHeader"

type State = "candidate" | "approved-prune" | "kept" | "blocked-by-librarian-gap" | "resolved"

interface OrphanRecord {
  id: string
  profile_path: string
  subject: string
  field: string
  name: string
  in_opposes: boolean
  librarian_monetary_edges: number
  librarian_opposition_edges: number
  first_detected: string
  last_seen: string
  state: State
  resolved_at: string | null
  editorial_note: string | null
}

const STATES: State[] = ["candidate", "approved-prune", "kept", "blocked-by-librarian-gap", "resolved"]

const STATE_COLORS: Record<State, string> = {
  "candidate": "bg-yellow-900 text-yellow-300",
  "approved-prune": "bg-red-900 text-red-300",
  "kept": "bg-blue-900 text-blue-300",
  "blocked-by-librarian-gap": "bg-orange-900 text-orange-300",
  "resolved": "bg-green-900 text-green-300",
}

const STATE_DESCRIPTIONS: Record<State, string> = {
  "candidate": "Surfaced by the harness, awaiting your call.",
  "approved-prune": "You've decided this is a typo / dead alias. Will be stripped from frontmatter on next rebuilder --apply-approved run (P3).",
  "kept": "You've confirmed it's real even though the librarian can't see it. Suppressed for 90 days, then re-evaluated.",
  "blocked-by-librarian-gap": "Real relationship; librarian is incomplete (e.g. FEC committee mapping missing). Stays visible until librarian is fixed.",
  "resolved": "Name no longer in the frontmatter (auto-resolved or pruned). Audit trail only.",
}

const STATE_LABELS: Record<State, string> = {
  "candidate": "candidate",
  "approved-prune": "approved-prune",
  "kept": "keep",
  "blocked-by-librarian-gap": "librarian-gap",
  "resolved": "resolved",
}

export default function OrphanCandidatesPage() {
  const [records, setRecords] = useState<OrphanRecord[]>([])
  const [byState, setByState] = useState<Record<string, number>>({})
  const [totalRecords, setTotalRecords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterState, setFilterState] = useState<State>("candidate")
  const [onlyStrong, setOnlyStrong] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [search, setSearch] = useState("")

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ state: filterState, limit: "500" })
      if (onlyStrong) params.set("only_strong", "true")
      const res = await fetch(`/api/relationships/orphans?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setRecords(data.records)
      setByState(data.by_state || {})
      setTotalRecords(data.total_records || 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [filterState, onlyStrong])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const setState = useCallback(async (record: OrphanRecord, state: State, prompt?: string) => {
    let editorialNote: string | undefined
    if (prompt) {
      const note = window.prompt(prompt, record.editorial_note || "")
      if (note === null) return
      if (note.trim()) editorialNote = note.trim()
    }
    setSavingId(record.id)
    try {
      const res = await fetch("/api/relationships/orphans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id, state, editorial_note: editorialNote }),
      })
      if (!res.ok) throw new Error(await res.text())
      // Refresh — record's filter state changed, it'll drop from view
      fetchRecords()
    } catch (e: unknown) {
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSavingId(null)
    }
  }, [fetchRecords])

  const filtered = search
    ? records.filter(r =>
        r.subject.toLowerCase().includes(search.toLowerCase()) ||
        r.name.toLowerCase().includes(search.toLowerCase()),
      )
    : records

  const stateCount = (s: State) => byState[s] || 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Orphan Candidates"
        whatThisDoes={`${totalRecords} total · ${stateCount("candidate")} candidates · ${stateCount("approved-prune")} approved-prune · ${stateCount("kept")} kept · ${stateCount("blocked-by-librarian-gap")} librarian-gap · ${stateCount("resolved")} resolved`}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Help banner */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-300">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-xs"
            onClick={() => setShowHelp(v => !v)}
          >
            <span>{showHelp ? "▼" : "▶"}</span>
            <span>What is this page?</span>
          </button>
          {showHelp && (
            <div className="mt-3 space-y-2 leading-relaxed">
              <p>
                Frontmatter caches drift from canonical data over time. Names persist in <code className="bg-black/30 px-1 rounded">politicians-funded</code> / <code className="bg-black/30 px-1 rounded">donors</code> / <code className="bg-black/30 px-1 rounded">opposes</code> after the librarian's edges no longer support them — editorial typos, deprecated pipelines, hand-edits that never propagated.
              </p>
              <p>
                Per ADR-0027: the harness <strong>finds</strong> these orphans every 15 min; you <strong>triage</strong> per case here. No automatic frontmatter writes — your call drives state.
              </p>
              <p className="text-xs text-gray-400">
                <strong>✂ prune</strong> = real typo / dead alias, mark for deletion (rebuilder --apply-approved strips it on next run, P3 not yet shipped).<br/>
                <strong>🔒 keep</strong> = librarian doesn't see it but it's real editorially. 90-day suppression, then re-evaluated.<br/>
                <strong>🚧 librarian-gap</strong> = real relationship, librarian is incomplete (e.g. an unmapped FEC committee). Stays visible; auto-resolves when librarian is fixed.
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-900 border border-gray-800 rounded p-3">
          <select
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none"
            value={filterState}
            onChange={e => setFilterState(e.target.value as State)}
          >
            {STATES.map(s => (
              <option key={s} value={s}>
                {STATE_LABELS[s]} ({stateCount(s)})
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyStrong}
              onChange={e => setOnlyStrong(e.target.checked)}
              className="accent-blue-600"
            />
            Strong-signal only (in_opposes OR opposition edges)
          </label>

          <input
            type="text"
            placeholder="Search subject or name…"
            className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          {loading && <span className="text-blue-400 text-xs">Loading…</span>}
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-gray-500 text-sm py-8 text-center bg-gray-900 border border-gray-800 rounded">
            {records.length === 0
              ? `No records in state="${filterState}"${onlyStrong ? " with strong signal" : ""}.`
              : `Filter "${search}" matched 0 of ${records.length} records.`}
          </div>
        )}

        {/* Records */}
        {filtered.length > 0 && (
          <div className="space-y-1">
            {filtered.map(r => {
              const isSaving = savingId === r.id
              const signalChips = []
              if (r.in_opposes) signalChips.push(<span key="o" className="text-xs px-1.5 py-0.5 rounded bg-orange-950 text-orange-300" title="Name also appears in this profile's opposes field — strong editorial-typo signal">in-opposes</span>)
              if (r.librarian_opposition_edges > 0) signalChips.push(<span key="e" className="text-xs px-1.5 py-0.5 rounded bg-orange-950 text-orange-300" title={`Librarian has ${r.librarian_opposition_edges} opposition edge(s) for this pair — relationship is real, just not as funding`}>{r.librarian_opposition_edges} opp-edge{r.librarian_opposition_edges === 1 ? "" : "s"}</span>)

              return (
                <div key={r.id} className="bg-gray-900 border border-gray-800 rounded p-3 space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS[r.state]}`} title={STATE_DESCRIPTIONS[r.state]}>
                      {STATE_LABELS[r.state]}
                    </span>
                    <span className="font-medium flex-1 truncate">
                      <span className="text-gray-300">{r.subject}</span>
                      <span className="text-gray-600 mx-2">·</span>
                      <span className="text-gray-500 text-xs">{r.field}</span>
                      <span className="text-gray-600 mx-2">↛</span>
                      <span className="text-gray-200">{r.name}</span>
                    </span>
                    {signalChips}
                  </div>

                  <div className="text-xs text-gray-500">
                    <span className="font-mono">{r.profile_path}</span>
                    <span className="text-gray-700 mx-2">·</span>
                    first detected {r.first_detected.slice(0, 10)}
                    {r.editorial_note && (
                      <>
                        <span className="text-gray-700 mx-2">·</span>
                        <span className="text-gray-400 italic">"{r.editorial_note}"</span>
                      </>
                    )}
                  </div>

                  {/* Actions (only show for candidate state) */}
                  {r.state === "candidate" && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        className="text-xs px-2 py-1 bg-red-900 hover:bg-red-800 text-red-200 rounded disabled:opacity-50"
                        disabled={isSaving}
                        onClick={() => setState(r, "approved-prune", `Prune "${r.name}" from ${r.subject}'s ${r.field} field?\n\nWill be stripped on the next rebuilder --apply-approved run (P3, not yet shipped).\n\nOptional editorial note (why pruning):`)}
                        title="Real typo / dead alias — mark for deletion"
                      >
                        ✂ prune
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded disabled:opacity-50"
                        disabled={isSaving}
                        onClick={() => setState(r, "kept", `Keep "${r.name}" even though librarian can't see it?\n\nSuppressed for 90 days, then re-evaluated.\n\nOptional editorial note (why keep):`)}
                        title="Real editorially — librarian just doesn't see it"
                      >
                        🔒 keep
                      </button>
                      <button
                        className="text-xs px-2 py-1 bg-orange-900 hover:bg-orange-800 text-orange-200 rounded disabled:opacity-50"
                        disabled={isSaving}
                        onClick={() => setState(r, "blocked-by-librarian-gap", `Mark as librarian-gap?\n\nThe relationship is real but the librarian's resolver doesn't currently map it (e.g. unmapped FEC committee). Stays visible until the librarian is fixed; auto-resolves when it is.\n\nOptional editorial note (which librarian fix would close this):`)}
                        title="Relationship real, librarian incomplete (e.g. unmapped committee)"
                      >
                        🚧 librarian-gap
                      </button>
                    </div>
                  )}

                  {/* Undo for non-candidate states */}
                  {r.state !== "candidate" && r.state !== "resolved" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded disabled:opacity-50"
                        disabled={isSaving}
                        onClick={() => setState(r, "candidate")}
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
        )}
      </div>
    </div>
  )
}
