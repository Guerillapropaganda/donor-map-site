#!/usr/bin/env node
/**
 * cleanup-opposes-frontmatter.cjs — one-time data hygiene migration
 *
 * Phase B-0 of the librarian-rewrite plan (ADR-0026 follow-up).
 *
 * The 2026-04-28 canonical-gap audit found that 43% of frontmatter
 * `opposes:` entries are dirty references that won't resolve to any
 * profile or graph entity:
 *
 *   - 36 entries with " Master Profile" suffix from filenames
 *     (e.g. "Josh Hawley Master Profile" — should be "Josh Hawley")
 *   - 36 entries with leading underscore (file-prefix leakage)
 *   - 13 entries with parenthetical annotations
 *     (e.g. "Amazon (antitrust target)" — strip parenthetical
 *     when the bare prefix is a likely entity name)
 *   - 4 entries that are concepts not entities
 *     (e.g. "Predatory lenders") — LEAVE ALONE, flag for review
 *
 * This script ONLY rewrites the demonstrably-junk patterns. Concept
 * entries and pure-narrative descriptions are preserved as-is and
 * surfaced in the report for editorial review.
 *
 * Usage:
 *   node scripts/cleanup-opposes-frontmatter.cjs            # dry-run, prints diff
 *   node scripts/cleanup-opposes-frontmatter.cjs --write    # actually edit files
 *
 * Idempotent: re-running with no changes left to make is a no-op.
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const WRITE = process.argv.includes("--write")

// ─── Walk profiles ────────────────────────────────────────────────────

function walkMd(dir, results = []) {
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return results }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      walkMd(full, results)
    } else if (entry.name.endsWith(".md")) {
      results.push(full)
    }
  }
  return results
}

// ─── Cleanup transformations ──────────────────────────────────────────

/**
 * Returns { cleaned, action } where:
 *   action = "noop" | "stripped-suffix" | "stripped-underscore" | "stripped-paren" | "flagged-concept" | "flagged-narrative"
 *
 * Only stripped-* actions are written. Flagged actions are reported
 * but the entry is left as-is for editorial review.
 */
function cleanEntry(s) {
  if (typeof s !== "string") return { cleaned: s, action: "noop" }
  const orig = s
  let cur = s.trim()

  // Strip leading underscore (file prefix leakage like "_Donald Trump Master Profile")
  let strippedUnderscore = false
  if (cur.startsWith("_")) {
    cur = cur.slice(1).trim()
    strippedUnderscore = true
  }

  // Strip " Master Profile" suffix
  let strippedSuffix = false
  const suffixMatch = cur.match(/^(.+?)\s+Master Profile$/i)
  if (suffixMatch) {
    cur = suffixMatch[1].trim()
    strippedSuffix = true
  }

  // Strip trailing parenthetical annotation IF the bare prefix is a
  // plausible entity name (>= 3 chars, no internal parens, looks like
  // a proper noun). Skip pure-narrative cases.
  let strippedParen = false
  const parenMatch = cur.match(/^(.+?)\s*\(.+\)$/)
  if (parenMatch) {
    const bare = parenMatch[1].trim()
    if (
      bare.length >= 3 &&
      !bare.includes("(") &&
      // Heuristic: bare prefix is one or two title-case-y words, OR a
      // recognized brand. We err conservative — only strip when the
      // bare prefix looks like a clean entity name.
      (
        /^[A-Z]/.test(bare) &&  // starts with uppercase (proper noun)
        bare.split(/\s+/).length <= 4  // not a full sentence
      )
    ) {
      cur = bare
      strippedParen = true
    }
  }

  // Concept-detection: doesn't get rewritten, just flagged
  const isConcept = /(^|\s)(industry|sector|lenders|insurgents|caucus|capital)$/i.test(cur)
  const isPureNarrative = /\(.+\)/.test(cur) || /(via |through |under )/i.test(cur)

  let action = "noop"
  if (strippedSuffix && strippedUnderscore) action = "stripped-suffix-and-underscore"
  else if (strippedSuffix) action = "stripped-suffix"
  else if (strippedUnderscore) action = "stripped-underscore"
  else if (strippedParen) action = "stripped-paren"
  else if (isConcept) action = "flagged-concept"
  else if (isPureNarrative) action = "flagged-narrative"

  return { cleaned: cur, action, original: orig }
}

// ─── Frontmatter parse + rewrite ──────────────────────────────────────

function parseFrontmatter(text) {
  const m = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/)
  if (!m) return null
  let data
  try { data = yaml.load(m[2]) } catch { return null }
  return { data, prefix: m[1], yamlBody: m[2], suffix: m[3], rest: text.slice(m[0].length) }
}

function dumpYaml(data) {
  return yaml.dump(data, { lineWidth: -1, noRefs: true, quotingType: '"' }).replace(/\n$/, "")
}

// extractEntityList — same shape as audit script
function extractEntityList(field) {
  if (!field) return []
  if (Array.isArray(field)) {
    return field.filter((x) => typeof x === "string")
  }
  if (typeof field === "string") {
    return field.split(/[·,;|]/).map((s) => s.trim()).filter((s) => s.length > 0)
  }
  return []
}

