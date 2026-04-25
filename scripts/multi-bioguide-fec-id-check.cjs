#!/usr/bin/env node
/**
 * multi-bioguide-fec-id-check.cjs
 *
 * Harness check (ADR-0024 Phase 3 prevention layer): flags any politician
 * entity whose FEC candidate IDs come from more than one bioguide owner
 * per the legislator-registry. That's the Bob-Casey-class contamination
 * found 2026-04-25 — a single entity glomming the donor data of 4
 * different humans because they share a name.
 *
 * Catches the next instance the moment it's introduced, before edges
 * get rendered under the wrong person.
 *
 * Per content/Admin Notes/adr-0024-prevention-checklist.md.
 *
 * Distinct from duplicate-bioguide-sentinel (one bioguide → multiple
 * profiles) and duplicate-politician-profiles-check (one human → two
 * folders). This catches: one entity → multiple humans via FEC IDs.
 *
 * Usage:
 *   node scripts/multi-bioguide-fec-id-check.cjs        # human-readable
 *   node scripts/multi-bioguide-fec-id-check.cjs --json # harness JSON
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const JSON_MODE = process.argv.includes('--json');

function loadJsonl(p) {
  const out = [];
  for (const l of fs.readFileSync(p, 'utf-8').split('\n')) {
    if (!l.trim()) continue;
    try { out.push(JSON.parse(l)); } catch {}
  }
  return out;
}

const entities = loadJsonl(ENTITIES);
const legislators = loadJsonl(LEGISLATORS);

// Build FEC candidate ID → bioguide(s) index. A given FEC ID belongs to
// exactly one bioguide in the registry; if multiple ever appear, that's
// also a flag (handled separately).
const fecIdToBioguides = new Map();
for (const leg of legislators) {
  const fecIds = leg.ids?.fec ?? [];
  for (const id of fecIds) {
    const list = fecIdToBioguides.get(id) ?? [];
    if (!list.includes(leg.bioguide)) list.push(leg.bioguide);
    fecIdToBioguides.set(id, list);
  }
}

const findings = [];
for (const e of entities) {
  if (e.entity_type !== 'politician') continue;
  const ids = e.signals?.fec_candidate_ids ?? (e.signals?.fec_candidate_id ? [e.signals.fec_candidate_id] : []);
  if (ids.length < 2) continue;

  // For each FEC id, look up which bioguide(s) own it. Skip IDs not in
  // the registry (could be presidential committees, retired politicians,
  // pre-bioguide records).
  const ownerBioguides = new Set();
  const idToOwner = {};
  for (const id of ids) {
    const owners = fecIdToBioguides.get(id) ?? [];
    idToOwner[id] = owners;
    for (const bg of owners) ownerBioguides.add(bg);
  }
  if (ownerBioguides.size < 2) continue;

  findings.push({
    entity_id: e.id,
    name: e.name,
    profile_path: e.profile_path,
    fec_candidate_ids: ids,
    distinct_bioguide_owners: [...ownerBioguides],
    fec_id_to_owner: idToOwner,
  });
}

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({
    findings_count: findings.length,
    total_politician_entities: entities.filter((e) => e.entity_type === 'politician').length,
    findings,
    message:
      findings.length === 0
        ? 'No politician entities span multiple bioguides via FEC IDs.'
        : `${findings.length} politician entit${findings.length === 1 ? 'y' : 'ies'} pool FEC candidate IDs from multiple distinct humans. Bob-Casey-class contamination — donor data from different people merged into one record. Defamation risk if rendered.`,
  }));
} else {
  console.log(`multi-bioguide-fec-id-check`);
  console.log(`Scanned ${entities.length} entities, ${entities.filter((e) => e.entity_type === 'politician').length} politicians`);
  console.log(`Findings: ${findings.length}`);
  if (findings.length === 0) {
    console.log(`✓ Clean. No politician entity pools FEC IDs from multiple humans.`);
  } else {
    console.log(``);
    for (const f of findings) {
      console.log(`  ${f.entity_id}  ${f.name}  (${f.distinct_bioguide_owners.length} distinct humans)`);
      for (const [id, owners] of Object.entries(f.fec_id_to_owner)) {
        console.log(`    ${id} → ${owners.length ? owners.join(', ') : '(not in registry)'}`);
      }
    }
  }
}
process.exit(0);
