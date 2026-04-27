"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import HarnessChip, { type HarnessArtifact } from "@/components/HarnessChip"
import { PageHeader } from "@/components/PageHeader"

/**
 * /attention — the master surface for everything the automation scripts
 * surfaced. Every contradiction, hallucination, voice drift, missing
 * profile, and promotion candidate lands here, ranked by leverage.
 *
 * The design principle: David opens this page each morning, does the
 * top 5 items, closes the app. The system handles everything else.
 *
 * Display rule: render entries in plain English. The producer scripts
 * write technical strings ("voice rule violations", "specific-number
 * density 0.0/100 words") into the canonical queue + markdown digest.
 * That's appropriate for the writeable record. But here on screen,
 * we humanize source names, soften jargon-y titles, and rewrite the
 * `why` body so David doesn't have to translate every entry mentally.
 * Translation is UI-only — the queue store and producers are untouched.
 *
 * The /alerts page used to surface a parallel set of signals computed
 * independently. It was retired 2026-04-24 in favor of /attention,
 * which has the same producers (contradiction-miner, missing-profile-
 * detector, etc.) writing through the unified queue.
 */

// ─── Plain-English translation layer ───────────────────────────────
// All UI-only. Reversible. The raw strings live in
// content/Admin Notes/Attention Queue.md (the writeable digest) and in
// the false-positive log keyed off the original text — touching those
// would break the producer feedback loop.

const SOURCE_LABELS: Record<string, string> = {
  "voice-drift-detector": "voice & quality scanner",
  "hallucination-catcher": "unsupported-claim check",
  "contradiction-miner": "cross-donor contradictions",
  "missing-profile-detector": "broken wikilinks",
  "promotion-candidate-queue": "ready to promote",
  "relationship-discovery": "new donor relationships",
  "audit-panel": "vault audit panel",
  "duplicate-bioguide-sentinel": "duplicate politician IDs",
  "stamp-expiry-check": "stale enrichment",
  "url-domain-policy": "dead source URLs",
}

function humanizeSource(source: string): string {
  return SOURCE_LABELS[source] || source.replace(/-/g, " ")
}

// Title rewrites: map common producer phrases to reader-friendly ones.
// First-match-wins. Each entry is [matcher, replacement | fn].
const TITLE_REWRITES: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [/^(.+?): voice rule violations?$/i, (m) => `${m[1]} — needs polish before it can ship`],
  [/^(.+?): schema violations?$/i, (m) => `${m[1]} — frontmatter doesn't match the template`],
  [/^(.+?): unsupported claims?$/i, (m) => `${m[1]} — claims without sources`],
  [/^(.+?): promotion candidate$/i, (m) => `${m[1]} — ready for editorial sign-off`],
  [/^(.+?): broken wikilinks?$/i, (m) => `${m[1]} — links to a profile that doesn't exist`],
  [/^(.+?): duplicate bioguide-id$/i, (m) => `${m[1]} — duplicate politician ID with another profile`],
  [/^(.+?): stale enrichment$/i, (m) => `${m[1]} — hasn't been refreshed in over 30 days`],
]

function humanizeTitle(what: string): string {
  for (const [pattern, replacement] of TITLE_REWRITES) {
    const m = what.match(pattern)
    if (m) {
      return typeof replacement === "function" ? replacement(m) : replacement
    }
  }
  return what
}

// Soften technical phrases in the why body. Order matters — apply
// longer/more specific replacements first.
const WHY_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(?:low\s+)?specific-number density [\d.]+\/100 words(?:\s*\(target [^)]+\))?/gi, "very few specific numbers in the prose"],
  [/(?:high\s+)?avg sentence length \d+ words(?:\s*\(target [^)]+\))?/gi, "sentences are running long"],
  [/These hard rules block ship/gi, "These block publication"],
  [/blocks ship/gi, "blocks publication"],
  [/before this profile renders on the public site/gi, "before this profile can go public"],
  [/em dash(?:es)? in body/gi, "em dashes in the prose"],
  [/AI vocabulary/gi, "telltale AI phrasing"],
  [/Ready profile contains/gi, "This profile contains"],
  [/Verified profile contains/gi, "This profile contains"],
  [/contains (\d+) em dash(?:es)?/gi, (_m: string, n: string) => `has ${n} em dash${n === "1" ? "" : "es"}`],
]

function softenWhy(why: string): string {
  let out = why
  for (const [pattern, replacement] of WHY_REPLACEMENTS) {
    if (typeof replacement === "function") {
      out = out.replace(pattern, replacement as never)
    } else {
      out = out.replace(pattern, replacement)
    }
  }
  return out
}

