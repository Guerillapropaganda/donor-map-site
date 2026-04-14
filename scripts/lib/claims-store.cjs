/**
 * claims-store.cjs — reader/writer for data/claims/{slug}.jsonl files
 *
 * Part of Phase 4 — Claim-Object Experiment. One JSONL file per
 * profile that opts into the pattern (v1: AOC only). Each file is
 * loaded on demand by profile_slug, cached separately.
 *
 * Public API:
 *   loadClaimsForProfile(slug)        → Record[] (cached per slug)
 *   clearClaimsCache(slug?)           → force reload
 *   getClaim(slug, id)                → Record | null
 *   addClaim(slug, partial)           → Record (creates with minted id)
 *   updateClaim(slug, id, patch)      → Record | null
 *   queryClaims(slug, opts)           → Record[]
 *   countClaims(slug)                 → number
 *   listProfileSlugs()                → string[] of slugs with a claim file
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord } = require("./claims-schema.cjs")

const CLAIMS_DIR = path.join(__dirname, "..", "..", "data", "claims")

const _cacheBySlug = new Map()
const _byIdBySlug = new Map()
const _nextIdBySlug = new Map()

function _fileFor(slug) {
  return path.join(CLAIMS_DIR, `${slug}.jsonl`)
}

function loadClaimsForProfile(slug) {
  if (_cacheBySlug.has(slug)) return _cacheBySlug.get(slug)
  const file = _fileFor(slug)
  const records = []
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, "utf-8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        records.push(JSON.parse(trimmed))
      } catch (_) {}
    }
  }
  _cacheBySlug.set(slug, records)
  _rebuildIndex(slug)
  return records
}

function clearClaimsCache(slug) {
  if (slug) {
    _cacheBySlug.delete(slug)
    _byIdBySlug.delete(slug)
    _nextIdBySlug.delete(slug)
  } else {
    _cacheBySlug.clear()
    _byIdBySlug.clear()
    _nextIdBySlug.clear()
  }
}

function _rebuildIndex(slug) {
  const records = _cacheBySlug.get(slug) || []
  const byId = new Map()
  let nextId = 1
  for (const rec of records) {
    byId.set(rec.id, rec)
    const m = /^claim_(\d{6})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= nextId) nextId = n + 1
    }
  }
  _byIdBySlug.set(slug, byId)
  _nextIdBySlug.set(slug, nextId)
}

function _persist(slug) {
  if (!fs.existsSync(CLAIMS_DIR)) fs.mkdirSync(CLAIMS_DIR, { recursive: true })
  const records = _cacheBySlug.get(slug) || []
  const file = _fileFor(slug)
  const lines = records.map((r) => JSON.stringify(r))
  const tmp = file + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, file)
}

function _mintId(slug) {
  const nextId = _nextIdBySlug.get(slug) || 1
  const id = `claim_${String(nextId).padStart(6, "0")}`
  _nextIdBySlug.set(slug, nextId + 1)
  return id
}

function getClaim(slug, id) {
  loadClaimsForProfile(slug)
  return _byIdBySlug.get(slug)?.get(id) || null
}

function countClaims(slug) {
  loadClaimsForProfile(slug)
  return (_cacheBySlug.get(slug) || []).length
}

function addClaim(slug, partial) {
  loadClaimsForProfile(slug)
  const rec = newRecord({ ...partial, profile_slug: slug })
  rec.id = _mintId(slug)
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addClaim: schema validation failed: ${errors.join("; ")}`)
  }
  const cache = _cacheBySlug.get(slug) || []
  cache.push(rec)
  _cacheBySlug.set(slug, cache)
  _byIdBySlug.get(slug)?.set(rec.id, rec)
  _persist(slug)
  return rec
}

function updateClaim(slug, id, patch = {}) {
  loadClaimsForProfile(slug)
  const byId = _byIdBySlug.get(slug)
  const rec = byId?.get(id)
  if (!rec) return null
  const { id: _ignoreId, profile_slug: _ignoreSlug, ...safe } = patch
  Object.assign(rec, safe)
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`updateClaim: schema validation failed: ${errors.join("; ")}`)
  }
  _persist(slug)
  return rec
}

function queryClaims(slug, opts = {}) {
  loadClaimsForProfile(slug)
  const all = _cacheBySlug.get(slug) || []
  return all.filter((r) => {
    if (opts.category && r.category !== opts.category) return false
    if (opts.section_key && r.section_key !== opts.section_key) return false
    if (opts.confidence && r.confidence !== opts.confidence) return false
    if (opts.verified !== undefined && r.verified !== opts.verified) return false
    return true
  })
}

function listProfileSlugs() {
  if (!fs.existsSync(CLAIMS_DIR)) return []
  return fs
    .readdirSync(CLAIMS_DIR)
    .filter((f) => f.endsWith(".jsonl") && !f.endsWith("-synthesis.md"))
    .map((f) => f.replace(/\.jsonl$/, ""))
}

module.exports = {
  loadClaimsForProfile,
  clearClaimsCache,
  getClaim,
  addClaim,
  updateClaim,
  queryClaims,
  countClaims,
  listProfileSlugs,
}
