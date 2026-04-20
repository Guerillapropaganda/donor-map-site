#!/usr/bin/env node
/**
 * create-committee-stubs-for-backfill.cjs
 *
 * Follow-up to politician-historical-coverage-backfill.cjs.
 *
 * That script added 111 principal committees to the registry mapping
 * to politician profile_paths. But the FEC ingest aggregator
 * (aggregate-indiv-to-edges.cjs) deliberately SKIPS committee-id
 * resolution when the vault_profile points to a politician — correct
 * behavior (politicians' signals.fec_committee_ids can contain NRSC /
 * DSCC etc. that coordinated-spent for them, and routing individual
 * donations there would mis-attribute).
 *
 * The intended architecture (per sync-campaign-committees.cjs) is:
 * each politician's campaign committees are SEPARATE donor-type
 * entities, linked back to the politician via affiliation. Edges
 * flow to the committee entity; queries pool committees per politician.
 *
 * This script:
 *   - Removes the invalid cmte_id "0" from the registry (a candidate
 *     record had principal_cmte_id=0, my backfill captured it).
 *   - For each of my 111 backfilled committees that doesn't already
 *     have a stub entity, creates one: entity_type='donor', with
 *     fec_committee_id set. Uses the FEC name as the entity name.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');
const { newRecord } = require('./lib/entities-schema.cjs');

const ROOT = path.resolve(__dirname, '..');
const REG_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const WRITE = process.argv.includes('--write');

const reg = JSON.parse(fs.readFileSync(REG_FILE, 'utf-8'));
const ents = loadEntities();

// Reverse map: which committees already have a stub entity?
const entsByCmte = new Map();
for (const e of ents) {
  if (e.entity_type === 'politician') continue;
  const ids = [e.signals?.fec_committee_id, ...(e.signals?.fec_committee_ids || [])].filter(Boolean);
  for (const cid of ids) entsByCmte.set(cid, e);
}

// Identify registry entries that need stubs — those from today's
// politician-historical-coverage-backfill that have no stub entity
// AND a valid committee ID shape.
const targetsForStub = [];
let badCidRemoved = 0;
const validCid = /^C\d{8}$/;
for (const [cid, r] of Object.entries(reg)) {
  if (!validCid.test(cid)) {
    if (cid === '0') {
      // specific cleanup from a bad candidate-master record
      badCidRemoved++;
      if (WRITE) delete reg[cid];
    }
    continue;
  }
  // Originally scoped to my today's backfill only; broadened to cover
  // ANY politician-mapped committee without a stub entity — there are
  // 99 of these vault-wide (most from earlier sync-campaign-committees
  // runs that hit matching errors or predate the stub-creation path).
  const pointsToPolitician = r.vault_profile && /\bPoliticians\b/.test(r.vault_profile);
  if (!pointsToPolitician) continue;
  if (entsByCmte.has(cid)) continue; // already has stub
  targetsForStub.push({ cid, fec_name: r.fec_name, politician_path: r.vault_profile });
}

console.log(`[create-committee-stubs-for-backfill] ${WRITE ? 'WRITE' : 'dry-run'}`);
console.log(`  invalid-cid entries removed:         ${badCidRemoved}`);
console.log(`  committees needing stub creation:    ${targetsForStub.length}`);

if (WRITE && badCidRemoved > 0) {
  fs.writeFileSync(REG_FILE, JSON.stringify(reg, null, 2));
}

if (targetsForStub.length === 0) {
  if (!WRITE) console.log('  nothing to do.');
  process.exit(0);
}

// Find highest existing numeric id to continue the sequence
let maxId = 0;
for (const e of ents) {
  if (typeof e.id === 'string' && /^ent_\d+$/.test(e.id)) {
    const n = parseInt(e.id.slice(4), 10);
    if (n > maxId) maxId = n;
  }
}

// Build stub entities. Name them using the FEC committee name so they
// stay searchable as the actual committee (e.g. "SANDERS FOR PRESIDENT").
// Link back to the politician via signals.controlled_by (name + path).
const newStubs = [];
for (const t of targetsForStub) {
  // politician name = basename of their profile_path
  let polName = null;
  for (const e of ents) {
    if (e.profile_path === t.politician_path && e.entity_type === 'politician') {
      polName = e.name;
      break;
    }
  }
  const name = t.fec_name ? t.fec_name : `FEC committee ${t.cid}`;
  maxId++;
  const rec = newRecord({
    name,
    profile_path: null,
    entity_type: 'donor',
    signals: {
      naics: null,
      sector: 'Political Committee',
      party_breakdown: null,
      top_politicians_funded: [],
      total_political_spend: null,
      body_snippet: `Campaign committee auto-stubbed by politician-historical-coverage-backfill. FEC committee ID ${t.cid}. Controlled by ${polName || 'unknown'}.`,
      fec_committee_id: t.cid,
      controlled_by: polName ? [polName] : [],
      controlled_by_path: t.politician_path || null,
      entity_type_fm: 'campaign-committee',
      content_readiness: 'raw',
      source_tier: 1,
      auto_registered_by: 'create-committee-stubs-for-backfill',
      signals_gathered_at: new Date().toISOString(),
    },
  });
  rec.id = `ent_${String(maxId).padStart(5, '0')}`;
  newStubs.push(rec);
}

console.log(`  stubs to append:                     ${newStubs.length}`);
console.log(`  sample 5:`);
for (const s of newStubs.slice(0, 5)) {
  console.log(`    ${s.id}  ${s.name}  (cmte=${s.signals.fec_committee_id}, controlled_by=${s.signals.controlled_by[0] || '?'})`);
}

if (!WRITE) {
  console.log(`\n  rerun with --write to apply.`);
  process.exit(0);
}

const existing = fs.readFileSync(ENT_FILE, 'utf-8').replace(/\n+$/, '');
const appended = newStubs.map((r) => JSON.stringify(r)).join('\n');
fs.writeFileSync(ENT_FILE, existing + '\n' + appended + '\n');
console.log(`\n  wrote ${newStubs.length} committee stubs to entities.jsonl`);
