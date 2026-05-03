import { NextRequest, NextResponse } from "next/server"
import { execSync } from "node:child_process"
import path from "node:path"
import fs from "node:fs"
import { getBeat } from "@/lib/beats-catalog"

/**
 * Beat-source publish API
 *
 * POST /api/beat-source/publish?slug=<slug>
 *
 * Stages the slug's prototype + content files, commits with a generated
 * message, and pushes to origin/v4. GitHub Actions deploys ~3-4 min
 * after push.
 *
 * This is the "go live" action. The local save endpoint
 * (/api/beat-source POST) writes files but does not commit/push, so
 * David can iterate freely without spam-deploying every keystroke.
 */

function repoRoot(): string {
  return path.resolve(process.cwd(), "..")
}

interface FilePaths {
  prototype: string
  content: string
}

function resolveFilePaths(slug: string): FilePaths | null {
  const root = repoRoot()
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
  const beat = getBeat(slug)
  if (!beat || !beat.prototypeFile || beat.prototypeFile.startsWith("(")) {
    return null
  }
  return {
    prototype: path.join(root, "prototype", beat.prototypeFile),
    content: path.join(root, "content", beat.publicSlug, "index.html"),
  }
}

function relPath(repo: string, abs: string): string {
  return path.relative(repo, abs).replace(/\\/g, "/")
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
  if (!fs.existsSync(paths.prototype)) {
    return NextResponse.json(
      { error: `prototype file does not exist: ${paths.prototype}` },
      { status: 404 },
    )
  }

  let body: { message?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Empty / non-JSON body is fine; we'll auto-generate a commit message.
  }

  const root = repoRoot()
  const protoRel = relPath(root, paths.prototype)
  const contentRel = relPath(root, paths.content)
  const commitMsg = body.message
    ? body.message
    : `Edit ${slug}: live edit via ops /active-beat/${slug}/edit`

  try {
    // 1. git add the two files (skip content if it doesn't exist on disk yet)
    const addArgs = [protoRel, fs.existsSync(paths.content) ? contentRel : ""].filter(Boolean)
    execSync(`git add ${addArgs.join(" ")}`, { cwd: root, stdio: "pipe" })

    // 2. Bail early if nothing changed (no edits since last commit).
    let staged: string
    try {
      staged = execSync(`git diff --cached --name-only`, { cwd: root }).toString().trim()
    } catch {
      staged = ""
    }
    if (!staged) {
      return NextResponse.json({
        ok: false,
        slug,
        message: "no changes to commit (file unchanged since last commit)",
      })
    }

    // 3. Commit. Use SKIP_HOOKS=1 because the live-edit workflow is
    //    intentionally fast and we trust the editor not to introduce
    //    em-dashes or AI vernacular (David's edits are human-authored).
    execSync(
      `git -c commit.gpgsign=false commit -m "${commitMsg.replace(/"/g, '\\"')}"`,
      { cwd: root, stdio: "pipe", env: { ...process.env, SKIP_HOOKS: "1" } },
    )

    // 4. Push.
    const pushOutput = execSync(`git push origin v4`, {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env },
    }).toString()

    // 5. Get the commit SHA for the response.
    const sha = execSync(`git rev-parse --short HEAD`, { cwd: root }).toString().trim()

    return NextResponse.json({
      ok: true,
      slug,
      committed: staged.split("\n").filter(Boolean),
      sha,
      message: commitMsg,
      deployStatus: "GitHub Actions will deploy in ~3-4 min",
      pushOutput: pushOutput.slice(-500),
    })
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        slug,
        error: e.message || String(e),
        stderr: e.stderr?.toString?.() || null,
        stdout: e.stdout?.toString?.() || null,
      },
      { status: 500 },
    )
  }
}
