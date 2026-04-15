#!/usr/bin/env node
/**
 * audit-fec-donor-match-rate.cjs — how many FEC committee names in profile
 * body tables resolve to existing vault profiles (or their aliases)?
 *
 * Walks politician profiles, parses their FEC donor pipe-tables, looks up
 * each committee name in the title index (which respects `aliases:`
 * frontmatter), and reports:
 *   - match rate
 *   - top unmatched committees (to decide which need stub profiles/aliases)
 *   - breakdown by support vs oppose
 */

const fs = require("fs")
const path = require("path")
const { walkDir } = require("./lib/shared.cjs")
const { buildTitleIndex } = require("./lib/relationship-edge-validator.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const POL_DIR = path.join(CONTENT_DIR, "Politicians")

const ROW_RE = /\|\s*([^|\n]+?)\s*\|\s*\$([\d,]+(?:\.\d+)?)\s*\|\s*\$([\d,]+(?:\.\d+)?)\s*\|/g

function normalizeName(s) {
  return s.trim().replace(/\s+/g, " ")
}

function isCandidateDonorRow(donor) {
  if (/^(donor|committee|name|total|source|receipt|amount)$/i.test(donor)) return false
  if (/^-+$/.test(donor)) return false
  if (/^\d{4}(-\d{2,4})?$/.test(donor)) return false
  if (/^~?\$/.test(donor)) return false
  if ((donor.match(/[A-Za-z]/g) || []).length < 2) return false
  return true
}

// Try multiple lookup strategies
function resolve(title, idx) {
  // Exact
  if (idx.has(title)) return { method: "exact", entry: idx.get(title) }

  // Title case (e.g. "EMILY'S LIST" -> "Emily's List")
  const tc = title
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
  if (idx.has(tc)) return { method: "titlecase", entry: idx.get(tc) }

  // Strip common FEC suffixes
  const stripped = title
    .replace(/,?\s*INC\.?$/i, "")
    .replace(/,?\s*LLC\.?$/i, "")
    .replace(/\s+PAC$/i, "")
    .replace(/\s+COMMITTEE$/i, "")
    .replace(/\s+ACTION$/i, "")
    .trim()
  if (stripped !== title && idx.has(stripped)) return { method: "stripped", entry: idx.get(stripped) }
  // Title-case the stripped form
  const tcStripped = stripped
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase())
  if (tcStripped !== tc && idx.has(tcStripped))
    return { method: "stripped-titlecase", entry: idx.get(tcStripped) }

  // DBA parenthesized form: "X DBA Y" → try X and Y
  const dba = title.match(/^(.+?)\s+\((.+?)\)/)
  if (dba) {
    const outer = normalizeName(dba[1])
    const inner = normalizeName(dba[2])
    if (idx.has(outer)) return { method: "paren-outer", entry: idx.get(outer) }
    if (idx.has(inner)) return { method: "paren-inner", entry: idx.get(inner) }
    const outerTc = outer.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())
    if (idx.has(outerTc)) return { method: "paren-outer-tc", entry: idx.get(outerTc) }
  }

  return null
}

function main() {
  console.log("")
  console.log("═══ audit-fec-donor-match-rate ═══")
  console.log("")
  console.log("  building title index...")
  const idx = buildTitleIndex(CONTENT_DIR)
  console.log(`  ${idx.size} titles in index (incl. aliases)`)
  console.log("")

  const files = walkDir(POL_DIR, ".md")
  let totalRows = 0
  let supportRows = 0
  let opposeRows = 0
  let matched = 0
  const unmatched = new Map()
  const methodStats = {}

  for (const f of files) {
    const c = fs.readFileSync(f, "utf-8")
    const m = c.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!m) continue
    // Crude: pull title field
    const titleMatch = m[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)
    const polTitle = titleMatch ? titleMatch[1].replace(/^["']|["']$/g, "").trim() : null

    let rm
    ROW_RE.lastIndex = 0
    while ((rm = ROW_RE.exec(c)) !== null) {
      const donor = rm[1].trim()
      if (!isCandidateDonorRow(donor)) continue
      const a1 = parseInt(rm[2].replace(/,/g, ""))
      const a2 = parseInt(rm[3].replace(/,/g, ""))
      const isSupport = a1 > 0
      const isOppose = a2 > 0
      if (!isSupport && !isOppose) continue
      if (isSupport) supportRows++
      if (isOppose) opposeRows++
      totalRows++

      const res = resolve(donor, idx)
      if (res) {
        matched++
        methodStats[res.method] = (methodStats[res.method] || 0) + 1
      } else {
        unmatched.set(donor, (unmatched.get(donor) || 0) + 1)
      }
    }
  }

  console.log(`  donor rows parsed:    ${totalRows}`)
  console.log(`    support (col 1 >0): ${supportRows}`)
  console.log(`    oppose  (col 2 >0): ${opposeRows}`)
  console.log(`  matched to a profile: ${matched}  (${((matched / totalRows) * 100).toFixed(1)}%)`)
  console.log(`  unmatched:            ${totalRows - matched}`)
  console.log("")
  console.log("  Match methods:")
  for (const [k, v] of Object.entries(methodStats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(v).padStart(4)}  ${k}`)
  }
  console.log("")
  const topUnmatched = [...unmatched.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  console.log("  Top 20 unmatched committees:")
  for (const [name, c] of topUnmatched) {
    console.log(`    ${String(c).padStart(3)}  ${name}`)
  }
  console.log("")
}

main()
