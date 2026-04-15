#!/usr/bin/env node
/**
 * batch-propose-class-tags-heuristic.cjs — Phase 2 / Query Engine MVP
 *
 * Walks data/entities.jsonl, reads the signals gathered by
 * batch-gather-entity-signals.cjs, and produces a first-pass class tag
 * proposal for each donor entity using deterministic heuristics based
 * on frontmatter + edge data.
 *
 * This is a v1 "dumb-but-defensible" proposer. Research Claude (or a
 * future Anthropic-SDK-backed proposer) will improve on these baselines
 * in a later pass. The point is to give David something to review and
 * approve immediately rather than waiting for a fancier pipeline.
 *
 * Heuristics used (donor-shape only — politicians stay null until a
 * better signal source exists):
 *   1. capital_type from `sector` field via SECTOR_MAP
 *   2. secondary_capital_type from fossil/retail/tech overlap heuristics
 *   3. class_position from `total_political_spend` magnitude
 *   4. worker_relationship from body_snippet keyword scan
 *   5. ideological_function from body_snippet keyword scan (multi-select)
 *   6. policy_stakes — left empty in v1, requires per-entity manual work
 *
 * Each proposal carries:
 *   - entity_id, entity_name
 *   - proposed_by: "heuristic-v1"
 *   - proposed_at: ISO timestamp
 *   - confidence: high | medium | low (based on how many signals matched)
 *   - reasoning: human-readable explanation of which heuristics fired
 *   - tags: { capital_type, ... }
 *   - status: "pending"
 *
 * Usage:
 *   node scripts/batch-propose-class-tags-heuristic.cjs              # dry-run
 *   node scripts/batch-propose-class-tags-heuristic.cjs --write
 *   node scripts/batch-propose-class-tags-heuristic.cjs --write --verbose
 *   node scripts/batch-propose-class-tags-heuristic.cjs --entity-id ent_000042
 *
 * Output: data/entity-class-tags-proposed.jsonl (append-only)
 */

const fs = require("fs")
const path = require("path")
const store = require("./lib/entities-store.cjs")
const { CAPITAL_TYPES, IDEOLOGICAL_FUNCTIONS, WORKER_RELATIONSHIPS } = require("./lib/entities-schema.cjs")

// ─── CLI args ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const WRITE = argv.includes("--write")
const VERBOSE = argv.includes("--verbose")
const entityFlag = argv.indexOf("--entity-id")
const SINGLE_ENTITY = entityFlag !== -1 && argv[entityFlag + 1] ? argv[entityFlag + 1] : null

const PROPOSED_FILE = path.join(__dirname, "..", "data", "entity-class-tags-proposed.jsonl")

// ─── Sector → capital_type mapping ─────────────────────────────────────

// Order matters: most specific first. Uses substring match on lowercased
// sector field, so "Energy & Utilities" matches "energy" and gets
// fossil-capital.
const SECTOR_MAP = [
  { match: ["fossil", "oil", "gas ", "gas and", "petroleum", "coal"], type: "fossil-capital" },
  { match: ["energy & utilities", "energy &", "energy and", "energy utilities", "utility", "power company"], type: "fossil-capital" },
  { match: ["energy"], type: "fossil-capital" },
  { match: ["agriculture", "agribusiness", "farm bureau", "factory farm"], type: "agribusiness-capital" },
  { match: ["pharma", "drug company", "pbm ", "health insurance", "healthcare industry"], type: "pharma-capital" },
  { match: ["healthcare"], type: "pharma-capital" },
  { match: ["defense", "weapons", "military contractor", "intelligence", "surveillance state"], type: "military-industrial" },
  { match: ["carceral", "prison", "private prison", "bail bond", "immigration detention"], type: "carceral-capital" },
  { match: ["media", "entertainment", "publishing", "news corp"], type: "media-capital" },
  { match: ["real estate", "landlord", "reit", "real-estate"], type: "rentier-capital" },
  { match: ["finance", "financial", "hedge fund", "private equity", "investment bank", "asset manager", "banking", "wall street"], type: "finance-capital" },
  { match: ["technology", "tech ", "big tech", "platform", "silicon valley"], type: "tech-monopoly" },
  { match: ["retail", "logistics", "walmart", "e-commerce", "amazon"], type: "retail-monopoly" },
  { match: ["labor union", "labor unions", "union ", "afl-cio", "seiu"], type: "labor-aligned" },
  { match: ["dark money", "donor club", "501(c)(4)", "donor-advised fund", "daf"], type: "dark-money-vehicle" },
  { match: ["mining", "extractive", "timber", "commodity"], type: "extractive-capital" },
  { match: ["small business", "local business"], type: "small-capital" },
  { match: ["legal", "law firm", "professional services", "trial lawyer"], type: "professional-class" },
  { match: ["gig economy", "platform labor"], type: "tech-monopoly" },
  // "Foreign" category is NOT a capital_type — those entities get
  // imperialist-aligned as an ideological_function instead (handled via
  // the body-snippet keyword scan, or manually). Leave capital_type null.
]

