#!/usr/bin/env node
/**
 * launch-50-audit.cjs — Audit the curated launch-50 profiles against verified-tier requirements
 *
 * Picks the strategic 50 profiles for the April 30 launch based on:
 * - Top politicians by money received (FEC data)
 * - Mega-donors everyone knows + top PACs by outflow
 * - Top corporations by government contract volume
 *
 * For each: reports readiness state, Class Analysis presence, source diversity,
 * auto-block coverage, and flag counts (URL NEEDED / UNVERIFIED / NEEDS REVIEW).
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")

// The strategic 50
const LAUNCH_50 = {
  politicians: [
    "Kamala Harris", "Donald Trump", "Bernie Moreno", "Sherrod Brown", "Raphael Warnock",
    "John Fetterman", "Mark Kelly", "Elissa Slotkin", "Josh Hawley", "Ted Cruz",
    "Chuck Schumer", "Mitch McConnell", "Mike Johnson", "Hakeem Jeffries", "Nancy Pelosi",
    "Alexandria Ocasio-Cortez Master Profile", "Bernie Sanders", "Elizabeth Warren", "Katie Porter",
    "Ron DeSantis",
  ],
  donors: [
    "Elon Musk", "Koch Industries", "Charles Koch",
    "AIPAC - American Israel Public Affairs Committee",
    "Miriam Adelson", "George Soros",
    "Peter Thiel", "Ken Griffin", "Timothy Mellon",
    "Richard and Elizabeth Uihlein", "Jeffrey Yass",
    "Michael Bloomberg", "Reid Hoffman",
    "League of Conservation Voters",
    "Crypto Industry Bloc",
  ],
  corporations: [
    "Lockheed Martin", "Raytheon (RTX Corporation)",
    "Northrop Grumman", "General Dynamics", "Boeing",
    "Palantir Technologies", "Anduril Industries",
    "CoreCivic", "GEO Group",
    "Pfizer Inc.", "ExxonMobil", "Chevron",
    "Google - Alphabet", "Meta - Facebook", "JPMorgan Chase",
  ],
}

// Walk content/ to find profile files
function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "Drafts" || entry.name === "Digests" || entry.name.startsWith(".")) continue
      walk(full, acc)
    } else if (entry.name.endsWith(".md")) {
      acc.push(full)
    }
  }
  return acc
}

console.log("Scanning content/ ...")
const allFiles = walk(path.join(ROOT, "content"))
console.log(`Found ${allFiles.length} markdown files`)

// Build a name index — by basename AND by frontmatter title
const byName = new Map()
for (const fp of allFiles) {
  const basename = path.basename(fp, ".md").toLowerCase()
  if (!byName.has(basename)) byName.set(basename, fp)
  try {
    const text = fs.readFileSync(fp, "utf-8")
    const m = text.match(/^---\n([\s\S]*?)\n---/)
    if (m) {
      const fm = yaml.load(m[1])
      if (fm && fm.title) {
        const t = String(fm.title).toLowerCase()
        if (!byName.has(t)) byName.set(t, fp)
      }
    }
  } catch {}
}

function findProfile(name) {
  const key = name.toLowerCase()
  if (byName.has(key)) return byName.get(key)
  // Try partial matches
  const candidates = [...byName.entries()].filter(([k, _]) =>
    k.includes(key) || key.includes(k)
  )
  if (candidates.length === 1) return candidates[0][1]
  if (candidates.length > 1) {
    // Prefer Master Profile matches
    const master = candidates.find(([_, v]) => v.includes("Master Profile") || v.includes(name))
    if (master) return master[1]
    // Prefer non-sub-note
    const nonSub = candidates.find(([_, v]) => !v.includes("/Chad Bianco/") && !v.includes("/RFK"))
    if (nonSub) return nonSub[1]
    return candidates[0][1]
  }
  return null
}

function scoreProfile(name, filePath) {
  const text = fs.readFileSync(filePath, "utf-8")
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { name, err: "no frontmatter" }
  let fm
  try { fm = yaml.load(m[1]) } catch { return { name, err: "YAML parse error" } }
  const body = m[2]
  const hasClassAnalysis = /^##\s+Class Analysis/m.test(body)
  const sourceTypes = Array.isArray(fm["source-types"]) ? fm["source-types"] : []
  const urlNeeded = (body.match(/\(URL NEEDED\)/g) || []).length
  const unverified = (body.match(/\(UNVERIFIED\)/g) || []).length
  const needsReview = (body.match(/\(NEEDS REVIEW\)/g) || []).length
  const autoBlocks = (body.match(/<!-- auto:[\w-]+/g) || []).length
  const knownGaps = fm["known-gaps"]
  const hasGaps = knownGaps && String(knownGaps).trim().length > 0 && String(knownGaps).trim() !== "none" && String(knownGaps).trim() !== "None"
  return {
    name,
    file: filePath.replace(ROOT + path.sep, "").replace(/\\/g, "/"),
    readiness: fm["content-readiness"] || "unset",
    type: fm.type || "?",
    hasClassAnalysis,
    sourceCount: sourceTypes.length,
    sourceTypes,
    urlNeeded,
    unverified,
    needsReview,
    autoBlocks,
    hasGaps,
  }
}

// Output
const results = { politicians: [], donors: [], corporations: [] }
let found = 0, missing = 0

for (const [cat, names] of Object.entries(LAUNCH_50)) {
  console.log()
  console.log("=".repeat(100))
  console.log(`  ${cat.toUpperCase()} (${names.length})`)
  console.log("=".repeat(100))
  console.log()
  console.log("STATUS    CA  SRC BLOCKS FLAGS".padEnd(50) + "PROFILE")
  console.log("-".repeat(100))

  for (const name of names) {
    const fp = findProfile(name)
    if (!fp) {
      console.log(`[MISSING]                                          ${name}`)
      results[cat].push({ name, missing: true })
      missing++
      continue
    }
    const s = scoreProfile(name, fp)
    if (s.err) {
      console.log(`[${s.err}]  ${name}`)
      missing++
      continue
    }
    found++
    const readiness = s.readiness.padEnd(9)
    const ca = s.hasClassAnalysis ? " ✓ " : " ✗ "
    const src = String(s.sourceCount).padStart(3)
    const blocks = String(s.autoBlocks).padStart(6)
    const flags = []
    if (s.urlNeeded) flags.push(`url:${s.urlNeeded}`)
    if (s.unverified) flags.push(`unv:${s.unverified}`)
    if (s.needsReview) flags.push(`rev:${s.needsReview}`)
    if (s.hasGaps) flags.push("gaps")
    const flagStr = flags.join(",").padEnd(20)
    console.log(`[${readiness}]${ca}${src} ${blocks} ${flagStr}  ${name}`)
    results[cat].push(s)
  }
}

console.log()
console.log("=".repeat(100))
console.log(`Found: ${found} / Missing: ${missing}`)

// Readiness rollup
const all = [...results.politicians, ...results.donors, ...results.corporations].filter(r => !r.missing && !r.err)
const byReadiness = { verified: 0, ready: 0, draft: 0, raw: 0, unset: 0 }
for (const r of all) {
  byReadiness[r.readiness] = (byReadiness[r.readiness] || 0) + 1
}
console.log()
console.log("READINESS ROLLUP (found profiles):")
for (const [k, v] of Object.entries(byReadiness)) {
  console.log(`  ${k.padEnd(10)} ${v}`)
}

const hasCA = all.filter(r => r.hasClassAnalysis).length
console.log()
console.log(`Class Analysis: ${hasCA} / ${all.length} (${Math.round(hasCA * 100 / all.length)}%)`)
console.log(`Zero flags:     ${all.filter(r => !r.urlNeeded && !r.unverified && !r.needsReview && !r.hasGaps).length} / ${all.length}`)

// Write JSON for downstream
fs.writeFileSync(
  path.join(ROOT, "content/Admin Notes/launch-50-audit.json"),
  JSON.stringify(results, null, 2)
)
console.log()
console.log("JSON written to: content/Admin Notes/launch-50-audit.json")
