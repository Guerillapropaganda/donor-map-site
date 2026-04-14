/**
 * users-store.cjs — reader/writer for data/users.jsonl
 *
 * Part of Phase 2.5 — Auth & Gating. Same lazy-load + in-memory index
 * pattern as every other Phase 2+ store.
 *
 * Public API:
 *   loadUsers()                   → Record[]
 *   clearUsersCache()
 *   getUser(id)                   → Record | null
 *   getUserByClerkId(clerkId)     → Record | null
 *   getUserByEmail(email)         → Record | null
 *   addOrFindUser(partial)        → Record (creates on first signup)
 *   updateUser(id, patch)         → Record | null
 *   setTier(id, tier)             → Record | null
 *   countUsers()                  → number
 *   queryUsers(opts)              → Record[]
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord } = require("./users-schema.cjs")

const USERS_FILE = path.join(__dirname, "..", "..", "data", "users.jsonl")

let _cache = null
let _byId = null
let _byClerkId = null
let _byEmail = null
let _nextId = 1

function loadUsers() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, "utf-8")
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

function clearUsersCache() {
  _cache = null
  _byId = null
  _byClerkId = null
  _byEmail = null
  _nextId = 1
}

function _rebuildIndexes() {
  _byId = new Map()
  _byClerkId = new Map()
  _byEmail = new Map()
  _nextId = 1
  for (const rec of _cache) {
    _byId.set(rec.id, rec)
    if (rec.clerk_id) _byClerkId.set(rec.clerk_id, rec)
    if (rec.email) _byEmail.set(rec.email.toLowerCase(), rec)
    const m = /^usr_(\d{6})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= _nextId) _nextId = n + 1
    }
  }
}

function _persist() {
  const dir = path.dirname(USERS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = USERS_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, USERS_FILE)
}

function _mintId() {
  const id = `usr_${String(_nextId).padStart(6, "0")}`
  _nextId += 1
  return id
}

function getUser(id) {
  loadUsers()
  return _byId.get(id) || null
}

function getUserByClerkId(clerkId) {
  loadUsers()
  return _byClerkId.get(clerkId) || null
}

function getUserByEmail(email) {
  loadUsers()
  if (!email) return null
  return _byEmail.get(email.toLowerCase()) || null
}

function countUsers() {
  loadUsers()
  return _cache.length
}

function addOrFindUser(partial) {
  loadUsers()
  if (partial.clerk_id) {
    const existing = getUserByClerkId(partial.clerk_id)
    if (existing) return existing
  }
  if (partial.email) {
    const existing = getUserByEmail(partial.email)
    if (existing) {
      // Backfill clerk_id if this is first login after signup
      if (partial.clerk_id && !existing.clerk_id) {
        return updateUser(existing.id, { clerk_id: partial.clerk_id })
      }
      return existing
    }
  }

  const rec = newRecord(partial)
  rec.id = _mintId()
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addOrFindUser: schema validation failed: ${errors.join("; ")}`)
  }
  _cache.push(rec)
  _byId.set(rec.id, rec)
  if (rec.clerk_id) _byClerkId.set(rec.clerk_id, rec)
  if (rec.email) _byEmail.set(rec.email.toLowerCase(), rec)
  _persist()
  return rec
}

function updateUser(id, patch = {}) {
  loadUsers()
  const rec = _byId.get(id)
  if (!rec) return null
  const { id: _ignoreId, ...safe } = patch
  Object.assign(rec, safe)
  rec.last_seen = new Date().toISOString()
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`updateUser: schema validation failed: ${errors.join("; ")}`)
  }
  // Update secondary indexes if identity fields changed
  if (patch.clerk_id) _byClerkId.set(patch.clerk_id, rec)
  if (patch.email) _byEmail.set(patch.email.toLowerCase(), rec)
  _persist()
  return rec
}

function setTier(id, tier) {
  return updateUser(id, { tier })
}

function queryUsers(opts = {}) {
  loadUsers()
  return _cache.filter((r) => {
    if (opts.tier && r.tier !== opts.tier) return false
    if (opts.is_admin !== undefined && r.is_admin !== opts.is_admin) return false
    return true
  })
}

module.exports = {
  loadUsers,
  clearUsersCache,
  getUser,
  getUserByClerkId,
  getUserByEmail,
  addOrFindUser,
  updateUser,
  setTier,
  queryUsers,
  countUsers,
}
