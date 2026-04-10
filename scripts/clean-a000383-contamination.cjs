#!/usr/bin/env node
/**
 * clean-a000383-contamination.cjs
 *
 * Remove congress pipeline auto-blocks containing the bogus A000383
 * bioguide ID. The pipeline fuzzy-matched on name and returned the
 * wrong member (Rick Allen, R-GA-12) for dozens of profiles including
 * governors, presidential candidates, cabinet members, and even some
 * actual House/Senate members. All affected blocks contain garbage data.
 *
 * Affected auto-blocks:
 *   - auto:congress-legislation
 *   - auto:committee-assignments
 *   - auto:voting-record
 *
 * Also removes bioguide-id: A000383 from frontmatter if present.
 *
 * Run:
 *   node scripts/clean-a000383-contamination.cjs           # dry run
 *   node scripts/clean-a000383-contamination.cjs --write   # actually write
 */

const fs = require("fs")
const path = require("path")

const CONTENT_DIR = path.join(__dirname, "..", "content")
const WRITE = process.argv.includes("--write")

const CONTAMINATED_BLOCKS = [
  "congress-legislation",
  "committee-assignments",
  "voting-record",
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

function blockContainsA000383(content, blockName) {
  const re = new RegExp(
    `<!--\\s*auto:${blockName}\\s+start\\s*-->([\\s\\S]*?)<!--\\s*auto:${blockName}\\s+end\\s*-->`,
    "i"
  )
  const match = content.match(re)
  if (!match) return false
  return /a000383/i.test(match[1])
}

function removeBlock(content, blockName) {
  const re = new RegExp(
    `<!--\\s*auto:${blockName}\\s+start\\s*-->[\\s\\S]*?<!--\\s*auto:${blockName}\\s+end\\s*-->`,
    "gi"
  )
  return content.replace(re, "")
}

function cleanFile(filePath) {
  let content
  try {
    content = fs.readFileSync(filePath, "utf-8").replace(/\0/g, "")
  } catch {
    return null
  }

  // Quick pre-check: does the file contain A000383 anywhere?
  if (!/a000383/i.test(content)) return null

  const removedBlocks = []
  let changed = content
  for (const blockName of CONTAMINATED_BLOCKS) {
    if (blockContainsA000383(changed, blockName)) {
      changed = removeBlock(changed, blockName)
      removedBlocks.push(blockName)
    }
  }

  // Remove bioguide-id: A000383 from frontmatter if present
  let frontmatterFix = false
  changed = changed.replace(/^bioguide-id:\s*["']?A000383["']?\s*$/im, () => {
    frontmatterFix = true
    return ""
  })

  // Collapse extra newlines
  changed = changed.replace(/\n{3,}/g, "\n\n")

  if (removedBlocks.length === 0 && !frontmatterFix) return null

  return { removedBlocks, frontmatterFix, cleaned: changed }
}

function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  A000383 contamination cleanup")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will modify files)" : "DRY RUN (preview only)"}`)
  console.log()

  const politiciansDir = path.join(CONTENT_DIR, "Politicians")
  if (!fs.existsSync(politiciansDir)) {
    console.log("  ✗ Politicians directory not found")
    process.exit(1)
  }

  const files = walkMarkdown(politiciansDir)
  let affected = 0
  let blocksRemoved = 0
  let frontmatterFixes = 0

  for (const filePath of files) {
    const result = cleanFile(filePath)
    if (result) {
      affected++
      blocksRemoved += result.removedBlocks.length
      if (result.frontmatterFix) frontmatterFixes++
      const rel = path.relative(CONTENT_DIR, filePath).replace(/\\/g, "/")
      console.log(`  ✗ ${rel}`)
      if (result.removedBlocks.length > 0) console.log(`      blocks: ${result.removedBlocks.join(", ")}`)
      if (result.frontmatterFix) console.log(`      frontmatter bioguide-id removed`)
      if (WRITE) {
        fs.writeFileSync(filePath, result.cleaned, "utf-8")
      }
    }
  }

  console.log()
  console.log(`  Affected files:     ${affected}`)
  console.log(`  Blocks removed:     ${blocksRemoved}`)
  console.log(`  Frontmatter fixes:  ${frontmatterFixes}`)
  if (!WRITE && affected > 0) console.log(`  Re-run with --write to actually clean`)
  console.log()
}

main()
