/**
 * polling-schema.cjs — schema + validator for data/polling.jsonl
 *
 * Part of Phase 2.75 — Policy Battles MVP. Public support tracker.
 * Manual curation v1 per phase-2/decisions.md §Phase 2 launch decision #3
 * (KFF healthcare, Data for Progress economic, Pew civic, Morning
 * Consult general, Gallup long-trend).
 *
 * Public API:
 *   validate(record)   → { ok, errors }
 *   newRecord(partial) → populated record with defaults
 *   POLLING_ORGS       → frozen enum of authoritative polling sources
 */

const POLLING_ORGS = Object.freeze([
  "KFF",
  "Data for Progress",
  "Pew Research",
  "Morning Consult",
  "Gallup",
  "Harvard Harris",
  "Ipsos",
  "YouGov",
  "Quinnipiac",
  "NORC",
  "other",
])

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    id: partial.id || null, // poll_NNNNNN
    policy_id: partial.policy_id || null, // pol_{slug}
    org: partial.org || "other",
    source_title: partial.source_title || "",
    source_url: partial.source_url || null,
    source_ref: partial.source_ref || null, // src_NNNNNN → sources.jsonl

    question: partial.question || "",
    support_pct: partial.support_pct ?? null,
    oppose_pct: partial.oppose_pct ?? null,
    undecided_pct: partial.undecided_pct ?? null,

    sample_size: partial.sample_size ?? null,
    method: partial.method || null,
    fielded: partial.fielded || null,
    population: partial.population || null, // "national adult" | "registered voter" | ...

    editor_notes: partial.editor_notes || "",
    first_seen: partial.first_seen || now,
  }
}

function validate(record) {
  const errors = []
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }
  if (typeof record.id !== "string" || !/^poll_\d{6}$/.test(record.id)) {
    errors.push("id must match /^poll_\\d{6}$/")
  }
  if (record.policy_id !== null && !/^pol_[a-z_]+$/.test(record.policy_id || "")) {
    errors.push("policy_id must match /^pol_[a-z_]+$/ or be null")
  }
  if (!POLLING_ORGS.includes(record.org)) {
    errors.push(`org must be one of: ${POLLING_ORGS.join(", ")}`)
  }
  for (const pct of ["support_pct", "oppose_pct", "undecided_pct"]) {
    if (record[pct] !== null && (typeof record[pct] !== "number" || record[pct] < 0 || record[pct] > 100)) {
      errors.push(`${pct} must be a number in [0, 100] or null`)
    }
  }
  return { ok: errors.length === 0, errors }
}

module.exports = {
  POLLING_ORGS,
  newRecord,
  validate,
}
