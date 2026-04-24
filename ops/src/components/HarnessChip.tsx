"use client"

/**
 * HarnessChip — freshness indicator for the vault-audit harness.
 *
 * Any ops page that displays counts/statuses/health signals backed by
 * the harness should render this chip so the reader can see at a glance
 * whether the numbers are fresh, stale, or from a broken run.
 *
 * Wiring (matches the pattern codified on the Dashboard per the
 * "Ops display rule" in CLAUDE.md):
 *   - GET /api/vault-audit on mount
 *   - If artifact age > STALE_MINUTES, POST to re-run the harness
 *   - Click the chip to force a re-run
 *   - Passes the loaded artifact up via onLoad so the page can read
 *     per-check findings_count for its stat cards
 *
 * Colors:
 *   green  — fresh (< 15 min)
 *   steel  — running right now
 *   amber  — stale (> 15 min and not running)
 *   red    — one or more checks crashed, or fetch failed
 *   gray   — initial load
 */

import { useCallback, useEffect, useState } from "react"

const STALE_MINUTES = 15

export interface HarnessCheck {
  name: string
  description: string
  exit: number
  duration_ms: number
  timed_out: boolean
  findings_count: number | null
  notes: string
  stdout_tail?: string
  error?: string
}

export interface HarnessArtifact {
  generated_at: string
  age_minutes: number
  duration_ms: number
  checks: HarnessCheck[]
  summary?: {
    checks_run: number
    checks_clean: number
    checks_with_findings: number
    checks_errored: number
    total_findings: number
  }
  error?: string
}

interface Props {
  onLoad?: (artifact: HarnessArtifact) => void
  autoRerun?: boolean
}

export default function HarnessChip({ onLoad, autoRerun = true }: Props) {
  const [artifact, setArtifact] = useState<HarnessArtifact | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runHarness = useCallback(async () => {
    if (running) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/vault-audit", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (data.error && !data.generated_at) {
        setError(data.error)
      } else {
        setArtifact(data as HarnessArtifact)
        onLoad?.(data as HarnessArtifact)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to re-run harness")
    } finally {
      setRunning(false)
    }
  }, [running, onLoad])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setError(null)
        const res = await fetch("/api/vault-audit", { credentials: "include" })
        const data = await res.json()
        if (cancelled) return
        if (data.error && !data.generated_at) {
          setError(data.error)
          return
        }
        setArtifact(data as HarnessArtifact)
        onLoad?.(data as HarnessArtifact)
        if (autoRerun && data.age_minutes > STALE_MINUTES && !running) {
          void runHarness()
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "failed to load harness")
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const crashed = artifact
    ? artifact.checks.filter((c) => c.exit !== 0 || c.timed_out).length
    : 0
  const stale = artifact && artifact.age_minutes > STALE_MINUTES && !running
  const isError = !!error || (artifact && !!artifact.error)

  let color = "#22c55e"
  let label = "Harness fresh"
  if (running) {
    color = "#5b8dce"
    label = "Running…"
  } else if (isError) {
    color = "#ef4444"
    label = "Harness error"
  } else if (crashed > 0) {
    color = "#ef4444"
    label = `${crashed} check${crashed === 1 ? "" : "s"} crashed`
  } else if (stale) {
    color = "#f59e0b"
    label = "Harness stale"
  } else if (artifact) {
    label = `Harness ${artifact.age_minutes}m ago`
  } else {
    color = "#7a7a86"
    label = "Harness loading…"
  }

  return (
    <button
      onClick={() => runHarness()}
      disabled={running}
      title={
        isError
          ? `Error: ${error || artifact?.error}`
          : "Click to re-run the vault-audit harness now"
      }
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] border transition-colors disabled:opacity-50"
      style={{
        borderColor: `${color}55`,
        color,
        backgroundColor: `${color}15`,
      }}
    >
      <span
        className={`w-2 h-2 rounded-full ${running ? "animate-pulse" : ""}`}
        style={{ backgroundColor: color }}
      />
      {label}
      {!running && (
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      )}
    </button>
  )
}

export { STALE_MINUTES }
