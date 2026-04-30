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

const fs = require('fs');
const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/pathless-stub-aliases-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

/** Lazy-load the FEC committee registry, indexed by uppercase fec_name
 *  for exact-match lookup. Used by tier1_predicate to find 1:1 matches. */
let _fecByFecName = null;
function getFecByFecName() {
  if (_fecByFecName) return _fecByFecName;
  const file = path.join(ROOT, 'data', 'fec-committee-registry.json');
  if (!fs.existsSync(file)) { _fecByFecName = new Map(); return _fecByFecName; }
  const reg = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const out = new Map();
  // Track collisions — if two committees share fec_name AND both have
  // distinct vault_profile, drop both from the auto-apply pool.
  const seenName = new Map(); // upperName → vault_profile (first seen)
  const collisions = new Set();
  for (const [committee_id, entry] of Object.entries(reg)) {
    if (!entry.fec_name || !entry.vault_profile) continue;
    const k = entry.fec_name.trim().toUpperCase();
    const prior = seenName.get(k);
    if (prior && prior !== entry.vault_profile) {
      collisions.add(k);
      continue;
    }
    seenName.set(k, entry.vault_profile);
    out.set(k, { committee_id, ...entry });
  }
  for (const k of collisions) out.delete(k);
  _fecByFecName = out;
  return _fecByFecName;
}

/** Resolve a vault_profile path → entity_id by reading entities.jsonl.
 *  Cached per process. */
let _entityByPath = null;
function getEntityByPath() {
  if (_entityByPath) return _entityByPath;
  const file = path.join(ROOT, 'data', 'entities.jsonl');
  const out = new Map();
  if (!fs.existsSync(file)) { _entityByPath = out; return out; }
  for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.profile_path) out.set(e.profile_path.replace(/\\/g, '/'), e);
    } catch { /* skip */ }
  }
  _entityByPath = out;
  return _entityByPath;
}

pipeline.register({
  name: 'pathless-stub-aliases',
  description:
    'Entities in entities.jsonl with no profile_path (FEC committee names that should have been aliased to a canonical, or PACs that need their own profile, or legitimate pathless industry blocs). ' +
    'Tier 1 auto-applies on strict 1:1 fec_name match in fec-committee-registry where the matched committee has a vault_profile. Tier 2 batch-approves all other candidates (David picks canonical, creates stub profile, or marks accept-pathless).',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-merge',
  terminal_states: ['resolved', 'rejected'],

  // Tier 1 (cc_p3_209 promotion per ADR-0029 §10 amendment):
  // Auto-apply ONLY when the ghost stub's name has an exact fec_name
  // match in the FEC committee registry AND that committee maps to a
  // vault profile (1:1 mapping). Collisions where two committees share
  // the same fec_name are excluded by getFecByFecName(). The predicate
  // is conservative by design: when in doubt, fall through to Tier 2.
  tier1_predicate: (rec) => {
    if (rec.state !== 'candidate') return false;
    if (!rec.name || !rec.entity_id) return false;
    const fecMatch = getFecByFecName().get(rec.name.trim().toUpperCase());
    if (!fecMatch) return false;
    const entity = getEntityByPath().get(fecMatch.vault_profile);
    if (!entity || !entity.id) return false;
    return true;
  },

  // Returns the canonical entity_id (a string ent_NNNNNN). The pipeline
  // writes this to rec.approved_merge_target via the standard payload
  // mechanism. apply_decision below reads either canonical_entity_id
  // (Tier 2 / David-set) or falls back to approved_merge_target (Tier 1).
  auto_apply_target: (rec) => {
    const fecMatch = getFecByFecName().get(rec.name.trim().toUpperCase());
    if (!fecMatch) return null;
    const entity = getEntityByPath().get(fecMatch.vault_profile);
    return entity?.id || null;
  },

  // Reuse high-coverage fixtures from librarian-gap-aliases — they
  // protect entity-merge blast radius (top-recipient lists, IE-oppose
  // routing) which is the same surface a wrong pathless-stub merge
  // would corrupt. Plus a Mike Carey direct-coverage fixture (the one
  // current 1:1 candidate, added to data/calibration-fixture.jsonl).
  calibration_coverage: [
    'Mike Carey',
    'Alexandria Ocasio-Cortez',
    'Catherine Cortez Masto',
    'Mark Kelly',
    'Pfizer Inc.',
  ],

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

    // Tier 1 path: pipeline wrote `approved_merge_target` (entity id);
    // also fill canonical_entity_id + canonical_entity_name on the rec
    // so the merge call below works the same as Tier 2.
    if (!rec.canonical_entity_id && rec.approved_merge_target) {
      const targetEnt = [...getEntityByPath().values()].find((e) => e.id === rec.approved_merge_target);
      if (targetEnt) {
        rec.canonical_entity_id = targetEnt.id;
        rec.canonical_entity_name = targetEnt.name;
      }
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
