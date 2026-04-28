#!/usr/bin/env node
/**
 * worktree-data-mirror-check.cjs — harness check (ADR-0021).
 *
 * Surfaces the silent-data-divergence class of bug we hit 2026-04-29.
 * Background: gitignored derived files (data/derived/*.jsonl) live in
 * the main repo's working tree but are NOT carried into git worktrees
 * on creation — git only checks out tracked content. A fresh worktree
 * therefore starts with whatever derived files happen to be tracked
 * (typically a stale baseline), not with main repo's current state.
 *
 * Detector scripts that read data/derived/ (the librarian, the
 * contradiction-miner, story-pages-integrity, the Money Trail, etc.)
 * silently operate on incomplete data when run from such a worktree.
 * They report findings counts as if everything is fine. The bug is
 * invisible until you compare answers across desks.
 *
 * What this check does:
 *   - Identifies whether the current CWD is a worktree (not the main
 *     repo working tree).
 *   - If it IS a worktree: lists *.jsonl in main repo's data/derived/,
 *     compares against the same listing in the current worktree.
 *   - Reports missing files + size-mismatched files as findings. Each
 *     finding includes the size delta so the reader can judge severity.
 *   - If running IN main repo: returns 0 findings (nothing to check).
 *
 * What this check does NOT do:
 *   - Auto-copy. 66 MB+ files on every 15-min harness tick is wasteful
 *     and would mask intentional test divergence. The remediation is
 *     a separate one-shot script (scripts/bootstrap-worktree-data.cjs).
 *   - Compare line-by-line content. Size + mtime is sufficient for the
 *     "did the file get loaded" question. False matches on identical-
 *     sized-but-different-content are vanishingly unlikely for these
 *     append-mostly stores.
 *   - Touch tracked files. Only cares about gitignored derived data.
 *
 * Usage:
 *   node scripts/worktree-data-mirror-check.cjs           # human report
 *   node scripts/worktree-data-mirror-check.cjs --json    # for harness
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const JSON_OUT = process.argv.includes("--json")

// ─── Locate main repo + current worktree ──────────────────────────────

function locateRepos() {
  // git rev-parse --git-common-dir returns the .git of the main repo
  // for any worktree (or just .git if we're already in main).
  const cwd = process.cwd().replace(/\\/g, "/")
  let commonGitDir
  try {
    commonGitDir = execSync("git rev-parse --git-common-dir", { stdio: ["ignore", "pipe", "pipe"] })
      .toString().trim().replace(/\\/g, "/")
  } catch {
    return { error: "not a git repository" }
  }
  // Resolve to absolute path
  if (!path.isAbsolute(commonGitDir)) {
    commonGitDir = path.resolve(cwd, commonGitDir).replace(/\\/g, "/")
  }
  // Main repo working tree = parent of common .git dir (when .git is a
  // dir, not a file). For worktree's .git file the common dir lives
  // inside the main repo's .git, so parent is still the main working tree.
  const mainRepo = path.dirname(commonGitDir).replace(/\\/g, "/")
  // Current location is whatever the harness was launched from
  return { mainRepo, currentRepo: cwd }
}

// ─── Compare derived/ between two repos ───────────────────────────────

const DERIVED_SUBPATH = path.join("data", "derived")
// Files that should NOT trigger findings even if missing/mismatched.
const IGNORE_PATTERNS = [
  /\.bak$/i,                  // Apr 21 dedupe backups
  /\.tmp-/,                   // in-flight writes
  /\.dedupd-state$/,          // intermediate sort state
  /\.pre-nickname-dedup\./,   // historical state
  /\.pre-dedupe\./,           // historical state
]

function listDerived(repoRoot) {
  const dir = path.join(repoRoot, DERIVED_SUBPATH)
  if (!fs.existsSync(dir)) return null
  const out = new Map()
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue
    if (IGNORE_PATTERNS.some((re) => re.test(name))) continue
    const stat = fs.statSync(path.join(dir, name))
    out.set(name, { size: stat.size, mtime: stat.mtime.toISOString() })
  }
  return out
}

function fmtBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${n} B`
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  const { mainRepo, currentRepo, error } = locateRepos()

  if (error) {
    return emit({ findings_count: 0, status: "skipped", reason: error })
  }

  // If we're in main repo, nothing to compare against.
  if (path.resolve(mainRepo) === path.resolve(currentRepo)) {
    return emit({
      findings_count: 0,
      status: "main-repo",
      message: "Running from main repo; no worktree mirror check needed.",
    })
  }

  const mainFiles = listDerived(mainRepo)
  const wtFiles = listDerived(currentRepo)

  if (mainFiles === null) {
    return emit({
      findings_count: 0,
      status: "no-main-derived-dir",
      message: `Main repo at ${mainRepo} has no data/derived/ directory.`,
    })
  }
  if (wtFiles === null) {
    return emit({
      findings_count: mainFiles.size,
      status: "worktree-missing-derived-dir",
      message: `Worktree has no data/derived/ directory but main repo has ${mainFiles.size} file(s).`,
      remediation: "node scripts/bootstrap-worktree-data.cjs",
    })
  }

  const findings = []

  // Missing in worktree: in main but not in worktree
  for (const [name, info] of mainFiles) {
    if (!wtFiles.has(name)) {
      findings.push({
        kind: "missing",
        file: name,
        main_size: info.size,
        main_mtime: info.mtime,
        message: `${name} exists in main repo (${fmtBytes(info.size)}) but is missing from worktree`,
      })
    }
  }

  // Size mismatch: in both, but differ by more than 1KB (small drift
  // from compaction/dedup is fine; large drift signals stale data)
  for (const [name, mInfo] of mainFiles) {
    const wInfo = wtFiles.get(name)
    if (!wInfo) continue
    const delta = Math.abs(mInfo.size - wInfo.size)
    if (delta > 1024) {
      findings.push({
        kind: "size-mismatch",
        file: name,
        main_size: mInfo.size,
        worktree_size: wInfo.size,
        delta_bytes: mInfo.size - wInfo.size,
        message: `${name} differs by ${fmtBytes(delta)} (main: ${fmtBytes(mInfo.size)}, worktree: ${fmtBytes(wInfo.size)})`,
      })
    }
  }

  // Files in worktree but not main — generally fine (worktree may have
  // generated something the main hasn't yet). Surface as info, not as a
  // finding — don't bump findings_count.
  const worktreeOnly = []
  for (const [name, info] of wtFiles) {
    if (!mainFiles.has(name)) {
      worktreeOnly.push({ file: name, size: info.size })
    }
  }

  return emit({
    findings_count: findings.length,
    status: findings.length === 0 ? "in-sync" : "drift-detected",
    main_repo: mainRepo,
    worktree: currentRepo,
    main_file_count: mainFiles.size,
    worktree_file_count: wtFiles.size,
    findings,
    worktree_only: worktreeOnly,
    remediation: findings.length > 0
      ? "node scripts/bootstrap-worktree-data.cjs   # mirrors data/derived/ from main repo"
      : null,
  })
}

function emit(result) {
  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(result, null, 2))
    return
  }
  console.log(`worktree-data-mirror-check — status: ${result.status}`)
  if (result.message) console.log(`  ${result.message}`)
  if (result.findings_count > 0) {
    console.log(`  ${result.findings_count} finding(s):`)
    for (const f of (result.findings || []).slice(0, 20)) {
      console.log(`    [${f.kind}] ${f.message}`)
    }
    console.log(`\n  remediation: ${result.remediation}`)
  }
  if (result.worktree_only && result.worktree_only.length > 0) {
    console.log(`  ${result.worktree_only.length} file(s) only in worktree (informational, not flagged):`)
    for (const f of result.worktree_only.slice(0, 5)) {
      console.log(`    ${f.file} (${fmtBytes(f.size)})`)
    }
  }
}

main()
