/**
 * hot-issues-store.cjs — reader/writer for data/hot-issues.jsonl
 *
 * Part of Phase 5 — Story Score. Manual curation list of "what's in
 * the news cycle right now" — ~10 entries, updated weekly by David.
 * Feeds the news_cycle_relevance multiplier in story-scorer.cjs.
 *
 * Per phase-5 plan: v1 is manual curation, v2 could wire in RSS
 * signal aggregation. For v1, David adds / edits entries directly
 * via the file or a future Ops UI.
 *
 * Schema:
 *   {
 *     id: "hot_NNN",
 *     topic: "short label, 3-6 words",
 *     description: "1-2 sentences of context",
 *     policy_stakes: ["matching entries from the policy_stakes vocab"],
 *     capital_types: ["matching capital_type tags that care about this"],
 *     weight: 1.0-2.0   // multiplier applied to story scores touching this issue
 *     added: ISO date,
 *     expires: ISO date | null  (null = no expiry, review weekly)
 *   }
 *
 * Public API:
 *   loadHotIssues()             → Record[]
 *   clearCache()
 *   getHotIssue(id)             → Record | null
 *   addHotIssue(partial)        → Record
 *   updateHotIssue(id, patch)   → Record | null
 *   activeHotIssues()           → Record[] (expires not in past)
 *   matchingHotIssues({capital_types, policy_stakes}) → Record[]
 */

const fs = require("fs")
const path = require("path")

const HOT_ISSUES_FILE = path.join(__dirname, "..", "..", "data", "hot-issues.jsonl")

let _cache = null
let _byId = null
let _nextId = 1

function loadHotIssues() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(HOT_ISSUES_FILE)) {
    const raw = fs.readFileSync(HOT_ISSUES_FILE, "utf-8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        records.push(JSON.parse(trimmed))
      } catch (_) {}
    }
  }
  _cache = records
  _rebuildIndex()
  return _cache
}

function clearCache() {
  _cache = null
  _byId = null
  _nextId = 1
}

function _rebuildIndex() {
  _byId = new Map()
  _nextId = 1
  for (const rec of _cache) {
    _byId.set(rec.id, rec)
    const m = /^hot_(\d{3})$/.exec(rec.id || "")
    if (m) {
      const n = parseInt(m[1], 10)
      if (n >= _nextId) _nextId = n + 1
    }
  }
}

function _persist() {
  const dir = path.dirname(HOT_ISSUES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = HOT_ISSUES_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, HOT_ISSUES_FILE)
}

function _mintId() {
  const id = `hot_${String(_nextId).padStart(3, "0")}`
  _nextId += 1
  return id
}

function newRecord(partial) {
  const now = new Date().toISOString().slice(0, 10)
  return {
    id: partial.id || null,
    topic: partial.topic || "",
    description: partial.description || "",
    policy_stakes: Array.isArray(partial.policy_stakes) ? partial.policy_stakes : [],
    capital_types: Array.isArray(partial.capital_types) ? partial.capital_types : [],
    weight: typeof partial.weight === "number" ? partial.weight : 1.5,
    added: partial.added || now,
    expires: partial.expires || null,
  }
}

function getHotIssue(id) {
  loadHotIssues()
  return _byId.get(id) || null
}

function addHotIssue(partial) {
  loadHotIssues()
  const rec = newRecord(partial)
  rec.id = _mintId()
  if (!rec.topic || !rec.topic.trim()) throw new Error("topic is required")
  _cache.push(rec)
  _byId.set(rec.id, rec)
  _persist()
  return rec
}

function updateHotIssue(id, patch = {}) {
  loadHotIssues()
  const rec = _byId.get(id)
  if (!rec) return null
  const { id: _ignoreId, ...safe } = patch
  Object.assign(rec, safe)
  _persist()
  return rec
}

function activeHotIssues() {
  loadHotIssues()
  const today = new Date().toISOString().slice(0, 10)
  return _cache.filter((r) => !r.expires || r.expires >= today)
}

function matchingHotIssues({ capital_types = [], policy_stakes = [] } = {}) {
  const active = activeHotIssues()
  const ctSet = new Set(capital_types)
  const psSet = new Set(policy_stakes)
  return active.filter((r) => {
    const ctMatch = r.capital_types.some((ct) => ctSet.has(ct))
    const psMatch = r.policy_stakes.some((ps) => psSet.has(ps))
    return ctMatch || psMatch
  })
}

module.exports = {
  loadHotIssues,
  clearCache,
  getHotIssue,
  addHotIssue,
  updateHotIssue,
  activeHotIssues,
  matchingHotIssues,
}
