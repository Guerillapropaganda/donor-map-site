"use client"

import { useEffect, useState } from "react"

/**
 * FreshnessChip — small "last updated 2d ago" pill for surfacing how
 * stale a page's underlying data is.
 *
 * Pulls /api/data-freshness for the given paths, picks the OLDEST mtime
 * among them (since a page is only as fresh as its stalest input), and
 * renders a colored chip:
 *   green  — within `freshWithinDays` (default 1)
 *   amber  — within 2× the threshold
 *   red    — beyond that, with the day count called out
 *
 * Hover shows the per-file mtime breakdown.
 *
 * Usage:
 *   <FreshnessChip
 *     paths={["data/polling.jsonl"]}
 *     label="polling data"
 *     freshWithinDays={7}
 *   />
 */
interface FreshnessFile {
  path: string
  mtime: string | null
  age_ms: number | null
  age_days: number | null
  missing?: boolean
  error?: string
}

export interface FreshnessChipProps {
  /** Repo-relative file paths to probe. Page is as stale as its oldest input. */
  paths: string[]
  /** Short label e.g. "polling data" — appears next to the age. */
  label?: string
  /** Days within which data is considered "fresh" (green). Default 1. */
  freshWithinDays?: number
  /** Override defaults for the warning threshold. Default 2× freshWithinDays. */
  warnWithinDays?: number
  /** Optional inline style override (passed to the outer span). */
  style?: React.CSSProperties
}

function formatAge(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? "1h ago" : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? "1d ago" : `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function FreshnessChip({
  paths,
  label,
  freshWithinDays = 1,
  warnWithinDays,
  style,
}: FreshnessChipProps) {
  const [data, setData] = useState<{ files: FreshnessFile[]; now: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (paths.length === 0) return
    const ctrl = new AbortController()
    fetch(`/api/data-freshness?paths=${encodeURIComponent(paths.join(","))}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || String(err))
      })
    return () => ctrl.abort()
  }, [paths.join(",")])  // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <span style={chipStyle("muted", style)} title={error}>
        {label ? `${label}: ` : ""}freshness ?
      </span>
    )
  }
  if (!data) {
    return (
      <span style={chipStyle("muted", style)}>
        {label ? `${label}: ` : ""}…
      </span>
    )
  }

  // Filter to files we successfully stat'd; ignore allowlist errors / missing
  const valid = data.files.filter((f) => f.age_ms != null && !f.error && !f.missing)
  if (valid.length === 0) {
    const missingPaths = data.files.filter((f) => f.missing).map((f) => f.path)
    return (
      <span
        style={chipStyle("red", style)}
        title={missingPaths.length ? `Missing files: ${missingPaths.join(", ")}` : undefined}
      >
        {label ? `${label}: ` : ""}no data
      </span>
    )
  }

  // Page freshness = oldest file's age
  const oldestMs = Math.max(...valid.map((f) => f.age_ms ?? 0))
  const oldestDays = oldestMs / 86400000
  const warn = warnWithinDays ?? freshWithinDays * 2
  const tone: ChipTone = oldestDays <= freshWithinDays ? "green" : oldestDays <= warn ? "amber" : "red"

  // Tooltip with the full mtime breakdown
  const tip = data.files
    .map((f) => {
      if (f.error) return `${f.path}: ${f.error}`
      if (f.missing) return `${f.path}: MISSING`
      return `${f.path}: ${formatAge(f.age_ms ?? 0)}`
    })
    .join("\n")

  return (
    <span style={chipStyle(tone, style)} title={tip}>
      {label ? `${label}: ` : ""}{formatAge(oldestMs)}
    </span>
  )
}

type ChipTone = "green" | "amber" | "red" | "muted"

function chipStyle(tone: ChipTone, override?: React.CSSProperties): React.CSSProperties {
  const palette: Record<ChipTone, { bg: string; fg: string; border: string }> = {
    green: { bg: "rgba(34, 197, 94, 0.15)", fg: "#22c55e", border: "rgba(34, 197, 94, 0.4)" },
    amber: { bg: "rgba(245, 158, 11, 0.15)", fg: "#fbbf24", border: "rgba(245, 158, 11, 0.4)" },
    red: { bg: "rgba(239, 68, 68, 0.15)", fg: "#ef4444", border: "rgba(239, 68, 68, 0.4)" },
    muted: { bg: "#1f2937", fg: "#9ca3af", border: "#374151" },
  }
  const c = palette[tone]
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.35rem",
    padding: "0.25rem 0.5rem",
    fontSize: "0.7rem",
    fontFamily: "ui-monospace, monospace",
    color: c.fg,
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: "0.25rem",
    whiteSpace: "nowrap",
    ...override,
  }
}
