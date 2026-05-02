import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"
import { getBeat } from "@/lib/beats-catalog"
import { runPreflight } from "@/lib/preflight"

/**
 * POST /api/publish-beat
 * Body: { slug: string }
 *
 * Adds the beat's publicSlug to data/public-routes.json after running
 * the preflight gates. Refuses to publish if any blocking gate fails.
 *
 * This is a Tier 3 action (Rule 13, ADR-0017): public-route exposure
 * is the editor's lane. The button is the editor clicking; the API
 * just performs the file write after preflight passes.
 *
 * Writes a one-line entry to data/change-log.jsonl for audit trail.
 *
 * GET /api/publish-beat?slug=xxx returns the current preflight result
 * without doing anything (used by the page to refresh status).
 */

const REPO_ROOT = path.join(process.cwd(), "..")
const PUBLIC_ROUTES_PATH = path.join(REPO_ROOT, "data", "public-routes.json")
const CHANGE_LOG_PATH = path.join(REPO_ROOT, "data", "change-log.jsonl")

function readPublicRoutes(): string[] {
  try {
    const text = fs.readFileSync(PUBLIC_ROUTES_PATH, "utf-8")
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === "string")
  } catch {
    return []
  }
}

function writePublicRoutes(routes: string[]): void {
  // Preserve canonical formatting: 2-space indent, trailing newline
  fs.writeFileSync(PUBLIC_ROUTES_PATH, JSON.stringify(routes, null, 2) + "\n", "utf-8")
}

function appendChangeLog(entry: Record<string, unknown>): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...entry })
  try {
    fs.appendFileSync(CHANGE_LOG_PATH, line + "\n", "utf-8")
  } catch {
    // Non-fatal: change log is for audit only
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "slug query param required" }, { status: 400 })
  const beat = getBeat(slug)
  if (!beat) return NextResponse.json({ error: `unknown beat slug: ${slug}` }, { status: 404 })
  const preflight = runPreflight(beat)
  return NextResponse.json({ slug, beat: { slug: beat.slug, title: beat.title }, preflight })
}

export async function POST(req: NextRequest) {
  let body: { slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const slug = body.slug
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "slug required in body" }, { status: 400 })
  }

  const beat = getBeat(slug)
  if (!beat) return NextResponse.json({ error: `unknown beat slug: ${slug}` }, { status: 404 })

  const preflight = runPreflight(beat)
  if (!preflight.canPublish) {
    if (preflight.isLive) {
      return NextResponse.json(
        { error: `${beat.publicSlug} is already in public-routes.json`, preflight },
        { status: 409 },
      )
    }
    return NextResponse.json(
      {
        error: `Preflight failed: ${preflight.failingCount} blocking gate(s) not green`,
        preflight,
      },
      { status: 412 },
    )
  }

  // All gates passed. Append slug to public-routes.json.
  const routes = readPublicRoutes()
  if (routes.includes(beat.publicSlug)) {
    // Race condition safety
    return NextResponse.json({ error: "slug already present (race)", preflight }, { status: 409 })
  }
  const newRoutes = [...routes, beat.publicSlug]
  writePublicRoutes(newRoutes)

  appendChangeLog({
    kind: "publish-beat",
    slug: beat.slug,
    publicSlug: beat.publicSlug,
    title: beat.title,
    decided_by: "editor",
    routes_after: newRoutes,
  })

  // Re-run preflight to reflect the new live state
  const after = runPreflight(beat)
  return NextResponse.json({
    success: true,
    slug: beat.slug,
    publicSlug: beat.publicSlug,
    routes: newRoutes,
    preflight: after,
  })
}
