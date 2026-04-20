#!/usr/bin/env node
/**
 * reroute-affiliate-edges-to-parent.cjs
 *
 * After map-party-committee-affiliates.cjs added registry entries for
 * the DCCC/NRCC/NRSC sub-accounts, the EDGE STORE still has ~110
 * edges (~$1.17B) that were emitted with the bare affiliate committee
 * name as `to` (e.g. "NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE
 * CONTRIBUTIONS" instead of "NRCC - National Republican Congressional
 * Committee"). verify-committee-receipts now sums the parent entity's
 * receipts including transfers to all affiliate committees — but the
 * edge store still shows those transfers as going to the bare-name
 * entities, not the parent. Source went up, edge did not, gap widened.
 *
 * Fix: for each edge where `to` matches an affiliate name, deprecate
 * the original (audit trail) and emit a new edge with `to` = parent
 * entity name. Keeps all other fields identical.
 *
 * This closes the gap introduced by the registry mapping.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const DERIVED = path.join(ROOT, 'data', 'derived', 'fec-oth-transfers.jsonl');
const WRITE = process.argv.includes('--write');

const AFFILIATE_TO_PARENT = {
  'NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE CONTRIBUTIONS': 'NRCC - National Republican Congressional Committee',
  'NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE EXPENDITURES': 'NRCC - National Republican Congressional Committee',
  'DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE - CONTRIBUTIONS': 'DCCC - Democratic Congressional Campaign Committee',
  'NATIONAL REPUBLICAN SENATORIAL COMMITTEE - CONTRIBUTIONS *': 'NRSC - National Republican Senatorial Committee',
  'NATIONAL REPUBLICAN SENATORIAL COMMITTEE COMBO ACCOUNT-WILLIAM V. ROTH, JR.-OFFICE ACCOUNT': 'NRSC - National Republican Senatorial Committee',
};

const PARENT_TYPE = 'donor';
const now = new Date().toISOString();

const text = fs.readFileSync(DERIVED, 'utf-8');
const lines = text.split(/\r?\n/);
const out = [];
let rerouted = 0, reroutedSum = 0, selfLoopDropped = 0;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) { out.push(line); continue; }
  let rec;
  try { rec = JSON.parse(trimmed); } catch { out.push(line); continue; }
  if (
    rec.type === 'monetary' &&
    rec.status !== 'deprecated' &&
    AFFILIATE_TO_PARENT[rec.to]
  ) {
    const parent = AFFILIATE_TO_PARENT[rec.to];
    // If from is also an affiliate of the SAME parent, this is intra-
    // entity — just deprecate, don't re-emit.
    if (rec.from === parent || AFFILIATE_TO_PARENT[rec.from] === parent) {
      rec.status = 'deprecated';
      rec.deprecation_reason = 'intra-party-committee-after-remap';
      rec.deprecated_at = now;
      out.push(JSON.stringify(rec));
      selfLoopDropped++;
      continue;
    }
    // Else: deprecate original, emit new with to=parent.
    const originalAmount = rec.amount || 0;
    const originalId = rec.id;
    rec.status = 'deprecated';
    rec.deprecation_reason = 'retargeted-to-parent-entity';
    rec.superseded_by = null; // filled after we compute new id
    rec.deprecated_at = now;

    const newEdge = {
      ...rec,
      status: 'active',
      to: parent,
      to_type: PARENT_TYPE,
    };
    delete newEdge.deprecation_reason;
    delete newEdge.superseded_by;
    delete newEdge.deprecated_at;
    newEdge.id = computeEdgeId(newEdge);
    rec.superseded_by = newEdge.id;

    out.push(JSON.stringify(rec));
    out.push(JSON.stringify(newEdge));
    rerouted++;
    reroutedSum += originalAmount;
  } else {
    out.push(line);
  }
}

console.log(`[reroute-affiliate-edges-to-parent] ${WRITE ? 'WRITE' : 'dry-run'}`);
console.log(`  rerouted to parent:      ${rerouted}  ($${(reroutedSum / 1e6).toFixed(1)}M)`);
console.log(`  intra-entity dropped:    ${selfLoopDropped}`);

if (WRITE && (rerouted > 0 || selfLoopDropped > 0)) {
  fs.writeFileSync(DERIVED, out.join('\n'));
  console.log('  applied.');
} else if (!WRITE) {
  console.log('  rerun with --write to apply.');
}
