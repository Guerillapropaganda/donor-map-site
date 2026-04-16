#!/usr/bin/env node
/**
 * ingest-fec-committee-master.cjs — Expand the FEC committee registry
 * by matching committee master bulk data against vault profiles.
 *
 * Input: data/bulk/fec-committee-master-{16-26}.zip
 * Output: Expanded data/fec-committee-registry.json
 *
 * Committee master columns (pipe-delimited, no header):
 *   0: CMTE_ID, 1: CMTE_NM, 2: TRES_NM, 3-7: address fields,
 *   8: CMTE_DSGN, 9: CMTE_TP, 10: CMTE_PTY_AFFILIATION,
 *   11: CMTE_FILING_FREQ, 12: ORG_TP, 13: CONNECTED_ORG_NM, 14: CAND_ID
 *
 * Usage:
 *   node scripts/ingest-fec-committee-master.cjs              # dry run
 *   node scripts/ingest-fec-committee-master.cjs --write      # write to registry
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const yaml = require('js-yaml')

const { buildTitleIndex, normalizeTitle } = require('./lib/relationship-edge-validator.cjs')

const ROOT = path.join(__dirname, '..')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const REGISTRY_PATH = path.join(ROOT, 'data', 'fec-committee-registry.json')
const WRITE = process.argv.includes('--write')
const NOW = new Date().toISOString()

function normalizeOrgName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|corp\.?|corporation|company|co\.?|ltd\.?|political action committee|pac|political committee|political fund|for congress|for senate|for america|for president)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function main() {
  console.log('')
  console.log('═══ FEC Committee Master Registry Expansion ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Load existing registry
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))
  const existingIds = new Set(Object.keys(registry))
  console.log(`  existing registry: ${existingIds.size} committees`)

  // Step 2: Build vault name index
  console.log('  building title index...')
  const titleIndex = buildTitleIndex()

  // Also build a normalized name → title lookup for fuzzy matching
  const nameToTitle = new Map()
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(path.join(ROOT, 'content'), '.md')

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (!data.title) continue

      const title = normalizeTitle(data.title)
      const normalized = normalizeOrgName(data.title)
      if (normalized && !nameToTitle.has(normalized)) {
        nameToTitle.set(normalized, { title, path: filePath, type: data.type })
      }

      // Handle "ACRONYM - Full Name" pattern
      const dashParts = data.title.split(' - ')
      if (dashParts.length >= 2) {
        const fullName = normalizeOrgName(dashParts.slice(1).join(' - '))
        if (fullName && !nameToTitle.has(fullName)) {
          nameToTitle.set(fullName, { title, path: filePath, type: data.type })
        }
        const acronym = normalizeOrgName(dashParts[0])
        if (acronym && acronym.length >= 2 && !nameToTitle.has(acronym)) {
          nameToTitle.set(acronym, { title, path: filePath, type: data.type })
        }
      }

      // Add aliases
      const aliases = Array.isArray(data.aliases) ? data.aliases
        : typeof data.aliases === 'string' ? [data.aliases] : []
      for (const alias of aliases) {
        const na = normalizeOrgName(alias)
        if (na && !nameToTitle.has(na)) {
          nameToTitle.set(na, { title, path: filePath, type: data.type })
        }
      }
    } catch (_) { continue }
  }
  console.log(`    ${nameToTitle.size} name variants in index`)

  // Step 3: Load all committee master files
  console.log('  loading committee master files...')
  const cmteFiles = fs.readdirSync(BULK_DIR)
    .filter(f => f.startsWith('fec-committee-master-') && f.endsWith('.zip'))
    .sort()

  // Map: cmteId → latest record
  const allCommittees = new Map()

  for (const zipFile of cmteFiles) {
    const zipPath = path.join(BULK_DIR, zipFile)
    const raw = execSync(`unzip -p "${zipPath}"`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
    })

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const cols = line.split('|')
      if (cols.length < 14) continue

      const cmteId = cols[0]
      const cmteName = cols[1]
      const cmteType = cols[9]
      const party = cols[10]
      const orgType = cols[12]
      const connectedOrg = cols[13]
      const candId = cols[14] || ''

      if (!cmteId || !cmteName) continue

      allCommittees.set(cmteId, {
        cmteId, cmteName, cmteType, party, orgType, connectedOrg, candId,
      })
    }
  }
  console.log(`    ${allCommittees.size} unique committees across all cycles`)

  // Step 4: Match committees to vault profiles
  console.log('  matching to vault profiles...')
  const newMatches = []
  let alreadyMapped = 0

  for (const [cmteId, cmte] of allCommittees) {
    if (existingIds.has(cmteId)) {
      alreadyMapped++
      continue
    }

    // Try connected org name first (most reliable)
    let vaultMatch = null
    if (cmte.connectedOrg) {
      const normalizedOrg = normalizeOrgName(cmte.connectedOrg)
      vaultMatch = nameToTitle.get(normalizedOrg)
    }

    // Try committee name
    if (!vaultMatch) {
      const normalizedCmte = normalizeOrgName(cmte.cmteName)
      vaultMatch = nameToTitle.get(normalizedCmte)
    }

    if (!vaultMatch) continue

    newMatches.push({
      cmteId: cmte.cmteId,
      cmteName: cmte.cmteName,
      connectedOrg: cmte.connectedOrg,
      cmteType: cmte.cmteType,
      party: cmte.party,
      candId: cmte.candId,
      vaultTitle: vaultMatch.title,
      vaultPath: vaultMatch.path,
      vaultType: vaultMatch.type,
    })
  }

  console.log(`    ${alreadyMapped} already in registry`)
  console.log(`    ${newMatches.length} new matches found`)
  console.log('')

  // Show sample
  console.log('  Sample new matches (first 20):')
  for (const m of newMatches.slice(0, 20)) {
    console.log(`    ${m.cmteId} "${m.cmteName}" → ${m.vaultTitle}`)
  }

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Step 5: Add to registry
  console.log('')
  console.log('  Expanding registry...')
  for (const m of newMatches) {
    registry[m.cmteId] = {
      committee_id: m.cmteId,
      fec_name: m.cmteName,
      committee_type: m.cmteType,
      connected_organization_name: m.connectedOrg || null,
      candidate_ids: m.candId ? [m.candId] : [],
      party: m.party || null,
      aliases: [],
      source: 'fec-committee-master-bulk',
      vault_profile: m.vaultPath,
      status: 'mapped',
      added: NOW,
      updated: NOW,
    }
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n')
  console.log(`    Registry: ${existingIds.size} → ${Object.keys(registry).length} committees`)
  console.log('')
  console.log('  Done.')
}

main()
