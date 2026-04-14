/**
 * policies-store.cjs — reader/writer for data/policies.jsonl
 *
 * Part of Phase 2.75 — Policy Battles MVP. Same lazy-load + in-memory
 * index pattern as sources-store / entities-store / events-store.
 *
 * Public API:
 *   loadPolicies()              → Record[] (cached)
 *   clearPoliciesCache()        → force reload
 *   getPolicy(id)               → Record | null
 *   getPolicyBySlug(slug)       → Record | null
 *   addOrFindPolicy(partial)    → Record (creates with pol_{slug} id)
 *   updatePolicy(id, patch)     → Record | null
 *   queryPolicies(opts)         → Record[]
 *   countPolicies()             → number
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord } = require("./policies-schema.cjs")

const POLICIES_FILE = path.join(__dirname, "..", "..", "data", "policies.jsonl")

let _cache = null
let _byId = null
let _bySlug = null

function loadPolicies() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(POLICIES_FILE)) {
    const raw = fs.readFileSync(POLICIES_FILE, "utf-8")
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

function clearPoliciesCache() {
  _cache = null
  _byId = null
  _bySlug = null
}

function _rebuildIndexes() {
  _byId = new Map()
  _bySlug = new Map()
  for (const rec of _cache) {
    _byId.set(rec.id, rec)
    if (rec.slug) _bySlug.set(rec.slug, rec)
  }
}

function _persist() {
  const dir = path.dirname(POLICIES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = POLICIES_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, POLICIES_FILE)
}

function getPolicy(id) {
  loadPolicies()
  return _byId.get(id) || null
}

function getPolicyBySlug(slug) {
  loadPolicies()
  return _bySlug.get(slug) || null
}

function countPolicies() {
  loadPolicies()
  return _cache.length
}

function addOrFindPolicy(partial) {
  loadPolicies()
  if (!partial || typeof partial.slug !== "string" || !partial.slug.trim()) {
    throw new Error("addOrFindPolicy: slug is required")
  }
  const slug = partial.slug.trim()
  const id = `pol_${slug.replace(/-/g, "_")}`

  const existing = _byId.get(id)
  if (existing) return existing

  const rec = newRecord({ ...partial, id, slug })
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addOrFindPolicy: schema validation failed: ${errors.join("; ")}`)
  }
  _cache.push(rec)
  _byId.set(rec.id, rec)
  _bySlug.set(rec.slug, rec)
  _persist()
  return rec
}

function updatePolicy(id, patch = {}) {
  loadPolicies()
  const rec = _byId.get(id)
  if (!rec) return null
  const { id: _ignoreId, ...safe } = patch
  Object.assign(rec, safe)
  rec.last_updated = new Date().toISOString()
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`updatePolicy: schema validation failed: ${errors.join("; ")}`)
  }
  _persist()
  return rec
}

function queryPolicies(opts = {}) {
  loadPolicies()
  return _cache.filter((r) => {
    if (opts.category && r.category !== opts.category) return false
    if (opts.status && r.status !== opts.status) return false
    if (opts.legislative_status && r.legislative_status !== opts.legislative_status) return false
    if (opts.high_risk_editorial !== undefined && r.high_risk_editorial !== opts.high_risk_editorial)
      return false
    return true
  })
}

module.exports = {
  loadPolicies,
  clearPoliciesCache,
  getPolicy,
  getPolicyBySlug,
  addOrFindPolicy,
  updatePolicy,
  queryPolicies,
  countPolicies,
}
