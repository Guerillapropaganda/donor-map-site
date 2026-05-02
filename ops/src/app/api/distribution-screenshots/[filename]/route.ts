import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

/**
 * GET /api/distribution-screenshots/[filename]
 * Serves the screenshot file from data/distribution-screenshots/.
 * Filename validated against expected pattern to prevent path traversal.
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), "..", "data", "distribution-screenshots")
const ALLOWED_PATTERN = /^eng-[a-z0-9-]+\.(png|jpg|jpeg|webp|gif)$/i
const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
}

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const name = params.filename
  if (!ALLOWED_PATTERN.test(name)) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 })
  }
  const fp = path.join(SCREENSHOTS_DIR, name)
  if (!fs.existsSync(fp)) {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }
  const buf = fs.readFileSync(fp)
  const ext = name.split(".").pop()!.toLowerCase()
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": MIME_BY_EXT[ext] || "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  })
}