interface AttentionEntry {
  bucket: "blocking" | "deciding" | "compounding"
  what: string
  why: string
  where: string
  cost_min: number
  leverage: number
  source: string
  created: string
  metadata?: Record<string, unknown>
}

interface AttentionResponse {
  total: number
  buckets: {
    blocking: AttentionEntry[]
    deciding: AttentionEntry[]
    compounding: AttentionEntry[]
  }
  ranked: AttentionEntry[]
  sources: string[]
  // lastUpdated = newest entry across all sources (per-entry-based, P-026 fix).
  // perSourceLastUpdated = newest entry per source; lets the UI flag
  //   sources past their expected cadence.
  // storeMtime = file mtime (kept for debugging).
  lastUpdated: string | null
  perSourceLastUpdated?: Record<string, string | null>
  storeMtime?: string
  empty: boolean
}

const BUCKET_META: Record<
  string,
  { emoji: string; label: string; description: string; color: string }
> = {
  blocking: {
    emoji: "🔴",
    label: "Blocking",
    description: "Something is broken or will break soon. Handle first.",
    color: "var(--color-red)",
  },
  deciding: {
    emoji: "🟡",
    label: "Editorial Decisions",
    description: "Needs your editorial judgment. The quality work.",
    color: "var(--color-amber)",
  },
  compounding: {
    emoji: "🟢",
    label: "Background Cleanup",
    description: "Cleanup that makes everything else easier. Batch later.",
    color: "var(--color-green)",
  },
}

function renderLeverage(n: number): string {
  return "★".repeat(n) + "☆".repeat(5 - n)
}

function ratioString(leverage: number, cost: number): string {
  const r = leverage / cost
  return r.toFixed(2)
}

