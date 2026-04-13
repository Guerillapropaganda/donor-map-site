"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE MIRROR — Side-by-side comparison showing "opposing" politicians funded by same donors */
export function CardMirror({ profile, headline, subtext, width, height }: Props) {
  const name = profile.title.replace(/ Master Profile$/, "")
  const h = headline || "SAME MONEY"
  const s = subtext || "Different party. Same donors. Same policy."
  const scale = Math.min(width / 1200, height / 630)

  return (
    <div style={{
      width, height,
      backgroundColor: "#0a0a0a",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Mirror line — center vertical */}
      <div style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        width: 2,
        backgroundColor: "#fbbf24",
        zIndex: 2,
      }} />

      {/* Left side */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "50%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${40 * scale}px`,
      }}>
        <div style={{ color: "#5b8dce", fontSize: 18 * scale, letterSpacing: "0.3em", marginBottom: 8 * scale }}>
          DEMOCRAT
        </div>
        <div style={{
          color: "#e4e4e7",
          fontSize: Math.min(24 * scale, width * 0.025),
          fontWeight: 700,
          marginBottom: 16 * scale,
        }}>
          [Senator A]
        </div>
        <div style={{ color: "#7a7a86", fontSize: 18 * scale, lineHeight: 1.6 }}>
          Top donors:<br/>Goldman Sachs<br/>JPMorgan<br/>Citigroup
        </div>
      </div>

      {/* Right side — mirrored */}
      <div style={{
        position: "absolute",
        top: 0,
        right: 0,
        width: "50%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-end",
        padding: `${40 * scale}px`,
        textAlign: "right" as const,
      }}>
        <div style={{ color: "#ef4444", fontSize: 18 * scale, letterSpacing: "0.3em", marginBottom: 8 * scale }}>
          REPUBLICAN
        </div>
        <div style={{
          color: "#e4e4e7",
          fontSize: Math.min(24 * scale, width * 0.025),
          fontWeight: 700,
          marginBottom: 16 * scale,
        }}>
          [Senator B]
        </div>
        <div style={{ color: "#7a7a86", fontSize: 18 * scale, lineHeight: 1.6 }}>
          Top donors:<br/>Goldman Sachs<br/>JPMorgan<br/>Citigroup
        </div>
      </div>

      {/* Center overlay */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#0a0a0a",
        border: "2px solid #fbbf24",
        padding: `${16 * scale}px ${24 * scale}px`,
        textAlign: "center" as const,
        zIndex: 3,
      }}>
        <div style={{
          color: "#fbbf24",
          fontSize: Math.min(28 * scale, width * 0.03),
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}>
          {h}
        </div>
        <div style={{
          color: "#7a7a86",
          fontSize: 18 * scale,
          marginTop: 4 * scale,
        }}>
          {s}
        </div>
      </div>

      {/* Top bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: `${8 * scale}px ${40 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 3,
      }}>
        <div style={{ color: "#fbbf24", fontSize: 18 * scale, fontWeight: 700, letterSpacing: "0.2em" }}>
          THE MIRROR
        </div>
        <div style={{ color: "#ef4444", fontSize: 13 * scale, fontWeight: 700, letterSpacing: "0.15em", border: "1px solid #ef444466", padding: `${2 * scale}px ${6 * scale}px` }}>
          DONOR MAP
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `${8 * scale}px ${40 * scale}px`,
        display: "flex",
        justifyContent: "center",
        zIndex: 3,
      }}>
        <div style={{ color: "#7a7a86", fontSize: 13 * scale }}>
          thedonormap.org // FOLLOW THE MONEY
        </div>
      </div>
    </div>
  )
}
