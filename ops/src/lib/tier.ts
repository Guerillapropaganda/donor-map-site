/**
 * tier.ts — S-tier / A+ / Ready render-time helpers
 *
 * Introduced in plan Step 6 (see C:\Users\third\.claude\plans\keen-inventing-wall.md).
 * Central place for "is this profile S-tier?" and "which profiles go on
 * the homepage?" logic.
 *
 * The S-tier gate deliberately checks MULTIPLE fields, not just
 * `content-readiness === "s-tier"`. Setting the readiness string alone
 * doesn't make a profile S-tier — the render layer requires BOTH:
 *   - `audit-s-tier-passed: true`      (janitor automated audit)
 *   - `editorial-signoff-narrative:`   (David's manual sign-off date)
 *
 * This two-check gate protects against accidental promotions (e.g., a
 * script setting readiness directly) and against single-point-of-failure
 * audit (e.g., a bug in the janitor). Both surfaces must agree for a
 * profile to actually render as S-tier anywhere.
 */
import type { Profile } from "./vault"

/**
 * True if the profile meets ALL S-tier gates:
 *   1. content-readiness === "s-tier"
 *   2. audit-s-tier-passed === true
 *   3. editorial-signoff-narrative is populated
 *
 * Use this at render time for any feature that should only show S-tier
 * content (Weekly Spotlight, Power Rankings hero, Landing featured cards).
 */
export function isSTier(profile: Profile): boolean {
  return profile.contentReadiness === "s-tier"
    && profile.auditSTierPassed === true
    && !!profile.editorialSignoffNarrative
}

/**
 * True if the profile is verified (A+) — regardless of S-tier status.
 */
export function isVerified(profile: Profile): boolean {
  return profile.contentReadiness === "verified"
    || profile.contentReadiness === "s-tier"
}

/**
 * Returns the profiles that should appear in a homepage feature.
 *
 * Strategy: prefer S-tier profiles. If fewer than `minCount` S-tier
 * profiles exist, gracefully degrade to include verified (A+) profiles
 * until the minimum is met. This keeps the homepage populated while
 * the S-tier pool is being built out — the expected state for weeks
 * after Step 6 ships.
 *
 * Example:
 *   getFeaturedPool(allProfiles, 1)  // Weekly Spotlight: need 1 profile
 *   getFeaturedPool(allProfiles, 3)  // Landing featured cards: need 3
 *
 * The returned array is ordered: S-tier first (newest sign-off date),
 * then verified fallback in sort order of the caller's choosing.
 */
export function getFeaturedPool(profiles: Profile[], minCount = 1): Profile[] {
  const sTier = profiles
    .filter(isSTier)
    .sort((a, b) => (b.editorialSignoffNarrative || "").localeCompare(a.editorialSignoffNarrative || ""))

  if (sTier.length >= minCount) return sTier

  // Degrade: include verified (A+) as fallback
  const verified = profiles.filter(p => p.contentReadiness === "verified" && !isSTier(p))
  return [...sTier, ...verified]
}

/**
 * Returns a human-readable label for a readiness tier.
 */
export function tierLabel(readiness: string | undefined): string {
  switch (readiness) {
    case "s-tier": return "S"
    case "verified": return "A+"
    case "ready": return "B"
    case "draft": return "C"
    case "raw": return "D-F"
    default: return "?"
  }
}

/**
 * Returns a CSS color for a readiness tier (for badges, chips, etc.).
 * Matches the existing readinessColor() in vault.ts but adds S-tier.
 */
export function tierColor(readiness: string | undefined): string {
  switch (readiness) {
    case "s-tier": return "#a855f7"  // purple — reserved for S-tier
    case "verified": return "#fbbf24" // amber — current A+ color
    case "ready": return "#10b981"    // green
    case "draft": return "#f59e0b"    // amber-darker
    case "raw": return "#ef4444"      // red
    default: return "#6b7280"         // gray
  }
}
