/**
 * users-schema.cjs — schema + validator for data/users.jsonl
 *
 * Part of Phase 2.5 — Auth & Gating. Maps Clerk-authenticated users
 * to our own tier + subscription state. Clerk manages authentication;
 * this file maps clerk_id → tier so we don't depend on Clerk for
 * business logic.
 *
 * Public API:
 *   validate(record)    → { ok, errors }
 *   newRecord(partial)  → populated record with defaults
 *   TIERS               → frozen enum of subscription tiers
 *
 * Tier hierarchy (ascending):
 *   anonymous   → not logged in (no record, assumed)
 *   free-auth   → logged in, no subscription — 5 queries/day
 *   researcher  → $20/mo, unlimited queries + data panels + export
 *   newsroom    → $150/mo, API access + team seats + bulk export
 *   patron      → $500 one-time, lifetime researcher equivalent
 *   admin       → David and any delegated admins (bypass all gates)
 */

const TIERS = Object.freeze([
  "anonymous",
  "free-auth",
  "researcher",
  "newsroom",
  "patron",
  "admin",
])

// Tier ordering for hierarchy checks. A user with tier >= required tier
// passes the gate. admin is highest; anonymous is lowest.
const TIER_ORDER = Object.freeze({
  anonymous: 0,
  "free-auth": 1,
  researcher: 2,
  newsroom: 3,
  patron: 2, // equivalent to researcher but lifetime
  admin: 99,
})

function tierAtLeast(userTier, requiredTier) {
  const u = TIER_ORDER[userTier] ?? 0
  const r = TIER_ORDER[requiredTier] ?? 0
  return u >= r
}

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    id: partial.id || null, // usr_NNNNNN
    clerk_id: partial.clerk_id || null, // Clerk user id (user_xxx)
    email: partial.email || "",

    tier: partial.tier || "free-auth",
    stripe_customer_id: partial.stripe_customer_id || null,
    stripe_subscription_id: partial.stripe_subscription_id || null,

    // Lifecycle
    created: partial.created || now,
    last_seen: partial.last_seen || null,
    expires: partial.expires || null, // monthly sub expiry; null for patron/admin
    cancelled_at: partial.cancelled_at || null,

    // Optional team membership (newsroom tier)
    team_id: partial.team_id || null,

    // Admin flag for the per-record bypass (faster than checking tier=admin
    // everywhere)
    is_admin: partial.is_admin || false,

    // Rate limit overrides
    rate_limit_override: partial.rate_limit_override ?? null,

    // Student / journalist discount state
    student_discount: partial.student_discount || false,
    student_verification: partial.student_verification || null,

    // Notes
    editor_notes: partial.editor_notes || "",
  }
}

function validate(record) {
  const errors = []
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }
  if (typeof record.id !== "string" || !/^usr_\d{6}$/.test(record.id)) {
    errors.push("id must match /^usr_\\d{6}$/")
  }
  if (typeof record.email !== "string" || !record.email.includes("@")) {
    errors.push("email must be a valid address")
  }
  if (!TIERS.includes(record.tier)) {
    errors.push(`tier must be one of: ${TIERS.join(", ")}`)
  }
  if (typeof record.is_admin !== "boolean") {
    errors.push("is_admin must be a boolean")
  }
  return { ok: errors.length === 0, errors }
}

module.exports = {
  TIERS,
  TIER_ORDER,
  tierAtLeast,
  newRecord,
  validate,
}
