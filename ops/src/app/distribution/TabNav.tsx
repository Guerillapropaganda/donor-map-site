import Link from "next/link"

/**
 * Shared tab navigation across the Distribution surface.
 *
 * Active tab is determined by the slug prop. Each tab is a brutalist
 * pill in the ops dark theme, matching the Active Beat switcher pattern.
 */

const TABS = [
  { slug: "cadence", label: "Cadence", note: "When to post" },
  { slug: "queue", label: "Queue", note: "Today's drafts" },
  { slug: "targets", label: "Targets", note: "Who to engage" },
  { slug: "algorithm", label: "Algorithm", note: "Boost levers" },
  { slug: "cards", label: "Cards", note: "Image generator" },
] as const

export function TabNav({ active }: { active: string }) {
  return (
    <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "2px solid #1f2937", paddingBottom: "12px", flexWrap: "wrap" }}>
      {TABS.map((t) => {
        const isActive = t.slug === active
        return (
          <Link
            key={t.slug}
            href={`/distribution/${t.slug}`}
            style={{
              padding: "10px 16px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: isActive ? "#fbbf24" : "var(--color-text)",
              textDecoration: "none",
              border: `1px solid ${isActive ? "#fbbf24" : "#374151"}`,
              background: isActive ? "rgba(251, 191, 36, 0.1)" : "transparent",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              minWidth: "110px",
            }}
          >
            <span>{t.label}</span>
            <span style={{ fontSize: "9px", letterSpacing: "1px", opacity: 0.7, fontWeight: 400, textTransform: "none" }}>{t.note}</span>
          </Link>
        )
      })}
    </div>
  )
}
