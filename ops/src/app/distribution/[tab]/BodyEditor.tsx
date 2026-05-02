"use client"

import { useState, useEffect, useRef } from "react"

/**
 * Editable freeform notes for the Algorithm tab.
 *
 * Loads the current body as initial value. POSTs the new body to
 * /api/distribution-schedule-body on Save. The dirty state is shown
 * inline so David knows whether the page reflects the file or his
 * unsaved edits.
 */

interface Props {
  initialBody: string
}

export function BodyEditor({ initialBody }: Props) {
  const [text, setText] = useState(initialBody)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const dirty = text !== initialBody

  // auto-grow the textarea to fit content
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto"
      taRef.current.style.height = taRef.current.scrollHeight + 4 + "px"
    }
  }, [text])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/distribution-schedule-body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`)
      } else {
        setSavedAt(new Date().toLocaleTimeString())
        // Update the "initial" baseline by reload after a tick so dirty resets cleanly
        setTimeout(() => window.location.reload(), 600)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (dirty && !confirm("Discard unsaved edits?")) return
    setText(initialBody)
    setError(null)
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            background: dirty && !saving ? "#16a34a" : "#1f2937",
            color: dirty && !saving ? "#fff" : "var(--color-text-dim)",
            padding: "8px 18px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            border: `1px solid ${dirty && !saving ? "#16a34a" : "#374151"}`,
            cursor: dirty && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving..." : "Save notes"}
        </button>
        <button
          onClick={handleReset}
          disabled={!dirty || saving}
          style={{
            background: "transparent",
            color: "var(--color-text-dim)",
            padding: "8px 12px",
            fontFamily: "var(--font-mono, monospace)",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            border: "1px solid #374151",
            cursor: dirty && !saving ? "pointer" : "not-allowed",
          }}
        >
          Reset
        </button>
        <span style={{ fontSize: "11px", color: dirty ? "#fbbf24" : "var(--color-text-dim)", fontFamily: "var(--font-mono, monospace)" }}>
          {dirty ? "● unsaved changes" : savedAt ? `saved at ${savedAt}` : "saved"}
        </span>
      </div>
      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={true}
        style={{
          width: "100%",
          minHeight: "240px",
          padding: "16px 20px",
          background: "rgba(31, 41, 55, 0.4)",
          color: "var(--color-text)",
          border: "1px solid #1f2937",
          borderRadius: 0,
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "12px",
          lineHeight: 1.7,
          resize: "vertical",
          outline: "none",
        }}
        placeholder="# Algorithm levers (long form)&#10;&#10;Write algorithm ideas, weekly review notes, things to test, things that worked, things that died."
      />
      {error && (
        <div style={{ marginTop: "8px", padding: "8px 12px", background: "rgba(230, 57, 70, 0.1)", border: "1px solid #e63946", color: "#e63946", fontSize: "12px" }}>
          Save failed: {error}
        </div>
      )}
    </div>
  )
}
