#!/usr/bin/env node
/**
 * rebuild-relationship-denorm.cjs
 *
 * One-shot cleanup for canonical edge store hygiene debt.
 *
 * Fixes three categories of pre-existing validation errors:
 *   1. Denormalization drift: edge.from_type / edge.to_type / subcategory
 *      fields are stale relative to the current profile. Overwrite with
 *      the live value from the title index.
 *   2. Title naming mismatch: legacy edges point at "_X Master Profile"
 *      while current vault has "X". Try alias-stripping and remap.
 *   3. Stale id hashes: id is a hash of (from, to, type, cycle). After
 *      fields change, id is no longer the expected hash. Recompute.
 *
 * Edges whose from/to can't be resolved by any alias remain untouched
 * and are reported as orphans for manual follow-up.
 *
 * Writes data/relationships.jsonl directly (bypasses upsertEdges to
 * avoid id-collision dupes when recomputing hashes).
 *
 * Usage:
 *   node scripts/rebuild-relationship-denorm.cjs             # dry-run report
 *   node scripts/rebuild-relationship-denorm.cjs --write     # apply
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildTitleIndex,
  normalizeTitle,
  TYPE_META,
} = require('./lib/relationship-edge-validator.cjs');

const ROOT = path.resolve(__dirname, '..');
const EDGE_FILE = path.join(ROOT, 'data', 'relationships.jsonl');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');

function computeEdgeId(edge) {
  const type = edge.type || '';
  const meta = TYPE_META[type];
  let parts;
  if (type === 'monetary' || type === 'government-contract' || type === 'federal-grant') {
    parts = [edge.from, edge.to, type, edge.cycle || ''];
  } else if (type === 'staffing' || type === 'affiliation' || type === 'legal') {
    const dr = edge.date_range || '';
    const start = typeof dr === 'string' && dr.includes('/') ? dr.split('/')[0] : dr;
    parts = [edge.from, edge.to, type, edge.role || '', start];
  } else if (type === 'family' && meta && meta.directed === false) {
    const a = edge.from || '';
    const b = edge.to || '';
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    parts = [lo, hi, type, edge.role || ''];
  } else {
    parts = [edge.from, edge.to, type];
  }
  const key = parts.map((p) => (p == null ? '' : String(p))).join('|');
  return crypto.createHash('sha1').update(key, 'utf8').digest('hex').slice(0, 16);
}

function tryAliases(title) {
  const candidates = new Set([title]);
  // Legacy politician naming: "_Name Master Profile"
  if (/^_.* Master Profile$/.test(title)) {
    candidates.add(title.replace(/^_/, '').replace(/ Master Profile$/, ''));
  }
  // Drop leading underscore only
  if (title.startsWith('_')) candidates.add(title.slice(1));
  // Drop "Master Profile" suffix only
  if (title.endsWith(' Master Profile')) candidates.add(title.replace(/ Master Profile$/, ''));
  return [...candidates];
}

function resolveTitle(title, titleIndex) {
  for (const cand of tryAliases(title)) {
    const norm = normalizeTitle(cand);
    if (!norm) continue;
    const matches = titleIndex.get(norm);
    if (!matches) continue;
    if (!Array.isArray(matches)) return { title: norm, rec: matches, needsSlug: false };
    if (matches.length === 1) return { title: norm, rec: matches[0], needsSlug: false };
    // Collision. Validator requires slug whenever matches.length > 1, even
    // if all matches point to the same profile (index dedup bug). Always
    // set the slug in that case.
    //  a) All matches share the same slug — spurious dup. Pick any, set slug.
    //  b) One match is the profile's primary title. Prefer the primary, set slug.
    const uniqSlugs = new Set(matches.map((m) => m.slug));
    if (uniqSlugs.size === 1) return { title: norm, rec: matches[0], needsSlug: true };
    const primary = matches.filter((m) => !m.aliasOf);
    if (primary.length === 1) return { title: norm, rec: primary[0], needsSlug: true };
    // Still ambiguous — leave to manual review (needs from_slug/to_slug).
  }
  return null;
}

function loadEdgesRaw() {
  const raw = fs.readFileSync(EDGE_FILE, 'utf-8');
  const edges = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try { edges.push(JSON.parse(t)); } catch {}
  }
  return edges;
}

(function main() {
  console.log(`[rebuild-relationship-denorm] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  console.log('Building title index...');
  const titleIndex = buildTitleIndex();
  console.log(`  indexed: ${titleIndex.size} profile titles`);

  console.log('Loading edges...');
  const edges = loadEdgesRaw();
  console.log(`  total edges: ${edges.length.toLocaleString()}`);

  let remapped = 0;
  let denormFixed = 0;
  let idRecomputed = 0;
  let orphanFrom = 0;
  let orphanTo = 0;
  let fullyValid = 0;

  for (const e of edges) {
    let changed = false;

    // Resolve from + to against the title index, with alias fallbacks
    const fromResolve = resolveTitle(e.from, titleIndex);
    const toResolve = resolveTitle(e.to, titleIndex);

    if (fromResolve && fromResolve.title !== e.from) { e.from = fromResolve.title; remapped++; changed = true; }
    if (toResolve && toResolve.title !== e.to) { e.to = toResolve.title; remapped++; changed = true; }

    // Denorm: overwrite from_type/to_type/_subcategory with resolved profile's live values.
    // Also set from_slug/to_slug when the title had collisions (validator requires it).
    if (fromResolve) {
      const live = fromResolve.rec;
      if (e.from_type !== live.type) { e.from_type = live.type; denormFixed++; changed = true; }
      if (live.subcategory && e.from_subcategory !== live.subcategory) {
        e.from_subcategory = live.subcategory; denormFixed++; changed = true;
      }
      if (fromResolve.needsSlug && e.from_slug !== live.slug) {
        e.from_slug = live.slug; denormFixed++; changed = true;
      }
    } else {
      orphanFrom++;
    }
    if (toResolve) {
      const live = toResolve.rec;
      if (e.to_type !== live.type) { e.to_type = live.type; denormFixed++; changed = true; }
      if (live.subcategory && e.to_subcategory !== live.subcategory) {
        e.to_subcategory = live.subcategory; denormFixed++; changed = true;
      }
      if (toResolve.needsSlug && e.to_slug !== live.slug) {
        e.to_slug = live.slug; denormFixed++; changed = true;
      }
    } else {
      orphanTo++;
    }

    // Always recompute id — catches edges with historically-wrong hashes
    // even when current fields are otherwise consistent.
    const newId = computeEdgeId(e);
    if (newId && newId !== e.id) { e.id = newId; idRecomputed++; changed = true; }
    if (!changed) fullyValid++;
  }

  // Dedupe by id (post-recompute collisions possible if two old edges converge to same canonical)
  const byId = new Map();
  let collisions = 0;
  for (const e of edges) {
    if (byId.has(e.id)) {
      collisions++;
      continue;
    }
    byId.set(e.id, e);
  }
  const finalEdges = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  console.log('\nRebuild report:');
  console.log(`  title remaps:          ${remapped.toLocaleString()}`);
  console.log(`  denorm fixes:          ${denormFixed.toLocaleString()}`);
  console.log(`  ids recomputed:        ${idRecomputed.toLocaleString()}`);
  console.log(`  dedupe collisions:     ${collisions.toLocaleString()}`);
  console.log(`  orphan (from unresolved): ${orphanFrom.toLocaleString()}`);
  console.log(`  orphan (to unresolved):   ${orphanTo.toLocaleString()}`);
  console.log(`  fully-valid already:   ${fullyValid.toLocaleString()}`);
  console.log(`  edges in final file:   ${finalEdges.length.toLocaleString()} (was ${edges.length.toLocaleString()})`);

  if (!WRITE) {
    console.log('\n[dry-run] no file changes. Use --write to apply.');
    return;
  }

  console.log('\nWriting data/relationships.jsonl...');
  const tmp = `${EDGE_FILE}.tmp-${process.pid}-${Date.now()}`;
  const body = finalEdges.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(tmp, body, 'utf-8');
  fs.renameSync(tmp, EDGE_FILE);
  console.log('  done.');
})();
