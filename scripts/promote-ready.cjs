#!/usr/bin/env node
/**
 * Promote developed files to ready if they pass quality gates:
 * - Has YAML frontmatter
 * - At least 50 lines
 * - Uses ### headers (not bold-as-header)
 * - Has source citations (links or source references)
 */
const fs = require("fs")
const path = require("path")

const CONTENT_DIR = path.resolve(__dirname, "..", "content")
const SKIP_DIRS = [".obsidian", "_templates", "Assets", "Excalidraw", "Vault Maintenance"]

function getAllMarkdownFiles(dir) {
  let results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue
      results = results.concat(getAllMarkdownFiles(full))
    } else if (entry.name.endsWith(".md")) {
      results.push(full)
    }
  }
  return results
}

const files = getAllMarkdownFiles(CONTENT_DIR)
let promoted = 0
let skipped = []

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8")

  // Must be developed
  if (!content.includes("content-readiness: developed")) continue

  const lines = content.split("\n")
  const relPath = path.relative(CONTENT_DIR, file)

  // Gate: at least 50 lines
  if (lines.length < 50) {
    skipped.push({ file: relPath, reason: "under 50 lines (" + lines.length + ")" })
    continue
  }

  // Gate: no bold-as-headers remaining
  const hasBoldHeaders = lines.some(l => /^\*\*[^*]+\*\*\s*$/.test(l))
  if (hasBoldHeaders) {
    skipped.push({ file: relPath, reason: "still has bold-as-headers" })
    continue
  }

  // Gate: has ### headers
  const hasH3 = lines.some(l => l.startsWith("### "))
  if (!hasH3) {
    skipped.push({ file: relPath, reason: "no ### headers" })
    continue
  }

  // Gate: has sources (links or citation markers)
  const hasLinks = content.includes("](http") || content.includes("## Sources") || content.includes("## Key Sources") || content.includes("source-tier:")
  if (!hasLinks) {
    skipped.push({ file: relPath, reason: "no source citations found" })
    continue
  }

  // All gates passed — promote
  const updated = content.replace("content-readiness: developed", "content-readiness: ready")
  fs.writeFileSync(file, updated, "utf-8")
  promoted++
  console.log(`  ✓ ${relPath}`)
}

console.log(`\nPromoted: ${promoted}`)
console.log(`Skipped:  ${skipped.length}`)
if (skipped.length > 0) {
  console.log("\nSkipped files:")
  for (const s of skipped) {
    console.log(`  ✗ ${s.file} — ${s.reason}`)
  }
}
