/**
 * POST /api/policies/promote — promote a policy to content_readiness: "verified"
 *
 * Request body: { slug: string }
 *
 * Flow:
 *   1. Run publication-readiness-check.cjs on content/Policies/[slug].md
 *      as a FINAL gate. If it fails, refuse to promote and return the
 *      failures so the UI can show them.
 *   2. Edit data/policies.jsonl: set the matching policy's
 *      content_readiness to "verified" and last_updated to now.
 *   3. Run build-policy-pages.cjs to regenerate content/Policies/[slug].md
 *      with the new frontmatter.
 *   4. Re-run publication-readiness-check to confirm post-rebuild.
 *
 * Auth: requireAdmin.
 *
 * NOTE: promoting is NOT publishing. This only flips the internal flag.
 * To expose /policies/[slug] on the live site, a separate /publish
 * action removes the under-construction route guard (see the publish
 * route). This separation is intentional — promoting is cheap and
 * reversible; publishing is a public deploy.
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

function runReadinessCheck(slug: string): { ready: boolean; failures: string[] } {
  const fileRel = `content/Policies/${slug}.md`
  try {
    const out = execFileSync(
      "node",
      [
        path.join(REPO_ROOT, "scripts", "publication-readiness-check.cjs"),
        "--file",
        fileRel,
        "--json",
      ],
      { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 },
    )
    const parsed = JSON.parse(out)
    return {
      ready: parsed.results?.[0]?.ready || false,
      failures: parsed.results?.[0]?.failures || [],
    }
  } catch (err: any) {
    if (err.stdout) {
      try {
        const parsed = JSON.parse(err.stdout)
        return {
          ready: parsed.results?.[0]?.ready || false,
          failures: parsed.results?.[0]?.failures || [],
        }
      } catch {}
    }
    return { ready: false, failures: [`readiness-check crashed: ${err.message}`] }
  }
}

function runPolicyBuilder(): { ok: boolean; error?: string } {
  try {
    execFileSync(
      "node",
      [path.join(REPO_ROOT, "scripts", "build-policy-pages.cjs"), "--write"],
      { cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 16 * 1024 * 1024 },
    )
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) }
  }
}

function updatePolicyReadiness(slug: string, newReadiness: string): {
  ok: boolean
  error?: string
  previous?: string
} {
  const filePath = path.join(REPO_ROOT, "data", "policies.jsonl")
  if (!fs.existsSync(filePath)) {
    return { ok: false, error: "data/policies.jsonl not found" }
  }
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/)
  let previous: string | undefined = undefined
  let found = false
  const updated = lines.map((line) => {
    if (!line.trim()) return line
    try {
      const record = JSON.parse(line)
      if (record.slug === slug) {
        found = true
        previous = record.content_readiness || "draft"
        record.content_readiness = newReadiness
        record.last_updated = new Date().toISOString()
        return JSON.stringify(record)
      }
      return line
    } catch {
      return line
    }
  })
  if (!found) {
    return { ok: false, error: `no policy with slug=${slug}` }
  }
  // Atomic write via tmp + rename
  const tmpPath = filePath + ".tmp"
  fs.writeFileSync(tmpPath, updated.join("\n"), "utf-8")
  fs.renameSync(tmpPath, filePath)
  return { ok: true, previous }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  let body: { slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const slug = body.slug
  if (!slug) {
    return NextResponse.json({ error: "slug required in body" }, { status: 400 })
  }

  // Step 1: final gate check BEFORE promoting
  const pre = runReadinessCheck(slug)
  if (!pre.ready) {
    return NextResponse.json(
      {
        ok: false,
        error: "publication-readiness-check failed",
        failures: pre.failures,
        stage: "pre-gate",
      },
      { status: 400 },
    )
  }

  // Step 2: update data/policies.jsonl
  const updateResult = updatePolicyReadiness(slug, "verified")
  if (!updateResult.ok) {
    return NextResponse.json(
      { ok: false, error: updateResult.error, stage: "jsonl-update" },
      { status: 500 },
    )
  }

  // Step 3: rebuild the markdown files
  const buildResult = runPolicyBuilder()
  if (!buildResult.ok) {
    // Rollback the jsonl update
    updatePolicyReadiness(slug, updateResult.previous || "draft")
    return NextResponse.json(
      { ok: false, error: buildResult.error, stage: "build" },
      { status: 500 },
    )
  }

  // Step 4: re-run readiness check to confirm post-rebuild state
  const post = runReadinessCheck(slug)

  return NextResponse.json({
    ok: true,
    slug,
    previous_readiness: updateResult.previous,
    new_readiness: "verified",
    post_gate: {
      ready: post.ready,
      failures: post.failures,
    },
  })
}
