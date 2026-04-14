#!/usr/bin/env node
// phase-6-deferred-items-collector.cjs — Phase 6 / Bug Hunt
//
// Walks every phase folder under content/Phases (handoff, decisions,
// retrospective) plus every ADR under content/Decisions and extracts
// lines that look like deferred work, known issues, TODOs, or tech
// debt markers.
//
// Produces a categorized report at:
//   content/Phases/phase-6/deferred-items.md
//
// This is the Phase 6 FIRST CONCRETE ACTION per ADR-0005. The output
// of this script IS the initial Phase 6 backlog — David triages each
// item into one of: fix now / defer with new ADR / accept as permanent.
//
// Detection rules:
//   - Lines containing known marker words: "TODO", "deferred",
//     "known issue", "tech debt", "revisit", "fix later", "not
//     blocking", "follow-up", "pending"
//   - Lines inside a "## Known issues" or "## Known issues / concerns"
//     section (entire section content captured)
//   - Unchecked checklist items inside an exit-criteria.md file
//   - Lines inside a "What this opens" section of an ADR
//
// Not detected (intentionally):
//   - General narrative prose (we would get too many false positives)
//   - Resolved "closes" items in ADRs
//   - Done checklist items
//
// Usage:
//   node scripts/phase-6-deferred-items-collector.cjs              # dry-run
//   node scripts/phase-6-deferred-items-collector.cjs --write
//   node scripts/phase-6-deferred-items-collector.cjs --verbose

const fs = require("fs")
const path = require("path")

const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")

const ROOT = path.join(__dirname, "..")
const PHASES_DIR = path.join(ROOT, "content", "Phases")
const DECISIONS_DIR = path.join(ROOT, "content", "Decisions")
const OUTPUT_FILE = path.join(ROOT, "content", "Phases", "phase-6", "deferred-items.md")

// ─── Detection markers ────────────────────────────────────────────────

