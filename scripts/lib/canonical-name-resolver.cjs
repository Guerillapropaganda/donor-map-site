/**
 * canonical-name-resolver.cjs — CJS twin of lib/donor-map/resolver.ts
 *
 * Resolves a raw name string (whatever showed up as `from`/`to` on a
 * canonical-store edge) to its canonical entity name. The TS librarian
 * is the source of truth for how resolution works; this CJS version
 * implements the same name-form derivation so CJS scripts (the query
 * engine, cache rebuilders, audit scripts) can get the librarian's
 * alias-unification benefit without spawning tsx.
 *
 * Per ADR-0024: the TS librarian and this CJS resolver MUST stay in
 * lockstep. If lib/donor-map/resolver.ts changes its name-form rules,
 * mirror the change here. Both files cite this contract in their
 * docstrings.
 *
 * Public API:
 *   const resolver = createCanonicalNameResolver()  // lazy-loads stores
 *   resolver.resolve(rawName)        → canonical name (or rawName if no match)
 *   resolver.resolveOrNull(rawName)  → canonical name or null
 *   resolver.entityFor(rawName)      → entity record (with profile_path) or null
 *   resolver.size()                  → number of unique canonical entities
 *   resolver.clear()                 → drop cache (for testing)
 *
 * Performance: ~200ms cold load against current canonical state.
 * Subsequent calls are O(1) Map lookups.
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..", "..")
const ENTITIES_FILE = path.join(ROOT, "data", "entities.jsonl")
const LEGISLATORS_FILE = path.join(ROOT, "data", "legislator-registry.jsonl")
const FEC_REGISTRY_FILE = path.join(ROOT, "data", "fec-committee-registry.json")

let _cache = null

function readJsonlLines(filePath) {
  if (!fs.existsSync(filePath)) return []
  const raw = fs.readFileSync(filePath, "utf-8")
  const out = []
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    try { out.push(JSON.parse(t)) } catch { /* skip */ }
  }
  return out
}

/**
 * Mirror of lib/donor-map/resolver.ts → profilePathToWikilinkAlias().
 *
 * The vault's politician master files use `_Foo Master Profile.md` stems
 * and editors write wikilinks as `[[_Foo Master Profile]]`. The canonical
 * entity `name` is just `Foo`. Auto-registering the wikilink form as an
 * alias closes ~1,500 unresolvable references in one rule.
 *
 * Returns null when the path doesn't match the convention. Stays in
 * lockstep with the TS resolver — change one, change the other.
 */
function profilePathToWikilinkAlias(profilePath) {
  if (!profilePath) return []
  const slash = String(profilePath).lastIndexOf("/")
  const stem = (slash === -1 ? profilePath : profilePath.slice(slash + 1)).replace(/\.md$/i, "")
  if (!/^_?.+ Master Profile$/.test(stem)) return []
  const aliases = [stem]
  if (!stem.startsWith("_")) aliases.push("_" + stem)
  else aliases.push(stem.replace(/^_/, ""))
  return aliases
}

/**
 * Replicate Resolver.legislatorNameForms() from lib/donor-map/resolver.ts.
 *
 * Build all plausible name forms a PTR / FEC / vault editor might use
 * for a given legislator. Skips initial-only forms ("F. Aandahl") since
 * those collide too often.
 */
function legislatorNameForms(leg) {
  const out = new Set()
  const first = leg.name_first
  const middle = leg.name_middle
  const last = leg.name_last
  const nickname = leg.name_nickname
  const official = leg.name_official

  if (official) out.add(official)
  if (first && last) out.add(`${first} ${last}`)
  if (nickname && last) out.add(`${nickname} ${last}`)
  if (first && middle && last) out.add(`${first} ${middle} ${last}`)
  return [...out]
}

