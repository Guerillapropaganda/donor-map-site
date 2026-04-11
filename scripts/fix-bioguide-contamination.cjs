#!/usr/bin/env node
/**
 * fix-bioguide-contamination.cjs — Clear wrong bioguides on contaminated profiles
 *
 * Multiple profiles in the vault were found to share the same wrong
 * bioguide-id, almost certainly from a past bulk-set script that fell
 * through to `candidates[0]?.bioguideId` when a name search failed
 * (same class of bug as the A000383 Alan Armstrong incident).
 *
 * Wave 1: 19 profiles sharing "C001091" (Joaquin Castro's ID)
 * Wave 2: 3 profiles sharing "B001296"
 *
 * This script CLEARS the wrong bioguide rather than attempting to
 * auto-fix with the correct one. Reason: the Congress.gov q= search
 * parameter doesn't do true name matching — any fuzzy auto-fix risks
 * introducing a third wave of contamination.
 *
 * Actions per profile:
 *   1. Remove the wrong bioguide-id line
 *   2. Add a known-gap noting bioguide needs manual verification
 *   3. Set needs-reenrichment: false with a BLOCKED reason
 *   4. Prepend a plain-English [JANITOR] note to internal-notes
 *
 * With bioguide cleared, the Congress.gov pipeline will skip these
 * profiles until a verified bioguide is added manually.
 *
 * Usage:
 *   node scripts/fix-bioguide-contamination.cjs                     # C001091 dry
 *   node scripts/fix-bioguide-contamination.cjs --write             # C001091 apply
 *   node scripts/fix-bioguide-contamination.cjs --wave=B001296      # other waves
 */
const fs = require('fs');
const path = require('path');

const WRITE = process.argv.includes('--write');
const WAVE_ARG = process.argv.find(a => a.startsWith('--wave='));
const WRONG_BIOGUIDE = WAVE_ARG ? WAVE_ARG.split('=')[1] : 'C001091';

const WAVES = {
  'C001091': {
    realPerson: 'Joaquin Castro',
    files: [
      'content/Politicians/Democrats/House/Jamaal Bowman/_Jamaal Bowman Master Profile.md',
      'content/Politicians/Democrats/House/Joseph Morelle/_Joseph Morelle Master Profile.md',
      'content/Politicians/Democrats/House/Nancy Pelosi/_Nancy Pelosi Master Profile.md',
      'content/Politicians/Democrats/House/_Josh Gottheimer Master Profile.md',
      'content/Politicians/Democrats/Senate/Alex Padilla/_Alex Padilla Master Profile.md',
      'content/Politicians/Democrats/Senate/Chris Coons/_Chris Coons Master Profile.md',
      'content/Politicians/Democrats/Senate/Chuck Schumer/_Chuck Schumer Master Profile.md',
      'content/Politicians/Democrats/Senate/Hillary Clinton/_Hillary Clinton Master Profile.md',
      'content/Politicians/Democrats/Senate/John Hickenlooper/_John Hickenlooper Master Profile.md',
      'content/Politicians/Democrats/Senate/Juliana Stratton/_Juliana Stratton Master Profile.md',
      'content/Politicians/Democrats/Senate/Roy Cooper/_Roy Cooper Master Profile.md',
      'content/Politicians/Democrats/Senate/Zach Wahls/_Zach Wahls Master Profile.md',
      'content/Politicians/Independent/Kyrsten Sinema/_Kyrsten Sinema Master Profile.md',
      'content/Politicians/Republicans/House/Dan Crenshaw/_Dan Crenshaw Master Profile.md',
      'content/Politicians/Republicans/House/Maria Elvira Salazar/_Maria Elvira Salazar Master Profile.md',
      'content/Politicians/Republicans/House/Matt Gaetz/_Matt Gaetz Master Profile.md',
      'content/Politicians/Republicans/Senate/Rick Scott/_Rick Scott Master Profile.md',
      'content/Politicians/Republicans/Senate/Ted Cruz/_Ted Cruz Master Profile.md',
      'content/Politicians/Republicans/Senate/Tommy Tuberville/_Tommy Tuberville Master Profile.md',
    ],
  },
  'B001296': {
    realPerson: '(unknown — smaller 3-file contamination)',
    files: [
      'content/Politicians/Democrats/House/Daniel Biss/_Daniel Biss Master Profile.md',
      'content/Politicians/Democrats/House/Donna Miller/_Donna Miller Master Profile.md',
      'content/Politicians/Democrats/House/Melissa Bean/_Melissa Bean Master Profile.md',
    ],
  },
};

