import matter from "gray-matter"

export interface AdminNote {
  id: string
  title: string
  profile: string       // which profile this note is about
  profilePath: string   // vault path of the profile
  type: "code" | "research" | "data" | "style" | "question"
  priority: "normal" | "urgent"
  status: "open" | "in-progress" | "done"
  text: string
  author: string
  date: string
  resolvedDate?: string
  resolvedBy?: string
}

// Serialize a note to markdown with frontmatter
export function noteToMarkdown(note: AdminNote): string {
  const fm: Record<string, unknown> = {
    title: note.title,
    type: "admin-note",
    "note-type": note.type,
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
    priority: data.priority || "normal",
    status: data.status || "open",
    text: body.trim(),
    author: data.author || "David",
    date: data.date || "",
    resolvedDate: data["resolved-date"],
    resolvedBy: data["resolved-by"],
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
