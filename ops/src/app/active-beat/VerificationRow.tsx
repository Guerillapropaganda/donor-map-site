"use client"

import { useState } from "react"
import type { VerificationEntry, VerificationStatus } from "@/lib/beat-verifications"

/**
 * VerificationRow · interactive verify-status control on Active Beat.
 *
 * Each row shows the verification's current state, the lane badge, and
 * action buttons appropriate to its status. Verifying is one click;
 * adding a note opens a small inline textarea.
 */

interface Props {
  entry: VerificationEntry
}

const STATUS_COLORS: Record<VerificationStatus, { bg: string; fg: string }> = {
  open: { bg: "#fbbf24", fg: "#0a0a0a" },
  verified: { bg: "#16a34a", fg: "#ffffff" },
  broken: { bg: "#e63946", fg: "#ffffff" },
  unsure: { bg: "#f59e0b", fg: "#0a0a0a" },
  wontfix: { bg: "#737373", fg: "#ffffff" },
}

const LANE_COLORS: Record<string, string> = {
  Editor: "#fbbf24",
  "Code Claude": "#5b8dce",
  Perplexity: "#a855f7",
  "Time-based": "#737373",
}

export function VerificationRow({ entry: initial }: Props) {
  const [entry, setEntry] = useState(initial)
  const [busy, setBusy] = useState<VerificationStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNotes, setShowNotes] = useState(false)
  const [noteDraft, setNoteDraft] = useState(entry.notes || "")

  async function setStatus(status: VerificationStatus, opts?: { notes?: string; verifiedBy?: string }) {
    setBusy(status)
    setError(null)
    try {
      const res = await fetch("/api/beat-verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, status, ...opts }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEntry(data.entry)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(null)
    }
  }

  async function saveNote() {
    await setStatus(entry.status, { notes: noteDraft })
    setShowNotes(false)
  }

  const statusColor = STATUS_COLORS[entry.status]
  const laneColor = LANE_COLORS[entry.lane] || "#737373"

  return (
    <div
      style={{
        padding: "10px 14px",
        background: entry.status === "verified" ? "rgba(22, 163, 74, 0.08)" : "rgba(31, 41, 55, 0.4)",
        border: `1px solid ${entry.status === "verified" ? "rgba(22, 163, 74, 0.3)" : "#1f2937"}`,
        borderRadius: "4px",
      }}
    >
      <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
        <span
          style={{
            background: statusColor.bg,
            color: statusColor.fg,
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {entry.status}
        </span>
        <span
          style={{
            background: "rgba(0, 0, 0, 0.3)",
            color: laneColor,
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
            whiteSpace: "nowrap",
            flexShrink: 0,
            border: `1px solid ${laneColor}40`,
          }}
        >
          {entry.lane}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)", marginBottom: "2px" }}>
            {entry.label}
          </div>
          <div style={{ fontSize: "11px", color: "var(--color-text-dim)", lineHeight: 1.5 }}>{entry.detail}</div>
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "10px",
                color: "var(--color-steel)",
                fontFamily: "var(--font-mono, monospace)",
                letterSpacing: "0.5px",
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                marginTop: "4px",
                display: "inline-block",
                wordBreak: "break-all",
              }}
            >
              {entry.url} ↗
            </a>
          )}
          {entry.status === "verified" && entry.verifiedAt && (
            <div
              style={{
                fontSize: "10px",
                color: "#16a34a",
                marginTop: "4px",
                fontFamily: "var(--font-mono, monospace)",
                letterSpacing: "0.5px",
              }}
            >
              ✓ verified {new Date(entry.verifiedAt).toLocaleString()} {entry.verifiedBy ? `by ${entry.verifiedBy}` : ""}
            </div>
          )}
          {entry.notes && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--color-text-dim)",
                marginTop: "4px",
                fontStyle: "italic",
                background: "rgba(0, 0, 0, 0.2)",
                padding: "4px 8px",
                border: "1px dashed #374151",
              }}
            >
              note: {entry.notes}
            </div>
          )}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {entry.status === "open" && (
          <>
            <Btn variant="primary" onClick={() => setStatus("verified")} busy={busy === "verified"}>
              ✓ Verify
            </Btn>
            <Btn onClick={() => setStatus("broken")} busy={busy === "broken"}>
              Broken
            </Btn>
            <Btn onClick={() => setStatus("unsure")} busy={busy === "unsure"}>
              Unsure
            </Btn>
            <Btn onClick={() => setStatus("wontfix")} busy={busy === "wontfix"}>
              Won&apos;t fix
            </Btn>
          </>
        )}
        {entry.status === "verified" && (
          <Btn onClick={() => setStatus("open")} busy={busy === "open"}>
            Re-open
          </Btn>
        )}
        {(entry.status === "broken" || entry.status === "unsure" || entry.status === "wontfix") && (
          <>
            <Btn variant="primary" onClick={() => setStatus("verified")} busy={busy === "verified"}>
              ✓ Verify
            </Btn>
            <Btn onClick={() => setStatus("open")} busy={busy === "open"}>
              Re-open
            </Btn>
          </>
        )}
        <Btn onClick={() => setShowNotes((v) => !v)}>{entry.notes ? "Edit note" : "Add note"}</Btn>
        {error && <span style={{ fontSize: "10px", color: "#e63946" }}>{error}</span>}
      </div>

      {showNotes && (
        <div style={{ marginTop: "8px" }}>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Verification note (optional)"
            rows={2}
            style={{
              width: "100%",
              padding: "6px 8px",
              fontSize: "11px",
              fontFamily: "var(--font-mono, monospace)",
              background: "rgba(0, 0, 0, 0.3)",
              color: "var(--color-text)",
              border: "1px solid #374151",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            <Btn variant="primary" onClick={saveNote}>
              Save note
            </Btn>
            <Btn onClick={() => setShowNotes(false)}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({
  children,
  onClick,
  variant,
  busy,
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: "primary"
  busy?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        background: variant === "primary" ? "#16a34a" : "#1f2937",
        color: "var(--color-text)",
        padding: "5px 11px",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "1px",
        border: "1px solid #374151",
        cursor: busy ? "wait" : "pointer",
        textTransform: "uppercase",
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? "..." : children}
    </button>
  )
}
