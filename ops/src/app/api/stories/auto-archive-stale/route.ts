/**
 * POST /api/stories/auto-archive-stale
 *
 * Walks data/stories.jsonl, archives stories whose integrity_status is
 * "stale" — the pattern that triggered the candidate no longer holds in
 * the source profile (counterparty is no longer in both donors+opposes).
 *
 * Each archive writes a false-positive log entry so the contradiction-
 * miner won't re-create the candidate on the next run.
 *
 * Conservative: skips draft/ready/published stories. Only candidate-state
 * stories get auto-archived. Editorial work-in-progress is preserved.
 *
 * Response:
 *   {
 *     dry_run: boolean,
 *     archived_count: number,
 *     skipped_count: number,
 *     archived: [{ id, headline }],
 *     skipped: [{ id, headline, reason }],
 *   }
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

interface Story {
  id: string
  slug: string
  headline: string
  detector: string
  detector_type: string
  state: string
  integrity_status?: string
  integrity_note?: string | null
  [k: string]: unknown
}

function loadStories(): Story[] {
  if (!fs.existsSync(STORIES_FILE)) return []
  return fs
    .readFileSync(STORIES_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) as Story } catch { return null } })
    .filter((x): x is Story => x !== null)
}

function persistStories(stories: Story[]): void {
  const tmp = STORIES_FILE + ".tmp"
  const lines = stories.map((r) => JSON.stringify(r))
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, STORIES_FILE)
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  let body: { dry_run?: boolean } = {}
  try { body = await req.json() } catch { /* allow empty */ }
  const dryRun = body.dry_run === true

  const stories = loadStories()
  const archived: Array<{ id: string; headline: string }> = []
  const skipped: Array<{ id: string; headline: string; reason: string }> = []

  let fpLog: { recordRejection: (s: string, p: string, c: string, r: string) => void } | null = null
  if (!dryRun) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      fpLog = eval("require")(path.join(REPO_ROOT, "scripts", "lib", "false-positive-log.cjs"))
    } catch (e: unknown) {
      console.error("[auto-archive-stale] false-positive log require failed:", e)
    }
  }

  const now = new Date().toISOString()
  let mutated = false

  for (const story of stories) {
    if (story.integrity_status !== "stale") continue
    if (story.state === "archived" || story.state === "published") {
      skipped.push({ id: story.id, headline: story.headline, reason: `already ${story.state}` })
      continue
    }
    if (story.state === "draft" || story.state === "ready") {
      skipped.push({ id: story.id, headline: story.headline, reason: `editorial work in progress (state=${story.state})` })
      continue
    }

    archived.push({ id: story.id, headline: story.headline })

    if (!dryRun) {
      const reason = `auto-archived as stale: ${story.integrity_note || "pattern no longer holds in source profile"}`
      Object.assign(story, {
        state: "archived",
        archived_at: now,
        archive_reason: reason,
        last_updated: now,
      })
      mutated = true

      if (fpLog && story.detector && story.slug) {
        try {
          fpLog.recordRejection(
            story.detector,
            story.slug,
            `story ${story.detector_type}`,
            reason,
          )
        } catch (e: unknown) {
          console.error("[auto-archive-stale] fp-log write failed:", e)
        }
      }
    }
  }

  if (!dryRun && mutated) persistStories(stories)

  return NextResponse.json({
    dry_run: dryRun,
    archived_count: archived.length,
    skipped_count: skipped.length,
    archived,
    skipped,
  })
}
