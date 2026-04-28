#!/usr/bin/env node
/**
 * sprint-task-update.cjs — programmatic edits to sprint-schedule.md
 *
 * The Ops Calendar (`ops/src/app/calendar`) and the session-save skill
 * both treat `content/Admin Notes/sprint-schedule.md` as the single
 * source of truth for what's done, what's pending, and what shipped
 * ad-hoc. Today, the session-save skill has Claude hand-edit the YAML
 * blocks. That's brittle (whitespace, fence-vs-bare-yaml, frontmatter
 * `last-updated` field, footer line) and wastes tokens.
 *
 * This script handles the two highest-frequency mutations cleanly:
 *
 *   --mark-done <id> --note "<text>" [--date YYYY-MM-DD]
 *     Find the task by id, set status: done, completed_date: <date>,
 *     and either set or append the notes line. Keeps surrounding
 *     indentation/comments intact.
 *
 *   --list [--status <s>] [--phase <n>] [--claude <cc|rc|dc>]
 *     Report tasks matching the filters. JSON with --json.
 *
 * After every successful mutation:
 *   - frontmatter `last-updated:` is bumped to today
 *   - footer "Schedule last updated:" line is bumped if present
 *   - YAML in each touched fenced block is re-parsed to verify it still
 *     loads (sanity gate)
 *
 * The script is intentionally text-based, not full YAML round-trip.
 * Sprint-schedule.md uses inline comments + comment-aligned status hints
 * that a load+dump cycle would shred.
 *
 * Usage examples:
 *   node scripts/sprint-task-update.cjs --list --status pending --phase 3
 *   node scripts/sprint-task-update.cjs --mark-done cc_p3_148 \
 *     --note "Refactored detectors to read librarian per ADR-0024."
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")
const SCHEDULE = path.join(ROOT, "content", "Admin Notes", "sprint-schedule.md")

// ─── CLI parsing ───────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("--")) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith("--")) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

function fail(msg, code = 1) {
  console.error(msg)
  process.exit(code)
}

// ─── File load ─────────────────────────────────────────────────────────

if (!fs.existsSync(SCHEDULE)) fail(`Sprint schedule not found at ${SCHEDULE}`)
const original = fs.readFileSync(SCHEDULE, "utf-8")

// ─── Block scanner ─────────────────────────────────────────────────────

/**
 * Walks every fenced ```yaml block + every bare-indented YAML region
 * after the "---" separator at line ~3504, parsing each into JS so
 * --list can filter. Returns [{ tasks: [{id, status, ...}], range: {start,end} }].
 *
 * Used for read-only reporting. Mutations use the regex-based splicer
 * below, not this index, so comments/formatting survive.
 */
function indexTasks(text) {
  const lines = text.split(/\r?\n/)
  const blocks = []
  let i = 0
  while (i < lines.length) {
    if (lines[i] === "```yaml") {
      const start = i + 1
      let end = start
      while (end < lines.length && lines[end] !== "```") end++
      const yamlText = lines.slice(start, end).join("\n")
      let parsed = null
      try { parsed = yaml.load(yamlText) } catch { /* skip */ }
      if (parsed) blocks.push({ start, end, parsed })
      i = end + 1
    } else {
      i++
    }
  }
  // Bare-indented region(s): tasks under a stray "    - id: ..." line
  // outside any fence. Parse heuristically by scanning for runs of
  // 4-space-indented entries.
  const bareTaskMatches = [...text.matchAll(/^( {4}- id: [a-z]+_[a-z0-9_]+\n(?:^ {6,}.+\n)*)/gm)]
  for (const m of bareTaskMatches) {
    let parsed = null
    try { parsed = yaml.load("-\n" + m[1].slice(2).replace(/^ {4}/gm, "  ")) } catch { /* skip */ }
    if (parsed && parsed[0]) blocks.push({ start: -1, end: -1, parsed: { bare_tasks: parsed } })
  }
  return blocks
}

function* iterateAllTasks(blocks) {
  for (const b of blocks) {
    const p = b.parsed
    if (!p || typeof p !== "object") continue
    // Phase-shaped: { phase_N_tasks: { code_claude: [...], research_claude: [...], ... } }
    for (const topKey of Object.keys(p)) {
      const v = p[topKey]
      if (!v || typeof v !== "object") continue
      // Phase wrapper
      if (/^phase_\d+_tasks$/.test(topKey)) {
        for (const claudeKey of Object.keys(v)) {
          if (!Array.isArray(v[claudeKey])) continue
          for (const t of v[claudeKey]) {
            yield { task: t, claudeKey, phaseKey: topKey }
          }
        }
        continue
      }
      // Bare task array (post-fence rc_NN entries below the metadata block)
      if (topKey === "bare_tasks" && Array.isArray(v)) {
        for (const t of v) yield { task: t, claudeKey: "unknown", phaseKey: "bare" }
      }
    }
  }
}