function stripWikilinks(s) {
  if (typeof s !== "string") return s
  const m = s.match(/\[\[(.+?)\]\]/)
  return m ? m[1].trim() : s.trim()
}

function buildWikilink(s) {
  return `[[${s}]]`
}

// Detect format of original opposes field so we can preserve it
function detectFormat(field) {
  if (Array.isArray(field)) return { type: "array", sep: null }
  if (typeof field === "string") {
    if (/\s·\s/.test(field)) return { type: "string", sep: " · " }
    if (/,\s/.test(field)) return { type: "string", sep: ", " }
    if (/;\s/.test(field)) return { type: "string", sep: "; " }
    return { type: "string", sep: " · " }
  }
  return { type: "array", sep: null }
}

function reserialize(field, cleanedEntries) {
  // Preserves original format. cleanedEntries is array of cleaned strings.
  // For string format, wraps each in [[...]] (matching the existing convention).
  const fmt = detectFormat(field)
  if (fmt.type === "array") return cleanedEntries
  // Was string — preserve format with wikilinks
  return cleanedEntries.map((s) => /^\[\[.+?\]\]$/.test(s) ? s : buildWikilink(s)).join(fmt.sep)
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  const files = walkMd(CONTENT_DIR)
  const stats = {
    files_scanned: files.length,
    profiles_with_opposes: 0,
    entries_examined: 0,
    rewritten: 0,
    flagged: 0,
    files_touched: 0,
  }
  const actionCounts = new Map()
  const flagged = { concept: [], narrative: [] }
  const rewriteSamples = []

  for (const file of files) {
    let text
    try { text = fs.readFileSync(file, "utf-8") } catch { continue }
    const fm = parseFrontmatter(text)
    if (!fm || !fm.data) continue
    const opposesField = fm.data.opposes
    if (!opposesField) continue
    stats.profiles_with_opposes++

    const entries = extractEntityList(opposesField)
    if (entries.length === 0) continue

    const cleaned = []
    let dirty = false
    for (const raw of entries) {
      stats.entries_examined++
      // Strip wikilink wrapper if present, then clean, then re-wrap if needed
      const inner = stripWikilinks(raw)
      const result = cleanEntry(inner)
      actionCounts.set(result.action, (actionCounts.get(result.action) || 0) + 1)

      if (result.action === "flagged-concept") {
        flagged.concept.push({ profile: fm.data.title, entry: result.original })
      } else if (result.action === "flagged-narrative") {
        flagged.narrative.push({ profile: fm.data.title, entry: result.original })
      }

      // If cleaned vs raw differs (after stripping), record as rewrite
      const wasWikilinked = /^\[\[.+?\]\]$/.test(raw)
      const finalForm = wasWikilinked ? buildWikilink(result.cleaned) : result.cleaned
      if (finalForm !== raw) {
        dirty = true
        stats.rewritten++
        if (rewriteSamples.length < 12) {
          rewriteSamples.push({ profile: fm.data.title, before: raw, after: finalForm })
        }
      }
      cleaned.push(finalForm)
    }

    if (dirty) {
      stats.files_touched++
      // Reserialize using original format
      fm.data.opposes = reserialize(opposesField, cleaned)
      const newYaml = dumpYaml(fm.data)
      const newText = `${fm.prefix}${newYaml}${fm.suffix}${fm.rest}`
      if (WRITE) {
        fs.writeFileSync(file, newText, "utf-8")
      }
    }
  }

  stats.flagged = flagged.concept.length + flagged.narrative.length

  console.log(`\n=== cleanup-opposes-frontmatter ===`)
  console.log(`Files scanned: ${stats.files_scanned}`)
  console.log(`Profiles with opposes: ${stats.profiles_with_opposes}`)
  console.log(`Entries examined: ${stats.entries_examined}`)
  console.log(`Entries rewritten: ${stats.rewritten}`)
  console.log(`Files touched: ${stats.files_touched}`)
  console.log(`Entries flagged for editorial review: ${stats.flagged}`)
  console.log()

  console.log("Action breakdown:")
  for (const [action, count] of [...actionCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${action}`)
  }

  if (rewriteSamples.length > 0) {
    console.log("\nRewrite samples:")
    for (const s of rewriteSamples) {
      console.log(`  [${s.profile}]`)
      console.log(`    BEFORE: ${s.before}`)
      console.log(`    AFTER:  ${s.after}`)
    }
  }

  if (flagged.concept.length > 0) {
    console.log(`\nFlagged: concept-level entries (${flagged.concept.length}) — left as-is, need editorial review:`)
    for (const f of flagged.concept) console.log(`  [${f.profile}] "${f.entry}"`)
  }
  if (flagged.narrative.length > 0) {
    console.log(`\nFlagged: pure-narrative entries (${flagged.narrative.length}) — left as-is, need editorial review:`)
    for (const f of flagged.narrative) console.log(`  [${f.profile}] "${f.entry}"`)
  }

  if (!WRITE) console.log(`\n  (DRY-RUN — re-run with --write to apply)`)
}

main()
