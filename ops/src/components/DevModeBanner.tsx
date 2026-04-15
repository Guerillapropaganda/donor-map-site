"use client"

/**
 * DevModeBanner — shows a yellow bar at the top of every page when
 * OPS_AUTH_BYPASS is active. Makes the auth bypass impossible to
 * forget about so you don't accidentally push a bypassed build to
 * production.
 *
 * Polls /api/auth/bypass-status on mount. No retry, no refresh — if
 * the bypass state changes, the user restarts the dev server anyway.
 */

import { useEffect, useState } from "react"

export function DevModeBanner() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/bypass-status", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setActive(!!data.bypass_active)
      })
      .catch(() => {
        // Silent fail — if the status endpoint is broken, don't spam the UI
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!active) return null

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        width: "100%",
        backgroundColor: "#fbbf24",
        color: "#0a0a0a",
        padding: "8px 16px",
        fontFamily: "monospace",
        fontSize: "12px",
        fontWeight: 700,
        textAlign: "center",
        borderBottom: "2px solid #000",
      }}
    >
      ⚠ OPS_AUTH_BYPASS ACTIVE — all requests return synthetic admin. Local dev only.
      Remove <code style={{ background: "#000", color: "#fbbf24", padding: "0 4px" }}>OPS_AUTH_BYPASS=1</code> from{" "}
      <code style={{ background: "#000", color: "#fbbf24", padding: "0 4px" }}>ops/.env.local</code> to re-enable Clerk.
    </div>
  )
}
