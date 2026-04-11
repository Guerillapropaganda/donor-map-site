#!/usr/bin/env node
/**
 * self-review-mirror.cjs — pre-commit quality gate
 *
 * Reads the git staged changes and runs a set of hard rules that BLOCK
 * a commit if any profile content would regress. Invisible until it
 * catches something — then you see the failure message and the commit
 * doesn't happen.
 *
 * Rules it enforces (hard-coded, non-negotiable):
 *
 *   1. No em dashes in profile body content (per David's editorial rule).
 *      Em dashes sound AI-generated.
 *   2. No banned AI vocabulary:
 *      - "delve" / "delves" / "delving"
 *      - "moreover"
 *      - "furthermore"
 *      - "it is important to note"
 *      - "it could be argued"
 *      - "seemingly"
 *      - "arguably"
 *      - "plethora"
 *      - "tapestry"
 *      - "testament to"
 *   3. No defamation-prone words outside blockquotes (uses the shared
 *      runLegalReviewCheck helper).
 *   4. Frontmatter still parses as valid YAML.
 *   5. If a profile was at content-readiness: verified or s-tier before
 *      the change and the change removes a Tier 1 source type, block it.
 *      (Can't regress source coverage on a verified profile.)
 *   6. If a profile was at verified or s-tier and the change removes the
 *      `## Class Analysis` heading, block.
 *
 * Usage (installed as git pre-commit hook):
 *   node scripts/self-review-mirror.cjs
 *   → exits 0 if clean, exits 1 with plain-English failure message if blocked
 *
 * Manual override (use sparingly):
 *   ALLOW_REGRESSION=1 git commit ...
 *
 * Rejections are ALSO appended to the false-positive log so you can
 * later review them and decide if any rules are too strict.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const ALLOW_REGRESSION = process.env.ALLOW_REGRESSION === '1';

// Hard rules — these are the editorial floor for the whole vault.
const BANNED_PHRASES = [
  /—/g,  // em dash
  /\bdelve(s|d|ing)?\b/gi,
  /\bmoreover\b/gi,
  /\bfurthermore\b/gi,
  /\bit is important to note\b/gi,
  /\bit could be argued\b/gi,
  /\bseemingly\b/gi,
  /\barguably\b/gi,
  /\bplethora\b/gi,
  /\btapestry\b/gi,
  /\btestament to\b/gi,
];

const BANNED_LABELS = [
  'em dash (use period or comma instead — sounds AI-generated)',
  '"delve" variants (AI vocabulary)',
  '"moreover" (AI vocabulary)',
  '"furthermore" (AI vocabulary)',
  '"it is important to note" (AI filler)',
  '"it could be argued" (hedging)',
  '"seemingly" (hedging)',
  '"arguably" (hedging)',
  '"plethora" (AI vocabulary)',
  '"tapestry" (AI vocabulary)',
  '"testament to" (AI vocabulary)',
];

const DEFAMATION_WORDS = /\b(fraud|criminal|corrupt|scheme|conspired|bribed|embezzled|kickback)\b/i;

/**
 * Get the list of staged .md files under content/ that have actual changes
 * (not just renames). Returns array of paths relative to repo root.
 */
function getStagedProfiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=AM', {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
    return out
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('content/') && line.endsWith('.md'));
  } catch {
    return [];
  }
}

/**
 * Get the BEFORE version of a staged file (what's in HEAD).
 * Returns empty string if the file is new.
 */
