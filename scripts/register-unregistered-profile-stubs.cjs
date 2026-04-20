#!/usr/bin/env node
/**
 * register-unregistered-profile-stubs.cjs
 *
 * Many vault profiles exist as .md files but have no record in
 * data/entities.jsonl. That makes them invisible to the Ask UI's
 * entity resolution: "who is bari weiss" fails even though
 * content/Media & Influence Pipeline/Left/Bari Weiss.md exists.
 *
 * This script finds all .md files under content/{Media & Influence
 * Pipeline, Think Tanks & Policy Infrastructure, Lobbying Firms &
 * K Street, Donors & Power Networks} that have valid frontmatter
 * but no matching entity record, and creates minimal stubs.
 *
 * Each stub:
 *   - name        = filename (stripped of _ prefix and Master Profile suffix)
 *   - profile_path = normalized forward-slash path relative to repo root
 *   - entity_type = inferred from parent folder (media-profile, nonprofit,
 *                   org, donor, corporation)
 *   - signals.sector = inferred from folder
 *   - signals.body_snippet = first ~200 chars of the profile prose
 *
 * Does NOT set class tags — those require editorial review and are
 * left null. Does NOT overwrite existing records.
 *
 * Dry-run by default. --write to apply.
 */
const fs = require('fs');
const path = require('path');
const { loadEntities } = require('./lib/entities-store.cjs');
const { newRecord } = require('./lib/entities-schema.cjs');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const ENT_FILE = path.join(ROOT, 'data', 'entities.jsonl');
const WRITE = process.argv.includes('--write');

// Folder → inferred entity_type + sector
const FOLDER_MAP = [
  { test: /content[\\/]Media & Influence Pipeline/i, entity_type: 'media-profile', sector: 'Media' },
  { test: /content[\\/]Think Tanks & Policy Infrastructure/i, entity_type: 'nonprofit', sector: 'Think Tank' },
  { test: /content[\\/]Lobbying Firms & K Street/i, entity_type: 'corporation', sector: 'Lobbying' },
  { test: /content[\\/]Donors & Power Networks[\\/]Dark Money/i, entity_type: 'donor', sector: 'Dark Money' },
  { test: /content[\\/]Donors & Power Networks[\\/]Mega-Donors/i, entity_type: 'donor', sector: 'Mega-Donor' },
  { test: /content[\\/]Donors & Power Networks/i, entity_type: 'donor', sector: 'Donor' },
  { test: /content[\\/]Politicians/i, entity_type: 'politician', sector: 'Political' },
];

function inferMeta(absPath) {
  for (const m of FOLDER_MAP) {
    if (m.test.test(absPath)) return m;
  }
  return null;
}

