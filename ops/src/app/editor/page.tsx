"use client"

/**
 * Profile Editor — ops/src/app/editor/page.tsx
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * RULES (do not violate when modifying this file)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * 1. FRONTMATTER-ONLY for structured fields.
 *    Fields like `content-readiness`, `type`, `source-tier`, `party`,
 *    `related`, `donors`, `opposes` are authoritative in YAML frontmatter
 *    only. NEVER write them as `field:: value` inline-dataview syntax in
 *    the body. See `content/Vault Rules.md` § Profile Schema.
 *    This editor serializes state via `matter.stringify(body, fm)` which
 *    writes frontmatter at the top and preserves the body verbatim — that
 *    is correct. Do not add code that injects structured fields into body.
 *
 * 2. URL editor-only (David). Neither Research Claude nor Code Claude
 *    hunts, replaces, or verifies source URLs. If this editor gains URL
 *    hunting / auto-fixing features, STOP and flag for David. URL triage
 *    lives in the URL Manager (`/urls`) and is David's manual workflow.
 *    See `content/Vault Rules.md` § URL Policy and CLAUDE.md.
 *
 * 3. Research Claude flags `editorial-result: verified-candidate`; only
 *    David signs off on `content-readiness: verified`. Do not wire any
 *    auto-promote-to-verified path into this editor.
 *
 * If a future feature conflicts with any of these rules, stop and ask
 * before implementing. These are load-bearing for the investigative
 * integrity of the site and have been re-learned the hard way.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import matter from "gray-matter"
import { PageHeader } from "@/components/PageHeader"
import type { Profile } from "@/lib/vault"
import { typeColor, readinessColor } from "@/lib/vault"
import { fetchVault } from "@/lib/vault-cache"
import PreviewServerToggle from "@/components/PreviewServerToggle"

const QUARTZ_PORT = 8080

// Convert a vault path to the URL slug Quartz produces for it.
// "content/Politicians/.../Bernie Sanders/_Bernie Sanders.md"
//   → "Politicians/.../Bernie-Sanders/_Bernie-Sanders"
function profilePathToSlug(profilePath: string): string {
  return profilePath
    .replace(/^content\//, "")
    .replace(/ /g, "-")
    .replace(/\.md$/, "")
}

export default function EditorPage() {
  const searchParams = useSearchParams()
  const initialProfile = searchParams.get("profile")

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
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split" | "live">("edit")
  const [autoLoaded, setAutoLoaded] = useState(false)
  const [previewServerRunning, setPreviewServerRunning] = useState(false)
  // Sticky flag: once we've seen the server actually serve a page, keep
  // the iframe mounted even if the next status poll times out. The
  // status route's port-probe is a 1.5s GET; it can transiently fail
  // when Quartz is mid-rebuild or busy serving a new page (which is
  // exactly when you'd be navigating the iframe). Without stickiness,
  // a single failed probe rips the iframe out from under you and the
  // user has to re-enter Live Site mode.
  const [iframeShouldRender, setIframeShouldRender] = useState(false)

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])

  // Initial preview server status — so the iframe loads immediately if
  // a prior session left it running, instead of briefly showing the
  // "Start" prompt on first switch to Live mode.
  useEffect(() => {
    fetch("/api/preview-server")
      .then((r) => r.json())
      .then((s) => {
        setPreviewServerRunning(!!s.running)
        if (s.running) setIframeShouldRender(true)
      })
      .catch(() => {})
  }, [])

  // Promote running → iframeShouldRender. Never demote: once we've
  // seen a healthy server, we keep showing the iframe even if a later
  // status probe transiently fails. Explicit Stop via the toggle
  // resets this (the toggle's onStatusChange fires after stop).
  useEffect(() => {
    if (previewServerRunning) setIframeShouldRender(true)
  }, [previewServerRunning])

  useEffect(() => {
    fetchVault()
      .then((d) => {
        const allProfiles = d.profiles || []
        setProfiles(allProfiles)
        setLoading(false)
        // Auto-load profile from URL param
        if (initialProfile && !autoLoaded) {
          const match = allProfiles.find((p: Profile) => p.path === initialProfile)
          if (match) {
            loadProfile(match)
            setAutoLoaded(true)
          }
        }
      })
      .catch(() => setLoading(false))
  }, [initialProfile, autoLoaded])

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

  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState("")

  const addField = () => {
    if (newFieldName && !frontmatter[newFieldName]) {
      setFrontmatter((prev) => ({ ...prev, [newFieldName]: "" }))
      setDirty(true)
      setNewFieldName("")
      setAddFieldOpen(false)
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

  // Local Quartz preview URL (the dev server managed by
  // PreviewServerToggle). Pixel-identical to what the live site would
  // render. Public URL kept separately as a fallback link below.
  function getLocalPreviewUrl(profilePath: string): string {
    return `http://localhost:${QUARTZ_PORT}/${profilePathToSlug(profilePath)}`
  }

  function getPublicLiveUrl(profilePath: string): string {
    return `https://thedonormap.org/${profilePathToSlug(profilePath)}`
  }

  // Simple markdown to HTML — no escaping since we control the input
  function renderMarkdown(md: string): string {
    const lines = md.split("\n")
    const output: string[] = []
    let inTable = false

    for (const line of lines) {
      // Skip frontmatter-like lines at top
      if (line.startsWith("---")) { output.push('<hr class="md-hr">'); continue }

      // Headers
      if (line.startsWith("### ")) { output.push(`<h3 class="md-h3">${processInline(line.slice(4))}</h3>`); continue }
      if (line.startsWith("## ")) { output.push(`<h2 class="md-h2">${processInline(line.slice(3))}</h2>`); continue }
      if (line.startsWith("# ")) { output.push(`<h1 class="md-h1">${processInline(line.slice(2))}</h1>`); continue }

      // Tables
      if (line.includes("|") && line.trim().startsWith("|")) {
        const cells = line.split("|").filter(Boolean).map((c) => c.trim())
        if (cells.every((c) => /^[-:]+$/.test(c))) continue // separator row
        if (!inTable) { output.push('<table class="md-table">'); inTable = true }
        const tag = !inTable ? "th" : "td"
        output.push("<tr>" + cells.map((c) => `<${tag} class="md-cell">${processInline(c)}</${tag}>`).join("") + "</tr>")
        continue
      }
      if (inTable) { output.push("</table>"); inTable = false }

      // Lists
      if (line.startsWith("- ")) { output.push(`<div class="md-li">${processInline(line.slice(2))}</div>`); continue }

      // Blockquotes / Callouts
      if (line.startsWith("> [!")) {
        const match = line.match(/> \[!(\w+)\]\s*(.*)/)
        if (match) { output.push(`<div class="md-callout"><span class="md-callout-type">${match[1]}</span> ${processInline(match[2])}</div>`); continue }
      }
      if (line.startsWith("> ")) { output.push(`<div class="md-quote">${processInline(line.slice(2))}</div>`); continue }

      // Empty line
      if (line.trim() === "") { output.push('<div class="md-spacer"></div>'); continue }

      // Regular paragraph
      output.push(`<p class="md-p">${processInline(line)}</p>`)
    }
    if (inTable) output.push("</table>")

    return output.join("")
  }

  function processInline(text: string): string {
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank">$1</a>')
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '<span class="md-wikilink">$2</span>')
      .replace(/\[\[([^\]]+)\]\]/g, '<span class="md-wikilink">$1</span>')
      .replace(/#(\w[\w-]*)/g, '<span class="md-tag">#$1</span>')
  }

  return (
    <div>
      <PageHeader
        title="Profile Editor"
        whatThisDoes="Edit any vault profile's frontmatter and body content directly. Saves go straight to v4 (with the pre-commit gates running). Frontmatter pane on the left for structured fields; markdown body on the right with live preview."
        action='Search for a profile, click to load. Frontmatter is the source of truth for structured fields — never edit those inline as body text. Save button commits + pushes (you confirm before push). For URL changes, use /urls instead (Editor-only policy).'
      />

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
                  onClick={() => setAddFieldOpen(true)}
                  className="text-[9px] text-[var(--color-steel)] hover:underline"
                >
                  + Add Field
                </button>
              </div>
              {/* Inline Add Field form */}
              {addFieldOpen && (
                <div className="mb-3 p-3 bg-[var(--color-bg)] border border-[var(--color-steel)]/30 rounded-lg">
                  <p className="text-[9px] text-[var(--color-text-dim)] mb-2">New field name:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. lobbying-spend"
                      value={newFieldName}
                      onChange={e => setNewFieldName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                      onKeyDown={e => { if (e.key === "Enter") addField(); if (e.key === "Escape") { setAddFieldOpen(false); setNewFieldName("") } }}
                      autoFocus
                      className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded px-2 py-1.5 text-[10px] text-[var(--color-text)] placeholder:text-[var(--color-text-dim)]/50 focus:outline-none focus:border-[var(--color-steel)]"
                    />
                    <button onClick={addField} disabled={!newFieldName || !!frontmatter[newFieldName]}
                      className="text-[9px] px-3 py-1.5 rounded bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 hover:bg-[var(--color-steel)]/25 disabled:opacity-50">
                      Add
                    </button>
                    <button onClick={() => { setAddFieldOpen(false); setNewFieldName("") }}
                      className="text-[9px] px-2 py-1.5 rounded text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
                      Cancel
                    </button>
                  </div>
                  {newFieldName && frontmatter[newFieldName] !== undefined && (
                    <p className="text-[8px] text-[var(--color-red)] mt-1">Field already exists</p>
                  )}
                </div>
              )}

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
                        <option value="raw">raw (D-F)</option>
                        <option value="draft">draft (C)</option>
                        <option value="ready">ready (B)</option>
                        <option value="verified">verified (A+)</option>
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
                  {(["edit", "split", "preview", "live"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`text-[9px] px-2.5 py-1 rounded transition-all ${
                        viewMode === mode
                          ? "bg-[var(--color-steel)]/15 text-[var(--color-steel)]"
                          : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                      }`}
                    >
                      {mode === "edit" ? "Edit" : mode === "split" ? "Split" : mode === "preview" ? "Preview" : "Live Site"}
                    </button>
                  ))}
                </div>
              </div>

              {viewMode === "live" ? (
                /* Live preview iframe — local Quartz dev server, pixel-
                   identical to what would render on thedonormap.org.
                   Wikilinks inside the iframe navigate within it, so
                   you can browse the whole site as a reader from here. */
                <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg overflow-hidden" style={{ height: "70vh" }}>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-card)] border-b border-[var(--color-border)]">
                    {iframeShouldRender ? (
                      <>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: previewServerRunning ? "var(--color-green)" : "var(--color-amber)" }}
                          title={previewServerRunning ? "Preview server responsive" : "Status probe missed — server may be busy"}
                        />
                        <span className="text-[9px] text-[var(--color-text-dim)] flex-1 truncate">
                          {getLocalPreviewUrl(selected.path)}
                        </span>
                        <a
                          href={getLocalPreviewUrl(selected.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[var(--color-steel)] hover:underline"
                          title="Open in new tab — browse the whole site as a reader"
                        >
                          Open in new tab
                        </a>
                        <span className="text-[9px] text-[var(--color-text-dim)]">·</span>
                        <a
                          href={getPublicLiveUrl(selected.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
                          title="The public URL — currently shows construction splash for non-public routes"
                        >
                          public URL
                        </a>
                        <span className="text-[9px] text-[var(--color-text-dim)]">·</span>
                        <PreviewServerToggle
                          compact
                          onStatusChange={(s) => {
                            setPreviewServerRunning(s.running)
                            // Explicit stop (no PID, no port, not starting) tears
                            // down the sticky iframe. Transient port misses while
                            // PID is alive don't.
                            if (!s.running && !s.starting && !s.pid) {
                              setIframeShouldRender(false)
                            }
                          }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[var(--color-text-dim)]" />
                        <span className="text-[9px] text-[var(--color-text-dim)] flex-1">
                          Preview server not running. Start it to see the live-site rendering.
                        </span>
                      </>
                    )}
                  </div>
                  {iframeShouldRender ? (
                    <iframe
                      src={getLocalPreviewUrl(selected.path)}
                      className="w-full border-0"
                      style={{ height: "calc(70vh - 32px)" }}
                      title="Live preview"
                    />
                  ) : (
                    <div
                      className="w-full flex items-center justify-center p-6"
                      style={{ height: "calc(70vh - 32px)" }}
                    >
                      <div className="max-w-md w-full">
                        <PreviewServerToggle
                          onStatusChange={(s) => {
                            setPreviewServerRunning(s.running)
                            if (s.running) setIframeShouldRender(true)
                          }}
                        />
                        <p className="text-[10px] text-[var(--color-text-dim)] mt-3 leading-relaxed">
                          The local preview server runs Quartz in dev mode on
                          port {QUARTZ_PORT}. First start takes 30s–2min while
                          the site builds; after that, every preview is
                          instant. You can leave it running across editor
                          sessions and stop it from this same toggle.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
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
                    <div className={`bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 min-h-[50vh] overflow-y-auto ${viewMode === "split" ? "w-1/2" : "w-full"}`}>
                      <style>{`
                        .md-h1 { font-size: 18px; font-weight: bold; color: #e4e4e7; margin: 20px 0 12px; }
                        .md-h2 { font-size: 16px; font-weight: bold; color: #e4e4e7; margin: 20px 0 10px; border-bottom: 1px solid #2a2a35; padding-bottom: 6px; }
                        .md-h3 { font-size: 14px; font-weight: bold; color: #e4e4e7; margin: 16px 0 8px; }
                        .md-p { font-size: 12px; color: #e4e4e7; line-height: 1.7; margin: 4px 0; }
                        .md-link { color: #5b8dce; text-decoration: underline; }
                        .md-wikilink { color: #5b8dce; border-bottom: 1px dashed #5b8dce; cursor: pointer; }
                        .md-tag { color: #f59e0b; font-size: 10px; background: rgba(245,158,11,0.1); padding: 1px 4px; border-radius: 3px; }
                        .md-li { font-size: 12px; color: #e4e4e7; margin-left: 16px; padding-left: 8px; border-left: 2px solid #2a2a35; margin-bottom: 4px; }
                        .md-quote { font-size: 12px; color: #7a7a86; border-left: 3px solid #2a2a35; padding-left: 12px; margin: 8px 0; }
                        .md-callout { border-left: 3px solid #5b8dce; padding: 8px 12px; margin: 8px 0; background: rgba(91,141,206,0.05); border-radius: 0 6px 6px 0; font-size: 12px; color: #e4e4e7; }
                        .md-callout-type { color: #5b8dce; font-weight: bold; text-transform: uppercase; font-size: 10px; margin-right: 4px; }
                        .md-hr { border: none; border-top: 1px solid #2a2a35; margin: 16px 0; }
                        .md-spacer { height: 12px; }
                        .md-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
                        .md-cell { border: 1px solid #2a2a35; padding: 6px 10px; color: #e4e4e7; }
                        del { opacity: 0.5; text-decoration: line-through; }
                        strong { color: #e4e4e7; }
                      `}</style>
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
                    </div>
                  )}
                </div>
              )}
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
