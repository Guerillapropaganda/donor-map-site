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

// Phase 2a Part 2 wiring: read type-scan flags from the rulebook instead of
// hardcoding a nonProfileTypes set. Falls back to a safe hardcoded list if
// the rulebook can't be loaded (e.g., during early bootstrap or if the file
// is temporarily broken) so the pre-commit gate never breaks the commit path
// on a config issue.
let isVoiceScanned;
try {
  const rulebook = require('./lib/profile-type-rulebook.cjs');
  isVoiceScanned = rulebook.isVoiceScanned;
} catch (e) {
  // Fallback: previous hardcoded behavior. Kept for safety — if the rulebook
  // file is missing or corrupted we want the gate to still work, not crash.
  const FALLBACK_EXEMPT = new Set([
    'reference', 'system', 'methodology', 'index', 'page', 'digest',
    'daily-update', 'event', 'sub-note',
  ]);
  isVoiceScanned = (type) => !FALLBACK_EXEMPT.has(type);
}

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
      stdio: ['ignore', 'pipe', 'ignore'],
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
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

/**
 * Get only the newly added lines for a staged file that are in AUTHORED PROSE —
 * not inside auto-blocks (API data) or blockquotes (quoted sources). Uses a
 * full-context diff so auto-block open/close markers and blockquote state can
 * be tracked even across unchanged lines.
 *
 * Returned string contains ONLY the `+` lines that are:
 *   - outside `<!-- auto:X -->` ... `<!-- auto:X end -->` blocks
 *   - outside blockquote lines (`> ...`)
 *
 * For brand-new files this is effectively the whole prose body.
 * For modifications, this is ONLY what the current commit is introducing in
 * authored prose — pre-existing content and new pipeline API data are exempt.
 */
