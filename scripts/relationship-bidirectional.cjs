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
const { loadEdges, clearEdgesCache } = require('./lib/relationships-store.cjs');

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, '..', 'content');
const WRITE = process.argv.includes('--write');
const USE_JSONL = !process.argv.includes('--frontmatter');
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

// ─── JSONL-based orphan detection (Phase 3 Part 4b retarget) ──────

function findOrphansFromJsonl() {
  clearEdgesCache();
  const edges = loadEdges().filter(e => e.status === 'active' && e.type === 'related');
  const pairs = new Set();
  for (const e of edges) {
    if (!e.from || !e.to || e.from === e.to) continue;
    pairs.add(`${e.from}||${e.to}`);
  }

  const orphans = [];
  for (const e of edges) {
    if (!e.from || !e.to || e.from === e.to) continue;
    const reverseKey = `${e.to}||${e.from}`;
    if (!pairs.has(reverseKey)) {
      orphans.push({
        source: e.from,
        sourcePath: '',
        target: e.to,
        targetPath: '',
        via: 'related',
        sourceType: e.from_type || 'unknown',
        targetType: e.to_type || 'unknown',
      });
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const o of orphans) {
    const key = [o.source, o.target].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(o);
  }

  return { unique, edgeCount: edges.length };
}

// ─── Frontmatter-based orphan detection (legacy, --frontmatter flag) ──

function findOrphansFromFrontmatter() {
  const { profiles, byTitle } = loadAllProfiles();
  const orphans = [];

  for (const source of profiles) {
    const relatedLinks = parseWikilinks(source.data.related);

    for (const link of relatedLinks) {
      const targetNorm = normalizeTitle(link);
      const target = byTitle.get(targetNorm);
      if (!target) continue;

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

  const seen = new Set();
  const unique = [];
  for (const o of orphans) {
    const key = [o.source, o.target].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(o);
  }

  return { unique, profileCount: profiles.length };
}

function main() {
  const mode = USE_JSONL ? 'JSONL' : 'frontmatter';
  console.log(`Bidirectional check mode: ${mode}`);

  let unique;
  let scannedDesc;

  if (USE_JSONL) {
    const result = findOrphansFromJsonl();
    unique = result.unique;
    scannedDesc = `${result.edgeCount} active related edges from data/relationships.jsonl`;
  } else {
    const result = findOrphansFromFrontmatter();
    unique = result.unique;
    scannedDesc = `${result.profileCount} profiles from content/`;
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
  lines.push(`Mode: ${mode}${WRITE ? ' + WRITE' : ' (report only)'}`);
  lines.push('');
  lines.push(`Scanned ${scannedDesc}.`);
  lines.push(`Orphan pairs: **${unique.length}**.`);
  lines.push('');
  lines.push(USE_JSONL
    ? 'An orphan is a `related` edge A→B in data/relationships.jsonl where no B→A edge exists. The bidirectional-normalizer (scripts/normalize-related-bidirectionality.cjs) can auto-fix these. Pass --frontmatter to use the legacy frontmatter-based detection instead.'
    : 'An orphan is a connection where A lists B in its `related:` frontmatter but B does NOT reference A in any relationship field. Usually a data-quality bug. Pass without --frontmatter to use the JSONL-based detection (canonical store).');
  lines.push('');
  lines.push('## Orphans');
  lines.push('');
  if (unique.length === 0) {
    lines.push('_No orphans detected. All bidirectional._');
  } else {
    unique.slice(0, 200).forEach(o => {
      const pathInfo = o.sourcePath
        ? ` — \`${path.relative(CONTENT_DIR, o.sourcePath).split(path.sep).join('/')}\``
        : '';
      lines.push(`- **${o.source}** (${o.sourceType}) → **${o.target}** (${o.targetType})${pathInfo}`);
    });
    if (unique.length > 200) lines.push(`- _...and ${unique.length - 200} more_`);
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`Report written: ${path.relative(process.cwd(), REPORT_PATH)}`);
  console.log(`Orphan pairs: ${unique.length}`);
}

main();
