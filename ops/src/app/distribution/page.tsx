"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Profile } from "@/lib/vault"
import { typeColor } from "@/lib/vault"
import { CardReceipt } from "@/components/CardReceipt"
import { CardDossier } from "@/components/CardDossier"
import { CardLeak } from "@/components/CardLeak"
import { CardWeb } from "@/components/cards/CardWeb"
import { CardBothSides } from "@/components/cards/CardBothSides"
import { CardContradiction } from "@/components/cards/CardContradiction"
import { CardPipeline } from "@/components/cards/CardPipeline"
import { CardHeadline } from "@/components/cards/CardHeadline"
import { CardWire } from "@/components/cards/CardWire"
import { CardRedacted } from "@/components/cards/CardRedacted"
import { CardTicker } from "@/components/cards/CardTicker"
import { CardMirror } from "@/components/cards/CardMirror"

interface ShareTemplate {
  id: string
  label: string
  icon: string
  format: (profile: Profile, siteUrl: string) => string
  maxLength?: number
}

const SITE_URL = "https://thedonormap.org"

const TEMPLATES: ShareTemplate[] = [
  {
    id: "twitter",
    label: "X / Twitter",
    icon: "X",
    maxLength: 280,
    format: (p, url) => {
      const slug = p.path.replace("content/", "").replace(/ /g, "-").replace(".md", "")
      const link = `${url}/${slug}`
      if (p.type === "politician") {
        return `${p.title} (${p.party === "Democrat" ? "D" : p.party === "Republican" ? "R" : "I"}-${p.state || ""})\n\nTotal raised: ${p.totalRaised || "See profile"}\n\nFollow the money: ${link}\n\n#DonorMap #FollowTheMoney`
      }
      return `${p.title}\n\n${p.sector ? `Sector: ${p.sector}` : p.type}\n\nFollow the money: ${link}\n\n#DonorMap #FollowTheMoney`
    },
  },
  {
    id: "bluesky",
    label: "Bluesky",
    icon: "B",
    maxLength: 300,
    format: (p, url) => {
      const slug = p.path.replace("content/", "").replace(/ /g, "-").replace(".md", "")
      return `${p.title} — follow the money.\n\n${url}/${slug}\n\n#DonorMap`
    },
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "in",
    format: (p, url) => {
      const slug = p.path.replace("content/", "").replace(/ /g, "-").replace(".md", "")
      return `The Donor Map: ${p.title}\n\nAn open-source political donor intelligence database tracking how money flows between donors and politicians across both parties.\n\n${url}/${slug}\n\n#PoliticalTransparency #FollowTheMoney #OpenData`
    },
  },
  {
    id: "email",
    label: "Email",
    icon: "@",
    format: (p, url) => {
      const slug = p.path.replace("content/", "").replace(/ /g, "-").replace(".md", "")
      return `Subject: The Donor Map — ${p.title}\n\nHi,\n\nI wanted to share this profile from The Donor Map, an open-source political donor intelligence database:\n\n${p.title}\n${url}/${slug}\n\nThe Donor Map tracks how money flows between donors and politicians across both parties.\n\nBest,\n[Your name]`
    },
  },
  {
    id: "markdown",
    label: "Markdown",
    icon: "MD",
    format: (p, url) => {
      const slug = p.path.replace("content/", "").replace(/ /g, "-").replace(".md", "")
      return `[${p.title} — The Donor Map](${url}/${slug})`
    },
  },
]

