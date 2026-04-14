#!/usr/bin/env node
/**
 * batch-gather-entity-signals.cjs — Phase 2 / Query Engine MVP
 *
 * Walks `content/Donors & Power Networks/**\/*.md`, extracts identity +
 * vault signals for every donor-ish profile, and registers one entity
 * record per profile in `data/entities.jsonl` via the entities-store.
 *
 * This is the pure-data-extraction pass. No opinions, no class tag
 * proposals. A subsequent script (`batch-propose-class-tags.cjs`, later
 * session) will read these signals and propose tags — either via a
 * heuristic baseline or via Research Claude — which David then triages
 * in Ops `/class-tags`.
 *
 * Signals extracted per entity:
 *   - Identity: name, profile_path, entity_type (from frontmatter `type`)
 *   - NAICS code (frontmatter `naics-code`)
 *   - Sector (frontmatter `sector`)
 *   - Total political spend (frontmatter `total-political-spend` or
 *     computed from relationships.jsonl monetary edges)
 *   - Top politicians funded (from relationships.jsonl monetary edges,
 *     ranked by $ then frequency)
 *   - Party breakdown of top funded politicians (if computable)
 *   - Body snippet (first 500 chars after frontmatter, stripped of HTML
 *     comments and markdown noise)
 *
 * Usage:
 *   node scripts/batch-gather-entity-signals.cjs              # dry run
 *   node scripts/batch-gather-entity-signals.cjs --write
 *   node scripts/batch-gather-entity-signals.cjs --write --dir "content/Donors & Power Networks/Agriculture"
 *   node scripts/batch-gather-entity-signals.cjs --verbose
 *
 * Safety:
 *   - Dry-run by default
 *   - Idempotent: re-running updates signals on existing records without
 *     clobbering class tags
 *   - Skips index / registry files (Donor Registry - Master Index.md, etc.)
 */

const fs = require("fs")
const path = require("path")
const store = require("./lib/entities-store.cjs")
const edges = require("./lib/relationships-store.cjs")

// ─── CLI args ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const WRITE = argv.includes("--write")
const VERBOSE = argv.includes("--verbose")
const dirFlag = argv.indexOf("--dir")
const TARGET_DIR =
  dirFlag !== -1 && argv[dirFlag + 1]
    ? path.resolve(argv[dirFlag + 1])
    : path.join(__dirname, "..", "content", "Donors & Power Networks")

// ─── Entity type mapping ───────────────────────────────────────────────

// Frontmatter `type:` → store entity_type
function mapEntityType(frontmatterType) {
  if (!frontmatterType) return "other"
  const t = frontmatterType.toLowerCase().trim()
  if (t === "donor") return "donor"
  if (t === "corporation") return "corporation"
  if (t === "pac") return "donor"
  if (t === "politician") return "politician"
  if (t === "think-tank" || t === "think tank") return "think_tank"
  if (t === "lobbying-firm" || t === "lobbying firm") return "lobbying_firm"
  if (t === "network") return "network"
  if (t === "nonprofit" || t === "501c3" || t === "501c4") return "nonprofit"
  if (t === "union" || t === "labor-union") return "union"
  return "other"
}

// ─── Frontmatter parsing ──────────────────────────────────────────────

function parseFrontmatter(text) {
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!m) return { fm: {}, body: text, fmEnd: 0 }

  const fm = {}
  const fmText = m[1]
  // Very lightweight YAML parsing — just top-level key: value pairs we care about
  for (const line of fmText.split(/\n/)) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*?)\s*$/)
    if (kv) {
      let value = kv[2]
      // Strip surrounding quotes
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      fm[kv[1]] = value
    }
  }
  return { fm, body: text.slice(m[0].length), fmEnd: m[0].length }
}

