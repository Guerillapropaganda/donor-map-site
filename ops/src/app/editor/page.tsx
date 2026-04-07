"use client"

import { useState, useEffect } from "react"
import matter from "gray-matter"
import type { Profile } from "@/lib/vault"
import { typeColor, readinessColor } from "@/lib/vault"

export default function EditorPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Editor state
  const [rawContent, setRawContent] = useState("")
  const [frontmatter, setFrontmatter] = useState<Record<string, string>>({})
  const [body, setBody] = useState("")
  const [loadingFile, setLoadingFile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch("/api/vault")
      .then((r) => r.json())
      .then((d) => { setProfiles(d.profiles || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const searchResults = search.length >= 2
    ? profiles.filter((p) => p.title.toLowerCase().includes(search.toLowerCase())).slice(0, 12)
    : []

  const loadProfile = async (profile: Profile) => {
    setSelected(profile)
    setSearch(profile.title)
    setLoadingFile(true)
    setMessage(null)
    setConfirmDelete(false)

    try {
      const res = await fetch(`/api/profile?path=${encodeURIComponent(profile.path)}`)
      const data = await res.json()
      if (data.raw) {
        setRawContent(data.raw)
        const parsed = matter(data.raw)
        const fm: Record<string, string> = {}
        for (const [k, v] of Object.entries(parsed.data)) {
          fm[k] = String(v ?? "")
        }
        setFrontmatter(fm)
        setBody(parsed.content)
        setDirty(false)
      }
    } catch {
      setMessage({ text: "Failed to load file", type: "error" })
    } finally {
      setLoadingFile(false)
    }
  }

  const updateField = (key: string, value: string) => {
    setFrontmatter((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const addField = () => {
    const key = prompt("Field name (e.g. lobbying-spend):")
    if (key && !frontmatter[key]) {
      setFrontmatter((prev) => ({ ...prev, [key]: "" }))
    }
  }

  const removeField = (key: string) => {
    setFrontmatter((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setDirty(true)
  }

  const save = async () => {
    if (!selected) return
    setSaving(true)
    setMessage(null)

    // Rebuild the markdown
    const fmClean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(frontmatter)) {
      if (v === "") continue
      // Try to preserve numbers
      if (/^\d+$/.test(v)) fmClean[k] = parseInt(v)
      else if (/^\d+\.\d+$/.test(v)) fmClean[k] = parseFloat(v)
      else fmClean[k] = v
    }

    const content = matter.stringify(body, fmClean)

    try {
      const res = await fetch("/api/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected.path, content }),
      })
      const data = await res.json()
      if (data.error) {
        setMessage({ text: data.error, type: "error" })
      } else {
        setMessage({ text: "Saved and committed to v4", type: "success" })
        setDirty(false)
      }
    } catch {
      setMessage({ text: "Failed to save", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const deleteProfile = async () => {
    if (!selected) return
    setDeleting(true)

    try {
      const res = await fetch("/api/edit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selected.path }),
      })
      const data = await res.json()
      if (data.error) {
        setMessage({ text: data.error, type: "error" })
      } else {
        setMessage({ text: `Deleted: ${selected.title}`, type: "success" })
        setSelected(null)
        setSearch("")
        setFrontmatter({})
        setBody("")
      }
    } catch {
      setMessage({ text: "Failed to delete", type: "error" })
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text)]">Profile Editor</h1>
        <p className="text-[10px] text-[var(--color-text-dim)]">
          Edit any profile&apos;s frontmatter and content — saves directly to v4
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search for a profile to edit..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!e.target.value) { setSelected(null); setFrontmatter({}); setBody("") }
          }}
          className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
        />
        {searchResults.length > 0 && !selected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-64 overflow-y-auto">
            {searchResults.map((p) => (
              <button
                key={p.path}
                onClick={() => loadProfile(p)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--color-bg-hover)] border-b border-[var(--color-border)] last:border-0"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: readinessColor(p.contentReadiness) }} />
                <span className="text-xs text-[var(--color-text)] flex-1">{p.title}</span>
                <span className="text-[8px]" style={{ color: typeColor(p.type) }}>{p.type}</span>
                <span className="text-[8px] text-[var(--color-text-dim)]">{p.contentReadiness}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      {selected && !loadingFile ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Frontmatter editor */}
          <div className="xl:col-span-1">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Frontmatter</h3>
                <button
                  onClick={addField}
                  className="text-[9px] text-[var(--color-steel)] hover:underline"
                >
                  + Add Field
                </button>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {Object.entries(frontmatter).map(([key, value]) => (
                  <div key={key} className="group">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[8px] uppercase tracking-wider text-[var(--color-text-dim)]">{key}</label>
                      <button
                        onClick={() => removeField(key)}
                        className="text-[var(--color-red)] opacity-0 group-hover:opacity-100 text-[8px] hover:underline"
                      >
                        remove
                      </button>
                    </div>
                    {key === "content-readiness" ? (
                      <select
                        value={value}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[10px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
                      >
                        <option value="raw">raw</option>
                        <option value="draft">draft</option>
                        <option value="developed">developed</option>
                        <option value="verified">verified</option>
                        <option value="ready">ready</option>
                      </select>
                    ) : value.length > 80 ? (
                      <textarea
                        value={value}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[10px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)] min-h-[60px] resize-y"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateField(key, e.target.value)}
                        className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[10px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)]"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Body editor */}
          <div className="xl:col-span-2">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] mb-2">Content</h3>
              <textarea
                value={body}
                onChange={(e) => { setBody(e.target.value); setDirty(true) }}
                className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[11px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)] min-h-[50vh] resize-y font-mono leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Action bar */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-6 py-2.5 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40"
              >
                {saving ? "Saving..." : dirty ? "Save to Vault" : "No Changes"}
              </button>

              <span className="text-[9px] text-[var(--color-text-dim)] flex-1">{selected.path}</span>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[10px] text-[var(--color-red)]/60 hover:text-[var(--color-red)] transition-colors"
                >
                  Delete Profile
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--color-red)]">Are you sure?</span>
                  <button
                    onClick={deleteProfile}
                    disabled={deleting}
                    className="text-[10px] px-3 py-1 rounded bg-[var(--color-red)]/15 text-[var(--color-red)] border border-[var(--color-red)]/30 hover:bg-[var(--color-red)]/25"
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {message && (
                <span className={`text-[10px] ${message.type === "success" ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                  {message.text}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : loadingFile ? (
        <div className="py-16 text-center text-xs text-[var(--color-text-dim)] animate-pulse">Loading profile...</div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <svg width={32} height={32} className="mx-auto mb-3 text-[var(--color-text-dim)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={0.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-xs text-[var(--color-text-dim)]">Search for any profile to edit its frontmatter and content</p>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">Changes save directly to v4 and deploy automatically</p>
        </div>
      )}
    </div>
  )
}
