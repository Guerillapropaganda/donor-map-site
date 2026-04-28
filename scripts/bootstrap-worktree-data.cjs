#!/usr/bin/env node
/**
 * bootstrap-worktree-data.cjs — one-shot mirror of main repo's
 * data/derived/ into the current worktree.
 *
 * Companion to worktree-data-mirror-check.cjs (the harness check that
 * detects drift). This is the "fix it" button.
 *
 * What it does:
 *   - Locates main repo (via `git rev-parse --git-common-dir`)
 *   - For every gitignored *.jsonl in main's data/derived/ that is
 *     missing or differently-sized in the current worktree, copies
 *     the main repo's version on top.
 *   - Skips when run from the main repo (nothing to bootstrap).
 *   - Prints a per-file summary so the operator can see what moved.
 *
 * What it does NOT do:
 *   - Touch tracked files. Only mirrors the gitignored derived stores.
 *   - Touch files outside data/derived/.
 *   - Reverse direction (worktree → main repo). The main repo is the
 *     source of truth; if the worktree has fresher data, it should be
 *     written through the canonical-store helpers, not bulk-copied.
 *   - Auto-run. Operator types this command after seeing the harness
 *     warning. (Auto-mirror was rejected — would mask intentional
 *     test divergence, and a 66 MB copy on every harness tick is
 *     wasteful.)
 *
 * Usage:
 *   node scripts/bootstrap-worktree-data.cjs           # mirror missing + drifted
 *   node scripts/bootstrap-worktree-data.cjs --dry-run # report what would copy
 *   node scripts/bootstrap-worktree-data.cjs --force   # also re-copy in-sync files
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const DRY_RUN = process.argv.includes("--dry-run")
const FORCE = process.argv.includes("--force")

const DERIVED_SUBPATH = path.join("data", "derived")
const IGNORE_PATTERNS = [
  /\.bak$/i,
  /\.tmp-/,
  /\.dedupd-state$/,
  /\.pre-nickname-dedup\./,
  /\.pre-dedupe\./,
]

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

function locateMainRepo() {
  const cwd = process.cwd().replace(/\\/g, "/")
  let commonGitDir = execSync("git rev-parse --git-common-dir", { stdio: ["ignore", "pipe", "pipe"] })
    .toString().trim().replace(/\\/g, "/")
  if (!path.isAbsolute(commonGitDir)) {
    commonGitDir = path.resolve(cwd, commonGitDir).replace(/\\/g, "/")
  }
  return { mainRepo: path.dirname(commonGitDir).replace(/\\/g, "/"), currentRepo: cwd }
}

function main() {
  const { mainRepo, currentRepo } = locateMainRepo()

  if (path.resolve(mainRepo) === path.resolve(currentRepo)) {
    console.log("Already in main repo — nothing to bootstrap.")
    process.exit(0)
  }

  const mainDir = path.join(mainRepo, DERIVED_SUBPATH)
  const wtDir = path.join(currentRepo, DERIVED_SUBPATH)

  if (!fs.existsSync(mainDir)) {
    console.error(`Main repo at ${mainRepo} has no ${DERIVED_SUBPATH}/ — nothing to mirror.`)
    process.exit(1)
  }
  if (!fs.existsSync(wtDir)) {
    console.log(`Creating ${wtDir}/`)
    if (!DRY_RUN) fs.mkdirSync(wtDir, { recursive: true })
  }

  let copied = 0
  let skipped = 0
  let totalBytes = 0
  const actions = []

  for (const name of fs.readdirSync(mainDir)) {
    if (!name.endsWith(".jsonl")) continue
    if (IGNORE_PATTERNS.some((re) => re.test(name))) continue

    const srcPath = path.join(mainDir, name)
    const dstPath = path.join(wtDir, name)
    const srcStat = fs.statSync(srcPath)

    let action = null
    if (!fs.existsSync(dstPath)) {
      action = "copy-missing"
    } else {
      const dstStat = fs.statSync(dstPath)
      const delta = Math.abs(srcStat.size - dstStat.size)
      if (delta > 1024) {
        action = `copy-drifted (delta ${fmtBytes(delta)})`
      } else if (FORCE) {
        action = "copy-forced"
      } else {
        action = "skip-in-sync"
      }
    }

    if (action.startsWith("copy")) {
      actions.push({ name, action, size: srcStat.size })
      if (!DRY_RUN) fs.copyFileSync(srcPath, dstPath)
      copied++
      totalBytes += srcStat.size
    } else {
      skipped++
    }
  }

  // Report
  console.log(`bootstrap-worktree-data — ${DRY_RUN ? "DRY RUN" : "live"}`)
  console.log(`  main repo:     ${mainRepo}`)
  console.log(`  worktree:      ${currentRepo}`)
  console.log(`  copied:        ${copied} file(s) (${fmtBytes(totalBytes)})`)
  console.log(`  skipped:       ${skipped} file(s) (already in sync)`)
  if (actions.length > 0) {
    console.log("")
    for (const a of actions) {
      console.log(`  ${a.action.padEnd(28)} ${a.name} (${fmtBytes(a.size)})`)
    }
  }
  if (DRY_RUN && copied > 0) {
    console.log("")
    console.log(`  (dry-run: re-run without --dry-run to actually copy)`)
  }
}

main()
