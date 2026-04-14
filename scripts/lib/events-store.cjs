/**
 * events-store.cjs — reader/writer for data/events.jsonl
 *
 * Part of Phase 2 — Query Engine MVP. Same lazy-load + in-memory index
 * pattern as sources-store.cjs and entities-store.cjs.
 *
 * Public API:
 *   loadEvents()                     → Record[] (cached)
 *   clearEventsCache()               → force reload
 *   getEvent(id)                     → Record | null
 *   addEvent(partial)                → Record (creates with minted id)
 *   updateEvent(id, patch)           → Record | null
 *   queryEvents(opts)                → Record[]
 *   countEvents()                    → number
 *
 * Query opts:
 *   { type, obstruction_type, policy_id, chamber, outcome,
 *     stakeholder, sector_affected, since, until }
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord } = require("./events-schema.cjs")

const EVENTS_FILE = path.join(__dirname, "..", "..", "data", "events.jsonl")

let _cache = null
let _byId = null
let _nextId = 1

function loadEvents() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(EVENTS_FILE)) {
    const raw = fs.readFileSync(EVENTS_FILE, "utf-8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        records.push(JSON.parse(trimmed))
      } catch (_) {}
    }
  }
  _cache = records
  _rebuildIndexes()
  return _cache
}

function clearEventsCache() {
  _cache = null
  _byId = null
  _nextId = 1
}

function _rebuildIndexes() {
  _byId = new Map()
  _nextId = 1
  for (const rec of _cache) {
    _byId.set(rec.id, rec)
    const m = /^evt_(\d{7})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= _nextId) _nextId = n + 1
    }
  }
}

function _persist() {
  const dir = path.dirname(EVENTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = EVENTS_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, EVENTS_FILE)
}

function _mintId() {
  const id = `evt_${String(_nextId).padStart(7, "0")}`
  _nextId += 1
  return id
}

function getEvent(id) {
  loadEvents()
  return _byId.get(id) || null
}

function countEvents() {
  loadEvents()
  return _cache.length
}

function addEvent(partial) {
  loadEvents()
  const rec = newRecord(partial)
  rec.id = _mintId()
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addEvent: schema validation failed: ${errors.join("; ")}`)
  }
  _cache.push(rec)
  _byId.set(rec.id, rec)
  _persist()
  return rec
}

function updateEvent(id, patch = {}) {
  loadEvents()
  const rec = _byId.get(id)
  if (!rec) return null
  const { id: _ignoreId, ...safe } = patch
  Object.assign(rec, safe)
  rec.last_updated = new Date().toISOString()
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`updateEvent: schema validation failed: ${errors.join("; ")}`)
  }
  _persist()
  return rec
}

function queryEvents(opts = {}) {
  loadEvents()
  return _cache.filter((r) => {
    if (opts.type && r.type !== opts.type) return false
    if (opts.obstruction_type && r.obstruction_type !== opts.obstruction_type) return false
    if (opts.policy_id && r.policy_id !== opts.policy_id) return false
    if (opts.chamber && r.chamber !== opts.chamber) return false
    if (opts.outcome && r.outcome !== opts.outcome) return false
    if (opts.stakeholder && !r.stakeholders.includes(opts.stakeholder)) return false
    if (opts.sector_affected && !r.sector_affected.includes(opts.sector_affected)) return false
    if (opts.since && r.date && r.date < opts.since) return false
    if (opts.until && r.date && r.date > opts.until) return false
    return true
  })
}

module.exports = {
  loadEvents,
  clearEventsCache,
  getEvent,
  addEvent,
  updateEvent,
  queryEvents,
  countEvents,
}
