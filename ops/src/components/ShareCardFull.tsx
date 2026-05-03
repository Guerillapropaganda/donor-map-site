"use client"

import { forwardRef } from "react"

/**
 * ShareCardFull — full 1080×1080 share card with embedded SVG graph.
 *
 * Mirrors prototype/share-cards-2026-05-03.html so the ops thumbnail
 * IS the actual share image. Used by MemeCard for entries with
 * shareCardKind set; the ops Copy as PNG button captures this element
 * via html2canvas → clipboard.
 *
 * Three kinds correspond to the three live CA Gov 2026 beats:
 *   three-becerras    — BECERRA → 3 audiences daisy chain + healthcare donor band
 *   not-the-bad-guy   — Jan 2020 AG fracking suit → Jun 2025 Chevron $39,200 → Apr 2026 "not the bad guy" timeline
 *   class-traitor     — $31M anti-Steyer stacked bar (PG&E, Realtors, Chamber, BIA, coalition)
 */

export type ShareCardKind = "three-becerras" | "not-the-bad-guy" | "class-traitor"

interface ShareCardConfig {
  headline: React.ReactNode
  deck: string
  url: string
  footerNote: string
  graphic: React.ReactNode
}

const CONFIG: Record<ShareCardKind, ShareCardConfig> = {
  "three-becerras": {
    headline: (
      <>
        What he says depends on{" "}
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>who is listening</span>.
      </>
    ),
    deck:
      "Xavier Becerra cosponsored single-payer bills seven times across four Congresses. Six weeks before he told the doctors lobby he wasn't supportive, his campaign website said he was ready to deliver it. The receipts on his donor list explain who is acceptable to whom.",
    url: "thedonormap.org/three-becerras",
    footerNote: "CA GOV 2026 · Cal-Access primary records",
    graphic: <ThreeBecerrasGraphic />,
  },
  "not-the-bad-guy": {
    headline: (
      <>
        He took the check. Then he{" "}
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>defended</span> it.
      </>
    ),
    deck:
      "$39,200 from Chevron USA Inc. landed in Becerra's California governor account on June 16, 2025. The legal max. Two rivals signed pledges refusing fossil fuel money. Ten months later, asked at a public forum why he kept it, he said Chevron was not the bad guy.",
    url: "thedonormap.org/not-the-bad-guy",
    footerNote: "Cal-Access · Politico CA · KQED",
    graphic: <NotTheBadGuyGraphic />,
  },
  "class-traitor": {
    headline: (
      <>
        $31 million to bury a{" "}
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>class traitor</span>.
      </>
    ),
    deck:
      "California's donor class organized against Tom Steyer in 2026: utility, realtors, chamber, developers, prison guards. The same Bearstar Strategies shop running pro-Becerra IE money also runs the anti-Steyer IE money. Same firm, opposite sides of the same race.",
    url: "thedonormap.org/class-traitor",
    footerNote: "FPPC Top 10 · Cal-Access · Energy & Policy Inst.",
    graphic: <ClassTraitorGraphic />,
  },
}

interface Props {
  kind: ShareCardKind
  /** When true, render at full 1080×1080 size (used for clipboard capture).
   *  When false, the outer wrapper scales to fit the ops thumbnail slot. */
  fullSize?: boolean
  /** Optional CSS to override outer wrapper. */
  outerStyle?: React.CSSProperties
}

