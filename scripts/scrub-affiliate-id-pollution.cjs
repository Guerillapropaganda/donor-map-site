#!/usr/bin/env node
/**
 * scrub-affiliate-id-pollution.cjs
 *
 * Targeted cleanup for the bug fixed in auto-link-committee-affiliates.cjs
 * on 2026-04-25. The old "Path 1" of that script wrote committees into
 * an entity's signals.fec_committee_ids whenever the committee declared
 * the entity as its FEC connected_org. That conflated:
 *
 *   "I am a sub-account of X"     (legitimate identity merge)
 * with
 *   "I share a treasurer with X"  (separate legal entity, just affiliated)
 *
 * Equality Project PAC ended up holding Resolute Courage PAC's committee
 * ID, plus four other unrelated PACs that just listed Equality Project
 * as their connected_org.
 *
 * The fix in auto-link prevents new pollution. This script removes the
 * existing pollution that surfaces as ID collisions between two vault
 * entities — i.e. the 14 groups flagged by duplicate-entity-profiles-
 * check.cjs as `shared_fec_committee_id`.
 *
 * SCOPE — collisions only. We do NOT touch multi-committee entities
 * unless one of their IDs collides with another vault entity. Many
 * legitimate "corporate parent + corporate PAC" relationships look
 * structurally like the bug (entity has a connected_org match) but
 * shouldn't be touched, because:
 *   - the corporate PAC is genuinely the corporation's federal vehicle
 *   - those PACs aren't held by any OTHER vault entity, so they don't
 *     cause double-attribution
 *
 * Resolution rule per collision:
 *   1. If exactly one colliding entity has its name normalize-equal to
 *      the committee's name (suffix-stripped), that entity keeps the
 *      ID. All others have it stripped.
 *   2. If no entity name-matches: SKIP, print for human review.
 *   3. If multiple entities name-match (truly identical names): SKIP,
 *      print for human review.
 *
 * After stripping, if a stripped ID was the entity's primary
 * `signals.fec_committee_id`, we either replace with the first
 * surviving array element or null it out.
 *
 * Usage:
 *   node scripts/scrub-affiliate-id-pollution.cjs           # dry-run
 *   node scripts/scrub-affiliate-id-pollution.cjs --write   # apply
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadEntities, updateEntity } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const FEC_ROOT = 'C:/donor-map-data/fec';
const WRITE = process.argv.includes('--write');

// Same normalize() as auto-link-committee-affiliates.cjs — keep in sync.
// Iteratively strips trailing suffixes so "PFIZER INC. PAC" → "PFIZER".
function normalize(s) {
  if (!s) return '';
  let out = s
    .toUpperCase()
    .replace(/'/g, '') // apostrophe → empty (don't insert space mid-word)
    .replace(/[.,()]/g, ' ')
    .replace(/\s+POLITICAL\s+ACTION\s+COMMITTEE\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const SUFFIX = /\s+(PAC|PVF|ACTION\s+FUND|VICTORY\s+FUND|ACTION\s+COMMITTEE|ACTION|FUND|SUPER\s+PAC|C4|C5|INC|LLC|CORP|CORPORATION|CO|COMPANY|GROUP|GROUP\s+INC)\s*$/;
  let prev;
  do {
    prev = out;
    out = out.replace(SUFFIX, '').replace(/\s+/g, ' ').trim();
  } while (out !== prev && out.length > 0);
  return out;
}

(async function main() {
  console.log(`[scrub-affiliate-id-pollution] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Load committee-master into id → { name }
  console.log('  loading committee-master...');
  const cmteById = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(FEC_ROOT, 'committee-master.jsonl')),
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.id) cmteById.set(r.id, { name: r.name || '', connected_org: r.connected_org || '' });
    } catch {}
  }
  console.log(`  committees: ${cmteById.size.toLocaleString()}`);

  // Build collision index: cmte_id → [entities]
  const ents = loadEntities();
  const collisions = new Map(); // cmte_id → [entities]
  for (const e of ents) {
    if (e.entity_type === 'politician') continue;
    const ids = Array.isArray(e.signals?.fec_committee_ids) ? e.signals.fec_committee_ids : [];
    for (const cid of ids) {
      if (!collisions.has(cid)) collisions.set(cid, []);
      collisions.get(cid).push(e);
    }
    // Also include singular fec_committee_id if not already in array (defensive)
    const primary = e.signals?.fec_committee_id;
    if (primary && !ids.includes(primary)) {
      if (!collisions.has(primary)) collisions.set(primary, []);
      collisions.get(primary).push(e);
    }
  }

  // Filter to actual collisions (≥2 entities)
  const colliders = [...collisions.entries()].filter(([, list]) => list.length >= 2);
  console.log(`\nFound ${colliders.length} colliding committee ID(s) across ${ents.filter((e) => e.entity_type !== 'politician').length} non-politician entities`);
  console.log();

  // Plan resolution per collision
  // Per-entity strip set: entity.id → Set<cmte_id_to_strip>
  const stripsByEntity = new Map();
  const skipped = []; // { cid, reason, entities }

  for (const [cid, list] of colliders) {
    const cm = cmteById.get(cid);
    const cmName = cm ? cm.name : '(not in committee-master)';
    const cmNorm = cm ? normalize(cm.name) : '';

    // Find name-matching entities
    const matches = list.filter((e) => normalize(e.name) === cmNorm && cmNorm.length > 0);

    if (matches.length === 1) {
      const winner = matches[0];
      console.log(`COLLISION ${cid}  ${cmName}`);
      console.log(`  WINNER  ${winner.id}  ${winner.name}  [name-stem-match]`);
      for (const e of list) {
        if (e.id === winner.id) continue;
        console.log(`  STRIP   ${e.id}  ${e.name}`);
        if (!stripsByEntity.has(e.id)) stripsByEntity.set(e.id, new Set());
        stripsByEntity.get(e.id).add(cid);
      }
      console.log();
    } else {
      skipped.push({ cid, cmName, reason: matches.length === 0 ? 'no name match' : `${matches.length} name matches`, entities: list });
    }
  }

  // Print skipped
  if (skipped.length) {
    console.log(`--- SKIPPED (need human review) ---`);
    for (const s of skipped) {
      console.log(`  ${s.cid}  ${s.cmName}  [${s.reason}]`);
      for (const e of s.entities) console.log(`    ${e.id}  ${e.name}`);
    }
    console.log();
  }

  console.log(`Resolved: ${colliders.length - skipped.length} collisions; skipped: ${skipped.length}`);
  console.log(`Entities to update: ${stripsByEntity.size}`);

  if (!WRITE) {
    console.log(`\n[dry-run] no writes. Re-run with --write to apply.`);
    return;
  }

  // Apply
  let updated = 0;
  for (const [eId, toStrip] of stripsByEntity) {
    const e = ents.find((x) => x.id === eId);
    if (!e) continue;
    const oldIds = Array.isArray(e.signals?.fec_committee_ids) ? e.signals.fec_committee_ids : [];
    const newIds = oldIds.filter((c) => !toStrip.has(c));
    const newSignals = { fec_committee_ids: newIds };
    if (e.signals?.fec_committee_id && toStrip.has(e.signals.fec_committee_id)) {
      newSignals.fec_committee_id = newIds[0] || null;
    }
    try {
      updateEntity(e.id, { signals: newSignals });
      updated++;
    } catch (err) {
      console.error(`  FAILED ${e.id} ${e.name}: ${err.message}`);
    }
  }
  console.log(`\n  entities updated: ${updated}`);
})();
