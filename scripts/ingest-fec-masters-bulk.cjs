#!/usr/bin/env node
/**
 * ingest-fec-masters-bulk.cjs
 *
 * Fast (< 5 min total) ingest of Committee Master (cm), Candidate Master (cn),
 * and Candidate-Committee Linkages (ccl) into lookup JSONL files under
 * C:\donor-map-data\fec\. Resume-friendly per ADR-0014.
 *
 * These are the three "reference" datasets — small, with deduped keys across
 * cycles. We keep the latest version of each record (last-seen wins).
 *
 * Usage:
 *   node scripts/ingest-fec-masters-bulk.cjs --resume
 *   node scripts/ingest-fec-masters-bulk.cjs --dry-run
 */

const path = require('path');
const fs = require('fs');
const {
  loadCheckpoint, markComplete, streamZip, cleanupPartials,
  listZips, resolveBulkSubdir, DERIVED_ROOT,
} = require('./lib/fec-ingest-helpers.cjs');

const args = (() => {
  const a = process.argv.slice(2);
  return { resume: a.includes('--resume'), dryRun: a.includes('--dry-run') };
})();

// dataset name → {subdir, outputFile, parseRow (line -> obj with .id key)}
const DATASETS = {
  cm: {
    subdir: 'Committee master',
    output: 'committee-master',
    parseRow: (p) => ({
      id: p[0], name: p[1], treasurer: p[2], street1: p[3], street2: p[4],
      city: p[5], state: p[6], zip: p[7], designation: p[8], type: p[9],
      party: p[10], filing_freq: p[11], interest_group: p[12],
      connected_org: p[13], candidate_id: p[14],
    }),
  },
  cn: {
    subdir: 'Candidates Master',
    output: 'candidate-master',
    parseRow: (p) => ({
      id: p[0], name: p[1], party: p[2], election_year: p[3], state: p[4],
      office: p[5], district: p[6], ici: p[7], status: p[8],
      principal_cmte_id: p[9], street1: p[10], street2: p[11],
      city: p[12], cand_state: p[13], cand_zip: p[14],
    }),
  },
  ccl: {
    subdir: 'Candidate Committee Linkages',
    output: 'candidate-committees',
    // linkages repeat per cycle — use composite key candId|cmteId|electionYr
    parseRow: (p) => ({
      id: `${p[0]}|${p[3]}|${p[1]}`,
      cand_id: p[0], cand_election_yr: p[1], fec_election_yr: p[2],
      cmte_id: p[3], cmte_tp: p[4], cmte_dsgn: p[5], linkage_id: p[6],
    }),
  },
};

async function ingestDataset(name) {
  const ds = DATASETS[name];
  const pipeline = `masters-${name}`;
  const outFinal = path.join(DERIVED_ROOT, `${ds.output}.jsonl`);
  const outPartial = path.join(DERIVED_ROOT, `${ds.output}.partial.jsonl`);

  if (!args.resume && fs.existsSync(outFinal)) fs.rmSync(outFinal);
  if (fs.existsSync(outPartial)) fs.rmSync(outPartial);

  const zips = listZips(ds.subdir);
  const completed = args.resume ? new Set(loadCheckpoint(pipeline).completed) : new Set();
  const pending = zips.filter(z => !completed.has(z));

  console.log(`  ${name}: ${zips.length} zips total, ${pending.length} pending`);

  // Accumulate all records in memory (these datasets are small — <200K records total)
  const records = new Map();
  // If resuming and final file exists, load it
  if (args.resume && fs.existsSync(outFinal)) {
    const text = fs.readFileSync(outFinal, 'utf-8');
    for (const line of text.split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); records.set(r.id, r); } catch {}
    }
    console.log(`    loaded ${records.size} existing records`);
  }

  // Use the resolver so typo'd / case-different directories on disk
  // (e.g. "Comittee Master" vs the canonical "Committee master") work.
  const resolvedDir = resolveBulkSubdir(ds.subdir) || path.join('C:\\donor-map-data\\bulk', ds.subdir)
  for (const zip of pending) {
    const zipPath = path.join(resolvedDir, zip);
    process.stdout.write(`    ${zip}... `);
    let added = 0;
    for await (const line of streamZip(zipPath)) {
      if (!line) continue;
      const p = line.split('|');
      const row = ds.parseRow(p);
      if (!row.id) continue;
      records.set(row.id, row);
      added++;
    }
    markComplete(pipeline, zip);
    console.log(`${added} records`);
  }

  if (args.dryRun) { console.log(`  [dry-run] would write ${records.size} records to ${outFinal}`); return; }

  // Write all records to final file (overwrite)
  const tmpOut = outFinal + '.writing';
  const fd = fs.openSync(tmpOut, 'w');
  for (const r of records.values()) fs.writeSync(fd, JSON.stringify(r) + '\n');
  fs.closeSync(fd);
  if (fs.existsSync(outFinal)) fs.rmSync(outFinal);
  fs.renameSync(tmpOut, outFinal);
  console.log(`  [write] ${outFinal} (${records.size} records)`);
}

(async function main() {
  const t0 = Date.now();
  console.log(`[ingest-fec-masters-bulk] ${args.resume ? 'RESUME' : 'FRESH'}`);
  if (args.resume) cleanupPartials();

  for (const name of ['cm', 'cn', 'ccl']) {
    await ingestDataset(name);
  }

  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[done] masters ingest complete. Wall time ${totalSec}s.`);
})().catch(err => { console.error(`[fatal] ${err.message}`); process.exit(1); });
