#!/usr/bin/env node
/**
 * ingest-fec-pac-summary.cjs — Enrich vault PAC/committee profiles with
 * financial summary data from FEC PAC summary bulk files.
 *
 * Input: data/bulk/fec-pac-summary-{16-26}.zip
 * Output: Frontmatter fields on matched profiles (total-raised, total-spent, cash-on-hand, independent-expenditures)
 *
 * PAC Summary columns (pipe-delimited, no header):
 *   0: CMTE_ID, 1: CMTE_NM, 2: CMTE_TP, 3: CMTE_DSGN, 4: CMTE_FILING_FREQ,
 *   5: TTL_RECEIPTS, 6: TRANS_FROM_AFF, 7: INDV_CONTRIB, 8: OTHER_POL_CMTE_CONTRIB,
 *   9: CAND_CONTRIB, 10: CAND_LOANS, 11: TTL_LOANS_RECEIVED, 12: TTL_DISB,
 *   13: TRANS_TO_AFF, 14: INDV_REFUNDS, 15: OTHER_POL_CMTE_REFUNDS,
 *   16: CAND_LOAN_REPAY, 17: LOAN_REPAY, 18: COH_BOP, 19: COH_COP,
 *   20: DEBTS_OWED_BY, 21: NONFED_TRANS_RECEIVED, 22: CONTRIB_TO_OTHER_CMTE,
 *   23: IND_EXP, 24: PTY_COORD_EXP, 25: NONFED_SHARE_EXP, 26: CVG_END_DT
 *
 * Usage:
 *   node scripts/ingest-fec-pac-summary.cjs              # dry run
 *   node scripts/ingest-fec-pac-summary.cjs --write      # write to profiles
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const BULK_DIR = path.join(ROOT, 'data', 'bulk')
const REGISTRY_PATH = path.join(ROOT, 'data', 'fec-committee-registry.json')
const WRITE = process.argv.includes('--write')

function formatDollars(n) {
  if (!n || n === 0) return '$0'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + Math.round(n).toLocaleString()
}

function main() {
  console.log('')
  console.log('═══ FEC PAC Summary Ingest ═══')
  console.log(`  mode: ${WRITE ? 'WRITE' : 'DRY RUN'}`)
  console.log('')

  // Load registry for committee → vault profile mapping
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'))
  const mappedCommittees = Object.entries(registry).filter(([_, r]) => r.status === 'mapped' && r.vault_profile)
  console.log(`  registry: ${mappedCommittees.length} mapped committees`)

  // Map cmteId → { vaultPath }
  const cmteToVault = new Map()
  for (const [cmteId, rec] of mappedCommittees) {
    cmteToVault.set(cmteId, { path: rec.vault_profile, fecName: rec.fec_name })
  }

  // Load PAC summary files (use latest cycle per committee)
  const summaryFiles = fs.readdirSync(BULK_DIR)
    .filter(f => f.startsWith('fec-pac-summary-') && f.endsWith('.zip'))
    .sort() // chronological

  // Map: cmteId → { totalReceipts, indvContrib, totalDisb, cohCop, contribToOther, indExp, cycle }
  const pacSummaries = new Map()

  for (const zipFile of summaryFiles) {
    const cycle = zipFile.match(/(\d{2})\.zip$/)?.[1]
    const zipPath = path.join(BULK_DIR, zipFile)
    const raw = execSync(`unzip -p "${zipPath}"`, { maxBuffer: 20 * 1024 * 1024, encoding: 'utf-8' })

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      const cols = line.split('|')
      if (cols.length < 24) continue

      const cmteId = cols[0]
      if (!cmteToVault.has(cmteId)) continue

      const totalReceipts = parseFloat(cols[5]) || 0
      const indvContrib = parseFloat(cols[7]) || 0
      const totalDisb = parseFloat(cols[12]) || 0
      const cohCop = parseFloat(cols[19]) || 0
      const contribToOther = parseFloat(cols[22]) || 0
      const indExp = parseFloat(cols[23]) || 0

      // Latest cycle wins
      pacSummaries.set(cmteId, {
        totalReceipts, indvContrib, totalDisb, cohCop, contribToOther, indExp,
        cycle: '20' + cycle,
      })
    }
  }

  console.log(`  PAC summaries matched: ${pacSummaries.size}`)
  console.log('')

  // Aggregate by vault profile (some profiles have multiple committees)
  const profileSummaries = new Map() // vaultPath → aggregated summary
  for (const [cmteId, summary] of pacSummaries) {
    const vault = cmteToVault.get(cmteId)
    if (!vault) continue

    if (!profileSummaries.has(vault.path)) {
      profileSummaries.set(vault.path, {
        totalReceipts: 0, indvContrib: 0, totalDisb: 0, cohCop: 0,
        contribToOther: 0, indExp: 0, committees: [],
      })
    }
    const ps = profileSummaries.get(vault.path)
    ps.totalReceipts += summary.totalReceipts
    ps.indvContrib += summary.indvContrib
    ps.totalDisb += summary.totalDisb
    ps.cohCop += summary.cohCop
    ps.contribToOther += summary.contribToOther
    ps.indExp += summary.indExp
    ps.committees.push({ id: cmteId, cycle: summary.cycle })
  }

  console.log(`  Profiles to update: ${profileSummaries.size}`)

  // Show top 10 by total receipts
  const sorted = [...profileSummaries.entries()]
    .sort((a, b) => b[1].totalReceipts - a[1].totalReceipts)
  console.log('')
  console.log('  Top 15 by total receipts:')
  for (const [vaultPath, ps] of sorted.slice(0, 15)) {
    const name = path.basename(vaultPath, '.md').replace(/^_/, '').replace(/ Master Profile$/, '')
    console.log(`    ${name}: ${formatDollars(ps.totalReceipts)} raised, ${formatDollars(ps.totalDisb)} spent, ${formatDollars(ps.indExp)} IE`)
  }

  if (!WRITE) {
    console.log('')
    console.log('  DRY RUN — re-run with --write to apply')
    return
  }

  // Write frontmatter fields
  console.log('')
  console.log('  Writing frontmatter...')
  let updated = 0

  for (const [vaultPath, ps] of profileSummaries) {
    if (!fs.existsSync(vaultPath)) continue
    let content = fs.readFileSync(vaultPath, 'utf-8')

    const fields = {
      'total-raised': Math.round(ps.totalReceipts),
      'total-spent': Math.round(ps.totalDisb),
      'cash-on-hand': Math.round(ps.cohCop),
      'independent-expenditures': Math.round(ps.indExp),
      'individual-contributions': Math.round(ps.indvContrib),
      'contributions-to-committees': Math.round(ps.contribToOther),
    }

    let fm = content.match(/^---\n([\s\S]*?)\n---/)?.[1]
    if (!fm) continue

    for (const [key, value] of Object.entries(fields)) {
      if (value === 0) continue
      if (new RegExp(`^${key}:`, 'm').test(fm)) {
        fm = fm.replace(new RegExp(`^${key}:.*$`, 'm'), `${key}: ${value}`)
      } else {
        fm += `\n${key}: ${value}`
      }
    }

    content = content.replace(/^---\n[\s\S]*?\n---/, `---\n${fm}\n---`)
    fs.writeFileSync(vaultPath, content, 'utf-8')
    updated++
  }

  console.log(`    ${updated} profiles updated`)
  console.log('  Done.')
}

main()
