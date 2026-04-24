#!/usr/bin/env node
/**
 * audit-entity-classification.cjs
 *
 * Pattern B audit. Reports mismatches between:
 *   - folder bucket (under content/Donors & Power Networks/<bucket>/)
 *   - entity-store `signals.sector`
 *   - entity-store `capital_type`
 *   - frontmatter `sector` field (if present)
 *
 * The Marble Freedom Trust bug: profile at Super PACs/ folder →
 * signals.sector = "Super PACs" → compare table labels it a super
 * PAC. But MFT is structurally a 501(c)(4) dark-money vehicle (same
 * as Sixteen Thirty Fund at Dark Money/ folder).
 *
 * Drift categories this flags:
 *   A. FOLDER_VS_SECTOR: folder says X, signals.sector says Y
 *   B. FOLDER_VS_CAPITAL: folder says "Super PACs" but capital_type
 *      is "dark-money-vehicle" (or vice versa)
 *   C. FRONTMATTER_VS_ENTITY: frontmatter says X, entity store says Y
 *   D. MISSING_CAPITAL: entity_type=donor but capital_type is null
 *      (we lost the ability to classify)
 *
 * Read-only by default. Run with --write to apply the "use frontmatter
 * sector as source of truth" rewrite to entities.jsonl + move the
 * profile to match (manual step — script reports moves, doesn't execute
 * them to preserve git history).
 *
 * Usage:
 *   node scripts/audit-entity-classification.cjs
 *   node scripts/audit-entity-classification.cjs --csv > audit.csv
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CSV = process.argv.includes('--csv');

const FOLDER_ROOT = path.join(ROOT, 'content', 'Donors & Power Networks');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');

function loadEntities() {
  const out = new Map();
  if (!fs.existsSync(ENT_FILE)) return out;
  for (const line of fs.readFileSync(ENT_FILE, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e.name) out.set(e.name, e);
    } catch {}
  }
  return out;
}

function walkProfiles(dir, hits) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walkProfiles(f, hits);
    else if (e.name.endsWith('.md')) hits.push(f);
  }
}

function extractFolderBucket(profilePath) {
  // content/Donors & Power Networks/<bucket>/<subpath>
  const m = profilePath.match(/Donors & Power Networks[\\/]([^\\/]+)/);
  return m ? m[1] : null;
}

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  const body = m[1];
  const title = body.match(/^title:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const sector = body.match(/^sector:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const type = body.match(/^type:\s*["']?([^"'\n]+?)["']?\s*$/m);
  const structural = body.match(/^structural[-_]role:\s*["']?([^"'\n]+?)["']?\s*$/m);
  if (title) fm.title = title[1].trim();
  if (sector) fm.sector = sector[1].trim();
  if (type) fm.type = type[1].trim();
  if (structural) fm.structural_role = structural[1].trim();
  return fm;
}

function main() {
  const ents = loadEntities();
  const profiles = [];
  if (fs.existsSync(FOLDER_ROOT)) walkProfiles(FOLDER_ROOT, profiles);

  const mismatches = [];
  for (const p of profiles) {
    const text = fs.readFileSync(p, 'utf-8');
    const fm = extractFrontmatter(text);
    if (!fm || !fm.title) continue;
    // Only review donor-like profiles (not events/stories/etc.)
    const t = (fm.type || '').toLowerCase();
    if (!t || !['donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm'].includes(t)) continue;
    const folderBucket = extractFolderBucket(p);
    const ent = ents.get(fm.title);
    const entSector = ent?.signals?.sector || null;
    const entCapital = ent?.capital_type || null;
    const entStructural = ent?.signals?.structural_role || null;
    const flags = [];
    if (folderBucket && entSector && folderBucket !== entSector) {
      flags.push(`FOLDER_VS_SECTOR: folder="${folderBucket}" entity.sector="${entSector}"`);
    }
    if (fm.sector && entSector && fm.sector !== entSector) {
      flags.push(`FRONTMATTER_VS_ENTITY_SECTOR: fm.sector="${fm.sector}" entity.sector="${entSector}"`);
    }
    if (folderBucket === 'Super PACs' && entCapital === 'dark-money-vehicle') {
      flags.push('FOLDER_CONTRADICTS_CAPITAL: in Super PACs/ but capital_type=dark-money-vehicle');
    }
    if (folderBucket === 'Dark Money' && (entCapital === 'super-pac' || entStructural === 'super-pac')) {
      flags.push('FOLDER_CONTRADICTS_CAPITAL: in Dark Money/ but classed as super-pac');
    }
    if (t === 'donor' && !entCapital) {
      flags.push('MISSING_CAPITAL_TYPE');
    }
    if (flags.length) {
      mismatches.push({ title: fm.title, folder: folderBucket, entSector, entCapital, flags, path: p });
    }
  }

  if (CSV) {
    console.log('title,folder,entity_sector,capital_type,flags,profile_path');
    for (const m of mismatches) {
      const esc = (s) => s == null ? '' : `"${String(s).replace(/"/g, '""')}"`;
      console.log([m.title, m.folder, m.entSector, m.entCapital, m.flags.join('; '), m.path].map(esc).join(','));
    }
    return;
  }

  // Summary report
  const byFlag = new Map();
  for (const m of mismatches) {
    for (const f of m.flags) {
      const key = f.split(':')[0];
      byFlag.set(key, (byFlag.get(key) || 0) + 1);
    }
  }
  console.log(`Audited ${profiles.length} donor-network profiles. ${mismatches.length} have classification drift.\n`);
  console.log('Drift by category:');
  for (const [k, v] of [...byFlag.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }
  console.log('\nFirst 30 mismatches:');
  for (const m of mismatches.slice(0, 30)) {
    console.log(`\n  ${m.title}  (folder=${m.folder} sector=${m.entSector} capital=${m.entCapital})`);
    for (const f of m.flags) console.log(`    • ${f}`);
  }
  if (mismatches.length > 30) console.log(`\n  ... and ${mismatches.length - 30} more. Re-run with --csv for full list.`);
}

main();
