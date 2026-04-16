/**
 * Archive all FollowTheMoney URLs across the vault.
 *
 * FollowTheMoney.org merged into OpenSecrets — all URLs are dead.
 * Per Vault Rules: archive with strikethrough, preserve as research trail.
 *
 * Does NOT touch:
 * - Already struck-through URLs
 * - Auto-block sections (<!-- auto:* -->)
 * - Vault Maintenance/Archive files
 * - CLAUDE.md, Vault Rules.md (contain examples/documentation)
 */

const fs = require('fs')
const path = require('path')

const CONTENT_DIR = path.resolve(__dirname, '..', 'content')
const DRY_RUN = process.argv.includes('--dry-run')

const SKIP_DIRS = ['Assets', 'node_modules', '.obsidian', '.git', 'ops', 'Vault Maintenance', 'Admin Notes']
const SKIP_FILES = ['Vault Rules.md', 'Pipeline Guide.md', 'Session State.md', 'Changelog.md', 'Even More About This Website.md']

function findMarkdownFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.includes(entry.name)) continue
      results.push(...findMarkdownFiles(full))
    } else if (entry.name.endsWith('.md')) {
      if (SKIP_FILES.includes(entry.name)) continue
      results.push(full)
    }
  }
  return results
}

// Detect if line is inside an auto-block
function isInAutoBlock(lines, lineIndex) {
  let inAuto = false
  for (let i = 0; i <= lineIndex; i++) {
    if (/<!--\s*auto:/.test(lines[i]) && !/end\s*-->/.test(lines[i])) {
      inAuto = true
    }
    if (/auto:.*end\s*-->/.test(lines[i])) {
      inAuto = false
    }
  }
  return inAuto
}

// Match FollowTheMoney markdown links NOT already struck through
const FTM_LINK = /\[([^\]]*(?:FollowTheMoney|followthemoney)[^\]]*)\]\((https?:\/\/(?:www\.)?followthemoney\.org[^)]*)\)/gi
// Also match inline [Source: ... FollowTheMoney ...] without URLs
const FTM_INLINE = /\[Source:[^\]]*FollowTheMoney[^\]]*\]/gi

let totalArchived = 0
let totalInlineFlagged = 0
let filesModified = 0

const files = findMarkdownFiles(CONTENT_DIR)
console.log(`Scanning ${files.length} files...\n`)

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  const lines = content.split('\n')
  const rel = path.relative(CONTENT_DIR, file)
  let modified = false
  let fileArchived = 0
  let fileFlagged = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip auto-blocks
    if (isInAutoBlock(lines, i)) continue
    // Skip already struck-through
    if (/~~.*followthemoney/i.test(line)) continue

    // Handle markdown links: [label](followthemoney.org/...)
    FTM_LINK.lastIndex = 0
    if (FTM_LINK.test(line)) {
      FTM_LINK.lastIndex = 0
      lines[i] = line.replace(FTM_LINK, (match, label, url) => {
        fileArchived++
        totalArchived++
        // Extract tier if present after the link
        return `~~[${label}](${url})~~ (was FollowTheMoney — site merged into OpenSecrets, all URLs dead)`
      })
      modified = true
    }

    // Handle inline text citations: [Source: OpenSecrets / FollowTheMoney — Tier 1]
    FTM_INLINE.lastIndex = 0
    if (FTM_INLINE.test(lines[i]) && !lines[i].includes('~~')) {
      FTM_INLINE.lastIndex = 0
      lines[i] = lines[i].replace(FTM_INLINE, (match) => {
        fileFlagged++
        totalInlineFlagged++
        return match + ' (URL NEEDED — FollowTheMoney dead, replace with FEC or state campaign finance database)'
      })
      modified = true
    }
  }

  if (modified) {
    filesModified++
    content = lines.join('\n')
    if (DRY_RUN) {
      console.log(`  [DRY] ${rel}: ${fileArchived} archived, ${fileFlagged} inline flagged`)
    } else {
      fs.writeFileSync(file, content, 'utf-8')
      console.log(`  ${rel}: ${fileArchived} archived, ${fileFlagged} inline flagged`)
    }
  }
}

console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Summary:`)
console.log(`  URLs archived: ${totalArchived}`)
console.log(`  Inline citations flagged: ${totalInlineFlagged}`)
console.log(`  Files modified: ${filesModified}`)
