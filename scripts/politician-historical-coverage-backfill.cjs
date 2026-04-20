#!/usr/bin/env node
/**
 * politician-historical-coverage-backfill.cjs
 *
 * Closes the Bernie-class gap: politicians whose entities.jsonl record
 * has at most ONE fec_candidate_id (their current cycle) while FEC's
 * candidate-master has multiple records spanning their full career —
 * House → Senate → President, 2006 → 2012 → 2018 → 2020 etc.
 *
 * The previous sync-campaign-committees.cjs required an exact chamber
 * match, which silently drops prior-office cycles for anyone who
 * changed chambers or ran for president. This script relaxes chamber
 * matching to name+nickname only, and pools every historical FEC
 * candidate record under the politician's entity.
 *
 * What it updates per politician:
 *   - signals.fec_candidate_ids        (new field, array of ALL matching ids)
 *   - signals.fec_committee_ids        (pooled principal committees)
 *   - signals.fec_candidate_history    (array of {id, office, cycle, pc})
 *
 * And adds to data/fec-committee-registry.json:
 *   - one entry per principal committee id mapping to the politician's
 *     profile_path (so the FEC ingest aggregator can route inflows
 *     to the politician instead of a bare committee name)
 *
 * Safe:
 *   - Won't overwrite existing non-empty fec_candidate_id (just appends
 *     to fec_candidate_ids array if different)
 *   - Won't clobber existing registry entries — only adds missing ones
 *   - Excludes SCOTUS justices and other no-campaign types via name
 *     match (they won't have FEC records anyway, but extra guard)
 *
 * After this runs, the FEC ingest aggregators should be re-run so they
 * emit edges targeting the newly-mapped committees. That's a separate
 * step, documented in the summary.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REG_FILE = path.join(ROOT, 'data', 'fec-committee-registry.json');
const FEC_ROOT = 'C:/donor-map-data/fec';
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

// Nickname expansion — bernie→bernard, bob→robert, etc. FEC uses
// legal first names in candidate-master; vault profiles use common
// names. Without this, half our matches miss.
const NICKNAMES = {
  bernie: 'bernard', bob: 'robert', bill: 'william', mitch: 'mitchell',
  rob: 'robert', dick: 'richard', jim: 'james', tom: 'thomas',
  joe: 'joseph', mike: 'michael', nick: 'nicholas', dave: 'david',
  chris: 'christopher', chuck: 'charles', rick: 'richard',
  teddy: 'theodore', ted: 'theodore', alex: 'alexander',
  andy: 'andrew', dan: 'daniel', danny: 'daniel', tony: 'anthony',
  sam: 'samuel', ben: 'benjamin', will: 'william', kate: 'katherine',
  kim: 'kimberly', steve: 'steven', jeff: 'jeffrey',
  matt: 'matthew', eric: 'erick', greg: 'gregory', doug: 'douglas',
  frank: 'francis', tim: 'timothy', cathy: 'catherine',
  ron: 'ronald', liz: 'elizabeth', beth: 'elizabeth',
};

// Judicial / SCOTUS names that shouldn't match FEC candidates.
const JUDICIAL_PATTERNS = /(Sonia Sotomayor|Samuel Alito|Neil Gorsuch|Ketanji Brown Jackson|John Roberts|Elena Kagan|Clarence Thomas|Brett Kavanaugh|Amy Coney Barrett|Justice )/;

function nameKeys(name) {
  // Return list of candidate-master-shaped keys ("last first") to try
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return [];
  // Strip middle initials (single char) so "John Q Public" → "public john"
  const clean = parts.filter((p) => p.length > 1);
  if (clean.length < 2) return [];
  const last = clean[clean.length - 1].toLowerCase();
  const first = clean[0].toLowerCase();
  const keys = [`${last} ${first}`];
  if (NICKNAMES[first]) keys.push(`${last} ${NICKNAMES[first]}`);
  return keys;
}

(async function main() {
  console.log(`[politician-historical-coverage-backfill] ${WRITE ? 'WRITE' : 'dry-run'}\n`);

  console.log('  building candidate-master index...');
  const candByKey = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(path.join(FEC_ROOT, 'candidate-master.jsonl')) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (!r.name || !r.id) continue;
      const key = r.name.toLowerCase().replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!candByKey.has(key)) candByKey.set(key, []);
      candByKey.get(key).push({
        id: r.id,
        office: r.office,
        state: r.state,
        cycle: r.cycle || r.election_year,
        principal_cmte_id: r.principal_cmte_id,
        fec_name: r.name,
      });
    } catch {}
  }
  console.log(`  candidate-master unique name keys: ${candByKey.size}`);

  const ents = loadEntities();
  const politicians = ents.filter((e) => e.entity_type === 'politician' && !JUDICIAL_PATTERNS.test(e.name));
  console.log(`  politicians (excluding judicial): ${politicians.length}`);

  const reg = JSON.parse(fs.readFileSync(REG_FILE, 'utf-8'));

  // Per-politician updates
  const entityUpdates = new Map(); // name → { candidate_ids, committee_ids, history }
  const registryAdditions = new Map(); // cmte_id → { vault_profile, fec_name, reason }
  let unmatched = 0;

  for (const p of politicians) {
    const keys = nameKeys(p.name);
    let records = [];
    for (const k of keys) if (candByKey.has(k)) records = records.concat(candByKey.get(k));

    // Dedup by FEC id
    const byId = new Map();
    for (const r of records) byId.set(r.id, r);
    records = [...byId.values()];

    if (records.length === 0) { unmatched++; continue; }

    // Risk control: skip any politician where the name-match produced
    // >15 records — that usually means a generic name (e.g. "John Smith")
    // is matching unrelated candidates. Better to leave those for manual
    // disambiguation than to pollute the registry.
    if (records.length > 15) {
      if (VERBOSE) console.log(`  ⚠ ${p.name}: ${records.length} FEC records matched — skipping, ambiguous`);
      continue;
    }

    const currentSignals = p.signals || {};
    const existingCandId = currentSignals.fec_candidate_id;
    const existingCandIds = currentSignals.fec_candidate_ids || (existingCandId ? [existingCandId] : []);
    const existingCmteIds = currentSignals.fec_committee_ids || (currentSignals.fec_committee_id ? [currentSignals.fec_committee_id] : []);

    const newCandIds = new Set([...existingCandIds, ...records.map((r) => r.id)].filter(Boolean));
    const newCmteIds = new Set([...existingCmteIds, ...records.map((r) => r.principal_cmte_id)].filter(Boolean));
    const history = records
      .filter((r) => r.principal_cmte_id)
      .map((r) => ({ id: r.id, office: r.office, state: r.state, cycle: r.cycle, pc: r.principal_cmte_id }))
      .sort((a, b) => String(a.cycle || 0).localeCompare(String(b.cycle || 0)));

    // Only record as an update if we'd actually add something new
    const addedCands = [...newCandIds].filter((id) => !existingCandIds.includes(id));
    const addedCmtes = [...newCmteIds].filter((id) => !existingCmteIds.includes(id));
    if (addedCands.length === 0 && addedCmtes.length === 0 && !currentSignals.fec_candidate_history) continue;

    entityUpdates.set(p.name, {
      candidate_ids: [...newCandIds],
      committee_ids: [...newCmteIds],
      history,
    });

    // Queue registry additions for each new committee
    for (const r of records) {
      if (!r.principal_cmte_id) continue;
      if (reg[r.principal_cmte_id]) continue;
      if (registryAdditions.has(r.principal_cmte_id)) continue;
      registryAdditions.set(r.principal_cmte_id, {
        vault_profile: p.profile_path,
        fec_name: r.fec_name,
        reason: `politician campaign committee — ${r.office}/${r.state} cycle ${r.cycle}`,
      });
    }
  }

  console.log(`\n  politicians unmatched (name no match in FEC): ${unmatched}`);
  console.log(`  politicians with new coverage to add:          ${entityUpdates.size}`);
  console.log(`  new registry entries to add (committees):      ${registryAdditions.size}`);

  if (VERBOSE) {
    console.log('\n  Sample 10 updates:');
    let i = 0;
    for (const [name, u] of entityUpdates) {
      if (i++ >= 10) break;
      console.log(`    ${name}: +${u.candidate_ids.length} cand ids, +${u.committee_ids.length} cmte ids, ${u.history.length} history rows`);
    }
  }

  if (!WRITE) {
    console.log('\n  rerun with --write to apply.');
    return;
  }

  // Apply: rewrite entities.jsonl with updated signals
  const text = fs.readFileSync(ENT_FILE, 'utf-8');
  const out = [];
  let entitiesTouched = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { out.push(line); continue; }
    let rec;
    try { rec = JSON.parse(line); } catch { out.push(line); continue; }
    const u = entityUpdates.get(rec.name);
    if (!u) { out.push(line); continue; }
    rec.signals = rec.signals || {};
    rec.signals.fec_candidate_ids = u.candidate_ids;
    rec.signals.fec_committee_ids = u.committee_ids;
    rec.signals.fec_candidate_history = u.history;
    // Preserve existing fec_candidate_id so other readers that look
    // for the scalar still work; pick the most-recent if we need to set it.
    if (!rec.signals.fec_candidate_id && u.candidate_ids.length > 0) {
      rec.signals.fec_candidate_id = u.candidate_ids[0];
    }
    if (!rec.signals.fec_committee_id && u.committee_ids.length > 0) {
      rec.signals.fec_committee_id = u.committee_ids[0];
    }
    rec.signals.historical_coverage_backfilled_at = new Date().toISOString();
    out.push(JSON.stringify(rec));
    entitiesTouched++;
  }
  fs.writeFileSync(ENT_FILE, out.join('\n'));

  // Apply: add registry entries
  for (const [cid, meta] of registryAdditions) {
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
      vault_profile: meta.vault_profile,
      mapping_reason: meta.reason,
      mapped_at: new Date().toISOString(),
    };
  }
  fs.writeFileSync(REG_FILE, JSON.stringify(reg, null, 2));

  console.log(`\n  wrote:`);
  console.log(`    ${entitiesTouched} entities updated in entities.jsonl`);
  console.log(`    ${registryAdditions.size} committee entries added to fec-committee-registry.json`);
  console.log(`\n  NEXT: re-run aggregators so newly-mapped committees produce edges:`);
  console.log(`    node scripts/aggregate-indiv-to-edges.cjs --write`);
  console.log(`    node scripts/aggregate-committee-transfers-to-edges.cjs --write`);
  console.log(`    node scripts/coverage-gap-audit.cjs   # to measure improvement`);
})();
