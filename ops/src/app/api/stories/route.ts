/**
 * GET /api/stories  — list stories with optional filters
 * PATCH /api/stories — update state, severity, or editorial_notes on one story
 *
 * GET query params:
 *   state         — candidate | draft | ready | published
 *   severity      — very-low | low | medium | high | very-high
 *   detector_type — both-sides | cross-party | issue-contradiction | ...
 *   entity_ref    — filter to stories mentioning this entity ref
 *   limit         — max records to return (default 200)
 *
 * PATCH body: { id, state?, severity?, editorial_notes?, requires_legal_review? }
 *
 * Reads/writes data/stories.jsonl directly (same pattern as /api/policies)
 * rather than importing the .cjs store module, which webpack can't bundle.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
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

const REPO_ROOT = findRepoRoot(process.cwd())
const STORIES_FILE = path.join(REPO_ROOT, "data", "stories.jsonl")

function loadStories(): any[] {
  if (!fs.existsSync(STORIES_FILE)) return []
  return fs
    .readFileSync(STORIES_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function persistStories(stories: any[]): void {
  const tmp = STORIES_FILE + ".tmp"
  const lines = stories.map((r) => JSON.stringify(r))
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, STORIES_FILE)
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const { searchParams } = new URL(req.url)
  const filterState = searchParams.get("state")
  const filterSeverity = searchParams.get("severity")
  const filterDetectorType = searchParams.get("detector_type")
  const filterEntityRef = searchParams.get("entity_ref")
  const limit = parseInt(searchParams.get("limit") || "200", 10)

  const stories = loadStories()

  const filtered = stories.filter((r) => {
    if (filterState && r.state !== filterState) return false
    if (filterSeverity && r.severity !== filterSeverity) return false
    if (filterDetectorType && r.detector_type !== filterDetectorType) return false
    if (filterEntityRef) {
      const refs = (r.linked_entities || []).map((e: any) => e.ref)
      if (!refs.includes(filterEntityRef)) return false
    }
    return true
  })

  return NextResponse.json({
    stories: filtered.slice(0, limit),
    total: stories.length,
    filtered: filtered.length,
  })
}

export async function PATCH(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const { id, ...patch } = body
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  const allowed = [
    "state", "severity", "editorial_notes", "requires_legal_review",
    "legal_review_by", "legal_review_at", "published_at",
  ]
  const safePatch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in patch) safePatch[key] = patch[key]
  }

  if (safePatch.state === "published" && !safePatch.published_at) {
    safePatch.published_at = new Date().toISOString()
  }

  const stories = loadStories()
  const idx = stories.findIndex((s) => s.id === id)
  if (idx === -1) {
    return NextResponse.json({ error: `story ${id} not found` }, { status: 404 })
  }

  const updated = { ...stories[idx], ...safePatch, last_updated: new Date().toISOString() }
  stories[idx] = updated
  persistStories(stories)

  return NextResponse.json({ story: updated })
}
