/**
 * claims-schema.cjs — schema + validator for data/claims/{slug}.jsonl
 *
 * Part of Phase 4 — Claim-Object Experiment (per ADR-0003 and
 * content/Phases/phase-4/handoff.md). A "claim" is a load-bearing
 * factual atom that can stand alone and be cited independently: a
 * dollar figure, a vote, a direct quote, a policy position.
 *
 * The experiment: can we render a profile page from a list of claim
 * objects plus a thin synthesis prose layer, instead of writing a
 * monolithic prose profile? If yes, profiles become rendering shells
 * over structured data. If no, we learn where synthesis prose is
 * actually load-bearing.
 *
 * v1 target: AOC. If the pattern works for the most editorially-
 * nuanced profile in the vault (working-class origin, small-dollar
 * funding model, internal Democratic conflicts), it works for
 * anything.
 *
 * Claim storage: data/claims/{slug}.jsonl — one file per profile
 * that opts into the pattern via `claim-object: true` frontmatter.
 * Separate from entities.jsonl so claim-object profiles are clearly
 * experimental / opt-in.
 *
 * Public API:
 *   validate(record)     → { ok, errors }
 *   newRecord(partial)   → populated record with defaults
 *   CLAIM_CATEGORIES     → frozen enum (maps to rendering sections)
 *   CLAIM_CONFIDENCE     → frozen enum
 */

// Categories map directly to rendering sections in the synthesis.md file.
// When we compile a claim-object profile, claims are grouped by category
// and rendered under the matching section in the synthesis prose.
const CLAIM_CATEGORIES = Object.freeze([
  "identity", // class origin, biographical facts
  "funding_pattern", // donor model, top donors, spend totals
  "voting_record", // individual votes, sponsorship
  "stated_position", // public statements, direct quotes
  "policy_outcome", // legislative wins/losses attributable to this politician
  "contradiction", // stated vs voted divergence
  "event_participation", // hearings, endorsements, public moments
  "relationship", // who they align with / oppose
  "other",
])

const CLAIM_CONFIDENCE = Object.freeze([
  "high", // backed by multiple Tier 1 sources, or direct quote with recording
  "medium", // single Tier 1 or multiple Tier 2
  "low", // single Tier 2 or lower; flagged for editor review
])

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    id: partial.id || null, // claim_NNNNNN, minted by store
    profile_slug: partial.profile_slug || "", // e.g. "aoc"

    // The load-bearing fact. Short, scannable, standalone.
    text: partial.text || "",

    // Categorization
    category: partial.category || "other",
    section_key: partial.section_key || partial.category || "other",

    // Source backing — every claim MUST have a source ref
    source_ref: partial.source_ref || null, // src_NNNNNN → sources.jsonl
    source_fallback_url: partial.source_fallback_url || null, // if the source isn't in registry yet

    // Quality metadata
    confidence: partial.confidence || "medium",
    corroborated_by: Array.isArray(partial.corroborated_by) ? partial.corroborated_by : [],

    // Optional structured data attached to the claim
    data: partial.data || null, // { amount, date, count, ... } — any structured shape

    // Editorial lifecycle
    added: partial.added || now,
    added_by: partial.added_by || "manual",
    verified: partial.verified || false,
    verified_at: partial.verified_at || null,
    verified_by: partial.verified_by || null,
    editor_notes: partial.editor_notes || "",
  }
}

function validate(record) {
  const errors = []
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }
  if (typeof record.id !== "string" || !/^claim_\d{6}$/.test(record.id)) {
    errors.push("id must match /^claim_\\d{6}$/")
  }
  if (typeof record.profile_slug !== "string" || !record.profile_slug.trim()) {
    errors.push("profile_slug must be a non-empty string")
  }
  if (typeof record.text !== "string" || !record.text.trim()) {
    errors.push("text must be a non-empty string")
  }
  if (!CLAIM_CATEGORIES.includes(record.category)) {
    errors.push(`category must be one of: ${CLAIM_CATEGORIES.join(", ")}`)
  }
  if (!CLAIM_CONFIDENCE.includes(record.confidence)) {
    errors.push(`confidence must be one of: ${CLAIM_CONFIDENCE.join(", ")}`)
  }
  // At least ONE of source_ref or source_fallback_url must be populated.
  // This is the defamation firewall: every factual claim has a source.
  if (!record.source_ref && !record.source_fallback_url) {
    errors.push("claim must have either source_ref (sources.jsonl) or source_fallback_url")
  }
  if (typeof record.verified !== "boolean") {
    errors.push("verified must be a boolean")
  }
  return { ok: errors.length === 0, errors }
}

module.exports = {
  CLAIM_CATEGORIES,
  CLAIM_CONFIDENCE,
  newRecord,
  validate,
}
