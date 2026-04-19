#!/usr/bin/env node
/**
 * build-officer-registry.cjs
 *
 * Extracts named officers from the IRS 990 filings and produces:
 *
 *   1. data/officer-registry.jsonl — one row per (officer, EIN), with:
 *        officer_name, officer_name_normalized, ein, filer_name,
 *        titles[], years[], compensation_total, vault_entity_id (if org is
 *        in vault)
 *      Public cross-reference: anyone can look up a person and see every
 *      c3/c4 board they sit on per 990 filings.
 *
 *   2. content/Admin Notes/board-overlap-report.md — generated report of
 *      officers serving on 2+ distinct EINs (vault-relevant only, so we
 *      filter out single-org spelling variations). Sorted by board count.
 *
 * Matches against data/entities.jsonl by EIN so we can tag which boards
 * are vault-tracked orgs.
 *
 * Usage:
 *   node scripts/build-officer-registry.cjs             # dry-run report
 *   node scripts/build-officer-registry.cjs --write     # write both outputs
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const FILINGS = 'C:\\donor-map-data\\fec\\nonprofit-990.jsonl';
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const REGISTRY_OUT = path.join(ROOT, 'data', 'officer-registry.jsonl');
const REPORT_OUT = path.join(ROOT, 'content', 'Admin Notes', 'board-overlap-report.md');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');

function normName(s) {
  return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/\.$/,'');
}

function cleanOrgName(s) {
  // Canonical casing for display in the overlap report.
  return String(s || '')
    .replace(/&amp;/g, '&')
    .trim();
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

(async function main() {
  console.log(`[build-officer-registry] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // EIN -> vault entity
  const einToEntity = new Map();
  for (const line of fs.readFileSync(ENTITIES, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const ein = r.signals && r.signals.ein;
      if (!ein) continue;
      const clean = String(ein).replace(/\D/g, '');
      if (clean.length === 9) einToEntity.set(clean, { id: r.id, name: r.name, profile_path: r.profile_path });
    } catch {}
  }

  // byName -> Map(ein -> { filer_name, titles: Set, years: Set, comp })
  const byName = new Map();
  let filingsScanned = 0, officersScanned = 0;
  for await (const f of streamJsonl(FILINGS)) {
    filingsScanned++;
    if (!Array.isArray(f.officers) || f.officers.length === 0) continue;
    for (const o of f.officers) {
      officersScanned++;
      const key = normName(o.name);
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, new Map());
      const orgs = byName.get(key);
      if (!orgs.has(f.ein)) {
        orgs.set(f.ein, {
          filer_name: f.filer_name,
          titles: new Set(),
          years: new Set(),
          compensation_total: 0,
        });
      }
      const row = orgs.get(f.ein);
      if (o.title) row.titles.add(o.title);
      if (f.tax_year) row.years.add(f.tax_year);
      row.compensation_total += Number(o.compensation) || 0;
    }
  }
  console.log(`  filings scanned: ${filingsScanned}`);
  console.log(`  officer rows:    ${officersScanned.toLocaleString()}`);
  console.log(`  unique names:    ${byName.size.toLocaleString()}`);

  // Build registry rows
  const registryRows = [];
  const officerBySampleName = new Map(); // normalized -> display case
  for (const [nmKey, orgs] of byName) {
    // Pick the best-casing original name (first seen reasonable one)
    // We don't store an original; just use upper normalized.
    const displayName = nmKey;
    for (const [ein, row] of orgs) {
      const vault = einToEntity.get(ein);
      registryRows.push({
        officer_name: displayName,
        officer_name_normalized: nmKey,
        ein,
        filer_name: row.filer_name,
        titles: [...row.titles],
        years: [...row.years].sort(),
        compensation_total: row.compensation_total,
        vault_entity_id: vault ? vault.id : null,
        vault_org_name: vault ? vault.name : null,
      });
    }
  }
  console.log(`  registry rows:   ${registryRows.length.toLocaleString()}`);

  // Board overlap: officers on >= 2 distinct EINs
  const overlaps = [...byName.entries()]
    .filter(([, orgs]) => orgs.size >= 2)
    .map(([name, orgs]) => {
      const orgList = [...orgs.entries()].map(([ein, row]) => ({
        ein,
        name: cleanOrgName(row.filer_name),
        vault: einToEntity.get(ein) || null,
        years: [...row.years].sort(),
        titles: [...row.titles],
      }));
      const vaultCount = orgList.filter((o) => o.vault).length;
      return { name, org_count: orgs.size, vault_count: vaultCount, orgs: orgList };
    })
    .sort((a, b) => b.vault_count - a.vault_count || b.org_count - a.org_count);

  console.log(`  officers on 2+ boards: ${overlaps.length}`);
  console.log(`  overlaps w/ >=2 vault boards: ${overlaps.filter(o => o.vault_count >= 2).length}`);

  // Generate report
  const reportLines = [];
  reportLines.push('---');
  reportLines.push('title: "Board Overlap Report (IRS 990 Officers)"');
  reportLines.push('status: reference');
  reportLines.push('last-updated: ' + new Date().toISOString().slice(0, 10));
  reportLines.push('generated-by: scripts/build-officer-registry.cjs');
  reportLines.push('---');
  reportLines.push('');
  reportLines.push('# Board Overlap Report');
  reportLines.push('');
  reportLines.push('Officers who appear on 2+ distinct EINs across the IRS 990 filings ingested into the vault. Aggregation is by EIN (not filer name) so multi-year spelling variants collapse correctly.');
  reportLines.push('');
  reportLines.push(`Generated from ${filingsScanned} filings, ${officersScanned.toLocaleString()} officer rows, ${byName.size.toLocaleString()} unique names.`);
  reportLines.push('');
  reportLines.push('## Overlaps where 2+ orgs are in the vault');
  reportLines.push('');
  reportLines.push('These are the highest-signal rows — same person on multiple boards of vault-tracked orgs.');
  reportLines.push('');

  const vaultOverlaps = overlaps.filter((o) => o.vault_count >= 2);
  if (vaultOverlaps.length === 0) {
    reportLines.push('*None found.*');
  } else {
    reportLines.push('| Officer | Boards | Orgs |');
    reportLines.push('|---|---:|---|');
    for (const o of vaultOverlaps) {
      const orgCells = o.orgs
        .map((x) => {
          if (x.vault) return `[[${x.vault.name}]]`;
          return x.name;
        })
        .join(' / ');
      reportLines.push(`| ${o.name} | ${o.org_count} | ${orgCells} |`);
    }
  }

  reportLines.push('');
  reportLines.push('## All overlaps (2+ distinct EINs)');
  reportLines.push('');
  reportLines.push('Includes mixed vault / non-vault appearances. Cross-reference for board-to-board discovery.');
  reportLines.push('');
  reportLines.push('| Officer | Boards | Vault | Orgs |');
  reportLines.push('|---|---:|---:|---|');
  for (const o of overlaps.slice(0, 100)) {
    const orgCells = o.orgs
      .map((x) => (x.vault ? `[[${x.vault.name}]]` : `*${x.name}*`))
      .join(' / ');
    reportLines.push(`| ${o.name} | ${o.org_count} | ${o.vault_count} | ${orgCells} |`);
  }
  if (overlaps.length > 100) {
    reportLines.push('');
    reportLines.push(`*... ${overlaps.length - 100} more not shown. See data/officer-registry.jsonl for full dataset.*`);
  }

  reportLines.push('');
  reportLines.push('## How to use this');
  reportLines.push('');
  reportLines.push('- Rows with 2+ vault boards are candidates for Research Claude: write a person profile for that officer, auto-emit `affiliation` edges, and the vault surfaces the board network.');
  reportLines.push('- Rows with 1 vault board + 1 non-vault board are discovery candidates: the non-vault org may warrant a stub profile.');
  reportLines.push('- Data source: IRS Form 990 Schedule A (officers / key employees, Part VII). Compensation is reportable comp from the filing org only.');
  reportLines.push('');

  if (!WRITE) {
    console.log('\n[dry-run] Sample top 5 vault-overlaps:');
    for (const o of vaultOverlaps.slice(0, 5)) {
      const orgNames = o.orgs.map((x) => x.vault ? x.vault.name : x.name).join(' / ');
      console.log(`  ${o.name}: ${orgNames}`);
    }
    console.log('\n[dry-run] Use --write to produce data/officer-registry.jsonl + content/Admin Notes/board-overlap-report.md');
    return;
  }

  // Write registry
  const jsonl = registryRows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(REGISTRY_OUT, jsonl);
  console.log(`  wrote ${REGISTRY_OUT}`);

  // Write report
  fs.writeFileSync(REPORT_OUT, reportLines.join('\n'));
  console.log(`  wrote ${REPORT_OUT}`);
})().catch(err => { console.error(err); process.exit(1); });