const wave = WAVES[WRONG_BIOGUIDE];
if (!wave) {
  console.error(`Unknown wave: ${WRONG_BIOGUIDE}. Known: ${Object.keys(WAVES).join(', ')}`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);

function janitorNote() {
  return `[JANITOR ${today}] Bioguide contamination cleared by fix-bioguide-contamination.cjs. This profile had bioguide-id set to "${WRONG_BIOGUIDE}" (${wave.realPerson}), almost certainly from a past bulk-set script that fell through to candidates[0]?.bioguideId when a name search failed. ${wave.files.length} unrelated profiles all had the same wrong ID — same class of bug as the A000383 Alan Armstrong incident documented in the Pipeline Guide. The wrong ID has been removed. A correct bioguide must be added manually (verify at bioguide.congress.gov/search) before the Congress.gov pipeline can enrich this profile. Pipeline will skip this profile until a bioguide is provided.`;
}

function applyFix(filePath) {
  const full = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(full)) return { skipped: 'not found' };
  let content = fs.readFileSync(full, 'utf-8');

  const wrongLineRe = new RegExp(`^bioguide-id:\\s*"${WRONG_BIOGUIDE}"\\s*$`, 'm');
  if (!wrongLineRe.test(content)) return { skipped: 'no wrong bioguide' };

  // 1. Remove the wrong bioguide-id line (including trailing newline)
  content = content.replace(new RegExp(`^bioguide-id:\\s*"${WRONG_BIOGUIDE}"\\s*\\r?\\n`, 'm'), '');

  // 2. Add known-gap entry
  const gapLine = `  - "bioguide-id needs manual verification — was contaminated with ${WRONG_BIOGUIDE} (${wave.realPerson}) by a past bulk-set bug, cleared ${today}"`;
  if (/^known-gaps:\s*\n((?:\s{2,}-\s.+\n)+)/m.test(content)) {
    content = content.replace(/^(known-gaps:\s*\n(?:\s{2,}-\s.+\n)+)/m, `$1${gapLine}\n`);
  } else if (/^known-gaps:\s*$/m.test(content)) {
    content = content.replace(/^known-gaps:\s*$/m, `known-gaps:\n${gapLine}`);
  } else if (/^last-updated:/m.test(content)) {
    content = content.replace(/^(last-updated:.*)$/m, `$1\nknown-gaps:\n${gapLine}`);
  }

  // 3. Set needs-reenrichment: false (BLOCKED until correct bioguide added)
  if (!/^needs-reenrichment:/m.test(content)) {
    if (/^known-gaps:/m.test(content)) {
      content = content.replace(/^(known-gaps:)/m, `needs-reenrichment: false\nreenrich-reason: "BLOCKED: add correct bioguide-id first, then set to true"\n$1`);
    }
  } else {
    content = content.replace(/^needs-reenrichment:.*$/m, 'needs-reenrichment: false');
    if (/^reenrich-reason:/m.test(content)) {
      content = content.replace(/^reenrich-reason:.*$/m, `reenrich-reason: "BLOCKED: add correct bioguide-id first (was contaminated with ${WRONG_BIOGUIDE}), then set needs-reenrichment to true"`);
    }
  }

  // 4. Prepend layman note to internal-notes
  const quoted = janitorNote().replace(/"/g, "'");
  if (/^internal-notes:\s*"/m.test(content)) {
    content = content.replace(/^internal-notes:\s*"([\s\S]*?)"(?=\r?\n[a-z-]+:|\r?\n---)/m, (m, prev) => {
      return `internal-notes: "${quoted}\n\n${prev}"`;
    });
  } else {
    content = content.replace(/(\r?\n---\r?\n)/, `\ninternal-notes: "${quoted}"$1`);
  }

  if (WRITE) fs.writeFileSync(full, content, 'utf-8');
  return { changed: true };
}

console.log('═══════════════════════════════════════════════════');
console.log('  Bioguide Contamination Fix');
console.log('═══════════════════════════════════════════════════');
console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
console.log(`  Wrong bioguide: ${WRONG_BIOGUIDE} (${wave.realPerson})`);
console.log(`  Files: ${wave.files.length}`);
console.log('');

let fixed = 0, skipped = 0;
for (const rel of wave.files) {
  const result = applyFix(rel);
  const name = path.basename(path.dirname(rel)).replace(/^_/, '') || path.basename(rel, '.md').replace(/^_/, '').replace(/ Master Profile/, '');
  if (result.changed) {
    console.log(`  ${WRITE ? 'FIXED' : 'WOULD FIX'}: ${name}`);
    fixed++;
  } else {
    console.log(`  SKIP: ${name} (${result.skipped})`);
    skipped++;
  }
}

console.log('');
console.log(`  ${WRITE ? 'Fixed' : 'Would fix'}: ${fixed}`);
console.log(`  Skipped:   ${skipped}`);
if (!WRITE) console.log('\n  Dry run. Add --write to apply.');
