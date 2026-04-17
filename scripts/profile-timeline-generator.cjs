#!/usr/bin/env node
/**
 * profile-timeline-generator.cjs — auto-populate the Timeline section
 *
 * Pulls dated events from canonical stores for the profile and writes
 * them into the <!-- template:auto:timeline --> ... :end --> block
 * inside the profile's Timeline section (or Section 7 per Profile Template).
 *
 * Data sources (merged into one reverse-chronological timeline):
 *   1. data/events.jsonl — events that mention the entity as a
 *      stakeholder OR whose title contains the entity name
 *   2. data/relationships.jsonl — dated monetary edges (cycle field
 *      becomes a timeline entry: "[cycle]: [donor] -> [amount]")
 *   3. Executive Orders tables in the profile body (for presidents /
 *      cabinet — already has dated rows)
 *   4. Custom editorial entries in frontmatter `timeline-entries`
 *      array (for entries that aren't in canonical stores)
 *
 * Usage:
 *   node scripts/profile-timeline-generator.cjs <path>                  # dry run, print
 *   node scripts/profile-timeline-generator.cjs <path> --write          # apply
 *   node scripts/profile-timeline-generator.cjs --launch-50 --write     # all launch profiles
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")

// ─── Load canonical stores ──────────────────────────────────────────

function loadJsonl(filePath) {
  if (!fs.existsSync(filePath)) return []
  return fs.readFileSync(filePath, "utf-8")
    .split("\n").filter(l => l.trim())
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

let _allEdges = null
function getAllEdges() {
  if (!_allEdges) _allEdges = loadJsonl(path.join(ROOT, "data/relationships.jsonl"))
  return _allEdges
}

let _allEvents = null
function getAllEvents() {
  if (!_allEvents) _allEvents = loadJsonl(path.join(ROOT, "data/events.jsonl"))
  return _allEvents
}

// ─── Gather entries for an entity ───────────────────────────────────

function gatherEventsForEntity(entityName) {
  const events = getAllEvents()
  const matches = []
  // Build a name-check predicate: entityName "Donald Trump" should match
  // "President Donald J. Trump", etc. All name parts (first + last) must
  // appear in the target text (case-insensitive).
  const parts = entityName.toLowerCase().split(/\s+/).filter(Boolean)
  const haystackContainsAllParts = (haystack) => {
    if (!haystack) return false
    const h = haystack.toLowerCase()
    return parts.every((p) => h.includes(p))
  }

  for (const ev of events) {
    if (!ev) continue
    const stakeholders = Array.isArray(ev.stakeholders) ? ev.stakeholders : []
    const inStakeholders = stakeholders.some((s) => haystackContainsAllParts(s))
    const titleMention = haystackContainsAllParts(ev.title || "")
    const summaryMention = haystackContainsAllParts(ev.summary || "")
    if (inStakeholders || titleMention || summaryMention) {
      matches.push(ev)
    }
  }
  return matches
}

function gatherEdgeCyclesForEntity(entityName) {
  const edges = getAllEdges()
  const byDateEntry = new Map()
  for (const e of edges) {
    if (e.to !== entityName && e.from !== entityName) continue
    if (e.type !== "monetary" && e.type !== "government-contract") continue
    if (!e.cycle) continue
    const cycle = String(e.cycle)
    const key = cycle
    if (!byDateEntry.has(key)) byDateEntry.set(key, { cycle, totalTo: 0, totalFrom: 0, donors: new Set(), recipients: new Set(), count: 0 })
    const rec = byDateEntry.get(key)
    rec.count++
    if (e.to === entityName) {
      rec.totalTo += (typeof e.amount === "number" ? e.amount : 0)
      if (e.from) rec.donors.add(e.from)
    } else {
      rec.totalFrom += (typeof e.amount === "number" ? e.amount : 0)
      if (e.to) rec.recipients.add(e.to)
    }
  }
  return [...byDateEntry.values()]
}

function extractExecutiveOrdersFromBody(body) {
  // Look for a table header like: | Date | Title | or similar in an Executive Orders section
  // Extract rows with date patterns
  const lines = body.split("\n")
  const entries = []
  let inExecSection = false
  for (const line of lines) {
    if (/^##+ +Executive (Orders|Actions)/i.test(line)) inExecSection = true
    else if (/^##+ /.test(line)) inExecSection = false

    if (inExecSection) {
      // Match: | 2026-04-03 | [Title](url) ... | or: | 2026-04-03 | Title |
      // Extract title from optional [Title](url) wrapper; allow any non-pipe trailing text (e.g., "(VERIFIED)")
      const m = line.match(/^\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(.*?)\s*\|/)
      if (m) {
        let title = m[2]
        // If title is a markdown link [Title](url), extract just the title
        const linkMatch = title.match(/^\[([^\]]+)\]\([^)]+\)\s*(.*)$/)
        if (linkMatch) title = linkMatch[1]
        // Strip trailing (VERIFIED) / (UNVERIFIED) etc.
        title = title.replace(/\s*\((?:VERIFIED|UNVERIFIED|NEEDS REVIEW|URL NEEDED)\)\s*$/i, "").trim()
        if (title.length > 0) {
          entries.push({
            date: m[1],
            title,
            type: "executive-order",
          })
        }
      }
    }
  }
  return entries
}

// ─── Build combined timeline ────────────────────────────────────────

function formatMoney(n) {
  if (!n) return "$0"
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toLocaleString()}`
}

function buildTimeline(entityName, body, fm) {
  const events = gatherEventsForEntity(entityName)
  const cycleSummaries = gatherEdgeCyclesForEntity(entityName)
  const execOrders = extractExecutiveOrdersFromBody(body)
  const customEntries = Array.isArray(fm["timeline-entries"]) ? fm["timeline-entries"] : []

  // Build entries array with unified shape: { date, title, detail, sort, type }
  const entries = []

  // Events
  for (const ev of events) {
    if (!ev.date) continue
    entries.push({
      date: ev.date,
      year: ev.date.slice(0, 4),
      sort: ev.date,
      title: ev.title || "Event",
      detail: ev.summary || "",
      type: ev.type || "event",
    })
  }

  // Monetary cycles
  for (const c of cycleSummaries) {
    const cycleYear = String(c.cycle).match(/\d{4}/)?.[0]
    if (!cycleYear) continue
    let text
    if (c.totalTo > 0 && c.donors.size > 0) {
      const donorList = [...c.donors].slice(0, 3).join(", ")
      text = `Received ${formatMoney(c.totalTo)} across ${c.count} edge(s) from ${c.donors.size} donor(s). Top: ${donorList}`
    } else if (c.totalFrom > 0 && c.recipients.size > 0) {
      const recipList = [...c.recipients].slice(0, 3).join(", ")
      text = `Gave ${formatMoney(c.totalFrom)} across ${c.count} edge(s) to ${c.recipients.size} recipient(s). Top: ${recipList}`
    } else {
      text = `${c.count} tracked edge(s) for cycle ${c.cycle}`
    }
    entries.push({
      date: `${cycleYear}-12-31`, // end of cycle
      year: cycleYear,
      sort: `${cycleYear}-12-31`,
      title: `${c.cycle} cycle`,
      detail: text,
      type: "fec-cycle",
    })
  }

  // Executive Orders
  for (const eo of execOrders) {
    entries.push({
      date: eo.date,
      year: eo.date.slice(0, 4),
      sort: eo.date,
      title: eo.title,
      detail: "",
      type: "executive-order",
    })
  }

  // Custom editorial entries
  for (const ce of customEntries) {
    if (typeof ce !== "object" || !ce.date) continue
    entries.push({
      date: ce.date,
      year: String(ce.date).slice(0, 4),
      sort: String(ce.date),
      title: ce.title || "",
      detail: ce.detail || "",
      type: ce.type || "editorial",
    })
  }

  // Sort reverse-chronological
  entries.sort((a, b) => b.sort.localeCompare(a.sort))

  // Group by year
  const byYear = new Map()
  for (const e of entries) {
    if (!byYear.has(e.year)) byYear.set(e.year, [])
    byYear.get(e.year).push(e)
  }

  return { entries, byYear }
}

// ─── Render markdown ────────────────────────────────────────────────

function renderTimelineMarkdown(entityName, byYear, counts) {
  if (byYear.size === 0) {
    return `_No dated events found in canonical stores for ${entityName}. Add entries via frontmatter \`timeline-entries\` array or run ingest scripts to populate events.jsonl / relationships.jsonl._`
  }

  const lines = []
  // Internal audit info — stays in source as HTML comment (invisible to readers).
  // Curious readers go to /Behind-the-Map and /The-Receipts instead.
  lines.push(`<!-- Auto-generated from data/events.jsonl, data/relationships.jsonl cycles, and Executive Orders table. ${counts.events} events, ${counts.cycles} cycles, ${counts.execOrders} executive orders, ${counts.custom} editorial entries. Regenerate: node scripts/profile-timeline-generator.cjs --write <path> -->`)
  lines.push("")

  // Years in descending order
  const years = [...byYear.keys()].sort().reverse()
  for (const year of years) {
    lines.push(`### ${year}`)
    lines.push("")
    const items = byYear.get(year)
    for (const item of items) {
      const typeTag = `[${item.type}]`
      const line = `- **${item.date}** ${typeTag} ${item.title}${item.detail ? " — " + item.detail : ""}`
      lines.push(line)
    }
    lines.push("")
  }
  return lines.join("\n")
}

// ─── Patch profile body ─────────────────────────────────────────────

function replaceTimelineBlock(body, newContent) {
  // IMPORTANT: use function callback for .replace to avoid $-sign interpolation
  // (money values like "$1.6M" contain $ followed by digits which get treated
  // as backreferences otherwise)
  const re = /(<!-- template:auto:timeline -->)[\s\S]*?(<!-- template:auto:timeline:end -->)/
  if (re.test(body)) {
    return body.replace(re, () => `<!-- template:auto:timeline -->\n${newContent}\n<!-- template:auto:timeline:end -->`)
  }
  // No stub block — find the ## Timeline heading and inject after it
  const lines = body.split("\n")
  let found = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^## +Timeline\s*$/i.test(lines[i])) {
      found = i
      break
    }
  }
  if (found >= 0) {
    let insertAt = found + 1
    while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++
    const wrapped = `<!-- template:auto:timeline -->\n${newContent}\n<!-- template:auto:timeline:end -->`
    return [...lines.slice(0, insertAt), wrapped, "", ...lines.slice(insertAt)].join("\n")
  }
  return null
}

// ─── Single profile runner ──────────────────────────────────────────

function processFile(filePath, { write = false } = {}) {
  if (!fs.existsSync(filePath)) return { file: filePath, err: "file not found" }
  const text = fs.readFileSync(filePath, "utf-8")
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { file: filePath, err: "no frontmatter" }
  let fm
  try { fm = yaml.load(m[1]) || {} } catch (e) { return { file: filePath, err: `yaml: ${e.message.split("\n")[0]}` } }

  const entityName = String(fm.title || "").trim()
  if (!entityName) return { file: filePath, err: "no title" }

  const body = m[2]
  const { entries, byYear } = buildTimeline(entityName, body, fm)
  const counts = {
    events: entries.filter(e => e.type && !["executive-order", "fec-cycle", "editorial"].includes(e.type)).length,
    cycles: entries.filter(e => e.type === "fec-cycle").length,
    execOrders: entries.filter(e => e.type === "executive-order").length,
    custom: entries.filter(e => e.type === "editorial").length,
  }

  const rendered = renderTimelineMarkdown(entityName, byYear, counts)
  const newBody = replaceTimelineBlock(body, rendered)
  if (newBody === null) {
    return { file: filePath, skipped: true, reason: "no Timeline section found (run profile-template-generator first)" }
  }
  if (newBody === body) {
    return { file: filePath, unchanged: true, entries: entries.length }
  }

  if (write) {
    const newText = `---\n${m[1]}\n---\n${newBody}`
    fs.writeFileSync(filePath, newText)
  }

  return { file: filePath, changed: true, entries: entries.length, counts }
}

// ─── Launch-50 runner ───────────────────────────────────────────────

function findLaunch50Paths() {
  const auditPath = path.join(ROOT, "content/Admin Notes/launch-50-audit.json")
  if (!fs.existsSync(auditPath)) return []
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf-8"))
  const all = [...audit.politicians, ...audit.donors, ...audit.corporations]
  return all.filter((r) => r.file && !r.missing && !r.err).map((r) => path.join(ROOT, r.file))
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const write = args.includes("--write")
  const launch50 = args.includes("--launch-50")
  const target = args.find((a) => !a.startsWith("--"))

  let files = []
  if (launch50) files = findLaunch50Paths()
  else if (target) files = [path.isAbsolute(target) ? target : path.join(ROOT, target)]
  else {
    console.error("Usage: node scripts/profile-timeline-generator.cjs <path> [--write] | --launch-50 [--write]")
    process.exit(1)
  }

  let changed = 0, unchanged = 0, skipped = 0, errors = 0
  for (const f of files) {
    const result = processFile(f, { write })
    if (result.err) { console.log(`✗ ${path.relative(ROOT, f)}: ${result.err}`); errors++ }
    else if (result.skipped) { console.log(`~ ${path.relative(ROOT, f)}: ${result.reason}`); skipped++ }
    else if (result.unchanged) { unchanged++ }
    else {
      console.log(`✓ ${path.relative(ROOT, f)}: ${result.entries} entries (events:${result.counts.events} cycles:${result.counts.cycles} execOrders:${result.counts.execOrders} custom:${result.counts.custom})`)
      changed++
    }
  }

  console.log()
  console.log(`${write ? "WRITE MODE" : "DRY RUN"} — Changed: ${changed} | Unchanged: ${unchanged} | Skipped: ${skipped} | Errors: ${errors}`)
  if (!write && changed > 0) console.log("Re-run with --write to apply.")
}

main()
