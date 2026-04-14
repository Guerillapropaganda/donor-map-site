#!/usr/bin/env node
/**
 * merge-duplicate-entities.cjs
 *
 * Resolves 8 same-entity duplicate profiles identified in the 2026-04-14
 * relationship engine audit.
 *
 * Strategy:
 *
 *   A. Think tanks + firms (6 cases): one profile is the "canonical"
 *      entity profile (Think Tank / Lobbying Firm / Pharma sector folder),
 *      the other is a parallel donor-taxonomy profile (Dark Money /
 *      Mega-Donors). Both are substantial but the canonical is larger.
 *      → Merge pipeline-sourced frontmatter from loser into canonical
 *        (EIN, nonprofit status, SEC filings, total-revenue, etc.)
 *      → Add loser's title as an alias on canonical
 *      → Delete loser file
 *
 *   B. People dupes (David Sacks, JB Pritzker): the donor profile is
 *      LARGER than the politician profile and contains unique editorial
 *      content that would be lost on deletion. Merging bodies is
 *      editorial work for Research Claude.
 *      → Rename the donor profile's title to "{Name} (Donor Network)"
 *        to remove the title collision without losing content
 *      → Both files remain; the title index now has distinct entries
 *
 * Usage:
 *   node scripts/merge-duplicate-entities.cjs            # live
 *   node scripts/merge-duplicate-entities.cjs --dry-run  # preview
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const DRY_RUN = process.argv.includes('--dry-run');
const REPO_ROOT = path.resolve(__dirname, '..');

// Fields to copy FROM loser INTO canonical, but only when canonical
// doesn't already have them. Pipeline-sourced data fields.
const MERGE_FIELDS = [
  'ein', 'nonprofit-status', 'cik', 'lei', 'duns',
  'total-revenue', 'total-assets', 'naics-code',
  'sec-filings', 'sec-form-types', 'sec-ciks',
  'federal-contracts', 'federal-contract-total',
  'lobbying-spend', 'lobbying-filings',
  'last-enriched',
];

// Case A: merge + delete
const MERGE_CASES = [
  {
    name: 'Heritage Foundation',
    canonical: 'content/Think Tanks & Policy Infrastructure/Conservative/Heritage Foundation.md',
    loser: 'content/Donors & Power Networks/Dark Money/Heritage Foundation.md',
  },
  {
    name: 'American Enterprise Institute',
    canonical: 'content/Think Tanks & Policy Infrastructure/Conservative/American Enterprise Institute.md',
    loser: 'content/Donors & Power Networks/Dark Money/American Enterprise Institute.md',
  },
  {
    name: 'Center for American Progress',
    canonical: 'content/Think Tanks & Policy Infrastructure/Liberal/Center for American Progress.md',
    loser: 'content/Donors & Power Networks/Dark Money/Center for American Progress.md',
  },
  {
    name: 'Federalist Society',
    canonical: 'content/Think Tanks & Policy Infrastructure/Conservative/Federalist Society.md',
    loser: 'content/Donors & Power Networks/Dark Money/Federalist Society.md',
  },
  {
    name: 'PhRMA',
    canonical: 'content/Donors & Power Networks/Pharma & Healthcare/PhRMA.md',
    loser: 'content/Donors & Power Networks/Mega-Donors/PhRMA - Pharmaceutical Research and Manufacturers of America.md',
    extraAliases: ['PhRMA - Pharmaceutical Research and Manufacturers of America'],
  },
  {
    name: 'Ballard Partners',
    canonical: 'content/Lobbying Firms & K Street/Ballard Partners.md',
    loser: 'content/Donors & Power Networks/Dark Money/Ballard Partners.md',
  },
];

// Case B: rename only
const RENAME_CASES = [
  {
    name: 'David Sacks',
    file: 'content/Donors & Power Networks/Mega-Donors/David Sacks.md',
    newTitle: 'David Sacks (Donor Network)',
  },
  {
    name: 'JB Pritzker',
    file: 'content/Donors & Power Networks/Mega-Donors/JB Pritzker.md',
    newTitle: 'JB Pritzker (Donor Network)',
  },
];

function mergeAndDelete({ name, canonical, loser, extraAliases = [] }) {
  const canonicalPath = path.join(REPO_ROOT, canonical);
  const loserPath = path.join(REPO_ROOT, loser);
  if (!fs.existsSync(canonicalPath)) {
    console.log(`  SKIP ${name}: canonical missing`);
    return;
  }
  if (!fs.existsSync(loserPath)) {
    console.log(`  SKIP ${name}: loser already gone`);
    return;
  }

  const canonicalFile = matter(fs.readFileSync(canonicalPath, 'utf-8'));
  const loserFile = matter(fs.readFileSync(loserPath, 'utf-8'));

  const mergedFields = [];
  for (const field of MERGE_FIELDS) {
    if (
      (canonicalFile.data[field] === undefined || canonicalFile.data[field] === null) &&
      loserFile.data[field] !== undefined &&
      loserFile.data[field] !== null
    ) {
      canonicalFile.data[field] = loserFile.data[field];
      mergedFields.push(field);
    }
  }

  // Add the loser's title + any extra aliases as aliases on canonical
  const loserTitle = typeof loserFile.data.title === 'string' ? loserFile.data.title.trim() : '';
  const newAliases = new Set();
  if (loserTitle && loserTitle !== canonicalFile.data.title) newAliases.add(loserTitle);
  for (const a of extraAliases) newAliases.add(a);

  const existing = Array.isArray(canonicalFile.data.aliases)
    ? canonicalFile.data.aliases.map(String)
    : typeof canonicalFile.data.aliases === 'string'
      ? [canonicalFile.data.aliases]
      : [];
  const merged = [...new Set([...existing, ...newAliases])];
  const aliasChanged = merged.length !== existing.length;
  if (aliasChanged) canonicalFile.data.aliases = merged;

  canonicalFile.data['last-updated'] = new Date().toISOString().split('T')[0];

  if (!DRY_RUN) {
    fs.writeFileSync(canonicalPath, matter.stringify(canonicalFile.content, canonicalFile.data), 'utf-8');
    fs.unlinkSync(loserPath);
  }
  console.log(`  MERGED ${name}: +${mergedFields.length} fields (${mergedFields.join(', ') || 'none'}), +${newAliases.size} aliases, deleted ${loser}`);
}

function renameDuplicate({ name, file, newTitle }) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP ${name}: file missing`);
    return;
  }
  const parsed = matter(fs.readFileSync(fullPath, 'utf-8'));
  const oldTitle = parsed.data.title;
  parsed.data.title = newTitle;
  parsed.data['last-updated'] = new Date().toISOString().split('T')[0];
  // Preserve original title as an alias so FEC / pipeline writes still find it
  const existing = Array.isArray(parsed.data.aliases)
    ? parsed.data.aliases.map(String)
    : typeof parsed.data.aliases === 'string'
      ? [parsed.data.aliases]
      : [];
  if (oldTitle && !existing.includes(oldTitle)) existing.push(oldTitle);
  parsed.data.aliases = existing;

  if (!DRY_RUN) {
    fs.writeFileSync(fullPath, matter.stringify(parsed.content, parsed.data), 'utf-8');
  }
  console.log(`  RENAMED ${name}: "${oldTitle}" → "${newTitle}"`);
}

console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);
console.log('=== Case A: merge + delete ===');
for (const c of MERGE_CASES) mergeAndDelete(c);
console.log('\n=== Case B: rename to disambiguate ===');
for (const c of RENAME_CASES) renameDuplicate(c);
