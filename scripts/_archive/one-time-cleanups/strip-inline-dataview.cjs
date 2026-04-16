#!/usr/bin/env node
/**
 * strip-inline-dataview.cjs — remove body-level Obsidian Dataview inline fields
 *
 * Vault Rules § Profile Schema: "Frontmatter is the ONLY source of truth for
 * structured fields. Never write `field:: value` as inline body dataview syntax."
 *
 * This script scans every markdown file under content/, splits off the
 * frontmatter block (anything between `---` at BOF and the next `---`),
 * and removes body lines that match Obsidian Dataview inline field syntax
 * (`field::` with optional leading backtick from the legacy import format).
 *
 * Context: During the initial Obsidian → Quartz migration the vault was
 * imported with inline dataview fields in the body AND mirrored to YAML
 * frontmatter. The frontmatter became the single source of truth, but the
 * body fields were never stripped en masse — and stale body values now
 * contradict frontmatter on hundreds of profiles.
 *
 * A prior sweep (2026-04-09, commit 3f81f373) cleaned 54 files with NUL-byte
 * corruption matching the pattern `content-readiness:: ready\n\0`. That run
 * also touched ~879 files for related sweeps but missed 562 files whose inline
 * dataview lines were "clean" (no NUL byte). This script catches the residue.
 *
 * This script does NOT re-enrich, re-classify, or touch frontmatter. It only
 * removes stale body lines. Frontmatter is authoritative and remains untouched.
 *
 * Usage:
 *   node scripts/strip-inline-dataview.cjs                 # dry run (report only)
 *   node scripts/strip-inline-dataview.cjs --write         # apply changes
 *   node scripts/strip-inline-dataview.cjs --write --verbose
 *
 * Exit code: 0 on success, 1 on any file error.
 */

const fs = require("fs")
const path = require("path")

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(__dirname, "..", "content")
const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")

// Fields that should live ONLY in frontmatter. If any of these appear as
// `field:: value` (Dataview inline) in the body, strip the line.
// Add new fields here as more get reported.
const FIELDS = [
  "content-readiness",
  "profile-status",
  "source-tier",
  "last-updated",
  "last-enriched",
  "last-verified-by",
  "content-type",
  "editorial-result",
  "editorial-reviewer",
  "editorial-review-date",
  "corroboration-count",
]

// Match a line that is an inline-dataview field reference in the body.
// Optional leading whitespace, optional leading backtick (from the legacy
// Obsidian "paragraph" style that wrapped the line in an unclosed inline
// code span), the field name, `::`, then the rest of the line.
//
// Examples this matches:
//   content-readiness:: ready
//   `content-readiness:: ready
//     profile-status:: active
// Examples this does NOT match:
//   content-readiness: ready                    (frontmatter YAML, not body)
//   `content-readiness:: ready` is the field    (closed inline code is context)
const FIELD_PATTERN_LINE = new RegExp(
  "^\\s*`?(?:" + FIELDS.join("|") + ")::[^\\n]*$",
  "gm"
)

// Walk the content tree, collect all .md files.
function walkMarkdown(dir) {
  const out = []
  const skip = new Set([".obsidian", ".quartz-cache", "node_modules", ".git", ".next"])
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(p))
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(p)
    }
  }
  return out
}

// Split content into [frontmatter-including-fences, body]. If no frontmatter
// is present, returns ["", content].
function splitFrontmatter(content) {
  const match = content.match(/^(---\n[\s\S]*?\n---\n)/)
  if (!match) return ["", content]
  return [match[1], content.slice(match[1].length)]
}

function stripBodyLines(body) {
  // Replace matched lines with empty string, then collapse runs of 3+
  // consecutive newlines down to 2 so we don't leave massive vertical gaps.
  const stripped = body.replace(FIELD_PATTERN_LINE, "")
  const collapsed = stripped.replace(/\n{3,}/g, "\n\n")
  return collapsed
}

function main() {
  console.log("═══════════════════════════════════════════════════════════")
  console.log("  strip-inline-dataview.cjs")
  console.log("  Removing body-level Obsidian Dataview inline field syntax")
  console.log("  Mode:", WRITE ? "WRITE" : "DRY RUN")
  console.log("═══════════════════════════════════════════════════════════\n")

  const files = walkMarkdown(CONTENT_DIR)
  const perFieldCounts = Object.fromEntries(FIELDS.map((f) => [f, 0]))
  const touched = []
  let totalLinesRemoved = 0
  let errors = 0

  for (const f of files) {
    let content
    try {
      content = fs.readFileSync(f, "utf8")
    } catch (e) {
      console.error("  READ ERROR:", f, e.message)
      errors++
      continue
    }

    const [fm, body] = splitFrontmatter(content)

    // Count per-field hits in body for reporting
    const hitsBeforeByField = {}
    for (const field of FIELDS) {
      const re = new RegExp("^\\s*`?" + field + "::[^\\n]*$", "gm")
      const m = body.match(re)
      if (m) {
        hitsBeforeByField[field] = m.length
        perFieldCounts[field] += m.length
      }
    }

    if (Object.keys(hitsBeforeByField).length === 0) continue

    const newBody = stripBodyLines(body)
    const linesRemoved = Object.values(hitsBeforeByField).reduce((a, b) => a + b, 0)
    totalLinesRemoved += linesRemoved

    touched.push({
      path: path.relative(CONTENT_DIR, f),
      linesRemoved,
      fields: hitsBeforeByField,
    })

    if (VERBOSE) {
      console.log(
        "  " +
          path.relative(CONTENT_DIR, f) +
          " — " +
          linesRemoved +
          " lines: " +
          Object.entries(hitsBeforeByField)
            .map(([k, v]) => k + "(" + v + ")")
            .join(", ")
      )
    }

    if (WRITE) {
      try {
        fs.writeFileSync(f, fm + newBody, "utf8")
      } catch (e) {
        console.error("  WRITE ERROR:", f, e.message)
        errors++
      }
    }
  }

  console.log("\n═══ SUMMARY ═══════════════════════════════════════════════\n")
  console.log("  Files scanned:", files.length)
  console.log("  Files with inline-dataview body lines:", touched.length)
  console.log("  Total lines removed:", totalLinesRemoved)
  console.log("  Errors:", errors)
  console.log("")
  console.log("  Per-field hits:")
  for (const [k, v] of Object.entries(perFieldCounts)) {
    if (v > 0) console.log("    " + k.padEnd(22) + " " + v)
  }

  if (!WRITE) {
    console.log("\n  ⚠ DRY RUN — no files modified. Re-run with --write to apply.\n")
  } else {
    console.log("\n  ✓", touched.length, "files updated.\n")
  }

  if (errors > 0) process.exit(1)
}

main()
