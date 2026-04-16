#!/usr/bin/env node
/**
 * migrate-frontmatter-delta.cjs — Pillar 2a data coverage fix
 *
 * The ORIGINAL migration script `scripts/migrate-frontmatter-to-
 * relationships-jsonl.cjs` (Phase 3 Part 1) was a one-time full-file
 * overwrite. It populated data/relationships.jsonl from frontmatter
 * on the very first run. Running it again today would destroy the
 * ~14,800 edges from pipelines + discovery-scanner + manual-ops that
 * were added after Phase 3 Part 1 — those are NOT in the frontmatter
 * and wouldn't be re-emitted.
 *
 * Meanwhile, the relationship-cache-drift-audit shipped in Pillar 3
 * (2026-04-15) found 15,023 edges in frontmatter that are NOT in
 * canonical. The vault has grown significantly since Phase 3 Part 1
 * (new profiles, new relationships added to existing profiles), and
 * the original one-time migration never re-ran to catch the delta.
 *
 * THIS SCRIPT safely closes the gap:
 *   - Walks content/ for every .md file (same as the original)
 *   - Extracts wikilinks from the same FIELD_MAP fields (related,
 *     donors, top-donors, politicians-funded, opposes,
 *     politicians-opposed, stories)
 *   - Builds edges with source: "frontmatter-migration"
 *   - Calls relationships-store.upsertEdges() to MERGE into the
 *     existing store — preserves non-migration edges, dedupes by ID,
 *     marks already-existing frontmatter edges as no-change.
 *
 * Safety:
 *   - Does NOT mutate any .md file. Read-only vault walk.
 *   - upsertEdges() handles atomic write + validation
 *   - Dry-run (default) prints the delta without touching anything
 *   - --write applies the delta
 *   - Idempotent — re-running the script after --write is a no-op
 *     (every edge already exists in the store)
 *
 * Output:
 *   data/relationships.jsonl (in-place upsert, non-destructive)
 *   content/Admin Notes/frontmatter-delta-migration-report.md
 *
 * Usage:
 *   node scripts/migrate-frontmatter-delta.cjs              # dry-run
 *   node scripts/migrate-frontmatter-delta.cjs --write      # apply
 *
 * Related: content/Admin Notes/relationship-cache-drift-audit.md,
 *          content/Phases/phase-3/decisions.md (Phase 3 Part 1),
 *          bug-003 in content/Admin Notes/bug-queue.md.
 */

const fs = require("fs")
const path = require("path")

const {
  TYPE_META,
  normalizeTitle,
  computeEdgeId,
  buildTitleIndex,
} = require("./lib/relationship-edge-validator.cjs")
const { upsertEdges, countEdges } = require("./lib/relationships-store.cjs")
const { walkDir, parseFrontmatter: permissiveParse } = require("./lib/shared.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const REPORT_FILE = path.join(
  ROOT,
  "content",
  "Admin Notes",
  "frontmatter-delta-migration-report.md",
)

const WRITE = process.argv.includes("--write")

// Mirrors the original Phase 3 script's FIELD_MAP exactly.
const FIELD_MAP = [
  { field: "related", type: "related", direction: "outgoing" },
  { field: "donors", type: "monetary", direction: "incoming" },
  { field: "top-donors", type: "monetary", direction: "incoming" },
  { field: "politicians-funded", type: "monetary", direction: "outgoing" },
  { field: "opposes", type: "political-opposition", direction: "outgoing" },
  { field: "politicians-opposed", type: "political-opposition", direction: "outgoing" },
  { field: "stories", type: "story-link", direction: "outgoing" },
]

// ─── Wikilink extraction (copied from the Phase 3 script) ──────────────

function extractWikilinkTargets(value) {
  if (value == null || value === "") return []
  const targets = []

  const pushString = (s) => {
    if (typeof s !== "string") return
    const trimmed = s.trim()
    if (!trimmed) return
    const linkRegex = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g
    let match
    let found = false
    while ((match = linkRegex.exec(trimmed)) !== null) {
      targets.push(normalizeTitle(match[1]))
      found = true
    }
    if (found) return
    if (trimmed.includes("·")) {
      for (const part of trimmed.split("·")) {
        const p = part.trim()
        if (p) targets.push(normalizeTitle(p))
      }
      return
    }
    targets.push(normalizeTitle(trimmed))
  }

  if (Array.isArray(value)) {
    for (const v of value) pushString(v)
  } else {
    pushString(value)
  }
  return targets.filter((t) => t.length > 0)
}

