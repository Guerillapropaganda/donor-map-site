"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

/**
 * /attention — the master surface for everything the automation scripts
 * surfaced. Every contradiction, hallucination, voice drift, missing
 * profile, and promotion candidate lands here, ranked by leverage.
 *
 * The design principle: David opens this page each morning, does the
 * top 5 items, closes the app. The system handles everything else.
 */

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
  lastUpdated: string | null
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

export default function AttentionPage() {
  const [data, setData] = useState<AttentionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [bucketFilter, setBucketFilter] = useState<"all" | "blocking" | "deciding" | "compounding">(
    "all"
  )
  const [sourceFilter, setSourceFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/attention-queue")
      .then((r) => r.json())
      .then((d: AttentionResponse) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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
          <h1 className="text-2xl font-bold mb-2">🎯 Attention Queue</h1>
          <p className="text-[12px] text-[var(--color-text-dim)] mb-6">
            Nothing here yet. Run the automation scripts to populate the queue.
          </p>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-4 text-[11px] text-[var(--color-text-dim)]">
            <p className="mb-2">
              <strong className="text-[var(--color-text)]">First time setup:</strong>
            </p>
            <pre className="text-[10px] text-[var(--color-steel)] bg-[var(--color-bg)] p-2 rounded overflow-x-auto">
              {`node scripts/voice-drift-detector.cjs
node scripts/hallucination-catcher.cjs
node scripts/contradiction-miner.cjs
node scripts/missing-profile-detector.cjs
node scripts/promotion-candidate-queue.cjs`}
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
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">🎯 Attention Queue</h1>
            <p className="text-[12px] text-[var(--color-text-dim)]">
              Every script-surfaced item you should know about, ranked by leverage per minute.
              Work top-to-bottom, once a day.
            </p>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
              last updated
            </div>
            <div className="text-[11px] text-[var(--color-text)]">{updatedAgo}</div>
          </div>
        </div>

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
            return (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`px-2 py-1 rounded border transition-colors ${
                  sourceFilter === s
                    ? "border-[var(--color-text)] text-[var(--color-text)]"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
              >
                {s} ({count})
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
                        {e.what}
                      </Link>
                      <div className="text-[10px] text-[var(--color-text-dim)] mt-0.5">
                        {meta.emoji} {meta.label} · surfaced by{" "}
                        <code className="text-[var(--color-steel)]">{e.source}</code>
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
                    {e.why}
                  </p>
                  <div className="text-[9px] text-[var(--color-text-dim)] font-mono">
                    {e.where}
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
