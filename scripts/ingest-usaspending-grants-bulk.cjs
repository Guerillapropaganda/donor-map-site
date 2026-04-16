#!/usr/bin/env node
/**
 * ingest-usaspending-grants-bulk.cjs — Ingest USASpending assistance award CSVs
 * into the canonical relationship store as federal-grant edges
 * and write auto-blocks to corporation/nonprofit profile markdown.
 *
 * Input: data/bulk/FY2026_All_Assistance_Full_*.zip (7 zip files, ~3GB total)
 * Output: federal-grant edges + auto-blocks + frontmatter fields
 *
 * Key columns (dynamic from header):
 *   recipient_name, recipient_parent_name, recipient_uei
 *   federal_action_obligation, total_obligated_amount
 *   action_date_fiscal_year, awarding_agency_name
 *   cfda_number, cfda_title, assistance_type_code
 *
 * Usage:
 *   node scripts/ingest-usaspending-grants-bulk.cjs              # dry run
 *   node scripts/ingest-usaspending-grants-bulk.cjs --write      # write to stores + profiles
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
    .replace(/\b(inc\.?|llc\.?|corp\.?|corporation|company|co\.?|ltd\.?|l\.?l\.?c\.?|l\.?p\.?|plc|group|holdings?|enterprises?|international|usa|u\.s\.a\.?|americas?|foundation|institute|association|university|college|of|the)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── CSV parsing (streaming via unzip -p, line-by-line) ───────────────

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
  console.log('═══ USASpending Bulk Ingest (Federal Grants & Assistance) ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Build vault name index (corporations, donors, think-tanks, nonprofits)
  console.log('  building entity name index...')
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(CONTENT, '.md')
  const entityIndex = new Map() // normalizedName → { title, path, type, entityType }
  let entityCount = 0

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}

      // Include corporations, donors, and organizations (think-tanks, nonprofits)
      const type = data.type || ''
      const entityType = data['entity-type'] || ''
      if (type !== 'corporation' && type !== 'donor' && type !== 'organization' &&
          entityType !== 'Corporation' && entityType !== 'Nonprofit' &&
          entityType !== 'Think Tank' && entityType !== 'Foundation' &&
          entityType !== 'Trade Association' && entityType !== 'University') continue

      const title = normalizeTitle(data.title || path.basename(filePath, '.md'))
      if (!title) continue

      const normalizedName = normalizeCompanyName(title)
      if (!normalizedName) continue

      entityIndex.set(normalizedName, {
        title,
        path: filePath,
        type: 'entity',
        entityType: entityType || type,
      })

      // Add aliases
      const aliases = Array.isArray(data.aliases) ? data.aliases
        : typeof data.aliases === 'string' ? [data.aliases] : []
      for (const alias of aliases) {
        const normalizedAlias = normalizeCompanyName(alias)
        if (normalizedAlias && !entityIndex.has(normalizedAlias)) {
          entityIndex.set(normalizedAlias, { title, path: filePath, type: 'entity', entityType: entityType || type })
        }
      }

      // Handle "ACRONYM - Full Name" pattern
      const dashParts = (data.title || '').split(' - ')
      if (dashParts.length >= 2) {
        const fullName = normalizeCompanyName(dashParts.slice(1).join(' - '))
        if (fullName && !entityIndex.has(fullName)) {
          entityIndex.set(fullName, { title, path: filePath, type: 'entity', entityType: entityType || type })
        }
        const acronym = normalizeCompanyName(dashParts[0])
        if (acronym && acronym.length >= 2 && !entityIndex.has(acronym)) {
          entityIndex.set(acronym, { title, path: filePath, type: 'entity', entityType: entityType || type })
        }
      }

      entityCount++
    } catch (_) { continue }
  }
  console.log(`    ${entityCount} entity profiles, ${entityIndex.size} name variants`)

  // Step 2: Find all assistance ZIP files (skip Chrome re-downloads like "(1).zip")
  const zipFiles = fs.readdirSync(BULK_DIR)
    .filter(f => /FY\d{4}_All_Assistance_Full/.test(f) && f.endsWith('.zip') && !/\(\d+\)\.zip$/.test(f))
    .sort()

  if (zipFiles.length === 0) {
    console.log('  ERROR: No FY*_All_Assistance_Full*.zip files in data/bulk/')
    return
  }
  console.log(`  found ${zipFiles.length} assistance ZIP files`)

  // Aggregation: Map<"agency|entity|fy", { agency, entityTitle, entityPath, fy, totalObligation, grantCount, programs: Set }>
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

      const { spawn } = require('child_process')
      const readline = require('readline')

      await new Promise((resolve, reject) => {
        const proc = spawn('unzip', ['-p', zipPath, csvFile], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity })
        let colIdx = null
        let lineCount = 0

        rl.on('line', (line) => {
          if (!line.trim()) return

          // First line is header — build column index dynamically
          if (!colIdx) {
            const headerFields = parseCSVLine(line)
            colIdx = {}
            const wantedCols = [
              'federal_action_obligation', 'action_date_fiscal_year',
              'awarding_agency_name', 'recipient_name', 'recipient_parent_name',
              'recipient_uei', 'cfda_number', 'cfda_title', 'assistance_type_code',
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
          const cfdaTitle = (fields[colIdx.cfda_title] || '').trim()

          if (obligation === 0 || !agency) {
            skippedRows++
            return
          }

          // Try parent name first, then recipient name
          const normalizedParent = normalizeCompanyName(recipientParent)
          const normalizedRecipient = normalizeCompanyName(recipientName)

          let match = entityIndex.get(normalizedParent) || entityIndex.get(normalizedRecipient)
          if (!match) return

          matchedRows++
          const aggKey = `${agency}|${match.title}|${fy}`
          if (!aggregated.has(aggKey)) {
            aggregated.set(aggKey, {
              agency,
              entityTitle: match.title,
              entityPath: match.path,
              entityType: match.entityType,
              fy,
              totalObligation: 0,
              grantCount: 0,
              programs: new Set(),
            })
          }
          const agg = aggregated.get(aggKey)
          agg.totalObligation += obligation
          agg.grantCount++
          if (cfdaTitle) agg.programs.add(cfdaTitle)
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
  const profileSummaries = new Map()
  for (const agg of aggregated.values()) {
    if (!profileSummaries.has(agg.entityTitle)) {
      profileSummaries.set(agg.entityTitle, {
        totalGrants: 0,
        totalObligation: 0,
        agencySummary: new Map(),
        programs: new Set(),
        path: agg.entityPath,
        fiscalYears: new Set(),
      })
    }
    const ps = profileSummaries.get(agg.entityTitle)
    ps.totalGrants += agg.grantCount
    ps.totalObligation += agg.totalObligation
    ps.fiscalYears.add(agg.fy)
    for (const p of agg.programs) ps.programs.add(p)

    const agencyTotal = ps.agencySummary.get(agg.agency) || 0
    ps.agencySummary.set(agg.agency, agencyTotal + agg.totalObligation)
  }

  console.log(`  Profiles with grant data: ${profileSummaries.size}`)

  // Show top 10 by total obligation
  const sorted = [...profileSummaries.entries()].sort((a, b) => b[1].totalObligation - a[1].totalObligation)
  console.log('')
  console.log('  Top 10 by total federal grant obligation:')
  for (const [title, ps] of sorted.slice(0, 10)) {
    console.log(`    ${title}: $${Math.round(ps.totalObligation).toLocaleString()} (${ps.totalGrants} grants, ${ps.programs.size} programs)`)
  }

  // Step 4: Build federal-grant edges
  const newEdges = []
  for (const agg of aggregated.values()) {
    if (Math.abs(agg.totalObligation) < 1) continue
    const topPrograms = [...agg.programs].slice(0, 5).join('; ')
    const edge = {
      from: agg.agency,
      to: agg.entityTitle,
      from_type: 'entity',
      to_type: 'entity',
      from_subcategory: 'government-agency',
      to_subcategory: agg.entityType === 'Think Tank' ? 'think-tank'
        : agg.entityType === 'Foundation' ? 'foundation'
        : agg.entityType === 'Nonprofit' ? 'nonprofit'
        : 'corporation',
      type: 'federal-grant',
      direction: 'directed',
      confidence: 0.95,
      source: 'usaspending-grants-bulk',
      source_url: null,
      evidence: [`USASpending FY${agg.fy}: ${agg.grantCount} assistance actions, $${Math.round(agg.totalObligation).toLocaleString()}${topPrograms ? '. Programs: ' + topPrograms : ''}`],
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

  console.log(`  Built ${newEdges.length} federal-grant edges`)

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

    const topAgencies = [...ps.agencySummary.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const topPrograms = [...ps.programs].slice(0, 10)
    const fyRange = [...ps.fiscalYears].sort().join(', ')

    let block = `<!-- auto:usaspending-grants start -->\n`
    block += `| Metric | Value |\n|--------|-------|\n`
    block += `| Federal Grants/Assistance | ${ps.totalGrants.toLocaleString()} |\n`
    block += `| Total Obligation | $${Math.round(ps.totalObligation).toLocaleString()} |\n`
    block += `| Fiscal Years | ${fyRange} |\n`
    block += `| Awarding Agencies | ${ps.agencySummary.size} |\n`
    block += `| Programs | ${ps.programs.size} |\n\n`
    block += `**Top awarding agencies:**\n\n`
    for (const [agency, total] of topAgencies) {
      block += `- ${agency}: $${Math.round(total).toLocaleString()}\n`
    }
    if (topPrograms.length > 0) {
      block += `\n**Top programs:**\n\n`
      for (const prog of topPrograms) {
        block += `- ${prog}\n`
      }
    }
    block += `\n- [Source: USASpending.gov](https://www.usaspending.gov/) (Tier 1) (VERIFIED)\n`
    block += `<!-- auto:usaspending-grants end -->`

    let updated = content
    if (updated.includes('<!-- auto:usaspending-grants start -->')) {
      updated = updated.replace(/<!-- auto:usaspending-grants start -->[\s\S]*?<!-- auto:usaspending-grants end -->/, block)
    } else if (updated.includes('## Archived')) {
      updated = updated.replace('## Archived', `### Federal Grants & Assistance (USASpending)\n${block}\n\n## Archived`)
    } else {
      updated += `\n\n### Federal Grants & Assistance (USASpending)\n${block}\n`
    }

    // Update frontmatter
    const fmMatch = updated.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      let fm = fmMatch[1]
      if (/^federal-grants:/m.test(fm)) {
        fm = fm.replace(/^federal-grants:.*$/m, `federal-grants: ${ps.totalGrants}`)
      } else {
        fm += `\nfederal-grants: ${ps.totalGrants}`
      }
      if (/^federal-grants-total:/m.test(fm)) {
        fm = fm.replace(/^federal-grants-total:.*$/m, `federal-grants-total: ${Math.round(ps.totalObligation)}`)
      } else {
        fm += `\nfederal-grants-total: ${Math.round(ps.totalObligation)}`
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
