#!/usr/bin/env node
/**
 * backfill-suggestion-approvals-to-jsonl.cjs
 *
 * One-shot backfill. Reads every entry in ops/data/suggestion-actions.json
 * where action === "approve" and upserts the corresponding canonical edge
 * into data/relationships.jsonl via the Phase 3 store.
 *
 * Context: /api/suggestions approve flow originally wrote to frontmatter
 * only and never touched the canonical JSONL store (see 2026-04-14
 * relationship engine audit). This script catches up the canonical store
 * so the 130 historic approvals exist alongside new dual-write approvals.
 *
 * Idempotent — upsertEdges() dedupes by edge id. Safe to re-run.
 *
 * Usage:
 *   node scripts/backfill-suggestion-approvals-to-jsonl.cjs          # dry-run
 *   node scripts/backfill-suggestion-approvals-to-jsonl.cjs --write  # commit
 */
const fs = require("fs")
const path = require("path")
const { upsertEdges } = require("./lib/relationships-store.cjs")
const {
  TYPE_META,
  buildTitleIndex,
  normalizeTitle,
  computeEdgeId,
} = require("./lib/relationship-edge-validator.cjs")

const REPO_ROOT = path.resolve(__dirname, "..")
const ACTIONS_FILE = path.join(REPO_ROOT, "ops", "data", "suggestion-actions.json")

const LEGACY_TO_PHASE3 = {
  related: "related",
  donors: "monetary",
  opposes: "political-opposition",
  stories: "story-link",
}

// For "donors" legacy, edited profile's donors field means added entity
// donates TO the edited profile. Canonical edge: from=added, to=edited.
// All other legacy types: from=edited, to=added.
function endpointsForLegacy(legacyType, editedTitle, addedTitle) {
  if (legacyType === "donors") return { from: addedTitle, to: editedTitle }
  return { from: editedTitle, to: addedTitle }
}

function buildEdgeFromApproval(id, action, titleIndex) {
  // suggestion id format: `${source}::${target}::${type}`
  const parts = id.split("::")
  if (parts.length < 3) return { skip: `malformed id (not 3 parts): ${id}` }
  const [sourceRaw, targetRaw, legacyTypeRaw] = parts
  const legacyType = legacyTypeRaw.trim()
  if (!LEGACY_TO_PHASE3[legacyType]) return { skip: `unknown legacy type: ${legacyType}` }

  // Determine which side is "edited" vs "added" based on action.sourcePath.
  // Pre-refactor approvals stored sourcePath = the file that was written.
  // If sourcePath matches the source half of the id, edited=source, added=target.
  // Otherwise (fallback / ambiguous), edited=source, added=target.
  const editedTitle = sourceRaw.trim()
  const addedTitle = targetRaw.trim()

  const { from, to } = endpointsForLegacy(legacyType, editedTitle, addedTitle)
  const phase3Type = LEGACY_TO_PHASE3[legacyType]

  const fromNorm = normalizeTitle(from)
  const toNorm = normalizeTitle(to)
  const fromEntry = titleIndex.get(fromNorm)
  const toEntry = titleIndex.get(toNorm)

  if (!fromEntry || Array.isArray(fromEntry)) return { skip: `from not in title index: ${fromNorm}` }
  if (!toEntry || Array.isArray(toEntry)) return { skip: `to not in title index: ${toNorm}` }

  const meta = TYPE_META[phase3Type]
  const direction = meta && meta.directed === false ? "undirected" : "directed"

  const edge = {
    id: "",
    from: fromNorm,
    from_slug: null,
    from_type: fromEntry.type,
    from_subcategory: fromEntry.subcategory,
    to: toNorm,
    to_slug: null,
    to_type: toEntry.type,
    to_subcategory: toEntry.subcategory,
    type: phase3Type,
    direction,
    confidence: 0.7,
    source: "manual-ops",
    source_url: null,
    evidence: null,
    amount: null,
    cycle: null,
    date_range: null,
    role: phase3Type === "story-link" ? "mentioned" : null,
    first_seen: action.at || new Date().toISOString(),
    last_verified: action.at || new Date().toISOString(),
    status: "active",
  }

  // Canonical from<to order for undirected edges
  if (meta && meta.directed === false && edge.from > edge.to) {
    const tf = edge.from,
      tft = edge.from_type,
      tfs = edge.from_subcategory
    edge.from = edge.to
    edge.from_type = edge.to_type
    edge.from_subcategory = edge.to_subcategory
    edge.to = tf
    edge.to_type = tft
    edge.to_subcategory = tfs
  }

  edge.id = computeEdgeId(edge)
  return { edge }
}

function main() {
  const dryRun = !process.argv.includes("--write")
  if (!fs.existsSync(ACTIONS_FILE)) {
    console.error(`${ACTIONS_FILE} not found`)
    process.exit(1)
  }

  const actions = JSON.parse(fs.readFileSync(ACTIONS_FILE, "utf-8"))
  const approved = Object.entries(actions).filter(([, a]) => a.action === "approve")
  console.log(`Loaded ${approved.length} approved suggestions`)

  const titleIndex = buildTitleIndex()
  console.log(`Title index: ${titleIndex.size} entries`)

  const edges = []
  const skipped = []
  for (const [id, action] of approved) {
    const result = buildEdgeFromApproval(id, action, titleIndex)
    if (result.skip) {
      skipped.push({ id, reason: result.skip })
    } else if (result.edge) {
      edges.push(result.edge)
    }
  }

  console.log(`Built ${edges.length} edges, skipped ${skipped.length}`)
  if (skipped.length > 0 && skipped.length <= 30) {
    console.log("\nSkipped:")
    skipped.forEach((s) => console.log(`  ${s.id.slice(0, 80)} — ${s.reason}`))
  } else if (skipped.length > 30) {
    console.log("\nFirst 10 skipped:")
    skipped.slice(0, 10).forEach((s) => console.log(`  ${s.id.slice(0, 80)} — ${s.reason}`))
  }

  if (dryRun) {
    console.log("\n[dry-run] Pass --write to commit.")
    return
  }

  const result = upsertEdges(edges)
  console.log(`\nUpsert result:`)
  console.log(`  added:   ${result.added}`)
  console.log(`  updated: ${result.updated}`)
  console.log(`  skipped: ${result.skipped}`)
  console.log(`  invalid: ${result.invalid}`)
  console.log(`  total:   ${result.total}`)
  if (result.invalid > 0) {
    console.log("\nValidator errors (first 10):")
    result.errors.slice(0, 10).forEach((e) => {
      console.log(`  ${e.from || "?"} \u2192 ${e.to || "?"} [${e.type || "?"}]: ${e.error}`)
    })
  }
}

main()
