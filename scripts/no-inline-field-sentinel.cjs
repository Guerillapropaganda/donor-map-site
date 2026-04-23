#!/usr/bin/env node
/**
 * no-inline-field-sentinel.cjs
 *
 * Blocks commits that introduce Obsidian Dataview-style inline field
 * assignments in profile body markdown:
 *
 *   office:: Governor              ← BLOCKED
 *   state:: OH                     ← BLOCKED
 *
 * Structured data belongs in YAML frontmatter. Inline `field:: value`
 * pollutes parsers, renders as literal text in Quartz, and creates two
 * sources of truth for the same field (frontmatter + body).
 *
 * The 2026-04-10 cleanup sweep removed 562 files with the legacy
 * pattern. 19 profiles still have trailing Dataview blocks as of
 * 2026-04-23 and will be cleaned during Memory #19 promotion rollout.
 *
 * Enforces CLAUDE.md rule (Memory #19, promoted to sentinel per
 * ADR-0021). Runs on staged .md files only in pre-commit.
 *
 * Exit codes:
 *   0 = clean
 *   1 = at least one violation found
 *
 * Usage:
 *   node scripts/no-inline-field-sentinel.cjs           # scan all staged .md
 *   node scripts/no-inline-field-sentinel.cjs --all     # scan entire vault (ad-hoc audit)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCAN_ALL = process.argv.includes('--all');
const VERBOSE = process.argv.includes('--verbose');

// Pattern: line starts with a lowercase word (possibly with hyphens/underscores),
// followed by `:: ` (double colon + space). Catches Dataview inline fields.
// The space after :: is required to avoid false positives on things like
// `https://example.com` or `file::class_name` in code.
const INLINE_FIELD_RE = /^[a-z][a-z0-9_-]*:: /;

// ─── Find files to scan ──────────────────────────────────────────────

function stagedMdFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
    return out.split('\n').filter(f => f.endsWith('.md') && f.startsWith('content/'));
  } catch {
    return [];
  }
}

function allVaultMd() {
  const results = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'Archive') continue;
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        results.push(full.replace(/\\/g, '/'));
      }
    }
  }
  walk('content');
  return results;
}

// ─── Strip fenced code blocks so we don't false-positive on code ────

function stripCodeBlocks(text) {
  // Replace fenced blocks (``` ... ```) with blank lines of equal count
  // so line numbers stay accurate.
  return text.replace(/```[\s\S]*?```/g, block => '\n'.repeat((block.match(/\n/g) || []).length));
}

// ─── Split frontmatter from body ────────────────────────────────────

function splitFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: '', body: text, bodyStartLine: 1 };
  const bodyStartLine = (m[0].match(/\n/g) || []).length + 1;
  return {
    frontmatter: m[1],
    body: text.slice(m[0].length),
    bodyStartLine,
  };
}

// ─── Scan one file ──────────────────────────────────────────────────

function scanFile(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf-8'); } catch { return []; }
  const { body, bodyStartLine } = splitFrontmatter(text);
  const cleaned = stripCodeBlocks(body);
  const violations = [];
  cleaned.split('\n').forEach((line, i) => {
    if (INLINE_FIELD_RE.test(line)) {
      violations.push({
        file: filePath,
        line: bodyStartLine + i,
        text: line.trim(),
      });
    }
  });
  return violations;
}

// ─── Main ───────────────────────────────────────────────────────────

(function main() {
  const files = SCAN_ALL ? allVaultMd() : stagedMdFiles();
  if (files.length === 0) {
    if (VERBOSE) console.log('[no-inline-field-sentinel] no .md files to scan');
    process.exit(0);
  }

  const allViolations = [];
  for (const f of files) {
    const v = scanFile(f);
    allViolations.push(...v);
  }

  if (allViolations.length === 0) {
    if (VERBOSE) console.log(`[no-inline-field-sentinel] clean (${files.length} file${files.length === 1 ? '' : 's'} scanned)`);
    process.exit(0);
  }

  // Group by file for readable output
  const byFile = new Map();
  for (const v of allViolations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
  }

  console.error('');
  console.error('[x] no-inline-field-sentinel: Dataview inline fields detected');
  console.error('');
  console.error('    Structured data belongs in YAML frontmatter, not the body.');
  console.error('    Inline `field:: value` is Obsidian Dataview legacy syntax,');
  console.error('    banned per CLAUDE.md / ADR-0021.');
  console.error('');
  for (const [file, violations] of byFile) {
    console.error(`    ${file}`);
    for (const v of violations) {
      console.error(`      :${v.line}  ${v.text}`);
    }
    console.error('');
  }
  console.error('    Fix: move these values into the YAML frontmatter block at the');
  console.error('    top of the file, then delete the inline lines.');
  console.error('');
  console.error(`    Total: ${allViolations.length} violation(s) across ${byFile.size} file(s).`);
  console.error('');
  console.error('    Emergency bypass: SKIP_HOOKS=1 git commit ...');
  process.exit(1);
})();