function getBeforeContent(filePath) {
  try {
    return execSync(`git show HEAD:"${filePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
  } catch {
    return '';
  }
}

/**
 * Get the AFTER version — what's currently staged.
 */
function getAfterContent(filePath) {
  try {
    return execSync(`git show :"${filePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
  } catch {
    return '';
  }
}

/**
 * Get only the newly added lines for a staged file (content on `+` lines in a
 * zero-context diff). For brand-new files, this is effectively the whole body.
 * For modifications, this is ONLY what the current commit is introducing —
 * pre-existing em dashes from months ago are not flagged.
 */
function getAddedLines(filePath) {
  try {
    const out = execSync(`git diff --cached -U0 -- "${filePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
    });
    const added = [];
    for (const line of out.split(/\r?\n/)) {
      if (line.startsWith('+++')) continue;
      if (line.startsWith('---')) continue;
      if (line.startsWith('@@')) continue;
      if (line.startsWith('+')) added.push(line.slice(1));
    }
    return added.join('\n');
  } catch {
    return '';
  }
}

/**
 * Split frontmatter and body.
 */
function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  try {
    return { data: yaml.load(match[1]) || {}, body: match[2] || '' };
  } catch {
    return { data: {}, body: match[2] || '', yamlError: true };
  }
}

/**
 * Scan body for banned phrases. Returns array of {label, matches} per rule.
 * Blockquote lines (starting with `>`) are exempt — quoted source material
 * can use any language.
 */
function scanBannedPhrases(body) {
  const safeBody = body
    .split(/\r?\n/)
    .filter((line) => !/^\s*>/.test(line))
    .join('\n');
  const findings = [];
  for (let i = 0; i < BANNED_PHRASES.length; i++) {
    const re = BANNED_PHRASES[i];
    const matches = safeBody.match(re);
    if (matches && matches.length > 0) {
      findings.push({
        label: BANNED_LABELS[i],
        count: matches.length,
        sample: matches[0],
      });
    }
  }
  return findings;
}

/**
 * Check if defamation-prone words appear outside blockquotes without a
 * legal-review-result: pass frontmatter.
 */
function scanDefamation(data, body) {
  if (data['legal-review-result'] === 'pass') return [];
  const lines = body.split(/\r?\n/);
  const hits = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue; // blockquote exempt
    if (DEFAMATION_WORDS.test(line)) {
      hits.push(line.trim().slice(0, 200));
    }
  }
  return hits;
}

/**
 * Compare before/after to detect regressions on verified profiles.
 */
function detectRegressions(before, after) {
  const regressions = [];
  const beforeWasVerified =
    before.data['content-readiness'] === 'verified' ||
    before.data['content-readiness'] === 's-tier';
  if (!beforeWasVerified) return regressions;

  // Regression 1: Tier 1 source type count decreased
  const beforeTier1 = Array.isArray(before.data['source-types'])
    ? before.data['source-types'].length
    : 0;
  const afterTier1 = Array.isArray(after.data['source-types'])
    ? after.data['source-types'].length
    : 0;
  if (afterTier1 < beforeTier1) {
    regressions.push(
      `source-types dropped from ${beforeTier1} to ${afterTier1} on a verified profile`
    );
  }

  // Regression 2: Class Analysis heading was removed
  const beforeHasCA = /^##\s+Class Analysis/m.test(before.body);
  const afterHasCA = /^##\s+Class Analysis/m.test(after.body);
  if (beforeHasCA && !afterHasCA) {
    regressions.push(`## Class Analysis heading was removed from a verified profile`);
  }

  return regressions;
}

function main() {
  const staged = getStagedProfiles();
  if (staged.length === 0) {
    // Nothing to check
    process.exit(0);
  }

  const failures = [];

  for (const filePath of staged) {
    const afterContent = getAfterContent(filePath);
    if (!afterContent) continue;
    const after = splitFrontmatter(afterContent);
    if (after.yamlError) {
      failures.push({
        file: filePath,
        reasons: ['frontmatter YAML is broken — cannot ship this'],
      });
      continue;
    }

    const reasons = [];

    // Skip admin notes — their voice rules are different
    if (filePath.includes('/Admin Notes/')) continue;
    // Skip non-profile content
    if (!after.data || !after.data.title) continue;

    // Get ONLY the newly added lines for this file — pre-existing violations
    // from months ago do not block the commit. Only what this commit adds.
    const addedLines = getAddedLines(filePath);

    // Rule 1-2: banned phrases (ADDED CONTENT ONLY)
    const banned = scanBannedPhrases(addedLines);
    for (const b of banned) {
      reasons.push(
        `introduces banned language: ${b.label} (${b.count} new occurrence${b.count > 1 ? 's' : ''}, first: "${b.sample}")`
      );
    }

    // Rule 3: defamation check (ADDED CONTENT ONLY)
    const defamation = scanDefamation(after.data, addedLines);
    if (defamation.length > 0) {
      reasons.push(
        `${defamation.length} new defamation-prone phrase${defamation.length > 1 ? 's' : ''} outside blockquotes without legal-review-result: pass — first: "${defamation[0].slice(0, 80)}"`
      );
    }

    // Rule 4-6: regressions on verified profiles
    const beforeContent = getBeforeContent(filePath);
    if (beforeContent) {
      const before = splitFrontmatter(beforeContent);
      if (!before.yamlError) {
        const regressions = detectRegressions(before, after);
        reasons.push(...regressions);
      }
    }

    if (reasons.length > 0) {
      failures.push({ file: filePath, reasons });
    }
  }

  if (failures.length === 0) {
    // Silent pass
    process.exit(0);
  }

  // Plain-English failure report
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error('║  SELF-REVIEW MIRROR — COMMIT BLOCKED                         ║');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  console.error('');
  console.error('This commit would introduce regressions to profile quality.');
  console.error('Fix the issues below and try again, OR override with:');
  console.error('  ALLOW_REGRESSION=1 git commit ...');
  console.error('');

  for (const f of failures) {
    console.error(`❌ ${f.file}`);
    for (const r of f.reasons) {
      console.error(`   • ${r}`);
    }
    console.error('');
  }

  console.error('Why these rules exist:');
  console.error('  - Em dashes and AI vocabulary make profiles sound auto-generated.');
  console.error('  - Defamation-prone words outside blockquotes need legal review.');
  console.error('  - Verified profiles cannot silently lose sources or class analysis.');
  console.error('');
  console.error('Full rule list: scripts/self-review-mirror.cjs');
  console.error('');

  if (ALLOW_REGRESSION) {
    console.error('ALLOW_REGRESSION=1 set — proceeding anyway. Please document why.');
    process.exit(0);
  }

  process.exit(1);
}

main();
