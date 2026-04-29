/**
 * data-complete-decisions-store.cjs
 *
 * Canonical store for data-complete-promotion class (Phase 2D of ADR-0029).
 * One record per profile that's a candidate to graduate from
 * `content-readiness: ready` → `content-readiness: data-complete`.
 *
 * **Tier 2 only.** Per David's directive (carried over from Phase 2C):
 * publishing == data-complete, and publishing stands with him. Claude
 * proposes, David batch-approves through `/audit-claude-decisions`.
 *
 * Gates evaluated mirror ADR-0017 / reclassify-readiness.cjs:
 *   1. typeReqs (per-type auto-section presence)
 *   2. ≥1 Tier 1 source in ## Sources
 *   3. canonical or frontmatter connections
 *   4. last-enriched within 90d
 *   5. no blocking flags (URL NEEDED / UNVERIFIED / NEEDS REVIEW / defamation-sanitized)
 *
 * State machine:
 *   candidate          — producer surfaced, all gates pass, awaiting David
 *   approved-publish   — David clicked approve; pipeline applies the rewrite
 *   stuck              — fails one specific gate; record carries gap_reasons
 *   resolved           — frontmatter rewrite applied
 *   rejected           — David said don't promote (escape hatch)
 *
 * Each record:
 *   id              — sha hash of profile_path
 *   profile_path    — content/.../X.md
 *   profile_title   — frontmatter title
 *   profile_type    — politician | donor | corporation | etc.
 *   from_state      — current frontmatter content-readiness (must be 'ready')
 *   to_state        — 'data-complete'
 *   gap_reasons     — failure tokens when state='stuck' (e.g. ['stale:120d'])
 *   gates_passing   — labels of gates that DO pass (for the audit UI preview)
 *   first_detected, last_seen
 *   state, decided_by, decided_at, change_log
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'data-complete-decisions.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-publish',
  'stuck',
  'resolved',
  'rejected',
]);

function makeId(profilePath) {
  return 'dcp_' + crypto.createHash('sha256').update(profilePath).digest('hex').slice(0, 12);
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
 * Upsert a candidate. Producer calls this for every `ready` profile
 * it inspects. Existing records preserve their decision state but
 * refresh observation fields (last_seen, gap_reasons, gates_passing).
 *
 * If a previously-stuck profile now passes all gates, it transitions
 * back to 'candidate' so David can approve. The reverse — a previously-
 * passing profile that lost a gate — moves back to 'stuck' so it stops
 * showing in the approve queue. Both transitions only fire while the
 * record is in a non-terminal pre-decision state (candidate / stuck);
 * resolved / rejected / approved-publish records are left alone (their
 * editorial provenance is sticky).
 */
function upsertCandidate(records, c) {
  const id = makeId(c.profile_path);
  const existing = records.find((r) => r.id === id);
  const nowIso = new Date().toISOString();
  const passes = !c.gap_reasons || c.gap_reasons.length === 0;

  if (existing) {
    existing.last_seen = nowIso;
    existing.gap_reasons = c.gap_reasons || [];
    existing.gates_passing = c.gates_passing || existing.gates_passing || [];
    existing.profile_title = c.profile_title || existing.profile_title;
    existing.profile_type = c.profile_type || existing.profile_type;
    existing.from_state = c.from_state || existing.from_state;
    // Re-shape pre-decision states only — never silently mutate David's
    // approved-publish/rejected/resolved.
    if (existing.state === 'candidate' && !passes) {
      existing.state = 'stuck';
    } else if (existing.state === 'stuck' && passes) {
      existing.state = 'candidate';
    }
    return { record: existing, status: 'updated' };
  }

  const fresh = {
    id,
    profile_path: c.profile_path,
    profile_title: c.profile_title || null,
    profile_type: c.profile_type || null,
    from_state: c.from_state,
    to_state: 'data-complete',
    gap_reasons: c.gap_reasons || [],
    gates_passing: c.gates_passing || [],
    first_detected: nowIso,
    last_seen: nowIso,
    state: passes ? 'candidate' : 'stuck',
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
