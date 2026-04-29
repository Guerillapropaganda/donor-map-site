/**
 * classes/class-tag-path-b-application.cjs
 *
 * Path B class-tag application (item #3 of handoff cc_p3_173). Per Rule 14,
 * class-tag *vocabulary* changes are David's lane. This class only *applies*
 * existing vocabulary from the locked CAPITAL_TYPES set (ADR-0001 +
 * scripts/lib/entities-schema.cjs).
 *
 * What "Path B" means: the existing v1 heuristic
 * (scripts/_archive/deprecated-experiments/batch-propose-class-tags-heuristic.cjs)
 * keyword-scanned the `sector` field — fast but missed entities whose sector
 * was meta-categorical ("Mega-Donors", "Super PACs", "Dark Money"). Path B
 * adds **profile-folder classification** as a second signal: when the
 * editorial folder under `content/Donors & Power Networks/` unambiguously
 * implies a capital_type (Pharma & Healthcare → pharma-capital, Wall Street
 * → finance-capital), the producer proposes that mapping.
 *
 * **Tier 1 predicate:** folder is in the unambiguous set AND entity has no
 * existing capital_type AND no conflict with sector signal. Tier 1 yield
 * (sweep 2026-04-29): ~351 entities — chiefly Wall Street, Super PACs,
 * Dark Money, Defense, Pharma, Energy, Tech, Carceral, Labor.
 *
 * **Tier 2:** folder is ambiguous (Mega-Donors, Education, Corporate,
 * Restaurant & Food). Producer surfaces these for David's batch approval.
 *
 * **Foreign / Israel Lobby:** producer skips entirely. Per the existing
 * heuristic comment, those folders imply ideological_function (imperialist-
 * aligned, zionist-aligned), not capital_type. capital_type stays null;
 * a separate pass can propose ideological_function values.
 *
 * Per Rule 16: calibration_coverage references 7 fixtures in
 * data/calibration-fixture.jsonl bucket=class-tag covering blast radius
 * for both correct application (Pfizer→pharma-capital, Goldman→finance-
 * capital, etc.) and the regression case where Tier 1 wrongly fires for
 * Tier 2 folders (NEA must stay null, Koch must stay null). If Path B
 * ever flips an asserted entity, drift fires within 15 min and
 * calibration-auto-revert moves the bad decision back to candidate.
 *
 * Apply path: writes capital_type to entities.jsonl via entities-store
 * updateEntity(). Validates against the locked CAPITAL_TYPES enum;
 * schema validator throws on invalid value. Records tags_proposed_by,
 * tags_proposed_at metadata. tags_approved/tags_approved_by stay false/
 * null because David's editorial sign-off is a separate step (the
 * existing /class-tags ops page).
 */

'use strict';

const path = require('path');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/class-tag-path-b-decisions-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

// Folder → capital_type mapping. Ordered by editorial unambiguity; HIGH_
// CONFIDENCE_FOLDERS triggers Tier 1, AMBIGUOUS_FOLDERS triggers Tier 2,
// SKIP_FOLDERS bypasses (handled by ideological_function pass elsewhere).
//
// IMPORTANT: any addition to HIGH_CONFIDENCE_FOLDERS is effectively a
// vocabulary-change-grade decision (Tier 1 = no human review per record).
// Per Rule 14, treat new entries as "needs an ADR or David's explicit
// sign-off in the audit log." AMBIGUOUS_FOLDERS additions are safer
// (David approves each instance via /audit-claude-decisions).
const HIGH_CONFIDENCE_FOLDERS = {
  'Agriculture': 'agribusiness-capital',
  'Carceral State': 'carceral-capital',
  'Defense & Intelligence': 'military-industrial',
  'Energy & Utilities': 'fossil-capital',
  'Healthcare': 'pharma-capital',
  'Healthcare Industry': 'pharma-capital',
  'Labor Unions': 'labor-aligned',
  'Law Enforcement': 'carceral-capital',
  'Media & Entertainment': 'media-capital',
  'Media & Influence': 'media-capital',
  'Pharma & Healthcare': 'pharma-capital',
  'Real Estate': 'rentier-capital',
  'Real Estate & Housing': 'rentier-capital',
  'Tech & Crypto': 'tech-monopoly',
  'Wall Street': 'finance-capital',
  'Dark Money': 'dark-money-vehicle',
  'Super PACs': 'dark-money-vehicle',
};

// Folders where the contents pull in opposite directions. Path B surfaces
// candidates but never auto-applies. The proposed capital_type is the
// most-frequent type within the folder, but each entity needs David's
// review.
const AMBIGUOUS_FOLDERS = {
  'Mega-Donors': 'mixed',          // Koch (fossil/dark-money) vs Bloomberg (media/finance) etc.
  'Corporate': 'mixed',
  'Education': null,               // NEA (labor) vs DeVos (privatization) — propose nothing
  'Restaurant & Food': 'mixed',    // small-capital varies
  'Gig Economy': 'tech-monopoly',  // Uber/Lyft/DoorDash all qualify, but propose tier-2
};

const SKIP_FOLDERS = new Set([
  'Foreign',         // Implies ideological_function: imperialist-aligned, not capital_type
  'Israel Lobby',    // Implies ideological_function: zionist-aligned
]);

