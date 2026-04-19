#!/usr/bin/env node
/**
 * discover-990-gaps.cjs
 *
 * Produces two Admin Notes reports from the 990 grants + filings data to
 * surface vault coverage gaps:
 *
 *   1. content/Admin Notes/missing-profile-candidates.md
 *      Top recipient organizations by dollars received across IRS 990
 *      Schedule I records, filtered to entities NOT in data/entities.jsonl.
 *      Ranked candidates for new stub profiles.
 *
 *   2. content/Admin Notes/ein-backfill-candidates.md
 *      Vault entities whose signals.ein is null, where a plausible EIN
 *      match exists in the grants data (recipient_name closely matches
 *      the vault entity name). For manual David review before backfilling.
 *      Does not auto-apply any EIN — editorial decision.
 *
 * Also prints top 20 non-vault grantors (donor-advised funds, corporate
 * foundations) as a general coverage summary.
 *
 * Usage:
 *   node scripts/discover-990-gaps.cjs             # dry-run
 *   node scripts/discover-990-gaps.cjs --write     # write reports
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const GRANTS = 'C:\\donor-map-data\\fec\\nonprofit-grants.jsonl';
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');
const MISSING_OUT = path.join(ROOT, 'content', 'Admin Notes', 'missing-profile-candidates.md');
const EIN_OUT = path.join(ROOT, 'content', 'Admin Notes', 'ein-backfill-candidates.md');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');

function normName(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .trim()
    .toUpperCase()
    .replace(/\s+AND\s+/g, ' & ')
    .replace(/,?\s+(INC|INCORPORATED|CORP|CORPORATION|CO|COMPANY|LLC|LLP|LTD|LIMITED)\.?$/i, '')
    .replace(/\s+/g, ' ');
}

async function* streamJsonl(filePath) {
  if (!fs.existsSync(filePath)) return;
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, { encoding: 'utf-8' }), crlfDelay: Infinity });
  for await (const line of rl) { if (!line) continue; try { yield JSON.parse(line); } catch {} }
}

(async function main() {
  console.log(`[discover-990-gaps] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

  // Load vault entities
  const entities = fs.readFileSync(ENTITIES, 'utf-8').split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  const vaultEinSet = new Set();
  const vaultNameSet = new Set();  // normalized names of all vault entities
  const vaultEntsByNorm = new Map(); // norm -> entity record
  const vaultEntsWithoutEin = [];
  for (const e of entities) {
    if (!e.name) continue;
    const norm = normName(e.name);
    vaultNameSet.add(norm);
    vaultEntsByNorm.set(norm, e);
    const ein = e.signals && e.signals.ein;
    if (ein) {
      const clean = String(ein).replace(/\D/g, '');
      if (clean.length === 9) vaultEinSet.add(clean);
    } else if (e.profile_path) {
      vaultEntsWithoutEin.push({ ...e, norm });
    }
  }
  console.log(`  vault entities: ${entities.length} (with EIN: ${vaultEinSet.size})`);

  // Aggregate recipients by normalized name + collect {ein, name, total}
  // byNorm -> { total, count, eins: Set, originalNames: Set }
  const byNorm = new Map();
  let grantsCount = 0;
  for await (const g of streamJsonl(GRANTS)) {
    grantsCount++;
    const norm = g.recipient_name_normalized || normName(g.recipient_name);
    if (!norm) continue;
    if (!byNorm.has(norm)) byNorm.set(norm, { total: 0, count: 0, eins: new Set(), names: new Set() });
    const row = byNorm.get(norm);
    row.total += Number(g.amount) || 0;
    row.count++;
    if (g.recipient_ein) {
      const clean = String(g.recipient_ein).replace(/\D/g, '');
      if (clean.length === 9) row.eins.add(clean);
    }
    if (g.recipient_name) row.names.add(g.recipient_name);
  }
  console.log(`  grant rows: ${grantsCount.toLocaleString()}`);
  console.log(`  unique normalized recipients: ${byNorm.size.toLocaleString()}`);

  // Missing profile candidates: recipient norm NOT in vault, sorted by dollars
  const missing = [];
  for (const [norm, row] of byNorm) {
    if (vaultNameSet.has(norm)) continue;
    // Check if any of this recipient's EINs are already a vault EIN (alias case)
    let einIsVaultEin = false;
    for (const e of row.eins) if (vaultEinSet.has(e)) { einIsVaultEin = true; break; }
    if (einIsVaultEin) continue;
    missing.push({
      norm,
      total: row.total,
      count: row.count,
      eins: [...row.eins],
      sample_name: [...row.names][0] || norm,
    });
  }
  missing.sort((a, b) => b.total - a.total);
  console.log(`  missing-profile candidates (>0$): ${missing.length}`);
  console.log(`  top 10 by $:`);
  for (const m of missing.slice(0, 10)) console.log('   ', '$' + (m.total / 1e6).toFixed(1) + 'M  ' + m.sample_name);

  // EIN backfill candidates: vault entities with no EIN, normalized name matches a recipient row's normalized name
  const einBackfill = [];
  for (const e of vaultEntsWithoutEin) {
    const match = byNorm.get(e.norm);
    if (!match || match.eins.size === 0) continue;
    einBackfill.push({
      name: e.name,
      profile_path: e.profile_path,
      candidate_eins: [...match.eins],
      grants_received: match.count,
      dollars_received: match.total,
    });
  }
  einBackfill.sort((a, b) => b.dollars_received - a.dollars_received);
  console.log(`  EIN backfill candidates: ${einBackfill.length}`);

  // Render reports
  const missingLines = [];
  missingLines.push('---');
  missingLines.push('title: "Missing Profile Candidates (IRS 990 Top Recipients)"');
  missingLines.push('status: reference');
  missingLines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`);
  missingLines.push('generated-by: scripts/discover-990-gaps.cjs');
  missingLines.push('---');
  missingLines.push('');
  missingLines.push('# Missing Profile Candidates');
  missingLines.push('');
  missingLines.push('Top recipients of grants reported on vault-tracked orgs\' IRS 990 Schedule I filings, that do NOT currently have a vault profile. Ranked by total dollars received.');
  missingLines.push('');
  missingLines.push('Research Claude: use this list to queue stub profile creation in priority order. Entities are pre-sorted so the $1B+ rows at the top represent the highest-leverage additions.');
  missingLines.push('');
  missingLines.push('| Recipient | Total received | Grants | EIN(s) |');
  missingLines.push('|---|---:|---:|---|');
  for (const m of missing.slice(0, 200)) {
    const ein = m.eins.length ? m.eins.join(', ') : '—';
    const total = m.total >= 1e9 ? `$${(m.total / 1e9).toFixed(2)}B` : m.total >= 1e6 ? `$${(m.total / 1e6).toFixed(1)}M` : m.total >= 1e3 ? `$${(m.total / 1e3).toFixed(0)}K` : `$${m.total}`;
    missingLines.push(`| ${m.sample_name} | ${total} | ${m.count.toLocaleString()} | ${ein} |`);
  }
  if (missing.length > 200) missingLines.push('');
  if (missing.length > 200) missingLines.push(`*... ${missing.length - 200} more not shown.*`);

  const einLines = [];
  einLines.push('---');
  einLines.push('title: "EIN Backfill Candidates"');
  einLines.push('status: reference');
  einLines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`);
  einLines.push('generated-by: scripts/discover-990-gaps.cjs');
  einLines.push('---');
  einLines.push('');
  einLines.push('# EIN Backfill Candidates');
  einLines.push('');
  einLines.push('Vault entities currently with `signals.ein: null` in data/entities.jsonl where an IRS 990 grant record uses a name that exactly matches the vault entity\'s normalized name. Manual review recommended before adding the EIN to profile frontmatter — same-name different-entity collisions do happen.');
  einLines.push('');
  if (einBackfill.length === 0) {
    einLines.push('*No candidates found.*');
  } else {
    einLines.push('| Vault entity | Candidate EIN(s) | Grants received | Dollars | Profile |');
    einLines.push('|---|---|---:|---:|---|');
    for (const e of einBackfill.slice(0, 200)) {
      const dollars = e.dollars_received >= 1e6 ? `$${(e.dollars_received / 1e6).toFixed(1)}M` : e.dollars_received >= 1e3 ? `$${(e.dollars_received / 1e3).toFixed(0)}K` : `$${e.dollars_received}`;
      einLines.push(`| ${e.name} | ${e.candidate_eins.join(', ')} | ${e.grants_received} | ${dollars} | \`${e.profile_path}\` |`);
    }
  }
  einLines.push('');

  if (!WRITE) {
    console.log('\n[dry-run] Use --write to produce reports.');
    return;
  }
  fs.writeFileSync(MISSING_OUT, missingLines.join('\n'));
  fs.writeFileSync(EIN_OUT, einLines.join('\n'));
  console.log(`  wrote ${MISSING_OUT}`);
  console.log(`  wrote ${EIN_OUT}`);
})().catch((err) => { console.error(err); process.exit(1); });
