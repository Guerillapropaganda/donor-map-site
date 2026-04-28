#!/usr/bin/env node
/**
 * bugs-auto-resolver.cjs — Layer A auto-resolver for /bugs items.
 *
 * /bugs is grounded daily by bug-queue-parser scanning phase exit-criteria
 * files for unchecked items. Once we ground the queue to zero (which we
 * did 2026-04-27), it slowly drifts back up as criteria get unchecked.
 *
 * This producer adds predicate-based auto-resolution. Items can declare
 * a predicate via inline HTML comment; this script evaluates predicates
 * and flips `[ ]` → `[x]` when the condition is met. Closes the loop
 * so /bugs stays at zero automatically.
 *
 * Predicate forms (mirrors the note-auto-resolver pattern from
 * 2026-04-27 morning session):
 *
 *   <!-- auto-resolve-when: harness-check=<name> -->
 *     Resolves when the named harness check has findings_count: 0 in
 *     the latest vault-audit-latest.json artifact.
 *
 *   <!-- auto-resolve-when: regex=<pattern> source=<file> -->
 *     Resolves when the regex matches content of the specified file.
 *
 *   <!-- auto-resolve-when: file-exists=<path> -->
 *     Resolves when the named file exists.
 *
 *   <!-- auto-resolve-when: jsonl-empty=<path> -->
 *     Resolves when the JSONL file has zero non-empty lines.
 *
 * Multiple predicates AND together (all must be true).
 *
 * Usage:
 *   node scripts/bugs-auto-resolver.cjs            # dry-run
 *   node scripts/bugs-auto-resolver.cjs --write    # apply
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const PHASES_DIR = path.join(ROOT, "content", "Phases")
const HARNESS_ARTIFACT = path.join(ROOT, "content", "Admin Notes", "vault-audit-latest.json")
const WRITE = process.argv.includes("--write")

function loadHarness() {
  if (!fs.existsSync(HARNESS_ARTIFACT)) return null
  try { return JSON.parse(fs.readFileSync(HARNESS_ARTIFACT, "utf-8")) } catch { return null }
}

function findExitCriteriaFiles() {
  if (!fs.existsSync(PHASES_DIR)) return []
  const files = []
  for (const phaseDir of fs.readdirSync(PHASES_DIR)) {
    const full = path.join(PHASES_DIR, phaseDir, "exit-criteria.md")
    if (fs.existsSync(full)) files.push(full)
  }
  return files
}

/**
 * Parse an inline auto-resolve-when comment and return a predicate object.
 * Returns null if the comment isn't well-formed.
 */
function parsePredicate(commentText) {
  // Format: harness-check=foo  OR  regex=pattern source=file  OR  ...
  const trimmed = commentText.trim()
  if (!trimmed.startsWith("auto-resolve-when:")) return null
  const rest = trimmed.slice("auto-resolve-when:".length).trim()
  // Tokenize as key=value pairs (values can be quoted)
  const out = {}
  const tokenRe = /(\w[\w-]*)=(?:'([^']*)'|"([^"]*)"|(\S+))/g
  let m
  while ((m = tokenRe.exec(rest)) !== null) {
    out[m[1]] = m[2] ?? m[3] ?? m[4]
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Evaluate a predicate against current state. Returns { resolved, reason }.
 */
function evaluate(pred, harness) {
  const reasons = []

  if (pred["harness-check"]) {
    const target = pred["harness-check"]
    if (!harness) return { resolved: false, reason: "harness artifact not available" }
    const check = (harness.checks || []).find((c) => c.name === target)
    if (!check) return { resolved: false, reason: `harness check ${target} not found in latest artifact` }
    if (check.findings_count !== 0) return { resolved: false, reason: `${target} has ${check.findings_count} findings` }
    reasons.push(`${target} has 0 findings`)
  }

  if (pred.regex && pred.source) {
    const sourcePath = path.isAbsolute(pred.source) ? pred.source : path.join(ROOT, pred.source)
    if (!fs.existsSync(sourcePath)) return { resolved: false, reason: `source file ${pred.source} not found` }
    const content = fs.readFileSync(sourcePath, "utf-8")
    let re
    try { re = new RegExp(pred.regex, "m") } catch { return { resolved: false, reason: `invalid regex: ${pred.regex}` } }
    if (!re.test(content)) return { resolved: false, reason: `regex ${pred.regex} did not match ${pred.source}` }
    reasons.push(`regex matched ${pred.source}`)
  }

  if (pred["file-exists"]) {
    const filePath = path.isAbsolute(pred["file-exists"]) ? pred["file-exists"] : path.join(ROOT, pred["file-exists"])
    if (!fs.existsSync(filePath)) return { resolved: false, reason: `${pred["file-exists"]} does not exist` }
    reasons.push(`${pred["file-exists"]} exists`)
  }

  if (pred["jsonl-empty"]) {
    const filePath = path.isAbsolute(pred["jsonl-empty"]) ? pred["jsonl-empty"] : path.join(ROOT, pred["jsonl-empty"])
    if (!fs.existsSync(filePath)) {
      reasons.push(`${pred["jsonl-empty"]} does not exist (treated as empty)`)
    } else {
      const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/).filter((l) => l.trim().length > 0)
      if (lines.length > 0) return { resolved: false, reason: `${pred["jsonl-empty"]} has ${lines.length} entries` }
      reasons.push(`${pred["jsonl-empty"]} is empty`)
    }
  }

  if (reasons.length === 0) return { resolved: false, reason: "no predicates parsed" }
  return { resolved: true, reason: reasons.join("; ") }
}

