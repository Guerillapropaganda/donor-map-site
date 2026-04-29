/**
 * pathless-stub-aliases-store.cjs
 *
 * Canonical store for editorial decisions on pathless ghost-stub
 * entities (Phase 2B-B of ADR-0029).
 *
 * Surfaced by pathless-stub-entities-check.cjs: entity records in
 * data/entities.jsonl with no profile_path, typically FEC committee
 * names that didn't get aliased to a canonical politician/donor entity.
 *
 * Two failure modes per stub:
 *   1. Should have been aliased to an existing canonical (e.g.
 *      "OSBORN FOR SENATE 2024" → Dan Osborn). Edges that reference
 *      the ghost name need to migrate to the canonical id, then the
 *      ghost record gets deleted.
 *   2. The committee/PAC name belongs to a real-world entity that
 *      doesn't have a vault profile yet. Editorial choice: create the
 *      profile, or accept-pathless (legitimate without one).
 *
 * State machine:
 *   candidate         — surfaced by harness, awaiting David's call
 *   approved-merge    — David picked canonical_entity_id; edges should
 *                       migrate via dedupe-entities --apply-approved
 *                       (same writer as duplicate-entity-merges class)
 *   create-profile    — David said "make a stub profile"; the profile
 *                       creation is manual, this state just suppresses
 *                       the harness flag until the profile lands
 *   accept-pathless   — legitimate pathless entity (industry bloc,
 *                       PAC-only, etc.). Suppressed for 90 days, then
 *                       re-evaluated.
 *   rejected          — drop, no action
 *   resolved          — terminal; audit trail only
 *
 * Subject to Rule 1 / canonical-store-sentinel. Edits go through the
 * editorial-decision-pipeline. Tier 2 only — no auto-merge.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'pathless-stub-aliases.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-merge',
  'create-profile',
  'accept-pathless',
  'rejected',
  'resolved',
]);

function makeId(entityId, name) {
  const h = crypto.createHash('sha256').update(`${entityId || ''}::${name || ''}`).digest('hex').slice(0, 12);
  return `pls_${h}`;
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
 * @param {Array} records
 * @param {object} candidate - { entity_id, name, edge_count? }
 */
function upsertCandidate(records, candidate) {
  const id = makeId(candidate.entity_id, candidate.name);
  const existing = records.find((r) => r.id === id);
  if (existing) {
    existing.last_seen = new Date().toISOString();
    if (typeof candidate.edge_count === 'number') existing.edge_count = candidate.edge_count;
    if (candidate.kind) existing.kind = candidate.kind;
    return { record: existing, status: 'updated' };
  }
  const fresh = {
    id,
    entity_id: candidate.entity_id,
    name: candidate.name,
    kind: candidate.kind || 'unknown',
    edge_count: typeof candidate.edge_count === 'number' ? candidate.edge_count : null,
    first_detected: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    state: 'candidate',
    canonical_entity_id: null,
    canonical_entity_name: null,
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
