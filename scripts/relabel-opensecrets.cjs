/**
 * Relabel OpenSecrets citations that now point to government URLs.
 *
 * Fixes: [OpenSecrets: Description](https://fec.gov/...) → [FEC: Description](https://fec.gov/...)
 * Same for Congress.gov and LDA URLs.
 */

const fs = require('fs')
const path = require('path')

const CONTENT_DIR = path.resolve(__dirname, '..', 'content')
const DRY_RUN = process.argv.includes('--dry-run')

// Domain → new label prefix
const RELABEL_MAP = [
  { pattern: /fec\.gov\/data\/candidate/i, prefix: 'FEC Candidate' },
  { pattern: /fec\.gov\/data\/committee/i, prefix: 'FEC Committee' },
  { pattern: /fec\.gov\/data\/receipts/i, prefix: 'FEC Receipts' },
  { pattern: /fec\.gov\/data\/disbursements/i, prefix: 'FEC Disbursements' },
  { pattern: /fec\.gov\/data\/independent-expenditures/i, prefix: 'FEC Independent Expenditures' },
  { pattern: /fec\.gov/i, prefix: 'FEC' },
  { pattern: /congress\.gov\/member/i, prefix: 'Congress.gov Member' },
  { pattern: /congress\.gov\/bill/i, prefix: 'Congress.gov Bill' },
  { pattern: /congress\.gov/i, prefix: 'Congress.gov' },
  { pattern: /lda\.(senate|gov)\.gov\/filings/i, prefix: 'Senate LDA Filings' },
  { pattern: /lda\.(senate|gov)/i, prefix: 'Senate LDA' },
]

function getNewPrefix(url) {
  for (const { pattern, prefix } of RELABEL_MAP) {
    if (pattern.test(url)) return prefix
  }
  return null
}

function findMarkdownFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['Assets', 'node_modules', '.obsidian', '.git', 'ops'].includes(entry.name)) continue
      results.push(...findMarkdownFiles(full))
    } else if (entry.name.endsWith('.md')) {
      results.push(full)
    }
  }
  return results
}

// Match: [OpenSecrets: Something](https://fec.gov/... or congress.gov/... or lda.senate.gov/...)
const MISMATCH_RE = /\[OpenSecrets:\s*([^\]]+)\]\((https?:\/\/(?:www\.)?(?:fec\.gov|congress\.gov|lda\.senate\.gov|lda\.gov)[^)]*)\)/g

let totalFixed = 0
let filesFixed = 0

const files = findMarkdownFiles(CONTENT_DIR)
console.log(`Scanning ${files.length} files...`)

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  let modified = false
  let fileCount = 0

  content = content.replace(MISMATCH_RE, (match, description, url) => {
    const newPrefix = getNewPrefix(url)
    if (!newPrefix) return match

    // Clean up the description — remove "OpenSecrets:" prefix artifacts
    let cleanDesc = description.trim()

    // Build new label: "FEC: Original Description"
    // But avoid "FEC: FEC something" — check if desc already starts with the new prefix
    if (cleanDesc.toLowerCase().startsWith(newPrefix.toLowerCase())) {
      // Already has the right prefix somehow
      return `[${newPrefix}: ${cleanDesc.slice(newPrefix.length).replace(/^[\s:]+/, '')}](${url})`
    }

    const newLabel = `${newPrefix}: ${cleanDesc}`
    modified = true
    fileCount++
    totalFixed++
    return `[${newLabel}](${url})`
  })

  if (modified) {
    filesFixed++
    const rel = path.relative(CONTENT_DIR, file)
    if (DRY_RUN) {
      console.log(`  Would fix ${fileCount} in ${rel}`)
    } else {
      fs.writeFileSync(file, content, 'utf-8')
      console.log(`  Fixed ${fileCount} in ${rel}`)
    }
  }
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Done: ${totalFixed} labels fixed across ${filesFixed} files`)
