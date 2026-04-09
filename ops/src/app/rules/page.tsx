"use client"

import { useEffect, useState } from "react"

interface RuleDoc {
  name: string
  path: string
  content: string
  lastModified: string
  sizeKb: number
}

function timeAgo(iso: string): string {
  if (iso === "unknown") return "unknown"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDate(iso: string): string {
  if (iso === "unknown") return "unknown"
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Simple markdown renderer for display
function renderMarkdown(md: string): string {
  return md
    // Strip YAML frontmatter
    .replace(/^---[\s\S]*?---\n*/m, "")
    // Headers
    .replace(/^#{1} (.+)$/gm, '<h1 class="rules-h1">$1</h1>')
    .replace(/^#{2} (.+)$/gm, '<h2 class="rules-h2">$1</h2>')
    .replace(/^#{3} (.+)$/gm, '<h3 class="rules-h3">$1</h3>')
    .replace(/^#{4} (.+)$/gm, '<h4 class="rules-h4">$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="rules-code">$1</code>')
    // Code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="rules-pre">$1</pre>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (match) => {
      const cells = match.split("|").filter(Boolean).map((c) => c.trim())
      const row = cells.map((c) => `<td class="rules-td">${c}</td>`).join("")
      return `<tr>${row}</tr>`
    })
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="rules-hr" />')
    // List items
    .replace(/^- (.+)$/gm, '<li class="rules-li">$1</li>')
    // Line breaks
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>")
}

export default function RulesPage() {
  const [docs, setDocs] = useState<RuleDoc[]>([])
  const [activeDoc, setActiveDoc] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((data) => {
        setDocs(data.docs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const doc = docs[activeDoc]
  const filteredContent = doc
    ? search
      ? doc.content
          .split("\n")
          .filter((line) => line.toLowerCase().includes(search.toLowerCase()))
          .join("\n")
      : doc.content
    : ""

  // Count sections
  const sectionCount = doc
    ? (doc.content.match(/^#{1,3} /gm) || []).length
    : 0

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-lg font-bold tracking-wider"
            style={{ color: "var(--color-steel)" }}
          >
            Rules & System Docs
          </h1>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
            Read-only view of the documents both Claudes follow every session.
            Changes are tracked by timestamp.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-[var(--color-text-dim)] text-sm">Loading...</p>
      ) : (
        <>
          {/* Doc tabs */}
          <div className="flex gap-2 mb-4">
            {docs.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDoc(i)}
                className={`px-4 py-2 rounded-lg text-xs font-mono transition-all border ${
                  activeDoc === i
                    ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-steel)]/30"
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* Doc metadata bar */}
          {doc && (
            <div className="flex items-center gap-4 px-4 py-2 mb-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  File
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text)]">
                  {doc.path}
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--color-border)]" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Modified
                </span>
                <span className="text-[10px] font-mono text-[var(--color-amber)]">
                  {formatDate(doc.lastModified)}
                </span>
                <span className="text-[9px] text-[var(--color-text-dim)]">
                  ({timeAgo(doc.lastModified)})
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--color-border)]" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Size
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text)]">
                  {doc.sizeKb}KB
                </span>
              </div>
              <div className="w-px h-4 bg-[var(--color-border)]" />
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                  Sections
                </span>
                <span className="text-[10px] font-mono text-[var(--color-text)]">
                  {sectionCount}
                </span>
              </div>
              <div className="flex-1" />
              <input
                type="text"
                placeholder="Search in doc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1 text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:border-[var(--color-steel)] outline-none w-48"
              />
            </div>
          )}

          {/* Doc content */}
          {doc && (
            <div
              className="rules-content rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 280px)" }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(
                  search ? filteredContent : doc.content,
                ),
              }}
            />
          )}
        </>
      )}

      <style>{`
        .rules-content { font-family: 'Space Grotesk', sans-serif; font-size: 13px; line-height: 1.8; color: var(--color-text); }
        .rules-h1 { font-size: 22px; font-weight: 700; color: var(--color-steel); margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border); }
        .rules-h2 { font-size: 17px; font-weight: 700; color: var(--color-text); margin: 20px 0 10px; }
        .rules-h3 { font-size: 14px; font-weight: 700; color: var(--color-amber); margin: 16px 0 8px; }
        .rules-h4 { font-size: 13px; font-weight: 700; color: var(--color-text-dim); margin: 12px 0 6px; }
        .rules-code { font-family: 'Space Mono', monospace; font-size: 11px; background: var(--color-bg); padding: 2px 5px; border-radius: 3px; color: var(--color-green); }
        .rules-pre { font-family: 'Space Mono', monospace; font-size: 11px; background: var(--color-bg); padding: 12px 16px; border-radius: 6px; overflow-x: auto; margin: 8px 0; color: var(--color-text); border: 1px solid var(--color-border); white-space: pre-wrap; }
        .rules-hr { border: none; border-top: 1px solid var(--color-border); margin: 20px 0; }
        .rules-li { padding-left: 12px; position: relative; margin: 4px 0; }
        .rules-li::before { content: "—"; position: absolute; left: -4px; color: var(--color-steel); }
        .rules-td { padding: 6px 12px; border: 1px solid var(--color-border); font-size: 11px; }
        .rules-content tr:first-child .rules-td { font-weight: 700; background: var(--color-bg); }
        .rules-content strong { color: var(--color-text); }
        .rules-content em { color: var(--color-amber); font-style: normal; }
      `}</style>
    </div>
  )
}
