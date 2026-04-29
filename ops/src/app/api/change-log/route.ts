/**
 * GET /api/change-log
 *
 * Returns the chronological "what changed across the vault" log,
 * backed by data/change-log.jsonl (one record per commit, written by
 * the post-commit hook).
 *
 * Query params:
 *   limit       — default 200, hard cap 2000
 *   author      — comma-sep name filter
 *   q           — free-text over subject + files_changed
 *   path        — substring match against any file_changed
 *   since       — relative ("7d", "24h") or ISO. Default: all time.
 *
 * Auth: admin-only (Tier 3 governance surface).
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "change-log.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const STORE_FILE = path.join(REPO_ROOT, "data", "change-log.jsonl")

interface ChangeLogRecord {
  sha: string
  short_sha: string
  at: string
  author: string
  subject: string
  body: string
  files_changed: string[]
  stat: { files: number; insertions: number; deletions: number }
  branch: string
  session_id: string | null
  produced_by: string
}

function loadAll(): ChangeLogRecord[] {
  if (!fs.existsSync(STORE_FILE)) return []
  return fs
    .readFileSync(STORE_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l) as ChangeLogRecord }
      catch { return null }
    })
    .filter((r): r is ChangeLogRecord => r !== null)
}

function parseSince(s: string | null): number | null {
  if (!s) return null
  const rel = /^(\d+)\s*([dhm])$/i.exec(s)
  if (rel) {
    const n = parseInt(rel[1], 10)
    const unit = rel[2].toLowerCase()
    const ms = unit === "d" ? n * 86400_000 : unit === "h" ? n * 3600_000 : n * 60_000
    return Date.now() - ms
  }
  const t = Date.parse(s)
  return isNaN(t) ? null : t
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response!

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 2000)
  const authorFilter = (searchParams.get("author") || "").split(",").filter(Boolean)
  const search = (searchParams.get("q") || "").toLowerCase()
  const pathSearch = (searchParams.get("path") || "").toLowerCase()
  const sinceMs = parseSince(searchParams.get("since"))

  const all = loadAll()

  // Aggregate stats over the whole log (not the filtered slice).
  const totalCommits = all.length
  const totalAuthors = new Set(all.map((r) => r.author)).size
  const oldest = all.length ? all[0].at : null
  const newest = all.length ? all[all.length - 1].at : null
  const totalFilesChanged = all.reduce((acc, r) => acc + (r.stat?.files || 0), 0)

  // Filter
  let filtered = all
  if (authorFilter.length) {
    filtered = filtered.filter((r) => authorFilter.includes(r.author))
  }
  if (sinceMs !== null) {
    filtered = filtered.filter((r) => Date.parse(r.at) >= sinceMs)
  }
  if (search) {
    filtered = filtered.filter((r) =>
      r.subject.toLowerCase().includes(search) ||
      r.body.toLowerCase().includes(search) ||
      r.short_sha.toLowerCase().includes(search) ||
      r.files_changed.some((f) => f.toLowerCase().includes(search))
    )
  }
  if (pathSearch) {
    filtered = filtered.filter((r) => r.files_changed.some((f) => f.toLowerCase().includes(pathSearch)))
  }

  // Newest first.
  filtered.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

  return NextResponse.json({
    records: filtered.slice(0, limit),
    total_filtered: filtered.length,
    stats: {
      total_commits: totalCommits,
      total_authors: totalAuthors,
      oldest,
      newest,
      total_file_touches: totalFilesChanged,
    },
    authors: [...new Set(all.map((r) => r.author))].sort(),
  })
}