// Relative time — "3m ago", "2h ago", "5d ago". Falsy input returns "—".
// Used per-entry (P-027) so David can see that a 13-day-old entry is
// different from a 10-minute-old one.
function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  if (isNaN(ms) || ms < 0) return "—"
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export default function AttentionPage() {
  const [data, setData] = useState<AttentionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [bucketFilter, setBucketFilter] = useState<"all" | "blocking" | "deciding" | "compounding">(
    "all"
  )
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [harness, setHarness] = useState<HarnessArtifact | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)

  // Dispatcher liveness — cribbed from harness `dispatcher-alive` check.
  // findings_count > 0 means "the dispatcher daemon hasn't logged within
  // the expected uptime window" → background producers may be silent →
  // every count on this page is potentially frozen.
  const dispatcherCheck = harness?.checks.find((c) => c.name === "dispatcher-alive")
  const dispatcherDead = (dispatcherCheck?.findings_count ?? 0) > 0

  const refetch = () =>
    fetch("/api/attention-queue")
      .then((r) => r.json())
      .then((d: AttentionResponse) => setData(d))

  useEffect(() => {
    fetch("/api/attention-queue")
      .then((r) => r.json())
      .then((d: AttentionResponse) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Auto-refresh every 5 min — matches the dispatcher cadence (15 min)
  // closely enough that David sees fresh entries appear without doing
  // anything. Toggle off to pause polling.
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimer.current) clearInterval(refreshTimer.current)
      return
    }
    refreshTimer.current = setInterval(refetch, 300_000)
    return () => {
      if (refreshTimer.current) clearInterval(refreshTimer.current)
    }
  }, [autoRefresh])

  async function rejectItem(e: AttentionEntry) {
    const key = `${e.source}|${e.where}|${e.what}`
    if (rejecting) return
    const reason = window.prompt(
      `Reject this item as a false positive?\n\n"${e.what}"\n\nReason (optional — helps the script learn):`
    )
    if (reason === null) return
    setRejecting(key)
    try {
      const res = await fetch("/api/attention-queue/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: e.source,
          where: e.where,
          what: e.what,
          reason: reason || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        window.alert(`Reject failed: ${err.error || res.statusText}`)
        return
      }
      await refetch()
    } catch (err) {
      window.alert(`Reject failed: ${(err as Error).message}`)
    } finally {
      setRejecting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
        <div className="text-[11px] text-[var(--color-text-dim)]">Loading attention queue...</div>
      </div>
    )
  }

  if (!data || data.empty) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-2">
            <h1 className="text-2xl font-bold">🎯 Attention Queue</h1>
            <HarnessChip onLoad={setHarness} />
          </div>
          <p className="text-[12px] text-[var(--color-text-dim)] mb-6">
            Nothing in the queue right now. The dispatcher should populate this
            within 15 minutes — if it's been longer than that, the background
            scanner may be stuck.
          </p>
          {dispatcherDead && (
            <div className="bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded p-4 mb-4 text-[11px] text-[var(--color-red)]">
              <strong>Dispatcher hasn't logged recently.</strong> The harness
              check <code>dispatcher-alive</code> is flagging — that means the
              background scanner that fills this queue is probably crashed or
              paused. Open <Link href="/system-health" className="underline">System Health</Link> for details.
            </div>
          )}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4 text-[11px] text-[var(--color-text-dim)]">
            <p className="mb-2">
              <strong className="text-[var(--color-text)]">If you need to populate it manually right now:</strong>
            </p>
            <pre className="text-[10px] text-[var(--color-steel)] bg-[var(--color-bg)] p-2 rounded overflow-x-auto">
              {`node scripts/attention-dispatcher.cjs --run-now`}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  // Apply filters
  let visible: AttentionEntry[] = data.ranked
  if (bucketFilter !== "all") visible = visible.filter((e) => e.bucket === bucketFilter)
  if (sourceFilter !== "all") visible = visible.filter((e) => e.source === sourceFilter)

  const updatedAgo = data.lastUpdated
    ? (() => {
        const ms = Date.now() - new Date(data.lastUpdated).getTime()
        const min = Math.floor(ms / 60000)
        if (min < 1) return "just now"
        if (min < 60) return `${min} min ago`
        const hr = Math.floor(min / 60)
        if (hr < 24) return `${hr}h ago`
        return `${Math.floor(hr / 24)}d ago`
      })()
    : "—"

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-4">
          <Link href="/" className="hover:text-[var(--color-text)]">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-[var(--color-text)]">Attention Queue</span>
        </div>

        {/* Header */}
        <PageHeader
          title="Attention Queue"
          whatThisDoes="The master surface for everything the harness + automation surfaced. Every contradiction, hallucination, voice drift, missing profile, class-tag staleness, librarian-validation alert — all of it lands here, ranked by leverage per minute."
          rightNow={harness ? (
            <>
              <strong>{(harness.summary?.findings_total ?? 0).toLocaleString()}</strong> total findings across{" "}
              <strong>{(harness.summary?.checks_with_findings ?? 0)}</strong> checks
            </>
          ) : "loading harness summary…"}
          action="Open this each morning. Do the top 5 items. Close the app. The harness handles everything else; auto-refresh keeps it live."
        />
        <div className="mb-4 flex items-start justify-end gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-dim)] cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={() => setAutoRefresh((p) => !p)}
                className="rounded accent-[var(--color-green)]"
              />
              Auto-refresh
              {autoRefresh && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)] animate-pulse" />
              )}
            </label>
            <HarnessChip onLoad={setHarness} />
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                last updated
              </div>
              <div className="text-[11px] text-[var(--color-text)]">{updatedAgo}</div>
            </div>
          </div>
        </div>

        {/* Dispatcher-dead banner — the load-bearing trust signal. If the
            background dispatcher hasn't logged within its expected uptime
            window, every count on this page is potentially frozen and the
            user needs to know before they triage. */}
        {dispatcherDead && (
          <div className="mb-4 bg-[var(--color-red)]/10 border border-[var(--color-red)]/30 rounded p-3 text-[11px] text-[var(--color-red)]">
            <strong>Dispatcher silent.</strong> The harness check{" "}
            <code className="bg-[var(--color-red)]/20 px-1 rounded">dispatcher-alive</code>{" "}
            says the background scanner that fills this queue hasn't logged in.
            New entries may not be appearing.{" "}
            <Link href="/system-health" className="underline">Open System Health</Link> to investigate.
          </div>
        )}

        {/* Bucket summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {(["blocking", "deciding", "compounding"] as const).map((bucket) => {
            const meta = BUCKET_META[bucket]
            const count = data.buckets[bucket].length
            const isActive = bucketFilter === bucket
            return (
              <button
                key={bucket}
                onClick={() => setBucketFilter(isActive ? "all" : bucket)}
                className={`bg-[var(--color-bg-card)] border rounded p-4 text-left transition-colors ${
                  isActive
                    ? "border-[var(--color-text)]"
                    : "border-[var(--color-border)] hover:border-[var(--color-text-dim)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{meta.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                      {meta.label}
                    </div>
                    <div
                      className="text-2xl font-bold mt-1"
                      style={{ color: meta.color }}
                    >
                      {count}
                    </div>
                    <div className="text-[9px] text-[var(--color-text-dim)] mt-0.5 leading-tight">
                      {meta.description}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 text-[10px] flex-wrap">
          <span className="text-[var(--color-text-dim)] uppercase tracking-wider">
            Source:
          </span>
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-2 py-1 rounded border transition-colors ${
              sourceFilter === "all"
                ? "border-[var(--color-text)] text-[var(--color-text)]"
                : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            }`}
          >
            All ({data.total})
          </button>
          {data.sources.map((s) => {
            const count = data.ranked.filter((e) => e.source === s).length
            const srcFreshness = data.perSourceLastUpdated?.[s]
            return (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                title={`${s}${srcFreshness ? ` · newest entry ${timeAgo(srcFreshness)} (${srcFreshness})` : " · no entries timestamped"}`}
                className={`px-2 py-1 rounded border transition-colors ${
                  sourceFilter === s
                    ? "border-[var(--color-text)] text-[var(--color-text)]"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {humanizeSource(s)} ({count})
                {srcFreshness && (
                  <span className="ml-1 text-[var(--color-steel)]">· {timeAgo(srcFreshness)}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Entry list */}
        <div className="space-y-3">
          {visible.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-6 text-center text-[11px] text-[var(--color-text-dim)]">
              No items match the current filters.
            </div>
          ) : (
            visible.map((e, i) => {
              const meta = BUCKET_META[e.bucket]
              // Is this a file path? Render as link to profile detail
              const isFilePath = e.where.startsWith("content/")
              const linkHref = isFilePath
                ? `/profile?path=${encodeURIComponent(e.where)}`
                : e.where
              const rejectKey = `${e.source}|${e.where}|${e.what}`
              const isRejecting = rejecting === rejectKey
              return (
                <div
                  key={i}
                  className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4"
                  style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={linkHref}
                        className="text-[13px] font-bold text-[var(--color-text)] hover:text-[var(--color-steel)] block"
                      >
                        {humanizeTitle(e.what)}
                      </Link>
                      <div className="text-[10px] text-[var(--color-text-dim)] mt-0.5">
                        {meta.emoji} {meta.label} · surfaced by{" "}
                        <span className="text-[var(--color-steel)]" title={e.source}>
                          {humanizeSource(e.source)}
                        </span>
                        {" · "}
                        <span
                          className="text-[var(--color-steel)]"
                          title={`First flagged: ${e.created}`}
                        >
                          {timeAgo(e.created)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div
                        className="text-[10px] font-bold"
                        style={{ color: meta.color }}
                        title={`Leverage: ${e.leverage}/5 · Cost: ${e.cost_min} min · Ratio: ${ratioString(e.leverage, e.cost_min)}`}
                      >
                        {renderLeverage(e.leverage)}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-dim)] mt-0.5">
                        ~{e.cost_min} min
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--color-text)] leading-snug mb-2">
                    {softenWhy(e.why)}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    {isFilePath ? (
                      <Link
                        href={linkHref}
                        title="Open in editor"
                        className="text-[9px] text-[var(--color-text-dim)] hover:text-[var(--color-steel)] font-mono truncate transition-colors"
                      >
                        {e.where}
                      </Link>
                    ) : (
                      <div className="text-[9px] text-[var(--color-text-dim)] font-mono truncate">
                        {e.where}
                      </div>
                    )}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      {isFilePath && (
                        <Link
                          href={linkHref}
                          title="Open this profile in the editor to fix the issue"
                          className="text-[9px] uppercase tracking-wider px-2 py-1 rounded border border-[var(--color-steel)]/40 text-[var(--color-steel)] hover:text-[var(--color-text)] hover:border-[var(--color-steel)] transition-colors"
                        >
                          ✎ edit
                        </Link>
                      )}
                      <button
                        onClick={() => rejectItem(e)}
                        disabled={isRejecting}
                        title="Mark as false positive. The script will learn to skip this pattern on future runs."
                        className="text-[9px] uppercase tracking-wider px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-red)] hover:border-[var(--color-red)] disabled:opacity-50 disabled:cursor-wait transition-colors"
                      >
                        {isRejecting ? "rejecting…" : "✕ reject"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded text-[10px] text-[var(--color-text-dim)]">
          <p className="mb-2">
            <strong className="text-[var(--color-text)]">How this queue gets populated:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>
              Every script in <code className="text-[var(--color-steel)]">/scripts</code> that
              finds something actionable contributes entries here.
            </li>
            <li>
              Each entry is tagged with a leverage score (1-5 stars) and a cost estimate (minutes).
            </li>
            <li>
              Items sort by leverage ÷ cost — the biggest wins per minute first.
            </li>
            <li>
              When you reject an item (not worth doing), add it to the false-positive log so the
              surfacing script learns to skip similar patterns.
            </li>
            <li>
              <strong>Re-run the scripts</strong> any time to refresh the queue:{" "}
              <code className="text-[var(--color-steel)]">
                node scripts/voice-drift-detector.cjs
              </code>{" "}
              etc.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
