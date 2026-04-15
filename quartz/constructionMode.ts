// Construction-mode build gate for the Donor Map.
//
// When CONSTRUCTION_MODE=true (set in deploy.yml), most pages are
// suppressed from the public build — only slugs in the allowlist
// at data/public-routes.json are emitted. The default list is
// ["index"], which preserves the old "only homepage" behavior.
//
// Publishing a new page (e.g. /policies/housing) is the act of
// adding its slug to the allowlist. The Ops /api/policies/publish
// route edits the file, commits, and triggers a deploy. Unpublishing
// removes the slug and redeploys.
//
// Local dev (quartz serve) is unaffected — the CONSTRUCTION_MODE env
// var isn't set, so all pages build normally.

import fs from "fs"
import path from "path"

export const isConstructionMode = process.env.CONSTRUCTION_MODE === "true"

let _allowlist: Set<string> | null = null

function loadAllowlist(): Set<string> {
  if (_allowlist) return _allowlist
  // Default: only index. Ensures existing behavior is preserved if the
  // file is missing for any reason.
  const fallback = new Set<string>(["index"])
  try {
    const repoRoot = findRepoRoot()
    const filePath = path.join(repoRoot, "data", "public-routes.json")
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8")
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        _allowlist = new Set(parsed.filter((s): s is string => typeof s === "string"))
        if (_allowlist.size === 0) _allowlist = fallback
        return _allowlist
      }
    }
  } catch {
    // fall through to fallback
  }
  _allowlist = fallback
  return _allowlist
}

function findRepoRoot(): string {
  // This file sits at quartz/constructionMode.ts — the repo root is two up.
  // Use __dirname via import.meta.url hack since this is an ESM module.
  try {
    // Quartz runs this via its own bundler; walk up from cwd as a fallback
    let dir = process.cwd()
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, "quartz", "constructionMode.ts"))) return dir
      if (fs.existsSync(path.join(dir, ".git"))) return dir
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
    return process.cwd()
  } catch {
    return process.cwd()
  }
}

/**
 * Returns true if a given slug should be emitted even in construction
 * mode. The slug is normalized to match Quartz's FullSlug format.
 * Matches either exact slug or prefix-match (e.g. "policies/housing"
 * allows "policies/housing", not "policies/healthcare").
 */
export function isAllowedSlug(slug: string): boolean {
  if (!isConstructionMode) return true
  const allowlist = loadAllowlist()
  // Exact match first
  if (allowlist.has(slug)) return true
  // Also allow a parent slug to act as a prefix allowlist, e.g. an
  // entry of "policies" would allow "policies/housing", "policies/index"
  // etc. This is useful for rolling out a whole section at once.
  for (const allowed of allowlist) {
    if (slug.startsWith(allowed + "/")) return true
  }
  return false
}

// Reset cache — useful when the allowlist file is edited mid-build
// (almost never, but safe to expose).
export function resetAllowlistCache(): void {
  _allowlist = null
}
