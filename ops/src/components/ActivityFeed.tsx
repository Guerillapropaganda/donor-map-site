"use client"

import { useState, useEffect } from "react"

interface Commit {
  sha: string
  message: string
  date: string
  author: string
}

interface Activity {
  type: "pipeline" | "connection" | "edit" | "note" | "url" | "deploy" | "other"
  detail: string
  time: string
  sha: string
}

const ACTIVITY_CONFIG: Record<Activity["type"], { color: string; icon: string; label: string }> = {
  pipeline: { color: "#22c55e", label: "Pipeline", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  connection: { color: "#a855f7", label: "Connection", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  edit: { color: "#5b8dce", label: "Edit", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  note: { color: "#f59e0b", label: "Note", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  url: { color: "#06b6d4", label: "URL", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9" },
  deploy: { color: "#10b981", label: "Deploy", icon: "M5 10l7-7m0 0l7 7m-7-7v18" },
  other: { color: "#7a7a86", label: "Other", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
}

function categorizeCommit(commit: Commit): Activity {
  const msg = commit.message.toLowerCase()
  let type: Activity["type"] = "other"

  if (msg.includes("pipeline") || msg.includes("enrich") || msg.includes("api-enrichment")) type = "pipeline"
  else if (msg.includes("connection") || msg.includes("relationship") || msg.includes("connect")) type = "connection"
  else if (msg.includes("url") || msg.includes("broken") || msg.includes("archive")) type = "url"
  else if (msg.includes("note") || msg.includes("admin")) type = "note"
  else if (msg.includes("deploy") || msg.includes("build") || msg.includes("merge")) type = "deploy"
  else if (msg.includes("edit") || msg.includes("update") || msg.includes("fix") || msg.includes("add")) type = "edit"

  return { type, detail: commit.message.split("\n")[0].slice(0, 80), time: commit.date, sha: commit.sha }
}

function formatDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Activity["type"] | "all">("all")

  useEffect(() => {
    fetch("/api/commits")
      .then((r) => r.json())
      .then((d) => {
        setActivities((d.commits || []).map(categorizeCommit))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === "all" ? activities : activities.filter((a) => a.type === filter)
  const counts = activities.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Recent Activity</h3>
        <a href="/change-log" className="text-[9px] text-[var(--color-text-dim)] hover:text-[var(--color-steel)] transition-colors">
          full log →
        </a>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button onClick={() => setFilter("all")}
          className={`text-[7px] px-1.5 py-0.5 rounded transition-all ${filter === "all" ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] font-bold" : "text-[var(--color-text-dim)]"}`}>
          All
        </button>
        {(Object.keys(ACTIVITY_CONFIG) as Activity["type"][]).map((type) =>
          counts[type] ? (
            <button key={type} onClick={() => setFilter(type)}
              className={`text-[7px] px-1.5 py-0.5 rounded transition-all ${filter === type ? "font-bold" : ""}`}
              style={{ color: filter === type ? ACTIVITY_CONFIG[type].color : undefined, backgroundColor: filter === type ? `${ACTIVITY_CONFIG[type].color}15` : undefined }}>
              {ACTIVITY_CONFIG[type].label} ({counts[type]})
            </button>
          ) : null
        )}
      </div>

      {loading ? (
        <div className="text-xs text-[var(--color-text-dim)] animate-pulse-glow">Loading...</div>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {filtered.map((activity, i) => {
            const config = ACTIVITY_CONFIG[activity.type]
            return (
              <div key={activity.sha + i} className="flex items-start gap-2 p-1.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors">
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${config.color}15` }}>
                  <svg width={10} height={10} fill="none" stroke={config.color} viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[var(--color-text)] leading-snug">{activity.detail}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[7px] uppercase px-1 py-0.5 rounded"
                      style={{ color: config.color, backgroundColor: `${config.color}10` }}>
                      {config.label}
                    </span>
                    <span className="text-[8px] text-[var(--color-text-dim)]">{formatDate(activity.time)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-[10px] text-[var(--color-text-dim)] text-center py-4">No activity matching filter</p>
          )}
        </div>
      )}
    </div>
  )
}
