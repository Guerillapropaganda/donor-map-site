#!/usr/bin/env node
/**
 * audit-fec-body-tables.cjs — measure the FEC donor-table data in profile bodies
 *
 * Pillar 2b investigation. The FEC summary pipeline has been writing
 * per-donor amount tables into politician profile bodies as markdown
 * pipe tables. The amounts exist in the vault — they're just not in
 * data/relationships.jsonl. This script measures the scope: how many
 * profiles have a table, how many rows total, how big are the amounts.
 */

const fs = require("fs")
const path = require("path")
const { walkDir } = require("./lib/shared.cjs")

const ROOT = path.join(__dirname, "..")
const POL_DIR = path.join(ROOT, "content", "Politicians")

// Match rows like: | DONOR NAME | $123,456 | $7,890 |
// Amounts: dollar sign, digits + commas, optional cents (we don't see cents in the pipeline output)
const ROW_RE = /\|\s*([^|\n]+?)\s*\|\s*\$([\d,]+(?:\.\d+)?)\s*\|\s*\$([\d,]+(?:\.\d+)?)\s*\|/g

function main() {
  const files = walkDir(POL_DIR, ".md")
  let profilesWithTable = 0
  let totalRows = 0
  const samples = []
  const perProfile = []

  for (const f of files) {
    const c = fs.readFileSync(f, "utf-8")
    const rows = []
    let m
    ROW_RE.lastIndex = 0
    while ((m = ROW_RE.exec(c)) !== null) {
      const donor = m[1].trim()
      // Skip header rows
      if (/^(donor|committee|name|total|source|receipt|amount)$/i.test(donor)) continue
      // Skip separator rows
      if (/^-+$/.test(donor)) continue
      // Skip by-year rows — donor column is just a year (e.g. "2022") or cycle range ("2021-2022")
      if (/^\d{4}(-\d{2,4})?$/.test(donor)) continue
      // Skip "~$540K" style summary rows
      if (/^~?\$/.test(donor)) continue
      // Require at least 2 letters in the donor name
      if ((donor.match(/[A-Za-z]/g) || []).length < 2) continue
      const a1 = parseInt(m[2].replace(/,/g, ""))
      const a2 = parseInt(m[3].replace(/,/g, ""))
      rows.push({ donor, amounts: [a1, a2] })
    }
    if (rows.length === 0) continue
    profilesWithTable++
    totalRows += rows.length
    perProfile.push({ file: path.relative(ROOT, f), rowCount: rows.length })
    if (samples.length < 5) {
      samples.push({ file: path.basename(f), rows: rows.slice(0, 3) })
    }
  }

  perProfile.sort((a, b) => b.rowCount - a.rowCount)

  console.log("")
  console.log("═══ FEC body-table audit ═══")
  console.log(`  profiles scanned:          ${files.length}`)
  console.log(`  profiles with donor table: ${profilesWithTable}`)
  console.log(`  total donor rows:          ${totalRows}`)
  console.log(`  avg rows/profile:          ${(totalRows / Math.max(1, profilesWithTable)).toFixed(1)}`)
  console.log("")
  console.log("  Top 10 by row count:")
  for (const p of perProfile.slice(0, 10)) {
    console.log(`    ${String(p.rowCount).padStart(4)}  ${p.file}`)
  }
  console.log("")
  console.log("  Samples:")
  for (const s of samples) {
    console.log(`    ${s.file}`)
    for (const r of s.rows) {
      console.log(`      ${r.donor}  $${r.amounts[0].toLocaleString()}  $${r.amounts[1].toLocaleString()}`)
    }
  }
  console.log("")
}

main()
