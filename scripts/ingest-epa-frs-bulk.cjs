#!/usr/bin/env node
/**
 * ingest-epa-frs-bulk.cjs — Ingest EPA Facility Registry Service bulk data
 * to write auto-blocks + frontmatter to corporation profiles.
 *
 * Input: data/bulk/frs_downloads.zip → FRS_FACILITIES.csv
 * Output: auto-blocks in profile markdown + frontmatter fields
 *
 * FRS_FACILITIES columns (quoted CSV):
 *   0: FAC_NAME, 1: FAC_STREET, 2: FAC_CITY, 3: FAC_STATE,
 *   4: FAC_ZIP, 5: REGISTRY_ID, 6: FAC_COUNTY, 7: FAC_EPA_REGION,
 *   8: LATITUDE_MEASURE, 9: LONGITUDE_MEASURE
 *
 * Usage:
 *   node scripts/ingest-epa-frs-bulk.cjs              # dry run
 *   node scripts/ingest-epa-frs-bulk.cjs --write      # write to profiles
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

function normalizeCompanyName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|corp\.?|corporation|company|co\.?|ltd\.?|l\.?l\.?c\.?|l\.?p\.?|plc|group|holdings?|enterprises?|international|usa|u\.s\.a\.?|americas?)\b/gi, '')
    .replace(/[,."'()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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
  console.log('═══ EPA FRS Bulk Ingest (Facility Registry) ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Build corporation name index
  console.log('  building corporation name index...')
  const { walkDir } = require('./lib/shared.cjs')
  const corpIndex = new Map() // normalizedName → { title, path }
  const allFiles = walkDir(CONTENT, '.md')
  let corpCount = 0

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (data.type !== 'corporation' && data['entity-type'] !== 'Corporation') continue

      const title = normalizeTitle(data.title || path.basename(filePath, '.md'))
      if (!title) continue

      const normalizedName = normalizeCompanyName(title)
      if (!normalizedName) continue

      corpIndex.set(normalizedName, { title, path: filePath })

      // Also add common variants
      const aliases = Array.isArray(data.aliases) ? data.aliases
        : typeof data.aliases === 'string' ? [data.aliases] : []
      for (const alias of aliases) {
        const na = normalizeCompanyName(alias)
        if (na && !corpIndex.has(na)) corpIndex.set(na, { title, path: filePath })
      }

      // Add the raw title without normalization as a variant
      const rawNorm = normalizeCompanyName(data.title || '')
      if (rawNorm && !corpIndex.has(rawNorm)) {
        corpIndex.set(rawNorm, { title, path: filePath })
      }

      // Handle "ACRONYM - Full Name" pattern (e.g., "ADM - Archer Daniels Midland")
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

  // Step 2: Stream FRS_FACILITIES.csv
  const zipPath = path.join(BULK_DIR, 'epa-frs-facilities.zip')
  if (!fs.existsSync(zipPath)) {
    console.log('  ERROR: frs_downloads.zip not found in data/bulk/')
    return
  }

  console.log('  extracting FRS_FACILITIES.csv (3.2M rows)...')
  const raw = execSync(`unzip -p "${zipPath}" FRS_FACILITIES.csv`, {
    maxBuffer: 500 * 1024 * 1024, // 500MB
    encoding: 'utf-8',
  })

  const lines = raw.split('\n')
  console.log(`    ${lines.length.toLocaleString()} lines`)

  // Aggregation: Map<corpTitle, { facilities: Set<registryId>, states: Set, cities: Set, regions: Set }>
  const corpFacilities = new Map()
  let matchedRows = 0

  // Parse header
  const header = parseCSVLine(lines[0])
  const facNameIdx = header.findIndex(h => h.trim() === 'FAC_NAME')
  const facStateIdx = header.findIndex(h => h.trim() === 'FAC_STATE')
  const facCityIdx = header.findIndex(h => h.trim() === 'FAC_CITY')
  const registryIdx = header.findIndex(h => h.trim() === 'REGISTRY_ID')
  const epaRegionIdx = header.findIndex(h => h.trim() === 'FAC_EPA_REGION')

  console.log('  matching facilities to vault corporations...')
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const fields = parseCSVLine(line)
    const facName = (fields[facNameIdx] || '').trim()
    const facState = (fields[facStateIdx] || '').trim()
    const facCity = (fields[facCityIdx] || '').trim()
    const registryId = (fields[registryIdx] || '').trim()

    if (!facName) continue

    const normalizedFac = normalizeCompanyName(facName)
    const match = corpIndex.get(normalizedFac)
    if (!match) continue

    matchedRows++
    if (!corpFacilities.has(match.title)) {
      corpFacilities.set(match.title, {
        path: match.path,
        facilities: new Set(),
        states: new Set(),
        cities: new Set(),
      })
    }
    const cf = corpFacilities.get(match.title)
    if (registryId) cf.facilities.add(registryId)
    if (facState) cf.states.add(facState)
    if (facCity) cf.cities.add(`${facCity}, ${facState}`)
  }

  console.log(`    ${matchedRows.toLocaleString()} facility rows matched`)
  console.log(`    ${corpFacilities.size} corporations with EPA facilities`)

  // Show top 10 by facility count
  const sorted = [...corpFacilities.entries()].sort((a, b) => b[1].facilities.size - a[1].facilities.size)
  console.log('')
  console.log('  Top 10 by EPA facility count:')
  for (const [title, cf] of sorted.slice(0, 10)) {
    console.log(`    ${title}: ${cf.facilities.size} facilities across ${cf.states.size} states`)
  }

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Step 3: Write auto-blocks and frontmatter
  console.log('')
  console.log('  Writing auto-blocks to profiles...')
  let profilesUpdated = 0

  for (const [title, cf] of corpFacilities.entries()) {
    if (!cf.path || !fs.existsSync(cf.path)) continue

    const content = fs.readFileSync(cf.path, 'utf-8')
    const statesList = [...cf.states].sort().join(', ')
    const topCities = [...cf.cities].slice(0, 10).join(', ')

    let block = `<!-- auto:epa-echo start -->\n`
    block += `| Metric | Value |\n|--------|-------|\n`
    block += `| EPA-Registered Facilities | ${cf.facilities.size} |\n`
    block += `| States | ${cf.states.size} (${statesList}) |\n`
    block += `| Registry IDs | ${[...cf.facilities].slice(0, 5).join(', ')}${cf.facilities.size > 5 ? ` +${cf.facilities.size - 5} more` : ''} |\n\n`
    if (topCities) {
      block += `**Facility locations:** ${topCities}${cf.cities.size > 10 ? ` +${cf.cities.size - 10} more` : ''}\n\n`
    }
    block += `- [Source: EPA Facility Registry Service](https://www.epa.gov/frs) (Tier 1) (VERIFIED)\n`
    block += `<!-- auto:epa-echo end -->`

    let updated = content
    if (updated.includes('<!-- auto:epa-echo start -->')) {
      updated = updated.replace(/<!-- auto:epa-echo start -->[\s\S]*?<!-- auto:epa-echo end -->/, block)
    } else if (updated.includes('## Archived')) {
      updated = updated.replace('## Archived', `### EPA Facility Registry\n${block}\n\n## Archived`)
    } else {
      updated += `\n\n### EPA Facility Registry\n${block}\n`
    }

    // Update frontmatter
    const fmMatch = updated.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      let fm = fmMatch[1]
      if (/^epa-facilities:/m.test(fm)) {
        fm = fm.replace(/^epa-facilities:.*$/m, `epa-facilities: ${cf.facilities.size}`)
      } else {
        fm += `\nepa-facilities: ${cf.facilities.size}`
      }
      if (/^epa-states:/m.test(fm)) {
        fm = fm.replace(/^epa-states:.*$/m, `epa-states: "${statesList}"`)
      } else {
        fm += `\nepa-states: "${statesList}"`
      }
      updated = updated.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`)
    }

    fs.writeFileSync(cf.path, updated, 'utf-8')
    profilesUpdated++
  }

  console.log(`    ${profilesUpdated} profiles updated`)
  console.log('')
  console.log('  Done.')
}

main().catch(console.error)
