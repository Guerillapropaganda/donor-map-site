#!/usr/bin/env node
/**
 * librarian-gap-decisions-check.cjs
 *
 * Harness check. Reads the canonical librarian-gap-decisions store and
 * reports how many records are in state=candidate — actionable for the
 * editor.
 *
 * Pairs with scripts/librarian-gap-propose.cjs (the writer-side pipeline).
 * Refresh candidates by running:
 *   node scripts/librarian-gap-propose.cjs --report
 *
 * --json: machine-readable for vault-audit.
 */

'use strict';

const store = require('./lib/librarian-gap-decisions-store.cjs');

const args = process.argv.slice(2);
const asJson = args.includes('--json');

const records = store.loadAll();
const byState = {};
for (const r of records) byState[r.state] = (byState[r.state] || 0) + 1;
const candidates = records.filter((r) => r.state === 'candidate');

if (asJson) {
  const top = [...candidates]
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 10)
    .map((r) => ({ name: r.name, gap_class: r.gap_class, appearances: r.appearances }));
  console.log(JSON.stringify({
    findings_count: candidates.length,
    by_state: byState,
    top,
  }));
  process.exit(0);
}

console.log(`Librarian gap decisions: ${records.length} record(s)`);
for (const [s, n] of Object.entries(byState).sort()) {
  console.log(`  ${s}: ${n}`);
}
console.log('');
if (candidates.length === 0) {
  console.log('✓ no open candidates');
} else {
  console.log(`${candidates.length} candidate(s) need editorial review.`);
  console.log('Run: node scripts/librarian-gap-propose.cjs --review-list');
}
