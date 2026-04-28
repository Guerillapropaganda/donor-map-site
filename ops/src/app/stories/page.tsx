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

/** Lowercase + collapse whitespace, for matching counterparty names */
function normalize(s: string): string {
  return String(s).toLowerCase().trim().replace(/\s+/g, " ")
}

/** Compact dollar format: $2.4M / $890k / $1,500 */
function fmtMoney(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n) || n === 0) return "$0"
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M"
  if (abs >= 10_000) return "$" + (n / 1_000).toFixed(0) + "k"
  if (abs >= 1_000) return "$" + (n / 1_000).toFixed(1).replace(/\.?0+$/, "") + "k"
  return "$" + n.toFixed(0)
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

  // Bulk-action state: tracks which stories are selected via checkbox.
  // The bulk-action bar appears whenever this set is non-empty.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)

  // Per-story verification result: cached after a /api/stories/verify call.
  // Cleared when the user clicks Verify again on the same story (re-fetches).
  interface VerifyResult {
    verdict: "confirmed" | "stale" | "alias-mismatch" | "profile-not-found" | "no-counterparty"
    subject_profile?: string | null
    subject_ref?: string
    counterparty_ref?: string
    counterparty_in_donors?: boolean
    counterparty_in_opposes?: boolean
    donors_count?: number
    opposes_count?: number
    donors_sample?: string[]
    opposes_sample?: string[]
    alias_candidates?: Array<{ source: string; value: string; distance: number }>
    checked_at?: string
    message?: string
  }
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({})
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  // Per-story money/evidence panels. Money is shallow (subject↔counterparty
  // edges only). Evidence is deep (adds shared donors + cross-targets).
  // Both keyed by story.id; setting an entry shows the panel.
  interface MoneyEdgeView {
    from: string
    to: string
    amount: number | null
    cycle: string | number | null
    source: string
    source_url: string | null
    category: string
    label: string
    evidence: string[]
  }
  interface MoneyBucketView {
    total_amount: number
    edge_count: number
    top_edges: MoneyEdgeView[]
  }
  interface PairView {
    subject_ref: string
    counterparty_ref: string
    resolved: { subject: { name: string; type: string; profile_path: string | null } | null; counterparty: { name: string; type: string; profile_path: string | null } | null }
    unresolved_reason: string | null
    money_for: MoneyBucketView
    money_against: MoneyBucketView
    other_money: MoneyBucketView
    non_money_edges: { category: string; label: string; count: number }[]
  }
  interface MoneyResult {
    supported: boolean
    reason?: string | null
    pair?: PairView
    checked_at?: string
  }
  interface EvidenceResult {
    evidence: {
      pair: PairView
      shared_donors: { name: string; to_subject_amount: number; to_counterparty_amount: number; combined_amount: number }[]
      cross_targets: { subject_name: string; subject_profile_path: string | null; money_for_amount: number; money_against_amount: number; has_political_opposition_edge: boolean }[]
      notes: string[]
    }
    checked_at: string
  }
  const [moneyResults, setMoneyResults] = useState<Record<string, MoneyResult>>({})
  const [evidenceResults, setEvidenceResults] = useState<Record<string, EvidenceResult>>({})
  const [moneyLoadingId, setMoneyLoadingId] = useState<string | null>(null)
  const [evidenceLoadingId, setEvidenceLoadingId] = useState<string | null>(null)
  const [draftLoadingId, setDraftLoadingId] = useState<string | null>(null)

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

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllInView = () => {
    setSelected(new Set(filtered.map(s => s.id)))
  }

  const clearSelection = () => setSelected(new Set())

  /** Bulk PATCH — sends an `ids: []` payload, refreshes from API result. */
  const bulkPatch = useCallback(async (update: Record<string, unknown>) => {
    if (selected.size === 0) return
    setBulkSaving(true)
    try {
      const res = await fetch("/api/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], ...update }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const updatedById = new Map<string, Story>(
        (data.stories as Story[]).map((s) => [s.id, s]),
      )
      setStories(prev => prev.map(s => updatedById.get(s.id) ?? s))
      // Don't auto-clear selection — user may want to chain actions
    } catch (e: unknown) {
      alert(`Bulk save failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBulkSaving(false)
    }
  }, [selected])

  const bulkArchive = () => {
    const reason = prompt(
      `Archive ${selected.size} stor${selected.size === 1 ? "y" : "ies"}?\n\nReason (recorded to false-positive log so the detector won't re-surface these patterns):`,
      "false-positive: bulk-rejected",
    )
    if (reason === null) return
    bulkPatch({ state: "archived", archive_reason: reason || null })
  }

  const showMoney = async (story: Story) => {
    setMoneyLoadingId(story.id)
    try {
      const res = await fetch(`/api/stories/money?id=${encodeURIComponent(story.id)}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as MoneyResult
      setMoneyResults(prev => ({ ...prev, [story.id]: data }))
    } catch (e: unknown) {
      alert(`Money trail failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setMoneyLoadingId(null)
    }
  }

  const showEvidence = async (story: Story) => {
    setEvidenceLoadingId(story.id)
    try {
      const res = await fetch(`/api/stories/evidence?id=${encodeURIComponent(story.id)}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as EvidenceResult
      setEvidenceResults(prev => ({ ...prev, [story.id]: data }))
    } catch (e: unknown) {
      alert(`Evidence failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setEvidenceLoadingId(null)
    }
  }

  const draftFromEvidence = async (story: Story) => {
    const hasNotes = !!(story.editorial_notes && story.editorial_notes.trim())
    const willReplace = hasNotes && story.editorial_notes!.includes("## Evidence brief")
      ? confirm("This story already has an auto-generated evidence brief. Re-generate? (Old brief replaced; any framing notes you wrote outside the brief are preserved.)")
      : true
    if (!willReplace) return
    if (hasNotes && !story.editorial_notes!.includes("## Evidence brief")) {
      if (!confirm("This story has hand-written editorial notes. Append the auto-brief beneath them?")) return
    }
    setDraftLoadingId(story.id)
    try {
      const res = await fetch("/api/stories/draft-from-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: story.id, replace: false }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStories(prev => prev.map(s => s.id === story.id ? data.story : s))
      const sum = data.evidence_summary
      const lines = [
        `Evidence brief written. State: ${data.previous_state} → ${data.story.state}.`,
        "",
        sum.unresolved_reason
          ? `⚠ ${sum.unresolved_reason}`
          : `Money for: $${sum.money_for_total.toLocaleString()} (${sum.money_for_edges} edges)\n` +
            `Money against: $${sum.money_against_total.toLocaleString()} (${sum.money_against_edges} edges)\n` +
            `Shared donors: ${sum.shared_donors_count}\n` +
            `Cross-targets: ${sum.cross_targets_count}`,
      ]
      alert(lines.join("\n"))
    } catch (e: unknown) {
      alert(`Draft from evidence failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setDraftLoadingId(null)
    }
  }

  const verifyStory = async (story: Story) => {
    setVerifyingId(story.id)
    try {
      const res = await fetch(`/api/stories/verify?id=${encodeURIComponent(story.id)}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json() as VerifyResult
      setVerifyResults(prev => ({ ...prev, [story.id]: data }))
    } catch (e: unknown) {
      alert(`Verify failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setVerifyingId(null)
    }
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
  const duplicateFlagged = stories.filter(s => s.integrity_status === "duplicate" && s.state !== "archived").length
  const staleFlagged = stories.filter(s => s.integrity_status === "stale" && s.state === "candidate").length

  /**
   * One-click cleanup: walks duplicate clusters server-side, keeps the
   * highest-confidence story in each, archives the rest with reason
   * "auto-archived as duplicate of story_X" + writes the false-positive
   * log so the detector won't re-create them.
   */
  /**
   * Stale = the underlying both-sides pattern no longer holds in the
   * source profile. Conservative: only candidates auto-archived; draft/
   * ready/published stay put.
   */
  const autoArchiveStale = async () => {
    if (staleFlagged === 0) return
    if (!confirm(`Auto-archive stale stories?\n\nWalks ${staleFlagged} flagged stale stories — those whose underlying pattern no longer holds in the source profile data (counterparty was edited away from donors+opposes). Only candidate-state stories are archived; draft/ready stay protected.\n\nEach archive writes to false-positive log so the detector won't re-create.`)) return
    try {
      const res = await fetch("/api/stories/auto-archive-stale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: false }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      alert(`Auto-archived ${data.archived_count} stale stor${data.archived_count === 1 ? "y" : "ies"}. ${data.skipped_count > 0 ? `Skipped ${data.skipped_count} (editorial work in progress).` : ""} Reloading...`)
      fetchStories()
    } catch (e: unknown) {
      alert(`Auto-archive failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const autoArchiveDuplicates = async () => {
    if (duplicateFlagged === 0) return
    if (!confirm(`Auto-archive duplicate stories?\n\nWalks ${duplicateFlagged} flagged duplicate stories, groups by subject + counterparty + detector type, keeps the highest-confidence story in each cluster, archives the rest. Each archive writes to false-positive log.\n\nDraft/ready stories are protected — they won't be auto-archived even if duplicates exist.`)) return
    try {
      const res = await fetch("/api/stories/auto-archive-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: false }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      alert(`Auto-archived ${data.archived_count} duplicates across ${data.clusters_found} clusters. Reloading...`)
      fetchStories()
    } catch (e: unknown) {
      alert(`Auto-archive failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

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

        {/* Auto-archive banners — appear when integrity-flagged candidates exist
            and nothing is selected (avoid conflicting with the bulk-action bar). */}
        {duplicateFlagged > 0 && selected.size === 0 && (
          <div className="bg-yellow-950/40 border border-yellow-800 rounded p-3 flex items-center gap-3 text-sm">
            <span className="text-yellow-300">
              <strong>⚠ {duplicateFlagged} duplicate stories detected</strong>
              {" — "}same subject+counterparty pair appears multiple times. The integrity check (every 15 min) flagged these.
            </span>
            <button
              className="ml-auto text-xs px-3 py-1.5 bg-yellow-900 hover:bg-yellow-800 rounded text-yellow-200 flex-shrink-0"
              onClick={autoArchiveDuplicates}
              title="Walks duplicate clusters, keeps highest-confidence story in each, archives the rest. Draft/ready stories are protected. Writes false-positive log entries so the detector won't re-create archived duplicates."
            >
              🪄 auto-archive duplicates
            </button>
          </div>
        )}

        {staleFlagged > 0 && selected.size === 0 && (
          <div className="bg-yellow-950/40 border border-yellow-800 rounded p-3 flex items-center gap-3 text-sm">
            <span className="text-yellow-300">
              <strong>⚠ {staleFlagged} stale stories detected</strong>
              {" — "}the both-sides pattern no longer holds in the source profile. The counterparty has been edited away from either donors or opposes since the candidate was detected.
            </span>
            <button
              className="ml-auto text-xs px-3 py-1.5 bg-yellow-900 hover:bg-yellow-800 rounded text-yellow-200 flex-shrink-0"
              onClick={autoArchiveStale}
              title="Archives stale candidates whose underlying pattern no longer holds. Draft/ready stories are protected. Writes false-positive log so the detector won't re-create."
            >
              🪄 auto-archive stale
            </button>
          </div>
        )}

        {/* Bulk action bar — appears when 1+ rows are selected */}
        {selected.size > 0 && (
          <div className="bg-blue-950/40 border border-blue-800 rounded p-3 flex flex-wrap gap-2 items-center text-sm">
            <span className="text-blue-300 font-medium">
              {selected.size} selected
            </span>
            <span className="text-gray-500">·</span>
            <button
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              onClick={selectAllInView}
              disabled={bulkSaving}
              title="Add all currently-visible (filtered) rows to the selection"
            >
              + select all in view ({filtered.length})
            </button>
            <button
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              onClick={clearSelection}
              disabled={bulkSaving}
            >
              clear
            </button>

            <span className="text-gray-500 ml-2">·</span>

            <button
              className="text-xs px-2 py-1 bg-red-950 text-red-400 hover:bg-red-900 hover:text-red-300 rounded disabled:opacity-50"
              onClick={bulkArchive}
              disabled={bulkSaving}
              title="Archive all selected. Each gets a false-positive-log entry so detectors won't re-surface them."
            >
              🗑 archive {selected.size}
            </button>

            <select
              className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none"
              value=""
              disabled={bulkSaving}
              onChange={e => {
                const v = e.target.value
                if (!v) return
                if (!confirm(`Set state to "${v}" on ${selected.size} stor${selected.size === 1 ? "y" : "ies"}?`)) return
                bulkPatch({ state: v })
              }}
              title="Bulk-set the state on all selected"
            >
              <option value="">set state…</option>
              {STATE_ORDER.map(s => (
                <option key={s} value={s}>→ {s}</option>
              ))}
            </select>

            <select
              className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 focus:outline-none"
              value=""
              disabled={bulkSaving}
              onChange={e => {
                const v = e.target.value
                if (!v) return
                bulkPatch({ severity: v })
              }}
              title="Bulk-set the severity on all selected"
            >
              <option value="">set severity…</option>
              {SEVERITY_LEVELS.map(s => (
                <option key={s} value={s}>→ {s}</option>
              ))}
            </select>

            {bulkSaving && (
              <span className="text-blue-400 text-xs ml-2">saving…</span>
            )}
          </div>
        )}

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
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-800/50 ${
                      selected.has(story.id) ? "bg-blue-950/30" : ""
                    }`}
                    onClick={() => setExpanded(isExpanded ? null : story.id)}
                  >
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      className="flex-shrink-0 cursor-pointer accent-blue-600"
                      checked={selected.has(story.id)}
                      onChange={e => { e.stopPropagation(); toggleSelect(story.id) }}
                      onClick={e => e.stopPropagation()}
                      title="Select for bulk action"
                    />

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

                        {/* Verify against live source profile */}
                        <button
                          className="text-xs px-2 py-1 bg-purple-900 hover:bg-purple-800 text-purple-200 rounded disabled:opacity-50"
                          disabled={verifyingId === story.id}
                          onClick={() => verifyStory(story)}
                          title="Re-read the source profile right now and check whether the counterparty actually appears in both donors and opposes. Read-only."
                        >
                          {verifyingId === story.id ? "🔍 verifying…" : "🔍 verify"}
                        </button>

                        {/* Money trail — subject↔counterparty $ flows from the librarian */}
                        <button
                          className="text-xs px-2 py-1 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded disabled:opacity-50"
                          disabled={moneyLoadingId === story.id}
                          onClick={() => showMoney(story)}
                          title="Pull every monetary edge between subject and counterparty from the librarian: direct contributions, IE-support, IE-oppose. Read-only."
                        >
                          {moneyLoadingId === story.id ? "💰 loading…" : "💰 money"}
                        </button>

                        {/* Show evidence — money + shared donors + cross-targets */}
                        <button
                          className="text-xs px-2 py-1 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 rounded disabled:opacity-50"
                          disabled={evidenceLoadingId === story.id}
                          onClick={() => showEvidence(story)}
                          title="Money trail PLUS: top shared donors (fund both subject and counterparty), and other politicians where the counterparty plays both sides. Read-only."
                        >
                          {evidenceLoadingId === story.id ? "🔗 loading…" : "🔗 evidence"}
                        </button>

                        {/* Draft from evidence — assemble brief into editorial_notes, flip state */}
                        <button
                          className="text-xs px-2 py-1 bg-amber-900 hover:bg-amber-800 text-amber-200 rounded disabled:opacity-50"
                          disabled={draftLoadingId === story.id}
                          onClick={() => draftFromEvidence(story)}
                          title="Assemble the evidence brief (receipts only — no editorial framing) into editorial_notes and flip state to draft. Editorial framing placeholders are left blank for you to write. Per Rule 4."
                        >
                          {draftLoadingId === story.id ? "✍️ drafting…" : "✍️ draft from evidence"}
                        </button>

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

                      {/* Verify result panel — only shown after a Verify click */}
                      {verifyResults[story.id] && (() => {
                        const v = verifyResults[story.id]
                        const verdictColor =
                          v.verdict === "confirmed"        ? "border-green-700 bg-green-950/40 text-green-300" :
                          v.verdict === "stale"            ? "border-yellow-700 bg-yellow-950/40 text-yellow-300" :
                          v.verdict === "alias-mismatch"   ? "border-orange-700 bg-orange-950/40 text-orange-300" :
                          v.verdict === "profile-not-found"? "border-red-700 bg-red-950/40 text-red-300" :
                                                             "border-gray-700 bg-gray-900 text-gray-300"
                        const verdictLabel: Record<string, string> = {
                          "confirmed":         "✓ Confirmed — pattern still holds in current data",
                          "stale":             "⚠ Stale — appears in only one of the two lists now",
                          "alias-mismatch":    "⚠ Alias mismatch — counterparty not found exactly; check suggestions",
                          "profile-not-found": "✗ Profile not found",
                          "no-counterparty":   "—  No counterparty entity to verify",
                        }
                        return (
                          <div className={`border rounded p-3 text-xs space-y-2 ${verdictColor}`}>
                            <div className="font-semibold flex items-center justify-between">
                              <span>{verdictLabel[v.verdict] ?? v.verdict}</span>
                              <span className="text-gray-500 font-normal text-[10px]">
                                checked {v.checked_at ? new Date(v.checked_at).toLocaleTimeString() : ""}
                              </span>
                            </div>

                            {v.message && (
                              <p className="text-gray-300">{v.message}</p>
                            )}

                            {v.subject_profile && (
                              <p className="text-gray-400">
                                Source: <code className="bg-black/30 px-1 rounded">{v.subject_profile}</code>
                              </p>
                            )}

                            {(v.donors_count !== undefined || v.opposes_count !== undefined) && (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <div className="text-gray-400 mb-1">
                                    Donors ({v.donors_count}) {v.counterparty_in_donors ? <span className="text-green-400">✓ contains "{v.counterparty_ref}"</span> : <span className="text-gray-500">— NOT in donors</span>}
                                  </div>
                                  <div className="bg-black/30 rounded p-2 text-gray-300 text-[11px] max-h-32 overflow-y-auto">
                                    {(v.donors_sample || []).slice(0, 12).map((d, i) => (
                                      <div key={i} className={normalize(d) === normalize(v.counterparty_ref || "") ? "text-green-400 font-semibold" : ""}>
                                        {d}
                                      </div>
                                    ))}
                                    {(v.donors_count || 0) > (v.donors_sample?.length || 0) && (
                                      <div className="text-gray-600 italic">… +{(v.donors_count || 0) - (v.donors_sample?.length || 0)} more</div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-400 mb-1">
                                    Opposes ({v.opposes_count}) {v.counterparty_in_opposes ? <span className="text-green-400">✓ contains "{v.counterparty_ref}"</span> : <span className="text-gray-500">— NOT in opposes</span>}
                                  </div>
                                  <div className="bg-black/30 rounded p-2 text-gray-300 text-[11px] max-h-32 overflow-y-auto">
                                    {(v.opposes_sample || []).map((o, i) => (
                                      <div key={i} className={normalize(o) === normalize(v.counterparty_ref || "") ? "text-green-400 font-semibold" : ""}>
                                        {o}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {v.alias_candidates && v.alias_candidates.length > 0 && (
                              <div>
                                <div className="text-gray-400 mb-1">
                                  Close matches (possible aliases):
                                </div>
                                <div className="space-y-1">
                                  {v.alias_candidates.map((a, i) => (
                                    <div key={i} className="text-gray-300 text-[11px]">
                                      <span className="text-gray-500">[{a.source}]</span>{" "}
                                      <span className="font-mono">"{a.value}"</span>
                                      <span className="text-gray-600 ml-2">distance {a.distance}</span>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-gray-500 text-[10px] mt-1 italic">
                                  If one of these is the same entity, the canonical name in the profile and the counterparty name in this story don't match. Editorial decision: rename in profile, archive this candidate, or both.
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Money trail panel — shown after a 💰 click */}
                      {moneyResults[story.id] && (() => {
                        const m = moneyResults[story.id]
                        if (!m.supported) {
                          return (
                            <div className="border border-gray-700 bg-gray-900 rounded p-3 text-xs space-y-1">
                              <div className="font-semibold text-gray-300">💰 Money trail — not applicable</div>
                              <p className="text-gray-400">{m.reason}</p>
                            </div>
                          )
                        }
                        const p = m.pair!
                        return (
                          <div className="border border-emerald-900 bg-emerald-950/30 rounded p-3 text-xs space-y-3">
                            <div className="font-semibold text-emerald-300 flex items-center justify-between">
                              <span>💰 Money trail · {p.resolved.subject?.name ?? p.subject_ref} ↔ {p.resolved.counterparty?.name ?? p.counterparty_ref}</span>
                              <span className="text-gray-500 font-normal text-[10px]">checked {m.checked_at ? new Date(m.checked_at).toLocaleTimeString() : ""}</span>
                            </div>
                            {p.unresolved_reason && (
                              <p className="text-amber-300">⚠ {p.unresolved_reason}</p>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-gray-400 mb-1">For subject</div>
                                <div className="text-emerald-300 font-mono text-base">{fmtMoney(p.money_for.total_amount)}</div>
                                <div className="text-gray-500">{p.money_for.edge_count} edge{p.money_for.edge_count === 1 ? "" : "s"}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 mb-1">Against subject</div>
                                <div className="text-red-300 font-mono text-base">{fmtMoney(p.money_against.total_amount)}</div>
                                <div className="text-gray-500">{p.money_against.edge_count} edge{p.money_against.edge_count === 1 ? "" : "s"}</div>
                              </div>
                            </div>
                            {(p.money_for.top_edges.length > 0 || p.money_against.top_edges.length > 0) && (
                              <div className="bg-black/30 rounded p-2 max-h-48 overflow-y-auto space-y-1">
                                {[...p.money_for.top_edges, ...p.money_against.top_edges].slice(0, 16).map((e, i) => (
                                  <div key={i} className="text-[11px] flex items-center gap-2">
                                    <span className={`font-mono w-16 text-right ${p.money_against.top_edges.some(x => x === e) ? "text-red-300" : "text-emerald-300"}`}>{fmtMoney(e.amount)}</span>
                                    <span className="text-gray-400">{e.label}</span>
                                    <span className="text-gray-600">{e.cycle ?? "?"}</span>
                                    <a href={e.source_url ?? "#"} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate flex-1">{e.source}</a>
                                  </div>
                                ))}
                              </div>
                            )}
                            {p.other_money.edge_count > 0 && (
                              <div className="text-gray-400 text-[11px]">
                                Other money flows: {fmtMoney(p.other_money.total_amount)} · {p.other_money.edge_count} edge(s) (contracts / grants / operating)
                              </div>
                            )}
                            {p.non_money_edges.length > 0 && (
                              <div className="text-gray-500 text-[11px]">
                                Non-monetary edges: {p.non_money_edges.map(n => `${n.label} ×${n.count}`).join(" · ")}
                              </div>
                            )}
                            {p.money_for.edge_count === 0 && p.money_against.edge_count === 0 && !p.unresolved_reason && (
                              <p className="text-gray-400 italic">No monetary edges found between this pair in the librarian. The relationship may be inferred (shared-donors, related, etc.) without a direct $ trail. Try 🔗 evidence for the broader picture.</p>
                            )}
                          </div>
                        )
                      })()}

                      {/* Evidence panel — shown after a 🔗 click */}
                      {evidenceResults[story.id] && (() => {
                        const ev = evidenceResults[story.id].evidence
                        const p = ev.pair
                        return (
                          <div className="border border-cyan-900 bg-cyan-950/30 rounded p-3 text-xs space-y-3">
                            <div className="font-semibold text-cyan-300 flex items-center justify-between">
                              <span>🔗 Evidence · {p.resolved.subject?.name ?? p.subject_ref} ↔ {p.resolved.counterparty?.name ?? p.counterparty_ref}</span>
                              <span className="text-gray-500 font-normal text-[10px]">checked {evidenceResults[story.id].checked_at ? new Date(evidenceResults[story.id].checked_at).toLocaleTimeString() : ""}</span>
                            </div>
                            {p.unresolved_reason && (
                              <p className="text-amber-300">⚠ {p.unresolved_reason}</p>
                            )}
                            {ev.notes.length > 0 && (
                              <div className="text-gray-400 space-y-1">
                                {ev.notes.map((n, i) => <p key={i}>{n}</p>)}
                              </div>
                            )}

                            {/* Money snapshot */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-gray-400 mb-1">For subject</div>
                                <div className="text-emerald-300 font-mono">{fmtMoney(p.money_for.total_amount)} · {p.money_for.edge_count}</div>
                              </div>
                              <div>
                                <div className="text-gray-400 mb-1">Against subject</div>
                                <div className="text-red-300 font-mono">{fmtMoney(p.money_against.total_amount)} · {p.money_against.edge_count}</div>
                              </div>
                            </div>

                            {/* Shared donors */}
                            <div>
                              <div className="text-gray-300 font-semibold mb-1">Shared donors (fund both)</div>
                              {ev.shared_donors.length === 0 ? (
                                <p className="text-gray-500 italic text-[11px]">No shared donors in the librarian for this pair.</p>
                              ) : (
                                <div className="bg-black/30 rounded p-2 max-h-40 overflow-y-auto space-y-1">
                                  {ev.shared_donors.map((d, i) => (
                                    <div key={i} className="text-[11px] flex items-center gap-2">
                                      <span className="text-gray-200 flex-1 truncate" title={d.name}>{d.name}</span>
                                      <span className="text-emerald-300 font-mono">{fmtMoney(d.to_subject_amount)}</span>
                                      <span className="text-gray-600">→ subj</span>
                                      <span className="text-emerald-300 font-mono">{fmtMoney(d.to_counterparty_amount)}</span>
                                      <span className="text-gray-600">→ cp</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Cross-targets */}
                            <div>
                              <div className="text-gray-300 font-semibold mb-1">Counterparty plays both sides on</div>
                              {ev.cross_targets.length === 0 ? (
                                <p className="text-gray-500 italic text-[11px]">No other targets where this counterparty plays both donor + opponent. The pattern may be subject-specific.</p>
                              ) : (
                                <div className="bg-black/30 rounded p-2 max-h-48 overflow-y-auto space-y-1">
                                  {ev.cross_targets.map((t, i) => (
                                    <div key={i} className="text-[11px] flex items-center gap-2">
                                      <span className="text-gray-200 flex-1 truncate" title={t.subject_name}>{t.subject_name}</span>
                                      <span className="text-emerald-300 font-mono">{fmtMoney(t.money_for_amount)}</span>
                                      <span className="text-gray-600">for</span>
                                      <span className="text-red-300 font-mono">{fmtMoney(t.money_against_amount)}</span>
                                      <span className="text-gray-600">against</span>
                                      {t.has_political_opposition_edge && (
                                        <span className="text-orange-300" title="Has explicit political-opposition edge">⚔</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <p className="text-gray-500 text-[10px] italic">
                              Receipts only — no editorial framing applied. Click ✍️ draft from evidence to write this brief into editorial_notes (Rule 4: AI translates, never generates).
                            </p>
                          </div>
                        )
                      })()}
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
