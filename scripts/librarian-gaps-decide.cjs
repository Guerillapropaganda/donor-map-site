#!/usr/bin/env node
/**
 * librarian-gaps-decide.cjs
 *
 * CLI bridge that the /api/librarian-gaps PATCH route spawns to
 * transition a single librarian-gap-aliases record through the
 * editorial-decision-pipeline. Lives as a separate process so the
 * Next.js TS API doesn't bundle the pipeline + classes registration tree.
 *
 * Usage:
 *   node scripts/librarian-gaps-decide.cjs --id <gap_xxx> --action approve --target "<canonical name>"
 *   node scripts/librarian-gaps-decide.cjs --id <gap_xxx> --action reject [--reason "<text>"]
 *   node scripts/librarian-gaps-decide.cjs --id <gap_xxx> --action needs-research
 *   node scripts/librarian-gaps-decide.cjs --id <gap_xxx> --action candidate   (undo)
 *
 * Decided_by: claude-batch-approved (per ADR-0029 — Tier 2 batch
 * approval is the David workflow; the API endpoint enforces admin auth
 * before invoking).
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

const id = args.id;
const action = args.action;
const target = args.target || null;
const reason = args.reason || null;

if (!id || !action) {
  console.log(JSON.stringify({ ok: false, error: 'usage: --id <id> --action <approve|reject|needs-research|candidate> [--target <name>] [--reason <text>]' }));
  process.exit(1);
}

const VALID_ACTIONS = new Set(['approve', 'reject', 'needs-research', 'candidate']);
if (!VALID_ACTIONS.has(action)) {
  console.log(JSON.stringify({ ok: false, error: `invalid action "${action}"` }));
  process.exit(1);
}
if (action === 'approve' && !target) {
  console.log(JSON.stringify({ ok: false, error: 'approve requires --target' }));
  process.exit(1);
}

const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs'); // self-registers all classes

const cls = pipeline.getClass('librarian-gap-aliases');
const records = cls.store.loadAll();
const rec = records.find((r) => r.id === id);
if (!rec) {
  console.log(JSON.stringify({ ok: false, error: `record ${id} not found in librarian-gap-aliases` }));
  process.exit(1);
}

// Map action → state + payload
const stateForAction = {
  approve: 'approved-alias',
  reject: 'rejected',
  'needs-research': 'needs-research',
  candidate: 'candidate',
};
const newState = stateForAction[action];

try {
  const transitionOpts = {
    decided_by: 'claude-batch-approved',
    note: action === 'approve'
      ? `David approved alias merge → "${target}"`
      : action === 'reject'
        ? (reason ? `rejected: ${reason}` : 'rejected via /librarian-gaps')
        : action === 'needs-research'
          ? 'marked needs-research via /librarian-gaps'
          : 'reset to candidate via /librarian-gaps',
  };
  if (action === 'approve') {
    transitionOpts.payload = { approved_alias_target: target };
  } else if (action === 'reject' && reason) {
    transitionOpts.payload = { rejected_reason: reason };
  } else if (action === 'candidate') {
    // Undoing — clear any prior decision payload so the record is fresh.
    transitionOpts.payload = { approved_alias_target: null, rejected_reason: null };
  }

  pipeline.transition('librarian-gap-aliases', records, id, newState, transitionOpts);
  cls.store.persistAll(records);

  // For approve action, immediately attempt to apply the decision so the
  // alias lands in entities.jsonl. The class's apply_decision moves
  // the record state from approved-alias to resolved on success. (Or
  // leaves it in approved-alias with a warning if the target entity
  // doesn't exist — fail-soft.)
  let applyResult = null;
  if (action === 'approve') {
    (async () => {
      try {
        applyResult = await pipeline.applyApproved('librarian-gap-aliases');
      } catch (err) {
        applyResult = { error: err.message };
      }
      const finalRec = cls.store.loadAll().find((r) => r.id === id) || rec;
      console.log(JSON.stringify({ ok: true, action, id, final_state: finalRec.state, apply_result: applyResult }));
      process.exit(0);
    })();
  } else {
    console.log(JSON.stringify({ ok: true, action, id, final_state: newState }));
    process.exit(0);
  }
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: err.message, stack: err.stack }));
  process.exit(1);
}
