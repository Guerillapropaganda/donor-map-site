#!/usr/bin/env node
/**
 * fec-mega-donor-trace.cjs
 *
 * Two-hop money trace per ADR-0012 + ADR-0013:
 *   HOP 1 (pas2): super-PACs spending IE-support for the target candidate
 *   HOP 2 (indiv): individuals + orgs funding those super-PACs
 *
 * Surfaces the ultimate human mega-donors behind super-PAC IE spending.
 * E.g. Musk → America PAC → Trump; Adelson → Conservative Solutions PAC → Rubio.
 *
 * Uses shared classifier (scripts/lib/fec-txn-types.cjs) — same source of
 * truth as fec-politician-donor-totals.cjs.
 *
 * Output: prints Tier 1 (direct PACs) and Tier 2 (ultimate human donors)
 * with clear labels. No data invented, chain always shown.
 *
 * Usage:
 *   node scripts/fec-mega-donor-trace.cjs --cand P80001571 --top-pacs 10 --top-donors 10
 *   node scripts/fec-mega-donor-trace.cjs --cand H8CA05035 --cycles 2020,2022,2024,2026
 *   node scripts/fec-mega-donor-trace.cjs --cand S0FL00338,P60006723
 *
 * First run per politician is slow (~10-15 min, extracts indiv zips).
 * Subsequent runs reuse extracted CSVs cached at /tmp/fec-indiv-cache/.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { classifyTransaction, CONDUIT_IDS } = require('./lib/fec-txn-types.cjs');

const BULK = 'C:\\donor-map-data\\bulk';
const PAS2_DIR = path.join(BULK, 'Contributions from committees to candidates & independent expenditures');
const INDIV_DIR = path.join(BULK, 'Contributions by Individuals');
const CM_DIR = path.join(BULK, 'Committee master');
const CCL_DIR = path.join(BULK, 'Candidate Committee Linkages');
const INDIV_CACHE = 'C:\\donor-map-data\\indiv-cache';

const args = (() => {
  const a = process.argv.slice(2);
  const o = { topPacs: 10, topDonors: 10, cycles: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--cand') o.cand = a[++i];
    else if (a[i] === '--top-pacs') o.topPacs = parseInt(a[++i], 10);
    else if (a[i] === '--top-donors') o.topDonors = parseInt(a[++i], 10);
    else if (a[i] === '--cycles') o.cycles = a[++i].split(',').map(Number);
  }
  return o;
})();
if (!args.cand) { console.error('usage: --cand ID[,ID,...] [--top-pacs N] [--top-donors N] [--cycles YYYY,YYYY]'); process.exit(1); }
const CAND_IDS = new Set(args.cand.split(',').map(s => s.trim().toUpperCase()));

function readZipToTmp(zipPath, persistDir) {
  const dest = persistDir || path.join(process.env.TEMP || 'C:\\Windows\\Temp', `fec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  fs.mkdirSync(dest, { recursive: true });
  execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${dest}' -Force"`, { stdio: 'pipe' });
  const csv = fs.readdirSync(dest).find(f => f.endsWith('.txt') || f.endsWith('.csv'));
  if (!csv) return { text: '', dir: dest };
  return { text: fs.readFileSync(path.join(dest, csv), 'utf-8'), dir: dest };
}
function readZipEphemeral(zipPath) {
  const { text, dir } = readZipToTmp(zipPath);
  fs.rmSync(dir, { recursive: true, force: true });
  return text;
}

// ─── Committee name map (we already read these during pas2 scan, reuse) ──
console.log('Building Committee Master name map...');
const cmteName = new Map();
for (const f of fs.readdirSync(CM_DIR).filter(f => f.endsWith('.zip')).sort()) {
  const text = readZipEphemeral(path.join(CM_DIR, f));
  for (const line of text.split('\n')) {
    const p = line.split('|');
    if (p[0] && p[1]) cmteName.set(p[0].trim(), p[1].trim());
  }
}
console.log(`  ${cmteName.size} committee names loaded.`);

// ─── Hop 1: pas2 — find super-PACs funding the candidate ──
console.log('\nHop 1: scanning pas2 for IE-support + direct contributions to target...');
const tierOnePacs = new Map(); // cmteId -> { total, byCycle, bucket }
function bumpTierOne(id, amount, cycle, bucket) {
  if (!tierOnePacs.has(id)) tierOnePacs.set(id, { total: 0, byCycle: {}, buckets: new Set() });
  const e = tierOnePacs.get(id);
  e.total += amount;
  e.byCycle[cycle] = (e.byCycle[cycle] || 0) + amount;
  e.buckets.add(bucket);
}

function cycleFromFilename(f) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  return (yyn >= 80 ? 1900 : 2000) + yyn;
}

for (const f of fs.readdirSync(PAS2_DIR).filter(f => f.endsWith('.zip')).sort()) {
  const cycle = cycleFromFilename(f);
  if (args.cycles && !args.cycles.includes(cycle)) continue;
  const text = readZipEphemeral(path.join(PAS2_DIR, f));
  for (const line of text.split('\n')) {
    if (!line) continue;
    const p = line.split('|');
    const srcCmte = p[0];
    const txnTp = p[5];
    const amt = Number(p[14] || 0);
    const candId = (p[16] || '').toUpperCase();
    if (!CAND_IDS.has(candId)) continue;
    if (!amt) continue;
    const cls = classifyTransaction({ srcCmte, txnTp, amount: amt, candId });
    // Hop 1 = direct-donor + ie-support + conduit-aggregation (party-support handled separately)
    if (['direct-donor', 'ie-support', 'conduit-aggregation'].includes(cls.bucket)) {
      bumpTierOne(srcCmte, amt, String(cycle), cls.bucket);
    }
  }
}
console.log(`  Tier 1 committees found: ${tierOnePacs.size}`);

// Sort and take top N for tier 2 expansion
const topTierOne = [...tierOnePacs.entries()]
  .map(([id, e]) => ({ id, name: cmteName.get(id) || '(unknown)', ...e, buckets: [...e.buckets] }))
  .sort((a, b) => b.total - a.total)
  .slice(0, args.topPacs);

console.log(`\nTop ${args.topPacs} Tier 1 PACs (will trace individuals into these):`);
for (const p of topTierOne) {
  console.log(`  ${p.id.padEnd(10)} $${p.total.toLocaleString().padStart(12)}  ${p.buckets.join(',').padEnd(25)}  ${p.name}${CONDUIT_IDS.has(p.id) ? ' [CONDUIT]' : ''}`);
}

// ─── Hop 2: indiv — individuals funding the top Tier 1 PACs ──
// Heavy: indiv files are 100MB-6GB each. We only care about rows where
// CMTE_ID is in the top Tier 1 set. Cache the filtered rows per cycle
// under INDIV_CACHE/<cmte>-<cycle>.jsonl so future runs skip the extract.
fs.mkdirSync(INDIV_CACHE, { recursive: true });
const targetCmteIds = new Set(topTierOne.map(p => p.id));
// Also expand target committees by cycle if cycles flag set
const indivFiles = fs.readdirSync(INDIV_DIR).filter(f => f.endsWith('.zip')).sort();

console.log(`\nHop 2: scanning ${indivFiles.length} indiv files for contributions INTO top ${args.topPacs} PACs...`);
const tierTwoDonors = new Map(); // "name|city|state|employer" -> { total, byPac: {cmte: amt} }

function bumpTierTwo(key, name, city, state, employer, occupation, amount, cycle, srcCmte) {
  if (!tierTwoDonors.has(key)) {
    tierTwoDonors.set(key, { name, city, state, employer, occupation, total: 0, byPac: {}, byCycle: {} });
  }
  const e = tierTwoDonors.get(key);
  e.total += amount;
  e.byPac[srcCmte] = (e.byPac[srcCmte] || 0) + amount;
  e.byCycle[cycle] = (e.byCycle[cycle] || 0) + amount;
}

const readline = require('readline');
async function* streamIndivFile(zipPath) {
  // Extract to persistent tmp, stream-read line-by-line, delete after.
  const tmp = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `fec-indiv-${Date.now()}`);
  fs.mkdirSync(tmp, { recursive: true });
  try {
    execSync(`powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${tmp}' -Force"`, { stdio: 'pipe' });
    const csv = fs.readdirSync(tmp).find(f => f.endsWith('.txt') || f.endsWith('.csv'));
    if (!csv) return;
    const csvPath = path.join(tmp, csv);
    const rl = readline.createInterface({
      input: fs.createReadStream(csvPath, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) yield line;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

(async function runHop2AndReport() {
  for (const f of indivFiles) {
    const cycle = cycleFromFilename(f);
    if (args.cycles && !args.cycles.includes(cycle)) continue;
    const sizeBytes = fs.statSync(path.join(INDIV_DIR, f)).size;
    process.stdout.write(`  ${f} (${(sizeBytes / 1e6).toFixed(0)}MB)... `);
    const t0 = Date.now();
    let matched = 0;
    for await (const line of streamIndivFile(path.join(INDIV_DIR, f))) {
      if (!line) continue;
      const p = line.split('|');
      const cmte = p[0];
      if (!targetCmteIds.has(cmte)) continue;
      const name = (p[7] || '').trim();
      const city = (p[8] || '').trim();
      const state = (p[9] || '').trim();
      const employer = (p[11] || '').trim();
      const occupation = (p[12] || '').trim();
      const amt = Number(p[14] || 0);
      if (!name || !amt) continue;
      const key = `${name}|${state}`;
      bumpTierTwo(key, name, city, state, employer, occupation, amt, String(cycle), cmte);
      matched++;
    }
    console.log(`${matched} matches in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
  console.log(`\n  Tier 2 donors found: ${tierTwoDonors.size}`);
  runReport();
})();

function runReport() {

// ─── Report ──
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`MEGA-DONOR TRACE for ${[...CAND_IDS].join(', ')}`);
console.log('═══════════════════════════════════════════════════════════');

console.log('\n── TIER 1: PACs spending directly for this candidate ──');
for (const p of topTierOne) {
  const tag = CONDUIT_IDS.has(p.id) ? ' [CONDUIT — small-dollar aggregation]' : '';
  console.log(`  $${p.total.toLocaleString().padStart(12)}  ${p.name} (${p.id})${tag}`);
}

console.log('\n── TIER 2: Individual + org donors funding those PACs (top ' + args.topDonors + ') ──');
const sortedTierTwo = [...tierTwoDonors.values()]
  .sort((a, b) => b.total - a.total)
  .slice(0, args.topDonors);
for (const d of sortedTierTwo) {
  console.log(`  $${d.total.toLocaleString().padStart(12)}  ${d.name} · ${d.city}, ${d.state}`);
  if (d.employer || d.occupation) console.log(`                  ${d.employer || '?'} — ${d.occupation || '?'}`);
  const topPacs = Object.entries(d.byPac).sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log('                  Via: ' + topPacs.map(([c, v]) => `${cmteName.get(c) || c} ($${v.toLocaleString()})`).join(' · '));
}

// ─── Write cache for consumer scripts ──
const CACHE_OUT = path.join(INDIV_CACHE, `trace-${[...CAND_IDS].join('-')}.json`);
fs.writeFileSync(CACHE_OUT, JSON.stringify({
  cand: [...CAND_IDS],
  generatedAt: new Date().toISOString(),
  tierOne: topTierOne,
  tierTwo: [...tierTwoDonors.values()].sort((a, b) => b.total - a.total).slice(0, 50),
}, null, 2));
console.log(`\n[write] ${CACHE_OUT}`);
}  // runReport
