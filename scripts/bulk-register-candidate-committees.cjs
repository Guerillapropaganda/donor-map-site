#!/usr/bin/env node
/**
 * bulk-register-candidate-committees.cjs
 *
 * Closes the residual chunk of Blocker 3 — the AFSCME-class display loss.
 *
 * Walks FEC's candidate-committees.jsonl. For every committee that:
 *   - has a single candidate link with designation P (principal) or A (authorized)
 *   - whose candidate has a bioguide that maps to a vault entity with profile_path
 *   - is NOT already in fec-committee-registry with a vault_profile
 *
 * adds a registry entry mapping the committee to that candidate's vault
 * profile. The librarian's resolver Step 3 then attaches the committee
 * name (and `fec_name`) as aliases on the candidate's entity, so edges
 * like `from: "AFSCME WORKING FAMILIES FUND", to: "MIKE LEVIN FOR
 * CONGRESS"` finally route to Mike Levin's profile.
 *
 * EXCLUSIONS (intentional):
 *   - Joint fundraising committees (designation J, or any committee
 *     with 2+ candidate links) — these legitimately fund multiple
 *     campaigns; one-to-one mapping would mis-attribute donations.
 *   - Unauthorized (U) and lobbyist/registrant (B) committees —
 *     independent groups, not a candidate's own committee.
 *   - Leadership PACs (D) — these are technically tied to a politician
 *     but spend on OTHER politicians; routing donations TO them onto
 *     the politician's profile would over-attribute.
 *   - Candidates without bioguides (Trump, Christie, state-only) —
 *     would need manual entity matching, deferred.
 *   - Committees already registered with a different vault_profile —
 *     never overwrite.
 *
 * Backups: data/fec-committee-registry.json snapshotted before write.
 * No entities.jsonl edits.
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
const FEC_CMTE_MASTER = 'C:/donor-map-data/fec/committee-master.jsonl';
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const APPLY = process.argv.includes('--apply');

console.log('bulk-register-candidate-committees');
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log('');

// Load existing registry
const reg = JSON.parse(fs.readFileSync(FEC_REGISTRY, 'utf-8'));
console.log(`Existing registry entries: ${Object.keys(reg).length}`);

// Load entities, build bioguide → entity index
const entities = [];
for (const l of fs.readFileSync(ENTITIES, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  try { entities.push(JSON.parse(l)); } catch {}
}
const entityByBioguide = new Map();
for (const e of entities) {
  const bg = e.signals?.bioguide_id;
  if (bg && e.profile_path) entityByBioguide.set(bg, e);
}
console.log(`Vault entities with bioguide + profile_path: ${entityByBioguide.size}`);

// Load legislator-registry: fec_candidate_id → bioguide
const fecToBio = new Map();
for (const l of fs.readFileSync(LEGISLATORS, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  let r; try { r = JSON.parse(l); } catch { continue; }
  for (const fid of r.ids?.fec || []) fecToBio.set(fid, r.bioguide);
}
console.log(`fec_candidate_id → bioguide mappings: ${fecToBio.size}`);

// Load candidate-master for fec_name lookup
const candById = new Map();
for (const l of fs.readFileSync(FEC_CAND_MASTER, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (r.id) candById.set(r.id, r);
}

// Load committee-master for committee names
const cmteById = new Map();
for (const l of fs.readFileSync(FEC_CMTE_MASTER, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (r.id) cmteById.set(r.id, r);
}
console.log(`committee-master rows: ${cmteById.size}`);

// Walk candidate-committees, build per-committee designation+candidate index
const cmteRows = new Map(); // cmte_id → [{cand_id, dsgn, year}]
for (const l of fs.readFileSync(FEC_CAND_COMMITTEES, 'utf-8').split('\n')) {
  if (!l.trim()) continue;
  let r; try { r = JSON.parse(l); } catch { continue; }
  if (!r.cmte_id || !r.cand_id) continue;
  const list = cmteRows.get(r.cmte_id) ?? [];
  list.push({ cand_id: r.cand_id, dsgn: r.cmte_dsgn || '?', year: Number(r.cand_election_yr || r.fec_election_yr || 0) });
  cmteRows.set(r.cmte_id, list);
}
console.log(`Distinct committees in candidate-committees: ${cmteRows.size}`);
console.log('');

// Plan
const stats = {
  total: 0,
  already_registered_correct: 0,
  already_registered_conflict: 0,
  excluded_multi_candidate: 0,
  excluded_no_principal: 0,
  excluded_no_bioguide: 0,
  excluded_no_vault: 0,
  excluded_no_committee_master: 0,
  registerable: 0,
};
const additions = []; // { cmte_id, cmte_name, cand_id, profile_path }

for (const [cmte_id, rows] of cmteRows) {
  stats.total++;

  // Pick the principal/authorized candidate (P preferred, A fallback)
  // Skip joint-fundraising (J) — those legitimately have multiple candidates.
  const pRows = rows.filter((r) => r.dsgn === 'P');
  const aRows = rows.filter((r) => r.dsgn === 'A');
  let candCandidates;
  if (pRows.length) candCandidates = pRows;
  else if (aRows.length) candCandidates = aRows;
  else { stats.excluded_no_principal++; continue; }

  const distinctCands = [...new Set(candCandidates.map((r) => r.cand_id))];
  if (distinctCands.length > 1) { stats.excluded_multi_candidate++; continue; }
  const cand_id = distinctCands[0];

  // Bioguide lookup
  const bg = fecToBio.get(cand_id);
  if (!bg) { stats.excluded_no_bioguide++; continue; }

  // Vault entity?
  const ent = entityByBioguide.get(bg);
  if (!ent?.profile_path) { stats.excluded_no_vault++; continue; }

  // Committee name from committee-master
  const cmte = cmteById.get(cmte_id);
  const cmte_name = cmte?.name || candById.get(cand_id)?.name || `(committee ${cmte_id})`;
  if (!cmte) stats.excluded_no_committee_master++; // counted but still proceed

  // Already in registry?
  const existing = reg[cmte_id];
  if (existing?.vault_profile) {
    if (existing.vault_profile === ent.profile_path) {
      stats.already_registered_correct++;
    } else {
      // Conflict: existing maps elsewhere. Don't overwrite.
      stats.already_registered_conflict++;
    }
    continue;
  }

  stats.registerable++;
  additions.push({ cmte_id, cmte_name, cand_id, bioguide: bg, profile_path: ent.profile_path, dsgn: candCandidates[0].dsgn });
}

console.log('--- analysis ---');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k.padEnd(35)} ${v.toLocaleString()}`);
console.log('');
console.log(`Sample (first 10 of ${additions.length}):`);
for (const a of additions.slice(0, 10)) {
  console.log(`  ${a.cmte_id}  "${a.cmte_name}"  → ${a.profile_path}`);
}

if (!APPLY) {
  console.log('');
  console.log('(dry-run) Re-run with --apply to write registry.');
  process.exit(0);
}

// Backup + apply
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(`${FEC_REGISTRY}.bak-${stamp}`, fs.readFileSync(FEC_REGISTRY));
console.log(`\nBacked up registry → ${path.basename(FEC_REGISTRY)}.bak-${stamp}`);

for (const a of additions) {
  reg[a.cmte_id] = {
    committee_id: a.cmte_id,
    fec_name: a.cmte_name,
    vault_profile: a.profile_path,
    vault_slug: null,
    aliases: [a.cmte_name],
    cand_id: a.cand_id,
    bioguide: a.bioguide,
    designation: a.dsgn,
    mapping_reason: 'bulk-register-candidate-committees 2026-04-25',
    mapped_at: new Date().toISOString(),
    source: 'bulk-register-candidate-committees.cjs',
  };
}
fs.writeFileSync(FEC_REGISTRY, JSON.stringify(reg, null, 2) + '\n');
console.log(`✓ Added ${additions.length.toLocaleString()} registry entries`);
console.log(`  Registry total: ${Object.keys(reg).length.toLocaleString()}`);
console.log('');
console.log('Verify:');
console.log('  node scripts/build-relationships-per-profile-via-librarian.cjs');
console.log('  node scripts/diff-relationships-cache.cjs --top=10 --field=politicians-funded');
