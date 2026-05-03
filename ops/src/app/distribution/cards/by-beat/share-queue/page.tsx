"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/PageHeader"
import { getMeme, getBeat } from "@/lib/memes-catalog"
import { intentUrl, profileUrl, PLATFORM_META, type Platform } from "@/lib/social-config"

/**
 * Share queue · /distribution/cards/by-beat/share-queue
 *
 * Cross-beat list of every queued meme. Each row: meme title, beat,
 * platform, status, caption preview, action buttons (approve / reject /
 * mark posted / archive).
 *
 * Backing store: data/meme-publish-queue.jsonl via /api/meme-queue.
 */

type Status = "draft" | "approved" | "posted" | "rejected" | "archived"

interface QueueEntry {
  id: string
  memeId: string
  beat: string
  platform: Platform
  caption: string
  status: Status
  createdAt: string
  updatedAt: string
  postedAt: string | null
  postedUrl: string | null
}

export default function ShareQueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | "all">("all")

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/meme-queue")
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEntries(data.entries || [])
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const updateStatus = async (id: string, status: Status, postedUrl?: string) => {
    try {
      const res = await fetch("/api/meme-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, postedUrl: postedUrl ?? null }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      await fetchEntries()
    } catch (err) {
      setError(String(err))
    }
  }

  const filtered = filter === "all" ? entries : entries.filter((e) => e.status === filter)
  const counts = entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="Share Queue"
        whatThisDoes="Cross-beat queue of memes drafted, approved, posted, or archived. Send a meme to the queue from a per-beat page; review here, approve, then click the platform compose link to launch X or Bluesky with the caption pre-filled. Image attachment is manual."
        rightNow={
          <span>
            {entries.length} total
            {entries.length > 0 && (
              <>
                {" · "}
                {Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}
              </>
            )}
            {" · "}
            <Link href="/distribution/cards/by-beat" style={{ color: "var(--color-steel)", textDecoration: "underline" }}>
              ← Memes
            </Link>
          </span>
        }
        action="Click Approve to mark a draft ready. Click Open in X / Bluesky to launch the compose intent. After posting, click Mark Posted and paste the post URL."
      />

      {/* Filter row */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {(["all", "draft", "approved", "posted", "rejected", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s as Status | "all")}
            style={{
              background: filter === s ? "#fbbf24" : "#1f2937",
              color: filter === s ? "#0a0a0a" : "var(--color-text)",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1px",
              border: "1px solid #374151",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            {s} {s !== "all" && counts[s] ? `(${counts[s]})` : ""}
          </button>
        ))}
        <button
          onClick={fetchEntries}
          style={{
            background: "#1f2937",
            color: "var(--color-text)",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "1px",
            border: "1px solid #374151",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(230, 57, 70, 0.1)",
            border: "1px solid rgba(230, 57, 70, 0.4)",
            padding: "12px 16px",
            marginBottom: "16px",
            color: "#e63946",
            fontSize: "12px",
          }}
        >
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div style={{ padding: "32px", color: "var(--color-text-dim)", textAlign: "center" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "32px",
            color: "var(--color-text-dim)",
            textAlign: "center",
            fontStyle: "italic",
            background: "rgba(31, 41, 55, 0.3)",
            border: "1px solid #1f2937",
            borderRadius: "8px",
          }}
        >
          {entries.length === 0
            ? "Queue is empty. Send a meme to the queue from a per-beat page."
            : `No ${filter} entries.`}
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {filtered.map((e) => (
            <QueueRow key={e.id} entry={e} updateStatus={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function QueueRow({ entry, updateStatus }: { entry: QueueEntry; updateStatus: (id: string, s: Status, url?: string) => void }) {
  const meme = getMeme(entry.memeId)
  const beat = getBeat(entry.beat)
  const [postedUrl, setPostedUrl] = useState("")

  const intent = intentUrl(entry.platform, entry.caption)
  const profile = profileUrl(entry.platform)
  const platformMeta = PLATFORM_META[entry.platform]

  const statusColor: Record<Status, string> = {
    draft: "#fbbf24",
    approved: "#16a34a",
    posted: "#1d4ed8",
    rejected: "#e63946",
    archived: "#737373",
  }

  return (
    <div
      style={{
        padding: "16px 20px",
        background: "rgba(31, 41, 55, 0.4)",
        border: "1px solid #1f2937",
        borderRadius: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
              letterSpacing: "1.5px",
              color: "var(--color-text-dim)",
              marginBottom: "2px",
            }}
          >
            {entry.id} · {entry.platform.toUpperCase()} · {beat?.title || entry.beat}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)", marginBottom: "4px" }}>
            {meme?.title || `(meme ${entry.memeId} not in catalog)`}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              color: "var(--color-text-dim)",
              lineHeight: 1.5,
              maxHeight: "60px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entry.caption.split("\n").slice(0, 3).join(" / ").slice(0, 200)}
            {entry.caption.length > 200 ? "..." : ""}
          </div>
        </div>
        <div
          style={{
            background: statusColor[entry.status],
            color: entry.status === "draft" ? "#0a0a0a" : "#ffffff",
            padding: "4px 10px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            height: "fit-content",
            whiteSpace: "nowrap",
          }}
        >
          {entry.status}
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        {entry.status === "draft" && (
          <>
            <Button onClick={() => updateStatus(entry.id, "approved")} variant="primary">
              Approve
            </Button>
            <Button onClick={() => updateStatus(entry.id, "rejected")}>Reject</Button>
          </>
        )}
        {entry.status === "approved" && intent && (
          <a href={intent} target="_blank" rel="noopener noreferrer" style={btnStyle("primary")}>
            Open in {platformMeta.label} compose ↗
          </a>
        )}
        {entry.status === "approved" && !intent && profile && (
          <a
            href={profile}
            target="_blank"
            rel="noopener noreferrer"
            style={btnStyle("primary")}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(entry.caption)
              } catch {}
            }}
          >
            Copy caption + open {platformMeta.label} ↗
          </a>
        )}
        {entry.status === "approved" && (
          <>
            <input
              type="text"
              placeholder="Posted URL (optional)"
              value={postedUrl}
              onChange={(e) => setPostedUrl(e.target.value)}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: "6px 10px",
                fontSize: "11px",
                fontFamily: "var(--font-mono, monospace)",
                background: "rgba(0, 0, 0, 0.3)",
                color: "var(--color-text)",
                border: "1px solid #374151",
              }}
            />
            <Button onClick={() => updateStatus(entry.id, "posted", postedUrl || undefined)}>Mark posted</Button>
          </>
        )}
        {entry.status === "posted" && entry.postedUrl && (
          <a
            href={entry.postedUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btnStyle("link"), color: "#1d4ed8" }}
          >
            View post ↗
          </a>
        )}
        <div style={{ flex: 1 }} />
        <Button onClick={() => updateStatus(entry.id, "archived")}>Archive</Button>
        <span style={{ fontSize: "10px", color: "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
          {new Date(entry.updatedAt).toLocaleString()}
        </span>
      </div>
    </div>
  )
}

function Button({
  children,
  onClick,
  variant,
}: {
  children: React.ReactNode
  onClick: () => void
  variant?: "primary" | "link"
}) {
  return (
    <button onClick={onClick} style={btnStyle(variant)}>
      {children}
    </button>
  )
}

function btnStyle(variant?: "primary" | "link"): React.CSSProperties {
  return {
    background: variant === "primary" ? "#16a34a" : variant === "link" ? "transparent" : "#1f2937",
    color: variant === "link" ? "#1d4ed8" : "var(--color-text)",
    padding: "6px 12px",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "1px",
    border: "1px solid #374151",
    cursor: "pointer",
    textTransform: "uppercase",
    textDecoration: "none",
    display: "inline-block",
    whiteSpace: "nowrap",
  }
}
