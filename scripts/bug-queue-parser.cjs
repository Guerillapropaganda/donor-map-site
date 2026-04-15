#!/usr/bin/env node
// bug-queue-parser.cjs — Pillar 5 manifest generator
//
// Parses TWO sources of tracked issues into a unified manifest that
// the /bugs Ops dashboard consumes:
//
//   1. content/Admin Notes/bug-queue.md — bugs David hits while using
//      Ops (bug-NNN format, severity levels, open/resolved sections).
//      Low volume (currently 2), high fidelity per entry.
//
//   2. content/Phases/phase-6/deferred-items.md — Phase 6 audit
//      output. 267 items across 11 categories. Table format.
//      High volume, lower fidelity per entry.
//
// The parser emits one structured record per item with a common
// shape. The /bugs page renders them grouped by source + filtered by
// severity/status/category.
//
// Output:
//   ops/src/data/bugs-manifest.json   — structured for /api/bugs
//
// Usage:
//   node scripts/bug-queue-parser.cjs              # dry-run
//   node scripts/bug-queue-parser.cjs --write      # write manifest

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const BUG_QUEUE_PATH = path.join(ROOT, "content", "Admin Notes", "bug-queue.md")
const DEFERRED_PATH = path.join(ROOT, "content", "Phases", "phase-6", "deferred-items.md")
const MANIFEST_PATH = path.join(ROOT, "ops", "src", "data", "bugs-manifest.json")

const WRITE = process.argv.includes("--write")

// ─── Bug queue parser ─────────────────────────────────────────────────
//
// Shape of bug-queue.md:
//   ## open
//
//   ### bug-001: title here
//   - **reported:** 2026-04-15
//   - **severity:** blocker
//   - **where:** ...
//   - **what:** ...
//   - **resolved:** 2026-04-15
//
//   ### bug-002: ...
//
//   ## resolved (archive)
//
//   ### bug-003: ...
//
// Parse strategy: split by ## sections, then split each section by
// ### sub-headings. For each sub-heading, scan dash-list items for
// known fields (reported, severity, where, what, root cause, fix,
// resolved).

function parseBugQueue() {
  if (!fs.existsSync(BUG_QUEUE_PATH)) {
    return { source: "bug-queue.md", exists: false, entries: [] }
  }
  const raw = fs.readFileSync(BUG_QUEUE_PATH, "utf-8")
  // Strip frontmatter
  const body = raw.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "")

  const entries = []
  // Split into sections by ## headings (## open, ## resolved)
  const sectionRe = /^##\s+([^\n]+)$/gm
  const sections = []
  let sectionMatch
  const matches = []
  while ((sectionMatch = sectionRe.exec(body)) !== null) {
    matches.push({ title: sectionMatch[1].trim(), start: sectionMatch.index })
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start
    const end = i + 1 < matches.length ? matches[i + 1].start : body.length
    sections.push({
      title: matches[i].title,
      body: body.slice(start, end),
    })
  }

  for (const section of sections) {
    // "open" | "resolved (archive)" → "open" | "resolved"
    const status = /resolved/i.test(section.title) ? "resolved" : "open"
    // Find ### bug-NNN entries within the section
    const entryRe = /^###\s+([^\n]+)$/gm
    const entryMatches = []
    let em
    while ((em = entryRe.exec(section.body)) !== null) {
      entryMatches.push({ title: em[1].trim(), start: em.index })
    }
    for (let i = 0; i < entryMatches.length; i++) {
      const start = entryMatches[i].start
      const end =
        i + 1 < entryMatches.length ? entryMatches[i + 1].start : section.body.length
      const entryBody = section.body.slice(start, end)
      const titleLine = entryMatches[i].title
      // Parse "bug-NNN: title"
      const titleMatch = titleLine.match(/^(bug-\d+):\s*(.+)$/)
      if (!titleMatch) continue

      const id = titleMatch[1]
      const title = titleMatch[2]

      // Scan for key fields in bulleted format: - **key:** value
      // Values can span multiple lines — capture until next `- **` bullet.
      const fields = {}
      const fieldRe = /-\s+\*\*([a-zA-Z][a-zA-Z\s\-/]+):\*\*\s*([\s\S]*?)(?=\n-\s+\*\*|\n\n|\n###|$)/g
      let fm
      while ((fm = fieldRe.exec(entryBody)) !== null) {
        const key = fm[1].trim().toLowerCase()
        const value = fm[2].trim()
        fields[key] = value
      }

      entries.push({
        source: "bug-queue",
        id,
        title,
        status,
        severity: fields.severity || "unknown",
        reported: fields.reported || null,
        resolved: fields.resolved || null,
        where: fields.where || null,
        what: fields.what || null,
        root_cause: fields["root cause"] || null,
        fix: fields.fix || fields["fix shipped"] || fields["fixes shipped"] || null,
        long_term: fields["long-term"] || fields["long term"] || null,
        raw_body: entryBody.trim(),
      })
    }
  }

  return {
    source: "bug-queue.md",
    source_path: "content/Admin Notes/bug-queue.md",
    exists: true,
    entries,
  }
}

