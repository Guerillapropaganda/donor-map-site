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
const DEFAULT_DIRS = [
  path.join(__dirname, "..", "content", "Donors & Power Networks"),
  path.join(__dirname, "..", "content", "Politicians"),
]
const TARGET_DIRS =
  dirFlag !== -1 && argv[dirFlag + 1]
    ? [path.resolve(argv[dirFlag + 1])]
    : DEFAULT_DIRS
const POLITICIANS_ONLY = argv.includes("--politicians")
const DONORS_ONLY = argv.includes("--donors")

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
let _edgesByTo = null
function buildEdgeIndex() {
  if (_edgesByFrom) return { byFrom: _edgesByFrom, byTo: _edgesByTo }
  _edgesByFrom = new Map()
  _edgesByTo = new Map()
  const all = edges.loadEdges()
  for (const e of all) {
    if (e.type !== "monetary") continue
    const fromKey = e.from
    if (!_edgesByFrom.has(fromKey)) _edgesByFrom.set(fromKey, [])
    _edgesByFrom.get(fromKey).push(e)
    const toKey = e.to
    if (!_edgesByTo.has(toKey)) _edgesByTo.set(toKey, [])
    _edgesByTo.get(toKey).push(e)
  }
  return { byFrom: _edgesByFrom, byTo: _edgesByTo }
}

