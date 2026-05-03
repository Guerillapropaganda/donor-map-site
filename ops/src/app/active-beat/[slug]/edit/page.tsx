"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

/**
 * Live + local WYSIWYG editor for beat-page source.
 *
 * Renders the prototype HTML inside an iframe (via srcdoc) with an
 * injected editor script that makes the article-header and
 * article-body contenteditable. David clicks any prose text and
 * types — same-origin postMessage extracts the modified HTML back
 * to the parent for saving.
 *
 * SAVE writes the file locally (visible at localhost:8096 immediately,
 * but NOT yet deployed). PUBLISH commits + pushes (deploys via
 * GitHub Actions in ~3-4 min).
 *
 * What's editable: anything inside .article-header-inner or
 * .article-body-inner (h1, deck, body prose, sources, methodology,
 * tip box). What's NOT editable: nav, hero SVG, footer, page
 * structure. Edit the raw HTML for those via the source toggle.
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

// Script injected into the iframe to enable contenteditable + postMessage
const EDITOR_INIT_SCRIPT = `
<script>
(function() {
  // Make the article header + body editable. Leave nav, hero SVG, footer alone.
  const editable = document.querySelectorAll(
    '.article-header-inner, .article-body-inner'
  );
  editable.forEach(el => {
    el.setAttribute('contenteditable', 'true');
    el.style.outline = 'none';
  });

  // Visual hint: hovering an editable region gets a subtle highlight.
  const style = document.createElement('style');
  style.textContent = \`
    [contenteditable="true"]:hover {
      outline: 1px dashed rgba(29,78,216,0.4) !important;
      outline-offset: 4px !important;
    }
    [contenteditable="true"]:focus {
      outline: 2px solid #1d4ed8 !important;
      outline-offset: 4px !important;
    }
  \`;
  document.head.appendChild(style);

  // Track dirty state — emit on first input.
  let dirty = false;
  document.addEventListener('input', () => {
    if (!dirty) {
      dirty = true;
      window.parent.postMessage({type: 'BEAT_EDITOR_DIRTY'}, '*');
    }
  });

  // Listen for parent commands.
  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'BEAT_EDITOR_GET_HTML') {
      // Strip contenteditable attr + injected script + style before returning
      const clone = document.documentElement.cloneNode(true);
      const editables = clone.querySelectorAll('[contenteditable]');
      editables.forEach(el => el.removeAttribute('contenteditable'));
      // Remove ALL style elements added by editor (they were appended last,
      // so the last style element is ours). Match by content sentinel.
      const styles = clone.querySelectorAll('style');
      styles.forEach(s => {
        if (s.textContent && s.textContent.indexOf('contenteditable') !== -1) {
          s.remove();
        }
      });
      // Remove the editor init script (the last <script> in <body>)
      const scripts = clone.querySelectorAll('script');
      scripts.forEach(s => {
        if (s.textContent && s.textContent.indexOf('BEAT_EDITOR_GET_HTML') !== -1) {
          s.remove();
        }
      });
      const html = '<!DOCTYPE html>\\n' + clone.outerHTML;
      e.source.postMessage({type: 'BEAT_EDITOR_HTML', html: html}, '*');
    }
    if (e.data.type === 'BEAT_EDITOR_RESET_DIRTY') {
      dirty = false;
    }
  });

  // Tell parent we're ready.
  window.parent.postMessage({type: 'BEAT_EDITOR_READY'}, '*');
})();
</script>
`

export default function EditBeatSourcePage() {
  const params = useParams()
  const slug = String(params?.slug ?? "")

  const [state, setState] = useState<SourceState | null>(null)
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [status, setStatus] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [dirty, setDirty] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [rawSource, setRawSource] = useState<string>("")
  const iframeRef = useRef<HTMLIFrameElement>(null)

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
        setRawSource(data.source)
        // Inject editor init script before </body>
        const injected = data.source.replace(
          /<\/body>/i,
          EDITOR_INIT_SCRIPT + "\n</body>",
        )
        setIframeSrcDoc(injected)
        setLoading(false)
      })
      .catch((e) => {
        setError(String(e.message || e))
        setLoading(false)
      })
  }, [slug])

  // ───── Listen for messages from iframe ─────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return
      if (e.data.type === "BEAT_EDITOR_DIRTY") {
        setDirty(true)
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  // ───── Get current HTML from iframe (Promise wrapper) ─────
  function getCurrentHtmlFromIframe(): Promise<string> {
    return new Promise((resolve, reject) => {
      const iframe = iframeRef.current
      if (!iframe || !iframe.contentWindow) {
        reject(new Error("iframe not ready"))
        return
      }
      const timeout = setTimeout(() => {
        window.removeEventListener("message", handler)
        reject(new Error("iframe did not respond within 3s"))
      }, 3000)
      function handler(e: MessageEvent) {
        if (e.data && e.data.type === "BEAT_EDITOR_HTML" && typeof e.data.html === "string") {
          clearTimeout(timeout)
          window.removeEventListener("message", handler)
          resolve(e.data.html)
        }
      }
      window.addEventListener("message", handler)
      iframe.contentWindow.postMessage({ type: "BEAT_EDITOR_GET_HTML" }, "*")
    })
  }

  // ───── Save handler ─────
  async function save() {
    if (!state) return
    setSaving(true)
    setStatus("")
    setError("")
    try {
      // Get the current HTML from the iframe (reflects all WYSIWYG edits)
      const sourceToSave = showSource ? rawSource : await getCurrentHtmlFromIframe()
      const res = await fetch(`/api/beat-source?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: sourceToSave }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "save failed" }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setState((s) =>
        s ? { ...s, source: sourceToSave, bytes: sourceToSave.length, lastModified: data.savedAt } : s,
      )
      setRawSource(sourceToSave)
      setDirty(false)
      // Tell iframe to reset its dirty flag.
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: "BEAT_EDITOR_RESET_DIRTY" }, "*")
      }
      setStatus(
        `Saved (${data.bytes.toLocaleString()} bytes) → ${data.files.length} files updated locally. Refresh prototype/8096 to verify.`,
      )
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
    if (
      !confirm(
        `Publish ${slug} to live site? This commits + pushes to origin/v4 and deploys via GitHub Actions in ~3-4 min.`,
      )
    ) {
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

  // ───── Toggle source view ─────
  async function toggleSourceView() {
    if (!showSource) {
      // Switching FROM wysiwyg TO source — pull current HTML from iframe
      try {
        const html = await getCurrentHtmlFromIframe()
        setRawSource(html)
        setShowSource(true)
      } catch (e: any) {
        setError(`Could not extract HTML: ${e.message || e}`)
      }
    } else {
      // Switching FROM source TO wysiwyg — re-inject and reload iframe
      const injected = rawSource.replace(/<\/body>/i, EDITOR_INIT_SCRIPT + "\n</body>")
      setIframeSrcDoc(injected)
      setShowSource(false)
    }
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
    <div
      style={{
        padding: 16,
        height: "calc(100vh - 32px)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Link
          href={`/active-beat/${slug}`}
          style={{ color: "#1d4ed8", fontWeight: 700, fontSize: 13 }}
        >
          ← /active-beat/{slug}
        </Link>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          Edit · {slug}
        </h1>
        <code style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {state?.prototype.split(/[\\/]/).slice(-2).join("/")}
        </code>
        {dirty && (
          <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
            UNSAVED
          </span>
        )}
        <span style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            background: "rgba(29, 78, 216, 0.12)",
            border: "1px solid #1d4ed8",
            padding: "3px 8px",
            fontStyle: "italic",
          }}
        >
          Click any prose to edit. SVG hero + nav + footer are not editable here.
        </span>
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
        <button
          onClick={toggleSourceView}
          style={{
            padding: "8px 14px",
            background: showSource ? "#fbbf24" : "#1f2937",
            color: showSource ? "#0a0a0a" : "#fff",
            fontWeight: 700,
            border: "1px solid #374151",
            cursor: "pointer",
            fontSize: 12,
            letterSpacing: 1,
          }}
          title="Toggle between rendered preview and raw HTML"
        >
          {showSource ? "WYSIWYG" : "SOURCE"}
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
          Prototype ↗
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

      {/* Main area: WYSIWYG iframe OR raw HTML textarea */}
      {showSource ? (
        <textarea
          value={rawSource}
          onChange={(e) => {
            setRawSource(e.target.value)
            setDirty(e.target.value !== state?.source)
            setStatus("")
          }}
          spellCheck={false}
          style={{
            width: "100%",
            flex: 1,
            minHeight: 0,
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
        />
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcDoc}
          sandbox="allow-same-origin allow-scripts"
          style={{
            width: "100%",
            flex: 1,
            minHeight: 0,
            border: "1px solid var(--color-border)",
            background: "#fff",
          }}
        />
      )}
    </div>
  )
}
