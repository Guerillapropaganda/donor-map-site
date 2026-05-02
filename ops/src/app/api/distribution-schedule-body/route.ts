import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

/**
 * POST /api/distribution-schedule-body
 * Body: { body: string }
 *
 * Rewrites the markdown body of content/Admin Notes/distribution-schedule.md
 * while preserving the YAML frontmatter exactly. Used by the in-page
 * editor on the Algorithm tab so David can write algorithm notes
 * without leaving the ops surface.
 *
 * The frontmatter end-marker is preserved at byte level. Body is
 * trimmed and re-padded to a single trailing newline.
 */

const FILE_PATH = path.join(process.cwd(), "..", "content", "Admin Notes", "distribution-schedule.md")

export async function POST(req: NextRequest) {
  let payload: { body?: string }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const newBody = payload.body
  if (typeof newBody !== "string") {
    return NextResponse.json({ error: "body must be a string" }, { status: 400 })
  }

  let raw: string
  try {
    raw = fs.readFileSync(FILE_PATH, "utf-8")
  } catch (err) {
    return NextResponse.json({ error: `cannot read schedule file: ${(err as Error).message}` }, { status: 500 })
  }

  const fmMatch = raw.match(/^(---\n[\s\S]*?\n---\n?)([\s\S]*)$/)
  if (!fmMatch) {
    return NextResponse.json({ error: "schedule file has no YAML frontmatter; refusing to write" }, { status: 500 })
  }
  const frontmatter = fmMatch[1]
  const trimmedBody = newBody.replace(/\s+$/, "") + "\n"
  const next = frontmatter + (frontmatter.endsWith("\n") ? "" : "\n") + trimmedBody

  try {
    fs.writeFileSync(FILE_PATH, next, "utf-8")
  } catch (err) {
    return NextResponse.json({ error: `cannot write schedule file: ${(err as Error).message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, bytes: next.length })
}
