/**
 * classes/frontmatter-orphan-prunes.cjs
 *
 * Pipeline class registration for ADR-0027 frontmatter-orphan-candidates.
 *
 * Names that appear in a profile's frontmatter relationship cache (donors,
 * politicians-funded, opposes, etc.) but have NO backing edge in the
 * librarian. The two failure modes:
 *   - Editorial typo / stale entry — should be pruned
 *   - Librarian gap (e.g. Fairshake FEC committee-stub mapping) — should
 *     stay; the librarian will catch up
 *
 * **Tier 2 only.** ADR-0027 explicitly rejected aggressive auto-prune
 * because the librarian has known gaps and would erase real data. So this
 * class has no tier1_predicate; every decision goes through David batch-
 * approval via the editorial-decision-pipeline review-list pattern.
 *
 * State machine (from existing store):
 *   candidate → approved-prune | kept | blocked-by-librarian-gap → resolved
 *
 * The class writer (apply_decision) handles the state-specific actions:
 *   - approved-prune: hand off to rebuild-relationship-caches.cjs
 *     --apply-approved, which strips the name from the profile's frontmatter
 *   - kept: leave the frontmatter alone, suppress this record for 90 days
 *   - blocked-by-librarian-gap: leave alone, surface in a separate report
 *     so the librarian work gets prioritized
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/frontmatter-orphan-candidates-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

pipeline.register({
  name: 'frontmatter-orphan-prunes',
  description:
    'ADR-0027 Phase 1 review queue. Names in frontmatter caches with no librarian-backed edges. ' +
    'Tier 2 only — David approves each prune in batch (or marks kept / blocked-by-librarian-gap). ' +
    'Aggressive Tier 1 auto-prune was explicitly rejected per ADR-0027 because the librarian ' +
    'has known gaps (Fairshake committee-stub mapping etc.) and would erase real data.',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-prune',
  terminal_states: ['resolved'],

  // No tier1_predicate — every decision is human-reviewed.
  // No calibration_coverage required (Rule 16 only applies to Tier 1).

  // Class-specific writer. For approved-prune, the actual frontmatter
  // mutation is delegated to rebuild-relationship-caches.cjs --apply-approved
  // (which is the canonical writer per ADR-0027 §Decision). We invoke it
  // here so the pipeline.applyApproved() flow ends with the side effect
  // performed AND the record marked resolved.
  apply_decision: async (rec, _store, records) => {
    if (rec.state !== 'approved-prune') {
      // For 'kept' and 'blocked-by-librarian-gap', no entities/frontmatter
      // mutation is needed. Mark resolved (suppression bookkeeping happens
      // via the store's last_seen timestamp).
      pipeline.transition('frontmatter-orphan-prunes', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'david',
        note: `${rec.state} → resolved (no mutation required)`,
      });
      return true;
    }

    // approved-prune: invoke the canonical writer.
    // We delegate to rebuild-relationship-caches.cjs to do the frontmatter
    // edit. That script understands the per-field cache rebuild pattern
    // and handles edge cases (multi-name fields, escaping, etc.) correctly.
    // For the pipeline's accounting, we mark resolved AFTER the script
    // succeeds.
    // --write is critical: without it, rebuild-relationship-caches.cjs runs
    // in dry-run mode and does NOT mutate the profile frontmatter. The
    // orphan record would still flip to resolved (via pipeline.transition
    // below), creating a state divergence where the record claims pruned
    // but the name persists in frontmatter. The --report-orphans pipeline
    // would then re-surface the same orphan on the next tick. Always pass
    // --write here so approve = applied.
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'scripts/rebuild-relationship-caches.cjs'),
        '--apply-approved',
        '--write',
        '--orphan-id', rec.id,
      ],
      { cwd: ROOT, encoding: 'utf-8', maxBuffer: 16 * 1024 * 1024 }
    );
    if (result.status !== 0) {
      console.warn(`  ⚠ ${rec.id}: rebuild-relationship-caches --apply-approved failed`);
      console.warn(`    stderr: ${(result.stderr || '').slice(0, 400)}`);
      return false;
    }

    pipeline.transition('frontmatter-orphan-prunes', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'david',
      note: 'pruned via rebuild-relationship-caches --apply-approved',
    });
    return true;
  },

  // No blast_radius — this class doesn't have Tier 1 decisions, so there's
  // nothing the calibration auto-revert needs to undo. Auto-revert
  // explicitly skips classes without has_tier1.
});

module.exports = { name: 'frontmatter-orphan-prunes' };