// Donor-shape: who did THIS entity fund? (outgoing edges)
function getDonorMonetarySignals(entityName) {
  const { byFrom } = buildEdgeIndex()
  const monetary = byFrom.get(entityName) || []
  if (!monetary.length) {
    return {
      top_politicians_funded: [],
      total_political_spend: null,
      edge_count: 0,
    }
  }

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

// Politician-shape: who funded THIS entity? (incoming edges)
function getPoliticianMonetarySignals(entityName) {
  const { byTo } = buildEdgeIndex()
  const monetary = byTo.get(entityName) || []
  if (!monetary.length) {
    return {
      top_donors: [],
      total_received: null,
      edge_count: 0,
    }
  }

  const byFunder = new Map()
  let total = 0
  for (const e of monetary) {
    const amt = typeof e.amount === "number" ? e.amount : 0
    total += amt
    const key = e.from
    if (!byFunder.has(key)) {
      byFunder.set(key, { name: key, type: e.from_type, amount: 0, count: 0 })
    }
    const r = byFunder.get(key)
    r.amount += amt
    r.count += 1
  }

  const ranked = [...byFunder.values()].sort((a, b) => {
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
    top_donors: top,
    total_received: total || null,
    edge_count: monetary.length,
  }
}

// ─── Walker ────────────────────────────────────────────────────────────

function walkMarkdownFiles(rootDir, onFile, opts = {}) {
  const masterOnly = !!opts.masterOnly
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
        // When masterOnly is set, only process _Name Master Profile.md files
        // (used for politicians to avoid pulling in every sub-note as an entity)
        if (masterOnly && !/^_.*master\s+profile\.md$/i.test(entry.name)) continue
        onFile(full)
      }
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────

function processFile(filePath, stats) {
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

  // Skip files that aren't real entities: README files, redirects, and
  // anything explicitly marked as reference/documentation. These end up
  // as garbage entries in the store with broken sector values.
  if (/^_?readme/i.test(path.basename(filePath))) {
    stats.skipped += 1
    return
  }
  if (fm.type === "reference" || fm.type === "redirect") {
    stats.skipped += 1
    return
  }
  if (fm["editorial-status"] === "redirect") {
    stats.skipped += 1
    return
  }
  // Title ending in "(Redirect)" is the existing redirect-file convention
  if (typeof name === "string" && /\(redirect\)$/i.test(name.trim())) {
    stats.skipped += 1
    return
  }

  // Normalize the profile_path to a repo-relative path for storage
  const repoRoot = path.join(__dirname, "..")
  const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/")

  const entityType = mapEntityType(fm.type)
  stats.byType[entityType] = (stats.byType[entityType] || 0) + 1

  // Branch signal extraction by shape
  let signals
  if (entityType === "politician") {
    const monetary = getPoliticianMonetarySignals(name)
    if (monetary.edge_count > 0) stats.withMonetary += 1
    else stats.withoutMonetary += 1

    // Politician-specific frontmatter signals
    const fmTotal = fm["total-received"]
      ? parseInt(String(fm["total-received"]).replace(/[$,]/g, ""), 10)
      : null

    // top-donors: multi-line YAML list leaked into our simple parser — we
    // grep the raw frontmatter text instead
    const fmTopDonors = extractYamlList(text, "top-donors")
    const fmCommittees = extractYamlList(text, "committees")
    const fmSourceTypes = extractYamlList(text, "source-types")

    signals = {
      // Politician identity
      bioguide_id: fm["bioguide-id"] || null,
      party: fm["party"] || null,
      chamber: fm["chamber"] || null,
      state: fm["state"] || null,
      state_abbr: fm["state-abbr"] || null,
      fec_candidate_id: fm["fec-candidate-id"] || null,
      // Financial signals (politicians RECEIVE money)
      top_donors: monetary.top_donors,
      fm_top_donors: fmTopDonors,
      total_received:
        (fmTotal && !isNaN(fmTotal) ? fmTotal : null) || monetary.total_received,
      edge_count: monetary.edge_count,
      // Committees + legislative signals
      committees: fmCommittees,
      // Editorial metadata
      source_types: fmSourceTypes,
      content_readiness: fm["content-readiness"] || null,
      source_tier: fm["source-tier"] || null,
      body_snippet: extractBodySnippet(body),
      signals_gathered_at: new Date().toISOString(),
    }
  } else {
    // Donor-shape
    const monetary = getDonorMonetarySignals(name)
    if (monetary.edge_count > 0) stats.withMonetary += 1
    else stats.withoutMonetary += 1

    const fmSpend = fm["total-political-spend"]
      ? parseInt(String(fm["total-political-spend"]).replace(/[$,]/g, ""), 10)
      : null

    signals = {
      naics: fm["naics-code"] || fm["naics"] || null,
      sector: fm["sector"] || null,
      ein: fm["ein"] || null,
      party_breakdown: null,
      top_politicians_funded: monetary.top_politicians_funded,
      total_political_spend:
        (fmSpend && !isNaN(fmSpend) ? fmSpend : null) || monetary.total_political_spend,
      edge_count: monetary.edge_count,
      body_snippet: extractBodySnippet(body),
      content_readiness: fm["content-readiness"] || null,
      source_tier: fm["source-tier"] || null,
      signals_gathered_at: new Date().toISOString(),
    }
  }

  if (WRITE) {
    try {
      const existingByPath = store.findByProfilePath(relPath)
      if (existingByPath) {
        store.updateEntity(existingByPath.id, { signals })
        stats.updated += 1
        if (VERBOSE) console.log(`  ↻ ${existingByPath.id}  ${name}`)
        return
      }
      const existingByName = store.findByName(name)
      if (existingByName) {
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
      const edgeCount = signals.edge_count
      const total = signals.total_political_spend ?? signals.total_received ?? "—"
      console.log(
        `  · ${name.padEnd(50).slice(0, 50)}  [${entityType}]  edges=${edgeCount}  total=${total}`,
      )
    }
  }
}

// Extract a multi-line YAML list from raw frontmatter text. Handles the
// common pattern:
//   key:
//     - "value 1"
//     - "value 2"
// Returns an array of unquoted strings, or [] if not found.
function extractYamlList(fullText, key) {
  const m = fullText.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!m) return []
  const fmBlock = m[1]
  const lines = fmBlock.split(/\n/)
  const out = []
  let inList = false
  for (const line of lines) {
    if (new RegExp(`^${key}:\\s*$`).test(line)) {
      inList = true
      continue
    }
    if (inList) {
      const item = line.match(/^\s*-\s*["']?(.+?)["']?\s*$/)
      if (item) {
        out.push(item[1])
      } else if (/^\w[\w-]*:/.test(line)) {
        // Hit the next key, stop
        break
      }
    }
  }
  return out
}

function main() {
  console.log("")
  console.log("═══ batch-gather-entity-signals ═══")
  console.log(`  targets:  ${TARGET_DIRS.length}`)
  for (const d of TARGET_DIRS) console.log(`    - ${d}`)
  console.log(`  dry-run:  ${!WRITE}`)
  console.log(`  verbose:  ${VERBOSE}`)
  console.log("")

  store.loadEntities()
  const startingCount = store.countEntities()
  buildEdgeIndex()

  const stats = {
    filesScanned: 0,
    newRegistered: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    withMonetary: 0,
    withoutMonetary: 0,
    byType: {},
  }

  for (const dir of TARGET_DIRS) {
    if (!fs.existsSync(dir)) {
      console.warn(`  ! missing: ${dir}`)
      continue
    }
    // For the politicians tree, only process master profiles (skip sub-notes)
    const isPoliticians = /Politicians$/i.test(dir) || dir.includes("/Politicians/")
    if (DONORS_ONLY && isPoliticians) continue
    if (POLITICIANS_ONLY && !isPoliticians) continue

    walkMarkdownFiles(
      dir,
      (filePath) => {
        stats.filesScanned += 1
        processFile(filePath, stats)
      },
      { masterOnly: isPoliticians },
    )
  }

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
