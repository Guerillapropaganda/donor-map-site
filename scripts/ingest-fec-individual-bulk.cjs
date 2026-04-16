#!/usr/bin/env node
/**
 * ingest-fec-individual-bulk.cjs — Ingest FEC individual contribution CSVs
 * into the canonical relationship store as monetary edges representing
 * "employees of [corporation] collectively contributed to [committee/politician]."
 *
 * Input: data/bulk/fec-individual-contributions-{16..26}.zip
 *   Each contains itcont.txt (pipe-delimited, no header row) and
 *   optional by_date/ subdirectory with date-partitioned files.
 *
 * FEC itcont.txt column layout (pipe-delimited, 0-indexed):
 *   0:  CMTE_ID              — committee receiving the contribution
 *   1:  AMNDT_IND            — amendment indicator
 *   2:  RPT_TP               — report type
 *   3:  TRANSACTION_PGI      — primary/general indicator
 *   4:  IMAGE_NUM            — microfilm image number
 *   5:  TRANSACTION_TP       — transaction type
 *   6:  ENTITY_TP            — entity type (IND, ORG, COM, etc.)
 *   7:  NAME                 — contributor name (LAST, FIRST)
 *   8:  CITY
 *   9:  STATE
 *   10: ZIP_CODE
 *   11: EMPLOYER
 *   12: OCCUPATION
 *   13: TRANSACTION_DT       — MMDDYYYY
 *   14: TRANSACTION_AMT      — dollar amount
 *   15: OTHER_ID
 *   16: TRAN_ID
 *   17: FILE_NUM
 *   18: MEMO_CD
 *   19: MEMO_TEXT
 *   20: SUB_ID
 *
 * Output: monetary edges (employer-contribution subtype) + summary auto-blocks
 *
 * Usage:
 *   node scripts/ingest-fec-individual-bulk.cjs              # dry run (2026 only)
 *   node scripts/ingest-fec-individual-bulk.cjs --all        # dry run (all cycles)
 *   node scripts/ingest-fec-individual-bulk.cjs --write      # write to stores + profiles
 *   node scripts/ingest-fec-individual-bulk.cjs --write --all
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const yaml = require('js-yaml')

const { upsertEdges } = require('./lib/relationships-store.cjs')
const {
  computeEdgeId,
  normalizeTitle,
} = require('./lib/relationship-edge-validator.cjs')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const WRITE = process.argv.includes('--write')
const ALL_CYCLES = process.argv.includes('--all')
const NOW = new Date().toISOString()

// ─── Name normalization ─────────────────────────────────────────────

function normalizeCompanyName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|corp\.?|corporation|company|co\.?|ltd\.?|l\.?l\.?c\.?|l\.?p\.?|plc|group|holdings?|enterprises?|international|usa|u\.s\.a\.?|americas?)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Cycle year from filename: fec-individual-contributions-26.zip → "2026"
function cycleFromFilename(f) {
  const m = f.match(/contributions-(\d{2})\.zip/)
  if (!m) return 'unknown'
  const yy = parseInt(m[1], 10)
  return `${yy < 50 ? 2000 + yy : 1900 + yy}`
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('═══ FEC Individual Contributions Bulk Ingest ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log(`  cycles: ${ALL_CYCLES ? 'ALL (16-26)' : '2026 only'}`)
  console.log('')

  // Step 1: Load FEC committee registry (CMTE_ID → vault entity)
  const registryPath = path.join(ROOT, 'data', 'fec-committee-registry.json')
  if (!fs.existsSync(registryPath)) {
    console.log('  ERROR: data/fec-committee-registry.json not found')
    return
  }
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
  const cmteMap = new Map() // CMTE_ID → { title, path, candidateIds }
  for (const [cmteId, entry] of Object.entries(registry)) {
    if (entry.status !== 'mapped' || !entry.vault_profile) continue
    // Resolve vault title from profile path
    const profilePath = path.join(ROOT, entry.vault_profile)
    let title = entry.vault_slug || path.basename(entry.vault_profile, '.md')
    try {
      const profileContent = fs.readFileSync(profilePath, 'utf-8')
      const fmMatch = profileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (fmMatch) {
        const fm = yaml.load(fmMatch[1]) || {}
        if (fm.title) title = fm.title
      }
    } catch (_) {}
    cmteMap.set(cmteId, { title, path: profilePath, candidateIds: entry.candidate_ids || [] })
  }
  console.log(`  committee registry: ${cmteMap.size} mapped committees`)

  // Step 2: Build vault corporation name index (for employer matching)
  console.log('  building corporation name index...')
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(CONTENT, '.md')
  const corpIndex = new Map() // normalizedName → { title, path }
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

      corpIndex.set(normalizedName, { title, path: filePath })

      // Add aliases
      const aliases = Array.isArray(data.aliases) ? data.aliases
        : typeof data.aliases === 'string' ? [data.aliases] : []
      for (const alias of aliases) {
        const normalizedAlias = normalizeCompanyName(alias)
        if (normalizedAlias && !corpIndex.has(normalizedAlias)) {
          corpIndex.set(normalizedAlias, { title, path: filePath })
        }
      }

      // Handle "ACRONYM - Full Name"
      const dashParts = (data.title || '').split(' - ')
      if (dashParts.length >= 2) {
        const fullName = normalizeCompanyName(dashParts.slice(1).join(' - '))
        if (fullName && !corpIndex.has(fullName)) {
          corpIndex.set(fullName, { title, path: filePath })
        }
        const acronym = normalizeCompanyName(dashParts[0])
        if (acronym && acronym.length >= 2 && !corpIndex.has(acronym)) {
          corpIndex.set(acronym, { title, path: filePath })
        }
      }

      corpCount++
    } catch (_) { continue }
  }
  console.log(`    ${corpCount} corporation profiles, ${corpIndex.size} name variants`)

  // Step 3: Process ZIP files
  const zipFiles = fs.readdirSync(BULK_DIR)
    .filter(f => /^fec-individual-contributions-\d{2}\.zip$/.test(f))
    .sort()

  const selectedZips = ALL_CYCLES ? zipFiles : zipFiles.filter(f => f.includes('-26.zip'))

  if (selectedZips.length === 0) {
    console.log('  ERROR: No fec-individual-contributions-*.zip files in data/bulk/')
    return
  }
  console.log(`  processing ${selectedZips.length} ZIP files: ${selectedZips.join(', ')}`)

  // Per-cycle processing: stream, aggregate, flush edges, clear memory
  // Global profile summaries use counters (not Sets) to stay memory-safe
  let totalRows = 0
  let matchedRows = 0
  let skippedRows = 0
  let noEmployerMatch = 0
  let noCmteMatch = 0
  let totalEdgesWritten = 0
  let totalEdgesBuilt = 0

  // Cross-cycle profile summaries (lightweight — no Sets, just counters)
  // Map<employerTitle, { totalAmount, totalContributions, uniqueEmployeeEstimate, committees: Map<cmteTitle, { amount, count }>, cycles: Set<string>, path }>
  const profileSummaries = new Map()

  for (const zipFile of selectedZips) {
    const zipPath = path.join(BULK_DIR, zipFile)
    const cycle = cycleFromFilename(zipFile)
    console.log(`\n  processing ${zipFile} (cycle ${cycle})...`)

    // Per-cycle aggregation (cleared after each cycle)
    // Key: "employerTitle|cmteTitle" → { employerTitle, employerPath, cmteTitle, cmtePath, totalAmount, contributionCount, uniqueContributors: Set }
    const cycleAgg = new Map()
    let cycleRows = 0
    let cycleMatched = 0

    // List files in zip — use the main itcont.txt (full file), not by_date/ splits
    const listOutput = execSync(`unzip -l "${zipPath}"`, { encoding: 'utf-8' })
    const txtFiles = listOutput.split('\n')
      .filter(line => /itcont\.txt\s*$/.test(line.trim()) && !line.includes('by_date'))
      .map(line => line.trim().split(/\s+/).pop())

    if (txtFiles.length === 0) {
      console.log('    no itcont.txt found, skipping')
      continue
    }

    for (const txtFile of txtFiles) {
      console.log(`    streaming ${txtFile}...`)

      const { spawn } = require('child_process')
      const readline = require('readline')

      await new Promise((resolve, reject) => {
        const proc = spawn('unzip', ['-p', zipPath, txtFile], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        const rl = readline.createInterface({ input: proc.stdout, crlfDelay: Infinity })
        let lineCount = 0

        rl.on('line', (line) => {
          if (!line.trim()) return
          lineCount++
          totalRows++
          cycleRows++
          if (totalRows % 1000000 === 0) process.stdout.write(`      ${(totalRows / 1000000).toFixed(1)}M rows...\r`)

          const fields = line.split('|')
          const cmteId = (fields[0] || '').trim()
          const employer = (fields[11] || '').trim()
          const amountStr = (fields[14] || '').trim()
          const amount = parseFloat(amountStr) || 0
          const contributorName = (fields[7] || '').trim()

          // Skip zero/negative amounts and memo transactions
          if (amount <= 0) {
            skippedRows++
            return
          }

          // Must have a committee match in our registry
          const cmteEntry = cmteMap.get(cmteId)
          if (!cmteEntry) {
            noCmteMatch++
            return
          }

          // Must have an employer match in our vault
          if (!employer || employer === 'NONE' || employer === 'N/A' ||
              employer === 'SELF-EMPLOYED' || employer === 'SELF' ||
              employer === 'RETIRED' || employer === 'NOT EMPLOYED' ||
              employer === 'INFORMATION REQUESTED' || employer === 'INFORMATION REQUESTED PER BEST EFFORTS') {
            skippedRows++
            return
          }

          const normalizedEmployer = normalizeCompanyName(employer)
          const corpMatch = corpIndex.get(normalizedEmployer)
          if (!corpMatch) {
            noEmployerMatch++
            return
          }

          matchedRows++
          cycleMatched++
          const aggKey = `${corpMatch.title}|${cmteEntry.title}`
          if (!cycleAgg.has(aggKey)) {
            cycleAgg.set(aggKey, {
              employerTitle: corpMatch.title,
              employerPath: corpMatch.path,
              cmteTitle: cmteEntry.title,
              cmtePath: cmteEntry.path,
              totalAmount: 0,
              contributionCount: 0,
              uniqueContributors: new Set(),
            })
          }
          const agg = cycleAgg.get(aggKey)
          agg.totalAmount += amount
          agg.contributionCount++
          // Track unique contributors (use "NAME|ZIP5" for dedup)
          const contKey = `${contributorName}|${(fields[10] || '').trim().slice(0, 5)}`
          agg.uniqueContributors.add(contKey)
        })

        rl.on('close', () => {
          console.log(`      ${lineCount.toLocaleString()} data rows`)
          resolve()
        })

        proc.on('error', reject)
        proc.stderr.on('data', () => {})
      })
    }

    // ─── Flush this cycle: build edges, write, merge into profile summaries, clear ───
    console.log(`    cycle ${cycle}: ${cycleRows.toLocaleString()} rows, ${cycleMatched.toLocaleString()} matched, ${cycleAgg.size} edges`)

    // Build edges for this cycle
    const cycleEdges = []
    for (const agg of cycleAgg.values()) {
      if (Math.abs(agg.totalAmount) < 100) continue
      const edge = {
        from: agg.employerTitle,
        to: agg.cmteTitle,
        from_type: 'entity',
        to_type: 'entity',
        from_subcategory: 'corporation',
        to_subcategory: 'political-committee',
        type: 'monetary',
        direction: 'directed',
        confidence: 0.85,
        source: 'fec-individual-bulk',
        source_url: null,
        evidence: [`FEC individual contributions ${cycle}: ${agg.uniqueContributors.size} employees of ${agg.employerTitle} made ${agg.contributionCount} contributions totaling $${Math.round(agg.totalAmount).toLocaleString()} to ${agg.cmteTitle}`],
        amount: Math.round(Math.abs(agg.totalAmount)),
        cycle,
        role: 'employee-contributions',
        date_range: null,
        first_seen: NOW,
        last_verified: NOW,
        status: 'active',
      }
      edge.id = computeEdgeId(edge)
      cycleEdges.push(edge)
    }
    totalEdgesBuilt += cycleEdges.length
    console.log(`    built ${cycleEdges.length} edges for cycle ${cycle}`)

    // Write edges immediately if in WRITE mode
    if (WRITE && cycleEdges.length > 0) {
      const result = upsertEdges(cycleEdges)
      totalEdgesWritten += result.added + result.updated
      console.log(`    wrote: +${result.added} added, ${result.updated} updated, ${result.invalid} invalid`)
    }

    // Merge into lightweight profile summaries (counters only, no contributor Sets)
    for (const agg of cycleAgg.values()) {
      if (!profileSummaries.has(agg.employerTitle)) {
        profileSummaries.set(agg.employerTitle, {
          totalAmount: 0,
          totalContributions: 0,
          uniqueEmployeeEstimate: 0,
          committees: new Map(),
          cycles: new Set(),
          path: agg.employerPath,
        })
      }
      const ps = profileSummaries.get(agg.employerTitle)
      ps.totalAmount += agg.totalAmount
      ps.totalContributions += agg.contributionCount
      ps.uniqueEmployeeEstimate += agg.uniqueContributors.size // approximate (cross-cycle overlap not deduped)
      ps.cycles.add(cycle)

      const cmte = ps.committees.get(agg.cmteTitle) || { amount: 0, count: 0 }
      cmte.amount += agg.totalAmount
      cmte.count += agg.contributionCount
      ps.committees.set(agg.cmteTitle, cmte)
    }

    // Free memory for this cycle
    cycleAgg.clear()
  }

  console.log('')
  console.log(`  Total rows:       ${totalRows.toLocaleString()}`)
  console.log(`  Matched:          ${matchedRows.toLocaleString()}`)
  console.log(`  Skipped:          ${skippedRows.toLocaleString()} (zero amt / self-employed / retired)`)
  console.log(`  No cmte match:    ${noCmteMatch.toLocaleString()}`)
  console.log(`  No employer match: ${noEmployerMatch.toLocaleString()}`)
  console.log(`  Total edges built: ${totalEdgesBuilt}`)
  if (WRITE) console.log(`  Total edges written: ${totalEdgesWritten}`)

  console.log(`  Employer profiles with data: ${profileSummaries.size}`)

  // Top 15 by total
  const sorted = [...profileSummaries.entries()].sort((a, b) => b[1].totalAmount - a[1].totalAmount)
  console.log('')
  console.log('  Top 15 employers by employee contributions to vault-linked committees:')
  for (const [title, ps] of sorted.slice(0, 15)) {
    console.log(`    ${title}: $${Math.round(ps.totalAmount).toLocaleString()} (~${ps.uniqueEmployeeEstimate} employees, ${ps.totalContributions} contributions → ${ps.committees.size} committees)`)
  }

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Step 7: Write auto-blocks to employer profiles
  console.log('')
  console.log('  Writing auto-blocks to employer profiles...')
  let profilesUpdated = 0
  for (const [title, ps] of profileSummaries.entries()) {
    if (!ps.path || !fs.existsSync(ps.path)) continue

    const content = fs.readFileSync(ps.path, 'utf-8')

    const topCommittees = [...ps.committees.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 10)

    const cycleRange = [...ps.cycles].sort().join(', ')

    let block = `<!-- auto:fec-individual start -->\n`
    block += `| Metric | Value |\n|--------|-------|\n`
    block += `| Employee Contributions | ${ps.totalContributions.toLocaleString()} |\n`
    block += `| Total Amount | $${Math.round(ps.totalAmount).toLocaleString()} |\n`
    block += `| Unique Employee Donors | ~${ps.uniqueEmployeeEstimate.toLocaleString()} |\n`
    block += `| Recipient Committees | ${ps.committees.size} |\n`
    block += `| Election Cycles | ${cycleRange} |\n\n`
    block += `**Top recipient committees (by employee contributions):**\n\n`
    for (const [cmteTitle, cmte] of topCommittees) {
      block += `- [[${cmteTitle}]]: $${Math.round(cmte.amount).toLocaleString()} (${cmte.count} contributions)\n`
    }
    block += `\n- [Source: FEC Individual Contributions](https://www.fec.gov/data/browse-data/?tab=bulk-data) (Tier 1) (VERIFIED)\n`
    block += `<!-- auto:fec-individual end -->`

    let updated = content
    if (updated.includes('<!-- auto:fec-individual start -->')) {
      updated = updated.replace(/<!-- auto:fec-individual start -->[\s\S]*?<!-- auto:fec-individual end -->/, block)
    } else if (updated.includes('## Archived')) {
      updated = updated.replace('## Archived', `### Employee Political Contributions (FEC)\n${block}\n\n## Archived`)
    } else {
      updated += `\n\n### Employee Political Contributions (FEC)\n${block}\n`
    }

    // Update frontmatter
    const fmMatch = updated.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      let fm = fmMatch[1]
      if (/^employee-contributions:/m.test(fm)) {
        fm = fm.replace(/^employee-contributions:.*$/m, `employee-contributions: ${ps.totalContributions}`)
      } else {
        fm += `\nemployee-contributions: ${ps.totalContributions}`
      }
      if (/^employee-contributions-total:/m.test(fm)) {
        fm = fm.replace(/^employee-contributions-total:.*$/m, `employee-contributions-total: ${Math.round(ps.totalAmount)}`)
      } else {
        fm += `\nemployee-contributions-total: ${Math.round(ps.totalAmount)}`
      }
      if (/^employee-donor-count:/m.test(fm)) {
        fm = fm.replace(/^employee-donor-count:.*$/m, `employee-donor-count: ${ps.uniqueEmployeeEstimate}`)
      } else {
        fm += `\nemployee-donor-count: ${ps.uniqueEmployeeEstimate}`
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
