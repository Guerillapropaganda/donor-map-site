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
const WRITE = process.argv.includes('--write');
const JSON_MODE = process.argv.includes('--json');

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

function classifyNote(filePath, content) {
  const { data, body } = parseFrontmatter(content);
  const pattern = data['auto-resolve-when'];
  if (!pattern) return null;
  const status = data.status || 'open';

  let matches;
  try {
    matches = new RegExp(pattern, 'i').test(body);
  } catch (e) {
    return {
      file: filePath,
      pattern,
      status,
      matches: null,
      action: 'pattern-invalid',
      detail: `Invalid regex: ${e.message}`,
    };
  }

  const desired = matches ? 'done' : 'open';
  if (status === desired) {
    return { file: filePath, pattern, status, matches, action: 'in-sync' };
  }

  // status === 'in-progress' is human-managed — don't override unless
  // the pattern says it should be done. Don't flip in-progress → open.
  if (status === 'in-progress' && !matches) {
    return {
      file: filePath,
      pattern,
      status,
      matches,
      action: 'skip-in-progress',
      detail: 'human is actively working on this; not auto-reopening',
    };
  }

  return {
    file: filePath,
    pattern,
    status,
    matches,
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
    const r = classifyNote(f, content);
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
    console.log(`  With auto-resolve-when: ${withField}`);
    console.log(`  Drift (would flip): ${drift_count}`);
    console.log('');
    if (drift_count === 0) {
      console.log('  ✓ All auto-resolved notes are in sync with their patterns.');
    } else {
      for (const r of flips) {
        const rel = path.relative(path.join(__dirname, '..'), r.file);
        console.log(`  ${WRITE ? '⟳' : '·'} ${rel}`);
        console.log(`      ${r.from} → ${r.to}  (pattern: ${r.pattern})`);
      }
    }
  }

  process.exit(0);
}

main();
