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
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit")

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

  // Simple markdown to HTML renderer
  function renderMarkdown(md: string): string {
    let html = md
      // Escape HTML
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      // Headers
      .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:bold;color:#e4e4e7;margin:16px 0 8px;">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:16px;font-weight:bold;color:#e4e4e7;margin:20px 0 10px;border-bottom:1px solid #2a2a35;padding-bottom:6px;">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="font-size:18px;font-weight:bold;color:#e4e4e7;margin:20px 0 12px;">$1</h1>')
      // Bold + italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e4e4e7;">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Strikethrough
      .replace(/~~(.+?)~~/g, '<del style="opacity:0.5;">$1</del>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#5b8dce;text-decoration:underline;" target="_blank">$1</a>')
      // Wikilinks
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<span style="color:#5b8dce;border-bottom:1px dashed #5b8dce;">$2</span>')
      .replace(/\[\[([^\]]+)\]\]/g, '<span style="color:#5b8dce;border-bottom:1px dashed #5b8dce;">$1</span>')
      // Callouts
      .replace(/&gt; \[!(\w+)\]\s*(.+)/g, '<div style="border-left:3px solid #5b8dce;padding:8px 12px;margin:8px 0;background:#5b8dce10;border-radius:0 6px 6px 0;"><strong style="color:#5b8dce;">$1:</strong> $2</div>')
      // Blockquotes
      .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #2a2a35;padding-left:12px;color:#7a7a86;margin:8px 0;">$1</blockquote>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc;margin-bottom:4px;">$1</li>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #2a2a35;margin:16px 0;">')
      // Tags
      .replace(/#(\w[\w-]*)/g, '<span style="color:#f59e0b;font-size:10px;">#$1</span>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')

    return html
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

          {/* Body editor + preview */}
          <div className="xl:col-span-2">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-4">
              {/* View mode toggle */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">Content</h3>
                <div className="flex gap-1 bg-[var(--color-bg)] rounded p-0.5">
                  {(["edit", "split", "preview"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`text-[9px] px-2.5 py-1 rounded transition-all ${
                        viewMode === mode
                          ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
                          : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {mode === "edit" ? "Edit" : mode === "split" ? "Split" : "Preview"}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`flex gap-3 ${viewMode === "split" ? "" : ""}`}>
                {/* Editor pane */}
                {(viewMode === "edit" || viewMode === "split") && (
                  <textarea
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setDirty(true) }}
                    className={`bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[11px] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-steel)] min-h-[50vh] resize-y font-mono leading-relaxed ${
                      viewMode === "split" ? "w-1/2" : "w-full"
                    }`}
                    spellCheck={false}
                  />
                )}

                {/* Preview pane */}
                {(viewMode === "preview" || viewMode === "split") && (
                  <div
                    className={`bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 min-h-[50vh] overflow-y-auto prose-invert ${
                      viewMode === "split" ? "w-1/2" : "w-full"
                    }`}
                  >
                    <div
                      className="text-[12px] text-[var(--color-text)] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
                    />
                  </div>
                )}
              </div>
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
