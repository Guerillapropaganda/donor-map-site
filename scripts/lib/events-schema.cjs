/**
 * events-schema.cjs — schema + validator for data/events.jsonl
 *
 * Part of Phase 2 — Query Engine MVP. See content/Build Phases.md and
 * content/Phases/phase-2/handoff.md for context.
 *
 * An "event" is a discrete legislative or regulatory moment that can
 * anchor a timing-proximity query or a policy page: a floor vote, a
 * committee markup, a regulation release, a hearing, an executive
 * order, etc.
 *
 * **Phase 2.75 hard dependencies (per ADR-0004, non-negotiable):**
 *   - policy_id (nullable) — links event to a policy in policies.jsonl
 *   - obstruction_type (enum) — captures procedural kills, not just votes
 *
 * Obstruction types:
 *   floor_vote           normal floor vote (yes/no/present)
 *   chair_bottled_up     committee chair refused to schedule markup
 *   filibustered         60-vote threshold never reached
 *   held_for_concessions held hostage for unrelated leverage
 *   pocket_vetoed        never signed after passing
 *   procedural_kill      procedural motion killed it (e.g. motion to table)
 *   voice_vote           voice vote (no recorded count — often used to
 *                        kill controversial bills without a paper trail)
 *
 * Public API:
 *   validate(record)    → { ok, errors }
 *   newRecord(partial)  → fully populated record with defaults
 *   EVENT_TYPES         → frozen enum
 *   OBSTRUCTION_TYPES   → frozen enum
 */

const EVENT_TYPES = Object.freeze([
  "floor_vote",
  "committee_vote",
  "committee_hearing",
  "committee_markup",
  "bill_introduction",
  "regulation_proposed",
  "regulation_finalized",
  "executive_order",
  "executive_action",
  "court_ruling",
  "signing",
  "veto",
  "other",
])

const OBSTRUCTION_TYPES = Object.freeze([
  "floor_vote",
  "chair_bottled_up",
  "filibustered",
  "held_for_concessions",
  "pocket_vetoed",
  "procedural_kill",
  "voice_vote",
  "n/a", // event isn't an obstruction (a signing, a ruling, etc.)
])

const OUTCOMES = Object.freeze([
  "passed",
  "failed",
  "withdrawn",
  "stalled",
  "tabled",
  "unknown",
  "n/a",
])

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    id: partial.id || null, // minted by store: evt_NNNNNNN
    type: partial.type || "other",
    title: partial.title || "",
    date: partial.date || null, // ISO 8601 string
    chamber: partial.chamber || null, // "house" | "senate" | "both" | null
    source_url: partial.source_url || null,
    source_id: partial.source_id || null, // ref to sources.jsonl if available
    outcome: partial.outcome || "unknown",

    // Phase 2.75 hard dependencies
    policy_id: partial.policy_id || null,
    obstruction_type: partial.obstruction_type || "n/a",

    // Stakeholders (names that cross-link to entities.jsonl by name)
    stakeholders: Array.isArray(partial.stakeholders) ? partial.stakeholders : [],
    sector_affected: Array.isArray(partial.sector_affected) ? partial.sector_affected : [],

    // Sponsors / key players
    sponsors: Array.isArray(partial.sponsors) ? partial.sponsors : [],

    // Vote breakdown (null for non-vote events)
    vote_breakdown: partial.vote_breakdown || null, // { yes, no, present, not_voting, by_party: {...} }

    // Raw source reference
    external_id: partial.external_id || null, // govtrack id, congress.gov id, etc.
    raw_source: partial.raw_source || null, // "govtrack" | "congress.gov" | "manual" | ...

    // Editorial metadata
    editor_notes: partial.editor_notes || "",

    first_seen: partial.first_seen || now,
    last_updated: partial.last_updated || now,
  }
}

function validate(record) {
  const errors = []
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }

  if (typeof record.id !== "string" || !/^evt_\d{7}$/.test(record.id)) {
    errors.push("id must match /^evt_\\d{7}$/")
  }
  if (!EVENT_TYPES.includes(record.type)) {
    errors.push(`type must be one of: ${EVENT_TYPES.join(", ")}`)
  }
  if (typeof record.title !== "string" || !record.title.trim()) {
    errors.push("title must be a non-empty string")
  }
  if (!OBSTRUCTION_TYPES.includes(record.obstruction_type)) {
    errors.push(`obstruction_type must be one of: ${OBSTRUCTION_TYPES.join(", ")}`)
  }
  if (!OUTCOMES.includes(record.outcome)) {
    errors.push(`outcome must be one of: ${OUTCOMES.join(", ")}`)
  }

  if (record.policy_id !== null && typeof record.policy_id !== "string") {
    errors.push("policy_id must be string or null")
  }
  if (record.chamber !== null && !["house", "senate", "both"].includes(record.chamber)) {
    errors.push("chamber must be house|senate|both|null")
  }

  if (!Array.isArray(record.stakeholders)) {
    errors.push("stakeholders must be an array")
  }
  if (!Array.isArray(record.sponsors)) {
    errors.push("sponsors must be an array")
  }
  if (!Array.isArray(record.sector_affected)) {
    errors.push("sector_affected must be an array")
  }

  if (record.date !== null && typeof record.date !== "string") {
    errors.push("date must be ISO 8601 string or null")
  }

  return { ok: errors.length === 0, errors }
}

module.exports = {
  EVENT_TYPES,
  OBSTRUCTION_TYPES,
  OUTCOMES,
  newRecord,
  validate,
}