// ─── Deferred items parser ──────────────────────────────────────────
//
// deferred-items.md has sections per category, each containing a pipe
// table with columns: Phase | Source | Line | Kind | Text | Triage
//
// We parse the By-category summary at the top to get totals, then
// parse each table row into a uniform record.

function parseDeferredItems() {
  if (!fs.existsSync(DEFERRED_PATH)) {
    return { source: "deferred-items.md", exists: false, entries: [], by_category: {} }
  }
  const raw = fs.readFileSync(DEFERRED_PATH, "utf-8")
  const body = raw.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n/, "")

  // Extract the By category stats section
  const byCategory = {}
  const catSummaryMatch = body.match(/##\s+By category\s*\n([\s\S]*?)(?=\n##\s)/)
  if (catSummaryMatch) {
    const lines = catSummaryMatch[1].split("\n")
    for (const line of lines) {
      const m = line.match(/-\s*\*\*([^*]+)\*\*:\s*(\d+)/)
      if (m) byCategory[m[1].trim()] = parseInt(m[2], 10)
    }
  }

  // Extract total
  let total = 0
  const totalMatch = body.match(/\*\*Total items:\*\*\s*(\d+)/)
  if (totalMatch) total = parseInt(totalMatch[1], 10)

  // Parse category sections. Each is `### <category name> (N)` followed
  // by a pipe table.
  const entries = []
  const catSectionRe = /^###\s+([^\n]+)\s*\(\d+\)\s*$/gm
  const catMatches = []
  let cm
  while ((cm = catSectionRe.exec(body)) !== null) {
    catMatches.push({ category: cm[1].trim(), start: cm.index })
  }
  for (let i = 0; i < catMatches.length; i++) {
    const start = catMatches[i].start
    const end = i + 1 < catMatches.length ? catMatches[i + 1].start : body.length
    const sectionBody = body.slice(start, end)
    const category = catMatches[i].category

    // Parse pipe table rows — skip header + separator
    const lines = sectionBody.split("\n")
    for (const line of lines) {
      if (!line.startsWith("|")) continue
      if (/^\|[\s\-:|]+\|/.test(line)) continue // separator row
      if (/^\|\s*Phase\s*\|/i.test(line)) continue // header row
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim())
      if (cells.length < 5) continue
      const [phase, source, lineNum, kind, text] = cells
      entries.push({
        source: "deferred-items",
        category,
        phase,
        source_ref: source,
        line_number: parseInt(lineNum, 10) || null,
        kind,
        text: text.replace(/\\\|/g, "|"),
        // Synthetic fields to match bug-queue shape
        id: `def-${category.replace(/\W+/g, "-")}-${entries.length + 1}`,
        title: text.slice(0, 80),
        status: "open",
        severity: inferSeverity(category, text),
      })
    }
  }

  return {
    source: "deferred-items.md",
    source_path: "content/Phases/phase-6/deferred-items.md",
    exists: true,
    total_reported: total,
    by_category: byCategory,
    entries,
  }
}

// Map category to severity (best-effort heuristic)
function inferSeverity(category, text) {
  const cat = category.toLowerCase()
  const lower = text.toLowerCase()
  if (cat.includes("legal") || cat.includes("defamation")) return "high"
  if (cat.includes("security")) return "high"
  if (cat.includes("data integrity")) return "high"
  if (lower.includes("blocker") || lower.includes("critical")) return "high"
  if (cat.includes("performance")) return "medium"
  if (cat.includes("regression") || cat.includes("test")) return "medium"
  if (cat.includes("documentation") || cat.includes("polish")) return "low"
  return "low"
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ bug-queue-parser ═══")
  console.log("")

  const bugQueue = parseBugQueue()
  const deferred = parseDeferredItems()

  console.log(`  bug-queue.md:         ${bugQueue.entries.length} entries`)
  const openBugs = bugQueue.entries.filter((e) => e.status === "open").length
  const resolvedBugs = bugQueue.entries.filter((e) => e.status === "resolved").length
  console.log(`    open: ${openBugs} · resolved: ${resolvedBugs}`)
  console.log(`  deferred-items.md:    ${deferred.entries.length} entries parsed`)
  console.log(`    reported total: ${deferred.total_reported}`)
  console.log(`    by category:`)
  for (const [cat, count] of Object.entries(deferred.by_category)) {
    console.log(`      ${cat}: ${count}`)
  }
  console.log("")

  // Stats across both sources
  const totalOpen = openBugs + deferred.entries.length
  const highSeverity = [
    ...bugQueue.entries.filter((e) => e.status === "open" && e.severity === "blocker"),
    ...bugQueue.entries.filter((e) => e.status === "open" && e.severity === "high"),
    ...deferred.entries.filter((e) => e.severity === "high"),
  ].length

  const manifest = {
    generated_at: new Date().toISOString(),
    stats: {
      bug_queue_open: openBugs,
      bug_queue_resolved: resolvedBugs,
      deferred_items: deferred.entries.length,
      deferred_by_category: deferred.by_category,
      total_open: totalOpen,
      high_severity_open: highSeverity,
    },
    bug_queue: bugQueue,
    deferred_items: deferred,
  }

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to save manifest")
    return
  }

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true })
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, MANIFEST_PATH)}`)
  console.log("")
}

main()
