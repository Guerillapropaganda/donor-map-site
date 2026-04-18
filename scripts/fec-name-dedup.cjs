#!/usr/bin/env node
/**
 * fec-name-dedup.cjs
 *
 * Reduces name-variant duplicates in indiv-by-committee.jsonl. FEC filings
 * use inconsistent name formatting across cycles — "SMITH, JOHN A" vs
 * "SMITH, JOHN" vs "SMITH, JOHN A JR" — and our indiv aggregation treats
 * each variant as a separate donor.
 *
 * Strategy:
 *   1. Group rows by (last, first, state, employer-lower).
 *   2. Within each group, pick the longest-name variant as canonical.
 *   3. Merge totals + counts + cycles into the canonical row.
 *   4. Overwrite indiv-by-committee.jsonl with deduped rows.
 *
 * Usage:
 *   node scripts/fec-name-dedup.cjs                 # dry-run report
 *   node scripts/fec-name-dedup.cjs --write         # rewrite file
 *
 * Idempotent: running it twice yields no further merges.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const FEC = 'C:\\donor-map-data\\fec';
const SRC = path.join(FEC, 'indiv-by-committee.jsonl');

const WRITE = process.argv.includes('--write');

function dedupKey(r) {
  // LAST, FIRST[ MIDDLE][ SUFFIX]. Extract LAST + FIRST (first token of given names).
  const [last = '', rest = ''] = (r.donor_name || '').split(',', 2).map(s => s.trim());
  const first = rest.split(/\s+/)[0] || '';
  const employer = (r.donor_employer || '').toUpperCase().slice(0, 20).trim();
  return `${r.cmte_id}|${last}|${first}|${r.donor_state}|${employer}`;
}

function mergeInto(target, src) {
  target.total += src.total;
  target.count += src.count;
  if (src.first_cycle < target.first_cycle) target.first_cycle = src.first_cycle;
  if (src.last_cycle > target.last_cycle) target.last_cycle = src.last_cycle;
  for (const c of src.cycles) if (!target.cycles.includes(c)) target.cycles.push(c);
  // Prefer longer donor_name (more complete)
  if ((src.donor_name || '').length > (target.donor_name || '').length) target.donor_name = src.donor_name;
  // Prefer populated employer / occupation
  if (!target.donor_employer && src.donor_employer) target.donor_employer = src.donor_employer;
  if (!target.donor_occupation && src.donor_occupation) target.donor_occupation = src.donor_occupation;
}

(async function main() {
  if (!fs.existsSync(SRC)) { console.error(`[fatal] ${SRC} not found`); process.exit(1); }
  console.log('[fec-name-dedup] scanning...');

  const groups = new Map();
  const rl = readline.createInterface({
    input: fs.createReadStream(SRC, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });
  let scanned = 0;
  for await (const line of rl) {
    if (!line) continue;
    scanned++;
    const r = JSON.parse(line);
    const k = dedupKey(r);
    if (!groups.has(k)) { groups.set(k, r); continue; }
    mergeInto(groups.get(k), r);
  }

  const merged = scanned - groups.size;
  console.log(`  scanned ${scanned}, deduped to ${groups.size} (${merged} variants merged)`);

  if (!WRITE) { console.log('[dry-run] use --write to apply'); return; }

  const tmp = SRC + '.dedup';
  const fd = fs.openSync(tmp, 'w');
  for (const r of groups.values()) fs.writeSync(fd, JSON.stringify(r) + '\n');
  fs.closeSync(fd);
  fs.rmSync(SRC);
  fs.renameSync(tmp, SRC);
  console.log(`[write] ${SRC} — ${groups.size} rows`);
})().catch(err => { console.error(err); process.exit(1); });
