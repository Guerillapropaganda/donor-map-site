#!/usr/bin/env node
/**
 * ingest-fec-oth-bulk.cjs
 *
 * Ingests FEC "Any transaction from one committee to another" (oth) bulk
 * zips. These are Schedule B transfers between committees — the middle
 * hops in multi-layer money flows.
 *
 * Use cases:
 *   - 3-hop traces: Adelson → SLF → Conservative Solutions PAC → Rubio
 *   - JFC distributions to constituent committees
 *   - AIPAC → UDP ↔ DMFI internal movements
 *   - Dark-money 501(c)(4) → super-PAC transfers when they're filed
 *
 * Output: C:\donor-map-data\fec\oth-transfers.jsonl
 *   Rows: { src_cmte_id, dst_cmte_id, amount, cycle, txn_tp, txn_date,
 *           purpose, image_num, sub_id }
 *
 * Resume-friendly via per-zip checkpoint (ADR-0014).
 *
 * Usage:
 *   node scripts/ingest-fec-oth-bulk.cjs
 *   node scripts/ingest-fec-oth-bulk.cjs --resume
 *   node scripts/ingest-fec-oth-bulk.cjs --min-amount 1000
 */

const path = require('path');
const fs = require('fs');
const {
  loadCheckpoint, markComplete, streamZip, PartialWriter,
  cleanupPartials, listZips, fmtBytes, DERIVED_ROOT, ensureDerivedDirs,
} = require('./lib/fec-ingest-helpers.cjs');

const PIPELINE = 'oth';
const SUBDIR = 'Committee to committee transactions';
const OUTPUT_NAME = 'oth-transfers';
const FINAL = path.join(DERIVED_ROOT, `${OUTPUT_NAME}.jsonl`);

const args = (() => {
  const a = process.argv.slice(2);
  const o = { resume: a.includes('--resume') };
  const m = a.indexOf('--min-amount');
  o.minAmount = m !== -1 ? Number(a[m + 1]) : 500;
  return o;
})();

function cycleFromFilename(f) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  return (yyn >= 80 ? 1900 : 2000) + yyn;
}

(async function main() {
  ensureDerivedDirs();
  const t0 = Date.now();
  console.log(`[ingest-fec-oth-bulk] ${args.resume ? 'RESUME' : 'FRESH'}. min-amount=$${args.minAmount}`);

  if (!args.resume) {
    if (fs.existsSync(FINAL)) fs.rmSync(FINAL);
    const cp = path.join(DERIVED_ROOT, '.checkpoints', `${PIPELINE}.json`);
    if (fs.existsSync(cp)) fs.rmSync(cp);
  }
  cleanupPartials();

  const zips = listZips(SUBDIR);
  const completed = new Set(loadCheckpoint(PIPELINE).completed);
  const pending = zips.filter(z => !completed.has(z));
  console.log(`  zips total=${zips.length} completed=${completed.size} pending=${pending.length}`);

  // oth schema (pipe-delimited, matching pas2 format):
  // CMTE_ID|AMNDT_IND|RPT_TP|TRANSACTION_PGI|IMAGE_NUM|TRANSACTION_TP|
  //   ENTITY_TP|NAME|CITY|STATE|ZIP_CODE|EMPLOYER|OCCUPATION|TRANSACTION_DT|
  //   TRANSACTION_AMT|OTHER_ID|TRAN_ID|FILE_NUM|MEMO_CD|MEMO_TEXT|SUB_ID
  //
  // For committee-to-committee transfers, OTHER_ID contains the recipient
  // committee's CMTE_ID (not a candidate ID).

  for (const zip of pending) {
    const zipPath = path.join('C:\\donor-map-data\\bulk', SUBDIR, zip);
    const sizeBytes = fs.statSync(zipPath).size;
    process.stdout.write(`  ${zip} (${fmtBytes(sizeBytes)})... `);
    const zt0 = Date.now();
    const writer = new PartialWriter(OUTPUT_NAME);
    const cycle = cycleFromFilename(zip);
    let rows = 0, kept = 0;
    try {
      for await (const line of streamZip(zipPath)) {
        if (!line) continue;
        rows++;
        const p = line.split('|');
        const srcCmte = p[0];
        const amt = Number(p[14] || 0);
        const dstCmte = p[15]; // OTHER_ID
        if (!srcCmte || !dstCmte || !amt || Math.abs(amt) < args.minAmount) continue;
        writer.write({
          src_cmte_id: srcCmte,
          dst_cmte_id: dstCmte,
          cycle,
          txn_tp: p[5] || null,
          amount: amt,
          txn_date: p[13] || null,
          image_num: p[4] || null,
          memo_text: (p[19] || '').trim() || null,
          sub_id: p[20] || null,
        });
        kept++;
      }
      writer.commit();
      markComplete(PIPELINE, zip);
      console.log(`${rows} rows, ${kept} kept in ${((Date.now() - zt0) / 1000).toFixed(1)}s`);
    } catch (err) {
      writer.abort();
      console.log(`FAILED: ${err.message}`);
      throw err;
    }
  }

  console.log(`\n[done] oth ingest in ${((Date.now() - t0) / 60000).toFixed(1)} min.`);
  console.log(`[out] ${FINAL}`);
})().catch(err => { console.error(err); process.exit(1); });
