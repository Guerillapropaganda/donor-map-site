/**
 * /api/ops-restart — restart the Next.js ops server.
 *
 * Two restart strategies, picked based on env:
 *
 *   1. Wrapper mode (OPS_DEV_LOOP=1) — process.exit(0) and let
 *      scripts/ops-dev-loop.bat respawn. Fast (~3s), dev-only.
 *
 *   2. Detached mode (default) — spawn scripts/ops-restart-detached.cjs
 *      as a fully detached process before exiting. The detached helper
 *      survives this server's death, waits for the port to free, runs
 *      `next build` if NODE_ENV=production, then spawns a fresh ops
 *      server. Works regardless of how ops was launched.
 *
 * Detached mode is slower (~5s for dev, ~30s for prod with rebuild)
 * but always works. The Dashboard's button stays enabled either way.
 *
 * Auth: requireAdmin (only David can trigger restart).
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { spawn } from "child_process"
import path from "path"
import fs from "fs"

export const dynamic = "force-dynamic"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "scripts", "ops-restart-detached.cjs"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

const REPO_ROOT = findRepoRoot(process.cwd())

function detectMode(): "dev" | "prod" {
  return process.env.NODE_ENV === "production" ? "prod" : "dev"
}

function detectPort(): number {
  // Next.js sets PORT in the env, but only sometimes. Fall back to
  // parsing the listen address from process.argv if present, then 3333.
  const fromEnv = parseInt(process.env.PORT || "", 10)
  if (!isNaN(fromEnv) && fromEnv > 0) return fromEnv
  const portArg = process.argv.find((a, i) =>
    process.argv[i - 1] === "-p" || process.argv[i - 1] === "--port"
  )
  const fromArg = parseInt(portArg || "", 10)
  if (!isNaN(fromArg) && fromArg > 0) return fromArg
  return 3333
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  // Wrapper mode: simple exit, wrapper respawns
  if (process.env.OPS_DEV_LOOP) {
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log("[/api/ops-restart] exiting for wrapper-respawn")
      process.exit(0)
    }, 250)
    return NextResponse.json({
      ok: true,
      restarting: true,
      mode: "wrapper",
      message: "exiting; ops-dev-loop.bat will respawn in ~1s",
    })
  }

  // Detached mode: spawn the relauncher script before we exit.
  // Without this script, exit(0) would leave a dead tab.
  const scriptPath = path.join(REPO_ROOT, "scripts", "ops-restart-detached.cjs")
  if (!fs.existsSync(scriptPath)) {
    return NextResponse.json(
      {
        ok: false,
        error: "relauncher script not found",
        message: `expected ${scriptPath}`,
      },
      { status: 500 },
    )
  }

  const mode = detectMode()
  const port = detectPort()

  // Open log files so the detached child has somewhere to write
  // (otherwise stdio: 'ignore' silences errors).
  const stdoutFd = fs.openSync(path.join(REPO_ROOT, ".ops-restart-launcher.log"), "a")
  const stderrFd = fs.openSync(path.join(REPO_ROOT, ".ops-restart-launcher.log"), "a")

  const child = spawn(
    process.execPath,
    [scriptPath, String(process.pid), mode, String(port)],
    {
      detached: true,
      stdio: ["ignore", stdoutFd, stderrFd],
      shell: false,
      windowsHide: true,
      cwd: REPO_ROOT,
    },
  )
  child.unref()

  // Give the detached child time to read its argv and start its own
  // logging before we exit. 500ms is enough for it to fork off.
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.log("[/api/ops-restart] exiting; detached relauncher pid=", child.pid)
    process.exit(0)
  }, 500)

  return NextResponse.json({
    ok: true,
    restarting: true,
    mode: mode === "prod" ? "detached-rebuild" : "detached",
    relauncher_pid: child.pid,
    estimated_seconds: mode === "prod" ? 30 : 8,
    message: mode === "prod"
      ? "exiting; rebuilding production bundle (~30s) then relaunching"
      : "exiting; relauncher will spawn fresh ops in ~5s",
  })
}

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req)
  if (!gate.ok) return gate.response

  // Both wrapper-mode AND detached-mode now work. The button can stay
  // enabled in both cases. We still expose wrapper_detected for the
  // tooltip + label, since wrapper mode is faster.
  return NextResponse.json({
    ok: true,
    uptime_sec: Math.round(process.uptime()),
    pid: process.pid,
    wrapper_detected: !!process.env.OPS_DEV_LOOP,
    mode: detectMode(),
    port: detectPort(),
    restart_strategy: process.env.OPS_DEV_LOOP ? "wrapper" : "detached",
  })
}
