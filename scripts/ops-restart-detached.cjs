#!/usr/bin/env node
/**
 * ops-restart-detached.cjs — wrapper-less ops restart helper.
 *
 * Spawned as a detached process from /api/ops-restart with three args:
 *   <pid-to-kill> <mode: dev|prod> <port>
 *
 * The trick: this script runs OUTSIDE the dying ops process, so it
 * survives even when ops calls process.exit(0). It then waits for the
 * port to free (the kernel takes a moment to release a TCP socket),
 * runs `next build` for prod mode (so file changes get compiled in),
 * and spawns a fresh ops server detached from this script too.
 *
 * Why this exists: the original restart mechanism required
 * scripts/ops-dev-loop.bat to be running as a wrapper. If ops was
 * launched any other way (ops-dashboard-prod, ops-ask-3333), restart
 * was disabled. This script removes that dependency.
 *
 * Logs go to a dated file in the repo root so failures are visible.
 */

const fs = require("fs")
const path = require("path")
const net = require("net")
const { spawn } = require("child_process")

const REPO_ROOT = path.resolve(__dirname, "..")
const OPS_DIR = path.join(REPO_ROOT, "ops")
const LOG_FILE = path.join(REPO_ROOT, ".ops-restart.log")

const [pidStr, mode, portStr] = process.argv.slice(2)
const pid = parseInt(pidStr, 10)
const port = parseInt(portStr, 10)

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try { fs.appendFileSync(LOG_FILE, line) } catch {}
}

async function waitForPortFree(port, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const free = await new Promise((resolve) => {
      const s = net.createServer()
      s.once("error", () => resolve(false))
      s.once("listening", () => s.close(() => resolve(true)))
      try { s.listen(port, "127.0.0.1") } catch { resolve(false) }
    })
    if (free) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

function killOldProcess(pid) {
  if (!pid || isNaN(pid)) return
  try {
    process.kill(pid, "SIGTERM")
    log(`sent SIGTERM to pid ${pid}`)
  } catch (e) {
    log(`SIGTERM failed (process likely already exited): ${e.message}`)
  }
  // Windows: as a fallback, also try taskkill /F /T (force-kill the tree)
  if (process.platform === "win32") {
    try {
      const r = spawn("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" })
      r.on("error", () => {})
    } catch {}
  }
}

function spawnFreshOps(mode, port) {
  const env = { ...process.env, OPS_AUTH_BYPASS: "1" }
  // Don't propagate OPS_DEV_LOOP — we're not running under a wrapper.
  delete env.OPS_DEV_LOOP

  const stdoutLog = fs.openSync(path.join(REPO_ROOT, ".ops-restart-stdout.log"), "a")
  const stderrLog = fs.openSync(path.join(REPO_ROOT, ".ops-restart-stderr.log"), "a")

  const cmd = process.platform === "win32" ? "npx.cmd" : "npx"
  const args = mode === "prod"
    ? ["next", "start", "-p", String(port)]
    : ["next", "dev", "-p", String(port)]

  log(`spawning fresh ops: ${cmd} ${args.join(" ")} (cwd=${OPS_DIR})`)

  const child = spawn(cmd, args, {
    cwd: OPS_DIR,
    env,
    detached: true,
    stdio: ["ignore", stdoutLog, stderrLog],
    windowsHide: false,  // visible console so user sees output
    shell: false,
  })
  child.unref()
  log(`fresh ops pid=${child.pid}`)
}

async function buildOps() {
  return new Promise((resolve, reject) => {
    log("running `npx next build` for prod restart")
    const cmd = process.platform === "win32" ? "npx.cmd" : "npx"
    const child = spawn(cmd, ["next", "build"], {
      cwd: OPS_DIR,
      env: { ...process.env, OPS_AUTH_BYPASS: "1" },
      stdio: "inherit",
      shell: false,
    })
    child.on("exit", (code) => {
      log(`next build exited with code ${code}`)
      if (code === 0) resolve()
      else reject(new Error(`next build failed with code ${code}`))
    })
    child.on("error", (e) => {
      log(`next build spawn error: ${e.message}`)
      reject(e)
    })
  })
}

;(async () => {
  log(`ops-restart-detached started: pid=${pidStr}, mode=${mode}, port=${port}`)
  if (!port || isNaN(port)) {
    log("ERROR: invalid port")
    process.exit(1)
  }

  killOldProcess(pid)

  const portFree = await waitForPortFree(port)
  if (!portFree) {
    log(`ERROR: port ${port} did not free up within 30s`)
    process.exit(1)
  }
  log(`port ${port} is free`)

  if (mode === "prod") {
    try {
      await buildOps()
    } catch (e) {
      log(`ERROR: build failed: ${e.message}`)
      process.exit(1)
    }
  }

  spawnFreshOps(mode, port)
  log("ops-restart-detached complete; new server spawned detached")
  // We have to wait a moment to ensure the spawn actually starts,
  // then exit so this helper doesn't hang around.
  setTimeout(() => process.exit(0), 1500)
})()
