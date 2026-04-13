"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE HEADLINE — Newspaper front page style, massive headline dominates */
export function CardHeadline({ profile, headline, subtext, width, height }: Props) {
  const name = profile.title.replace(/ Master Profile$/, "")
  const thesis = profile.centralThesis || ""
  const h = headline || thesis.split(".")[0] || name
  const s = subtext || name
  const scale = Math.min(width / 1200, height / 630)

  return (
    <div style={{
      width, height,
      backgroundColor: "#f5f0eb",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Newspaper header line */}
      <div style={{
        borderBottom: "3px solid #1a1a1a",
        padding: `${15 * scale}px ${45 * scale}px ${10 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
      }}>
        <div style={{
          color: "#1a1a1a",
          fontSize: 18 * scale,
          fontWeight: 700,
          letterSpacing: "0.2em",
        }}>
          THE DONOR MAP
        </div>
        <div style={{ color: "#7a7a86", fontSize: 13 * scale }}>
          OPEN-SOURCE DONOR INTELLIGENCE
        </div>
      </div>

      {/* Thin rule */}
      <div style={{
        borderBottom: "1px solid #1a1a1a",
        margin: `0 ${45 * scale}px`,
        paddingTop: 3 * scale,
      }} />

      {/* Headline */}
      <div style={{
        padding: `${25 * scale}px ${45 * scale}px`,
        flex: 1,
      }}>
        <div style={{
          color: "#1a1a1a",
          fontSize: Math.min(48 * scale, width * 0.055),
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          marginBottom: 16 * scale,
        }}>
          {h}
        </div>

        <div style={{
          width: 60 * scale,
          height: 3,
          backgroundColor: "#ef4444",
          marginBottom: 16 * scale,
        }} />

        <div style={{
          color: "#4a4a4a",
          fontSize: 18 * scale,
          lineHeight: 1.6,
          maxWidth: "80%",
        }}>
          {s}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: "1px solid #d4c9b8",
        padding: `${10 * scale}px ${45 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        backgroundColor: "#f5f0eb",
      }}>
        <div style={{ color: "#ef4444", fontSize: 18 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
          FOLLOW THE MONEY
        </div>
        <div style={{ color: "#7a7a86", fontSize: 13 * scale }}>
          thedonormap.org
        </div>
      </div>
    </div>
  )
}
