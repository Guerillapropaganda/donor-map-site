import type { MemeEntry } from "@/lib/memes-catalog"

/**
 * MemeThumbnail · brutalist preview tile for the ops Memes surface.
 *
 * Renders the meme in the Donor Map design system (cream bg, Inter 900,
 * Instrument Serif italic, Space Mono, yellow/red/blue/black highlight
 * blocks, no rounded corners, no shadows). Per the 2026-05-02 carve-out
 * to "ops excluded from Design System": editorial workflow surfaces that
 * preview brutalist work products may render content tiles in the site
 * design language. Ops chrome stays dark.
 *
 * Aspect ratio is square (matches the 1080x1080 source) and width is
 * fluid; the component fills its container.
 */

const HIGHLIGHT_COLORS = {
  yellow: { bg: "#fbbf24", color: "#0a0a0a" },
  red: { bg: "#e63946", color: "#ffffff" },
  blue: { bg: "#1d4ed8", color: "#ffffff" },
  black: { bg: "#0a0a0a", color: "#ffffff" },
}

interface Props {
  meme: MemeEntry
}

export function MemeThumbnail({ meme }: Props) {
  const t = meme.thumbnail

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "1 / 1",
        background: "#f5f0eb",
        color: "#1a1a1a",
        padding: "20px 22px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 4px 0 rgba(0,0,0,0.4)",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "'Space Mono', monospace",
          fontSize: "8px",
          fontWeight: 700,
          letterSpacing: "1.5px",
          color: "#666",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "#0a0a0a" }}>THE DONOR MAP</span>
        <span>{t.topbarTag || "CA GOV 2026"}</span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "12px 0" }}>
        {/* Headline lines */}
        <div style={{ marginBottom: "10px" }}>
          {t.headlineLines.map((line, i) => (
            <Headline key={i} line={line} />
          ))}
        </div>

        {/* Optional deck */}
        {t.deck && (
          <div
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontWeight: 400,
              fontSize: "11px",
              lineHeight: 1.35,
              color: "#1a1a1a",
              marginTop: "8px",
            }}
          >
            {t.deck}
          </div>
        )}

        {/* Optional receipt list */}
        {t.receipts && (
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "9px",
              lineHeight: 1.5,
              borderTop: "1.5px solid #0a0a0a",
              borderBottom: "1.5px solid #0a0a0a",
              padding: "8px 0",
              marginTop: "12px",
            }}
          >
            {t.receipts.map((row, i) => {
              const isTotal = i === t.receipts!.length - 1 && row.name.toUpperCase() === row.name
              return (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "12px",
                    alignItems: "baseline",
                    padding: "2px 0",
                    fontWeight: isTotal ? 900 : 700,
                    borderTop: isTotal ? "1.5px solid #0a0a0a" : "none",
                    paddingTop: isTotal ? "6px" : "2px",
                    marginTop: isTotal ? "4px" : "0",
                  }}
                >
                  <span style={{ color: "#1a1a1a" }}>{row.name}</span>
                  <span style={{ color: isTotal ? "#0a0a0a" : "#e63946" }}>{row.value}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "7px",
          color: "#666",
          letterSpacing: "0.5px",
          borderTop: "1.5px solid #0a0a0a",
          paddingTop: "8px",
          textAlign: "center",
        }}
      >
        thedonormap.org
      </div>
    </div>
  )
}

function Headline({ line }: { line: MemeEntry["thumbnail"]["headlineLines"][number] }) {
  const baseStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontWeight: 900,
    fontSize: "20px",
    lineHeight: 1.05,
    letterSpacing: "-0.5px",
    color: "#1a1a1a",
    margin: "2px 0",
  }

  if (!line.highlight) {
    return <div style={baseStyle}>{line.text}</div>
  }

  // Render with the highlighted phrase wrapped in an inline-block highlight block
  const idx = line.text.indexOf(line.highlight.phrase)
  if (idx < 0) return <div style={baseStyle}>{line.text}</div>

  const before = line.text.slice(0, idx)
  const phrase = line.highlight.phrase
  const after = line.text.slice(idx + phrase.length)
  const colors = HIGHLIGHT_COLORS[line.highlight.color]

  return (
    <div style={baseStyle}>
      {before}
      <span
        style={{
          background: colors.bg,
          color: colors.color,
          padding: "0 6px",
          display: "inline-block",
        }}
      >
        {phrase}
      </span>
      {after}
    </div>
  )
}
