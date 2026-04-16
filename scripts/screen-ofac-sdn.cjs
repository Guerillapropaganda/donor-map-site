#!/usr/bin/env node
/**
 * screen-ofac-sdn.cjs — Screen vault entities against the OFAC
 * Specially Designated Nationals (SDN) sanctions list.
 *
 * Input: data/bulk/ofac-sdn-sanctions.zip (SDN_ENHANCED.XML)
 * Output: Report at content/Admin Notes/ofac-sdn-screening-report.md
 *
 * Uses regex extraction instead of full XML parse — the XML is 106MB
 * and we only need names. Much faster than loading a DOM parser.
 *
 * Usage:
 *   node scripts/screen-ofac-sdn.cjs
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const yaml = require('js-yaml')

const { normalizeTitle } = require('./lib/relationship-edge-validator.cjs')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const REPORT_PATH = path.join(ROOT, 'content', 'Admin Notes', 'ofac-sdn-screening-report.md')
const ZIP = path.join(BULK_DIR, 'ofac-sdn-sanctions.zip')

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(mr\.?|mrs\.?|ms\.?|dr\.?|jr\.?|sr\.?|ii|iii|iv|inc\.?|llc\.?|ltd\.?|corp\.?)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function main() {
  console.log('')
  console.log('═══ OFAC SDN Sanctions Screening ═══')
  console.log('')

  if (!fs.existsSync(ZIP)) {
    console.log('  ERROR: ofac-sdn-sanctions.zip not found')
    return
  }

  // Step 1: Build vault name index
  console.log('  building vault name index...')
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(CONTENT, '.md')
  const nameIndex = new Map()
  let profileCount = 0

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (!data.title || !data.type) continue
      profileCount++

      const title = normalizeTitle(data.title)
      const normalized = normalizeName(title)
      if (normalized && normalized.length >= 3) {
        nameIndex.set(normalized, { title, path: filePath, type: data.type })
      }

      // Handle "ACRONYM - Full Name"
      const dashParts = (data.title || '').split(' - ')
      if (dashParts.length >= 2) {
        const fullName = normalizeName(dashParts.slice(1).join(' - '))
        if (fullName && !nameIndex.has(fullName)) {
          nameIndex.set(fullName, { title, path: filePath, type: data.type })
        }
      }
    } catch (_) { continue }
  }
  console.log(`    ${profileCount} profiles, ${nameIndex.size} name variants`)

  // Step 2: Extract names from OFAC XML via regex
  console.log('  extracting SDN names (106MB XML)...')
  const raw = execSync(`unzip -p "${ZIP}"`, {
    maxBuffer: 200 * 1024 * 1024,
    encoding: 'utf-8',
  })

  // Extract primary names and aliases
  const sdnNames = new Map() // normalized → { original, sdnId, type, programs }

  // Extract all <formattedFullName> tags
  const fullNameRe = /<formattedFullName>(.*?)<\/formattedFullName>/g
  let nameMatch
  let nameCount = 0
  while ((nameMatch = fullNameRe.exec(raw)) !== null) {
    const name = nameMatch[1].trim()
    if (!name) continue
    nameCount++
    const normalized = normalizeName(name)
    if (normalized && !sdnNames.has(normalized)) {
      sdnNames.set(normalized, { original: name })
    }
  }

  console.log(`    ${nameCount} name entries, ${sdnNames.size} unique normalized`)

  // Step 3: Match
  console.log('  matching against vault...')
  const matches = []

  for (const [normalized, sdnInfo] of sdnNames) {
    const vaultMatch = nameIndex.get(normalized)
    if (vaultMatch) {
      matches.push({
        sdnName: sdnInfo.original,
        vaultTitle: vaultMatch.title,
        vaultPath: vaultMatch.path,
        vaultType: vaultMatch.type,
      })
    }
  }

  console.log(`    ${matches.length} matches`)

  if (matches.length === 0) {
    console.log('')
    console.log('  No matches. Vault entities are clean against OFAC SDN list.')
    return
  }

  // Step 4: Report
  console.log('')
  for (const m of matches) {
    console.log(`  MATCH: ${m.vaultTitle} (${m.vaultType}) → "${m.sdnName}" on SDN list`)
  }

  let report = `---\ntitle: OFAC SDN Sanctions Screening Report\ntype: admin-note\nnote-type: data\npriority: urgent\nstatus: open\nlast-updated: ${new Date().toISOString().slice(0, 10)}\n---\n\n`
  report += `# OFAC SDN Sanctions Screening Report\n\n`
  report += `**Screened:** ${new Date().toISOString().slice(0, 10)}\n`
  report += `**Database:** OFAC Specially Designated Nationals list (as of 2026-04-15)\n`
  report += `**Vault profiles screened:** ${profileCount}\n\n`
  report += `> **WARNING:** A match means a vault entity's name appears on the US Treasury sanctions list. This could be a name collision (different person/entity) or a genuine match. David must verify each one.\n\n`
  report += `## Matches (${matches.length})\n\n`
  report += `| Vault Profile | SDN Name | Profile Type |\n|---|---|---|\n`
  for (const m of matches) {
    report += `| [[${m.vaultTitle}]] | ${m.sdnName} | ${m.vaultType} |\n`
  }
  report += `\n## Verification\n\nCheck each match at: https://sanctionssearch.ofac.treas.gov/\n`

  fs.writeFileSync(REPORT_PATH, report, 'utf-8')
  console.log('')
  console.log(`  Report: ${REPORT_PATH}`)
}

main()