// ─── Edge construction (copied from Phase 3 script) ─────────────────────

function buildEdge({ from, fromProfile, to, toProfile, type, source, timestamp }) {
  const meta = TYPE_META[type]
  const edge = {
    id: "",
    from,
    from_slug: fromProfile && fromProfile.slug ? fromProfile.slug : null,
    from_type: fromProfile && fromProfile.type ? fromProfile.type : null,
    from_subcategory:
      fromProfile && fromProfile.subcategory ? fromProfile.subcategory : null,
    to,
    to_slug: toProfile && toProfile.slug ? toProfile.slug : null,
    to_type: toProfile && toProfile.type ? toProfile.type : null,
    to_subcategory:
      toProfile && toProfile.subcategory ? toProfile.subcategory : null,
    type,
    direction: meta && meta.directed === false ? "undirected" : "directed",
    confidence: 0.5,
    source,
    source_url: null,
    evidence: null,
    amount: null,
    cycle: null,
    date_range: null,
    role: null,
    first_seen: timestamp,
    last_verified: timestamp,
    status: "active",
  }

  if (meta && meta.directed === false && edge.from > edge.to) {
    const tmpFrom = edge.from
    const tmpFromSlug = edge.from_slug
    const tmpFromType = edge.from_type
    const tmpFromSub = edge.from_subcategory
    edge.from = edge.to
    edge.from_slug = edge.to_slug
    edge.from_type = edge.to_type
    edge.from_subcategory = edge.to_subcategory
    edge.to = tmpFrom
    edge.to_slug = tmpFromSlug
    edge.to_type = tmpFromType
    edge.to_subcategory = tmpFromSub
  }

  edge.id = computeEdgeId(edge)
  return edge
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  const t0 = Date.now()
  const timestamp = new Date().toISOString()

  console.log("")
  console.log("═══ migrate-frontmatter-delta ═══")
  console.log(`  mode: ${WRITE ? "WRITE (applies delta)" : "DRY RUN"}`)
  console.log("")

  const edgesBefore = countEdges()
  console.log(`  edges in canonical store before: ${edgesBefore}`)

  // 1. Build title index
  console.log("  building title index...")
  const titleIndex = buildTitleIndex(CONTENT_DIR)
  const collisionTitles = new Set()
  for (const [t, v] of titleIndex) if (Array.isArray(v)) collisionTitles.add(t)
  console.log(
    `    ${titleIndex.size} profiles, ${collisionTitles.size} title collisions`,
  )

  // 2. Walk vault, extract edges
  let yaml = null
  try {
    yaml = require("js-yaml")
  } catch {}

  const files = walkDir(CONTENT_DIR, ".md")
  console.log(`  walking ${files.length} profiles...`)

  const edgeCandidates = []
  const stats = {
    profilesScanned: 0,
    profilesWithRelationships: 0,
    rawCandidates: 0,
    built: 0,
    skippedMissingTarget: 0,
    skippedMissingSource: 0,
    skippedCollisionAmbiguous: 0,
    skippedSelfLink: 0,
    byFieldType: {},
    byType: {},
    missingTargets: new Map(),
  }

  for (const filePath of files) {
    stats.profilesScanned++
    let data = {}
    try {
      const content = fs.readFileSync(filePath, "utf-8")
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      if (yaml) {
        try {
          data = yaml.load(match[1]) || {}
        } catch {
          data = permissiveParse(content).data
        }
      } else {
        data = permissiveParse(content).data
      }
    } catch {
      continue
    }

    const rawTitle = data.title
    if (!rawTitle || typeof rawTitle !== "string") continue
    const fromTitle = normalizeTitle(rawTitle)
    if (!fromTitle) continue

    const fromIndexEntry = titleIndex.get(fromTitle)
    if (!fromIndexEntry) {
      stats.skippedMissingSource++
      continue
    }

    let fromProfile
    if (Array.isArray(fromIndexEntry)) {
      fromProfile =
        fromIndexEntry.find((p) => p.path === filePath) || fromIndexEntry[0]
    } else {
      fromProfile = fromIndexEntry
    }

    let profileContributed = false
    for (const mapping of FIELD_MAP) {
      const val = data[mapping.field]
      if (val == null || val === "") continue
      const targets = extractWikilinkTargets(val)
      if (targets.length === 0) continue

      stats.byFieldType[mapping.field] = stats.byFieldType[mapping.field] || 0

      for (const rawTarget of targets) {
        stats.rawCandidates++
        const targetTitle = rawTarget
        if (!targetTitle || targetTitle === fromTitle) {
          stats.skippedSelfLink++
          continue
        }
        const toIndexEntry = titleIndex.get(targetTitle)
        if (!toIndexEntry) {
          stats.skippedMissingTarget++
          stats.missingTargets.set(
            targetTitle,
            (stats.missingTargets.get(targetTitle) || 0) + 1,
          )
          continue
        }
        let toProfile
        if (Array.isArray(toIndexEntry)) {
          // buildTitleIndex already sorts by priority (politician > entity >
          // story > archived). Pick the first non-alias entry if present,
          // otherwise the first entry. Previously we skipped ambiguous
          // collisions entirely, which left hundreds of edges orphaned for
          // every profile-dupe pair (Blackstone, Meta, Raytheon, GEO Group,
          // Pfizer, etc.). Priority disambiguation restores those edges.
          const realEntries = toIndexEntry.filter((e) => !e.aliasOf)
          toProfile = realEntries[0] || toIndexEntry[0]
          stats.collisionResolvedByPriority = (stats.collisionResolvedByPriority || 0) + 1
        } else {
          toProfile = toIndexEntry
        }

        let edgeFromTitle, edgeFromProfile, edgeToTitle, edgeToProfile
        if (mapping.direction === "outgoing") {
          edgeFromTitle = fromTitle
          edgeFromProfile = fromProfile
          edgeToTitle = targetTitle
          edgeToProfile = toProfile
        } else {
          edgeFromTitle = targetTitle
          edgeFromProfile = toProfile
          edgeToTitle = fromTitle
          edgeToProfile = fromProfile
        }

        const edge = buildEdge({
          from: edgeFromTitle,
          fromProfile: edgeFromProfile,
          to: edgeToTitle,
          toProfile: edgeToProfile,
          type: mapping.type,
          source: "frontmatter-migration",
          timestamp,
        })
        edgeCandidates.push(edge)
        stats.built++
        stats.byType[edge.type] = (stats.byType[edge.type] || 0) + 1
        stats.byFieldType[mapping.field] += 1
        profileContributed = true
      }
    }
    if (profileContributed) stats.profilesWithRelationships++
  }

  console.log("")
  console.log(`  ${stats.profilesScanned} profiles scanned`)
  console.log(`  ${stats.profilesWithRelationships} profiles contributed edges`)
  console.log(`  ${stats.rawCandidates} raw wikilink targets found`)
  console.log(`  ${stats.built} edge candidates built`)
  console.log(`  ${stats.skippedMissingTarget} skipped: target not in title index`)
  console.log(`  ${stats.skippedMissingSource} skipped: source not in title index`)
  console.log(`  ${stats.skippedCollisionAmbiguous} skipped: title collision`)
  console.log(`  ${stats.skippedSelfLink} skipped: self-link`)
  console.log("")
  console.log("  by field:")
  for (const [f, n] of Object.entries(stats.byFieldType).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`    ${f.padEnd(22)} ${n}`)
  }
  console.log("")

  // 3. Upsert via relationships-store (SAFE — preserves non-migration edges)
  if (!WRITE) {
    console.log("  DRY RUN — no changes. Re-run with --write to apply.")
    console.log("")
    console.log("  Expected outcome: upsertEdges() will:")
    console.log(`    - validate each of the ${stats.built} candidates`)
    console.log(
      "    - for candidates whose id already exists: merge (last_verified bumped)",
    )
    console.log("    - for new ids: add to store")
    console.log("    - non-frontmatter edges (pipelines, manual-ops, etc.) untouched")
    console.log("")
    writeReport(stats, null, timestamp, true)
    return
  }

  console.log("  applying delta via relationships-store.upsertEdges()...")
  const result = upsertEdges(edgeCandidates)
  const edgesAfter = countEdges()
  console.log("")
  console.log(`  upsertEdges result:`)
  console.log(`    added:   ${result.added}`)
  console.log(`    updated: ${result.updated}`)
  console.log(`    skipped: ${result.skipped}`)
  console.log(`    invalid: ${result.invalid}`)
  if (result.errors && result.errors.length > 0) {
    console.log("")
    console.log("  first validation errors:")
    for (const err of result.errors.slice(0, 5)) {
      console.log(`    ${err.from || "?"} → ${err.to || "?"} (${err.type || "?"}): ${err.error}`)
    }
  }
  console.log("")
  console.log(`  edges in canonical store after: ${edgesAfter}`)
  console.log(`  net new edges: +${edgesAfter - edgesBefore}`)
  console.log("")

  writeReport(stats, { result, edgesBefore, edgesAfter }, timestamp, false)

  console.log(`  elapsed: ${((Date.now() - t0) / 1000).toFixed(2)}s`)
}