// ─── Mutator ───────────────────────────────────────────────────────────

const TODAY = (args.date && typeof args.date === "string") ? args.date : new Date().toISOString().slice(0, 10)

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }

/**
 * Find the slice covering one task's YAML (the `- id: <ID>` line through
 * the line before the next sibling task or the end of its parent block).
 * Returns { lineStart, lineEnd, indent } or null.
 *
 * Identifies "next sibling" as the next line at the SAME indent that
 * begins with `- id:` OR a line whose indent is strictly LESS than the
 * task's body indent (signals we've left the array).
 */
function locateTaskSlice(text, id) {
  const lines = text.split(/\r?\n/)
  const idLineRe = new RegExp(`^(\\s*)- id:\\s*${escapeRe(id)}\\s*$`)
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(idLineRe)
    if (!m) continue
    const indent = m[1] // e.g. "    "
    const bodyIndent = indent + "  " // body is 2-space deeper
    // Walk forward
    let j = i + 1
    while (j < lines.length) {
      const l = lines[j]
      if (l.trim() === "") { j++; continue }
      const m2 = l.match(/^(\s*)/)
      const thisIndent = m2 ? m2[1] : ""
      if (thisIndent.length < bodyIndent.length) break
      // Sibling task: same `indent` and starts with "- id:"
      if (thisIndent === indent && /^\s*- id:/.test(l)) break
      j++
    }
    return { lineStart: i, lineEnd: j, indent, bodyIndent }
  }
  return null
}

function setOrAppendField(slice, lines, fieldName, value, opts = {}) {
  // Find existing `<bodyIndent><fieldName>: ...` line within the slice
  const fieldRe = new RegExp(`^${escapeRe(slice.bodyIndent)}${escapeRe(fieldName)}:\\s*(.*)$`)
  for (let i = slice.lineStart + 1; i < slice.lineEnd; i++) {
    const l = lines[i]
    if (fieldRe.test(l)) {
      lines[i] = `${slice.bodyIndent}${fieldName}: ${value}`
      return { changed: true, mode: "replaced" }
    }
  }
  // Append before slice.lineEnd, after the last non-blank line of slice
  let insertAt = slice.lineEnd
  while (insertAt > slice.lineStart && lines[insertAt - 1].trim() === "") insertAt--
  lines.splice(insertAt, 0, `${slice.bodyIndent}${fieldName}: ${value}`)
  slice.lineEnd++
  return { changed: true, mode: "appended" }
}

