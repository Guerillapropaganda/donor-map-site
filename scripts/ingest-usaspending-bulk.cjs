#!/usr/bin/env node
/**
 * ingest-usaspending-bulk.cjs — Ingest USASpending contract award CSVs
 * into the canonical relationship store as government-contract edges
 * and write auto-blocks to corporation profile markdown.
 *
 * Input: data/bulk/FY{2024,2025}_All_Contracts_Full_*.zip
 * Output: government-contract edges + auto-blocks + frontmatter fields
 *
 * Key columns (0-indexed after CSV parse):
 *   9:  federal_action_obligation
 *   21: action_date_fiscal_year
 *   29: awarding_agency_name
 *   50: recipient_name
 *   56: recipient_parent_name
 *   48: recipient_uei
 *   109: naics_code
 *   110: naics_description
 *
 * Usage:
 *   node scripts/ingest-usaspending-bulk.cjs              # dry run
 *   node scripts/ingest-usaspending-bulk.cjs --write      # write to stores + profiles
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const yaml = require('js-yaml')

const { upsertEdges } = require('./lib/relationships-store.cjs')
const {
  buildTitleIndex,
  computeEdgeId,
  normalizeTitle,
} = require('./lib/relationship-edge-validator.cjs')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const WRITE = process.argv.includes('--write')
const NOW = new Date().toISOString()

// ─── Name normalization for matching ───────────────────────────────────

function normalizeCompanyName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|corp\.?|corporation|company|co\.?|ltd\.?|l\.?l\.?c\.?|l\.?p\.?|plc|group|holdings?|enterprises?|international|usa|u\.s\.a\.?|americas?)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── CSV parsing (streaming via unzip -p, line-by-line) ───────────────

/**
 * Parse a single CSV line handling quoted fields with commas.
 * USASpending CSVs use standard RFC 4180 quoting.
 */
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

