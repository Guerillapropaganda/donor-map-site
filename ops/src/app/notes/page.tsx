"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { AdminNote, NoteKind } from "@/lib/notes"
import {
  NOTE_TYPE_COLORS,
  NOTE_TYPE_LABELS,
  STATUS_COLORS,
  NOTE_KIND_LABELS,
  NOTE_KIND_DESCRIPTIONS,
} from "@/lib/notes"
import type { Profile } from "@/lib/vault"
import { typeColor, readinessColor } from "@/lib/vault"
import { fetchVault } from "@/lib/vault-cache"

// Notes longer than this preview threshold collapse by default with a
// "Show more" toggle. Long ops briefs and research dumps would
// otherwise blow out the list and bury everything below them.
const NOTE_COLLAPSE_CHARS = 400

interface NoteBodyProps {
  text: string
  expanded: boolean
  onToggle: () => void
}

function NoteBody({ text, expanded, onToggle }: NoteBodyProps) {
  const isLong = text.length > NOTE_COLLAPSE_CHARS
  const visible = !isLong || expanded ? text : text.slice(0, NOTE_COLLAPSE_CHARS).trimEnd() + "…"
  return (
    <div className="text-[11px] text-[var(--color-text)] leading-relaxed mb-2">
      <div className="markdown-body [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h1]:text-[13px] [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-[12px] [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-[11px] [&_h3]:font-bold [&_h3]:my-1.5 [&_strong]:font-bold [&_strong]:text-[var(--color-text)] [&_a]:text-[var(--color-steel)] [&_a]:underline [&_code]:text-[var(--color-steel)] [&_code]:bg-[var(--color-bg)] [&_code]:px-1 [&_code]:rounded [&_pre]:bg-[var(--color-bg)] [&_pre]:p-2 [&_pre]:rounded [&_pre]:my-2 [&_pre]:overflow-x-auto [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--color-border)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--color-text-dim)] [&_hr]:my-3 [&_hr]:border-[var(--color-border)] [&_table]:my-2 [&_table]:border-collapse [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:px-2 [&_td]:py-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{visible}</ReactMarkdown>
      </div>
      {isLong && (
        <button
          onClick={onToggle}
          className="mt-1 text-[9px] uppercase tracking-wider text-[var(--color-steel)] hover:text-[var(--color-text)] transition-colors"
        >
          {expanded ? "▲ Show less" : `▼ Show more (${text.length} chars)`}
        </button>
      )}
    </div>
  )
}

