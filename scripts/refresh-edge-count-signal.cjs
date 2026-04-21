#!/usr/bin/env node
/**
 * refresh-edge-count-signal.cjs
 *
 * Rebuilds `signals.edge_count` for every entity in data/entities.jsonl
 * by streaming the canonical + derived edge files and counting edges
 * where the entity appears as either `from` or `to`.
 *
 * The field drifts stale whenever:
 *   - new edges land via ingest pipelines (which don't write back to
 *     the entity store)
 *   - dedup runs rewrite from/to to canonical names (which updates the
 *     edges but not the entity signal)
 *   - new entities are registered (auto-registered with edge_count: 0
 *     before the first count pass)
 *
 * From 2026-04-20 Pattern-H audit: roughly 46% of entities had stale
 * edge_count: 0 stamps despite real edges in the store. This script is
 * the rebuilder for that bucket.
 *
 * Dry-run by default (prints stats + sample drift). --apply to write.
 *
 * Usage:
 *   node scripts/refresh-edge-count-signal.cjs
 *   node scripts/refresh-edge-count-signal.cjs --apply
 *   node scripts/refresh-edge-count-signal.cjs --apply --min-drift 1
 */
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const MIN_DRIFT_IDX = process.argv.indexOf('--min-drift');
const MIN_DRIFT = MIN_DRIFT_IDX > -1 ? Number(process.argv[MIN_DRIFT_IDX + 1]) : 1;

const ROOT = path.join(__dirname, '..');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const REL_FILE = path.join(ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(ROOT, 'data', 'derived');

function streamCount(file, counts) {
  const CHUNK = 64 * 1024 * 1024;
  const fd = fs.openSync(file, 'r');
  const size = fs.fstatSync(fd).size;
  let offset = 0, carry = '';
  try {
    while (offset < size) {
      const len = Math.min(CHUNK, size - offset);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, offset);
      offset += len;
      const chunk = carry + buf.toString('utf-8');
      const lines = chunk.split('\n');
      carry = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (e.from) counts.set(e.from, (counts.get(e.from) || 0) + 1);
        if (e.to && e.to !== e.from) counts.set(e.to, (counts.get(e.to) || 0) + 1);
      }
    }
    if (carry.trim()) {
      try {
        const e = JSON.parse(carry);
        if (e.from) counts.set(e.from, (counts.get(e.from) || 0) + 1);
        if (e.to && e.to !== e.from) counts.set(e.to, (counts.get(e.to) || 0) + 1);
      } catch {}
    }
  } finally { fs.closeSync(fd); }
}

function main() {
  const counts = new Map();
  const edgeFiles = [REL_FILE];
  if (fs.existsSync(DERIVED_DIR)) {
    for (const f of fs.readdirSync(DERIVED_DIR).sort()) {
      if (f.endsWith('.jsonl')) edgeFiles.push(path.join(DERIVED_DIR, f));
    }
  }

  console.log(`streaming ${edgeFiles.length} edge file(s)...`);
  for (const f of edgeFiles) {
    if (!fs.existsSync(f)) continue;
    streamCount(f, counts);
    process.stdout.write(`  ${path.basename(f)}: running total ${counts.size} unique names\n`);
  }

  const entities = fs.readFileSync(ENT_FILE, 'utf-8')
    .split(/\n/).filter(Boolean).map(JSON.parse);

  let drifted = 0, zeroStale = 0, newFlow = 0, matchingAlready = 0;
  const samples = [];
  for (const e of entities) {
    const actual = counts.get(e.name) || 0;
    const stored = Number((e.signals && e.signals.edge_count) ?? 0);
    if (actual === stored) { matchingAlready++; continue; }
    const diff = actual - stored;
    if (Math.abs(diff) < MIN_DRIFT) continue;
    drifted++;
    if (stored === 0 && actual > 0) zeroStale++;
    if (actual > stored) newFlow++;
    if (samples.length < 15 && actual > stored) {
      samples.push({ name: e.name, stored, actual, delta: diff });
    }
  }

  console.log(`\nentities scanned: ${entities.length}`);
  console.log(`  already-correct: ${matchingAlready}`);
  console.log(`  drifted:         ${drifted}  (${Math.round(100*drifted/entities.length)}%)`);
  console.log(`  zero-stale:      ${zeroStale}  (previously 0, now >0)`);
  console.log(`  new flow:        ${newFlow}    (any upward drift)`);
  console.log(`\nsample upward-drift entities:`);
  for (const s of samples) {
    console.log(`  ${s.name.padEnd(45)}  ${String(s.stored).padStart(5)} → ${String(s.actual).padStart(6)}  (+${s.delta})`);
  }

  if (!APPLY) { console.log('\n(dry-run — pass --apply to write)'); return; }
  if (drifted === 0) { console.log('\nNothing to do.'); return; }

  // Apply updates.
  fs.copyFileSync(ENT_FILE, ENT_FILE + '.pre-edge-count-refresh.bak');
  const now = new Date().toISOString();
  let touched = 0;
  for (const e of entities) {
    const actual = counts.get(e.name) || 0;
    const stored = Number((e.signals && e.signals.edge_count) ?? 0);
    if (actual === stored) continue;
    if (Math.abs(actual - stored) < MIN_DRIFT) continue;
    e.signals = e.signals || {};
    e.signals.edge_count = actual;
    e.signals.edge_count_refreshed_at = now;
    e.last_updated = now;
    touched++;
  }
  fs.writeFileSync(ENT_FILE, entities.map((e) => JSON.stringify(e)).join('\n') + '\n');
  console.log(`\nupdated ${touched} entity records. Backup at .pre-edge-count-refresh.bak`);
}

main();
