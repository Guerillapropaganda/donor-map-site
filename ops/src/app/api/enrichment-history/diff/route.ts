import { NextResponse } from "next/server"
import { execSync } from "child_process"
import path from "path"

// Get the actual diff for a specific file in a specific commit
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sha = searchParams.get("sha")
  const filePath = searchParams.get("path")

  if (!sha || !filePath) {
    return NextResponse.json({ error: "sha and path required" }, { status: 400 })
  }

  try {
    const repoRoot = path.resolve(process.cwd(), "..")

    // Get the diff for this specific file in this commit
    const diff = execSync(
      `git show ${sha} -- "${filePath}"`,
      { cwd: repoRoot, encoding: "utf-8", timeout: 10000 }
    )

    // Parse the diff into human-readable changes
    const changes = parseDiff(diff)

    return NextResponse.json({ sha, path: filePath, changes })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

interface Change {
  type: "added" | "removed" | "context"
  field?: string
  value?: string
  line: string
}

function parseDiff(diff: string): { added: Change[]; removed: Change[]; summary: string[] } {
  const lines = diff.split("\n")
  const added: Change[] = []
  const removed: Change[] = []
  const summary: string[] = []

  // Track frontmatter changes
  const fmAdded: Record<string, string> = {}
  const fmRemoved: Record<string, string> = {}
  let inFrontmatter = false
  let fmCount = 0

  for (const line of lines) {
    // Track frontmatter boundaries
    if (line === "+---" || line === "----") {
      fmCount++
      if (fmCount <= 2) inFrontmatter = true
      if (fmCount >= 3) inFrontmatter = false
      continue
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const content = line.slice(1).trim()
      if (!content) continue

      // Parse frontmatter field
      const fmMatch = content.match(/^([a-z][\w-]*)\s*:\s*(.*)$/i)
      if (fmMatch) {
        fmAdded[fmMatch[1]] = fmMatch[2].replace(/^['"]|['"]$/g, "")
        added.push({ type: "added", field: fmMatch[1], value: fmMatch[2], line: content })
      } else {
        added.push({ type: "added", line: content })
      }
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      const content = line.slice(1).trim()
      if (!content) continue

      const fmMatch = content.match(/^([a-z][\w-]*)\s*:\s*(.*)$/i)
      if (fmMatch) {
        fmRemoved[fmMatch[1]] = fmMatch[2].replace(/^['"]|['"]$/g, "")
        removed.push({ type: "removed", field: fmMatch[1], value: fmMatch[2], line: content })
      } else {
        removed.push({ type: "removed", line: content })
      }
    }
  }

  // Generate human-readable summary
  for (const [field, value] of Object.entries(fmAdded)) {
    if (fmRemoved[field]) {
      summary.push(`Updated ${field}: ${fmRemoved[field]} → ${value}`)
    } else {
      summary.push(`Added ${field}: ${value}`)
    }
  }
  for (const [field] of Object.entries(fmRemoved)) {
    if (!fmAdded[field]) {
      summary.push(`Removed ${field}`)
    }
  }

  // Count non-frontmatter content changes
  const bodyAdded = added.filter((c) => !c.field).length
  const bodyRemoved = removed.filter((c) => !c.field).length
  if (bodyAdded > 0) summary.push(`${bodyAdded} lines of content added`)
  if (bodyRemoved > 0) summary.push(`${bodyRemoved} lines of content removed`)

  return { added, removed, summary }
}
