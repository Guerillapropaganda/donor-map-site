"use client"

/**
 * /stories — Story candidate triage page
 *
 * Shows all auto-detected story candidates from data/stories.jsonl.
 * David triages here: promote state, adjust severity, add editorial notes.
 *
 * State flow: candidate → draft → ready → published
 * Severity: advisory display only — David decides what publishes.
 *
 * Each row shows: headline, detector type, severity badge, state badge,
 * linked entities, and action buttons to promote/demote state.
 */

import { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/PageHeader"

type EntityRole = "subject" | "counterparty" | "mentioned"
interface LinkedEntity {
  ref: string
  role: EntityRole
}

type StoryState = "candidate" | "draft" | "ready" | "published"
type Severity = "very-low" | "low" | "medium" | "high" | "very-high"

interface Story {
  id: string
  slug: string
  headline: string
  detector: string
  detector_type: string
  confidence: number
  severity: Severity
  state: StoryState
  linked_entities: LinkedEntity[]
  summary: string
  editorial_notes: string | null
  requires_legal_review: boolean
  first_detected: string
  last_updated: string
}

const STATE_ORDER: StoryState[] = ["candidate", "draft", "ready", "published"]

const STATE_COLORS: Record<StoryState, string> = {
  candidate: "bg-gray-700 text-gray-200",
  draft:     "bg-blue-900 text-blue-200",
  ready:     "bg-yellow-900 text-yellow-200",
  published: "bg-green-900 text-green-200",
}

const SEVERITY_COLORS: Record<Severity, string> = {
  "very-low":  "bg-gray-800 text-gray-400",
  "low":       "bg-gray-700 text-gray-300",
  "medium":    "bg-yellow-900 text-yellow-300",
  "high":      "bg-orange-900 text-orange-300",
  "very-high": "bg-red-900 text-red-300",
}

const SEVERITY_LEVELS: Severity[] = ["very-low", "low", "medium", "high", "very-high"]

const TYPE_LABELS: Record<string, string> = {
  "both-sides":               "Both Sides",
  "cross-party":              "Cross-Party",
  "issue-contradiction":      "Issue ↔ Donor",
  "committee-capture":        "Cmte Capture",
  "offshore-exposure":        "Offshore",
  "policy-capture-sponsorship": "Policy Capture",
  "unusual-stock-activity":   "Stock Activity",
  "cross-policy-recurrence":  "Cross-Policy",
  "timing-proximity":         "Timing",
}

const ALL_STATES: Array<StoryState | "all"> = ["all", "candidate", "draft", "ready", "published"]
const ALL_SEVERITIES: Array<Severity | "all"> = ["all", "very-high", "high", "medium", "low", "very-low"]

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterState, setFilterState] = useState<StoryState | "all">("all")
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [search, setSearch] = useState("")

  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesText, setNotesText] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const fetchStories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: "500" })
      if (filterState !== "all") params.set("state", filterState)
      if (filterSeverity !== "all") params.set("severity", filterSeverity)
      if (filterType !== "all") params.set("detector_type", filterType)
      const res = await fetch(`/api/stories?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStories(data.stories)
      setTotal(data.total)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [filterState, filterSeverity, filterType])

  useEffect(() => { fetchStories() }, [fetchStories])

  const patch = useCallback(async (id: string, update: Record<string, unknown>) => {
    setSaving(id)
    try {
      const res = await fetch("/api/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...update }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStories(prev => prev.map(s => s.id === id ? data.story : s))
    } catch (e: unknown) {
      alert(`Save failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSaving(null)
    }
  }, [])

  const promoteState = (story: Story) => {
    const idx = STATE_ORDER.indexOf(story.state)
    if (idx < STATE_ORDER.length - 1) patch(story.id, { state: STATE_ORDER[idx + 1] })
  }

  const demoteState = (story: Story) => {
    const idx = STATE_ORDER.indexOf(story.state)
    if (idx > 0) patch(story.id, { state: STATE_ORDER[idx - 1] })
  }

  const saveNotes = (story: Story) => {
    patch(story.id, { editorial_notes: notesText || null })
    setEditingNotes(null)
  }

  const filtered = stories.filter(s => {
    if (search) {
      const q = search.toLowerCase()
      if (!s.headline.toLowerCase().includes(q) &&
          !s.summary.toLowerCase().includes(q) &&
          !s.linked_entities.some(e => e.ref.toLowerCase().includes(q))) return false
    }
    return true
  })

  // Collect distinct detector types for the filter
  const allTypes = Array.from(new Set(stories.map(s => s.detector_type))).sort()

  // Counts by state for the header chips
  const stateCounts = STATE_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = stories.filter(x => x.state === s).length
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Stories"
        whatThisDoes={`${total} total · ${stateCounts.candidate ?? 0} candidates · ${stateCounts.draft ?? 0} drafts · ${stateCounts.ready ?? 0} ready · ${stateCounts.published ?? 0} published`}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-gray-500"
            placeholder="Search headlines, entities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none"
            value={filterState}
            onChange={e => setFilterState(e.target.value as StoryState | "all")}
          >
            {ALL_STATES.map(s => (
              <option key={s} value={s}>{s === "all" ? "All states" : s}</option>
            ))}
          </select>

          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none"
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value as Severity | "all")}
          >
            {ALL_SEVERITIES.map(s => (
              <option key={s} value={s}>{s === "all" ? "All severities" : s}</option>
            ))}
          </select>

          <select
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm focus:outline-none"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">All types</option>
            {allTypes.map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>

          <span className="text-gray-500 text-sm ml-auto">
            {filtered.length} shown
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-gray-500 text-sm py-4">Loading stories…</div>
        )}

        {/* Table */}
        {!loading && filtered.length === 0 && (
          <div className="text-gray-500 text-sm py-8 text-center">
            No stories match the current filters.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="space-y-1">
            {filtered.map(story => {
              const isExpanded = expanded === story.id
              const isSaving = saving === story.id

              return (
                <div
                  key={story.id}
                  className="bg-gray-900 border border-gray-800 rounded overflow-hidden"
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-800/50"
                    onClick={() => setExpanded(isExpanded ? null : story.id)}
                  >
                    {/* Severity dot */}
                    <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                      story.severity === "very-high" ? "bg-red-500" :
                      story.severity === "high"      ? "bg-orange-400" :
                      story.severity === "medium"    ? "bg-yellow-400" :
                      story.severity === "low"       ? "bg-gray-400" :
                                                       "bg-gray-600"
                    }`} />

                    {/* Headline */}
                    <span className="flex-1 text-sm font-medium truncate">
                      {story.headline}
                    </span>

                    {/* Type badge */}
                    <span className="text-xs text-gray-400 hidden sm:block flex-shrink-0">
                      {TYPE_LABELS[story.detector_type] ?? story.detector_type}
                    </span>

                    {/* Severity badge */}
                    <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${SEVERITY_COLORS[story.severity]}`}>
                      {story.severity}
                    </span>

                    {/* State badge */}
                    <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${STATE_COLORS[story.state]}`}>
                      {story.state}
                    </span>

                    {/* Promote button */}
                    {story.state !== "published" && (
                      <button
                        className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded flex-shrink-0 disabled:opacity-50"
                        disabled={isSaving}
                        onClick={e => { e.stopPropagation(); promoteState(story) }}
                      >
                        ↑ {STATE_ORDER[STATE_ORDER.indexOf(story.state) + 1]}
                      </button>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 px-4 py-3 space-y-3 text-sm">
                      {/* Summary / angle */}
                      {story.summary && (
                        <p className="text-gray-300 leading-relaxed">{story.summary}</p>
                      )}

                      {/* Linked entities */}
                      {story.linked_entities.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {story.linked_entities.map((e, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2 py-0.5 rounded border ${
                                e.role === "subject"      ? "border-blue-700 text-blue-300" :
                                e.role === "counterparty" ? "border-orange-700 text-orange-300" :
                                                            "border-gray-700 text-gray-400"
                              }`}
                            >
                              {e.ref.replace(/^\[\[/, "").replace(/\]\]$/, "")}
                              <span className="text-gray-600 ml-1">·{e.role}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>detector: {story.detector}</span>
                        <span>confidence: {story.confidence}/5</span>
                        <span>first detected: {story.first_detected.slice(0, 10)}</span>
                        {story.requires_legal_review && (
                          <span className="text-red-400">⚠ legal review required</span>
                        )}
                      </div>

                      {/* Editorial notes */}
                      <div>
                        {editingNotes === story.id ? (
                          <div className="space-y-2">
                            <textarea
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-200 h-24 resize-none focus:outline-none focus:border-gray-500"
                              value={notesText}
                              onChange={e => setNotesText(e.target.value)}
                              placeholder="Editorial notes (visible only in ops)…"
                            />
                            <div className="flex gap-2">
                              <button
                                className="text-xs px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded disabled:opacity-50"
                                disabled={isSaving}
                                onClick={() => saveNotes(story)}
                              >
                                Save
                              </button>
                              <button
                                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                                onClick={() => setEditingNotes(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <p className="text-gray-400 text-xs flex-1">
                              {story.editorial_notes || <span className="italic">No editorial notes</span>}
                            </p>
                            <button
                              className="text-xs text-gray-600 hover:text-gray-400 flex-shrink-0"
                              onClick={() => {
                                setEditingNotes(story.id)
                                setNotesText(story.editorial_notes || "")
                              }}
                            >
                              ✎ notes
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Action row */}
                      <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-800">
                        {/* Severity override */}
                        <select
                          className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none"
                          value={story.severity}
                          onChange={e => patch(story.id, { severity: e.target.value })}
                          disabled={isSaving}
                        >
                          {SEVERITY_LEVELS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        {/* State controls */}
                        {story.state !== "candidate" && (
                          <button
                            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                            disabled={isSaving}
                            onClick={() => demoteState(story)}
                          >
                            ↓ back to {STATE_ORDER[STATE_ORDER.indexOf(story.state) - 1]}
                          </button>
                        )}
                        {story.state !== "published" && (
                          <button
                            className="text-xs px-2 py-1 bg-blue-800 hover:bg-blue-700 rounded disabled:opacity-50"
                            disabled={isSaving}
                            onClick={() => promoteState(story)}
                          >
                            ↑ promote to {STATE_ORDER[STATE_ORDER.indexOf(story.state) + 1]}
                          </button>
                        )}

                        {/* Legal review flag */}
                        <button
                          className={`text-xs px-2 py-1 rounded disabled:opacity-50 ${
                            story.requires_legal_review
                              ? "bg-red-900 text-red-300 hover:bg-red-800"
                              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                          disabled={isSaving}
                          onClick={() => patch(story.id, { requires_legal_review: !story.requires_legal_review })}
                        >
                          {story.requires_legal_review ? "⚠ legal review ON" : "flag legal review"}
                        </button>
                      </div>
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
