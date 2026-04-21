#!/usr/bin/env node
/**
 * backfill-fec-candidate-totals.cjs — ADR-0017 Session F
 *
 * Stamps `total-raised` frontmatter on politicians who have a
 * fec-candidate-id but no career total. Source: the FEC weball bulk
 * summary ingest at C:/donor-map-data/fec/candidate-summary.jsonl,
 * which aggregates ttl_receipts per (cand_id, cycle).
 *
 * For each politician:
 *   - sum ttl_receipts across all cycles for their cand_id
 *   - write `total-raised: "$X.XM"` (formatted with scale suffix)
 *
 * The unblock this closes: typeReqs:fec-data for politicians —
 * 352 profiles fail because no total-raised in frontmatter AND no
 * <!-- auto:fec --> block in body. This script addresses the former.
 *
 * Eligibility:
 *   - type is politician / state-politician / local-politician
 *   - valid fec-candidate-id in frontmatter
 *   - no total-raised already
 *   - no blocking flags in body (rule 13)
 *   - candidate-summary lookup returns > 0 receipts
 *
 * Usage:
 *   node scripts/backfill-fec-candidate-totals.cjs           # dry-run
 *   node scripts/backfill-fec-candidate-totals.cjs --write
 *   node scripts/backfill-fec-candidate-totals.cjs --limit 5 --write
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const SUMMARY_PATH = 'C:/donor-map-data/fec/candidate-summary.jsonl';

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

const POLITICIAN_TYPES = new Set(['politician', 'state-politician', 'local-politician']);
const FEC_CAND_RE = /^[HSP]\d[A-Z0-9]{7}$/i;

function loadSummaryStore() {
  if (!fs.existsSync(SUMMARY_PATH)) {
    console.error(`ERROR: ${SUMMARY_PATH} not found. Run ingest-fec-weball-summary.cjs first.`);
    process.exit(2);
  }
  const byCand = new Map();
  const lines = fs.readFileSync(SUMMARY_PATH, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const r = JSON.parse(line);
      if (!r.cand_id) continue;
      const receipts = Number(r.ttl_receipts) || 0;
      if (receipts <= 0) continue;
      const prev = byCand.get(r.cand_id) || { total: 0, cycles: new Set() };
      prev.total += receipts;
      if (r.cycle) prev.cycles.add(r.cycle);
      byCand.set(r.cand_id, prev);
    } catch {
      // skip
    }
  }
  return byCand;
}

function formatDollars(amount) {
  // Format with scale suffix: $X.XM or $X.XB. Politicians' career totals
  // usually land in $100K – $1B range.
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

function insertTotalRaised(raw, formatted, cycles) {
  // Insert (or update) total-raised and career-total-source fields.
  // career-total-source is so readers/editors know where this number came from.
  const fieldsToAdd = [
    `total-raised: "${formatted}"`,
    `career-total-source: "FEC weball summary (cycles ${cycles.join(', ')})"`,
  ];

  let updated = raw;
  for (const field of fieldsToAdd) {
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
  console.log('  backfill-fec-candidate-totals — ADR-0017 Session F');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}${LIMIT < Infinity ? ` (limit ${LIMIT})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const summary = loadSummaryStore();
  console.log(`  ${summary.size} candidates with career receipts in canonical summary\n`);

  const files = walk(CONTENT_DIR);
  const stats = {
    totalPoliticians: 0,
    skippedHasTotal: 0,
    skippedNoFecCand: 0,
    skippedInvalidFecCand: 0,
    skippedNoMatch: 0,
    skippedBlockingFlags: 0,
    eligible: 0,
    written: 0,
  };
  const amountDist = { '<1K': 0, '1K-10K': 0, '10K-100K': 0, '100K-1M': 0, '1M-10M': 0, '10M+': 0 };
  const samples = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { fm, body } = parsed;
    if (!fm.type || !POLITICIAN_TYPES.has(fm.type)) continue;
    stats.totalPoliticians++;

    if (fm['total-raised']) {
      stats.skippedHasTotal++;
      continue;
    }
    const candId = fm['fec-candidate-id'];
    if (!candId) {
      stats.skippedNoFecCand++;
      continue;
    }
    if (!FEC_CAND_RE.test(String(candId).trim())) {
      stats.skippedInvalidFecCand++;
      continue;
    }
    if (hasBlockingFlags(body)) {
      stats.skippedBlockingFlags++;
      continue;
    }
    const rec = summary.get(String(candId).trim());
    if (!rec || rec.total <= 0) {
      stats.skippedNoMatch++;
      continue;
    }
    stats.eligible++;
    const v = rec.total;
    if (v < 1e3) amountDist['<1K']++;
    else if (v < 1e4) amountDist['1K-10K']++;
    else if (v < 1e5) amountDist['10K-100K']++;
    else if (v < 1e6) amountDist['100K-1M']++;
    else if (v < 1e7) amountDist['1M-10M']++;
    else amountDist['10M+']++;

    const formatted = formatDollars(rec.total);
    const cycles = [...rec.cycles].sort((a, b) => Number(a) - Number(b));

    if (samples.length < 5) {
      samples.push({ path: path.relative(ROOT, filePath), title: fm.title, formatted, cycles });
    }

    if (stats.written >= LIMIT) continue;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)} [${candId}]: ${formatted} (${cycles.length} cycles)`);
    }

    if (WRITE) {
      const updated = insertTotalRaised(raw, formatted, cycles);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stats.written++;
    } else {
      stats.written++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Total politicians scanned:          ${stats.totalPoliticians}`);
  console.log(`  Skipped (total-raised already):     ${stats.skippedHasTotal}`);
  console.log(`  Skipped (no fec-candidate-id):      ${stats.skippedNoFecCand}`);
  console.log(`  Skipped (invalid fec-candidate-id): ${stats.skippedInvalidFecCand}`);
  console.log(`  Skipped (blocking flags):           ${stats.skippedBlockingFlags}`);
  console.log(`  Skipped (no match in summary):      ${stats.skippedNoMatch}`);
  console.log(`  Eligible / Written:                 ${stats.eligible} / ${WRITE ? stats.written : '(dry-run)'}\n`);

  console.log('  Career receipts amount distribution:');
  for (const [bucket, count] of Object.entries(amountDist)) {
    if (count > 0) console.log(`    ${bucket.padEnd(10)} ${count}`);
  }

  if (samples.length) {
    console.log('\n  Samples:');
    for (const s of samples) {
      console.log(`    ${s.title.padEnd(40)} ${s.formatted.padEnd(10)} (${s.cycles.length} cycles)`);
    }
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — re-run with --write to apply.\n');
  } else {
    console.log('\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n');
  }
}

main();