export default function DistributionPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTemplate, setActiveTemplate] = useState<string>("twitter")
  const [copied, setCopied] = useState(false)
  const [customText, setCustomText] = useState("")
  const [mode, setMode] = useState<"text" | "visual">("text")
  const [cardTemplate, setCardTemplate] = useState<string>("receipt")
  const [cardSize, setCardSize] = useState<string>("twitter")
  const [cardHeadline, setCardHeadline] = useState("")
  const [cardSubtext, setCardSubtext] = useState("")
  const [downloading, setDownloading] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const CARD_SIZES: Record<string, { w: number; h: number; label: string }> = {
    twitter: { w: 1200, h: 675, label: "X / Twitter" },
    instagram: { w: 1080, h: 1080, label: "Instagram Post" },
    instagramStory: { w: 1080, h: 1920, label: "IG/TikTok Story" },
    facebook: { w: 1200, h: 630, label: "Facebook" },
    threads: { w: 1080, h: 1080, label: "Threads" },
    tiktok: { w: 1080, h: 1920, label: "TikTok" },
    reddit: { w: 1200, h: 628, label: "Reddit" },
    bluesky: { w: 1200, h: 675, label: "Bluesky" },
    linkedin: { w: 1200, h: 627, label: "LinkedIn" },
  }

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const el = cardRef.current
      const size = CARD_SIZES[cardSize]

      // Clone the card element into a hidden full-size container for clean capture
      const offscreen = document.createElement("div")
      offscreen.style.position = "fixed"
      offscreen.style.left = "-9999px"
      offscreen.style.top = "0"
      offscreen.style.width = size.w + "px"
      offscreen.style.height = size.h + "px"
      offscreen.style.overflow = "hidden"
      offscreen.style.zIndex = "-1"

      const clone = el.cloneNode(true) as HTMLElement
      clone.style.transform = "none"
      clone.style.transformOrigin = "top left"
      clone.style.width = size.w + "px"
      clone.style.height = size.h + "px"
      offscreen.appendChild(clone)
      document.body.appendChild(offscreen)

      // Wait for fonts/images to settle
      await new Promise(r => setTimeout(r, 200))

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        width: size.w,
        height: size.h,
        windowWidth: size.w,
        windowHeight: size.h,
      })

      document.body.removeChild(offscreen)

      const link = document.createElement("a")
      const profileName = selected?.title.replace(/ Master Profile$/, "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "card"
      link.download = `donormap-${profileName}-${cardTemplate}-${cardSize}.png`
      link.href = canvas.toDataURL("image/png")
      link.style.display = "none"
      document.body.appendChild(link)
      link.click()
      setTimeout(() => document.body.removeChild(link), 100)
    } catch (e) {
      console.error("Card download failed:", e)
      alert("Download failed: " + (e as Error).message)
    }
    setDownloading(false)
  }, [selected, cardTemplate, cardSize])

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((d) => { setProfiles(d.profiles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const searchResults = search.length >= 2
    ? profiles.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : []

  const template = TEMPLATES.find((t) => t.id === activeTemplate)!
  const generated = selected ? template.format(selected, SITE_URL) : ""

  const displayText = customText || generated

  const copy = () => {
    navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectProfile = (p: Profile) => {
    setSelected(p)
    setSearch(p.title)
    setCustomText("")
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Distribution</h1>
        <p className="text-[10px] text-[var(--color-text-dim)]">
          Generate shareable content from profiles for social media and outreach
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("text")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === "text"
              ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30"
              : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          }`}
        >
          Text Posts
        </button>
        <button
          onClick={() => setMode("visual")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === "visual"
              ? "bg-[var(--color-amber)]/15 text-[var(--color-amber)] border border-[var(--color-amber)]/30"
              : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
          }`}
        >
          Visual Cards
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search for a profile to share..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value) { setSelected(null); setCustomText("") }
          }}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
        />
        {searchResults.length > 0 && !selected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.path}
                onClick={() => selectProfile(p)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] last:border-0"
              >
                <span className="text-xs text-[var(--color-text)] flex-1">{p.title}</span>
                <span className="text-[8px]" style={{ color: typeColor(p.type) }}>{p.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && mode === "visual" ? (
        <div>
          {/* Card template + size pickers */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex flex-wrap gap-1.5">
              {([
                { id: "receipt", label: "Receipt" },
                { id: "dossier", label: "Dossier" },
                { id: "leak", label: "Leak" },
                { id: "headline", label: "Headline" },
                { id: "wire", label: "Wire" },
                { id: "redacted", label: "Redacted" },
                { id: "web", label: "Web" },
                { id: "pipeline", label: "Pipeline" },
                { id: "contradiction", label: "Contradiction" },
                { id: "bothsides", label: "Both Sides" },
                { id: "ticker", label: "Ticker" },
                { id: "mirror", label: "Mirror" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCardTemplate(t.id)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    cardTemplate === t.id
                      ? "bg-[var(--color-amber)]/15 text-[var(--color-amber)] border border-[var(--color-amber)]/30"
                      : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CARD_SIZES).map(([key, size]) => (
                <button
                  key={key}
                  onClick={() => setCardSize(key)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] transition-all ${
                    cardSize === key
                      ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30"
                      : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          {/* Edit fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1 block">Headline (override)</label>
              <input
                type="text"
                value={cardHeadline}
                onChange={(e) => setCardHeadline(e.target.value)}
                placeholder="Auto-populated from profile..."
                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-1 block">Subtext (override)</label>
              <input
                type="text"
                value={cardSubtext}
                onChange={(e) => setCardSubtext(e.target.value)}
                placeholder="Auto-populated from profile..."
                className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-6 mb-4">
            <div className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Live Preview</div>
            <div
              style={{
                width: "100%",
                maxWidth: 700,
                margin: "0 auto",
                aspectRatio: `${CARD_SIZES[cardSize].w} / ${CARD_SIZES[cardSize].h}`,
                overflow: "hidden",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                ref={cardRef}
                style={{
                  width: CARD_SIZES[cardSize].w,
                  height: CARD_SIZES[cardSize].h,
                  transform: `scale(${Math.min(700 / CARD_SIZES[cardSize].w, 1)})`,
                  transformOrigin: "top left",
                }}
              >
                {(() => {
                  const props = {
                    profile: selected,
                    headline: cardHeadline || undefined,
                    subtext: cardSubtext || undefined,
                    width: CARD_SIZES[cardSize].w,
                    height: CARD_SIZES[cardSize].h,
                  }
                  switch (cardTemplate) {
                    case "receipt": return <CardReceipt {...props} />
                    case "dossier": return <CardDossier {...props} />
                    case "leak": return <CardLeak {...props} />
                    case "headline": return <CardHeadline {...props} />
                    case "wire": return <CardWire {...props} />
                    case "redacted": return <CardRedacted {...props} />
                    case "web": return <CardWeb {...props} />
                    case "pipeline": return <CardPipeline {...props} />
                    case "contradiction": return <CardContradiction {...props} />
                    case "bothsides": return <CardBothSides {...props} />
                    case "ticker": return <CardTicker {...props} />
                    case "mirror": return <CardMirror {...props} />
                    default: return <CardReceipt {...props} />
                  }
                })()}
              </div>
            </div>
          </div>

          {/* Download button */}
          <div className="flex gap-3">
            <button
              onClick={downloadCard}
              disabled={downloading}
              className="flex items-center gap-2 bg-[var(--color-amber)]/15 text-[var(--color-amber)] border border-[var(--color-amber)]/30 rounded-lg px-6 py-3 text-xs font-bold hover:bg-[var(--color-amber)]/25 transition-colors disabled:opacity-50"
            >
              {downloading ? "Generating..." : "Download PNG"}
            </button>
            <button
              onClick={() => { setCardHeadline(""); setCardSubtext("") }}
              className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text)] px-3"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      ) : selected ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Platform picker + preview */}
          <div className="xl:col-span-2">
            {/* Platform tabs */}
            <div className="flex gap-1.5 mb-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTemplate(t.id); setCustomText("") }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                    activeTemplate === t.id
                      ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30"
                      : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  }`}
                >
                  <span className="font-bold text-[10px]">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Generated text */}
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  {template.label} Post
                </span>
                {template.maxLength && (
                  <span className={`text-[10px] ${displayText.length > template.maxLength ? "text-[var(--color-red)]" : "text-[var(--color-text-dim)]"}`}>
                    {displayText.length}/{template.maxLength}
                  </span>
                )}
              </div>

              <textarea
                value={displayText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)] min-h-[200px] resize-y font-mono leading-relaxed"
              />

              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={copy}
                  className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors"
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </button>
                {customText && (
                  <button
                    onClick={() => setCustomText("")}
                    className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  >
                    Reset to template
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right: Profile info */}
          <div>
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${typeColor(selected.type)}15`, color: typeColor(selected.type) }}
                >
                  {selected.title[0]}
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--color-text)]">{selected.title}</p>
                  <p className="text-[9px]" style={{ color: typeColor(selected.type) }}>{selected.type}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-[10px]">
                {selected.party && <InfoRow label="Party" value={selected.party} />}
                {selected.state && <InfoRow label="State" value={selected.state} />}
                {selected.sector && <InfoRow label="Sector" value={selected.sector} />}
                {selected.totalRaised && <InfoRow label="Total Raised" value={selected.totalRaised} />}
                {selected.lobbyingSpend && <InfoRow label="Lobbying" value={selected.lobbyingSpend} />}
                <InfoRow label="Readiness" value={selected.contentReadiness} />
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <a
                  href={`${SITE_URL}/${selected.path.replace("content/", "").replace(/ /g, "-").replace(".md", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-[var(--color-steel)] hover:underline"
                >
                  View on thedonormap.org
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <svg width={32} height={32} className="mx-auto mb-3 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <p className="text-xs text-[var(--color-text-dim)]">Search for a profile to generate shareable content</p>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">Templates for X/Twitter, Bluesky, LinkedIn, Email, and Markdown</p>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-text-dim)]">{label}</span>
      <span className="text-[var(--color-text)]">{value}</span>
    </div>
  )
}
