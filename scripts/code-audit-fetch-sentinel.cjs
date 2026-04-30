#!/usr/bin/env node
/**
 * code-audit-fetch-sentinel.cjs — pre-commit guard for ADR-0030 §8.
 *
 * Blocks commits where:
 *   1. A profile body cites a URL that first appears in
 *      data/code-audit-fetches.jsonl (forces editorial review of any
 *      URL Code Claude introduced)
 *   2. A staged file references an audit-fetch ID (caf_*) that doesn't
 *      exist in the log
 *   3. A Code Claude fetch attempted to a domain not in §1 allowlist
 *      (manifests as `status: refused-disallowed-domain` log entries
 *      that shouldn't be there in normal operation, but appear in a
 *      git diff if someone is testing against forbidden domains)
 *
 * Exits 0 if clean, 1 if any guard tripped.
 *
 * Usage (from .husky/pre-commit):
 *   node scripts/code-audit-fetch-sentinel.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FETCH_LOG = path.join(ROOT, 'data', 'code-audit-fetches.jsonl');

function loadFetchLog() {
  if (!fs.existsSync(FETCH_LOG)) return [];
  const out = [];
  for (const line of fs.readFileSync(FETCH_LOG, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip */ }
  }
  return out;
}

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function fileContent(p) {
  if (!fs.existsSync(p)) return '';
  try { return fs.readFileSync(p, 'utf-8'); } catch { return ''; }
}

function fail(msgLines) {
  console.error('');
  console.error('[x] code-audit-fetch-sentinel blocked the commit');
  console.error('');
  for (const line of msgLines) console.error('    ' + line);
  console.error('');
  console.error('    See content/Decisions/0030-code-audit-external-access-carveout.md §8.');
  console.error('    Emergency bypass: SKIP_HOOKS=1 git commit ...');
  process.exit(1);
}

const log = loadFetchLog();
const knownFetchIds = new Set(log.filter((r) => r.id).map((r) => r.id));
const knownFetchedUrls = new Set(log.filter((r) => r.url).map((r) => r.url));

const staged = stagedFiles();

// Guard 1: profile body cites a URL that first appears in the audit log
const PROFILE_PATH_RE = /^content\/(Politicians|Donors & Power Networks|Think Tanks|Media|Policies|Events)\//;
const profileFiles = staged.filter((f) => PROFILE_PATH_RE.test(f) && f.endsWith('.md'));
const URL_RE = /https?:\/\/[^\s)\]"'<>]+/g;
const violations1 = [];
for (const f of profileFiles) {
  const content = fileContent(path.join(ROOT, f));
  const urls = content.match(URL_RE) || [];
  for (const u of urls) {
    if (knownFetchedUrls.has(u)) {
      violations1.push({ file: f, url: u });
    }
  }
}
if (violations1.length > 0) {
  const lines = [
    'Profile body cites URL(s) that first appear in data/code-audit-fetches.jsonl.',
    'Per ADR-0030 §6: Code Claude fetched URLs must NOT be cited in profile bodies',
    'without going through editorial review (Rule 13 still binds editorial citations).',
    '',
    'Violations:',
  ];
  for (const v of violations1.slice(0, 5)) {
    lines.push(`  ${v.file}`);
    lines.push(`    ${v.url}`);
  }
  if (violations1.length > 5) lines.push(`  ... and ${violations1.length - 5} more`);
  lines.push('');
  lines.push('Fix: remove the URL from the profile body, or have David verify + add it manually.');
  fail(lines);
}

// Guard 2: staged file references caf_<id> that doesn't exist in the log
const violations2 = [];
const CAF_RE = /\bcaf_[0-9a-f]{8,16}\b/g;
for (const f of staged) {
  const content = fileContent(path.join(ROOT, f));
  const refs = content.match(CAF_RE) || [];
  for (const r of refs) {
    if (!knownFetchIds.has(r)) {
      violations2.push({ file: f, ref: r });
    }
  }
}
if (violations2.length > 0) {
  const lines = [
    'File(s) reference caf_<id> audit-fetch identifiers that do not exist',
    'in data/code-audit-fetches.jsonl. Either the log was tampered with,',
    'or a copy-pasted ID is wrong.',
    '',
    'Violations:',
  ];
  for (const v of violations2.slice(0, 5)) lines.push(`  ${v.file}: ${v.ref}`);
  fail(lines);
}

// Guard 3: any `refused-disallowed-domain` entry in the staged diff of
// the fetch log itself. Indicates someone is testing against forbidden
// domains and the log is recording it. Blocks commit; the test code
// should be removed before commit.
if (staged.includes('data/code-audit-fetches.jsonl')) {
  // Check the staged version for refused entries
  let stagedLogContent = '';
  try {
    stagedLogContent = execSync('git diff --cached -- data/code-audit-fetches.jsonl', { encoding: 'utf-8' });
  } catch { /* ignore */ }
  const refusedRe = /"status":"refused-disallowed-domain"/g;
  const refusedCount = (stagedLogContent.match(refusedRe) || []).length;
  if (refusedCount > 0) {
    fail([
      `Staged diff of data/code-audit-fetches.jsonl contains ${refusedCount} entries`,
      'with status="refused-disallowed-domain". This usually means a script',
      'was tested against a forbidden domain. Remove those log lines',
      '(they are append-only audit records — should be very rare in practice).',
    ]);
  }
}

// All clear
process.exit(0);
