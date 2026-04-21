#!/usr/bin/env node
/**
 * harvest-profile-sources.cjs — ADR-0017 Session D
 *
 * Populates `## Sources` sections on profiles that have canonical
 * government IDs in frontmatter but empty Sources. Each emitted
 * citation is a Tier 1 canonical URL constructed from a known ID —
 * NOT a URL hunt. Per rule 13, neither Claude hunts, fixes, or
 * substitutes URLs. This script only emits URLs deterministically
 * derived from IDs that ingest pipelines have already stamped.
 *
 * Canonical ID → URL mappings:
 *   bioguide-id      → https://www.congress.gov/member/{id}
 *   govtrack-id      → https://www.govtrack.us/congress/members/{id}
 *   fec-candidate-id → https://www.fec.gov/data/candidate/{id}/
 *   fec-committee-id → https://www.fec.gov/data/committee/{id}/
 *   ein              → https://projects.propublica.org/nonprofits/organizations/{id}
 *
 * All five are Tier 1 per content/Vault Rules.md § 2.
 *
 * Eligibility (ALL must be true):
 *   - frontmatter.type is a publishable profile type
 *   - Sources section is empty or missing (≤50 chars after stripping
 *     HTML comments + whitespace)
 *   - no (URL NEEDED) / (UNVERIFIED) / (NEEDS REVIEW) /
 *     defamation-sanitized flags anywhere in body
 *   - profile has at least one valid canonical ID
 *
 * Emissions are wrapped in `<!-- auto:harvested-sources start/end -->`
 * so future runs can update in place without disturbing manual edits
 * added between the markers.
 *
 * Usage:
 *   node scripts/harvest-profile-sources.cjs           # dry-run report
 *   node scripts/harvest-profile-sources.cjs --write   # apply
 *   node scripts/harvest-profile-sources.cjs --limit 20 --write  # small batch
 *   node scripts/harvest-profile-sources.cjs --verbose
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const WRITE = process.argv.includes('--write');
const VERBOSE = process.argv.includes('--verbose');
const LIMIT_IDX = process.argv.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(process.argv[LIMIT_IDX + 1], 10) : Infinity;

const PUBLISHABLE_TYPES = new Set([
  'politician', 'state-politician', 'local-politician',
  'donor', 'corporation', 'pac', 'think-tank', 'lobbying-firm',
]);

const BLOCK_START = '<!-- auto:harvested-sources start -->';
const BLOCK_END = '<!-- auto:harvested-sources end -->';

// ID validators — strict so we never emit a malformed URL.
// FEC candidate IDs: office code (H/S/P) + 2 digits + 2 letters + 5 digits = 9 chars
//   examples: H8CA45130, S4CA00522, P80001571
// FEC committee IDs: C + 8 digits = 9 chars, e.g. C00234120
// Bioguide: letter + 6 digits (some legacy have 5; we require 6 for safety)
const ID_VALIDATORS = {
  'bioguide-id': (id) => /^[A-Z]\d{6}$/.test(String(id).trim()),
  'govtrack-id': (id) => /^\d+$/.test(String(id).trim()),
  'fec-candidate-id': (id) => /^[HSP]\d[A-Z0-9]{7}$/i.test(String(id).trim()),
  'fec-committee-id': (id) => /^C\d{8}$/.test(String(id).trim()),
  ein: (id) => /^\d{9}$/.test(String(id).replace(/-/g, '').trim()),
};

function buildCitations(fm) {
  const lines = [];
  const bioguide = fm['bioguide-id'];
  if (bioguide && ID_VALIDATORS['bioguide-id'](bioguide)) {
    lines.push(`- [Congress.gov: member profile (bioguide ${bioguide})](https://www.congress.gov/member/${bioguide}) (Tier 1)`);
  }
  const govtrack = fm['govtrack-id'];
  if (govtrack && ID_VALIDATORS['govtrack-id'](govtrack)) {
    lines.push(`- [GovTrack: voting record (${govtrack})](https://www.govtrack.us/congress/members/${govtrack}) (Tier 1)`);
  }
  const fecCand = fm['fec-candidate-id'];
  if (fecCand && ID_VALIDATORS['fec-candidate-id'](fecCand)) {
    lines.push(`- [FEC: candidate filings ${fecCand}](https://www.fec.gov/data/candidate/${fecCand}/) (Tier 1)`);
  }
  const fecComm = fm['fec-committee-id'];
  if (fecComm && ID_VALIDATORS['fec-committee-id'](fecComm)) {
    lines.push(`- [FEC: committee filings ${fecComm}](https://www.fec.gov/data/committee/${fecComm}/) (Tier 1)`);
  }
  const einRaw = fm.ein;
  if (einRaw) {
    const ein = String(einRaw).replace(/-/g, '').trim();
    if (ID_VALIDATORS.ein(ein)) {
      lines.push(`- [ProPublica Nonprofit Explorer: EIN ${ein} (IRS 990 filings)](https://projects.propublica.org/nonprofits/organizations/${ein}) (Tier 1)`);
    }
  }
  return lines;
}

function hasBlockingFlags(body) {
  return /\(URL NEEDED\)|\(UNVERIFIED\)|\(NEEDS REVIEW\)|defamation-sanitized/i.test(body);
}

function hasExistingSourcesContent(body) {
  // Match any Sources heading at H2/H3/H4 (## through ####), case-insensitive.
  const match = body.match(/^#{2,4}\s+Sources\b[\s\S]*?(?=^#{1,4}\s|\r?\n---\s*$|$)/im);
  if (match) {
    const stripped = match[0].replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, '');
    if (stripped.length > 50) return true;
  }
  // Also skip if there's any Tier 1 annotation anywhere (some profiles put
  // citations inside auto-blocks outside a Sources heading).
  if (/\(Tier\s*1\)/i.test(body)) return true;
  // Or any {{src:ID}} refs (canonical source registry refs).
  if (/\{\{src:[a-z0-9_-]+\}\}/i.test(body)) return true;
  return false;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'Assets') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  try {
    return { fm: yaml.load(m[1]) || {}, body: raw.slice(m[0].length), fmRaw: m[0] };
  } catch {
    return null;
  }
}

function emitBlock(lines) {
  return [
    BLOCK_START,
    ...lines,
    '',
    '*Auto-generated from canonical government identifiers in frontmatter (bioguide, FEC, IRS EIN). These URLs are deterministic — constructed from IDs, not manually curated or hunted. See content/Vault Rules.md § 2b on canonical URL construction.*',
    BLOCK_END,
  ].join('\n');
}

function insertSources(raw, body, lines) {
  // Match Sources at H2/H3/H4 (same tolerance as hasExistingSourcesContent).
  const sourcesMatch = body.match(/^(#{2,4}\s+Sources\s*\r?\n)/im);
  const block = emitBlock(lines);
  if (sourcesMatch) {
    // Idempotency: replace our own previous emission if present.
    const existing = body.match(new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`));
    if (existing) {
      return raw.replace(existing[0], block);
    }
    // Insert immediately after the Sources heading line.
    const idx = body.indexOf(sourcesMatch[0]);
    const insertAt = idx + sourcesMatch[0].length;
    const newBody = body.slice(0, insertAt) + block + '\n\n' + body.slice(insertAt);
    return raw.replace(body, newBody);
  }
  // No Sources section anywhere → append a new H2.
  const appended = body.replace(/\s*$/, '') + '\n\n## Sources\n\n' + block + '\n';
  return raw.replace(body, appended);
}

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  harvest-profile-sources — ADR-0017 Session D');
  console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}${LIMIT < Infinity ? ` (limit ${LIMIT})` : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const files = walk(CONTENT_DIR);
  const stats = {
    totalPublishable: 0,
    skippedHasContent: 0,
    skippedBlockingFlags: 0,
    skippedNoIds: 0,
    eligible: 0,
    harvested: 0,
  };
  const idBreakdown = { bioguide: 0, govtrack: 0, fecCand: 0, fecComm: 0, ein: 0 };
  const samples = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;
    const { fm, body } = parsed;
    if (!fm.type || !PUBLISHABLE_TYPES.has(fm.type)) continue;
    stats.totalPublishable++;

    if (hasBlockingFlags(body)) {
      stats.skippedBlockingFlags++;
      continue;
    }
    if (hasExistingSourcesContent(body)) {
      stats.skippedHasContent++;
      continue;
    }

    const lines = buildCitations(fm);
    if (lines.length === 0) {
      stats.skippedNoIds++;
      continue;
    }
    stats.eligible++;

    // Tally ID coverage
    if (fm['bioguide-id'] && ID_VALIDATORS['bioguide-id'](fm['bioguide-id'])) idBreakdown.bioguide++;
    if (fm['govtrack-id'] && ID_VALIDATORS['govtrack-id'](fm['govtrack-id'])) idBreakdown.govtrack++;
    if (fm['fec-candidate-id'] && ID_VALIDATORS['fec-candidate-id'](fm['fec-candidate-id'])) idBreakdown.fecCand++;
    if (fm['fec-committee-id'] && ID_VALIDATORS['fec-committee-id'](fm['fec-committee-id'])) idBreakdown.fecComm++;
    if (fm.ein && ID_VALIDATORS.ein(String(fm.ein).replace(/-/g, ''))) idBreakdown.ein++;

    if (samples.length < 5) {
      samples.push({ path: path.relative(ROOT, filePath), title: fm.title, lines });
    }

    if (stats.harvested >= LIMIT) continue;

    if (VERBOSE) {
      console.log(`  ${path.relative(ROOT, filePath)}: +${lines.length} citation(s)`);
    }

    if (WRITE) {
      const updated = insertSources(raw, body, lines);
      fs.writeFileSync(filePath, updated, 'utf-8');
      stats.harvested++;
    } else {
      stats.harvested++;
    }
  }

  console.log('\n═══ RESULTS ═══════════════════════════════════════════════\n');
  console.log(`  Total publishable profiles scanned: ${stats.totalPublishable}`);
  console.log(`  Skipped (Sources already populated): ${stats.skippedHasContent}`);
  console.log(`  Skipped (blocking flags present):    ${stats.skippedBlockingFlags}`);
  console.log(`  Skipped (no valid canonical IDs):    ${stats.skippedNoIds}`);
  console.log(`  Eligible for harvest:                ${stats.eligible}`);
  console.log(`  ${WRITE ? 'Harvested' : 'Would harvest'}:                   ${stats.harvested}\n`);

  console.log('  ID coverage (eligible profiles):');
  for (const [k, v] of Object.entries(idBreakdown)) {
    console.log(`    ${k.padEnd(10)} ${v}`);
  }

  if (samples.length) {
    console.log('\n  Sample emissions:');
    for (const s of samples) {
      console.log(`\n    ${s.path}  (${s.title})`);
      for (const line of s.lines) console.log(`      ${line}`);
    }
  }

  if (!WRITE) {
    console.log('\n  ⚠ DRY RUN — no files changed. Re-run with --write to apply.\n');
  } else {
    console.log(`\n  ✓ Next: node scripts/reclassify-readiness.cjs --diagnose --write\n`);
  }
}

main();
