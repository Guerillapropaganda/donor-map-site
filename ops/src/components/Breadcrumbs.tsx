"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const PAGE_LABELS: Record<string, string> = {
  "": "Dashboard",
  attention: "Attention Queue",
  pipelines: "Pipelines",
  "signoff-queue": "Sign-off Queue",
  notes: "Notes & Queues",
  urls: "URL Manager",
  "source-hunter": "Source Hunter",
  relationships: "Relationships",
  editor: "Editor",
  publisher: "Publisher",
  profile: "Profile View",
  "money-trail": "Money Trail",
  "capitol-trades": "Capitol Trades",
  calendar: "Calendar",
  alerts: "Alerts",
  distribution: "Distribution",
  rules: "Rulebook",
  docs: "System Docs",
  scripts: "Scripts",
}

interface BreadcrumbsProps {
  /** Extra segments beyond the URL path, e.g. profile name */
  extra?: { label: string; href?: string }[]
}

export function Breadcrumbs({ extra }: BreadcrumbsProps) {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/" },
  ]

  // Build from URL segments
  let currentPath = ""
  for (const seg of segments) {
    currentPath += `/${seg}`
    const label = PAGE_LABELS[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    crumbs.push({ label, href: currentPath })
  }

  // Add extra context segments
  if (extra) {
    for (const e of extra) {
      crumbs.push({ label: e.label, href: e.href || "#" })
    }
  }

  if (crumbs.length <= 1) return null

  return (
    <nav className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-dim)] mb-3 -mt-1">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-[var(--color-border)]">/</span>}
            {isLast ? (
              <span className="text-[var(--color-text)] font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-[var(--color-steel)] transition-colors">{c.label}</Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
