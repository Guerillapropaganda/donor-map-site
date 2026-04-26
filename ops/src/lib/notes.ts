import matter from "gray-matter"

// Kind classifies the SHAPE of a note (orthogonal to `type`, the domain).
// UI behavior differs per kind:
//   ticket    — hand-managed work, full open/in-progress/done buttons
//   report    — auto-generated, status auto-flips via auto-resolve-when
//   rollup    — auto-generated dashboard, read-only
//   reference — static knowledge, no status workflow
//   log       — dated snapshot, archived appearance
export type NoteKind = "ticket" | "report" | "rollup" | "reference" | "log"

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  ticket: "Tickets",
  report: "Reports",
  rollup: "Rollups",
  reference: "Reference",
  log: "Logs",
}

export const NOTE_KIND_DESCRIPTIONS: Record<NoteKind, string> = {
  ticket: "Hand-managed work items. Click Working On It / Resolved to track.",
  report: "Auto-generated reports. Status flips automatically when findings drop to zero.",
  rollup: "Auto-generated dashboards. Read-only snapshots of underlying data.",
  reference: "Static knowledge — playbooks, briefs, specs. No status workflow.",
  log: "Dated snapshots — handoffs, briefings, session logs. Archive.",
}

export interface AdminNote {
  id: string
  title: string
  profile: string       // which profile this note is about
  profilePath: string   // vault path of the profile
  type: "code" | "research" | "data" | "style" | "question"
  kind: NoteKind
  priority: "normal" | "urgent"
  status: "open" | "in-progress" | "done"
  text: string
  author: string
  date: string
  resolvedDate?: string
  resolvedBy?: string
  autoResolveWhen?: string
  lastAutoResolved?: string
}

// Serialize a note to markdown with frontmatter
export function noteToMarkdown(note: AdminNote): string {
  const fm: Record<string, unknown> = {
    title: note.title,
    type: "admin-note",
    "note-type": note.type,
    "note-kind": note.kind || "ticket",
    priority: note.priority,
    status: note.status,
    profile: note.profile,
    "profile-path": note.profilePath,
    author: note.author,
    date: note.date,
  }
  if (note.resolvedDate) fm["resolved-date"] = note.resolvedDate
  if (note.resolvedBy) fm["resolved-by"] = note.resolvedBy

  const body = note.text

  return matter.stringify(body, fm)
}

// Parse a note from markdown
export function parseNote(path: string, content: string): AdminNote {
  const { data, content: body } = matter(content)
  const filename = path.split("/").pop()?.replace(".md", "") || ""

  return {
    id: filename,
    title: data.title || filename,
    profile: data.profile || "",
    profilePath: data["profile-path"] || "",
    type: data["note-type"] || "question",
    kind: (data["note-kind"] as NoteKind) || "ticket",
    priority: data.priority || "normal",
    status: data.status || "open",
    text: body.trim(),
    author: data.author || "David",
    date: data.date || "",
    resolvedDate: data["resolved-date"],
    resolvedBy: data["resolved-by"],
    autoResolveWhen: data["auto-resolve-when"],
    lastAutoResolved: data["last-auto-resolved"],
  }
}

// Generate a filename for a note
export function noteFilename(profile: string, type: string): string {
  const clean = profile.replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "-").substring(0, 50)
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19)
  return `${clean}-${type}-${timestamp}.md`
}

// Type colors for UI
export const NOTE_TYPE_COLORS: Record<string, string> = {
  code: "#5b8dce",
  research: "#a855f7",
  data: "#22c55e",
  style: "#f59e0b",
  question: "#06b6d4",
}

export const NOTE_TYPE_LABELS: Record<string, string> = {
  code: "Code Fix",
  research: "Research",
  data: "Data Issue",
  style: "Style Issue",
  question: "Question",
}

export const STATUS_COLORS: Record<string, string> = {
  open: "#ef4444",
  "in-progress": "#f59e0b",
  done: "#22c55e",
}
