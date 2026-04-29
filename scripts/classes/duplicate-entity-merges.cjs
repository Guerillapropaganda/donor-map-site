/**
 * classes/duplicate-entity-merges.cjs
 *
 * Pipeline registration for duplicate-entity-profile editorial
 * decisions (Phase 2B-A of ADR-0029).
 *
 * **Tier 2 only.** Merging entity profiles is a high-blast-radius
 * action — every edge in data/relationships.jsonl that references
 * either profile id needs to migrate to the canonical id, plus
 * frontmatter wikilinks across the vault. Even the obvious
 * dash-prefix cases (Walmart vs "Walmart - Walton Family") deserve
 * one human eyeball: which of the two is the canonical I'd want
 * future work to attach to?
 *
 * No tier1_predicate, no calibration_coverage required. This class
 * only surfaces and tracks; David approves each via the audit page
 * (or via a CLI in a future phase). The actual merge is delegated
 * to dedupe-entities.cjs --apply-approved, which already exists and
 * knows how to migrate edges + archive the duplicate folder.
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/duplicate-entity-merges-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

pipeline.register({
  name: 'duplicate-entity-merges',
  description:
    'Duplicate entity profiles flagged by duplicate-entity-profiles-check (shared FEC ID / EIN / CIK / normalized name). ' +
    'Tier 2 only — David picks canonical per group and the merge runs via dedupe-entities --apply-approved. ' +
    'Some groups will get marked intentionally-distinct or verify-id instead of merge.',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-merge',
  terminal_states: ['resolved', 'rejected'],

  // No tier1_predicate. Merges are categorically Tier 2. Even the
  // dash-prefix cases get human approval per group — Rule 16 + the
  // blast radius (every relationship edge) make this not worth
  // automating.

  apply_decision: async (rec, _store, records) => {
    // Only act on approved-merge. Other terminal-ish states (kept,
    // distinct, rejected, verify-id) just transition to resolved with
    // no external mutation.
    if (rec.state !== 'approved-merge') {
      pipeline.transition('duplicate-entity-merges', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'david',
        note: `${rec.state} → resolved (no entity merge required)`,
      });
      return true;
    }

    if (!rec.canonical_profile_id) {
      console.warn(`  ⚠ ${rec.id}: missing canonical_profile_id — leaving in approve state`);
      return false;
    }
    if (!Array.isArray(rec.archive_profile_ids) || rec.archive_profile_ids.length === 0) {
      console.warn(`  ⚠ ${rec.id}: archive_profile_ids empty — leaving in approve state`);
      return false;
    }

    // Delegate the actual merge to dedupe-entities.cjs. That script
    // owns: edge migration in data/relationships.jsonl, frontmatter
    // wikilink rewrites, alias preservation on the canonical, archival
    // of the duplicate profile folder. We pass canonical + archive ids
    // and let it do its thing.
    const args = [
      path.join(ROOT, 'scripts/merge-entity-targeted.cjs'),
      '--canonical-id', rec.canonical_profile_id,
      '--archive-ids', rec.archive_profile_ids.join(','),
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

    pipeline.transition('duplicate-entity-merges', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'david',
      note: mergeResult
        ? `merged ${rec.archive_profile_ids.length} into ${rec.canonical_profile_id} via merge-entity-targeted (${mergeResult.edges_rewritten} edges rewritten, ${mergeResult.edges_merged} merged)`
        : `merged ${rec.archive_profile_ids.length} into ${rec.canonical_profile_id} via merge-entity-targeted`,
    });
    return true;
  },

  // No blast_radius — Tier 2 means no claude-auto records to revert.
});

module.exports = { name: 'duplicate-entity-merges' };
