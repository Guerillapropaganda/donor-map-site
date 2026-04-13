"use client"

import type { Profile } from "@/lib/vault"

interface CardLeakProps {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

export function CardLeak({ profile, headline, subtext, width, height }: CardLeakProps) {
  const name = profile.title.replace(/ Master Profile$/, "")
  const thesis = profile.centralThesis || ""
  const defaultHeadline = name
  const defaultSubtext = thesis.length > 160 ? thesis.slice(0, 157) + "..." : thesis

  const h = headline || defaultHeadline
  const s = subtext || defaultSubtext
  const scale = Math.min(width / 1200, height / 630)

  return (
    <div
      style={{
        width, height,
        backgroundColor: "#f5f0eb",
        fontFamily: "'Courier New', Courier, monospace",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: `${50 * scale}px`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Paper texture: fold lines */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: "#d4c9b8",
        opacity: 0.5,
      }} />
      <div style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: "50%",
        width: 1,
        backgroundColor: "#d4c9b8",
        opacity: 0.3,
      }} />

      {/* Corner stamp */}
      <div style={{
        position: "absolute",
        top: 20 * scale,
        right: 30 * scale,
        color: "#ef4444",
        fontSize: 14 * scale,
        fontWeight: 700,
        letterSpacing: "0.2em",
        border: "2px solid #ef4444",
        padding: `${4 * scale}px ${12 * scale}px`,
        transform: "rotate(3deg)",
        opacity: 0.8,
      }}>
        PUBLIC RECORD
      </div>

      {/* Header */}
      <div>
        <div style={{
          color: "#7a7a86",
          fontSize: 10 * scale,
          letterSpacing: "0.3em",
          textTransform: "uppercase" as const,
          marginBottom: 8 * scale,
        }}>
          DONOR INTELLIGENCE FILE
        </div>
        <div style={{
          width: 60 * scale,
          height: 3,
          backgroundColor: "#1a1a1a",
        }} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Redaction bar for visual texture */}
        <div style={{
          backgroundColor: "#1a1a1a",
          height: 16 * scale,
          width: "40%",
          marginBottom: 20 * scale,
          opacity: 0.7,
        }} />

        <div style={{
          color: "#1a1a1a",
          fontSize: Math.min(40 * scale, width * 0.045),
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: 16 * scale,
        }}>
          {h}
        </div>

        <div style={{
          color: "#4a4a4a",
          fontSize: 16 * scale,
          lineHeight: 1.6,
          maxWidth: "80%",
        }}>
          {s}
        </div>

        {/* Another redaction bar */}
        <div style={{
          backgroundColor: "#1a1a1a",
          height: 12 * scale,
          width: "25%",
          marginTop: 20 * scale,
          opacity: 0.5,
        }} />
      </div>

      {/* Footer */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
      }}>
        <div>
          <div style={{ color: "#1a1a1a", fontSize: 11 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
            SOURCE: THEDONORMAP.ORG
          </div>
          <div style={{ color: "#7a7a86", fontSize: 9 * scale, marginTop: 4 * scale }}>
            Open-source political donor intelligence
          </div>
        </div>
        <div style={{
          color: "#ef4444",
          fontSize: 11 * scale,
          fontWeight: 700,
          letterSpacing: "0.2em",
        }}>
          FOLLOW THE MONEY
        </div>
      </div>

      {/* Diagonal SOURCE stamp */}
      <div style={{
        position: "absolute",
        bottom: height * 0.15,
        right: -20 * scale,
        color: "#ef444422",
        fontSize: 60 * scale,
        fontWeight: 700,
        letterSpacing: "0.3em",
        transform: "rotate(-25deg)",
        whiteSpace: "nowrap" as const,
      }}>
        DONOR MAP
      </div>
    </div>
  )
}
