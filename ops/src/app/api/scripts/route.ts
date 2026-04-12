import { NextResponse } from "next/server"
import { exec } from "child_process"
import path from "path"

// Allowlist of scripts that can be run from the UI.
// Only safe (read-only) and writes-profiles scripts are allowed.
// Destructive scripts are never allowed.
const ALLOWED_SCRIPTS: Record<string, { command: string; danger: "safe" | "writes-profiles" }> = {
  "morning-briefing": { command: "node scripts/morning-briefing.cjs", danger: "safe" },
  "s-tier-candidate-scanner": { command: "node scripts/s-tier-candidate-scanner.cjs", danger: "safe" },
  "sign-off-reminder": { command: "node scripts/sign-off-reminder.cjs", danger: "safe" },
  "voice-drift-detector": { command: "node scripts/voice-drift-detector.cjs", danger: "safe" },
  "hallucination-catcher": { command: "node scripts/hallucination-catcher.cjs", danger: "safe" },
  "promotion-candidate-queue": { command: "node scripts/promotion-candidate-queue.cjs", danger: "safe" },
  "contradiction-miner": { command: "node scripts/contradiction-miner.cjs", danger: "safe" },
  "missing-profile-detector": { command: "node scripts/missing-profile-detector.cjs", danger: "safe" },
  "connection-suggester": { command: "node scripts/connection-suggester.cjs", danger: "safe" },
  "relationship-bidirectional": { command: "node scripts/relationship-bidirectional.cjs", danger: "safe" },
  "url-staleness": { command: "node scripts/url-staleness.cjs", danger: "safe" },
  "verify-fec-candidate-ids": { command: "node scripts/verify-fec-candidate-ids.cjs", danger: "safe" },
  "pipeline-janitor": { command: "node scripts/pipeline-janitor.cjs", danger: "safe" },
  "pipeline-janitor-write": { command: "node scripts/pipeline-janitor.cjs --write", danger: "writes-profiles" },
  "duplicate-bioguide-sentinel": { command: "node scripts/duplicate-bioguide-sentinel.cjs", danger: "safe" },
  "self-review-mirror": { command: "node scripts/self-review-mirror.cjs", danger: "safe" },
  "yaml-sanity-scan": { command: "node scripts/yaml-sanity-scan.cjs", danger: "safe" },
  "strip-inline-dataview": { command: "node scripts/strip-inline-dataview.cjs --dry-run", danger: "safe" },
  "normalize-related-bidirectionality": { command: "node scripts/normalize-related-bidirectionality.cjs --dry-run", danger: "safe" },
  "build-relationships-per-profile": { command: "node scripts/build-relationships-per-profile.cjs", danger: "writes-profiles" },
}

export async function POST(request: Request) {
  try {
    const { scriptId } = await request.json()

    if (!scriptId || !ALLOWED_SCRIPTS[scriptId]) {
      return NextResponse.json({ error: `Unknown or disallowed script: ${scriptId}` }, { status: 400 })
    }

    const script = ALLOWED_SCRIPTS[scriptId]
    const repoRoot = path.resolve(process.cwd(), "..")

    return new Promise<NextResponse>((resolve) => {
      exec(script.command, { cwd: repoRoot, timeout: 120_000, maxBuffer: 5 * 1024 * 1024 }, (error, stdout, stderr) => {
        const output = stdout || stderr || ""
        const lines = output.split("\n").filter(Boolean)
        const lastLines = lines.slice(-50).join("\n")

        if (error) {
          resolve(NextResponse.json({
            success: false,
            scriptId,
            exitCode: error.code || 1,
            output: lastLines,
            error: error.message,
          }))
        } else {
          resolve(NextResponse.json({
            success: true,
            scriptId,
            exitCode: 0,
            output: lastLines,
            lineCount: lines.length,
          }))
        }
      })
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
