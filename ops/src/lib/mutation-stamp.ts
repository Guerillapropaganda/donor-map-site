/**
 * mutation-stamp.ts — TypeScript twin of scripts/lib/mutation-stamp.cjs
 *
 * Read-only side of the canonical-store mutation signal. Writers (CJS
 * scripts) call markMutated() in the .cjs version; readers (route
 * handlers, librarian singleton) use this module to check whether their
 * cached snapshot is stale.
 *
 * Per ADR-0024 cache-correctness: keep this file in lockstep with the
 * CJS version. Both files cite this contract.
 */
import * as fs from "node:fs"
import * as path from "node:path"

function findRepoRoot(startDir: string): string {
  let dir = startDir
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "data", "relationships.jsonl"))) return dir
    if (fs.existsSync(path.join(dir, ".git"))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return startDir
}

function getStampPath(): string {
  return path.join(findRepoRoot(process.cwd()), "data", ".last-mutation")
}

interface StampPayload {
  ts: number
  iso?: string
  reason?: string
  pid?: number
}

export function readMutationTs(): number {
  try {
    const raw = fs.readFileSync(getStampPath(), "utf-8").trim()
    const parsed: StampPayload = JSON.parse(raw)
    return typeof parsed.ts === "number" ? parsed.ts : 0
  } catch {
    return 0
  }
}

export function readMutationStamp(): StampPayload | null {
  try {
    const raw = fs.readFileSync(getStampPath(), "utf-8").trim()
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Returns true if the canonical stores have been mutated since
 * `loadStartMs`. Cheap (one fs.readFileSync of ~70 bytes per call) —
 * the singleton + route caches can call this on every getGraph() /
 * GET handler invocation without measurable overhead.
 */
export function isStaleSince(loadStartMs: number | null | undefined): boolean {
  if (!loadStartMs || loadStartMs <= 0) return false
  return readMutationTs() > loadStartMs
}
