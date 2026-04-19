#!/usr/bin/env node
/**
 * sync-ein-registry.cjs
 *
 * Two-pass registry sync:
 *
 *   PASS 1 — Backfill: walk all profile markdown files under content/.
 *     For each profile whose frontmatter has an `ein:` field, make sure the
 *     corresponding entities.jsonl record has `signals.ein` populated. If
 *     the entity doesn't exist yet (new stub profiles), create it via
 *     entities-store.addOrFindEntity. If the entity exists but signals.ein
 *     is null, patch it via updateEntity.
 *
 *   PASS 2 — Export: emit data/ein-registry.jsonl and data/ein-registry.csv
 *     as public-consumable cross-reference files. Each row:
 *       ein | entity_id | vault_name | vault_url | nonprofit_status |
 *       irs_filer_name (from 990) | has_filings | filing_years
 *
 *     The registry is the bridge between vault profiles and external EIN-
 *     keyed databases (IRS, ProPublica Nonprofit, OpenSecrets by org).
 *
 * Usage:
 *   node scripts/sync-ein-registry.cjs             # dry-run (report only)
 *   node scripts/sync-ein-registry.cjs --write     # apply backfill + export
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const yaml = require('js-yaml');
const entitiesStore = require('./lib/entities-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const FILINGS = 'C:\\donor-map-data\\fec\\nonprofit-990.jsonl';
const REGISTRY_JSONL = path.join(ROOT, 'data', 'ein-registry.jsonl');
const REGISTRY_CSV = path.join(ROOT, 'data', 'ein-registry.csv');
const VAULT_BASE_URL = 'https://thedonormap.org';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');

function walkMd(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['Drafts', 'Decisions', 'Events', 'Admin Notes', 'Checklists', 'Story Seeds', 'Vault Maintenance', 'Archive', 'Phases', 'Assets', '_templates', 'templates', 'Daily Updates'].includes(e.name)) continue;
      out.push(...walkMd(full));
    } else if (e.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]) || {}; } catch { return null; }
}

function cleanEin(s) {
  if (!s) return null;
  const c = String(s).replace(/\D/g, '');
  return c.length === 9 ? c : null;
}

function relProfilePath(absPath) {
  return path.relative(ROOT, absPath).replace(/\\/g, '/');
}

function profileUrlFromPath(relPath) {
  // content/Foo/Bar.md  ->  /Foo/Bar
  const withoutContent = relPath.replace(/^content\//, '');
  const withoutExt = withoutContent.replace(/\.md$/, '');
  return `${VAULT_BASE_URL}/${encodeURI(withoutExt)}`;
}

async function* streamJsonl(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try { yield JSON.parse(line); } catch {}
  }
}

function entityTypeFromFmType(t) {
  const v = String(t || '').toLowerCase();
  if (['donor', 'pac', 'corporation', 'politician', 'state-politician'].includes(v)) return v;
  if (v === 'think-tank' || v === 'thinktank') return 'donor';
  return 'other';
}

(async function main() {
  console.log(`[sync-ein-registry] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // ─── PASS 1: Backfill ────────────────────────────────────────────────
  console.log('PASS 1 — scanning profiles for ein: frontmatter...');
  const files = walkMd(CONTENT);
  const profileEins = []; // { ein, title, type, profile_path, nonprofit_status }
  for (const file of files) {
    const fm = parseFrontmatter(file);
    if (!fm || !fm.ein) continue;
    const ein = cleanEin(fm.ein);
    if (!ein) continue;
    profileEins.push({
      ein,
      title: fm.title || path.basename(file, '.md'),
      type: fm.type,
      profile_path: relProfilePath(file),
      nonprofit_status: fm['nonprofit-status'] || null,
    });
  }
  console.log(`  profiles with ein:  ${profileEins.length}`);

  // Apply backfill
  let created = 0, patched = 0, unchanged = 0;
  const existing = entitiesStore.loadEntities();
  const byPath = new Map(existing.filter(r => r.profile_path).map(r => [r.profile_path, r]));
  const byName = new Map(existing.map(r => [String(r.name || '').toLowerCase().trim(), r]));

  for (const p of profileEins) {
    let ent = byPath.get(p.profile_path) || byName.get(p.title.toLowerCase().trim());
    if (!ent) {
      if (WRITE) {
        ent = entitiesStore.addOrFindEntity({
          name: p.title,
          profile_path: p.profile_path,
          entity_type: entityTypeFromFmType(p.type),
          signals: {
            naics: null,
            sector: null,
            ein: p.ein,
            party_breakdown: null,
            top_politicians_funded: [],
            total_political_spend: null,
            body_snippet: null,
            signals_gathered_at: new Date().toISOString(),
          },
        });
      }
      created++;
      continue;
    }
    const current = ent.signals && ent.signals.ein;
    if (current === p.ein) { unchanged++; continue; }
    if (current && current !== p.ein) {
      console.log(`  [conflict] ${p.title}: frontmatter=${p.ein} store=${current} (keeping store)`);
      unchanged++;
      continue;
    }
    // Backfill
    if (WRITE) {
      entitiesStore.updateEntity(ent.id, { signals: { ein: p.ein } });
    }
    patched++;
  }
  console.log(`  created: ${created}, backfilled ein: ${patched}, unchanged: ${unchanged}`);

  // ─── PASS 2: Export registry ─────────────────────────────────────────
  console.log('\nPASS 2 — building EIN registry export...');

  // Reload entities after potential writes
  entitiesStore.clearEntitiesCache();
  const allEntities = entitiesStore.loadEntities();

  // Build EIN → filing summary from 990 data
  const filingsByEin = new Map();
  for await (const f of streamJsonl(FILINGS)) {
    if (!f.ein) continue;
    if (!filingsByEin.has(f.ein)) filingsByEin.set(f.ein, { filer_name: f.filer_name, years: new Set() });
    filingsByEin.get(f.ein).years.add(f.tax_year);
  }
  console.log(`  EINs with 990 filings: ${filingsByEin.size}`);

  // Union of EINs: vault entities + filings
  const allEins = new Set();
  for (const e of allEntities) {
    const ein = cleanEin(e.signals && e.signals.ein);
    if (ein) allEins.add(ein);
  }
  for (const ein of filingsByEin.keys()) allEins.add(ein);

  const rows = [];
  const entByEin = new Map();
  for (const e of allEntities) {
    const ein = cleanEin(e.signals && e.signals.ein);
    if (ein) entByEin.set(ein, e);
  }

  for (const ein of allEins) {
    const ent = entByEin.get(ein);
    const fil = filingsByEin.get(ein);
    const years = fil ? [...fil.years].filter(Boolean).sort() : [];
    rows.push({
      ein,
      entity_id: ent ? ent.id : null,
      vault_name: ent ? ent.name : null,
      vault_url: ent && ent.profile_path ? profileUrlFromPath(ent.profile_path) : null,
      profile_path: ent ? ent.profile_path : null,
      irs_filer_name: fil ? fil.filer_name : null,
      has_990_filings: fil ? true : false,
      filing_years: years,
      in_vault: ent ? true : false,
    });
  }

  rows.sort((a, b) => {
    if (a.in_vault !== b.in_vault) return a.in_vault ? -1 : 1;
    return (a.vault_name || '').localeCompare(b.vault_name || '');
  });

  console.log(`  total registry rows: ${rows.length} (vault-linked: ${rows.filter(r=>r.in_vault).length})`);

  if (WRITE) {
    const jsonl = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(REGISTRY_JSONL, jsonl);
    const csvHeader = 'ein,entity_id,vault_name,vault_url,profile_path,irs_filer_name,has_990_filings,filing_years,in_vault';
    const csvRows = rows.map(r => [
      r.ein,
      r.entity_id || '',
      csvEscape(r.vault_name),
      r.vault_url || '',
      csvEscape(r.profile_path),
      csvEscape(r.irs_filer_name),
      r.has_990_filings,
      r.filing_years.join('|'),
      r.in_vault,
    ].join(','));
    fs.writeFileSync(REGISTRY_CSV, csvHeader + '\n' + csvRows.join('\n') + '\n');
    console.log(`  wrote ${REGISTRY_JSONL}`);
    console.log(`  wrote ${REGISTRY_CSV}`);
  } else {
    console.log('  [dry-run] not writing files');
  }
})().catch(err => { console.error(err); process.exit(1); });

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
