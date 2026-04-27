/**
 * /api/data-freshness — file-mtime probe for surfacing data staleness in UI
 *
 * Returns the mtime of one or more data files relative to the repo root.
 * The PageHeader's `freshness` prop hits this with one or more file paths
 * to render a "last updated 2d ago" chip.
 *
 * Why a route and not a server-component fetch:
 *   - Pages that use freshness are mostly client components ("use client").
 *     A small route is the cleanest cross-component primitive.
 *   - Caching: 30s in-memory so a busy dashboard with 10 chips polling
 *     every minute doesn't stat the filesystem repeatedly.
 *
 * Path safety: only allows paths under `data/` or `content/Admin Notes/`
 * (i.e., the surfaces where pipelines write). Refuses anything else.
 *
 * Query:
 *   GET /api/data-freshness?paths=data/polling.jsonl,data/relationships.jsonl
 *
 * Response:
 *   {
 *     "now": "2026-04-26T14:00:00.000Z",
 *     "files": [
 *       { path: "data/polling.jsonl", mtime: "...", age_ms: 12345, age_days: 12 },
 *       { path: "data/relationships.jsonl", mtime: "...", age_ms: ..., age_days: 0, missing: false }
 *     ]
 *   }
 *
 * If a file is missing, `missing: true` and mtime/age fields are null.
 * If a path is outside the allowlist, the entry is `error: "path-not-allowed"`.
 */
import { NextRequest, NextResponse } from "next/server"
import * as fs from "fs"
import * as path from "path"

export const dynamic = "force-dynamic"

const ALLOW_PREFIXES = ["data/", "content/Admin Notes/"]

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "relationships.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}
const REPO_ROOT = findRepoRoot(process.cwd())

interface FileEntry {
  path: string
  mtime: string | null
  age_ms: number | null
  age_days: number | null
  missing?: boolean
  error?: string
}

let _cache: { ts: number; payload: { now: string; files: FileEntry[] }; key: string } | null = null
const CACHE_TTL_MS = 30_000

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const pathsParam = url.searchParams.get("paths") ?? ""
  const requestedPaths = pathsParam.split(",").map((p) => p.trim()).filter(Boolean)
  if (requestedPaths.length === 0) {
    return NextResponse.json({ error: "paths query param required" }, { status: 400 })
  }
  if (requestedPaths.length > 20) {
    return NextResponse.json({ error: "max 20 paths per request" }, { status: 400 })
  }

  const cacheKey = requestedPaths.join("|")
  if (_cache && _cache.key === cacheKey && Date.now() - _cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(_cache.payload)
  }

  const now = new Date()
  const files: FileEntry[] = requestedPaths.map((rel) => {
    const allowed = ALLOW_PREFIXES.some((p) => rel.startsWith(p))
    if (!allowed) {
      return { path: rel, mtime: null, age_ms: null, age_days: null, error: "path-not-allowed" }
    }
    if (rel.includes("..")) {
      return { path: rel, mtime: null, age_ms: null, age_days: null, error: "path-not-allowed" }
    }
    const abs = path.join(REPO_ROOT, rel)
    try {
      const stat = fs.statSync(abs)
      const age = now.getTime() - stat.mtimeMs
      return {
        path: rel,
        mtime: new Date(stat.mtimeMs).toISOString(),
        age_ms: age,
        age_days: Math.floor(age / 86400000),
      }
    } catch {
      return { path: rel, mtime: null, age_ms: null, age_days: null, missing: true }
    }
  })

  const payload = { now: now.toISOString(), files }
  _cache = { ts: Date.now(), payload, key: cacheKey }
  return NextResponse.json(payload)
}
