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

  const h = headline || amount
  const s = subtext || (profile.type === "politician"
    ? `${name}${state ? ` (${profile.party === "Democrat" ? "D" : profile.party === "Republican" ? "R" : "I"}-${state})` : ""}`
    : name)

  const scale = Math.min(width / 1200, height / 630)

  return (
    <div
      style={{
        width, height,
        backgroundColor: "#0a0a0a",
        fontFamily: "'Space Mono', 'Courier New', monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background: massive amount as texture */}
      <div style={{
        position: "absolute",
        bottom: -30 * scale,
        right: -20 * scale,
        color: "#0f0f12",
        fontSize: Math.min(300 * scale, width * 0.3),
        fontWeight: 700,
        lineHeight: 0.8,
        letterSpacing: "-0.05em",
        whiteSpace: "nowrap" as const,
      }}>
        {h.replace(/[^$0-9BMK+.,]/g, "")}
      </div>

      {/* Scanlines */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.02,
        backgroundImage: "repeating-linear-gradient(0deg, #22c55e, #22c55e 1px, transparent 1px, transparent 3px)",
      }} />

      {/* Green accent bar — left */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 5,
        height: "100%",
        backgroundColor: "#22c55e",
      }} />

      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: `${35 * scale}px ${45 * scale}px`,
      }}>
        {/* Top */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ color: "#22c55e", fontSize: 18 * scale, letterSpacing: "0.3em" }}>
            TRANSACTION RECORD
          </div>
          <div style={{
            color: "#22c55e",
            fontSize: 13 * scale,
            fontWeight: 700,
            letterSpacing: "0.15em",
            border: "1px solid #22c55e44",
            padding: `${3 * scale}px ${8 * scale}px`,
          }}>
            VERIFIED
          </div>
        </div>

        {/* Middle: amount as dominant element */}
        <div>
          <div style={{
            color: "#22c55e",
            fontSize: Math.min(90 * scale, width * 0.1),
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            textShadow: "0 0 60px rgba(34, 197, 94, 0.2)",
            marginBottom: 12 * scale,
          }}>
            {h}
          </div>
          <div style={{
            color: "#e4e4e7",
            fontSize: Math.min(28 * scale, width * 0.03),
            fontWeight: 700,
            letterSpacing: "-0.01em",
            marginBottom: 8 * scale,
          }}>
            {s}
          </div>
          {topDonor && (
            <div style={{ display: "flex", gap: 8 * scale, alignItems: "center" }}>
              <div style={{ width: 16 * scale, height: 1, backgroundColor: "#22c55e" }} />
              <span style={{ color: "#7a7a86", fontSize: 15 * scale }}>
                {topDonor}
              </span>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ color: "#fbbf24", fontSize: 15 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
              FOLLOW THE MONEY
            </div>
            <div style={{ color: "#7a7a86", fontSize: 13 * scale, marginTop: 3 * scale }}>
              thedonormap.org
            </div>
          </div>
          <div style={{
            color: "#ef4444",
            fontSize: 13 * scale,
            fontWeight: 700,
            letterSpacing: "0.15em",
            border: "1px solid #ef444466",
            padding: `${3 * scale}px ${8 * scale}px`,
          }}>
            DONOR MAP
          </div>
        </div>
      </div>

      {/* Red accent — bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: width * 0.25,
        height: 3,
        backgroundColor: "#ef4444",
      }} />
    </div>
  )
}