// Sectors that explicitly imply an ideological_function rather than a
// capital_type (so we can still capture the signal without mis-mapping
// the primary field).
const SECTOR_IDEOLOGICAL_BONUS = [
  { match: ["foreign", "israel lobby"], function: "imperialist-aligned" },
  { match: ["israel lobby"], function: "zionist-aligned" },
  { match: ["dark money"], function: "dark-money-networked" },
  { match: ["carceral state", "private prison"], function: "carceral-expansion" },
]

function ideologicalFromSector(sector) {
  if (!sector) return []
  const s = sector.toLowerCase()
  const out = []
  for (const rule of SECTOR_IDEOLOGICAL_BONUS) {
    for (const needle of rule.match) {
      if (s.includes(needle)) {
        if (!out.includes(rule.function)) out.push(rule.function)
      }
    }
  }
  return out
}

function guessCapitalType(sector) {
  if (!sector) return null
  const s = sector.toLowerCase()
  for (const rule of SECTOR_MAP) {
    for (const needle of rule.match) {
      if (s.includes(needle)) return rule.type
    }
  }
  return null
}

// ─── Class position from total spend ──────────────────────────────────

function guessClassPosition(totalSpend, capitalType) {
  // Capital type short-circuits: labor-aligned and small-capital map to
  // their own class positions regardless of dollar magnitude. A nurses
  // union spending $20M is still labor-aligned, not ruling-class.
  if (capitalType === "labor-aligned") return "labor-aligned"
  if (capitalType === "small-capital") return "petty-bourgeois"
  if (capitalType === "professional-class") return "petty-bourgeois"

  if (!totalSpend || typeof totalSpend !== "number") return null
  if (totalSpend >= 10_000_000) return "ruling-class"
  if (totalSpend >= 1_000_000) return "upper-bourgeois"
  if (totalSpend > 0) return "petty-bourgeois"
  return null
}

// ─── Keyword-based worker + ideological heuristics ────────────────────

const WORKER_KEYWORDS = {
  "union-busting": [
    "union-bust",
    "anti-union",
    "fought unionization",
    "union avoidance",
    "broke the union",
    "opposed unionization",
    "blocked union",
    "busted the union",
  ],
  "union-hostile": ["anti-labor", "against unions", "right-to-work"],
  "union-aligned": ["pro-union", "labor aligned", "union-backed", "worker power", "unionization drive"],
  "worker-owned": ["worker-owned", "co-op", "cooperative"],
}

const IDEOLOGICAL_KEYWORDS = {
  "climate-denial": ["climate denial", "denies climate", "oppose climate", "anti-climate"],
  "deregulatory": ["deregulation", "rollback regulation", "oppose regulation", "deregulatory"],
  "libertarian-ideology": ["libertarian", "mercatus", "cato institute", "reason foundation"],
  "religious-right": ["christian nationalist", "religious right", "evangelical right"],
  "carceral-expansion": ["tough on crime", "mandatory minimum", "expand policing", "expand prisons"],
  "imperialist-aligned": ["hawkish foreign", "interventionist", "regime change", "foreign military"],
  "zionist-aligned": ["israel lobby", "aipac", "anti-bds", "pro-israel"],
  "nativist": ["anti-immigrant", "border wall", "build the wall", "deport"],
  "voter-suppression": ["voter suppression", "voter id", "purge voter", "restrict voting"],
  "privatization": ["privatize", "privatization", "school choice", "charter school"],
  "austerity": ["debt ceiling", "austerity", "balanced budget", "cut social spending"],
  "anti-trust-defender": ["oppose antitrust", "antitrust exemption"],
  "tax-avoidance-lobby": ["carried interest", "estate tax repeal", "offshore", "tax shelter"],
  "dark-money-networked": ["donors trust", "leonard leo", "concord fund", "bradley foundation", "koch network"],
  "progressive-capital": ["dei ", "diversity equity", "esg ", "green-washing", "pink-washing"],
  "labor-organizing": ["unionization drive", "labor movement", "worker organizing"],
  "electoral-left": ["progressive democrat", "squad ", "democratic socialist"],
  "movement-left": ["abolition", "climate justice", "tenant organizing", "mutual aid"],
  "union-busting": [], // already captured under worker
  "astroturf": ["astroturf", "fake grassroots", "phony grassroots"],
}