export default function NotesPage() {
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "done">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  // Default to tickets — the actionable surface. Reports / rollups / references
  // / logs each have their own tab so reference docs and dated snapshots
  // don't dominate the day-to-day triage view.
  const [kindFilter, setKindFilter] = useState<NoteKind>("ticket")
  const [showCreate, setShowCreate] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // New note form state
  const [newProfile, setNewProfile] = useState("")
  const [newProfilePath, setNewProfilePath] = useState("")
  const [newType, setNewType] = useState<string>("code")
  const [newPriority, setNewPriority] = useState<string>("normal")
  const [newText, setNewText] = useState("")
  const [profileSearch, setProfileSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const loadNotes = () => {
    setLoading(true)
    fetch("/api/notes")
      .then((r) => r.json())
      .then((d) => {
        setNotes(d.notes || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadNotes()
    fetchVault()
      .then((d) => setProfiles(d.profiles || []))
      .catch(() => {})
  }, [])

  // Tickets default to "open only" so done items don't clutter the active
  // worklist — flip via the status filter pills. Other kinds (reports,
  // references, etc.) ignore status because their workflow doesn't apply.
  const filtered = notes.filter((n) => {
    if (n.kind !== kindFilter) return false
    if (kindFilter === "ticket") {
      if (filter !== "all" && n.status !== filter) return false
      if (typeFilter !== "all" && n.type !== typeFilter) return false
    }
    return true
  })

  const kindCounts: Record<NoteKind, number> = {
    ticket: 0,
    report: 0,
    rollup: 0,
    reference: 0,
    log: 0,
  }
  for (const n of notes) kindCounts[n.kind] = (kindCounts[n.kind] || 0) + 1

  // For the report kind, show how many are "live" (open/in-progress) vs
  // auto-resolved-to-done. The healing signal David asked for: the
  // count of open reports should drop as the harness fixes things.
  const reportLive = notes.filter((n) => n.kind === "report" && n.status !== "done").length
  const reportResolved = notes.filter((n) => n.kind === "report" && n.status === "done").length

  const searchResults = profileSearch.length >= 2
    ? profiles.filter((p) => p.title.toLowerCase().includes(profileSearch.toLowerCase())).slice(0, 8)
    : []

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    loadNotes()
  }

  const createNote = async () => {
    if (!newText.trim()) return
    setSaving(true)
    await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: newProfile || "General",
        profilePath: newProfilePath,
        type: newType,
        priority: newPriority,
        text: newText,
      }),
    })
    setSaving(false)
    setNewText("")
    setNewProfile("")
    setNewProfilePath("")
    setProfileSearch("")
    setShowCreate(false)
    loadNotes()
  }

  const counts = {
    open: notes.filter((n) => n.status === "open").length,
    "in-progress": notes.filter((n) => n.status === "in-progress").length,
    done: notes.filter((n) => n.status === "done").length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text)]">Notes & Queues</h1>
          <p className="text-[10px] text-[var(--color-text-dim)]">
            {counts.open} open / {counts["in-progress"]} in progress / {counts.done} done
            {reportResolved > 0 && (
              <>
                {" · "}
                <span className="text-[var(--color-green)]">
                  {reportResolved} report{reportResolved === 1 ? "" : "s"} auto-healed
                </span>
                {reportLive > 0 && (
                  <span className="text-[var(--color-text-dim)]">
                    {" "}
                    · {reportLive} still showing findings
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadNotes}
            className="flex items-center gap-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 bg-[var(--color-steel)]/15 text-[var(--color-steel)] border border-[var(--color-steel)]/30 rounded-lg px-4 py-2 text-xs hover:bg-[var(--color-steel)]/25 transition-colors"
          >
            + New Note
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-5 mb-6">
          <h3 className="text-xs font-bold text-[var(--color-text)] mb-4">Create Note</h3>

          {/* Profile search */}
          <div className="relative mb-3">
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">Profile</label>
            <input
              type="text"
              placeholder="Search for a profile (or leave blank for general)..."
              value={profileSearch}
              onChange={(e) => {
                setProfileSearch(e.target.value)
                if (!e.target.value) { setNewProfile(""); setNewProfilePath("") }
              }}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)]"
            />
            {newProfile && (
              <div className="mt-1 text-[10px] text-[var(--color-green)]">Selected: {newProfile}</div>
            )}
            {searchResults.length > 0 && !newProfile && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg overflow-hidden z-20 max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.path}
                    onClick={() => {
                      setNewProfile(p.title)
                      setNewProfilePath(p.path)
                      setProfileSearch(p.title)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-hover)] text-xs border-b border-[var(--color-border)] last:border-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: readinessColor(p.contentReadiness) }} />
                    <span className="text-[var(--color-text)] flex-1">{p.title}</span>
                    <span className="text-[8px]" style={{ color: typeColor(p.type) }}>{p.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type + Priority */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">Type</label>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setNewType(key)}
                    className={`text-[9px] px-2.5 py-1.5 rounded border transition-all ${
                      newType === key
                        ? "border-current bg-current/10"
                        : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                    }`}
                    style={{ color: newType === key ? NOTE_TYPE_COLORS[key] : undefined }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">Priority</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setNewPriority("normal")}
                  className={`text-[9px] px-2.5 py-1.5 rounded border transition-all ${
                    newPriority === "normal"
                      ? "border-[var(--color-text-dim)] text-[var(--color-text)] bg-[var(--color-bg-hover)]"
                      : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setNewPriority("urgent")}
                  className={`text-[9px] px-2.5 py-1.5 rounded border transition-all ${
                    newPriority === "urgent"
                      ? "border-[var(--color-red)] text-[var(--color-red)] bg-[var(--color-red)]/10"
                      : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                  }`}
                >
                  Urgent
                </button>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="mb-3">
            <label className="text-[9px] uppercase tracking-wider text-[var(--color-text-dim)] block mb-1">Description</label>
            <textarea
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Describe the issue or what needs to be done..."
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-steel)] min-h-[80px] resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={createNote}
              disabled={saving || !newText.trim()}
              className="flex items-center gap-2 bg-[var(--color-green)]/15 text-[var(--color-green)] border border-[var(--color-green)]/30 rounded-lg px-4 py-2 text-xs font-bold hover:bg-[var(--color-green)]/25 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Note to Vault"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-text)] px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Primary kind tabs — separates actionable tickets from auto-generated
          reports/rollups, static reference docs, and dated logs. Each tab
          has its own UI behavior (see per-note rendering below). */}
      <div className="flex flex-wrap gap-1 mb-2 border-b border-[var(--color-border)]">
        {(["ticket", "report", "rollup", "reference", "log"] as const).map((k) => {
          const active = kindFilter === k
          return (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              title={NOTE_KIND_DESCRIPTIONS[k]}
              className={`text-[10px] uppercase tracking-wider px-3 py-2 border-b-2 -mb-px transition-all ${
                active
                  ? "border-[var(--color-steel)] text-[var(--color-steel)]"
                  : "border-transparent text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              }`}
            >
              {NOTE_KIND_LABELS[k]} ({kindCounts[k]})
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-[var(--color-text-dim)] mb-4 italic">
        {NOTE_KIND_DESCRIPTIONS[kindFilter]}
      </p>

      {/* Secondary filters — only relevant for tickets (the only kind with a
          status workflow + per-domain typing). Reports/rollups have their
          status auto-managed; references/logs don't track status at all. */}
      {kindFilter === "ticket" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "open", "in-progress", "done"] as const).map((s) => {
            const inKind = notes.filter(
              (n) => n.kind === "ticket" && (s === "all" || n.status === s),
            ).length
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                  filter === s
                    ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-dim)]"
                }`}
              >
                {s === "all" ? `All (${inKind})` : `${s} (${inKind})`}
              </button>
            )
          })}

          <div className="w-px bg-[var(--color-border)] mx-1" />

          <button
            onClick={() => setTypeFilter("all")}
            className={`text-[9px] px-2.5 py-1.5 rounded-full border transition-all ${
              typeFilter === "all" ? "border-[var(--color-steel)] text-[var(--color-steel)]" : "border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            All Types
          </button>
          {Object.entries(NOTE_TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`text-[9px] px-2.5 py-1.5 rounded-full border transition-all ${
                typeFilter === key ? "border-current bg-current/10" : "border-[var(--color-border)] text-[var(--color-text-dim)]"
              }`}
              style={{ color: typeFilter === key ? NOTE_TYPE_COLORS[key] : undefined }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      {loading ? (
        <div className="text-xs text-[var(--color-text-dim)] animate-pulse py-12 text-center">Loading notes from vault...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] border-dashed rounded-lg p-12 text-center">
          <p className="text-xs text-[var(--color-text-dim)]">
            {notes.length === 0 ? "No notes yet. Create one to get started." : "No notes match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((note) => (
            <div
              key={note.id}
              className={`bg-[var(--color-bg-card)] border rounded-lg p-4 transition-all ${
                note.priority === "urgent" && note.status === "open"
                  ? "border-[var(--color-red)]/40"
                  : "border-[var(--color-border)]"
              } ${note.kind === "log" ? "opacity-70" : ""}`}
            >
              <div className="flex items-start gap-3">
                {/* Status + type badges. Reference and log notes don't have a
                    status workflow so the badge column is hidden for them. */}
                {note.kind !== "reference" && note.kind !== "log" && (
                  <div className="flex flex-col gap-1 flex-shrink-0 pt-0.5">
                    <span
                      className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded text-center"
                      style={{
                        color: STATUS_COLORS[note.status],
                        backgroundColor: `${STATUS_COLORS[note.status]}15`,
                      }}
                      title={
                        note.kind === "report" || note.kind === "rollup"
                          ? "Status auto-managed by the harness"
                          : undefined
                      }
                    >
                      {note.status}
                    </span>
                    <span
                      className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded text-center"
                      style={{
                        color: NOTE_TYPE_COLORS[note.type],
                        backgroundColor: `${NOTE_TYPE_COLORS[note.type]}15`,
                      }}
                    >
                      {note.type}
                    </span>
                    {note.priority === "urgent" && (
                      <span className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded text-center bg-[var(--color-red)]/15 text-[var(--color-red)]">
                        urgent
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[var(--color-text)]">{note.profile}</span>
                    {note.profilePath && (
                      <span className="text-[9px] text-[var(--color-text-dim)] truncate">{note.profilePath}</span>
                    )}
                  </div>
                  <NoteBody
                    text={note.text}
                    expanded={expandedIds.has(note.id)}
                    onToggle={() => toggleExpanded(note.id)}
                  />
                  <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-dim)]">
                    <span>{note.author}</span>
                    <span>{note.date}</span>
                    {note.resolvedDate && (
                      <span className="text-[var(--color-green)]">Resolved {note.resolvedDate} by {note.resolvedBy}</span>
                    )}
                  </div>
                </div>

                {/* Actions — only tickets get manual status controls. Reports
                    and rollups are auto-managed by the harness; references
                    and logs don't track status. */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {note.kind === "ticket" && (
                    <div className="flex gap-1">
                      {note.status === "open" && (
                        <button
                          onClick={() => updateStatus(note.id, "in-progress")}
                          className="text-[8px] px-2 py-1 rounded border border-[var(--color-amber)]/30 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/10 transition-colors"
                          title="Mark as being worked on by Claude"
                        >
                          Working On It
                        </button>
                      )}
                      {(note.status === "open" || note.status === "in-progress") && (
                        <button
                          onClick={() => updateStatus(note.id, "done")}
                          className="text-[8px] px-2 py-1 rounded border border-[var(--color-green)]/30 text-[var(--color-green)] hover:bg-[var(--color-green)]/10 transition-colors"
                          title="Mark as resolved — issue is fixed"
                        >
                          Resolved
                        </button>
                      )}
                      {note.status === "done" && (
                        <button
                          onClick={() => updateStatus(note.id, "open")}
                          className="text-[8px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)] transition-colors"
                          title="Reopen — issue not actually fixed"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  )}
                  {(note.kind === "report" || note.kind === "rollup") && (
                    <span
                      className="text-[8px] uppercase tracking-wider px-2 py-1 rounded border border-[var(--color-steel)]/30 text-[var(--color-steel)]"
                      title={
                        note.autoResolveWhen
                          ? `Auto-resolves when body matches: ${note.autoResolveWhen}`
                          : "Auto-managed by the harness"
                      }
                    >
                      ⚙ auto-managed
                    </span>
                  )}
                  {note.lastAutoResolved && (
                    <span className="text-[8px] text-[var(--color-text-dim)]" title={note.lastAutoResolved}>
                      auto-flipped {note.lastAutoResolved.slice(0, 10)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
