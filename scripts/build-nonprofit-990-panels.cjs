#!/usr/bin/env node
/**
 * build-nonprofit-990-panels.cjs
 *
 * Injects an "IRS 990 Nonprofit Data" auto-block into every vault entity
 * that has a known EIN (signals.ein in data/entities.jsonl) and at least
 * one filing in nonprofit-990.jsonl.
 *
 * Renders:
 *   - Years filed, latest total revenue / expenses / assets
 *   - Top 20 grant recipients (if grant_total > 0 across any filing)
 *   - Total dollars out, unique recipient count
 *
 * Inputs:
 *   C:\donor-map-data\fec\nonprofit-990.jsonl
 *   C:\donor-map-data\fec\nonprofit-grants.jsonl
 *   data/entities.jsonl
 *
 * Auto-block markers: <!-- auto:irs-990 start --> ... end -->
 * Idempotent: re-running rewrites block; no edits outside markers.
 *
 * Usage:
 *   node scripts/build-nonprofit-990-panels.cjs             # dry-run
 *   node scripts/build-nonprofit-990-panels.cjs --write     # apply
 *   node scripts/build-nonprofit-990-panels.cjs --write --profile "Marble"
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const FILINGS = 'C:\\donor-map-data\\fec\\nonprofit-990.jsonl';
const GRANTS = 'C:\\donor-map-data\\fec\\nonprofit-grants.jsonl';
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');
const profileFlag = args.indexOf('--profile');
const PROFILE_FILTER = profileFlag !== -1 ? args[profileFlag + 1] : null;

const BLOCK_START = '<!-- auto:irs-990 start -->';
const BLOCK_END = '<!-- auto:irs-990 end -->';

function fmtUsd(n) {
  if (!n || typeof n !== 'number') return '—';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
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

async function buildIndexes() {
  // EIN → { entity_id, name, profile_path, entity_type }
  const einToEntity = new Map();
  for (const line of fs.readFileSync(ENTITIES, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const ein = r.signals && r.signals.ein;
      if (!ein) continue;
      const clean = String(ein).replace(/\D/g, '');
      if (clean.length !== 9) continue;
      einToEntity.set(clean, {
        entity_id: r.id,
        name: r.name,
        profile_path: r.profile_path,
        entity_type: r.entity_type,
      });
    } catch {}
  }
  console.log(`  entities with EIN: ${einToEntity.size}`);

  // EIN → array of filings (sorted latest first)
  const filingsByEin = new Map();
  let filingCount = 0;
  for await (const f of streamJsonl(FILINGS)) {
    if (!f.ein) continue;
    filingCount++;
    if (!filingsByEin.has(f.ein)) filingsByEin.set(f.ein, []);
    filingsByEin.get(f.ein).push(f);
  }
  for (const list of filingsByEin.values()) list.sort((a, b) => (b.tax_year || 0) - (a.tax_year || 0));
  console.log(`  filings: ${filingCount} across ${filingsByEin.size} EINs`);

  // grantor_ein -> Map(recipient_name_normalized -> { name, ein, total, count, years })
  // recipient_ein -> Map(grantor_ein -> { grantor_name, total, count, years })
  const grantsByEin = new Map();
  const grantsInByEin = new Map();
  let grantCount = 0;
  for await (const g of streamJsonl(GRANTS)) {
    if (!g.grantor_ein) continue;
    grantCount++;

    // Outgoing (existing)
    if (!grantsByEin.has(g.grantor_ein)) grantsByEin.set(g.grantor_ein, new Map());
    const inner = grantsByEin.get(g.grantor_ein);
    const key = g.recipient_name_normalized || g.recipient_name || '(unknown)';
    if (!inner.has(key)) {
      inner.set(key, { name: g.recipient_name, ein: g.recipient_ein, total: 0, count: 0, years: new Set() });
    }
    const row = inner.get(key);
    row.total += Number(g.amount) || 0;
    row.count++;
    if (g.tax_year) row.years.add(g.tax_year);

    // Incoming (new)
    const recEin = g.recipient_ein ? String(g.recipient_ein).replace(/\D/g, '') : null;
    if (recEin && recEin.length === 9) {
      if (!grantsInByEin.has(recEin)) grantsInByEin.set(recEin, new Map());
      const innerIn = grantsInByEin.get(recEin);
      if (!innerIn.has(g.grantor_ein)) {
        innerIn.set(g.grantor_ein, { grantor_name: g.grantor_name, grantor_ein: g.grantor_ein, total: 0, count: 0, years: new Set() });
      }
      const rowIn = innerIn.get(g.grantor_ein);
      rowIn.total += Number(g.amount) || 0;
      rowIn.count++;
      if (g.tax_year) rowIn.years.add(g.tax_year);
    }
  }
  console.log(`  grants: ${grantCount} rows across ${grantsByEin.size} grantors, ${grantsInByEin.size} recipient-EINs`);

  return { einToEntity, filingsByEin, grantsByEin, grantsInByEin };
}

function renderPanel(ein, idx) {
  const filings = idx.filingsByEin.get(ein);
  const grants = idx.grantsByEin.get(ein);
  const grantsIn = idx.grantsInByEin.get(ein);
  if ((!filings || filings.length === 0) && (!grantsIn || grantsIn.size === 0)) return null;
  // Allow a panel for recipient-only orgs (no filings ingested for them but they
  // appear as recipients in other orgs' Schedule I).

  const lines = [''];
  lines.push('*IRS Form 990 data from bulk e-file releases. Tax years listed are by filing period end.*');
  lines.push('');

  let yearRange = '—';
  if (filings && filings.length > 0) {
    const years = filings.map(f => f.tax_year).filter(Boolean).sort();
    yearRange = years.length ? `${years[0]}–${years[years.length - 1]}` : '—';
    const latest = filings[0];

    lines.push(`**Filings available:** ${filings.length} (${yearRange})`);
    lines.push('');
    lines.push('**Most recent filing (' + (latest.tax_year || '—') + '):**');
    lines.push('');
    lines.push('| Metric | Amount |');
    lines.push('|---|---:|');
    lines.push(`| Total revenue | ${fmtUsd(latest.total_revenue)} |`);
    lines.push(`| Contribution revenue | ${fmtUsd(latest.contribution_revenue)} |`);
    lines.push(`| Total expenses | ${fmtUsd(latest.total_expenses)} |`);
    lines.push(`| Total assets (EOY) | ${fmtUsd(latest.total_assets)} |`);
    lines.push(`| Grants paid out | ${fmtUsd(latest.grant_total)} |`);
  } else {
    lines.push('*No own 990 filings ingested yet; data below is from other organizations\' Schedule I records showing grants received.*');
  }

  // Grants out summary
  if (grants && grants.size > 0) {
    const allGrants = [...grants.values()].sort((a, b) => b.total - a.total);
    const totalOut = allGrants.reduce((a, g) => a + g.total, 0);

    lines.push('');
    lines.push(`**Lifetime grants out (${yearRange}):** ${fmtUsd(totalOut)} across ${allGrants.length.toLocaleString()} recipients.`);
    lines.push('');
    lines.push('**Top 20 recipients:**');
    lines.push('');
    lines.push('| Recipient | Total | Grants | Years |');
    lines.push('|---|---:|---:|---|');
    for (const r of allGrants.slice(0, 20)) {
      const yrs = [...r.years].sort();
      const yrRange = yrs.length === 0 ? '—' : yrs.length === 1 ? String(yrs[0]) : `${yrs[0]}–${yrs[yrs.length - 1]}`;
      lines.push(`| ${r.name} | ${fmtUsd(r.total)} | ${r.count} | ${yrRange} |`);
    }
  }

  // Grants IN (who funded this org)
  if (grantsIn && grantsIn.size > 0) {
    const allIn = [...grantsIn.values()].sort((a, b) => b.total - a.total);
    const totalIn = allIn.reduce((a, g) => a + g.total, 0);
    const inYears = new Set();
    for (const r of allIn) for (const y of r.years) inYears.add(y);
    const inYearsSorted = [...inYears].sort();
    const inRange = inYearsSorted.length === 0 ? '—' : inYearsSorted.length === 1 ? String(inYearsSorted[0]) : `${inYearsSorted[0]}–${inYearsSorted[inYearsSorted.length - 1]}`;

    lines.push('');
    lines.push(`**Grants received (${inRange}):** ${fmtUsd(totalIn)} across ${allIn.length.toLocaleString()} grantors (from other vault orgs' Schedule I records).`);
    lines.push('');
    lines.push('**Top 20 grantors:**');
    lines.push('');
    lines.push('| Grantor | Total | Grants | Years |');
    lines.push('|---|---:|---:|---|');
    for (const r of allIn.slice(0, 20)) {
      const yrs = [...r.years].sort();
      const yrRange = yrs.length === 0 ? '—' : yrs.length === 1 ? String(yrs[0]) : `${yrs[0]}–${yrs[yrs.length - 1]}`;
      lines.push(`| ${r.grantor_name} | ${fmtUsd(r.total)} | ${r.count} | ${yrRange} |`);
    }
  }

  lines.push('');
  lines.push('*Source: IRS Tax-Exempt Organization 990 e-file bulk releases.*');
  return lines.join('\n');
}

function injectPanel(filePath, panelMd) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const blockRe = new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`);
  const newBlock = `${BLOCK_START}\n${panelMd}\n${BLOCK_END}`;
  let newText;
  if (blockRe.test(text)) {
    newText = text.replace(blockRe, newBlock);
  } else {
    // Prefer placing after existing FEC auto-block so auto-panels cluster
    const fecEnd = '<!-- auto:fec-lifetime end -->';
    if (text.includes(fecEnd)) {
      newText = text.replace(fecEnd, fecEnd + '\n\n' + newBlock);
    } else {
      newText = text + '\n\n' + newBlock + '\n';
    }
  }
  if (newText === text) return false;
  fs.writeFileSync(filePath, newText);
  return true;
}

(async function main() {
  console.log('Building indexes...');
  const idx = await buildIndexes();

  console.log('\nScanning EIN-backed entities...');
  let scanned = 0, injected = 0, nodata = 0, missingFile = 0;

  for (const [ein, entity] of idx.einToEntity) {
    if (PROFILE_FILTER && !(entity.name || '').toLowerCase().includes(PROFILE_FILTER.toLowerCase())) continue;
    scanned++;
    const panel = renderPanel(ein, idx);
    if (!panel) { nodata++; continue; }

    if (!entity.profile_path) { missingFile++; continue; }
    const abs = path.isAbsolute(entity.profile_path) ? entity.profile_path : path.join(ROOT, entity.profile_path);
    if (!fs.existsSync(abs)) { missingFile++; if (VERBOSE) console.log(`  [missing file] ${entity.name} -> ${entity.profile_path}`); continue; }

    if (!WRITE) {
      if (VERBOSE) console.log(`  [would inject] ${entity.name}`);
      injected++;
      continue;
    }

    const changed = injectPanel(abs, panel);
    if (changed) { injected++; if (VERBOSE) console.log(`  [injected] ${entity.name}`); }
  }

  console.log(`\nResults: scanned=${scanned}, ${WRITE ? 'injected' : 'would-inject'}=${injected}, no-990-data=${nodata}, missing-profile-file=${missingFile}`);
  if (!WRITE) console.log('Dry-run. Use --write to apply.');
})().catch(err => { console.error(err); process.exit(1); });
