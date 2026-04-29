"use client"

/**
 * /change-log — chronological "what changed across the vault" log.
 *
 * Backed by data/change-log.jsonl (post-commit hook). Two-pane layout
 * matching /audit-claude-decisions: list left, dossier right with full
 * commit body + files_changed + stat. Filters in URL so views are
 * shareable.
 *
 * Plain-language explainer up top, per the "explain things like a child"
 * memory.
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { PageHeader } from "@/components/PageHeader"
import { useRouter, useSearchParams } from "next/navigation"

interface ChangeLogRecord {
  sha: string
  short_sha: string
  at: string
  author: string
  subject: string
  body: string
  files_changed: string[]
  stat: { files: number; insertions: number; deletions: number }
  branch: string
  session_id: string | null
  produced_by: string
}

interface Stats {
  total_commits: number
  total_authors: number
  oldest: string | null
  newest: string | null
  total_file_touches: number
}

interface ApiResponse {
  records: ChangeLogRecord[]
  total_filtered: number
  stats: Stats
  authors: string[]
}

const SINCE_PRESETS = [
  { label: "all time", value: "" },
  { label: "last 24h", value: "24h" },
  { label: "last 7d", value: "7d" },
  { label: "last 30d", value: "30d" },
]

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
}

function fmtRelative(iso: string): string {
  const t = Date.parse(iso)
  if (isNaN(t)) return iso
  const diff = Date.now() - t
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function commitTone(record: ChangeLogRecord): string {
  // Heuristic chip: green = adds, red = deletes, blue = mixed/neutral.
  const { insertions, deletions } = record.stat || { insertions: 0, deletions: 0 }
  if (insertions > deletions * 3) return "bg-green-950 text-green-300"
  if (deletions > insertions * 3) return "bg-red-950 text-red-300"
  return "bg-blue-950 text-blue-300"
}

export default function ChangeLogPage() {
  const router = useRouter()
  const sp = useSearchParams()

  const authorFilter = (sp.get("author") || "").split(",").filter(Boolean)
  const search = sp.get("q") || ""
  const pathFilter = sp.get("path") || ""
  const since = sp.get("since") || ""
  const selectedSha = sp.get("sel") || ""

  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExplainer, setShowExplainer] = useState(false)
  const [showFiles, setShowFiles] = useState(true)

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
      if (authorFilter.length) params.set("author", authorFilter.join(","))
      if (search) params.set("q", search)
      if (pathFilter) params.set("path", pathFilter)
      if (since) params.set("since", since)
      params.set("limit", "500")
      const res = await fetch(`/api/change-log?${params}`)
      if (!res.ok) throw new Error(await res.text())
      setResponse(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [authorFilter.join(","), search, pathFilter, since])

  useEffect(() => { fetchList() }, [fetchList])

  const selected = useMemo(() => {
    if (!selectedSha || !response) return null
    return response.records.find((r) => r.sha === selectedSha || r.short_sha === selectedSha) || null
  }, [selectedSha, response])

  // Auto-select first if nothing selected
  useEffect(() => {
    if (!selectedSha && response && response.records.length > 0) {
      updateUrl({ sel: response.records[0].short_sha })
    }
  }, [selectedSha, response, updateUrl])

  const toggleAuthor = (a: string) => {
    const next = authorFilter.includes(a)
      ? authorFilter.filter((x) => x !== a)
      : [...authorFilter, a]
    updateUrl({ author: next.join(",") || null })
  }

  // Header summary
  const summary = useMemo(() => {
    if (!response) return ""
    const s = response.stats
    return `${s.total_commits} commit${s.total_commits === 1 ? "" : "s"} from ${s.total_authors} author${s.total_authors === 1 ? "" : "s"} · ${s.total_file_touches} file touches · ${response.total_filtered} match filters`
  }, [response])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <PageHeader
        title="Change Log"
        whatThisDoes="Every commit landing in the repo, in chronological order. One row per commit. Click a row to see the message + every file the commit touched. Filter by author, by file path (e.g. show me everything that touched scripts/), by date. Records are written automatically by the post-commit hook — nothing slips through."
        rightNow={summary || "Loading…"}
        action="j/k = nav · enter = focus · click a file path to copy it"
      />

      <div className="max-w-[1600px] mx-auto px-4 py-4 space-y-3">
        {/* Plain-language explainer */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 text-sm text-gray-300">
          <button
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-xs"
            onClick={() => setShowExplainer((v) => !v)}
          >
            <span>{showExplainer ? "▼" : "▶"}</span>
            <span>What is this page? (plain words)</span>
          </button>
          {showExplainer && (
            <div className="mt-3 space-y-3 leading-relaxed">
              <p>
                Every time someone (you or Claude) saves a batch of changes
                to the project, that batch gets a stamp called a <strong>commit</strong>.
                Each commit lists what changed and what time it happened.
                Until now, the only place to see those was buried in <code className="bg-black/30 px-1 rounded">git log</code>.
              </p>
              <p>
                This page is the same information, but{" "}
                <strong>browseable, filterable, and searchable</strong>. You
                can ask questions like:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                <li>"What did Claude change in the last 24 hours?"</li>
                <li>"Every time scripts/calibration-auto-revert.cjs was touched, who touched it?"</li>
                <li>"Show me everything from this week."</li>
                <li>"Find that commit where I fixed the Amgen thing."</li>
              </ul>
              <p>
                The <strong className="text-green-400">green chip</strong>{" "}
                on a row means it added more than it removed. <strong className="text-red-400">Red</strong>{" "}
                means it removed more than it added. <strong className="text-blue-400">Blue</strong>{" "}
                means it was balanced. Quick visual scan to spot a big
                deletion you don't remember signing off on.
              </p>
              <p>
                Click any commit to see the full message and the list of
                every file it touched. Filters live in the URL — bookmark
                or share specific views.
              </p>
              <p className="text-xs text-gray-500">
                <strong>Why this exists:</strong> per the 2026-04-29 logging-gap
                discussion. The post-commit hook writes one record per
                commit to <code className="bg-black/30 px-1 rounded">data/change-log.jsonl</code>,
                so nothing Claude does goes unrecorded — even if the commit
                message is terse.
              </p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-1">author:</span>
            {response?.authors.map((a) => {
              const active = authorFilter.includes(a)
              return (
                <button
                  key={a}
                  onClick={() => toggleAuthor(a)}
                  className={`text-xs px-2 py-1 rounded border ${active ? "bg-blue-900 border-blue-700 text-blue-200" : "bg-gray-950 border-gray-800 text-gray-500"}`}
                >
                  {a}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search subject / body / sha / file…"
              className="flex-1 min-w-[240px] bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500"
              value={search}
              onChange={(e) => updateUrl({ q: e.target.value || null })}
            />
            <input
              type="text"
              placeholder="File path contains…"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-500 w-[220px]"
              value={pathFilter}
              onChange={(e) => updateUrl({ path: e.target.value || null })}
              title="Filter to commits that touched any file matching this substring (e.g. 'scripts/' or 'audit-')"
            />
            <select
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm"
              value={since}
              onChange={(e) => updateUrl({ since: e.target.value || null })}
            >
              {SINCE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {loading && <span className="text-blue-400 text-xs">Loading…</span>}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded p-3 text-red-300 text-sm">{error}</div>
        )}

        {/* Two-pane */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(420px,42%)_1fr] gap-3">
          {/* List */}
          <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800 text-xs text-gray-400">
              {response?.records.length ?? 0} commit{response?.records.length === 1 ? "" : "s"}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
              {response?.records.length === 0 && !loading && (
                <div className="px-3 py-8 text-center text-gray-500 text-sm">No commits match these filters.</div>
              )}
              {response?.records.map((r) => {
                const isSelected = r.sha === selected?.sha
                return (
                  <button
                    key={r.sha}
                    onClick={() => updateUrl({ sel: r.short_sha })}
                    className={`w-full text-left px-3 py-2 border-b border-gray-800 hover:bg-gray-800/50 ${isSelected ? "bg-gray-800/80 border-l-2 border-l-blue-500" : ""}`}
                  >
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <code className="text-gray-500 font-mono">{r.short_sha}</code>
                      <span className={`px-1.5 py-0.5 rounded ${commitTone(r)} text-[10px]`} title={`+${r.stat?.insertions || 0} insertions / −${r.stat?.deletions || 0} deletions`}>
                        +{r.stat?.insertions || 0} −{r.stat?.deletions || 0}
                      </span>
                      <span className="text-gray-600 text-[10px]">{r.stat?.files || 0} file{r.stat?.files === 1 ? "" : "s"}</span>
                      <span className="flex-1" />
                      <span className="text-gray-600 text-[10px]" title={fmtDate(r.at)}>{fmtRelative(r.at)}</span>
                    </div>
                    <div className="text-sm text-gray-200 truncate">{r.subject || "(no subject)"}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      <span className="text-gray-400">{r.author}</span>
                      {r.branch && <span className="text-gray-700"> · {r.branch}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Detail dossier */}
          <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 240px)" }}>
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-8">
                Select a commit to view its full message and file list.
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <code className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">{selected.short_sha}</code>
                    <span className={`text-xs px-2 py-0.5 rounded ${commitTone(selected)}`}>
                      +{selected.stat?.insertions || 0} −{selected.stat?.deletions || 0}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                      {selected.stat?.files || 0} file{selected.stat?.files === 1 ? "" : "s"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{selected.author}</span>
                    {selected.branch && <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-500">{selected.branch}</span>}
                    <div className="flex-1" />
                    <span className="text-[11px] text-gray-600" title={fmtDate(selected.at)}>{fmtRelative(selected.at)}</span>
                  </div>
                  <div className="text-base text-gray-100 font-medium">{selected.subject}</div>
                  <div className="text-[11px] text-gray-700 mt-1 font-mono break-all">{selected.sha}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selected.body && (
                    <section>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">commit message</h3>
                      <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono bg-black/30 rounded p-3 border border-gray-800">{selected.body}</pre>
                    </section>
                  )}

                  <section>
                    <button
                      className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1 hover:text-gray-200"
                      onClick={() => setShowFiles((v) => !v)}
                    >
                      <span>{showFiles ? "▼" : "▶"}</span>
                      <span>files changed ({selected.files_changed.length})</span>
                    </button>
                    {showFiles && (
                      <ul className="mt-2 text-xs font-mono space-y-0.5">
                        {selected.files_changed.map((f) => (
                          <li
                            key={f}
                            className="text-gray-400 hover:text-gray-200 cursor-pointer break-all"
                            title="Click to copy + filter to all commits touching this file"
                            onClick={() => {
                              navigator.clipboard?.writeText(f)
                              updateUrl({ path: f })
                            }}
                          >
                            {f}
                          </li>
                        ))}
                      </ul>
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
