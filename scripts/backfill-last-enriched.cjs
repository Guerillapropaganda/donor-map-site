#!/usr/bin/env node
/**
 * backfill-last-enriched.cjs — stamp `last-enriched` on profiles that
 * have enrichment evidence in body/frontmatter but no freshness stamp.
 *
 * Context (ADR-0017 + 2026-04-21 diagnostic):
 *   `reclassify-readiness --diagnose` revealed 990 publishable profiles
 *   blocked from `data-complete` because `last-enriched` was never
 *   stamped. 970 of those 990 ALREADY have <!-- auto:X --> blocks in
 *   body — pipelines enriched them but never stamped the timestamp.
 *   This one-off closes that gap by stamping the git mtime (last
 *   commit date touching the file) as the enrichment date.
 *
 * Eligibility: a profile is backfilled iff ALL of:
 *   - frontmatter.type is a publishable profile type (ADR-0017)
 *   - no existing `last-enriched` in frontmatter
 *   - has at least one of:
 *       - body contains <!-- auto:X --> auto-block
 *       - frontmatter.corroboration-count present
 *       - relationship frontmatter populated (related / donors / opposes
 *         / politicians-funded)
 *       - donor/money data frontmatter (career-total / total-raised /
 *         total-political-spend)
 *
 * Uses git mtime (via `git log -1 --format=%cs`) rather than today's
 * date. If a profile hasn't been touched in >90 days, stamping won't
 * lift it past the freshness gate — that's correct behavior; the
 * data IS stale in that case.
 *
 * Usage:
 *   node scripts/backfill-last-enriched.cjs           # dry run report
 *   node scripts/backfill-last-enriched.cjs --write   # apply stamps
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');

const PUBLISHABLE_TYPES = new Set([
  'politician', 'state-politician', 'local-politician',
  'donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm',
]);

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

function gitMtime(filePath) {
  try {
    const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
    // %cs = committer date, short (YYYY-MM-DD)
    const out = execSync(`git log -1 --format=%cs -- "${rel}"`, {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function hasEnrichmentEvidence(fm, body) {
  if (/<!--\s*auto:/i.test(body)) return 'auto-block';
  if (fm['corroboration-count']) return 'corroboration-count';
  if (fm.related || fm.donors || fm.opposes || fm['politicians-funded']) return 'relationships';
  if (fm['career-total'] || fm['total-raised'] || fm['total-political-spend']) return 'money-data';
  return null;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: {}, body: raw };
  try {
    const fm = yaml.load(m[1]) || {};
    return { fm, body: raw.slice(m[0].length) };
  } catch {
    return { fm: {}, body: raw.slice(m[0].length) };
  }
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  backfill-last-enriched — ADR-0017 data-complete unblocker');
  console.log(`  Mode: ${WRITE ? 'WRITE (applying stamps)' : 'DRY RUN (report only)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = walk(CONTENT_DIR);
  let totalScanned = 0;
  let eligible = 0;
  let noMtime = 0;
  let noEvidence = 0;
  let stamped = 0;
  const evidenceBreakdown = {};
  const freshnessBreakdown = { '<=90': 0, '91-180': 0, '181-365': 0, '>365': 0 };

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { fm, body } = parseFrontmatter(raw);

    if (!fm.type || !PUBLISHABLE_TYPES.has(fm.type)) continue;
    totalScanned++;
    if (fm['last-enriched']) continue;

    const evidence = hasEnrichmentEvidence(fm, body);
    if (!evidence) {
      noEvidence++;
      continue;
    }
    eligible++;
    evidenceBreakdown[evidence] = (evidenceBreakdown[evidence] || 0) + 1;

    const mtime = gitMtime(filePath);
    if (!mtime) {
      noMtime++;
      continue;
    }

    const days = Math.floor((Date.now() - new Date(mtime).getTime()) / (24 * 60 * 60 * 1000));
    if (days <= 90) freshnessBreakdown['<=90']++;
    else if (days <= 180) freshnessBreakdown['91-180']++;
    else if (days <= 365) freshnessBreakdown['181-365']++;
    else freshnessBreakdown['>365']++;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)} → last-enriched: ${mtime} (${days}d ago, ${evidence})`);
    }

    if (WRITE) {
      // Insert last-enriched into frontmatter
      const fmMatch = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/);
      if (!fmMatch) continue;
      const updated = fmMatch[1] + fmMatch[2] + `\nlast-enriched: ${mtime}` + fmMatch[3] + raw.slice(fmMatch[0].length);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stamped++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Publishable profiles scanned:     ${totalScanned}`);
  console.log(`  Already had last-enriched:        ${totalScanned - eligible - noEvidence}`);
  console.log(`  No enrichment evidence (real stubs): ${noEvidence}`);
  console.log(`  Eligible for backfill:            ${eligible}`);
  console.log(`  No git mtime available:           ${noMtime}`);
  console.log(`  Stamped:                          ${WRITE ? stamped : '(dry-run)'}\n`);

  console.log('  Evidence breakdown:');
  for (const [k, v] of Object.entries(evidenceBreakdown).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(22)} ${v}`);
  }

  console.log('\n  Would-be freshness after stamping (using git mtime):');
  for (const [bucket, count] of Object.entries(freshnessBreakdown)) {
    if (count === 0) continue;
    console.log(`    ${bucket.padEnd(12)} ${count}${bucket === '<=90' ? '  ← these unblock data-complete freshness gate' : ''}`);
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — no changes written. Re-run with --write to apply.\n');
  } else {
    console.log('\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n');
  }
}

main();
