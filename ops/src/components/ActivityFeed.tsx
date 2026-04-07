"use client"

import { useState, useEffect } from "react"

interface Commit {
  sha: string
  message: string
  date: string
  author: string
}

export function ActivityFeed() {
  const [commits, setCommits] = useState<Commit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/commits")
      .then((r) => r.json())
      .then((d) => {
        setCommits(d.commits || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
      <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Recent Activity</h3>

      {loading ? (
        <div className="text-xs text-[var(--color-text-dim)] animate-pulse-glow">Loading...</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {commits.map((c) => (
            <div key={c.sha} className="flex items-start gap-2 text-[10px]">
              <span className="text-[var(--color-steel)] font-mono flex-shrink-0 mt-0.5">{c.sha}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[var(--color-text)] truncate">{c.message}</p>
                <p className="text-[var(--color-text-dim)]">
                  {c.author} &middot; {formatDate(c.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (hours < 1) return "just now"
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}