function quoteForYaml(s) {
  // Use double quotes; escape embedded double quotes + backslashes.
  // For multi-line notes, switch to a folded scalar — but session-save
  // notes are typically one paragraph, so most cases hit the simple path.
  if (typeof s !== "string") s = String(s)
  if (!/[:#\n"\\]/.test(s) && s.length < 200) return `"${s}"`
  if (!s.includes("\n")) return JSON.stringify(s) // safe quoted
  // Multi-line: emit as a folded block, indented to match body
  const indent = "        " // 8 spaces — works inside the body indent + 2
  const folded = s.split("\n").map((line) => indent + line).join("\n")
  return `|\n${folded}`
}

function bumpFrontmatterLastUpdated(text, today, summary) {
  // Frontmatter `last-updated: '...'` is a tag-like string in this file
  // (e.g. '2026-04-28-evening-bowman-shape-bug-class-fully-closed-cc_p3_143-148')
  // Don't overwrite blindly — append today plus a short tag.
  const fmRe = /^---\n([\s\S]*?)\n---/
  const m = text.match(fmRe)
  if (!m) return text
  const fmText = m[1]
  const newFm = fmText.replace(
    /^last-updated:\s*['"]?([^'"\n]*)['"]?\s*$/m,
    () => `last-updated: '${today}${summary ? `-${summary}` : ""}'`,
  )
  return text.replace(fmText, newFm)
}

function bumpFooterLastUpdated(text, today) {
  // The footer line carries a rich session-summary tail after the date
  // (the old hand-written session-save format). Preserve everything
  // after the date — only swap the YYYY-MM-DD prefix.
  return text.replace(
    /(Schedule last updated:\s*)\d{4}-\d{2}-\d{2}/,
    `$1${today}`,
  )
}

function validateYamlBlocks(text) {
  // Re-scan all fenced ```yaml blocks and verify they parse. Returns
  // null on success, or an error object describing the first failure.
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    if (lines[i] === "```yaml") {
      const start = i + 1
      let end = start
      while (end < lines.length && lines[end] !== "```") end++
      const yamlText = lines.slice(start, end).join("\n")
      try { yaml.load(yamlText) }
      catch (e) {
        return { lineApprox: start + 1, error: e.message.split("\n")[0] }
      }
      i = end + 1
    } else {
      i++
    }
  }
  return null
}

// ─── Modes ─────────────────────────────────────────────────────────────

function modeList() {
  const blocks = indexTasks(original)
  const wantStatus = typeof args.status === "string" ? args.status : null
  const wantPhase = typeof args.phase === "string" ? `phase_${args.phase}_tasks` : null
  const wantClaude = typeof args.claude === "string" ? `${args.claude}_claude` : null
  const rows = []
  for (const { task, claudeKey, phaseKey } of iterateAllTasks(blocks)) {
    if (wantStatus && task.status !== wantStatus) continue
    if (wantPhase && phaseKey !== wantPhase) continue
    if (wantClaude && claudeKey !== wantClaude) continue
    rows.push({
      id: task.id,
      status: task.status,
      task: task.task,
      phase: phaseKey,
      claude: claudeKey,
      completed_date: task.completed_date || null,
    })
  }
  if (args.json) {
    process.stdout.write(JSON.stringify({ count: rows.length, tasks: rows }, null, 2))
    return
  }
  console.log(`${rows.length} task(s) match`)
  for (const r of rows) {
    const stat = (r.status || "?").padEnd(10)
    console.log(`  ${stat} ${r.id.padEnd(14)} ${r.task}`)
  }
}

function modeMarkDone() {
  const id = typeof args["mark-done"] === "string" ? args["mark-done"] : null
  if (!id) fail("--mark-done requires a task id")
  const note = typeof args.note === "string" ? args.note : null
  if (!note) fail("--mark-done requires --note \"<text>\"")

  const slice = locateTaskSlice(original, id)
  if (!slice) fail(`task id ${id} not found in ${SCHEDULE}`)

  const lines = original.split(/\r?\n/)
  setOrAppendField(slice, lines, "status", "done")
  setOrAppendField(slice, lines, "completed_date", TODAY)
  setOrAppendField(slice, lines, "notes", quoteForYaml(note))

  let updated = lines.join("\n")
  updated = bumpFrontmatterLastUpdated(updated, TODAY, args.summary && typeof args.summary === "string" ? args.summary : "")
  updated = bumpFooterLastUpdated(updated, TODAY)

  const yamlError = validateYamlBlocks(updated)
  if (yamlError) {
    fail(`YAML validation failed after edit at approx line ${yamlError.lineApprox}: ${yamlError.error}`)
  }

  if (args["dry-run"]) {
    console.log(`(dry-run) would update ${id} → status: done, completed_date: ${TODAY}`)
    return
  }

  fs.writeFileSync(SCHEDULE, updated, "utf-8")
  console.log(`✓ ${id}: status → done, completed_date → ${TODAY}, notes set`)
}

// ─── Dispatch ──────────────────────────────────────────────────────────

if (args.list) {
  modeList()
} else if (args["mark-done"]) {
  modeMarkDone()
} else {
  console.log(`sprint-task-update.cjs — programmatic edits to sprint-schedule.md

Usage:
  --list [--status <s>] [--phase <N>] [--claude cc|rc|dc] [--json]
      List tasks matching filters.

  --mark-done <id> --note "<text>" [--date YYYY-MM-DD] [--summary <slug>] [--dry-run]
      Set status: done, completed_date, and notes for one task.
      Bumps frontmatter last-updated and footer line.
      Validates all fenced YAML blocks still parse.

Examples:
  node scripts/sprint-task-update.cjs --list --status pending --phase 3
  node scripts/sprint-task-update.cjs --mark-done cc_p3_148 \\
    --note "Refactored detectors per ADR-0024."`)
  process.exit(args.help ? 0 : 1)
}
