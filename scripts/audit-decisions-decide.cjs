#!/usr/bin/env node
/**
 * audit-decisions-decide.cjs
 *
 * Generic CLI bridge that the ops `/audit-claude-decisions` POST API
 * spawns to invoke pipeline.transition + applyApproved on a single
 * record across ANY registered class. Sibling to audit-decisions-revert.cjs
 * (which only handles revert) — this one handles the forward path
 * (approve / reject).
 *
 * Built for Phase 2D of ADR-0029: lets David batch-approve `ready →
 * data-complete` candidates from the audit page. Class-agnostic by
 * design, so the same endpoint can later approve duplicate-entity-merges,
 * pathless-stub-aliases, and frontmatter-orphan-prunes records too.
 *
 * Decided_by: claude-batch-approved (per ADR-0029 — the audit page
 * enforces admin auth before invoking, and a "David clicks approve on
 * Claude's proposal" is the canonical claude-batch-approved shape).
 *
 * Usage:
 *   node scripts/audit-decisions-decide.cjs --class <className> --id <recordId>
 *                                           --action approve|reject
 *                                           [--reason <text>]
 *
 * On approve: transitions to the class's approve_state with provenance,
 * then runs pipeline.applyApproved(className) so the side-effect (e.g.
 * frontmatter rewrite) lands in the same call.
 *
 * On reject: transitions to 'rejected' with provenance + optional reason
 * payload. No side-effect.
 *
 * Output: single line of JSON. Exit 0 on success, 1 on error.
 */

'use strict';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

const className = args['class'];
const id = args.id;
const action = args.action;
const reason = args.reason || null;

if (!className || !id || !action) {
  console.log(JSON.stringify({ ok: false, error: 'usage: --class <name> --id <id> --action approve|reject [--reason <text>]' }));
  process.exit(1);
}

const VALID_ACTIONS = new Set(['approve', 'reject']);
if (!VALID_ACTIONS.has(action)) {
  console.log(JSON.stringify({ ok: false, error: `invalid action "${action}" — must be approve|reject` }));
  process.exit(1);
}

const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs');

let cls;
try { cls = pipeline.getClass(className); }
catch (err) {
  console.log(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
}

const records = cls.store.loadAll();
const rec = records.find((r) => r.id === id);
if (!rec) {
  console.log(JSON.stringify({ ok: false, error: `record ${id} not found in ${className}` }));
  process.exit(1);
}

// Refuse to approve a record that isn't currently a candidate (or stuck —
// some classes use 'stuck' to mean "checklist failed but record exists").
// David shouldn't be able to re-approve an already-approved record (would
// double-apply); revert first, then re-approve.
if (action === 'approve' && rec.state !== 'candidate' && rec.state !== 'stuck') {
  console.log(JSON.stringify({
    ok: false,
    error: `cannot approve record in state "${rec.state}" — must be 'candidate' or 'stuck'. Revert first if you want to re-approve.`,
  }));
  process.exit(1);
}
// Same shape for reject — we don't re-reject already-resolved records.
if (action === 'reject' && (rec.state === 'resolved' || rec.state === 'rejected')) {
  console.log(JSON.stringify({
    ok: false,
    error: `cannot reject record in state "${rec.state}" — already terminal`,
  }));
  process.exit(1);
}

(async () => {
  try {
    if (action === 'reject') {
      // Refuse to set 'rejected' if the class doesn't have it as a valid state.
      if (!cls.valid_states.has('rejected')) {
        console.log(JSON.stringify({
          ok: false,
          error: `class ${className} does not have 'rejected' in valid_states`,
        }));
        process.exit(1);
      }
      pipeline.transition(className, records, id, 'rejected', {
        decided_by: 'claude-batch-approved',  // human-confirmed reject still counts as batch-approved provenance
        note: reason ? `rejected via /audit-claude-decisions: ${reason}` : 'rejected via /audit-claude-decisions',
        payload: reason ? { rejected_reason: reason } : undefined,
      });
      cls.store.persistAll(records);
      console.log(JSON.stringify({
        ok: true,
        action,
        class: className,
        id,
        final_state: 'rejected',
      }));
      process.exit(0);
    }

    // approve path
    pipeline.transition(className, records, id, cls.approve_state, {
      decided_by: 'claude-batch-approved',
      note: `approved via /audit-claude-decisions${reason ? `: ${reason}` : ''}`,
    });
    cls.store.persistAll(records);

    const applyResult = await pipeline.applyApproved(className);
    const finalRec = cls.store.loadAll().find((r) => r.id === id) || rec;

    console.log(JSON.stringify({
      ok: true,
      action,
      class: className,
      id,
      final_state: finalRec.state,
      apply_result: applyResult,
    }));
    process.exit(0);
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err.message, stack: err.stack }));
    process.exit(1);
  }
})();
