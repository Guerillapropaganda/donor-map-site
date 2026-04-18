#!/usr/bin/env node
/**
 * ingest-fec-pas2-bulk.cjs
 *
 * Full-pas2 ingest, classified per ADR-0013. Produces five split files
 * at C:\donor-map-data\fec\. Resume-friendly (ADR-0014).
 *
 * Usage:
 *   node scripts/ingest-fec-pas2-bulk.cjs --resume
 *   node scripts/ingest-fec-pas2-bulk.cjs --cycles 2020,2022,2024,2026
 *   node scripts/ingest-fec-pas2-bulk.cjs --dry-run
 */

const path = require('path');
const fs = require('fs');
const { classifyTransaction } = require('./lib/fec-txn-types.cjs');
const {
  loadCheckpoint, markComplete, streamZip, PartialWriter,
  cleanupPartials, listZips, fmtBytes, DERIVED_ROOT,
} = require('./lib/fec-ingest-helpers.cjs');

const PIPELINE = 'pas2';
const SUBDIR = 'Contributions from committees to candidates & independent expenditures';

const args = (() => {
  const a = process.argv.slice(2);
  const o = { resume: a.includes('--resume'), dryRun: a.includes('--dry-run') };
  const c = a.indexOf('--cycles');
  if (c !== -1) o.cycles = a[c + 1].split(',').map(Number);
  return o;
})();

function cycleFromFilename(f) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  return (yyn >= 80 ? 1900 : 2000) + yyn;
}

// Bucket → output filename
const BUCKET_FILES = {
  'direct-donor': 'pas2-direct-donors',
  'ie-support': 'pas2-ie-support',
  'ie-oppose': 'pas2-ie-oppose',
  'party-support': 'pas2-party',
  'conduit-aggregation': 'pas2-conduit',
  'comm-cost': 'pas2-comm-cost',
  'electioneering': 'pas2-electioneering',
  'anomaly': 'pas2-anomalies',
  'unknown': 'pas2-unknown',
};

(async function main() {
  const t0 = Date.now();
  console.log(`[ingest-fec-pas2-bulk] ${args.resume ? 'RESUME' : 'FRESH'} mode. dry-run=${args.dryRun}`);

  if (args.resume) cleanupPartials();
  else {
    // Fresh run: nuke everything in DERIVED_ROOT that starts with "pas2-"
    for (const f of fs.readdirSync(DERIVED_ROOT).filter(n => n.startsWith('pas2-'))) {
      fs.rmSync(path.join(DERIVED_ROOT, f), { force: true });
    }
    // Reset checkpoint
    const cp = path.join(DERIVED_ROOT, '.checkpoints', `${PIPELINE}.json`);
    if (fs.existsSync(cp)) fs.rmSync(cp);
  }

  const zips = listZips(SUBDIR).filter(z => {
    if (!args.cycles) return true;
    return args.cycles.includes(cycleFromFilename(z));
  });
  const completed = new Set(loadCheckpoint(PIPELINE).completed);
  const pending = zips.filter(z => !completed.has(z));

  console.log(`  zips total=${zips.length} completed=${completed.size} pending=${pending.length}`);

  for (const zip of pending) {
    const zipPath = path.join('C:\\donor-map-data\\bulk', SUBDIR, zip);
    const sizeBytes = fs.statSync(zipPath).size;
    process.stdout.write(`  ${zip} (${fmtBytes(sizeBytes)})... `);
    const zt0 = Date.now();
    const writers = {};
    function getWriter(bucket) {
      const fname = BUCKET_FILES[bucket] || `pas2-${bucket}`;
      if (!writers[fname]) writers[fname] = new PartialWriter(fname);
      return writers[fname];
    }

    let rows = 0, classified = 0;
    try {
      for await (const line of streamZip(zipPath)) {
        if (!line) continue;
        rows++;
        const p = line.split('|');
        const srcCmte = p[0];
        const txnTp = p[5];
        const amt = Number(p[14] || 0);
        const candId = (p[16] || '').toUpperCase();
        if (!srcCmte || !txnTp) continue;
        const cls = classifyTransaction({ srcCmte, txnTp, amount: amt, candId });
        const row = {
          src_cmte_id: srcCmte,
          cand_id: candId || null,
          txn_tp: txnTp,
          amount: amt,
          cycle: cycleFromFilename(zip),
          txn_date: p[13] || null,
          image_num: p[4] || null,
          sub_id: p[21] || null,
          entity_tp: p[6] || null,
          other_id: p[15] || null,
          memo_text: p[20] || null,
        };
        if (cls.anomalies.length) row.anomaly_reasons = cls.anomalies;
        if (!args.dryRun) getWriter(cls.bucket).write(row);
        classified++;
      }
      // Commit partials to final
      for (const w of Object.values(writers)) w.commit();
      markComplete(PIPELINE, zip);
      const secs = ((Date.now() - zt0) / 1000).toFixed(1);
      console.log(`${rows} rows, ${classified} classified in ${secs}s`);
    } catch (err) {
      for (const w of Object.values(writers)) w.abort();
      console.log(`FAILED: ${err.message}`);
      throw err;
    }
  }

  const totalMin = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n[done] pas2 ingest complete. Wall time ${totalMin} min.`);
  console.log(`[out] ${DERIVED_ROOT}\\pas2-*.jsonl`);
})().catch(err => {
  console.error(`[fatal] ${err.message}`);
  process.exit(1);
});
