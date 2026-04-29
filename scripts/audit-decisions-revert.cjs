#!/usr/bin/env node
/**
 * audit-decisions-revert.cjs
 *
 * Thin CLI bridge that the ops `/audit-claude-decisions` API spawns to
 * invoke pipeline.revertDecision. Lives as a separate process so the
 * Next.js TS API doesn't have to bundle the CJS pipeline + classes
 * registration tree.
 *
 * Usage:
 *   node scripts/audit-decisions-revert.cjs --class <className> --id <recordId>
 *                                           [--decided-by david|claude-auto]
 *                                           [--reason <text>]
 *
 * Exit codes:
 *   0  — success (record reverted; side-effect undo if class supplied one)
 *   1  — error (record not found, side-effect undo failed, etc.)
 *
 * Output: single line of JSON for the API to parse.
 */

'use strict';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

const className = args['class'];
const id = args['id'];
const decidedBy = args['decided-by'] || 'david';
const reason = args['reason'] || 'manual-audit-revert';

if (!className || !id) {
  console.log(JSON.stringify({ ok: false, error: 'usage: --class <name> --id <id> [--decided-by <who>] [--reason <text>]' }));
  process.exit(1);
}

const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs'); // self-registers all classes

(async () => {
  try {
    const result = await pipeline.revertDecision(className, id, {
      decided_by: decidedBy,
      reason,
    });
    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    console.log(JSON.stringify({ ok: false, error: err.message, stack: err.stack }));
    process.exit(1);
  }
})();
