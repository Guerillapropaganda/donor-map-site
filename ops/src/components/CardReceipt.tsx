"use client"

import type { Profile } from "@/lib/vault"

interface CardReceiptProps {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

export function CardReceipt({ profile, headline, subtext, width, height }: CardReceiptProps) {
  const raw = profile as Record<string, unknown>
  const amount = String(raw.careerTotal || raw.totalRaised || raw.totalReceived || raw.lobbyingSpend || profile.centralThesis?.match(/\$[\d,.]+[BMK]?/)?.[0] || "FOLLOW THE MONEY")
  const name = profile.title.replace(/ Master Profile$/, "")
  const topDonors = raw.topDonors || raw["top-donors"]
  const topDonor = Array.isArray(topDonors) ? String(topDonors[0] || "") : ""
  const state = String(raw.state || raw["state-abbr"] || "")
  const defaultHeadline = amount
  const defaultSubtext = profile.type === "politician"
    ? `${name}${state ? ` (${profile.party === "Democrat" ? "D" : profile.party === "Republican" ? "R" : "I"}-${state})` : ""}`
    : name

  const h = headline || defaultHeadline
  const s = subtext || defaultSubtext
  const scale = Math.min(width / 1200, height / 630)

  return (
    <div
      style={{
        width, height,
        backgroundColor: "#0a0a0a",
        fontFamily: "'Space Mono', 'Courier New', monospace",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: `${40 * scale}px`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Scanlines overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "repeating-linear-gradient(0deg, #22c55e, #22c55e 1px, transparent 1px, transparent 3px)",
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ color: "#7a7a86", fontSize: 10 * scale, letterSpacing: "0.2em", textTransform: "uppercase" as const }}>
          TRANSACTION RECORD
        </div>
        <div style={{ color: "#22c55e", fontSize: 10 * scale, letterSpacing: "0.15em" }}>
          VERIFIED
        </div>
      </div>

      {/* Main amount */}
      <div style={{ textAlign: "center" as const, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{
          color: "#22c55e",
          fontSize: Math.min(72 * scale, width * 0.08),
          fontWeight: 700,
          lineHeight: 1,
          marginBottom: 16 * scale,
          textShadow: "0 0 30px rgba(34, 197, 94, 0.3)",
        }}>
          {h}
        </div>
        <div style={{ color: "#e4e4e7", fontSize: 20 * scale, fontWeight: 700, marginBottom: 8 * scale }}>
          {s}
        </div>
        {topDonor && (
          <div style={{ color: "#7a7a86", fontSize: 14 * scale }}>
            Top donor: {topDonor}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        borderTop: "1px solid #22c55e33",
        paddingTop: 16 * scale,
      }}>
        <div>
          <div style={{ color: "#fbbf24", fontSize: 12 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
            FOLLOW THE MONEY
          </div>
          <div style={{ color: "#7a7a86", fontSize: 10 * scale, marginTop: 4 * scale }}>
            thedonormap.org
          </div>
        </div>
        <div style={{
          color: "#ef4444",
          fontSize: 9 * scale,
          border: "1px solid #ef444466",
          padding: `${4 * scale}px ${8 * scale}px`,
          letterSpacing: "0.15em",
        }}>
          DONOR MAP
        </div>
      </div>
    </div>
  )
}
