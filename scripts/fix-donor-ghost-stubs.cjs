#!/usr/bin/env node
/**
 * fix-donor-ghost-stubs.cjs — closes Blocker 3 of ADR-0024 Phase 3.
 *
 * For each donor ghost entity (entity_type=donor, profile_path=null,
 * name shaped like an FEC campaign committee — TIM SHEEHY FOR MONTANA,
 * FRIENDS OF STEVE DAINES, etc.):
 *
 *   1. Find the candidate that owns the committee via candidate-committees.
 *   2. Find the candidate's vault profile via legislator-registry → entity.
 *   3. If fec-committee-registry already maps the committee to a vault
 *      profile (CLEAN class) → just delete the redundant ghost entity.
 *   4. If registry doesn't have the committee but we have a target
 *      profile (REGISTRY_MISSING class with candidate match) → add
 *      registry entry with vault_profile, then delete the ghost.
 *   5. If no candidate match or no target profile (REGISTRY_MISSING with
 *      no resolution) → leave the ghost; flag for manual review.
 *
 * After this runs, the librarian's resolver Step 3 attaches the
 * committee name as an alias on the candidate's entity. Edges with
 * `from: "TIM SHEEHY FOR MONTANA"` route to Tim Sheehy's entity. Cache
 * builder no longer creates an empty bucket per committee name.
 *
 * Backups: data/entities.jsonl + data/fec-committee-registry.json both
 * snapshot before write.
 *
 * Dry-run by default. --apply to write.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const FEC_REGISTRY = path.join(ROOT, 'data', 'fec-committee-registry.json');
const FEC_CAND_COMMITTEES = 'C:/donor-map-data/fec/candidate-committees.jsonl';
const FEC_CAND_MASTER = 'C:/donor-map-data/fec/candidate-master.jsonl';
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const APPLY = process.argv.includes('--apply');

console.log('fix-donor-ghost-stubs');
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log('');

const entityLines = fs.readFileSync(ENTITIES, 'utf-8').split('\n');
const entities = [];
for (const l of entityLines) { if (!l.trim()) continue; try { entities.push(JSON.parse(l)); } catch {} }
const ghosts = entities.filter(
  (e) => e.entity_type === 'donor' && !e.profile_path && !e.signals?.ein_coverage_reason,
);
console.log(`Donor ghosts: ${ghosts.length}`);

const reg = JSON.parse(fs.readFileSync(FEC_REGISTRY, 'utf-8'));

// Build lookup tables
const cmteToCands = new Map();
for (const l of fs.readFileSync(FEC_CAND_COMMITTEES, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (r.cmte_id && r.cand_id) {
    const list = cmteToCands.get(r.cmte_id) ?? [];
    if (!list.find((x) => x.cand_id === r.cand_id)) list.push({ cand_id: r.cand_id, year: Number(r.cand_election_yr || r.fec_election_yr || 0) });
    cmteToCands.set(r.cmte_id, list);
  }
}
const candById = new Map();
for (const l of fs.readFileSync(FEC_CAND_MASTER, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (r.id) candById.set(r.id, r);
}
const fecToBio = new Map();
for (const l of fs.readFileSync(LEGISLATORS, 'utf-8').split('\n').filter((x) => x.trim())) {
  let r; try { r = JSON.parse(l); } catch { continue; }
  for (const fid of r.ids?.fec || []) fecToBio.set(fid, r.bioguide);
}
const entityByBioguide = new Map();
for (const e of entities) {
  const bg = e.signals?.bioguide_id;
  if (bg && e.profile_path) entityByBioguide.set(bg, e);
}

// Plan per ghost
const plan = []; // { ghost, action, target_profile, target_entity_id, target_cmte_id, fec_name }
for (const ghost of ghosts) {
  const cmte = ghost.signals?.fec_committee_id || (ghost.signals?.fec_committee_ids || [])[0];
  if (!cmte) {
    plan.push({ ghost, action: 'SKIP', reason: 'no fec_committee_id' });
    continue;
  }
  const regEntry = reg[cmte];
  if (regEntry?.vault_profile) {
    plan.push({ ghost, action: 'DELETE_GHOST_ONLY', cmte_id: cmte, target_profile: regEntry.vault_profile, fec_name: regEntry.fec_name });
    continue;
  }
  // Find candidate
  const cands = (cmteToCands.get(cmte) || []).slice().sort((a, b) => b.year - a.year);
  if (cands.length === 0) {
    plan.push({ ghost, action: 'SKIP', reason: 'no candidate-committee link' });
    continue;
  }
  const cand = cands[0];
  const bg = fecToBio.get(cand.cand_id);
  const candEnt = bg ? entityByBioguide.get(bg) : null;
  if (!candEnt?.profile_path) {
    plan.push({ ghost, action: 'SKIP', reason: 'candidate has no vault profile (cand=' + cand.cand_id + ', bg=' + (bg||'-') + ')' });
    continue;
  }
  const candRec = candById.get(cand.cand_id);
  plan.push({
    ghost,
    action: 'ADD_REGISTRY_AND_DELETE_GHOST',
    cmte_id: cmte,
    target_profile: candEnt.profile_path,
    target_entity_id: candEnt.id,
    fec_name: candRec?.name || ghost.name,
    cand_id: cand.cand_id,
  });
}

const counts = { DELETE_GHOST_ONLY: 0, ADD_REGISTRY_AND_DELETE_GHOST: 0, SKIP: 0 };
for (const p of plan) counts[p.action]++;
console.log(`  DELETE_GHOST_ONLY:             ${counts.DELETE_GHOST_ONLY}`);
console.log(`  ADD_REGISTRY_AND_DELETE_GHOST: ${counts.ADD_REGISTRY_AND_DELETE_GHOST}`);
console.log(`  SKIP:                          ${counts.SKIP}`);

// Show 3 of each for the human review
console.log('');
for (const action of ['DELETE_GHOST_ONLY', 'ADD_REGISTRY_AND_DELETE_GHOST', 'SKIP']) {
  const sample = plan.filter((p) => p.action === action).slice(0, 3);
  if (!sample.length) continue;
  console.log(`Sample ${action}:`);
  for (const s of sample) {
    if (action === 'SKIP') console.log(`  ${s.ghost.id} ${s.ghost.name}  reason: ${s.reason}`);
    else console.log(`  ${s.ghost.id} ${s.ghost.name}  → ${s.target_profile}`);
  }
}

if (!APPLY) {
  console.log('');
  console.log('(dry-run) Re-run with --apply to write.');
  process.exit(0);
}

// Backup
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(`${ENTITIES}.bak-${stamp}`, fs.readFileSync(ENTITIES));
fs.writeFileSync(`${FEC_REGISTRY}.bak-${stamp}`, fs.readFileSync(FEC_REGISTRY));
console.log(`\nBacked up entities.jsonl + fec-committee-registry.json`);

// Apply registry additions
let regAdds = 0;
for (const p of plan) {
  if (p.action !== 'ADD_REGISTRY_AND_DELETE_GHOST') continue;
  reg[p.cmte_id] = {
    committee_id: p.cmte_id,
    fec_name: p.fec_name,
    vault_profile: p.target_profile,
    vault_slug: null,
    aliases: [p.ghost.name, p.fec_name].filter((x, i, a) => x && a.indexOf(x) === i),
    cand_id: p.cand_id,
    mapping_reason: 'donor-ghost-stub backfill 2026-04-25',
    mapped_at: new Date().toISOString(),
    source: 'fix-donor-ghost-stubs.cjs',
  };
  regAdds++;
}
fs.writeFileSync(FEC_REGISTRY, JSON.stringify(reg, null, 2) + '\n');
console.log(`✓ Added ${regAdds} fec-committee-registry entries`);

// Apply entity deletions
const ghostIdsToDelete = new Set(plan.filter((p) => p.action !== 'SKIP').map((p) => p.ghost.id));
const out = [];
let deleted = 0;
for (const raw of entityLines) {
  if (!raw.trim()) { out.push(raw); continue; }
  let e; try { e = JSON.parse(raw); } catch { out.push(raw); continue; }
  if (ghostIdsToDelete.has(e.id)) { deleted++; continue; }
  out.push(raw);
}
fs.writeFileSync(ENTITIES, out.join('\n'));
console.log(`✓ Deleted ${deleted} donor ghost entity records`);
console.log('');
console.log('Verify:');
console.log('  node scripts/pathless-stub-entities-check.cjs   (donor ghosts should drop)');
console.log('  node scripts/build-relationships-per-profile-via-librarian.cjs');
console.log('  node scripts/diff-relationships-cache.cjs --top=10');
