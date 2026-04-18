#!/usr/bin/env node
/**
 * ingest-fec-oppexp-bulk.cjs
 *
 * Ingests FEC Operating Expenditures (oppexp) bulk zips. Aggregates by
 * (source committee, recipient name, purpose category) into rolled-up rows.
 *
 * Use cases:
 *   - Vendor/consultant network analysis (Pelosi's consultant blacklist,
 *     same-vendor links between "independent" super-PACs, etc.)
 *   - Ad-buy tracking
 *   - Detecting coordination between committees that share infrastructure
 *
 * Output: C:\donor-map-data\fec\oppexp-by-committee.jsonl
 *   Rows: { cmte_id, recipient_name, recipient_state, category, total, count,
 *           first_cycle, last_cycle, cycles }
 *
 * Resume-friendly via per-zip checkpoint (ADR-0014).
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/ingest-fec-oppexp-bulk.cjs
 *   node --max-old-space-size=8192 scripts/ingest-fec-oppexp-bulk.cjs --resume
 */

const path = require('path');
const fs = require('fs');
const {
  loadCheckpoint, markComplete, streamZip, cleanupPartials,
  listZips, fmtBytes, DERIVED_ROOT, ensureDerivedDirs,
} = require('./lib/fec-ingest-helpers.cjs');

const PIPELINE = 'oppexp';
const SUBDIR = 'Operating Expenditures';
const FINAL = path.join(DERIVED_ROOT, 'oppexp-by-committee.jsonl');
const SNAPSHOT = path.join(DERIVED_ROOT, 'oppexp-agg.snapshot.jsonl');

const args = (() => {
  const a = process.argv.slice(2);
  const o = { resume: a.includes('--resume') };
  const m = a.indexOf('--min-amount');
  o.minAmount = m !== -1 ? Number(a[m + 1]) : 5000;
  return o;
})();

function cycleFromFilename(f) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  return (yyn >= 80 ? 1900 : 2000) + yyn;
}

function normName(s) {
  return (s || '').toUpperCase().replace(/[^A-Z0-9 ,.&-]/g, '').trim();
}

// oppexp schema (pipe-delimited): CMTE_ID|AMNDT_IND|RPT_YR|RPT_TP|IMAGE_NUM|
//   LINE_NUM|FORM_TP_CD|SCHED_TP_CD|NAME|CITY|STATE|ZIP_CODE|TRANSACTION_DT|
//   TRANSACTION_AMT|TRANSACTION_PGI|PURPOSE|CATEGORY|CATEGORY_DESC|MEMO_CD|
//   MEMO_TEXT|ENTITY_TP|SUB_ID|FILE_NUM|TRAN_ID|BACK_REF_TRAN_ID

function aggKey(cmteId, recipName, recipState, category) {
  return `${cmteId}|${recipName}|${recipState}|${category || ''}`;
}

async function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT)) return new Map();
  const map = new Map();
  const readline = require('readline');
  const rl = readline.createInterface({
    input: fs.createReadStream(SNAPSHOT, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      map.set(aggKey(r.cmte_id, r.recipient_name, r.recipient_state, r.category), r);
    } catch {}
  }
  return map;
}

function writeSnapshot(map) {
  const tmp = SNAPSHOT + '.writing';
  const fd = fs.openSync(tmp, 'w');
  for (const r of map.values()) fs.writeSync(fd, JSON.stringify(r) + '\n');
  fs.closeSync(fd);
  if (fs.existsSync(SNAPSHOT)) fs.rmSync(SNAPSHOT);
  fs.renameSync(tmp, SNAPSHOT);
}

(async function main() {
  ensureDerivedDirs();
  const t0 = Date.now();
  console.log(`[ingest-fec-oppexp-bulk] ${args.resume ? 'RESUME' : 'FRESH'}. min-amount=$${args.minAmount}`);
  if (!args.resume) {
    for (const f of [SNAPSHOT, FINAL]) if (fs.existsSync(f)) fs.rmSync(f);
    const cp = path.join(DERIVED_ROOT, '.checkpoints', `${PIPELINE}.json`);
    if (fs.existsSync(cp)) fs.rmSync(cp);
  }
  cleanupPartials();

  const agg = args.resume && fs.existsSync(SNAPSHOT) ? await loadSnapshot() : new Map();
  if (agg.size) console.log(`  snapshot loaded: ${agg.size} rows`);

  const zips = listZips(SUBDIR);
  const completed = new Set(loadCheckpoint(PIPELINE).completed);
  const pending = zips.filter(z => !completed.has(z));
  console.log(`  zips total=${zips.length} completed=${completed.size} pending=${pending.length}`);

  for (const zip of pending) {
    const zipPath = path.join('C:\\donor-map-data\\bulk', SUBDIR, zip);
    const sizeBytes = fs.statSync(zipPath).size;
    process.stdout.write(`  ${zip} (${fmtBytes(sizeBytes)})... `);
    const zt0 = Date.now();
    const cycle = cycleFromFilename(zip);
    let rows = 0, kept = 0;
    for await (const line of streamZip(zipPath)) {
      if (!line) continue;
      rows++;
      const p = line.split('|');
      const cmte = p[0];
      const name = normName(p[8]);
      const state = (p[10] || '').trim().toUpperCase();
      const amt = Number(p[13] || 0);
      const category = (p[16] || '').trim() || null;
      if (!cmte || !name || !amt || Math.abs(amt) < args.minAmount) continue;
      const k = aggKey(cmte, name, state, category);
      if (!agg.has(k)) {
        agg.set(k, {
          cmte_id: cmte, recipient_name: name, recipient_state: state,
          recipient_city: (p[9] || '').trim(),
          category, category_desc: (p[17] || '').trim(),
          total: 0, count: 0, first_cycle: cycle, last_cycle: cycle, cycles: [],
        });
      }
      const row = agg.get(k);
      row.total += amt;
      row.count++;
      if (cycle < row.first_cycle) row.first_cycle = cycle;
      if (cycle > row.last_cycle) row.last_cycle = cycle;
      if (!row.cycles.includes(cycle)) row.cycles.push(cycle);
      kept++;
    }
    writeSnapshot(agg);
    markComplete(PIPELINE, zip);
    console.log(`${rows} rows, ${kept} kept, agg=${agg.size} in ${((Date.now() - zt0) / 1000).toFixed(1)}s`);
  }

  if (fs.existsSync(SNAPSHOT)) {
    if (fs.existsSync(FINAL)) fs.rmSync(FINAL);
    fs.renameSync(SNAPSHOT, FINAL);
  }
  console.log(`\n[done] oppexp ingest in ${((Date.now() - t0) / 60000).toFixed(1)} min. ${agg.size} aggregated rows.`);
  console.log(`[out] ${FINAL}`);
})().catch(err => { console.error(err); process.exit(1); });
