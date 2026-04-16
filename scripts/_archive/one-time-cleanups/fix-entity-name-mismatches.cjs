#!/usr/bin/env node
/**
 * fix-entity-name-mismatches.cjs — Tier 1 foundation fix
 *
 * Fixes two classes of entity name mismatches identified by
 * entity-dedup-orphan-audit.cjs:
 *
 *   1. "(Redirect)" suffix — legacy redirect-profile entities that still
 *      live in data/entities.jsonl from before batch-gather-entity-signals
 *      learned to skip them. These are orphans now. DELETE.
 *
 *   2. " Master Profile" suffix — politician records where the entity
 *      name was set from the filename (_Name Master Profile.md) instead
 *      of the frontmatter title. The wikilinks use [[Name]], not
 *      [[Name Master Profile]], so every name-based lookup misses.
 *      STRIP the suffix.
 *
 * Effect: class-tag lookups, pipeline name-match failures, and relationship
 * edge resolution all start finding these entities.
 *
 * Safe to re-run: idempotent — second run is a no-op.
 *
 * Usage:
 *   node scripts/fix-entity-name-mismatches.cjs            # dry-run
 *   node scripts/fix-entity-name-mismatches.cjs --write
 */
const fs = require("fs")
const path = require("path")

const WRITE = process.argv.includes("--write")
const STORE = path.resolve(__dirname, "..", "data", "entities.jsonl")

const lines = fs.readFileSync(STORE, "utf-8").split("\n")

// First pass: build set of existing non-Master-Profile names for collision detection.
const existingNames = new Set()
for (const line of lines) {
  if (!line.trim()) continue
  try {
    const r = JSON.parse(line)
    if (/\(Redirect\)\s*$/i.test(r.name)) continue // will be deleted
    if (/\s+Master\s+Profile\s*$/.test(r.name)) continue // will be stripped
    existingNames.add(r.name.toLowerCase())
  } catch {}
}

const out = []
let stripped = 0
let deleted = 0
let collisionSkipped = 0
const strippedRows = []
const deletedRows = []
const collisionRows = []
const becomingSet = new Set()

for (const line of lines) {
  if (!line.trim()) continue
  let rec
  try { rec = JSON.parse(line) } catch { out.push(line); continue }

  // Class 1: Redirect orphans → DELETE
  if (/\(Redirect\)\s*$/i.test(rec.name) || /\(redirect\)\s*$/i.test(rec.name)) {
    deleted++
    deletedRows.push({ id: rec.id, name: rec.name })
    continue
  }

  // Class 2: Master Profile suffix → STRIP (with collision check)
  const mpMatch = rec.name.match(/^(.+?)\s+Master\s+Profile\s*$/)
  if (mpMatch) {
    const newName = mpMatch[1].trim()
    const key = newName.toLowerCase()
    // Collision with an existing entity or another Master Profile being stripped
    if (existingNames.has(key) || becomingSet.has(key)) {
      collisionSkipped++
      collisionRows.push({ id: rec.id, oldName: rec.name, newName })
      out.push(JSON.stringify(rec)) // leave unchanged
      continue
    }
    becomingSet.add(key)
    strippedRows.push({ id: rec.id, oldName: rec.name, newName })
    rec.name = newName
    rec.last_updated = new Date().toISOString()
    stripped++
  }

  out.push(JSON.stringify(rec))
}

console.log("")
console.log("═══ fix-entity-name-mismatches ═══")
console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
console.log("")
console.log(`  Class 1 — (Redirect) orphans to DELETE: ${deleted}`)
for (const r of deletedRows) console.log(`    - ${r.id}  ${r.name}`)
console.log("")
console.log(`  Class 2 — "Master Profile" suffix to STRIP: ${stripped}`)
for (const r of strippedRows.slice(0, 10)) {
  console.log(`    ${r.id}  "${r.oldName}" → "${r.newName}"`)
}
if (strippedRows.length > 10) console.log(`    ... +${strippedRows.length - 10} more`)
console.log("")

if (WRITE) {
  fs.writeFileSync(STORE, out.join("\n") + "\n", "utf-8")
  console.log(`  ✓ Wrote ${out.length} records to ${path.relative(path.resolve(__dirname, ".."), STORE)}`)
} else {
  console.log("  DRY RUN — re-run with --write to apply")
}
