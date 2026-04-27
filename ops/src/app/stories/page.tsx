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

type StoryState = "candidate" | "draft" | "ready" | "published" | "archived"
type Severity = "very-low" | "low" | "medium" | "high" | "very-high"
type IntegrityStatus = "ok" | "stale" | "broken-ref" | "duplicate"

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
  archive_reason?: string | null
  integrity_status?: IntegrityStatus
  integrity_note?: string | null
}

// Promotion path. Archived is OUT of this flow — entered via explicit archive.
const STATE_ORDER: StoryState[] = ["candidate", "draft", "ready", "published"]

// What each state means, in plain English. Shown on hover.
const STATE_DESCRIPTIONS: Record<StoryState, string> = {
  candidate: "Auto-detected by a pattern miner. Not yet reviewed by you. Triage from here.",
  draft:     "You've claimed this and are working on it. Editorial in progress.",
  ready:     "Editorial complete. Ready to publish — only your manual click moves it to published.",
  published: "Live on the public site. Only state visible to readers.",
  archived:  "Rejected as false-positive or no longer relevant. Hidden from default view but preserved for audit. False-positive log updated so the detector won't re-surface the same pattern.",
}

const STATE_COLORS: Record<StoryState, string> = {
  candidate: "bg-gray-700 text-gray-200",
  draft:     "bg-blue-900 text-blue-200",
  ready:     "bg-yellow-900 text-yellow-200",
  published: "bg-green-900 text-green-200",
  archived:  "bg-red-950 text-red-400 line-through",
}

const SEVERITY_DESCRIPTIONS: Record<Severity, string> = {
  "very-low":  "Confidence 1/5 — weak signal, likely noise. Probably archive.",
  "low":       "Confidence 2/5 — possible but unlikely to be a real story.",
  "medium":    "Confidence 3/5 — worth a glance, may or may not pan out.",
  "high":      "Confidence 4/5 — strong signal. Worth verifying.",
  "very-high": "Confidence 5/5 — strongest pattern. Most likely a real contradiction.",
}

