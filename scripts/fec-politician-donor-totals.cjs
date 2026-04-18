#!/usr/bin/env node
/**
 * fec-politician-donor-totals.cjs
 *
 * Builds lifetime top-donor totals for a politician from FEC bulk data:
 *   1. Reads Candidate-Committee Linkages (ccl) across all cycles to find
 *      every committee the candidate controls (principal campaign + leadership
 *      PACs + joint fundraising committees).
 *   2. Streams Contributions from Committees to Candidates (pas2) across all
 *      cycles, sums by source-committee CMTE_ID.
 *   3. Joins CMTE_ID to committee names via Committee Master (cm).
 *   4. Prints top N donor committees by lifetime total.
 *
 * Usage:
 *   node scripts/fec-politician-donor-totals.cjs --cand H8CA05035
 *   node scripts/fec-politician-donor-totals.cjs --cand P80001571 --top 20
 *   node scripts/fec-politician-donor-totals.cjs --cand S0FL00338,P60006723 --top 20
 *
 * FEC field refs: https://www.fec.gov/campaign-finance-data/
 *   pas2: https://www.fec.gov/campaign-finance-data/contributions-committees-candidates-file-description/
 *   ccl:  https://www.fec.gov/campaign-finance-data/candidate-committee-linkage-file-description/
 *   cm:   https://www.fec.gov/campaign-finance-data/committee-master-file-description/
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');
const { classifyTransaction, CONDUIT_IDS, PARTY_COMMITTEE_IDS } = require('./lib/fec-txn-types.cjs');

const BULK = 'C:\\donor-map-data\\bulk';
const PAS2_DIR = path.join(BULK, 'Contributions from committees to candidates & independent expenditures');
const CCL_DIR = path.join(BULK, 'Candidate Committee Linkages');
const CM_DIR = path.join(BULK, 'Committee master');

const args = (() => {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--cand') opts.cand = a[++i];
    else if (a[i] === '--top') opts.top = parseInt(a[++i], 10);
  }
  return opts;
})();
if (!args.cand) { console.error('usage: --cand ID[,ID,...] [--top N]'); process.exit(1); }
const CAND_IDS = new Set(args.cand.split(',').map(s => s.trim().toUpperCase()));
const TOP_N = args.top || 15;

// Unzip a zip file to a buffer. Uses PowerShell because `unzip` isn't always
// present on Windows and we want line-by-line reads on large CSVs.
function readZipEntry(zipPath) {
  const tmpDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `fec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  try {
    execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'pipe' });
    const csv = fs.readdirSync(tmpDir).find(f => f.endsWith('.txt') || f.endsWith('.csv'));
    if (!csv) return null;
    const content = fs.readFileSync(path.join(tmpDir, csv), 'utf-8');
    return content;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// ─── Pass 1: CCL to find all committees controlled by candidate ─────
const controlledCommittees = new Set();
const cclFiles = fs.readdirSync(CCL_DIR).filter(f => f.endsWith('.zip')).sort();
console.log(`Scanning ${cclFiles.length} CCL files for candidates ${[...CAND_IDS].join(', ')}...`);
for (const f of cclFiles) {
  const text = readZipEntry(path.join(CCL_DIR, f));
  if (!text) continue;
  // ccl fields: CAND_ID|CAND_ELECTION_YR|FEC_ELECTION_YR|CMTE_ID|CMTE_TP|CMTE_DSGN|LINKAGE_ID
  for (const line of text.split('\n')) {
    if (!line) continue;
    const parts = line.split('|');
    const candId = (parts[0] || '').trim().toUpperCase();
    const cmteId = (parts[3] || '').trim();
    if (CAND_IDS.has(candId) && cmteId) controlledCommittees.add(cmteId);
  }
}
console.log(`Controlled committees: ${controlledCommittees.size}`);

// ─── Pass 2: Committee Master for CMTE_ID -> name map ─────────────
const cmteName = new Map();
const cmFiles = fs.readdirSync(CM_DIR).filter(f => f.endsWith('.zip')).sort();
console.log(`Scanning ${cmFiles.length} Committee Master files...`);
for (const f of cmFiles) {
  const text = readZipEntry(path.join(CM_DIR, f));
  if (!text) continue;
  // cm fields: CMTE_ID|CMTE_NM|TRES_NM|CMTE_ST1|CMTE_ST2|CMTE_CITY|CMTE_ST|CMTE_ZIP|CMTE_DSGN|CMTE_TP|...
  for (const line of text.split('\n')) {
    if (!line) continue;
    const parts = line.split('|');
    const id = (parts[0] || '').trim();
    const name = (parts[1] || '').trim();
    if (id && name) cmteName.set(id, name);
  }
}
console.log(`Committee names loaded: ${cmteName.size}`);

// ─── Pass 3: PAS2 sum by source committee ─────────────────────────
// pas2 fields: CMTE_ID|AMNDT_IND|RPT_TP|TRANSACTION_PGI|IMAGE_NUM|TRANSACTION_TP|ENTITY_TP|NAME|CITY|STATE|ZIP_CODE|EMPLOYER|OCCUPATION|TRANSACTION_DT|TRANSACTION_AMT|OTHER_ID|CAND_ID|TRAN_ID|FILE_NUM|MEMO_CD|MEMO_TEXT|SUB_ID
// Buckets keyed by source committee — separate direct-donor / IE-support /
// IE-oppose / conduit / anomaly. Each has { total, byCycle, txnCount, anomalies }.
const buckets = {
  'direct-donor': new Map(),
  'party-support': new Map(),
  'ie-support': new Map(),
  'ie-oppose': new Map(),
  'conduit-aggregation': new Map(),
  'comm-cost': new Map(),
  'electioneering': new Map(),
  'anomaly': new Map(),
  'unknown': new Map(),
};
function bumpBucket(bucket, srcCmte, amount, cycle, anomalies) {
  const m = buckets[bucket];
  if (!m.has(srcCmte)) m.set(srcCmte, { total: 0, byCycle: {}, txnCount: 0, anomalies: new Set() });
  const e = m.get(srcCmte);
  e.total += amount;
  e.byCycle[cycle] = (e.byCycle[cycle] || 0) + amount;
  e.txnCount++;
  for (const a of anomalies) e.anomalies.add(a);
}
const directContribs = new Map();   // CAND_ID -> total (sanity)

const pasFiles = fs.readdirSync(PAS2_DIR).filter(f => f.endsWith('.zip')).sort();
console.log(`Scanning ${pasFiles.length} PAS2 files...`);

for (const f of pasFiles) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  const cycle = String((yyn >= 80 ? 1900 : 2000) + yyn);
  const text = readZipEntry(path.join(PAS2_DIR, f));
  if (!text) continue;
  let matched = 0;
  for (const line of text.split('\n')) {
    if (!line) continue;
    const parts = line.split('|');
    const srcCmte = (parts[0] || '').trim();
    const txnTp = (parts[5] || '').trim();
    const amt = Number(parts[14] || 0);
    const candId = (parts[16] || '').trim().toUpperCase();
    if (!CAND_IDS.has(candId)) continue;
    if (!amt || isNaN(amt)) continue;

    const cls = classifyTransaction({ srcCmte, txnTp, amount: amt, candId });
    bumpBucket(cls.bucket, srcCmte, amt, cycle, cls.anomalies);
    // Only count bucketed-as-donation toward candidate's "raised by direct contributions"
    if (cls.bucket === 'direct-donor' || cls.bucket === 'party-support' || cls.bucket === 'conduit-aggregation') {
      directContribs.set(candId, (directContribs.get(candId) || 0) + amt);
    }
    matched++;
  }
  if (matched > 0) console.log(`  ${f}: ${matched} contributions`);
}

// ─── Report per bucket ────────────────────────────────────────────
function formatBucket(title, bucketMap, extraNote) {
  if (bucketMap.size === 0) return;
  const sorted = [...bucketMap.entries()]
    .map(([id, e]) => ({ id, name: cmteName.get(id) || '(unknown)', ...e, anomalies: [...e.anomalies] }))
    .sort((a, b) => b.total - a.total);
  const bucketTotal = sorted.reduce((a, b) => a + b.total, 0);
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`${title}  — total $${bucketTotal.toLocaleString()}, ${sorted.length} committees`);
  if (extraNote) console.log(`  ${extraNote}`);
  console.log(`═══════════════════════════════════════════════════════════`);
  console.log('Rank | Amount      | Txns | Committee');
  console.log('-----|-------------|------|----------');
  for (let i = 0; i < Math.min(TOP_N, sorted.length); i++) {
    const d = sorted[i];
    const flag = d.anomalies.length ? ' ⚠' : '';
    console.log(`${String(i + 1).padStart(4)} | $${d.total.toLocaleString().padStart(10)} | ${String(d.txnCount).padStart(4)} | ${d.name} (${d.id})${flag}`);
    for (const a of d.anomalies) console.log(`     └─ ${a}`);
  }
}

console.log(`\n=== CANDIDATE: ${[...CAND_IDS].join(', ')} ===`);
console.log(`Effective direct receipts (direct + party + conduit aggregation): $${[...directContribs.values()].reduce((a,b)=>a+b,0).toLocaleString()}`);
for (const [candId, total] of directContribs) console.log(`  ${candId}: $${total.toLocaleString()}`);

formatBucket('🏦 DIRECT PAC DONORS (the real "mega-donor" list)', buckets['direct-donor']);
formatBucket('🏛️  PARTY COMMITTEE SUPPORT (DCCC/NRCC/DNC/RNC etc)', buckets['party-support']);
formatBucket('📢 CONDUIT AGGREGATION (WinRed/ActBlue — small-dollar platforms)', buckets['conduit-aggregation'], 'Not mega-donors. Represents millions of individual donations.');
formatBucket('💸 SUPER-PAC IE SUPPORT (24E — third-party spending FOR this candidate)', buckets['ie-support'], 'Not donations. Independent spending.');
formatBucket('🎯 IE SPENT AGAINST (24A — third-party spending OPPOSING this candidate)', buckets['ie-oppose'], 'Opponents, not donors.');
formatBucket('⚠️  ANOMALIES (miscoded / super-PAC using direct-contribution codes)', buckets['anomaly'], 'Review FEC filings by IMAGE_NUM before using.');
if (buckets['comm-cost'].size) formatBucket('📞 Communication costs (low priority)', buckets['comm-cost']);
if (buckets['electioneering'].size) formatBucket('📺 Electioneering communications (review ad content)', buckets['electioneering']);
if (buckets['unknown'].size) formatBucket('❓ Unknown transaction types', buckets['unknown']);
