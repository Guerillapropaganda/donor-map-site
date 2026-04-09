#!/usr/bin/env node
/**
 * link-unlinked-names.cjs
 *
 * Scans all markdown files for profile names that appear as plain text or **bold**
 * but aren't wikilinked ([[Name]]). If a profile exists for that name, reports it
 * or auto-fixes it.
 *
 * Usage:
 *   node scripts/link-unlinked-names.cjs              # dry run — report only
 *   node scripts/link-unlinked-names.cjs --write       # fix all matches
 *   node scripts/link-unlinked-names.cjs --profile "Donald Trump"  # single file
 */

const fs = require('fs')
const path = require('path')
const CONTENT_ROOT = path.join(__dirname, '..', 'content')

const args = process.argv.slice(2)
const WRITE_MODE = args.includes('--write')
const SINGLE_PROFILE = args.find((a, i) => args[i - 1] === '--profile') || null

// ─── Step 1: Build profile name map ──────────────────────────────────
// Scan all profile directories, extract names from folder/file names
function buildProfileMap() {
  const profiles = new Map() // name → relative path (for wikilink target)

  function scanDir(dir, depth = 0) {
    if (depth > 6) return
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        // Check for _Master Profile inside
        const masterFiles = fs.readdirSync(fullPath).filter(f => f.includes('Master Profile'))
        if (masterFiles.length > 0) {
          const name = entry.name.replace(/_/g, ' ').trim()
          const relPath = path.relative(CONTENT_ROOT, fullPath).replace(/\\/g, '/')
          profiles.set(name, relPath)
        }
        scanDir(fullPath, depth + 1)
      } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        // Standalone profile (no folder, just a .md file)
        const name = entry.name.replace('.md', '').replace(/_/g, ' ').trim()
        // Skip system files, indexes, templates
        if (['index', 'Session State', 'Vault Rules', 'Pipeline Guide', 'Design System'].includes(name)) continue
        if (name.length < 3) continue
        const relPath = path.relative(CONTENT_ROOT, fullPath).replace(/\\/g, '/').replace('.md', '')
        profiles.set(name, relPath)
      }
    }
  }

  scanDir(path.join(CONTENT_ROOT, 'Politicians'))
  scanDir(path.join(CONTENT_ROOT, 'Donors & Power Networks'))
  scanDir(path.join(CONTENT_ROOT, 'Lobbying Firms & K Street'))
  scanDir(path.join(CONTENT_ROOT, 'Think Tanks & Policy Infrastructure'))
  scanDir(path.join(CONTENT_ROOT, 'Media & Influence Pipeline'))

  return profiles
}

// ─── Step 2: Scan files for unlinked names ───────────────────────────
function scanFile(filePath, profiles) {
  let content
  try { content = fs.readFileSync(filePath, 'utf-8') } catch { return { matches: [], content: null } }

  const fileName = path.basename(filePath, '.md').replace(/_/g, ' ')
  const matches = []

  // Split into lines for reporting
  const lines = content.split('\n')

  for (const [name, profilePath] of profiles) {
    // Skip self-references (don't link a profile to itself)
    if (fileName.includes(name) || name.includes(fileName.replace(' Master Profile', ''))) continue

    // Skip very short names that would cause false positives
    if (name.length < 5) continue

    // Skip names that are just single common words
    if (name.split(' ').length < 2 && !['AIPAC', 'PhRMA', 'Google', 'Amazon', 'Meta', 'Pfizer', 'Boeing', 'Chevron', 'Oracle', 'Halliburton'].includes(name)) continue

    // Build regex: find name NOT inside [[ ]] and NOT already a wikilink
    // Match: **Name** or plain Name at word boundaries
    // But NOT [[Name]] or [[Something|Name]]

    // First check if this name appears at all
    if (!content.includes(name)) continue

    // Find instances of the name that are NOT inside wikilinks
    // Strategy: find all occurrences, check if they're inside [[ ]]
    let idx = 0
    while (idx < content.length) {
      const pos = content.indexOf(name, idx)
      if (pos === -1) break

      // Check if inside a wikilink [[ ... ]]
      const before100 = content.substring(Math.max(0, pos - 100), pos)
      const after100 = content.substring(pos, Math.min(content.length, pos + name.length + 100))

      const insideWikilink = (before100.lastIndexOf('[[') > before100.lastIndexOf(']]')) ||
                              (before100.includes('[[') && after100.includes(']]') && !before100.includes(']]'))

      // Check if inside a URL
      const insideUrl = before100.includes('](') && !before100.includes(')')
      const isUrl = /https?:\/\//.test(content.substring(Math.max(0, pos - 10), pos))

      // Check if inside frontmatter (between --- markers)
      const contentBefore = content.substring(0, pos)
      const frontmatterMarkers = (contentBefore.match(/^---$/gm) || []).length
      const insideFrontmatter = frontmatterMarkers === 1 // between first and second ---

      // Check if inside a YAML key
      const lineStart = content.lastIndexOf('\n', pos) + 1
      const lineContent = content.substring(lineStart, pos)
      const isYamlKey = /^[a-z-]+:\s/.test(lineContent)

      if (!insideWikilink && !insideUrl && !isUrl && !insideFrontmatter && !isYamlKey) {
        // Find the line number
        const lineNum = content.substring(0, pos).split('\n').length
        const line = lines[lineNum - 1] || ''

        // Check if it's wrapped in bold
        const charBefore = pos > 0 ? content[pos - 1] : ''
        const charBefore2 = pos > 1 ? content.substring(pos - 2, pos) : ''
        const afterName = content.substring(pos + name.length, pos + name.length + 2)
        const isBold = charBefore2 === '**' || afterName === '**'

        matches.push({
          name,
          profilePath,
          lineNum,
          isBold,
          context: line.substring(0, 120).trim()
        })
      }

      idx = pos + name.length
    }
  }

  return { matches, content }
}

