"use client"

import { useState } from "react"
import type { PreflightResult } from "@/lib/preflight"

/**
 * Publish action button.
 *
 * Disabled unless preflight.canPublish is true. On click: confirm dialog,
 * POST to /api/publish-beat, refresh the page so server-rendered state
 * reflects the new live route.
 *
 * Per Rule 13 + ADR-0017, public-route exposure is the editor's manual
 * decision. This component does not bypass preflight; it just calls the
 * API after explicit user confirmation.
 */

interface Props {
  slug: string
  publicSlug: string
  title: string
  preflight: PreflightResult
}

export function PublishButton({ slug, publicSlug, title, preflight }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const disabled = !preflight.canPublish || busy

  async function handlePublish() {
    if (!confirm(`Publish "${title}"?\n\nThis will add "${publicSlug}" to data/public-routes.json so the page is exposed publicly at thedonormap.org/${publicSlug}.\n\nYou can revert by removing the slug from that file and merging.\n\nProceed?`)) {
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/publish-beat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
      } else {
        setSuccess(`Published. ${publicSlug} is now in public-routes.json. Reload to see updated state.`)
        setTimeout(() => window.location.reload(), 800)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  if (preflight.isLive) {
    return (
      <div
        style={{
          padding: "16px 20px",
          background: "rgba(22, 163, 74, 0.12)",
          border: "2px solid #16a34a",
          color: "#16a34a",
          fontWeight: 700,
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "1px",
          textTransform: "uppercase",
          fontSize: "13px",
        }}
      >
        ✓ Published · {publicSlug} is in public-routes.json
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={handlePublish}
        disabled={disabled}
        style={{
          background: disabled ? "#1f2937" : "#16a34a",
          color: disabled ? "var(--color-text-dim)" : "#fff",
          padding: "14px 28px",
          fontFamily: "var(--font-mono, monospace)",
          fontWeight: 700,
          fontSize: "14px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          border: `2px solid ${disabled ? "#374151" : "#16a34a"}`,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "Publishing..." : preflight.canPublish ? `▶ Publish ${title}` : "▶ Publish (gated)"}
      </button>
      {!preflight.canPublish && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--color-text-dim)", fontStyle: "italic" }}>
          {preflight.failingCount} blocking gate(s) failing. Resolve them above before publishing.
        </div>
      )}
      {error && (
        <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(230, 57, 70, 0.1)", border: "1px solid #e63946", color: "#e63946", fontSize: "12px" }}>
          Error: {error}
        </div>
      )}
      {success && (
        <div style={{ marginTop: "10px", padding: "8px 12px", background: "rgba(22, 163, 74, 0.1)", border: "1px solid #16a34a", color: "#16a34a", fontSize: "12px" }}>
          {success}
        </div>
      )}
    </div>
  )
}