const INTEGRITY_BADGES: Record<IntegrityStatus, { label: string; tooltip: string; color: string }> = {
  "ok":         { label: "",                tooltip: "",                                                                                                       color: "" },
  "stale":      { label: "⚠ stale",         tooltip: "The pattern that triggered this candidate no longer exists in the source profile. The data has been edited since detection. Consider archiving.",  color: "bg-yellow-900 text-yellow-300" },
  "broken-ref": { label: "⚠ broken ref",    tooltip: "The linked entity (subject or counterparty) doesn't resolve to a known profile or entity record. Probably an alias mismatch or a deleted entity.", color: "bg-orange-900 text-orange-300" },
  "duplicate":  { label: "⚠ duplicate",     tooltip: "Another story already covers this same subject + counterparty pair. One of them should be archived.",                                                color: "bg-red-900 text-red-300" },
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

// Default view excludes archived (which is what "all-active" means).
// The dropdown also offers "archived" as an explicit choice and "all-incl-archived"
// to see everything including archived.
const ALL_STATES: Array<StoryState | "all-active" | "all-incl-archived"> = [
  "all-active", "candidate", "draft", "ready", "published", "archived", "all-incl-archived",
]
const STATE_FILTER_LABELS: Record<string, string> = {
  "all-active":         "All (excl. archived)",
  "candidate":          "Candidate",
  "draft":              "Draft",
  "ready":              "Ready",
  "published":          "Published",
  "archived":           "Archived",
  "all-incl-archived":  "All (incl. archived)",
}

/**
 * Rewrite the auto-generated headline into something more readable.
 * Original: "Cori Bush has Fairshake PAC in both donors and opposes"
 * Better:   "Fairshake PAC: appears as both donor AND opponent of Cori Bush"
 *
 * Falls back to the raw headline if the pattern doesn't match.
 */
function prettyHeadline(s: Story): string {
  const h = s.headline
  if (s.detector_type === "both-sides") {
    const m = h.match(/^(.+?) has (.+?) in both donors and opposes$/i)
    if (m) return `${m[2]}: appears as both donor AND opponent of ${m[1]}`
  }
  if (s.detector_type === "cross-party") {
    const m = h.match(/^(.+?) funds both major parties$/i)
    if (m) return `${m[1]}: funds candidates from both major parties`
  }
  if (s.detector_type === "committee-capture") {
    const m = h.match(/^(.+?) funds (\d+) (.+?) committee members$/i)
    if (m) return `${m[1]}: bankrolls ${m[2]} members of the ${m[3]} committee`
  }
  return h
}

/**
 * Extract the wikilink target from a linked-entity ref so we can build
 * an "open profile" link. Falls back to a search query if the ref isn't
 * a wikilink.
 */
function entityHref(ref: string): string {
  const m = ref.match(/^\[\[(.+?)\]\]$/)
  if (m) return `/profile?title=${encodeURIComponent(m[1])}`
  return `/profile?search=${encodeURIComponent(ref)}`
}
const ALL_SEVERITIES: Array<Severity | "all"> = ["all", "very-high", "high", "medium", "low", "very-low"]

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterState, setFilterState] = useState<string>("all-active")
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [search, setSearch] = useState("")

  const [showHelp, setShowHelp] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesText, setNotesText] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const fetchStories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: "500" })
      // "all-active" and "all-incl-archived" are client-side filters; they
      // don't map to a single state on the API, so we fetch everything and
      // filter in-memory.
      if (filterState !== "all-active" && filterState !== "all-incl-archived") {
        params.set("state", filterState)
      }
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
    if (idx >= 0 && idx < STATE_ORDER.length - 1) patch(story.id, { state: STATE_ORDER[idx + 1] })
  }

  const demoteState = (story: Story) => {
    const idx = STATE_ORDER.indexOf(story.state)
    if (idx > 0) patch(story.id, { state: STATE_ORDER[idx - 1] })
  }

  const archiveStory = (story: Story) => {
    const reason = prompt(
      `Archive this story?\n\n"${story.headline}"\n\nReason (optional — recorded to false-positive log so the detector won't re-surface this exact pattern):`,
      "false-positive: alias mismatch / not a real contradiction",
    )
    if (reason === null) return
    patch(story.id, { state: "archived", archive_reason: reason || null })
  }

  const unarchiveStory = (story: Story) => {
    if (!confirm("Restore this story to candidate state? Note: the false-positive log entry stays — re-archive if you want to suppress again.")) return
    patch(story.id, { state: "candidate", archive_reason: null })
  }

  const saveNotes = (story: Story) => {
    patch(story.id, { editorial_notes: notesText || null })
    setEditingNotes(null)
  }

  const filtered = stories.filter(s => {
    // Client-side state filter for the synthetic "all-active" / "all-incl-archived" options
    if (filterState === "all-active" && s.state === "archived") return false
    // (filterState === "all-incl-archived" passes everything; specific states filtered server-side)

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
  const stateCounts: Record<string, number> = {}
  for (const s of stories) {
    stateCounts[s.state] = (stateCounts[s.state] || 0) + 1
  }
  const integrityWarnings = stories.filter(s => s.integrity_status && s.integrity_status !== "ok").length

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Stories"
        whatThisDoes={`${total} total · ${stateCounts.candidate ?? 0} candidates · ${stateCounts.draft ?? 0} drafts · ${stateCounts.ready ?? 0} ready · ${stateCounts.published ?? 0} published${stateCounts.archived ? ` · ${stateCounts.archived} archived` : ""}${integrityWarnings ? ` · ⚠ ${integrityWarnings} flagged` : ""}`}
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Help banner — explains what this page is in plain English */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-300">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-xs"
            onClick={() => setShowHelp(v => !v)}
          >
            <span>{showHelp ? "▼" : "▶"}</span>
            <span>What is this page?</span>
          </button>
          {showHelp && (
            <div className="mt-3 space-y-2 text-gray-300 leading-relaxed">
              <p>
                <strong className="text-gray-100">Stories are auto-detected story candidates.</strong>{" "}
                A pattern miner script scans the vault for narrative-shaped findings — like
                "this PAC appears in both the donor list AND the opponents list of the same
                politician" — and lands them here for you to triage.
              </p>
              <p>
                <strong className="text-gray-100">A candidate is NOT a confirmed story.</strong>{" "}
                The detector found the pattern in the data, but that could be a real
                contradiction, an alias mismatch, a stale entry, or a schema confusion. Your job
                is to decide which.
              </p>
              <p>
                <strong className="text-gray-100">State flow (left to right, you control all moves):</strong>
              </p>
              <ul className="space-y-1 ml-4 text-xs">
                <li><span className="inline-block w-20"><span className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS.candidate}`}>candidate</span></span> {STATE_DESCRIPTIONS.candidate}</li>
                <li><span className="inline-block w-20"><span className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS.draft}`}>draft</span></span> {STATE_DESCRIPTIONS.draft}</li>
                <li><span className="inline-block w-20"><span className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS.ready}`}>ready</span></span> {STATE_DESCRIPTIONS.ready}</li>
                <li><span className="inline-block w-20"><span className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS.published}`}>published</span></span> {STATE_DESCRIPTIONS.published}</li>
                <li><span className="inline-block w-20"><span className={`text-xs px-2 py-0.5 rounded ${STATE_COLORS.archived}`}>archived</span></span> {STATE_DESCRIPTIONS.archived}</li>
              </ul>
              <p>
                <strong className="text-gray-100">Severity</strong> is the detector's confidence (very-low → very-high), not a publish gate. It's a triage signal — you still decide what publishes.
              </p>
              <p className="text-xs text-gray-500">
                Detector source: <code className="bg-gray-800 px-1 rounded">scripts/contradiction-miner.cjs</code>. False-positive log: <code className="bg-gray-800 px-1 rounded">data/false-positive-log.jsonl</code>. Canonical store: <code className="bg-gray-800 px-1 rounded">data/stories.jsonl</code>.
              </p>
            </div>
          )}
        </div>

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
            onChange={e => setFilterState(e.target.value)}
            title="Filter by review state. 'All (excl. archived)' is the default and hides rejected items."
          >
            {ALL_STATES.map(s => (
              <option key={s} value={s}>{STATE_FILTER_LABELS[s] ?? s}</option>
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
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        story.severity === "very-high" ? "bg-red-500" :
                        story.severity === "high"      ? "bg-orange-400" :
                        story.severity === "medium"    ? "bg-yellow-400" :
                        story.severity === "low"       ? "bg-gray-400" :
                                                         "bg-gray-600"
                      }`}
                      title={SEVERITY_DESCRIPTIONS[story.severity]}
                    />

                    {/* Headline (rewritten for readability) */}
                    <span className="flex-1 text-sm font-medium truncate" title={story.headline}>
                      {prettyHeadline(story)}
                    </span>

                    {/* Integrity warning badge */}
                    {story.integrity_status && story.integrity_status !== "ok" && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${INTEGRITY_BADGES[story.integrity_status].color}`}
                        title={INTEGRITY_BADGES[story.integrity_status].tooltip}
                      >
                        {INTEGRITY_BADGES[story.integrity_status].label}
                      </span>
                    )}

                    {/* Type badge */}
                    <span className="text-xs text-gray-400 hidden sm:block flex-shrink-0">
                      {TYPE_LABELS[story.detector_type] ?? story.detector_type}
                    </span>

                    {/* Severity badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${SEVERITY_COLORS[story.severity]}`}
                      title={SEVERITY_DESCRIPTIONS[story.severity]}
                    >
                      {story.severity}
                    </span>

                    {/* State badge */}
                    <span
                      className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${STATE_COLORS[story.state]}`}
                      title={STATE_DESCRIPTIONS[story.state]}
                    >
                      {story.state}
                    </span>

                    {/* Promote button (or restore for archived) */}
                    {story.state !== "published" && story.state !== "archived" && (
                      <button
                        className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded flex-shrink-0 disabled:opacity-50"
                        disabled={isSaving}
                        onClick={e => { e.stopPropagation(); promoteState(story) }}
                        title={`Move to ${STATE_ORDER[STATE_ORDER.indexOf(story.state) + 1]}`}
                      >
                        ↑ {STATE_ORDER[STATE_ORDER.indexOf(story.state) + 1]}
                      </button>
                    )}
                    {story.state === "archived" && (
                      <button
                        className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 rounded flex-shrink-0 disabled:opacity-50"
                        disabled={isSaving}
                        onClick={e => { e.stopPropagation(); unarchiveStory(story) }}
                        title="Restore to candidate state"
                      >
                        ↻ restore
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
                          {story.linked_entities.map((e, i) => {
                            const cleanRef = e.ref.replace(/^\[\[/, "").replace(/\]\]$/, "")
                            const roleColor =
                              e.role === "subject"      ? "border-blue-700 text-blue-300 hover:bg-blue-950" :
                              e.role === "counterparty" ? "border-orange-700 text-orange-300 hover:bg-orange-950" :
                                                          "border-gray-700 text-gray-400 hover:bg-gray-800"
                            return (
                              <a
                                key={i}
                                href={entityHref(e.ref)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs px-2 py-0.5 rounded border ${roleColor} transition-colors`}
                                title={`Open ${cleanRef} in Profile View (new tab)`}
                              >
                                {cleanRef}
                                <span className="text-gray-600 ml-1">·{e.role}</span>
                                <span className="text-gray-600 ml-1">↗</span>
                              </a>
                            )
                          })}
                        </div>
                      )}

                      {/* Integrity warning detail */}
                      {story.integrity_status && story.integrity_status !== "ok" && (
                        <div className={`text-xs p-2 rounded ${INTEGRITY_BADGES[story.integrity_status].color}`}>
                          <strong>{INTEGRITY_BADGES[story.integrity_status].label}</strong>
                          {" — "}
                          {story.integrity_note || INTEGRITY_BADGES[story.integrity_status].tooltip}
                        </div>
                      )}

                      {/* Archive reason (when archived) */}
                      {story.state === "archived" && story.archive_reason && (
                        <div className="text-xs p-2 rounded bg-red-950/40 border border-red-900 text-red-300">
                          <strong>Archive reason:</strong> {story.archive_reason}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>detector: {story.detector}</span>
                        <span title={SEVERITY_DESCRIPTIONS[story.severity]}>confidence: {story.confidence}/5</span>
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

                        {/* State controls (hidden when archived; restore button in row header handles that) */}
                        {story.state !== "archived" && (
                          <>
                            {story.state !== "candidate" && STATE_ORDER.indexOf(story.state) > 0 && (
                              <button
                                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                                disabled={isSaving}
                                onClick={() => demoteState(story)}
                                title={STATE_DESCRIPTIONS[STATE_ORDER[STATE_ORDER.indexOf(story.state) - 1]]}
                              >
                                ↓ back to {STATE_ORDER[STATE_ORDER.indexOf(story.state) - 1]}
                              </button>
                            )}
                            {story.state !== "published" && (
                              <button
                                className="text-xs px-2 py-1 bg-blue-800 hover:bg-blue-700 rounded disabled:opacity-50"
                                disabled={isSaving}
                                onClick={() => promoteState(story)}
                                title={STATE_DESCRIPTIONS[STATE_ORDER[STATE_ORDER.indexOf(story.state) + 1]]}
                              >
                                ↑ promote to {STATE_ORDER[STATE_ORDER.indexOf(story.state) + 1]}
                              </button>
                            )}
                            {/* Archive — kicks the candidate out of triage and writes false-positive log */}
                            <button
                              className="text-xs px-2 py-1 bg-red-950 text-red-400 hover:bg-red-900 hover:text-red-300 rounded disabled:opacity-50"
                              disabled={isSaving}
                              onClick={() => archiveStory(story)}
                              title={STATE_DESCRIPTIONS.archived}
                            >
                              🗑 archive
                            </button>
                          </>
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
