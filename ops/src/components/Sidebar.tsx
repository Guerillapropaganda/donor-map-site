"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/attention", label: "Attention Queue", icon: "target" },
  { href: "/pipelines", label: "Pipelines", icon: "zap" },
  { href: "/signoff-queue", label: "Sign-off Queue", icon: "check" },
  { href: "/notes", label: "Notes & Queues", icon: "clipboard" },
  { href: "/tips", label: "Public Tips", icon: "mail" },
  { href: "/urls", label: "URL Manager", icon: "globe" },
  { href: "/source-hunter", label: "Source Hunter", icon: "search" },
  { href: "/relationships", label: "Relationships", icon: "link" },
  { href: "/editor", label: "Editor", icon: "edit" },
  { href: "/publisher", label: "Publisher", icon: "plus" },
  { href: "/profile", label: "Profile View", icon: "user" },
  { href: "/money-trail", label: "Money Trail", icon: "dollar" },
  { href: "/capitol-trades", label: "Capitol Trades", icon: "trending" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/alerts", label: "Alerts", icon: "bell" },
  { href: "/distribution", label: "Distribution", icon: "share" },
  { href: "/rules", label: "Rulebook", icon: "target" },
  { href: "/operations", label: "Operations", icon: "shield" },
  { href: "/docs", label: "System Docs", icon: "book" },
  { href: "/scripts", label: "Scripts", icon: "terminal" },
]

const ICONS: Record<string, string> = {
  grid: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  zap: "M13 10V3L4 14h7v7l9-11h-7z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  plus: "M12 4v16m8-8H4",
  globe: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  link: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  dollar: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  share: "M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z",
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  check: "M5 13l4 4L19 7",
  terminal: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  target: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 4a8 8 0 108 8 8 8 0 00-8-8zm0-2v2m0 16v2m10-10h-2M4 12H2",
  trending: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
}

interface StatusBadges {
  alerts?: { critical: number }
  notes?: { open: number }
  suggestions?: { highPending: number }
  tips?: { new: number }
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState<StatusBadges>({})

  // Close mobile sidebar on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Poll status for badges
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status")
        if (res.ok) setBadges(await res.json())
      } catch { /* skip */ }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Mobile hamburger button */}
      <button onClick={() => setMobileOpen((o) => !o)}
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        className="fixed top-3 left-3 z-[60] md:hidden w-10 h-10 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
        <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          {mobileOpen
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />}

    <aside className={`fixed left-0 top-0 h-screen w-56 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col z-50 transition-transform md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Logo */}
      <div className="p-5 border-b border-[var(--color-border)]">
        <h1 className="text-sm font-bold tracking-wider text-[var(--color-steel)]">
          DONOR MAP
        </h1>
        <p className="text-[10px] tracking-[0.2em] text-[var(--color-text-dim)] mt-0.5">
          OPERATIONS CENTER
        </p>
      </div>

      {/* Quick Search */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          aria-label="Open search (Ctrl+K)"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-dim)] hover:border-[var(--color-steel)]/30 hover:text-[var(--color-text)] transition-colors"
        >
          <svg width={12} height={12} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] flex-1 text-left">Search...</span>
          <kbd className="text-[8px] px-1 py-0.5 rounded border border-[var(--color-border)]">Ctrl+K</kbd>
        </button>
      </div>

      {/* Back / Forward */}
      <div className="px-3 pb-1 flex gap-1">
        <button onClick={() => router.back()}
          aria-label="Navigate back"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-dim)] hover:border-[var(--color-steel)]/30 hover:text-[var(--color-text)] transition-colors text-[10px]">
          ← Back
        </button>
        <button onClick={() => router.forward()}
          aria-label="Navigate forward"
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-dim)] hover:border-[var(--color-steel)]/30 hover:text-[var(--color-text)] transition-colors text-[10px]">
          Forward →
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          // Badge logic
          let badge: { count?: number; dot?: boolean; color: string } | null = null
          if (item.href === "/alerts" && badges.alerts?.critical) {
            badge = { count: badges.alerts.critical, color: "#ef4444" }
          } else if (item.href === "/notes" && badges.notes?.open) {
            badge = { count: badges.notes.open, color: "#f59e0b" }
          } else if (item.href === "/relationships" && badges.suggestions?.highPending) {
            badge = { count: badges.suggestions.highPending, color: "#22c55e" }
          } else if (item.href === "/tips" && badges.tips?.new) {
            badge = { count: badges.tips.new, color: "#fbbf24" }
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs transition-all ${
                active
                  ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
              }`}
            >
              <svg width={16} height={16} className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ minWidth: 16, minHeight: 16 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[item.icon]} />
              </svg>
              <span className="flex-1">{item.label}</span>
              {badge && (
                badge.count ? (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[8px] font-bold text-white px-1" style={{ backgroundColor: badge.color }}>
                    {badge.count > 99 ? "99+" : badge.count}
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: badge.color }} />
                )
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <p className="text-[9px] text-[var(--color-text-dim)] tracking-wider">
          v1.1
        </p>
      </div>
    </aside>
    </>
  )
}
