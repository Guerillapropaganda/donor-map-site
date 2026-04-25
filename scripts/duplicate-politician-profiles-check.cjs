#!/usr/bin/env node
/**
 * duplicate-politician-profiles-check.cjs
 *
 * Harness check: scans data/entities.jsonl for cases where two distinct
 * politician profiles map to the same human (same bioguide id, OR same
 * normalized first+last name).
 *
 * Caught 2026-04-25 by the librarian's ambiguous_aliases tracking:
 *   - Edward J. Markey + Ed Markey (two folders, one Senator)
 *   - James A. Himes + Jim Himes (two folders, one Rep)
 *
 * The librarian flags these as ambiguous and refuses to resolve the
 * common name; the cache happily included both. Editorial cleanup
 * required (pick canonical, archive the other).
 *
 * Per content/Admin Notes/adr-0024-prevention-checklist.md (Layer 3
 * Check 3). Catches the next pair when the second profile is created,
 * not six months later.
 *
 * Distinct from the duplicate-bioguide-sentinel pre-commit hook:
 * - Sentinel blocks commits that introduce duplicates.
 * - This harness check catches the existing duplicates already in the
 *   vault (regardless of how they got past the sentinel) and surfaces
 *   them for review.
 *
 * Usage:
 *   node scripts/duplicate-politician-profiles-check.cjs        # human
 *   node scripts/duplicate-politician-profiles-check.cjs --json # harness
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const LEGISLATORS = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const JSON_MODE = process.argv.includes('--json');

function normalizeName(s) {
  // Strip honorifics, periods, double spaces. Lowercase.
  return String(s || '')
    .toLowerCase()
    .replace(/\b(jr|sr|iii|iv|ii)\b\.?/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function commonNames(leg) {
  // Build the set of common-name forms that would refer to the same human.
  // Mirrors lib/donor-map/resolver.ts legislatorNameForms() but kept here
  // to avoid the .ts harness dependency.
  const isInitial = (s) => !s || String(s).trim().replace(/\.$/, '').length <= 2;
  const out = new Set();
  const last = (leg.name_last || '').trim();
  const first = (leg.name_first || '').trim();
  const middle = (leg.name_middle || '').trim();
  const nickname = (leg.name_nickname || '').trim();
  if (first && last && !isInitial(first)) out.add(normalizeName(`${first} ${last}`));
  if (middle && last && !isInitial(middle)) out.add(normalizeName(`${middle} ${last}`));
  if (first && middle && last && !isInitial(first) && !isInitial(middle)) {
    out.add(normalizeName(`${first} ${middle} ${last}`));
  }
  if (nickname && last) out.add(normalizeName(`${nickname} ${last}`));
  return out;
}

function main() {
  // Load entities, filter to politicians with profile paths.
  const entityLines = fs.readFileSync(ENTITIES, 'utf-8').split('\n').filter(Boolean);
  const politicians = [];
  for (const line of entityLines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.entity_type !== 'politician' || !e.profile_path) continue;
    politicians.push({
      id: e.id,
      name: e.name,
      profile_path: e.profile_path,
      bioguide: e.signals?.bioguide_id || e.signals?.bioguide || null,
    });
  }

  // Load legislator registry, build name → bioguide map for cross-ref.
  const legLines = fs.readFileSync(LEGISLATORS, 'utf-8').split('\n').filter(Boolean);
  const nameToBioguide = new Map(); // normalized common-name → bioguide
  for (const line of legLines) {
    let l;
    try { l = JSON.parse(line); } catch { continue; }
    if (l._status !== 'current') continue; // historical politicians may legitimately
                                            // share names with current ones; skip.
    for (const form of commonNames(l)) {
      // First-write-wins; collisions across legislators handled separately.
      if (!nameToBioguide.has(form)) nameToBioguide.set(form, l.bioguide);
    }
  }

  // Pass 1: group politicians by bioguide (when known on the profile).
  const byBioguide = new Map();
  for (const p of politicians) {
    if (!p.bioguide) continue;
    const list = byBioguide.get(p.bioguide) || [];
    list.push(p);
    byBioguide.set(p.bioguide, list);
  }

  // Pass 2: for politicians without an explicit bioguide on the profile,
  // try to attach via legislator-registry name match. If two distinct
  // profiles match the same bioguide via name, that's also a duplicate.
  for (const p of politicians) {
    if (p.bioguide) continue;
    const inferred = nameToBioguide.get(normalizeName(p.name));
    if (!inferred) continue;
    const list = byBioguide.get(inferred) || [];
    if (!list.find((x) => x.id === p.id)) list.push(p);
    byBioguide.set(inferred, list);
  }

  // Filter to bioguides claimed by >1 distinct profile path.
  const dupes = [];
  for (const [bioguide, list] of byBioguide) {
    const uniquePaths = Array.from(new Set(list.map((p) => p.profile_path)));
    if (uniquePaths.length > 1) {
      dupes.push({
        bioguide,
        profiles: list.map((p) => ({ id: p.id, name: p.name, profile_path: p.profile_path })),
      });
    }
  }

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({
      findings_count: dupes.length,
      total_politician_profiles: politicians.length,
      groups: dupes.slice(0, 50),
      message: `${dupes.length} politician(s) have >1 vault profile mapping to the same bioguide.`,
    }));
    process.stdout.write('\n');
  } else {
    console.log(`Scanned ${politicians.length} politician profile(s) with profile_path`);
    console.log(`  ${dupes.length} duplicate group(s) found`);
    console.log();
    for (const g of dupes.slice(0, 30)) {
      console.log(`bioguide ${g.bioguide}:`);
      for (const p of g.profiles) {
        console.log(`  ${p.id}  "${p.name}"`);
        console.log(`    ${p.profile_path}`);
      }
      console.log();
    }
    if (dupes.length > 30) console.log(`... and ${dupes.length - 30} more.`);
  }

  process.exit(dupes.length > 0 ? 1 : 0);
}

main();
