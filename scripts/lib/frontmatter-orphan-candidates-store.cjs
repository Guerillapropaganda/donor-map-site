/**
 * frontmatter-orphan-candidates-store.cjs
 *
 * Canonical store for ADR-0027 (Frontmatter Cache Prune Mode).
 *
 * One record per (profile, field, name) tuple where the name appears in a
 * frontmatter relationship cache field but the librarian has no backing
 * edge of the expected kind. State machine drives a per-case editorial
 * review (per ADR-0027 §Decision):
 *
 *   candidate              — newly detected by --report-orphans
 *   approved-prune         — David approved removal; --apply-approved
 *                            will strip it on next rebuilder run
 *   kept                   — David said "real, the librarian just doesn't
 *                            see it" — suppressed for 90 days, then re-
 *                            evaluated
 *   blocked-by-librarian-gap — David flagged the underlying resolver gap
 *                            (e.g. Fairshake committee-stub mapping). Stays
 *                            visible but doesn't get pruned. Auto-resolves
 *                            when librarian fixes land.
 *   resolved               — name no longer in the frontmatter (either
 *                            pruned via this flow or hand-edited away).
 *                            Kept for audit trail.
 *
 * Subject to Rule 1 / canonical-store-sentinel. Edits go through:
 *   - scripts/rebuild-relationship-caches.cjs (--report-orphans / --apply-approved)
 *   - ops/src/app/api/relationships/orphans (P2 ops UI, deferred)
 * Never hand-edit.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const STORE_FILE = path.join(ROOT, 'data', 'frontmatter-orphan-candidates.jsonl');

const VALID_STATES = new Set([
  'candidate',
  'approved-prune',
  'kept',
  'blocked-by-librarian-gap',
  'resolved',
]);

const VALID_FIELDS = new Set([
  'politicians-funded',
  'donors',
  'top-donors',
  'opposes',
]);

/**
 * Stable ID derived from the natural key (profile + field + name).
 * Re-runs of the report mode produce identical IDs so we can merge.
 */
function makeId(profile_path, field, name) {
  const key = `${profile_path}|${field}|${name.toLowerCase().trim()}`;
  const h = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
  return `orphan_${h}`;
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

/**
 * Reconcile a freshly-scanned set of orphan signals with the existing store.
 *
 * Rules:
 *   - Existing record + still-detected → update last_seen + counts, preserve state
 *   - Existing record + no longer detected → state→resolved (if not already)
 *   - New signal → create candidate
 *
 * Returns { added, updated, resolved, total }.
 */
function reconcile(scanned) {
  const existing = loadAll();
  const byId = new Map(existing.map((r) => [r.id, r]));
  const seen = new Set();
  const now = new Date().toISOString();

  let added = 0, updated = 0, resolved = 0;

  for (const s of scanned) {
    if (!VALID_FIELDS.has(s.field)) {
      throw new Error(`reconcile: unknown field "${s.field}" — update VALID_FIELDS or fix caller`);
    }
    const id = makeId(s.profile_path, s.field, s.name);
    seen.add(id);
    const prev = byId.get(id);
    if (prev) {
      prev.last_seen = now;
      prev.librarian_monetary_edges = s.librarian_monetary_edges;
      prev.librarian_opposition_edges = s.librarian_opposition_edges;
      prev.in_opposes = !!s.in_opposes;
      // State preserved (editorial decision sticky). If it was 'resolved'
      // and the name reappeared, flip back to candidate so it gets visibility.
      if (prev.state === 'resolved') {
        prev.state = 'candidate';
        prev.resolved_at = null;
      }
      byId.set(id, prev);
      updated++;
    } else {
      const record = {
        id,
        profile_path: s.profile_path,
        subject: s.subject,
        field: s.field,
        name: s.name,
        in_opposes: !!s.in_opposes,
        librarian_monetary_edges: s.librarian_monetary_edges,
        librarian_opposition_edges: s.librarian_opposition_edges,
        first_detected: now,
        last_seen: now,
        state: 'candidate',
        resolved_at: null,
        editorial_note: null,
      };
      byId.set(id, record);
      added++;
    }
  }

  // Auto-resolve: any not-yet-resolved record we didn't see in this scan,
  // mark resolved. The name is no longer in the frontmatter — either because
  // it was approved-pruned, hand-edited away, or the profile changed.
  for (const [id, rec] of byId) {
    if (seen.has(id)) continue;
    if (rec.state !== 'resolved') {
      rec.state = 'resolved';
      rec.resolved_at = now;
      resolved++;
    }
  }

  const out = [...byId.values()];
  persistAll(out);
  return { added, updated, resolved, total: out.length };
}

module.exports = {
  STORE_FILE,
  VALID_STATES,
  VALID_FIELDS,
  makeId,
  loadAll,
  persistAll,
  reconcile,
};