// ─── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('═══ USASpending Bulk Ingest (Federal Contracts) ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Build vault name index (corporations only)
  console.log('  building corporation name index...')
  const titleIndex = buildTitleIndex()
  const corpIndex = new Map() // normalizedName → { title, path, type }

  // Scan corporation profiles
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(CONTENT, '.md')
  let corpCount = 0
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (data.type !== 'corporation' && data.type !== 'donor' && data['entity-type'] !== 'Corporation') continue

      const title = normalizeTitle(data.title || path.basename(filePath, '.md'))
      if (!title) continue

      const normalizedName = normalizeCompanyName(title)
      if (!normalizedName) continue

      corpIndex.set(normalizedName, {
        title,
        path: filePath,
        type: 'entity',
      })

      // Also add aliases
      const aliases = Array.isArray(data.aliases) ? data.aliases
        : typeof data.aliases === 'string' ? [data.aliases] : []
      for (const alias of aliases) {
        const normalizedAlias = normalizeCompanyName(alias)
        if (normalizedAlias && !corpIndex.has(normalizedAlias)) {
          corpIndex.set(normalizedAlias, { title, path: filePath, type: 'entity' })
        }
      }

      // Handle "ACRONYM - Full Name" pattern (e.g., "ADM - Archer Daniels Midland")
      const dashParts = (data.title || '').split(' - ')
      if (dashParts.length >= 2) {
        // Add full name after dash as variant
        const fullName = normalizeCompanyName(dashParts.slice(1).join(' - '))
        if (fullName && !corpIndex.has(fullName)) {
          corpIndex.set(fullName, { title, path: filePath, type: 'entity' })
        }
        // Add acronym alone as variant
        const acronym = normalizeCompanyName(dashParts[0])
        if (acronym && acronym.length >= 2 && !corpIndex.has(acronym)) {
          corpIndex.set(acronym, { title, path: filePath, type: 'entity' })
        }
      }

      corpCount++
    } catch (_) { continue }
  }
  console.log(`    ${corpCount} corporation profiles, ${corpIndex.size} name variants`)

  // Step 2: Process each FY zip
  const zipFiles = fs.readdirSync(BULK_DIR)
    .filter(f => /^FY\d{4}_All_Contracts_Full/.test(f) && f.endsWith('.zip'))
    .sort()

  if (zipFiles.length === 0) {
    console.log('  ERROR: No FY*_All_Contracts_Full*.zip files in data/bulk/')
    return
  }

  // Aggregation: Map<"agency|corp|fy", { agency, corp, corpTitle, corpPath, fy, totalObligation, contractCount, naicsCodes, topNaics }>
  const aggregated = new Map()
  let totalRows = 0
  let matchedRows = 0
  let skippedRows = 0

  for (const zipFile of zipFiles) {
    const zipPath = path.join(BULK_DIR, zipFile)
    console.log(`  processing ${zipFile}...`)

    // List CSVs inside the zip
    const listOutput = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' })
    const csvFiles = listOutput.split('\n')
      .filter(line => line.trim().endsWith('.csv'))
      .map(line => line.trim().split(/\s+/).pop())

    for (const csvFile of csvFiles) {
      console.log(`    streaming ${csvFile}...`)

      // Stream via spawn + readline — handles multi-GB files without buffering
      const { spawn } = require('child_process')
      const readline = require('readline')

      await new Promise((resolve, reject) => {
        const proc = spawn('unzip', ['-p', zipPath, csvFile], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity })
        let headerFields = null
        let colIdx = {}
        let lineCount = 0

        rl.on('line', (line) => {
          if (!line.trim()) return

          // First line is header
          if (!headerFields) {
            headerFields = parseCSVLine(line)
            const wantedCols = [
              'federal_action_obligation', 'action_date_fiscal_year',
              'awarding_agency_name', 'recipient_name', 'recipient_parent_name',
              'recipient_uei', 'naics_code', 'naics_description',
            ]
            for (const col of wantedCols) {
              colIdx[col] = headerFields.findIndex(h => h.trim().toLowerCase() === col.toLowerCase())
            }
            return
          }

          lineCount++
          totalRows++
          if (totalRows % 500000 === 0) process.stdout.write(`      ${(totalRows / 1000000).toFixed(1)}M rows...\r`)

          const fields = parseCSVLine(line)
          const recipientParent = (fields[colIdx.recipient_parent_name] || '').trim()
          const recipientName = (fields[colIdx.recipient_name] || '').trim()
          const obligation = parseFloat(fields[colIdx.federal_action_obligation] || '0') || 0
          const fy = (fields[colIdx.action_date_fiscal_year] || '').trim()
          const agency = (fields[colIdx.awarding_agency_name] || '').trim()
          const naicsCode = (fields[colIdx.naics_code] || '').trim()

          if (obligation === 0 || !agency) {
            skippedRows++
            return
          }

          // Try parent name first, then recipient name
          const normalizedParent = normalizeCompanyName(recipientParent)
          const normalizedRecipient = normalizeCompanyName(recipientName)

          let match = corpIndex.get(normalizedParent) || corpIndex.get(normalizedRecipient)
          if (!match) return

          matchedRows++
          const aggKey = `${agency}|${match.title}|${fy}`
          if (!aggregated.has(aggKey)) {
            aggregated.set(aggKey, {
              agency,
              corpTitle: match.title,
              corpPath: match.path,
              fy,
              totalObligation: 0,
              contractCount: 0,
              naicsCodes: new Set(),
            })
          }
          const agg = aggregated.get(aggKey)
          agg.totalObligation += obligation
          agg.contractCount++
          if (naicsCode) agg.naicsCodes.add(naicsCode)
        })

        rl.on('close', () => {
          console.log(`      ${lineCount.toLocaleString()} data rows`)
          resolve()
        })

        proc.on('error', reject)
        proc.stderr.on('data', () => {}) // suppress stderr
      })
    }
  }

  console.log('')
  console.log(`  Total rows: ${totalRows.toLocaleString()}`)
  console.log(`  Matched: ${matchedRows.toLocaleString()}`)
  console.log(`  Skipped (zero/no agency): ${skippedRows.toLocaleString()}`)
  console.log(`  Aggregated edges: ${aggregated.size}`)

  // Step 3: Build per-profile summaries for auto-blocks
  // Map<corpTitle, { totalContracts, totalObligation, agencySummary: Map<agency, total>, path }>
  const profileSummaries = new Map()
  for (const agg of aggregated.values()) {
    if (!profileSummaries.has(agg.corpTitle)) {
      profileSummaries.set(agg.corpTitle, {
        totalContracts: 0,
        totalObligation: 0,
        agencySummary: new Map(),
        path: agg.corpPath,
        fiscalYears: new Set(),
      })
    }
    const ps = profileSummaries.get(agg.corpTitle)
    ps.totalContracts += agg.contractCount
    ps.totalObligation += agg.totalObligation
    ps.fiscalYears.add(agg.fy)

    const agencyTotal = ps.agencySummary.get(agg.agency) || 0
    ps.agencySummary.set(agg.agency, agencyTotal + agg.totalObligation)
  }

  console.log(`  Profiles with contract data: ${profileSummaries.size}`)

  // Show top 10 by total obligation
  const sorted = [...profileSummaries.entries()].sort((a, b) => b[1].totalObligation - a[1].totalObligation)
  console.log('')
  console.log('  Top 10 by total federal obligation:')
  for (const [title, ps] of sorted.slice(0, 10)) {
    console.log(`    ${title}: $${Math.round(ps.totalObligation).toLocaleString()} (${ps.totalContracts} contracts)`)
  }

  // Step 4: Build government-contract edges
  const newEdges = []
  for (const agg of aggregated.values()) {
    if (Math.abs(agg.totalObligation) < 1) continue // skip near-zero
    const edge = {
      from: agg.agency,
      to: agg.corpTitle,
      from_type: 'entity', // federal agency
      to_type: 'entity',
      from_subcategory: 'government-agency',
      to_subcategory: 'corporation',
      type: 'government-contract',
      direction: 'directed',
      confidence: 0.95,
      source: 'usaspending-bulk',
      source_url: null,
      evidence: [`USASpending FY${agg.fy}: ${agg.contractCount} contract actions, $${Math.round(agg.totalObligation).toLocaleString()}`],
      amount: Math.round(Math.abs(agg.totalObligation)),
      cycle: `FY${agg.fy}`,
      role: null,
      date_range: null,
      first_seen: NOW,
      last_verified: NOW,
      status: 'active',
    }
    edge.id = computeEdgeId(edge)
    newEdges.push(edge)
  }

  console.log(`  Built ${newEdges.length} government-contract edges`)

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Step 5: Write edges
  console.log('')
  console.log('  Writing edges...')
  const result = upsertEdges(newEdges)
  console.log(`    added:   ${result.added}`)
  console.log(`    updated: ${result.updated}`)
  console.log(`    invalid: ${result.invalid}`)
  if (result.errors && result.errors.length > 0) {
    console.log('  Validation errors (first 10):')
    for (const err of result.errors.slice(0, 10)) {
      console.log(`    ${JSON.stringify(err)}`)
    }
  }

  // Step 6: Write auto-blocks to profiles
  console.log('')
  console.log('  Writing auto-blocks to profiles...')
  let profilesUpdated = 0
  for (const [title, ps] of profileSummaries.entries()) {
    if (!ps.path || !fs.existsSync(ps.path)) continue

    const content = fs.readFileSync(ps.path, 'utf-8')

    // Build auto-block
    const topAgencies = [...ps.agencySummary.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const fyRange = [...ps.fiscalYears].sort().join(', ')
    let block = `<!-- auto:usaspending start -->\n`
    block += `| Metric | Value |\n|--------|-------|\n`
    block += `| Federal Contracts | ${ps.totalContracts.toLocaleString()} |\n`
    block += `| Total Obligation | $${Math.round(ps.totalObligation).toLocaleString()} |\n`
    block += `| Fiscal Years | ${fyRange} |\n`
    block += `| Awarding Agencies | ${ps.agencySummary.size} |\n\n`
    block += `**Top awarding agencies:**\n\n`
    for (const [agency, total] of topAgencies) {
      block += `- ${agency}: $${Math.round(total).toLocaleString()}\n`
    }
    block += `\n- [Source: USASpending.gov](https://www.usaspending.gov/) (Tier 1) (VERIFIED)\n`
    block += `<!-- auto:usaspending end -->`

    let updated = content
    // Replace existing block or insert before ## Archived
    if (updated.includes('<!-- auto:usaspending start -->')) {
      updated = updated.replace(/<!-- auto:usaspending start -->[\s\S]*?<!-- auto:usaspending end -->/, block)
    } else if (updated.includes('## Archived')) {
      updated = updated.replace('## Archived', `### Federal Contracts (USASpending)\n${block}\n\n## Archived`)
    } else {
      // Append before the closing
      updated += `\n\n### Federal Contracts (USASpending)\n${block}\n`
    }

    // Update frontmatter
    const fmMatch = updated.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      let fm = fmMatch[1]
      // Update or add federal-contracts
      if (/^federal-contracts:/m.test(fm)) {
        fm = fm.replace(/^federal-contracts:.*$/m, `federal-contracts: ${ps.totalContracts}`)
      } else {
        fm += `\nfederal-contracts: ${ps.totalContracts}`
      }
      // Update or add federal-awards-total
      if (/^federal-awards-total:/m.test(fm)) {
        fm = fm.replace(/^federal-awards-total:.*$/m, `federal-awards-total: ${Math.round(ps.totalObligation)}`)
      } else {
        fm += `\nfederal-awards-total: ${Math.round(ps.totalObligation)}`
      }
      updated = updated.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`)
    }

    fs.writeFileSync(ps.path, updated, 'utf-8')
    profilesUpdated++
  }

  console.log(`    ${profilesUpdated} profiles updated with auto-blocks`)
  console.log('')
  console.log('  Done.')
}

main().catch(console.error)
