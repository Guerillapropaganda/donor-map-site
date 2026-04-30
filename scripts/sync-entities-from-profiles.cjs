#!/usr/bin/env node
/**
 * sync-entities-from-profiles.cjs
 *
 * Surfaced 2026-04-30 (cc_p3_208) by reconciliation-framework-tier-1
 * which flagged 12+ entity names referenced in edges that have no
 * record in entities.jsonl — including Volodymyr Zelenskyy whose
 * profile exists at content/Politicians/International/Volodymyr
 * Zelenskyy.md but never got an entity record.
 *
 * Walks the vault's profile directories and ensures every profile has
 * a matching entities.jsonl record. Only creates new records — never
 * mutates existing ones. Entity_type is inferred from the profile path
 * (Politicians directory → politician, Donors → donor, Think Tanks → think_tank, etc.).
 *
 * Usage:
 *   node scripts/sync-entities-from-profiles.cjs            # dry-run
 *   node scripts/sync-entities-from-profiles.cjs --apply
 */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { loadEntities, addOrFindEntity, findByProfilePath } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

// Profile directories to scan, with a function that maps a profile path
// to an entity_type. Order matters — first matching prefix wins.
const PROFILE_DIRS = [
  { prefix: 'content/Politicians/', type: () => 'politician' },
  { prefix: 'content/Think Tanks & Policy Infrastructure/', type: () => 'think_tank' },
  { prefix: 'content/Media & Influence Pipeline/', type: () => 'media-profile' },
  { prefix: 'content/Donors & Power Networks/', type: (rel) => {
    if (rel.includes('/Lobbying') || rel.includes('Lobbying Firm')) return 'lobbying_firm';
    if (rel.includes('Labor Union')) return 'union';
    if (rel.includes('Nonprofit')) return 'nonprofit';
    if (rel.includes('Corporation') || rel.includes('Corporate')) return 'corporation';
    return 'donor';
  } },
];

function walkMd(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === '_archive') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMd(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function shouldSkip(rel, frontmatter) {
  // Skip template / index / register / contents-of-folder pages.
  const base = path.basename(rel).toLowerCase();
  if (base.startsWith('_index') || base === 'index.md' || base.endsWith('register.md') || base.includes('template')) return true;
  if (frontmatter?.template === true) return true;
  if (frontmatter?.['profile-type'] === 'meta-page') return true;
  // Type "meta" pages are navigation indexes, not entities. Skip.
  if (frontmatter?.type === 'meta' || frontmatter?.type === 'index') return true;

  // Redirect stubs — profile points at canonical entity elsewhere.
  // Title typically suffixed "(Redirect)"; frontmatter may have redirect-to.
  const title = frontmatter?.title || '';
  if (/\(Redirect\)/i.test(title) || frontmatter?.['redirect-to']) return true;
  if (frontmatter?.['profile-status'] === 'redirect') return true;

  // Framework / Master / Index / Database meta-docs filed in
  // entity-shaped directories (e.g. _Think Tank Framework.md). They
  // exist for navigation/intro context, not as entities. Heuristic:
  // filename starts with `_` and is NOT a `*Master Profile.md`.
  const fname = path.basename(rel);
  if (fname.startsWith('_') && !/Master Profile\.md$/i.test(fname)) return true;
  // Filename ends with Framework / Database / Master Index without
  // Master Profile — same meta-doc shape.
  if (/(Framework|Master Index|Master Database|Database)\.md$/i.test(fname)) return true;

  // Path-shape filter: only count files that match the established
  // entity-profile patterns (learned from entities.jsonl 2026-04-30).
  //   - Politicians: `_Name Master Profile.md` OR top-level files in
  //     `Politicians/International/Name.md` (international flat)
  //   - Donors / Power Networks: `Donors.../Sector/Name.md` (2 deep)
  //   - Think Tanks: `Think Tanks.../Name.md` (1 deep)
  //   - Media: `Media.../Name.md` (1 deep)
  // Anything else (sub-notes inside a politician's folder, claim
  // synthesis docs, internal research notes) is NOT an entity.
  const norm = rel.replace(/\\/g, '/');
  const isMasterProfile = /_[^/]+Master Profile\.md$/i.test(norm);
  const isPoliticianIntFlat = /^content\/Politicians\/International\/[^/]+\.md$/.test(norm);
  const isPoliticianFlat = /^content\/Politicians\/(Democrats|Republicans|Independent)\/(Former)\/[^/]+\.md$/.test(norm);
  const isDonor2Deep = /^content\/Donors[^/]*\/[^/]+\/[^/]+\.md$/.test(norm);
  const isThinkTank1Deep = /^content\/Think Tanks[^/]*\/[^/]+\.md$/.test(norm);
  const isMedia1Deep = /^content\/Media[^/]*\/[^/]+\.md$/.test(norm);
  const matchesShape = isMasterProfile || isPoliticianIntFlat || isPoliticianFlat || isDonor2Deep || isThinkTank1Deep || isMedia1Deep;
  if (!matchesShape) return true;
  return false;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]); } catch { return null; }
}

function nameFromPath(rel) {
  const base = path.basename(rel, '.md');
  return base.replace(/^_/, '').replace(/\s*Master Profile\s*$/i, '').trim();
}

function main() {
  console.log(`[sync-entities] ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  loadEntities();

  let scanned = 0, alreadyTracked = 0, skipped = 0, created = 0;
  const samples = { created: [], skipped: [] };
  const errors = [];

  for (const dirSpec of PROFILE_DIRS) {
    const fullDir = path.join(ROOT, dirSpec.prefix);
    const files = walkMd(fullDir);
    for (const abs of files) {
      const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
      scanned++;
      let text;
      try { text = fs.readFileSync(abs, 'utf-8'); } catch { errors.push({ rel, err: 'read-failed' }); continue; }
      const frontmatter = parseFrontmatter(text) || {};
      if (shouldSkip(rel, frontmatter)) {
        skipped++;
        if (samples.skipped.length < 3) samples.skipped.push(rel);
        continue;
      }
      const existing = findByProfilePath(rel);
      if (existing) { alreadyTracked++; continue; }
      const name = (frontmatter?.title || nameFromPath(rel)).trim();
      if (!name) { skipped++; continue; }
      const type = dirSpec.type(rel);
      if (!APPLY) {
        created++;
        if (samples.created.length < 30) samples.created.push({ rel, name, type });
        continue;
      }
      try {
        addOrFindEntity({ name, profile_path: rel, entity_type: type });
        created++;
        if (samples.created.length < 30) samples.created.push({ rel, name, type });
      } catch (err) {
        errors.push({ rel, name, err: err.message });
      }
    }
  }

  console.log(`  scanned: ${scanned}`);
  console.log(`  already tracked: ${alreadyTracked}`);
  console.log(`  skipped (template/index/meta): ${skipped}`);
  console.log(`  created: ${created}${APPLY ? '' : ' (would create)'}`);
  if (errors.length) console.log(`  errors: ${errors.length}`);

  if (samples.created.length > 0) {
    console.log('\n  sample created:');
    for (const s of samples.created) console.log(`    ${s.rel} → name=${s.name}, type=${s.type}`);
  }
  if (errors.length > 0) {
    console.log('\n  errors (first 5):');
    for (const e of errors.slice(0, 5)) console.log(`    ${e.rel}: ${e.err}`);
  }
  if (!APPLY) console.log('\n  rerun with --apply to write changes.');
}
main();
