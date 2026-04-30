"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

// ─── Sidebar grouping (2026-04-26 redesign) ────────────────────────────
//
// 29 flat nav items consolidated into 5 collapsible groups. DAILY is
// always expanded — those are the surfaces David opens every morning.
// The other groups collapse to keep the rail short. Group state persists
// in localStorage so collapsed/expanded preferences survive reloads.
//
// Merges shipped alongside this redesign:
//   /ask → /query?mode=ask  (single page, two tabs)
//   /docs + /scripts → /docs (Reference page with both inside)
//   /signoff-launch → archived (kept at URL but removed from sidebar;
//     /signoff-queue header carries a one-line link to the Launch 50
//     tracker)

interface NavItem {
  href: string
  label: string
  icon: string
  badgeKey?: "alerts" | "notes" | "suggestions" | "tips" | "harness"
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  /** if true, group cannot be collapsed (always shown expanded) */
  pinned?: boolean
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "daily",
    label: "Daily",
    pinned: true,
    items: [
      { href: "/", label: "Dashboard", icon: "grid", badgeKey: "harness" },
      { href: "/attention", label: "Attention", icon: "target", badgeKey: "alerts" },
      { href: "/signoff-queue", label: "Sign-off Queue", icon: "check" },
      { href: "/profile", label: "Profile View", icon: "user" },
      { href: "/editor", label: "Editor", icon: "edit" },
    ],
  },
  {
    id: "analyze",
    label: "Analyze",
    items: [
      { href: "/relationships", label: "Relationships", icon: "link", badgeKey: "suggestions" },
      { href: "/relationships/orphans", label: "↳ Orphan Triage", icon: "clipboard" },
      { href: "/librarian-gaps", label: "↳ Librarian Gaps", icon: "search" },
      { href: "/money-trail", label: "Money Trail", icon: "dollar" },
      { href: "/thesis", label: "Thesis Queries", icon: "target" },
      { href: "/capitol-trades", label: "Capitol Trades", icon: "trending" },
      { href: "/class-tags", label: "Class Tags", icon: "target" },
      { href: "/policies", label: "Policies", icon: "book" },
      { href: "/stories", label: "Stories", icon: "file-text" },
      { href: "/query", label: "Query / Ask", icon: "search" },
    ],
  },
  {
    id: "build",
    label: "Build",
    items: [
      { href: "/system-health", label: "System Health", icon: "shield" },
      { href: "/pipelines", label: "Pipelines", icon: "zap" },
      { href: "/source-hunter", label: "Source Hunter", icon: "search" },
      { href: "/operations", label: "Operations", icon: "shield" },
      { href: "/audit-claude-decisions", label: "Audit Claude", icon: "check" },
      { href: "/change-log", label: "Change Log", icon: "clipboard" },
      { href: "/bugs", label: "Bugs & Deferred", icon: "bell" },
      { href: "/docs", label: "Reference", icon: "book" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/sources", label: "Source Registry", icon: "globe" },
      { href: "/urls", label: "URL Manager", icon: "globe" },
      { href: "/races/ca-gov-2026", label: "CA Governor 2026", icon: "user" },
      { href: "/tips", label: "Public Tips", icon: "mail", badgeKey: "tips" },
      { href: "/notes", label: "Notes & Queues", icon: "clipboard", badgeKey: "notes" },
      { href: "/calendar", label: "Calendar", icon: "calendar" },
      { href: "/publisher", label: "Publisher", icon: "plus" },
      { href: "/distribution", label: "Distribution", icon: "share" },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    items: [
      { href: "/rules", label: "Rulebook", icon: "target" },
      // /account + /pricing hidden until Phase 2.5 setup is complete.
      // Pages still work if you visit by URL, but exposing them in the
      // sidebar would let visitors click into a paid-tier flow that
      // errors out (Stripe + Clerk paid tiers not wired). Per Rule 12,
      // launch is free-tier only.
      // { href: "/account", label: "Account", icon: "user" },
      // { href: "/pricing", label: "Pricing", icon: "dollar" },
    ],
  },
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
  chevron: "M9 5l7 7-7 7",
  "file-text": "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
}

interface StatusBadges {
  alerts?: { critical: number }
  notes?: { open: number }
  suggestions?: { highPending: number }
  tips?: { new: number }
  harness?: { findings: number }
}

const COLLAPSED_STORAGE_KEY = "donor-map-sidebar-collapsed-groups-v1"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [badges, setBadges] = useState<StatusBadges>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    // Default-collapse all but Daily so first-load is short
    return { analyze: true, build: true, content: true, reference: true }
  })

  // Load persisted collapse state once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (raw) setCollapsed(JSON.parse(raw))
    } catch {
      /* ignore */
    }
  }, [])

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(collapsed))
    } catch {
      /* ignore */
    }
  }, [collapsed])

  // Auto-expand the group containing the active page so navigation
  // never lands on a hidden item.
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.some((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href))),
    )
    if (activeGroup && collapsed[activeGroup.id]) {
      setCollapsed((c: Record<string, boolean>) => ({ ...c, [activeGroup.id]: false }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Close mobile sidebar on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Poll status for badges + refetch on window focus
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/status")
        if (res.ok) setBadges(await res.json())
      } catch { /* skip */ }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    const onFocus = () => fetchStatus()
    window.addEventListener("focus", onFocus)
    return () => { clearInterval(interval); window.removeEventListener("focus", onFocus) }
  }, [])

  function badgeFor(item: NavItem): { count?: number; dot?: boolean; color: string } | null {
    if (!item.badgeKey) return null
    if (item.badgeKey === "alerts" && badges.alerts?.critical) {
      return { count: badges.alerts.critical, color: "#ef4444" }
    }
    if (item.badgeKey === "notes" && badges.notes?.open) {
      return { count: badges.notes.open, color: "#f59e0b" }
    }
    if (item.badgeKey === "suggestions" && badges.suggestions?.highPending) {
      return { count: badges.suggestions.highPending, color: "#22c55e" }
    }
    if (item.badgeKey === "tips" && badges.tips?.new) {
      return { count: badges.tips.new, color: "#fbbf24" }
    }
    return null
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button onClick={() => setMobileOpen((o: boolean) => !o)}
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

      {/* Nav — grouped + collapsible */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-3">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = !group.pinned && collapsed[group.id]
          const groupHasActive = group.items.some((i) =>
            i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
          )
          return (
            <div key={group.id}>
              {/* Group header */}
              {!group.pinned ? (
                <button
                  onClick={() => setCollapsed((c: Record<string, boolean>) => ({ ...c, [group.id]: !c[group.id] }))}
                  className="w-full flex items-center justify-between px-2 py-1 text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
                  aria-expanded={!isCollapsed}
                  aria-controls={`nav-group-${group.id}`}
                >
                  <span className={groupHasActive ? "text-[var(--color-steel)]" : ""}>
                    {group.label}
                  </span>
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 0.15s" }}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONS.chevron} />
                  </svg>
                </button>
              ) : (
                <div className="px-2 py-1 text-[9px] tracking-[0.2em] uppercase text-[var(--color-text-dim)]">
                  {group.label}
                </div>
              )}

              {/* Items */}
              {!isCollapsed && (
                <div id={`nav-group-${group.id}`} className="space-y-0.5 mt-1">
                  {group.items.map((item) => {
                    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
                    const badge = badgeFor(item)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                          active
                            ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
                            : "text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
                        }`}
                      >
                        <svg width={16} height={16} className="flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} style={{ minWidth: 16, minHeight: 16 }} aria-hidden="true">
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
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <p className="text-[9px] text-[var(--color-text-dim)] tracking-wider">
          v1.2
        </p>
      </div>
    </aside>
    </>
  )
}