const LINE_MARKERS = [
  /\btodo\b/i,
  /\bdeferred?\b/i,
  /\bknown issue[s]?\b/i,
  /\btech debt\b/i,
  /\brevisit\b/i,
  /\bfix later\b/i,
  /\bnot blocking\b/i,
  /\bfollow[- ]?up\b/i,
  /\bpending\b/i,
  /\bout of scope\b/i,
  /\bwon[' ]t fix\b/i,
  /\b(XXX|FIXME|HACK)\b/,
]

const SECTION_MARKERS = [
  /^##+\s*Known issues/i,
  /^##+\s*Known issues\s*\/\s*concerns/i,
  /^##+\s*Tech debt/i,
  /^##+\s*What this opens/i,
  /^##+\s*Open questions/i,
  /^##+\s*Blockers/i,
  /^##+\s*In progress/i,
  /^##+\s*Deferred/i,
]

// ─── Walker ──────────────────────────────────────────────────────────

function findDocs() {
  const docs = []

  // Phase folders
  if (fs.existsSync(PHASES_DIR)) {
    for (const phase of fs.readdirSync(PHASES_DIR, { withFileTypes: true })) {
      if (!phase.isDirectory()) continue
      const phaseDir = path.join(PHASES_DIR, phase.name)
      for (const f of fs.readdirSync(phaseDir)) {
        if (!f.endsWith(".md")) continue
        docs.push({
          phase: phase.name,
          file: path.join(phaseDir, f),
          kind: f.replace(/\.md$/, ""),
          relPath: path.relative(ROOT, path.join(phaseDir, f)).replace(/\\/g, "/"),
        })
      }
    }
  }

  // Decision log (ADRs)
  if (fs.existsSync(DECISIONS_DIR)) {
    for (const f of fs.readdirSync(DECISIONS_DIR)) {
      if (!f.endsWith(".md")) continue
      docs.push({
        phase: "ADR",
        file: path.join(DECISIONS_DIR, f),
        kind: f.replace(/\.md$/, ""),
        relPath: path.relative(ROOT, path.join(DECISIONS_DIR, f)).replace(/\\/g, "/"),
      })
    }
  }

  return docs
}

// ─── Extractor ────────────────────────────────────────────────────────

function extractFromDoc(doc) {
  const items = []
  let text
  try {
    text = fs.readFileSync(doc.file, "utf-8")
  } catch {
    return items
  }

  const lines = text.split(/\r?\n/)
  let currentSection = null
  let inSection = false
  let sectionStart = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect section headers
    if (/^##+\s/.test(line)) {
      // Close previous section if we were in one
      if (inSection) {
        inSection = false
      }

      // Start new section if it matches
      for (const re of SECTION_MARKERS) {
        if (re.test(line)) {
          inSection = true
          currentSection = line.replace(/^##+\s*/, "").trim()
          sectionStart = i
          break
        }
      }
    }

    // Line-level marker match (even outside flagged sections)
    let markerHit = false
    for (const marker of LINE_MARKERS) {
      if (marker.test(line)) {
        markerHit = true
        break
      }
    }

    // Unchecked checklist item in exit-criteria file
    const isExitCriteria = doc.kind === "exit-criteria"
    const isUnchecked = isExitCriteria && /^\s*-\s*\[\s*\]\s/.test(line)

    // Skip empty lines, pure headers, code fences, frontmatter
    const isNoise =
      line.trim() === "" ||
      /^---\s*$/.test(line) ||
      /^##+\s*$/.test(line) ||
      /^```/.test(line) ||
      /^!\[/.test(line)

    if (isNoise) continue

    // Collect matching lines
    if ((inSection || markerHit || isUnchecked) && line.trim()) {
      items.push({
        phase: doc.phase,
        source: doc.relPath,
        section: currentSection,
        line_number: i + 1,
        text: line.trim().slice(0, 300),
        kind: isUnchecked ? "unchecked-exit-criterion" : inSection ? "in-section" : "marker",
      })
    }
  }

  return items
}

// ─── Categorization ──────────────────────────────────────────────────

function categorizeItem(item) {
  const t = item.text.toLowerCase()

  if (/defamation|legal review|aipac/.test(t)) return "legal / defamation"
  if (/security|auth|clerk|stripe|webhook/.test(t)) return "security / auth"
  if (/performance|slow|build time|query p[59]5/.test(t)) return "performance"
  if (/test|regression|coverage|ci/.test(t)) return "regression / tests"
  if (/doc|readme|changelog|cross-ref/.test(t)) return "documentation"
  if (/data|jsonl|validator|schema|integrity|dedupe/.test(t)) return "data integrity"
  if (/pipeline|engine[- ]repo|fec|congress|lda|propublica/.test(t)) return "pipelines"
  if (/og card|polling|policy page|zip/.test(t)) return "phase 2.75 polish"
  if (/claim-object|aoc|migration/.test(t)) return "phase 4 polish"
  if (/story score|calibration|hot issue/.test(t)) return "phase 5 polish"
  if (/class tag|approval|review/.test(t)) return "class tags"

  return "misc"
}

// ─── Report generator ────────────────────────────────────────────────

function generateReport(items) {
  const lines = []
  lines.push("---")
  lines.push('title: "Phase 6 Deferred Items Backlog"')
  lines.push("type: backlog")
  lines.push("phase: 6")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/phase-6-deferred-items-collector.cjs")
  lines.push("editor-vouched: true")
  lines.push("---")
  lines.push("")
  lines.push("# Phase 6 Deferred Items Backlog")
  lines.push("")
  lines.push(
    "Auto-extracted from every `content/Phases/phase-*/` doc and every ADR. This is the Phase 6 FIRST CONCRETE ACTION per ADR-0005. Every entry below represents a deferred item, known issue, TODO, or open question from an earlier phase that Phase 6 hardening needs to either FIX, explicitly DEFER with a new ADR, or ACCEPT as permanent.",
  )
  lines.push("")
  lines.push(`**Total items:** ${items.length}`)
  lines.push("")

  // Summary by category
  const byCategory = {}
  for (const item of items) {
    const cat = categorizeItem(item)
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(item)
  }

  lines.push("## By category")
  lines.push("")
  const catOrder = Object.keys(byCategory).sort((a, b) => byCategory[b].length - byCategory[a].length)
  for (const cat of catOrder) {
    lines.push(`- **${cat}**: ${byCategory[cat].length}`)
  }
  lines.push("")

  // Summary by phase
  const byPhase = {}
  for (const item of items) {
    if (!byPhase[item.phase]) byPhase[item.phase] = 0
    byPhase[item.phase] += 1
  }
  lines.push("## By source phase")
  lines.push("")
  const phaseOrder = Object.keys(byPhase).sort()
  for (const phase of phaseOrder) {
    lines.push(`- **${phase}**: ${byPhase[phase]}`)
  }
  lines.push("")

  // Full listing by category
  lines.push("## Full backlog")
  lines.push("")
  lines.push(
    "Each item is rendered as `source:line — text`. Click the source link to jump into the file. Phase 6 triage column is where David marks resolution: **fix** / **defer** / **accept** / **wontfix**.",
  )
  lines.push("")

  for (const cat of catOrder) {
    lines.push(`### ${cat} (${byCategory[cat].length})`)
    lines.push("")
    lines.push("| Phase | Source | Line | Kind | Text | Triage |")
    lines.push("|---|---|---:|---|---|---|")
    for (const item of byCategory[cat]) {
      const linkText = `[${item.source.split("/").pop()}:${item.line_number}](/${item.source}#L${item.line_number})`
      const safeText = item.text.replace(/\|/g, "\\|").slice(0, 180)
      lines.push(`| ${item.phase} | ${linkText} | ${item.line_number} | ${item.kind} | ${safeText} | |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/phase-6-deferred-items-collector.cjs --write`. The regeneration is idempotent — re-running overwrites this file with the current state of every prior phase's deferred items.*",
  )
  lines.push("")

  return lines.join("\n")
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ phase-6-deferred-items-collector ═══")
  console.log(`  phases dir: ${PHASES_DIR}`)
  console.log(`  output:     ${OUTPUT_FILE}`)
  console.log(`  dry-run:    ${!WRITE}`)
  console.log("")

  const docs = findDocs()
  console.log(`  ${docs.length} docs found`)

  const allItems = []
  for (const doc of docs) {
    const items = extractFromDoc(doc)
    allItems.push(...items)
    if (VERBOSE) console.log(`    ${doc.relPath}: ${items.length} items`)
  }

  console.log(`  ${allItems.length} total items extracted`)

  const report = generateReport(allItems)

  if (WRITE) {
    const dir = path.dirname(OUTPUT_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(OUTPUT_FILE, report, "utf-8")
    console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
  } else {
    console.log("")
    console.log("  DRY RUN — report not written")
    console.log("")
    console.log("  Preview (first 40 lines):")
    console.log("")
    const preview = report.split("\n").slice(0, 40).join("\n")
    console.log(preview)
  }
  console.log("")
}

main()
