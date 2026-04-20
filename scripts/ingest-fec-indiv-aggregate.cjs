#!/usr/bin/env node
/**
 * ingest-fec-indiv-aggregate.cjs
 *
 * Streams every indiv zip, aggregates in-memory to (committee, donor_name,
 * donor_state) rolled-up totals, writes to indiv-by-committee.jsonl at
 * C:\donor-map-data\fec\. Resume-friendly per ADR-0014.
 *
 * DESIGN — committees-of-interest filter:
 *   The indiv dataset is huge (100M+ rows). Most rows go to small state/local
 *   committees the vault doesn't care about editorially. We filter to only
 *   keep rows where CMTE_ID appears in the union of pas2 output committees
 *   — i.e. any committee that ever gave to a candidate, did IE support/oppose,
 *   or acted as a conduit. That cuts row-keep by ~80% and bounds heap to
 *   ~2-4GB for the aggregation.
 *
 *   Requires pas2 ingest to have completed first. Reads the committee set
 *   from pas2-direct-donors.jsonl + pas2-ie-support.jsonl +
 *   pas2-ie-oppose.jsonl + pas2-conduit.jsonl.
 *
 * Resume detail: aggregation state is snapshotted to `indiv-agg.snapshot.jsonl`
 * after each zip completes. On resume, the snapshot is reloaded into memory
 * before the next zip. Crash mid-zip loses at most one zip's work.
 *
 * Usage:
 *   node --max-old-space-size=8192 scripts/ingest-fec-indiv-aggregate.cjs --resume
 */

const path = require('path');
const fs = require('fs');
const {
  loadCheckpoint, markComplete, streamZip, cleanupPartials,
  listZips, fmtBytes, DERIVED_ROOT, ensureDerivedDirs,
  assertBulkSentinel,
} = require('./lib/fec-ingest-helpers.cjs');

// Guard — fail closed if bulk dir is missing or .keepzips sentinel gone.
// Prevents silent empty-output runs when the bulk archive has been
// accidentally cleaned (see incident 2026-04-20).
assertBulkSentinel();

const PIPELINE = 'indiv';
const SUBDIR = 'Contributions by Individuals';
const SNAPSHOT = path.join(DERIVED_ROOT, 'indiv-agg.snapshot.jsonl');
const FINAL = path.join(DERIVED_ROOT, 'indiv-by-committee.jsonl');

const args = (() => {
  const a = process.argv.slice(2);
  const o = { resume: a.includes('--resume'), dryRun: a.includes('--dry-run') };
  const c = a.indexOf('--cycles');
  if (c !== -1) o.cycles = a[c + 1].split(',').map(Number);
  // Min contribution threshold. Default $10K.
  // The Tier 2 mega-donor story is about donors giving $10K+ per transaction
  // to political committees (true mega-donors give $1M-$250M chunks). At
  // $1K threshold the in-memory aggregation Map exceeds V8's 8GB heap by
  // indiv16. $10K keeps the map at ~1M entries, ~2GB heap. For sub-$10K
  // individual contribution research, run with --min-amount 1000 and
  // --max-old-space-size=24576, OR refactor to disk-backed aggregation.
  const m = a.indexOf('--min-amount');
  o.minAmount = m !== -1 ? Number(a[m + 1]) : 10000;
  return o;
})();

function cycleFromFilename(f) {
  const yy = f.replace(/\D/g, '').padStart(2, '0').slice(-2);
  const yyn = parseInt(yy, 10);
  return (yyn >= 80 ? 1900 : 2000) + yyn;
}

function normName(s) { return (s || '').toUpperCase().replace(/[^A-Z0-9 ,.-]/g, '').trim(); }

function aggKey(cmte, name, state) { return `${cmte}|${name}|${state}`; }

/**
 * Build committees-of-interest set from pas2 output. Only committees that
 * participate in pas2 (gave to candidates, IE, conduit, party) are kept.
 * Reads files at line level — fast, no parse of full JSONL required.
 */
