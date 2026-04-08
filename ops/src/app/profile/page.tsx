"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { readinessColor, typeColor } from "@/lib/vault"

interface ProfileData {
  title: string
  path: string
  type: string
  party?: string
  chamber?: string
  state?: string
  sector?: string
  contentReadiness: string
  sourceTier?: number
  lastUpdated?: string
  lastEnriched?: string
  totalRaised?: string
  lobbyingSpend?: string
  related?: string
  opposes?: string
  donors?: string
}

interface SourceData {
  total: number; tier1: number; tier2: number; tier3: number; tier4: number; broken: number
}

interface UrlData {
  url: string; label: string; tier?: number; archived: boolean; triageStatus?: "verified" | "broken" | "unsure" | "unchecked"; triageNote?: string
}

interface Connection {
  source: string; target: string; relationshipType: "related" | "donors" | "opposes"
}

const READINESS_STEPS = ["raw", "draft", "developed", "verified", "ready"]
const REL_COLORS = { related: "#5b8dce", donors: "#22c55e", opposes: "#ef4444" }
const REL_LABELS = { related: "Related", donors: "Funded By", opposes: "Opposes" }

function parseWikilinks(value: string): string[] {
  if (!value) return []
  const matches = value.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map((m) => {
    const inner = m.replace("[[", "").replace("]]", "")
    return inner.split("|").pop() || inner
  })
}

