/**
 * librarian-gap-decisions-store.cjs
 *
 * Canonical store for librarian-gap editorial decisions.
 *
 * Mirrors the ADR-0027 frontmatter-orphan-candidates pattern but for the
 * other half of the gap problem: wikilinks that the librarian itself
 * cannot resolve (because the entity has no row in entities.jsonl, or has
 * a row but is missing the alias that would match the link).
 *
 * One record per name. State machine:
 *
 *   candidate         — newly detected by --report (gap-audit told us
 *                       this name appears N times across guarded fields,
 *                       no librarian resolution).
 *   approved-alias    — David confirmed "X is an alias of Y" — --apply
 *                       will append X to entities.jsonl[Y].aliases.
 *   rejected          — David said "no, this is a different entity" or
 *                       "this is junk, drop the wikilink." Suppressed
 *                       indefinitely; comes back only if appearances
 *                       jump dramatically.
 *   needs-research    — David doesn't know yet. Show in the queue but
 *                       don't act.
 *   resolved          — alias landed in entities.jsonl. Audit trail only.
 *
 * Subject to Rule 1 / canonical-store-sentinel. Edits go through:
 *   - scripts/librarian-gap-propose.cjs (--report writes candidates,
 *                                        --apply-approved writes aliases)
 * Never hand-edit.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'librarian-gap-decisions.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-alias',
  'rejected',
  'needs-research',
  'resolved',
]);

function makeId(name) {
  const key = name.toLowerCase().trim();
  const h = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
  return `gap_${h}`;
}

function loadAll() {
  if (!fs.existsSync(STORE_FILE)) return [];
  return fs
    .readFileSync(STORE_FILE, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try { return JSON.parse(l); } catch { return null; }
    })
    .filter(Boolean);
}

function persistAll(records) {
  const tmp = STORE_FILE + '.tmp';
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(tmp, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
  fs.renameSync(tmp, STORE_FILE);
}

function upsertCandidate(records, candidate) {
  const id = makeId(candidate.name);
  const existing = records.find((r) => r.id === id);
  if (existing) {
    // Refresh observation fields, preserve editorial decision fields.
    existing.last_seen = new Date().toISOString();
    existing.appearances = candidate.appearances;
    existing.by_field = candidate.by_field;
    existing.sample_profiles = candidate.sample_profiles;
    existing.similar = candidate.similar;
    existing.gap_class = candidate.gap_class;
    return { record: existing, status: 'updated' };
  }
  const fresh = {
    id,
    name: candidate.name,
    gap_class: candidate.gap_class,
    appearances: candidate.appearances,
    by_field: candidate.by_field,
    sample_profiles: candidate.sample_profiles,
    similar: candidate.similar || [],
    first_detected: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    state: 'candidate',
    approved_alias_target: null,
    rejected_reason: null,
    decided_at: null,
    resolved_at: null,
  };
  records.push(fresh);
  return { record: fresh, status: 'created' };
}

function setState(records, id, newState, extra = {}) {
  if (!VALID_STATES.has(newState)) {
    throw new Error(`invalid state: ${newState}`);
  }
  const r = records.find((x) => x.id === id);
  if (!r) throw new Error(`record not found: ${id}`);
  r.state = newState;
  r.decided_at = new Date().toISOString();
  if (extra.approved_alias_target) r.approved_alias_target = extra.approved_alias_target;
  if (extra.rejected_reason) r.rejected_reason = extra.rejected_reason;
  if (newState === 'resolved') r.resolved_at = new Date().toISOString();
  return r;
}

module.exports = {
  STORE_FILE,
  VALID_STATES,
  makeId,
  loadAll,
  persistAll,
  upsertCandidate,
  setState,
};
