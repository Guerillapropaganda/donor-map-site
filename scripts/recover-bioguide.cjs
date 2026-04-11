#!/usr/bin/env node
/**
 * recover-bioguide.cjs — Apply a verified bioguide to a single profile
 *
 * Used for manual recovery of the 22 profiles cleared by
 * fix-bioguide-contamination.cjs. Applies the standard recovery pattern:
 *
 *   1. Adds `bioguide-id: "NEW_ID"` to frontmatter (inserts after
 *      fec-candidate-id if present, else after state-abbr)
 *   2. Removes the "bioguide-id needs manual verification" known-gap entry
 *   3. Sets `needs-reenrichment: true` (so pipeline picks it up)
 *   4. Updates `reenrich-reason:` to reflect the recovery
 *   5. Prepends a plain-English [MANUAL] note to internal-notes
 *   6. Refuses if the target bioguide is already in use elsewhere
 *      (duplicate detection — second line of defense against contamination)
 *
 * Usage:
 *   node scripts/recover-bioguide.cjs "Jamaal Bowman" B001223
 *   node scripts/recover-bioguide.cjs --path="content/Politicians/Democrats/House/Jamaal Bowman/_Jamaal Bowman Master Profile.md" B001223
 *   node scripts/recover-bioguide.cjs --batch=recovered.json       # batch mode: JSON is { "Name": "B001223", ... }
 *   node scripts/recover-bioguide.cjs --dry                        # preview, don't write
 */
const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');
const BATCH_ARG = process.argv.find(a => a.startsWith('--batch='));
const PATH_ARG = process.argv.find(a => a.startsWith('--path='));
const BIOGUIDE_RE = /^[A-Z][0-9]{6}$/;
const CONTENT_DIR = 'content';

function findProfileByName(name) {
  // Walk content/Politicians looking for _${name} Master Profile.md
  const roots = [
    path.join(CONTENT_DIR, 'Politicians'),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const d = stack.pop();
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name === `_${name} Master Profile.md`) return full;
      }
    }
  }
  return null;
}

function findDuplicates(bioguide) {
  // Scan all profiles for any that already have this bioguide (prevent contamination)
  const roots = [path.join(CONTENT_DIR, 'Politicians')];
  const hits = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const d = stack.pop();
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (entry.name.endsWith('.md')) {
          const content = fs.readFileSync(full, 'utf-8');
          const m = content.match(new RegExp(`^bioguide-id:\\s*"?${bioguide}"?\\s*$`, 'm'));
          if (m) hits.push(full);
        }
      }
    }
  }
  return hits;
}

const today = new Date().toISOString().slice(0, 10);

function manualNote(bioguide) {
  return `[MANUAL ${today}] Bioguide recovered: ${bioguide}. Previously cleared by fix-bioguide-contamination.cjs because the profile was sharing a contaminated wrong bioguide (C001091 or B001296) with other unrelated profiles. Manually verified against bioguide.congress.gov/search. needs-reenrichment flipped from false to true — the next scheduled pipeline run will now populate correct Congress.gov auto-blocks.`;
}