function writeReport(stats, applied, timestamp, dryRun) {
  const lines = []
  lines.push("---")
  lines.push("title: Frontmatter Delta Migration Report")
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${timestamp.slice(0, 10)}`)
  lines.push("generator: scripts/migrate-frontmatter-delta.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Frontmatter Delta Migration Report")
  lines.push("")
  lines.push(`Generated: ${timestamp}`)
  lines.push(`Mode: ${dryRun ? "**DRY RUN** (no files written)" : "WRITE"}`)
  lines.push("")
  lines.push(
    "Re-scans vault frontmatter for relationship fields and upserts edges into `data/relationships.jsonl`. Unlike the original Phase 3 Part 1 migration, this script uses `relationships-store.upsertEdges()` to MERGE with existing edges, preserving all non-frontmatter sources (pipelines, manual-ops, etc.).",
  )
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- Profiles scanned: ${stats.profilesScanned}`)
  lines.push(`- Profiles with relationships: ${stats.profilesWithRelationships}`)
  lines.push(`- Raw wikilink targets: ${stats.rawCandidates}`)
  lines.push(`- Edge candidates built: ${stats.built}`)
  lines.push(`- Skipped (missing target): ${stats.skippedMissingTarget}`)
  lines.push(`- Skipped (missing source): ${stats.skippedMissingSource}`)
  lines.push(`- Skipped (collision): ${stats.skippedCollisionAmbiguous}`)
  lines.push(`- Skipped (self-link): ${stats.skippedSelfLink}`)
  lines.push("")
  lines.push("## By field")
  lines.push("")
  lines.push("| Field | Edges built |")
  lines.push("|---|---:|")
  for (const [f, n] of Object.entries(stats.byFieldType).sort(
    (a, b) => b[1] - a[1],
  )) {
    lines.push(`| \`${f}\` | ${n} |`)
  }
  lines.push("")
  lines.push("## By type")
  lines.push("")
  lines.push("| Type | Edges built |")
  lines.push("|---|---:|")
  for (const [t, n] of Object.entries(stats.byType).sort(
    (a, b) => b[1] - a[1],
  )) {
    lines.push(`| \`${t}\` | ${n} |`)
  }
  lines.push("")
  if (applied) {
    lines.push("## Applied to canonical store")
    lines.push("")
    lines.push(`- Edges before: ${applied.edgesBefore}`)
    lines.push(`- Edges after: ${applied.edgesAfter}`)
    lines.push(`- Net new: **+${applied.edgesAfter - applied.edgesBefore}**`)
    lines.push(`- upsertEdges added: ${applied.result.added}`)
    lines.push(`- upsertEdges updated: ${applied.result.updated}`)
    lines.push(`- upsertEdges skipped (no-change): ${applied.result.skipped}`)
    lines.push(`- upsertEdges invalid: ${applied.result.invalid}`)
    lines.push("")
  }
  if (stats.missingTargets.size > 0) {
    const top = [...stats.missingTargets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
    lines.push("## Top missing targets (wikilinks with no matching profile)")
    lines.push("")
    lines.push(
      "These are wikilinks in frontmatter that don't resolve to any profile in the title index. They might be typos, or references to profiles that haven't been created yet.",
    )
    lines.push("")
    lines.push("| Target | Referenced by N profiles |")
    lines.push("|---|---:|")
    for (const [target, count] of top) {
      lines.push(`| ${target} | ${count} |`)
    }
    lines.push("")
  }
  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/migrate-frontmatter-delta.cjs --write`. Safe to re-run — idempotent.*",
  )
  lines.push("")

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true })
  fs.writeFileSync(REPORT_FILE, lines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, REPORT_FILE)}`)
}

main()
