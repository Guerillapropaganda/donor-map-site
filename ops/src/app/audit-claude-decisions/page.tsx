"use client"

/**
 * /audit-claude-decisions — Phase 3 of ADR-0029.
 *
 * Two-pane audit surface for the editorial-decision pipeline:
 *
 *   ┌─ filters ────────────────────────────────────────────────────┐
 *   │ class · decided_by · state · date · search · sample 20       │
 *   ├─────────────┬────────────────────────────────────────────────┤
 *   │ record list │ detail dossier (selected record)               │
 *   │ (~40%)      │   - primary label + class chip                 │
 *   │             │   - state, decided_by, decided_at chips        │
 *   │             │   - change_log timeline                        │
 *   │             │   - raw JSON (collapsible)                     │
 *   │             │   - revert button (if state ≠ candidate)       │
 *   │             │                                                │
 *   │ j/k = nav   │ enter = focus, r = revert (with confirm)       │
 *   └─────────────┴────────────────────────────────────────────────┘
 *
 * URL-state filters: ?class=…&decided_by=claude-auto&state=resolved
 * &q=amgen&since=7d&sample=20 — bookmark / share friendly. Filter
 * changes update the URL via replaceState (no history pollution).
 *
 * Sample mode: clicking "Sample 20 (Tier 1, last 7d)" pulls random
 * tier-1 records from /api/audit-claude-decisions/sample, replaces the
 * current list with the union of those record ids fetched from the main
 * endpoint. Designed for the David weekly spot-audit cadence specified
 * in ADR-0029.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { PageHeader } from "@/components/PageHeader"
import { useRouter, useSearchParams } from "next/navigation"

interface ChangeLogEntry {
  at: string
  from?: string
  to?: string
  decided_by?: string
  payload_keys?: string[]
  note?: string | null
}

interface NormalizedRecord {
  class: string
  id: string
  state: string
  decided_by: string | null
  decided_at: string | null
  auto_revert_eligible: boolean
  reverted_reason: string | null
  has_tier1: boolean
  primary_label: string
  sublabel: string
  change_log: ChangeLogEntry[]
  raw: Record<string, unknown>
}

interface ClassInfo {
  name: string
  has_tier1: boolean
}

interface ClassStats {
  total: number
  by_state: Record<string, number>
  by_decided_by: Record<string, number>
  has_tier1: boolean
}

interface ListResponse {
  records: NormalizedRecord[]
  total: number
  classes: ClassInfo[]
  stats: Record<string, ClassStats>
}

const DECIDED_BY_VALUES = ["david", "claude-auto", "claude-batch-approved", "undecided"] as const
const SINCE_PRESETS = [
  { label: "all time", value: "" },
  { label: "last 24h", value: "24h" },
  { label: "last 7d", value: "7d" },
  { label: "last 30d", value: "30d" },
]

const DECIDED_BY_COLORS: Record<string, string> = {
  "david": "bg-blue-900 text-blue-300",
  "claude-auto": "bg-purple-900 text-purple-300",
  "claude-batch-approved": "bg-cyan-900 text-cyan-300",
  "undecided": "bg-gray-800 text-gray-400",
}

const STATE_COLORS: Record<string, string> = {
  "candidate": "bg-yellow-900 text-yellow-300",
  "approved-alias": "bg-emerald-900 text-emerald-300",
  "approved-prune": "bg-orange-900 text-orange-300",
  "kept": "bg-blue-900 text-blue-300",
  "blocked-by-librarian-gap": "bg-orange-900 text-orange-300",
  "rejected": "bg-red-900 text-red-300",
  "needs-research": "bg-gray-800 text-gray-300",
  "resolved": "bg-green-900 text-green-300",
}

// Plain-language tooltips. Hover any chip to read what it actually means
// without the jargon. Per memory: "always explain in laymen's terms."
const STATE_TOOLTIPS: Record<string, string> = {
  "candidate": "Surfaced as a possible decision. Nobody has acted on it yet — it's in the 'needs review' pile.",
  "approved-alias": "Someone (Claude or you) said 'yes, these two names are the same thing.' The merge happened.",
  "approved-prune": "You said 'yes, this name is junk — strip it from the profile.' The cleanup will run on the next rebuild.",
  "kept": "You said 'this name is real even though our librarian can't see it.' Suppressed for 90 days, then asked again.",
  "blocked-by-librarian-gap": "The relationship is real, but our data graph is missing the link that would prove it. Stays visible until the data gap is fixed.",
  "rejected": "Someone said 'no, this is wrong — don't merge it.' Won't be raised again unless the situation changes a lot.",
  "needs-research": "Marked 'I don't know yet' — needs more digging before a call can be made.",
  "resolved": "All done. The decision was applied and the records are in their final state. This is audit-trail only now.",
}

const DECIDED_BY_TOOLTIPS: Record<string, string> = {
  "david": "You decided this one personally.",
  "claude-auto": "Claude decided this on its own — no one approved it. These are the ones to spot-check most carefully.",
  "claude-batch-approved": "Claude proposed it and you batch-approved it. Lower risk than claude-auto.",
  "undecided": "No decision recorded yet. Still in the 'needs review' pile.",
}

function chipClass(map: Record<string, string>, key: string): string {
  return map[key] || "bg-gray-800 text-gray-300"
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

export default function AuditClaudeDecisionsPage() {
  const router = useRouter()
  const sp = useSearchParams()

  // Filters (driven by URL)
  const classFilter = (sp.get("class") || "").split(",").filter(Boolean)
  const decidedByFilter = (sp.get("decided_by") || "").split(",").filter(Boolean)
  const stateFilter = (sp.get("state") || "").split(",").filter(Boolean)
  const since = sp.get("since") || ""
  const search = sp.get("q") || ""
  const sampleSize = parseInt(sp.get("sample") || "20", 10)
  const selectedKey = sp.get("sel") || "" // "<class>:<id>"

  const [response, setResponse] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reverting, setReverting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showRawJson, setShowRawJson] = useState(false)

  // Sample mode — when active, the list is restricted to these (class,id) pairs.
  const [sampleIds, setSampleIds] = useState<Set<string> | null>(null)
  const [sampleMeta, setSampleMeta] = useState<{ eligible: number; requested: number } | null>(null)
  const [showExplainer, setShowExplainer] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)

  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k)
      else next.set(k, v)
    }
    const qs = next.toString()
    router.replace(qs ? `?${qs}` : "?", { scroll: false })
  }, [router, sp])

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (classFilter.length) params.set("class", classFilter.join(","))
      if (decidedByFilter.length) params.set("decided_by", decidedByFilter.join(","))
      if (stateFilter.length) params.set("state", stateFilter.join(","))
      if (since) params.set("since", since)
      if (search) params.set("q", search)
      params.set("limit", "500")
      const res = await fetch(`/api/audit-claude-decisions?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const data: ListResponse = await res.json()
      setResponse(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [classFilter.join(","), decidedByFilter.join(","), stateFilter.join(","), since, search])

  useEffect(() => { fetchList() }, [fetchList])

  // Records for display: full list, or sample-filtered if sample mode active.
  const visibleRecords = useMemo(() => {
    if (!response) return []
    if (!sampleIds) return response.records
    return response.records.filter(r => sampleIds.has(`${r.class}:${r.id}`))
  }, [response, sampleIds])

  // Selected record
  const selected = useMemo(() => {
    if (!selectedKey || !response) return null
    return response.records.find(r => `${r.class}:${r.id}` === selectedKey) || null
  }, [selectedKey, response])

  // Auto-select first record if nothing selected and list has items
  useEffect(() => {
    if (!selectedKey && visibleRecords.length > 0) {
      updateUrl({ sel: `${visibleRecords[0].class}:${visibleRecords[0].id}` })
    }
  }, [selectedKey, visibleRecords, updateUrl])

  // Pull a Tier 1 sample
  const pullSample = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set("limit", String(sampleSize))
      params.set("since", "7d")
      const res = await fetch(`/api/audit-claude-decisions/sample?${params}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const ids = new Set<string>(
        (data.sample as Array<{ class: string; id: string }>).map(x => `${x.class}:${x.id}`)
      )
      setSampleIds(ids)
      setSampleMeta({ eligible: data.eligible_total, requested: data.requested_limit })
      // Clear filters that would conflict with sample's intent
      updateUrl({ decided_by: null, state: null })
      const eligible = data.eligible_total
      const picked = ids.size
      const plainMsg = picked === 0
        ? `No spot-checks needed — Claude hasn't made any solo decisions in the last 7 days.`
        : eligible === picked
          ? `Picked all ${picked} solo decision${picked === 1 ? "" : "s"} Claude made this week. Look each over — does it seem right?`
          : `Picked ${picked} random spot-checks out of ${eligible} solo decisions Claude made this week. Look each over — does it seem right?`
      setToast(plainMsg)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [sampleSize, updateUrl])

  const clearSample = useCallback(() => {
    setSampleIds(null)
    setSampleMeta(null)
    setToast(null)
  }, [])

  // Revert
  const revertSelected = useCallback(async () => {
    if (!selected) return
    if (selected.state === "candidate") {
      setToast("Nothing to undo — this decision is already back in the 'needs review' pile.")
      return
    }
    // Plain-language confirm. Per memory: explain what's about to happen
    // before doing it. The dialog should make a non-technical reader feel
    // confident they understand the consequence.
    const isAlias = selected.class === "librarian-gap-aliases"
    const isPrune = selected.class === "frontmatter-orphan-prunes"
    const sideExplanation = isAlias
      ? `Because this is an alias merge, undoing it does TWO things:\n  1. Puts the decision back in the "needs review" pile.\n  2. Strips the merged nickname back out of your data — like it never happened.`
      : isPrune
        ? `This is a frontmatter prune. Undoing it puts the decision back in the "needs review" pile, but the actual cleanup that ran cannot be auto-undone. If you need that name back in the profile, you'll have to add it manually.`
        : `Undoing puts the decision back in the "needs review" pile. Any external change made when this decision was applied is NOT auto-undone.`
    const confirmText = `Take this decision back?\n\n  ${selected.primary_label}\n\nWho decided: ${selected.decided_by || "—"}\nWhat state it's in now: ${selected.state}\n\n${sideExplanation}\n\nProceed?`
    if (!window.confirm(confirmText)) return

    setReverting(true)
    try {
      const res = await fetch("/api/audit-claude-decisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class: selected.class, id: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "revert failed")
      // Plain-language toast that says what actually happened.
      const sideEffect = data.result?.side_effect
      let plainMsg: string
      if (sideEffect?.stripped) {
        plainMsg = `Done. Took the merge back: "${sideEffect.stripped}" is no longer a nickname for "${sideEffect.from}". The decision is back in the "needs review" pile.`
      } else if (sideEffect?.skipped) {
        plainMsg = `Done. The decision is back in the "needs review" pile. (Heads up: ${sideEffect.skipped} — the side-effect was already gone, nothing to clean up.)`
      } else {
        plainMsg = `Done. The decision is back in the "needs review" pile.`
      }
      setToast(plainMsg)
      await fetchList()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setReverting(false)
    }
  }, [selected, fetchList])

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return
      if (visibleRecords.length === 0) return
      const idx = visibleRecords.findIndex(r => `${r.class}:${r.id}` === selectedKey)
      if (e.key === "j") {
        const next = visibleRecords[Math.min(idx + 1, visibleRecords.length - 1)]
        if (next) updateUrl({ sel: `${next.class}:${next.id}` })
        e.preventDefault()
      } else if (e.key === "k") {
        const prev = visibleRecords[Math.max(idx - 1, 0)]
        if (prev) updateUrl({ sel: `${prev.class}:${prev.id}` })
        e.preventDefault()
      } else if (e.key === "r" && selected && selected.state !== "candidate") {
        revertSelected()
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visibleRecords, selectedKey, updateUrl, selected, revertSelected])

  // Toggle helpers for multi-select chips
  const toggleClass = (c: string) => {
    const next = classFilter.includes(c)
      ? classFilter.filter(x => x !== c)
      : [...classFilter, c]
    updateUrl({ class: next.join(",") || null })
  }
  const toggleDecidedBy = (db: string) => {
    const next = decidedByFilter.includes(db)
      ? decidedByFilter.filter(x => x !== db)
      : [...decidedByFilter, db]
    updateUrl({ decided_by: next.join(",") || null })
  }
  const toggleState = (s: string) => {
    const next = stateFilter.includes(s)
      ? stateFilter.filter(x => x !== s)
      : [...stateFilter, s]
    updateUrl({ state: next.join(",") || null })
  }

  // All states across all classes (for filter chips)
  const allStates = useMemo(() => {
    if (!response) return []
    const out = new Set<string>()
    for (const stats of Object.values(response.stats)) {
      for (const s of Object.keys(stats.by_state)) out.add(s)
    }
    return [...out].sort()
  }, [response])

  // Header summary
  const summary = useMemo(() => {
    if (!response) return ""
    const parts: string[] = []
    let totalAll = 0
    let claudeAuto = 0
    for (const s of Object.values(response.stats)) {
      totalAll += s.total
      claudeAuto += s.by_decided_by["claude-auto"] || 0
    }
    parts.push(`${totalAll} records across ${response.classes.length} classes`)
    parts.push(`${claudeAuto} claude-auto`)
    parts.push(`${response.total} match filters`)
    if (sampleMeta) parts.push(`sample: ${sampleIds?.size}/${sampleMeta.eligible} eligible`)
    return parts.join(" · ")
  }, [response, sampleMeta, sampleIds])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Audit Claude Decisions"
        whatThisDoes="Every editorial decision Claude made — alias merges, frontmatter prunes, readiness promotions. Filter by class, decided_by, state, or date. Click a row to see its full change_log timeline. Revert any decision to candidate state (Tier 1 also strips the alias from entities.jsonl). Per ADR-0029."
        rightNow={summary || "Loading…"}
        action="j/k = nav · r = revert selected · 🎯 Sample 20 = pull random Tier 1 from last 7d for weekly audit"
      />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 border border-gray-700 rounded px-4 py-2 text-sm shadow-lg max-w-md">
          <span>{toast}</span>
          <button className="ml-3 text-gray-500 hover:text-gray-300" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-3">
        {/* Plain-language explainer (collapsible). Per memory: explain
            things in laymen's terms first, technical detail second. */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-300">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-xs"
            onClick={() => setShowExplainer(v => !v)}
          >
            <span>{showExplainer ? "▼" : "▶"}</span>
            <span>What is this page? (plain words)</span>
          </button>
          {showExplainer && (
            <div className="mt-3 space-y-3 leading-relaxed">
              <p>
                Think of Claude as a really smart helper sorting your mail.
                You've set rules: <em>"If a letter is obviously junk, throw it
                away. If you're not sure, put it in a pile for me to look at
                later. Never throw away a real letter."</em>
              </p>
              <p>
                Even with rules, the helper sometimes messes up. So you need a
                way to <strong>see everything it did</strong>, <strong>check
                its work</strong>, and <strong>undo a mistake</strong>. That's
                this page.
              </p>
              <p>
                Each row is one decision Claude made. The chips tell you{" "}
                <strong>what state</strong> the decision is in (resolved /
                approved / rejected / etc.), <strong>who decided</strong>{" "}
                (you, Claude on its own, or Claude with your batch approval),
                and{" "}
                <span className="text-purple-400">⚡ T1</span> means Claude
                applied it on its own without asking — those are the ones to
                spot-check most carefully.
              </p>
              <p>
                Click any row to see its full <strong>change log</strong> —
                like a little timeline of how that decision came to be. The
                big red <strong>Revert</strong> button puts the decision back
                in the "needs human review" pile. For alias merges (Claude
                saying "X is the same thing as Y"), revert <strong>also pulls
                the wrong nickname back out of your data</strong>. One click,
                whole thing undone.
              </p>
              <p>
                The <strong className="text-purple-300">🎯 Sample 20</strong>{" "}
                button is your weekly homework: pick 20 random Tier 1
                decisions Claude made on its own in the last week, and
                eyeball them. That's how you keep Claude honest without
                reading all 8,920 records. Per ADR-0029.
              </p>
              <p className="text-xs text-gray-500">
                Filters live in the URL — bookmark or share specific views.
                Keyboard: <code className="bg-black/30 px-1 rounded">j</code>/
                <code className="bg-black/30 px-1 rounded">k</code> = up/down,{" "}
                <code className="bg-black/30 px-1 rounded">r</code> = revert
                selected.
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 space-y-3">
          {/* Row 1: classes + sample */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">class:</span>
            {response?.classes.map(c => {
              const active = classFilter.length === 0 || classFilter.includes(c.name)
              const stats = response.stats[c.name]
              return (
                <button
                  key={c.name}
                  onClick={() => toggleClass(c.name)}
                  className={`text-xs px-2 py-1 rounded border ${active ? "bg-gray-800 border-gray-600 text-gray-100" : "bg-gray-950 border-gray-800 text-gray-500"}`}
                  title={c.has_tier1 ? "Has Tier 1 auto-apply predicate" : "Tier 2 only (no auto-apply)"}
                >
                  {c.has_tier1 && <span className="text-purple-400 mr-1">⚡</span>}
                  {c.name}
                  <span className="ml-1.5 text-gray-500">({stats?.total ?? 0})</span>
                </button>
              )
            })}
            <div className="flex-1" />
            {sampleIds ? (
              <button
                onClick={clearSample}
                className="text-xs px-3 py-1.5 rounded bg-purple-900 hover:bg-purple-800 text-purple-100 border border-purple-700"
              >
                ✕ Clear sample ({sampleIds.size}/{sampleMeta?.eligible ?? "?"})
              </button>
            ) : (
              <button
                onClick={pullSample}
                className="text-xs px-3 py-1.5 rounded bg-purple-900 hover:bg-purple-800 text-purple-100 border border-purple-700"
                title="Random Tier 1 claude-auto decisions from the last 7 days for weekly audit"
              >
                🎯 Sample {sampleSize} (Tier 1, 7d)
              </button>
            )}
          </div>

          {/* Row 2: decided_by */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">decided_by:</span>
            {DECIDED_BY_VALUES.map(db => {
              const active = decidedByFilter.includes(db)
              return (
                <button
                  key={db}
                  onClick={() => toggleDecidedBy(db)}
                  className={`text-xs px-2 py-1 rounded border ${active ? `${chipClass(DECIDED_BY_COLORS, db)} border-gray-600` : "bg-gray-950 border-gray-800 text-gray-500"}`}
                >
                  {db}
                </button>
              )
            })}
          </div>

          {/* Row 3: state */}
          {allStates.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 mr-1">state:</span>
              {allStates.map(s => {
                const active = stateFilter.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => toggleState(s)}
                    className={`text-xs px-2 py-1 rounded border ${active ? `${chipClass(STATE_COLORS, s)} border-gray-600` : "bg-gray-950 border-gray-800 text-gray-500"}`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          )}

          {/* Row 4: search + date */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search name / id / sublabel…"
              className="flex-1 min-w-[240px] bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
              value={search}
              onChange={e => updateUrl({ q: e.target.value || null })}
            />
            <select
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
              value={since}
              onChange={e => updateUrl({ since: e.target.value || null })}
            >
              {SINCE_PRESETS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {loading && <span className="text-blue-400 text-xs">Loading…</span>}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Two-pane layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(420px,42%)_1fr] gap-3">
          {/* List pane */}
          <div ref={listRef} className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400 flex justify-between items-center">
              <span>{visibleRecords.length} record{visibleRecords.length === 1 ? "" : "s"}</span>
              <span className="text-gray-600 text-[10px]">j/k = nav · enter = focus · r = revert</span>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
              {visibleRecords.length === 0 && !loading && (
                <div className="px-3 py-8 text-center text-gray-500 text-sm">
                  No records match these filters.
                </div>
              )}
              {visibleRecords.map(r => {
                const key = `${r.class}:${r.id}`
                const isSelected = key === selectedKey
                return (
                  <button
                    key={key}
                    onClick={() => updateUrl({ sel: key })}
                    className={`w-full text-left px-3 py-2 border-b border-gray-800 hover:bg-gray-800/50 ${isSelected ? "bg-gray-800/80 border-l-2 border-l-blue-500" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded ${chipClass(STATE_COLORS, r.state)}`}
                        title={STATE_TOOLTIPS[r.state] || r.state}
                      >
                        {r.state}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded ${chipClass(DECIDED_BY_COLORS, r.decided_by || "undecided")}`}
                        title={DECIDED_BY_TOOLTIPS[r.decided_by || "undecided"]}
                      >
                        {r.decided_by || "undecided"}
                      </span>
                      {r.has_tier1 && r.decided_by === "claude-auto" && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-400" title="Tier 1: Claude applied this on its own without asking. Spot-check these most carefully.">⚡ T1</span>
                      )}
                      <span className="flex-1" />
                      <span className="text-gray-600 text-[11px]">{fmtDate(r.decided_at)}</span>
                    </div>
                    <div className="text-sm text-gray-200 truncate">{r.primary_label}</div>
                    {r.sublabel && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{r.sublabel}</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail pane */}
          <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-8">
                Select a record to view its audit trail.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${chipClass(STATE_COLORS, selected.state)}`}
                      title={STATE_TOOLTIPS[selected.state] || selected.state}
                    >
                      {selected.state}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${chipClass(DECIDED_BY_COLORS, selected.decided_by || "undecided")}`}
                      title={DECIDED_BY_TOOLTIPS[selected.decided_by || "undecided"]}
                    >
                      {selected.decided_by || "undecided"}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                      title="Which kind of decision queue this comes from."
                    >
                      {selected.class}
                    </span>
                    {selected.auto_revert_eligible && (
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-950 text-orange-400" title="If a calibration fixture (Pfizer, ADM, AOC, etc.) starts failing, the auto-revert hook will move this decision back to 'needs review' on its own within 15 minutes.">
                        auto-revert eligible
                      </span>
                    )}
                    <div className="flex-1" />
                    {selected.state !== "candidate" && (
                      <button
                        onClick={revertSelected}
                        disabled={reverting}
                        className="text-xs px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-red-200 disabled:opacity-50 border border-red-700"
                        title="Revert decision back to candidate state. For librarian-gap-aliases, also strips alias from entities.jsonl. (keyboard: r)"
                      >
                        {reverting ? "Reverting…" : "↶ Revert"}
                      </button>
                    )}
                  </div>
                  <div className="text-base text-gray-100 font-medium">{selected.primary_label}</div>
                  {selected.sublabel && (
                    <div className="text-xs text-gray-500 mt-1">{selected.sublabel}</div>
                  )}
                  <div className="text-[11px] text-gray-600 mt-2 font-mono">
                    id: {selected.id} · decided_at: {fmtDate(selected.decided_at)}
                    {selected.reverted_reason && (
                      <span className="text-orange-500"> · reverted: {selected.reverted_reason}</span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* change_log timeline */}
                  <section>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                      change log ({selected.change_log.length})
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-2">
                      Every step that got this decision to where it is now, newest first. Each line shows what state it moved from → to, who moved it, and a short note.
                    </p>
                    {selected.change_log.length === 0 ? (
                      <div className="text-xs text-gray-600 italic">
                        No history yet — this record predates the audit-trail pipeline (ADR-0029, shipped 2026-04-28), or hasn't moved out of the "needs review" pile.
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {[...selected.change_log].reverse().map((e, i) => (
                          <li key={i} className="border-l-2 border-gray-700 pl-3 py-1">
                            <div className="text-xs text-gray-300">
                              <span className="text-gray-500">{e.from || "—"}</span>
                              <span className="text-gray-600 mx-1.5">→</span>
                              <span className="text-gray-200">{e.to || "?"}</span>
                              {e.decided_by && (
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${chipClass(DECIDED_BY_COLORS, e.decided_by)}`}>
                                  {e.decided_by}
                                </span>
                              )}
                            </div>
                            {e.note && (
                              <div className="text-[11px] text-gray-500 italic mt-0.5">"{e.note}"</div>
                            )}
                            <div className="text-[10px] text-gray-700 mt-0.5 font-mono">{fmtDate(e.at)}</div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>

                  {/* Raw JSON */}
                  <section>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                      onClick={() => setShowRawJson(v => !v)}
                    >
                      <span>{showRawJson ? "▼" : "▶"}</span>
                      <span>raw record</span>
                    </button>
                    {showRawJson && (
                      <pre className="mt-2 text-[11px] bg-black/40 border border-gray-800 rounded p-3 overflow-x-auto text-gray-400 font-mono">
                        {JSON.stringify(selected.raw, null, 2)}
                      </pre>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