function buildResolver() {
  const entities = readJsonlLines(ENTITIES_FILE)
  const legislators = readJsonlLines(LEGISLATORS_FILE)
  const fecRegistry = fs.existsSync(FEC_REGISTRY_FILE)
    ? JSON.parse(fs.readFileSync(FEC_REGISTRY_FILE, "utf-8"))
    : {}

  // Map: lowercased name → entity record. Includes primary names + aliases.
  // First-write wins; collisions tracked separately.
  const byName = new Map()
  const ambiguousNames = new Set()
  const byBioguide = new Map() // bioguide → entity
  const byFecCommittee = new Map() // fec_committee_id → entity

  function register(name, entity) {
    if (!name) return
    const key = String(name).toLowerCase().trim()
    if (!key) return
    const existing = byName.get(key)
    if (!existing) {
      byName.set(key, entity)
      return
    }
    if (existing === entity) return
    // Collision: prefer the entity with profile_path (path-having node wins)
    if (existing.profile_path && !entity.profile_path) return
    if (entity.profile_path && !existing.profile_path) {
      byName.set(key, entity)
      return
    }
    // Both have or both lack profile_path → ambiguous
    ambiguousNames.add(key)
  }

  // 1. Seed from entities.jsonl
  for (const e of entities) {
    register(e.name, e)
    // Auto-alias the editorial wikilink forms (`_Foo Master Profile` and
    // `Foo Master Profile`) per lib/donor-map/resolver.ts. Closes ~5,500
    // unresolvable wikilinks across both conventions.
    for (const a of profilePathToWikilinkAlias(e.profile_path)) {
      register(a, e)
    }
    const declaredBio = e.signals && e.signals.bioguide_id
    if (declaredBio) byBioguide.set(declaredBio, e)
    const declaredFec =
      (e.signals && e.signals.fec_committee_id) ||
      (e.signals && Array.isArray(e.signals.fec_committee_ids) ? e.signals.fec_committee_ids[0] : null)
    if (declaredFec) byFecCommittee.set(declaredFec, e)
  }

  // 2. Backfill from legislator-registry: every name form aliases to the
  //    matching entity (or, if no entity exists for that bioguide, mints
  //    a synthetic entity-shaped record so the resolver has something to
  //    return).
  for (const leg of legislators) {
    const forms = legislatorNameForms(leg)
    let entity = byBioguide.get(leg.bioguide) || null
    if (!entity) {
      // Try to find existing entity by ANY form before stubbing
      for (const form of forms) {
        const existing = byName.get(String(form).toLowerCase().trim())
        if (existing) { entity = existing; break }
      }
    }
    if (!entity) {
      // Stub
      entity = {
        id: `bioguide:${leg.bioguide}`,
        name: forms[0] || leg.name_official || leg.bioguide,
        entity_type: "politician",
        profile_path: null,
        signals: { bioguide_id: leg.bioguide, _source: "legislator-registry" },
      }
      byBioguide.set(leg.bioguide, entity)
    }
    for (const form of forms) register(form, entity)
  }

  // 3. Backfill from fec-committee-registry: each committee aliases to its
  //    vault-profile entity (or the candidate's entity, if vault_profile
  //    is null but the committee links to a candidate via candidate_ids).
  //
  // Resolution preference (matches TS librarian's "path-having wins"):
  //   a) entity whose profile_path matches entry.vault_profile (the
  //      candidate's politician entity — preferred, has profile)
  //   b) entity matched by fec_committee_id in step 1 (might be a
  //      committee-shaped donor entity with profile_path:null)
  //   c) skip — no entity to alias to
  //
  // Without preference (a), aliases like "JOHN JAMES FOR CONGRESS, INC."
  // would resolve to the committee stub instead of the candidate.
  const entitiesByProfilePath = new Map()
  for (const e of entities) {
    if (e.profile_path) entitiesByProfilePath.set(e.profile_path, e)
  }
  for (const [committeeId, entry] of Object.entries(fecRegistry)) {
    let entity = null
    if (entry.vault_profile) {
      entity = entitiesByProfilePath.get(entry.vault_profile) || null
    }
    if (!entity) entity = byFecCommittee.get(committeeId) || null
    if (!entity) continue
    if (entry.fec_name) register(entry.fec_name, entity)
    if (Array.isArray(entry.aliases)) for (const a of entry.aliases) register(a, entity)
  }

  return { byName, ambiguousNames, entities }
}

function ensureCache() {
  if (_cache) return _cache
  _cache = buildResolver()
  return _cache
}

function createCanonicalNameResolver() {
  return {
    resolve(rawName) {
      if (!rawName) return rawName
      const cache = ensureCache()
      const key = String(rawName).toLowerCase().trim()
      if (cache.ambiguousNames.has(key)) return rawName // ambiguous → don't unify
      const ent = cache.byName.get(key)
      return ent ? ent.name : rawName
    },
    resolveOrNull(rawName) {
      if (!rawName) return null
      const cache = ensureCache()
      const key = String(rawName).toLowerCase().trim()
      if (cache.ambiguousNames.has(key)) return null
      const ent = cache.byName.get(key)
      return ent ? ent.name : null
    },
    entityFor(rawName) {
      if (!rawName) return null
      const cache = ensureCache()
      const key = String(rawName).toLowerCase().trim()
      if (cache.ambiguousNames.has(key)) return null
      return cache.byName.get(key) || null
    },
    size() {
      const cache = ensureCache()
      return cache.entities.length
    },
    clear() {
      _cache = null
    },
  }
}

module.exports = {
  createCanonicalNameResolver,
  legislatorNameForms, // exported for test parity with TS librarian
}
