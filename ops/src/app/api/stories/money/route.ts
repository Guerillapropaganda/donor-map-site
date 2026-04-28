/**
 * GET /api/stories/money?id=story_xxx
 *
 * Returns the (subject, counterparty) money trail for one story:
 *   - money_for     — supporting flows (direct, IE-support, 527-contribution, grants)
 *   - money_against — opposition spending (IE-oppose)
 *   - other_money   — contracts / grants / operating expense
 *   - non_money_edges — affiliations / political-opposition / related counts
 *
 * Read-only. Powered by the librarian singleton (ADR-0024). No mutation.
 * Used by the 💰 Money trail button on /stories.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getGraph } from "@/lib/donor-map-singleton"
import { buildPairEvidence, pickPair } from "@/lib/story-evidence"
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

  const pick = pickPair(story)
  if (!pick.supported || !pick.subject_ref || !pick.counterparty_ref) {
    return NextResponse.json({
      supported: false,
      reason: pick.reason,
      subject_ref: pick.subject_ref,
      counterparty_ref: pick.counterparty_ref,
    })
  }

  const pair = buildPairEvidence(graph, pick.subject_ref, pick.counterparty_ref)
  return NextResponse.json({
    supported: true,
    pair,
    checked_at: new Date().toISOString(),
  })
}
