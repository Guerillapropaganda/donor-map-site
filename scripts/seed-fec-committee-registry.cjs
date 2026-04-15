#!/usr/bin/env node
/**
 * seed-fec-committee-registry.cjs — populate the FEC committee registry
 * from the resolver cache.
 *
 * Reads data/fec-committee-cache.jsonl (written by
 * fec-committee-resolver.cjs) and upserts each committee into
 * data/fec-committee-registry.json. Also attempts vault-profile
 * matching via the case-insensitive title index — if a committee's
 * FEC canonical name maps to a vault profile, the registry entry is
 * marked status: "mapped" and vault_profile is populated. Otherwise
 * the entry is marked status: "unmapped-needs-stub".
 *
 * Matching rules (same as the migration resolver, for consistency):
 *   1. Exact case-insensitive match on FEC canonical name
 *   2. Strip FEC suffixes (PAC / ACTION / FUND / COMMITTEE / POLITICAL
 *      VICTORY FUND / etc.), case-insensitive match
 *   3. Smart title-case with small-word lowercase, exact match
 *   4. If none match → status: unmapped-needs-stub
 *
 * Also merges in the original FEC body-table query string as an alias
 * so future lookups by the exact body-table name succeed via the
 * registry.
 *
 * Safety:
 *   - Dry-run by default; --write applies
 *   - Idempotent — existing registry records are upserted (aliases
 *     merged, scalar fields refreshed, vault_profile preserved if
 *     already set)
 *   - Never touches profile files (that's apply-fec-committee-registry.cjs)
 *
 * Usage:
 *   node scripts/seed-fec-committee-registry.cjs          # dry-run
 *   node scripts/seed-fec-committee-registry.cjs --write  # apply
 */

