#!/usr/bin/env node
/**
 * url-editor-sentinel.cjs
 *
 * Enforces CLAUDE.md Rule 13 (URL verification is Editor-only). Blocks
 * commits that add, remove, or modify URLs in `content-readiness: verified`
 * or `content-readiness: data-complete` profile files unless the commit
 * message carries an explicit waiver token.
 *
 * URL work on published-tier profiles is David's lane. Claude cannot run
 * url-fixer, substitute URLs, or "repair" dead links. The rule exists
 * because a wrong URL in a verified profile is a legal-risk bug that
 * only editorial sign-off can resolve.
 *
 * Runs as a commit-msg hook so it can read the (nearly-final) commit
 * message file and check for waiver tokens.
 *
 * Waiver tokens (any ONE of these in the commit message allows the commit):
 *   [url-editor]   — David is doing URL editorial work
 *   [url-verified] — URL(s) verified against source as part of this commit
 *   [pipeline]     — auto-generated URLs from an approved pipeline run
 *
 * Promoted from CLAUDE.md Rule 13 per ADR-0021 Phase 2.
 *
 * Usage (called by .husky/commit-msg):
 *   node scripts/url-editor-sentinel.cjs "$1"    # $1 = path to .git/COMMIT_EDITMSG
 *
 * Exit codes:
 *   0 = no URL changes in protected profiles, or waiver present
 *   1 = URL changes in protected profiles, no waiver — blocked
 */

const { execSync } = require('child_process');
const fs = require('fs');

const MSG_FILE = process.argv[2];
if (!MSG_FILE) {
  // No message file argument — run non-blocking (e.g., manual invocation)
  process.exit(0);
}

// ─── Waiver tokens ─────────────────────────────────────────────────

const WAIVER_TOKENS = ['[url-editor]', '[url-verified]', '[pipeline]'];

function hasWaiver() {
  let msg;
  try { msg = fs.readFileSync(MSG_FILE, 'utf-8'); } catch { return false; }
  return WAIVER_TOKENS.some(t => msg.includes(t));
}

// ─── URL pattern ───────────────────────────────────────────────────

// Matches http:// or https:// followed by non-whitespace/non-closing-bracket chars
const URL_RE = /https?:\/\/[^\s)\]>]+/;

// ─── Find profiles with protected tier ─────────────────────────────

function isProtectedProfile(filePath) {
  // Only .md files in content/ can be profiles
  if (!filePath.startsWith('content/') || !filePath.endsWith('.md')) return false;
  let head;
  try { head = fs.readFileSync(filePath, 'utf-8').slice(0, 1500); } catch { return false; }
  // Frontmatter check
  return /^content-readiness:\s*["']?(verified|data-complete)["']?\s*$/m.test(head);
}

// ─── Get staged diff hunks ─────────────────────────────────────────

function stagedDiffPerFile() {
  let out;
  try {
    out = execSync('git diff --cached --unified=0', { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  } catch {
    return {};
  }
  const perFile = {};
  let currentFile = null;
  for (const line of out.split('\n')) {
    if (line.startsWith('diff --git ')) {
      // Extract the b/ path (destination)
      const m = line.match(/diff --git a\/(.+?) b\/(.+)$/);
      currentFile = m ? m[2] : null;
      if (currentFile) perFile[currentFile] = [];
      continue;
    }
    if (!currentFile) continue;
    // Actual diff lines begin with + or - (but NOT +++ or --- which are headers)
    if (/^[+-]/.test(line) && !line.startsWith('+++') && !line.startsWith('---')) {
      perFile[currentFile].push(line);
    }
  }
  return perFile;
}

// ─── Main ──────────────────────────────────────────────────────────

(function main() {
  const diffs = stagedDiffPerFile();
  const violations = [];

  for (const [file, lines] of Object.entries(diffs)) {
    if (!isProtectedProfile(file)) continue;
    const urlLines = lines.filter(l => URL_RE.test(l));
    if (urlLines.length > 0) {
      violations.push({ file, count: urlLines.length, sample: urlLines.slice(0, 3) });
    }
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  if (hasWaiver()) {
    // Waiver present — allow with a quiet confirmation line
    console.log(`[url-editor-sentinel] ${violations.length} protected profile(s) with URL changes — waiver token found, allowing.`);
    process.exit(0);
  }

  // No waiver, URL changes present → block
  console.error('');
  console.error('[x] url-editor-sentinel: URL changes in protected profile(s)');
  console.error('');
  console.error('    CLAUDE.md Rule 13: URL verification is Editor-only. URL changes');
  console.error('    to profiles at content-readiness: verified or data-complete');
  console.error('    require explicit editorial sign-off.');
  console.error('');
  for (const v of violations) {
    console.error(`    ${v.file} (${v.count} URL line${v.count === 1 ? '' : 's'} changed)`);
    for (const l of v.sample) {
      const trimmed = l.length > 100 ? l.slice(0, 100) + '…' : l;
      console.error(`      ${trimmed}`);
    }
    console.error('');
  }
  console.error('    To proceed, include ONE of these tokens in the commit message:');
  console.error('');
  console.error('      [url-editor]    — David doing URL editorial work');
  console.error('      [url-verified]  — URL(s) verified against source');
  console.error('      [pipeline]      — auto-generated URLs from approved pipeline');
  console.error('');
  console.error('    Emergency bypass: SKIP_HOOKS=1 git commit ...');
  process.exit(1);
})();
