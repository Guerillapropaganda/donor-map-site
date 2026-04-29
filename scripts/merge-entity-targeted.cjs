#!/usr/bin/env node
/**
 * merge-entity-targeted.cjs
 *
 * Single-merge writer used by the duplicate-entity-merges and
 * pathless-stub-aliases pipeline classes (Phase 2B of ADR-0029).
 * Distinct from dedupe-entities.cjs — this script does ONE specific
 * merge per invocation, while dedupe-entities runs a bulk pass with
 * its own canonicalization heuristic.
 *
 * What it does:
 *   1. Loads data/entities.jsonl + the canonical's id and archive id(s).
 *   2. Migrates the archive entity's `aliases` onto the canonical (so
 *      the archive's name is still resolvable post-merge).
 *   3. Migrates `signals` + class fields where the canonical is missing
 *      them but the archive has them.
 *   4. Removes the archive entity records from entities.jsonl.
 *   5. Rewrites edges in data/relationships.jsonl + data/derived/*.jsonl:
 *      `from`/`to` fields that match the archive name → canonical name.
 *      Edge IDs are recomputed; collisions merge (amount summed,
 *      evidence union'd).
 *   6. Writes a backup .pre-merge-entity-targeted.bak next to each file
 *      it modifies.
 *
 * What it does NOT do:
 *   - Frontmatter wikilink rewrites in markdown profiles. Those are
 *     ADR-0024 / canonical-store-sentinel territory, and the rebuilder
 *     handles them on the next scheduled run. Calling this script and
 *     then NOT running rebuild-relationship-caches will leave stale
 *     wikilinks in profiles for up to 6 hours; the dispatcher catches
 *     up automatically.
 *   - Profile folder archival. The duplicate's markdown folder (if any)
 *     stays on disk. Editorial cleanup (renaming the folder, redirect
 *     the URL) is a separate step David handles.
 *
 * Usage:
 *   node scripts/merge-entity-targeted.cjs \
 *        --canonical-id ent_000035 \
 *        --archive-ids ent_000221[,ent_000222...] \
 *        [--dry-run] [--json]
 *
 * Exit codes: 0 = success, 1 = usage error / not-found, 2 = write error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REL_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));
const DRY = !!args['dry-run'];
const AS_JSON = !!args.json;

const canonicalId = args['canonical-id'];
const archiveIdsRaw = args['archive-ids'];
if (!canonicalId || !archiveIdsRaw) {
  const msg = 'usage: --canonical-id <id> --archive-ids <id[,id...]> [--dry-run] [--json]';
  if (AS_JSON) console.log(JSON.stringify({ ok: false, error: msg }));
  else console.error(msg);
  process.exit(1);
}
const archiveIds = String(archiveIdsRaw).split(',').map((s) => s.trim()).filter(Boolean);

// ─── load entities ─────────────────────────────────────────────────

function loadJsonl(file) {
  return fs.readFileSync(file, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

if (!fs.existsSync(ENT_FILE)) {
  const out = { ok: false, error: `entities.jsonl missing at ${ENT_FILE}` };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.error(out.error);
  process.exit(2);
}

const entities = loadJsonl(ENT_FILE);
const byId = new Map(entities.map((e) => [e.id, e]));

const canonical = byId.get(canonicalId);
if (!canonical) {
  const out = { ok: false, error: `canonical id ${canonicalId} not found in entities.jsonl` };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.error(out.error);
  process.exit(1);
}
const canonicalName = canonical.name;

const archives = [];
const missingIds = [];
for (const aid of archiveIds) {
  const a = byId.get(aid);
  if (!a) missingIds.push(aid);
  else archives.push(a);
}
if (missingIds.length > 0 && archives.length === 0) {
  const out = { ok: false, error: `none of the archive ids exist: ${missingIds.join(', ')}` };
  if (AS_JSON) console.log(JSON.stringify(out));
  else console.error(out.error);
  process.exit(1);
}

// Build the rename map: archive name → canonical name.
const renameMap = new Map();
for (const a of archives) {
  if (a.name && a.name !== canonicalName) renameMap.set(a.name, canonicalName);
  // Also include any aliases the archive carried, so edges that
  // referenced an alias-form get rewritten too.
  if (Array.isArray(a.aliases)) {
    for (const alias of a.aliases) {
      if (alias && alias !== canonicalName) renameMap.set(alias, canonicalName);
    }
  }
}

// ─── merge entity records (in memory) ──────────────────────────────

// 1. Aliases: union archive's name + archive's aliases onto canonical.
canonical.aliases = Array.isArray(canonical.aliases) ? [...canonical.aliases] : [];
const aliasSet = new Set(canonical.aliases.map((s) => (s || '').toLowerCase()));
for (const a of archives) {
  const candidates = [a.name, ...(Array.isArray(a.aliases) ? a.aliases : [])];
  for (const c of candidates) {
    if (!c || c === canonicalName) continue;
    const lc = c.toLowerCase();
    if (lc === canonicalName.toLowerCase()) continue;
    if (!aliasSet.has(lc)) {
      canonical.aliases.push(c);
      aliasSet.add(lc);
    }
  }
}

// 2. Signals: fill blanks on canonical from any archive that has them.
canonical.signals = canonical.signals || {};
for (const a of archives) {
  const aSig = a.signals || {};
  for (const [k, v] of Object.entries(aSig)) {
    if (canonical.signals[k] == null && v != null) canonical.signals[k] = v;
  }
}

// 3. capital_type / class_position: fill if blank on canonical.
for (const a of archives) {
  if (!canonical.capital_type && a.capital_type) canonical.capital_type = a.capital_type;
  if (!canonical.class_position && a.class_position) canonical.class_position = a.class_position;
}

// 4. profile_path: keep canonical's. If canonical has none and archive has one, pull it.
for (const a of archives) {
  if (!canonical.profile_path && a.profile_path) canonical.profile_path = a.profile_path;
}

// 5. Drop archives from the entities list.
const archiveIdSet = new Set(archives.map((a) => a.id));
const newEntities = entities.filter((e) => !archiveIdSet.has(e.id));

// ─── edge rewrite ──────────────────────────────────────────────────

const edgeFiles = [REL_FILE];
if (fs.existsSync(DERIVED_DIR)) {
  for (const f of fs.readdirSync(DERIVED_DIR)) {
    if (f.endsWith('.jsonl')) edgeFiles.push(path.join(DERIVED_DIR, f));
  }
}

let edgesRewritten = 0;
let edgesMerged = 0;
const perFile = [];

if (!DRY) {
  // Need computeEdgeId to recompute ids after rename (matches dedupe-entities behavior).
  const { computeEdgeId } = require('./lib/relationship-edge-validator.cjs');

  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;

    fs.copyFileSync(f, f + '.pre-merge-entity-targeted.bak');

    const edges = loadJsonl(f);
    const out = new Map(); // edge.id → edge
    let fileHits = 0;
    let fileMerges = 0;

    for (const e of edges) {
      let changed = false;
      if (renameMap.has(e.from)) { e.from = renameMap.get(e.from); changed = true; }
      if (renameMap.has(e.to)) { e.to = renameMap.get(e.to); changed = true; }
      if (changed) {
        e.id = computeEdgeId(e);
        fileHits++;
      }
      if (e.id && out.has(e.id)) {
        const existing = out.get(e.id);
        if (e.amount != null) existing.amount = (Number(existing.amount) || 0) + Number(e.amount);
        if (Array.isArray(e.evidence)) {
          existing.evidence = Array.from(new Set([...(existing.evidence || []), ...e.evidence]));
        }
        if (e.first_seen && (!existing.first_seen || e.first_seen < existing.first_seen)) existing.first_seen = e.first_seen;
        if (e.last_verified && (!existing.last_verified || e.last_verified > existing.last_verified)) existing.last_verified = e.last_verified;
        fileMerges++;
      } else {
        out.set(e.id || `__no_id_${out.size}`, e);
      }
    }

    if (fileHits > 0 || fileMerges > 0) {
      const tmp = f + '.tmp';
      const fd = fs.openSync(tmp, 'w');
      try { for (const e of out.values()) fs.writeSync(fd, JSON.stringify(e) + '\n'); }
      finally { fs.closeSync(fd); }
      fs.renameSync(tmp, f);
    }

    edgesRewritten += fileHits;
    edgesMerged += fileMerges;
    perFile.push({ file: path.relative(ROOT, f), hits: fileHits, merges: fileMerges });
  }

  // Write entities last (after edges land safely).
  fs.copyFileSync(ENT_FILE, ENT_FILE + '.pre-merge-entity-targeted.bak');
  const entTmp = ENT_FILE + '.tmp';
  const fd = fs.openSync(entTmp, 'w');
  try { for (const e of newEntities) fs.writeSync(fd, JSON.stringify(e) + '\n'); }
  finally { fs.closeSync(fd); }
  fs.renameSync(entTmp, ENT_FILE);
}

// ─── output ────────────────────────────────────────────────────────

const result = {
  ok: true,
  dry_run: DRY,
  canonical: { id: canonicalId, name: canonicalName },
  archives: archives.map((a) => ({ id: a.id, name: a.name })),
  missing_archive_ids: missingIds,
  rename_map_size: renameMap.size,
  entities_before: entities.length,
  entities_after: newEntities.length,
  edges_rewritten: edgesRewritten,
  edges_merged: edgesMerged,
  per_file: perFile,
};

if (AS_JSON) {
  console.log(JSON.stringify(result));
} else {
  console.log(`merge-entity-targeted: ${DRY ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`  canonical: ${canonicalName} (${canonicalId})`);
  console.log(`  archives:  ${archives.map((a) => `${a.name} (${a.id})`).join(', ') || '(none)'}`);
  if (missingIds.length) console.log(`  missing:   ${missingIds.join(', ')}`);
  console.log(`  entities: ${entities.length} → ${newEntities.length}`);
  if (!DRY) {
    console.log(`  edges rewritten: ${edgesRewritten}, merged on collision: ${edgesMerged}`);
    for (const p of perFile) {
      if (p.hits || p.merges) console.log(`    ${p.file}: ${p.hits} rewrites, ${p.merges} merges`);
    }
  } else {
    console.log(`  (dry-run — no files modified; edge counts not computed)`);
  }
}

process.exit(0);
