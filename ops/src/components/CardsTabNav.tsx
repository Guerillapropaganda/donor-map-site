import Link from "next/link"

/**
 * Shared tab navigation across the unified Cards surface.
 *
 * The card-generator and meme-catalog both live under /distribution/cards now; this component appears at the top of both,
 * presenting them as two views of one feature: "By Profile" (search any
 * profile, generate a share image) vs "By Beat" (curated memes from the
 * meme kit, per beat).
 *
 * Pass active = "profile" | "beat" to highlight the current tab.
 */

export function CardsTabNav({ active }: { active: "profile" | "beat" }) {
  return (
    <div style={{ display: "flex", gap: "4px", marginBottom: "20px", borderBottom: "2px solid #1f2937", paddingBottom: "12px", flexWrap: "wrap" }}>
      <Link
        href="/distribution/cards/by-beat"
        style={{
          padding: "10px 16px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: active === "beat" ? "#fbbf24" : "var(--color-text)",
          textDecoration: "none",
          border: `1px solid ${active === "beat" ? "#fbbf24" : "#374151"}`,
          background: active === "beat" ? "rgba(251, 191, 36, 0.1)" : "transparent",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          minWidth: "140px",
        }}
      >
        <span>By Beat</span>
        <span style={{ fontSize: "9px", letterSpacing: "1px", opacity: 0.7, fontWeight: 400, textTransform: "none" }}>
          curated meme kit per beat
        </span>
      </Link>
      <Link
        href="/distribution/cards"
        style={{
          padding: "10px 16px",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: active === "profile" ? "#fbbf24" : "var(--color-text)",
          textDecoration: "none",
          border: `1px solid ${active === "profile" ? "#fbbf24" : "#374151"}`,
          background: active === "profile" ? "rgba(251, 191, 36, 0.1)" : "transparent",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          minWidth: "140px",
        }}
      >
        <span>By Profile</span>
        <span style={{ fontSize: "9px", letterSpacing: "1px", opacity: 0.7, fontWeight: 400, textTransform: "none" }}>
          generate share image from any profile
        </span>
      </Link>
    </div>
  )
}
