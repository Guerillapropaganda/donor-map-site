"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE WEB — Network graph showing connections as lines radiating from center */
export function CardWeb({ profile, headline, subtext, width, height }: Props) {
  const raw = profile as Record<string, unknown>
  const name = profile.title.replace(/ Master Profile$/, "").replace(/^_/, "")
  const topDonors = Array.isArray(raw.topDonors) ? raw.topDonors.map(String).slice(0, 6) : []
  const related = String(raw.related || "").match(/\[\[([^\]|]+)/g)?.map(s => s.replace("[[", "")).slice(0, 8) || []
  const connections = [...topDonors, ...related].slice(0, 8)

  const h = headline || name
  const s = subtext || `${connections.length} connections mapped`
  const scale = Math.min(width / 1200, height / 630)
  const cx = width * 0.35
  const cy = height * 0.5

  return (
    <div style={{
      width, height,
      backgroundColor: "#0a0a0a",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Connection lines */}
      <svg style={{ position: "absolute", inset: 0 }} viewBox={`0 0 ${width} ${height}`}>
        {connections.map((_, i) => {
          const angle = (i / connections.length) * Math.PI * 2 - Math.PI / 2
          const radius = Math.min(width, height) * 0.35
          const x2 = cx + Math.cos(angle) * radius
          const y2 = cy + Math.sin(angle) * radius
          return (
            <g key={i}>
              <line
                x1={cx} y1={cy} x2={x2} y2={y2}
                stroke="#fbbf2433" strokeWidth={1}
              />
              <circle cx={x2} cy={y2} r={4 * scale} fill="#fbbf24" opacity={0.6} />
            </g>
          )
        })}
        {/* Center node */}
        <circle cx={cx} cy={cy} r={8 * scale} fill="#ef4444" />
        <circle cx={cx} cy={cy} r={20 * scale} fill="none" stroke="#ef444444" strokeWidth={1} />
      </svg>

      {/* Connection labels */}
      {connections.map((name, i) => {
        const angle = (i / connections.length) * Math.PI * 2 - Math.PI / 2
        const radius = Math.min(width, height) * 0.35 + 12 * scale
        const x = cx + Math.cos(angle) * radius
        const y = cy + Math.sin(angle) * radius
        const isRight = Math.cos(angle) > 0
        return (
          <div key={i} style={{
            position: "absolute",
            left: x,
            top: y,
            transform: `translate(${isRight ? 0 : -100}%, -50%)`,
            color: "#7a7a86",
            fontSize: 13 * scale,
            whiteSpace: "nowrap" as const,
            maxWidth: 150 * scale,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {name}
          </div>
        )
      })}

      {/* Content overlay — right side */}
      <div style={{
        position: "absolute",
        right: 40 * scale,
        top: 35 * scale,
        bottom: 35 * scale,
        width: width * 0.35,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 2,
      }}>
        <div style={{ color: "#fbbf24", fontSize: 18 * scale, letterSpacing: "0.3em" }}>
          CONNECTION MAP
        </div>

        <div>
          <div style={{
            color: "#fbbf24",
            fontSize: Math.min(36 * scale, width * 0.04),
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 8 * scale,
          }}>
            {h}
          </div>
          <div style={{ color: "#7a7a86", fontSize: 20 * scale, lineHeight: 1.4 }}>
            {s}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ color: "#fbbf24", fontSize: 18 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
            FOLLOW THE MONEY
          </div>
          <div style={{ color: "#7a7a86", fontSize: 20 * scale }}>thedonormap.org</div>
        </div>
      </div>
    </div>
  )
}
