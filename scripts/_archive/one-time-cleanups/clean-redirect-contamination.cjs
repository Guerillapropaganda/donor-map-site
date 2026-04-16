#!/usr/bin/env node
/**
 * clean-redirect-contamination.cjs — strip auto-block data from redirect files
 *
 * Pipelines were running on redirect files and writing fabricated data (e.g.
 * Meta redirect getting NHTSA vehicle recalls). This script finds all redirect
 * files and removes every <!-- auto:* --> block plus any enrichment frontmatter
 * fields (lobbying-spend, etc).
 *
 * Run:
 *   node scripts/clean-redirect-contamination.cjs           # dry run
 *   node scripts/clean-redirect-contamination.cjs --write   # actually write
 */

const fs = require("fs")
const path = require("path")

const CONTENT_DIR = path.join(__dirname, "..", "content")
const WRITE = process.argv.includes("--write")

const AUTO_BLOCK_RE = /<!--\s*auto:[a-z0-9-]+\s+start\s*-->[\s\S]*?<!--\s*auto:[a-z0-9-]+\s+end\s*-->/g
const ENRICHMENT_FIELDS = [
  "lobbying-spend",
  "lobbying-filings",
  "federal-contracts",
  "ein",
  "total-revenue",
  "fec-candidate-id",
  "fec-committee-id",
  "bioguide-id",
  "total-raised",
  "total-spent",
  "bills-sponsored",
  "govtrack-id",
]

function walkMarkdown(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walkMarkdown(full, results)
    else if (entry.isFile() && entry.name.endsWith(".md")) results.push(full)
  }
  return results
}

function isRedirect(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  const fm = fmMatch ? fmMatch[1] : ""
  const body = fmMatch ? content.slice(fmMatch[0].length) : content
  if (/^title:.*\(redirect\)/im.test(fm)) return true
  if (/^redirect:\s*true/m.test(fm)) return true
  if (/^#redirect\b/m.test(body)) return true
  if (/\*\*this file is a redirect\*\*/i.test(body)) return true
  return false
}

function cleanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8")
  if (!isRedirect(content)) return null

  const fmMatch = content.match(/^(---\n[\s\S]*?\n---\n)/)
  if (!fmMatch) return null
  let frontmatter = fmMatch[1]
  let body = content.slice(frontmatter.length)

  // Remove auto-blocks
  const autoBlockCount = (body.match(AUTO_BLOCK_RE) || []).length
  body = body.replace(AUTO_BLOCK_RE, "")
  // Collapse 3+ newlines
  body = body.replace(/\n{3,}/g, "\n\n")

  // Remove enrichment frontmatter fields
  const removedFields = []
  for (const field of ENRICHMENT_FIELDS) {
    const re = new RegExp(`^${field}:.*\\n`, "m")
    if (re.test(frontmatter)) {
      frontmatter = frontmatter.replace(re, "")
      removedFields.push(field)
    }
  }

  if (autoBlockCount === 0 && removedFields.length === 0) return null

  const cleaned = frontmatter + body
  return { autoBlockCount, removedFields, cleaned }
}

function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  Redirect contamination cleanup")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will modify files)" : "DRY RUN (preview only)"}`)
  console.log()

  const files = walkMarkdown(CONTENT_DIR)
  const affected = []

  for (const filePath of files) {
    const result = cleanFile(filePath)
    if (result) {
      affected.push({ filePath, ...result })
      const rel = path.relative(CONTENT_DIR, filePath)
      console.log(`  ✗ ${rel}`)
      if (result.autoBlockCount > 0) console.log(`      auto-blocks: ${result.autoBlockCount}`)
      if (result.removedFields.length > 0) console.log(`      fields removed: ${result.removedFields.join(", ")}`)
      if (WRITE) {
        fs.writeFileSync(filePath, result.cleaned, "utf-8")
      }
    }
  }

  console.log()
  console.log(`  ${affected.length} redirect files had contamination`)
  if (!WRITE && affected.length > 0) console.log(`  Re-run with --write to actually clean`)
  console.log()
}

main()
