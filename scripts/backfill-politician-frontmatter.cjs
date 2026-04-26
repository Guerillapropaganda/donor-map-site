#!/usr/bin/env node
/**
 * backfill-politician-frontmatter.cjs
 *
 * Walks every politician profile under content/Politicians/, checks
 * the frontmatter for missing required fields (chamber, party, bioguide-id),
 * and backfills from data/legislator-registry.jsonl when an unambiguous
 * match exists.
 *
 * SAFETY RULE — bioguide-id lookup ONLY. No name-based matching.
 * Cabinet members and governors share names with current/past
 * legislators ("John Kelly" the DHS secretary ≠ Rep. John Kelly PA-3),
 * and a wrong bioguide cascades into FEC ID confusion downstream.
 *
 * Lookup per profile:
 *   - If frontmatter already has bioguide-id, look up registry entry
 *     and backfill any missing chamber/party from that registry record.
 *   - If frontmatter has NO bioguide-id, skip. (David's lane: an
 *     editor needs to verify the right bioguide before any backfill.)
 *
 * Backfills only:
 *   - chamber  (House → "House", Senate → "Senate")
 *   - party    ("Democrat" / "Republican" / "Independent")
 *
 * Does NOT touch already-set fields. Does NOT touch bioguide-id at all.
 *
 * Usage:
 *   node scripts/backfill-politician-frontmatter.cjs           # dry-run
 *   node scripts/backfill-politician-frontmatter.cjs --write   # apply
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const POLITICIANS_DIR = path.join(ROOT, 'content', 'Politicians');
const REGISTRY = path.join(ROOT, 'data', 'legislator-registry.jsonl');
const WRITE = process.argv.includes('--write');

console.log(`[backfill-politician-frontmatter] ${WRITE ? 'WRITE' : 'DRY-RUN'}\n`);

// Load registry. Index by bioguide and by normalized name (current-term only,
// since historical reps with the same name as current officeholders would
// pollute name-based lookups).
const registry = {};
const byName = new Map();
function normalizeName(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
for (const line of fs.readFileSync(REGISTRY, 'utf-8').split('\n')) {
  if (!line.trim()) continue;
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  if (!r.bioguide) continue;
  registry[r.bioguide] = r;
  const fullName = r.name_official ||
    [r.name_first, r.name_last].filter(Boolean).join(' ');
  const key = normalizeName(fullName);
  if (key) {
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(r);
  }
}
console.log(`  registry: ${Object.keys(registry).length} legislators (${byName.size} unique names)`);

// Walk every .md file under Politicians/
function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.name.endsWith('.md')) yield p;
  }
}

function chamberMap(c) {
  if (!c) return null;
  if (c === 'house') return 'House';
  if (c === 'senate') return 'Senate';
  return null;
}
function partyMap(p) {
  if (!p) return null;
  if (p === 'Democrat') return 'Democrat';
  if (p === 'Republican') return 'Republican';
  return p; // pass through (Independent, etc.)
}

const plans = []; // { file, before, after, reason }
const skipped = []; // { file, reason }

for (const file of walk(POLITICIANS_DIR)) {
  const text = fs.readFileSync(file, 'utf-8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  let fm;
  try { fm = yaml.load(m[1]) || {}; } catch { continue; }
  if (fm.type !== 'politician') continue;

  // What's missing?
  const needsChamber = !fm.chamber;
  const needsParty = !fm.party;
  if (!needsChamber && !needsParty) continue;

  // BIOGUIDE-ONLY LOOKUP. No name fallback (too unsafe; cabinet members
  // share names with current/past legislators).
  if (!fm['bioguide-id']) {
    skipped.push({ file: path.relative(ROOT, file), reason: 'no bioguide-id set; cannot backfill safely without one' });
    continue;
  }
  const reg = registry[fm['bioguide-id']];
  if (!reg) {
    skipped.push({ file: path.relative(ROOT, file), reason: `bioguide ${fm['bioguide-id']} not in registry` });
    continue;
  }
  const resolution = `bioguide=${fm['bioguide-id']}`;

  const term = reg.current_term || {};
  const before = { chamber: fm.chamber, party: fm.party };
  const after = { ...before };
  const changes = [];
  if (needsChamber) {
    const c = chamberMap(term.chamber);
    if (c) { after.chamber = c; changes.push(`chamber=${c}`); }
  }
  if (needsParty) {
    const p = partyMap(term.party);
    if (p) { after.party = p; changes.push(`party=${p}`); }
  }
  if (changes.length === 0) continue;
  plans.push({ file, before, after, changes, resolution });
}

// Print plan
console.log(`\nPlans: ${plans.length} profile(s) would be updated`);
for (const p of plans) {
  console.log(`  ${path.relative(ROOT, p.file)}`);
  console.log(`    via ${p.resolution}`);
  console.log(`    → ${p.changes.join(', ')}`);
}
if (skipped.length) {
  console.log(`\nSkipped: ${skipped.length} profile(s) — registry lookup failed`);
  for (const s of skipped.slice(0, 30)) console.log(`  ${s.file} — ${s.reason}`);
  if (skipped.length > 30) console.log(`  ... and ${skipped.length - 30} more`);
}

if (!WRITE) {
  console.log(`\n[dry-run] no writes. Re-run with --write to apply.`);
  return;
}

// Apply
let written = 0;
for (const p of plans) {
  const text = fs.readFileSync(p.file, 'utf-8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  let fm;
  try { fm = yaml.load(m[1]) || {}; } catch { continue; }
  for (const k of ['chamber', 'party']) {
    if (p.after[k] !== undefined && p.after[k] !== p.before[k]) {
      fm[k] = p.after[k];
    }
  }
  // Re-serialize. Use lineWidth -1 so long arrays don't wrap.
  const newYaml = yaml.dump(fm, { lineWidth: -1, noRefs: true });
  const newText = `---\n${newYaml.trimEnd()}\n---${text.slice(m[0].length)}`;
  fs.writeFileSync(p.file, newText);
  written++;
}
console.log(`\n  profiles updated: ${written}`);
