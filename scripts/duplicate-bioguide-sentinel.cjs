#!/usr/bin/env node
/**
 * duplicate-bioguide-sentinel.cjs — Catch bioguide contamination waves early
 *
 * On 2026-04-11 we discovered 22 profiles sharing wrong bioguide-ids (19
 * sharing C001091 Castro, 3 sharing B001296). Root cause: a past script
 * fell through to candidates[0]?.bioguideId when name search failed.
 *
 * This sentinel script scans the vault for any bioguide-id appearing on
 * more than one profile. Duplicates are DEFINITIONALLY WRONG — bioguides
 * are unique per person. Any count > 0 means contamination is active.
 *
 * Intended to run as a cron (hourly or at pipeline-run-complete hook)
 * so the next contamination wave is caught immediately.
 *
 * Usage: node scripts/duplicate-bioguide-sentinel.cjs
 *        exits 0 if clean, exits 1 if duplicates found
 *        --quiet suppresses "clean" output
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const QUIET = process.argv.includes('--quiet');

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const byBioguide = new Map();

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data } = parseFrontmatter(content);
    if (!data) continue;
    const bg = data['bioguide-id'];
    if (!bg) continue;
    if (!byBioguide.has(bg)) byBioguide.set(bg, []);
    byBioguide.get(bg).push({ filePath: f, title: data.title || path.basename(f) });
  }

  const duplicates = [...byBioguide.entries()].filter(([_, profiles]) => profiles.length > 1);

  if (duplicates.length === 0) {
    if (!QUIET) {
      console.log('✓ Clean. No duplicate bioguide-ids detected.');
      console.log(`  Scanned ${files.length} files, ${byBioguide.size} unique bioguides.`);
    }
    process.exit(0);
  }

  console.log('🚨 DUPLICATE BIOGUIDE CONTAMINATION DETECTED');
  console.log('═══════════════════════════════════════════════');
  console.log(`Found ${duplicates.length} duplicated bioguide-id values across ${duplicates.reduce((n, [_, p]) => n + p.length, 0)} profiles.`);
  console.log('');
  console.log('Bioguides are unique per person — any duplicate means');
  console.log('a script wrote the wrong ID somewhere. Run fix-bioguide-');
  console.log('contamination.cjs to clear, then investigate the source.');
  console.log('');

  for (const [bg, profiles] of duplicates) {
    console.log(`${bg}  (${profiles.length} profiles):`);
    for (const p of profiles) {
      const rel = path.relative(CONTENT_DIR, p.filePath).split(path.sep).join('/');
      console.log(`  - ${p.title}  \`${rel}\``);
    }
    console.log('');
  }

  // Also write an alert file so the ops app dashboard can surface it
  const alertPath = path.join(CONTENT_DIR, 'Admin Notes', 'bioguide-contamination-alert.md');
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  lines.push('---');
  lines.push(`title: "🚨 Bioguide contamination alert — ${today}"`);
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: urgent');
  lines.push('status: open');
  lines.push(`last-updated: '${today}'`);
  lines.push('generated-by: scripts/duplicate-bioguide-sentinel.cjs');
  lines.push('---');
  lines.push('');
  lines.push(`# 🚨 Duplicate bioguide-ids detected`);
  lines.push('');
  lines.push(`${duplicates.length} bioguide-id values appear on more than one profile. Bioguides are unique per person — this is definitionally wrong.`);
  lines.push('');
  lines.push('## Affected');
  lines.push('');
  for (const [bg, profiles] of duplicates) {
    lines.push(`### ${bg}`);
    lines.push('');
    for (const p of profiles) {
      const rel = path.relative(CONTENT_DIR, p.filePath).split(path.sep).join('/');
      lines.push(`- **${p.title}** — \`${rel}\``);
    }
    lines.push('');
  }
  lines.push('## Action');
  lines.push('');
  lines.push('1. Run `node scripts/fix-bioguide-contamination.cjs` (clears wrong bioguides)');
  lines.push('2. Use `node scripts/recover-bioguide.cjs "Name" BIOGUIDE` to restore correct IDs manually');
  lines.push('3. Investigate which script wrote the wrong value');

  fs.writeFileSync(alertPath, lines.join('\n'), 'utf-8');
  console.log(`Alert file written: ${path.relative(process.cwd(), alertPath)}`);
  process.exit(1);
}

main();
