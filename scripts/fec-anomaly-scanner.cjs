#!/usr/bin/env node
/**
 * fec-anomaly-scanner.cjs
 *
 * Full-pas2 scan. Runs every transaction through the shared classifier
 * (scripts/lib/fec-txn-types.cjs) and collects rows routed to the
 * `anomaly` bucket — typically miscoded FEC filings where:
 *   - A super-PAC (C7 prefix) used 24K / 24N / 24Z transaction codes
 *     (super-PACs cannot legally contribute to candidates)
 *   - A non-party committee used 24N / 24C / 24P (these codes reserved
 *     for whitelisted party committees)
 *
 * Output: data/anomalies-to-review.jsonl — one row per flagged transaction
 * with the FEC IMAGE_NUM for lookup.
 *
 * These rows are downstream-consumed by:
 *   - Ops /attention queue (review + dismiss/confirm)
 *   - Pre-commit sentinel (blocks verified-tier profile commits that
 *     reference an active anomaly committee in Mega-Donors)
 *
 * Usage:
 *   node scripts/fec-anomaly-scanner.cjs              # scan all cycles
 *   node scripts/fec-anomaly-scanner.cjs --cycles 2020,2022,2024,2026
 *   node scripts/fec-anomaly-scanner.cjs --min-amount 10000
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { classifyTransaction } = require('./lib/fec-txn-types.cjs');

const ROOT = path.resolve(__dirname, '..');
const BULK = 'C:\\donor-map-data\\bulk';
const PAS2_DIR = path.join(BULK, 'Contributions from committees to candidates & independent expenditures');
const CM_DIR = path.join(BULK, 'Committee master');
const OUTPUT = path.join(ROOT, 'data', 'anomalies-to-review.jsonl');

const args = (() => {
  const a = process.argv.slice(2);
  const o = { minAmount: 1000, cycles: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--cycles') o.cycles = a[++i].split(',').map(Number);
    else if (a[i] === '--min-amount') o.minAmount = Number(a[++i]);
  }
  return o;
})();

function readZipEphemeral(zipPath) {
  const tmp = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `fec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmp}' -Force"`, { stdio: 'pipe' });
    const csv = fs.readdirSync(tmp).find(f => f.endsWith('.txt') || f.endsWith('.csv'));
    return csv ? fs.readFileSync(path.join(tmp, csv), 'utf-8') : '';
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function cycleFromFilename(f) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  return (yyn >= 80 ? 1900 : 2000) + yyn;
}

console.log(`[fec-anomaly-scanner] min-amount=$${args.minAmount} cycles=${args.cycles || 'ALL'}`);

// Load committee names
console.log('Loading Committee Master...');
const cmteName = new Map();
for (const f of fs.readdirSync(CM_DIR).filter(f => f.endsWith('.zip')).sort()) {
  const text = readZipEphemeral(path.join(CM_DIR, f));
  for (const line of text.split('\n')) {
    const p = line.split('|');
    if (p[0] && p[1]) cmteName.set(p[0].trim(), p[1].trim());
  }
}
console.log(`  ${cmteName.size} committee names.`);

// Scan pas2
console.log('Scanning pas2 files...');
const anomalies = [];
let totalRows = 0;
for (const f of fs.readdirSync(PAS2_DIR).filter(f => f.endsWith('.zip')).sort()) {
  const cycle = cycleFromFilename(f);
  if (args.cycles && !args.cycles.includes(cycle)) continue;
  const text = readZipEphemeral(path.join(PAS2_DIR, f));
  let fileAnomalies = 0;
  for (const line of text.split('\n')) {
    if (!line) continue;
    totalRows++;
    const p = line.split('|');
    const srcCmte = p[0];
    const txnTp = p[5];
    const amt = Number(p[14] || 0);
    const candId = (p[16] || '').toUpperCase();
    if (!amt || Math.abs(amt) < args.minAmount) continue;
    const cls = classifyTransaction({ srcCmte, txnTp, amount: amt, candId });
    if (cls.bucket !== 'anomaly') continue;
    anomalies.push({
      cycle,
      src_cmte_id: srcCmte,
      src_cmte_name: cmteName.get(srcCmte) || '(unknown)',
      committee_class: cls.committeeClass,
      target_cand_id: candId,
      txn_tp: txnTp,
      amount: amt,
      txn_date: p[13],
      image_num: p[4],
      txn_id: p[17],
      sub_id: p[21],
      reason: cls.anomalies.join('; '),
      status: 'open',
      first_seen: new Date().toISOString().split('T')[0],
    });
    fileAnomalies++;
  }
  console.log(`  ${f}: ${fileAnomalies} anomalies (cycle ${cycle})`);
}

// Write output sorted by amount desc
anomalies.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
const lines = anomalies.map(a => JSON.stringify(a)).join('\n') + (anomalies.length ? '\n' : '');
fs.writeFileSync(OUTPUT, lines);

// Summary
const byCommittee = new Map();
for (const a of anomalies) {
  const key = `${a.src_cmte_id} ${a.src_cmte_name}`;
  byCommittee.set(key, (byCommittee.get(key) || 0) + Math.abs(a.amount));
}
console.log(`\n═══════════════════════════════════════════════`);
console.log(`Total rows scanned: ${totalRows.toLocaleString()}`);
console.log(`Anomalies flagged: ${anomalies.length.toLocaleString()}`);
console.log(`Total anomalous dollars: $${anomalies.reduce((a, b) => a + Math.abs(b.amount), 0).toLocaleString()}`);
console.log(`Distinct anomaly committees: ${byCommittee.size}`);
console.log(`\nTop 10 offender committees (by anomalous $ volume):`);
const topOffenders = [...byCommittee.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [k, v] of topOffenders) console.log(`  $${v.toLocaleString().padStart(12)}  ${k}`);
console.log(`\n[out] ${OUTPUT}`);
