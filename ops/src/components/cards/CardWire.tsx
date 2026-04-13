"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE WIRE — Surveillance/wiretap aesthetic, green monospace on black, data stream */
export function CardWire({ profile, headline, subtext, width, height }: Props) {
  const raw = profile as Record<string, unknown>
  const name = profile.title.replace(/ Master Profile$/, "").replace(/^_/, "")
  const amount = String(raw.careerTotal || raw.totalRaised || "")
  const thesis = profile.centralThesis || ""

  const h = headline || name
  const s = subtext || thesis.slice(0, 120)
  const scale = Math.min(width / 1200, height / 630)

  // Generate fake data stream lines for background
  const dataLines = [
    `INTERCEPT_ID: DM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    `TARGET: ${name.toUpperCase()}`,
    `SECTOR: ${String(raw.sector || profile.type || "").toUpperCase()}`,
    amount ? `AMOUNT: ${amount}` : `STATUS: ACTIVE`,
    `SOURCE: FEC.GOV / CONGRESS.GOV / OPENSECRETS`,
    `CONFIDENCE: HIGH`,
    `CROSS-REF: ${String(raw.related || "").slice(0, 60)}`,
    `TIMESTAMP: ${new Date().toISOString()}`,
    `PIPELINE: ENRICHMENT COMPLETE`,
    `CLASSIFICATION: PUBLIC RECORD`,
  ]

  return (
    <div style={{
      width, height,
      backgroundColor: "#0a0a0a",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background data stream */}
      <div style={{
        position: "absolute",
        inset: 0,
        padding: `${20 * scale}px`,
        opacity: 0.15,
      }}>
        {dataLines.map((line, i) => (
          <div key={i} style={{
            color: "#22c55e",
            fontSize: 13 * scale,
            lineHeight: 2.2,
            letterSpacing: "0.05em",
          }}>
            &gt; {line}
          </div>
        ))}
      </div>

      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: "repeating-linear-gradient(0deg, #22c55e, #22c55e 1px, transparent 1px, transparent 2px)",
      }} />

      {/* Content overlay */}
      <div style={{
        position: "relative",
        zIndex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${40 * scale}px ${50 * scale}px`,
      }}>
        <div style={{
          color: "#22c55e",
          fontSize: 18 * scale,
          letterSpacing: "0.3em",
          marginBottom: 12 * scale,
        }}>
          &gt;&gt; INTELLIGENCE REPORT
        </div>

        <div style={{
          color: "#22c55e",
          fontSize: Math.min(52 * scale, width * 0.06),
          fontWeight: 700,
          lineHeight: 1.1,
          textShadow: "0 0 20px rgba(34, 197, 94, 0.3)",
          marginBottom: 16 * scale,
        }}>
          {h}
        </div>

        {amount && (
          <div style={{
            color: "#fbbf24",
            fontSize: Math.min(36 * scale, width * 0.04),
            fontWeight: 700,
            marginBottom: 12 * scale,
          }}>
            {amount}
          </div>
        )}

        <div style={{
          color: "#22c55e88",
          fontSize: 20 * scale,
          lineHeight: 1.5,
          maxWidth: "70%",
        }}>
          {s}
        </div>
      </div>

      {/* Bottom status bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#22c55e11",
        borderTop: "1px solid #22c55e33",
        padding: `${8 * scale}px ${50 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 2,
      }}>
        <div style={{ color: "#22c55e", fontSize: 13 * scale, letterSpacing: "0.1em" }}>
          DONOR MAP // OPEN-SOURCE INTELLIGENCE
        </div>
        <div style={{ color: "#22c55e66", fontSize: 20 * scale }}>
          thedonormap.org
        </div>
      </div>
    </div>
  )
}
