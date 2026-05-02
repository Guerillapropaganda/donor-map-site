"use client"

import { useState } from "react"
import type { MemeEntry, BeatSlug } from "@/lib/memes-catalog"

/**
 * MemeCard · the per-meme workflow surface.
 *
 * Shows: title, story tag, caption preview, action buttons. Each action
 * either copies-to-clipboard, opens an external compose intent, or
 * POSTs to /api/meme-queue.
 */

interface Props {
  meme: MemeEntry
  beatSlug: BeatSlug
}

export function MemeCard({ meme, beatSlug }: Props) {
  const [editedCaption, setEditedCaption] = useState(meme.caption)
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle")
  const [queueState, setQueueState] = useState<"idle" | "queuing" | "queued" | "error">("idle")
  const [queueError, setQueueError] = useState<string | null>(null)

  const previewUrl = meme.prototypeUrlBase + meme.prototypeAnchor

  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(editedCaption)}`
  const bskyIntent = `https://bsky.app/intent/compose?text=${encodeURIComponent(editedCaption)}`

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(editedCaption)
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 1500)
    } catch (err) {
      console.error("clipboard:", err)
    }
  }

  async function sendToQueue(platform: "x" | "bluesky") {
    setQueueState("queuing")
    setQueueError(null)
    try {
      const res = await fetch("/api/meme-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memeId: meme.id, beat: beatSlug, platform, caption: editedCaption }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setQueueState("queued")
      setTimeout(() => setQueueState("idle"), 2000)
    } catch (err) {
      setQueueError(String(err))
      setQueueState("error")
    }
  }

  return (
    <div
      style={{
        padding: "20px 24px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "2px",
              color: "#fbbf24",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            {meme.story} · {meme.id}
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-text)" }}>{meme.title}</div>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "#1f2937",
            color: "var(--color-text)",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "1px",
            textDecoration: "none",
            border: "1px solid #374151",
            whiteSpace: "nowrap",
            height: "fit-content",
          }}
        >
          Preview ↗
        </a>
      </div>

      <textarea
        value={editedCaption}
        onChange={(e) => setEditedCaption(e.target.value)}
        rows={Math.max(6, editedCaption.split("\n").length + 1)}
        style={{
          width: "100%",
          padding: "12px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
          lineHeight: 1.5,
          color: "var(--color-text)",
          background: "rgba(0, 0, 0, 0.3)",
          border: "1px solid #1f2937",
          borderRadius: "4px",
          resize: "vertical",
          marginBottom: "12px",
        }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        <Btn onClick={copyCaption} primary={copyState === "copied"}>
          {copyState === "copied" ? "✓ Copied" : "Copy caption"}
        </Btn>

        <a
          href={xIntent}
          target="_blank"
          rel="noopener noreferrer"
          style={btnStyle(false)}
          onClick={() => sendToQueue("x")}
        >
          Open in X compose ↗
        </a>

        <a
          href={bskyIntent}
          target="_blank"
          rel="noopener noreferrer"
          style={btnStyle(false)}
          onClick={() => sendToQueue("bluesky")}
        >
          Open in Bluesky compose ↗
        </a>

        <Btn onClick={() => sendToQueue("other")} primary={queueState === "queued"}>
          {queueState === "queuing" ? "Queuing..." : queueState === "queued" ? "✓ Queued" : "Send to queue"}
        </Btn>
      </div>

      {queueError && (
        <div style={{ fontSize: "11px", color: "#e63946", marginTop: "4px" }}>
          Queue error: {queueError}
        </div>
      )}

      <div
        style={{
          fontSize: "10px",
          color: "var(--color-text-dim)",
          marginTop: "8px",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.5px",
        }}
      >
        Beats: {meme.beats.join(", ")} · {editedCaption.length} chars
      </div>
    </div>
  )
}

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={btnStyle(!!primary)}>
      {children}
    </button>
  )
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    background: primary ? "#16a34a" : "#1f2937",
    color: "var(--color-text)",
    padding: "8px 14px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "1px",
    border: "1px solid #374151",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    whiteSpace: "nowrap",
  }
}
