/**
 * entities-schema.cjs — schema + validator for data/entities.jsonl
 *
 * Part of Phase 2 — Query Engine MVP. See content/Build Phases.md and
 * content/Phases/phase-2/handoff.md for context.
 *
 * One record per entity (donor, politician, corporation, etc.) with:
 *   - Identity (id, name, profile_path, entity_type)
 *   - Signals gathered from the vault (NAICS, sector, party breakdown, etc.)
 *   - Class tags per ADR-0001 locked vocabulary (populated after approval)
 *   - Approval metadata
 *
 * Proposed-but-not-yet-approved tags live in a separate file
 * (`data/entity-class-tags-proposed.jsonl`) managed by the batch proposal
 * scripts. Rejections go to `data/entity-class-tags-rejected.jsonl`.
 *
 * Public API:
 *   validate(record)      → { ok: boolean, errors: string[] }
 *   newRecord(partial)    → fully-populated record with defaults
 *   ENTITY_TYPES          → frozen enum
 *   CAPITAL_TYPES         → frozen enum (from ADR-0001)
 *   CLASS_POSITIONS       → frozen enum
 *   IDEOLOGICAL_FUNCTIONS → frozen enum
 *   WORKER_RELATIONSHIPS  → frozen enum
 *   POLITICIAN_FIELDS     → for mirror vocabulary records
 */

// ─── Locked vocabulary from ADR-0001 ───────────────────────────────────

const ENTITY_TYPES = Object.freeze([
  "donor",
  "politician",
  "corporation",
  "network",
  "union",
  "nonprofit",
  "think_tank",
  "lobbying_firm",
  "other",
])

const CAPITAL_TYPES = Object.freeze([
  "fossil-capital",
  "extractive-capital",
  "finance-capital",
  "rentier-capital",
  "tech-monopoly",
  "retail-monopoly",
  "military-industrial",
  "carceral-capital",
  "pharma-capital",
  "media-capital",
  "agribusiness-capital",
  "small-capital",
  "professional-class",
  "labor-aligned",
  "dark-money-vehicle",
  "mixed",
])

const CLASS_POSITIONS = Object.freeze([
  "ruling-class",
  "upper-bourgeois",
  "petty-bourgeois",
  "labor-aligned",
  "ambiguous",
])

const IDEOLOGICAL_FUNCTIONS = Object.freeze([
  "union-busting",
  "climate-denial",
  "deregulatory",
  "libertarian-ideology",
  "religious-right",
  "carceral-expansion",
  "imperialist-aligned",
  "zionist-aligned",
  "nativist",
  "voter-suppression",
  "privatization",
  "austerity",
  "anti-trust-defender",
  "tax-avoidance-lobby",
  "astroturf",
  "dark-money-networked",
  "progressive-capital",
  "labor-organizing",
  "electoral-left",
  "movement-left",
])

const WORKER_RELATIONSHIPS = Object.freeze([
  "union-busting",
  "union-hostile",
  "low-wage-extractive",
  "neutral",
  "union-neutral-employer",
  "union-aligned",
  "worker-owned",
])

// Politician mirror vocabulary
const CLASS_ORIGINS = Object.freeze([
  "inherited-wealth",
  "professional-class",
  "small-business",
  "labor-background",
  "working-class",
  "military-career",
])

const PRIMARY_FUNDERS_CLASSES = Object.freeze([
  "ruling-class",
  "upper-bourgeois",
  "mixed",
  "grassroots-small-dollar",
  "labor-aligned",
])

// ─── Record construction ───────────────────────────────────────────────

function newRecord(partial = {}) {
  const now = new Date().toISOString()
  return {
    id: partial.id || null, // assigned by store
    name: partial.name || "",
    profile_path: partial.profile_path || null,
    entity_type: partial.entity_type || "other",

    // Signals gathered from the vault
    signals: partial.signals || {
      naics: null,
      sector: null,
      party_breakdown: null, // { R: 0.78, D: 0.22 } when known
      top_politicians_funded: [],
      total_political_spend: null,
      body_snippet: null,
      signals_gathered_at: null,
    },

    // Class tags — DONOR vocabulary (null until approved)
    capital_type: partial.capital_type || null,
    secondary_capital_type: partial.secondary_capital_type || null,
    class_position: partial.class_position || null,
    ideological_function: Array.isArray(partial.ideological_function)
      ? partial.ideological_function
      : [],
    worker_relationship: partial.worker_relationship || null,
    policy_stakes: Array.isArray(partial.policy_stakes) ? partial.policy_stakes : [],

    // Class tags — POLITICIAN mirror vocabulary (null unless entity_type = politician)
    serves_capital_type: Array.isArray(partial.serves_capital_type)
      ? partial.serves_capital_type
      : [],
    class_origin: partial.class_origin || null,
    stated_positions: partial.stated_positions || {},
    voting_record: partial.voting_record || {},
    contradiction_index: partial.contradiction_index ?? null,
    bloc_membership: Array.isArray(partial.bloc_membership) ? partial.bloc_membership : [],
    primary_funders_class: partial.primary_funders_class || null,

    // Approval metadata
    tags_approved: partial.tags_approved || false,
    tags_approved_at: partial.tags_approved_at || null,
    tags_approved_by: partial.tags_approved_by || null,
    tags_proposed_by: partial.tags_proposed_by || null, // "heuristic" | "research_claude" | "manual"
    tags_proposed_at: partial.tags_proposed_at || null,

    // Lifecycle timestamps
    first_seen: partial.first_seen || now,
    last_updated: partial.last_updated || now,
  }
}

