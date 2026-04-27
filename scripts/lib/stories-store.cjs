/**
 * stories-store.cjs — reader/writer for data/stories.jsonl
 *
 * Same lazy-load + in-memory index pattern as policies-store /
 * entities-store / events-store.
 *
 * Public API:
 *   loadStories()                 → Record[] (cached)
 *   clearStoriesCache()           → force reload
 *   getStory(id)                  → Record | null
 *   getStoryBySlug(slug)          → Record | null
 *   addOrFindStory(partial)       → Record (creates with story_<slug> id)
 *   updateStory(id, patch)        → Record | null
 *   queryStories(opts)            → Record[]
 *   countStories()                → number
 */

const fs = require("fs")
const path = require("path")
const { validate, newRecord, confidenceToSeverity } = require("./stories-schema.cjs")

const STORIES_FILE = path.join(__dirname, "..", "..", "data", "stories.jsonl")

let _cache = null
let _byId = null
let _bySlug = null

function loadStories() {
  if (_cache) return _cache
  const records = []
  if (fs.existsSync(STORIES_FILE)) {
    const raw = fs.readFileSync(STORIES_FILE, "utf-8")
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

function clearStoriesCache() {
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
  const dir = path.dirname(STORIES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const lines = _cache.map((r) => JSON.stringify(r))
  const tmp = STORIES_FILE + ".tmp"
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, STORIES_FILE)
}

function _slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function getStory(id) {
  loadStories()
  return _byId.get(id) || null
}

function getStoryBySlug(slug) {
  loadStories()
  return _bySlug.get(slug) || null
}

function countStories() {
  loadStories()
  return _cache.length
}

/**
 * addOrFindStory — idempotent upsert.
 *
 * If a story with the same slug already exists, returns the existing
 * record without modification. Callers that want to update must use
 * updateStory() explicitly.
 *
 * partial.headline (or partial.slug) is required.
 */
function addOrFindStory(partial) {
  loadStories()

  const headline = partial.headline || partial.title || ""
  const slug = partial.slug || _slugify(`${partial.detector_type || "story"}-${headline}`)

  if (!slug) {
    throw new Error("addOrFindStory: headline or slug is required")
  }

  const id = `story_${slug.replace(/-/g, "_").slice(0, 80)}`

  const existing = _byId.get(id) || _bySlug.get(slug)
  if (existing) return existing

  const rec = newRecord({
    ...partial,
    id,
    slug,
    headline: headline || slug,
    severity: partial.severity || confidenceToSeverity(partial.confidence ?? 3),
  })

  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`addOrFindStory: schema validation failed: ${errors.join("; ")}`)
  }

  _cache.push(rec)
  _byId.set(rec.id, rec)
  _bySlug.set(rec.slug, rec)
  _persist()
  return rec
}

function updateStory(id, patch = {}) {
  loadStories()
  const rec = _byId.get(id)
  if (!rec) return null

  const { id: _ignoreId, slug: _ignoreSlug, ...safe } = patch
  Object.assign(rec, safe)
  rec.last_updated = new Date().toISOString()

  // Re-derive severity if confidence changed but severity not explicitly patched
  if (patch.confidence !== undefined && patch.severity === undefined) {
    rec.severity = confidenceToSeverity(rec.confidence)
  }

  const { ok, errors } = validate(rec)
  if (!ok) {
    throw new Error(`updateStory: schema validation failed: ${errors.join("; ")}`)
  }

  _persist()
  return rec
}

/**
 * queryStories — filter the in-memory store.
 *
 * opts:
 *   state       — "candidate" | "draft" | "ready" | "published"
 *   severity    — "very-low" | "low" | "medium" | "high" | "very-high"
 *   detector    — string (script name)
 *   detector_type — string
 *   entity_ref  — string, matched against linked_entities[].ref
 */
function queryStories(opts = {}) {
  loadStories()
  return _cache.filter((r) => {
    if (opts.state && r.state !== opts.state) return false
    if (opts.severity && r.severity !== opts.severity) return false
    if (opts.detector && r.detector !== opts.detector) return false
    if (opts.detector_type && r.detector_type !== opts.detector_type) return false
    if (opts.entity_ref) {
      const refs = (r.linked_entities || []).map((e) => e.ref)
      if (!refs.includes(opts.entity_ref)) return false
    }
    return true
  })
}

module.exports = {
  loadStories,
  clearStoriesCache,
  getStory,
  getStoryBySlug,
  addOrFindStory,
  updateStory,
  queryStories,
  countStories,
}
