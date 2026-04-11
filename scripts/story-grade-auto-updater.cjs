#!/usr/bin/env node
/**
 * story-grade-auto-updater.cjs — Auto-compute story-grade from URL count
 *
 * Vault Rules § 2 defines story-grade levels:
 *   story        — 1-4 sourced URLs
 *   report       — 5-9 sourced URLs
 *   investigation — 10+ sourced URLs AND 3+ Tier 1 sources
 *
 * This script walks every profile, counts URLs + Tier 1 markers in the
 * body, and updates the `story-grade:` frontmatter field to match.
 *
 * Safe to run repeatedly — idempotent. Only updates if the computed
 * grade differs from what's in the file.
 *
 * Usage:
 *   node scripts/story-grade-auto-updater.cjs            # dry report
 *   node scripts/story-grade-auto-updater.cjs --write    # apply
 *   node scripts/story-grade-auto-updater.cjs --type=story --write  # only stories
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { countMarkdownUrls, countTier1InBody } = require('./lib/checklist-helpers.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const TYPE_ARG = process.argv.find(a => a.startsWith('--type='));
const TYPE_FILTER = TYPE_ARG ? TYPE_ARG.split('=')[1] : null;

function computeGrade(body) {
  const urlCount = countMarkdownUrls(body);
  const tier1Count = countTier1InBody(body);
  if (urlCount >= 10 && tier1Count >= 3) return 'investigation';
  if (urlCount >= 5) return 'report';
  if (urlCount >= 1) return 'story';
  return null;  // no URLs = don't assign a grade
}

function stampField(filePath, content, key, value) {
  const match = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!match) return false;
  let yaml = match[2];
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(yaml)) {
    yaml = yaml.replace(re, line);
  } else {
    yaml = yaml.trimEnd() + '\n' + line;
  }
  const newContent = match[1] + yaml + match[3] + content.slice(match[0].length);
  fs.writeFileSync(filePath, newContent, 'utf-8');
  return true;
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  let scanned = 0, changed = 0, unchanged = 0, skipped = 0;
  const changes = [];

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;
    if (TYPE_FILTER && data.type !== TYPE_FILTER) continue;
    scanned++;

    const computed = computeGrade(body);
    if (!computed) { skipped++; continue; }

    const current = data['story-grade'];
    if (current === computed) {
      unchanged++;
      continue;
    }

    changes.push({
      file: path.relative(CONTENT_DIR, f).split(path.sep).join('/'),
      title: data.title,
      current: current || '(unset)',
      computed,
    });

    if (WRITE) {
      stampField(f, content, 'story-grade', computed);
      changed++;
    }
  }

  console.log('═══════════════════════════════════════════════');
  console.log('  Story Grade Auto-Updater');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  if (TYPE_FILTER) console.log(`  Type filter: ${TYPE_FILTER}`);
  console.log(`  Scanned: ${scanned}`);
  console.log(`  Changed: ${WRITE ? changed : changes.length}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Skipped (no URLs): ${skipped}`);
  console.log('');

  if (changes.length > 0 && !WRITE) {
    console.log('  Sample changes (first 10):');
    changes.slice(0, 10).forEach(c => {
      console.log(`    ${c.title}: ${c.current} → ${c.computed}`);
    });
    console.log('');
    console.log('  Run with --write to apply.');
  }
}

main();
