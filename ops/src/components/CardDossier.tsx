"use client"

import type { Profile } from "@/lib/vault"
import { typeColor } from "@/lib/vault"

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
  const stateLabel = state ? `${party}-${state}` : profile.type
  const amount = String(raw.careerTotal || raw.totalRaised || raw.totalReceived || raw.lobbyingSpend || "")
  const topDonors = raw.topDonors || raw["top-donors"]
  const topDonor = Array.isArray(topDonors) ? String(topDonors[0] || "") : ""
  const thesis = profile.centralThesis || ""

  const defaultHeadline = name
  const defaultSubtext = thesis.length > 120 ? thesis.slice(0, 117) + "..." : thesis

  const h = headline || defaultHeadline
  const s = subtext || defaultSubtext
  const scale = Math.min(width / 1200, height / 630)
  const color = typeColor(profile.type)

  return (
    <div
      style={{
        width, height,
        backgroundColor: "#141419",
        fontFamily: "'Space Mono', 'Courier New', monospace",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Red top bar */}
      <div style={{
        backgroundColor: "#ef4444",
        padding: `${10 * scale}px ${40 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ color: "#fff", fontSize: 12 * scale, fontWeight: 700, letterSpacing: "0.2em" }}>
          FOLLOW THE MONEY
        </div>
        <div style={{ color: "#fff", fontSize: 10 * scale, letterSpacing: "0.15em" }}>
          THEDONORMAP.ORG
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        padding: `${30 * scale}px ${40 * scale}px`,
        gap: 30 * scale,
      }}>
        {/* Left: Photo or initial */}
        <div style={{
          width: height * 0.5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                filter: "grayscale(1) contrast(2) brightness(0.8)",
                borderRadius: 0,
              }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{
              width: height * 0.35,
              height: height * 0.35,
              backgroundColor: `${color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: height * 0.15,
              fontWeight: 700,
              color,
            }}>
              {name[0]}
            </div>
          )}
          <div style={{
            color: "#7a7a86",
            fontSize: 10 * scale,
            marginTop: 8 * scale,
            letterSpacing: "0.1em",
          }}>
            {stateLabel}
          </div>
        </div>

        {/* Right: Stats */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{
            color: "#fbbf24",
            fontSize: Math.min(36 * scale, width * 0.04),
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 16 * scale,
          }}>
            {h}
          </div>

          {amount && (
            <div style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8 * scale,
              marginBottom: 12 * scale,
            }}>
              <span style={{ color: "#22c55e", fontSize: 28 * scale, fontWeight: 700 }}>
                {amount}
              </span>
              <span style={{ color: "#7a7a86", fontSize: 11 * scale }}>career total</span>
            </div>
          )}

          {topDonor && (
            <div style={{ marginBottom: 12 * scale }}>
              <span style={{ color: "#7a7a86", fontSize: 10 * scale }}>TOP DONOR: </span>
              <span style={{ color: "#e4e4e7", fontSize: 13 * scale, fontWeight: 700 }}>{topDonor}</span>
            </div>
          )}

          {s && (
            <div style={{
              color: "#a0a0a8",
              fontSize: 12 * scale,
              lineHeight: 1.5,
              borderLeft: `2px solid ${color}`,
              paddingLeft: 12 * scale,
              marginTop: 8 * scale,
            }}>
              {s}
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        backgroundColor: "#0a0a0a",
        padding: `${8 * scale}px ${40 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div style={{ color: "#7a7a86", fontSize: 9 * scale, letterSpacing: "0.1em" }}>
          OPEN-SOURCE DONOR INTELLIGENCE
        </div>
        <div style={{ color: "#fbbf24", fontSize: 9 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
          DONOR MAP
        </div>
      </div>
    </div>
  )
}
