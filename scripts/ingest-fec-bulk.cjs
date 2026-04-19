#!/usr/bin/env node
/**
 * ingest-fec-bulk.cjs — Ingest FEC committee-to-candidate bulk data (PAS2 files)
 * into the canonical relationship store as monetary edges.
 *
 * Input: data/bulk/pas2{22,24,26}.zip (pipe-delimited, no header)
 * Output: monetary edges in data/relationships.jsonl + sources in data/sources.jsonl
 *
 * PAS2 columns (pipe-delimited):
 *   0: CMTE_ID, 1: AMNDT_IND, 2: RPT_TP, 3: TRANSACTION_PGI, 4: IMAGE_NUM,
 *   5: TRANSACTION_TP, 6: ENTITY_TP, 7: NAME, 8: CITY, 9: STATE, 10: ZIP_CODE,
 *   11: EMPLOYER, 12: OCCUPATION, 13: TRANSACTION_DT, 14: TRANSACTION_AMT,
 *   15: OTHER_ID, 16: CAND_ID, 17: TRAN_ID, 18: FILE_NUM, 19: MEMO_CD,
 *   20: MEMO_TEXT, 21: SUB_ID
 *
 * Usage:
 *   node scripts/ingest-fec-bulk.cjs              # dry run
 *   node scripts/ingest-fec-bulk.cjs --write      # write to canonical stores
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const { createReadStream } = require('fs')
const { createUnzip } = require('zlib')
const { execSync } = require('child_process')

const { upsertEdges } = require('./lib/relationships-store.cjs')
const { addOrFindSource } = require('./lib/sources-store.cjs')
const {
  buildTitleIndex,
  computeEdgeId,
  normalizeTitle,
} = require('./lib/relationship-edge-validator.cjs')
const { classifyTransaction } = require('./lib/fec-txn-types.cjs')

// Map classifyTransaction() bucket → edge.role field.
// Direct donations stay role=null. IE buckets get explicit ie-support /
// ie-oppose so downstream consumers (ask, query, leaderboards) can
// distinguish them from actual donations without re-deriving from txn codes.
function bucketToRole(bucket) {
  if (bucket === 'ie-support') return 'ie-support'
  if (bucket === 'ie-oppose') return 'ie-oppose'
  return null
}

// Buckets we emit edges for. Others (anomaly, unknown, electioneering,
// comm-cost) are skipped at the edge level — they're captured in the
// pas2-* derived stores for separate analysis but shouldn't pollute the
// canonical relationship graph.
const EMITTED_BUCKETS = new Set(['direct-donor', 'ie-support', 'ie-oppose', 'party-support', 'conduit-aggregation'])

const ROOT = path.join(__dirname, '..')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const WRITE = process.argv.includes('--write')

// FEC PAS2 files: cycle → zip filename
const PAS_FILES = {
  2022: 'fec-cmte-to-candidate-2022.zip',
  2024: 'fec-cmte-to-candidate-2024.zip',
  2026: 'fec-cmte-to-candidate-2026.zip',
}

const NOW = new Date().toISOString()

// ─── Helpers ──────────────────────────────────────────────────────────

function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[,.]|inc\b|llc\b|corp\b|co\b|pac\b|committee\b|for\s+(congress|senate|america|president)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Stream a zip file containing a single text file, processing each line.
 * Uses unzip CLI since Node's zlib doesn't handle zip archives directly.
 */
