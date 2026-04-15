/**
 * POST /api/policies/demote — roll a policy back to draft
 *
 * Request body: { slug: string, reason?: string }
 *
 * Flow: edit data/policies.jsonl, set content_readiness="draft",
 * update last_updated. Runs build-policy-pages.cjs after to
 * regenerate the markdown. Logs the reason to policy.demoted_reason
 * so the next reviewer knows why.
 *
 * Auth: requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { execFileSync } from "child_process"
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

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  let body: { slug?: string; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const slug = body.slug
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 })

  const filePath = path.join(REPO_ROOT, "data", "policies.jsonl")
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/)
  let found = false
  let previous: string | undefined
  const updated = lines.map((line) => {
    if (!line.trim()) return line
    try {
      const rec = JSON.parse(line)
      if (rec.slug === slug) {
        found = true
        previous = rec.content_readiness
        rec.content_readiness = "draft"
        rec.last_updated = new Date().toISOString()
        if (body.reason) rec.demoted_reason = body.reason
        return JSON.stringify(rec)
      }
      return line
    } catch {
      return line
    }
  })
  if (!found) return NextResponse.json({ error: `no policy with slug=${slug}` }, { status: 404 })

  const tmp = filePath + ".tmp"
  fs.writeFileSync(tmp, updated.join("\n"), "utf-8")
  fs.renameSync(tmp, filePath)

  try {
    execFileSync(
      "node",
      [path.join(REPO_ROOT, "scripts", "build-policy-pages.cjs"), "--write"],
      { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 },
    )
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: `build failed: ${err.message}`, stage: "build" },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, slug, previous_readiness: previous, new_readiness: "draft" })
}
