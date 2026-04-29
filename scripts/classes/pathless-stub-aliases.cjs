/**
 * classes/pathless-stub-aliases.cjs
 *
 * Pipeline registration for pathless-stub editorial decisions
 * (Phase 2B-B of ADR-0029). Tier 2 only.
 *
 * State-specific writers:
 *   - approved-merge   → delegate to dedupe-entities.cjs --apply-approved
 *                        (canonical_entity_id + ghost id) — migrates
 *                        edges, deletes the ghost record
 *   - create-profile   → no automated writer; the profile is created
 *                        manually. We just transition to resolved with
 *                        a note recording the decision.
 *   - accept-pathless  → no mutation; transition to resolved (90-day
 *                        suppression handled by the harness check
 *                        reading state, in a future change)
 *   - rejected         → no mutation; transition to resolved
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/pathless-stub-aliases-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

pipeline.register({
  name: 'pathless-stub-aliases',
  description:
    'Entities in entities.jsonl with no profile_path (FEC committee names that should have been aliased to a canonical, or PACs that need their own profile, or legitimate pathless industry blocs). ' +
    'Tier 2 only — David picks canonical (merge), creates a stub profile, or marks accept-pathless. The merge runs via dedupe-entities --apply-approved.',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-merge',
  terminal_states: ['resolved', 'rejected'],

  apply_decision: async (rec, _store, records) => {
    if (rec.state !== 'approved-merge') {
      // create-profile / accept-pathless / rejected: no external mutation,
      // just record the decision and resolve.
      pipeline.transition('pathless-stub-aliases', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'david',
        note: `${rec.state} → resolved (no entity merge required)`,
      });
      return true;
    }

    if (!rec.canonical_entity_id) {
      console.warn(`  ⚠ ${rec.id}: missing canonical_entity_id — leaving in approve state`);
      return false;
    }
    if (!rec.entity_id) {
      console.warn(`  ⚠ ${rec.id}: missing entity_id (ghost stub) — leaving in approve state`);
      return false;
    }

    // Same writer as duplicate-entity-merges: merge-entity-targeted
    // migrates edges + archives the ghost record + preserves aliases.
    const args = [
      path.join(ROOT, 'scripts/merge-entity-targeted.cjs'),
      '--canonical-id', rec.canonical_entity_id,
      '--archive-ids', rec.entity_id,
      '--json',
    ];
    const result = spawnSync(process.execPath, args, {
      cwd: ROOT, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) {
      console.warn(`  ⚠ ${rec.id}: merge-entity-targeted failed (exit ${result.status})`);
      console.warn(`    stderr: ${(result.stderr || '').slice(0, 400)}`);
      return false;
    }
    let mergeResult = null;
    try { mergeResult = JSON.parse((result.stdout || '').trim().split('\n').pop() || ''); } catch { /* ignore */ }

    pipeline.transition('pathless-stub-aliases', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'david',
      note: mergeResult
        ? `merged ghost ${rec.entity_id} ("${rec.name}") into ${rec.canonical_entity_id} via merge-entity-targeted (${mergeResult.edges_rewritten} edges rewritten)`
        : `merged ghost ${rec.entity_id} ("${rec.name}") into ${rec.canonical_entity_id} via merge-entity-targeted`,
    });
    return true;
  },
});

module.exports = { name: 'pathless-stub-aliases' };
