#!/usr/bin/env node
/**
 * renormalize-edge-types.cjs — fix stale type denormalization on edges
 *
 * data/relationships.jsonl stores `from_type` / `to_type` /
 * `from_subcategory` / `to_subcategory` as DENORMALIZED copies of
 * the current profile type at edge creation time. Over time, profile
 * types shift (e.g. "corporation" → "entity", "sub-note" → "meta"),
 * but edges never got their denormalized copies refreshed.
 *
 * Pillar 2a (frontmatter delta migration, 2026-04-15) triggered the
 * relationship-edge-sentinel pre-commit hook to re-validate every
 * edge, which exposed 22,474 edges with stale denormalization. The
 * sentinel correctly refused the commit.
 *
 * This script walks the canonical edge store, looks up each edge's
 * from/to titles in the current title index (built by
 * relationship-edge-validator.cjs buildTitleIndex), and rewrites the
 * denormalized type + subcategory fields from the index.
 *
 * Safety:
 *   - Does NOT mutate profile .md files
 *   - Writes atomically to data/relationships.jsonl via tmp+rename
 *   - Dry-run by default
 *   - Reports count of edges changed
 *   - Idempotent — re-running is a no-op once store is in sync
 *
 * Usage:
 *   node scripts/renormalize-edge-types.cjs              # dry-run
 *   node scripts/renormalize-edge-types.cjs --write      # apply
 */

const fs = require("fs")
const path = require("path")

const { buildTitleIndex } = require("./lib/relationship-edge-validator.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const EDGES_FILE = path.join(ROOT, "data", "relationships.jsonl")

const WRITE = process.argv.includes("--write")

function main() {
  console.log("")
  console.log("═══ renormalize-edge-types ═══")
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")

  // 1. Build current title index
  console.log("  building title index...")
  const titleIndex = buildTitleIndex(CONTENT_DIR)
  console.log(`    ${titleIndex.size} unique titles`)

  // Helper to resolve a title → a single profile entry (handle collisions)
  function resolve(title) {
    if (!title) return null
    const entry = titleIndex.get(title)
    if (!entry) return null
    if (Array.isArray(entry)) {
      // Collision — take first (same strategy as the original migration)
      return entry[0]
    }
    return entry
  }

  // 2. Walk edges, compute corrections
  if (!fs.existsSync(EDGES_FILE)) {
    console.log(`  ERROR: ${EDGES_FILE} not found`)
    process.exit(2)
  }
  const raw = fs.readFileSync(EDGES_FILE, "utf-8")
  const lines = raw.split(/\r?\n/).filter(Boolean)

  let changed = 0
  let missingFrom = 0
  let missingTo = 0
  const updatedLines = []
  const changeTypes = {
    from_type: 0,
    to_type: 0,
    from_subcategory: 0,
    to_subcategory: 0,
  }

  for (const line of lines) {
    let edge
    try {
      edge = JSON.parse(line)
    } catch {
      updatedLines.push(line)
      continue
    }

    const fromEntry = resolve(edge.from)
    const toEntry = resolve(edge.to)

    if (!fromEntry) missingFrom++
    if (!toEntry) missingTo++

    let edgeChanged = false

    if (fromEntry) {
      if (fromEntry.type && edge.from_type !== fromEntry.type) {
        edge.from_type = fromEntry.type
        edgeChanged = true
        changeTypes.from_type++
      }
      const fromSub = fromEntry.subcategory || null
      if (edge.from_subcategory !== fromSub) {
        edge.from_subcategory = fromSub
        edgeChanged = true
        changeTypes.from_subcategory++
      }
    }

    if (toEntry) {
      if (toEntry.type && edge.to_type !== toEntry.type) {
        edge.to_type = toEntry.type
        edgeChanged = true
        changeTypes.to_type++
      }
      const toSub = toEntry.subcategory || null
      if (edge.to_subcategory !== toSub) {
        edge.to_subcategory = toSub
        edgeChanged = true
        changeTypes.to_subcategory++
      }
    }

    if (edgeChanged) changed++
    updatedLines.push(JSON.stringify(edge))
  }

  console.log("")
  console.log(`  ${lines.length} edges scanned`)
  console.log(`  ${changed} edges would be updated`)
  console.log(`    from_type:        ${changeTypes.from_type}`)
  console.log(`    to_type:          ${changeTypes.to_type}`)
  console.log(`    from_subcategory: ${changeTypes.from_subcategory}`)
  console.log(`    to_subcategory:   ${changeTypes.to_subcategory}`)
  console.log(`  ${missingFrom} edges have from-title not in title index`)
  console.log(`  ${missingTo} edges have to-title not in title index`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to apply")
    return
  }

  // 3. Atomic write
  const tmp = EDGES_FILE + ".tmp-" + process.pid + "-" + Date.now()
  fs.writeFileSync(tmp, updatedLines.join("\n") + "\n", "utf-8")
  fs.renameSync(tmp, EDGES_FILE)
  console.log(`  ✓ wrote ${updatedLines.length} edges → ${path.relative(ROOT, EDGES_FILE)}`)
  console.log("")
}

main()
