/**
 * classes/data-complete-promotion.cjs
 *
 * Phase 2D of ADR-0029. Surfaces profiles at `content-readiness: ready`
 * that PASS all ADR-0017 data-complete gates so David can batch-approve
 * the publishing transition (`ready → data-complete`) on
 * `/audit-claude-decisions`.
 *
 * **Tier 2 ONLY — no auto-apply.** Per David's standing rule (carried
 * over from Phase 2C / ADR-0017): publishing == data-complete, and
 * publishing stands with him. Claude is allowed to propose; David is
 * the gate. There is intentionally no `tier1_predicate` on this class
 * — the editorial-decision-pipeline library would reject Tier 1
 * registration without fixture coverage anyway, but the deeper reason
 * is constitutional: the data-complete tier is the moment a profile
 * becomes publicly visible (Rule 10 + ADR-0017), and that exposure
 * decision is Tier 3 by definition.
 *
 * Why a fixture isn't strictly required here:
 *   The `editorial-decision-pipeline` library only enforces fixture
 *   coverage on classes that register a `tier1_predicate`. This class
 *   has none, so registration succeeds without a calibration_coverage[]
 *   entry. The existing Pfizer fixture
 *   ({ profile: 'Pfizer Inc.', bucket: 'readiness', expected: 'ready' })
 *   already covers the class's most important failure mode: if a
 *   David-approved batch ever wrongly flips Pfizer to data-complete,
 *   calibration drift fires within 15 min and a bug lands on /bugs.
 *   The drift won't auto-revert (decided_by != 'claude-auto') but it
 *   will surface for human review — exactly the right shape for
 *   editorial decisions.
 *
 * Apply path: rewrites the profile's `content-readiness: ready` →
 * `content-readiness: data-complete` in frontmatter. Refuses to apply
 * if the from-state isn't `ready` (defends against state drift between
 * candidate creation and David's approval).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const pipeline = require('../lib/editorial-decision-pipeline.cjs');
const store = require('../lib/data-complete-decisions-store.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

pipeline.register({
  name: 'data-complete-promotion',
  description:
    'Tier 2 batch-approval queue for `ready → data-complete` (publishing). ' +
    'Producer evaluates ADR-0017 gates: typeReqs, ≥1 Tier 1 source, connections, ' +
    '≤90d freshness, no blocking flags. Passing profiles surface as candidates; ' +
    'failing-by-one-gate profiles surface as stuck. David approves on ' +
    '/audit-claude-decisions. STRICT: no Tier 1 path — publishing decisions are ' +
    'David-only per ADR-0017 + Rule 10.',

  store,
  valid_states: store.VALID_STATES,
  approve_state: 'approved-publish',
  terminal_states: ['resolved', 'rejected'],

  // Intentionally no tier1_predicate / auto_apply_target / calibration_coverage.
  // See file header for the constitutional reason.

  apply_decision: async (rec, _store, records) => {
    if (rec.state !== 'approved-publish') {
      pipeline.transition('data-complete-promotion', records, rec.id, 'resolved', {
        decided_by: rec.decided_by || 'david',
        note: `${rec.state} → resolved (no rewrite required)`,
      });
      return true;
    }

    if (rec.from_state !== 'ready') {
      console.warn(
        `  ⚠ ${rec.id}: refusing to apply — from_state=${rec.from_state} (expected 'ready'). ` +
        `Profile may have been edited since candidate creation.`
      );
      return false;
    }
    if (rec.to_state !== 'data-complete') {
      console.warn(`  ⚠ ${rec.id}: refusing to apply — to_state=${rec.to_state} (expected 'data-complete')`);
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

    // Defend against drift: re-read the actual current readiness from
    // frontmatter (not the rec.from_state which was captured at producer
    // run time). If the profile is no longer at 'ready', refuse.
    const curM = fm.match(/^content-readiness:\s*"?([^"\r\n]*?)"?\s*$/m);
    const curReadiness = curM ? curM[1].trim() : null;
    if (curReadiness !== 'ready') {
      console.warn(
        `  ⚠ ${rec.id}: refusing to apply — profile is currently at ` +
        `'${curReadiness || '(unset)'}', not 'ready'. State drifted since approval.`
      );
      return false;
    }

    let newFm;
    if (/^content-readiness:/m.test(fm)) {
      newFm = fm.replace(/^(content-readiness:\s*)"?[^"\r\n]*"?(\s*)$/m, `$1data-complete$2`);
    } else {
      newFm = fm.trimEnd() + `\ncontent-readiness: data-complete`;
    }

    const newText = text.replace(fmMatch[0], `---\n${newFm}\n---\n`);
    if (newText !== text) {
      const tmp = full + '.tmp';
      fs.writeFileSync(tmp, newText, 'utf-8');
      fs.renameSync(tmp, full);
    }

    pipeline.transition('data-complete-promotion', records, rec.id, 'resolved', {
      decided_by: rec.decided_by || 'david',
      note: `ready → data-complete (frontmatter rewritten in ${rec.profile_path})`,
    });
    return true;
  },

  // Manual revert via /audit-claude-decisions. Strips data-complete back
  // to ready in frontmatter so the profile drops out of public exposure.
  // Side-effect undo is symmetric with apply_decision.
  revert_decision: async (rec) => {
    if (!rec.profile_path) return { skipped: 'no profile_path' };
    const full = path.join(ROOT, rec.profile_path);
    if (!fs.existsSync(full)) return { skipped: 'profile file gone' };

    const text = fs.readFileSync(full, 'utf-8');
    const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!fmMatch) return { skipped: 'no frontmatter' };

    const fm = fmMatch[1];
    const curM = fm.match(/^content-readiness:\s*"?([^"\r\n]*?)"?\s*$/m);
    const curReadiness = curM ? curM[1].trim() : null;
    // Only undo if the current state is exactly what we set. If the
    // frontmatter has moved on (e.g. promoted to verified), don't touch.
    if (curReadiness !== 'data-complete') {
      return { skipped: `current readiness='${curReadiness}', not 'data-complete' — no revert performed` };
    }

    const newFm = fm.replace(/^(content-readiness:\s*)"?[^"\r\n]*"?(\s*)$/m, `$1ready$2`);
    const newText = text.replace(fmMatch[0], `---\n${newFm}\n---\n`);
    const tmp = full + '.tmp';
    fs.writeFileSync(tmp, newText, 'utf-8');
    fs.renameSync(tmp, full);
    return { ok: true, reverted_field: 'content-readiness', from: 'data-complete', to: 'ready' };
  },
});

module.exports = { name: 'data-complete-promotion' };
