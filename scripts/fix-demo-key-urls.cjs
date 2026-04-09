#!/usr/bin/env node
/**
 * fix-demo-key-urls.cjs
 * Converts FEC API URLs (api.open.fec.gov with DEMO_KEY) to human-readable fec.gov website URLs.
 *
 * Usage:
 *   node scripts/fix-demo-key-urls.cjs          # dry-run, report only
 *   node scripts/fix-demo-key-urls.cjs --write   # apply changes
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const WRITE_MODE = process.argv.includes('--write');

// Directories to skip
const SKIP_DIRS = [
  path.join(CONTENT_DIR, 'Vault Maintenance', 'Archive'),
];

function shouldSkip(filePath) {
  return SKIP_DIRS.some(skip => filePath.startsWith(skip));
}

function getAllMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      results.push(...getAllMdFiles(fullPath));
    } else if (entry.name.endsWith('.md') && !shouldSkip(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Params to strip from FEC URLs (API-specific, not meaningful for website)
const STRIP_PARAMS = new Set([
  'api_key', 'per_page', 'sort', 'page', 'sort_hide_null',
  'sort_null_only', 'sort_nulls_last', 'is_active_candidate',
]);

// Params to keep (meaningful for searches)
const KEEP_PARAMS = new Set([
  'contributor_name', 'committee_id', 'candidate_id', 'q',
  'contributor_state', 'contributor_city', 'contributor_zip',
  'contributor_employer', 'contributor_occupation',
  'two_year_transaction_period', 'min_date', 'max_date',
  'cycle', 'office', 'state', 'party', 'district',
  'data_type',
]);

/**
 * Convert an api.open.fec.gov URL to a www.fec.gov website URL.
 */
function convertApiUrl(apiUrl) {
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    return null; // not a valid URL
  }

  if (parsed.hostname !== 'api.open.fec.gov') return null;

  const apiPath = parsed.pathname; // e.g. /v1/schedules/schedule_a/

  // Build filtered query params
  const keptParams = new URLSearchParams();
  for (const [key, val] of parsed.searchParams) {
    if (!STRIP_PARAMS.has(key)) {
      keptParams.append(key, val);
    }
  }

  let webPath;

  // Pattern: /v1/schedules/schedule_a/ → /data/receipts/
  if (apiPath.match(/\/v1\/schedules\/schedule_a\/?/)) {
    webPath = '/data/receipts/';
  }
  // Pattern: /v1/schedules/schedule_b/ → /data/disbursements/
  else if (apiPath.match(/\/v1\/schedules\/schedule_b\/?/)) {
    webPath = '/data/disbursements/';
  }
  // Pattern: /v1/committee/COMMITTEE_ID/totals/ → /data/committee/COMMITTEE_ID/
  else if (apiPath.match(/\/v1\/committee\/([^/]+)\/totals\/?/)) {
    const match = apiPath.match(/\/v1\/committee\/([^/]+)\/totals\/?/);
    webPath = `/data/committee/${match[1]}/`;
  }
  // Pattern: /v1/committee/COMMITTEE_ID/ → /data/committee/COMMITTEE_ID/
  else if (apiPath.match(/\/v1\/committee\/([^/]+)\/?$/)) {
    const match = apiPath.match(/\/v1\/committee\/([^/]+)\/?$/);
    webPath = `/data/committee/${match[1]}/`;
  }
  // Pattern: /v1/candidate/CANDIDATE_ID/ → /data/candidate/CANDIDATE_ID/
  else if (apiPath.match(/\/v1\/candidate\/([^/]+)\/?$/)) {
    const match = apiPath.match(/\/v1\/candidate\/([^/]+)\/?$/);
    webPath = `/data/candidate/${match[1]}/`;
  }
  // Pattern: /v1/candidates/search/ → /data/candidates/
  else if (apiPath.match(/\/v1\/candidates\/search\/?/)) {
    webPath = '/data/candidates/';
  }
  // Pattern: /v1/candidates/ → /data/candidates/
  else if (apiPath.match(/\/v1\/candidates\/?/)) {
    webPath = '/data/candidates/';
  }
  // Fallback: unknown API path
  else {
    // Strip api_key but keep structure
    webPath = apiPath.replace('/v1/', '/data/');
  }

  const qs = keptParams.toString();
  return `https://www.fec.gov${webPath}${qs ? '?' + qs : ''}`;
}

