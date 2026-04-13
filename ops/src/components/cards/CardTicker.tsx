"use client"

import type { Profile } from "@/lib/vault"

interface Props {
  profile: Profile
  headline?: string
  subtext?: string
  width: number
  height: number
}

/** THE TICKER — Stock market ticker style, capitol trades aesthetic */
export function CardTicker({ profile, headline, subtext, width, height }: Props) {
  const raw = profile as Record<string, unknown>
  const name = profile.title.replace(/ Master Profile$/, "")
  const amount = String(raw.careerTotal || raw.totalRaised || "")
  const stockTrades = raw.stockTrades || raw["stock-trades"]

  const h = headline || name
  const s = subtext || (stockTrades ? `${stockTrades} stock trades while in office` : profile.centralThesis?.slice(0, 80) || "")
  const scale = Math.min(width / 1200, height / 630)

  // Fake ticker data
  const tickers = [
    { symbol: "MONEY", change: "+∞", up: true },
    { symbol: "POLICY", change: "SOLD", up: false },
    { symbol: "TRUST", change: "-99%", up: false },
    { symbol: "DONOR", change: "+$$$", up: true },
    { symbol: "VOTES", change: "BOUGHT", up: false },
  ]

  return (
    <div style={{
      width, height,
      backgroundColor: "#0a0a0a",
      fontFamily: "'Space Mono', 'Courier New', monospace",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ticker strip — top */}
      <div style={{
        backgroundColor: "#111115",
        borderBottom: "1px solid #22c55e33",
        padding: `${6 * scale}px ${20 * scale}px`,
        display: "flex",
        gap: 30 * scale,
        overflow: "hidden",
      }}>
        {tickers.map((t, i) => (
          <div key={i} style={{
            display: "flex",
            gap: 6 * scale,
            alignItems: "center",
            whiteSpace: "nowrap" as const,
          }}>
            <span style={{ color: "#e4e4e7", fontSize: 10 * scale, fontWeight: 700 }}>{t.symbol}</span>
            <span style={{ color: t.up ? "#22c55e" : "#ef4444", fontSize: 10 * scale }}>
              {t.up ? "▲" : "▼"} {t.change}
            </span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: `${30 * scale}px ${50 * scale}px`,
      }}>
        <div style={{
          color: "#7a7a86",
          fontSize: 10 * scale,
          letterSpacing: "0.3em",
          marginBottom: 12 * scale,
        }}>
          POLITICAL MARKETS
        </div>

        <div style={{
          color: "#e4e4e7",
          fontSize: Math.min(48 * scale, width * 0.055),
          fontWeight: 700,
          lineHeight: 1.1,
          marginBottom: 8 * scale,
        }}>
          {h}
        </div>

        {amount && (
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12 * scale,
            marginBottom: 16 * scale,
          }}>
            <span style={{ color: "#22c55e", fontSize: Math.min(40 * scale, width * 0.045), fontWeight: 700 }}>
              {amount}
            </span>
            <span style={{ color: "#22c55e", fontSize: 14 * scale }}>▲</span>
            <span style={{ color: "#7a7a86", fontSize: 12 * scale }}>career total</span>
          </div>
        )}

        {stockTrades && (
          <div style={{
            display: "inline-block",
            backgroundColor: "#ef444422",
            border: "1px solid #ef444444",
            padding: `${4 * scale}px ${12 * scale}px`,
            marginBottom: 12 * scale,
          }}>
            <span style={{ color: "#ef4444", fontSize: 12 * scale, fontWeight: 700 }}>
              {String(stockTrades)} STOCK TRADES IN OFFICE
            </span>
          </div>
        )}

        <div style={{ color: "#7a7a86", fontSize: 12 * scale, lineHeight: 1.4, maxWidth: "70%" }}>
          {s}
        </div>
      </div>

      {/* Bottom ticker strip */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#111115",
        borderTop: "1px solid #22c55e33",
        padding: `${6 * scale}px ${20 * scale}px`,
        display: "flex",
        justifyContent: "space-between",
      }}>
        <div style={{ color: "#fbbf24", fontSize: 9 * scale, fontWeight: 700, letterSpacing: "0.15em" }}>
          FOLLOW THE MONEY
        </div>
        <div style={{ color: "#22c55e66", fontSize: 8 * scale }}>
          DONOR MAP // thedonormap.org
        </div>
      </div>
    </div>
  )
}
