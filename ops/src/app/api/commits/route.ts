import { NextResponse } from "next/server"
import { execSync } from "child_process"
import path from "path"

export async function GET() {
  try {
    // Read git log locally — zero API calls
    const repoRoot = path.resolve(process.cwd(), "..")

    const log = execSync(
      'git log --oneline --format="%h|%s|%ai|%an" -20',
      { cwd: repoRoot, encoding: "utf-8", timeout: 5000 }
    )

    const commits = log
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, message, date, author] = line.split("|")
        return { sha, message, date, author }
      })

    return NextResponse.json({ commits })
  } catch (error: unknown) {
    // Fallback to GitHub API if local git fails
    try {
      const { getRecentCommits } = await import("@/lib/github")
      const commits = await getRecentCommits(20)
      return NextResponse.json({ commits })
    } catch {
      const message = error instanceof Error ? error.message : "Unknown error"
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
