#!/usr/bin/env node
/**
 * Fix bold-as-header: converts **Text** on its own line to ### Text
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

let filesModified = 0
let headersConverted = 0

const files = getAllMarkdownFiles(CONTENT_DIR)
console.log(`Scanning ${files.length} markdown files...`)

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8")
  const lines = content.split("\n")
  let changed = false
  let inFrontmatter = false
  let frontmatterCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track YAML frontmatter
    if (line.trim() === "---") {
      frontmatterCount++
      if (frontmatterCount === 1) inFrontmatter = true
      if (frontmatterCount === 2) inFrontmatter = false
      continue
    }
    if (inFrontmatter) continue

    // Match lines that are ONLY bold text: **Some Text**
    const match = line.match(/^\*\*([^*]+)\*\*\s*$/)
    if (match) {
      lines[i] = `### ${match[1].trim()}`
      headersConverted++
      changed = true
    }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join("\n"), "utf-8")
    filesModified++
  }
}

console.log(`\nDone.`)
console.log(`  Files modified:    ${filesModified}`)
console.log(`  Headers converted: ${headersConverted}`)
