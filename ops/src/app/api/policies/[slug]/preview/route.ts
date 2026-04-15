/**
 * GET /api/policies/[slug]/preview — returns rendered markdown for inline preview
 *
 * Reads content/Policies/[slug].md from disk and returns:
 *   - raw markdown body (post-frontmatter)
 *   - frontmatter as JSON
 *
 * The Ops /policies page passes the body to react-markdown + remark-gfm
 * for rendering. What David sees here is what a public reader sees on
 * the live site (the file is the same one Quartz builds from).
 *
 * Auth: requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import matter from "gray-matter"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "content", "Policies"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())

// Only these slugs are valid — prevents path traversal attacks
const ALLOWED_SLUGS = new Set([
  "housing",
  "healthcare",
  "aipac_bds",
  "minimum_wage",
  "student_debt",
  "index",
  "who-blocks-us",
])

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const { slug } = await params

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: `unknown slug: ${slug}` }, { status: 404 })
  }

  const filePath = path.join(REPO_ROOT, "content", "Policies", `${slug}.md`)
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: `file not found: ${slug}.md` },
      { status: 404 },
    )
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8")
    const parsed = matter(raw)
    return NextResponse.json({
      slug,
      frontmatter: parsed.data,
      body: parsed.content,
      raw,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: `failed to read: ${err.message || err}` },
      { status: 500 },
    )
  }
}
