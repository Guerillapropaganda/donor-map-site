#!/usr/bin/env node
/**
 * backfill-bills-sponsored.cjs — ADR-0017 Session G
 *
 * Stamps `bills-sponsored` frontmatter on politicians who have a
 * bioguide-id but no bills count. Source: `data/bills.jsonl` (PLAW
 * bulk ingest, 141k bills with sponsor_bioguides arrays).
 *
 * Closes the typeReqs:bills gate for politicians whose FEC/committee/
 * voting data is already in place but who never had their bill-
 * sponsorship count stamped. Combined with Sessions E + F, this is
 * the last of the four politician typeReqs backfills.
 *
 * Eligibility:
 *   - type is politician / state-politician / local-politician
 *   - bioguide-id present and valid
 *   - no bills-sponsored already (skip if present, even if 0)
 *   - no blocking flags (rule 13)
 *   - at least one bill sponsored in canonical store
 *
 * Usage:
 *   node scripts/backfill-bills-sponsored.cjs           # dry-run
 *   node scripts/backfill-bills-sponsored.cjs --write
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const BILLS_PATH = path.join(ROOT, 'data', 'bills.jsonl');

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

const POLITICIAN_TYPES = new Set(['politician', 'state-politician', 'local-politician']);
const BIOGUIDE_RE = /^[A-Z]\d{6}$/;

function loadBillsStore() {
  if (!fs.existsSync(BILLS_PATH)) {
    console.error(`ERROR: ${BILLS_PATH} not found. Run ingest-plaw-bulk.cjs first.`);
    process.exit(2);
  }
  const byBioguide = new Map();
  const lines = fs.readFileSync(BILLS_PATH, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const b = JSON.parse(line);
      const sponsors = Array.isArray(b.sponsor_bioguides) ? b.sponsor_bioguides : [];
      for (const bg of sponsors) {
        byBioguide.set(bg, (byBioguide.get(bg) || 0) + 1);
      }
    } catch {
      // skip
    }
  }
  return byBioguide;
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

function insertBillsCount(raw, count) {
  const field = `bills-sponsored: ${count}`;
  const lineRe = /^bills-sponsored:\s*.+$/m;
  if (lineRe.test(raw)) {
    return raw.replace(lineRe, field);
  }
  return raw.replace(/\r?\n---\r?\n/, `\n${field}\n---\n`);
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  backfill-bills-sponsored — ADR-0017 Session G');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}${LIMIT < Infinity ? ` (limit ${LIMIT})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const bills = loadBillsStore();
  console.log(`  ${bills.size} unique bill sponsors in canonical store\n`);

  const files = walk(CONTENT_DIR);
  const stats = {
    totalPoliticians: 0,
    skippedHas: 0,
    skippedNoBioguide: 0,
    skippedInvalid: 0,
    skippedBlockingFlags: 0,
    skippedNoMatch: 0,
    eligible: 0,
    written: 0,
  };
  const countDist = { '1-5': 0, '6-20': 0, '21-100': 0, '101-500': 0, '500+': 0 };

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { fm, body } = parsed;
    if (!fm.type || !POLITICIAN_TYPES.has(fm.type)) continue;
    stats.totalPoliticians++;

    // Only skip if there's already a positive count. `bills-sponsored: 0`
    // is treated as missing (otherwise 490 politicians with a stale 0
    // stamp never get their real count).
    const existing = parseInt(fm['bills-sponsored'], 10);
    if (Number.isFinite(existing) && existing > 0) {
      stats.skippedHas++;
      continue;
    }
    const bioguide = fm['bioguide-id'];
    if (!bioguide) {
      stats.skippedNoBioguide++;
      continue;
    }
    if (!BIOGUIDE_RE.test(String(bioguide).trim())) {
      stats.skippedInvalid++;
      continue;
    }
    if (hasBlockingFlags(body)) {
      stats.skippedBlockingFlags++;
      continue;
    }
    const count = bills.get(String(bioguide).trim());
    if (!count || count < 1) {
      stats.skippedNoMatch++;
      continue;
    }
    stats.eligible++;
    if (count <= 5) countDist['1-5']++;
    else if (count <= 20) countDist['6-20']++;
    else if (count <= 100) countDist['21-100']++;
    else if (count <= 500) countDist['101-500']++;
    else countDist['500+']++;

    if (stats.written >= LIMIT) continue;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)} [${bioguide}]: ${count} bills`);
    }

    if (WRITE) {
      const updated = insertBillsCount(raw, count);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stats.written++;
    } else {
      stats.written++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Total politicians scanned:          ${stats.totalPoliticians}`);
  console.log(`  Skipped (bills-sponsored already):  ${stats.skippedHas}`);
  console.log(`  Skipped (no bioguide-id):           ${stats.skippedNoBioguide}`);
  console.log(`  Skipped (invalid bioguide):         ${stats.skippedInvalid}`);
  console.log(`  Skipped (blocking flags):           ${stats.skippedBlockingFlags}`);
  console.log(`  Skipped (no bills in canonical):    ${stats.skippedNoMatch}`);
  console.log(`  Eligible / Written:                 ${stats.eligible} / ${WRITE ? stats.written : '(dry-run)'}\n`);

  console.log('  Bill count distribution:');
  for (const [bucket, count] of Object.entries(countDist)) {
    if (count > 0) console.log(`    ${bucket.padEnd(10)} ${count}`);
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — re-run with --write to apply.\n');
  } else {
    console.log('\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n');
  }
}

main();