pipeline.register({
  name: 'class-tag-path-b-application',
  description:
    'Path B: applies capital_type from profile-folder classification (per Rule 14, applying ' +
    'existing locked vocabulary). Tier 1 for ~17 unambiguous folders (Pharma → pharma-capital, ' +
    'Wall Street → finance-capital, etc.). Tier 2 for ambiguous folders (Mega-Donors, Corporate, ' +
    'Education) — David approves each through /audit-claude-decisions. Foreign + Israel Lobby ' +
    'skipped entirely (those folders imply ideological_function, not capital_type).',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-apply',
  terminal_states: ['resolved', 'rejected'],

  tier1_predicate: (rec) => {
    if (rec.state !== 'candidate') return false;
    if (rec.confidence !== 'tier-1-folder') return false;
    if (!rec.entity_id) return false;
    if (!rec.to_capital_type) return false;
    // from_capital_type must be null/empty for Tier 1 — never auto-overwrite
    // an existing tag. Overwrites are David-only.
    if (rec.from_capital_type) return false;
    return true;
  },

  auto_apply_target: (rec) => rec.to_capital_type,

  // Per Rule 16. The fixtures live in data/calibration-fixture.jsonl
  // under bucket=class-tag.
  calibration_coverage: [
    'Pfizer Inc.',
    'Goldman Sachs',
    'Lockheed Martin',
    'ExxonMobil',
    'ADM - Archer Daniels Midland',
    'National Education Association',
    'Koch Network - Charles Koch',
  ],

  apply_decision: async (rec, _store, records) => {
    if (rec.state !== 'approved-apply') {
      pipeline.transition('class-tag-path-b-application', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'david',
        note: `${rec.state} → resolved (no write required)`,
      });
      return true;
    }

    if (!rec.entity_id || !rec.to_capital_type) {
      console.warn(`  ⚠ ${rec.id}: missing entity_id or to_capital_type — skipping`);
      return false;
    }

    const entitiesStore = require('../lib/entities-store.cjs');
    entitiesStore.loadEntities();
    const ent = entitiesStore.getEntity(rec.entity_id);
    if (!ent) {
      console.warn(`  ⚠ ${rec.id}: entity ${rec.entity_id} not found — skipping`);
      return false;
    }

    // Drift defense: if entity already has a different capital_type than
    // we're proposing, refuse. David's existing tag wins; the producer
    // will re-evaluate next tick (and probably stop proposing once it
    // sees the existing value).
    if (ent.capital_type && ent.capital_type !== rec.to_capital_type) {
      console.warn(
        `  ⚠ ${rec.id}: entity already has capital_type=${ent.capital_type}, refusing to overwrite to ${rec.to_capital_type}`
      );
      return false;
    }
    // No-op: already at target. Mark resolved.
    if (ent.capital_type === rec.to_capital_type) {
      pipeline.transition('class-tag-path-b-application', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'claude-auto',
        note: `entity already at capital_type=${rec.to_capital_type} — no write performed`,
      });
      return true;
    }

    try {
      entitiesStore.updateEntity(rec.entity_id, {
        capital_type: rec.to_capital_type,
        tags_proposed_by: 'class-tag-path-b',
        tags_proposed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`  ⚠ ${rec.id}: updateEntity failed: ${err.message}`);
      return false;
    }

    pipeline.transition('class-tag-path-b-application', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'claude-auto',
      note: `capital_type set to ${rec.to_capital_type} (folder=${rec.folder}, ${rec.confidence})`,
    });
    return true;
  },

  // Symmetric undo for manual revert via /audit-claude-decisions.
  revert_decision: async (rec) => {
    if (!rec.entity_id) return { skipped: 'no entity_id' };
    const entitiesStore = require('../lib/entities-store.cjs');
    entitiesStore.loadEntities();
    const ent = entitiesStore.getEntity(rec.entity_id);
    if (!ent) return { skipped: 'entity not found' };
    // Only undo if current value matches what we set. If David later
    // changed it to something else, leave it alone.
    if (ent.capital_type !== rec.to_capital_type) {
      return {
        skipped: `current capital_type='${ent.capital_type}', not '${rec.to_capital_type}' — no revert performed`,
      };
    }
    try {
      entitiesStore.updateEntity(rec.entity_id, {
        capital_type: rec.from_capital_type ?? null,
      });
    } catch (err) {
      return { skipped: `updateEntity failed: ${err.message}` };
    }
    return {
      ok: true,
      reverted_field: 'capital_type',
      from: rec.to_capital_type,
      to: rec.from_capital_type ?? null,
    };
  },

  // Blast radius for auto-revert. If a class-tag fixture fails, narrow to
  // claude-auto decisions whose target capital_type matches the fixture's
  // expected value (catches the case where a folder mapping is wrong and
  // affects every entity in that folder).
  blast_radius: (fixtureRecord, recentDecisions) => {
    if (!fixtureRecord) return recentDecisions;
    const fixtureCapType = fixtureRecord.expected;
    const fixtureName = (fixtureRecord.profile || '').toLowerCase();
    return recentDecisions.filter((d) => {
      if ((d.entity_name || '').toLowerCase() === fixtureName) return true;
      // Same target capital_type → likely same folder mapping → in blast radius.
      if (fixtureCapType && d.to_capital_type === fixtureCapType) return true;
      return false;
    });
  },
});

module.exports = {
  name: 'class-tag-path-b-application',
  HIGH_CONFIDENCE_FOLDERS,
  AMBIGUOUS_FOLDERS,
  SKIP_FOLDERS,
};
