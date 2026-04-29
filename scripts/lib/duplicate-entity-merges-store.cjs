/**
 * duplicate-entity-merges-store.cjs
 *
 * Canonical store for editorial decisions on duplicate-entity-profile
 * groups (Phase 2B-A of ADR-0029).
 *
 * One record per duplicate group surfaced by
 * duplicate-entity-profiles-check.cjs. State machine:
 *
 *   candidate              — surfaced by harness, awaiting David's call
 *   approved-merge         — David picked the canonical; the other(s)
 *                            should be archived/redirected via dedupe-
 *                            entities.cjs on the next --apply-approved run
 *   verify-id              — shared key (FEC ID / EIN / CIK) is suspicious;
 *                            don't merge until the ID assignment is verified
 *                            (one of them probably has the wrong ID)
 *   intentionally-distinct — confirmed not a duplicate (corp vs family vs
 *                            charitable foundation, etc.). Suppresses the
 *                            harness flag for 90 days; re-evaluated then.
 *   rejected               — not actionable, drop it
 *   resolved               — action applied (merge happened, or ID was
 *                            corrected, or distinct-flag landed). Audit
 *                            trail only.
 *
 * Subject to Rule 1 / canonical-store-sentinel. Edits go through the
 * editorial-decision-pipeline (provenance + change_log guaranteed).
 * Direct hand-edits to the JSONL fail the sentinel.
 *
 * Tier 2 ONLY — no Tier 1 auto-merge predicate. Merging entity profiles
 * touches every edge that references them; even the dash-prefix cases
 * need a human eyeball ("is the canonical the one I'd actually pick?").
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'duplicate-entity-merges.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-merge',
  'verify-id',
  'intentionally-distinct',
  'rejected',
  'resolved',
]);

function makeId(reason, key, profileIds) {
  // Stable id: hash of (reason + key + sorted profile ids). Same group
  // re-surfaced always finds the existing record.
  const sorted = [...profileIds].sort().join(',');
  const h = crypto.createHash('sha256').update(`${reason}::${key}::${sorted}`).digest('hex').slice(0, 12);
  return `dup_${h}`;
}

function loadAll() {
  if (!fs.existsSync(STORE_FILE)) return [];
  return fs
    .readFileSync(STORE_FILE, 'utf-8')
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
 * Upsert a candidate from harness output.
 * @param {Array} records  - mutable in-memory store
 * @param {object} candidate - { reason, key, profiles: [{id,name,type,profile_path}] }
 */
function upsertCandidate(records, candidate) {
  const profileIds = candidate.profiles.map((p) => p.id);
  const id = makeId(candidate.reason, candidate.key, profileIds);
  const existing = records.find((r) => r.id === id);
  if (existing) {
    // Refresh observation; preserve editorial state.
    existing.last_seen = new Date().toISOString();
    existing.profiles = candidate.profiles;
    return { record: existing, status: 'updated' };
  }
  const fresh = {
    id,
    reason: candidate.reason,
    key: candidate.key,
    profiles: candidate.profiles,
    first_detected: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    state: 'candidate',
    canonical_profile_id: null,
    archive_profile_ids: [],
    editorial_note: null,
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
