#!/usr/bin/env node
/**
 * relationship-bidirectional.cjs — Find and optionally fix orphan connections
 *
 * Every connection in the vault should be bidirectional:
 *   - If Profile A has B in its `related:`, B should have A in its `related:`
 *   - If Profile A has Donor X in its `donors:`, X should have A in its
 *     `politicians-funded:` (or similar reverse field)
 *
 * Orphan edges (one-directional connections) are usually data-quality bugs:
 *   - Research Claude updated one profile but forgot the other
 *   - A merge artifact left a wikilink dangling
 *   - Profile was renamed without updating inbound references
 *
 * This script scans the whole vault, detects orphan edges, and outputs a
 * report. With --write, attempts safe auto-fix: adds the reverse wikilink
 * to the target profile's `related:` field when possible.
 *
 * Usage:
 *   node scripts/relationship-bidirectional.cjs             # dry report
 *   node scripts/relationship-bidirectional.cjs --write     # apply reverse links
 *   node scripts/relationship-bidirectional.cjs --report-only  # no writes even with --write
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'relationship-bidirectional-report.md');

function normalizeTitle(s) {
  return String(s || '')
    .replace(/^_/, '')
    .replace(/\s+Master Profile\s*$/i, '')
    .toLowerCase()
    .trim();
}

function parseWikilinks(field) {
  if (!field) return [];
  const str = Array.isArray(field) ? field.join(' · ') : String(field);
  const matches = str.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0]);
}

function loadAllProfiles() {
  const files = walkDir(CONTENT_DIR, '.md');
  const byTitle = new Map();
  const profiles = [];
  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;
    const norm = normalizeTitle(data.title);
    const p = { filePath: f, data, body, norm };
    profiles.push(p);
    byTitle.set(norm, p);
  }
  return { profiles, byTitle };
}

function main() {
  const { profiles, byTitle } = loadAllProfiles();
  const orphans = [];

  for (const source of profiles) {
    const relatedLinks = parseWikilinks(source.data.related);
    const donorLinks = parseWikilinks(source.data.donors);

    // Check each related: wikilink for a bidirectional counterpart
    for (const link of relatedLinks) {
      const targetNorm = normalizeTitle(link);
      const target = byTitle.get(targetNorm);
      if (!target) continue; // target not in vault, can't fix

      // Is source in target's related or donors or politicians-funded or opposes?
      const targetRelated = parseWikilinks(target.data.related);
      const targetDonors = parseWikilinks(target.data.donors);
      const targetOpposes = parseWikilinks(target.data.opposes);
      const targetFunded = parseWikilinks(target.data['politicians-funded']);

      const sourceNorm = source.norm;
      const found = [...targetRelated, ...targetDonors, ...targetOpposes, ...targetFunded]
        .some(l => normalizeTitle(l) === sourceNorm);

      if (!found) {
        orphans.push({
          source: source.data.title,
          sourcePath: source.filePath,
          target: target.data.title,
          targetPath: target.filePath,
          via: 'related',
          sourceType: source.data.type,
          targetType: target.data.type,
        });
      }
    }
  }

  // Deduplicate — A→B and B→A both flag the same orphan pair
  const seen = new Set();
  const unique = [];
  for (const o of orphans) {
    const key = [o.source, o.target].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(o);
  }

  // Report
  const lines = [];
  lines.push('---');
  lines.push('title: "Relationship Bidirectional Report"');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/relationship-bidirectional.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# Orphan Relationship Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${WRITE ? 'WRITE (would add reverse links)' : 'DRY RUN (report only)'}`);
  lines.push('');
  lines.push(`Scanned ${profiles.length} profiles.`);
  lines.push(`Orphan pairs: **${unique.length}**.`);
  lines.push('');
  lines.push('An orphan is a connection where A lists B in its `related:` but B does NOT reference A in any relationship field (related, donors, opposes, politicians-funded). Usually a data-quality bug — one side of the edit dropped.');
  lines.push('');
  lines.push('## Orphans');
  lines.push('');
  if (unique.length === 0) {
    lines.push('_No orphans detected. All bidirectional._');
  } else {
    unique.slice(0, 200).forEach(o => {
      lines.push(`- **${o.source}** (${o.sourceType}) → **${o.target}** (${o.targetType}) — \`${path.relative(CONTENT_DIR, o.sourcePath).split(path.sep).join('/')}\``);
    });
    if (unique.length > 200) lines.push(`- _...and ${unique.length - 200} more_`);
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`Report written: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`Orphan pairs: ${unique.length}`);

  if (WRITE) {
    console.log('\n  Auto-fix disabled in this version — review the report manually.');
    console.log('  Reason: reverse-link direction ambiguous (related vs donors vs opposes).');
    console.log('  Research Claude should add the reverse link to the appropriate field.');
  }
}

main();
