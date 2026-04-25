import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { shadowRelated, logDiff } from "@/lib/donor-map-shadow"

const DATA_PATH = path.join(process.cwd(), "..", "data", "relationships-per-profile.json")

// Flip via DONOR_MAP_SHADOW=1 in ops/.env.local to enable. Off by default
// so the harness is opt-in until we trust it. Per ADR-0024 §"Migration
// strategy" — shadow mode runs alongside the existing read path; clients
// see the cached answer regardless. Diffs are logged for review.
const SHADOW_ENABLED = process.env.DONOR_MAP_SHADOW === "1"

let _cache: Record<string, unknown> | null = null
let _mtime = 0

function loadData(): Record<string, unknown> {
  const stat = fs.statSync(DATA_PATH)
  if (_cache && stat.mtimeMs === _mtime) return _cache
  _cache = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"))
  _mtime = stat.mtimeMs
  return _cache!
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const title = url.searchParams.get("title")

  if (!title) {
    return NextResponse.json({ error: "Missing title param" }, { status: 400 })
  }

  try {
    const data = loadData()

    // Special: __all__ returns the full map (for Money Trail page)
    if (title === "__all__") {
      return NextResponse.json({ edges: data })
    }

    // Normalize title: strip leading _, trailing Master Profile
    const normalized = title.replace(/^_/, "").replace(/\s*Master Profile.*/i, "").trim()
    const edges = data[normalized] || null

    // Shadow mode (ADR-0024): compute the librarian's answer for the
    // `related` field, log the diff, return the cached answer regardless.
    if (SHADOW_ENABLED && edges && typeof edges === "object") {
      const cacheRelated = Array.isArray((edges as { related?: unknown }).related)
        ? ((edges as { related: unknown[] }).related.map((s) => String(s)))
        : []
      const diff = shadowRelated(normalized, cacheRelated)
      if (diff) void logDiff(diff)
    }

    return NextResponse.json({ title: normalized, edges })
  } catch (error) {
    return NextResponse.json({ error: "Failed to load edge data" }, { status: 500 })
  }
}
