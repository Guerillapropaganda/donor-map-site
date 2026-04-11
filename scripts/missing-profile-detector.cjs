#!/usr/bin/env node
/**
 * missing-profile-detector.cjs — find wikilinked entities that don't
 * have their own profile file yet
 *
 * Every profile in the vault references other entities via wikilinks
 * and comma-separated donor lists. Many of those references point to
 * entities that should have their own profile but don't. This script
 * finds them and ranks them by inbound reference count so the most-
 * connected missing profiles float to the top.
 *
 * Key insight: a missing profile referenced by 40 other profiles is
 * 40x more valuable to build than one referenced by 1. The ranking
 * matters more than the detection.
 *
 * Output:
 *   - Contributes entries to the Attention Queue in the "compounding"
 *     bucket (these are cleanup wins that make future research easier)
 *   - Writes a detailed report to content/Admin Notes/missing-profiles.md
 *     with the full ranked list
 *
 * Usage:
 *   node scripts/missing-profile-detector.cjs
 *   node scripts/missing-profile-detector.cjs --min-refs=5   (show only entities referenced 5+ times)
 */
const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');
const { addEntries, clearSource } = require('./lib/attention-queue.cjs');
const { getRejectedPatterns } = require('./lib/false-positive-log.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const SOURCE_NAME = 'missing-profile-detector';
const REPORT_PATH = path.join(CONTENT_DIR, 'Admin Notes', 'missing-profiles.md');

const MIN_REFS_ARG = process.argv.find(a => a.startsWith('--min-refs='));
const MIN_REFS = MIN_REFS_ARG ? parseInt(MIN_REFS_ARG.split('=')[1]) : 3;

function normalize(name) {
  return String(name || '')
    .replace(/^_+/, '')
    .replace(/\s+Master Profile\s*$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractWikilinks(text) {
  if (!text) return [];
  const s = Array.isArray(text) ? text.join(' · ') : String(text);
  const matches = s.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
  if (!matches) return [];
  return matches.map(m => m.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim());
}

function extractWikilinksFromBody(body) {
  return extractWikilinks(body);
}

function main() {
  const files = walkDir(CONTENT_DIR, '.md');
  const rejected = getRejectedPatterns(SOURCE_NAME);

  // Step 1: build the set of all existing profile titles (normalized)
  const existing = new Map(); // normalized name → canonical title
  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data } = parseFrontmatter(content);
    if (!data || !data.title) continue;
    const norm = normalize(data.title);
    if (!existing.has(norm)) existing.set(norm, data.title);
  }

  // Step 2: scan every profile's related/donors/opposes/body for wikilinks
  const refCounts = new Map(); // normalized → { displayName, count, referencedBy: [] }

  for (const f of files) {
    let content;
    try { content = fs.readFileSync(f, 'utf-8'); } catch { continue; }
    const { data, body } = parseFrontmatter(content);
    if (!data || !data.title) continue;

    // Skip admin notes and seeds — they reference profiles but aren't profiles themselves
    if (data.type === 'admin-note' || data.type === 'story-seed' || data.type === 'system') continue;
    if (f.includes('/Admin Notes/') || f.includes('/Story Seeds/') || f.includes('/Vault Maintenance/')) continue;

    const fromProfile = data.title;
    const links = new Set();
    // Frontmatter fields
    for (const field of ['related', 'donors', 'opposes', 'top-donors', 'politicians-funded', 'politicians-opposed']) {
      for (const name of extractWikilinks(data[field])) links.add(name);
    }
    // Body wikilinks
    for (const name of extractWikilinksFromBody(body)) links.add(name);

    for (const name of links) {
      const norm = normalize(name);
      if (!norm) continue;
      if (existing.has(norm)) continue; // profile exists — not missing
      if (!refCounts.has(norm)) {
        refCounts.set(norm, { displayName: name, count: 0, referencedBy: new Set() });
      }
      const entry = refCounts.get(norm);
      entry.count++;
      entry.referencedBy.add(fromProfile);
    }
  }

  // Step 3: rank by inbound ref count; filter below threshold and rejected
  const ranked = [...refCounts.entries()]
    .map(([norm, info]) => ({
      norm,
      displayName: info.displayName,
      count: info.referencedBy.size, // unique referencing profiles, not total occurrences
      referencedBy: [...info.referencedBy],
    }))
    .filter(e => e.count >= MIN_REFS)
    .filter(e => !rejected.has(e.norm))
    .sort((a, b) => b.count - a.count);

  // Step 4: write the detailed report (for Obsidian browsing)
  const lines = [];
  lines.push('---');
  lines.push('title: "Missing Profiles — ranked by inbound references"');
  lines.push('type: admin-note');
  lines.push('note-type: data');
  lines.push('priority: normal');
  lines.push('status: open');
  lines.push(`last-updated: '${new Date().toISOString().slice(0, 10)}'`);
  lines.push('generated-by: scripts/missing-profile-detector.cjs');
  lines.push('---');
  lines.push('');
  lines.push('# Missing Profiles');
  lines.push('');
  lines.push(`${ranked.length} entities are referenced via wikilinks from ${MIN_REFS}+ other profiles but don't have their own profile file yet. Ranked by how many unique profiles reference them — the ones at the top are the highest-leverage builds.`);
  lines.push('');
  lines.push('## Top 50');
  lines.push('');
  lines.push('| Rank | Entity | Referenced by | Sample referencing profiles |');
  lines.push('|-----:|--------|--------------:|-----------------------------|');
  ranked.slice(0, 50).forEach((e, i) => {
    const sample = e.referencedBy.slice(0, 3).join(', ');
    const more = e.referencedBy.length > 3 ? ` _(+${e.referencedBy.length - 3} more)_` : '';
    lines.push(`| ${i + 1} | **${e.displayName}** | ${e.count} | ${sample}${more} |`);
  });
  lines.push('');
  if (ranked.length > 50) {
    lines.push(`_...and ${ranked.length - 50} more below the fold._`);
    lines.push('');
  }
  lines.push('## How to resolve');
  lines.push('');
  lines.push('1. **Build it:** create a raw-tier stub profile for the entity. Frontmatter + one-line description is enough to start.');
  lines.push('2. **Reject it:** if the entity is noise (typo of an existing profile, generic term, not worth tracking), delete the wikilink from the referencing profiles OR add it to the false-positive log.');
  lines.push('3. **Merge it:** if the entity is a duplicate of an existing profile under a different name, add the variant as a wikilink alias in the existing profile.');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');

  // Step 5: contribute top 15 to the attention queue
  const entries = ranked.slice(0, 15).map(e => ({
    bucket: 'compounding',
    what: `Build stub: ${e.displayName}`,
    why: `Referenced by ${e.count} other vault profiles but has no file yet. Building a stub unlocks ${e.count} broken wikilinks and turns this entity into something other scripts can enrich. Sample: ${e.referencedBy.slice(0, 3).join(', ')}.`,
    where: `content/Admin Notes/missing-profiles.md`,
    cost_min: 10,
    leverage: Math.min(5, Math.floor(e.count / 5) + 1), // 5 refs = 2 stars, 20+ refs = 5 stars
    metadata: { refCount: e.count },
  }));

  if (entries.length === 0) {
    clearSource(SOURCE_NAME);
    console.log(`Missing Profile Detector: no entities with ≥${MIN_REFS} references are missing.`);
    return;
  }

  const count = addEntries(SOURCE_NAME, entries);
  console.log(`Missing Profile Detector found ${ranked.length} missing entities with ≥${MIN_REFS} references.`);
  console.log(`  Top of list: ${ranked[0].displayName} (${ranked[0].count} refs)`);
  console.log(`  Attention Queue: ${count} top entries added to the compounding bucket.`);
  console.log(`  Full report: ${path.relative(process.cwd(), REPORT_PATH)}`);
}

main();
