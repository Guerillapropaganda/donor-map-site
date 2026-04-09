"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { readinessColor, typeColor } from "@/lib/vault"
import { VerificationChecklist, evaluateReadinessEligibility, evaluateStoryGrading } from "@/components/VerificationChecklist"
import { PipelineDataViewer } from "@/components/PipelineDataViewer"

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
  // Editorial review fields
  editorialReviewDate?: string
  editorialReviewer?: string
  editorialResult?: string
  editorialBlockers?: string[]
  verifiedBlocks?: string[]
  checklistNa?: string[]
  knownGaps?: string[]
  corrections?: string[]
  lastVerifiedBy?: string
  internalNotes?: string
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

const READINESS_STEPS = ["raw", "draft", "ready", "verified"]
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
  const [tab, setTab] = useState<"overview" | "sources" | "connections" | "urls" | "notes" | "reviews">("overview")
  const [reviewAuthor, setReviewAuthor] = useState<"Code Claude" | "Research Claude" | "Editor">("Editor")
  const [reviewEntry, setReviewEntry] = useState("")
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewMsg, setReviewMsg] = useState("")
  const [reviewFilter, setReviewFilter] = useState<"all" | "Code Claude" | "Research Claude" | "Editor">("all")
  const [urlOverrides, setUrlOverrides] = useState<Record<number, "ok" | "broken" | "unsure" | "yellow">>({})
  const [urlNotes, setUrlNotes] = useState<Record<number, string>>({})
  const [urlSaving, setUrlSaving] = useState(false)
  const [urlSaveMsg, setUrlSaveMsg] = useState("")
  const [urlChecking, setUrlChecking] = useState(false)
  const [urlCheckProgress, setUrlCheckProgress] = useState("")
  const [urlFilter, setUrlFilter] = useState<"all" | "unchecked" | "verified" | "broken" | "unsure">("all")
  const [expandedUrl, setExpandedUrl] = useState<number | null>(null)
  const [rawContent, setRawContent] = useState("")
  const [readinessChanging, setReadinessChanging] = useState(false)
  const [readinessMsg, setReadinessMsg] = useState("")
  const [internalNotes, setInternalNotes] = useState("")
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesMsg, setNotesMsg] = useState("")
  const [notesOriginal, setNotesOriginal] = useState("")
  const [connSearch, setConnSearch] = useState("")
  const [connSearchResults, setConnSearchResults] = useState<{ title: string; path: string; type: string }[]>([])
  const [connAddType, setConnAddType] = useState<"related" | "donors" | "opposes">("related")
  const [connMsg, setConnMsg] = useState("")

  // Browse state (when no profile selected)
  const [browseSearch, setBrowseSearch] = useState("")
  const [allProfiles, setAllProfiles] = useState<{ title: string; path: string; type: string; contentReadiness: string; party?: string; state?: string; sector?: string; completeness?: number; sourceTypes?: string[]; lastEnriched?: string; lastVerifiedBy?: string; related?: string; donors?: string }[]>([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browseLetterFilter, setBrowseLetterFilter] = useState("all")
  const [browseTypeFilter, setBrowseTypeFilter] = useState("all")
  const [browseReadinessFilter, setBrowseReadinessFilter] = useState("all")
  const [browseSortBy, setBrowseSortBy] = useState<"name" | "nearest-a-plus" | "completeness">("name")

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
          setRawContent(profileData.raw || "")
          const notes = profileData.profile.internalNotes || ""
          setInternalNotes(notes)
          setNotesOriginal(notes)
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
  // Always load profiles (for browse AND connection search)
  useEffect(() => {
    if (allProfiles.length === 0) {
      setBrowseLoading(true)
      fetch("/api/vault").then((r) => r.json()).then((data) => {
        setAllProfiles(data.profiles || [])
        setBrowseLoading(false)
      }).catch(() => setBrowseLoading(false))
    }
  }, [allProfiles.length])

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
                setUrlOverrides(p => ({ ...p, [i]: "yellow" }))
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

    // Build summary for internal notes
    setUrlOverrides((current) => {
      const okCount = Object.values(current).filter(v => v === "ok").length
      const brokenCount = Object.values(current).filter(v => v === "broken").length
      const yellowCount = Object.values(current).filter(v => v === "yellow").length
      const date = new Date().toISOString().split("T")[0]
      const parts: string[] = []
      parts.push(`[URL Check ${date}] ${unchecked.length} checked: ${okCount} ok, ${brokenCount} broken, ${yellowCount} slow.`)
      for (const [idx, status] of Object.entries(current)) {
        if (status === "broken" || status === "yellow") {
          const u = urls[Number(idx)]
          parts.push(`${status === "broken" ? "BROKEN" : "SLOW"}: ${u?.label || u?.url}`)
        }
      }
      const summary = parts.join(" | ")
      const newNotes = internalNotes ? `${internalNotes} | ${summary}` : summary
      setInternalNotes(newNotes)
      // Auto-save notes
      if (profilePath) {
        fetch("/api/profile/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: profilePath, notes: newNotes }),
        }).then(() => {
          setNotesOriginal(newNotes)
          setNotesMsg("Auto-check notes saved")
        })
      }
      return current
    })
  }

  function bulkMarkUnchecked(status: "ok" | "broken" | "unsure") {
    const newOverrides: Record<number, "ok" | "broken" | "unsure" | "yellow"> = { ...urlOverrides }
    urls.forEach((u, i) => {
      const current = urlOverrides[i] || u.triageStatus || (u.archived ? "broken" : "unchecked")
      if (current === "unchecked") newOverrides[i] = status
    })
    setUrlOverrides(newOverrides)
  }

  async function changeReadiness(newReadiness: string) {
    if (!profile || !profilePath) return
    setReadinessChanging(true)
    setReadinessMsg("")
    try {
      const res = await fetch("/api/profile/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: profilePath,
          newReadiness,
          signOff: newReadiness === "verified",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReadinessMsg(`${data.from} → ${data.to}`)
        setProfile({ ...profile, contentReadiness: newReadiness })
      } else {
        setReadinessMsg(`Error: ${data.error}`)
      }
    } catch {
      setReadinessMsg("Error saving")
    }
    setReadinessChanging(false)
  }

  async function saveNotes() {
    if (!profile || !profilePath) return
    setNotesSaving(true)
    setNotesMsg("")
    try {
      const res = await fetch("/api/profile/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: profilePath, notes: internalNotes }),
      })
      const data = await res.json()
      if (data.success) {
        setNotesMsg("Saved")
        setNotesOriginal(internalNotes)
      } else {
        setNotesMsg(`Error: ${data.error}`)
      }
    } catch { setNotesMsg("Error saving") }
    setNotesSaving(false)
  }

  function searchProfilesToConnect() {
    if (connSearch.length < 2) return
    const q = connSearch.toLowerCase()
    const results = allProfiles
      .filter((p) => p.title.toLowerCase().includes(q))
      .filter((p) => p.title !== profile?.title)
      .slice(0, 10)
    setConnSearchResults(results)
  }

  async function addConnection(targetTitle: string) {
    if (!profile || !profilePath) return
    setConnMsg("")
    try {
      const res = await fetch("/api/profile/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: profilePath, action: "add", target: targetTitle, field: connAddType }),
      })
      const data = await res.json()
      setConnMsg(data.message || "Added")
      setConnSearchResults([])
      setConnSearch("")
      // Refresh profile + connections
      const refreshed = await fetch(`/api/profile?path=${encodeURIComponent(profilePath)}`).then(r => r.json())
      if (refreshed.profile) setProfile(refreshed.profile)
      const connData = await fetch("/api/connections").then(r => r.json())
      setConnections((connData.connections || []).filter(
        (c: Connection) => c.source === profile.title || c.target === profile.title
      ))
    } catch (e) { setConnMsg(`Error: ${e}`) }
  }

  async function removeConnection(targetTitle: string, field: "related" | "donors" | "opposes") {
    if (!profile || !profilePath) return
    setConnMsg("")
    try {
      const res = await fetch("/api/profile/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: profilePath, action: "remove", target: targetTitle, field }),
      })
      const data = await res.json()
      setConnMsg(data.message || "Removed")
      const refreshed = await fetch(`/api/profile?path=${encodeURIComponent(profilePath)}`).then(r => r.json())
      if (refreshed.profile) setProfile(refreshed.profile)
      const connData = await fetch("/api/connections").then(r => r.json())
      setConnections((connData.connections || []).filter(
        (c: Connection) => c.source === profile.title || c.target === profile.title
      ))
    } catch (e) { setConnMsg(`Error: ${e}`) }
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
    const letterFilter = browseLetterFilter
    const typeFilterVal = browseTypeFilter
    const readinessFilterVal = browseReadinessFilter

    let filtered = allProfiles
    if (browseSearch.length >= 2) {
      const q = browseSearch.toLowerCase()
      filtered = filtered.filter((p) => p.title.toLowerCase().includes(q))
    }
    if (typeFilterVal !== "all") filtered = filtered.filter((p) => p.type === typeFilterVal)
    if (readinessFilterVal !== "all") filtered = filtered.filter((p) => p.contentReadiness === readinessFilterVal)
    if (letterFilter !== "all") {
      if (letterFilter === "#") filtered = filtered.filter((p) => /^[0-9]/.test(p.title))
      else filtered = filtered.filter((p) => p.title.charAt(0).toUpperCase() === letterFilter)
    }
    if (browseSortBy === "nearest-a-plus") {
      filtered.sort((a, b) => {
        const score = (p: typeof a) => {
          let s = 0
          if (p.contentReadiness === "verified") s += 1000
          if (p.contentReadiness === "ready") s += 500
          if (p.contentReadiness === "draft") s += 100
          s += (p.sourceTypes || []).length * 50
          s += (p.completeness || 0) * 2
          if (p.lastEnriched) s += 100
          if (p.related || p.donors) s += 50
          if (p.lastVerifiedBy) s += 200
          return s
        }
        return score(b) - score(a)
      })
    } else if (browseSortBy === "completeness") {
      filtered.sort((a, b) => (b.completeness || 0) - (a.completeness || 0))
    } else {
      filtered.sort((a, b) => a.title.localeCompare(b.title))
    }

    const availableLetters = new Set<string>()
    allProfiles.forEach((p) => {
      const first = p.title.charAt(0).toUpperCase()
      if (/[A-Z]/.test(first)) availableLetters.add(first)
      else if (/[0-9]/.test(first)) availableLetters.add("#")
    })

    const types = Array.from(new Set(allProfiles.map((p) => p.type))).sort()

    return (
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text)] mb-1">Profile View</h1>
        <p className="text-[10px] text-[var(--color-text-dim)] mb-4">Click a profile to view full details. Use filters below to narrow down.</p>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 mb-3">
          <input type="text" placeholder="Search profiles..." value={browseSearch}
            onChange={(e) => setBrowseSearch(e.target.value)}
            className="flex-1 min-w-[200px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
          <select value={typeFilterVal} onChange={(e) => setBrowseTypeFilter(e.target.value)}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]">
            <option value="all">All Types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={browseSortBy} onChange={(e) => setBrowseSortBy(e.target.value as "name" | "nearest-a-plus" | "completeness")}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]">
            <option value="name">Sort: Name</option>
            <option value="nearest-a-plus">Sort: Nearest to A+</option>
            <option value="completeness">Sort: Completeness</option>
          </select>
        </div>

        {/* Readiness Scroller */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
          <span className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider flex-shrink-0">Grade:</span>
          {[
            { value: "all", label: "All", grade: "", color: "var(--color-text-dim)" },
            { value: "verified", label: "Verified", grade: "A+", color: "#fbbf24" },
            { value: "ready", label: "Ready", grade: "B", color: "#10b981" },
            { value: "draft", label: "Draft", grade: "C", color: "#f59e0b" },
            { value: "raw", label: "Raw", grade: "D-F", color: "#6b7280" },
          ].map((r) => {
            const count = r.value === "all" ? allProfiles.length : allProfiles.filter(p => p.contentReadiness === r.value).length
            const isActive = readinessFilterVal === r.value
            return (
              <button key={r.value} onClick={() => setBrowseReadinessFilter(r.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex-shrink-0 ${
                  isActive ? "ring-1" : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  color: r.color,
                  backgroundColor: isActive ? `${r.color}20` : `${r.color}08`,
                  borderColor: isActive ? `${r.color}50` : "transparent",
                  border: `1px solid ${isActive ? `${r.color}50` : "transparent"}`,
                  ...(isActive ? { ringColor: `${r.color}30` } : {}),
                }}>
                {r.grade && <span className="text-[8px]">{r.grade}</span>}
                <span>{r.label}</span>
                <span className="text-[8px] opacity-60">{count}</span>
              </button>
            )
          })}
        </div>

        {/* A-Z Bar */}
        <div className="flex flex-wrap items-center gap-0.5 mb-2">
          <button onClick={() => setBrowseLetterFilter("all")}
            className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${letterFilter === "all" ? "bg-[var(--color-steel)] text-white" : "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)]"}`}>ALL</button>
          <button onClick={() => setBrowseLetterFilter("#")} disabled={!availableLetters.has("#")}
            className={`px-1.5 py-1 text-[10px] font-bold rounded transition-colors ${letterFilter === "#" ? "bg-[var(--color-steel)] text-white" : availableLetters.has("#") ? "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)]" : "text-[var(--color-text-dim)]/30 cursor-default"}`}>#</button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
            <button key={letter} onClick={() => setBrowseLetterFilter(letter)} disabled={!availableLetters.has(letter)}
              className={`px-1.5 py-1 text-[10px] font-bold rounded transition-colors ${letterFilter === letter ? "bg-[var(--color-steel)] text-white" : availableLetters.has(letter) ? "text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)]" : "text-[var(--color-text-dim)]/30 cursor-default"}`}>{letter}</button>
          ))}
        </div>

        {/* Count */}
        <p className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wider mb-3">
          {filtered.length.toLocaleString()} profiles{letterFilter !== "all" && ` starting with "${letterFilter}"`}
        </p>

        {browseLoading ? (
          <div className="text-xs text-[var(--color-text-dim)] animate-pulse">Loading profiles...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
            {filtered.slice(0, 100).map((p) => {
              const comp = p.completeness || 0
              const compColor = comp >= 80 ? "#22c55e" : comp >= 50 ? "#5b8dce" : comp >= 25 ? "#f59e0b" : "#ef4444"
              return (
                <button key={p.path} onClick={() => router.push(`/profile?path=${encodeURIComponent(p.path)}`)}
                  className="group relative bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3 text-left hover:border-[var(--color-steel)]/50 transition-colors">
                  {/* Completeness ring + readiness */}
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {comp > 0 && (
                      <div className="relative w-5 h-5" title={`${comp}% complete`}>
                        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-border)" strokeWidth="2" />
                          <circle cx="12" cy="12" r="10" fill="none" stroke={compColor} strokeWidth="2" strokeLinecap="round"
                            strokeDasharray={`${(comp / 100) * 62.83} 62.83`} />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[5px] font-bold text-[var(--color-text-dim)]">{comp}</span>
                      </div>
                    )}
                    <span className="text-[7px] uppercase font-bold px-1 py-0.5 rounded"
                      style={{ color: readinessColor(p.contentReadiness), backgroundColor: `${readinessColor(p.contentReadiness)}15`, border: `1px solid ${readinessColor(p.contentReadiness)}30` }}>
                      {p.contentReadiness}
                    </span>
                  </div>
                  <span className="text-[7px] uppercase px-1 py-0.5 rounded mb-1 inline-block"
                    style={{ color: typeColor(p.type), backgroundColor: `${typeColor(p.type)}15` }}>{p.type}</span>
                  <p className="text-[11px] font-bold text-[var(--color-text)] leading-tight line-clamp-2 mb-1 pr-14">{p.title}</p>
                  <div className="flex items-center gap-1.5">
                    {p.party && <span className={`text-[7px] px-1 rounded ${p.party === "Democrat" ? "bg-blue-500/20 text-blue-400" : p.party === "Republican" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {p.party === "Democrat" ? "D" : p.party === "Republican" ? "R" : "I"}
                    </span>}
                    {p.state && <span className="text-[7px] text-[var(--color-text-dim)]">{p.state}</span>}
                    {p.sector && <span className="text-[7px] text-[var(--color-text-dim)] truncate max-w-[80px]">{p.sector}</span>}
                  </div>
                  {/* Source types indicator */}
                  {(p.sourceTypes || []).length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[7px] text-[var(--color-green)]">{(p.sourceTypes || []).length} Tier 1 types</span>
                      {(p.sourceTypes || []).length >= 2 && !p.lastVerifiedBy && (
                        <span className="text-[7px] text-[#fbbf24]">A+ candidate</span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
        {filtered.length > 100 && <p className="text-[9px] text-[var(--color-text-dim)] mt-3">Showing first 100 of {filtered.length}. Use search or filters to narrow down.</p>}
      </div>
    )
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] text-sm text-[var(--color-text-dim)] animate-pulse">Loading profile...</div>
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-[var(--color-red)] mb-2">Profile not found</p>
        <p className="text-[10px] text-[var(--color-text-dim)] mb-4">Path: {profilePath}</p>
        <button onClick={() => router.push("/profile")} className="text-[10px] text-[var(--color-steel)] hover:underline">← Back to browse</button>
      </div>
    )
  }

  const readinessIndex = READINESS_STEPS.indexOf(profile.contentReadiness)
  const isStoryType = ["story", "event", "sub-note", "daily-update"].includes(profile.type)
  const storyGrading = isStoryType ? evaluateStoryGrading(rawContent) : null

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
        <span className="ml-auto">
          <button onClick={() => router.back()}
            className="text-[9px] text-[var(--color-text-dim)] hover:text-[var(--color-steel)] flex items-center gap-1">
            <span>&#8592;</span> Back
          </button>
        </span>
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
            <button
              onClick={async () => {
                setLoading(true)
                try {
                  const [profileData, connData] = await Promise.all([
                    fetch(`/api/profile?path=${encodeURIComponent(profilePath!)}`).then(r => r.json()),
                    fetch("/api/connections").then(r => r.json()),
                  ])
                  if (profileData.profile) {
                    setProfile(profileData.profile)
                    setSources(profileData.sources || null)
                    setUrls(profileData.urls || [])
                    setInternalNotes(profileData.profile.internalNotes || "")
                    setNotesOriginal(profileData.profile.internalNotes || "")
                  }
                  const title = profileData.profile?.title || ""
                  setConnections((connData.connections || []).filter(
                    (c: Connection) => c.source === title || c.target === title
                  ))
                } catch {}
                setLoading(false)
                setUrlOverrides({})
                setUrlNotes({})
              }}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--color-bg)]/50 text-[var(--color-text-dim)] border border-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
              title="Refresh profile"
            >
              ↻ Refresh
            </button>
            <Link
              href={`/editor?profile=${encodeURIComponent(profile.path)}`}
              className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 hover:bg-[var(--color-steel)]/25 transition-colors"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Readiness stepper with promote/demote */}
        <div className="mt-5">
          <div className="flex items-center gap-1 mb-2">
            {READINESS_STEPS.map((step, i) => {
              const grades: Record<string, string> = { raw: "D-F", draft: "C", ready: "B", verified: "A+" }
              return (
                <div key={step} className="flex items-center gap-1 flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full h-2.5 rounded-full transition-all ${i === 0 ? "rounded-l-full" : ""} ${i === READINESS_STEPS.length - 1 ? "rounded-r-full" : ""}`}
                      style={{
                        backgroundColor: i <= readinessIndex ? readinessColor(step) : "var(--color-bg)",
                        opacity: i <= readinessIndex ? 1 : 0.3,
                      }}
                    />
                    <span
                      className={`text-[7px] uppercase mt-1 ${i === readinessIndex ? "font-bold" : ""}`}
                      style={{ color: i <= readinessIndex ? readinessColor(step) : "var(--color-text-dim)" }}
                    >
                      {grades[step]} {step}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Promote/Demote with checklist enforcement */}
          {(() => {
            const isStory = ["story", "event", "sub-note", "daily-update"].includes(profile.type)
            const eligibility = isStory
              ? { maxTier: storyGrading?.tier || "draft" as const, pct: 0, failingItems: [] }
              : evaluateReadinessEligibility(profile, rawContent)
            const nextTier = readinessIndex < READINESS_STEPS.length - 1 ? READINESS_STEPS[readinessIndex + 1] : null
            const canPromote = nextTier && READINESS_STEPS.indexOf(nextTier) <= READINESS_STEPS.indexOf(eligibility.maxTier)
            const isBlocked = nextTier && !canPromote

            return (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Demote */}
                  {readinessIndex > 0 && (
                    <button onClick={() => changeReadiness(READINESS_STEPS[readinessIndex - 1])} disabled={readinessChanging}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg bg-[var(--color-red)]/10 text-[var(--color-red)] border border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/20 transition-colors disabled:opacity-50">
                      ↓ Demote to {READINESS_STEPS[readinessIndex - 1]}
                    </button>
                  )}
                  {/* Promote (enabled if checklist allows) */}
                  {nextTier && canPromote && (
                    <button onClick={() => changeReadiness(nextTier)} disabled={readinessChanging}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: `${readinessColor(nextTier)}15`,
                        color: readinessColor(nextTier),
                        border: `1px solid ${readinessColor(nextTier)}30`,
                      }}>
                      ↑ {nextTier === "verified" ? "Sign off → A+" : `Promote to ${nextTier}`}
                    </button>
                  )}
                  {/* Blocked promote (shows why) */}
                  {nextTier && isBlocked && (
                    <span className="flex items-center gap-1 px-3 py-1.5 text-[10px] rounded-lg bg-[var(--color-bg)] text-[var(--color-text-dim)] border border-[var(--color-border)]">
                      ↑ {nextTier === "verified" ? "A+" : nextTier} blocked — {eligibility.failingItems.slice(0, 2).join(", ")}{eligibility.failingItems.length > 2 ? ` +${eligibility.failingItems.length - 2} more` : ""}
                    </span>
                  )}
                  {/* Bypass button (when blocked) */}
                  {nextTier && isBlocked && (
                    <button
                      onClick={() => {
                        if (confirm(`Bypass checklist? Promoting to ${nextTier} despite ${eligibility.failingItems.length} failing items:\n\n${eligibility.failingItems.join("\n")}\n\nThis will be logged.`)) {
                          changeReadiness(nextTier)
                        }
                      }}
                      disabled={readinessChanging}
                      className="flex items-center gap-1 px-2 py-1.5 text-[9px] rounded-lg text-[var(--color-amber)] border border-[var(--color-amber)]/30 hover:bg-[var(--color-amber)]/10 transition-colors disabled:opacity-50">
                      ⚠ Bypass
                    </button>
                  )}
                  {readinessMsg && (
                    <span className={`text-[10px] ${readinessMsg.includes("Error") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{readinessMsg}</span>
                  )}
                  {readinessChanging && <span className="text-[10px] text-[var(--color-text-dim)] animate-pulse">Saving...</span>}
                </div>

                {/* Story grading display */}
                {isStory && storyGrading && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <span className="text-[var(--color-text-dim)]">Story grade:</span>
                    <span className="font-bold" style={{
                      color: storyGrading.level === "investigation" ? "#fbbf24" : storyGrading.level === "report" ? "#10b981" : "#f59e0b"
                    }}>
                      {storyGrading.level.toUpperCase()}
                    </span>
                    <span className="text-[var(--color-text-dim)]">({storyGrading.urlCount} URLs, {storyGrading.tier1Count} Tier 1)</span>
                    <span className="text-[var(--color-text-dim)]">
                      {storyGrading.level === "story" ? "→ 5+ URLs for Report" : storyGrading.level === "report" ? "→ 10+ URLs + 3 Tier 1 for Investigation" : "Full investigation"}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
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
        {(["overview", "connections", "urls", "notes", "reviews"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-xs transition-all capitalize ${
              tab === t ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
            }`}>
            {t === "reviews" ? <>Reviews {profile?.editorialResult === "pass" ? <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-green)] ml-1" /> : profile?.editorialResult === "block" ? <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-red)] ml-1" /> : profile?.editorialResult === "defer" ? <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-amber)] ml-1" /> : null}</> : <>{t}{t === "notes" && internalNotes ? " •" : ""}</>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* A+ Verification Checklist */}
          <VerificationChecklist
            profile={profile}
            raw={rawContent}
            onSaveNa={async (naItems) => {
              await fetch("/api/profile/checklist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: profilePath, checklistNa: naItems }),
              })
              setProfile({ ...profile, checklistNa: naItems })
            }}
            onRunPipeline={async (pipeline, profileTitle) => {
              setReadinessMsg(`Running ${pipeline} pipeline on ${profileTitle}...`)
              try {
                const res = await fetch("/api/pipelines", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pipeline, profile: profileTitle, limit: 1 }),
                })
                const data = await res.json()
                if (data.success) {
                  setReadinessMsg(`${pipeline} pipeline triggered for ${profileTitle}`)
                } else {
                  setReadinessMsg(`Pipeline error: ${data.error || "GitHub Actions may be disabled"}`)
                }
              } catch {
                setReadinessMsg("Pipeline error: GitHub Actions may be disabled")
              }
            }}
          />

          {/* Pipeline Data Viewer — voting records, committees, bills, etc. */}
          <PipelineDataViewer raw={rawContent} profileType={profile.type} />

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
        </div>
      )}

      {tab === "connections" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          {/* Add connection */}
          <div className="flex gap-2 mb-4 pb-4 border-b border-[var(--color-border)]">
            <div className="relative flex-1">
              <input type="text" placeholder="Search profile to add..." value={connSearch}
                onChange={(e) => { setConnSearch(e.target.value); setConnSearchResults([]) }}
                onKeyDown={(e) => { if (e.key === "Enter" && connSearch.length >= 2) searchProfilesToConnect() }}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]" />
              {connSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg max-h-48 overflow-y-auto z-20 shadow-lg">
                  {connSearchResults.map((r) => (
                    <button key={r.path} onClick={() => addConnection(r.title)}
                      className="w-full text-left px-3 py-2 text-[10px] hover:bg-[var(--color-bg-hover)] transition-colors border-b border-[var(--color-border)] last:border-b-0">
                      <span className="text-[var(--color-text)]">{r.title}</span>
                      <span className="text-[var(--color-text-dim)] ml-2">{r.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select value={connAddType} onChange={(e) => setConnAddType(e.target.value as "related" | "donors" | "opposes")}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-2 py-2 text-[10px] text-[var(--color-text)]">
              <option value="related">Related</option>
              <option value="donors">Funded By</option>
              <option value="opposes">Opposes</option>
            </select>
            <button onClick={searchProfilesToConnect} disabled={connSearch.length < 2}
              className="px-3 py-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] text-[10px] font-bold rounded-lg border border-[var(--color-steel)]/30 hover:bg-[var(--color-steel)]/25 disabled:opacity-50">
              Search
            </button>
          </div>
          {connMsg && <p className={`text-[10px] mb-3 ${connMsg.includes("Error") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{connMsg}</p>}

          {/* Connection lists with remove buttons */}
          {(["related", "donors", "opposes"] as const).map((rt) => {
            const items = rt === "related" ? allRelated : rt === "donors" ? allDonors : allOpposes
            if (items.length === 0) return null
            return (
              <div key={rt} className="mb-4">
                <h4 className="text-[9px] uppercase tracking-wider mb-2" style={{ color: REL_COLORS[rt] }}>{REL_LABELS[rt]} ({items.length})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map((name) => (
                    <div key={name} className="flex items-center gap-2 p-2 bg-[var(--color-bg)] rounded hover:bg-[var(--color-bg-hover)] transition-colors group">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: REL_COLORS[rt] }} />
                      <span className="text-[11px] text-[var(--color-text)] flex-1">{name}</span>
                      <select
                        value={rt}
                        onChange={async (e) => {
                          const newType = e.target.value as "related" | "donors" | "opposes"
                          if (newType === rt) return
                          setConnMsg(`Moving ${name}...`)
                          // Remove from old type
                          await fetch("/api/profile/connections", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ path: profilePath, action: "remove", target: name, field: rt }),
                          })
                          // Add to new type
                          await fetch("/api/profile/connections", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ path: profilePath, action: "add", target: name, field: newType }),
                          })
                          setConnMsg(`Moved ${name}: ${REL_LABELS[rt]} → ${REL_LABELS[newType]}`)
                          // Refresh
                          const refreshed = await fetch(`/api/profile?path=${encodeURIComponent(profilePath!)}`).then(r => r.json())
                          if (refreshed.profile) setProfile(refreshed.profile)
                          const connData = await fetch("/api/connections").then(r => r.json())
                          setConnections((connData.connections || []).filter(
                            (c: Connection) => c.source === profile!.title || c.target === profile!.title
                          ))
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded px-1 py-0.5 text-[8px] text-[var(--color-text-dim)] focus:outline-none"
                      >
                        <option value="related">Related</option>
                        <option value="donors">Funded By</option>
                        <option value="opposes">Opposes</option>
                      </select>
                      <button onClick={() => removeConnection(name, rt)}
                        className="text-[var(--color-red)] opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 hover:bg-[var(--color-red)]/10 rounded"
                        title="Remove connection">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {allRelated.length + allDonors.length + allOpposes.length === 0 && (
            <p className="text-xs text-[var(--color-text-dim)] text-center py-8">No connections found. Search above to add.</p>
          )}
        </div>
      )}

      {tab === "urls" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          {/* Source tier summary (merged from Sources tab) */}
          {sources && (
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--color-border)] text-[10px]">
              <span className="text-[var(--color-green)] font-bold">{sources.tier1} Tier 1</span>
              <span className="text-[var(--color-steel)]">{sources.tier2} Tier 2</span>
              <span className="text-[var(--color-amber)]">{sources.tier3 + sources.tier4} Tier 3-4</span>
              {sources.broken > 0 && <span className="text-[var(--color-red)]">{sources.broken} broken</span>}
              <span className="text-[var(--color-text-dim)]">{sources.total} total sources</span>
            </div>
          )}
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
                  : status === "yellow" ? "bg-[var(--color-amber)]"
                  : status === "unsure" ? "bg-[#a855f7]"
                  : "bg-[#6b7280]"
                const isExpanded = expandedUrl === i || !!override
                return (
                <React.Fragment key={i}>
                  <div className={`flex items-center gap-2 p-2 rounded text-[10px] hover:bg-[var(--color-bg-hover)] transition-colors ${status === "broken" ? "opacity-40" : ""}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                    <button onClick={() => { window.open(u.url, "_blank"); setExpandedUrl(i) }}
                      className="min-w-0 text-left">
                      <p className={`text-[var(--color-text)] hover:text-[var(--color-steel)] ${status === "broken" ? "line-through" : ""}`}>{u.label}</p>
                      <p className="text-[var(--color-text-dim)] truncate">{u.url}</p>
                    </button>
                    {u.tier && <span className="text-[8px] text-[var(--color-text-dim)] flex-shrink-0">Tier {u.tier}</span>}
                    <div className="flex gap-1 flex-shrink-0 ml-1">
                      <button title="Working (✓)" onClick={() => setUrlOverrides(p => override === "ok" ? (({ [i]: _, ...rest }) => rest)(p) : { ...p, [i]: "ok" })}
                        className={`w-5 h-5 rounded text-[9px] font-bold border transition-colors ${override === "ok" ? "bg-[var(--color-green)] text-black border-[var(--color-green)]" : "border-[var(--color-border)] text-[var(--color-green)] hover:bg-[var(--color-green)] hover:text-black"}`}>✓</button>
                      <button title="Broken (✗)" onClick={() => setUrlOverrides(p => override === "broken" ? (({ [i]: _, ...rest }) => rest)(p) : { ...p, [i]: "broken" })}
                        className={`w-5 h-5 rounded text-[9px] font-bold border transition-colors ${override === "broken" ? "bg-[var(--color-red)] text-white border-[var(--color-red)]" : "border-[var(--color-border)] text-[var(--color-red)] hover:bg-[var(--color-red)] hover:text-white"}`}>✗</button>
                      <button title="Slow/Redirect (⚠)" onClick={() => setUrlOverrides(p => override === "yellow" ? (({ [i]: _, ...rest }) => rest)(p) : { ...p, [i]: "yellow" })}
                        className={`w-5 h-5 rounded text-[9px] font-bold border transition-colors ${override === "yellow" ? "bg-[var(--color-amber)] text-black border-[var(--color-amber)]" : "border-[var(--color-border)] text-[var(--color-amber)] hover:bg-[var(--color-amber)] hover:text-black"}`}>⚠</button>
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

      {tab === "notes" && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Internal Notes</h3>
            <span className="text-[8px] text-[var(--color-text-dim)]">Not published — only visible in Ops app and to both Claudes</span>
          </div>
          <textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Leave notes for yourself or Claude... e.g. 'Need to verify FEC data for 2024 cycle' or 'Missing lobbying connections to Koch network'"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] min-h-[200px] resize-y"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={saveNotes}
              disabled={notesSaving || internalNotes === notesOriginal}
              className="px-4 py-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] text-[10px] font-bold rounded-lg border border-[var(--color-steel)]/30 hover:bg-[var(--color-steel)]/25 disabled:opacity-50 transition-colors"
            >
              {notesSaving ? "Saving..." : "Save Notes"}
            </button>
            {internalNotes !== notesOriginal && (
              <span className="text-[9px] text-[var(--color-amber)]">Unsaved changes</span>
            )}
            {notesMsg && <span className={`text-[10px] ${notesMsg.includes("Error") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{notesMsg}</span>}
          </div>
        </div>
      )}

      {/* ═══ Reviews Tab — Timeline Journal ═══ */}
      {tab === "reviews" && profile && (() => {
        const AUTHOR_COLORS: Record<string, string> = { "Code Claude": "#5b8dce", "Research Claude": "#22c55e", "Editor": "#f59e0b" }
        const verifiedBlocks = profile.verifiedBlocks || []
        const reviewResult = profile.editorialResult
        const reviewDate = profile.editorialReviewDate

        // Parse review entries from internal-notes (format: [AUTHOR @ DATE] text)
        const entries: { author: string; date: string; text: string }[] = []
        const allNotes = (internalNotes || "").split(" | ")
        for (const n of allNotes) {
          const match = n.match(/^\[(CODE|RESEARCH|EDITOR)(?:\s*@\s*(\d{4}-\d{2}-\d{2}))?\]\s*(.+)/)
          if (match) {
            const authorMap: Record<string, string> = { CODE: "Code Claude", RESEARCH: "Research Claude", EDITOR: "Editor" }
            const text = match[3]
            // Skip old "Needs Research Claude:" entries — these are duplicates of formal review blockers
            if (text.startsWith("Needs Research Claude:") || text.startsWith("Needs Code Claude:")) continue
            entries.push({ author: authorMap[match[1]] || match[1], date: match[2] || "", text })
          }
        }

        // Add the formal editorial review split by owner
        if (reviewDate && profile.editorialBlockers) {
          const blockers = profile.editorialBlockers || []
          const codeKeywords = ["code claude", "pipeline", "auto-block", "enrichment", "fec id", "wrong fec", "corrupted", "scraper", "last-enriched"]
          const codeBlockers = blockers.filter(b => codeKeywords.some(k => b.toLowerCase().includes(k)))
          const researchBlockers = blockers.filter(b => !codeBlockers.includes(b))

          // Code Claude entry
          if (codeBlockers.length > 0) {
            const cLines = codeBlockers.map(b => `TODO: ${b}`)
            entries.unshift({ author: "Code Claude", date: reviewDate, text: cLines.join("\n") })
          }

          // Research Claude entry
          const rLines: string[] = []
          if (researchBlockers.length > 0) rLines.push(...researchBlockers.map(b => `TODO: ${b}`))
          if (verifiedBlocks.length > 0) rLines.push(`Verified: ${verifiedBlocks.join(", ")}`)
          rLines.push(`Result: ${verifiedBlocks.length}/10 blocks — ${(reviewResult || "pending").toUpperCase()}`)
          entries.unshift({ author: "Research Claude", date: reviewDate, text: rLines.join("\n") })
        }

        const filtered = reviewFilter === "all" ? entries : entries.filter(e => e.author === reviewFilter)

        async function addEntry() {
          if (!profilePath || !reviewEntry.trim()) return
          setReviewSaving(true)
          setReviewMsg("")
          const prefix = reviewAuthor === "Code Claude" ? "CODE" : reviewAuthor === "Research Claude" ? "RESEARCH" : "EDITOR"
          const today = new Date().toISOString().split("T")[0]
          const newNote = `[${prefix} @ ${today}] ${reviewEntry.trim()}`
          const updated = internalNotes ? `${internalNotes} | ${newNote}` : newNote
          try {
            const res = await fetch("/api/profile/notes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: profilePath, notes: updated }),
            })
            const data = await res.json()
            if (data.success) {
              setInternalNotes(updated)
              setNotesOriginal(updated)
              setReviewEntry("")
              setReviewMsg("Saved")
            } else { setReviewMsg(`Error: ${data.error}`) }
          } catch { setReviewMsg("Error saving") }
          setReviewSaving(false)
        }

        return (
        <div className="space-y-3">
          {/* Status bar */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
            <span className={`text-[10px] font-bold ${
              reviewResult === "pass" ? "text-[var(--color-green)]" : reviewResult === "block" ? "text-[var(--color-red)]" : reviewResult === "defer" ? "text-[var(--color-amber)]" : "text-[var(--color-text-dim)]"
            }`}>
              {reviewResult === "pass" ? "A+ APPROVED" : reviewResult === "block" ? "BLOCKED" : reviewResult === "defer" ? "DEFERRED" : "NOT REVIEWED"}
            </span>
            {verifiedBlocks.length > 0 && (
              <div className="flex gap-1">
                {verifiedBlocks.map((b, i) => (
                  <span key={i} className="text-[7px] px-1 py-0.5 rounded bg-[var(--color-green)]/10 text-[var(--color-green)]">{b}</span>
                ))}
              </div>
            )}
            {reviewMsg && <span className="ml-auto text-[9px] text-[var(--color-green)]">{reviewMsg}</span>}
          </div>

          {/* Filter pills */}
          <div className="flex gap-1">
            {(["all", "Code Claude", "Research Claude", "Editor"] as const).map((f) => (
              <button key={f} onClick={() => setReviewFilter(f)}
                className={`px-3 py-1 rounded text-[9px] transition-all ${
                  reviewFilter === f ? "font-bold" : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                }`}
                style={reviewFilter === f && f !== "all" ? { color: AUTHOR_COLORS[f], backgroundColor: AUTHOR_COLORS[f] + "15" } : reviewFilter === f ? { color: "var(--color-steel)", backgroundColor: "var(--color-steel-15, rgba(91,141,206,0.15))" } : {}}>
                {f === "all" ? "All" : f} {f !== "all" && <span className="text-[7px] opacity-60">({entries.filter(e => e.author === f).length})</span>}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-[10px] text-[var(--color-text-dim)] text-center py-6">No review entries yet</p>
            ) : filtered.map((entry, i) => (
              <div key={i} className="p-3 rounded bg-[var(--color-bg)] border-l-2 border border-[var(--color-border)]"
                style={{ borderLeftColor: AUTHOR_COLORS[entry.author] || "#888" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold" style={{ color: AUTHOR_COLORS[entry.author] || "#888" }}>{entry.author}</span>
                  {entry.date && <span className="text-[8px] text-[var(--color-text-dim)]">{entry.date}</span>}
                </div>
                <p className="text-[10px] text-[var(--color-text)] whitespace-pre-wrap">{entry.text}</p>
              </div>
            ))}
          </div>

          {/* Add entry */}
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <select value={reviewAuthor} onChange={(e) => setReviewAuthor(e.target.value as "Code Claude" | "Research Claude" | "Editor")}
                className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1 text-[9px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]">
                <option>Code Claude</option>
                <option>Research Claude</option>
                <option>Editor</option>
              </select>
              <span className="text-[8px] text-[var(--color-text-dim)]">{new Date().toISOString().split("T")[0]}</span>
            </div>
            <textarea
              value={reviewEntry}
              onChange={(e) => setReviewEntry(e.target.value)}
              placeholder="What was found, fixed, or improved..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] min-h-[60px] resize-y"
            />
            <button onClick={addEntry} disabled={reviewSaving || !reviewEntry.trim()}
              className="mt-2 px-3 py-1.5 text-[9px] font-bold rounded border transition-colors disabled:opacity-50"
              style={{ color: AUTHOR_COLORS[reviewAuthor], borderColor: AUTHOR_COLORS[reviewAuthor] + "50", backgroundColor: AUTHOR_COLORS[reviewAuthor] + "10" }}>
              {reviewSaving ? "Saving..." : "Add Entry"}
            </button>
          </div>
        </div>
        )
      })()}
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