// ─── Step 3: Fix unlinked names ──────────────────────────────────────
function fixFile(filePath, content, matches) {
  let fixed = content
  let fixCount = 0

  // Sort by position descending so replacements don't shift indices
  // Process unique names only (avoid double-fixing)
  const uniqueNames = [...new Set(matches.map(m => m.name))]

  for (const name of uniqueNames) {
    const match = matches.find(m => m.name === name)

    // Replace **Name** → **[[ProfilePath|Name]]** (bold + unlinked)
    const boldPattern = new RegExp(`\\*\\*${escapeRegex(name)}\\*\\*`, 'g')
    const boldReplacement = `**[[${name}]]**`
    const beforeBold = fixed
    fixed = fixed.replace(boldPattern, (m, offset) => {
      // Don't replace if already inside [[ ]]
      const before = fixed.substring(Math.max(0, offset - 5), offset)
      if (before.includes('[[')) return m
      return boldReplacement
    })
    if (fixed !== beforeBold) {
      fixCount++
      continue
    }

    // Replace plain Name at start of line/sentence → [[Name]]
    // Only if name appears as a standalone entity (start of paragraph, after period, after newline)
    // Be conservative — don't replace mid-sentence casual mentions
    const plainPattern = new RegExp(`(^|\\n|\\. |; )${escapeRegex(name)}( —| ;| \\$|,)`, 'g')
    fixed = fixed.replace(plainPattern, (m, prefix, suffix, offset) => {
      const before = fixed.substring(Math.max(0, offset - 5), offset)
      if (before.includes('[[')) return m
      return `${prefix}[[${name}]]${suffix}`
    })
    if (fixed !== content) fixCount++
  }

  if (fixCount > 0 && WRITE_MODE) {
    fs.writeFileSync(filePath, fixed, 'utf-8')
  }

  return { fixed, fixCount }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ─── Step 4: Main ────────────────────────────────────────────────────
function main() {
  console.log('Building profile name map...')
  const profiles = buildProfileMap()
  console.log(`Found ${profiles.size} profile names\n`)

  // Collect all markdown files to scan
  const filesToScan = []

  function collectFiles(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (['Admin Notes', 'Events', 'Vault Maintenance', 'Interactive', 'Templates'].includes(entry.name)) continue
        collectFiles(fullPath)
      } else if (entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
        if (SINGLE_PROFILE && !fullPath.includes(SINGLE_PROFILE)) continue
        filesToScan.push(fullPath)
      }
    }
  }

  collectFiles(CONTENT_ROOT)
  console.log(`Scanning ${filesToScan.length} files...\n`)

  let totalMatches = 0
  let totalFiles = 0
  let totalFixed = 0
  const results = []

  for (const filePath of filesToScan) {
    const { matches, content } = scanFile(filePath, profiles)

    if (matches.length > 0) {
      totalFiles++
      totalMatches += matches.length

      const relPath = path.relative(CONTENT_ROOT, filePath).replace(/\\/g, '/')

      if (WRITE_MODE) {
        const { fixCount } = fixFile(filePath, content, matches)
        totalFixed += fixCount
        if (fixCount > 0) {
          console.log(`FIXED ${relPath}: ${fixCount} names linked`)
        }
      } else {
        console.log(`\n${relPath}:`)
        // Deduplicate by name for cleaner output
        const seen = new Set()
        for (const m of matches) {
          if (seen.has(m.name)) continue
          seen.add(m.name)
          const count = matches.filter(x => x.name === m.name).length
          const boldFlag = m.isBold ? ' (bold)' : ''
          console.log(`  Line ${m.lineNum}: "${m.name}"${boldFlag} × ${count} — should be [[${m.name}]]`)
        }

        results.push({ file: relPath, matches })
      }
    }
  }

  console.log('\n─────────────────────────────')
  if (WRITE_MODE) {
    console.log(`Fixed ${totalFixed} names across ${totalFiles} files`)
  } else {
    console.log(`Found ${totalMatches} unlinked names across ${totalFiles} files`)
    console.log(`Run with --write to auto-fix`)
  }
}

main()
