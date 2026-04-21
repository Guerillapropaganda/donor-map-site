// Construction-mode build gate for the Donor Map.
//
// When CONSTRUCTION_MODE=true (set in deploy.yml), most pages are
// suppressed from the public build. Two gates admit a page:
//
//   1. The slug is in data/public-routes.json. Covers non-profile pages:
//      index, legal, corrections, curated flagships, category hubs.
//
//   2. (ADR-0017) The page has a profile-type frontmatter AND
//      content-readiness is either "verified" or "data-complete". Lets
//      the database ship at scale without maintaining a 1,500-line
//      allowlist. Data-complete profiles render with the
//      DataCompleteBanner so readers know they're auto-generated.
//
// Publishing a non-profile page (e.g. /policies/housing) is the act of
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

// ADR-0017: profile types eligible for tier-based publication.
// A page with one of these types + content-readiness in
// PUBLISHABLE_READINESS bypasses the allowlist.
//
// TIER_GATED_PUBLISHING kill-switch (2026-04-21, post-deploy review):
// tier-based publication was shipped but the rendering wasn't ready
// for ~7,000 pages. Auto-blocks piled into the main body; ProfileTabs
// couldn't locate its expected section IDs; archived-only Sources
// lists rendered awkwardly; banner sat atop profiles that already had
// substantive editorial work (Harlan Crow etc). Flipped off while we
// fix the rendering template. Frontmatter classification (ADR-0017's
// backend) continues to run — 446 profiles stay stamped as
// data-complete. Only public exposure is paused. Flip to `true` when
// ProfileTabs handles data-complete profiles cleanly and content is
// organized into tabs instead of a single long page.
const TIER_GATED_PUBLISHING = false
const PUBLISHABLE_PROFILE_TYPES = new Set<string>([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])
const PUBLISHABLE_READINESS = new Set<string>(["verified", "data-complete"])

/**
 * Returns true if a given slug should be emitted even in construction
 * mode. Two gates:
 *   - slug appears in the public-routes allowlist (prefix or exact), OR
 *   - (ADR-0017) frontmatter.type is a profile type AND
 *     frontmatter["content-readiness"] is "verified" or "data-complete".
 *
 * Pass frontmatter when available so tier-based publication works.
 * Callers without frontmatter (tag pages, folder pages) fall back to
 * the allowlist-only check.
 */
export function isAllowedSlug(
  slug: string,
  frontmatter?: Record<string, unknown> | null,
): boolean {
  if (!isConstructionMode) return true

  // Gate 2 (ADR-0017): tier-based publication for profile types.
  // Kill-switch: TIER_GATED_PUBLISHING must be true for this gate to
  // admit anything. When false, only the explicit allowlist applies.
  if (TIER_GATED_PUBLISHING && frontmatter) {
    const type = String(frontmatter.type ?? "")
    const readiness = String(
      frontmatter["content-readiness"] ?? frontmatter.readiness ?? "",
    ).toLowerCase()
    if (
      PUBLISHABLE_PROFILE_TYPES.has(type) &&
      PUBLISHABLE_READINESS.has(readiness)
    ) {
      return true
    }
  }

  // Gate 1: explicit allowlist.
  const allowlist = loadAllowlist()
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
