"use client"

import { useState, useEffect } from "react"
import type { Profile } from "@/lib/vault"
import { typeColor } from "@/lib/vault"

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

      {selected ? (
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
