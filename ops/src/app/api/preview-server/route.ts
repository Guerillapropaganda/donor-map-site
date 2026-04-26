/**
 * /api/preview-server — manage the local Quartz preview server.
 *
 * The editor's preview pane wants to show the actual rendered site,
 * not approximate markdown. Quartz dev mode (`npx quartz build --serve`)
 * gives us byte-identical rendering on localhost:8080. This route
 * manages that child process from the ops UI:
 *
 *   GET  → returns { running, port, pid?, startedAt? }
 *   POST { action: "start" | "stop" } → toggles the server
 *
 * Implementation notes:
 *   - PID is stored in `.preview-server.pid` at the repo root so it
 *     survives ops dev-server restarts. On startup we re-validate the
 *     PID is still alive before trusting it.
 *   - Liveness is determined by HTTP probing localhost:8080. A live
 *     PID without a responsive port is considered "starting…" until
 *     the port comes up (or fails to within ~30s — at which point the
 *     UI shows "start failed; check logs").
 *   - Start spawns detached + unref'd so the child outlives this
 *     process. Stop sends SIGTERM, falls back to taskkill on Windows.
 *
 * The Quartz dev server takes 30s–2min to start on a cold cache and is
 * near-instant after that. The UI handles this latency by polling
 * status after a start request.
 */

import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import * as fs from "fs"
import * as path from "path"

export const dynamic = "force-dynamic"

const PREVIEW_PORT = 8080
const REPO_ROOT = path.join(process.cwd(), "..")
const PID_FILE = path.join(REPO_ROOT, ".preview-server.pid")
const LOG_FILE = path.join(REPO_ROOT, ".preview-server.log")

interface PidRecord {
  pid: number
  startedAt: string
}

function readPidFile(): PidRecord | null {
  try {
    const raw = fs.readFileSync(PID_FILE, "utf-8")
    const parsed = JSON.parse(raw) as PidRecord
    if (typeof parsed.pid !== "number") return null
    return parsed
  } catch {
    return null
  }
}

function writePidFile(rec: PidRecord) {
  fs.writeFileSync(PID_FILE, JSON.stringify(rec, null, 2), "utf-8")
}

function deletePidFile() {
  try {
    fs.unlinkSync(PID_FILE)
  } catch {
    // already gone
  }
}

// Is a PID alive? On Windows, kill(0) throws ESRCH for dead processes
// and EPERM for "alive but you don't have permission" (which still
// means "exists" → treat as alive).
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === "EPERM") return true
    return false
  }
}

// Probe the dev server port. Quick timeout — we don't want this route
// to hang waiting on a half-dead server.
async function isPortResponsive(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(`http://localhost:${PREVIEW_PORT}/`, {
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    return res.status < 500
  } catch {
    return false
  }
}

// Read the last few non-blank lines of the Quartz build log so the UI
// can show what the server is actively working on. Quartz prints
// progress lines (e.g. "Parsed N markdown files") that are very
// reassuring during a slow first build.
function readLogTail(maxLines = 5): string[] {
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf-8")
    // ANSI codes from Quartz's progress output are noise here; strip.
    // eslint-disable-next-line no-control-regex
    const cleaned = raw.replace(/\[[0-9;]*[a-zA-Z]/g, "")
    const lines = cleaned
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    return lines.slice(-maxLines)
  } catch {
    return []
  }
}

async function getStatus() {
  const rec = readPidFile()
  const portUp = await isPortResponsive()

  if (rec && isProcessAlive(rec.pid)) {
    return {
      running: portUp,
      starting: !portUp, // PID alive but port not yet responsive
      port: PREVIEW_PORT,
      pid: rec.pid,
      startedAt: rec.startedAt,
      logTail: portUp ? [] : readLogTail(),
    }
  }

  // PID file but dead process — clean up
  if (rec && !isProcessAlive(rec.pid)) {
    deletePidFile()
  }

  return {
    running: portUp, // somebody else might be on 8080
    starting: false,
    port: PREVIEW_PORT,
    pid: null,
    startedAt: null,
    foreign: portUp, // running but not started by us
    logTail: [],
  }
}

function startServer(): { ok: boolean; pid?: number; error?: string } {
  const existing = readPidFile()
  if (existing && isProcessAlive(existing.pid)) {
    return { ok: true, pid: existing.pid }
  }

  // Open log file in append mode so we can tail later if start fails.
  const logFd = fs.openSync(LOG_FILE, "a")
  fs.writeSync(
    logFd,
    `\n\n=== preview-server start ${new Date().toISOString()} ===\n`,
  )

  // Quartz dev server. Runs from repo root. Detached so it outlives
  // this Node process; unref so we don't keep our event loop alive
  // waiting on it.
  const isWindows = process.platform === "win32"
  const cmd = isWindows ? "npx.cmd" : "npx"
  const args = ["quartz", "build", "--serve", "--port", String(PREVIEW_PORT)]

  let child
  try {
    child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      shell: isWindows, // .cmd files need shell on Windows
      windowsHide: true,
    })
  } catch (e) {
    fs.closeSync(logFd)
    return { ok: false, error: (e as Error).message }
  }

  if (!child.pid) {
    fs.closeSync(logFd)
    return { ok: false, error: "spawn failed: no PID" }
  }

  child.unref()

  writePidFile({
    pid: child.pid,
    startedAt: new Date().toISOString(),
  })

  return { ok: true, pid: child.pid }
}

function stopServer(): { ok: boolean; error?: string } {
  const rec = readPidFile()
  if (!rec) return { ok: true } // nothing to stop

  if (!isProcessAlive(rec.pid)) {
    deletePidFile()
    return { ok: true }
  }

  try {
    if (process.platform === "win32") {
      // SIGTERM doesn't reliably kill the process tree on Windows
      // (npx spawns node which spawns Quartz; we need to kill the tree).
      // Use taskkill /T /F to terminate the whole tree.
      const { execSync } = require("child_process") as typeof import("child_process")
      execSync(`taskkill /PID ${rec.pid} /T /F`, { stdio: "ignore" })
    } else {
      // Unix: kill the process group (negative PID).
      try {
        process.kill(-rec.pid, "SIGTERM")
      } catch {
        process.kill(rec.pid, "SIGTERM")
      }
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  deletePidFile()
  return { ok: true }
}

export async function GET(_req: NextRequest) {
  const status = await getStatus()
  return NextResponse.json(status)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action as "start" | "stop" | undefined

  if (action === "start") {
    const r = startServer()
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: r.error, logFile: LOG_FILE },
        { status: 500 },
      )
    }
    const status = await getStatus()
    return NextResponse.json({ ok: true, ...status })
  }

  if (action === "stop") {
    const r = stopServer()
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.error }, { status: 500 })
    }
    return NextResponse.json({ ok: true, running: false, port: PREVIEW_PORT })
  }

  return NextResponse.json(
    { ok: false, error: "unknown action; expected start | stop" },
    { status: 400 },
  )
}
