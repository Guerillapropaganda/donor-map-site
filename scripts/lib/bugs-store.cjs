/**
 * bugs-store.cjs — programmatic bug-queue.md writer.
 *
 * Adds entries to content/Admin Notes/bug-queue.md without disturbing
 * David's hand-written entries. Used by:
 *
 *   - calibration-auto-revert.cjs       (drift-triggered bugs)
 *   - attention-dispatcher.cjs          (crashed harness checks)
 *   - any future producer that wants to surface a bug deterministically
 *
 * Bug ID assignment is deterministic: a stable hash of the source +
 * key parameters → repeated calls with the same inputs produce the
 * same bug-NNN, so we don't double-add. The hash is rendered as the
 * second line of the entry (`<!-- auto-bug-key: <hash> -->`) so this
 * library can find existing entries on subsequent runs.
 *
 * Every entry written includes an `auto-resolve-when:` predicate so
 * the bugs-auto-resolver closes the loop automatically when the
 * underlying issue clears. Producers MUST supply a predicate.
 *
 * Subject to canonical-store-sentinel: bug-queue.md is allowlisted for
 * direct edits when this module + its callers are staged.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const BUG_QUEUE_PATH = path.join(ROOT, 'content', 'Admin Notes', 'bug-queue.md');

const VALID_SEVERITIES = new Set(['blocker', 'high', 'medium', 'low']);

function nextBugId(text) {
  // Find the highest bug-NNN currently in the file (across both sections),
  // return the next id with the same width.
  const ids = [...text.matchAll(/###\s+bug-(\d+):/g)].map((m) => parseInt(m[1], 10));
  const max = ids.length ? Math.max(...ids) : 0;
  const next = max + 1;
  return `bug-${String(next).padStart(3, '0')}`;
}

function hashKey(producer, key) {
  return crypto
    .createHash('sha256')
    .update(`${producer}::${key}`)
    .digest('hex')
    .slice(0, 12);
}

/**
 * Add a bug entry to the open section. If an entry with the same
 * (producer, key) hash already exists in EITHER section, returns the
 * existing id without modifying the file.
 *
 * @param {object} opts
 * @param {string} opts.producer       — short tag, e.g. "harness-crash"
 * @param {string} opts.key            — stable identifier within producer
 * @param {string} opts.title          — one-line bug title (no leading "bug-NNN:")
 * @param {string} opts.severity       — blocker | high | medium | low
 * @param {string} opts.what           — short description of the symptom
 * @param {string} opts.where          — where it surfaces (file path, page, etc.)
 * @param {string} opts.predicate      — auto-resolve-when payload, e.g. "harness-check=foo"
 * @param {object} [opts.metadata]     — extra fields rendered as bullets
 * @returns {{ id: string, status: 'created' | 'exists' }}
 */
function addBug(opts) {
  if (!opts.producer || !opts.key || !opts.title || !opts.severity || !opts.predicate) {
    throw new Error('addBug requires producer, key, title, severity, predicate');
  }
  if (!VALID_SEVERITIES.has(opts.severity)) {
    throw new Error(`invalid severity "${opts.severity}" (valid: ${[...VALID_SEVERITIES].join(', ')})`);
  }

  const hash = hashKey(opts.producer, opts.key);
  const existing = fs.readFileSync(BUG_QUEUE_PATH, 'utf-8');

  // Idempotency: same (producer, key) returns the existing id.
  const existingMatch = existing.match(
    new RegExp(`###\\s+(bug-\\d+):[^\\n]*\\n[^\\n]*auto-bug-key:\\s*${hash}`)
  );
  if (existingMatch) {
    return { id: existingMatch[1], status: 'exists' };
  }

  const id = nextBugId(existing);
  const today = new Date().toISOString().slice(0, 10);

  // Build the entry. Two-line "header" so the auto-bug-key sits next to
  // the heading and the parser still finds the bullets.
  const lines = [];
  lines.push(`### ${id}: ${opts.title}`);
  lines.push(`<!-- auto-bug-key: ${hash} -->`);
  lines.push(`<!-- auto-resolve-when: ${opts.predicate} -->`);
  lines.push(`- **reported:** ${today}`);
  lines.push(`- **severity:** ${opts.severity}`);
  if (opts.where) lines.push(`- **where:** ${opts.where}`);
  if (opts.what) lines.push(`- **what:** ${opts.what}`);
  lines.push(`- **producer:** ${opts.producer} (auto-logged)`);
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      lines.push(`- **${k}:** ${v}`);
    }
  }
  const entryBlock = lines.join('\n') + '\n\n';

  // Insert at the top of the ## open section, replacing the placeholder
  // "(no open bugs — all clear)" if present.
  let updated;
  const openSectionRe = /(## open\s*\n+)(\*\(no open bugs[^\n]*\)\*\s*\n+)?/;
  const m = openSectionRe.exec(existing);
  if (!m) {
    throw new Error('bug-queue.md missing "## open" section — refusing to write');
  }
  const insertAt = m.index + m[0].length;
  updated = existing.slice(0, insertAt) + entryBlock + existing.slice(insertAt);

  // Bump frontmatter last-updated.
  updated = updated.replace(/(last-updated:\s*)[\d-]+/, `$1${today}`);

  // Atomic write.
  const tmp = BUG_QUEUE_PATH + '.tmp';
  fs.writeFileSync(tmp, updated, 'utf-8');
  fs.renameSync(tmp, BUG_QUEUE_PATH);

  return { id, status: 'created' };
}

/**
 * Mark a bug resolved by id (programmatic close — used when a producer
 * detects the issue cleared but the auto-resolver predicate didn't fire
 * yet, or for synthetic bugs without predicates). Idempotent.
 */
function resolveBug(id, note) {
  const text = fs.readFileSync(BUG_QUEUE_PATH, 'utf-8');
  // Find the entry. If already in resolved section, no-op.
  const entryRe = new RegExp(`(### ${id}:[\\s\\S]*?)(?=\\n### |\\n## |$)`);
  const m = entryRe.exec(text);
  if (!m) return { id, status: 'not-found' };

  const entry = m[1];
  // Already resolved? Check section boundaries.
  const before = text.slice(0, m.index);
  if (/##\s+resolved/i.test(before.split(/##\s+/).pop() || '')) {
    return { id, status: 'already-resolved' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const resolvedNote = note ? ` (${note})` : '';
  const resolvedEntry = entry.replace(
    /(\n- \*\*reported:\*\*[^\n]+)/,
    `$1\n- **resolved:** ${today}${resolvedNote}`
  );

  // Remove from open, prepend to resolved (archive).
  let updated = text.replace(entryRe, '');
  updated = updated.replace(
    /(## resolved \(archive\)\s*\n+)/,
    `$1${resolvedEntry.trim()}\n\n`
  );

  // If open section is now empty, restore placeholder.
  updated = updated.replace(
    /(## open\s*\n+)(\n+## )/,
    '$1*(no open bugs — all clear)*\n\n$2'
  );
  updated = updated.replace(/(last-updated:\s*)[\d-]+/, `$1${today}`);

  const tmp = BUG_QUEUE_PATH + '.tmp';
  fs.writeFileSync(tmp, updated, 'utf-8');
  fs.renameSync(tmp, BUG_QUEUE_PATH);
  return { id, status: 'resolved' };
}

module.exports = { addBug, resolveBug, BUG_QUEUE_PATH };
