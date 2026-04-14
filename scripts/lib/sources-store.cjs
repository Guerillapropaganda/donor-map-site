/**
 * sources-store.cjs — reader/writer for data/sources.jsonl
 *
 * Part of Phase 1 — Source Registry. See content/Build Phases.md and
 * content/Phases/phase-1/handoff.md for context.
 *
 * Every consumer of the source registry — extractor scripts, pipelines,
 * the Ops /sources UI, the Quartz {{src:ID}} plugin, the orphan detector —
 * reads through this module. Never parse data/sources.jsonl yourself.
 *
 * The store is lazy: the file is read + parsed on first use and cached in
 * memory along with a dedupe index keyed on normalized URL. Subsequent
 * calls are near-free. Writes rewrite the entire file (acceptable for
 * ~10k records; revisit at 100k+).
 *
 * Public API:
 *   loadSources()                                  → Record[] (cached)
 *   clearSourcesCache()                            → force reload next call
 *   getSource(id)                                  → Record | null
 *   findByUrl(url)                                 → Record | null (uses normalizeUrl)
 *   addOrFindSource({url, tier, source_type,       → Record (creates or returns existing)
 *                    entity_ref, claim_ref,
 *                    title, ...})
 *   updateSource(id, patch)                        → Record | null
 *   updateStatus(id, status)                       → Record | null
 *   querySources({status, tier, source_type,       → Record[]
 *                 entity_ref})
 *   countSources()                                 → number
 */

const fs = require('fs');
const path = require('path');
const {
  validate,
  newRecord,
  normalizeUrl,
} = require('./sources-schema.cjs');

const SOURCES_FILE = path.join(__dirname, '..', '..', 'data', 'sources.jsonl');

let _cache = null;      // Record[]
let _urlIndex = null;   // Map<normalizedUrl, Record>
let _idIndex = null;    // Map<id, Record>
let _nextId = 1;

// ─── Loading ────────────────────────────────────────────────────────────

function loadSources() {
  if (_cache) return _cache;
  const records = [];
  if (fs.existsSync(SOURCES_FILE)) {
    const raw = fs.readFileSync(SOURCES_FILE, 'utf-8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        records.push(JSON.parse(trimmed));
      } catch (_) {
        // Skip malformed lines silently. The pre-commit sentinel should
        // have blocked this; if not, don't crash consumers mid-request.
      }
    }
  }
  _cache = records;
  _rebuildIndexes();
  return _cache;
}

function clearSourcesCache() {
  _cache = null;
  _urlIndex = null;
  _idIndex = null;
  _nextId = 1;
}

function _rebuildIndexes() {
  _urlIndex = new Map();
  _idIndex = new Map();
  _nextId = 1;
  for (const rec of _cache) {
    _idIndex.set(rec.id, rec);
    const key = normalizeUrl(rec.url);
    if (key && !_urlIndex.has(key)) _urlIndex.set(key, rec);
    const m = /^src_(\d{6})$/.exec(rec.id || '');
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= _nextId) _nextId = n + 1;
    }
  }
}

// ─── Persistence ────────────────────────────────────────────────────────

function _persist() {
  const dir = path.dirname(SOURCES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const lines = _cache.map((r) => JSON.stringify(r));
  fs.writeFileSync(SOURCES_FILE, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
}

function _mintId() {
  const id = `src_${String(_nextId).padStart(6, '0')}`;
  _nextId += 1;
  return id;
}

// ─── Read API ───────────────────────────────────────────────────────────

function getSource(id) {
  loadSources();
  return _idIndex.get(id) || null;
}

function findByUrl(url) {
  loadSources();
  const key = normalizeUrl(url);
  if (!key) return null;
  return _urlIndex.get(key) || null;
}

function countSources() {
  loadSources();
  return _cache.length;
}

function querySources(opts = {}) {
  loadSources();
  return _cache.filter((r) => {
    if (opts.status && r.status !== opts.status) return false;
    if (opts.tier !== undefined && r.tier !== opts.tier) return false;
    if (opts.source_type && r.source_type !== opts.source_type) return false;
    if (opts.entity_ref && r.entity_ref !== opts.entity_ref) return false;
    return true;
  });
}

// ─── Write API ──────────────────────────────────────────────────────────

/**
 * Add a new source, or return the existing record if the URL is already
 * registered (matched via normalizeUrl). Guarantees no URL duplication.
 *
 * partial: {
 *   url (required), tier, source_type, entity_ref, claim_ref,
 *   title, canonical_url, final_host, content_hash, expected_strings,
 *   status, archive_url, editor_notes
 * }
 *
 * Returns the record. Throws on validation failure.
 */
function addOrFindSource(partial) {
  loadSources();
  if (!partial || typeof partial.url !== 'string' || !partial.url.trim()) {
    throw new Error('addOrFindSource: url is required');
  }

  const existing = findByUrl(partial.url);
  if (existing) return existing;

  const rec = newRecord(partial);
  rec.id = _mintId();

  const { ok, errors } = validate(rec);
  if (!ok) {
    throw new Error(`addOrFindSource: schema validation failed: ${errors.join('; ')}`);
  }

  _cache.push(rec);
  _idIndex.set(rec.id, rec);
  const key = normalizeUrl(rec.url);
  if (key) _urlIndex.set(key, rec);
  _persist();
  return rec;
}

/**
 * Patch an existing record. `patch` is merged onto the record. ID and
 * url cannot be changed via this API (url change would break dedupe).
 * Returns the updated record, or null if id not found.
 */
function updateSource(id, patch = {}) {
  loadSources();
  const rec = _idIndex.get(id);
  if (!rec) return null;

  const { id: _ignoreId, url: _ignoreUrl, ...safe } = patch;
  Object.assign(rec, safe);
  rec.last_checked = new Date().toISOString();

  const { ok, errors } = validate(rec);
  if (!ok) {
    throw new Error(`updateSource: schema validation failed: ${errors.join('; ')}`);
  }
  _persist();
  return rec;
}

function updateStatus(id, status) {
  return updateSource(id, { status });
}

module.exports = {
  loadSources,
  clearSourcesCache,
  getSource,
  findByUrl,
  addOrFindSource,
  updateSource,
  updateStatus,
  querySources,
  countSources,
  // re-exports for convenience
  normalizeUrl,
};
