"use client"

/**
 * ops/policies — policy review + promote + publish dashboard
 *
 * The single surface where David reviews each v1 policy page and ships
 * it to the public site. Built per the design conversation on 2026-04-15:
 *
 *   - Dashboard view: all 5 policies visible, no pagination
 *   - Inline preview that expands in place (no modal, no navigation)
 *   - react-markdown + remark-gfm renders the exact public markdown
 *   - Two distinct actions per policy:
 *       1. Promote to verified (internal flag, reversible)
 *       2. Publish to public (two-click confirm, appends slug to
 *          data/public-routes.json, needs git push + deploy to go live)
 *   - Keyboard shortcuts: ↑/↓ cycle, Enter/Space expand, P promote,
 *     U publish, X collapse, ? help
 *   - Optimistic UI: action → card updates immediately → API call
 *     reconciles → toast on success/failure
 *
 * Data sources:
 *   GET  /api/policies              — list + gate status + counts
 *   GET  /api/policies/[slug]/preview — raw markdown for inline render
 *   POST /api/policies/promote      — flip to verified
 *   POST /api/policies/demote       — roll back to draft
 *   POST /api/policies/publish      — add to public-routes.json
 *
 * Auth: the page itself is admin-only via the layout's ClerkProvider
 * cookie; all API routes double-check via requireAdmin server-side.
 */

import { useState, useEffect, useCallback, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PageHeader } from "@/components/PageHeader"

// ─── Types ──────────────────────────────────────────────────────────

interface PolicyRow {
  id: string
  slug: string
  title: string
  category: string
  content_readiness: string
  legislative_status: string
  high_risk_editorial: boolean
  requires_legal_review: boolean
  opposition_capital_types: string[]
  class_analysis_tags: string[]
  last_updated: string
  published_at: string | null
  is_public?: boolean
  counts: {
    polls: number
    events: number
    opposition_capital_types: number
  }
  gate: {
    ready: boolean
    failures: string[]
  }
}

interface PolicyListResponse {
  total: number
  verified: number
  policies: PolicyRow[]
}

interface PreviewResponse {
  slug: string
  frontmatter: Record<string, any>
  body: string
  raw: string
}

interface Toast {
  id: number
  kind: "info" | "success" | "error"
  text: string
}

// ─── Helpers ────────────────────────────────────────────────────────

function readinessBadgeClass(readiness: string): string {
  switch (readiness) {
    case "verified":
      return "bg-green-900 text-green-200 border-green-700"
    case "ready":
      return "bg-amber-900 text-amber-200 border-amber-700"
    case "draft":
      return "bg-neutral-800 text-neutral-400 border-neutral-700"
    default:
      return "bg-neutral-800 text-neutral-500 border-neutral-700"
  }
}

// ─── 2026-04-26 redesign helpers ────────────────────────────────────

function relativeDays(iso: string | null | undefined): string {
  if (!iso) return "—"
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return "—"
  const days = Math.floor(ms / 86400000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function applyFilterSort(
  policies: PolicyRow[],
  filter: "all" | "verified" | "ready" | "live" | "legal",
  sort: "default" | "last_updated" | "title" | "gate",
): PolicyRow[] {
  let out = policies
  if (filter === "verified") out = out.filter((p) => p.content_readiness === "verified")
  else if (filter === "ready") out = out.filter((p) => p.gate.ready && p.content_readiness !== "verified")
  else if (filter === "live") out = out.filter((p) => p.is_public)
  else if (filter === "legal") out = out.filter((p) => p.high_risk_editorial)
  if (sort === "default") return out
  const sorted = [...out]
  if (sort === "last_updated") sorted.sort((a, b) => (b.last_updated || "").localeCompare(a.last_updated || ""))
  else if (sort === "title") sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""))
  else if (sort === "gate") sorted.sort((a, b) => Number(b.gate.ready) - Number(a.gate.ready))
  return sorted
}

