/**
 * entities-store.cjs — reader/writer for data/entities.jsonl
 *
 * Part of Phase 2 — Query Engine MVP. See content/Build Phases.md and
 * content/Phases/phase-2/handoff.md for context.
 *
 * Lazy load + in-memory indexes (by id, by normalized name, by profile_path).
 * Append-only JSONL with full-file rewrite on update (acceptable at ~700
 * records; same pattern as sources-store.cjs).
 *
 * Public API:
 *   loadEntities()                    → Record[] (cached)
 *   clearEntitiesCache()              → force reload next call
 *   getEntity(id)                     → Record | null
 *   findByName(name)                  → Record | null (normalized match)
 *   findByProfilePath(path)           → Record | null
 *   addOrFindEntity(partial)          → Record (creates or returns existing)
 *   updateEntity(id, patch)           → Record | null
 *   queryEntities({entity_type,       → Record[]
 *                  tags_approved,
 *                  capital_type, ...})
 *   countEntities()                   → number
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord } = require("./entities-schema.cjs")

const ENTITIES_FILE = path.join(__dirname, "..", "..", "data", "entities.jsonl")

let _cache = null // Record[]
let _byId = null // Map<id, Record>
let _byName = null // Map<normalizedName, Record>
let _byPath = null // Map<profile_path, Record>
let _nextId = 1

function normalizeName(name) {
  if (typeof name !== "string") return ""
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\-.']/g, "")
}

// ─── Loading ───────────────────────────────────────────────────────────

function loadEntities() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(ENTITIES_FILE)) {
    const raw = fs.readFileSync(ENTITIES_FILE, "utf-8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        records.push(JSON.parse(trimmed))
      } catch (_) {
        // Skip malformed lines — pre-commit sentinel should block them.
      }
    }
  }
  _cache = records
  _rebuildIndexes()
  return _cache
}

function clearEntitiesCache() {
  _cache = null
  _byId = null
  _byName = null
  _byPath = null
  _nextId = 1
}

function _rebuildIndexes() {
  _byId = new Map()
  _byName = new Map()
  _byPath = new Map()
  _nextId = 1
  for (const rec of _cache) {
    _byId.set(rec.id, rec)
    if (rec.name) {
      const key = normalizeName(rec.name)
      if (key && !_byName.has(key)) _byName.set(key, rec)
    }
    if (rec.profile_path) _byPath.set(rec.profile_path, rec)

    const m = /^ent_(\d{6})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= _nextId) _nextId = n + 1
    }
  }
}

// ─── Persistence ───────────────────────────────────────────────────────

function _persist() {
  const dir = path.dirname(ENTITIES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = ENTITIES_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, ENTITIES_FILE)
  // ADR-0024 cache-correctness: bump the canonical mutation stamp so
  // long-running readers (ops librarian singleton, /api/connections
  // cache) refresh on next call.
  try {
    require("./mutation-stamp.cjs").markMutated("entities-store._persist")
  } catch {
    /* skip — best-effort */
  }
}

function _mintId() {
  const id = `ent_${String(_nextId).padStart(6, "0")}`
  _nextId += 1
  return id
}

// ─── Read API ──────────────────────────────────────────────────────────

function getEntity(id) {
  loadEntities()
  return _byId.get(id) || null
}

function findByName(name) {
  loadEntities()
  const key = normalizeName(name)
  if (!key) return null
  return _byName.get(key) || null
}

function findByProfilePath(profilePath) {
  loadEntities()
  return _byPath.get(profilePath) || null
}

function countEntities() {
  loadEntities()
  return _cache.length
}

function queryEntities(opts = {}) {
  loadEntities()
  return _cache.filter((r) => {
    if (opts.entity_type && r.entity_type !== opts.entity_type) return false
    if (opts.tags_approved !== undefined && r.tags_approved !== opts.tags_approved) return false
    if (opts.capital_type && r.capital_type !== opts.capital_type) return false
    if (opts.class_position && r.class_position !== opts.class_position) return false
    if (opts.worker_relationship && r.worker_relationship !== opts.worker_relationship) return false
    if (
      opts.has_ideological_function &&
      !r.ideological_function.includes(opts.has_ideological_function)
    )
      return false
    return true
  })
}

// ─── Write API ─────────────────────────────────────────────────────────

/**
 * Add a new entity, or return the existing record if the name matches an
 * already-registered entity. Primary match key is normalized name; secondary
 * is profile_path. Caller can force a new record by passing `force: true`.
 *
 * partial: {
 *   name (required), profile_path, entity_type, signals, ...class tag fields
 * }
 */
function addOrFindEntity(partial) {
  loadEntities()
  if (!partial || typeof partial.name !== "string" || !partial.name.trim()) {
    throw new Error("addOrFindEntity: name is required")
  }

  if (!partial.force) {
    if (partial.profile_path) {
      const existing = findByProfilePath(partial.profile_path)
      if (existing) return existing
    }
    const existingByName = findByName(partial.name)
    if (existingByName) return existingByName
  }

  const rec = newRecord(partial)
  rec.id = _mintId()

  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addOrFindEntity: schema validation failed: ${errors.join("; ")}`)
  }

  _cache.push(rec)
  _byId.set(rec.id, rec)
  const nameKey = normalizeName(rec.name)
  if (nameKey) _byName.set(nameKey, rec)
  if (rec.profile_path) _byPath.set(rec.profile_path, rec)
  _persist()
  return rec
}

/**
 * Patch an existing record. `patch` is merged onto the record. ID cannot
 * be changed via this API. Returns the updated record, or null if id not
 * found. Re-runs validation before persisting.
 */
function updateEntity(id, patch = {}) {
  loadEntities()
  const rec = _byId.get(id)
  if (!rec) return null

  const { id: _ignoreId, ...safe } = patch
  // Deep-merge signals rather than replacing wholesale
  if (safe.signals && typeof safe.signals === "object") {
    safe.signals = { ...rec.signals, ...safe.signals }
  }
  Object.assign(rec, safe)
  rec.last_updated = new Date().toISOString()

  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`updateEntity: schema validation failed: ${errors.join("; ")}`)
  }
  _persist()
  return rec
}

module.exports = {
  loadEntities,
  clearEntitiesCache,
  getEntity,
  findByName,
  findByProfilePath,
  addOrFindEntity,
  updateEntity,
  queryEntities,
  countEntities,
  normalizeName,
}