function applyRecovery(filePath, bioguide) {
  // Validate bioguide format
  if (!BIOGUIDE_RE.test(bioguide)) {
    return { ok: false, error: `invalid bioguide format: ${bioguide} (expected LETTER + 6 digits)` };
  }

  // Duplicate check (important: prevent re-contamination)
  const dupes = findDuplicates(bioguide);
  if (dupes.length > 0) {
    const rels = dupes.map(d => path.relative(process.cwd(), d).replace(/\\/g, '/'));
    return { ok: false, error: `bioguide ${bioguide} already in use by:\n    ${rels.join('\n    ')}` };
  }

  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `file not found: ${filePath}` };
  }
  let content = fs.readFileSync(filePath, 'utf-8');

  // 1. Insert bioguide-id line. Prefer to insert after fec-candidate-id.
  if (/^bioguide-id:/m.test(content)) {
    return { ok: false, error: 'profile already has a bioguide-id line — edit manually if it needs updating' };
  }
  const bgLine = `bioguide-id: "${bioguide}"`;
  if (/^fec-candidate-id:.*$/m.test(content)) {
    content = content.replace(/^(fec-candidate-id:.*)$/m, `$1\n${bgLine}`);
  } else if (/^state-abbr:.*$/m.test(content)) {
    content = content.replace(/^(state-abbr:.*)$/m, `$1\n${bgLine}`);
  } else if (/^chamber:.*$/m.test(content)) {
    content = content.replace(/^(chamber:.*)$/m, `$1\n${bgLine}`);
  } else {
    return { ok: false, error: 'could not find a stable insertion point for bioguide-id (no fec-candidate-id, state-abbr, or chamber)' };
  }

  // 2. Remove the "bioguide-id needs manual verification" known-gap entry (both wording variants)
  content = content.replace(/^\s{2,}-\s*"bioguide-id needs manual verification[^"]*"\r?\n/m, '');

  // 3. Set needs-reenrichment: true
  if (/^needs-reenrichment:/m.test(content)) {
    content = content.replace(/^needs-reenrichment:.*$/m, 'needs-reenrichment: true');
  } else {
    // Insert after bioguide-id line
    content = content.replace(new RegExp(`^(bioguide-id:\\s*"${bioguide}"\\s*)$`, 'm'), `$1\nneeds-reenrichment: true`);
  }

  // 4. Update reenrich-reason
  const newReason = `reenrich-reason: "Bioguide recovered ${today} (was contaminated, now verified): ${bioguide}. Next pipeline run should populate Congress.gov + GovTrack auto-blocks with correct data."`;
  if (/^reenrich-reason:/m.test(content)) {
    content = content.replace(/^reenrich-reason:.*$/m, newReason);
  } else {
    content = content.replace(/^(needs-reenrichment:\s*true\s*)$/m, `$1\n${newReason}`);
  }

  // 5. Prepend [MANUAL] note to internal-notes
  const quoted = manualNote(bioguide).replace(/"/g, "'");
  if (/^internal-notes:\s*"/m.test(content)) {
    content = content.replace(/^internal-notes:\s*"([\s\S]*?)"(?=\r?\n[a-z-]+:|\r?\n---)/m, (m, prev) => {
      return `internal-notes: "${quoted}\n\n${prev}"`;
    });
  } else {
    content = content.replace(/(\r?\n---\r?\n)/, `\ninternal-notes: "${quoted}"$1`);
  }

  if (!DRY) fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true };
}

function resolveTarget() {
  if (PATH_ARG) {
    return { filePath: PATH_ARG.split('=')[1].replace(/^"|"$/g, '') };
  }
  // Positional: "Name" BIOGUIDE
  const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (positional.length !== 2) {
    console.error('usage: node scripts/recover-bioguide.cjs "<Name>" <BIOGUIDE>');
    console.error('       node scripts/recover-bioguide.cjs --batch=recovered.json');
    process.exit(1);
  }
  const [name, bioguide] = positional;
  const filePath = findProfileByName(name);
  if (!filePath) {
    console.error(`profile not found: ${name}`);
    process.exit(1);
  }
  return { filePath, bioguide };
}

function main() {
  if (BATCH_ARG) {
    const jsonPath = BATCH_ARG.split('=')[1];
    const map = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    let ok = 0, fail = 0;
    for (const [name, bioguide] of Object.entries(map)) {
      const filePath = findProfileByName(name);
      if (!filePath) {
        console.log(`  FAIL: ${name} — profile not found`);
        fail++;
        continue;
      }
      const r = applyRecovery(filePath, bioguide);
      if (r.ok) {
        console.log(`  ${DRY ? 'WOULD FIX' : 'FIXED'}: ${name} => ${bioguide}`);
        ok++;
      } else {
        console.log(`  FAIL: ${name} => ${bioguide} — ${r.error}`);
        fail++;
      }
    }
    console.log(`\n  Fixed: ${ok}, Failed: ${fail}`);
    return;
  }

  const positional = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (positional.length !== 2) {
    console.error('usage: node scripts/recover-bioguide.cjs "<Name>" <BIOGUIDE>');
    console.error('       node scripts/recover-bioguide.cjs --batch=recovered.json');
    process.exit(1);
  }
  const [name, bioguide] = positional;
  const filePath = findProfileByName(name);
  if (!filePath) {
    console.error(`profile not found: ${name}`);
    process.exit(1);
  }
  const r = applyRecovery(filePath, bioguide);
  if (r.ok) {
    console.log(`${DRY ? 'DRY' : 'OK'}: ${name} => ${bioguide}`);
  } else {
    console.error(`FAIL: ${name} => ${bioguide}`);
    console.error(`      ${r.error}`);
    process.exit(1);
  }
}

main();