function keywordScan(snippet, mapping) {
  if (!snippet) return []
  const lower = snippet.toLowerCase()
  const hits = []
  for (const [tag, patterns] of Object.entries(mapping)) {
    for (const p of patterns) {
      if (lower.includes(p)) {
        hits.push(tag)
        break
      }
    }
  }
  return hits
}

function guessWorkerRelationship(snippet) {
  const hits = keywordScan(snippet, WORKER_KEYWORDS)
  // Priority: union-busting > union-hostile > union-aligned > worker-owned
  const priority = ["union-busting", "union-hostile", "worker-owned", "union-aligned"]
  for (const p of priority) {
    if (hits.includes(p)) return p
  }
  return null
}

function guessIdeologicalFunction(snippet) {
  const hits = keywordScan(snippet, IDEOLOGICAL_KEYWORDS)
  // Dedupe + filter to the locked vocabulary
  return [...new Set(hits)].filter((h) => IDEOLOGICAL_FUNCTIONS.includes(h))
}

// ─── Confidence scoring ────────────────────────────────────────────────

function scoreConfidence(tags, signals) {
  let score = 0
  if (tags.capital_type) score += 2
  if (tags.class_position) score += 1
  if (tags.worker_relationship) score += 1
  if (tags.ideological_function && tags.ideological_function.length) score += tags.ideological_function.length
  if (signals.edge_count > 5) score += 1
  if (signals.total_political_spend && signals.total_political_spend > 1_000_000) score += 1

  if (score >= 5) return "high"
  if (score >= 3) return "medium"
  return "low"
}

// ─── Proposal generation ──────────────────────────────────────────────

