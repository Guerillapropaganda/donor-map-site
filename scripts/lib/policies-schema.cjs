/**
 * policies-schema.cjs — schema + validator for data/policies.jsonl
 *
 * Part of Phase 2.75 — Policy Battles MVP. See content/Decisions/
 * 0004-phase-2-75-policy-battles.md for full scope.
 *
 * A "policy" here is a legislative goal that has measurable public
 * support AND a legislative outcome, so we can surface the GAP between
 * popular will and political action. Each policy ties together:
 *   - polling.jsonl records (public support evidence)
 *   - events.jsonl records (legislative history via policy_id)
 *   - relationships.jsonl (donor money trail via opposition_capital_types)
 *   - sources.jsonl (every factual claim has a source ref)
 *
 * v1 policies (locked in ADR-0004):
 *   pol_housing — Housing affordability / rent control
 *   pol_healthcare — Universal healthcare / Medicare expansion
 *   pol_aipac_bds — AIPAC / BDS laws (with editorial firewall)
 *   pol_minimum_wage — Minimum wage ($15+)
 *   pol_student_debt — Student debt cancellation
 *
 * Public API:
 *   validate(record)    → { ok, errors }
 *   newRecord(partial)  → populated record with defaults
 *   POLICY_CATEGORIES   → frozen enum
 *   POLICY_STATUSES     → frozen enum
 */

const POLICY_CATEGORIES = Object.freeze([
  "housing",
  "healthcare",
  "economic",
  "labor",
  "environment",
  "civil_rights",
  "foreign_policy",
  "criminal_justice",
  "education",
  "tax_policy",
  "democracy",
  "tech_policy",
  "other",
])

const POLICY_STATUSES = Object.freeze([
  "draft", // editorial work in progress
  "published", // live on /policies/{slug}
  "archived", // removed from public view
])

const LEGISLATIVE_STATUSES = Object.freeze([
  "stalled",
  "partial", // some provisions passed (Medicare drug negotiation for 10 of 400+ drugs)
  "passed",
  "vetoed",
  "signed",
  "blocked_in_committee",
  "never_introduced",
  "unknown",
])

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    id: partial.id || null, // pol_{slug} minted by store
    slug: partial.slug || "",
    title: partial.title || "",
    category: partial.category || "other",

    // Editorial prose (the ONE paragraph the editor hand-writes)
    plain_english: partial.plain_english || "",

    // Public support tracker (references to polling.jsonl records)
    public_support_pct: partial.public_support_pct ?? null,
    public_support_source: partial.public_support_source || null, // src_NNNNNN ref
    polling_refs: Array.isArray(partial.polling_refs) ? partial.polling_refs : [],

    // Legislative history
    legislative_status: partial.legislative_status || "unknown",
    legislative_summary: partial.legislative_summary || "",
    related_events: Array.isArray(partial.related_events) ? partial.related_events : [], // evt_NNNNNNN refs

    // Opposition fingerprint
    opposition_capital_types: Array.isArray(partial.opposition_capital_types)
      ? partial.opposition_capital_types
      : [],
    opposition_donors_query: partial.opposition_donors_query || null,
    class_analysis_tags: Array.isArray(partial.class_analysis_tags)
      ? partial.class_analysis_tags
      : [],

    // Editorial firewall marker for AIPAC/BDS and other high-risk pages
    high_risk_editorial: partial.high_risk_editorial || false,
    requires_legal_review: partial.requires_legal_review || false,
    legal_review_by: partial.legal_review_by || null,
    legal_review_at: partial.legal_review_at || null,

    // Publication state
    status: partial.status || "draft",
    published_at: partial.published_at || null,

    first_seen: partial.first_seen || now,
    last_updated: partial.last_updated || now,
  }
}

function validate(record) {
  const errors = []
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }

  if (typeof record.id !== "string" || !/^pol_[a-z_]+$/.test(record.id)) {
    errors.push("id must match /^pol_[a-z_]+$/")
  }
  if (typeof record.slug !== "string" || !record.slug.trim()) {
    errors.push("slug must be a non-empty string")
  }
  if (typeof record.title !== "string" || !record.title.trim()) {
    errors.push("title must be a non-empty string")
  }
  if (!POLICY_CATEGORIES.includes(record.category)) {
    errors.push(`category must be one of: ${POLICY_CATEGORIES.join(", ")}`)
  }
  if (!POLICY_STATUSES.includes(record.status)) {
    errors.push(`status must be one of: ${POLICY_STATUSES.join(", ")}`)
  }
  if (!LEGISLATIVE_STATUSES.includes(record.legislative_status)) {
    errors.push(`legislative_status must be one of: ${LEGISLATIVE_STATUSES.join(", ")}`)
  }
  if (
    record.public_support_pct !== null &&
    (typeof record.public_support_pct !== "number" ||
      record.public_support_pct < 0 ||
      record.public_support_pct > 100)
  ) {
    errors.push("public_support_pct must be a number in [0, 100] or null")
  }
  if (!Array.isArray(record.related_events)) {
    errors.push("related_events must be an array")
  }
  if (!Array.isArray(record.opposition_capital_types)) {
    errors.push("opposition_capital_types must be an array")
  }
  if (typeof record.high_risk_editorial !== "boolean") {
    errors.push("high_risk_editorial must be a boolean")
  }
  return { ok: errors.length === 0, errors }
}

module.exports = {
  POLICY_CATEGORIES,
  POLICY_STATUSES,
  LEGISLATIVE_STATUSES,
  newRecord,
  validate,
}
