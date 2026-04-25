#!/usr/bin/env node
/**
 * merge-phantom-entity-records.cjs
 *
 * ADR-0024 Phase 3 prerequisite. Cleans up "phantom" entity records —
 * entities.jsonl rows whose `profile_path` points to a file that does
 * not exist on disk.
 *
 * Why these exist: enrichment scripts (likely the legislator backfill)
 * created entity records for the formal congressional name (e.g.
 * "Edward J. Markey"), populated the bioguide, and pointed at a vault
 * folder that was never actually written. Meanwhile a separate human-
 * authored entity exists under the common name (e.g. "Ed Markey") with
 * the real folder. The librarian sees two entities and refuses to
 * resolve the name as ambiguous.
 *
 * The fix: delete the phantom record. The librarian already pulls the
 * bioguide from data/legislator-registry.jsonl on next load and
 * auto-aliases all name forms (formal, common, nickname) onto the real
 * entity via findOrCreateLegislatorNode. So no field-copy is needed for
 * the typical case — just remove the phantom.
 *
 * Special case: when the surviving sibling has profile_path === null
 * but a real file exists somewhere on disk that matches the case (e.g.
 * Dan Goldman has a flat .md file rather than a folder), set the
 * surviving entity's profile_path to that file too.
 *
 * Sibling matching: same entity_type AND at least one overlapping
 * fec_candidate_id. If 0 or >1 sibling matches, abort that case and
 * report — never auto-merge across ambiguity.
 *
 * Usage:
 *   node scripts/merge-phantom-entity-records.cjs              # dry-run
 *   node scripts/merge-phantom-entity-records.cjs --apply      # write
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const APPLY = process.argv.includes('--apply');

console.log('merge-phantom-entity-records');
console.log(`Mode: ${APPLY ? 'APPLY (will write)' : 'DRY-RUN (no writes)'}`);
console.log('');

// Load entities
const lines = fs.readFileSync(ENTITIES, 'utf-8').split('\n');
const entities = [];
const rawByIndex = []; // preserve raw lines for non-touched rows
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  rawByIndex.push(line);
  if (!line.trim()) continue;
  try {
    const e = JSON.parse(line);
    entities.push({ idx: i, e });
  } catch {
    /* leave raw */
  }
}
console.log(`Loaded ${entities.length} entity records`);

// Detect phantoms
const phantoms = [];
for (const { idx, e } of entities) {
  if (!e.profile_path) continue;
  const abs = path.join(ROOT, e.profile_path);
  if (fs.existsSync(abs)) continue;
  phantoms.push({ idx, e });
}
console.log(`Phantom entity records (profile_path missing on disk): ${phantoms.length}`);
console.log('');

