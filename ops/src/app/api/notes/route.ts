import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { parseNote, noteToMarkdown, noteFilename } from "@/lib/notes"
import { writeAndPush, readFile } from "@/lib/local-write"
import type { AdminNote } from "@/lib/notes"

const NOTES_DIR = "content/Admin Notes"

function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, "content"))) return fromOps
  if (fs.existsSync(path.join(process.cwd(), "content"))) return process.cwd()
  throw new Error("Cannot find repo root")
}

// GET — list all notes
export async function GET() {
  try {
    const repoRoot = getRepoRoot()
    const notesDir = path.join(repoRoot, NOTES_DIR)

    if (!fs.existsSync(notesDir)) {
      return NextResponse.json({ notes: [] })
    }

    const files = fs.readdirSync(notesDir).filter((f) => f.endsWith(".md"))
    const notes: AdminNote[] = files.map((f) => {
      const filePath = `${NOTES_DIR}/${f}`
      const content = fs.readFileSync(path.join(notesDir, f), "utf-8")
      return parseNote(filePath, content)
    })

    notes.sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1
      if (a.status !== "open" && b.status === "open") return 1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return NextResponse.json({ notes })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — create a new note
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profile, profilePath, type, priority, text } = body

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }

    const filename = noteFilename(profile || "general", type || "question")
    const filePath = `${NOTES_DIR}/${filename}`

    const note: AdminNote = {
      id: filename.replace(".md", ""),
      title: `${type || "note"}: ${profile || "General"}`,
      profile: profile || "General",
      profilePath: profilePath || "",
      type: type || "question",
      kind: "ticket", // hand-created notes are always tickets — auto-generated reports stamp themselves
      priority: priority || "normal",
      status: "open",
      text,
      author: "David",
      date: new Date().toISOString().split("T")[0],
    }

    const content = noteToMarkdown(note)
    writeAndPush(filePath, content, `Admin note: ${note.title}`)

    return NextResponse.json({ success: true, note, path: filePath })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT — update a note's status
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, status, resolvedBy } = body

    if (!id || !status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 })
    }

    const filePath = `${NOTES_DIR}/${id}.md`
    const content = readFile(filePath)
    const note = parseNote(filePath, content)
    note.status = status

    if (status === "done") {
      note.resolvedDate = new Date().toISOString().split("T")[0]
      note.resolvedBy = resolvedBy || "Code Claude"
    }

    const updated = noteToMarkdown(note)
    writeAndPush(filePath, updated, `Update note status: ${note.title} → ${status}`)

    return NextResponse.json({ success: true, note })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
