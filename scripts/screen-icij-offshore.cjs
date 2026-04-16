#!/usr/bin/env node
/**
 * screen-icij-offshore.cjs — Screen vault entities against the ICIJ
 * Offshore Leaks Database (Panama Papers, Paradise Papers, Pandora Papers).
 *
 * Input: data/bulk/icij-offshore-leaks-2025-03.zip
 *   - nodes-officers.csv (771K named individuals)
 *   - nodes-entities.csv (814K shell companies)
 *   - relationships.csv (3.3M edges linking officers to entities)
 *
 * Output: Flagged matches written to frontmatter + report file.
 * Does NOT auto-write to profiles — generates a report for David's review.
 * These are sensitive findings that need editorial verification.
 *
 * Usage:
 *   node scripts/screen-icij-offshore.cjs              # screen + report
 *   node scripts/screen-icij-offshore.cjs --write      # also write flags to profiles
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const yaml = require('js-yaml')

const { normalizeTitle } = require('./lib/relationship-edge-validator.cjs')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const REPORT_PATH = path.join(ROOT, 'content', 'Admin Notes', 'icij-offshore-screening-report.md')
const WRITE = process.argv.includes('--write')
const ZIP = path.join(BULK_DIR, 'icij-offshore-leaks-2025-03.zip')

// ─── CSV parsing ──────────────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        fields.push(current)
        current = ''
      } else {
        current += ch
      }
    }
  }
  fields.push(current)
  return fields
}

// ─── Name normalization ───────────────────────────────────────────────

function normalizePersonName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(mr\.?|mrs\.?|ms\.?|dr\.?|jr\.?|sr\.?|ii|iii|iv)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCompanyName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|corp\.?|corporation|company|co\.?|ltd\.?|limited|l\.?l\.?c\.?|l\.?p\.?|plc|group|holdings?|enterprises?|international|s\.?a\.?|s\.?a\.?r\.?l\.?|gmbh|ag|bv|nv)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('')
  console.log('═══ ICIJ Offshore Leaks Screening ═══')
  console.log(`  mode: ${WRITE ? 'WRITE (flags to profiles)' : 'REPORT ONLY'}`)
  console.log('')

  if (!fs.existsSync(ZIP)) {
    console.log('  ERROR: icij-offshore-leaks-2025-03.zip not found')
    return
  }

  // Step 1: Build vault name index
  console.log('  building vault name index...')
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(CONTENT, '.md')
  const personIndex = new Map() // normalized name → { title, path, type }
  const companyIndex = new Map()
  let profileCount = 0

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (!data.title || !data.type) continue

      const title = normalizeTitle(data.title)
      const type = data.type
      profileCount++

      if (['donor', 'politician', 'state-politician', 'journalist', 'podcaster'].includes(type)) {
        const normalized = normalizePersonName(title)
        if (normalized && normalized.split(' ').length >= 2) {
          personIndex.set(normalized, { title, path: filePath, type })
        }
        // Also add "ACRONYM - Full Name" handling
        const dashParts = (data.title || '').split(' - ')
        if (dashParts.length >= 2) {
          const fullName = normalizePersonName(dashParts.slice(1).join(' - '))
          if (fullName && !personIndex.has(fullName)) {
            personIndex.set(fullName, { title, path: filePath, type })
          }
        }
      } else if (['corporation', 'lobbying-firm', 'think-tank', 'foundation', 'pac'].includes(type)) {
        const normalized = normalizeCompanyName(title)
        if (normalized && normalized.length >= 3) {
          companyIndex.set(normalized, { title, path: filePath, type })
        }
        const dashParts = (data.title || '').split(' - ')
        if (dashParts.length >= 2) {
          const fullName = normalizeCompanyName(dashParts.slice(1).join(' - '))
          if (fullName && !companyIndex.has(fullName)) {
            companyIndex.set(fullName, { title, path: filePath, type })
          }
        }
      }
    } catch (_) { continue }
  }
  console.log(`    ${profileCount} profiles, ${personIndex.size} person names, ${companyIndex.size} company names`)

  // Step 2: Screen officers (individuals)
  console.log('  screening officers (771K names)...')
  const officerMatches = []
  const officerNodeIds = new Map() // nodeId → match info (for relationship lookup)

  const officerRaw = execSync(`unzip -p "${ZIP}" nodes-officers.csv`, {
    maxBuffer: 200 * 1024 * 1024,
    encoding: 'utf-8',
  })

  const officerLines = officerRaw.split('\n')
  for (let i = 1; i < officerLines.length; i++) {
    const line = officerLines[i]
    if (!line.trim()) continue
    const fields = parseCSVLine(line)
    const nodeId = fields[0]
    const name = fields[1]
    const countries = fields[2]
    const sourceId = fields[4]

    if (!name) continue
    const normalized = normalizePersonName(name)
    const match = personIndex.get(normalized)
    if (!match) continue

    officerMatches.push({
      nodeId,
      icijName: name,
      countries,
      source: sourceId,
      vaultTitle: match.title,
      vaultPath: match.path,
      vaultType: match.type,
    })
    officerNodeIds.set(nodeId, officerMatches[officerMatches.length - 1])
  }
  console.log(`    ${officerMatches.length} officer matches`)

  // Step 3: Screen entities (shell companies)
  console.log('  screening entities (814K companies)...')
  const entityMatches = []
  const entityNodeIds = new Map()

  const entityRaw = execSync(`unzip -p "${ZIP}" nodes-entities.csv`, {
    maxBuffer: 300 * 1024 * 1024,
    encoding: 'utf-8',
  })

  const entityLines = entityRaw.split('\n')
  for (let i = 1; i < entityLines.length; i++) {
    const line = entityLines[i]
    if (!line.trim()) continue
    const fields = parseCSVLine(line)
    const nodeId = fields[0]
    const name = fields[1]
    const jurisdiction = fields[4]
    const jurisdictionDesc = fields[5]
    const status = fields[13]
    const sourceId = fields[18]

    if (!name) continue
    const normalized = normalizeCompanyName(name)
    const match = companyIndex.get(normalized)
    if (!match) continue

    entityMatches.push({
      nodeId,
      icijName: name,
      jurisdiction,
      jurisdictionDesc,
      status,
      source: sourceId,
      vaultTitle: match.title,
      vaultPath: match.path,
      vaultType: match.type,
    })
    entityNodeIds.set(nodeId, entityMatches[entityMatches.length - 1])
  }
  console.log(`    ${entityMatches.length} entity matches`)

  // Step 4: Look up relationships for matched nodes
  console.log('  looking up relationships for matched nodes...')
  const allMatchedNodeIds = new Set([...officerNodeIds.keys(), ...entityNodeIds.keys()])
  const relatedEdges = []

  if (allMatchedNodeIds.size > 0) {
    const relRaw = execSync(`unzip -p "${ZIP}" relationships.csv`, {
      maxBuffer: 400 * 1024 * 1024,
      encoding: 'utf-8',
    })

    const relLines = relRaw.split('\n')
    for (let i = 1; i < relLines.length; i++) {
      const line = relLines[i]
      if (!line.trim()) continue
      const fields = parseCSVLine(line)
      const startNode = fields[0]
      const endNode = fields[1]
      const relType = fields[2]
      const link = fields[3]
      const sourceId = fields[7]

      if (allMatchedNodeIds.has(startNode) || allMatchedNodeIds.has(endNode)) {
        relatedEdges.push({ startNode, endNode, relType, link, sourceId })
      }
    }
  }
  console.log(`    ${relatedEdges.length} related edges found`)

  // Step 5: Generate report
  console.log('')
  console.log('  ═══ SCREENING RESULTS ═══')
  console.log('')

  if (officerMatches.length === 0 && entityMatches.length === 0) {
    console.log('  No matches found. Vault entities are clean against ICIJ database.')
    return
  }

  let report = `---\ntitle: ICIJ Offshore Leaks Screening Report\ntype: admin-note\nnote-type: data\npriority: urgent\nstatus: open\nlast-updated: ${new Date().toISOString().slice(0, 10)}\n---\n\n`
  report += `# ICIJ Offshore Leaks Screening Report\n\n`
  report += `**Screened:** ${new Date().toISOString().slice(0, 10)}\n`
  report += `**Database:** ICIJ Offshore Leaks (Panama + Paradise + Pandora Papers), generated 2025-03-31\n`
  report += `**Vault profiles screened:** ${profileCount} (${personIndex.size} persons, ${companyIndex.size} companies)\n\n`
  report += `> **IMPORTANT:** These are name matches only. A match does NOT prove wrongdoing. Offshore entities are legal in most jurisdictions. David must review each match before any editorial action.\n\n`

  if (officerMatches.length > 0) {
    report += `## Officer Matches (${officerMatches.length})\n\n`
    report += `Vault persons whose names appear as officers/directors/shareholders in offshore structures.\n\n`
    report += `| Vault Profile | ICIJ Name | Countries | Source | Node ID |\n|---|---|---|---|---|\n`

    for (const m of officerMatches) {
      console.log(`  OFFICER: ${m.vaultTitle} → "${m.icijName}" (${m.source}, ${m.countries})`)
      report += `| [[${m.vaultTitle}]] | ${m.icijName} | ${m.countries || 'unknown'} | ${m.source} | ${m.nodeId} |\n`
    }
    report += '\n'
  }

  if (entityMatches.length > 0) {
    report += `## Entity Matches (${entityMatches.length})\n\n`
    report += `Vault companies/organizations whose names appear as offshore entities.\n\n`
    report += `| Vault Profile | ICIJ Name | Jurisdiction | Status | Source | Node ID |\n|---|---|---|---|---|---|\n`

    for (const m of entityMatches) {
      console.log(`  ENTITY: ${m.vaultTitle} → "${m.icijName}" (${m.source}, ${m.jurisdictionDesc || m.jurisdiction})`)
      report += `| [[${m.vaultTitle}]] | ${m.icijName} | ${m.jurisdictionDesc || m.jurisdiction} | ${m.status || 'unknown'} | ${m.source} | ${m.nodeId} |\n`
    }
    report += '\n'
  }

  if (relatedEdges.length > 0) {
    report += `## Connected Offshore Relationships (${relatedEdges.length})\n\n`
    report += `Relationships linking matched vault entities to offshore structures.\n\n`
    report += `| Start Node | End Node | Relationship | Link | Source |\n|---|---|---|---|---|\n`
    for (const e of relatedEdges.slice(0, 50)) {
      const startMatch = officerNodeIds.get(e.startNode) || entityNodeIds.get(e.startNode)
      const endMatch = officerNodeIds.get(e.endNode) || entityNodeIds.get(e.endNode)
      const startLabel = startMatch ? `**${startMatch.vaultTitle}** (${e.startNode})` : e.startNode
      const endLabel = endMatch ? `**${endMatch.vaultTitle}** (${e.endNode})` : e.endNode
      report += `| ${startLabel} | ${endLabel} | ${e.relType} | ${e.link} | ${e.sourceId} |\n`
    }
    if (relatedEdges.length > 50) {
      report += `\n*... and ${relatedEdges.length - 50} more relationships.*\n`
    }
    report += '\n'
  }

  report += `## Next Steps\n\n`
  report += `1. David reviews each match for name collision vs genuine connection\n`
  report += `2. Confirmed matches get added to profile bodies as investigative findings\n`
  report += `3. False positives (common names, different people) are noted and dismissed\n`
  report += `4. ICIJ database link for verification: https://offshoreleaks.icij.org/\n`

  // Write report
  fs.writeFileSync(REPORT_PATH, report, 'utf-8')
  console.log('')
  console.log(`  Report written to: ${REPORT_PATH}`)
  console.log(`  Total: ${officerMatches.length} officer + ${entityMatches.length} entity matches`)
  console.log(`  ${relatedEdges.length} connected offshore relationships`)
}

main()
