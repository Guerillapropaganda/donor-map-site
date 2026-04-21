#!/usr/bin/env node
/**
 * dedupe-nickname-variants.cjs
 *
 * Pattern H extension — nickname-based dedup for politicians.
 *
 * The registry at data/legislator-registry.jsonl carries name_nickname
 * ("Bernie" ↔ legal first name "Bernard", "Bill" ↔ "William", etc.) for
 * 273 current+former legislators. Pattern H v2's key-based dedup
 * couldn't collapse "SANDERS, BERNARD" (legal) ↔ "Bernie Sanders"
 * (profile) because the normalized keys differ (`sanders bernard` vs
 * `bernie sanders`).
 *
 * For each registry entry with nickname data:
 *   1. Generate plausible edge-side name variants (LAST, FIRST;
 *      LAST, NICK; First Last; Nick Last; ALL CAPS of each)
 *   2. Check each variant against entity store + edge files
 *   3. If a variant exists as an orphan but the canonical entity
 *      (under some other variant) is profiled, queue a rename
 *
 * Applies the renames to both entities.jsonl (removing orphan entity
 * rows) and every edge file (renaming from/to + recomputing id).
 *
 * Dry-run by default; --apply to write.
 */
const fs = require('fs');
const path = require('path');
const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

const APPLY = process.argv.includes('--apply');
const ROOT = path.join(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REG_FILE = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const REL_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');

function main() {
  const reg = fs.readFileSync(REG_FILE, 'utf-8').split(/\n/).filter(Boolean).map(JSON.parse);
  const entities = fs.readFileSync(ENT_FILE, 'utf-8').split(/\n/).filter(Boolean).map(JSON.parse);
  const entByName = new Map(entities.map((e) => [e.name, e]));

  // For each registry entry that has a nickname, generate all variant
  // forms and see which ones exist as entities vs which are only edge-
  // side orphans.
  const rename = new Map(); // orphan-name → canonical-name
  const collapsedEntities = new Set(); // entity.name → to be removed
  let considered = 0, renamesAdded = 0;
  for (const r of reg) {
    const first = r.name_first;
    const last = r.name_last;
    const nick = r.name_nickname;
    if (!first || !last || !nick || nick === first) continue;
    considered++;

    // Generate plausible display variants
    const variants = new Set([
      `${first} ${last}`,
      `${nick} ${last}`,
      `${last}, ${first}`,
      `${last}, ${nick}`,
      `${first} ${last}`.toUpperCase(),
      `${nick} ${last}`.toUpperCase(),
      `${last}, ${first}`.toUpperCase(),
      `${last}, ${nick}`.toUpperCase(),
    ]);

    // Find which variants exist in entity store
    const hits = [...variants].filter((v) => entByName.has(v));
    if (hits.length < 2) continue; // need at least 2 variants to have a dedup

    // BIOGUIDE SAFETY CHECK — if two hits carry different bioguide_ids,
    // they're different PEOPLE who share a legal name (Bob Menendez
    // the senator vs Robert Menendez Jr. the rep — father and son).
    // DO NOT merge. Same protection for any two entities with profiles
    // under different paths.
    const bioguides = new Set();
    for (const h of hits) {
      const ent = entByName.get(h);
      const bio = ent?.signals?.bioguide_id;
      if (bio) bioguides.add(bio);
    }
    if (bioguides.size > 1) {
      console.log(`  SKIP (different bioguides — likely different people): ${hits.join(' / ')} — bioguides ${[...bioguides].join(', ')}`);
      continue;
    }
    // Secondary check: if multiple hits have profile_paths AND those
    // paths are in different chamber folders, bail (same reasoning).
    const profilePaths = new Set(hits.map((h) => entByName.get(h)?.profile_path).filter(Boolean));
    if (profilePaths.size > 1) {
      console.log(`  SKIP (multiple profile paths — likely different people): ${hits.join(' / ')}`);
      continue;
    }

    // Pick canonical: prefer entity with profile_path, else the
    // title-cased "First Last" or "Nick Last" form (most readable)
    const withProfile = hits.filter((n) => entByName.get(n).profile_path);
    let canonical;
    if (withProfile.length === 1) canonical = withProfile[0];
    else if (withProfile.length > 1) canonical = withProfile[0];
    else {
      canonical = hits.find((n) => !n.includes(',') && n !== n.toUpperCase())
               || hits.find((n) => !n.includes(','))
               || hits[0];
    }

    for (const v of hits) {
      if (v === canonical) continue;
      rename.set(v, canonical);
      collapsedEntities.add(v);
      renamesAdded++;
    }
  }
  console.log(`registry entries with nicknames: ${considered}`);
  console.log(`dedup variants queued: ${renamesAdded}`);
  console.log(`entities to collapse: ${collapsedEntities.size}\n`);
  for (const [from, to] of rename) console.log(`  ${from} → ${to}`);

  if (!APPLY) { console.log('\n(dry-run)'); return; }

  // Collapse entities — remove the ones in collapsedEntities, merge
  // their signals into the canonical.
  const newEnts = [];
  for (const e of entities) {
    if (collapsedEntities.has(e.name)) {
      const canonical = rename.get(e.name);
      const canonEnt = entities.find((x) => x.name === canonical);
      if (canonEnt) {
        canonEnt.signals = canonEnt.signals || {};
        e.signals = e.signals || {};
        for (const [k, v] of Object.entries(e.signals)) {
          if (canonEnt.signals[k] == null && v != null) canonEnt.signals[k] = v;
        }
        if (!canonEnt.capital_type && e.capital_type) canonEnt.capital_type = e.capital_type;
      }
      continue;
    }
    newEnts.push(e);
  }
  fs.copyFileSync(ENT_FILE, ENT_FILE + '.pre-nickname-dedup.bak');
  fs.writeFileSync(ENT_FILE, newEnts.map((e) => JSON.stringify(e)).join('\n') + '\n');
  console.log(`\nentities.jsonl: ${entities.length} → ${newEnts.length}`);

  // Rewrite edges (streaming)
  function streamRewrite(file) {
    fs.copyFileSync(file, file + '.pre-nickname-dedup.bak');
    const CHUNK = 64 * 1024 * 1024;
    const inFd = fs.openSync(file, 'r');
    const size = fs.fstatSync(inFd).size;
    const outFd = fs.openSync(file + '.tmp', 'w');
    let offset = 0, carry = '', hits = 0;
    try {
      while (offset < size) {
        const len = Math.min(CHUNK, size - offset);
        const buf = Buffer.alloc(len);
        fs.readSync(inFd, buf, 0, len, offset);
        offset += len;
        const chunk = carry + buf.toString('utf-8');
        const lines = chunk.split('\n');
        carry = lines.pop();
        for (const line of lines) {
          if (!line.trim()) { fs.writeSync(outFd, '\n'); continue; }
          let e; try { e = JSON.parse(line); } catch { fs.writeSync(outFd, line + '\n'); continue; }
          let changed = false;
          if (rename.has(e.from)) { e.from = rename.get(e.from); changed = true; }
          if (rename.has(e.to)) { e.to = rename.get(e.to); changed = true; }
          if (changed) { e.id = computeEdgeId(e); hits++; }
          fs.writeSync(outFd, JSON.stringify(e) + '\n');
        }
      }
      if (carry) fs.writeSync(outFd, carry + '\n');
    } finally { fs.closeSync(inFd); fs.closeSync(outFd); }
    fs.renameSync(file + '.tmp', file);
    return hits;
  }
  const edgeFiles = [REL_FILE];
  if (fs.existsSync(DERIVED_DIR)) {
    for (const f of fs.readdirSync(DERIVED_DIR)) {
      if (f.endsWith('.jsonl')) edgeFiles.push(path.join(DERIVED_DIR, f));
    }
  }
  let totalEdges = 0;
  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;
    const n = streamRewrite(f);
    if (n > 0) console.log(`  ${path.basename(f)}: ${n} edges rewritten`);
    totalEdges += n;
  }
  console.log(`\ntotal: ${totalEdges} edges rewritten across ${edgeFiles.length} files`);
}

main();
