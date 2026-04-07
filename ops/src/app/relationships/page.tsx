"use client"

import { useState, useEffect, useMemo } from "react"
import type { Profile } from "@/lib/vault"
import { typeColor, readinessColor } from "@/lib/vault"

const REL_TYPES = [
  { id: "related", label: "Related", color: "#5b8dce", desc: "Allied, funding, or organizational connection" },
  { id: "donors", label: "Donors", color: "#22c55e", desc: "Funding source" },
  { id: "opposes", label: "Opposes", color: "#ef4444", desc: "Adversarial — critic, target, opponent" },
] as const

type RelType = "related" | "donors" | "opposes"

interface Connection {
  name: string
  type: RelType
}

export default function RelationshipsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Selected profile
  const [selected, setSelected] = useState<Profile | null>(null)
  const [search, setSearch] = useState("")

  // Add connection state
  const [targetSearch, setTargetSearch] = useState("")
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null)
  const [relType, setRelType] = useState<RelType>("related")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((d) => {
        setProfiles(d.profiles || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const searchResults = search.length >= 2
    ? profiles.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : []

  const targetResults = targetSearch.length >= 2 && !targetProfile
    ? profiles.filter((p) =>
        p.title.toLowerCase().includes(targetSearch.toLowerCase()) &&
        p.path !== selected?.path
      ).slice(0, 10)
    : []

  // Parse existing connections from the selected profile
  const connections = useMemo<Connection[]>(() => {
    if (!selected) return []
    const conns: Connection[] = []

    for (const rt of ["related", "donors", "opposes"] as RelType[]) {
      const val = selected[rt as keyof Profile] as string | undefined
      if (!val) continue
      const links = val.match(/\[\[([^\]]+)\]\]/g) || []
      for (const link of links) {
        const inner = link.replace("[[", "").replace("]]", "")
        const name = inner.split("|").pop() || inner
        conns.push({ name, type: rt })
      }
    }
    return conns
  }, [selected])

  const addConnection = async () => {
    if (!selected || !targetProfile) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: selected.path,
          targetTitle: targetProfile.title,
          relationshipType: relType,
        }),
      })
      const data = await res.json()

      if (data.error) {
        setMessage({ text: data.error, type: "error" })
      } else {
        setMessage({ text: `Connected ${selected.title} → ${targetProfile.title} (${relType})`, type: "success" })
        setTargetProfile(null)
        setTargetSearch("")
        // Refresh vault to get updated connections
        const vaultRes = await fetch("/api/vault?refresh=true")
        const vaultData = await vaultRes.json()
        setProfiles(vaultData.profiles || [])
        // Re-select the profile with updated data
        const updated = (vaultData.profiles || []).find((p: Profile) => p.path === selected.path)
        if (updated) setSelected(updated)
      }
    } catch {
      setMessage({ text: "Failed to save connection", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const removeConnection = async (name: string, type: RelType) => {
    if (!selected) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/relationships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourcePath: selected.path,
          targetTitle: name,
          relationshipType: type,
        }),
      })
      const data = await res.json()

      if (data.error) {
        setMessage({ text: data.error, type: "error" })
      } else {
        setMessage({ text: `Removed ${name} from ${type}`, type: "success" })
        const vaultRes = await fetch("/api/vault?refresh=true")
        const vaultData = await vaultRes.json()
        setProfiles(vaultData.profiles || [])
        const updated = (vaultData.profiles || []).find((p: Profile) => p.path === selected.path)
        if (updated) setSelected(updated)
      }
    } catch {
      setMessage({ text: "Failed to remove connection", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Relationship Mapper</h1>
        <p className="text-[10px] text-[var(--color-text-dim)]">
          Build connections between profiles — related, donors, opposes
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Profile selector + existing connections */}
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Search for a profile to map connections..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (!e.target.value) setSelected(null)
              }}
              className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
            />
            {searchResults.length > 0 && !selected && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.path}
                    onClick={() => { setSelected(p); setSearch(p.title) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: readinessColor(p.contentReadiness) }} />
                    <span className="text-xs text-[var(--color-text)] flex-1">{p.title}</span>
                    <span className="text-[8px]" style={{ color: typeColor(p.type) }}>{p.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected profile + connections */}
          {selected ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: `${typeColor(selected.type)}15`, color: typeColor(selected.type) }}>
                  {selected.title[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text)]">{selected.title}</h3>
                  <span className="text-[9px]" style={{ color: typeColor(selected.type) }}>{selected.type}</span>
                </div>
                <button
                  onClick={() => { setSelected(null); setSearch("") }}
                  className="ml-auto text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Existing connections */}
              <h4 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">
                Connections ({connections.length})
              </h4>

              {connections.length === 0 ? (
                <p className="text-[10px] text-[var(--color-text-dim)] py-4">No connections yet</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {connections.map((conn, i) => {
                    const rt = REL_TYPES.find((r) => r.id === conn.type)!
                    return (
                      <div key={`${conn.type}-${conn.name}-${i}`} className="flex items-center gap-2 p-2 bg-[var(--color-bg)] rounded group">
                        <span
                          className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded w-16 text-center flex-shrink-0"
                          style={{ color: rt.color, backgroundColor: `${rt.color}15` }}
                        >
                          {conn.type}
                        </span>
                        <span className="text-[11px] text-[var(--color-text)] flex-1">{conn.name}</span>
                        <button
                          onClick={() => removeConnection(conn.name, conn.type)}
                          className="text-[var(--color-red)] opacity-0 group-hover:opacity-100 transition-opacity text-[9px] px-1.5 py-0.5 rounded hover:bg-[var(--color-red)]/10"
                          disabled={saving}
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
              <svg className="w-8 h-8 mx-auto mb-3 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-xs text-[var(--color-text-dim)]">Search for a profile to view and edit its connections</p>
            </div>
          )}
        </div>

        {/* Right: Add connection */}
        <div>
          {selected ? (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5">
              <h3 className="text-xs font-bold text-[var(--color-text)] mb-4">Add Connection</h3>

              {/* Relationship type */}
              <div className="mb-4">
                <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-2">Connection Type</label>
                <div className="space-y-1.5">
                  {REL_TYPES.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => setRelType(rt.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        relType === rt.id
                          ? "border-current bg-current/5"
                          : "border-[var(--color-border)] hover:border-[var(--color-text-dim)]"
                      }`}
                      style={{ color: relType === rt.id ? rt.color : "var(--color-text-dim)" }}
                    >
                      <div
                        className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                          relType === rt.id ? "bg-current border-current" : "border-[var(--color-border)]"
                        }`}
                        style={relType === rt.id ? { borderColor: rt.color, backgroundColor: rt.color } : {}}
                      />
                      <div>
                        <span className="text-[11px] font-bold block" style={{ color: relType === rt.id ? rt.color : "var(--color-text)" }}>
                          {rt.label}
                        </span>
                        <span className="text-[9px]" style={{ color: "var(--color-text-dim)" }}>{rt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target search */}
              <div className="relative mb-4">
                <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">Connect To</label>
                <input
                  type="text"
                  placeholder="Search for target profile..."
                  value={targetSearch}
                  onChange={(e) => {
                    setTargetSearch(e.target.value)
                    if (!e.target.value) setTargetProfile(null)
                  }}
                  className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
                />
                {targetProfile && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-green)]" />
                    <span className="text-[10px] text-[var(--color-green)]">{targetProfile.title}</span>
                  </div>
                )}
                {targetResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto">
                    {targetResults.map((p) => (
                      <button
                        key={p.path}
                        onClick={() => { setTargetProfile(p); setTargetSearch(p.title) }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-hover)] text-xs border-b border-[var(--color-border)] last:border-0"
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: typeColor(p.type) }} />
                        <span className="text-[var(--color-text)] flex-1">{p.title}</span>
                        <span className="text-[8px]" style={{ color: typeColor(p.type) }}>{p.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              {targetProfile && (
                <div className="mb-4 p-3 bg-[var(--color-bg)] rounded-lg">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-bold text-[var(--color-text)]">{selected.title}</span>
                    <span className="px-2 py-0.5 rounded text-[8px]" style={{
                      color: REL_TYPES.find((r) => r.id === relType)!.color,
                      backgroundColor: `${REL_TYPES.find((r) => r.id === relType)!.color}15`,
                    }}>
                      {relType === "opposes" ? "opposes" : relType === "donors" ? "funded by" : "related to"}
                    </span>
                    <span className="font-bold text-[var(--color-text)]">{targetProfile.title}</span>
                  </div>
                </div>
              )}

              {/* Save button */}
              <button
                onClick={addConnection}
                disabled={saving || !targetProfile}
                className="w-full flex items-center justify-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2.5 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40"
              >
                {saving ? "Saving to vault..." : "Add Connection"}
              </button>

              {/* Message */}
              {message && (
                <div className={`mt-3 text-[10px] text-center ${message.type === "success" ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                  {message.text}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
              <p className="text-xs text-[var(--color-text-dim)]">Select a profile first to add connections</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
