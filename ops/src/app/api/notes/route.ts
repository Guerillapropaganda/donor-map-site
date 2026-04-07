import { NextResponse } from "next/server"
import { Octokit } from "octokit"
import { parseNote, noteToMarkdown, noteFilename } from "@/lib/notes"
import type { AdminNote } from "@/lib/notes"

const OWNER = "Guerillapropaganda"
const REPO = "donor-map-site"
const BRANCH = "v4"
const NOTES_DIR = "content/Admin Notes"

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN not set")
  return new Octokit({ auth: token })
}

// GET — list all notes from the vault
export async function GET() {
  try {
    const octokit = getOctokit()

    // Try to get the Admin Notes directory
    let files: { name: string; path: string; sha: string }[] = []
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: OWNER,
        repo: REPO,
        path: NOTES_DIR,
        ref: BRANCH,
      })
      if (Array.isArray(data)) {
        files = data.filter((f) => f.name.endsWith(".md")).map((f) => ({
          name: f.name,
          path: f.path,
          sha: f.sha,
        }))
      }
    } catch (e: unknown) {
      // Directory doesn't exist yet — that's fine, return empty
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 404) {
        return NextResponse.json({ notes: [] })
      }
      throw e
    }

    // Fetch content of each note
    const notes: AdminNote[] = []
    for (const file of files) {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner: OWNER,
          repo: REPO,
          path: file.path,
          ref: BRANCH,
        })
        if ("content" in data && data.content) {
          const content = Buffer.from(data.content, "base64").toString("utf-8")
          const note = parseNote(file.path, content)
          notes.push(note)
        }
      } catch {
        // Skip files that can't be read
      }
    }

    // Sort: open first, then by date descending
    notes.sort((a, b) => {
      if (a.status === "open" && b.status !== "open") return -1
      if (a.status !== "open" && b.status === "open") return 1
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return NextResponse.json({ notes })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
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

    const octokit = getOctokit()
    const filename = noteFilename(profile || "general", type || "question")
    const path = `${NOTES_DIR}/${filename}`

    const note: AdminNote = {
      id: filename.replace(".md", ""),
      title: `${type || "note"}: ${profile || "General"}`,
      profile: profile || "General",
      profilePath: profilePath || "",
      type: type || "question",
      priority: priority || "normal",
      status: "open",
      text,
      author: "David",
      date: new Date().toISOString().split("T")[0],
    }

    const content = noteToMarkdown(note)

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Admin note: ${note.title}`,
      content: Buffer.from(content).toString("base64"),
      branch: BRANCH,
    })

    return NextResponse.json({ success: true, note, path })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
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

    const octokit = getOctokit()
    const path = `${NOTES_DIR}/${id}.md`

    // Get current file
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: BRANCH,
    })

    if (!("content" in fileData) || !fileData.content) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    const content = Buffer.from(fileData.content, "base64").toString("utf-8")
    const note = parseNote(path, content)
    note.status = status

    if (status === "done") {
      note.resolvedDate = new Date().toISOString().split("T")[0]
      note.resolvedBy = resolvedBy || "Code Claude"
    }

    const updated = noteToMarkdown(note)

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: OWNER,
      repo: REPO,
      path,
      message: `Update note status: ${note.title} → ${status}`,
      content: Buffer.from(updated).toString("base64"),
      sha: fileData.sha,
      branch: BRANCH,
    })

    return NextResponse.json({ success: true, note })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
