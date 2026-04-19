#!/usr/bin/env node
/**
 * supersede-ie-only-null-role.cjs
 *
 * Targeted cleanup. A handful of committees in the edge store are pure
 * independent-expenditure super PACs — C7-prefix committees that
 * legally cannot make direct contributions to candidates. Every dollar
 * they move is ie-support or ie-oppose by construction.
 *
 * The original `ingest-fec-bulk.cjs` aggregated PAS2 transactions by
 * (donor, candidate, cycle) without splitting by transaction type, so
 * their edges landed with role=null. Users then see Fairshake PAC's
 * $312M "donation" to Kamala Harris in a donor list, which is wrong —
 * it's IE spending whose direction we can't determine from the bulk
 * aggregate alone. Today's ingest fix splits going forward, but it
 * hasn't been re-run.
 *
 * Safest cleanup: mark these null-role edges as status='superseded'
 * with a note. They're hidden from queries (default filter is
 * status='active') but preserved for audit/rollback. When a proper
 * reclassification pass runs from pas2-ie-support/oppose derived
 * files, it can produce correctly-roled replacement edges.
 *
 * Scope: ONLY committees on the hand-curated IE_ONLY_SUPER_PACS list.
 * Do NOT touch industry PACs (NAR, SEIU COPE, NRA) — those are
 * traditional PACs where null-role means genuine direct contribution.
 *
 * Usage:
 *   node scripts/supersede-ie-only-null-role.cjs         # dry-run
 *   node scripts/supersede-ie-only-null-role.cjs --write # apply
 */

const fs = require('fs');
const path = require('path');
const { loadEdges, upsertEdges } = require('./lib/relationships-store.cjs');

const WRITE = process.argv.includes('--write');

// Only pure C7 IE-spending super PACs. A PAC makes this list if it is
// legally constituted as a C7 committee that can ONLY spend independently
// for/against candidates and cannot contribute directly. Do NOT add
// hybrid/traditional PACs (NAR, NRA, SEIU COPE) — their null-role
// edges are genuine direct donations.
const IE_ONLY_SUPER_PACS = new Set([
  'Fairshake PAC',
  'Protect Progress',
  'American Dream Federal Action',
  'Clearpath Action Fund, Inc.',
  'Clearpath Action Fund',
  // Crypto-industry IE PACs
  'Defend American Jobs',
  // Already-mapped big R IE spenders with stray null-role edges
  'SLF PAC',
  'Senate Leadership Fund',
  'One Nation',
  'Congressional Leadership Fund',
  'American Crossroads',
  'MAGA Inc',
  'Make America Great Again Inc',
  'Priorities USA Action',
  'Future Forward USA Action',
  'FF PAC',
  'House Majority PAC',
  'Senate Majority PAC',
  'Emily\u2019s List',
  "Emily's List",
  "EMILYs List",
  'Restoration PAC',
  'The Sentinel Action Fund',
  'Sentinel Action Fund',
  'Preserve America',
  'America PAC - Elon Musk',
]);

(function main() {
  console.log(`[supersede-ie-only-null-role] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);
  const edges = loadEdges();
  const updates = [];
  let byCommittee = new Map();

  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    if (e.role !== null && e.role !== undefined) continue;
    if (!e.amount || e.amount <= 0) continue;
    if (!e.source || !e.source.startsWith('fec-')) continue;
    if (!IE_ONLY_SUPER_PACS.has(e.from)) continue;
    if (e.status === 'superseded') continue;

    const agg = byCommittee.get(e.from) || { count: 0, amount: 0 };
    agg.count++;
    agg.amount += e.amount;
    byCommittee.set(e.from, agg);

    updates.push({
      ...e,
      status: 'deprecated',
      evidence: [
        ...(Array.isArray(e.evidence) ? e.evidence : []),
        'superseded: null-role aggregate from fec-bulk; from is a C7 IE-only super PAC, ' +
        'role split into ie-support/ie-oppose requires FEC 24A/24E codes not preserved in this edge',
      ],
      last_verified: new Date().toISOString(),
    });
  }

  console.log('Super PAC null-role edges to supersede:');
  [...byCommittee.entries()].sort((a, b) => b[1].amount - a[1].amount).forEach(([name, agg]) => {
    console.log(`  $${(agg.amount / 1e6).toFixed(1).padStart(7)}M  ${agg.count} edges  ${name}`);
  });
  console.log(`\nTotal: ${updates.length} edges across ${byCommittee.size} committees`);

  if (!WRITE) {
    console.log('\n[dry-run] no writes. Use --write to apply.');
    return;
  }

  console.log('\nApplying...');
  const result = upsertEdges(updates);
  console.log(`  updated: ${result.updated}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  invalid: ${result.invalid}`);
  if (result.errors?.length) {
    result.errors.slice(0, 5).forEach((err) => console.log('  ', err));
  }
})();
