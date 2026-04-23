#!/usr/bin/env node
/**
 * api-pipeline-sentinel.cjs
 *
 * Enforces CLAUDE.md Rule 3 (CSV-first for bulk data). Blocks commits that
 * ADD new API-pipeline scripts to scripts/ root unless explicitly justified.
 *
 * The rule: bulk data comes from government CSV downloads in data/bulk/.
 * Three API pipelines remain active (Congress.gov, GovTrack, RSS digests) +
 * STOCK Act scraping. Every other API pipeline has been retired. Adding a
 * new one without justification drifts the architecture toward the old
 * "write a new API script per data source" pattern.
 *
 * What this blocks: NEW .cjs files in scripts/ root (status 'A' in git diff)
 * that make external HTTP calls, unless:
 *   1. Filename matches an approved pattern (ingest-*-bulk.cjs, *-pipeline.cjs),
 *   2. OR file header has `// @api-pipeline-allowed: <reason or ADR-NNNN>`.
 *
 * Modifications to existing files are NOT blocked (grandfather clause).
 *
 * Runs in pre-commit. Cheap — only fires when new .cjs files are staged.
 *
 * Promoted from CLAUDE.md Rule 3 per ADR-0021 Phase 2.
 *
 * Exit codes:
 *   0 = no new API pipelines detected, or all justified
 *   1 = new API pipeline added without justification
 */

const { execSync } = require('child_process');
const fs = require('fs');

// ─── Patterns ───────────────────────────────────────────────────────

// File header marker that explicitly waives the check.
const ALLOWED_MARKER = /\/\/\s*@api-pipeline-allowed:/;

// Filename patterns that are approved by convention.
// (Bulk CSV ingest + the three approved pipelines + scrapers.)
const APPROVED_FILENAME_PATTERNS = [
  /\/ingest-[a-z0-9-]+-bulk\.cjs$/,       // bulk CSV ingest — blessed
  /\/[a-z0-9-]+-pipeline\.cjs$/,           // pipeline-naming (Congress, GovTrack, RSS, financial-disclosures)
  /\/source-hunter-[a-z0-9-]+\.cjs$/,      // source-hunter family
  /\/ingest-congress-[a-z0-9-]+\.cjs$/,    // Congress.gov family (ADR-approved)
  /\/ingest-voteview-[a-z0-9-]+\.cjs$/,    // GovTrack family
  /\/ingest-unitedstates-[a-z0-9-]+\.cjs$/,
  /\/ingest-voting-record-[a-z0-9-]+\.cjs$/,
  /\/ingest-plaw-[a-z0-9-]+\.cjs$/,
];

// HTTP-call detector. Triggers if at least ONE match in the file body.
const HTTP_PATTERNS = [
  /\bfetch\s*\(\s*['"`]https?:/,
  /\baxios\.(get|post|put|delete|patch)\s*\(/,
  /require\s*\(\s*['"`]node-fetch['"`]\s*\)/,
  /new\s+URL\s*\(\s*['"`]https?:/,
  /https\.get\s*\(|https\.request\s*\(/,
];

// ─── Find newly-added .cjs files in scripts/ root ───────────────────

function newScriptsInRoot() {
  try {
    // --diff-filter=A → only Added files (not Modified, Copied, etc.)
    const out = execSync('git diff --cached --name-only --diff-filter=A', { encoding: 'utf-8' });
    return out.split('\n')
      .map(f => f.trim())
      .filter(f => /^scripts\/[^/]+\.cjs$/.test(f));  // scripts/ root only
  } catch {
    return [];
  }
}

// ─── Check one file ────────────────────────────────────────────────

function checkFile(filePath) {
  let body;
  try { body = fs.readFileSync(filePath, 'utf-8'); } catch { return null; }

  // Explicit allow marker → skip
  if (ALLOWED_MARKER.test(body)) return null;

  // Approved filename → skip
  const normalized = '/' + filePath.replace(/\\/g, '/');
  if (APPROVED_FILENAME_PATTERNS.some(p => p.test(normalized))) return null;

  // Check for HTTP call patterns
  for (const pat of HTTP_PATTERNS) {
    if (pat.test(body)) {
      return {
        file: filePath,
        reason: `file makes external HTTP calls (matched ${pat})`,
      };
    }
  }
  return null;
}

// ─── Main ──────────────────────────────────────────────────────────

(function main() {
  const added = newScriptsInRoot();
  if (added.length === 0) process.exit(0);

  const violations = [];
  for (const f of added) {
    const v = checkFile(f);
    if (v) violations.push(v);
  }

  if (violations.length === 0) process.exit(0);

  console.error('');
  console.error('[x] api-pipeline-sentinel: unjustified new API pipeline');
  console.error('');
  console.error('    CLAUDE.md Rule 3: CSV-first for bulk data. Three API pipelines');
  console.error('    are approved (Congress.gov, GovTrack, RSS) + STOCK Act scraping.');
  console.error('    Adding a new API-calling script to scripts/ root requires');
  console.error('    explicit justification.');
  console.error('');
  for (const v of violations) {
    console.error(`    ${v.file}`);
    console.error(`      ${v.reason}`);
    console.error('');
  }
  console.error('    To proceed, either:');
  console.error('');
  console.error('    (a) Rename to match an approved pattern:');
  console.error('        ingest-*-bulk.cjs, *-pipeline.cjs, source-hunter-*.cjs');
  console.error('');
  console.error('    (b) Add a header comment with justification:');
  console.error('        // @api-pipeline-allowed: ADR-NNNN — <one-line reason>');
  console.error('');
  console.error('    (c) Place the script in a subdirectory (not scripts/ root) if');
  console.error('        it is a one-off or migration.');
  console.error('');
  console.error('    Emergency bypass: SKIP_HOOKS=1 git commit ...');
  process.exit(1);
})();
