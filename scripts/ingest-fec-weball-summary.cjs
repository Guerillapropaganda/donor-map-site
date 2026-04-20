#!/usr/bin/env node
/**
 * ingest-fec-weball-summary.cjs
 *
 * Ingests FEC's "all candidates" (weballXX) cycle-summary zips from
 * C:/donor-map-data/bulk/All candidates/. Output: one JSONL record per
 * (cand_id, cycle) with cycle-level totals. Emitted to
 * C:/donor-map-data/fec/candidate-summary.jsonl.
 *
 * WHY THIS EXISTS:
 *   scripts/ingest-fec-indiv-aggregate.cjs captures INDIVIDUAL
 *   itemized contributions at ≥$10K. Mega-donor-heavy campaigns are
 *   well-covered that way. Small-dollar campaigns (Bernie's $218M
 *   from $18-average donations) are almost entirely invisible — no
 *   individual contribution ≥$10K exists to itemize.
 *
 *   This script solves the other half: grab cycle-level totals
 *   (total_receipts, total_individual_contributions, total_pac
 *   contributions) for every federal candidate every cycle, so small-
 *   dollar campaigns gain a real total-raised number even when the
 *   itemized data is thin.
 *
 * WEBALL FILE FORMAT (pipe-delimited, no header):
 *   1  cand_id          7   trans_from_auth          24 gen_election
 *   2  cand_name        8   ttl_disb                 25 gen_election_percent
 *   3  cand_ici         9   trans_to_auth            26 other_pol_cmte_contrib
 *   4  pty_cd           10  coh_bop                  27 pol_pty_contrib
 *   5  cand_pty_aff     11  coh_cop                  28 cvg_end_dt
 *   6  ttl_receipts     12  cand_contrib             29 indiv_refunds
 *                       13  cand_loans               30 cmte_refunds
 *                       14  other_loans
 *                       15  cand_loan_repay
 *                       16  other_loan_repay
 *                       17  debts_owed_by
 *                       18  ttl_indiv_contrib
 *                       19  cand_office_st
 *                       20  cand_office_district
 *                       21  spec_election
 *                       22  prim_election
 *                       23  run_election
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Readable } = require('stream');
const yauzl = require('yauzl');
const {
  DERIVED_ROOT, ensureDerivedDirs, listZips, assertBulkSentinel,
} = require('./lib/fec-ingest-helpers.cjs');

assertBulkSentinel();

const SUBDIR = 'All candidates';
const OUT_FILE = path.join(DERIVED_ROOT, 'candidate-summary.jsonl');
const WRITE = process.argv.includes('--write');

function parseCycleFromFilename(name) {
  const m = name.match(/weball(\d{2})\.zip/);
  if (!m) return null;
  const yy = parseInt(m[1], 10);
  // weball98 → 1998, weball00 → 2000, weball24 → 2024
  return yy >= 80 ? 1900 + yy : 2000 + yy;
}

function parseRow(line, cycle) {
  const f = line.split('|');
  if (f.length < 18) return null;
  if (!f[0] || !f[1]) return null;
  const num = (i) => {
    const v = Number(f[i]);
    return Number.isFinite(v) ? v : 0;
  };
  return {
    cand_id: f[0].trim(),
    cand_name: f[1].trim(),
    cand_ici: f[2].trim() || null,
    cand_pty_affiliation: f[4].trim() || null,
    ttl_receipts: num(5),
    ttl_disb: num(7),
    coh_cop: num(10),
    cand_contrib: num(11),
    debts_owed_by: num(16),
    ttl_indiv_contrib: num(17),
    cand_office_st: f[18] ? f[18].trim() : null,
    cand_office_district: f[19] ? f[19].trim() : null,
    other_pol_cmte_contrib: num(25),
    pol_pty_contrib: num(26),
    cvg_end_dt: f[27] ? f[27].trim() : null,
    indiv_refunds: num(28),
    cycle,
  };
}

async function streamZip(zipPath, onLine) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.readEntry();
      zip.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) { zip.readEntry(); return; }
        zip.openReadStream(entry, (e2, stream) => {
          if (e2) return reject(e2);
          const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
          rl.on('line', onLine);
          rl.on('close', () => zip.readEntry());
          rl.on('error', reject);
        });
      });
      zip.on('end', resolve);
      zip.on('error', reject);
    });
  });
}

(async function main() {
  ensureDerivedDirs();
  const zips = listZips(SUBDIR);
  if (zips.length === 0) {
    console.error('No weball zips found at bulk/' + SUBDIR);
    process.exit(1);
  }

  console.log(`[ingest-fec-weball-summary] ${WRITE ? 'WRITE' : 'DRY-RUN'}`);
  console.log(`  zips: ${zips.length}`);

  const rows = [];
  for (const z of zips) {
    const cycle = parseCycleFromFilename(z);
    if (!cycle) { console.log(`  skip (bad cycle): ${z}`); continue; }
    const zipPath = path.join('C:\\donor-map-data\\bulk', SUBDIR, z);
    let count = 0;
    const t0 = Date.now();
    await streamZip(zipPath, (line) => {
      if (!line.trim()) return;
      const r = parseRow(line, cycle);
      if (!r) return;
      rows.push(r);
      count++;
    });
    console.log(`  ${z.padEnd(20)} cycle=${cycle}  ${String(count).padStart(5)} rows  ${((Date.now()-t0)/1000).toFixed(1)}s`);
  }

  console.log(`\n  total rows parsed: ${rows.length}`);

  // Quick sanity check: Bernie totals across cycles
  const bernie = rows.filter((r) => /SANDERS,\s*BERN/i.test(r.cand_name));
  if (bernie.length > 0) {
    console.log('\n  sanity — Bernie summary rows:');
    for (const b of bernie.slice(0, 10)) {
      console.log(`    ${b.cand_id} ${b.cand_name.padEnd(20)} cycle=${b.cycle} receipts=$${(b.ttl_receipts/1e6).toFixed(1)}M indiv=$${(b.ttl_indiv_contrib/1e6).toFixed(1)}M`);
    }
  }

  if (!WRITE) {
    console.log(`\n  rerun with --write to save to ${OUT_FILE}`);
    return;
  }

  const lines = rows.map((r) => JSON.stringify(r));
  fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n');
  console.log(`\n  wrote ${lines.length} rows → ${OUT_FILE} (${(fs.statSync(OUT_FILE).size / 1e6).toFixed(1)}MB)`);
})();
