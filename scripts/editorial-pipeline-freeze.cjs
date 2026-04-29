#!/usr/bin/env node
/**
 * editorial-pipeline-freeze.cjs
 *
 * ADR-0029 Phase 2: manual freeze controls for the editorial-decision
 * pipeline. The volume check sets the freeze automatically on hard
 * alarm; this script lets a human (David) inspect, set, or clear it.
 *
 * USAGE:
 *   --status                  Print current freeze state + history
 *   --clear --reason "<note>" Lift the freeze (records who/when in history)
 *   --set --reason "<note>"   Manually freeze (rarely needed; auto-freeze
 *                             from volume hard limit is the usual path)
 *
 * When the pipeline is frozen, every pipeline.runTier1() call returns
 * { skipped: 'pipeline-frozen', ... } without applying decisions. This
 * means new Tier 1 candidates accumulate but nothing auto-applies. The
 * propose --tier1 + --apply-decisions + --apply-approved flow still
 * works for manually-decided records.
 */

'use strict';

const path = require('path');
const pipeline = require(path.join(__dirname, 'lib', 'editorial-decision-pipeline.cjs'));

const args = process.argv.slice(2);
const mode =
  args.includes('--clear')  ? 'clear'  :
  args.includes('--set')    ? 'set'    :
  args.includes('--status') ? 'status' :
  'status';

function getReason() {
  const idx = args.indexOf('--reason');
  if (idx === -1) return null;
  return args[idx + 1];
}

if (mode === 'status') {
  const s = pipeline.readFreezeState();
  console.log(`pipeline frozen: ${s.frozen ? 'YES' : 'NO'}`);
  if (s.frozen) {
    console.log(`  frozen_at: ${s.frozen_at}`);
    console.log(`  frozen_by: ${s.frozen_by}`);
    console.log(`  reason: ${s.reason}`);
  }
  if (Array.isArray(s.history) && s.history.length > 0) {
    console.log('');
    console.log(`history (last ${Math.min(s.history.length, 10)}):`);
    for (const h of s.history.slice(-10)) {
      console.log(`  ${h.at}  ${h.event}  by=${h.by}  ${h.reason || h.note || ''}`);
    }
  }
  process.exit(0);
}

if (mode === 'set') {
  const reason = getReason() || '(no reason given)';
  pipeline.setFreeze(reason, 'david');
  console.log(`pipeline frozen. reason: ${reason}`);
  process.exit(0);
}

if (mode === 'clear') {
  const reason = getReason() || '(no reason given)';
  const cur = pipeline.readFreezeState();
  if (!cur.frozen) {
    console.log('pipeline already unfrozen.');
    process.exit(0);
  }
  pipeline.clearFreeze('david', reason);
  console.log(`pipeline unfrozen. note: ${reason}`);
  process.exit(0);
}
