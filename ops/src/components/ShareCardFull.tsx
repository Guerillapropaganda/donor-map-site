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
 * Four kinds correspond to the four live CA Gov 2026 beats:
 *   three-becerras    BECERRA to 3 audiences daisy chain + healthcare donor band
 *   not-the-bad-guy   Jan 2020 AG fracking suit, Jun 2025 Chevron $39,200, Apr 2026 "not the bad guy" timeline
 *   class-traitor     $31M anti-Steyer stacked bar (PG&E, Realtors, Chamber, BIA, coalition)
 *   hilton            Form 700 disclosure spine: HILTON + WHETSTONE arrows into $10B Sierra + receipt band
 */

export type ShareCardKind = "three-becerras" | "not-the-bad-guy" | "class-traitor" | "hilton" | "carace26-map" | "mahan" | "steyer"

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
  hilton: {
    headline: (
      <>
        Steve Hilton wants to{" "}
        <span style={{ background: "#fbbf24", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>regulate AI</span>. He owns{" "}
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>stock in an AI company</span>.
      </>
    ),
    deck:
      "His own sworn financial disclosure shows it. His wife heads communications at the same AI company. Sierra Technology is now valued at $10 billion. He is running to govern the state that regulates AI.",
    url: "thedonormap.org/hilton",
    footerNote: "FPPC Form 700 · TechCrunch · Cal-Access",
    graphic: <HiltonGraphic />,
  },
  "carace26-map": {
    headline: (
      <>
        Same donor.{" "}
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>Both parties</span>. Six times.
      </>
    ),
    deck:
      "Six named donors are funding both a Republican and a Democrat in the 2026 California governor's race. Pechanga's tribal-gaming hedge across Bianco, Becerra, and Porter is the first cross-party tribal hedge in the field. The whole field, eight candidates, 60 named donors, mapped against each other. The lines that cross the field are the donors who are not picking sides.",
    url: "thedonormap.org/carace26-map",
    footerNote: "Cal-Access RCPT_CD · 8 candidates · 60 donors · 15 hedges · 6 cross-party",
    graphic: <RaceMapGraphic />,
  },
  mahan: {
    headline: (
      <>
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>$0</span> from voters.{" "}
        <span style={{ background: "#fbbf24", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>$43,000,000</span> from Sand Hill Road.
      </>
    ),
    deck:
      "Matt Mahan has not raised a dollar in his own candidate committee for the 2026 California governor's race. Every cent on his side flows through Back to Basics California, an outside spending PAC he is legally barred from coordinating with. Sequoia, Y Combinator, Stripe, Coinbase. 61 people wrote almost all of it.",
    url: "thedonormap.org/mahan",
    footerNote: "Cal-Access EXPN_CD · FPPC IE PAC · 61 contributors",
    graphic: <MahanGraphic />,
  },
  steyer: {
    headline: (
      <>
        Tom Steyer wants tighter{" "}
        <span style={{ background: "#fbbf24", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>AI rules</span>. His brother runs the{" "}
        <span style={{ background: "#e63946", color: "#fff", padding: "2px 10px", display: "inline-block", whiteSpace: "nowrap" }}>lobby</span> that writes them.
      </>
    ),
    deck:
      "Jim Steyer founded Common Sense Media in 2003 and has been its CEO for 23 years. Common Sense is the named advocate behind California's three biggest AI bills: AB-1064 vetoed, AB-1709 pending, AB-2023 pending. Tom and Kat Taylor have donated $5,000,000+ to Common Sense per CalMatters May 4 2026 reporting.",
    url: "thedonormap.org/steyer",
    footerNote: "CalMatters · leginfo.legislature.ca.gov · Common Sense 990",
    graphic: <SteyerGraphic />,
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

function HiltonGraphic() {
  return (
    <svg viewBox="0 0 940 460" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      <defs>
        <marker id="hg-arr-bk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0a0a0a" />
        </marker>
        <marker id="hg-arr-rd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#e63946" />
        </marker>
        <marker id="hg-arr-yl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
        </marker>
      </defs>

      {/* Top header band */}
      <text x="470" y="22" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#666" letterSpacing="2">FORM 700 · CANDIDATE FILING · MARCH 6, 2026</text>

      {/* Top-left: Hilton box */}
      <rect x="20" y="50" width="240" height="74" fill="#0a0a0a" />
      <text x="140" y="80" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" letterSpacing="-0.5" fill="#fff">STEVE HILTON</text>
      <text x="140" y="100" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="#fbbf24">SCHEDULE A-1 FILER</text>
      <text x="140" y="116" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#aaa">CA GOV CANDIDATE (R)</text>

      {/* Top-right: Whetstone box */}
      <rect x="680" y="50" width="240" height="74" fill="#0a0a0a" />
      <text x="800" y="80" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" letterSpacing="-0.5" fill="#fff">RACHEL WHETSTONE</text>
      <text x="800" y="100" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="#fbbf24">SCHEDULE C FILER</text>
      <text x="800" y="116" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#aaa">SPOUSE · COMMS HEAD</text>

      {/* Marriage dotted connector */}
      <line x1="260" y1="87" x2="680" y2="87" stroke="#666" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="470" y="80" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="14" fill="#666">married · the household</text>

      {/* Hilton red arrow down to Sierra */}
      <line x1="140" y1="124" x2="380" y2="220" stroke="#e63946" strokeWidth="3" markerEnd="url(#hg-arr-rd)" />
      <text x="60" y="180" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#e63946">OWNS STOCK</text>
      <text x="60" y="198" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="400" fill="#e63946">FMV Over $1,000,000</text>

      {/* Whetstone yellow arrow down to Sierra */}
      <line x1="800" y1="124" x2="560" y2="220" stroke="#fbbf24" strokeWidth="3" markerEnd="url(#hg-arr-yl)" />
      <text x="780" y="180" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#0a0a0a">DRAWS INCOME</text>
      <text x="780" y="198" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="400" fill="#666">Over $100,000 / year</text>

      {/* Center: Sierra box */}
      <rect x="350" y="220" width="240" height="100" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="252" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="30" fontWeight="900" letterSpacing="-1" fill="#0a0a0a">SIERRA</text>
      <text x="470" y="272" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="#666">SIERRA TECHNOLOGIES, INC.</text>
      <text x="470" y="292" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="900" fill="#0a0a0a">$10 BILLION</text>
      <text x="470" y="308" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#666">VALUATION · SEP 2025</text>

      {/* Stinger callout below Sierra */}
      <text x="470" y="346" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="18" fill="#0a0a0a">Two of three Form 700 lines point at the same company.</text>

      {/* Receipt band at bottom: 3 disclosure rows */}
      <rect x="20" y="362" width="900" height="84" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="382" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#0a0a0a" letterSpacing="2">FILED UNDER PENALTY OF PERJURY · FPPC FORM 700</text>
      <g fontFamily="Space Mono, monospace" fontSize="14" fill="#0a0a0a">
        <text x="40" y="404">Sched A-1 · Hilton · Sierra Technologies, Inc.</text>
        <text x="900" y="404" textAnchor="end" fontWeight="700">FMV Over $1,000,000</text>
        <text x="40" y="422">Sched C · Whetstone · Sierra Technologies, Inc.</text>
        <text x="900" y="422" textAnchor="end" fontWeight="700">Income Over $100,000</text>
        <text x="40" y="440">Sched C · Hilton · Fox News Network LLC</text>
        <text x="900" y="440" textAnchor="end" fontWeight="700">Income $10,001-$100,000</text>
      </g>
    </svg>
  )
}

function RaceMapGraphic() {
  // U-shape candidate ring with 5 cross-party hedge donors in the center.
  // Red lines mark donors funding both a Republican AND a Democrat.
  // Receipt band lists top 4 hedge bets by combined dollar total.
  const candR = "#e63946"
  const candD = "#1d4ed8"
  return (
    <svg viewBox="0 0 940 460" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      <text x="470" y="18" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#666" letterSpacing="2">CA GOV 2026 · WHOLE-FIELD MONEY MAP · CROSS-PARTY HEDGES</text>

      {/* ─── Top row of candidates (R · R · D · D) ─── */}
      <rect x="20" y="40" width="160" height="44" fill="#0a0a0a" stroke={candR} strokeWidth="3" />
      <text x="100" y="62" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">HILTON</text>
      <text x="100" y="76" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#fca5a5">R · $7.7M</text>

      <rect x="200" y="40" width="160" height="44" fill="#0a0a0a" stroke={candR} strokeWidth="3" />
      <text x="280" y="62" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">BIANCO</text>
      <text x="280" y="76" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#fca5a5">R · $4.5M</text>

      <rect x="380" y="40" width="160" height="44" fill="#0a0a0a" stroke={candD} strokeWidth="3" />
      <text x="460" y="62" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">BECERRA</text>
      <text x="460" y="76" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#93c5fd">D · $5.8M</text>

      <rect x="560" y="40" width="160" height="44" fill="#0a0a0a" stroke={candD} strokeWidth="3" />
      <text x="640" y="62" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">STEYER</text>
      <text x="640" y="76" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#93c5fd">D · $14M</text>

      <rect x="740" y="40" width="160" height="44" fill="#0a0a0a" stroke={candD} strokeWidth="3" />
      <text x="820" y="62" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">PORTER</text>
      <text x="820" y="76" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#93c5fd">D · $12M</text>

      {/* ─── Bottom row of candidates (D · D · D) ─── */}
      <rect x="20" y="260" width="160" height="44" fill="#0a0a0a" stroke={candD} strokeWidth="3" />
      <text x="100" y="282" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#fff">THURMOND</text>
      <text x="100" y="296" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#93c5fd">D · $327K</text>

      <rect x="280" y="260" width="180" height="44" fill="#0a0a0a" stroke={candD} strokeWidth="3" />
      <text x="370" y="282" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">MAHAN</text>
      <text x="370" y="296" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#93c5fd">D · $43M IE</text>

      <rect x="500" y="260" width="200" height="44" fill="#0a0a0a" stroke={candD} strokeWidth="3" />
      <text x="600" y="282" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="900" fill="#fff">VILLARAIGOSA</text>
      <text x="600" y="296" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" letterSpacing="1.5" fill="#93c5fd">D · $6.1M</text>

      <rect x="740" y="260" width="160" height="44" fill="none" />

      {/* ─── Center label ─── */}
      <text x="470" y="135" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="3" fill="#fbbf24">DONORS WHO CROSS</text>
      <text x="470" y="150" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="3" fill="#fbbf24">CANDIDATE LINES</text>

      {/* ─── 5 cross-party hedge donor circles ─── */}
      {/* Brin · Hilton + Mahan */}
      <line x1="100" y1="84" x2="335" y2="180" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <line x1="335" y1="180" x2="370" y2="260" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="335" cy="180" r="20" fill="#fbbf24" stroke="#e63946" strokeWidth="2.5" />
      <text x="335" y="184" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="900" fill="#0a0a0a">BRIN</text>

      {/* Larsen · Hilton + Porter */}
      <line x1="100" y1="84" x2="500" y2="200" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <line x1="500" y1="200" x2="820" y2="84" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="500" cy="200" r="20" fill="#f97316" stroke="#e63946" strokeWidth="2.5" />
      <text x="500" y="204" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="900" fill="#0a0a0a">LARSEN</text>

      {/* Lonsdale · Hilton + Mahan */}
      <line x1="100" y1="84" x2="410" y2="155" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <line x1="410" y1="155" x2="370" y2="260" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="410" cy="155" r="17" fill="#fbbf24" stroke="#e63946" strokeWidth="2" />
      <text x="410" y="158" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900" fill="#0a0a0a">LONSDALE</text>

      {/* Highland · Bianco + Villaraigosa */}
      <line x1="280" y1="84" x2="580" y2="200" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <line x1="580" y1="200" x2="600" y2="260" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="580" cy="200" r="20" fill="#16a34a" stroke="#e63946" strokeWidth="2.5" />
      <text x="580" y="204" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="900" fill="#fff">HIGHLAND</text>

      {/* PORAC · Bianco + Villaraigosa */}
      <line x1="280" y1="84" x2="660" y2="180" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <line x1="660" y1="180" x2="600" y2="260" stroke="#e63946" strokeWidth="2" strokeDasharray="6 3" />
      <circle cx="660" cy="180" r="20" fill="#1e3a8a" stroke="#e63946" strokeWidth="2.5" />
      <text x="660" y="184" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="900" fill="#fff">PORAC</text>

      {/* Stinger */}
      <text x="470" y="338" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="18" fill="#0a0a0a">Six donors. Both parties. Same race.</text>

      {/* ─── Receipt band ─── */}
      <rect x="20" y="356" width="900" height="92" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="376" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#0a0a0a" letterSpacing="2">CROSS-PARTY HEDGE BETS · CAL-ACCESS PRIMARY-SOURCE VERIFIED</text>
      <g fontFamily="Space Mono, monospace" fontSize="13" fill="#0a0a0a">
        <text x="40" y="396">Brin (Google) · Hilton (R) + Mahan (D)</text>
        <text x="900" y="396" textAnchor="end" fontWeight="700">$1,040,000</text>
        <text x="40" y="414">PORAC PAC · Bianco (R) + Villaraigosa (D)</text>
        <text x="900" y="414" textAnchor="end" fontWeight="700">$117,600</text>
        <text x="40" y="432">Highland Fairview · Bianco (R) + Villaraigosa (D)</text>
        <text x="900" y="432" textAnchor="end" fontWeight="700">$112,000</text>
        <text x="40" y="450" fontStyle="italic">+ Pechanga (3-way) · + Larsen · + Lonsdale</text>
        <text x="900" y="450" textAnchor="end" fontWeight="700">+ $251,000</text>
      </g>
    </svg>
  )
}

function MahanGraphic() {
  // Side-by-side panels: $0 candidate committee · firewall · $43M IE PAC.
  // Below: top 5 IE PAC funders ranked by amount.
  return (
    <svg viewBox="0 0 940 460" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      <defs>
        <pattern id="mh-stripes" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="#fbbf24" />
          <rect width="7" height="14" fill="#0a0a0a" />
        </pattern>
      </defs>

      <text x="470" y="18" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#666" letterSpacing="2">MATT MAHAN · CA GOV 2026 · CANDIDATE-CMTE vs IE PAC</text>

      {/* ─── Left panel: $0 from voters ─── */}
      <rect x="20" y="40" width="380" height="180" fill="#0a0a0a" />
      <text x="210" y="80" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="2" fill="#aaa">CANDIDATE-CONTROLLED CMTE</text>
      <text x="210" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="120" fontWeight="900" fill="#e63946" letterSpacing="-4">$0</text>
      <text x="210" y="190" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#fbbf24" letterSpacing="2">RAISED FROM VOTERS</text>
      <text x="210" y="208" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="400" fill="#aaa" letterSpacing="1.5">no candidate committee filed</text>

      {/* ─── Center firewall ─── */}
      <rect x="404" y="40" width="132" height="180" fill="url(#mh-stripes)" />
      <rect x="412" y="80" width="116" height="100" fill="#f5f0eb" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="118" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#e63946" letterSpacing="2">FIREWALL</text>
      <text x="470" y="138" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#0a0a0a">CANNOT</text>
      <text x="470" y="156" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#0a0a0a">COORDINATE</text>
      <text x="470" y="172" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" fill="#666" letterSpacing="1">BY LAW</text>

      {/* ─── Right panel: $43M IE PAC ─── */}
      <rect x="540" y="40" width="380" height="180" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="3" />
      <text x="730" y="80" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="2" fill="#0a0a0a">BACK TO BASICS CALIFORNIA · IE PAC</text>
      <text x="730" y="160" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="98" fontWeight="900" fill="#0a0a0a" letterSpacing="-4">$43M</text>
      <text x="730" y="190" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#0a0a0a" letterSpacing="2">FROM 61 PEOPLE</text>
      <text x="730" y="208" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="400" fill="#444" letterSpacing="1.5">Sequoia · Y Combinator · Stripe · Coinbase</text>

      {/* ─── Stinger ─── */}
      <text x="470" y="252" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="20" fill="#0a0a0a">The donor base is the candidate.</text>

      {/* ─── Receipt band: top 5 IE PAC funders ─── */}
      <rect x="20" y="276" width="900" height="172" fill="#0a0a0a" />
      <text x="470" y="300" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="12" fontWeight="700" fill="#fbbf24" letterSpacing="2">BACK TO BASICS CALIFORNIA · TOP 5 CONTRIBUTORS</text>
      <g fontFamily="Space Mono, monospace" fontSize="14" fill="#fff">
        <text x="40" y="328">Michael Moritz · Sequoia Capital chairman</text>
        <text x="900" y="328" textAnchor="end" fontWeight="700" fill="#fbbf24">$2,000,000</text>
        <text x="40" y="354">Michael Seibel · Y Combinator partner</text>
        <text x="900" y="354" textAnchor="end" fontWeight="700" fill="#fbbf24">$1,000,000</text>
        <text x="40" y="380">Ashley Merrill · Lunya / Merrill household</text>
        <text x="900" y="380" textAnchor="end" fontWeight="700" fill="#fbbf24">$1,000,000</text>
        <text x="40" y="406">Patrick Collison · Stripe CEO</text>
        <text x="900" y="406" textAnchor="end" fontWeight="700" fill="#fbbf24">$990,000</text>
        <text x="40" y="432">Brian Armstrong · Coinbase CEO</text>
        <text x="900" y="432" textAnchor="end" fontWeight="700" fill="#fbbf24">$500,000</text>
      </g>
    </svg>
  )
}

function SteyerGraphic() {
  // Mirror of Hilton: TOM + JIM (brothers connector) → COMMON SENSE MEDIA box,
  // bottom row 3 bills (AB-1064 vetoed, AB-1709 + AB-2023 pending).
  return (
    <svg viewBox="0 0 940 460" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "auto" }}>
      <defs>
        <marker id="sg-arr-bl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#1d4ed8" />
        </marker>
        <marker id="sg-arr-rd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#e63946" />
        </marker>
      </defs>

      <text x="470" y="18" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#666" letterSpacing="2">CALMATTERS · LEGINFO · CA GOV 2026 · BROTHER + AI LOBBY</text>

      {/* Top-left: Tom Steyer box */}
      <rect x="20" y="40" width="240" height="74" fill="#0a0a0a" stroke="#1d4ed8" strokeWidth="3" />
      <text x="140" y="70" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="900" letterSpacing="-0.5" fill="#fff">TOM STEYER</text>
      <text x="140" y="90" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="#fbbf24">CA GOV CANDIDATE (D)</text>
      <text x="140" y="106" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#aaa">RUNNING ON TIGHTER AI RULES</text>

      {/* Top-right: Jim Steyer box */}
      <rect x="680" y="40" width="240" height="74" fill="#0a0a0a" stroke="#1d4ed8" strokeWidth="3" />
      <text x="800" y="70" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="900" letterSpacing="-0.5" fill="#fff">JIM STEYER</text>
      <text x="800" y="90" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="1.5" fill="#fbbf24">FOUNDER + CEO · 23 YEARS</text>
      <text x="800" y="106" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#aaa">COMMON SENSE MEDIA</text>

      {/* Brothers dotted connector */}
      <line x1="260" y1="77" x2="680" y2="77" stroke="#666" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="470" y="70" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="14" fill="#666">brothers · same household 1957</text>

      {/* Tom blue arrow down to Common Sense */}
      <line x1="140" y1="114" x2="380" y2="180" stroke="#1d4ed8" strokeWidth="3" markerEnd="url(#sg-arr-bl)" />
      <text x="60" y="146" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#1d4ed8">DONATED</text>
      <text x="60" y="164" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="400" fill="#1d4ed8">$5,000,000+ family</text>

      {/* Jim red arrow down to Common Sense */}
      <line x1="800" y1="114" x2="560" y2="180" stroke="#e63946" strokeWidth="3" markerEnd="url(#sg-arr-rd)" />
      <text x="780" y="146" fontFamily="Space Mono, monospace" fontSize="13" fontWeight="700" fill="#e63946">RUNS</text>
      <text x="780" y="164" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="400" fill="#e63946">since 2003 · CEO</text>

      {/* Center: Common Sense box */}
      <rect x="350" y="180" width="240" height="86" fill="#fff" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="208" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" letterSpacing="-0.5" fill="#0a0a0a">COMMON SENSE</text>
      <text x="470" y="228" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="22" fontWeight="900" letterSpacing="-0.5" fill="#0a0a0a">MEDIA</text>
      <text x="470" y="248" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="1.5" fill="#666">NAMED ADVOCATE · 3 CA AI BILLS</text>

      {/* Stinger */}
      <text x="470" y="290" textAnchor="middle" fontFamily="Instrument Serif, serif" fontStyle="italic" fontSize="17" fill="#0a0a0a">The bills the brother's lobby pushes land on the brother's desk.</text>

      {/* ─── Three bills receipt band ─── */}
      <rect x="20" y="306" width="900" height="142" fill="#fbbf24" stroke="#0a0a0a" strokeWidth="3" />
      <text x="470" y="328" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="11" fontWeight="700" fill="#0a0a0a" letterSpacing="2">CALIFORNIA AI BILLS · COMMON SENSE-ADVOCATED · 2025-2026 SESSION</text>

      {/* AB-1064 vetoed (red border, full width row) */}
      <rect x="40" y="346" width="280" height="84" fill="#fef2f2" stroke="#e63946" strokeWidth="2.5" />
      <text x="180" y="368" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900" fill="#0a0a0a">AB-1064</text>
      <text x="180" y="386" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" fill="#0a0a0a" letterSpacing="1">LEAD FOR KIDS ACT</text>
      <text x="180" y="408" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#e63946">VETOED</text>
      <text x="180" y="424" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="400" fill="#666">Newsom · Sept 2025</text>

      {/* AB-1709 pending */}
      <rect x="334" y="346" width="280" height="84" fill="#fff" stroke="#0a0a0a" strokeWidth="2" />
      <text x="474" y="368" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900" fill="#0a0a0a">AB-1709</text>
      <text x="474" y="386" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" fill="#0a0a0a" letterSpacing="1">PLATFORM AGE LIMIT &lt;16</text>
      <text x="474" y="408" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#1d4ed8">PENDING</text>
      <text x="474" y="424" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="400" fill="#666">Assembly · 2026</text>

      {/* AB-2023 pending */}
      <rect x="628" y="346" width="280" height="84" fill="#fff" stroke="#0a0a0a" strokeWidth="2" />
      <text x="768" y="368" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="900" fill="#0a0a0a">AB-2023</text>
      <text x="768" y="386" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="700" fill="#0a0a0a" letterSpacing="1">CHATBOT SAFETY + AUDITS</text>
      <text x="768" y="408" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="13" fontWeight="900" fill="#1d4ed8">PENDING</text>
      <text x="768" y="424" textAnchor="middle" fontFamily="Space Mono, monospace" fontSize="9" fontWeight="400" fill="#666">Assembly · 2026</text>
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