async function buildPoiSet() {
  const poi = new Set();
  const readline = require('readline');
  const files = [
    'pas2-direct-donors.jsonl',
    'pas2-ie-support.jsonl',
    'pas2-ie-oppose.jsonl',
    'pas2-conduit.jsonl',
    'pas2-party.jsonl',
  ];
  for (const f of files) {
    const p = path.join(DERIVED_ROOT, f);
    if (!fs.existsSync(p)) continue;
    const rl = readline.createInterface({
      input: fs.createReadStream(p, { encoding: 'utf-8' }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (!line) continue;
      // Extract src_cmte_id via fast substring, avoid full JSON parse
      const m = line.match(/"src_cmte_id":"([^"]+)"/);
      if (m) poi.add(m[1]);
    }
  }

  // Extension (2026-04-20): the pas2-only POI excluded candidate
  // campaign committees that only RECEIVE donations — Bernie's 2020
  // presidential committee C00577130, Trump campaign committees, etc.
  // Widen the set to also include:
  //   a) every principal_cmte_id in FEC candidate-master.jsonl —
  //      covers all federal candidate campaign committees for every
  //      cycle the master file spans (1988 → present)
  //   b) every cmte_id explicitly registered in the vault's
  //      fec-committee-registry.json — catches affiliate and custom
  //      mappings we've made
  // Before fix: 20K aggregated 2020 rows total. After: all campaign
  // committees with ≥$200 itemized contributions are retained.
  try {
    const candidateMaster = path.join(DERIVED_ROOT, 'candidate-master.jsonl');
    if (fs.existsSync(candidateMaster)) {
      const rl2 = readline.createInterface({
        input: fs.createReadStream(candidateMaster, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
      });
      for await (const line of rl2) {
        if (!line) continue;
        const m = line.match(/"principal_cmte_id":"([^"]+)"/);
        if (m && m[1]) poi.add(m[1]);
      }
    }
  } catch {}

  try {
    const REPO_ROOT = path.resolve(__dirname, '..');
    const regFile = path.join(REPO_ROOT, 'data', 'fec-committee-registry.json');
    if (fs.existsSync(regFile)) {
      const reg = JSON.parse(fs.readFileSync(regFile, 'utf-8'));
      for (const cid of Object.keys(reg)) {
        if (/^C\d{8}$/.test(cid)) poi.add(cid);
      }
    }
  } catch {}

  return poi;
}

function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT)) return new Map();
  const m = new Map();
  let count = 0;
  const rl = require('readline').createInterface({
    input: fs.createReadStream(SNAPSHOT, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (!line) return;
      try {
        const r = JSON.parse(line);
        m.set(aggKey(r.cmte_id, r.donor_name, r.donor_state), r);
        count++;
      } catch {}
    });
    rl.on('close', () => { console.log(`  snapshot loaded: ${count} aggregated rows`); resolve(m); });
  });
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
  console.log(`[ingest-fec-indiv-aggregate] ${args.resume ? 'RESUME' : 'FRESH'}. min-amount=$${args.minAmount}`);

  if (!args.resume) {
    // Fresh: drop snapshot + final + checkpoint
    for (const f of [SNAPSHOT, FINAL]) if (fs.existsSync(f)) fs.rmSync(f);
    const cp = path.join(DERIVED_ROOT, '.checkpoints', `${PIPELINE}.json`);
    if (fs.existsSync(cp)) fs.rmSync(cp);
  }
  cleanupPartials();

  // Build committees-of-interest set from pas2 output
  console.log('  building committees-of-interest set from pas2 output...');
  const poi = await buildPoiSet();
  console.log(`  POI set: ${poi.size} committees`);
  if (poi.size === 0) {
    console.error('  [fatal] POI set empty — run scripts/ingest-fec-pas2-bulk.cjs first');
    process.exit(1);
  }

  const agg = args.resume && fs.existsSync(SNAPSHOT) ? await loadSnapshot() : new Map();

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
    let rows = 0, kept = 0;
    const cycle = cycleFromFilename(zip);

    try {
      for await (const line of streamZip(zipPath)) {
        if (!line) continue;
        rows++;
        const p = line.split('|');
        const cmte = p[0];
        const name = normName(p[7]);
        const state = (p[9] || '').trim().toUpperCase();
        const amt = Number(p[14] || 0);
        const employer = (p[11] || '').trim();
        const occupation = (p[12] || '').trim();
        if (!cmte || !poi.has(cmte)) continue; // skip committees not in pas2 output
        if (!name || !amt || Math.abs(amt) < args.minAmount) continue;
        const k = aggKey(cmte, name, state);
        if (!agg.has(k)) {
          agg.set(k, {
            cmte_id: cmte, donor_name: name, donor_state: state,
            donor_city: (p[8] || '').trim(),
            donor_employer: employer, donor_occupation: occupation,
            total: 0, count: 0,
            first_cycle: cycle, last_cycle: cycle, cycles: [],
          });
        }
        const row = agg.get(k);
        row.total += amt;
        row.count++;
        if (cycle < row.first_cycle) row.first_cycle = cycle;
        if (cycle > row.last_cycle) row.last_cycle = cycle;
        if (!row.cycles.includes(cycle)) row.cycles.push(cycle);
        // Upgrade employer/occupation if more informative
        if (!row.donor_employer && employer) row.donor_employer = employer;
        if (!row.donor_occupation && occupation) row.donor_occupation = occupation;
        kept++;
      }

      if (!args.dryRun) writeSnapshot(agg);
      markComplete(PIPELINE, zip);
      const secs = ((Date.now() - zt0) / 1000).toFixed(1);
      console.log(`${rows} rows, ${kept} kept, agg=${agg.size} in ${secs}s`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      throw err;
    }
  }

  // Final: snapshot → final
  if (!args.dryRun && fs.existsSync(SNAPSHOT)) {
    if (fs.existsSync(FINAL)) fs.rmSync(FINAL);
    fs.renameSync(SNAPSHOT, FINAL);
    console.log(`[rename] ${SNAPSHOT} → ${FINAL}`);
  }

  const totalMin = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n[done] indiv aggregation complete. Wall time ${totalMin} min. ${agg.size} aggregated rows.`);
  console.log(`[out] ${FINAL}`);
})().catch(err => {
  console.error(`[fatal] ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
