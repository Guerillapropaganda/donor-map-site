#!/usr/bin/env node
/**
 * backfill-ca-gov-2026-fppc-ids.cjs
 *
 * Phase 2-A of CA Gov 2026 dossier plan (2026-05-01).
 * Writes fppc-committee-id frontmatter into the 8 candidate profiles.
 *
 * IDs sourced from data/derived/cal-access-bulk.jsonl evidence fields
 * during Phase 1 audit. Format-preserving inject — no yaml.dump round-trip
 * (matches the ADR-0029 §10 frontmatter-backfill pattern from cc_p3_209).
 *
 * Run: node scripts/backfill-ca-gov-2026-fppc-ids.cjs --write
 *      (omit --write for dry-run)
 *
 * Provenance: this is a Tier 1 mechanical decision per ADR-0029. The
 * IDs are matter-of-fact registry data, no editorial judgment, fixture
 * coverage not required (no claim of new factual relationship).
 */

const fs = require('fs');
const path = require('path');

const CANDIDATES = [
  { slug: 'becerra', file: 'Xavier Becerra/_Xavier Becerra Master Profile.md',
    fppcId: '1480025', cmteName: 'BECERRA FOR GOVERNOR 2026', cycle: '2026' },
  { slug: 'porter', file: 'Katie Porter/_Katie Porter Master Profile.md',
    fppcId: '1479597', cmteName: 'PORTER FOR GOVERNOR 2026', cycle: '2026' },
  { slug: 'steyer', file: 'Tom Steyer/_Tom Steyer Master Profile.md',
    fppcId: '1485077', cmteName: 'STEYER FOR GOVERNOR 2026', cycle: '2026' },
  { slug: 'hilton', file: 'Steve Hilton.md',
    fppcId: '1480425', cmteName: 'HILTON FOR GOVERNOR 2026', cycle: '2026' },
  { slug: 'bianco', file: 'Chad Bianco/_Chad Bianco Master Profile.md',
    fppcId: '1479095', cmteName: 'BIANCO FOR GOVERNOR 2026', cycle: '2026' },
  { slug: 'villaraigosa', file: 'Antonio Villaraigosa/_Antonio Villaraigosa Master Profile.md',
    fppcId: '1471635', cmteName: 'VILLARAIGOSA FOR GOVERNOR 2026; ANTONIO', cycle: '2026',
    note: 'Phase 2-C resolved 2026-05-01: prior fppc-committee-id 1392364 was 2018-cycle. Real 2026 primary is 1471635. Slogan/auxiliary committee 1486030 ("Straight From The Heart Of California") also exists.' },
  { slug: 'mahan', file: 'Matt Mahan/_Matt Mahan Master Profile.md',
    fppcId: '1473129', cmteName: 'MAHAN FOR GOVERNOR 2026 (direct)', cycle: '2026',
    note: 'IE PAC also exists: 1487425 (CALIFORNIA BACK TO BASICS SUPPORTING MATT MAHAN)' },
  { slug: 'thurmond', file: 'Tony Thurmond/_Tony Thurmond Master Profile.md',
    fppcId: '1461509', cmteName: 'THURMOND FOR GOVERNOR 2026', cycle: '2026' },
];

const ROOT = path.join(__dirname, '..', 'content', 'Politicians', 'Races', 'CA Governor 2026');
const dryRun = !process.argv.includes('--write');

let written = 0;
let alreadyHad = 0;
let errors = 0;

for (const c of CANDIDATES) {
  const fp = path.join(ROOT, c.file);
  if (!fs.existsSync(fp)) {
    console.error(`MISSING: ${fp}`);
    errors++;
    continue;
  }
  const original = fs.readFileSync(fp, 'utf-8');
  // Locate frontmatter block.
  const match = original.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    console.error(`NO_FRONTMATTER: ${c.file}`);
    errors++;
    continue;
  }
  const fm = match[1];
  if (/^fppc-committee-id:/m.test(fm)) {
    console.log(`already had fppc-committee-id: ${c.slug}`);
    alreadyHad++;
    continue;
  }

  // Find a stable anchor — `state-abbr:` is a per-candidate guaranteed line.
  // Insert the new fields immediately after it. If absent, fall back to inserting
  // before the closing `---`.
  let updatedFm;
  const inject = [
    `fppc-committee-id: "${c.fppcId}"`,
    `fppc-committee-name: "${c.cmteName}"`,
    `fppc-committee-cycle: "${c.cycle}"`,
  ];
  if (c.note) inject.push(`fppc-committee-note: ${JSON.stringify(c.note)}`);
  if (c.flag) inject.push(`fppc-committee-flag: ${JSON.stringify(c.flag)}`);
  const injectBlock = inject.join('\n');

  if (/^state-abbr:.*$/m.test(fm)) {
    updatedFm = fm.replace(/^(state-abbr:.*)$/m, `$1\n${injectBlock}`);
  } else {
    updatedFm = fm + '\n' + injectBlock;
  }

  const updated = original.replace(match[0], `---\n${updatedFm}\n---`);

  if (dryRun) {
    console.log(`[DRY] would write: ${c.slug} (fppc-committee-id: ${c.fppcId})`);
  } else {
    fs.writeFileSync(fp, updated, 'utf-8');
    console.log(`wrote: ${c.slug} (fppc-committee-id: ${c.fppcId})`);
  }
  written++;
}

console.log('');
console.log(`${dryRun ? 'DRY RUN' : 'WROTE'}: ${written} updated, ${alreadyHad} already had ID, ${errors} errors`);
console.log(dryRun ? '\nRe-run with --write to apply.' : '');
