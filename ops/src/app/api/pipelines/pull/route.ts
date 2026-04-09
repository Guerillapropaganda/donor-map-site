import { NextResponse } from "next/server"
import { execSync } from "child_process"
import path from "path"

// POST /api/pipelines/pull — git pull latest changes from origin
export async function POST() {
  try {
    const vaultRoot = path.resolve(process.cwd(), "..")
    const result = execSync("git pull --no-rebase origin v4", {
      cwd: vaultRoot,
      encoding: "utf-8",
      timeout: 30000,
    })
    return NextResponse.json({ success: true, output: result.trim() })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
