#!/usr/bin/env node
/**
 * ingest-congress-bills-bulk.cjs — Parse 118th Congress bill status XMLs
 * and enrich politician profiles with legislative activity data.
 *
 * Input: data/bulk/congress-118th-bills-status.zip (19,308 XML files)
 * Output: per-politician frontmatter + auto-blocks with bills sponsored/cosponsored,
 *         top policy areas, and key legislation.
 *
 * XML structure (per bill):
 *   <bill><number>, <type> (HR/S/HJRES/SJRES/HCONRES/SCONRES/HRES/SRES)
 *   <title>, <introducedDate>, <originChamber>
 *   <sponsors><item><bioguideId> — primary sponsor
 *   <cosponsors><item><bioguideId> — cosponsors
 *   <policyArea><name> — top-level subject
 *   <subjects><legislativeSubjects><item><name> — detailed subjects
 *   <latestAction><text> — current status (e.g. "Became Public Law No: 118-52")
 *
 * Matching: bioguideId → politician profiles with `bioguide-id:` frontmatter
 *
 * Usage:
 *   node scripts/ingest-congress-bills-bulk.cjs              # dry run
 *   node scripts/ingest-congress-bills-bulk.cjs --write      # write to profiles
 */

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const AdmZip = require('adm-zip')

const ROOT = path.join(__dirname, '..')
const CONTENT = path.join(ROOT, 'content')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const WRITE = process.argv.includes('--write')

// ─── Simple XML helpers (no dependency needed for this structure) ─────

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)
  const m = xml.match(re)
  return m ? m[1].trim() : null
}

function extractAllTags(xml, tag) {
  const results = []
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g')
  let m
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim())
  return results
}