/**
 * Process a single file. Returns array of changes made.
 */
function processFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf-8');
  const changes = [];

  // Match URLs containing api.open.fec.gov or DEMO_KEY
  // They appear inside markdown links: (URL) or standalone
  const urlRegex = /https?:\/\/api\.open\.fec\.gov[^\s)>\]"']*/g;

  let result = original;
  let match;

  // Collect all matches first
  const matches = [];
  while ((match = urlRegex.exec(original)) !== null) {
    matches.push({ index: match.index, url: match[0] });
  }

  // Replace in reverse order to preserve indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { url } = matches[i];
    const newUrl = convertApiUrl(url);
    if (newUrl && newUrl !== url) {
      result = result.split(url).join(newUrl);
      changes.push({ old: url, new: newUrl });
    }
  }

  // Also catch any remaining DEMO_KEY in non-api.open.fec.gov URLs (shouldn't exist, but just in case)
  // Already handled above since all DEMO_KEY URLs use api.open.fec.gov

  if (changes.length > 0 && WRITE_MODE) {
    fs.writeFileSync(filePath, result, 'utf-8');
  }

  return changes;
}

// Also update link labels from "FEC API:" to "FEC:" since they're now website URLs
function fixLabels(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const changes = [];

  // Match markdown links like [FEC API: ...](https://www.fec.gov/...)
  const labelRegex = /\[FEC API: ([^\]]+)\]\((https:\/\/www\.fec\.gov\/[^)]+)\)/g;
  let result = content;
  let match;

  while ((match = labelRegex.exec(content)) !== null) {
    const oldLink = match[0];
    const newLink = `[FEC: ${match[1]}](${match[2]})`;
    changes.push({ old: oldLink, new: newLink });
  }

  if (changes.length > 0) {
    for (const c of changes) {
      result = result.split(c.old).join(c.new);
    }
    if (WRITE_MODE) {
      fs.writeFileSync(filePath, result, 'utf-8');
    }
  }

  return changes;
}

// Main
console.log(`FEC DEMO_KEY URL Fixer — ${WRITE_MODE ? 'WRITE MODE' : 'DRY RUN'}`);
console.log('='.repeat(60));

const files = getAllMdFiles(CONTENT_DIR);
let totalUrlChanges = 0;
let totalLabelChanges = 0;
let filesModified = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('api.open.fec.gov') && !content.includes('DEMO_KEY')) continue;

  const relPath = path.relative(CONTENT_DIR, file);
  const urlChanges = processFile(file);

  // Now fix labels (only after URLs have been converted)
  let labelChanges = [];
  if (urlChanges.length > 0) {
    labelChanges = fixLabels(file);
  }

  if (urlChanges.length > 0 || labelChanges.length > 0) {
    filesModified++;
    console.log(`\n${relPath}:`);

    for (const c of urlChanges) {
      totalUrlChanges++;
      console.log(`  URL: ${c.old.substring(0, 80)}...`);
      console.log(`    → ${c.new}`);
    }

    for (const c of labelChanges) {
      totalLabelChanges++;
      console.log(`  LABEL: ${c.old.substring(0, 80)}...`);
      console.log(`    → ${c.new.substring(0, 80)}...`);
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log(`Files modified: ${filesModified}`);
console.log(`URL conversions: ${totalUrlChanges}`);
console.log(`Label fixes: ${totalLabelChanges}`);
console.log(`Mode: ${WRITE_MODE ? 'CHANGES WRITTEN' : 'DRY RUN (use --write to apply)'}`);