function walkMd(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function normalizedName(file) {
  return path.basename(file, '.md').replace(/^_/, '').replace(/ Master Profile$/, '');
}

function extractBodySnippet(text) {
  // Strip frontmatter
  const afterFm = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
  // Strip auto-panel and HTML comments
  const cleaned = afterFm
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^#+\s+.*$/gm, '')
    .replace(/^\|.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 220);
}

const ents = loadEntities();
const byPath = new Map();
const byNameNorm = new Map();
function normalizeName(n) { return String(n || '').toLowerCase().trim().replace(/\s+/g, ' '); }
for (const e of ents) {
  if (e.profile_path) byPath.set(e.profile_path.replace(/\\/g, '/'), e);
  byNameNorm.set(normalizeName(e.name), e);
}

const files = walkMd(CONTENT);
const candidates = [];
for (const f of files) {
  const meta = inferMeta(f);
  if (!meta) continue;
  if (meta.entity_type === 'politician') continue; // politicians have their own pipeline

  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const name = normalizedName(f);

  // Skip if already registered (by path or by name)
  if (byPath.has(rel)) continue;
  if (byNameNorm.has(normalizeName(name))) continue;

  // Skip index/hub pages
  if (/^_/.test(path.basename(f)) && !/Master Profile/.test(path.basename(f))) continue;
  if (/^(README|index|Index)\.md$/i.test(path.basename(f))) continue;
  // Skip registry/master-list pages that aren't entities
  if (/\b(Registry|Index|Master List|Database|Overview|Guided Tour|Deep Dive|Cheat Sheet|Primer)\b/i.test(name)) continue;

  // Substring-duplicate check — if any existing entity name fully
  // contains the candidate name (or vice versa, either direction),
  // skip. Prevents creating "Raytheon" when "Raytheon (RTX)" exists,
  // "GEO Group" when "GEO Group - Private Prisons" exists, etc.
  const candNorm = normalizeName(name);
  const candTokens = candNorm.split(/\s+/).filter((t) => t.length > 2);
  let dup = false;
  for (const existing of byNameNorm.keys()) {
    if (existing === candNorm) { dup = true; break; }
    // Full substring match in either direction
    if (existing.includes(candNorm) || candNorm.includes(existing)) { dup = true; break; }
    // All-tokens-match (both 2+ tokens) — Raytheon vs Raytheon Technologies
    if (candTokens.length >= 2) {
      const existingTokens = new Set(existing.split(/\s+/));
      if (candTokens.every((t) => existingTokens.has(t))) { dup = true; break; }
    }
  }
  if (dup) continue;

  // Read and validate frontmatter exists
  let text;
  try { text = fs.readFileSync(f, 'utf-8'); } catch { continue; }
  if (!/^---\n[\s\S]*?\n---/.test(text)) continue;

  candidates.push({
    file: rel,
    name,
    entity_type: meta.entity_type,
    sector: meta.sector,
    body_snippet: extractBodySnippet(text),
  });
}

console.log(`[register-unregistered-profile-stubs] ${WRITE ? 'WRITE' : 'dry-run'}`);
console.log(`  scanned: ${files.length} .md files`);
console.log(`  already-registered: ${byPath.size}`);
console.log(`  new stubs proposed: ${candidates.length}\n`);

// Group by entity_type for reporting
const byType = new Map();
for (const c of candidates) byType.set(c.entity_type, (byType.get(c.entity_type) || 0) + 1);
for (const [t, n] of [...byType.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${t}`);

if (candidates.length === 0) { if (!WRITE) console.log('  nothing to do.'); return; }

console.log('\n  Sample 10 proposed stubs:');
for (const c of candidates.slice(0, 10)) {
  console.log(`    [${c.entity_type}] ${c.name}  ← ${c.file}`);
}

if (!WRITE) {
  console.log('\n  rerun with --write to apply.');
  return;
}

// Assign IDs. Find the highest existing id number.
let maxId = 0;
for (const e of ents) {
  if (typeof e.id === 'string' && /^ent_\d+$/.test(e.id)) {
    const n = parseInt(e.id.slice(4), 10);
    if (n > maxId) maxId = n;
  }
}

const newRecords = candidates.map((c) => {
  maxId++;
  const rec = newRecord({
    name: c.name,
    profile_path: c.file,
    entity_type: c.entity_type,
    signals: {
      naics: null,
      sector: c.sector,
      party_breakdown: null,
      top_politicians_funded: [],
      total_political_spend: null,
      body_snippet: c.body_snippet,
      edge_count: 0,
      content_readiness: 'raw',
      source_tier: 1,
      signals_gathered_at: new Date().toISOString(),
      auto_registered_by: 'register-unregistered-profile-stubs.cjs',
    },
  });
  rec.id = `ent_${String(maxId).padStart(5, '0')}`;
  return rec;
});

const existing = fs.readFileSync(ENT_FILE, 'utf-8').replace(/\n+$/, '');
const appended = newRecords.map((r) => JSON.stringify(r)).join('\n');
fs.writeFileSync(ENT_FILE, existing + '\n' + appended + '\n');
console.log(`\n  wrote ${newRecords.length} new entity records.`);