// Extract sponsor items from a <sponsors> or <cosponsors> block
function extractSponsorItems(block) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = itemRegex.exec(block)) !== null) {
    const itemXml = m[1]
    const bioguideId = extractTag(itemXml, 'bioguideId')
    const fullName = extractTag(itemXml, 'fullName')
    const party = extractTag(itemXml, 'party')
    const state = extractTag(itemXml, 'state')
    if (bioguideId) items.push({ bioguideId, fullName, party, state })
  }
  return items
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('')
  console.log('═══ Congress 118th Bills Bulk Ingest ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Step 1: Build bioguideId → politician profile index
  console.log('  building bioguide index...')
  const { walkDir } = require('./lib/shared.cjs')
  const allFiles = walkDir(CONTENT, '.md')
  const bioguideIndex = new Map() // bioguideId → { title, path, party, chamber }

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
      if (!match) continue
      const data = yaml.load(match[1]) || {}
      if (data.type !== 'politician') continue
      const bioguideId = (data['bioguide-id'] || '').toString().replace(/"/g, '')
      if (!bioguideId) continue

      bioguideIndex.set(bioguideId, {
        title: data.title || path.basename(filePath, '.md'),
        path: filePath,
        party: data.party || '',
        chamber: data.chamber || '',
      })
    } catch (_) { continue }
  }
  console.log(`    ${bioguideIndex.size} politicians with bioguide IDs`)

  // Step 2: Parse all bill XMLs from the zip
  const zipPath = path.join(BULK_DIR, 'congress-118th-bills-status.zip')
  if (!fs.existsSync(zipPath)) {
    console.log('  ERROR: congress-118th-bills-status.zip not found in data/bulk/')
    return
  }

  console.log('  loading ZIP...')
  const zip = new AdmZip(zipPath)
  const xmlEntries = zip.getEntries().filter(e => e.entryName.endsWith('.xml'))
  console.log(`  ${xmlEntries.length} bill XML files`)

  // Per-politician aggregation
  // Map<bioguideId, { sponsored: [], cosponsored: [], policyAreas: Map<area, count>, subjects: Map<subj, count> }>
  const politicianBills = new Map()

  function ensurePolitician(bioguideId) {
    if (!politicianBills.has(bioguideId)) {
      politicianBills.set(bioguideId, {
        sponsored: [],
        cosponsored: [],
        policyAreas: new Map(),
        subjects: new Map(),
      })
    }
    return politicianBills.get(bioguideId)
  }

  let parsed = 0
  let matched = 0
  let enacted = 0

  for (const entry of xmlEntries) {
    const xml = entry.getData().toString('utf-8')
    parsed++
    if (parsed % 5000 === 0) process.stdout.write(`    ${parsed} bills parsed...\r`)

    const billNumber = extractTag(xml, 'number')
    const billType = extractTag(xml, 'type') || ''
    const title = extractTag(xml, 'title') || ''
    const introducedDate = extractTag(xml, 'introducedDate') || ''
    const policyAreaBlock = extractTag(xml, 'policyArea')
    const policyArea = policyAreaBlock ? extractTag(policyAreaBlock, 'name') : null

    // Get latest action to determine bill status
    const latestActionBlock = extractTag(xml, 'latestAction')
    const latestActionText = latestActionBlock ? extractTag(latestActionBlock, 'text') : ''
    const isEnacted = latestActionText && (
      latestActionText.includes('Became Public Law') ||
      latestActionText.includes('Signed by President')
    )
    if (isEnacted) enacted++

    const billRef = `${billType} ${billNumber}`
    const billInfo = {
      ref: billRef,
      title: title.length > 120 ? title.slice(0, 117) + '...' : title,
      introduced: introducedDate,
      policyArea,
      enacted: isEnacted,
      latestAction: latestActionText ? (latestActionText.length > 100 ? latestActionText.slice(0, 97) + '...' : latestActionText) : '',
    }

    // Extract subjects
    const subjectsBlock = extractTag(xml, 'subjects')
    const subjectNames = []
    if (subjectsBlock) {
      const legSubjects = extractTag(subjectsBlock, 'legislativeSubjects')
      if (legSubjects) {
        const items = extractAllTags(legSubjects, 'item')
        for (const item of items) {
          const name = extractTag(item, 'name')
          if (name) subjectNames.push(name)
        }
      }
    }

    // Extract sponsors
    const sponsorsBlock = extractTag(xml, 'sponsors')
    const sponsors = sponsorsBlock ? extractSponsorItems(sponsorsBlock) : []

    // Extract cosponsors
    const cosponsorsBlock = extractTag(xml, 'cosponsors')
    const cosponsors = cosponsorsBlock ? extractSponsorItems(cosponsorsBlock) : []

    let billMatched = false

    // Process sponsors
    for (const sponsor of sponsors) {
      if (!bioguideIndex.has(sponsor.bioguideId)) continue
      billMatched = true
      const pb = ensurePolitician(sponsor.bioguideId)
      pb.sponsored.push(billInfo)
      if (policyArea) pb.policyAreas.set(policyArea, (pb.policyAreas.get(policyArea) || 0) + 1)
      for (const subj of subjectNames) pb.subjects.set(subj, (pb.subjects.get(subj) || 0) + 1)
    }

    // Process cosponsors
    for (const cosponsor of cosponsors) {
      if (!bioguideIndex.has(cosponsor.bioguideId)) continue
      billMatched = true
      const pb = ensurePolitician(cosponsor.bioguideId)
      pb.cosponsored.push(billInfo)
      if (policyArea) pb.policyAreas.set(policyArea, (pb.policyAreas.get(policyArea) || 0) + 1)
      for (const subj of subjectNames) pb.subjects.set(subj, (pb.subjects.get(subj) || 0) + 1)
    }

    if (billMatched) matched++
  }

  console.log(`    ${parsed} bills parsed`)
  console.log(`    ${matched} bills matched to vault politicians`)
  console.log(`    ${enacted} bills enacted into law`)
  console.log(`    ${politicianBills.size} politicians with bill data`)

  // Step 3: Build profile summaries
  const profileSummaries = new Map() // title → summary
  for (const [bioguideId, pb] of politicianBills.entries()) {
    const profile = bioguideIndex.get(bioguideId)
    if (!profile) continue

    const topPolicyAreas = [...pb.policyAreas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    const topSubjects = [...pb.subjects.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)

    // Key bills: enacted ones first, then most recent
    const enactedBills = pb.sponsored.filter(b => b.enacted)
    const recentSponsored = pb.sponsored
      .sort((a, b) => (b.introduced || '').localeCompare(a.introduced || ''))
      .slice(0, 5)

    profileSummaries.set(profile.title, {
      path: profile.path,
      billsSponsored: pb.sponsored.length,
      billsCosponsored: pb.cosponsored.length,
      billsEnacted: enactedBills.length,
      topPolicyAreas,
      topSubjects,
      enactedBills,
      recentSponsored,
    })
  }

  // Top 15 by bills sponsored
  const sorted = [...profileSummaries.entries()].sort((a, b) => b[1].billsSponsored - a[1].billsSponsored)
  console.log('')
  console.log('  Top 15 by bills sponsored (118th Congress):')
  for (const [title, ps] of sorted.slice(0, 15)) {
    console.log(`    ${title}: ${ps.billsSponsored} sponsored, ${ps.billsCosponsored} cosponsored, ${ps.billsEnacted} enacted`)
  }

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Step 4: Write auto-blocks and frontmatter to profiles
  console.log('')
  console.log('  Writing auto-blocks to profiles...')
  let profilesUpdated = 0

  for (const [title, ps] of profileSummaries.entries()) {
    if (!ps.path || !fs.existsSync(ps.path)) continue

    const content = fs.readFileSync(ps.path, 'utf-8')

    let block = `<!-- auto:congress-bills start -->\n`
    block += `| Metric | Value |\n|--------|-------|\n`
    block += `| Bills Sponsored | ${ps.billsSponsored} |\n`
    block += `| Bills Cosponsored | ${ps.billsCosponsored} |\n`
    block += `| Bills Enacted | ${ps.billsEnacted} |\n`
    block += `| Congress | 118th (2023-2024) |\n\n`

    if (ps.topPolicyAreas.length > 0) {
      block += `**Top policy areas:**\n\n`
      for (const [area, count] of ps.topPolicyAreas) {
        block += `- ${area} (${count})\n`
      }
      block += '\n'
    }

    if (ps.enactedBills.length > 0) {
      block += `**Enacted into law:**\n\n`
      for (const bill of ps.enactedBills.slice(0, 5)) {
        block += `- ${bill.ref}: ${bill.title}\n`
      }
      block += '\n'
    }

    if (ps.recentSponsored.length > 0 && ps.enactedBills.length === 0) {
      block += `**Recent bills sponsored:**\n\n`
      for (const bill of ps.recentSponsored.slice(0, 5)) {
        block += `- ${bill.ref}: ${bill.title}\n`
      }
      block += '\n'
    }

    block += `- [Source: Congress.gov Bill Status](https://www.congress.gov/) (Tier 1) (VERIFIED)\n`
    block += `<!-- auto:congress-bills end -->`

    let updated = content
    if (updated.includes('<!-- auto:congress-bills start -->')) {
      updated = updated.replace(/<!-- auto:congress-bills start -->[\s\S]*?<!-- auto:congress-bills end -->/, block)
    } else if (updated.includes('## Archived')) {
      updated = updated.replace('## Archived', `### Legislative Activity (118th Congress)\n${block}\n\n## Archived`)
    } else {
      updated += `\n\n### Legislative Activity (118th Congress)\n${block}\n`
    }

    // Update frontmatter
    const fmMatch = updated.match(/^---\n([\s\S]*?)\n---/)
    if (fmMatch) {
      let fm = fmMatch[1]
      if (/^bills-sponsored:/m.test(fm)) {
        fm = fm.replace(/^bills-sponsored:.*$/m, `bills-sponsored: ${ps.billsSponsored}`)
      } else {
        fm += `\nbills-sponsored: ${ps.billsSponsored}`
      }
      if (/^bills-cosponsored:/m.test(fm)) {
        fm = fm.replace(/^bills-cosponsored:.*$/m, `bills-cosponsored: ${ps.billsCosponsored}`)
      } else {
        fm += `\nbills-cosponsored: ${ps.billsCosponsored}`
      }
      if (/^bills-enacted:/m.test(fm)) {
        fm = fm.replace(/^bills-enacted:.*$/m, `bills-enacted: ${ps.billsEnacted}`)
      } else {
        fm += `\nbills-enacted: ${ps.billsEnacted}`
      }
      // Top policy area as frontmatter
      if (ps.topPolicyAreas.length > 0) {
        const topArea = ps.topPolicyAreas[0][0]
        if (/^top-policy-area:/m.test(fm)) {
          fm = fm.replace(/^top-policy-area:.*$/m, `top-policy-area: "${topArea}"`)
        } else {
          fm += `\ntop-policy-area: "${topArea}"`
        }
      }
      updated = updated.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`)
    }

    fs.writeFileSync(ps.path, updated, 'utf-8')
    profilesUpdated++
  }

  console.log(`    ${profilesUpdated} profiles updated with legislative data`)
  console.log('')
  console.log('  Done.')
}

main().catch(console.error)
