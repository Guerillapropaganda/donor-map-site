#!/usr/bin/env node
/**
 * setup-bulk-junction.cjs
 *
 * Link this repo's `data/bulk/` directory to the external, persistent
 * bulk data store at C:\donor-map-data\bulk\ via a Windows directory
 * junction. The external store survives worktree cleanup, repo re-clones,
 * `git clean -fdx`, and anything else that would nuke gitignored content.
 *
 * Why: bulk CSVs and ZIPs (FEC 26GB, USASpending, voting records, etc.)
 * are gitignored because they're too large for git. Previous sessions
 * put them inside a worktree's data/bulk/ and lost them when the
 * worktree got cleaned up. This script guarantees all worktrees point
 * at the same canonical external location, so the raw source files
 * only need to be downloaded once.
 *
 * Safe to re-run — detects existing junction and skips if already set up.
 * Windows only (uses mklink /J). If you're on another OS, adjust to use
 * ln -s against a platform-appropriate external path.
 *
 * Usage:
 *   node scripts/dev/setup-bulk-junction.cjs
 *   node scripts/dev/setup-bulk-junction.cjs --target D:\my-data\bulk
 */
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const REPO_ROOT = path.resolve(__dirname, "..", "..")
const LINK_PATH = path.join(REPO_ROOT, "data", "bulk")

const targetIdx = process.argv.indexOf("--target")
const TARGET = targetIdx !== -1
  ? process.argv[targetIdx + 1]
  : "C:\\donor-map-data\\bulk"

function log(msg) { console.log(msg) }

function main() {
  if (process.platform !== "win32") {
    console.error("This helper is Windows-only. On macOS/Linux, use:")
    console.error(`  ln -s ${TARGET} "${LINK_PATH}"`)
    process.exit(1)
  }

  log(`Repo: ${REPO_ROOT}`)
  log(`Link: ${LINK_PATH}`)
  log(`Target: ${TARGET}`)
  log("")

  // 1. Make sure the external target exists.
  if (!fs.existsSync(TARGET)) {
    log(`Creating external bulk store at ${TARGET}...`)
    fs.mkdirSync(TARGET, { recursive: true })
  } else {
    log(`External store already exists.`)
  }

  // 2. Handle whatever currently sits at data/bulk.
  if (fs.existsSync(LINK_PATH)) {
    let stat
    try { stat = fs.lstatSync(LINK_PATH) } catch { stat = null }
    if (stat && stat.isSymbolicLink()) {
      // Junctions report as symlinks in Node on Windows
      log(`data/bulk/ is already a link — leaving it in place.`)
      log(`(If it points to the wrong target, delete it first and re-run.)`)
      return
    }
    // It's a real folder. If it has content, bail — don't clobber.
    const entries = fs.readdirSync(LINK_PATH)
    if (entries.length > 0) {
      console.error(`data/bulk/ exists as a real folder with ${entries.length} entries.`)
      console.error(`Refusing to replace — move its contents to ${TARGET} manually, then remove the folder and re-run.`)
      process.exit(2)
    }
    log(`data/bulk/ is empty — removing so we can junction it.`)
    fs.rmdirSync(LINK_PATH)
  }

  // 3. Make the data/ parent dir exist.
  const parent = path.dirname(LINK_PATH)
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true })

  // 4. Create the junction. mklink /J can't take forward slashes, so use
  //    the raw Windows paths. Also run from data/ so the cwd handles
  //    quoting cleanly.
  log(`Creating junction data/bulk -> ${TARGET}...`)
  execSync(`mklink /J bulk "${TARGET}"`, { cwd: parent, shell: "cmd.exe", stdio: "inherit" })

  // 5. Round-trip test.
  const marker = path.join(TARGET, `_junction-test-${process.pid}.txt`)
  fs.writeFileSync(marker, "ok")
  const via = path.join(LINK_PATH, path.basename(marker))
  const seen = fs.existsSync(via) && fs.readFileSync(via, "utf-8") === "ok"
  fs.unlinkSync(marker)
  if (!seen) {
    console.error("Junction created but round-trip read failed. Something's wrong.")
    process.exit(3)
  }
  log("")
  log("✓ Junction set up and verified.")
  log(`  Drop bulk files into either path — they resolve to the same place:`)
  log(`    ${TARGET}`)
  log(`    ${LINK_PATH}`)
}

main()
