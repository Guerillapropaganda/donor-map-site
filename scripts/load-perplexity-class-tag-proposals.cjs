#!/usr/bin/env node
/**
 * load-perplexity-class-tag-proposals.cjs
 *
 * Parses a Perplexity class-tag research results markdown file and merges
 * the proposals into data/entity-class-tags-proposed.jsonl so they surface
 * in the Ops /class-tags approval queue alongside heuristic proposals.
 *
 * Expected input format: the ### "Detailed Proposals" section of a file like
 *   content/Admin Notes/perplexity-research/class-tag-research-2026-04-15-results.md
 * with one entity per "### Entity Name" header followed by bullet fields:
 *   - **capital_type:** `value`
 *   - **class_position:** `value`
 *   - **ideological_function:** `["a","b"]`
 *   - **worker_relationship:** `value`
 *   - **political_alignment:** `value` (optional — stored as extra)
 *   - **confidence:** value
 *   - **rationale:** free text with inline [citations](urls)
 *
 * Vocabulary normalization: Perplexity sometimes returns values outside
 * the locked vocab from scripts/lib/entities-schema.cjs. This loader
 * normalizes common variants (deregulation → deregulatory, carceral-state
 * → carceral-expansion, anti-union → union-hostile, christian-nationalist
 * → religious-right, white-nationalist → nativist). Unknown values are
 * dropped with a warning.
 *
 * Entity ID lookup: the prompt asked for ent_NNN IDs in results but
 * Perplexity returned entity names only. The loader looks up each name
 * against data/entities.jsonl to resolve the ID.
 *
 * Usage:
 *   node scripts/load-perplexity-class-tag-proposals.cjs <input.md>                  # dry-run
 *   node scripts/load-perplexity-class-tag-proposals.cjs <input.md> --write
 */
const fs = require("fs")
const path = require("path")
const store = require("./lib/entities-store.cjs")
const {
  CAPITAL_TYPES,
  CLASS_POSITIONS,
  IDEOLOGICAL_FUNCTIONS,
  WORKER_RELATIONSHIPS,
} = require("./lib/entities-schema.cjs")

const INPUT = process.argv[2]
const WRITE = process.argv.includes("--write")

if (!INPUT) {
  console.error("Usage: node scripts/load-perplexity-class-tag-proposals.cjs <input.md> [--write]")
  process.exit(1)
}

const REPO = path.resolve(__dirname, "..")
const PROPOSED_FILE = path.join(REPO, "data", "entity-class-tags-proposed.jsonl")

// ─── Vocabulary normalization ─────────────────────────────────────────
const CAPITAL_ALIAS = {
  "fossil": "fossil-capital",
  "extractive": "extractive-capital",
  "finance": "finance-capital",
  "rentier": "rentier-capital",
  "tech": "tech-monopoly",
  "big-tech": "tech-monopoly",
  "retail": "retail-monopoly",
  "military": "military-industrial",
  "defense": "military-industrial",
  "carceral": "carceral-capital",
  "pharma": "pharma-capital",
  "media": "media-capital",
  "agribusiness": "agribusiness-capital",
  "small": "small-capital",
  "professional": "professional-class",
  "labor": "labor-aligned",
  "dark-money": "dark-money-vehicle",
}
const IDEOLOGICAL_ALIAS = {
  "deregulation": "deregulatory",
  "deregulation-lobby": "deregulatory",
  "carceral-state": "carceral-expansion",
  "carceral": "carceral-expansion",
  "christian-nationalist": "religious-right",
  "christian-right": "religious-right",
  "white-nationalist": "nativist",
  "anti-immigration": "nativist",
  "libertarian": "libertarian-ideology",
  "libertarianism": "libertarian-ideology",
  "imperialism": "imperialist-aligned",
  "imperial": "imperialist-aligned",
  "zionist": "zionist-aligned",
  "pro-israel": "zionist-aligned",
  "tax-avoidance": "tax-avoidance-lobby",
  "voter-id": "voter-suppression",
  "progressive": "progressive-capital",
  "corporate-liberal": "progressive-capital",
  "privatization-lobby": "privatization",
  "austerity-advocacy": "austerity",
  "anti-trust": "anti-trust-defender",
  "labor-friendly": "labor-organizing",
  "labor-militant": "labor-organizing",
  "climate-justice": "movement-left",
  "environmental-justice": "movement-left",
  "dark-money": "dark-money-networked",
  // These are outside the locked vocabulary — DROPPED with warning:
  //   surveillance-state, climate-skeptical, anti-worker, tax-cut-lobby
}
const WORKER_ALIAS = {
  "anti-union": "union-hostile",
  "union-neutral": "union-neutral-employer",
  "union-tolerant": "union-neutral-employer",
  "union-friendly": "union-aligned",
  "union-controlled": "union-aligned",
  "labor-aligned": "union-aligned",
  "unionized": "union-neutral-employer",
  "neutral": "neutral",
  "worker-owned-cooperative": "worker-owned",
  "low-wage": "low-wage-extractive",
  "wage-extraction": "low-wage-extractive",
}
const CLASS_ALIAS = {
  "billionaire": "ruling-class",
  "ultra-rich": "ruling-class",
  "capitalist": "upper-bourgeois",
  "professional-managerial": "upper-bourgeois",
  "pmc": "upper-bourgeois",
  "small-bourgeoisie": "petty-bourgeois",
  "petit-bourgeois": "petty-bourgeois",
  "labor": "labor-aligned",
  "unclear": "ambiguous",
}

