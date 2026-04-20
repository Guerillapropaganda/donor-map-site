#!/usr/bin/env node
/**
 * populate-think-tank-eins.cjs
 *
 * Follow-up to coverage-gap-audit: the 11 "nonprofit" entities flagged
 * as EMPTY were 7 real think tanks that needed EINs populated +
 * 4 narrative-analysis pages that were auto-registered as nonprofits
 * by mistake and should have entity_type corrected to "meta".
 *
 * EINs sourced from ProPublica Nonprofit Explorer via web lookup:
 *   https://projects.propublica.org/nonprofits/organizations/<ein>
 *
 * The think-tank entities gain signals.ein so the next IRS 990 bulk
 * re-ingest (when zips are re-downloaded) will include them. Today's
 * partial value: the Ask UI's explainEntity() gloss starts including
 * "EIN <id>" for these profiles.
 *
 * The narrative-page entities get entity_type flipped to 'meta' so
 * they stop appearing in coverage-gap audits and downstream queries.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const WRITE = process.argv.includes('--write');

// EIN map — verified via ProPublica Nonprofit Explorer
const EINS = {
  'Brookings Institution':                     '530196577',
  'Manhattan Institute':                       '132912529',
  'Claremont Institute':                       '953443202',
  'Center for a New American Security':        '208084828',
  'Center on Budget and Policy Priorities':    '521234565',
  'New America':                               '522096845',
  // Hoover doesn't file separately — shares Stanford's EIN. We store
  // it on Hoover but flag that the 990 will come back as Stanford's.
  'Hoover Institution':                        '941156365',
};

// Narrative-analysis pages that were mistakenly registered as
// entity_type=nonprofit. These are vault story pages, not orgs.
const NARRATIVE_PAGE_PREFIXES = [
  'Cross-Think-Tank Donor Map',
  'The Idea Laundering Pipeline',
  'The Revolving Door',
  'The Think Tank Money Map',
];

const ents = loadEntities();
const matchedEin = [];
const matchedNarrative = [];

for (const e of ents) {
  if (EINS[e.name] && !e.signals?.ein) {
    matchedEin.push({ name: e.name, ein: EINS[e.name] });
  }
  for (const pre of NARRATIVE_PAGE_PREFIXES) {
    if (e.name.startsWith(pre) && e.entity_type === 'nonprofit') {
      matchedNarrative.push({ name: e.name, current_type: e.entity_type });
      break;
    }
  }
}

console.log(`[populate-think-tank-eins] ${WRITE ? 'WRITE' : 'dry-run'}`);
console.log(`  entities gaining EIN:                ${matchedEin.length}`);
for (const m of matchedEin) console.log(`    ${m.name.padEnd(44)} EIN ${m.ein}`);
console.log(`  narrative-page entities to reclass:  ${matchedNarrative.length}`);
for (const m of matchedNarrative) console.log(`    ${m.name.slice(0, 60).padEnd(60)} (${m.current_type} → meta)`);

if (!WRITE) {
  console.log(`\n  rerun with --write to apply.`);
  process.exit(0);
}

// Apply — rewrite entities.jsonl
const text = fs.readFileSync(ENT_FILE, 'utf-8');
const out = [];
const einMap = new Map(matchedEin.map((m) => [m.name, m.ein]));
const narrativeNames = new Set(matchedNarrative.map((m) => m.name));
let einsSet = 0, narrativesFixed = 0;

for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) { out.push(line); continue; }
  let rec;
  try { rec = JSON.parse(line); } catch { out.push(line); continue; }
  let changed = false;

  if (einMap.has(rec.name)) {
    rec.signals = rec.signals || {};
    rec.signals.ein = einMap.get(rec.name);
    rec.signals.ein_sourced_from = 'ProPublica Nonprofit Explorer';
    rec.signals.ein_populated_at = new Date().toISOString();
    einsSet++;
    changed = true;
  }
  if (narrativeNames.has(rec.name)) {
    rec.entity_type = 'meta';
    rec.signals = rec.signals || {};
    rec.signals.reclassified_at = new Date().toISOString();
    rec.signals.reclassified_reason = 'narrative-analysis-page-not-entity';
    narrativesFixed++;
    changed = true;
  }

  out.push(changed ? JSON.stringify(rec) : line);
}

fs.writeFileSync(ENT_FILE, out.join('\n'));
console.log(`\n  wrote:`);
console.log(`    ${einsSet} EINs populated`);
console.log(`    ${narrativesFixed} narrative-page entities reclassified to meta`);
