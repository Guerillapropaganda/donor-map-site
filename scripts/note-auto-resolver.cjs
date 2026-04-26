#!/usr/bin/env node
/**
 * note-auto-resolver.cjs
 *
 * Scans content/Admin Notes/ for notes with an `auto-resolve-when:` field
 * and flips status: open ↔ done based on whether the body matches the
 * pattern.
 *
 * The pattern is treated as a regular expression. When the body matches:
 *   - If status is "open" or "in-progress", flip to "done"
 *   - The flip is reversible: if findings reappear (pattern stops
 *     matching), flip back to "open"
 *
 * This is the self-healing layer David asked for: "when the harness
 * corrects some of these issues will they disappear?" — yes, when the
 * report's body shows zero findings, the corresponding note auto-closes.
 *
 * Phase 1 of three-phase notes-self-healing work (2026-04-26).
 *
 * Usage:
 *   node scripts/note-auto-resolver.cjs           # dry-run, human output
 *   node scripts/note-auto-resolver.cjs --json    # JSON for vault-audit
 *   node scripts/note-auto-resolver.cjs --write   # actually flip status
 *
 * Exit code: 0 always (informational; status flips aren't a "finding").
 *
 * Findings count semantics for the harness:
 *   findings_count = number of notes whose status disagrees with what
 *                    the auto-resolve pattern says it should be (i.e.
 *                    drift the resolver would correct on --write). Zero
 *                    means everything is in sync.
 */

const fs = require('fs');
const path = require('path');
const { walkDir, parseFrontmatter } = require('./lib/shared.cjs');

const NOTES_DIR = path.join(__dirname, '..', 'content', 'Admin Notes');
const HARNESS_ARTIFACT = path.join(NOTES_DIR, 'vault-audit-latest.json');
const WRITE = process.argv.includes('--write');
const JSON_MODE = process.argv.includes('--json');

// Phase 3: read the vault-audit harness artifact so notes can declare
// `harness-check: <name>` and have status follow that check's
// findings_count. If the artifact isn't present or the named check
// isn't in it, the note falls through to auto-resolve-when (Phase 1)
// or stays as-is.
function loadHarnessChecks() {
  try {
    const raw = fs.readFileSync(HARNESS_ARTIFACT, 'utf-8');
    const parsed = JSON.parse(raw);
    const map = new Map();
    for (const c of parsed.checks || []) map.set(c.name, c);
    return map;
  } catch {
    return new Map();
  }
}

function todayIso() {
  return new Date().toISOString();
}

// Replace (or insert) a single key in a frontmatter block. Returns the
// modified file content. Only touches the requested key — leaves all
// other frontmatter fields and the body untouched.
function setFrontmatterKey(content, key, value) {
  const fmMatch = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!fmMatch) return content;
  const [, openFence, fmBody, closeFence] = fmMatch;
  const keyLine = new RegExp(`^${key}:\\s*.*$`, 'm');
  let newFm;
  if (keyLine.test(fmBody)) {
    newFm = fmBody.replace(keyLine, `${key}: ${value}`);
  } else {
    newFm = fmBody + `\n${key}: ${value}`;
  }
  return openFence + newFm + closeFence + content.slice(fmMatch[0].length);
}

// Decide what the note's status SHOULD be from any combination of:
//   1. harness-check: <name>      (Phase 3) — read findings_count from vault-audit
//   2. auto-resolve-when: <regex>  (Phase 1) — match against body
// Both signals can coexist; the harness check wins because it's the
// authoritative count. Returns { matches, source } or null if no rule.
function evaluateRules(data, body, harness) {
  const rules = [];
  const checkName = data['harness-check'];
  if (checkName) {
    const check = harness.get(checkName);
    if (!check) {
      return {
        matches: null,
        source: 'harness-check',
        detail: `harness check "${checkName}" not found in artifact`,
      };
    }
    if (check.error || check.exit === null || check.timed_out) {
      return {
        matches: null,
        source: 'harness-check',
        detail: `harness check "${checkName}" errored — leaving note alone`,
      };
    }
    rules.push({
      matches: (check.findings_count || 0) === 0,
      source: `harness:${checkName}`,
    });
  }
  const pattern = data['auto-resolve-when'];
  if (pattern) {
    try {
      rules.push({
        matches: new RegExp(pattern, 'i').test(body),
        source: 'pattern',
      });
    } catch (e) {
      return { matches: null, source: 'pattern', detail: `invalid regex: ${e.message}` };
    }
  }
  if (rules.length === 0) return null;
  // All rules must agree (AND). For one-rule notes that's trivially the
  // single rule's value. For two-rule notes, both findings-count and body
  // must say "empty" before we auto-close.
  const matches = rules.every((r) => r.matches);
  return { matches, source: rules.map((r) => r.source).join('+') };
}

