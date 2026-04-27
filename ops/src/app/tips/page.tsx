"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/PageHeader"

interface Tip {
  id: string
  filename: string
  profile: string
  profileUrl: string
  category: string
  email: string
  status: string
  date: string
  message: string
}

const STATUS_COLORS: Record<string, string> = {
  new: "#fbbf24",
  reviewed: "#3b82f6",
  actioned: "#16a34a",
  dismissed: "#6b7280",
}

const STATUS_LABELS: Record<string, string> = {
  new: "NEW",
  reviewed: "REVIEWED",
  actioned: "ACTIONED",
  dismissed: "DISMISSED",
}

const CATEGORY_ICONS: Record<string, string> = {
  "Financial connection": "$",
  "Voting pattern": "V",
  "Source / document": "D",
  Correction: "!",
  Other: "?",
}

export default function TipsPage() {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadTips = () => {
    setLoading(true)
    fetch("/api/tips")
      .then((r) => r.json())
      .then((d) => {
        setTips(d.tips || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadTips() }, [])

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/tips", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    loadTips()
  }

  const deleteTip = async (id: string) => {
    if (!confirm("Delete this tip permanently?")) return
    await fetch("/api/tips", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    loadTips()
  }

  const filtered = tips.filter((t) => {
    if (filter === "all") return true
    return t.status === filter
  })

  const counts = {
    all: tips.length,
    new: tips.filter((t) => t.status === "new").length,
    reviewed: tips.filter((t) => t.status === "reviewed").length,
    actioned: tips.filter((t) => t.status === "actioned").length,
    dismissed: tips.filter((t) => t.status === "dismissed").length,
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Public Tips"
        whatThisDoes="Tips submitted by site visitors on profile pages — corrections, anonymous leads, links, suggested investigations. New tips arrive via the public Tip form (Cloudflare Turnstile gated)."
        rightNow={
          <>
            <strong>{counts.new}</strong> new · <strong>{counts.reviewed}</strong> reviewed · <strong>{counts.actioned}</strong> actioned · <strong>{counts.dismissed}</strong> dismissed
          </>
        }
        action="Read each tip, decide: actioned (turned into vault edit) / reviewed (noted, no action) / dismissed (spam or off-topic). New tips sit at the top in amber until reviewed."
      />
      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold px-2 py-1 rounded"
            style={{ background: counts.new > 0 ? "#fbbf2420" : "#16a34a20", color: counts.new > 0 ? "#fbbf24" : "#16a34a" }}
          >
            {counts.new} NEW
          </span>
          <button
            onClick={loadTips}
            className="text-[10px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-steel)]/30 transition-colors"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-[var(--color-border)] pb-2">
        {(["all", "new", "reviewed", "actioned", "dismissed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1.5 rounded-t transition-colors ${
              filter === f
                ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] font-bold"
                : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            }`}
          >
            {f.toUpperCase()} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Tips list */}
      {loading ? (
        <div className="text-center py-12 text-[var(--color-text-dim)] text-sm">Loading tips...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-dim)] text-sm">
            {filter === "all" ? "No tips yet. They'll appear here when visitors submit tips on profile pages." : `No ${filter} tips.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tip) => (
            <div
              key={tip.id}
              className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-card)] overflow-hidden"
            >
              {/* Tip header row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors"
                onClick={() => setExpanded(expanded === tip.id ? null : tip.id)}
              >
                {/* Category icon */}
                <span
                  className="w-7 h-7 flex items-center justify-center rounded text-[11px] font-bold"
                  style={{ background: "#fbbf2420", color: "#fbbf24" }}
                >
                  {CATEGORY_ICONS[tip.category] || "?"}
                </span>

                {/* Profile + category */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-[var(--color-text)] truncate">
                      {tip.profile}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-dim)] shrink-0">
                      {tip.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--color-text-dim)] truncate mt-0.5">
                    {tip.message.slice(0, 120)}{tip.message.length > 120 ? "..." : ""}
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className="text-[8px] font-bold px-2 py-0.5 rounded shrink-0"
                  style={{ background: `${STATUS_COLORS[tip.status]}20`, color: STATUS_COLORS[tip.status] }}
                >
                  {STATUS_LABELS[tip.status] || tip.status.toUpperCase()}
                </span>

                {/* Date */}
                <span className="text-[10px] text-[var(--color-text-dim)] shrink-0">
                  {tip.date ? new Date(tip.date).toLocaleDateString() : ""}
                </span>

                {/* Expand chevron */}
                <span className="text-[var(--color-text-dim)] text-[10px]">
                  {expanded === tip.id ? "▼" : "▶"}
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === tip.id && (
                <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-bg)]">
                  {/* Metadata row */}
                  <div className="flex flex-wrap gap-4 mb-3 text-[10px]">
                    <div>
                      <span className="text-[var(--color-text-dim)]">From: </span>
                      <a href={`mailto:${tip.email}`} className="text-[var(--color-steel)] hover:underline">
                        {tip.email}
                      </a>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-dim)]">Category: </span>
                      <span className="text-[var(--color-text)]">{tip.category}</span>
                    </div>
                    <div>
                      <span className="text-[var(--color-text-dim)]">Submitted: </span>
                      <span className="text-[var(--color-text)]">
                        {tip.date ? new Date(tip.date).toLocaleString() : "Unknown"}
                      </span>
                    </div>
                    {tip.profileUrl && (
                      <div>
                        <a
                          href={`https://thedonormap.org${tip.profileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-steel)] hover:underline"
                        >
                          View profile →
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Full message */}
                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded p-3 mb-4">
                    <p className="text-[12px] text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                      {tip.message}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {tip.status !== "reviewed" && (
                      <button
                        onClick={() => updateStatus(tip.id, "reviewed")}
                        className="text-[10px] px-3 py-1.5 rounded border border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
                      >
                        Mark Reviewed
                      </button>
                    )}
                    {tip.status !== "actioned" && (
                      <button
                        onClick={() => updateStatus(tip.id, "actioned")}
                        className="text-[10px] px-3 py-1.5 rounded border border-[#16a34a]/30 text-[#16a34a] hover:bg-[#16a34a]/10 transition-colors"
                      >
                        Mark Actioned
                      </button>
                    )}
                    {tip.status !== "dismissed" && (
                      <button
                        onClick={() => updateStatus(tip.id, "dismissed")}
                        className="text-[10px] px-3 py-1.5 rounded border border-[#6b7280]/30 text-[#6b7280] hover:bg-[#6b7280]/10 transition-colors"
                      >
                        Dismiss
                      </button>
                    )}
                    <button
                      onClick={() => deleteTip(tip.id)}
                      className="text-[10px] px-3 py-1.5 rounded border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
