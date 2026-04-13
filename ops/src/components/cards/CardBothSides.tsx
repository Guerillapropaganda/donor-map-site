"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE BOTH SIDES — Split card showing same entity funding both parties */
export function CardBothSides({ profile, headline, subtext, width, height }: Props) {
  const name = profile.title.replace(/ Master Profile$/, "")
  const h = headline || name
  const s = subtext || "Funds both sides. Same money. Different jerseys."
  const scale = Math.min(width / 1200, height / 630)

  return (
    <div style={{
      width, height,
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
      display: "flex",
    }}>
      {/* Left half: Blue (Democrat) */}
      <div style={{
        width: "50%",
        height: "100%",
        backgroundColor: "#1d4ed8",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-end",
        padding: `${40 * scale}px`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: -20 * scale,
          left: -10 * scale,
          color: "#2563eb",
          fontSize: 200 * scale,
          fontWeight: 700,
          lineHeight: 0.8,
          opacity: 0.3,
        }}>
          D
        </div>
        <div style={{
          color: "#ffffff",
          fontSize: 16 * scale,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textAlign: "right" as const,
          position: "relative",
          zIndex: 1,
        }}>
          DEMOCRAT
        </div>
      </div>

      {/* Right half: Red (Republican) */}
      <div style={{
        width: "50%",
        height: "100%",
        backgroundColor: "#dc2626",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `${40 * scale}px`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute",
          top: -20 * scale,
          right: -10 * scale,
          color: "#ef4444",
          fontSize: 200 * scale,
          fontWeight: 700,
          lineHeight: 0.8,
          opacity: 0.3,
        }}>
          R
        </div>
        <div style={{
          color: "#ffffff",
          fontSize: 16 * scale,
          fontWeight: 700,
          letterSpacing: "0.1em",
          position: "relative",
          zIndex: 1,
        }}>
          REPUBLICAN
        </div>
      </div>

      {/* Center overlay: the entity that funds both */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#0a0a0a",
        padding: `${30 * scale}px ${50 * scale}px`,
        textAlign: "center" as const,
        zIndex: 2,
        border: "2px solid #fbbf24",
        maxWidth: width * 0.7,
      }}>
        <div style={{
          color: "#fbbf24",
          fontSize: 10 * scale,
          letterSpacing: "0.3em",
          marginBottom: 8 * scale,
        }}>
          FUNDS BOTH SIDES
        </div>
        <div style={{
          color: "#ffffff",
          fontSize: Math.min(36 * scale, width * 0.04),
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: 8 * scale,
        }}>
          {h}
        </div>
        <div style={{
          color: "#a0a0a8",
          fontSize: 12 * scale,
          lineHeight: 1.4,
        }}>
          {s}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#0a0a0aee",
        padding: `${8 * scale}px ${40 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 3,
      }}>
        <div style={{ color: "#fbbf24", fontSize: 9 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
          FOLLOW THE MONEY
        </div>
        <div style={{ color: "#7a7a86", fontSize: 8 * scale }}>thedonormap.org</div>
      </div>
    </div>
  )
}
