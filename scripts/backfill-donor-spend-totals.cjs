#!/usr/bin/env node
/**
 * backfill-donor-spend-totals.cjs — ADR-0017 Session I
 *
 * Computes `total-political-spend` for donor / corporation / pac /
 * think-tank / lobbying-firm profiles by aggregating outgoing
 * monetary edges across all canonical edge stores:
 *   - data/derived/fec-bulk.jsonl     (PAC cycle summaries)
 *   - data/derived/fec-pas2.jsonl     (PAC-to-candidate)
 *   - data/derived/irs-990-bulk.jsonl (nonprofit grants)
 *
 * Key matching: exact lowercased profile title against edge `from`
 * field. Less flexible than fuzzy matching, but defensible — we
 * don't want to attribute spending to the wrong entity.
 *
 * Eligibility:
 *   - type is donor / corporation / pac / think-tank / lobbying-firm
 *   - no total-political-spend or total-raised already
 *   - no blocking flags in body (rule 13)
 *   - exact title match in aggregated spending map
 *
 * Usage:
 *   node scripts/backfill-donor-spend-totals.cjs           # dry-run
 *   node scripts/backfill-donor-spend-totals.cjs --write
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

const DONOR_TYPES = new Set(['donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm']);

const EDGE_STORES = [
  'data/derived/fec-bulk.jsonl',
  'data/derived/fec-pas2.jsonl',
  'data/derived/irs-990-bulk.jsonl',
];

function aggregateSpend() {
  const byName = new Map();
  for (const rel of EDGE_STORES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      if (!line) continue;
      try {
        const e = JSON.parse(line);
        if (e.status && e.status !== 'active') continue;
        const amt = Number(e.amount) || 0;
        if (amt <= 0 || !e.from) continue;
        const key = String(e.from).trim().toLowerCase();
        const prev = byName.get(key) || { total: 0, edges: 0, cycles: new Set(), stores: new Set() };
        prev.total += amt;
        prev.edges += 1;
        if (e.cycle) prev.cycles.add(String(e.cycle));
        prev.stores.add(path.basename(rel));
        byName.set(key, prev);
      } catch {
        // skip
      }
    }
  }
  return byName;
}

function formatDollars(amount) {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (amount >= 1e3) return `$${Math.round(amount / 1e3)}K`;
  return `$${Math.round(amount)}`;
}

function hasBlockingFlags(body) {
  return /\(URL NEEDED\)|\(UNVERIFIED\)|\(NEEDS REVIEW\)|defamation-sanitized/i.test(body);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'Assets') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  try {
    return { fm: yaml.load(m[1]) || {}, body: raw.slice(m[0].length) };
  } catch {
    return null;
  }
}

function insertSpendField(raw, formatted, cycles, storeCount) {
  const cycleStr = cycles.length ? cycles.join(', ') : 'unknown';
  const fields = [
    `total-political-spend: "${formatted}"`,
    `spend-source: "aggregated from canonical FEC/IRS edge stores across ${storeCount} store(s), cycles ${cycleStr}"`,
  ];
  let updated = raw;
  for (const field of fields) {
    const key = field.split(':')[0];
    const lineRe = new RegExp(`^${key}:\\s*.+$`, 'm');
    if (lineRe.test(updated)) {
      updated = updated.replace(lineRe, field);
    } else {
      updated = updated.replace(/\r?\n---\r?\n/, `\n${field}\n---\n`);
    }
  }
  return updated;
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  backfill-donor-spend-totals — ADR-0017 Session I');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}${LIMIT < Infinity ? ` (limit ${LIMIT})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const spend = aggregateSpend();
  console.log(`  ${spend.size} entities with outgoing monetary edges across 3 stores\n`);

  const files = walk(CONTENT_DIR);
  const stats = {
    totalDonorType: 0,
    skippedHas: 0,
    skippedFlags: 0,
    skippedNoMatch: 0,
    eligible: 0,
    written: 0,
  };
  const amountDist = { '<10K': 0, '10K-100K': 0, '100K-1M': 0, '1M-10M': 0, '10M-100M': 0, '100M+': 0 };

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { fm, body } = parsed;
    if (!fm.type || !DONOR_TYPES.has(fm.type)) continue;
    stats.totalDonorType++;

    if (fm['total-political-spend'] || fm['total-raised']) {
      stats.skippedHas++;
      continue;
    }
    if (hasBlockingFlags(body)) {
      stats.skippedFlags++;
      continue;
    }
    const key = String(fm.title || '').trim().toLowerCase();
    const rec = spend.get(key);
    if (!rec) {
      stats.skippedNoMatch++;
      continue;
    }
    stats.eligible++;
    const v = rec.total;
    if (v < 1e4) amountDist['<10K']++;
    else if (v < 1e5) amountDist['10K-100K']++;
    else if (v < 1e6) amountDist['100K-1M']++;
    else if (v < 1e7) amountDist['1M-10M']++;
    else if (v < 1e8) amountDist['10M-100M']++;
    else amountDist['100M+']++;

    if (stats.written >= LIMIT) continue;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)}: ${formatDollars(rec.total)} (${rec.edges} edges, ${rec.stores.size} stores)`);
    }

    if (WRITE) {
      const cycles = [...rec.cycles].sort();
      const updated = insertSpendField(raw, formatDollars(rec.total), cycles, rec.stores.size);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stats.written++;
    } else {
      stats.written++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Donor-type profiles scanned:        ${stats.totalDonorType}`);
  console.log(`  Skipped (already has total):        ${stats.skippedHas}`);
  console.log(`  Skipped (blocking flags):           ${stats.skippedFlags}`);
  console.log(`  Skipped (no name match):            ${stats.skippedNoMatch}`);
  console.log(`  Eligible / Written:                 ${stats.eligible} / ${WRITE ? stats.written : '(dry-run)'}\n`);

  console.log('  Amount distribution:');
  for (const [bucket, count] of Object.entries(amountDist)) {
    if (count > 0) console.log(`    ${bucket.padEnd(10)} ${count}`);
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — re-run with --write to apply.\n');
  } else {
    console.log('\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n');
  }
}

main();