async function streamZipLines(zipPath, onLine) {
  // Extract to stdout via unzip -p
  const content = execSync(`unzip -p "${zipPath}"`, {
    maxBuffer: 200 * 1024 * 1024, // 200MB
    encoding: 'utf-8',
  })
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.trim()) onLine(line)
  }
  return lines.length
}

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('═══ FEC Bulk Ingest (PAS2: Committee-to-Candidate) ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Load FEC committee registry
  const registryPath = path.join(ROOT, 'data', 'fec-committee-registry.json')
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
  const mappedCommittees = Object.entries(registry)
    .filter(([_, r]) => r.status === 'mapped' && r.vault_profile)
  console.log(`  FEC registry: ${Object.keys(registry).length} committees (${mappedCommittees.length} mapped)`)

  // Build committee ID → vault title lookup
  // Wait until titleIndex is built to resolve proper types
  const cmteToVault = new Map()
  const _pendingCmte = mappedCommittees.map(([cmteId, rec]) => {
    const profilePath = rec.vault_profile
    const basename = path.basename(profilePath, '.md').replace(/^_/, '').replace(/ Master Profile$/, '')
    return { cmteId, title: basename, path: profilePath }
  })

  // Step 2: Build candidate ID → vault profile lookup from frontmatter
  console.log('  building candidate ID index...')
  const titleIndex = buildTitleIndex()
  const yaml = require('js-yaml')
  const candIdToVault = new Map()

  // Scan all politician profiles for fec-candidate-id
  const { walkDir } = require('./lib/shared.cjs')
  const politicianFiles = walkDir(path.join(ROOT, 'content', 'Politicians'), '.md')
  for (const filePath of politicianFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      const candId = (data['fec-candidate-id'] || '').toString().replace(/"/g, '').trim()
      if (!candId) continue
      const title = normalizeTitle(data.title || path.basename(filePath, '.md'))
      if (!title) continue

      const entry = titleIndex.get(title)
      candIdToVault.set(candId, {
        title,
        type: (entry && !Array.isArray(entry)) ? entry.type : 'politician',
        subcategory: (entry && !Array.isArray(entry)) ? entry.subcategory : null,
      })
    } catch (_) { continue }
  }
  console.log(`    ${candIdToVault.size} candidates with FEC IDs`)
  console.log(`    ${titleIndex.size} titles in index`)

  // Resolve committee types from title index
  for (const { cmteId, title, path: profilePath } of _pendingCmte) {
    const normalized = normalizeTitle(title)
    const entry = titleIndex.get(normalized)
    let type = 'entity'
    let subcategory = null
    if (entry && !Array.isArray(entry)) {
      type = entry.type || 'entity'
      subcategory = entry.subcategory || null
    } else if (Array.isArray(entry)) {
      const first = entry.find(e => !e.aliasOf) || entry[0]
      type = first.type || 'entity'
      subcategory = first.subcategory || null
    }
    cmteToVault.set(cmteId, { title: normalized, path: profilePath, type, subcategory })
  }
  console.log(`    ${cmteToVault.size} committees resolved with types`)

  // Step 3: Process each cycle's PAS2 file
  // Aggregate: Map<"from|to|cycle", { from, to, fromEntry, toEntry, amount, count, cycle }>
  const aggregated = new Map()
  let totalRows = 0
  let matchedRows = 0
  let unmatchedCmte = 0
  let unmatchedCand = 0
  const unmatchedCandNames = new Map() // name → count for reporting

  for (const [cycleStr, zipFile] of Object.entries(PAS_FILES)) {
    const cycle = parseInt(cycleStr)
    const zipPath = path.join(BULK_DIR, zipFile)
    if (!fs.existsSync(zipPath)) {
      console.log(`  SKIP: ${zipFile} not found`)
      continue
    }

    console.log(`  processing ${zipFile} (cycle ${cycle})...`)
    let cycleRows = 0
    let cycleMatched = 0

    await streamZipLines(zipPath, (line) => {
      cycleRows++
      const cols = line.split('|')
      if (cols.length < 17) return

      const cmteId = cols[0]
      const transactionType = cols[5] || ''
      const entityType = cols[6] || ''
      const candId = (cols[16] || '').trim()
      const amountStr = cols[14]
      const amount = parseFloat(amountStr) || 0

      // Skip zero or negative amounts (refunds)
      if (amount <= 0) return

      // Only process rows with a valid candidate ID (H=House, S=Senate, P=President)
      if (!candId || !/^[HSP]\d/.test(candId)) return

      // Resolve committee → vault donor
      const donor = cmteToVault.get(cmteId)
      if (!donor) {
        unmatchedCmte++
        return
      }

      // Resolve candidate by FEC candidate ID
      const politician = candIdToVault.get(candId)
      if (!politician) {
        unmatchedCand++
        unmatchedCandNames.set(candId, (unmatchedCandNames.get(candId) || 0) + 1)
        return
      }

      const politicianTitle = politician.title
      const politicianEntry = politician

      // Classify transaction type via the canonical ADR-0013 classifier.
      // Only donor-shaped buckets are emitted as edges — anomalies/unknown
      // are dropped here but retained in the pas2-* bucket files by the
      // separate ingest-fec-pas2-bulk.cjs derivation.
      const cls = classifyTransaction({ srcCmte: cmteId, txnTp: transactionType, amount, candId })
      if (!EMITTED_BUCKETS.has(cls.bucket)) return

      cycleMatched++
      matchedRows++

      // Aggregate by (donor → politician, cycle, bucket). Splitting on
      // bucket means a committee that both donated ($X, 24K) AND ran IE
      // ads supporting ($Y, 24E) the same candidate in the same cycle
      // produces TWO edges: one role=null donation, one role=ie-support.
      // Same for IE-oppose. This is what unblocks accurate downstream
      // classification without relying on the classify-ie-edges patch.
      const aggKey = `${donor.title}|${politicianTitle}|${cycle}|${cls.bucket}`
      if (!aggregated.has(aggKey)) {
        aggregated.set(aggKey, {
          from: donor.title,
          fromPath: donor.path,
          fromType: donor.type,
          fromSubcategory: donor.subcategory || null,
          to: politicianTitle,
          toType: politicianEntry.type || 'politician',
          toSubcategory: politicianEntry.subcategory || null,
          amount: 0,
          count: 0,
          cycle,
          bucket: cls.bucket,
          role: bucketToRole(cls.bucket),
        })
      }
      const agg = aggregated.get(aggKey)
      agg.amount += amount
      agg.count++
    })

    totalRows += cycleRows
    console.log(`    ${cycleRows.toLocaleString()} rows, ${cycleMatched.toLocaleString()} matched`)
  }

  console.log('')
  console.log(`  Total: ${totalRows.toLocaleString()} rows, ${matchedRows.toLocaleString()} matched`)
  console.log(`  Unmatched committees: ${unmatchedCmte.toLocaleString()}`)
  console.log(`  Unmatched candidates: ${unmatchedCand.toLocaleString()}`)
  console.log(`  Aggregated edges: ${aggregated.size}`)

  // Report top unmatched candidates
  if (unmatchedCandNames.size > 0) {
    const topUnmatched = [...unmatchedCandNames.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
    console.log('')
    console.log('  Top 15 unmatched candidates (by transaction count):')
    for (const [name, count] of topUnmatched) {
      console.log(`    ${name}: ${count}`)
    }
  }

  // Step 4: Build edges
  const newEdges = []
  for (const agg of aggregated.values()) {
    const edge = {
      from: agg.from,
      to: agg.to,
      from_type: agg.fromType,
      to_type: agg.toType,
      from_subcategory: agg.fromSubcategory || null,
      to_subcategory: agg.toSubcategory,
      type: 'monetary',
      direction: 'directed',
      confidence: 0.95, // authoritative bulk data
      source: 'fec-bulk',
      source_url: null, // FEC URLs are per-committee, registered separately
      evidence: [`FEC PAS2 bulk (${agg.bucket}): ${agg.count} transactions totaling $${Math.round(agg.amount).toLocaleString()} in cycle ${agg.cycle}`],
      amount: Math.round(agg.amount),
      cycle: String(agg.cycle),
      role: agg.role,
      date_range: null,
      first_seen: NOW,
      last_verified: NOW,
      status: 'active',
    }
    edge.id = computeEdgeId(edge)
    newEdges.push(edge)
  }

  console.log('')
  console.log(`  Built ${newEdges.length} edges`)

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    // Show sample edges
    if (newEdges.length > 0) {
      console.log('')
      console.log('  Sample edges:')
      for (const e of newEdges.slice(0, 5)) {
        console.log(`    ${e.from} → ${e.to}: $${e.amount.toLocaleString()} (${e.cycle})`)
      }
    }
    return
  }

  // Step 5: Write edges
  console.log('')
  console.log('  Writing edges...')
  const result = upsertEdges(newEdges)
  console.log(`    added:   ${result.added}`)
  console.log(`    updated: ${result.updated}`)
  console.log(`    skipped: ${result.skipped}`)
  console.log(`    invalid: ${result.invalid}`)
  if (result.errors && result.errors.length > 0) {
    console.log('  Validation errors:')
    for (const err of result.errors.slice(0, 10)) {
      console.log(`    ${err.id || 'unknown'}: ${err.error || err.message || JSON.stringify(err)}`)
    }
  }

  console.log('')
  console.log('  Done.')
}

main().catch(console.error)
