/**
 * classes/librarian-gap-aliases.cjs
 *
 * Pipeline class registration for librarian-gap alias decisions.
 *
 * Wraps the existing librarian-gap-decisions-store.cjs in the editorial-
 * decision-pipeline contract from ADR-0029. The store helpers stay; what
 * changes is that decisions now flow through pipeline.transition() so
 * provenance + change_log + auto_revert_eligible are guaranteed on every
 * write.
 *
 * Tier 1 predicate: alias merges where the candidate name and the
 * librarian's similar match are IDENTICAL after normalization (lowercase,
 * strip punctuation, collapse whitespace) AND the candidate appears ≥ 10
 * times across guarded fields. This is intentionally narrow — it covers
 * formatting/case/punctuation variants ("Amgen Inc" vs "AMGEN INC."),
 * which are unambiguous typos. Anything with substantive character
 * differences ("Jim Jordan" vs "Jim Gordon") goes to Tier 2 (David
 * approves) because edit-distance alone is not a safe person-identity
 * test — the cost of a wrong auto-apply is attributing donations to the
 * wrong real person, which is defamation-shaped.
 *
 * Discovered by dry-run on 2026-04-28: a looser edit-distance-2 predicate
 * matched "Jim Jordan" → "Jim Gordon" (233×) and "Mark Kelly" → "Mark K
 * Lay" (215×). Predicate tightened before any auto-apply ran. This is the
 * exact failure mode Rule 16 (calibration safety net) is supposed to
 * catch — and it did, before deployment.
 *
 * Calibration coverage: Pfizer/ADM/AOC fixtures cover the corporate +
 * politician blast radius. If a Tier 1 alias merge silently breaks
 * Pfizer's top-N or ADM's top-N, the calibration harness fires within
 * the dispatcher cycle and the auto-revert hook moves the decision back
 * to candidate state for human review.
 *
 * This module SELF-REGISTERS at require-time. Importing it is the way
 * to plug the class into the pipeline.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/librarian-gap-decisions-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const ENTITIES_PATH = path.join(ROOT, 'data', 'entities.jsonl');

// ─── helpers (entities.jsonl writer) ──────────────────────────────

function loadEntities() {
  return fs
    .readFileSync(ENTITIES_PATH, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function persistEntities(entities) {
  const tmp = ENTITIES_PATH + '.tmp';
  const lines = entities.map((e) => JSON.stringify(e));
  fs.writeFileSync(tmp, lines.join('\n') + '\n', 'utf-8');
  fs.renameSync(tmp, ENTITIES_PATH);
}

// ─── pipeline registration ─────────────────────────────────────────

pipeline.register({
  name: 'librarian-gap-aliases',
  description:
    'Wikilinks the librarian cannot resolve to any entity, usually missing aliases. ' +
    'Tier 1 auto-applies high-confidence merges (single similar match within edit-distance 2, ' +
    'appearance count ≥ 10). Tier 2 batch-approves ambiguous candidates.',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-alias',
  terminal_states: ['resolved', 'rejected'],

  tier1_predicate: (rec) => {
    if (rec.state !== 'candidate') return false;
    if (!rec.similar || rec.similar.length !== 1) return false;
    if (rec.appearances < 10) return false;
    // Single-token names are too risky regardless of similarity.
    if (rec.name.length < 4 || rec.similar[0].name.length < 4) return false;
    // SAFETY: only auto-apply when names are identical after normalization
    // (lowercase + strip punctuation + collapse whitespace). This covers
    // formatting/case variants but blocks substantive character differences
    // like "Jim Jordan" vs "Jim Gordon" which would attribute donations to
    // the wrong person.
    const normalize = (s) =>
      (s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
    return normalize(rec.name) === normalize(rec.similar[0].name);
  },

  auto_apply_target: (rec) => rec.similar[0].name,

  calibration_coverage: [
    'Pfizer Inc.',
    'ADM - Archer Daniels Midland',
    'Alexandria Ocasio-Cortez',
    'Catherine Cortez Masto',
    'Mark Kelly',
  ],

  // Class-specific writer. Receives the record and the in-memory records
  // array; expected to write the side-effect (alias to entities.jsonl)
  // and either return true (success → pipeline marks resolved) or false
  // (skip → pipeline leaves in approve_state).
  apply_decision: async (rec, _store, records) => {
    const target = rec.approved_alias_target;
    if (!target) {
      console.warn(`  ⚠ ${rec.id}: missing approved_alias_target — leaving in approve state`);
      return false;
    }

    const entities = loadEntities();
    const targetEntity = entities.find(
      (e) => e.name && e.name.toLowerCase() === target.toLowerCase()
    );
    if (!targetEntity) {
      console.warn(`  ⚠ ${rec.id}: target entity "${target}" not in entities.jsonl`);
      return false;
    }

    if (!Array.isArray(targetEntity.aliases)) targetEntity.aliases = [];
    const aliasLower = rec.name.toLowerCase();
    const exists = targetEntity.aliases.some((a) => (a || '').toLowerCase() === aliasLower);

    if (!exists) {
      targetEntity.aliases.push(rec.name);
      persistEntities(entities);
    }
    // mark resolved on success regardless (idempotency on re-run)
    pipeline.transition('librarian-gap-aliases', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'david',
      note: exists ? 'alias already present in entities.jsonl' : 'alias appended to entities.jsonl',
    });
    return true;
  },

  // Blast-radius mapper for auto-revert. Given a calibration fixture that
  // failed (e.g. Pfizer top-N broke), return claude-auto decisions plausibly
  // implicated. Conservative: if the fixture profile name ever appeared as
  // an alias target in a recent decision, that decision is in scope.
  blast_radius: (fixtureRecord, recentDecisions) => {
    if (!fixtureRecord || !fixtureRecord.profile) return recentDecisions;
    const fixtureLower = fixtureRecord.profile.toLowerCase();
    return recentDecisions.filter((d) => {
      const target = (d.approved_alias_target || '').toLowerCase();
      // direct hit on target
      if (target === fixtureLower) return true;
      // also flag if the candidate NAME appeared in any of the fixture's
      // must_include — that means the alias merge could have changed who
      // owned the appearance.
      const must = (fixtureRecord.must_include || []).map((s) => s.toLowerCase());
      if (must.includes((d.name || '').toLowerCase())) return true;
      return false;
    });
  },
});

module.exports = { name: 'librarian-gap-aliases' };
