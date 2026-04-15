"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE PIPELINE — Vertical flow showing money path: Donor → Lobbyist → Think Tank → Politician → Policy */
export function CardPipeline({ profile, headline, subtext, width, height }: Props) {
  const raw = profile as unknown as Record<string, unknown>
  const name = profile.title.replace(/ Master Profile$/, "").replace(/^_/, "")
  const amount = String(raw.careerTotal || raw.totalRaised || raw.totalReceived || "")
  const topDonors = Array.isArray(raw.topDonors) ? raw.topDonors.map(String).slice(0, 3) : []

  const h = headline || name
  const s = subtext || "How the money flows"
  const scale = Math.min(width / 1200, height / 630)

  const stages = [
    { label: "DONOR", value: topDonors[0] || "Corporate PAC", color: "#22c55e" },
    { label: "LOBBYIST", value: "K Street", color: "#f59e0b" },
    { label: "POLITICIAN", value: h, color: "#5b8dce" },
    { label: "POLICY", value: amount || "Deregulation", color: "#ef4444" },
  ]

  const stageHeight = (height - 120 * scale) / stages.length
  const pipeX = width * 0.15

  return (
    <div style={{
      width, height,
      backgroundColor: "#0a0a0a",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Vertical pipeline line */}
      <div style={{
        position: "absolute",
        left: pipeX,
        top: 50 * scale,
        bottom: 50 * scale,
        width: 2,
        backgroundColor: "#fbbf2444",
      }} />

      {/* Pipeline nodes */}
      {stages.map((stage, i) => {
        const y = 50 * scale + i * stageHeight + stageHeight * 0.3
        return (
          <div key={i} style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", alignItems: "center" }}>
            {/* Node dot */}
            <div style={{
              position: "absolute",
              left: pipeX - 6,
              width: 14,
              height: 14,
              borderRadius: "50%",
              backgroundColor: stage.color,
              border: "2px solid #0a0a0a",
            }} />
            {/* Arrow down */}
            {i < stages.length - 1 && (
              <div style={{
                position: "absolute",
                left: pipeX - 3,
                top: 20 * scale,
                color: "#fbbf2444",
                fontSize: 18 * scale,
              }}>
                ▼
              </div>
            )}
            {/* Label + value */}
            <div style={{ marginLeft: pipeX + 30 * scale }}>
              <div style={{
                color: stage.color,
                fontSize: 13 * scale,
                letterSpacing: "0.3em",
                marginBottom: 3 * scale,
              }}>
                {stage.label}
              </div>
              <div style={{
                color: "#e4e4e7",
                fontSize: Math.min(20 * scale, width * 0.025),
                fontWeight: 700,
                maxWidth: width * 0.6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap" as const,
              }}>
                {stage.value}
              </div>
            </div>
          </div>
        )
      })}

      {/* Title bar — top */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: `${10 * scale}px ${45 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
      }}>
        <div style={{ color: "#fbbf24", fontSize: 18 * scale, fontWeight: 700, letterSpacing: "0.2em" }}>
          THE MONEY PIPELINE
        </div>
        <div style={{ color: "#ef4444", fontSize: 13 * scale, fontWeight: 700, letterSpacing: "0.15em", border: "1px solid #ef444466", padding: `${2 * scale}px ${6 * scale}px` }}>
          DONOR MAP
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: `${10 * scale}px ${45 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
      }}>
        <div style={{ color: "#fbbf24", fontSize: 18 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
          FOLLOW THE MONEY
        </div>
        <div style={{ color: "#7a7a86", fontSize: 20 * scale }}>thedonormap.org</div>
      </div>
    </div>
  )
}
