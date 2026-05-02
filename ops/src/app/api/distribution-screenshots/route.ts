import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { attachScreenshotToEngagement } from "@/lib/distribution-targets"

/**
 * POST /api/distribution-screenshots
 *   multipart/form-data: { engagementId: string, file: File }
 *   Saves the file to data/distribution-screenshots/{engagementId}.{ext}
 *   and updates the engagement record with the filename.
 *
 * Files are gitignored. They are personal records; David's machine and
 * any backup copies he makes are the storage strategy.
 */

const SCREENSHOTS_DIR = path.join(process.cwd(), "..", "data", "distribution-screenshots")
const MAX_BYTES = 8 * 1024 * 1024 // 8 MB ceiling
const ALLOWED_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}

function ensureDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
}

export async function POST(req: NextRequest) {
  let form: FormData
  try {
    form = await req.formData()
  } catch (err) {
    return NextResponse.json({ error: `expected multipart/form-data: ${(err as Error).message}` }, { status: 400 })
  }

  const engagementId = String(form.get("engagementId") || "").trim()
  const file = form.get("file")
  if (!engagementId) return NextResponse.json({ error: "engagementId required" }, { status: 400 })
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 })
  if (!/^eng-[a-z0-9-]+$/.test(engagementId)) {
    return NextResponse.json({ error: "invalid engagementId format" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `file too large: ${file.size} bytes (max ${MAX_BYTES})` }, { status: 413 })
  }

  const ext = ALLOWED_EXT[file.type]
  if (!ext) {
    return NextResponse.json({ error: `unsupported file type: ${file.type}. Use PNG, JPG, WebP, or GIF.` }, { status: 415 })
  }

  ensureDir()
  const filename = `${engagementId}.${ext}`
  const fp = path.join(SCREENSHOTS_DIR, filename)
  const buf = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(fp, buf)

  const ok = attachScreenshotToEngagement(engagementId, filename)
  if (!ok) {
    return NextResponse.json({ error: "engagement not found; file saved but not attached" }, { status: 404 })
  }

  return NextResponse.json({ success: true, filename, size: file.size, type: file.type })
}

export async function DELETE(req: NextRequest) {
  let body: { engagementId?: string; filename?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const filename = String(body.filename || "")
  if (!filename || !/^eng-[a-z0-9-]+\.(png|jpg|jpeg|webp|gif)$/.test(filename)) {
    return NextResponse.json({ error: "invalid filename" }, { status: 400 })
  }
  const fp = path.join(SCREENSHOTS_DIR, filename)
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp)
  }
  if (body.engagementId) {
    attachScreenshotToEngagement(body.engagementId, "")
  }
  return NextResponse.json({ success: true })
}
