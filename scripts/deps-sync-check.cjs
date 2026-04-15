#!/usr/bin/env node
// deps-sync-check.cjs — detect package.json / node_modules drift
//
// Problem this solves:
//   On 2026-04-15 the Ops app at localhost:3333 threw a Build Error:
//     Module not found: Can't resolve '@clerk/nextjs'
//   Root cause: Phase 2.5 added @clerk/nextjs to ops/package.json and
//   updated ops/package-lock.json, but NOBODY ever ran `npm install`
//   in the main repo's ops/ directory after pulling the change.
//   ops/node_modules was stuck in its pre-Clerk state. The bug only
//   surfaced when the dev server tried a cold rebuild.
//
// This script checks each package.json in the repo against its
// node_modules and reports drift. Two modes:
//
//   * dry-run (default): reports drift with fix commands, exits 0 if
//     clean / 1 if drifted. Used by .husky/post-merge, pre-commit
//     gate, and CI.
//   * --fix: runs `npm install` in every drifted directory. Used as
//     a manual one-liner when a hook flags drift.
//
// Covered package.json files:
//   - root/package.json           (Quartz site build)
//   - ops/package.json            (Ops Next.js app)
//
// Usage:
//   node scripts/deps-sync-check.cjs              # report only
//   node scripts/deps-sync-check.cjs --fix        # run npm install in drifted dirs
//   node scripts/deps-sync-check.cjs --quiet      # suppress OK lines (CI)
//   node scripts/deps-sync-check.cjs --json       # machine-readable
//
// Exit codes:
//   0 = all dirs in sync
//   1 = drift detected
//   2 = script error (unreadable file, missing package-lock, etc.)

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// ROOT is the git repo the script is CHECKING, not where it lives.
// When invoked from a hook, cwd is the repo root git is operating on;
// when invoked manually, the user expects cwd semantics. Fall back to
// __dirname/.. only if cwd doesn't look like a repo root.
function findRepoRoot() {
  const cwd = process.cwd()
  if (fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, ".git"))) {
    return cwd
  }
  // Walk up from cwd
  let dir = cwd
  while (dir && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json")) && (fs.existsSync(path.join(dir, ".git")) || fs.existsSync(path.join(dir, ".claude")))) {
      return dir
    }
    dir = path.dirname(dir)
  }
  // Last resort: script location
  return path.join(__dirname, "..")
}

const ROOT = findRepoRoot()

const FIX = process.argv.includes("--fix")
const QUIET = process.argv.includes("--quiet")
const JSON_OUT = process.argv.includes("--json")

// ─── Targets ──────────────────────────────────────────────────────────

const TARGETS = [
  {
    name: "root (Quartz site)",
    dir: ROOT,
    packageJson: path.join(ROOT, "package.json"),
    nodeModules: path.join(ROOT, "node_modules"),
  },
  {
    name: "ops (Next.js app)",
    dir: path.join(ROOT, "ops"),
    packageJson: path.join(ROOT, "ops", "package.json"),
    nodeModules: path.join(ROOT, "ops", "node_modules"),
  },
]

// ─── Core check ──────────────────────────────────────────────────────

