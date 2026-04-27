/**
 * stories-schema.cjs — schema + validator for data/stories.jsonl
 *
 * Stories are narrative-shaped findings auto-detected by the vault's
 * pattern detectors (contradiction-miner, cross-policy-recurrence,
 * unusual-stock-activity, timing-proximity). They graduate from
 * detector output into first-class records here.
 *
 * Each story links to the entities it's about via linked_entities[].
 * Each ref in that array can be any of three forms:
 *   - Entity ID:    "ent_000123"
 *   - Plain name:   "Blackstone"
 *   - Wikilink:     "[[Apollo Global Management]]"
 * The librarian (ADR-0024) resolves all three at read time.
 *
 * State flow (David-controlled, no automated promotion):
 *   candidate → draft → ready → published
 *
 * Severity is advisory — set by the detector, overrideable by David,
 * displayed in triage. It never gates publication automatically.
 * Publication = David manually setting state: "published".
 *
 * Public API:
 *   validate(record)    → { ok, errors }
 *   newRecord(partial)  → populated record with defaults
 *   STORY_STATES        → frozen enum
 *   SEVERITY_LEVELS     → frozen enum
 *   DETECTOR_TYPES      → frozen enum
 *   ENTITY_ROLES        → frozen enum
 *   confidenceToSeverity(n) → severity string
 */

const STORY_STATES = Object.freeze([
  "candidate",  // detector produced this — not yet triaged by David
  "draft",      // David is actively developing this
  "ready",      // editorial complete, ready to publish
  "published",  // live on public site
  "archived",   // rejected as false-positive or no longer relevant; preserved for audit trail
])

const SEVERITY_LEVELS = Object.freeze([
  "very-low",
  "low",
  "medium",
  "high",
  "very-high",
])

// All detector types that can produce story candidates.
// Add new detector names here as they graduate (Sessions 2–4).
const DETECTOR_TYPES = Object.freeze([
  "both-sides",
  "cross-party",
  "issue-contradiction",
  "committee-capture",
  "offshore-exposure",
  "policy-capture-sponsorship",
  "unusual-stock-activity",
  "cross-policy-recurrence",
  "timing-proximity",
  "other",
])

// Role of a linked entity within this story
const ENTITY_ROLES = Object.freeze([
  "subject",       // story is primarily about this entity
  "counterparty",  // the other side of the contradiction
  "mentioned",     // appears but isn't the focus
])

/**
 * Maps a detector's 1–5 confidence integer to a severity label.
 * Detectors use the same scale for all their findings; this gives
 * David a human-readable signal when triaging.
 */
function confidenceToSeverity(n) {
  if (n >= 5) return "very-high"
  if (n === 4) return "high"
  if (n === 3) return "medium"
  if (n === 2) return "low"
  return "very-low"
}

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    // ── Identity ──────────────────────────────────────────────────
    id: partial.id || null,              // story_<slug> minted by store
    slug: partial.slug || "",
    headline: partial.headline || "",

    // ── Detection provenance ──────────────────────────────────────
    detector: partial.detector || "",    // which script produced this
    detector_type: partial.detector_type || "other",
    confidence: typeof partial.confidence === "number" ? partial.confidence : 3,
    severity: partial.severity || confidenceToSeverity(partial.confidence ?? 3),

    // ── Entity links ──────────────────────────────────────────────
    // Each entry: { ref: "ent_xxx" | "Plain Name" | "[[Wikilink]]", role: ENTITY_ROLES[n] }
    linked_entities: Array.isArray(partial.linked_entities) ? partial.linked_entities : [],

    // ── Content ───────────────────────────────────────────────────
    summary: partial.summary || "",      // auto-generated angle / description
    editorial_notes: partial.editorial_notes || null,  // David's notes

    // ── Editorial state ───────────────────────────────────────────
    state: partial.state || "candidate",
    requires_legal_review: partial.requires_legal_review || false,
    legal_review_by: partial.legal_review_by || null,
    legal_review_at: partial.legal_review_at || null,
    published_at: partial.published_at || null,
    archived_at: partial.archived_at || null,
    archive_reason: partial.archive_reason || null,  // free-text reason when archived as false-positive

    // ── Integrity flags (set by harness check, never by user) ─────
    integrity_status: partial.integrity_status || "ok",  // ok | stale | broken-ref | duplicate
    integrity_note: partial.integrity_note || null,
    integrity_checked_at: partial.integrity_checked_at || null,

    // ── Timestamps ────────────────────────────────────────────────
    first_detected: partial.first_detected || now,
    first_seen: partial.first_seen || now,
    last_updated: partial.last_updated || now,
  }
}

function validate(record) {
  const errors = []

  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }
  if (typeof record.id !== "string" || !/^story_[a-z0-9_-]+$/.test(record.id)) {
    errors.push("id must match /^story_[a-z0-9_-]+$/")
  }
  if (typeof record.slug !== "string" || !record.slug.trim()) {
    errors.push("slug must be a non-empty string")
  }
  if (typeof record.headline !== "string" || !record.headline.trim()) {
    errors.push("headline must be a non-empty string")
  }
  if (!STORY_STATES.includes(record.state)) {
    errors.push(`state must be one of: ${STORY_STATES.join(", ")}`)
  }
  if (!SEVERITY_LEVELS.includes(record.severity)) {
    errors.push(`severity must be one of: ${SEVERITY_LEVELS.join(", ")}`)
  }
  if (!Array.isArray(record.linked_entities)) {
    errors.push("linked_entities must be an array")
  } else {
    for (const [i, ent] of record.linked_entities.entries()) {
      if (!ent || typeof ent.ref !== "string" || !ent.ref.trim()) {
        errors.push(`linked_entities[${i}].ref must be a non-empty string`)
      }
      if (!ENTITY_ROLES.includes(ent.role)) {
        errors.push(`linked_entities[${i}].role must be one of: ${ENTITY_ROLES.join(", ")}`)
      }
    }
  }
  if (typeof record.requires_legal_review !== "boolean") {
    errors.push("requires_legal_review must be a boolean")
  }

  return { ok: errors.length === 0, errors }
}

module.exports = {
  STORY_STATES,
  SEVERITY_LEVELS,
  DETECTOR_TYPES,
  ENTITY_ROLES,
  confidenceToSeverity,
  newRecord,
  validate,
}
