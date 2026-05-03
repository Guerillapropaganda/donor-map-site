import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getBeat } from "@/lib/beats-catalog"

/**
 * Beat-source editor API
 *
 * GET  /api/beat-source?slug=<slug>  — read raw HTML for a beat page
 * POST /api/beat-source?slug=<slug>  — write raw HTML (LOCAL save only;
 *                                       file changes are visible in the
 *                                       worktree but NOT pushed/deployed)
 *
 * Publish (commit + push for deploy) is a separate endpoint:
 *   POST /api/beat-source/publish?slug=<slug>
 *
 * Source-of-truth model: each beat has TWO copies on disk that must
 * stay in sync:
 *   1. prototype/<prototypeFile>      — historical / dev source
 *   2. content/<publicSlug>/index.html — what Quartz deploys
 *
 * For the homepage (slug "index"), the file paths are:
 *   1. prototype/home.html
 *   2. content/index.html
 *
 * For /about: prototype/about.html + content/about/index.html
 *
 * Save writes BOTH files. Read returns the prototype version
 * (assumed identical to content/).
 */

interface FilePaths {
  prototype: string
  content: string
}

function repoRoot(): string {
  // Ops dev server runs from C:/Users/third/donor-map-site/ops/
  // process.cwd() returns that directory. Repo root is one up.
  return path.resolve(process.cwd(), "..")
}

function resolveFilePaths(slug: string): FilePaths | null {
  const root = repoRoot()
  // Special-case the homepage and about (not in beats-catalog as such).
  if (slug === "index" || slug === "home") {
    return {
      prototype: path.join(root, "prototype", "home.html"),
      content: path.join(root, "content", "index.html"),
    }
  }
  if (slug === "about") {
    return {
      prototype: path.join(root, "prototype", "about.html"),
      content: path.join(root, "content", "about", "index.html"),
    }
  }
  // For everything else, look up the beat record.
  const beat = getBeat(slug)
  if (!beat || !beat.prototypeFile || beat.prototypeFile.startsWith("(")) {
    return null
  }
  return {
    prototype: path.join(root, "prototype", beat.prototypeFile),
    content: path.join(root, "content", beat.publicSlug, "index.html"),
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 })
  }
  const paths = resolveFilePaths(slug)
  if (!paths) {
    return NextResponse.json({ error: `no source mapping for slug "${slug}"` }, { status: 404 })
  }
  if (!fs.existsSync(paths.prototype)) {
    return NextResponse.json(
      { error: `prototype file does not exist: ${paths.prototype}` },
      { status: 404 },
    )
  }
  const content = fs.readFileSync(paths.prototype, "utf-8")
  const stat = fs.statSync(paths.prototype)
  const contentExists = fs.existsSync(paths.content)
  return NextResponse.json({
    slug,
    prototype: paths.prototype,
    contentPath: paths.content,
    contentDeployable: contentExists,
    bytes: content.length,
    lastModified: stat.mtime.toISOString(),
    source: content,
  })
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 })
  }
  const paths = resolveFilePaths(slug)
  if (!paths) {
    return NextResponse.json({ error: `no source mapping for slug "${slug}"` }, { status: 404 })
  }
  let body: { source?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "body must be JSON with `source` field" }, { status: 400 })
  }
  if (typeof body.source !== "string") {
    return NextResponse.json({ error: "body.source must be a string" }, { status: 400 })
  }
  // Sanity check: refuse to save if the new content is empty or
  // suspiciously short (probably a load-error overwriting good data).
  if (body.source.trim().length < 200) {
    return NextResponse.json(
      { error: `new source too short (${body.source.trim().length} chars). Refusing to overwrite.` },
      { status: 400 },
    )
  }

  // Write BOTH files in sync. Create content directory if needed.
  fs.mkdirSync(path.dirname(paths.content), { recursive: true })
  fs.writeFileSync(paths.prototype, body.source, "utf-8")
  fs.writeFileSync(paths.content, body.source, "utf-8")

  const stat = fs.statSync(paths.prototype)
  return NextResponse.json({
    ok: true,
    slug,
    bytes: body.source.length,
    savedAt: stat.mtime.toISOString(),
    files: [paths.prototype, paths.content],
  })
}
