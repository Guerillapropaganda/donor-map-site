#!/usr/bin/env node
/**
 * ingest-990-grants-to-edges.cjs
 *
 * Converts IRS 990 grant records into monetary relationship edges and
 * writes them to data/relationships.jsonl via the canonical store.
 *
 * Only emits edges where BOTH sides resolve to vault entities by EIN.
 * Anything where either end is not in the vault is dropped — keeps the
 * relationship store clean of dangling references.
 *
 * One edge per (grantor_title, recipient_title, tax_year). The edge id
 * is derived by the canonical store from (from, to, type, cycle), so
 * re-running this script is idempotent: existing edges get their
 * last_verified bumped and amount/source_url updated in-place.
 *
 * Default threshold: $100,000 per-year minimum. Grants below this
 * threshold are skipped to keep the edge graph focused on material
 * flows.
 *
 * Inputs:
 *   C:\donor-map-data\fec\nonprofit-grants.jsonl
 *   data/entities.jsonl
 *
 * Usage:
 *   node scripts/ingest-990-grants-to-edges.cjs             # dry-run
 *   node scripts/ingest-990-grants-to-edges.cjs --write     # apply
 *   node scripts/ingest-990-grants-to-edges.cjs --write --min 250000
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { upsertEdges } = require('./lib/relationships-store.cjs');

const ROOT = path.resolve(__dirname, '..');
const GRANTS = 'C:\\donor-map-data\\fec\\nonprofit-grants.jsonl';
const ENTITIES = path.join(ROOT, 'data', 'entities.jsonl');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const VERBOSE = args.includes('--verbose');
const minFlag = args.indexOf('--min');
const MIN_AMOUNT = minFlag !== -1 ? Number(args[minFlag + 1]) : 100000;

function profilePathToTitle(p) {
  if (!p) return null;
  return path.basename(p, '.md');
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
  console.log(`[ingest-990-grants-to-edges] min=$${MIN_AMOUNT.toLocaleString()} ${WRITE ? 'WRITE' : 'DRY-RUN'}`);

  // EIN → { title, entity_type }
  const einToProfile = new Map();
  for (const line of fs.readFileSync(ENTITIES, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      const ein = r.signals && r.signals.ein;
      if (!ein || !r.profile_path) continue;
      const clean = String(ein).replace(/\D/g, '');
      if (clean.length !== 9) continue;
      const title = profilePathToTitle(r.profile_path);
      if (!title) continue;
      einToProfile.set(clean, {
        title,
        entity_type: r.entity_type,
      });
    } catch {}
  }
  console.log(`  vault entities with EIN: ${einToProfile.size}`);

  // Aggregate grants: key = (from_title, to_title, tax_year)
  const agg = new Map();
  let totalGrants = 0, bothInVault = 0;
  for await (const g of streamJsonl(GRANTS)) {
    totalGrants++;
    const grantor = einToProfile.get(g.grantor_ein);
    if (!grantor) continue;
    const recEin = g.recipient_ein ? String(g.recipient_ein).replace(/\D/g, '') : null;
    if (!recEin || recEin.length !== 9) continue;
    const recipient = einToProfile.get(recEin);
    if (!recipient) continue;
    bothInVault++;

    const year = g.tax_year || 0;
    if (!year) continue;
    const k = [grantor.title, recipient.title, year].join('|');
    if (!agg.has(k)) {
      agg.set(k, {
        from: grantor.title,
        to: recipient.title,
        from_type: grantor.entity_type,
        to_type: recipient.entity_type,
        year,
        amount: 0,
        grant_count: 0,
      });
    }
    const row = agg.get(k);
    row.amount += Number(g.amount) || 0;
    row.grant_count++;
  }
  console.log(`  grants scanned: ${totalGrants.toLocaleString()}`);
  console.log(`  both-in-vault: ${bothInVault.toLocaleString()}`);
  console.log(`  aggregated (from,to,year) groups: ${agg.size.toLocaleString()}`);

  // Filter by threshold + build edges
  const now = new Date().toISOString();
  const edges = [];
  let belowThreshold = 0;
  for (const row of agg.values()) {
    if (row.amount < MIN_AMOUNT) { belowThreshold++; continue; }
    const cycle = String(row.year);
    // id is computed by the store from (from, to, type, cycle) — we set a
    // placeholder and the validator's expectedId check is run by upsertEdges.
    const crypto = require('crypto');
    const parts = [row.from, row.to, 'monetary', cycle];
    const id = crypto.createHash('sha1').update(parts.join('|'), 'utf8').digest('hex').slice(0, 16);

    edges.push({
      id,
      from: row.from,
      to: row.to,
      from_type: row.from_type,
      to_type: row.to_type,
      type: 'monetary',
      direction: 'directed',
      amount: row.amount,
      cycle,
      confidence: 0.95,
      source: 'irs-990-bulk',
      source_url: `https://www.irs.gov/charities-non-profits/form-990-series-downloads`,
      first_seen: now,
      last_verified: now,
      status: 'active',
      evidence: [`IRS 990 ${row.year}: ${row.grant_count} grant${row.grant_count === 1 ? '' : 's'} totaling $${row.amount.toLocaleString()}`],
    });
  }
  console.log(`  below threshold ($${MIN_AMOUNT.toLocaleString()}): ${belowThreshold.toLocaleString()}`);
  console.log(`  edges to emit: ${edges.length.toLocaleString()}`);

  if (VERBOSE && edges.length > 0) {
    const sample = [...edges].sort((a, b) => b.amount - a.amount).slice(0, 15);
    console.log('\n  Top 15 edges by amount:');
    for (const e of sample) {
      console.log(`    ${e.cycle}  $${(e.amount / 1e6).toFixed(1).padStart(8)}M  ${e.from} -> ${e.to}`);
    }
  }

  if (!WRITE) {
    console.log('\n[dry-run] Use --write to apply via relationships-store.upsertEdges().');
    return;
  }

  console.log('\nUpserting edges...');
  const result = upsertEdges(edges);
  console.log(`  added: ${result.added}`);
  console.log(`  updated: ${result.updated}`);
  console.log(`  skipped: ${result.skipped}`);
  console.log(`  invalid: ${result.invalid}`);
  console.log(`  total edges in store: ${result.total.toLocaleString()}`);
  if (result.errors && result.errors.length > 0) {
    console.log('\n  First invalid edges:');
    for (const e of result.errors.slice(0, 10)) console.log('   ', e);
  }
})().catch(err => { console.error(err); process.exit(1); });
