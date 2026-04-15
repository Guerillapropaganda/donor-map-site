"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE REDACTED — Key words highlighted, rest blacked out like a FOIA document */
export function CardRedacted({ profile, headline, subtext, width, height }: Props) {
  const name = profile.title.replace(/ Master Profile$/, "").replace(/^_/, "")
  const raw = profile as unknown as Record<string, unknown>
  const amount = String(raw.careerTotal || raw.totalRaised || "")
  const topDonors = Array.isArray(raw.topDonors) ? raw.topDonors.map(String) : []

  const h = headline || name
  const s = subtext || profile.centralThesis || ""
  const scale = Math.min(width / 1200, height / 630)

  // Create redacted text effect — highlight key terms, black out rest
  const keyTerms = [h, amount, ...topDonors.slice(0, 2), "thedonormap.org"].filter(Boolean)

  return (
    <div style={{
      width, height,
      backgroundColor: "#f5f0eb",
      fontFamily: "'Courier New', Courier, monospace",
      position: "relative",
      overflow: "hidden",
      padding: `${45 * scale}px`,
    }}>
      {/* Paper texture lines */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `repeating-linear-gradient(transparent, transparent ${24 * scale}px, #d4c9b855 ${24 * scale}px, #d4c9b855 ${25 * scale}px)`,
      }} />

      {/* Header */}
      <div style={{
        position: "relative",
        zIndex: 1,
        marginBottom: 20 * scale,
      }}>
        <div style={{
          color: "#7a7a86",
          fontSize: 18 * scale,
          letterSpacing: "0.3em",
          marginBottom: 5 * scale,
        }}>
          DOCUMENT EXCERPT
        </div>
        <div style={{
          width: "100%",
          height: 2,
          backgroundColor: "#1a1a1a",
        }} />
      </div>

      {/* Redacted blocks — decorative */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Redaction bar 1 */}
        <div style={{ backgroundColor: "#1a1a1a", height: 16 * scale, width: "60%", marginBottom: 12 * scale }} />

        {/* Highlighted name */}
        <div style={{
          display: "inline-block",
          backgroundColor: "#fbbf24",
          padding: `${4 * scale}px ${8 * scale}px`,
          marginBottom: 12 * scale,
        }}>
          <span style={{
            color: "#1a1a1a",
            fontSize: Math.min(32 * scale, width * 0.04),
            fontWeight: 700,
          }}>
            {h}
          </span>
        </div>

        {/* Redaction bar 2 */}
        <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "45%", marginBottom: 12 * scale }} />

        {/* Amount highlighted */}
        {amount && (
          <div style={{ marginBottom: 12 * scale }}>
            <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "30%", display: "inline-block", marginRight: 8 * scale, verticalAlign: "middle" }} />
            <span style={{
              display: "inline-block",
              backgroundColor: "#ef4444",
              padding: `${3 * scale}px ${6 * scale}px`,
              color: "#ffffff",
              fontSize: 20 * scale,
              fontWeight: 700,
              verticalAlign: "middle",
            }}>
              {amount}
            </span>
          </div>
        )}

        {/* Redaction bar 3 */}
        <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "70%", marginBottom: 12 * scale }} />
        <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "55%", marginBottom: 12 * scale }} />

        {/* Subtext visible */}
        <div style={{
          color: "#4a4a4a",
          fontSize: 20 * scale,
          lineHeight: 1.6,
          maxWidth: "75%",
          marginBottom: 12 * scale,
        }}>
          {s.slice(0, 100)}{s.length > 100 ? "..." : ""}
        </div>

        {/* More redaction */}
        <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "40%", marginBottom: 6 * scale }} />
        <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "65%", marginBottom: 6 * scale }} />
        <div style={{ backgroundColor: "#1a1a1a", height: 14 * scale, width: "35%" }} />
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute",
        bottom: 20 * scale,
        left: 45 * scale,
        right: 45 * scale,
        display: "flex",
        justifyContent: "space-between",
        zIndex: 1,
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
