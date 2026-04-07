import fs from "fs"
import path from "path"
import { execSync } from "child_process"

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

// Write a file to the vault and commit + push
export function writeAndPush(filePath: string, content: string, commitMessage: string): void {
  const repoRoot = getRepoRoot()
  const fullPath = path.join(repoRoot, filePath)

  // Ensure directory exists
  const dir = path.dirname(fullPath)
  fs.mkdirSync(dir, { recursive: true })

  // Write file
  fs.writeFileSync(fullPath, content, "utf-8")

  // Git add, commit, push
  try {
    execSync(`git add "${filePath}"`, { cwd: repoRoot, timeout: 10000 })
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: repoRoot, timeout: 10000 })
    execSync("git push origin v4", { cwd: repoRoot, timeout: 30000 })
  } catch (e) {
    // If push fails (e.g. no network), the local change is still saved
    console.error("Git push failed (local changes saved):", e)
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
