/**
 * fec-committee-registry.cjs — reader/writer API for
 * data/fec-committee-registry.json
 *
 * The registry is the single source of truth for "which vault profile
 * does a given FEC committee belong to". It is keyed by the 9-character
 * FEC committee_id (e.g. C00487470) because that's the only permanent,
 * FEC-authoritative identifier for a committee. Names drift (amendments,
 * DBAs, spelling variants), but committee IDs are immutable.
 *
 * Record shape:
 *   {
 *     "C00487470": {
 *       committee_id: "C00487470",
 *       fec_name: "CLUB FOR GROWTH ACTION",           // canonical from FEC
 *       committee_type: "O",                           // Super PAC etc.
 *       committee_type_full: "Super PAC (Independent Expenditure-Only)",
 *       designation: "U",
 *       designation_full: "Unauthorized",
 *       organization_type: null,
 *       connected_organization_name: null,              // FEC field, usually null for super PACs
 *       candidate_ids: [],                              // politicians the PAC targets
 *       cycles: [2022, 2024, 2026],
 *       state: "DC",
 *       party: null,
 *
 *       vault_profile: "Club for Growth",               // or null
 *       vault_slug: "donors & power networks/super pacs/club for growth",
 *       status: "mapped",                               // mapped | unmapped-needs-stub | unmapped-needs-review
 *
 *       aliases: [                                      // all FEC name variants we've seen
 *         "CLUB FOR GROWTH ACTION",
 *         "CLUB FOR GROWTH"
 *       ],
 *
 *       added: "2026-04-15T04:59:00.000Z",
 *       updated: "2026-04-15T04:59:00.000Z",
 *       source: "fec-committee-resolver",               // who added this entry
 *       notes: ""                                       // free-text
 *     }
 *   }
 *
 * Usage:
 *   const reg = require('./lib/fec-committee-registry.cjs');
 *   reg.load();
 *   reg.getByCommitteeId("C00487470");
 *   reg.getByFecName("CLUB FOR GROWTH ACTION");
 *   reg.upsert({...});
 *   reg.save();
 *
 * Consumers:
 *   - scripts/fec-committee-resolver.cjs            (writes from FEC API)
 *   - scripts/apply-fec-committee-registry.cjs     (syncs aliases to vault)
 *   - scripts/migrate-fec-body-tables-to-edges.cjs (reads before writing edges)
 *   - Future: donor-map-engine fec-summary pipeline (reads before writing body tables)
 */

const fs = require("fs")
const path = require("path")

const REGISTRY_FILE = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "fec-committee-registry.json"
)

let _cache = null

function load() {
  if (_cache) return _cache
  if (!fs.existsSync(REGISTRY_FILE)) {
    _cache = {}
    return _cache
  }
  const raw = fs.readFileSync(REGISTRY_FILE, "utf-8")
  try {
    _cache = JSON.parse(raw)
  } catch (e) {
    throw new Error(
      `fec-committee-registry: corrupt JSON at ${REGISTRY_FILE}: ${e.message}`
    )
  }
  return _cache
}

function save() {
  if (!_cache) return
  const tmp = REGISTRY_FILE + ".tmp-" + process.pid + "-" + Date.now()
  fs.writeFileSync(tmp, JSON.stringify(_cache, null, 2) + "\n", "utf-8")
  fs.renameSync(tmp, REGISTRY_FILE)
}

function clearCache() {
  _cache = null
}

function getByCommitteeId(id) {
  const reg = load()
  return reg[id] || null
}

function getByFecName(name) {
  if (!name) return null
  const reg = load()
  const needle = name.trim().toUpperCase()
  for (const rec of Object.values(reg)) {
    if (rec.fec_name && rec.fec_name.trim().toUpperCase() === needle) return rec
    if (Array.isArray(rec.aliases)) {
      for (const a of rec.aliases) {
        if (a.trim().toUpperCase() === needle) return rec
      }
    }
  }
  return null
}

function getByVaultProfile(title) {
  if (!title) return []
  const reg = load()
  const results = []
  for (const rec of Object.values(reg)) {
    if (rec.vault_profile === title) results.push(rec)
  }
  return results
}

function all() {
  const reg = load()
  return Object.values(reg)
}

function stats() {
  const reg = load()
  const counts = {
    total: 0,
    mapped: 0,
    "unmapped-needs-stub": 0,
    "unmapped-needs-review": 0,
  }
  for (const rec of Object.values(reg)) {
    counts.total++
    counts[rec.status] = (counts[rec.status] || 0) + 1
  }
  return counts
}

/**
 * Upsert a committee record. Merges aliases (union), overwrites scalar
 * fields, preserves vault_profile/vault_slug/status if not supplied.
 */
function upsert(incoming) {
  if (!incoming || !incoming.committee_id) {
    throw new Error("upsert: committee_id required")
  }
  const reg = load()
  const existing = reg[incoming.committee_id] || {}
  const now = new Date().toISOString()

  const merged = { ...existing, ...incoming }
  merged.committee_id = incoming.committee_id
  merged.added = existing.added || incoming.added || now
  merged.updated = now

  // Merge aliases (dedupe, uppercase-normalized)
  const allAliases = new Set()
  for (const a of existing.aliases || []) {
    if (typeof a === "string" && a.trim()) allAliases.add(a.trim())
  }
  for (const a of incoming.aliases || []) {
    if (typeof a === "string" && a.trim()) allAliases.add(a.trim())
  }
  // Always include the fec_name as an alias
  if (merged.fec_name) allAliases.add(merged.fec_name.trim())
  merged.aliases = [...allAliases].sort()

  // If vault_profile not specified in incoming, preserve existing
  if (incoming.vault_profile === undefined) merged.vault_profile = existing.vault_profile || null
  if (incoming.vault_slug === undefined) merged.vault_slug = existing.vault_slug || null
  if (incoming.status === undefined)
    merged.status = existing.status || (merged.vault_profile ? "mapped" : "unmapped-needs-review")

  reg[incoming.committee_id] = merged
  return merged
}

module.exports = {
  load,
  save,
  clearCache,
  getByCommitteeId,
  getByFecName,
  getByVaultProfile,
  all,
  stats,
  upsert,
  REGISTRY_FILE,
}
