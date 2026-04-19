#!/usr/bin/env node
/**
 * scrub-bad-committee-links.cjs
 *
 * Cleanup pass: for every non-politician entity's signals.fec_committee_ids,
 * remove any candidate-authorized committee IDs (designation P/A). These
 * were incorrectly linked when auto-link-committee-affiliates.cjs
 * fuzzy-matched candidate committees to their conduit (ActBlue/WinRed)
 * via the connected_org field.
 *
 * Safe to re-run.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities, updateEntity } = require('./lib/entities-store.cjs');

const WRITE = process.argv.includes('--write');

(async function main() {
  console.log(`[scrub-bad-committee-links] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Build set of cmte_ids with designation P or A (candidate authorized)
  const candidateCmteIds = new Set();
  const rl = readline.createInterface({ input: fs.createReadStream('C:/donor-map-data/fec/committee-master.jsonl') });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.id && (r.designation === 'P' || r.designation === 'A')) {
        candidateCmteIds.add(r.id);
      }
    } catch {}
  }
  console.log(`  candidate-authorized committee IDs: ${candidateCmteIds.size}`);

  // Walk entities, scrub candidate IDs from fec_committee_ids on non-politicians
  const ents = loadEntities();
  let scrubbed = 0;
  let entitiesAffected = 0;
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    if (!e.signals?.fec_committee_ids) continue;
    const before = e.signals.fec_committee_ids;
    const after = before.filter((cid) => !candidateCmteIds.has(cid));
    if (after.length === before.length) continue;
    const removed = before.length - after.length;
    scrubbed += removed;
    entitiesAffected++;
    console.log(`  ${e.name}: removing ${removed} candidate IDs`);
    if (WRITE) {
      const newSignals = { fec_committee_ids: after };
      // Also clear fec_committee_id (singular) if it was pointing to a candidate ID
      if (e.signals.fec_committee_id && candidateCmteIds.has(e.signals.fec_committee_id)) {
        newSignals.fec_committee_id = null;
      }
      updateEntity(e.id, { signals: newSignals });
    }
  }

  console.log(`\n  entities affected: ${entitiesAffected}`);
  console.log(`  total candidate IDs scrubbed: ${scrubbed}`);
  if (!WRITE) console.log(`\n[dry-run] no writes. Use --write to apply.`);
})();
