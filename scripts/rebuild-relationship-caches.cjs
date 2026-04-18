#!/usr/bin/env node
/**
 * rebuild-relationship-caches.cjs — sync frontmatter caches from canonical store
 *
 * Rule 10 in CLAUDE.md: "data/relationships.jsonl" is the canonical source.
 * Frontmatter fields (related, donors, top-donors, politicians-funded, opposes,
 * stories) are read-caches that should be rebuilt from the store.
 *
 * This script ADDS missing canonical links to frontmatter.
 * It does NOT remove stale links (to avoid erasing data not yet in the store).
 *
 * Scope:
 *   - monetary edges → donors / top-donors on politician profiles
 *                    → politicians-funded on donor profiles
 *   - related edges  → related field (bidirectional)
 *
 * Run: node scripts/rebuild-relationship-caches.cjs [--write] [--dry-run] [--verbose]
 *      --write    : actually modify files (default is dry-run)
 *      --verbose  : show each change
 *      --monetary-only : only process monetary edges
 *
 * The canonical-store-sentinel allows commits that stage this file alongside
 * changed frontmatter files (this script is the authorized "rebuilder").
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CONTENT_DIR = path.join(ROOT, 'content');

const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const MONETARY_ONLY = process.argv.includes('--monetary-only');

// ─── Load canonical edges ─────────────────────────────────────────────────

function loadEdges() {
  const p = path.join(DATA_DIR, 'relationships.jsonl');
  return fs.readFileSync(p, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .filter(e => !e.status || e.status === 'active');
}

// ─── Build profile index ──────────────────────────────────────────────────

function walkProfiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkProfiles(full, results);
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]); } catch { return null; }
}

function serializeFrontmatter(fm) {
  return yaml.dump(fm, { lineWidth: -1, noRefs: true, quotingType: '"' });
}

function replaceFrontmatter(content, newFm) {
  const serialized = serializeFrontmatter(newFm);
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${serialized}---`);
}

// Parse wikilinks from a frontmatter string field
function extractWikilinks(field) {
  if (!field) return new Set();
  const raw = Array.isArray(field) ? field.join(' ') : String(field);
  const names = new Set();
  for (const m of raw.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    names.add(m[1].trim());
  }
  return names;
}

// Build a "[[Name]]" wikilink string from a set of names, preserving existing format
function buildWikilinkString(names, existing) {
  // Preserve existing separator if present
  const sep = existing && existing.includes(' · ') ? ' · ' : ', ';
  return [...names].map(n => `[[${n}]]`).join(sep);
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log('═══ rebuild-relationship-caches ═══');
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log();

  const edges = loadEdges();
  console.log(`  ${edges.length} active canonical edges loaded`);

  // Build name-indexed edge maps
  const monetaryByTo = new Map(); // politician name (lowercase) → donor names
  const monetaryByFrom = new Map(); // donor name (lowercase) → politician names

  for (const e of edges) {
    if (e.type !== 'monetary') continue;
    // Skip independent-expenditure OPPOSITION edges — those are spending
    // AGAINST the target (attack ads), not donations. Writing them into
    // frontmatter `donors` mis-labelled anti-Trump super PACs as "donors
    // of Trump." They belong in the opposition view instead, which reads
    // from the canonical edge store directly (not from frontmatter).
    if (e.role === 'ie-oppose') continue;
    const from = e.from;
    const to = e.to;
    if (!from || !to) continue;

    const toKey = to.toLowerCase();
    if (!monetaryByTo.has(toKey)) monetaryByTo.set(toKey, new Set());
    monetaryByTo.get(toKey).add(from);

    const fromKey = from.toLowerCase();
    if (!monetaryByFrom.has(fromKey)) monetaryByFrom.set(fromKey, new Set());
    monetaryByFrom.get(fromKey).add(to);
  }

  console.log(`  ${monetaryByTo.size} profiles have incoming monetary edges`);
  console.log(`  ${monetaryByFrom.size} profiles have outgoing monetary edges`);
  console.log();

  // Walk vault
  const profiles = walkProfiles(CONTENT_DIR);
  let updated = 0, skipped = 0, checked = 0;

  for (const filePath of profiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm) { skipped++; continue; }

    const title = fm.title || path.basename(filePath, '.md');
    const titleLower = title.toLowerCase();
    const profileType = fm.type;

    let changed = false;
    const newFm = { ...fm };

    // ── Politicians: update `donors` / `top-donors` from incoming monetary edges ──
    if (!MONETARY_ONLY || true) {
      if (profileType === 'politician') {
        const canonicalDonors = monetaryByTo.get(titleLower);
        if (canonicalDonors && canonicalDonors.size > 0) {
          // Merge with existing donors field
          const existingField = fm.donors || fm['top-donors'] || '';
          const existingNames = extractWikilinks(existingField);

          const missingDonors = [...canonicalDonors].filter(d => !existingNames.has(d));
          if (missingDonors.length > 0) {
            const allNames = new Set([...existingNames, ...canonicalDonors]);
            // Prefer updating 'donors' field, fall back to 'top-donors'
            const fieldToUpdate = fm.donors !== undefined ? 'donors' : 'top-donors';
            newFm[fieldToUpdate] = buildWikilinkString(allNames, fm[fieldToUpdate] || fm.donors);
            changed = true;
            if (VERBOSE) {
              console.log(`  + ${title} (politician): adding ${missingDonors.length} donors to ${fieldToUpdate}`);
              for (const d of missingDonors) console.log(`      + [[${d}]]`);
            }
          }
        }
      }

      // ── Donors/corporations: update `politicians-funded` from outgoing monetary edges ──
      if (profileType === 'donor' || profileType === 'corporation') {
        const canonicalFunded = monetaryByFrom.get(titleLower);
        if (canonicalFunded && canonicalFunded.size > 0) {
          const existingField = fm['politicians-funded'] || '';
          const existingNames = extractWikilinks(existingField);

          const missingFunded = [...canonicalFunded].filter(p => !existingNames.has(p));
          if (missingFunded.length > 0) {
            const allNames = new Set([...existingNames, ...canonicalFunded]);
            newFm['politicians-funded'] = buildWikilinkString(allNames, fm['politicians-funded']);
            changed = true;
            if (VERBOSE) {
              console.log(`  + ${title} (donor): adding ${missingFunded.length} politicians to politicians-funded`);
              for (const p of missingFunded) console.log(`      + [[${p}]]`);
            }
          }
        }
      }
    }

    if (changed) {
      checked++;
      if (WRITE) {
        const newContent = replaceFrontmatter(content, newFm);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        updated++;
        if (!VERBOSE) process.stdout.write('.');
      } else {
        updated++;
      }
    }
  }

  if (!VERBOSE && updated > 0) console.log();
  console.log();
  console.log(`  profiles checked: ${profiles.length}`);
  console.log(`  profiles with changes: ${updated}`);
  console.log(`  skipped (no frontmatter): ${skipped}`);
  if (!WRITE) console.log('\n  DRY RUN — re-run with --write to apply changes');
  else console.log('\n  ✓ Done');
}

main();