export default function ProfilePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const profilePath = searchParams.get("path")

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [sources, setSources] = useState<SourceData | null>(null)
  const [urls, setUrls] = useState<UrlData[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"overview" | "sources" | "connections" | "urls">("overview")
  const [urlOverrides, setUrlOverrides] = useState<Record<number, "ok" | "broken" | "unsure">>({})
  const [urlNotes, setUrlNotes] = useState<Record<number, string>>({})
  const [urlSaving, setUrlSaving] = useState(false)
  const [urlSaveMsg, setUrlSaveMsg] = useState("")
  const [urlChecking, setUrlChecking] = useState(false)
  const [urlCheckProgress, setUrlCheckProgress] = useState("")
  const [urlFilter, setUrlFilter] = useState<"all" | "unchecked" | "verified" | "broken" | "unsure">("all")
  const [expandedUrl, setExpandedUrl] = useState<number | null>(null)

  // Browse state (when no profile selected)
  const [browseSearch, setBrowseSearch] = useState("")
  const [allProfiles, setAllProfiles] = useState<{ title: string; path: string; type: string; contentReadiness: string; party?: string; state?: string; sector?: string }[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)

  useEffect(() => {
    if (!profilePath) return
    setLoading(true)

    Promise.all([
      fetch(`/api/profile?path=${encodeURIComponent(profilePath)}`).then((r) => r.json()),
      fetch("/api/connections").then((r) => r.json()),
    ])
      .then(([profileData, connData]) => {
        if (profileData.profile) {
          setProfile(profileData.profile)
          setSources(profileData.sources || null)
          setUrls(profileData.urls || [])
        }
        // Find connections for this profile
        const title = profileData.profile?.title || ""
        const profileConns = (connData.connections || []).filter(
          (c: Connection) => c.source === title || c.target === title
        )
        setConnections(profileConns)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [profilePath])

  // Load profiles for browsing when no profile selected
  useEffect(() => {
    if (!profilePath && allProfiles.length === 0) {
      setBrowseLoading(true)
      fetch("/api/vault").then((r) => r.json()).then((data) => {
        setAllProfiles(data.profiles || [])
        setBrowseLoading(false)
      }).catch(() => setBrowseLoading(false))
    }
  }, [profilePath, allProfiles.length])

  async function saveUrlTriage() {
    if (Object.keys(urlOverrides).length === 0 || !profile) return
    setUrlSaving(true)
    setUrlSaveMsg("")
    const changes = Object.entries(urlOverrides).map(([idx, status]) => {
      const u = urls[Number(idx)]
      return { url: u.url, label: u.label, tier: u.tier, profilePath: profilePath!, profile: profile.title, newStatus: status, note: urlNotes[Number(idx)] || "" }
    })
    try {
      const res = await fetch("/api/urls/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes }) })
      const data = await res.json()
      if (data.success) {
        setUrlSaveMsg(`Saved: ${data.summary.archived} archived, ${data.summary.confirmed} confirmed, ${data.summary.flagged} flagged`)
        setUrlOverrides({})
        setUrlNotes({})
        // Refresh URLs
        const profileData = await fetch(`/api/profile?path=${encodeURIComponent(profilePath!)}`).then(r => r.json())
        setUrls(profileData.urls || [])
      } else {
        setUrlSaveMsg("Error saving")
      }
    } catch { setUrlSaveMsg("Error saving") }
    setUrlSaving(false)
  }

  async function autoCheckUrls() {
    const unchecked = urls.map((u, i) => ({ u, i })).filter(({ u }) => !u.archived && (u.triageStatus === "unchecked" || !u.triageStatus))
    if (unchecked.length === 0) { setUrlSaveMsg("All URLs already triaged"); return }
    setUrlChecking(true)
    setUrlCheckProgress(`Checking 0/${unchecked.length}...`)
    const batchSize = 5
    for (let b = 0; b < unchecked.length; b += batchSize) {
      const batch = unchecked.slice(b, b + batchSize)
      setUrlCheckProgress(`Checking ${Math.min(b + batchSize, unchecked.length)}/${unchecked.length}...`)
      try {
        const res = await fetch("/api/urls/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: batch.map(({ u }) => u.url) }) })
        const data = await res.json()
        if (data.results) {
          for (const { u, i } of batch) {
            const r = data.results[u.url]
            if (r) {
              if (r.status === "ok") setUrlOverrides(p => ({ ...p, [i]: "ok" }))
              else if (r.status === "broken") setUrlOverrides(p => ({ ...p, [i]: "broken" }))
              else if (r.status === "slow" || r.status === "redirect") {
                setUrlOverrides(p => ({ ...p, [i]: "unsure" }))
                setUrlNotes(p => ({ ...p, [i]: r.status === "redirect" ? `Redirects to ${r.redirectUrl || "unknown"}` : `Slow response (${r.ms}ms)` }))
              }
            }
          }
        }
      } catch { /* continue */ }
    }
    setUrlChecking(false)
    setUrlCheckProgress("")
    setUrlSaveMsg(`Auto-check complete. Review results and Save.`)
  }

  function bulkMarkUnchecked(status: "ok" | "broken" | "unsure") {
    const newOverrides: Record<number, "ok" | "broken" | "unsure"> = { ...urlOverrides }
    urls.forEach((u, i) => {
      const current = urlOverrides[i] || u.triageStatus || (u.archived ? "broken" : "unchecked")
      if (current === "unchecked") newOverrides[i] = status
    })
    setUrlOverrides(newOverrides)
  }

  function getUrlStatus(u: UrlData, i: number): string {
    return urlOverrides[i] || u.triageStatus || (u.archived ? "broken" : "unchecked")
  }

  const urlCounts = urls.reduce((acc, u, i) => {
    const s = getUrlStatus(u, i)
    if (s === "ok" || s === "verified") acc.verified++
    else if (s === "broken") acc.broken++
    else if (s === "unsure") acc.unsure++
    else acc.unchecked++
    return acc
  }, { verified: 0, broken: 0, unsure: 0, unchecked: 0 })

  const filteredUrls = urls.map((u, i) => ({ u, i })).filter(({ u, i }) => {
    if (urlFilter === "all") return true
    const s = getUrlStatus(u, i)
    if (urlFilter === "verified") return s === "ok" || s === "verified"
    if (urlFilter === "broken") return s === "broken"
    if (urlFilter === "unsure") return s === "unsure"
    return s === "unchecked"
  })

  if (!profilePath) {
    const filtered = browseSearch.length >= 2
      ? allProfiles.filter((p) => p.title.toLowerCase().includes(browseSearch.toLowerCase())).slice(0, 20)
      : allProfiles.slice(0, 30)

    return (
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] mb-1">Profile View</h1>
        <p className="text-[10px] text-[var(--color-text-dim)] mb-4">Search or browse profiles to view full details</p>

        <input type="text" placeholder="Search profiles..." value={browseSearch}
          onChange={(e) => setBrowseSearch(e.target.value)}
          className="w-full max-w-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] mb-4" />

        {browseLoading ? (
          <div className="text-xs text-[var(--color-text-dim)] animate-pulse">Loading profiles...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filtered.map((p) => (
              <button key={p.path} onClick={() => router.push(`/profile?path=${encodeURIComponent(p.path)}`)}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 text-left hover:border-[var(--color-steel)]/50 transition-colors">
                <span className="text-[7px] uppercase px-1 py-0.5 rounded mb-1 inline-block"
                  style={{ color: typeColor(p.type), backgroundColor: `${typeColor(p.type)}15` }}>{p.type}</span>
                <p className="text-[11px] font-bold text-[var(--color-text)] leading-tight line-clamp-2 mb-1">{p.title}</p>
                <div className="flex items-center gap-1.5">
                  {p.party && <span className={`text-[7px] px-1 rounded ${p.party === "Democrat" ? "bg-blue-500/20 text-blue-400" : p.party === "Republican" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                    {p.party === "Democrat" ? "D" : p.party === "Republican" ? "R" : "I"}
                  </span>}
                  {p.state && <span className="text-[7px] text-[var(--color-text-dim)]">{p.state}</span>}
                  <span className="text-[7px] uppercase ml-auto" style={{ color: readinessColor(p.contentReadiness) }}>{p.contentReadiness}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        <p className="text-[9px] text-[var(--color-text-dim)] mt-3">Tip: Use Ctrl+K to search from anywhere</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] text-sm text-[var(--color-text-dim)] animate-pulse">Loading profile...</div>
  }

  if (!profile) {
    return <div className="text-sm text-[var(--color-red)]">Profile not found</div>
  }

  const readinessIndex = READINESS_STEPS.indexOf(profile.contentReadiness)

  // Group connections by type
  const connByType = connections.reduce(
    (acc, c) => {
      const name = c.source === profile.title ? c.target : c.source
      if (!acc[c.relationshipType]) acc[c.relationshipType] = []
      acc[c.relationshipType].push(name)
      return acc
    },
    {} as Record<string, string[]>
  )

  // Also parse body-text connections from profile fields
  const fmRelated = parseWikilinks(profile.related || "")
  const fmDonors = parseWikilinks(profile.donors || "")
  const fmOpposes = parseWikilinks(profile.opposes || "")
  // Merge API connections with frontmatter
  const allRelated = [...new Set([...(connByType["related"] || []), ...fmRelated])]
  const allDonors = [...new Set([...(connByType["donors"] || []), ...fmDonors])]
  const allOpposes = [...new Set([...(connByType["opposes"] || []), ...fmOpposes])]

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-[10px] text-[var(--color-text-dim)]">
        <Link href="/" className="hover:text-[var(--color-steel)]">Dashboard</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">{profile.title}</span>
      </div>

      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: `${typeColor(profile.type)}15`, color: typeColor(profile.type), border: `2px solid ${typeColor(profile.type)}30` }}
          >
            {profile.title[0]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-bold text-[var(--color-text)]">{profile.title}</h1>
              {profile.party && (
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                  profile.party === "Democrat" ? "bg-blue-500/20 text-blue-400" :
                  profile.party === "Republican" ? "bg-red-500/20 text-red-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>
                  {profile.party}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--color-text-dim)]">
              <span style={{ color: typeColor(profile.type) }}>{profile.type}</span>
              {profile.chamber && <span>{profile.chamber}</span>}
              {profile.state && <span>{profile.state}</span>}
              {profile.sector && <span>{profile.sector}</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/editor?profile=${encodeURIComponent(profile.path)}`}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 hover:bg-[var(--color-steel)]/25 transition-colors"
            >
              Edit
            </Link>
            <Link
              href={`/relationships?profile=${encodeURIComponent(profile.title)}`}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30 hover:bg-[#a855f7]/25 transition-colors"
            >
              Connections
            </Link>
          </div>
        </div>

        {/* Readiness stepper */}
        <div className="mt-5">
          <div className="flex items-center gap-1">
            {READINESS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-1 flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-full h-2 rounded-full transition-all ${i === 0 ? "rounded-l-full" : ""} ${i === READINESS_STEPS.length - 1 ? "rounded-r-full" : ""}`}
                    style={{
                      backgroundColor: i <= readinessIndex ? readinessColor(step) : "var(--color-bg)",
                      opacity: i <= readinessIndex ? 1 : 0.3,
                    }}
                  />
                  <span
                    className={`text-[7px] uppercase mt-1 ${i === readinessIndex ? "font-bold" : ""}`}
                    style={{ color: i <= readinessIndex ? readinessColor(step) : "var(--color-text-dim)" }}
                  >
                    {step}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {sources && (
          <>
            <StatCard label="Total Sources" value={sources.total} color="var(--color-text)" />
            <StatCard label="Tier 1" value={sources.tier1} color="var(--color-green)" />
            <StatCard label="Tier 2" value={sources.tier2} color="var(--color-steel)" />
            <StatCard label="Broken" value={sources.broken} color={sources.broken > 0 ? "var(--color-red)" : "var(--color-text-dim)"} />
          </>
        )}
        <StatCard label="Connections" value={allRelated.length + allDonors.length + allOpposes.length} color="#a855f7" />
        <StatCard label="URLs" value={urls.length} color="#06b6d4" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1 w-fit">
        {(["overview", "connections", "sources", "urls"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-xs transition-all capitalize ${
              tab === t ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Metadata */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Profile Data</h3>
            <div className="grid grid-cols-2 gap-2">
              {profile.totalRaised && <MetaItem label="Total Raised" value={profile.totalRaised} />}
              {profile.lobbyingSpend && <MetaItem label="Lobbying" value={profile.lobbyingSpend} />}
              {profile.lastUpdated && <MetaItem label="Last Updated" value={profile.lastUpdated} />}
              {profile.lastEnriched && <MetaItem label="Last Enriched" value={profile.lastEnriched} />}
              {profile.sourceTier && <MetaItem label="Source Tier" value={`Tier ${profile.sourceTier}`} />}
              <MetaItem label="Readiness" value={profile.contentReadiness} />
            </div>
          </div>

          {/* Connections preview */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Connections</h3>
              <button onClick={() => setTab("connections")} className="text-[9px] text-[var(--color-steel)] hover:underline">View all</button>
            </div>
            {(["related", "donors", "opposes"] as const).map((rt) => {
              const items = rt === "related" ? allRelated : rt === "donors" ? allDonors : allOpposes
              if (items.length === 0) return null
              return (
                <div key={rt} className="mb-2">
                  <span className="text-[8px] uppercase" style={{ color: REL_COLORS[rt] }}>{REL_LABELS[rt]} ({items.length})</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {items.slice(0, 6).map((name) => (
                      <span key={name} className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-text-dim)]">{name}</span>
                    ))}
                    {items.length > 6 && <span className="text-[9px] text-[var(--color-text-dim)]">+{items.length - 6} more</span>}
                  </div>
                </div>
              )
            })}
            {allRelated.length + allDonors.length + allOpposes.length === 0 && (
              <p className="text-[10px] text-[var(--color-text-dim)]">No connections yet</p>
            )}
          </div>

          {/* Source breakdown */}
          {sources && sources.total > 0 && (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">Source Quality</h3>
              <div className="space-y-2">
                {[
                  { label: "Tier 1 (Government)", count: sources.tier1, color: "#22c55e", total: sources.total },
                  { label: "Tier 2 (Journalism)", count: sources.tier2, color: "#5b8dce", total: sources.total },
                  { label: "Tier 3-4 (Other)", count: sources.tier3 + sources.tier4, color: "#f59e0b", total: sources.total },
                ].map((tier) => (
                  <div key={tier.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px]" style={{ color: tier.color }}>{tier.label}</span>
                      <span className="text-[9px] text-[var(--color-text-dim)]">{tier.count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--color-bg)]">
                      <div className="h-full rounded-full" style={{ backgroundColor: tier.color, width: `${tier.total > 0 ? (tier.count / tier.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File info */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-3">File</h3>
            <p className="text-[10px] text-[var(--color-text-dim)] break-all font-mono">{profile.path}</p>
          </div>
        </div>
      )}

      {tab === "connections" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          {(["related", "donors", "opposes"] as const).map((rt) => {
            const items = rt === "related" ? allRelated : rt === "donors" ? allDonors : allOpposes
            if (items.length === 0) return null
            return (
              <div key={rt} className="mb-4">
                <h4 className="text-[9px] uppercase tracking-wider mb-2" style={{ color: REL_COLORS[rt] }}>{REL_LABELS[rt]} ({items.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((name) => (
                    <div key={name} className="flex items-center gap-2 p-2 bg-[var(--color-bg)] rounded hover:bg-[var(--color-bg-hover)] transition-colors">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: REL_COLORS[rt] }} />
                      <span className="text-[11px] text-[var(--color-text)] flex-1">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {allRelated.length + allDonors.length + allOpposes.length === 0 && (
            <p className="text-xs text-[var(--color-text-dim)] text-center py-8">No connections found</p>
          )}
        </div>
      )}

      {tab === "sources" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          <p className="text-xs text-[var(--color-text-dim)]">
            {sources ? `${sources.total} sources (${sources.tier1} Tier 1, ${sources.tier2} Tier 2, ${sources.tier3 + sources.tier4} Tier 3-4)` : "No source data available"}
            {sources && sources.broken > 0 && <span className="text-[var(--color-red)] ml-2">{sources.broken} broken/archived</span>}
          </p>
        </div>
      )}

      {tab === "urls" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--color-border)] flex-wrap">
            <button onClick={autoCheckUrls} disabled={urlChecking || urls.length === 0}
              className="px-3 py-1.5 bg-[var(--color-steel)] text-white text-[10px] font-bold rounded hover:opacity-90 disabled:opacity-50">
              {urlChecking ? urlCheckProgress : "Auto-Check All"}
            </button>
            {Object.keys(urlOverrides).length > 0 && (
              <>
                <button onClick={saveUrlTriage} disabled={urlSaving}
                  className="px-3 py-1.5 bg-[var(--color-green)] text-black text-[10px] font-bold rounded hover:opacity-90 disabled:opacity-50">
                  {urlSaving ? "Saving..." : `Save ${Object.keys(urlOverrides).length} change${Object.keys(urlOverrides).length > 1 ? "s" : ""}`}
                </button>
                <button onClick={() => { setUrlOverrides({}); setUrlNotes({}) }}
                  className="px-2 py-1.5 text-[var(--color-text-dim)] text-[10px] rounded hover:text-[var(--color-text)]">
                  Clear
                </button>
              </>
            )}
            {urlCounts.unchecked > 0 && !urlChecking && (
              <button onClick={() => bulkMarkUnchecked("ok")}
                className="ml-auto px-2 py-1 border border-[var(--color-border)] text-[9px] text-[var(--color-green)] rounded hover:bg-[var(--color-green)]/10">
                Mark all unchecked ✓
              </button>
            )}
            {urlSaveMsg && <span className="text-[10px] text-[var(--color-green)]">{urlSaveMsg}</span>}
          </div>

          {/* Filter bar with counts */}
          <div className="flex gap-1 mb-3">
            {([
              ["all", `All ${urls.length}`, "text-[var(--color-text)]"],
              ["unchecked", `${urlCounts.unchecked} Unchecked`, "text-[#6b7280]"],
              ["verified", `${urlCounts.verified} Verified`, "text-[var(--color-green)]"],
              ["broken", `${urlCounts.broken} Broken`, "text-[var(--color-red)]"],
              ["unsure", `${urlCounts.unsure} Unsure`, "text-[#a855f7]"],
            ] as [string, string, string][]).map(([key, label, color]) => (
              <button key={key} onClick={() => setUrlFilter(key as typeof urlFilter)}
                className={`px-2 py-1 rounded text-[9px] font-bold transition-colors ${urlFilter === key ? `${color} bg-[var(--color-bg)] border border-[var(--color-border)]` : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"}`}>
                {label}
              </button>
            ))}
          </div>

          {urls.length === 0 ? (
            <p className="text-xs text-[var(--color-text-dim)] text-center py-8">No URLs found</p>
          ) : filteredUrls.length === 0 ? (
            <p className="text-xs text-[var(--color-text-dim)] text-center py-4">No URLs match this filter</p>
          ) : (
            <div className="space-y-0.5">
              {filteredUrls.map(({ u, i }) => {
                const override = urlOverrides[i]
                const status = getUrlStatus(u, i)
                const dotColor = status === "ok" || status === "verified" ? "bg-[var(--color-green)]"
                  : status === "broken" ? "bg-[var(--color-red)]"
                  : status === "unsure" ? "bg-[#a855f7]"
                  : "bg-[#6b7280]"
                const isExpanded = expandedUrl === i || !!override
                return (
                <React.Fragment key={i}>
                  <div className={`flex items-center gap-2 p-2 rounded text-[10px] hover:bg-[var(--color-bg-hover)] transition-colors ${status === "broken" ? "opacity-40" : ""}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <button onClick={() => { window.open(u.url, "_blank"); setExpandedUrl(i) }}
                      className="min-w-0 flex-1 text-left">
                      <p className={`text-[var(--color-text)] hover:text-[var(--color-steel)] ${status === "broken" ? "line-through" : ""}`}>{u.label}</p>
                      <p className="text-[var(--color-text-dim)] truncate">{u.url}</p>
                    </button>
                    {u.tier && <span className="text-[8px] text-[var(--color-text-dim)] flex-shrink-0">Tier {u.tier}</span>}
                    <div className="flex gap-1 flex-shrink-0">
                      <button title="Working (✓)" onClick={() => setUrlOverrides(p => override === "ok" ? (({ [i]: _, ...rest }) => rest)(p) : { ...p, [i]: "ok" })}
                        className={`w-5 h-5 rounded text-[9px] font-bold border transition-colors ${override === "ok" ? "bg-[var(--color-green)] text-black border-[var(--color-green)]" : "border-[var(--color-border)] text-[var(--color-green)] hover:bg-[var(--color-green)] hover:text-black"}`}>✓</button>
                      <button title="Broken (✗)" onClick={() => setUrlOverrides(p => override === "broken" ? (({ [i]: _, ...rest }) => rest)(p) : { ...p, [i]: "broken" })}
                        className={`w-5 h-5 rounded text-[9px] font-bold border transition-colors ${override === "broken" ? "bg-[var(--color-red)] text-white border-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-red)] hover:bg-[var(--color-red)] hover:text-white"}`}>✗</button>
                      <button title="Unsure (?)" onClick={() => setUrlOverrides(p => override === "unsure" ? (({ [i]: _, ...rest }) => rest)(p) : { ...p, [i]: "unsure" })}
                        className={`w-5 h-5 rounded text-[9px] font-bold border transition-colors ${override === "unsure" ? "bg-[#a855f7] text-white border-[#a855f7]" : "border-[var(--color-border)] text-[#a855f7] hover:bg-[#a855f7] hover:text-white"}`}>?</button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="flex items-center gap-2 ml-6 mb-1">
                      <input type="text" placeholder="Add a note (optional)..." value={urlNotes[i] || ""}
                        onChange={(e) => setUrlNotes(p => ({ ...p, [i]: e.target.value }))}
                        className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[9px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
                    </div>
                  )}
                  {!isExpanded && u.triageNote && (
                    <p className="ml-6 mb-1 text-[9px] text-[var(--color-text-dim)] italic">{u.triageNote}</p>
                  )}
                </React.Fragment>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 text-center">
      <span className="text-xl font-bold block" style={{ color }}>{value}</span>
      <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">{label}</span>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-bg)] rounded p-2">
      <span className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)] block">{label}</span>
      <span className="text-[11px] text-[var(--color-text)]">{value}</span>
    </div>
  )
}
