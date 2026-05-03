"use client"

import { useRef, useState } from "react"
import type { MemeEntry, BeatSlug } from "@/lib/memes-catalog"
import { MemeThumbnail } from "@/components/MemeThumbnail"
import { ShareCardFull } from "@/components/ShareCardFull"
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
  const [pngState, setPngState] = useState<"idle" | "rendering" | "copied" | "error">("idle")
  const cardRef = useRef<HTMLDivElement>(null)

  const previewUrl = meme.prototypeUrlBase + meme.prototypeAnchor
  const shareCardKind = meme.thumbnail.shareCardKind

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

  /** Render the ShareCardFull element to a 1080×1080 PNG. Used by both
   *  Copy as PNG (clipboard) and Download PNG (file download). */
  async function renderCardCanvas(): Promise<HTMLCanvasElement | null> {
    if (!cardRef.current) return null
    // Wait for web fonts (Inter, Space Mono, Instrument Serif) so the
    // captured layout matches the visible one. Without this, html2canvas
    // can capture a transient state where Inter hasn't applied and
    // headlines wrap at fallback-font widths.
    if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
      await document.fonts.ready
    }
    const html2canvas = (await import("html2canvas")).default
    // Clone the card into a hidden 1080×1080 wrapper so the capture is
    // exact full-size, regardless of the visible scaled-down preview.
    const wrapper = document.createElement("div")
    wrapper.style.position = "fixed"
    wrapper.style.left = "-99999px"
    wrapper.style.top = "0"
    wrapper.style.width = "1080px"
    wrapper.style.height = "1080px"
    wrapper.style.background = "#f5f0eb"
    const clone = cardRef.current.cloneNode(true) as HTMLElement
    // Strip the scale transform so the clone renders at full size
    const inner = clone.querySelector("[data-share-card-inner]") as HTMLElement | null
    if (inner) inner.style.transform = "none"
    clone.style.width = "1080px"
    clone.style.height = "1080px"
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)
    try {
      return await html2canvas(clone, {
        width: 1080,
        height: 1080,
        scale: 2,
        backgroundColor: "#f5f0eb",
        useCORS: true,
        logging: false,
      })
    } finally {
      wrapper.remove()
    }
  }

  async function copyAsPng() {
    setPngState("rendering")
    try {
      const canvas = await renderCardCanvas()
      if (!canvas) throw new Error("no card ref")
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"))
      if (!blob) throw new Error("toBlob returned null")
      if (!navigator.clipboard || !("write" in navigator.clipboard)) {
        throw new Error("clipboard image write unsupported in this browser; use Download PNG")
      }
      // @ts-expect-error ClipboardItem is widely supported but not in older TS lib.dom
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      setPngState("copied")
      setTimeout(() => setPngState("idle"), 2200)
    } catch (err) {
      console.error("copyAsPng:", err)
      setPngState("error")
      setTimeout(() => setPngState("idle"), 3500)
    }
  }

  async function downloadPng() {
    setPngState("rendering")
    try {
      const canvas = await renderCardCanvas()
      if (!canvas) throw new Error("no card ref")
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"))
      if (!blob) throw new Error("toBlob returned null")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `donormap-${meme.id}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      setPngState("idle")
    } catch (err) {
      console.error("downloadPng:", err)
      setPngState("error")
      setTimeout(() => setPngState("idle"), 3500)
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
      {/* Brutalist thumbnail (cream-bg, Donor Map design system).
          When shareCardKind is set, renders the full share card with
          embedded SVG graph instead of the structured-data thumbnail. */}
      <div>
        {shareCardKind ? (
          <ShareCardFull ref={cardRef} kind={shareCardKind} />
        ) : (
          <MemeThumbnail meme={meme} />
        )}
        {shareCardKind && (
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            <button
              onClick={copyAsPng}
              disabled={pngState === "rendering"}
              style={{
                flex: 1,
                background: pngState === "copied" ? "#16a34a" : pngState === "error" ? "#7f1d1d" : "#fbbf24",
                color: pngState === "copied" || pngState === "error" ? "#fff" : "#0a0a0a",
                padding: "10px 14px",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "1px",
                border: "1px solid #0a0a0a",
                cursor: pngState === "rendering" ? "wait" : "pointer",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {pngState === "rendering"
                ? "Rendering..."
                : pngState === "copied"
                  ? "✓ Copied. Paste in FB."
                  : pngState === "error"
                    ? "Copy failed"
                    : "Copy as PNG"}
            </button>
            <button
              onClick={downloadPng}
              disabled={pngState === "rendering"}
              style={{
                background: "transparent",
                color: "var(--color-text)",
                padding: "10px 14px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "1px",
                border: "1px solid #374151",
                cursor: pngState === "rendering" ? "wait" : "pointer",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              Download
            </button>
          </div>
        )}
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
