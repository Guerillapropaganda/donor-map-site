#!/usr/bin/env node
/**
 * relationship-overlap-check.cjs
 *
 * Finds profiles where the same name appears in BOTH a "funding" frontmatter
 * field (politicians-funded / donors / top-donors) AND the `opposes` field on
 * the same profile. This is one of two patterns:
 *
 *   1. Real both-sides play  — the entity actually funds AND attacks the
 *      target. Backed by canonical monetary edges in the librarian.
 *      Legitimate story-candidate signal; leave the frontmatter alone.
 *
 *   2. Frontmatter-only ghost — the name is in both fields but the librarian
 *      has zero monetary edges connecting them. Editorial typo / stale cache.
 *      The contradiction-miner reads frontmatter and fires "very-high"
 *      confidence story candidates on these. Wastes triage time.
 *
 * This check runs every harness tick, classifies each overlap via the
 * librarian, and reports the frontmatter-only count as findings_count.
 * Monetary-backed overlaps are surfaced in the JSON for context but don't
 * count as findings — they're the real signal.
 *
 * USAGE:
 *   node scripts/relationship-overlap-check.cjs --json
 *   node scripts/relationship-overlap-check.cjs           # human output
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'content');
const RELATIONSHIPS_FILE = path.join(REPO_ROOT, 'data', 'relationships.jsonl');
const DERIVED_DIR = path.join(REPO_ROOT, 'data', 'derived');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');

// ─── Helpers ───────────────────────────────────────────────────────────

function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      yield* walk(path.join(dir, e.name));
    } else if (e.name.endsWith('.md')) {
      yield path.join(dir, e.name);
    }
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  try { return yaml.load(m[1]); } catch { return null; }
}

function extractWikilinkNames(field) {
  if (!field) return [];
  const s = Array.isArray(field) ? field.join(' · ') : String(field);
  const out = [];
  const re = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
  let m;
  while ((m = re.exec(s))) out.push(m[1].trim());
  return out;
}

// Librarian-backed monetary-pair index extracted into a shared lib so
// detectors gating on "is there real money behind this pair?" all use
// the same canonical implementation (per ADR-0024 + Rule 4).
const {
  loadMonetaryPairs,
  hasMonetaryEdge,
  normalize,
} = require('./lib/librarian-monetary-pairs.cjs');

// ─── Main scan ─────────────────────────────────────────────────────────

function main() {
  const { createCanonicalNameResolver } = require('./lib/canonical-name-resolver.cjs');
  const resolver = createCanonicalNameResolver();
  const monetaryPairs = loadMonetaryPairs(resolver);
  const monetaryBacked = [];
  const frontmatterOnly = [];

  for (const file of walk(CONTENT_DIR)) {
    let text;
    try { text = fs.readFileSync(file, 'utf-8'); } catch { continue; }
    const fm = parseFrontmatter(text);
    if (!fm || typeof fm !== 'object') continue;

    const subjectName = fm.title || path.basename(file, '.md');
    const opp = extractWikilinkNames(fm.opposes);
    if (opp.length === 0) continue;

    const fundingNames = [
      ...extractWikilinkNames(fm['politicians-funded']),
      ...extractWikilinkNames(fm.donors),
      ...extractWikilinkNames(fm['top-donors']),
    ];
    if (fundingNames.length === 0) continue;

    const oppLower = new Set(opp.map(normalize));
    const overlap = new Set();
    for (const n of fundingNames) {
      if (oppLower.has(normalize(n))) overlap.add(n);
    }
    if (overlap.size === 0) continue;

    for (const overlapName of overlap) {
      const backed = hasMonetaryEdge(monetaryPairs, subjectName, overlapName, resolver);
      const record = {
        profile: path.relative(REPO_ROOT, file).replace(/\\/g, '/'),
        subject: subjectName,
        overlap_name: overlapName,
        in_funding_field: extractWikilinkNames(fm['politicians-funded']).some(
          (n) => normalize(n) === normalize(overlapName),
        )
          ? 'politicians-funded'
          : extractWikilinkNames(fm.donors).some((n) => normalize(n) === normalize(overlapName))
            ? 'donors'
            : 'top-donors',
        in_opposes_field: true,
      };
      if (backed) monetaryBacked.push(record);
      else frontmatterOnly.push(record);
    }
  }

  const result = {
    findings_count: frontmatterOnly.length,
    monetary_backed_count: monetaryBacked.length,
    frontmatter_only: frontmatterOnly,
    monetary_backed: monetaryBacked,
    summary:
      `${frontmatterOnly.length} frontmatter-only overlap(s) ` +
      `(no librarian backing — likely editorial typo or stale cache); ` +
      `${monetaryBacked.length} monetary-backed overlap(s) ` +
      `(real both-sides play, leave alone).`,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify(result, null, 2));
    return;
  }

  console.log('═══ relationship-overlap-check ═══');
  console.log(result.summary);
  console.log();
  if (frontmatterOnly.length > 0) {
    console.log('Frontmatter-only overlaps (actionable — no librarian backing):');
    for (const r of frontmatterOnly) {
      console.log(`  ${r.profile}`);
      console.log(`    ${r.subject} ← ${r.overlap_name} (in ${r.in_funding_field} AND opposes)`);
    }
    console.log();
  }
  if (monetaryBacked.length > 0) {
    console.log(`Monetary-backed (real both-sides — keep): ${monetaryBacked.length}`);
    for (const r of monetaryBacked.slice(0, 10)) {
      console.log(`  ${r.subject} ↔ ${r.overlap_name}  (${r.in_funding_field} ∩ opposes, $-edge in librarian)`);
    }
    if (monetaryBacked.length > 10) {
      console.log(`  ... and ${monetaryBacked.length - 10} more`);
    }
  }
}

main();