// ─── Validation ───────────────────────────────────────────────────────

function validate(record) {
  const errors = []
  if (!record || typeof record !== "object") {
    return { ok: false, errors: ["record is not an object"] }
  }

  // Required: id, name, entity_type, first_seen
  if (typeof record.id !== "string" || !/^ent_\d{6}$/.test(record.id)) {
    errors.push("id must match /^ent_\\d{6}$/")
  }
  if (typeof record.name !== "string" || !record.name.trim()) {
    errors.push("name must be a non-empty string")
  }
  if (!ENTITY_TYPES.includes(record.entity_type)) {
    errors.push(`entity_type must be one of: ${ENTITY_TYPES.join(", ")}`)
  }
  if (
    typeof record.first_seen !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(record.first_seen)
  ) {
    errors.push("first_seen must be an ISO 8601 timestamp")
  }

  // Optional class tags — if present, must be in the locked vocabulary
  if (record.capital_type !== null && !CAPITAL_TYPES.includes(record.capital_type)) {
    errors.push(`capital_type must be one of: ${CAPITAL_TYPES.join(", ")}`)
  }
  if (
    record.secondary_capital_type !== null &&
    !CAPITAL_TYPES.includes(record.secondary_capital_type)
  ) {
    errors.push(`secondary_capital_type must be one of CAPITAL_TYPES or null`)
  }
  if (record.class_position !== null && !CLASS_POSITIONS.includes(record.class_position)) {
    errors.push(`class_position must be one of: ${CLASS_POSITIONS.join(", ")}`)
  }
  if (
    record.worker_relationship !== null &&
    !WORKER_RELATIONSHIPS.includes(record.worker_relationship)
  ) {
    errors.push(`worker_relationship must be one of: ${WORKER_RELATIONSHIPS.join(", ")}`)
  }

  if (!Array.isArray(record.ideological_function)) {
    errors.push("ideological_function must be an array")
  } else {
    for (const fn of record.ideological_function) {
      if (!IDEOLOGICAL_FUNCTIONS.includes(fn)) {
        errors.push(`ideological_function contains invalid value: ${fn}`)
        break
      }
    }
  }

  if (!Array.isArray(record.policy_stakes)) {
    errors.push("policy_stakes must be an array")
  } else if (record.policy_stakes.some((s) => typeof s !== "string")) {
    errors.push("policy_stakes must contain only strings")
  }

  // Politician-specific validation (only if the politician fields are populated)
  if (record.class_origin !== null && !CLASS_ORIGINS.includes(record.class_origin)) {
    errors.push(`class_origin must be one of: ${CLASS_ORIGINS.join(", ")}`)
  }
  if (
    record.primary_funders_class !== null &&
    !PRIMARY_FUNDERS_CLASSES.includes(record.primary_funders_class)
  ) {
    errors.push(`primary_funders_class must be one of: ${PRIMARY_FUNDERS_CLASSES.join(", ")}`)
  }

  if (!Array.isArray(record.serves_capital_type)) {
    errors.push("serves_capital_type must be an array")
  } else {
    for (const ct of record.serves_capital_type) {
      if (!CAPITAL_TYPES.includes(ct)) {
        errors.push(`serves_capital_type contains invalid value: ${ct}`)
        break
      }
    }
  }

  if (!Array.isArray(record.bloc_membership)) {
    errors.push("bloc_membership must be an array")
  }

  if (
    record.contradiction_index !== null &&
    (typeof record.contradiction_index !== "number" ||
      record.contradiction_index < 0 ||
      record.contradiction_index > 1)
  ) {
    errors.push("contradiction_index must be a number in [0, 1] or null")
  }

  // Approval metadata
  if (typeof record.tags_approved !== "boolean") {
    errors.push("tags_approved must be a boolean")
  }

  // Signals object
  if (!record.signals || typeof record.signals !== "object") {
    errors.push("signals must be an object")
  }

  return { ok: errors.length === 0, errors }
}

module.exports = {
  ENTITY_TYPES,
  CAPITAL_TYPES,
  CLASS_POSITIONS,
  IDEOLOGICAL_FUNCTIONS,
  WORKER_RELATIONSHIPS,
  CLASS_ORIGINS,
  PRIMARY_FUNDERS_CLASSES,
  newRecord,
  validate,
}
