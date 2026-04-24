/**
 * frontmatter-schema.cjs — declarative frontmatter schema (ADR-0023).
 *
 * Single source of truth for which frontmatter fields are required on
 * which content types. Consumed by scripts/frontmatter-schema-validator.cjs
 * (harness check, see ADR-0023 §8), Phase C backfill scripts, and any
 * future auto-fix tooling.
 *
 * Only content types are governed here. System types (adr, handoff,
 * admin-note, digest, log, index, etc.) are governed by convention —
 * their consumers defend against missing fields already.
 *
 * Schema version 1 — accepted 2026-04-23 per ADR-0023.
 */

module.exports = {
  version: '1',

  // Fields required on every content type. ≥99% current coverage.
  universal: {
    required: ['title', 'type', 'last-updated', 'content-readiness', 'source-tier'],
  },

  // Per-type requirements. `required` = must have, already ≥90% covered.
  // `proposed_required` = schema intends required but current coverage is
  // below threshold; backfill before enforcement. `id_substitute` (for
  // state/local politicians) = any one of a set of identifier fields
  // satisfies the ID requirement.
  types: {
    politician: {
      required: ['chamber', 'party', 'source-types', 'last-enriched'],
      proposed_required: ['central-thesis', 'story-grade'],
      id_substitute: ['fec-candidate-id', 'bioguide-id'],
    },
    donor: {
      required: ['sector', 'entity-type', 'last-enriched'],
      proposed_required: ['politicians-funded', 'central-thesis', 'story-grade'],
    },
    event: {
      required: ['date', 'status', 'source', 'source-url', 'profiles'],
      // no editorial gate — events are log-shaped
    },
    'sub-note': {
      required: ['parent', 'related', 'last-enriched'],
      // content-readiness is inherited from parent; validator rule handles this
      inherits_content_readiness: true,
    },
    corporation: {
      required: ['sector', 'entity-type', 'parent', 'related', 'last-enriched', 'politicians-funded'],
      proposed_required: ['central-thesis', 'story-grade'],
    },
    'story-seed': {
      required: ['seed-type', 'confidence', 'auto-generated', 'status'],
      // no editorial gate — auto-generated
    },
    story: {
      required: ['parent', 'related', 'last-enriched'],
      proposed_required: ['story-grade', 'central-thesis'],
    },
    'media-profile': {
      required: ['parent', 'category', 'related'],
      proposed_required: ['platform'],
    },
    pac: {
      required: ['parent', 'sector', 'entity-type', 'related'],
      proposed_required: ['fec-committee-id'],
    },
    'think-tank': {
      required: ['parent', 'related'],
      proposed_required: ['ein', 'total-revenue', 'total-assets', 'central-thesis', 'story-grade'],
    },
    'lobbying-firm': {
      required: ['parent', 'related'],
      proposed_required: ['lda-client-count'],
    },
    'state-politician': {
      required: ['current-office', 'related'],
      id_substitute: ['fec-candidate-id', 'bioguide-id', 'state-candidate-id'],
    },
    'local-politician': {
      required: ['current-office', 'related'],
      id_substitute: ['fec-candidate-id', 'bioguide-id', 'state-candidate-id'],
    },
    policy: {
      // Corpus too small (5) to set required fields with confidence. Revisit at ≥20.
      required: [],
      deferred: true,
    },
  },

  // Fields retired per ADR-0023 §4. Validator flags if any of these
  // appear on new commits. (Existing occurrences were swept in Phase A+B
  // 2026-04-23 but future pipeline output could re-introduce them.)
  retired: [
    // Phase A (retired 2026-04-23)
    'running-for',
    'parent-profile',
    'opensanctions-status',
    'opensanctions-matches',
    'opensanctions-datasets',
    'merge-note',
    'leadership-role',
    'former-committees',
    'fec-candidate-id-house',
    'fec-senate-id',
    'experiment',
    'data-quality-flag',
    'claims-slug',
    'editorial-blockers',
    'verified-blocks',
    'historical',
    // Phase B (retired 2026-04-23 — editorial-workflow data, not legal)
    'editorial-review-date',
    'editorial-reviewer',
    'editorial-result',
  ],

  // Variant consolidation per ADR-0023 §5. Maps retired variants to
  // canonical names (for informational reporting; variants are already
  // in `retired` above so they'd be flagged regardless).
  variants: {
    'parent-profile': 'parent',
    'leadership-role': 'leadership-roles',
    // fec-senate-id + fec-candidate-id-house are NOT variants. They're
    // distinct election-cycle IDs. New pattern: fec-previous-ids list.
    // See ADR-0023 §5 amendment + Rubio/Porter profiles.
  },

  // The 14 content types governed by this schema. Everything else is
  // "system" and not validated here.
  content_types: [
    'politician', 'donor', 'event', 'sub-note', 'corporation', 'story-seed',
    'story', 'media-profile', 'pac', 'think-tank', 'lobbying-firm',
    'state-politician', 'local-politician', 'policy',
  ],
};
