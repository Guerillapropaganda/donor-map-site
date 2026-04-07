"use client"

import { useState, useEffect } from "react"
import type { AdminNote } from "@/lib/notes"
import { NOTE_TYPE_COLORS, NOTE_TYPE_LABELS, STATUS_COLORS } from "@/lib/notes"
import type { Profile } from "@/lib/vault"
import { typeColor, readinessColor } from "@/lib/vault"

export default function NotesPage() {
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "done">("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)

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
    fetch("/api/vault")
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles || []))
      .catch(() => {})
  }, [])

  const filtered = notes.filter((n) => {
    if (filter !== "all" && n.status !== filter) return false
    if (typeFilter !== "all" && n.type !== typeFilter) return false
    return true
  })

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

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "open", "in-progress", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
              filter === s
                ? "border-[var(--color-steel)] text-[var(--color-steel)] bg-[var(--color-steel)]/10"
                : "border-[var(--color-border)] text-[var(--color-text-dim)]"
            }`}
          >
            {s === "all" ? `All (${notes.length})` : `${s} (${counts[s] || 0})`}
          </button>
        ))}

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
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Status + type badges */}
                <div className="flex flex-col gap-1 flex-shrink-0 pt-0.5">
                  <span
                    className="text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded text-center"
                    style={{
                      color: STATUS_COLORS[note.status],
                      backgroundColor: `${STATUS_COLORS[note.status]}15`,
                    }}
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

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[var(--color-text)]">{note.profile}</span>
                    {note.profilePath && (
                      <span className="text-[9px] text-[var(--color-text-dim)] truncate">{note.profilePath}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-text)] leading-relaxed mb-2">{note.text}</p>
                  <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-dim)]">
                    <span>{note.author}</span>
                    <span>{note.date}</span>
                    {note.resolvedDate && (
                      <span className="text-[var(--color-green)]">Resolved {note.resolvedDate} by {note.resolvedBy}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {note.status === "open" && (
                    <button
                      onClick={() => updateStatus(note.id, "in-progress")}
                      className="text-[8px] px-2 py-1 rounded border border-[var(--color-amber)]/30 text-[var(--color-amber)] hover:bg-[var(--color-amber)]/10 transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {(note.status === "open" || note.status === "in-progress") && (
                    <button
                      onClick={() => updateStatus(note.id, "done")}
                      className="text-[8px] px-2 py-1 rounded border border-[var(--color-green)]/30 text-[var(--color-green)] hover:bg-[var(--color-green)]/10 transition-colors"
                    >
                      Done
                    </button>
                  )}
                  {note.status === "done" && (
                    <button
                      onClick={() => updateStatus(note.id, "open")}
                      className="text-[8px] px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      Reopen
                    </button>
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
