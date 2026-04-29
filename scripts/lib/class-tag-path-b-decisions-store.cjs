/**
 * class-tag-path-b-decisions-store.cjs
 *
 * Canonical store for class-tag-path-b-application class (Phase 2D follow-up
 * of ADR-0029, item #3 in handoff cc_p3_173). One record per donor/corporation
 * entity that lacks a `capital_type` and has a folder-path signal that maps
 * to one.
 *
 * Path B's job: extend the existing v1 heuristic (`SECTOR_MAP` keyword scan)
 * with **profile-folder-path classification**. Where the editorial folder
 * structure unambiguously implies a capital_type (Pharma & Healthcare →
 * pharma-capital, Wall Street → finance-capital), Path B auto-applies via
 * Tier 1 predicate. Where the folder is ambiguous (Mega-Donors, Education),
 * Path B surfaces a candidate for David's batch approval via Tier 2.
 *
 * State machine:
 *   candidate         — surfaced by producer, awaiting Tier 1 sweep or David's review
 *   approved-apply    — Tier 1 predicate matched OR David clicked approve
 *   resolved          — capital_type written into entities.jsonl
 *   rejected          — David said don't apply this proposal
 *
 * Each record:
 *   id                — sha hash of entity_id + proposed_capital_type
 *   entity_id         — entities.jsonl id
 *   entity_name
 *   profile_path
 *   folder            — extracted folder under Donors & Power Networks/
 *   sector            — current entity.signals.sector
 *   from_capital_type — current value (usually null for Path B targets)
 *   to_capital_type   — proposed value
 *   confidence        — 'tier-1-folder' | 'tier-2-folder' | 'tier-2-sector-only'
 *   reasoning         — short string for the audit page
 *   first_detected, last_seen
 *   state, decided_by, decided_at, change_log
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'class-tag-path-b-decisions.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-apply',
  'resolved',
  'rejected',
]);

function makeId(entityId, toCapitalType) {
  const key = `${entityId}::${toCapitalType}`;
  return 'ctb_' + crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
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

function upsertCandidate(records, c) {
  const id = makeId(c.entity_id, c.to_capital_type);
  const existing = records.find((r) => r.id === id);
  const nowIso = new Date().toISOString();

  if (existing) {
    existing.last_seen = nowIso;
    existing.entity_name = c.entity_name || existing.entity_name;
    existing.profile_path = c.profile_path || existing.profile_path;
    existing.folder = c.folder || existing.folder;
    existing.sector = c.sector !== undefined ? c.sector : existing.sector;
    existing.from_capital_type = c.from_capital_type !== undefined ? c.from_capital_type : existing.from_capital_type;
    existing.confidence = c.confidence || existing.confidence;
    existing.reasoning = c.reasoning || existing.reasoning;
    return { record: existing, status: 'updated' };
  }

  const fresh = {
    id,
    entity_id: c.entity_id,
    entity_name: c.entity_name,
    profile_path: c.profile_path,
    folder: c.folder,
    sector: c.sector || null,
    from_capital_type: c.from_capital_type ?? null,
    to_capital_type: c.to_capital_type,
    confidence: c.confidence,
    reasoning: c.reasoning,
    first_detected: nowIso,
    last_seen: nowIso,
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