export const ShareCardFull = forwardRef<HTMLDivElement, Props>(function ShareCardFull(
  { kind, fullSize = false, outerStyle },
  ref,
) {
  const cfg = CONFIG[kind]
  const previewWidth = 360
  const fullWidth = 1080
  const scale = previewWidth / fullWidth

  // Outer wrapper sizing: when fullSize, exact 1080. When scaled, the
  // visible box is previewWidth (360px) but the inner 1080×1080 is
  // transform: scale()'d to fit.
  const outerW = fullSize ? fullWidth : previewWidth
  const outerH = fullSize ? fullWidth : previewWidth

  return (
    <div
      ref={ref}
      style={{
        width: outerW,
        height: outerH,
        background: "#f5f0eb",
        overflow: "hidden",
        position: "relative",
        ...outerStyle,
      }}
    >
      <div
        data-share-card-inner
        style={{
          width: fullWidth,
          height: fullWidth,
          background: "#f5f0eb",
          fontFamily: "Inter, sans-serif",
          color: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          transform: fullSize ? "none" : `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {/* Card header band */}
        <div
          style={{
            background: "#0a0a0a",
            color: "#f5f0eb",
            padding: "24px 56px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: "-0.5px" }}>
            THE DONOR{" "}
            <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400 }}>Map.</em>
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "2px",
              background: "#fbbf24",
              color: "#0a0a0a",
              padding: "6px 14px",
            }}
          >
            CA GOV 2026
          </div>
        </div>

        {/* Yellow/black striped divider */}
        <div
          style={{
            height: 8,
            background: "repeating-linear-gradient(90deg, #0a0a0a 0 16px, #fbbf24 16px 32px)",
            flexShrink: 0,
          }}
        />

        {/* Body */}
        <div style={{ flex: 1, padding: "40px 56px", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: "0 0 auto", margin: "0 auto 28px", width: "100%", maxWidth: 940 }}>{cfg.graphic}</div>

          <h2
            style={{
              fontFamily: "Inter, sans-serif",
              fontWeight: 900,
              fontSize: 50,
              lineHeight: 1.05,
              letterSpacing: "-1.5px",
              marginBottom: 18,
            }}
          >
            {cfg.headline}
          </h2>

          <p
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontStyle: "italic",
              fontSize: 26,
              lineHeight: 1.3,
              color: "#1a1a1a",
              borderLeft: "4px solid #0a0a0a",
              paddingLeft: 20,
              marginBottom: 24,
            }}
          >
            {cfg.deck}
          </p>

          <div
            style={{
              marginTop: "auto",
              borderTop: "3px solid #0a0a0a",
              padding: "18px 0 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "'Space Mono', monospace",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "1px",
            }}
          >
            <span style={{ color: "#1a1a1a" }}>{cfg.url}</span>
            <span style={{ color: "#666", fontWeight: 400, fontSize: 13 }}>{cfg.footerNote}</span>
          </div>
        </div>
      </div>
    </div>
  )
})

// ─── SVG graphics ───────────────────────────────────────────────────────────

function ThreeBecerrasGraphic() {
  return (
    <svg viewBox="0 0 940 480" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      <defs>
        <marker id="ar1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0a0a0a" />
        </marker>
      </defs>

      {/* Becerra source node */}
      <rect x="380" y="20" width="180" height="84" fill="#0a0a0a" />
      <text x="470" y="58" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="26" fontWeight="900" fill="#fbbf24" letterSpacing="-0.5">BECERRA</text>
      <text x="470" y="82" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fill="#aaa" letterSpacing="1.5">CA GOV 2026</text>

      {/* Audience 1: campaign website (blue) */}
      <rect x="20" y="200" width="270" height="120" fill="#fff" stroke="#1d4ed8" strokeWidth="3" />
      <text x="155" y="226" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#1d4ed8" letterSpacing="2">WEBSITE · MAR 23</text>
      <text x="155" y="266" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#1a1a1a">"deliver single-payer</text>
      <text x="155" y="290" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#1a1a1a">for our state"</text>

      {/* Audience 2: LAist (black) */}
      <rect x="335" y="200" width="270" height="120" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="226" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#0a0a0a" letterSpacing="2">LAIST · APR</text>
      <text x="470" y="266" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#1a1a1a">"this fed govt</text>
      <text x="470" y="290" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#1a1a1a">won't help us"</text>

      {/* Audience 3: doctors / KQED (red) */}
      <rect x="650" y="200" width="270" height="120" fill="#fff" stroke="#e63946" strokeWidth="3" />
      <text x="785" y="226" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#e63946" letterSpacing="2">DOCTORS · KQED</text>
      <text x="785" y="266" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#1a1a1a">"wasn't supportive</text>
      <text x="785" y="290" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#1a1a1a">of single payer"</text>

      {/* Arrows from Becerra to audiences */}
      <line x1="410" y1="104" x2="180" y2="200" stroke="#0a0a0a" strokeWidth="3" markerEnd="url(#ar1)" />
      <line x1="470" y1="104" x2="470" y2="200" stroke="#0a0a0a" strokeWidth="3" markerEnd="url(#ar1)" />
      <line x1="530" y1="104" x2="760" y2="200" stroke="#0a0a0a" strokeWidth="3" markerEnd="url(#ar1)" />

      {/* Receipt band: HEALTHCARE-INDUSTRY MAX DONORS */}
      <rect x="20" y="350" width="900" height="120" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="378" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#0a0a0a" letterSpacing="2">HEALTHCARE-INDUSTRY MAX DONORS · ~$207K · 45% OF TOP 15</text>
      <g fontFamily="Space Mono, monospace" fontSize="16" fill="#0a0a0a">
        <text x="40" y="412">Schaeffer (Anthem founder)</text>
        <text x="445" y="412" textAnchor="end" fontWeight="700">$39,200</text>
        <text x="465" y="412">Molina Healthcare (former CEO)</text>
        <text x="900" y="412" textAnchor="end" fontWeight="700">$49,700</text>
        <text x="40" y="436">AltaMed (largest CA FQHC)</text>
        <text x="445" y="436" textAnchor="end" fontWeight="700">$39,200</text>
        <text x="465" y="436">Cantu (DHR Health co-founder)</text>
        <text x="900" y="436" textAnchor="end" fontWeight="700">$39,200</text>
        <text x="40" y="460">Prime Healthcare (HHS-OIG CIA)</text>
        <text x="445" y="460" textAnchor="end" fontWeight="700">$20,000</text>
        <text x="465" y="460">Ayala household (Adventist+Kaiser)</text>
        <text x="900" y="460" textAnchor="end" fontWeight="700">$50,000</text>
      </g>
    </svg>
  )
}

function NotTheBadGuyGraphic() {
  return (
    <svg viewBox="0 0 940 460" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      {/* Pledge contrast strip at top */}
      <rect x="40" y="20" width="860" height="64" fill="#0a0a0a" />
      <text x="470" y="46" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#fbbf24" letterSpacing="2">TWO RIVALS SIGNED NO-FOSSIL-FUEL-MONEY PLEDGES</text>
      <text x="470" y="70" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="700" fill="#fff">He took the check.</text>

      {/* Timeline base */}
      <line x1="60" y1="220" x2="880" y2="220" stroke="#0a0a0a" strokeWidth="4" />

      {/* Node 1: 2020 AG fracking suit */}
      <circle cx="140" cy="220" r="14" fill="#0a0a0a" />
      <text x="140" y="186" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#0a0a0a" letterSpacing="2">JAN 2020</text>
      <rect x="40" y="244" width="200" height="120" fill="#fff" stroke="#0a0a0a" strokeWidth="2" />
      <text x="140" y="270" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#0a0a0a">AG Becerra</text>
      <text x="140" y="291" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill="#0a0a0a">joins lawsuit</text>
      <text x="140" y="312" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="700" fill="#0a0a0a">against BLM</text>
      <text x="140" y="333" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="13" fill="#666">Central California</text>
      <text x="140" y="350" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="13" fill="#666">fracking decision</text>

      {/* Node 2: BIG yellow center — Chevron max */}
      <rect x="350" y="120" width="240" height="200" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="4" />
      <text x="470" y="156" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#0a0a0a" letterSpacing="2">JUN 16, 2025</text>
      <text x="470" y="218" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="56" fontWeight="900" fill="#0a0a0a" letterSpacing="-2">$39,200</text>
      <text x="470" y="252" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="15" fontWeight="700" fill="#0a0a0a">CHEVRON USA INC.</text>
      <text x="470" y="277" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fill="#0a0a0a">→ Becerra for Governor</text>
      <text x="470" y="302" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#e63946" letterSpacing="1.5">THE LEGAL MAX</text>

      {/* Node 3: April 29 2026 "not the bad guy" */}
      <circle cx="800" cy="220" r="14" fill="#0a0a0a" />
      <text x="800" y="186" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#0a0a0a" letterSpacing="2">APR 29, 2026</text>
      <rect x="700" y="244" width="200" height="120" fill="#fff" stroke="#e63946" strokeWidth="3" />
      <text x="800" y="270" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#0a0a0a">League of CA Cities forum</text>
      <text x="800" y="298" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="15" fill="#0a0a0a">"They're not the</text>
      <text x="800" y="318" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="15" fill="#0a0a0a">bad guy."</text>
      <text x="800" y="350" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#666" letterSpacing="1">Politico CA Climate</text>
    </svg>
  )
}

function ClassTraitorGraphic() {
  return (
    <svg viewBox="0 0 940 460" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      {/* Big total at top */}
      <text x="470" y="76" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="84" fontWeight="900" fill="#0a0a0a" letterSpacing="-3">≈ $31,000,000</text>
      <text x="470" y="112" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="14" fontWeight="700" fill="#e63946" letterSpacing="3">RAISED TO DEFEAT TOM STEYER</text>

      {/* Stacked bar */}
      <g>
        {/* PG&E $10M */}
        <rect x="30" y="160" width="284" height="80" fill="#e63946" stroke="#0a0a0a" strokeWidth="3" />
        <text x="172" y="194" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" fill="#fff">PG&amp;E</text>
        <text x="172" y="222" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="900" fill="#fff">$10M</text>

        {/* Realtors $5M */}
        <rect x="314" y="160" width="142" height="80" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="3" />
        <text x="385" y="194" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="900" fill="#0a0a0a">REALTORS</text>
        <text x="385" y="222" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900" fill="#0a0a0a">$5M</text>

        {/* Chamber $5M */}
        <rect x="456" y="160" width="142" height="80" fill="#1d4ed8" stroke="#0a0a0a" strokeWidth="3" />
        <text x="527" y="194" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="900" fill="#fff">CHAMBER</text>
        <text x="527" y="222" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900" fill="#fff">$5M</text>

        {/* BIA $1M */}
        <rect x="598" y="160" width="29" height="80" fill="#16a34a" stroke="#0a0a0a" strokeWidth="3" />
        <text x="613" y="206" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">$1M</text>

        {/* Other tracked $10M */}
        <rect x="627" y="160" width="284" height="80" fill="#666" stroke="#0a0a0a" strokeWidth="3" />
        <text x="769" y="194" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="16" fontWeight="900" fill="#fff">OTHER TRACKED</text>
        <text x="769" y="222" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900" fill="#fff">≈ $10M</text>
      </g>

      {/* Below bar: source labels */}
      <text x="172" y="262" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#666" letterSpacing="1">UTILITY MONOPOLY</text>
      <text x="385" y="262" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#666" letterSpacing="1">CA REALTORS</text>
      <text x="527" y="262" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#666" letterSpacing="1">CA CHAMBER</text>
      <text x="613" y="262" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fill="#666" letterSpacing="1">BIA</text>
      <text x="769" y="262" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fill="#666" letterSpacing="1">JOBSPAC + COALITION</text>

      {/* Pledge / target row at bottom */}
      <rect x="30" y="312" width="881" height="120" fill="#0a0a0a" />
      <text x="470" y="348" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" fill="#fbbf24">TOM STEYER</text>
      <text x="470" y="378" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#fff">The only billionaire in the race who pledged to refuse</text>
      <text x="470" y="402" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#fff">fossil-fuel and corporate money.</text>
      <text x="470" y="424" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#e63946" letterSpacing="2">FPPC COMMITTEE 1489677 · TOP 10 CONTRIBUTORS LIST · JUNE 2026 PRIMARY</text>
    </svg>
  )
}
