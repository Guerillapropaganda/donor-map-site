"use client"

import { useState, useEffect } from "react"

const SHORTCUTS = [
  { keys: "Ctrl+K", action: "Search profiles & pages" },
  { keys: "?", action: "Show this help" },
  { keys: "g d", action: "Go to Dashboard" },
  { keys: "g p", action: "Go to Pipelines" },
  { keys: "g n", action: "Go to Notes" },
  { keys: "g u", action: "Go to URL Manager" },
  { keys: "g r", action: "Go to Relationships" },
  { keys: "g e", action: "Go to Editor" },
  { keys: "Esc", action: "Close dialog / clear selection" },
]

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const [pendingG, setPendingG] = useState(false)

  useEffect(() => {
    let gTimeout: NodeJS.Timeout | null = null

    const handler = (e: KeyboardEvent) => {
      // Don't fire in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

      // ? = help
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowHelp((prev) => !prev)
        return
      }

      if (e.key === "Escape") {
        setShowHelp(false)
        return
      }

      // g + key combos for navigation
      if (e.key === "g" && !e.ctrlKey && !e.metaKey && !pendingG) {
        setPendingG(true)
        gTimeout = setTimeout(() => setPendingG(false), 1000)
        return
      }

      if (pendingG) {
        setPendingG(false)
        if (gTimeout) clearTimeout(gTimeout)

        const routes: Record<string, string> = {
          d: "/", p: "/pipelines", n: "/notes", u: "/urls", r: "/relationships", e: "/editor",
        }
        if (routes[e.key]) {
          e.preventDefault()
          window.location.href = routes[e.key]
        }
      }
    }

    window.addEventListener("keydown", handler)
    return () => {
      window.removeEventListener("keydown", handler)
      if (gTimeout) clearTimeout(gTimeout)
    }
  }, [pendingG])

  if (!showHelp) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
      <div className="relative w-full max-w-sm bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-bold text-[var(--color-text)]">Keyboard Shortcuts</h2>
        </div>
        <div className="p-4 space-y-2">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--color-text-dim)]">{s.action}</span>
              <kbd className="text-[10px] px-2 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-steel)] font-mono">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-[var(--color-border)]">
          <p className="text-[8px] text-[var(--color-text-dim)]">Press ? or Esc to close</p>
        </div>
      </div>
    </div>
  )
}
