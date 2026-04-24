/**
 * /api/vault-audit — reads and re-runs the unified vault-audit harness.
 *
 * GET  → returns content/Admin Notes/vault-audit-latest.json (artifact
 *        written by scripts/vault-audit.cjs). Response includes an
 *        age_minutes field so the UI can show "X min ago / stale".
 *
 * POST → spawns `node scripts/vault-audit.cjs` and waits for it to
 *        finish, then returns the fresh artifact. Runtime is ~6s on
 *        current vault (Phase 1 skeleton, 6 checks). Auth: requireAdmin.
 *
 * ADR-0021 Phase 2 — wire the Ops app to the harness.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import path from "path"
import fs from "fs"
import { spawn } from "child_process"

export const dynamic = "force-dynamic"
export const maxDuration = 300

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "scripts", "vault-audit.cjs"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())
const ARTIFACT_PATH = path.join(
  REPO_ROOT,
  "content",
  "Admin Notes",
  "vault-audit-latest.json",
)
const HARNESS_SCRIPT = path.join(REPO_ROOT, "scripts", "vault-audit.cjs")

function readArtifact() {
  if (!fs.existsSync(ARTIFACT_PATH)) {
    return {
      error: "artifact not found",
      hint: "run `node scripts/vault-audit.cjs` or POST to this endpoint",
    }
  }
  try {
    const raw = fs.readFileSync(ARTIFACT_PATH, "utf-8")
    const artifact = JSON.parse(raw)
    const generated = new Date(artifact.generated_at).getTime()
    const age_minutes = Math.round((Date.now() - generated) / 60000)
    return { ...artifact, age_minutes }
  } catch (err: any) {
    return { error: `failed to read artifact: ${err.message}` }
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  const data = readArtifact()
  if ("error" in data && !("generated_at" in data)) {
    return NextResponse.json(data, { status: 404 })
  }
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  if (!fs.existsSync(HARNESS_SCRIPT)) {
    return NextResponse.json(
      { error: "harness script not found", path: HARNESS_SCRIPT },
      { status: 500 },
    )
  }

  const run: { stdout: string; stderr: string; exit: number | null } = await new Promise(
    (resolve) => {
      const child = spawn("node", [HARNESS_SCRIPT, "--quiet"], {
        cwd: REPO_ROOT,
        env: process.env,
      })
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
      })
      child.on("close", (code) => {
        resolve({ stdout, stderr, exit: code })
      })
      child.on("error", (err) => {
        resolve({ stdout, stderr: stderr + String(err), exit: null })
      })
    },
  )

  if (run.exit !== 0) {
    return NextResponse.json(
      {
        error: "harness exited non-zero",
        exit: run.exit,
        stderr_tail: run.stderr.split("\n").slice(-10).join("\n"),
      },
      { status: 500 },
    )
  }

  const data = readArtifact()
  return NextResponse.json(data)
}
