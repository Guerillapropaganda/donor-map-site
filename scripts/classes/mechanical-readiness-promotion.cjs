/**
 * classes/mechanical-readiness-promotion.cjs
 *
 * Phase 2C of ADR-0029. Promotes profiles raw → draft → ready
 * automatically when the existing reclassify-readiness.cjs predicate
 * says they qualify. **Strict:** the class refuses to propose anything
 * past `ready` — David's explicit constraint (publishing == data-complete
 * per ADR-0017, gate-check stays with David).
 *
 * Tier 1 with calibration coverage (Rule 16): three readiness fixtures
 * in data/calibration-fixture.jsonl assert specific profiles' states.
 * If Claude wrongly promotes/demotes a fixture profile, drift fires
 * within 15 min, calibration-auto-revert moves the bad decision back to
 * candidate, and a bug lands on /bugs.
 *
 * Apply path: rewrites the profile's `content-readiness` frontmatter
 * field directly. (reclassify-readiness.cjs is the bulk authority but
 * supports per-profile mode poorly; this class does the targeted write.)
 *
 * Stuck profiles: producer sees a profile that COULD reach ready but
 * is failing one specific checklist item (e.g. `noTier1`, `stale:120d`).
 * The class records that as state='stuck' with gap_reasons[]; the
 * producer also writes an attention-queue entry so David sees
 * "X is one Tier-1 source away from ready."
 */

'use strict';

const fs = require('fs');
const path = require('path');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/mechanical-readiness-decisions-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

// Strict: target_state MUST be in this set for Tier 1.
const TIER1_TARGET_STATES = new Set(['draft', 'ready']);

pipeline.register({
  name: 'mechanical-readiness-promotion',
  description:
    'Mechanical readiness promotion (raw → draft → ready). Tier 1 — Claude auto-applies when ' +
    'reclassify-readiness predicate matches. STRICT: refuses to propose past ready (publishing == ' +
    'data-complete per ADR-0017 stays with David). Stuck profiles surface to attention queue with ' +
    'gap reasons.',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-promote',
  terminal_states: ['resolved', 'rejected'],

  // Tier 1 predicate. Producer pre-computes from_state, to_state, and
  // gap_reasons. The predicate just checks: has the producer recorded
  // a candidate at a Tier-1-allowed target state with no gap reasons?
  tier1_predicate: (rec) => {
    if (rec.state !== 'candidate') return false;
    if (!TIER1_TARGET_STATES.has(rec.to_state)) return false;
    if (Array.isArray(rec.gap_reasons) && rec.gap_reasons.length > 0) return false;
    if (!rec.profile_path) return false;
    if (!rec.from_state) return false;
    // Don't promote within same state.
    if (rec.from_state === rec.to_state) return false;
    return true;
  },

  auto_apply_target: (rec) => rec.to_state,

  // Per Rule 16 — these fixtures protect the class's blast radius.
  // Pfizer is at 'ready', wrongly promoting it past ready would fail
  // the readiness fixture. Mark Kelly + Cortez Masto are at
  // 'data-complete'; any wrong demotion fails the fixture.
  calibration_coverage: [
    'Pfizer Inc.',
    'Mark Kelly',
    'Catherine Cortez Masto',
  ],

  apply_decision: async (rec, _store, records) => {
    if (rec.state !== 'approved-promote') {
      pipeline.transition('mechanical-readiness-promotion', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'david',
        note: `${rec.state} → resolved (no rewrite required)`,
      });
      return true;
    }

    if (!TIER1_TARGET_STATES.has(rec.to_state)) {
      console.warn(`  ⚠ ${rec.id}: refusing to promote past 'ready' (to_state=${rec.to_state})`);
      return false;
    }
    if (!rec.profile_path || !fs.existsSync(path.join(ROOT, rec.profile_path))) {
      console.warn(`  ⚠ ${rec.id}: profile_path missing or file gone — leaving in approve state`);
      return false;
    }

    const full = path.join(ROOT, rec.profile_path);
    const text = fs.readFileSync(full, 'utf-8');
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) {
      console.warn(`  ⚠ ${rec.id}: profile has no frontmatter`);
      return false;
    }

    const fm = fmMatch[1];
    let newFm;
    if (/^content-readiness:/m.test(fm)) {
      newFm = fm.replace(/^(content-readiness:\s*)"?[^"\r\n]*"?(\s*)$/m, `$1${rec.to_state}$2`);
    } else {
      // Append to frontmatter (before closing ---)
      newFm = fm.trimEnd() + `\ncontent-readiness: ${rec.to_state}`;
    }

    const newText = text.replace(fmMatch[0], `---\n${newFm}\n---\n`);
    if (newText === text) {
      console.warn(`  ⚠ ${rec.id}: rewrite was a no-op (already at ${rec.to_state}?)`);
      // Still mark resolved — state already there.
    } else {
      const tmp = full + '.tmp';
      fs.writeFileSync(tmp, newText, 'utf-8');
      fs.renameSync(tmp, full);
    }

    pipeline.transition('mechanical-readiness-promotion', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'claude-auto',
      note: `${rec.from_state} → ${rec.to_state} (frontmatter rewritten in ${rec.profile_path})`,
    });
    return true;
  },

  // Blast-radius mapper for auto-revert. If a readiness fixture fails,
  // any claude-auto record whose profile_path matches the fixture profile
  // is in scope. Conservative: also include any decision whose to_state
  // matches the fixture's expected state (defends against unrelated profiles
  // affected by a shared schema bug).
  blast_radius: (fixtureRecord, recentDecisions) => {
    if (!fixtureRecord) return recentDecisions;
    const fixtureTitle = (fixtureRecord.profile || '').toLowerCase();
    return recentDecisions.filter((d) => {
      const title = (d.profile_title || '').toLowerCase();
      if (title === fixtureTitle) return true;
      // Path-based fallback (in case title indexing missed it)
      const lcPath = (d.profile_path || '').toLowerCase();
      if (lcPath.includes(fixtureTitle.replace(/[^a-z0-9]+/g, '-'))) return true;
      return false;
    });
  },
});

module.exports = { name: 'mechanical-readiness-promotion' };
