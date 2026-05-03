"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"

/**
 * Live + local editor for beat-page source.
 *
 * Workflow:
 *   1. Loads the prototype HTML file via GET /api/beat-source?slug=X
 *   2. Renders it in a monospace textarea so David can rewrite
 *      sections / fix typos / restructure
 *   3. "Save" button — POST /api/beat-source?slug=X — writes file
 *      locally (LIVE on localhost:8096, but NOT yet deployed)
 *   4. "Publish" button — POST /api/beat-source/publish?slug=X —
 *      git add + commit + push, triggers GitHub Actions deploy
 *
 * Two-step model so David can iterate freely without spam-deploying
 * every keystroke. Save = local visible. Publish = goes live in 3-4min.
 */

interface SourceState {
  source: string
  prototype: string
  contentPath: string
  contentDeployable: boolean
  bytes: number
  lastModified: string | null
  loadedAt: string
}

export default function EditBeatSourcePage() {
  const params = useParams()
  const router = useRouter()
  const slug = String(params?.slug ?? "")

  const [state, setState] = useState<SourceState | null>(null)
  const [edited, setEdited] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [dirty, setDirty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ───── Load source ─────
  useEffect(() => {
    if (!slug) return
    setLoading(true)
    fetch(`/api/beat-source?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "load failed" }))
          throw new Error(err.error || `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((data) => {
        setState({
          source: data.source,
          prototype: data.prototype,
          contentPath: data.contentPath,
          contentDeployable: data.contentDeployable,
          bytes: data.bytes,
          lastModified: data.lastModified,
          loadedAt: new Date().toISOString(),
        })
        setEdited(data.source)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e.message || e))
        setLoading(false)
      })
  }, [slug])

  // ───── Save handler ─────
  async function save() {
    if (!state) return
    setSaving(true)
    setStatus("")
    setError("")
    try {
      const res = await fetch(`/api/beat-source?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: edited }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "save failed" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setState((s) => (s ? { ...s, source: edited, bytes: edited.length, lastModified: data.savedAt } : s))
      setDirty(false)
      setStatus(`Saved (${data.bytes.toLocaleString()} bytes) → ${data.files.length} files updated locally. Refresh prototype/8096 to see changes.`)
    } catch (e: any) {
      setError(`Save failed: ${e.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  // ───── Publish handler ─────
  async function publish() {
    if (!state) return
    if (dirty) {
      setError("You have unsaved changes. Save first, then publish.")
      return
    }
    if (!confirm(`Publish ${slug} to live site? This commits + pushes to origin/v4 and deploys via GitHub Actions in ~3-4 min.`)) {
      return
    }
    setPublishing(true)
    setStatus("")
    setError("")
    try {
      const res = await fetch(`/api/beat-source/publish?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "publish failed" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      if (!data.ok) {
        setStatus(`No commit: ${data.message}`)
      } else {
        setStatus(`✓ Published ${data.sha}: ${data.message} · ${data.deployStatus}`)
      }
    } catch (e: any) {
      setError(`Publish failed: ${e.message || e}`)
    } finally {
      setPublishing(false)
    }
  }

  // ───── Section jump (parse h2/h1 from edited content) ─────
  const sections = (() => {
    const matches: { label: string; pos: number }[] = []
    const regex = /<h([12])[^>]*>([\s\S]*?)<\/h\1>/gi
    let m
    while ((m = regex.exec(edited)) !== null) {
      const text = m[2].replace(/<[^>]+>/g, "").trim()
      if (text) matches.push({ label: text.slice(0, 80), pos: m.index })
    }
    return matches.slice(0, 30)
  })()

  function jumpTo(pos: number) {
    if (!textareaRef.current) return
    textareaRef.current.focus()
    textareaRef.current.setSelectionRange(pos, pos)
    // Scroll: rough heuristic via text height
    const lineHeight = 18
    const linesBefore = edited.slice(0, pos).split("\n").length
    textareaRef.current.scrollTop = (linesBefore - 5) * lineHeight
  }

  // ───── Render ─────
  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily: "monospace" }}>
        Loading source for slug "{slug}"...
      </div>
    )
  }

  if (error && !state) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#e63946", fontFamily: "monospace", marginBottom: 12 }}>
          Error: {error}
        </div>
        <Link href={`/active-beat/${slug}`} style={{ color: "#1d4ed8" }}>
          ← Back to workspace
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, height: "calc(100vh - 32px)", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Link href={`/active-beat/${slug}`} style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 13 }}>
          ← /active-beat/{slug}
        </Link>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          Edit Source · {slug}
        </h1>
        <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {state?.prototype.split(/[\\/]/).slice(-2).join("/")}
        </code>
        {dirty && (
          <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            UNSAVED
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          onClick={save}
          disabled={saving || !dirty}
          style={{
            padding: "8px 14px",
            background: dirty ? "#1d4ed8" : "#374151",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            cursor: saving || !dirty ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          {saving ? "SAVING..." : "SAVE LOCAL"}
        </button>
        <button
          onClick={publish}
          disabled={publishing || dirty}
          style={{
            padding: "8px 14px",
            background: dirty ? "#737373" : "#16a34a",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            cursor: publishing || dirty ? "not-allowed" : "pointer",
            opacity: publishing ? 0.6 : 1,
            fontSize: 12,
            letterSpacing: 1,
          }}
          title={dirty ? "Save first, then publish" : "Commit + push + deploy"}
        >
          {publishing ? "PUBLISHING..." : "PUBLISH LIVE"}
        </button>
        <a
          href={`http://localhost:8096/${slug === "index" ? "home" : slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 14px",
            background: "#1f2937",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 12,
            letterSpacing: 1,
            border: "1px solid #374151",
          }}
        >
          Preview prototype ↗
        </a>
        <a
          href={`https://thedonormap.org/${slug === "index" ? "" : slug + "/"}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "8px 14px",
            background: "#1f2937",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 12,
            letterSpacing: 1,
            border: "1px solid #374151",
          }}
        >
          Live ↗
        </a>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "monospace" }}>
          {edited.length.toLocaleString()} bytes · {edited.split("\n").length} lines
        </span>
      </div>

      {/* Status / error strip */}
      {status && (
        <div
          style={{
            background: "rgba(22, 163, 74, 0.12)",
            border: "1px solid #16a34a",
            padding: "8px 12px",
            fontSize: 12,
            color: "#16a34a",
          }}
        >
          {status}
        </div>
      )}
      {error && (
        <div
          style={{
            background: "rgba(230, 57, 70, 0.12)",
            border: "1px solid #e63946",
            padding: "8px 12px",
            fontSize: 12,
            color: "#e63946",
          }}
        >
          {error}
        </div>
      )}

      {/* Main editor area: section jumper + textarea */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        {/* Section jumper */}
        <div
          style={{
            background: "var(--color-bg-secondary)",
            border: "1px solid var(--color-border)",
            padding: 12,
            overflowY: "auto",
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              color: "var(--color-text-muted)",
              marginBottom: 8,
            }}
          >
            JUMP TO SECTION
          </div>
          {sections.length === 0 ? (
            <div style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
              (no h1 / h2 found)
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => jumpTo(s.pos)}
                  style={{
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    color: "var(--color-text)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "4px 0",
                    borderBottom: "1px dotted var(--color-border)",
                    fontFamily: "inherit",
                    lineHeight: 1.3,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#1d4ed8"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--color-text)"
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={edited}
          onChange={(e) => {
            setEdited(e.target.value)
            setDirty(e.target.value !== state?.source)
            setStatus("")
          }}
          spellCheck={false}
          style={{
            width: "100%",
            height: "100%",
            fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
            fontSize: 13,
            lineHeight: 1.5,
            padding: 12,
            background: "#0f172a",
            color: "#e5e7eb",
            border: "1px solid var(--color-border)",
            resize: "none",
            outline: "none",
            tabSize: 2,
          }}
          onKeyDown={(e) => {
            // Cmd/Ctrl+S → save
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault()
              if (dirty && !saving) save()
            }
            // Tab → insert tab (default behavior loses focus)
            if (e.key === "Tab") {
              e.preventDefault()
              const ta = textareaRef.current
              if (!ta) return
              const start = ta.selectionStart
              const end = ta.selectionEnd
              const newValue = edited.slice(0, start) + "  " + edited.slice(end)
              setEdited(newValue)
              setDirty(true)
              // restore caret
              setTimeout(() => {
                if (ta) ta.setSelectionRange(start + 2, start + 2)
              }, 0)
            }
          }}
        />
      </div>
    </div>
  )
}