function proposeForEntity(entity) {
  // Donor-shape only in v1
  if (entity.entity_type === "politician") {
    return null
  }

  const signals = entity.signals || {}
  const reasoning = []

  const capitalType = guessCapitalType(signals.sector)
  if (capitalType) reasoning.push(`sector="${signals.sector}" → capital_type=${capitalType}`)

  const classPosition = guessClassPosition(signals.total_political_spend, capitalType)
  if (classPosition) {
    if (capitalType === "labor-aligned") {
      reasoning.push(`capital_type=labor-aligned → class_position=labor-aligned`)
    } else if (capitalType === "small-capital" || capitalType === "professional-class") {
      reasoning.push(`capital_type=${capitalType} → class_position=petty-bourgeois`)
    } else {
      reasoning.push(
        `total_political_spend=$${(signals.total_political_spend || 0).toLocaleString()} → class_position=${classPosition}`,
      )
    }
  }

  const workerRelationship = guessWorkerRelationship(signals.body_snippet)
  if (workerRelationship) reasoning.push(`body snippet keyword → worker_relationship=${workerRelationship}`)

  const ideologicalFromBody = guessIdeologicalFunction(signals.body_snippet)
  const ideologicalFromSec = ideologicalFromSector(signals.sector)
  const ideologicalFunction = [...new Set([...ideologicalFromBody, ...ideologicalFromSec])].filter((h) =>
    IDEOLOGICAL_FUNCTIONS.includes(h),
  )
  if (ideologicalFromBody.length)
    reasoning.push(`body snippet keywords → ideological_function=[${ideologicalFromBody.join(", ")}]`)
  if (ideologicalFromSec.length)
    reasoning.push(`sector="${signals.sector}" → ideological_function=[${ideologicalFromSec.join(", ")}]`)

  // Skip entities with zero matched heuristics — no point proposing "null for everything"
  if (!capitalType && !classPosition && !workerRelationship && ideologicalFunction.length === 0) {
    return null
  }

  const tags = {
    capital_type: capitalType,
    secondary_capital_type: null,
    class_position: classPosition,
    ideological_function: ideologicalFunction,
    worker_relationship: workerRelationship,
    policy_stakes: [], // not heuristic'd in v1
  }

  const confidence = scoreConfidence(tags, signals)

  return {
    entity_id: entity.id,
    entity_name: entity.name,
    proposed_by: "heuristic-v1",
    proposed_at: new Date().toISOString(),
    confidence,
    reasoning: reasoning.join("; "),
    tags,
    status: "pending",
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ batch-propose-class-tags-heuristic ═══")
  console.log(`  dry-run:     ${!WRITE}`)
  console.log(`  verbose:     ${VERBOSE}`)
  console.log(`  output:      ${PROPOSED_FILE}`)
  if (SINGLE_ENTITY) console.log(`  entity_id:   ${SINGLE_ENTITY}`)
  console.log("")

  store.loadEntities()

  const targets = SINGLE_ENTITY
    ? [store.getEntity(SINGLE_ENTITY)].filter(Boolean)
    : store.queryEntities({}).filter((e) => e.entity_type !== "politician")

  console.log(`  ${targets.length} donor/corporation entities to process`)
  console.log("")

  const stats = {
    processed: 0,
    proposed: 0,
    skipped: 0,
    byConfidence: { high: 0, medium: 0, low: 0 },
    byCapitalType: {},
    byClassPosition: {},
  }

  const proposals = []
  for (const entity of targets) {
    stats.processed += 1
    const proposal = proposeForEntity(entity)
    if (!proposal) {
      stats.skipped += 1
      continue
    }
    stats.proposed += 1
    stats.byConfidence[proposal.confidence] = (stats.byConfidence[proposal.confidence] || 0) + 1
    if (proposal.tags.capital_type)
      stats.byCapitalType[proposal.tags.capital_type] = (stats.byCapitalType[proposal.tags.capital_type] || 0) + 1
    if (proposal.tags.class_position)
      stats.byClassPosition[proposal.tags.class_position] = (stats.byClassPosition[proposal.tags.class_position] || 0) + 1

    proposals.push(proposal)

    if (VERBOSE) {
      console.log(
        `  ${proposal.confidence.padEnd(6)} ${proposal.entity_id}  ${entity.name.padEnd(40).slice(0, 40)}  ${proposal.tags.capital_type ?? "—"}  ${proposal.tags.class_position ?? "—"}`,
      )
    }
  }

  if (WRITE) {
    // Append-only: load existing, merge by entity_id (newest wins)
    let existing = []
    if (fs.existsSync(PROPOSED_FILE)) {
      for (const line of fs.readFileSync(PROPOSED_FILE, "utf-8").split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          existing.push(JSON.parse(trimmed))
        } catch (_) {}
      }
    }
    // Drop prior heuristic-v1 proposals for the same entity so this run supersedes
    const preservedIds = new Set(proposals.map((p) => p.entity_id))
    const kept = existing.filter(
      (p) => !(preservedIds.has(p.entity_id) && p.proposed_by === "heuristic-v1"),
    )
    const merged = [...kept, ...proposals]

    const out = merged.map((r) => JSON.stringify(r)).join("\n") + "\n"
    const tmp = PROPOSED_FILE + ".tmp"
    fs.writeFileSync(tmp, out, "utf-8")
    fs.renameSync(tmp, PROPOSED_FILE)
  }

  console.log("")
  console.log("═══ results ═══")
  console.log(`  entities processed:   ${stats.processed}`)
  console.log(`  proposals generated:  ${stats.proposed}`)
  console.log(`  skipped (no signals): ${stats.skipped}`)
  console.log("")
  console.log(`  by confidence:`)
  for (const [k, v] of Object.entries(stats.byConfidence)) console.log(`    ${k.padEnd(8)} ${v}`)
  console.log("")
  console.log(`  by capital_type:`)
  const byCap = Object.entries(stats.byCapitalType).sort((a, b) => b[1] - a[1])
  for (const [k, v] of byCap) console.log(`    ${k.padEnd(22)} ${v}`)
  console.log("")
  console.log(`  by class_position:`)
  const byCls = Object.entries(stats.byClassPosition).sort((a, b) => b[1] - a[1])
  for (const [k, v] of byCls) console.log(`    ${k.padEnd(18)} ${v}`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — no writes. Re-run with --write to persist.")
  }
}

main()
