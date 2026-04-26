"use client"

/**
 * PreviewServerToggle — start / stop the local Quartz preview server
 * from anywhere in the ops UI.
 *
 * Used by:
 *   - Editor "Live Site" tab (so the iframe has something to point at)
 *   - Dashboard header (so the toggle is one-click reachable)
 *
 * State machine:
 *   stopped  → click Start → starting → running   (port responds)
 *                                     → failed    (port silent after timeout)
 *   running  → click Stop  → stopped
 *   foreign  → port up but not our PID file. Show a "running externally"
 *              indicator and let the user adopt it (treat as ours) or
 *              ignore it.
 *
 * Polling: while in "starting" we poll status every 2s. While running,
 * a slower 30s heartbeat catches dead servers. Stopped: no polling.
 */

import { useCallback, useEffect, useRef, useState } from "react"

interface ServerStatus {
  running: boolean
  starting: boolean
  port: number
  pid: number | null
  startedAt: string | null
  foreign?: boolean
}

interface Props {
  // Compact mode: smaller chip suitable for header bars. Default is the
  // larger pill with status text.
  compact?: boolean
  onStatusChange?: (status: ServerStatus) => void
}

export default function PreviewServerToggle({ compact = false, onStatusChange }: Props) {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollTimer = useRef<NodeJS.Timeout | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/preview-server", { credentials: "include" })
      const data = (await res.json()) as ServerStatus
      setStatus(data)
      onStatusChange?.(data)
      return data
    } catch (e) {
      setError((e as Error).message)
      return null
    }
  }, [onStatusChange])

  // Poll at the right cadence given current state.
  useEffect(() => {
    if (pollTimer.current) clearInterval(pollTimer.current)
    if (!status) return
    if (status.starting) {
      // Fast poll while waiting for the port to open.
      pollTimer.current = setInterval(refresh, 2000)
    } else if (status.running) {
      // Slow heartbeat to catch crashed servers.
      pollTimer.current = setInterval(refresh, 30000)
    }
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [status?.starting, status?.running, refresh])

  // Initial load.
  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Detect "starting too long" → likely failed.
  useEffect(() => {
    if (status?.starting && !startedAtRef.current) {
      startedAtRef.current = Date.now()
    } else if (!status?.starting) {
      startedAtRef.current = null
    }
  }, [status?.starting])
  const stuckStarting =
    !!status?.starting &&
    !!startedAtRef.current &&
    Date.now() - startedAtRef.current > 180_000 // 3 min

  const start = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/preview-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
        credentials: "include",
      })
      const data = await res.json()
      if (!data.ok) setError(data.error || "start failed")
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/preview-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
        credentials: "include",
      })
      const data = await res.json()
      if (!data.ok) setError(data.error || "stop failed")
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────

  let color = "#7a7a86"
  let label = "Preview server"
  let action: "start" | "stop" | null = "start"
  let actionLabel = "Start"

  if (!status) {
    label = "Loading…"
    action = null
  } else if (busy) {
    color = "#5b8dce"
    label = "Working…"
    action = null
  } else if (stuckStarting) {
    color = "#ef4444"
    label = "Start timed out"
    action = "stop"
    actionLabel = "Reset"
  } else if (status.starting) {
    color = "#5b8dce"
    label = "Starting…"
    action = "stop"
    actionLabel = "Cancel"
  } else if (status.running) {
    color = "#22c55e"
    label = status.foreign
      ? `Running externally (port ${status.port})`
      : `Running (port ${status.port})`
    action = "stop"
    actionLabel = "Stop"
  } else {
    color = "#7a7a86"
    label = "Stopped"
    action = "start"
    actionLabel = "Start"
  }

  if (compact) {
    return (
      <button
        onClick={() => (action === "start" ? start() : action === "stop" ? stop() : undefined)}
        disabled={busy || action === null}
        title={
          error
            ? `Error: ${error}`
            : status?.running
              ? `Click to stop. Started ${status.startedAt?.slice(11, 16) || ""}`
              : "Click to start the local preview server"
        }
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] border transition-colors disabled:opacity-50"
        style={{
          borderColor: `${color}55`,
          color,
          backgroundColor: `${color}15`,
        }}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        Preview · {label}
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-4 py-2.5 border"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
    >
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-wider" style={{ color }}>
          Preview server
        </div>
        <div className="text-[11px] text-[var(--color-text)]">{label}</div>
        {error && <div className="text-[9px] text-[var(--color-red)] mt-0.5">{error}</div>}
      </div>
      {action === "start" && (
        <button
          onClick={start}
          disabled={busy}
          className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-[var(--color-green)]/40 text-[var(--color-green)] hover:bg-[var(--color-green)]/10 transition-colors disabled:opacity-50"
        >
          {actionLabel}
        </button>
      )}
      {action === "stop" && (
        <button
          onClick={stop}
          disabled={busy}
          className="text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-[var(--color-text-dim)]/40 text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-text)] transition-colors disabled:opacity-50"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