function extractBodySnippet(body, maxChars = 500) {
  let cleaned = body
    // Drop HTML comments (pipeline auto-blocks)
    .replace(/<!--[\s\S]*?-->/g, " ")
    // Drop standalone horizontal rules / section dividers
    .replace(/^-{3,}\s*$/gm, " ")
    // Drop headings
    .replace(/^#+\s.*$/gm, " ")
    // Drop markdown list markers
    .replace(/^[\s]*[-*]\s+/gm, "")
    // Drop hashtag lines (#class #energy etc)
    .replace(/^[\s]*#[\w-]+(\s+#[\w-]+)*\s*$/gm, " ")
    // Drop wikilink brackets but keep the text
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
  return cleaned.slice(0, maxChars)
}

// ─── Relationships.jsonl signal extraction ─────────────────────────────

let _edgesByFrom = null
function buildEdgeIndex() {
  if (_edgesByFrom) return _edgesByFrom
  _edgesByFrom = new Map()
  const all = edges.loadEdges()
  for (const e of all) {
    if (e.type !== "monetary") continue
    const key = e.from
    if (!_edgesByFrom.has(key)) _edgesByFrom.set(key, [])
    _edgesByFrom.get(key).push(e)
  }
  return _edgesByFrom
}

function getMonetarySignals(entityName) {
  const index = buildEdgeIndex()
  const monetary = index.get(entityName) || []
  if (!monetary.length) {
    return {
      top_politicians_funded: [],
      total_political_spend: null,
      edge_count: 0,
    }
  }

  // Group by recipient, sum amounts
  const byRecipient = new Map()
  let total = 0
  for (const e of monetary) {
    const amt = typeof e.amount === "number" ? e.amount : 0
    total += amt
    const key = e.to
    if (!byRecipient.has(key)) {
      byRecipient.set(key, { name: key, type: e.to_type, amount: 0, count: 0 })
    }
    const r = byRecipient.get(key)
    r.amount += amt
    r.count += 1
  }

  // Rank recipients by amount then frequency
  const ranked = [...byRecipient.values()].sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount
    return b.count - a.count
  })

  const top = ranked.slice(0, 10).map((r) => ({
    name: r.name,
    type: r.type,
    amount: r.amount,
    count: r.count,
  }))

  return {
    top_politicians_funded: top,
    total_political_spend: total || null,
    edge_count: monetary.length,
  }
}

// ─── Walker ────────────────────────────────────────────────────────────