const fs = require("fs")
const path = require("path")
const registry = require("./lib/fec-committee-registry.cjs")
const { buildTitleIndex } = require("./lib/relationship-edge-validator.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const CACHE_FILE = path.join(ROOT, "data", "fec-committee-cache.jsonl")
const WRITE = process.argv.includes("--write")

// Case-folded index for case-insensitive lookup
function buildCiIndex(idx) {
  const ci = new Map()
  for (const [k, v] of idx.entries()) {
    const key = k.toLowerCase()
    if (!ci.has(key)) ci.set(key, { origKey: k, entry: v })
  }
  return ci
}

const SMALL_WORDS = new Set([
  "for", "of", "the", "and", "a", "an", "to", "in", "on", "at", "or", "with", "from", "by",
])

function smartTitleCase(s) {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w, i) => {
      if (!w.trim()) return w
      if (i > 0 && SMALL_WORDS.has(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join("")
}

function stripFecSuffixes(s) {
  return s
    .replace(/,?\s*INC\.?$/i, "")
    .replace(/,?\s*LLC\.?$/i, "")
    .replace(/\s+POLITICAL ACTION COMMITTEE$/i, "")
    .replace(/\s+POLITICAL VICTORY FUND$/i, "")
    .replace(/\s+IE COMMITTEE$/i, "")
    .replace(/\s+ACTION COMMITTEE$/i, "")
    .replace(/\s+ACTION FUND$/i, "")
    .replace(/\s+ACTION$/i, "")
    .replace(/\s+PAC$/i, "")
    .replace(/\s+COMMITTEE$/i, "")
    .replace(/\s+FUND$/i, "")
    .replace(/\s+VOTES$/i, "")
    .replace(/\s*\(.+?\)/g, "") // strip parenthesized DBAs
    .replace(/\s+DBA\s+.+$/i, "")
    .trim()
}

function resolveToVault(fecName, idx, ci) {
  const tryKey = (k, method) => {
    if (idx.has(k)) {
      const entry = idx.get(k)
      const picked = Array.isArray(entry) ? entry[0] : entry
      if (picked.aliasOf) return null // don't return aliases as canonical
      return { method, matchedKey: k, entry: picked }
    }
    return null
  }
  const tryCi = (k, method) => {
    const hit = ci.get(k.toLowerCase())
    if (hit) {
      const picked = Array.isArray(hit.entry) ? hit.entry[0] : hit.entry
      if (picked.aliasOf) return null
      return { method, matchedKey: hit.origKey, entry: picked }
    }
    return null
  }

  const variants = []
  variants.push(fecName)
  variants.push(smartTitleCase(fecName))
  const stripped = stripFecSuffixes(fecName)
  if (stripped !== fecName) {
    variants.push(stripped)
    variants.push(smartTitleCase(stripped))
  }

  for (const v of variants) {
    const r = tryKey(v, "exact") || tryCi(v, "case-insensitive")
    if (r) return r
  }
  return null
}

// ─── Main ────────────────────────────────────────────────────────
function main() {
  console.log("")
  console.log("═══ seed-fec-committee-registry ═══")
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")

  if (!fs.existsSync(CACHE_FILE)) {
    console.error(`  ✗ cache file not found: ${CACHE_FILE}`)
    console.error("  run scripts/fec-committee-resolver.cjs first")
    process.exit(2)
  }

  console.log("  building title index...")
  const idx = buildTitleIndex(CONTENT_DIR)
  const ci = buildCiIndex(idx)
  console.log(`    ${idx.size} titles`)
  console.log("")

  registry.load()

  const lines = fs.readFileSync(CACHE_FILE, "utf-8").split(/\r?\n/).filter(Boolean)
  console.log(`  ${lines.length} cache entries to process`)
  console.log("")

  let mapped = 0
  let unmappedNeedsStub = 0
  let unmappedNeedsReview = 0
  let skipped = 0
  const mappedExamples = []
  const stubCandidates = []

  for (const line of lines) {
    let entry
    try {
      entry = JSON.parse(line)
    } catch {
      skipped++
      continue
    }

    const top = entry.top_results && entry.top_results[0]
    if (!top) {
      // FEC search returned no results — still track via a synthetic id
      const syntheticId = "UNRESOLVED:" + entry.query
      registry.upsert({
        committee_id: syntheticId,
        fec_name: entry.query,
        committee_type: null,
        committee_type_full: null,
        designation: null,
        designation_full: null,
        organization_type: null,
        connected_organization_name: null,
        candidate_ids: [],
        cycles: [],
        party: null,
        state: null,
        vault_profile: null,
        vault_slug: null,
        status: "unmapped-needs-review",
        aliases: [entry.query],
        source: "fec-committee-resolver",
        notes: "FEC API returned no committee match for this name",
      })
      unmappedNeedsReview++
      continue
    }

    // Attempt vault match on the FEC canonical name
    const res = resolveToVault(top.name || "", idx, ci)
    const matchedEntry = res ? res.entry : null

    const incoming = {
      committee_id: top.committee_id,
      fec_name: top.name,
      committee_type: top.committee_type,
      committee_type_full: top.committee_type_full,
      designation: top.designation,
      designation_full: top.designation_full,
      organization_type: top.organization_type,
      connected_organization_name: top.connected_organization_name || null,
      candidate_ids: top.candidate_ids || [],
      cycles: top.cycles || [],
      party: top.party,
      state: top.state,
      aliases: [entry.query, top.name].filter((x) => typeof x === "string" && x.trim()),
      source: "fec-committee-resolver",
    }

    if (matchedEntry) {
      incoming.vault_profile = res.matchedKey
      incoming.vault_slug = matchedEntry.slug || null
      incoming.status = "mapped"
      mapped++
      if (mappedExamples.length < 10) {
        mappedExamples.push(`${top.name} → ${res.matchedKey} (${res.method})`)
      }
    } else {
      incoming.vault_profile = null
      incoming.vault_slug = null
      incoming.status = "unmapped-needs-stub"
      unmappedNeedsStub++
      stubCandidates.push({ committee_id: top.committee_id, name: top.name, query: entry.query })
    }

    registry.upsert(incoming)
  }

  console.log("  summary:")
  console.log(`    mapped:                 ${mapped}`)
  console.log(`    unmapped-needs-stub:    ${unmappedNeedsStub}`)
  console.log(`    unmapped-needs-review:  ${unmappedNeedsReview}`)
  console.log(`    skipped (bad json):     ${skipped}`)
  console.log("")
  if (mappedExamples.length) {
    console.log("  mapped examples:")
    for (const e of mappedExamples) console.log(`    ✓ ${e}`)
    console.log("")
  }

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to save the registry")
    return
  }

  registry.save()
  console.log(`  ✓ wrote ${path.relative(ROOT, registry.REGISTRY_FILE)}`)
  console.log("")
}

main()