function checkTarget(target) {
  const result = {
    name: target.name,
    dir: path.relative(ROOT, target.dir).replace(/\\/g, "/") || ".",
    status: "unknown",
    missing: [],
    versionDrift: [],
    extra: 0,
    message: "",
  }

  // package.json must exist
  if (!fs.existsSync(target.packageJson)) {
    result.status = "skipped"
    result.message = "no package.json"
    return result
  }

  let pkg
  try {
    pkg = JSON.parse(fs.readFileSync(target.packageJson, "utf-8"))
  } catch (e) {
    result.status = "error"
    result.message = `unreadable package.json: ${e.message}`
    return result
  }

  const declaredDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  }
  const declaredNames = Object.keys(declaredDeps)

  // node_modules must exist (if any deps declared)
  if (!fs.existsSync(target.nodeModules)) {
    if (declaredNames.length === 0) {
      result.status = "ok"
      result.message = "no deps declared"
      return result
    }
    result.status = "drift"
    result.missing = declaredNames
    result.message = `node_modules doesn't exist (${declaredNames.length} deps declared)`
    return result
  }

  // Check each declared dep has a resolved package.json in node_modules
  for (const dep of declaredNames) {
    const depPkgPath = path.join(target.nodeModules, dep, "package.json")
    if (!fs.existsSync(depPkgPath)) {
      result.missing.push(dep)
      continue
    }
    // Optional: version drift check
    try {
      const installed = JSON.parse(fs.readFileSync(depPkgPath, "utf-8"))
      const declared = declaredDeps[dep]
      // Only flag egregious mismatches — rough major-version check
      // (skip caret-range variations, those are fine)
      if (
        installed.version &&
        typeof declared === "string" &&
        !declared.startsWith("workspace:") &&
        !declared.startsWith("file:") &&
        !declared.startsWith("git")
      ) {
        const declaredMajor = declared.replace(/^[\^~><=\s]*/, "").split(".")[0]
        const installedMajor = installed.version.split(".")[0]
        if (
          declaredMajor &&
          installedMajor &&
          declaredMajor !== installedMajor &&
          !declared.includes("||")
        ) {
          result.versionDrift.push({
            dep,
            declared,
            installed: installed.version,
          })
        }
      }
    } catch {
      // package.json unreadable — treat as missing
      result.missing.push(dep)
    }
  }

  if (result.missing.length === 0 && result.versionDrift.length === 0) {
    result.status = "ok"
    result.message = `${declaredNames.length} deps, all in sync`
  } else {
    result.status = "drift"
    const parts = []
    if (result.missing.length) parts.push(`${result.missing.length} missing`)
    if (result.versionDrift.length) parts.push(`${result.versionDrift.length} version drift`)
    result.message = parts.join(", ")
  }

  return result
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  const results = TARGETS.map(checkTarget)
  const drifted = results.filter((r) => r.status === "drift")

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ results, drifted: drifted.length }, null, 2) + "\n")
    process.exit(drifted.length === 0 ? 0 : 1)
  }

  // Human output
  if (!QUIET) {
    console.log("")
    console.log("═══ deps-sync-check ═══")
    console.log("")
  }

  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : r.status === "drift" ? "✗" : r.status === "skipped" ? "·" : "?"
    if (QUIET && r.status === "ok") continue
    console.log(`  ${icon} ${r.dir.padEnd(4)} ${r.name} — ${r.message}`)
    if (r.missing.length > 0) {
      const preview = r.missing.slice(0, 10).join(", ")
      console.log(`    missing: ${preview}${r.missing.length > 10 ? ` … +${r.missing.length - 10} more` : ""}`)
    }
    if (r.versionDrift.length > 0) {
      for (const vd of r.versionDrift.slice(0, 5)) {
        console.log(`    version drift: ${vd.dep} declared ${vd.declared}, installed ${vd.installed}`)
      }
    }
  }

  if (drifted.length === 0) {
    if (!QUIET) {
      console.log("")
      console.log("  all directories in sync")
      console.log("")
    }
    process.exit(0)
  }

  console.log("")
  if (FIX) {
    console.log("  --fix supplied, running npm install in drifted directories...")
    console.log("")
    let allOk = true
    for (const r of drifted) {
      const dir = r.dir === "." ? ROOT : path.join(ROOT, r.dir)
      console.log(`  > cd ${r.dir} && npm install`)
      try {
        execSync("npm install", { cwd: dir, stdio: "inherit" })
        console.log(`  ✓ ${r.name} fixed`)
      } catch (err) {
        console.log(`  ✗ ${r.name} failed: ${err.message}`)
        allOk = false
      }
      console.log("")
    }
    process.exit(allOk ? 0 : 2)
  }

  // Report-only mode: print fix command, exit 1
  console.log("  ═══ DRIFT DETECTED ═══")
  console.log("")
  console.log("  To fix automatically, run:")
  console.log("    node scripts/deps-sync-check.cjs --fix")
  console.log("")
  console.log("  Or manually:")
  for (const r of drifted) {
    console.log(`    cd ${r.dir} && npm install`)
  }
  console.log("")
  process.exit(1)
}

try {
  main()
} catch (err) {
  console.error("deps-sync-check crashed:", err.message)
  process.exit(2)
}