if (phantoms.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

// Helpers
function fecCandidateIds(e) {
  const ids = new Set();
  if (e?.signals?.fec_candidate_id) ids.add(e.signals.fec_candidate_id);
  for (const id of e?.signals?.fec_candidate_ids ?? []) ids.add(id);
  return ids;
}

function findSiblings(phantom, all) {
  const phantomIds = fecCandidateIds(phantom.e);
  const matches = [];
  for (const candidate of all) {
    if (candidate.idx === phantom.idx) continue;
    if (candidate.e.entity_type !== phantom.e.entity_type) continue;
    const candIds = fecCandidateIds(candidate.e);
    let overlap = false;
    for (const id of phantomIds) if (candIds.has(id)) { overlap = true; break; }
    if (overlap) matches.push(candidate);
  }
  return matches;
}

// Find a real file on disk that the surviving entity should point at if
// it currently has no profile_path. Tries: same path with .md instead of
// folder/_X Master Profile.md (flat-file variant); same path with
// different folder casing.
function findRealFileForEntity(entity, phantomPath) {
  if (entity.profile_path) {
    const abs = path.join(ROOT, entity.profile_path);
    if (fs.existsSync(abs)) return entity.profile_path;
  }
  // Try the phantom's parent folder as a flat .md
  const phantomAbs = path.join(ROOT, phantomPath);
  const phantomParent = path.dirname(phantomAbs);
  const grandparent = path.dirname(phantomParent);
  const folderName = path.basename(phantomParent); // e.g. "Daniel S. Goldman"

  // Probe candidates
  const probes = [];
  // 1. flat .md using entity's name
  if (entity.name) probes.push(path.join(grandparent, `${entity.name}.md`));
  // 2. flat .md using phantom's folder name
  probes.push(path.join(grandparent, `${folderName}.md`));
  for (const probe of probes) {
    if (fs.existsSync(probe)) return path.relative(ROOT, probe).replace(/\\/g, '/');
  }
  return null;
}

// Plan merges
const plans = [];
for (const phantom of phantoms) {
  const siblings = findSiblings(phantom, entities);
  let plan = {
    phantom_id: phantom.e.id,
    phantom_name: phantom.e.name,
    phantom_path: phantom.e.profile_path,
    sibling_id: null,
    sibling_name: null,
    sibling_path_before: null,
    sibling_path_after: null,
    set_path_to: null,
    action: null,
    reason: null,
  };
  if (siblings.length === 0) {
    plan.action = 'SKIP';
    plan.reason = 'no sibling found (no entity with same type + overlapping fec_candidate_id)';
  } else if (siblings.length > 1) {
    plan.action = 'SKIP';
    plan.reason = `${siblings.length} sibling candidates — ambiguous, requires human pick: ${siblings.map((s) => s.e.id + ' "' + s.e.name + '"').join(', ')}`;
  } else {
    const sibling = siblings[0];
    plan.sibling_id = sibling.e.id;
    plan.sibling_name = sibling.e.name;
    plan.sibling_path_before = sibling.e.profile_path;
    plan.action = 'MERGE';
    // Surviving sibling's profile_path: if it already has one that exists, keep.
    // Otherwise probe disk for a likely real file.
    if (sibling.e.profile_path) {
      const abs = path.join(ROOT, sibling.e.profile_path);
      if (fs.existsSync(abs)) {
        plan.sibling_path_after = sibling.e.profile_path;
      } else {
        plan.sibling_path_after = findRealFileForEntity(sibling.e, phantom.e.profile_path);
        if (plan.sibling_path_after !== sibling.e.profile_path) plan.set_path_to = plan.sibling_path_after;
      }
    } else {
      plan.sibling_path_after = findRealFileForEntity(sibling.e, phantom.e.profile_path);
      if (plan.sibling_path_after) plan.set_path_to = plan.sibling_path_after;
    }
    if (!plan.sibling_path_after) {
      plan.reason = 'sibling has no real profile_path AND no flat .md found nearby — survives without a path (librarian will still resolve)';
    }
  }
  plans.push(plan);
}

// Print plan
console.log('--- merge plan ---');
for (const p of plans) {
  console.log('');
  console.log(`PHANTOM: ${p.phantom_id} "${p.phantom_name}"`);
  console.log(`  path:  ${p.phantom_path} (missing)`);
  if (p.action === 'MERGE') {
    console.log(`  → MERGE into ${p.sibling_id} "${p.sibling_name}"`);
    console.log(`     sibling path before: ${p.sibling_path_before ?? '(null)'}`);
    if (p.set_path_to) {
      console.log(`     sibling path after:  ${p.sibling_path_after}  (UPDATED — file exists on disk)`);
    } else {
      console.log(`     sibling path after:  ${p.sibling_path_after ?? '(null — unchanged)'}`);
    }
    if (p.reason) console.log(`     note: ${p.reason}`);
  } else {
    console.log(`  → ${p.action}: ${p.reason}`);
  }
}
console.log('');

// Apply
const merges = plans.filter((p) => p.action === 'MERGE');
if (!APPLY) {
  console.log(`(dry-run) Would apply ${merges.length} merges. Re-run with --apply to write.`);
  process.exit(0);
}
if (merges.length === 0) {
  console.log('Nothing to apply.');
  process.exit(0);
}

// Backup original
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `${ENTITIES}.bak-${stamp}`;
fs.writeFileSync(backup, fs.readFileSync(ENTITIES));
console.log(`Backed up entities.jsonl → ${path.relative(ROOT, backup)}`);

// Build a map of changes
const phantomIds = new Set(merges.map((p) => p.phantom_id));
const siblingPathUpdates = new Map(); // sibling_id → new_path
for (const p of merges) {
  if (p.set_path_to) siblingPathUpdates.set(p.sibling_id, p.set_path_to);
}

// Rewrite entities.jsonl
const out = [];
let removed = 0;
let updated = 0;
for (const raw of rawByIndex) {
  if (!raw.trim()) { out.push(raw); continue; }
  let e;
  try { e = JSON.parse(raw); } catch { out.push(raw); continue; }
  if (phantomIds.has(e.id)) { removed++; continue; } // drop phantom
  if (siblingPathUpdates.has(e.id)) {
    e.profile_path = siblingPathUpdates.get(e.id);
    e.last_updated = new Date().toISOString();
    out.push(JSON.stringify(e));
    updated++;
    continue;
  }
  out.push(raw);
}
fs.writeFileSync(ENTITIES, out.join('\n'));
console.log('');
console.log(`✓ Removed ${removed} phantom record(s)`);
console.log(`✓ Updated ${updated} sibling profile_path(s)`);
console.log(`✓ Wrote ${ENTITIES}`);
console.log('');
console.log('Next step: rebuild the librarian-side cache to confirm the merges took:');
console.log('  node scripts/build-relationships-per-profile-via-librarian.cjs');
console.log('  node scripts/diff-relationships-cache.cjs --top=10');