function classifyNote(filePath, content, harness) {
  const { data, body } = parseFrontmatter(content);
  const evaluated = evaluateRules(data, body, harness);
  if (!evaluated) return null;
  const status = data.status || 'open';

  if (evaluated.matches === null) {
    return {
      file: filePath,
      status,
      action: 'rule-error',
      source: evaluated.source,
      detail: evaluated.detail,
    };
  }

  const desired = evaluated.matches ? 'done' : 'open';
  if (status === desired) {
    return { file: filePath, status, source: evaluated.source, action: 'in-sync' };
  }

  // status === 'in-progress' is human-managed — don't override unless
  // the rule says it should be done. Don't flip in-progress → open.
  if (status === 'in-progress' && !evaluated.matches) {
    return {
      file: filePath,
      status,
      source: evaluated.source,
      action: 'skip-in-progress',
      detail: 'human is actively working on this; not auto-reopening',
    };
  }

  return {
    file: filePath,
    status,
    source: evaluated.source,
    action: 'flip',
    from: status,
    to: desired,
  };
}

function applyFlip(filePath, content, to) {
  const next = setFrontmatterKey(
    setFrontmatterKey(content, 'status', to),
    'last-auto-resolved',
    todayIso(),
  );
  fs.writeFileSync(filePath, next, 'utf-8');
}

function main() {
  if (!fs.existsSync(NOTES_DIR)) {
    if (JSON_MODE) {
      console.log(JSON.stringify({ findings_count: 0, error: 'notes-dir-missing' }));
    } else {
      console.error(`Notes dir not found: ${NOTES_DIR}`);
    }
    process.exit(0);
  }

  const harness = loadHarnessChecks();
  const files = walkDir(NOTES_DIR, '.md');
  const results = [];
  let withField = 0;
  for (const f of files) {
    let content;
    try {
      content = fs.readFileSync(f, 'utf-8');
    } catch {
      continue;
    }
    const r = classifyNote(f, content, harness);
    if (!r) continue;
    withField++;
    if (r.action !== 'in-sync') results.push({ ...r, content });
  }

  const flips = results.filter((r) => r.action === 'flip');
  const drift_count = flips.length;

  if (WRITE) {
    for (const r of flips) {
      applyFlip(r.file, r.content, r.to);
    }
  }

  // Strip content from results before emitting.
  const reportable = results.map(({ content: _c, ...rest }) => rest);

  if (JSON_MODE) {
    console.log(
      JSON.stringify(
        {
          findings_count: drift_count,
          mode: WRITE ? 'write' : 'dry-run',
          flipped: WRITE ? flips.length : 0,
          drift: reportable,
        },
        null,
        2,
      ),
    );
  } else {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Note Auto-Resolver');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
    console.log(`  Notes scanned: ${files.length}`);
    console.log(`  With auto-resolve rules: ${withField}`);
    console.log(`  Drift (would flip): ${drift_count}`);
    console.log('');
    if (drift_count === 0) {
      console.log('  ✓ All auto-resolved notes are in sync with their patterns.');
    } else {
      for (const r of flips) {
        const rel = path.relative(path.join(__dirname, '..'), r.file);
        console.log(`  ${WRITE ? '⟳' : '·'} ${rel}`);
        console.log(`      ${r.from} → ${r.to}  (source: ${r.source})`);
      }
    }
  }

  process.exit(0);
}

main();
