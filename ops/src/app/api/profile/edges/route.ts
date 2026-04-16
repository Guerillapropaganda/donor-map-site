import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const DATA_PATH = path.join(process.cwd(), "..", "data", "relationships-per-profile.json")

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
    // Normalize title: strip leading _, trailing Master Profile
    const normalized = title.replace(/^_/, "").replace(/\s*Master Profile.*/i, "").trim()
    const edges = data[normalized] || null

    return NextResponse.json({ title: normalized, edges })
  } catch (error) {
    return NextResponse.json({ error: "Failed to load edge data" }, { status: 500 })
  }
}
