#!/usr/bin/env node
/**
 * class-tag-path-b-producer.cjs
 *
 * Item #3 of handoff cc_p3_173. Walks data/entities.jsonl, finds
 * donor/corporation entities lacking capital_type, classifies them via
 * the editorial folder under content/Donors & Power Networks/, and
 * upserts candidates to the class-tag-path-b-application pipeline class.
 *
 * Tier 1 sweep runs at end (idempotent: re-runs don't double-apply).
 *
 * Usage:
 *   node scripts/class-tag-path-b-producer.cjs            # apply
 *   node scripts/class-tag-path-b-producer.cjs --dry-run  # preview
 *   node scripts/class-tag-path-b-producer.cjs --json     # machine
 *   node scripts/class-tag-path-b-producer.cjs --limit 50 # cap scan
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const AS_JSON = args.includes('--json');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1] || '0', 10) : 0;

const pipeline = require('./lib/editorial-decision-pipeline.cjs');
require('./classes/index.cjs');

const cls = pipeline.getClass('class-tag-path-b-application');
const classModule = require('./classes/class-tag-path-b-application.cjs');
const { HIGH_CONFIDENCE_FOLDERS, AMBIGUOUS_FOLDERS, SKIP_FOLDERS } = classModule;

const records = cls.store.loadAll();

// ─── walk entities.jsonl ──────────────────────────────────────────────

const ENTITIES_PATH = path.join(ROOT, 'data', 'entities.jsonl');
const lines = fs.readFileSync(ENTITIES_PATH, 'utf-8').split(/\r?\n/).filter(Boolean);

const summary = {
  scanned_total: 0,
  scanned_eligible: 0,    // donor/corporation lacking capital_type
  tier1_proposed: 0,
  tier2_proposed: 0,
  skipped_no_folder: 0,
  skipped_folder_blocked: 0,   // Foreign / Israel Lobby
  skipped_folder_unknown: 0,   // folder not in any map
  per_folder_tier1: {},
  per_folder_tier2: {},
  examples_tier1: [],
  examples_tier2: [],
  errors: 0,
};

function extractFolder(profilePath) {
  if (!profilePath) return null;
  const m = profilePath.match(/Donors & Power Networks\/([^\/]+)\//);
  return m ? m[1] : null;
}

for (const line of lines) {
  if (LIMIT && summary.scanned_total >= LIMIT) break;
  let ent;
  try { ent = JSON.parse(line); }
  catch { summary.errors++; continue; }

  summary.scanned_total++;

  if (ent.entity_type !== 'donor' && ent.entity_type !== 'corporation') continue;
  if (ent.capital_type) continue;  // already tagged — leave alone
  summary.scanned_eligible++;

  const folder = extractFolder(ent.profile_path);
  if (!folder) { summary.skipped_no_folder++; continue; }
  if (SKIP_FOLDERS.has(folder)) { summary.skipped_folder_blocked++; continue; }

  let toCapitalType = null;
  let confidence = null;

  if (HIGH_CONFIDENCE_FOLDERS[folder]) {
    toCapitalType = HIGH_CONFIDENCE_FOLDERS[folder];
    confidence = 'tier-1-folder';
  } else if (AMBIGUOUS_FOLDERS[folder]) {
    toCapitalType = AMBIGUOUS_FOLDERS[folder];
    confidence = 'tier-2-folder';
  } else if (AMBIGUOUS_FOLDERS[folder] === null) {
    // Education — explicitly null mapping. Producer surfaces a
    // tier-2-no-proposal record so David can manually pick. To avoid
    // bloating the queue, skip writing for now.
    summary.skipped_folder_blocked++;
    continue;
  } else {
    summary.skipped_folder_unknown++;
    continue;
  }

  const reasoning = `folder="${folder}" → ${toCapitalType} (${confidence})`;

  const candidate = {
    entity_id: ent.id,
    entity_name: ent.name,
    profile_path: ent.profile_path,
    folder,
    sector: ent.signals?.sector || null,
    from_capital_type: ent.capital_type ?? null,
    to_capital_type: toCapitalType,
    confidence,
    reasoning,
  };

  if (confidence === 'tier-1-folder') {
    summary.tier1_proposed++;
    summary.per_folder_tier1[folder] = (summary.per_folder_tier1[folder] || 0) + 1;
    if (summary.examples_tier1.length < 5) {
      summary.examples_tier1.push({ name: ent.name, folder, to: toCapitalType });
    }
  } else {
    summary.tier2_proposed++;
    summary.per_folder_tier2[folder] = (summary.per_folder_tier2[folder] || 0) + 1;
    if (summary.examples_tier2.length < 5) {
      summary.examples_tier2.push({ name: ent.name, folder, to: toCapitalType });
    }
  }

  if (!DRY) {
    cls.store.upsertCandidate(records, candidate);
  }
}

if (!DRY) {
  cls.store.persistAll(records);
}

// Tier 1 sweep
let tier1Result = { skipped: 'dry-run' };
if (!DRY) {
  (async () => {
    try {
      tier1Result = await pipeline.runTier1('class-tag-path-b-application');
    } catch (err) {
      tier1Result = { error: err.message };
    }
    summary.tier1 = tier1Result;
    if (AS_JSON) console.log(JSON.stringify(summary));
    else printHuman(summary);
  })();
} else {
  summary.tier1 = tier1Result;
  if (AS_JSON) console.log(JSON.stringify(summary));
  else printHuman(summary);
}

function printHuman(s) {
  console.log(`class-tag-path-b-producer (${DRY ? 'DRY-RUN' : 'APPLY'})`);
  console.log(`  scanned: ${s.scanned_total} entities total, ${s.scanned_eligible} eligible (donor/corp lacking capital_type)`);
  console.log(`  Tier 1 proposed (auto-applies): ${s.tier1_proposed}`);
  if (s.examples_tier1.length) {
    for (const e of s.examples_tier1) console.log(`    ✓ ${e.name} (${e.folder}) → ${e.to}`);
  }
  console.log(`  Tier 2 proposed (David approves): ${s.tier2_proposed}`);
  if (s.examples_tier2.length) {
    for (const e of s.examples_tier2) console.log(`    ⏸ ${e.name} (${e.folder}) → ${e.to}`);
  }
  console.log(`  per-folder Tier 1 yield:`);
  const t1 = Object.entries(s.per_folder_tier1).sort((a, b) => b[1] - a[1]);
  for (const [f, c] of t1) console.log(`    ${c} × ${f}`);
  console.log(`  per-folder Tier 2 yield:`);
  const t2 = Object.entries(s.per_folder_tier2).sort((a, b) => b[1] - a[1]);
  for (const [f, c] of t2) console.log(`    ${c} × ${f}`);
  console.log(`  skipped: no folder=${s.skipped_no_folder}, blocked folder=${s.skipped_folder_blocked}, unknown folder=${s.skipped_folder_unknown}`);
  if (s.tier1 && !DRY) console.log(`  tier1 sweep: ${JSON.stringify(s.tier1)}`);
  if (s.errors) console.log(`  errors: ${s.errors}`);
}