/**
 * Walk one exit-criteria file, evaluate predicates, return new content + summary.
 */
function processFile(filePath, harness) {
  const original = fs.readFileSync(filePath, "utf-8")
  const lines = original.split(/\r?\n/)
  const changes = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Match unchecked criterion: starts with `- [ ]` or `* [ ]`
    if (!/^\s*[-*]\s*\[\s\]\s/.test(line)) continue
    // Find the auto-resolve-when comment (may span next 0-2 lines if wrapped)
    const lineWithCtx = lines.slice(i, i + 3).join(" ")
    const commentMatch = lineWithCtx.match(/<!--\s*(auto-resolve-when:[\s\S]*?)\s*-->/)
    if (!commentMatch) continue

    const pred = parsePredicate(commentMatch[1])
    if (!pred) continue

    const { resolved, reason } = evaluate(pred, harness)
    if (!resolved) continue

    // Flip the box and add an auto-resolution annotation
    const today = new Date().toISOString().slice(0, 10)
    const annotation = `<auto-resolved date="${today}" reason="${reason.replace(/"/g, "'")}" />`
    const newLine = line.replace(/^(\s*[-*]\s*)\[\s\]/, "$1[x]") + " " + annotation
    lines[i] = newLine

    changes.push({
      file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
      lineNum: i + 1,
      itemText: line.replace(/^\s*[-*]\s*\[\s\]\s*/, "").replace(/<!--[\s\S]*?-->/, "").trim().slice(0, 100),
      reason,
    })
  }

  return { newContent: lines.join("\n"), changes }
}

function main() {
  const harness = loadHarness()
  const files = findExitCriteriaFiles()
  console.log(`Scanning ${files.length} exit-criteria file(s)`)
  if (!harness) {
    console.log("  (no harness artifact found — harness-check predicates will be skipped)")
  }

  const allChanges = []
  let filesTouched = 0

  for (const file of files) {
    const { newContent, changes } = processFile(file, harness)
    if (changes.length > 0) {
      allChanges.push(...changes)
      filesTouched++
      if (WRITE) fs.writeFileSync(file, newContent, "utf-8")
    }
  }

  console.log(`\nAuto-resolved: ${allChanges.length} criterion(a)`)
  console.log(`Files touched: ${filesTouched}`)
  for (const c of allChanges) {
    console.log(`\n  [${c.file}:${c.lineNum}]`)
    console.log(`    ${c.itemText}`)
    console.log(`    reason: ${c.reason}`)
  }
  if (!WRITE) console.log("\n  (dry-run — re-run with --write)")
}

main()
