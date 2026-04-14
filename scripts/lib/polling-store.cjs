/**
 * polling-store.cjs — reader/writer for data/polling.jsonl
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord } = require("./polling-schema.cjs")

const POLLING_FILE = path.join(__dirname, "..", "..", "data", "polling.jsonl")

let _cache = null
let _byId = null
let _byPolicy = null
let _nextId = 1

function loadPolls() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(POLLING_FILE)) {
    const raw = fs.readFileSync(POLLING_FILE, "utf-8")
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

function clearPollsCache() {
  _cache = null
  _byId = null
  _byPolicy = null
  _nextId = 1
}

function _rebuildIndexes() {
  _byId = new Map()
  _byPolicy = new Map()
  _nextId = 1
  for (const rec of _cache) {
    _byId.set(rec.id, rec)
    if (rec.policy_id) {
      if (!_byPolicy.has(rec.policy_id)) _byPolicy.set(rec.policy_id, [])
      _byPolicy.get(rec.policy_id).push(rec)
    }
    const m = /^poll_(\d{6})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= _nextId) _nextId = n + 1
    }
  }
}

function _persist() {
  const dir = path.dirname(POLLING_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = POLLING_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, POLLING_FILE)
}

function _mintId() {
  const id = `poll_${String(_nextId).padStart(6, "0")}`
  _nextId += 1
  return id
}

function getPoll(id) {
  loadPolls()
  return _byId.get(id) || null
}

function getPollsForPolicy(policyId) {
  loadPolls()
  return _byPolicy.get(policyId) || []
}

function addPoll(partial) {
  loadPolls()
  const rec = newRecord(partial)
  rec.id = _mintId()
  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addPoll: schema validation failed: ${errors.join("; ")}`)
  }
  _cache.push(rec)
  _byId.set(rec.id, rec)
  if (rec.policy_id) {
    if (!_byPolicy.has(rec.policy_id)) _byPolicy.set(rec.policy_id, [])
    _byPolicy.get(rec.policy_id).push(rec)
  }
  _persist()
  return rec
}

function countPolls() {
  loadPolls()
  return _cache.length
}

module.exports = {
  loadPolls,
  clearPollsCache,
  getPoll,
  getPollsForPolicy,
  addPoll,
  countPolls,
}
