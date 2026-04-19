#!/usr/bin/env node
/**
 * sync-politicians-to-entities.cjs
 *
 * Walks content/Politicians/**, reads each profile's frontmatter, and
 * upserts a matching politician record into data/entities.jsonl for any
 * politician that exists as a profile + has edges in the store but is
 * missing from the entity registry. Fixes the "tell me about Bill
 * Hagerty" → findEntity returns null bug surfaced in the query audit.
 *
 * Safe to re-run. Uses addOrFindEntity which skips by name + profile_path.
 *
 * Usage:
 *   node scripts/sync-politicians-to-entities.cjs          # dry-run report
 *   node scripts/sync-politicians-to-entities.cjs --write  # apply
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { addOrFindEntity, loadEntities } = require('./lib/entities-store.cjs');
const { loadEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const POLITICIANS_DIR = path.join(ROOT, 'content', 'Politicians');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

function walkPoliticians() {
  const hits = [];
  const stack = [POLITICIANS_DIR];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { stack.push(full); continue; }
      if (!ent.name.endsWith('.md')) continue;
      // Only process master-profile files per the Politicians/ layout:
      //   _<Name> Master Profile.md
      // Other .md files in the same folder are sub-note essays, not
      // politician entities — skip them.
      if (!/^_.+ Master Profile\.md$/i.test(ent.name)) continue;
      try {
        const text = fs.readFileSync(full, 'utf-8');
        const m = text.match(/^---\n([\s\S]*?)\n---/);
        if (!m) continue;
        const fm = yaml.load(m[1]) || {};
        if (!fm.title) continue;
        hits.push({
          path: full.replace(ROOT + path.sep, '').replace(/\\/g, '/'),
          fm,
        });
      } catch {}
    }
  }
  return hits;
}

(function main() {
  console.log(`[sync-politicians-to-entities] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  const existingEntities = loadEntities();
  const byName = new Map(existingEntities.map((e) => [e.name, e]));
  const byPath = new Map(existingEntities.map((e) => [e.profile_path, e]).filter(([p]) => p));

  const profiles = walkPoliticians();
  console.log(`  profiles scanned: ${profiles.length}`);
  console.log(`  entities already in registry: ${existingEntities.length}\n`);

  let created = 0;
  let skipped = 0;
  let missingBefore = [];

  for (const { path: profilePath, fm } of profiles) {
    const name = fm.title;
    const hasEntity = byName.has(name) || byPath.has(profilePath);
    if (hasEntity) { skipped++; continue; }

    missingBefore.push(name);

    // Build the new politician entity record. Pull whatever frontmatter
    // data we have — party, state, chamber — into signals so it's
    // queryable downstream.
    const partyRaw = (fm.party || '').toString().trim();
    const state = (fm.state || '').toString().trim();
    const chamber = (fm.chamber || '').toString().trim();
    const bioguide = fm['bioguide-id'] || fm['bioguide'] || null;
    const sector = chamber ? `${chamber.charAt(0).toUpperCase() + chamber.slice(1)} — ${state || 'US'}` : 'Politicians';

    const partial = {
      name,
      entity_type: 'politician',
      profile_path: profilePath,
      signals: {
        party: partyRaw || null,
        state: state || null,
        chamber: chamber || null,
        bioguide_id: bioguide,
        sector,
        content_readiness: fm['content-readiness'] || 'raw',
      },
    };

    if (!WRITE) {
      if (VERBOSE) console.log(`  WOULD CREATE: ${name} (${partyRaw}, ${state || '?'}, ${chamber || '?'})`);
      created++;
      continue;
    }

    try {
      addOrFindEntity(partial);
      created++;
      if (VERBOSE) console.log(`  created: ${name}`);
    } catch (err) {
      console.error(`  FAILED: ${name} — ${err.message}`);
    }
  }

  // Second pass: politicians that appear as edge targets but have
  // neither a profile file nor an entity record. Create stub entity
  // records for these so query flows (findEntity, /ask summary) don't
  // return null. Research Claude owns profile creation — we're just
  // filling the registry gap.
  const edges = loadEdges();
  const politicianTargets = new Set();
  for (const e of edges) {
    if (e.type === 'monetary' && e.amount && e.to_type === 'politician') {
      politicianTargets.add(e.to);
    }
  }
  // Rebuild name index after pass 1 writes
  const updatedEnts = loadEntities();
  const updatedByName = new Set(updatedEnts.map((e) => e.name));
  const stubTargets = [...politicianTargets].filter((n) => !updatedByName.has(n));
  let stubsCreated = 0;
  for (const name of stubTargets) {
    if (!WRITE) {
      if (VERBOSE) console.log(`  WOULD CREATE STUB: ${name} (no profile file, but has monetary edges)`);
      stubsCreated++;
      continue;
    }
    try {
      addOrFindEntity({
        name,
        entity_type: 'politician',
        signals: {
          sector: 'Politicians',
          content_readiness: 'raw',
          stub_reason: 'appears in edge store but no profile file yet',
        },
      });
      stubsCreated++;
      if (VERBOSE) console.log(`  stub created: ${name}`);
    } catch (err) {
      console.error(`  FAILED stub: ${name} — ${err.message}`);
    }
  }

  console.log(`\nResults:`);
  console.log(`  already in registry:  ${skipped}`);
  console.log(`  ${WRITE ? 'created from profiles' : 'would create from profiles'}: ${created}`);
  console.log(`  ${WRITE ? 'stub entities for edge-only politicians' : 'would create stubs'}: ${stubsCreated}`);
  if (stubsCreated > 0 && !WRITE) {
    console.log('\nStub names (have edges but no profile — flagged for Research Claude):');
    stubTargets.slice(0, 30).forEach((n) => console.log('  ' + n));
    if (stubTargets.length > 30) console.log('  ...and ' + (stubTargets.length - 30) + ' more');
  }

  if (!WRITE) {
    if (missingBefore.length) {
      console.log(`\nNames that would be created:`);
      missingBefore.slice(0, 50).forEach((n) => console.log(`  ${n}`));
      if (missingBefore.length > 50) console.log(`  ...and ${missingBefore.length - 50} more`);
    }
    console.log(`\n[dry-run] no writes. Use --write to apply.`);
  }
})();
