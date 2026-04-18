#!/usr/bin/env node
/**
 * sync-bills-frontmatter-from-auto-block.cjs
 *
 * Politician profiles have TWO sources of bills-sponsored / bills-cosponsored
 * numbers:
 *
 *   1. The <!-- auto:congress-legislation --> auto-block, populated from
 *      the Congress.gov API — career totals across all terms served.
 *   2. The bills-sponsored: / bills-cosponsored: frontmatter fields,
 *      populated from ingest-congress-bills-bulk.cjs which (before a 2026-
 *      04-17 guard fix) wrote only the 118th Congress bulk XML numbers
 *      and clobbered the larger API career totals.
 *
 * Pelosi's symptom was bills-sponsored: 2 and bills-cosponsored: 95 in
 * frontmatter (118th-only) vs 199 / 5074 in the auto-block (career total).
 * The frontmatter numbers drove the SummaryInfobox / data panel display
 * so readers saw 2 bills over a 36-year career. Wrong.
 *
 * This script walks content/Politicians/, parses each profile's
 * auto:congress-legislation block, and rewrites the frontmatter
 * bills-sponsored / bills-cosponsored / bills-enacted fields when the
 * auto-block numbers are larger. "Larger" is the heuristic because the
 * career total should always be >= any single-congress total; if the
 * auto-block happens to be smaller (e.g. API call failed), we don't
 * clobber whatever's already in frontmatter.
 *
 * Adds a bills-data-scope field explaining the source so we can tell
 * future sessions where the numbers came from.
 *
 * Usage:
 *   node scripts/sync-bills-frontmatter-from-auto-block.cjs           # preview
 *   node scripts/sync-bills-frontmatter-from-auto-block.cjs --write
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const POLITICIANS_DIR = path.join(ROOT, "content", "Politicians")
const WRITE = process.argv.includes("--write")

function walkMd(dir, acc) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    let st
    try { st = fs.statSync(full) } catch { continue }
    if (st.isDirectory()) walkMd(full, acc)
    else if (name.endsWith(".md")) acc.push(full)
  }
  return acc
}

// Parse a row like "| Bills Sponsored | 199 |" -> 199
function parseMetricRow(block, label) {
  const re = new RegExp(`^\\|\\s*${label}\\s*\\|\\s*([0-9,]+)\\s*\\|`, "m")
  const m = block.match(re)
  if (!m) return null
  const n = parseInt(m[1].replace(/,/g, ""), 10)
  return Number.isFinite(n) ? n : null
}

function extractAutoBlock(text) {
  const m = text.match(/<!-- auto:congress-legislation start -->([\s\S]*?)<!-- auto:congress-legislation end -->/)
  return m ? m[1] : null
}

function currentField(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m")
  const m = fm.match(re)
  if (!m) return null
  const raw = m[1].trim()
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

function setField(fm, key, value, sortAfter) {
  const re = new RegExp(`^${key}:.*$`, "m")
  if (re.test(fm)) return fm.replace(re, `${key}: ${value}`)
  // Insert after `sortAfter` key if present; else append
  if (sortAfter) {
    const anchor = new RegExp(`^${sortAfter}:.*$`, "m")
    if (anchor.test(fm)) {
      return fm.replace(anchor, (m) => `${m}\n${key}: ${value}`)
    }
  }
  return fm.trimEnd() + `\n${key}: ${value}`
}

function setFieldQuoted(fm, key, value, sortAfter) {
  const quoted = `"${String(value).replace(/"/g, '\\"')}"`
  return setField(fm, key, quoted, sortAfter)
}

function main() {
  const files = walkMd(POLITICIANS_DIR, [])
  let scanned = 0
  let updated = 0
  let skippedNoBlock = 0
  let skippedUnchanged = 0
  let skippedAutoSmaller = 0
  const previews = []

  for (const file of files) {
    const text = fs.readFileSync(file, "utf-8")
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/)
    if (!fmMatch) continue
    const fm = fmMatch[1]
    const titleMatch = fm.match(/^title:\s*(.+)$/m)
    if (!titleMatch) continue

    const typeMatch = fm.match(/^type:\s*(.+)$/m)
    if (!typeMatch || !/politician/i.test(typeMatch[1])) continue

    scanned++

    const block = extractAutoBlock(text)
    if (!block) { skippedNoBlock++; continue }

    const autoSponsored = parseMetricRow(block, "Bills Sponsored")
    const autoCosponsored = parseMetricRow(block, "Bills Cosponsored")
    const autoEnacted = parseMetricRow(block, "Bills Enacted")

    const fmSponsored = currentField(fm, "bills-sponsored") ?? 0
    const fmCosponsored = currentField(fm, "bills-cosponsored") ?? 0
    const fmEnacted = currentField(fm, "bills-enacted") ?? 0

    const updates = {}
    if (autoSponsored !== null && autoSponsored > fmSponsored) updates["bills-sponsored"] = autoSponsored
    if (autoCosponsored !== null && autoCosponsored > fmCosponsored) updates["bills-cosponsored"] = autoCosponsored
    if (autoEnacted !== null && autoEnacted > fmEnacted) updates["bills-enacted"] = autoEnacted

    if (Object.keys(updates).length === 0) {
      if (autoSponsored !== null && autoSponsored <= fmSponsored && fmSponsored > 0) skippedAutoSmaller++
      else skippedUnchanged++
      continue
    }

    let newFm = fm
    for (const [k, v] of Object.entries(updates)) {
      newFm = setField(newFm, k, v, "top-policy-area")
    }
    // Mark scope so future sessions know where these came from
    newFm = setFieldQuoted(
      newFm,
      "bills-data-scope",
      "Career total synced from auto:congress-legislation (Congress.gov API) on 2026-04-17 via sync-bills-frontmatter-from-auto-block.cjs",
      "bills-enacted",
    )

    updated++
    const rel = path.relative(ROOT, file).replace(/\\/g, "/")
    previews.push({
      file: rel,
      title: titleMatch[1].trim(),
      was: { sponsored: fmSponsored, cosponsored: fmCosponsored, enacted: fmEnacted },
      now: {
        sponsored: updates["bills-sponsored"] ?? fmSponsored,
        cosponsored: updates["bills-cosponsored"] ?? fmCosponsored,
        enacted: updates["bills-enacted"] ?? fmEnacted,
      },
    })

    if (WRITE) {
      const before = "---\n" + fm + "\n---\n"
      const after = "---\n" + newFm + "\n---\n"
      fs.writeFileSync(file, text.replace(before, after), "utf-8")
    }
  }

  console.log("")
  console.log(`Scanned politician profiles: ${scanned}`)
  console.log(`Would update: ${updated}`)
  console.log(`Skipped (no auto-block): ${skippedNoBlock}`)
  console.log(`Skipped (auto <= frontmatter): ${skippedAutoSmaller}`)
  console.log(`Skipped (already equal): ${skippedUnchanged}`)
  console.log("")
  console.log("Top 20 by sponsored delta:")
  previews
    .map((p) => ({ ...p, delta: p.now.sponsored - p.was.sponsored }))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 20)
    .forEach((p) => {
      console.log(
        `  ${p.title.padEnd(30)}  sponsored: ${String(p.was.sponsored).padStart(4)} -> ${String(p.now.sponsored).padStart(5)} | cosp: ${String(p.was.cosponsored).padStart(5)} -> ${String(p.now.cosponsored).padStart(6)} | enacted: ${p.was.enacted} -> ${p.now.enacted}`,
      )
    })
  if (!WRITE) console.log("\nDRY RUN — rerun with --write to apply.")
}

main()
