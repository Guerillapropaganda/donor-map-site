#!/usr/bin/env node
/**
 * build-profile-search-index.cjs — emit public/static/profile-index.json
 *
 * Consumed by the ProfileSearch autocomplete component on both the
 * left sidebar and the homepage hero. One JSON with every entity
 * that has a profile_path, each tagged with readiness so the client
 * can filter public vs local views:
 *
 *   localhost           → show everything (including drafts)
 *   thedonormap.org     → only readiness ∈ {ready, data-complete, verified}
 *
 * Output row shape:
 *   { name, type, slug, readiness, sector?, party?, chamber?, state? }
 *
 * Runs inside ci-prebuild so the index is regenerated on every build.
 *
 * Usage:
 *   node scripts/build-profile-search-index.cjs
 */

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const ENT_FILE = path.join(ROOT, "data", "entities.jsonl")
// Write into quartz/static/ so Plugin.Static() copies it into
// public/static/ during the Quartz build. Writing directly into
// public/ would get wiped by Quartz's output-dir clean step.
const OUT_FILE = path.join(ROOT, "quartz", "static", "profile-index.json")
const OUT_DIR = path.dirname(OUT_FILE)

// Mirror Quartz's slug normalization so the URLs we emit here match
// what the site actually serves. Quartz replaces spaces with "-",
// "&" with "--and--", and strips leading underscores from master
// profiles (see quartz/util/path.ts). This minimal reimplementation
// covers what's needed for profile paths.
function profilePathToSlug(profilePath) {
  if (!profilePath) return null
  // Strip leading "content/" and trailing ".md"
  let p = profilePath.replace(/^content\//, "").replace(/\.md$/, "")
  // Replace special chars used in path
  p = p.replace(/&/g, "--and--").replace(/\s+/g, "-")
  return "/" + p
}

const SEARCHABLE_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

const lines = fs.readFileSync(ENT_FILE, "utf-8").split(/\r?\n/)
const rows = []

for (const line of lines) {
  if (!line.trim()) continue
  let e
  try { e = JSON.parse(line) } catch { continue }
  if (!e.entity_type || !SEARCHABLE_TYPES.has(e.entity_type)) continue
  if (!e.profile_path) continue
  const slug = profilePathToSlug(e.profile_path)
  if (!slug) continue

  const s = e.signals || {}
  const row = {
    name: e.name,
    type: e.entity_type,
    slug,
    readiness: s.content_readiness || "raw",
  }
  if (s.sector) row.sector = s.sector
  if (s.party) row.party = s.party
  if (s.chamber) row.chamber = s.chamber
  if (s.state_abbr || s.state) row.state = s.state_abbr || s.state
  rows.push(row)
}

// Sort: alphabetical — lets prefix search on the client work with
// a single binary-search-ish scan. Not strictly required but cheap.
rows.sort((a, b) => a.name.localeCompare(b.name))

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify({ generated_at: new Date().toISOString(), count: rows.length, entries: rows }))

const byReadiness = new Map()
const byType = new Map()
for (const r of rows) {
  byReadiness.set(r.readiness, (byReadiness.get(r.readiness) || 0) + 1)
  byType.set(r.type, (byType.get(r.type) || 0) + 1)
}
console.log(`profile-index: ${rows.length} entries → ${OUT_FILE}`)
console.log("  by type:", [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", "))
console.log("  by readiness:", [...byReadiness.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(", "))