function normalizeEnum(value, aliasMap, lockedSet, field, warnings) {
  if (value == null || value === "") return null
  const cleaned = String(value).trim().toLowerCase().replace(/[`"]/g, "")
  if (lockedSet.has(cleaned)) return cleaned
  const aliased = aliasMap[cleaned]
  if (aliased && lockedSet.has(aliased)) return aliased
  warnings.push({ field, value: cleaned, action: "dropped (not in locked vocab)" })
  return null
}

function normalizeIdeologicalArray(raw, warnings) {
  if (!raw) return []
  // Parse the bracketed array format: ["a","b","c"]
  let items = []
  if (Array.isArray(raw)) items = raw
  else if (typeof raw === "string") {
    const arrayMatch = raw.match(/\[(.*?)\]/s)
    const body = arrayMatch ? arrayMatch[1] : raw
    items = body
      .split(",")
      .map((s) => s.trim().replace(/^["'`]|["'`]$/g, ""))
      .filter(Boolean)
  }
  const set = new Set(IDEOLOGICAL_FUNCTIONS)
  const out = []
  for (const raw of items) {
    const norm = normalizeEnum(raw, IDEOLOGICAL_ALIAS, set, "ideological_function", warnings)
    if (norm && !out.includes(norm)) out.push(norm)
  }
  return out
}

// ─── Markdown parser ──────────────────────────────────────────────────
function parseMarkdown(text) {
  const proposals = []
  const lines = text.split("\n")
  let current = null
  let inRationale = false
  let rationaleBuf = []

  for (const line of lines) {
    const header = line.match(/^###\s+(.+?)\s*$/)
    if (header) {
      if (current) {
        current.rationale = rationaleBuf.join(" ").trim()
        proposals.push(current)
      }
      const name = header[1].trim()
      // Skip non-entity headers like "## Summary Table" or "## Notes"
      if (/^(summary|notes|instructions|sources|loading|metadata)/i.test(name)) {
        current = null
        continue
      }
      current = { entity_name: name }
      inRationale = false
      rationaleBuf = []
      continue
    }
    if (!current) continue

    const field = line.match(/^-\s*\*\*(\w+):\*\*\s*(.*)$/)
    if (field) {
      const [, key, rawVal] = field
      if (key === "rationale") {
        // Rationale may span multiple lines
        inRationale = true
        rationaleBuf = [rawVal.trim()]
      } else {
        inRationale = false
        let val = rawVal.trim().replace(/^[`"']|[`"']$/g, "")
        // Pull out bracketed arrays in full
        const arrayMatch = rawVal.match(/`?(\[.*?\])`?/s)
        if (arrayMatch) val = arrayMatch[1]
        current[key] = val
      }
      continue
    }

    // Continuation line for rationale
    if (inRationale && line.trim() && !line.startsWith("###") && !line.startsWith("##") && !line.startsWith("---")) {
      rationaleBuf.push(line.trim())
    }
  }

  if (current) {
    current.rationale = rationaleBuf.join(" ").trim()
    proposals.push(current)
  }

  return proposals
}

// ─── Entity name → ID lookup ──────────────────────────────────────────
function buildNameIndex() {
  store.loadEntities()
  const entities = store.queryEntities({})
  const byName = new Map()
  for (const e of entities) {
    byName.set(e.name.toLowerCase(), e)
    // Also index without " Master Profile" suffix (already fixed but safe)
    const stripped = e.name.replace(/\s+master\s+profile\s*$/i, "").trim()
    if (stripped !== e.name) byName.set(stripped.toLowerCase(), e)
  }
  return byName
}

// ─── Main ────────────────────────────────────────────────────────────
function main() {
  console.log("")
  console.log("═══ load-perplexity-class-tag-proposals ═══")
  console.log(`  input: ${INPUT}`)
  console.log(`  mode:  ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")

  const text = fs.readFileSync(INPUT, "utf-8")
  // Auto-detect format: raw JSONL (first non-blank line starts with '{')
  // vs markdown with fenced blocks
  const firstLine = text.split("\n").find((l) => l.trim())
  const isJsonl = firstLine && firstLine.trim().startsWith("{")
  let raw
  if (isJsonl) {
    raw = text
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l) } catch { return null }
      })
      .filter(Boolean)
    console.log(`  parsed ${raw.length} entity blocks from JSONL`)
  } else {
    raw = parseMarkdown(text)
    console.log(`  parsed ${raw.length} entity blocks from markdown`)
  }

  const nameIdx = buildNameIndex()
  const capitalSet = new Set(CAPITAL_TYPES)
  const classSet = new Set(CLASS_POSITIONS)
  const workerSet = new Set(WORKER_RELATIONSHIPS)

  const proposals = []
  const unmatched = []
  const stats = { matched: 0, unmatched: 0, low: 0, medium: 0, high: 0 }
  const warnings = []

  for (const block of raw) {
    const entity = nameIdx.get(block.entity_name.toLowerCase())
    if (!entity) {
      unmatched.push(block.entity_name)
      stats.unmatched++
      continue
    }
    stats.matched++
    stats[block.confidence || "unknown"] = (stats[block.confidence || "unknown"] || 0) + 1

    const blockWarnings = []
    const capitalType = normalizeEnum(block.capital_type, CAPITAL_ALIAS, capitalSet, "capital_type", blockWarnings)
    const classPosition = normalizeEnum(block.class_position, CLASS_ALIAS, classSet, "class_position", blockWarnings)
    const workerRelationship = normalizeEnum(block.worker_relationship, WORKER_ALIAS, workerSet, "worker_relationship", blockWarnings)
    const ideologicalFunction = normalizeIdeologicalArray(block.ideological_function, blockWarnings)

    if (blockWarnings.length) warnings.push({ entity: block.entity_name, warnings: blockWarnings })

    proposals.push({
      entity_id: entity.id,
      entity_name: entity.name,
      proposed_by: "perplexity-research-2026-04-15",
      proposed_at: new Date().toISOString(),
      confidence: block.confidence || "medium",
      reasoning: block.rationale || "(no rationale provided)",
      tags: {
        capital_type: capitalType,
        secondary_capital_type: null,
        class_position: classPosition,
        ideological_function: ideologicalFunction,
        worker_relationship: workerRelationship,
        policy_stakes: [],
      },
      // Extra metadata Perplexity provided that's not in the locked schema
      extra: {
        political_alignment: block.political_alignment || null,
      },
      status: "pending",
    })
  }

  console.log("")
  console.log(`  matched:   ${stats.matched}`)
  console.log(`  unmatched: ${stats.unmatched}`)
  console.log(`  confidence: high=${stats.high || 0} medium=${stats.medium || 0} low=${stats.low || 0}`)
  console.log("")

  if (unmatched.length) {
    console.log("  Entities NOT matched to data/entities.jsonl:")
    for (const n of unmatched) console.log(`    - ${n}`)
    console.log("")
  }

  if (warnings.length) {
    console.log(`  Vocabulary normalizations / drops: ${warnings.length} entities affected`)
    for (const w of warnings.slice(0, 10)) {
      console.log(`    ${w.entity}:`)
      for (const wn of w.warnings) console.log(`      - ${wn.field}="${wn.value}" → ${wn.action}`)
    }
    if (warnings.length > 10) console.log(`    ... +${warnings.length - 10} more`)
    console.log("")
  }

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to persist proposals.")
    return
  }

  // Append to data/entity-class-tags-proposed.jsonl, removing any previous
  // records from this same proposed_by source (idempotent).
  const existing = fs.existsSync(PROPOSED_FILE)
    ? fs.readFileSync(PROPOSED_FILE, "utf-8").split("\n").filter(Boolean)
    : []
  const keep = existing.filter((line) => {
    try {
      const r = JSON.parse(line)
      return r.proposed_by !== "perplexity-research-2026-04-15"
    } catch { return true }
  })
  const out = keep.concat(proposals.map((p) => JSON.stringify(p)))
  fs.writeFileSync(PROPOSED_FILE, out.join("\n") + "\n", "utf-8")
  console.log(`  ✓ Wrote ${proposals.length} proposals to ${path.relative(REPO, PROPOSED_FILE)}`)
  console.log(`    (replaced ${existing.length - keep.length} prior perplexity-research-2026-04-15 records, kept ${keep.length} others)`)
}

main()
