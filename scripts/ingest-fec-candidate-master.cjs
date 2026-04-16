#!/usr/bin/env node
/**
 * ingest-fec-candidate-master.cjs — Match vault politicians against FEC
 * candidate master files to populate fec-candidate-id frontmatter.
 *
 * Input: data/bulk/fec-candidate-master-{16-26}.zip
 * Output: fec-candidate-id added to politician profile frontmatter
 *
 * Candidate master columns (pipe-delimited, no header):
 *   0: CAND_ID, 1: CAND_NAME, 2: CAND_PTY_AFFILIATION, 3: CAND_ELECTION_YR,
 *   4: CAND_OFFICE_ST, 5: CAND_OFFICE (H/S/P), 6: CAND_OFFICE_DISTRICT,
 *   7: CAND_ICI, 8: CAND_STATUS, 9: CAND_PCC
 *
 * Usage:
 *   node scripts/ingest-fec-candidate-master.cjs              # dry run
 *   node scripts/ingest-fec-candidate-master.cjs --write      # write to profiles
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const yaml = require('js-yaml')

const { normalizeTitle } = require('./lib/relationship-edge-validator.cjs')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const WRITE = process.argv.includes('--write')

// ─── Name normalization ───────────────────────────────────────────────

function normalizeCandName(fecName) {
  if (!fecName) return ''
  // FEC format: "LAST, FIRST MIDDLE SUFFIX"
  const parts = fecName.split(',').map(s => s.trim())
  if (parts.length < 2) return fecName.toLowerCase().trim()

  const last = parts[0]
  // Take first name only (drop middle/suffix like JR, III, etc.)
  const firstParts = parts[1].split(/\s+/)
  const first = firstParts[0]

  return `${first} ${last}`.toLowerCase().trim()
}

function normalizeVaultName(title) {
  if (!title) return ''
  return title
    .replace(/^_/, '')
    .replace(/ Master Profile$/, '')
    // Strip parenthetical notes
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    // Strip common prefixes/suffixes
    .replace(/\b(senator|representative|rep\.|sen\.|dr\.|hon\.)\b/gi, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('')
  console.log('═══ FEC Candidate Master Ingest ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Load all vault politicians
  console.log('  loading vault politicians...')
  const { walkDir } = require('./lib/shared.cjs')
  const politicians = [] // { title, path, party, state, chamber, fecId (existing or null) }
  const files = walkDir(path.join(CONTENT, 'Politicians'), '.md')

  for (const filePath of files) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (data.type !== 'politician' && data.type !== 'state-politician') continue

      const title = data.title || path.basename(filePath, '.md').replace(/^_/, '').replace(/ Master Profile$/, '')
      politicians.push({
        title,
        path: filePath,
        party: data.party || '',
        state: data['state-abbr'] || data.state || '',
        chamber: data.chamber || '',
        fecId: data['fec-candidate-id'] ? String(data['fec-candidate-id']).replace(/"/g, '').trim() : null,
        normalized: normalizeVaultName(title),
      })
    } catch (_) { continue }
  }

  const withId = politicians.filter(p => p.fecId)
  const withoutId = politicians.filter(p => !p.fecId)
  console.log(`    ${politicians.length} politicians (${withId.length} with FEC ID, ${withoutId.length} without)`)

  // Build lookup: normalized name → vault politician (only those without IDs)
  const nameIndex = new Map()
  for (const p of withoutId) {
    const key = p.normalized
    if (key && !nameIndex.has(key)) {
      nameIndex.set(key, p)
    }
    // Also add last-name-first variant
    const parts = p.normalized.split(' ')
    if (parts.length >= 2) {
      const lastFirst = `${parts[parts.length - 1]} ${parts[0]}`
      if (!nameIndex.has(lastFirst)) {
        nameIndex.set(lastFirst, p)
      }
    }
  }

  // Step 2: Load FEC candidate master files (all cycles, latest wins)
  console.log('  loading FEC candidate master files...')
  const candidateFiles = fs.readdirSync(BULK_DIR)
    .filter(f => f.startsWith('fec-candidate-master-') && f.endsWith('.zip'))
    .sort() // chronological order, later cycles overwrite

  // Map: normalized name → { candId, fecName, office, state, party, year }
  const fecCandidates = new Map()
  let totalCandidates = 0

  for (const zipFile of candidateFiles) {
    const zipPath = path.join(BULK_DIR, zipFile)
    const raw = execSync(`unzip -p "${zipPath}"`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf-8',
    })

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const cols = line.split('|')
      if (cols.length < 6) continue

      const candId = cols[0]
      const fecName = cols[1]
      const party = cols[2]
      const year = cols[3]
      const state = cols[4]
      const office = cols[5] // H, S, or P

      if (!candId || !fecName) continue
      totalCandidates++

      const normalized = normalizeCandName(fecName)
      // Store latest cycle per normalized name (later file overwrites)
      const existing = fecCandidates.get(normalized)
      if (!existing || parseInt(year) >= parseInt(existing.year)) {
        fecCandidates.set(normalized, { candId, fecName, office, state, party, year })
      }
    }
  }
  console.log(`    ${totalCandidates.toLocaleString()} candidate rows, ${fecCandidates.size} unique names`)

  // Step 3: Match vault politicians to FEC candidates
  console.log('  matching...')
  const matches = []
  const ambiguous = []

  for (const pol of withoutId) {
    const normalized = pol.normalized
    const fec = fecCandidates.get(normalized)

    if (!fec) continue

    // Validate: state should match if available
    const polState = pol.state.toUpperCase()
    const fecState = fec.state.toUpperCase()
    if (polState && fecState && polState !== fecState && fecState !== 'US') {
      // State mismatch — could be a different person with same name
      ambiguous.push({ pol, fec, reason: `state mismatch: vault=${polState} fec=${fecState}` })
      continue
    }

    // Validate: party should roughly match
    const polParty = (pol.party || '').toLowerCase()
    const fecParty = (fec.party || '').toLowerCase()
    if (polParty && fecParty) {
      const partyMatch = (
        (polParty.includes('democrat') && (fecParty === 'dem' || fecParty === 'dfl')) ||
        (polParty.includes('republican') && fecParty === 'rep') ||
        (polParty.includes('independent') && (fecParty === 'ind' || fecParty === 'lib' || fecParty === 'grn'))
      )
      if (!partyMatch && fecParty !== 'unk' && fecParty !== 'npl') {
        ambiguous.push({ pol, fec, reason: `party mismatch: vault=${polParty} fec=${fecParty}` })
        continue
      }
    }

    matches.push({ pol, fec })
  }

  console.log(`    ${matches.length} confident matches`)
  console.log(`    ${ambiguous.length} ambiguous (state/party mismatch)`)
  console.log('')

  // Show sample matches
  console.log('  Sample matches (first 15):')
  for (const { pol, fec } of matches.slice(0, 15)) {
    console.log(`    ${pol.title} → ${fec.candId} (${fec.fecName}, ${fec.office}-${fec.state} ${fec.year})`)
  }

  if (ambiguous.length > 0) {
    console.log('')
    console.log('  Ambiguous (first 10):')
    for (const { pol, fec, reason } of ambiguous.slice(0, 10)) {
      console.log(`    ${pol.title} → ${fec.candId} (${fec.fecName}) — ${reason}`)
    }
  }

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Step 4: Write fec-candidate-id to profiles
  console.log('')
  console.log('  Writing fec-candidate-id to profiles...')
  let written = 0

  for (const { pol, fec } of matches) {
    const content = fs.readFileSync(pol.path, 'utf-8')

    // Don't overwrite existing
    if (content.includes('fec-candidate-id:')) continue

    // Insert fec-candidate-id before the closing ---
    const updated = content.replace(/\n---\n/, `\nfec-candidate-id: "${fec.candId}"\n---\n`)

    if (updated === content) continue
    fs.writeFileSync(pol.path, updated, 'utf-8')
    written++
  }

  console.log(`    ${written} profiles updated`)
  console.log('')
  console.log('  Done.')
}

main()
