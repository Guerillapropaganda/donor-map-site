#!/usr/bin/env node
/**
 * duplicate-entity-profiles-check.cjs
 *
 * Generalized harness check for duplicate vault profiles representing
 * the same real-world entity. Catches the donor/corporation/think-tank
 * variant of the problem that duplicate-politician-profiles-check
 * already catches for politicians.
 *
 * Caught 2026-04-25 evening — investigating Phase 3 cutover donor-side
 * losses surfaced ent_001402 "National Committee to Preserve Social
 * Security & Medicare PAC" + ent_001403 "National Committee to Preserve
 * Social Security PAC" — two vault profile folders for the same PAC.
 * The librarian's ambiguous_aliases tracking refuses to resolve, and
 * 769 of NCPSSM's edges drop silently from any consumer profile.
 *
 * Detection heuristic — STRICT, to keep false-positive rate low:
 *   1. Same FEC committee_id on signals.fec_committee_ids → very high
 *      confidence same entity.
 *   2. Same EIN on signals.ein → very high confidence.
 *   3. Same SEC CIK on signals.sec_cik → very high confidence.
 *   4. Same Cal-Access filer id on signals.cal_access_filer_id → very
 *      high confidence. Catches state/federal twin profiles when
 *      Cal-Access ingest lands. Added 2026-04-29.
 *   5. Identical normalized names (lowercase, punctuation/whitespace
 *      collapsed) across two records that DIDN'T already match by 1-4.
 *      This catches the NCPSSM-class case where the names differ only
 *      by added/dropped clauses ("& Medicare").
 *   6. Prefix-descriptor match: one normalized name is a strict
 *      prefix of another with ≥1 trailing word. Catches the dash-
 *      prefix pattern ("CoreCivic" vs "CoreCivic - Private Prisons")
 *      that Money Trail surfaced as self-loops on 2026-04-29. Lower
 *      confidence than 1-5 — many true distincts fall in here
 *      (corp vs family wealth, corp vs PAC). Tier 2 only.
 *
 * Each finding requires editorial cleanup: pick canonical, archive the
 * other folder, update aliases.
 *
 * Skips politicians — duplicate-politician-profiles-check.cjs handles
 * those with bioguide-aware logic.
 *
 * Usage:
 *   node scripts/duplicate-entity-profiles-check.cjs
 *   node scripts/duplicate-entity-profiles-check.cjs --json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const JSON_MODE = process.argv.includes('--json');

function normalizeName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const lines = fs.readFileSync(ENTITIES, 'utf-8').split('\n').filter(Boolean);
const ents = [];
for (const l of lines) {
  let e; try { e = JSON.parse(l); } catch { continue; }
  if (!e.profile_path) continue;
  if (e.entity_type === 'politician') continue; // separate check covers these
  ents.push(e);
}

// Build indexes
const byCmte = new Map();
const byEin = new Map();
const byCik = new Map();
const byCalAccess = new Map();
const byName = new Map();

for (const e of ents) {
  for (const c of e.signals?.fec_committee_ids || []) {
    const list = byCmte.get(c) || [];
    list.push(e); byCmte.set(c, list);
  }
  if (e.signals?.fec_committee_id) {
    const c = e.signals.fec_committee_id;
    const list = byCmte.get(c) || [];
    if (!list.includes(e)) list.push(e);
    byCmte.set(c, list);
  }
  const ein = e.signals?.ein;
  if (ein && ein !== 'null' && ein !== '') {
    const list = byEin.get(ein) || [];
    list.push(e); byEin.set(ein, list);
  }
  const cik = e.signals?.sec_cik;
  if (cik) {
    const list = byCik.get(cik) || [];
    list.push(e); byCik.set(cik, list);
  }
  const calId = e.signals?.cal_access_filer_id;
  if (calId) {
    // Normalize: strip the "-CAO" / "-CTL" suffix if present, since
    // the same committee can appear with or without it across sources.
    const norm = String(calId).replace(/-(CAO|CTL|IND|RCP|MJR|SMO)$/i, '').trim();
    if (norm) {
      const list = byCalAccess.get(norm) || [];
      list.push(e); byCalAccess.set(norm, list);
    }
  }
  const n = normalizeName(e.name);
  if (n) {
    const list = byName.get(n) || [];
    list.push(e); byName.set(n, list);
  }
}

// Collect duplicates
const groups = []; // { reason, key, profiles }
function addGroup(reason, key, list) {
  // Dedupe by id
  const seen = new Set();
  const profiles = [];
  for (const e of list) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    profiles.push({ id: e.id, name: e.name, type: e.entity_type, profile_path: e.profile_path });
  }
  if (profiles.length < 2) return;
  groups.push({ reason, key, profiles });
}

const seenAsAlreadyGrouped = new Set(); // entity ids already in a group, to skip lower-priority detections

for (const [c, list] of byCmte) {
  if (list.length < 2) continue;
  addGroup('shared_fec_committee_id', c, list);
  for (const e of list) seenAsAlreadyGrouped.add(e.id);
}
for (const [ein, list] of byEin) {
  if (list.length < 2) continue;
  if (list.every((e) => seenAsAlreadyGrouped.has(e.id))) continue;
  addGroup('shared_ein', ein, list);
  for (const e of list) seenAsAlreadyGrouped.add(e.id);
}
for (const [cik, list] of byCik) {
  if (list.length < 2) continue;
  if (list.every((e) => seenAsAlreadyGrouped.has(e.id))) continue;
  addGroup('shared_sec_cik', cik, list);
  for (const e of list) seenAsAlreadyGrouped.add(e.id);
}
for (const [calId, list] of byCalAccess) {
  if (list.length < 2) continue;
  if (list.every((e) => seenAsAlreadyGrouped.has(e.id))) continue;
  addGroup('shared_cal_access_filer_id', calId, list);
  for (const e of list) seenAsAlreadyGrouped.add(e.id);
}
for (const [n, list] of byName) {
  if (list.length < 2) continue;
  if (list.every((e) => seenAsAlreadyGrouped.has(e.id))) continue;
  addGroup('identical_normalized_name', n, list);
  for (const e of list) seenAsAlreadyGrouped.add(e.id);
}

// Path 5: prefix-descriptor match. Build a sorted list of (normalized
// name, entity) and pair any case where shorter is a strict prefix
// of longer with ≥1 trailing word. Lower confidence than 1-4 — true
// distincts (Walmart vs "Walmart - Walton Family") get flagged here
// and David decides per case via /audit-claude-decisions.
const byNameSorted = ents
  .map((e) => ({ e, n: normalizeName(e.name) }))
  .filter((x) => x.n)
  .sort((a, b) => a.n.length - b.n.length);
const prefixGroups = new Map(); // shorter-name → [longer entities]
for (let i = 0; i < byNameSorted.length; i++) {
  const a = byNameSorted[i];
  for (let j = i + 1; j < byNameSorted.length; j++) {
    const b = byNameSorted[j];
    if (a.n.length === b.n.length) continue;
    if (b.n.startsWith(a.n + ' ')) {
      const key = a.n;
      const list = prefixGroups.get(key) || [a.e];
      if (!list.includes(b.e)) list.push(b.e);
      prefixGroups.set(key, list);
    }
  }
}
for (const [key, list] of prefixGroups) {
  if (list.length < 2) continue;
  if (list.every((e) => seenAsAlreadyGrouped.has(e.id))) continue;
  addGroup('prefix_descriptor_match', key, list);
  for (const e of list) seenAsAlreadyGrouped.add(e.id);
}

if (JSON_MODE) {
  process.stdout.write(JSON.stringify({
    findings_count: groups.length,
    total_entities_with_profile: ents.length,
    groups: groups.slice(0, 100),
    message:
      groups.length === 0
        ? 'No duplicate non-politician entity profiles detected.'
        : `${groups.length} duplicate group(s) found. Editorial cleanup: pick canonical profile per group, archive the other(s).`,
  }));
  process.stdout.write('\n');
} else {
  console.log(`Scanned ${ents.length} non-politician entity profiles`);
  console.log(`  ${groups.length} duplicate group(s) found`);
  console.log();
  for (const g of groups.slice(0, 50)) {
    console.log(`[${g.reason}] key=${g.key}`);
    for (const p of g.profiles) {
      console.log(`  ${p.id}  ${p.type}  "${p.name}"`);
      console.log(`    ${p.profile_path}`);
    }
    console.log();
  }
  if (groups.length > 50) console.log(`... and ${groups.length - 50} more`);
}

process.exit(0);
