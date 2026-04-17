import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

// Sync target for admin-bar "Add Note" submissions from the live site.
// The public AdminBar writes to localStorage first (source of truth for
// the user's own queue view) and best-effort POSTs here so Research
// Claude can read the notes on /preflight.
//
// File format: one JSON object per line in content/Admin Notes/inline-notes.jsonl.
// Cheap to append, cheap to grep, survives across sessions without a DB.

const NOTES_FILE = path.resolve(process.cwd(), "..", "content", "Admin Notes", "inline-notes.jsonl")

const CORS_HEADERS = {
  // Locked to the live origin. Ops itself is localhost-only, so this
  // allowlist is just belt-and-suspenders — the only browser that can
  // reach this port is the user's.
  "Access-Control-Allow-Origin": "https://thedonormap.org",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Chrome's Private Network Access restriction: a public (HTTPS) page
  // cannot reach a loopback address unless the server explicitly opts
  // in. Without this header the preflight rejects with "Permission
  // denied for this request to access the `loopback` address space".
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "86400",
}

interface InlineNote {
  text: string
  type: string
  priority: string
  page: string
  pageTitle: string
  date: string
  status: string
}

function isValidNote(body: unknown): body is InlineNote {
  if (!body || typeof body !== "object") return false
  const n = body as Record<string, unknown>
  return (
    typeof n.text === "string" && n.text.trim().length > 0 &&
    typeof n.type === "string" &&
    typeof n.priority === "string" &&
    typeof n.page === "string" &&
    typeof n.date === "string"
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET() {
  try {
    if (!fs.existsSync(NOTES_FILE)) {
      return NextResponse.json({ notes: [] }, { headers: CORS_HEADERS })
    }
    const text = fs.readFileSync(NOTES_FILE, "utf-8")
    const notes = text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try { return JSON.parse(line) } catch { return null }
      })
      .filter(Boolean)
    return NextResponse.json({ notes }, { headers: CORS_HEADERS })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!isValidNote(body)) {
      return NextResponse.json(
        { error: "Invalid note payload" },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const note: InlineNote = {
      text: body.text.slice(0, 4000),
      type: body.type,
      priority: body.priority,
      page: body.page,
      pageTitle: body.pageTitle,
      date: body.date,
      status: body.status || "open",
    }

    fs.mkdirSync(path.dirname(NOTES_FILE), { recursive: true })
    fs.appendFileSync(NOTES_FILE, JSON.stringify(note) + "\n", "utf-8")

    return NextResponse.json({ ok: true, note }, { headers: CORS_HEADERS })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS_HEADERS })
  }
}
