"use client"

import { useState } from "react"
import type { MemeEntry, BeatSlug } from "@/lib/memes-catalog"
import { MemeThumbnail } from "@/components/MemeThumbnail"
import { intentUrl, profileUrl, type Platform } from "@/lib/social-config"

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

  const xIntent = intentUrl("x", editedCaption)!
  const bskyIntent = intentUrl("bluesky", editedCaption)!
  const igProfile = profileUrl("instagram")!
  const fbProfile = profileUrl("facebook")!

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(editedCaption)
      setCopyState("copied")
      setTimeout(() => setCopyState("idle"), 1500)
    } catch (err) {
      console.error("clipboard:", err)
    }
  }

  async function sendToQueue(platform: Platform) {
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

  /** For IG/FB: copy caption to clipboard, then open the profile in a new
   *  tab. The button click also queues a draft entry so the post is tracked. */
  async function shareManual(platform: "instagram" | "facebook") {
    try {
      await navigator.clipboard.writeText(editedCaption)
    } catch (err) {
      console.error("clipboard:", err)
    }
    sendToQueue(platform)
    const url = platform === "instagram" ? igProfile : fbProfile
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <div
      style={{
        padding: "20px 24px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "8px",
        display: "grid",
        gridTemplateColumns: "minmax(280px, 360px) 1fr",
        gap: "20px",
        alignItems: "start",
      }}
    >
      {/* Brutalist thumbnail (cream-bg, Donor Map design system) */}
      <div>
        <MemeThumbnail meme={meme} />
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "10px",
            background: "#1f2937",
            color: "var(--color-text)",
            padding: "8px 16px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1px",
            textDecoration: "none",
            border: "1px solid #374151",
          }}
        >
          Preview full meme ↗
        </a>
      </div>

      {/* Editorial workflow controls (dark-themed, ops-native) */}
      <div>
      <div style={{ marginBottom: "12px" }}>
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
          X compose ↗
        </a>

        <a
          href={bskyIntent}
          target="_blank"
          rel="noopener noreferrer"
          style={btnStyle(false)}
          onClick={() => sendToQueue("bluesky")}
        >
          Bluesky compose ↗
        </a>

        <Btn onClick={() => shareManual("instagram")}>Instagram (copy + open) ↗</Btn>

        <Btn onClick={() => shareManual("facebook")}>Facebook (copy + open) ↗</Btn>

        <Btn onClick={() => sendToQueue("other")} primary={queueState === "queued"}>
          {queueState === "queuing" ? "Queuing..." : queueState === "queued" ? "✓ Queued" : "Send to queue"}
        </Btn>
      </div>

      <div
        style={{
          fontSize: "10px",
          color: "var(--color-text-dim)",
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.5px",
          marginTop: "4px",
        }}
      >
        Instagram + Facebook have no web compose intent · the buttons copy caption to clipboard and open the profile · upload manually
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
