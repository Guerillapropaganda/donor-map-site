"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE CONTRADICTION — Two opposing statements with red slash between */
export function CardContradiction({ profile, headline, subtext, width, height }: Props) {
  const name = profile.title.replace(/ Master Profile$/, "").replace(/^_/, "")
  const h = headline || name
  // Try to split subtext into two contradicting statements
  const s = subtext || profile.centralThesis || ""
  const parts = s.split(/\. (?=[A-Z])/).filter(p => p.length > 20)
  const statement1 = parts[0] || s.slice(0, s.length / 2)
  const statement2 = parts[1] || parts[0] || s.slice(s.length / 2)

  const scale = Math.min(width / 1200, height / 630)

  return (
    <div style={{
      width, height,
      backgroundColor: "#0a0a0a",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Diagonal red line — the slash */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, transparent 48.5%, #ef4444 48.5%, #ef4444 51.5%, transparent 51.5%)",
        opacity: 0.6,
        zIndex: 1,
      }} />

      {/* Top-left: Statement 1 */}
      <div style={{
        position: "absolute",
        top: 35 * scale,
        left: 45 * scale,
        width: width * 0.45,
        zIndex: 2,
      }}>
        <div style={{
          color: "#22c55e",
          fontSize: 13 * scale,
          letterSpacing: "0.3em",
          marginBottom: 8 * scale,
        }}>
          WHAT THEY SAY
        </div>
        <div style={{
          color: "#e4e4e7",
          fontSize: 18 * scale,
          lineHeight: 1.5,
          fontStyle: "italic",
        }}>
          "{statement1.slice(0, 120)}{statement1.length > 120 ? "..." : ""}"
        </div>
      </div>

      {/* Bottom-right: Statement 2 */}
      <div style={{
        position: "absolute",
        bottom: 60 * scale,
        right: 45 * scale,
        width: width * 0.45,
        textAlign: "right" as const,
        zIndex: 2,
      }}>
        <div style={{
          color: "#ef4444",
          fontSize: 13 * scale,
          letterSpacing: "0.3em",
          marginBottom: 8 * scale,
        }}>
          WHAT THEY DO
        </div>
        <div style={{
          color: "#e4e4e7",
          fontSize: 18 * scale,
          lineHeight: 1.5,
        }}>
          {statement2.slice(0, 120)}{statement2.length > 120 ? "..." : ""}
        </div>
      </div>

      {/* Center: Name */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 3,
        backgroundColor: "#0a0a0a",
        padding: `${12 * scale}px ${24 * scale}px`,
        border: "1px solid #fbbf24",
      }}>
        <div style={{
          color: "#fbbf24",
          fontSize: Math.min(24 * scale, width * 0.028),
          fontWeight: 700,
          letterSpacing: "-0.01em",
          textAlign: "center" as const,
        }}>
          {h}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `${10 * scale}px ${45 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 3,
      }}>
        <div style={{ color: "#fbbf24", fontSize: 18 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
          THE CONTRADICTION
        </div>
        <div style={{ color: "#7a7a86", fontSize: 20 * scale }}>thedonormap.org</div>
      </div>
    </div>
  )
}
