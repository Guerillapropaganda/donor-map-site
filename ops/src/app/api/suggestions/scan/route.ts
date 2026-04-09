import { NextResponse } from "next/server"
import { execSync } from "child_process"
import path from "path"

// POST — trigger relationship discovery scanner
export async function POST() {
  try {
    const repoRoot = path.resolve(process.cwd(), "..")
    const scriptPath = path.join(repoRoot, "scripts", "relationship-discovery.cjs")

    // Run the scanner script
    const output = execSync(`node "${scriptPath}"`, {
      cwd: repoRoot,
      timeout: 120000, // 2 minute timeout
      encoding: "utf-8",
      env: { ...process.env, CONTENT_DIR: path.join(repoRoot, "content") },
    })

    // Parse output for stats
    const statsMatch = output.match(/Total:\s*(\d+)/)
    const total = statsMatch ? parseInt(statsMatch[1]) : 0

    return NextResponse.json({
      success: true,
      stats: { total },
      output: output.slice(-500), // last 500 chars of output
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
