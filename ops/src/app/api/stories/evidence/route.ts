/**
 * GET /api/stories/evidence?id=story_xxx
 *
 * Deeper than /money: returns the full evidence picture
 *   - pair         — same as /money (subject ↔ counterparty money trail)
 *   - shared_donors — top 10 entities funding both subject and counterparty
 *   - cross_targets — other politicians where counterparty plays both sides
 *
 * Read-only. Powered by the librarian singleton (ADR-0024). No mutation.
 * Used by the 🔗 Show evidence button on /stories.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"
import { buildFullEvidence } from "@/lib/story-evidence"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "stories.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const STORIES_FILE = path.join(findRepoRoot(process.cwd()), "data", "stories.jsonl")

function loadStory(id: string): any | null {
  if (!fs.existsSync(STORIES_FILE)) return null
  for (const line of fs.readFileSync(STORIES_FILE, "utf-8").split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line)
      if (r.id === id) return r
    } catch { /* skip */ }
  }
  return null
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 })

  const story = loadStory(id)
  if (!story) return NextResponse.json({ error: `story ${id} not found` }, { status: 404 })

  const graph = getGraph()
  if (!graph) {
    return NextResponse.json(
      { error: "Librarian unavailable (canonical stores failed to load)." },
      { status: 503 },
    )
  }

  const evidence = buildFullEvidence(graph, story)
  return NextResponse.json({
    evidence,
    checked_at: new Date().toISOString(),
  })
}
