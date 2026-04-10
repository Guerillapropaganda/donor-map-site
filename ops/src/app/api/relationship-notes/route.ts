import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_FILE = path.join(process.cwd(), "data", "relationship-notes.json")

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readNotes(): Record<string, { note: string; updatedAt: string }> {
  ensureDataDir()
  if (!fs.existsSync(DATA_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
  } catch { return {} }
}

function writeNotes(notes: Record<string, { note: string; updatedAt: string }>) {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), "utf-8")
}

// Key format: "Source Profile::Target Profile"
function makeKey(source: string, target: string): string {
  return `${source}::${target}`
}

// GET — get all notes, or notes for a specific source profile
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const source = searchParams.get("source")
  const notes = readNotes()

  if (source) {
    // Filter to notes involving this source profile
    const filtered: Record<string, { note: string; updatedAt: string }> = {}
    for (const [key, val] of Object.entries(notes)) {
      if (key.startsWith(`${source}::`)) filtered[key] = val
    }
    return NextResponse.json(filtered)
  }

  return NextResponse.json(notes)
}

// POST — save a note on a relationship
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { source, target, note } = body

    if (!source || !target) {
      return NextResponse.json({ error: "source and target required" }, { status: 400 })
    }

    const notes = readNotes()
    const key = makeKey(source, target)

    if (!note || note.trim() === "") {
      // Delete note if empty
      delete notes[key]
    } else {
      notes[key] = { note: note.trim(), updatedAt: new Date().toISOString() }
    }

    writeNotes(notes)
    return NextResponse.json({ success: true, key })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