function walkMarkdownFiles(rootDir, onFile) {
  const stack = [rootDir]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (_) {
      continue
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Skip index files and the master donor database xlsx stuff
        if (/index/i.test(entry.name)) continue
        if (/master\s*donor\s*database/i.test(entry.name)) continue
        if (entry.name.startsWith("_") && /index/i.test(entry.name)) continue
        onFile(full)
      }
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ batch-gather-entity-signals ═══")
  console.log(`  target:   ${TARGET_DIR}`)
  console.log(`  dry-run:  ${!WRITE}`)
  console.log(`  verbose:  ${VERBOSE}`)
  console.log("")

  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`ERROR: target directory does not exist: ${TARGET_DIR}`)
    process.exit(1)
  }

  store.loadEntities()
  const startingCount = store.countEntities()

  // Preload edge index
  buildEdgeIndex()

  const stats = {
    filesScanned: 0,
    newRegistered: 0,
    alreadyRegistered: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    withMonetary: 0,
    withoutMonetary: 0,
    byType: {},
  }

  walkMarkdownFiles(TARGET_DIR, (filePath) => {
    stats.filesScanned += 1
    let text
    try {
      text = fs.readFileSync(filePath, "utf-8")
    } catch (e) {
      stats.errors += 1
      if (VERBOSE) console.warn(`  ! unreadable: ${filePath}`)
      return
    }

    const { fm, body } = parseFrontmatter(text)

    const name = fm.title || path.basename(filePath, ".md")
    if (!name) {
      stats.skipped += 1
      return
    }

    // Normalize the profile_path to a repo-relative path for storage
    const repoRoot = path.join(__dirname, "..")
    const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/")

    const entityType = mapEntityType(fm.type)
    stats.byType[entityType] = (stats.byType[entityType] || 0) + 1

    const monetarySignals = getMonetarySignals(name)
    if (monetarySignals.edge_count > 0) stats.withMonetary += 1
    else stats.withoutMonetary += 1

    // Frontmatter-provided totals (if pipeline has already computed them)
    // take priority over edge-sum when both exist.
    const fmSpend = fm["total-political-spend"]
      ? parseInt(String(fm["total-political-spend"]).replace(/[$,]/g, ""), 10)
      : null

    const signals = {
      naics: fm["naics-code"] || fm["naics"] || null,
      sector: fm["sector"] || null,
      ein: fm["ein"] || null,
      party_breakdown: null, // v2 — needs politician party lookup
      top_politicians_funded: monetarySignals.top_politicians_funded,
      total_political_spend:
        (fmSpend && !isNaN(fmSpend) ? fmSpend : null) || monetarySignals.total_political_spend,
      edge_count: monetarySignals.edge_count,
      body_snippet: extractBodySnippet(body),
      content_readiness: fm["content-readiness"] || null,
      source_tier: fm["source-tier"] || null,
      signals_gathered_at: new Date().toISOString(),
    }

    if (WRITE) {
      try {
        // Check for existing by profile path first (most stable identifier)
        const existingByPath = store.findByProfilePath(relPath)
        if (existingByPath) {
          // Update signals only — never clobber approved class tags
          store.updateEntity(existingByPath.id, { signals })
          stats.updated += 1
          if (VERBOSE) console.log(`  ↻ ${existingByPath.id}  ${name}`)
          return
        }
        const existingByName = store.findByName(name)
        if (existingByName) {
          // Same name, different path — probably a rename. Update signals
          // AND attach the new profile_path.
          store.updateEntity(existingByName.id, { signals, profile_path: relPath })
          stats.updated += 1
          if (VERBOSE) console.log(`  ↻ ${existingByName.id}  ${name} (rename)`)
          return
        }

        const rec = store.addOrFindEntity({
          name,
          profile_path: relPath,
          entity_type: entityType,
          signals,
        })
        stats.newRegistered += 1
        if (VERBOSE) console.log(`  + ${rec.id}  ${name}  [${entityType}]`)
      } catch (e) {
        stats.errors += 1
        if (VERBOSE) console.warn(`  ! ${filePath}: ${e.message}`)
      }
    } else {
      if (VERBOSE) {
        console.log(
          `  · ${name.padEnd(50).slice(0, 50)}  [${entityType}]  edges=${monetarySignals.edge_count}  total=${
            monetarySignals.total_political_spend || "—"
          }`,
        )
      }
    }
  })

  const endingCount = store.countEntities()

  console.log("")
  console.log("═══ results ═══")
  console.log(`  files scanned:        ${stats.filesScanned}`)
  console.log(`  new registered:       ${stats.newRegistered}`)
  console.log(`  updated (existing):   ${stats.updated}`)
  console.log(`  skipped (no name):    ${stats.skipped}`)
  console.log(`  errors:               ${stats.errors}`)
  console.log("")
  console.log(`  with monetary edges:  ${stats.withMonetary}`)
  console.log(`  without edges:        ${stats.withoutMonetary}`)
  console.log("")
  console.log("  by entity_type:")
  const typeEntries = Object.entries(stats.byType).sort((a, b) => b[1] - a[1])
  for (const [k, v] of typeEntries) console.log(`    ${k.padEnd(16)} ${v}`)
  console.log("")
  console.log(
    `  store size:           ${startingCount} → ${endingCount}  (Δ ${endingCount - startingCount})`,
  )
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — no writes persisted. Re-run with --write.")
    console.log("")
  }
}

main()
