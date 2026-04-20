#!/usr/bin/env node
/**
 * map-party-committee-affiliates.cjs
 *
 * The congressional party committees (DCCC, NRCC, NRSC, DSCC) each
 * operate multiple FEC committees for accounting reasons:
 *   - Main committee       (the "contribution limit" account)
 *   - CONTRIBUTIONS account (party-transfers-to-candidates bucket)
 *   - EXPENDITURES account  (independent-expenditure bucket)
 *
 * These are all the same organization. Transfers between them are
 * intra-entity shuffles, not external receipts. verify-committee-
 * receipts was counting them as external because only the main
 * committee was mapped to the vault entity — leaving the
 * CONTRIBUTIONS/EXPENDITURES committees unmapped and their $600M+
 * of internal transfers inflating both source AND edge totals.
 *
 * This script:
 *   1. Adds registry entries for the 5 identified affiliate IDs
 *      mapping them to their parent vault entity.
 *   2. Deprecates existing fec-oth-transfers edges in the store
 *      that were emitted with bare committee names ("NATIONAL
 *      REPUBLICAN CONGRESSIONAL COMMITTEE CONTRIBUTIONS" etc.)
 *      targeting the parent entity. These are now redundant —
 *      the verifier's intra-entity filter will exclude them from
 *      the source sum, so they should also not be in the edge sum.
 *
 * After this, verify-committee-receipts should show DCCC/NRCC/NRSC
 * receipts within ±10% of FEC upstream.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');

const AFFILIATE_MAP = {
  'C00002931': { parent: 'NRCC - National Republican Congressional Committee', fec_name: 'NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE CONTRIBUTIONS' },
  'C00075820': { parent: 'NRCC - National Republican Congressional Committee', fec_name: 'NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE EXPENDITURES' },
  'C00347864': { parent: 'DCCC - Democratic Congressional Campaign Committee', fec_name: 'DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE - CONTRIBUTIONS' },
  'C00091009': { parent: 'NRSC - National Republican Senatorial Committee',    fec_name: 'NATIONAL REPUBLICAN SENATORIAL COMMITTEE - CONTRIBUTIONS *' },
  'C10000982': { parent: 'NRSC - National Republican Senatorial Committee',    fec_name: 'NATIONAL REPUBLICAN SENATORIAL COMMITTEE COMBO ACCOUNT-WILLIAM V. ROTH, JR.-OFFICE ACCOUNT' },
};

const ents = loadEntities();
const byName = new Map(ents.map((e) => [e.name, e]));

// 1. Build new registry entries
const REGISTRY_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');
const reg = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
let addedReg = 0;
for (const [cid, meta] of Object.entries(AFFILIATE_MAP)) {
  if (reg[cid]) continue; // already exists
  const ent = byName.get(meta.parent);
  if (!ent) {
    console.error(`  cannot map ${cid}: parent entity "${meta.parent}" not found`);
    continue;
  }
  reg[cid] = {
    committee_id: cid,
    fec_name: meta.fec_name,
    committee_type: null,
    committee_type_full: null,
    designation: null,
    designation_full: null,
    organization_type: null,
    connected_organization_name: null,
    candidate_ids: [],
    cycles: [],
    vault_profile: ent.profile_path,
    mapped_to: meta.parent,
    mapping_reason: 'party-committee affiliate — intra-entity accounting',
    mapped_at: new Date().toISOString(),
  };
  addedReg++;
}

// 2. Find stale bare-entity edges from fec-oth-transfers where the
//    `from` name matches one of the affiliate fec_names AND the `to`
//    is the parent entity.
const DERIVED_FILE = path.join(ROOT, 'data', 'derived', 'fec-oth-transfers.jsonl');
const staleNames = new Set();
const parentByAffiliateName = new Map();
for (const meta of Object.values(AFFILIATE_MAP)) {
  staleNames.add(meta.fec_name);
  parentByAffiliateName.set(meta.fec_name, meta.parent);
}

const text = fs.readFileSync(DERIVED_FILE, 'utf-8');
const lines = text.split(/\r?\n/);
let changedEdges = 0;
let phantomSum = 0;
const out = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) { out.push(line); continue; }
  let rec;
  try { rec = JSON.parse(trimmed); } catch { out.push(line); continue; }
  if (
    rec.type === 'monetary' &&
    rec.status !== 'deprecated' &&
    staleNames.has(rec.from) &&
    parentByAffiliateName.get(rec.from) === rec.to
  ) {
    rec.status = 'deprecated';
    rec.deprecation_reason = 'party-committee-affiliate-now-intra-entity';
    rec.deprecated_at = new Date().toISOString();
    phantomSum += rec.amount || 0;
    changedEdges++;
    out.push(JSON.stringify(rec));
  } else {
    out.push(line);
  }
}

console.log(`[map-party-committee-affiliates] ${WRITE ? 'WRITE' : 'dry-run'}`);
console.log(`  registry entries added:  ${addedReg}`);
console.log(`  stale edges deprecated:  ${changedEdges}`);
console.log(`  phantom removed:         $${(phantomSum / 1e6).toFixed(1)}M`);

if (WRITE) {
  if (addedReg > 0) fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2));
  if (changedEdges > 0) fs.writeFileSync(DERIVED_FILE, out.join('\n'));
  console.log('  applied.');
} else {
  console.log('  rerun with --write to apply.');
}