function FilterChip({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color?: "green" | "amber" | "red"
}) {
  const base = "px-3 py-1.5 text-xs rounded border transition-colors flex items-center gap-1.5"
  const palette =
    color === "green"
      ? active
        ? "bg-green-900/60 border-green-600 text-green-100"
        : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-green-700/60 hover:text-green-300"
      : color === "amber"
      ? active
        ? "bg-amber-900/60 border-amber-600 text-amber-100"
        : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-amber-700/60 hover:text-amber-300"
      : color === "red"
      ? active
        ? "bg-red-900/60 border-red-600 text-red-100"
        : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-red-700/60 hover:text-red-300"
      : active
      ? "bg-neutral-700 border-neutral-500 text-neutral-100"
      : "bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-500"
  return (
    <button onClick={onClick} className={`${base} ${palette}`}>
      <span>{label}</span>
      <span className="font-mono font-bold">{count}</span>
    </button>
  )
}

function PolicySteps({
  contentReadiness,
  gateReady,
  isPublic,
}: {
  contentReadiness: string
  gateReady: boolean
  isPublic: boolean
}) {
  // Step 0: Draft (always reached if record exists)
  // Step 1: Ready — content_readiness === "ready" OR "verified" OR gate.ready
  // Step 2: Verified — content_readiness === "verified"
  // Step 3: Live — is_public
  const verified = contentReadiness === "verified"
  const ready = verified || contentReadiness === "ready" || gateReady
  const steps: { label: string; done: boolean; current: boolean }[] = [
    { label: "Draft", done: true, current: !ready },
    { label: "Ready", done: ready, current: ready && !verified },
    { label: "Verified", done: verified, current: verified && !isPublic },
    { label: "Live", done: isPublic, current: isPublic },
  ]
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-1">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono ${
              s.current
                ? "bg-amber-500 text-black font-bold"
                : s.done
                ? "bg-green-900/60 text-green-200"
                : "bg-neutral-800 text-neutral-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                s.current ? "bg-black" : s.done ? "bg-green-400" : "bg-neutral-600"
              }`}
            />
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <span className={`text-[10px] ${steps[i + 1].done ? "text-green-700" : "text-neutral-700"}`}>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function StatCell({
  value,
  label,
  hint,
}: {
  value: number | string
  label: string
  hint?: string
}) {
  return (
    <div
      className="bg-neutral-800/40 border border-neutral-800 rounded px-3 py-2"
      title={hint}
    >
      <div className="text-lg font-mono font-bold text-white leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mt-0.5">{label}</div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline preview state — which slug is expanded and its content
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Two-click publish confirmation — holds the slug that's been
  // clicked once (needs a second click within 5s to actually fire)
  const [publishConfirming, setPublishConfirming] = useState<string | null>(null)
  const publishConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Filter + sort (2026-04-26 redesign) ─────────────────────────
  // Filter chips at the top funnel down to one slice; sort dropdown
  // changes the ordering within that slice.
  const [filter, setFilter] = useState<"all" | "verified" | "ready" | "live" | "legal">("all")
  const [sort, setSort] = useState<"default" | "last_updated" | "title" | "gate">("default")

  // Keyboard navigation — which card is "focused" for ↑/↓
  const [focusIdx, setFocusIdx] = useState(0)

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  // Help overlay
  const [showHelp, setShowHelp] = useState(false)

  // ─── Data loading ─────────────────────────────────────────────────
  const loadPolicies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/policies", { credentials: "include" })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const data: PolicyListResponse = await res.json()
      setPolicies(data.policies || [])
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPolicies()
  }, [loadPolicies])

  // ─── Toast plumbing ───────────────────────────────────────────────
  const pushToast = useCallback((kind: Toast["kind"], text: string) => {
    toastIdRef.current += 1
    const id = toastIdRef.current
    setToasts((prev) => [...prev, { id, kind, text }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  // ─── Preview ──────────────────────────────────────────────────────
  const togglePreview = useCallback(
    async (slug: string) => {
      if (expandedSlug === slug) {
        setExpandedSlug(null)
        setPreview(null)
        return
      }
      setExpandedSlug(slug)
      setPreview(null)
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/policies/${slug}/preview`, {
          credentials: "include",
        })
        if (!res.ok) {
          const body = await res.text()
          throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
        }
        const data: PreviewResponse = await res.json()
        setPreview(data)
      } catch (err: any) {
        pushToast("error", `preview failed: ${err.message}`)
      } finally {
        setPreviewLoading(false)
      }
    },
    [expandedSlug, pushToast],
  )

  // ─── Actions ──────────────────────────────────────────────────────
  const promote = useCallback(
    async (slug: string) => {
      pushToast("info", `Promoting ${slug}...`)
      // Optimistic: mark as verified immediately
      setPolicies((prev) =>
        prev.map((p) =>
          p.slug === slug ? { ...p, content_readiness: "verified" } : p,
        ),
      )
      try {
        const res = await fetch("/api/policies/promote", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        })
        const data = await res.json()
        if (!res.ok) {
          // Revert optimistic update
          await loadPolicies()
          const failureText = data.failures?.length
            ? ` — ${data.failures[0]}`
            : ""
          pushToast(
            "error",
            `${data.error || `HTTP ${res.status}`}${failureText}`,
          )
          return
        }
        pushToast("success", `✓ ${slug} → verified. Ready to publish.`)
        await loadPolicies()
      } catch (err: any) {
        await loadPolicies()
        pushToast("error", `Promote failed: ${err.message}`)
      }
    },
    [loadPolicies, pushToast],
  )

  const demote = useCallback(
    async (slug: string) => {
      const reason = window.prompt(
        `Demote ${slug} back to draft. Reason (optional):`,
      )
      if (reason === null) return
      pushToast("info", `Demoting ${slug}...`)
      try {
        const res = await fetch("/api/policies/demote", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, reason }),
        })
        const data = await res.json()
        if (!res.ok) {
          pushToast("error", data.error || `HTTP ${res.status}`)
          return
        }
        pushToast("success", `✓ ${slug} → draft`)
        await loadPolicies()
      } catch (err: any) {
        pushToast("error", `Demote failed: ${err.message}`)
      }
    },
    [loadPolicies, pushToast],
  )

  const publish = useCallback(
    async (slug: string) => {
      // Two-click guard
      if (publishConfirming !== slug) {
        setPublishConfirming(slug)
        if (publishConfirmTimer.current)
          clearTimeout(publishConfirmTimer.current)
        publishConfirmTimer.current = setTimeout(() => {
          setPublishConfirming(null)
        }, 5000)
        return
      }
      // Second click — actually fire
      setPublishConfirming(null)
      if (publishConfirmTimer.current) clearTimeout(publishConfirmTimer.current)
      pushToast("info", `Staging ${slug} for publish...`)
      try {
        const res = await fetch("/api/policies/publish", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        })
        const data = await res.json()
        if (!res.ok) {
          pushToast("error", data.error || `HTTP ${res.status}`)
          return
        }
        pushToast(
          "success",
          `✓ ${slug} staged. ${data.next_step || "Commit data/public-routes.json and push to v4 to go live."}`,
        )
        await loadPolicies()
      } catch (err: any) {
        pushToast("error", `Publish failed: ${err.message}`)
      }
    },
    [publishConfirming, loadPolicies, pushToast],
  )

  // ─── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore if typing in an input
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      if (e.key === "?") {
        setShowHelp((prev) => !prev)
        return
      }
      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false)
          return
        }
        if (expandedSlug) {
          setExpandedSlug(null)
          setPreview(null)
          return
        }
      }
      if (!policies.length) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setFocusIdx((i) => Math.min(i + 1, policies.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setFocusIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        const p = policies[focusIdx]
        if (p) togglePreview(p.slug)
      } else if (e.key === "p" || e.key === "P") {
        const p = policies[focusIdx]
        if (p && p.content_readiness !== "verified" && p.gate.ready) {
          promote(p.slug)
        }
      } else if (e.key === "u" || e.key === "U") {
        const p = policies[focusIdx]
        if (p && p.content_readiness === "verified") {
          publish(p.slug)
        }
      } else if (e.key === "x" || e.key === "X") {
        if (expandedSlug) {
          setExpandedSlug(null)
          setPreview(null)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [policies, focusIdx, expandedSlug, showHelp, togglePreview, promote, publish])

  // ─── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-neutral-400 font-mono text-sm">
        Loading policies...
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/30 border border-red-700 text-red-200 p-4 font-mono text-sm">
          Error: {error}
        </div>
      </div>
    )
  }

  const verifiedCount = policies.filter((p) => p.content_readiness === "verified").length

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Policies"
        whatThisDoes="Dashboard for the v1 Policy Battles (ADR-0004) — review each policy's draft, promote drafts to verified once their gate is green, then publish to the public site by adding to data/public-routes.json. Per-policy preview is inline."
        rightNow={
          <>
            <strong>{verifiedCount}</strong> / {policies.length} verified ·
            {" "}
            <strong>{policies.filter((p) => p.is_public).length}</strong> currently live
            {policies.filter((p) => p.gate.ready && p.content_readiness !== "verified").length > 0
              ? ` · ${policies.filter((p) => p.gate.ready && p.content_readiness !== "verified").length} drafts ready to promote`
              : ""}
          </>
        }
        action={
          'Click a row to expand its preview inline. "Ship it → Promote to verified" promotes a passing draft. "Publish to public" stages data/public-routes.json (you commit + push manually). Press ? for keyboard shortcuts.'
        }
        freshness={[
          {
            paths: ["data/policies.jsonl"],
            label: "policy records",
            freshWithinDays: 7,
            warnWithinDays: 30,
          },
          {
            paths: ["data/polling.jsonl"],
            label: "polling data",
            freshWithinDays: 14,
            warnWithinDays: 60,
          },
          {
            paths: ["data/events.jsonl"],
            label: "events",
            freshWithinDays: 1,
            warnWithinDays: 7,
          },
        ]}
      />
      {/* ─── Stat strip + filter chips ─────────────────────────────────
          Click a chip to filter the list to that bucket. Each chip's
          count is computed from the loaded policies array. */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <FilterChip label="all" count={policies.length} active={filter === "all"} onClick={() => setFilter("all")} />
        <FilterChip label="verified" count={policies.filter((p) => p.content_readiness === "verified").length} active={filter === "verified"} onClick={() => setFilter("verified")} color="green" />
        <FilterChip label="ready to promote" count={policies.filter((p) => p.gate.ready && p.content_readiness !== "verified").length} active={filter === "ready"} onClick={() => setFilter("ready")} color="amber" />
        <FilterChip label="live" count={policies.filter((p) => p.is_public).length} active={filter === "live"} onClick={() => setFilter("live")} color="green" />
        <FilterChip label="legal review" count={policies.filter((p) => p.high_risk_editorial).length} active={filter === "legal"} onClick={() => setFilter("legal")} color="red" />
        <div className="ml-auto flex gap-2 items-center text-xs text-neutral-500">
          <span>sort:</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300"
          >
            <option value="default">status order (drafts first)</option>
            <option value="last_updated">last updated</option>
            <option value="title">title A-Z</option>
            <option value="gate">gate readiness</option>
          </select>
          <button
            onClick={() => setShowHelp((p) => !p)}
            className="underline text-neutral-400 hover:text-white ml-2"
          >
            keyboard help (?)
          </button>
        </div>
      </div>

      {/* Help overlay */}
      {showHelp && (
        <div className="mb-6 bg-neutral-900 border border-neutral-700 p-4 font-mono text-xs text-neutral-300 rounded">
          <div className="font-bold text-white mb-2">Keyboard shortcuts</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><span className="text-amber-400">↑ ↓</span> — move between cards</div>
            <div><span className="text-amber-400">Enter / Space</span> — expand preview</div>
            <div><span className="text-amber-400">P</span> — promote to verified</div>
            <div><span className="text-amber-400">U</span> — publish (two presses)</div>
            <div><span className="text-amber-400">X / Esc</span> — collapse preview</div>
            <div><span className="text-amber-400">?</span> — show/hide this help</div>
          </div>
        </div>
      )}

      {/* Policy list */}
      <div className="space-y-3">
        {applyFilterSort(policies, filter, sort).map((p, idx) => {
          const isExpanded = expandedSlug === p.slug
          const isFocused = idx === focusIdx
          const canPromote = p.content_readiness !== "verified" && p.gate.ready
          // Hide the publish button when already public (idempotent on the
          // server side, but the UI shouldn't pretend an action is needed).
          const canPublish = p.content_readiness === "verified" && !p.is_public
          const isConfirmingPublish = publishConfirming === p.slug

          return (
            <div
              key={p.slug}
              onClick={() => setFocusIdx(idx)}
              className={`border rounded bg-neutral-900 transition-colors ${
                isFocused
                  ? "border-amber-500/60"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {/* Summary row */}
              <div className="p-4">
                {/* Header: badges + slug + Preview button */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-400 font-mono px-2 py-0.5 bg-neutral-800/60 rounded">
                      {p.slug}
                    </span>
                    {p.category && (
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                        {p.category}
                      </span>
                    )}
                    {p.high_risk_editorial && (
                      <span className="inline-block px-2 py-0.5 text-xs border border-red-700 bg-red-900/30 text-red-200 rounded">
                        ⚠ legal review
                      </span>
                    )}
                    {p.is_public && (
                      <span
                        className="inline-block px-2 py-0.5 text-xs border border-green-700 bg-green-900/40 text-green-200 rounded"
                        title="Currently in data/public-routes.json — live on thedonormap.org after the next deploy"
                      >
                        ● live
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePreview(p.slug)
                    }}
                    className="px-3 py-1.5 text-xs border border-neutral-700 text-neutral-200 hover:border-amber-500 hover:text-amber-400 rounded flex-shrink-0"
                  >
                    {isExpanded ? "Collapse ▴" : "Preview ▾"}
                  </button>
                </div>

                {/* Step indicator: Draft → Ready → Verified → Live */}
                <PolicySteps
                  contentReadiness={p.content_readiness}
                  gateReady={p.gate.ready}
                  isPublic={!!p.is_public}
                />

                {/* Title */}
                <div className="text-base text-white font-semibold mt-3 mb-3">
                  {p.title}
                </div>

                {/* 4-up stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <StatCell value={p.counts.polls} label="polls" />
                  <StatCell value={p.counts.events} label="events" />
                  <StatCell value={p.counts.opposition_capital_types} label="opp types" hint="opposition capital types tagged" />
                  <StatCell value={relativeDays(p.last_updated)} label="last updated" hint={p.last_updated} />
                </div>

                {/* Gate status — collapsed prose, prominent if blocking */}
                {p.gate.ready ? (
                  <div className="text-xs text-green-400 mb-2">✓ Publication gate ready</div>
                ) : (
                  <div className="bg-red-900/20 border border-red-900/60 rounded p-2 font-mono text-xs mb-2">
                    <div className="text-red-300 font-bold mb-1">
                      ✗ {p.gate.failures.length} publication gate blocker{p.gate.failures.length === 1 ? "" : "s"}
                    </div>
                    {p.gate.failures.map((f, i) => (
                      <div key={i} className="text-red-200">· {f}</div>
                    ))}
                  </div>
                )}

                {/* Action row: promote / demote / publish */}
                {(canPromote || canPublish || p.content_readiness === "verified") && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-800">
                    {canPromote && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          promote(p.slug)
                        }}
                        className="px-3 py-1.5 text-xs border border-amber-700 bg-amber-900/30 text-amber-200 hover:bg-amber-900/60 rounded"
                        title="Press P when focused"
                      >
                        Promote to verified →
                      </button>
                    )}
                    {p.content_readiness === "verified" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          demote(p.slug)
                        }}
                        className="px-3 py-1.5 text-xs border border-neutral-700 text-neutral-300 hover:border-neutral-500 rounded"
                        title="Roll back to draft"
                      >
                        ← Demote
                      </button>
                    )}
                    {canPublish && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          publish(p.slug)
                        }}
                        className={`px-3 py-1.5 text-xs border rounded font-semibold ${
                          isConfirmingPublish
                            ? "border-red-500 bg-red-900/60 text-white animate-pulse"
                            : "border-green-700 bg-green-900/30 text-green-200 hover:bg-green-900/60"
                        }`}
                        title="Press U (twice) when focused"
                      >
                        {isConfirmingPublish ? "Click again to confirm" : "Publish to public →"}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="border-t border-neutral-800 bg-neutral-950 p-6">
                  {previewLoading && (
                    <div className="text-neutral-500 font-mono text-sm">Loading preview...</div>
                  )}
                  {preview && (
                    <>
                      <div className="prose prose-invert prose-sm max-w-none policy-preview">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {preview.body}
                        </ReactMarkdown>
                      </div>
                      <div className="mt-6 pt-4 border-t border-neutral-800 flex gap-3 items-center">
                        {canPromote && (
                          <button
                            onClick={() => promote(p.slug)}
                            className="px-4 py-2 text-sm border border-amber-500 bg-amber-600 text-black font-bold hover:bg-amber-500 rounded"
                          >
                            Ship it → Promote to verified
                          </button>
                        )}
                        {canPublish && (
                          <button
                            onClick={() => publish(p.slug)}
                            className={`px-4 py-2 text-sm border rounded font-bold ${
                              isConfirmingPublish
                                ? "border-red-500 bg-red-900/60 text-white animate-pulse"
                                : "border-green-500 bg-green-600 text-black hover:bg-green-500"
                            }`}
                          >
                            {isConfirmingPublish ? "Click again to confirm public publish" : "Publish to public"}
                          </button>
                        )}
                        <button
                          onClick={() => togglePreview(p.slug)}
                          className="px-4 py-2 text-sm border border-neutral-700 text-neutral-300 hover:border-neutral-500 rounded"
                        >
                          Close preview
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-md">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded border font-mono text-xs shadow-lg ${
              t.kind === "success"
                ? "border-green-700 bg-green-900 text-green-100"
                : t.kind === "error"
                  ? "border-red-700 bg-red-900 text-red-100"
                  : "border-neutral-700 bg-neutral-800 text-neutral-200"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Minimal prose styling for the inline preview. Tailwind's
          typography plugin isn't installed in ops/, so we scope a few
          hand-tuned rules for tables + code + headings. */}
      <style jsx>{`
        :global(.policy-preview h1) {
          font-size: 1.75rem;
          color: white;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 0.75rem;
        }
        :global(.policy-preview h2) {
          font-size: 1.25rem;
          color: white;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #333;
          padding-bottom: 0.25rem;
        }
        :global(.policy-preview h3) {
          font-size: 1rem;
          color: #e5e5e5;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        :global(.policy-preview p) {
          color: #d4d4d4;
          line-height: 1.6;
          margin-bottom: 0.75rem;
        }
        :global(.policy-preview ul, .policy-preview ol) {
          color: #d4d4d4;
          margin-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        :global(.policy-preview li) {
          margin-bottom: 0.25rem;
        }
        :global(.policy-preview blockquote) {
          border-left: 3px solid #555;
          padding-left: 1rem;
          color: #a3a3a3;
          margin: 1rem 0;
          font-style: italic;
        }
        :global(.policy-preview table) {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          font-size: 0.85rem;
        }
        :global(.policy-preview th, .policy-preview td) {
          border: 1px solid #333;
          padding: 0.5rem 0.75rem;
          text-align: left;
          color: #d4d4d4;
        }
        :global(.policy-preview th) {
          background: #1a1a1a;
          font-weight: 600;
          color: white;
        }
        :global(.policy-preview a) {
          color: #fbbf24;
          text-decoration: underline;
        }
        :global(.policy-preview code) {
          background: #1f1f1f;
          padding: 0.1rem 0.3rem;
          border-radius: 2px;
          font-size: 0.85em;
          color: #fcd34d;
        }
        :global(.policy-preview hr) {
          border: 0;
          border-top: 1px solid #333;
          margin: 1.5rem 0;
        }
        :global(.policy-preview strong) {
          color: white;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
