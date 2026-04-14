import fs from "fs"
import path from "path"
import { execSync } from "child_process"

/**
 * Low-level vault writer — ops/src/lib/local-write.ts
 *
 * Used by the Ops app to write files to the vault and push to origin/v4.
 *
 * CALLER RULES (this file is dumb by design — callers must enforce):
 * 1. FRONTMATTER-ONLY for structured fields. Content passed to `writeAndPush`
 *    must have structured fields (content-readiness, type, source-tier, etc.)
 *    in the YAML frontmatter block, NOT as body-inline `field:: value`
 *    Dataview syntax. Never write body text that contradicts frontmatter.
 * 2. This file will not parse or validate content — it writes bytes and
 *    runs git commands. Callers are responsible for producing valid
 *    markdown + valid YAML frontmatter.
 * 3. `writeAndPush` commits and pushes to `origin v4` directly. Do not
 *    use it for bulk writes — it will produce one commit per call. For
 *    sweeps, write to the filesystem directly and let `/session-save`
 *    batch the commit.
 * 4. URL-editing is David-only. Do not add helpers here that rewrite URLs
 *    in profile bodies. URL triage lives in ops/src/app/api/urls/.
 */

// Get the repo root directory
function getRepoRoot(): string {
  const fromOps = path.resolve(process.cwd(), "..")
  if (fs.existsSync(path.join(fromOps, ".git")) || fs.existsSync(path.join(fromOps, "content"))) {
    return fromOps
  }
  const cwd = process.cwd()
  if (fs.existsSync(path.join(cwd, ".git")) || fs.existsSync(path.join(cwd, "content"))) {
    return cwd
  }
  throw new Error("Cannot find repo root")
}

// Write a file to the vault and commit + push, with pull-rebase retry on conflict.
//
// Why the retry loop: Ops writes race with two concurrent writers:
//   1. GitHub Actions API-enrichment pipelines pushing to origin/v4
//   2. The RSS-scan workflow pushing event digests
//
// Without a retry, the first writeAndPush to collide with a pipeline push
// gets a stale HEAD, writes a dirty merge, and the next push fails in a
// way that can leave `<<<<<<<` conflict markers in a profile's
// frontmatter (this is how CA Farm Bureau Federation broke the deploy on
// 2026-04-14 — see commit 17d3f2ba).
//
// Strategy on push rejection:
//   1. `git pull --rebase origin v4` — replay our single commit on top
//   2. If the rebase hits a conflict on the SAME file we just wrote,
//      abort the rebase, re-read the remote file, re-apply our content
//      (callers pass us final bytes, so we can blindly overwrite), and
//      retry. We only give up after 3 attempts.
//   3. Any other error aborts cleanly without leaving a dirty state.
export function writeAndPush(filePath: string, content: string, commitMessage: string): void {
  const repoRoot = getRepoRoot()
  const fullPath = path.join(repoRoot, filePath)
  const safeMessage = commitMessage.replace(/"/g, '\\"')

  // Ensure directory exists
  const dir = path.dirname(fullPath)
  fs.mkdirSync(dir, { recursive: true })

  function writeAndCommit(): void {
    fs.writeFileSync(fullPath, content, "utf-8")
    execSync(`git add "${filePath}"`, { cwd: repoRoot, timeout: 10000 })
    execSync(`git commit -m "${safeMessage}"`, { cwd: repoRoot, timeout: 10000 })
  }

  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      if (attempt === 1) {
        writeAndCommit()
      }
      execSync("git push origin v4", { cwd: repoRoot, timeout: 30000 })
      return // success
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // Non-retryable: write/add/commit failure
      if (!msg.includes("push") && !msg.includes("rejected") && !msg.includes("non-fast-forward")) {
        if (attempt === 1) {
          console.error("Git commit failed (local changes saved):", msg)
          return
        }
      }
      if (attempt === MAX_ATTEMPTS) {
        console.error(`Git push failed after ${MAX_ATTEMPTS} attempts (local commit saved):`, msg)
        return
      }
      // Push was rejected — the pipeline (or another ops write) got there first.
      // Rebase on origin/v4 and retry.
      try {
        execSync("git pull --rebase origin v4", { cwd: repoRoot, timeout: 30000 })
      } catch (pullErr) {
        // Rebase hit a conflict. We're the second writer; overwrite with our
        // content (callers pass final bytes). Abort the rebase, reset to
        // origin/v4, re-write, re-commit.
        try {
          execSync("git rebase --abort", { cwd: repoRoot, timeout: 10000 })
        } catch (_) { /* ignore */ }
        try {
          execSync("git reset --hard origin/v4", { cwd: repoRoot, timeout: 10000 })
          writeAndCommit()
          continue // retry push on next loop iteration
        } catch (resetErr) {
          const resetMsg = resetErr instanceof Error ? resetErr.message : String(resetErr)
          console.error("Conflict recovery failed (local state may be dirty):", resetMsg)
          return
        }
      }
      // Rebase succeeded, loop will retry the push
    }
  }
}

// Read a file from the vault
export function readFile(filePath: string): string {
  const repoRoot = getRepoRoot()
  const fullPath = path.join(repoRoot, filePath)
  return fs.readFileSync(fullPath, "utf-8")
}

// Delete a file from the vault and commit + push
export function deleteAndPush(filePath: string, commitMessage: string): void {
  const repoRoot = getRepoRoot()
  const fullPath = path.join(repoRoot, filePath)

  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filePath}`)
  }

  fs.unlinkSync(fullPath)

  try {
    execSync(`git add "${filePath}"`, { cwd: repoRoot, timeout: 10000 })
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: repoRoot, timeout: 10000 })
    execSync("git push origin v4", { cwd: repoRoot, timeout: 30000 })
  } catch (e) {
    console.error("Git push failed (local changes saved):", e)
  }
}

// Check if a file exists
export function fileExists(filePath: string): boolean {
  const repoRoot = getRepoRoot()
  return fs.existsSync(path.join(repoRoot, filePath))
}
