#!/usr/bin/env node
/**
 * prune-orphan-edges.cjs — remove edges whose endpoints don't exist
 *
 * Pillar 2a exposed 632 pre-existing orphan edges in data/relationships.jsonl:
 * edges whose from/to titles reference profiles that were never created in
 * the vault. Typical cause: frontmatter wikilinks to stories/analyses that
 * existed as concepts but never got written, faithfully migrated into the
 * canonical edge store. These are broken references regardless of where
 * they live — they can't render, can't resolve, and just clutter the store.
 *
 * This script walks relationships.jsonl, resolves each edge's endpoints
 * against the current title index, and removes any edge where either
 * endpoint doesn't exist.
 *
 * Safety:
 *   - Writes a .removed log of every pruned edge (line + reason) before
 *     rewriting the store, so the pruning is auditable / reversible
 *   - Atomic tmp+rename write
 *   - Dry-run by default
 *
 * Usage:
 *   node scripts/prune-orphan-edges.cjs           # dry-run
 *   node scripts/prune-orphan-edges.cjs --write   # apply
 */

const fs = require("fs")
const path = require("path")
const { buildTitleIndex } = require("./lib/relationship-edge-validator.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const EDGES_FILE = path.join(ROOT, "data", "relationships.jsonl")
const LOG_FILE = path.join(ROOT, "data", "relationships.pruned-orphans.jsonl")

const WRITE = process.argv.includes("--write")

function main() {
  console.log("")
  console.log("═══ prune-orphan-edges ═══")
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")

  console.log("  building title index...")
  const titleIndex = buildTitleIndex(CONTENT_DIR)
  console.log(`    ${titleIndex.size} unique titles`)

  const raw = fs.readFileSync(EDGES_FILE, "utf-8")
  const lines = raw.split(/\r?\n/).filter(Boolean)

  const kept = []
  const removed = []
  const missingTitles = new Map()

  for (const line of lines) {
    let edge
    try {
      edge = JSON.parse(line)
    } catch {
      kept.push(line)
      continue
    }

    const fromMissing = !titleIndex.has(edge.from)
    const toMissing = !titleIndex.has(edge.to)

    if (fromMissing || toMissing) {
      const reasons = []
      if (fromMissing) {
        reasons.push(`from:${edge.from}`)
        missingTitles.set(edge.from, (missingTitles.get(edge.from) || 0) + 1)
      }
      if (toMissing) {
        reasons.push(`to:${edge.to}`)
        missingTitles.set(edge.to, (missingTitles.get(edge.to) || 0) + 1)
      }
      removed.push({ edge, reasons })
      continue
    }

    kept.push(JSON.stringify(edge))
  }

  console.log("")
  console.log(`  ${lines.length} edges scanned`)
  console.log(`  ${kept.length} edges kept`)
  console.log(`  ${removed.length} edges pruned (orphan endpoints)`)
  console.log(`  ${missingTitles.size} unique missing titles`)
  console.log("")
  const top = [...missingTitles.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  console.log("  top missing targets:")
  for (const [t, c] of top) console.log(`    ${String(c).padStart(4)}  ${t}`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to apply")
    return
  }

  // Write removal log first (audit trail)
  const logLines = removed.map((r) =>
    JSON.stringify({ pruned_at: new Date().toISOString(), reasons: r.reasons, edge: r.edge })
  )
  fs.writeFileSync(LOG_FILE, logLines.join("\n") + "\n", "utf-8")
  console.log(`  ✓ wrote removal log → ${path.relative(ROOT, LOG_FILE)}`)

  // Atomic rewrite of the main store
  const tmp = EDGES_FILE + ".tmp-" + process.pid + "-" + Date.now()
  fs.writeFileSync(tmp, kept.join("\n") + "\n", "utf-8")
  fs.renameSync(tmp, EDGES_FILE)
  console.log(`  ✓ wrote ${kept.length} edges → ${path.relative(ROOT, EDGES_FILE)}`)
  console.log("")
}

main()
