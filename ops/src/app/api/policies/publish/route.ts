/**
 * POST /api/policies/publish — expose a policy's URL on the public site
 *
 * Request body: { slug: string, unpublish?: boolean }
 *
 * The public site ships with `CONSTRUCTION_MODE=true` in deploy.yml,
 * which suppresses every page except those in the allowlist at
 * `data/public-routes.json`. Publishing a policy = adding its slug
 * (e.g. "policies/housing") to that allowlist. Unpublishing removes it.
 *
 * The change to public-routes.json needs to land via git commit +
 * deploy workflow to actually go live. This route writes the file
 * but does NOT auto-commit — the Ops UI shows a clear "push to deploy"
 * prompt after the file is staged, and David confirms that step
 * manually (or future: a "deploy now" button).
 *
 * Gate: requires content_readiness == "verified" (you can't publish
 * a draft). Admin only.
 *
 * Auth: requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "policies.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const ALLOWLIST_PATH = path.join(REPO_ROOT, "data", "public-routes.json")
const POLICIES_PATH = path.join(REPO_ROOT, "data", "policies.jsonl")

function readPolicy(slug: string): any | null {
  if (!fs.existsSync(POLICIES_PATH)) return null
  const lines = fs.readFileSync(POLICIES_PATH, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      const rec = JSON.parse(line)
      if (rec.slug === slug) return rec
    } catch {}
  }
  return null
}

function readAllowlist(): string[] {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return ["index"]
  }
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, "utf-8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((s: unknown): s is string => typeof s === "string")
    }
  } catch {
    // fall through
  }
  return ["index"]
}

function writeAllowlist(slugs: string[]): void {
  // Keep stable order: index always first, then the rest alphabetized.
  const unique = Array.from(new Set(slugs))
  const rest = unique.filter((s) => s !== "index").sort()
  const ordered = unique.includes("index") ? ["index", ...rest] : rest
  const tmp = ALLOWLIST_PATH + ".tmp"
  fs.writeFileSync(tmp, JSON.stringify(ordered, null, 2) + "\n", "utf-8")
  fs.renameSync(tmp, ALLOWLIST_PATH)
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  let body: { slug?: string; unpublish?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const slug = body.slug
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 })

  // Gate: policy must be verified before it can be published
  const policy = readPolicy(slug)
  if (!policy) {
    return NextResponse.json({ error: `no policy with slug=${slug}` }, { status: 404 })
  }

  const routeSlug = `policies/${slug}`

  if (body.unpublish) {
    // Remove from allowlist
    const current = readAllowlist()
    if (!current.includes(routeSlug)) {
      return NextResponse.json({
        ok: true,
        slug,
        route: routeSlug,
        state: "already not public",
        allowlist: current,
      })
    }
    const next = current.filter((s) => s !== routeSlug)
    writeAllowlist(next)
    return NextResponse.json({
      ok: true,
      slug,
      route: routeSlug,
      state: "unpublished",
      allowlist: next,
      next_step:
        "Commit data/public-routes.json and deploy to remove /policies/" +
        slug +
        " from the live site.",
    })
  }

  // Publish path
  if (policy.content_readiness !== "verified") {
    return NextResponse.json(
      {
        ok: false,
        error: `cannot publish — content_readiness is "${policy.content_readiness || "draft"}", must be "verified"`,
        remedy: "POST /api/policies/promote { slug } first",
      },
      { status: 400 },
    )
  }

  const current = readAllowlist()
  if (current.includes(routeSlug)) {
    return NextResponse.json({
      ok: true,
      slug,
      route: routeSlug,
      state: "already public",
      allowlist: current,
    })
  }

  const next = [...current, routeSlug]
  writeAllowlist(next)

  return NextResponse.json({
    ok: true,
    slug,
    route: routeSlug,
    state: "staged",
    allowlist: next,
    next_step:
      "Commit data/public-routes.json and push to v4 to publish /policies/" +
      slug +
      " on thedonormap.org. The deploy workflow will rebuild with CONSTRUCTION_MODE=true and emit the allowlisted slugs.",
  })
}
