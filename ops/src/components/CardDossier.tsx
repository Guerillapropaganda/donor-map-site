"use client"

import type { Profile } from "@/lib/vault"

interface CardDossierProps {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
  imageUrl?: string
}

export function CardDossier({ profile, headline, subtext, width, height, imageUrl }: CardDossierProps) {
  const raw = profile as Record<string, unknown>
  const name = profile.title.replace(/ Master Profile$/, "")
  const party = profile.party === "Democrat" ? "D" : profile.party === "Republican" ? "R" : "I"
  const state = String(raw.state || raw["state-abbr"] || raw.stateAbbr || "")
  const amount = String(raw.careerTotal || raw.totalRaised || raw.totalReceived || raw.lobbyingSpend || "")
  const topDonors = raw.topDonors || raw["top-donors"]
  const topDonor = Array.isArray(topDonors) ? String(topDonors[0] || "") : ""
  const thesis = profile.centralThesis || ""

  const defaultHeadline = name
  const defaultSubtext = thesis.length > 100 ? thesis.slice(0, 97) + "..." : thesis

  const h = headline || defaultHeadline
  const s = subtext || defaultSubtext
  const scale = Math.min(width / 1200, height / 630)

  // Split name for massive type treatment
  const nameParts = h.split(" ")
  const firstName = nameParts[0] || ""
  const restName = nameParts.slice(1).join(" ")

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
      {/* Background: massive name bleeding off edges */}
      <div style={{
        position: "absolute",
        top: -20 * scale,
        left: -10 * scale,
        right: -100 * scale,
        color: "#1a1a1f",
        fontSize: Math.min(180 * scale, width * 0.18),
        fontWeight: 700,
        lineHeight: 0.85,
        textTransform: "uppercase" as const,
        letterSpacing: "-0.04em",
        whiteSpace: "nowrap" as const,
        userSelect: "none" as const,
      }}>
        {firstName}<br/>{restName}
      </div>

      {/* Yellow accent bar — top left */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 6,
        height: height * 0.4,
        backgroundColor: "#fbbf24",
      }} />

      {/* Content overlay */}
      <div style={{
        position: "relative",
        zIndex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: `${35 * scale}px ${45 * scale}px`,
      }}>
        {/* Top: type label + tag */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{
            color: "#fbbf24",
            fontSize: 10 * scale,
            fontWeight: 700,
            letterSpacing: "0.3em",
            textTransform: "uppercase" as const,
          }}>
            {profile.type === "politician" ? (state ? `${party}-${state}` : party) : profile.type}
          </div>
          <div style={{
            color: "#ef4444",
            fontSize: 9 * scale,
            fontWeight: 700,
            letterSpacing: "0.2em",
            border: "1px solid #ef4444",
            padding: `${3 * scale}px ${8 * scale}px`,
          }}>
            DONOR MAP
          </div>
        </div>

        {/* Middle: name + amount as dominant type */}
        <div>
          <div style={{
            color: "#fbbf24",
            fontSize: Math.min(56 * scale, width * 0.06),
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            marginBottom: 8 * scale,
          }}>
            {h}
          </div>

          {amount && (
            <div style={{
              color: "#e4e4e7",
              fontSize: Math.min(80 * scale, width * 0.085),
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              marginBottom: 12 * scale,
            }}>
              {amount}
            </div>
          )}

          {topDonor && (
            <div style={{ display: "flex", gap: 8 * scale, alignItems: "center", marginBottom: 8 * scale }}>
              <div style={{
                width: 20 * scale,
                height: 1,
                backgroundColor: "#fbbf24",
              }} />
              <span style={{ color: "#7a7a86", fontSize: 11 * scale, letterSpacing: "0.1em" }}>
                TOP DONOR: <span style={{ color: "#e4e4e7", fontWeight: 700 }}>{topDonor}</span>
              </span>
            </div>
          )}

          {s && (
            <div style={{
              color: "#7a7a86",
              fontSize: 12 * scale,
              lineHeight: 1.4,
              maxWidth: "75%",
              marginTop: 12 * scale,
            }}>
              {s}
            </div>
          )}
        </div>

        {/* Bottom: branding */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}>
          <div style={{
            color: "#fbbf24",
            fontSize: 11 * scale,
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}>
            FOLLOW THE MONEY
          </div>
          <div style={{ color: "#7a7a86", fontSize: 9 * scale }}>
            thedonormap.org
          </div>
        </div>
      </div>

      {/* Red accent bar — bottom right */}
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: width * 0.3,
        height: 4,
        backgroundColor: "#ef4444",
      }} />
    </div>
  )
}