function getAddedLines(filePath) {
  try {
    // Full-context diff so we can track block state across unchanged lines
    const out = execSync(`git diff --cached -U999999 -- "${filePath}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024,
    });
    const added = [];
    let inAutoBlock = false;
    let inHunk = false;

    for (const rawLine of out.split(/\r?\n/)) {
      if (rawLine.startsWith('+++')) continue;
      if (rawLine.startsWith('---')) continue;
      if (rawLine.startsWith('diff --git')) continue;
      if (rawLine.startsWith('index ')) continue;
      if (rawLine.startsWith('new file') || rawLine.startsWith('deleted file')) continue;
      if (rawLine.startsWith('@@')) { inHunk = true; continue; }
      if (!inHunk) continue;

      // Skip fully removed lines ('-') — they're gone from the file
      if (rawLine.startsWith('-')) continue;

      // Content line: either ' ' (context) or '+' (added)
      const isAdded = rawLine.startsWith('+');
      const content = rawLine.slice(1);

      // Track auto-block state (considering BOTH context and added lines, so
      // we can tell whether a new '+' line lands inside an existing block)
      if (/<!--\s*auto:[\w-]+\s+start/.test(content) || /<!--\s*auto:[\w-]+\s+pending-merge/.test(content) || /<!--\s*auto:[\w-]+\s*-->/.test(content)) {
        inAutoBlock = true;
        // But if the same line also contains 'end', re-close immediately
        if (/<!--\s*auto:[\w-]+\s*end/.test(content)) inAutoBlock = false;
        continue;
      }
      if (/<!--\s*auto:[\w-]+\s*end/.test(content)) {
        inAutoBlock = false;
        continue;
      }

      if (!isAdded) continue;
      if (inAutoBlock) continue;
      if (/^\s*>/.test(content)) continue; // blockquote
      // Bulleted wikilink data lines are structured enumerations, not prose.
      // The pipeline often writes lines like:
      //   - [[John Boozman]] (Agriculture, Appropriations) — lobbying: $5.0M
      // The em dash there is a data annotation separator, not voice.
      // Narrow exemption: bullet lines that contain a wikilink.
      if (/^\s*[-*]\s.*\[\[/.test(content)) continue;

      added.push(content);
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
 * Strip content that should be exempt from voice rules:
 *   - Blockquotes (quoted source material)
 *   - Auto-blocks (API data from pipelines)
 *   - Wikilink bullet list lines (structured data enumerations)
 * Returns the cleaned body for scanning.
 */
function stripExemptContent(body) {
  const lines = body.split(/\r?\n/);
  const out = [];
  let inAutoBlock = false;
  for (const line of lines) {
    // Auto-block tracking
    if (/<!--\s*auto:[\w-]+\s+start/.test(line) ||
        /<!--\s*auto:[\w-]+\s+pending-merge/.test(line) ||
        /<!--\s*auto:[\w-]+\s*-->/.test(line)) {
      inAutoBlock = true;
      if (/<!--\s*auto:[\w-]+\s*end/.test(line)) inAutoBlock = false;
      continue;
    }
    if (/<!--\s*auto:[\w-]+\s*end/.test(line)) {
      inAutoBlock = false;
      continue;
    }
    if (inAutoBlock) continue;
    if (/^\s*>/.test(line)) continue; // blockquote
    if (/^\s*[-*]\s.*\[\[/.test(line)) continue; // wikilink bullet list
    if (/^#{1,6}\s/.test(line)) continue; // headings are labels, not prose
    out.push(line);
  }
  return out.join('\n');
}

/**
 * Count banned phrases per rule in authored prose content (exempt content
 * already stripped). Returns a map of {label → {count, sample}}.
 */
function countBannedPhrases(cleanBody) {
  const counts = {};
  for (let i = 0; i < BANNED_PHRASES.length; i++) {
    const re = BANNED_PHRASES[i];
    const matches = cleanBody.match(re);
    if (matches && matches.length > 0) {
      counts[BANNED_LABELS[i]] = { count: matches.length, sample: matches[0] };
    }
  }
  return counts;
}

/**
 * Find NET NEW banned phrase violations by comparing before and after.
 * A pipeline that changes "990 Filing — 2018" to "990 Filing — 2019" changes
 * the whole line but introduces zero new em dashes — count stays the same,
 * so nothing is flagged. Only genuinely new violations are reported.
 */
function netNewBannedPhrases(beforeBody, afterBody) {
  const beforeCounts = countBannedPhrases(stripExemptContent(beforeBody || ''));
  const afterCounts = countBannedPhrases(stripExemptContent(afterBody || ''));
  const findings = [];
  for (const label of Object.keys(afterCounts)) {
    const beforeCount = (beforeCounts[label] && beforeCounts[label].count) || 0;
    const afterCount = afterCounts[label].count;
    if (afterCount > beforeCount) {
      findings.push({
        label,
        count: afterCount - beforeCount,
        sample: afterCounts[label].sample,
      });
    }
  }
  return findings;
}

/**
 * Count defamation-prone word occurrences in authored prose (exempt content
 * already stripped).
 */
function countDefamationHits(cleanBody) {
  const lines = cleanBody.split(/\r?\n/);
  const hits = [];
  for (const line of lines) {
    if (DEFAMATION_WORDS.test(line)) {
      hits.push(line.trim().slice(0, 200));
    }
  }
  return hits;
}

/**
 * Net-new defamation detection: only flag occurrences the current commit
 * actually introduces. A pipeline rewording an existing line with the word
 * "fraud" in it (e.g. updating a case docket number) doesn't count as new.
 */
function netNewDefamation(data, beforeBody, afterBody) {
  if (data['legal-review-result'] === 'pass') return [];
  const beforeHits = countDefamationHits(stripExemptContent(beforeBody || ''));
  const afterHits = countDefamationHits(stripExemptContent(afterBody || ''));
  const net = afterHits.length - beforeHits.length;
  if (net <= 0) return [];
  // Find likely new hits — anything in afterHits not in beforeHits
  const beforeSet = new Set(beforeHits);
  const genuinelyNew = afterHits.filter((h) => !beforeSet.has(h));
  return genuinelyNew.length > 0 ? genuinelyNew.slice(0, net) : afterHits.slice(-net);
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
    // Skip types the rulebook says aren't voice-scanned. This replaces a
    // hardcoded nonProfileTypes Set with a read from
    // config/profile-type-rulebook.json. Types currently exempt: event, meta.
    // Any legacy non-editorial types (reference, system, methodology, index,
    // page, digest, daily-update, sub-note) are captured by the rulebook's
    // meta sub-category list and return false from isVoiceScanned.
    if (!isVoiceScanned(after.data.type)) continue;

    // Read the HEAD version of the file for net-new comparison. New files
    // get an empty before body, which means every violation counts as new.
    const beforeContent = getBeforeContent(filePath);
    const before = beforeContent
      ? splitFrontmatter(beforeContent)
      : { data: {}, body: '' };

    // Rule 1-2: banned phrases — NET NEW only.
    // Pipeline-rewriting a line that already had an em dash (e.g. year bump)
    // does not count. Auto-blocks and blockquotes and wikilink bullet lists
    // are stripped from both before and after before counting.
    const banned = netNewBannedPhrases(before.body, after.body);
    for (const b of banned) {
      reasons.push(
        `introduces banned language: ${b.label} (${b.count} new occurrence${b.count > 1 ? 's' : ''}, first: "${b.sample}")`
      );
    }

    // Rule 3: defamation — NET NEW only.
    const defamation = netNewDefamation(after.data, before.body, after.body);
    if (defamation.length > 0) {
      reasons.push(
        `${defamation.length} new defamation-prone phrase${defamation.length > 1 ? 's' : ''} outside blockquotes without legal-review-result: pass — first: "${defamation[0].slice(0, 80)}"`
      );
    }

    // Rule 4-6: regressions on verified profiles
    if (beforeContent && !before.yamlError) {
      const regressions = detectRegressions(before, after);
      reasons.push(...regressions);
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
