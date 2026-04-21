#!/usr/bin/env node
/**
 * backfill-committee-assignments.cjs — ADR-0017 Session E
 *
 * Populates `committees` frontmatter field on politician profiles that
 * have a bioguide-id but no committee data. Source: the canonical
 * `data/legislator-committees.jsonl` store that the Congress.gov
 * pipeline (kept per rule 3) maintains.
 *
 * Per CLAUDE.md rule 2, frontmatter relationship fields (related,
 * donors, etc.) are caches rebuilt from canonical stores. `committees`
 * is a type-specific field that falls in the same pattern — canonical
 * truth lives in legislator-committees.jsonl, frontmatter carries a
 * rendered list the profile-data-panels + classifier consume.
 *
 * Eligibility:
 *   - frontmatter.type is a politician / state-politician / local-politician
 *   - frontmatter.bioguide-id present and valid ([A-Z]\d{6})
 *   - no `committees` frontmatter already (skip if present)
 *   - no blocking flags in body (rule 13)
 *   - at least one record in legislator-committees.jsonl matches
 *
 * Output: writes `committees: [<name>, <name>, ...]` into frontmatter
 * as a YAML array. Preserves rest of frontmatter verbatim.
 *
 * Usage:
 *   node scripts/backfill-committee-assignments.cjs           # dry-run
 *   node scripts/backfill-committee-assignments.cjs --write   # apply
 *   node scripts/backfill-committee-assignments.cjs --limit 10 --write
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

const POLITICIAN_TYPES = new Set(['politician', 'state-politician', 'local-politician']);
const BIOGUIDE_RE = /^[A-Z]\d{6}$/;

function loadCommitteeStore() {
  const storePath = path.join(ROOT, 'data', 'legislator-committees.jsonl');
  if (!fs.existsSync(storePath)) return new Map();
  const byBioguide = new Map();
  const lines = fs.readFileSync(storePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    try {
      const rec = JSON.parse(line);
      if (!rec.bioguide || !rec.committee_name) continue;
      if (!byBioguide.has(rec.bioguide)) byBioguide.set(rec.bioguide, new Set());
      byBioguide.get(rec.bioguide).add(rec.committee_name);
    } catch {
      // skip malformed line
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
    return { fm: yaml.load(m[1]) || {}, body: raw.slice(m[0].length), fmBlock: m[0] };
  } catch {
    return null;
  }
}

function yamlQuote(s) {
  // Double-quote if it contains YAML-special chars. Simple approach.
  if (/[:#\[\]{}&*!|>'"%@`,]/.test(s) || /^\s/.test(s) || /\s$/.test(s)) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function insertCommitteesField(raw, committees) {
  const committeesYaml = `committees:\n${committees.map((c) => `  - ${yamlQuote(c)}`).join('\n')}\n`;
  // Insert before the closing `---`
  return raw.replace(/\r?\n---\r?\n/, `\n${committeesYaml}---\n`);
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  backfill-committee-assignments — ADR-0017 Session E');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}${LIMIT < Infinity ? ` (limit ${LIMIT})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const committeeStore = loadCommitteeStore();
  console.log(`  ${committeeStore.size} politicians with committee data in canonical store\n`);

  const files = walk(CONTENT_DIR);
  const stats = {
    totalPoliticians: 0,
    skippedAlreadyHas: 0,
    skippedNoBioguide: 0,
    skippedInvalidBioguide: 0,
    skippedBlockingFlags: 0,
    skippedNoMatch: 0,
    eligible: 0,
    written: 0,
  };
  const committeeCountHist = {};

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { fm, body } = parsed;
    if (!fm.type || !POLITICIAN_TYPES.has(fm.type)) continue;
    stats.totalPoliticians++;

    if (fm.committees || fm['committee-assignments']) {
      stats.skippedAlreadyHas++;
      continue;
    }
    const bioguide = fm['bioguide-id'];
    if (!bioguide) {
      stats.skippedNoBioguide++;
      continue;
    }
    if (!BIOGUIDE_RE.test(String(bioguide).trim())) {
      stats.skippedInvalidBioguide++;
      continue;
    }
    if (hasBlockingFlags(body)) {
      stats.skippedBlockingFlags++;
      continue;
    }
    const committees = committeeStore.get(String(bioguide).trim());
    if (!committees || committees.size === 0) {
      stats.skippedNoMatch++;
      continue;
    }
    stats.eligible++;
    const list = [...committees].sort();
    committeeCountHist[list.length] = (committeeCountHist[list.length] || 0) + 1;

    if (stats.written >= LIMIT) continue;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)} [${bioguide}]: ${list.length} committee(s)`);
    }

    if (WRITE) {
      const updated = insertCommitteesField(raw, list);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stats.written++;
    } else {
      stats.written++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Total politicians scanned:          ${stats.totalPoliticians}`);
  console.log(`  Skipped (committees already set):   ${stats.skippedAlreadyHas}`);
  console.log(`  Skipped (no bioguide-id):           ${stats.skippedNoBioguide}`);
  console.log(`  Skipped (invalid bioguide format):  ${stats.skippedInvalidBioguide}`);
  console.log(`  Skipped (blocking flags):           ${stats.skippedBlockingFlags}`);
  console.log(`  Skipped (no match in canonical):    ${stats.skippedNoMatch}`);
  console.log(`  Eligible / Written:                 ${stats.eligible} / ${WRITE ? stats.written : '(dry-run)'}\n`);

  console.log('  Committee count distribution:');
  for (const [n, count] of Object.entries(committeeCountHist).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`    ${n.padStart(3)} committee(s): ${count} profiles`);
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — re-run with --write to apply.\n');
  } else {
    console.log('\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n');
  }
}

main();
