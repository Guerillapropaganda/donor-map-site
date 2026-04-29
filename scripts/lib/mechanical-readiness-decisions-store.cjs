/**
 * mechanical-readiness-decisions-store.cjs
 *
 * Canonical store for mechanical-readiness-promotion class (Phase 2C
 * of ADR-0029). One record per profile that's in flight through the
 * raw → draft → ready pipeline.
 *
 * Strict: Tier 1 ONLY for raw → draft and draft → ready. ADR-0017
 * states data-complete is publishable; David explicitly said publishing
 * stays with him, so the class refuses to propose anything past ready.
 *
 * State machine:
 *   candidate         — surfaced for promotion check
 *   approved-promote  — Tier 1 predicate matched; pipeline applies the
 *                       readiness rewrite via the class's apply_decision
 *   stuck             — Tier 1 predicate did NOT match (checklist gap);
 *                       record carries the gap reason, surfaces to
 *                       attention queue
 *   resolved          — promotion applied (frontmatter updated)
 *   rejected          — David said don't auto-promote this profile
 *                       (escape hatch)
 *
 * Each record:
 *   id                — sha hash of profile_path
 *   profile_path      — content/.../X.md
 *   profile_title     — frontmatter title
 *   profile_type      — politician | donor | corporation | etc.
 *   from_state        — current frontmatter content-readiness
 *   to_state          — target (draft or ready ONLY for Tier 1)
 *   gap_reasons       — array of failure tokens (e.g. ['noTier1','stale:121d'])
 *   first_detected, last_seen
 *   state, decided_by, decided_at, change_log
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'mechanical-readiness-decisions.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-promote',
  'stuck',
  'resolved',
  'rejected',
]);

function makeId(profilePath, fromState, toState) {
  const key = `${profilePath}::${fromState}::${toState}`;
  return 'mrp_' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
}

function loadAll() {
  if (!fs.existsSync(STORE_FILE)) return [];
  return fs.readFileSync(STORE_FILE, 'utf-8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function persistAll(records) {
  const tmp = STORE_FILE + '.tmp';
  const lines = records.map((r) => JSON.stringify(r));
  fs.writeFileSync(tmp, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
  fs.renameSync(tmp, STORE_FILE);
}

/**
 * Upsert a candidate. Producer calls this for every profile it's
 * inspecting. Existing records preserve their decision state but
 * refresh observation fields.
 */
function upsertCandidate(records, c) {
  const id = makeId(c.profile_path, c.from_state, c.to_state);
  const existing = records.find((r) => r.id === id);
  if (existing) {
    existing.last_seen = new Date().toISOString();
    existing.gap_reasons = c.gap_reasons || [];
    existing.profile_title = c.profile_title || existing.profile_title;
    existing.profile_type = c.profile_type || existing.profile_type;
    return { record: existing, status: 'updated' };
  }
  const fresh = {
    id,
    profile_path: c.profile_path,
    profile_title: c.profile_title || null,
    profile_type: c.profile_type || null,
    from_state: c.from_state,
    to_state: c.to_state,
    gap_reasons: c.gap_reasons || [],
    first_detected: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    state: 'candidate',
    decided_at: null,
    resolved_at: null,
  };
  records.push(fresh);
  return { record: fresh, status: 'created' };
}

module.exports = {
  STORE_FILE,
  VALID_STATES,
  makeId,
  loadAll,
  persistAll,
  upsertCandidate,
};
