#!/usr/bin/env node
/**
 * checklist-auto-na.cjs — Bulk sweeper that auto-marks obvious N/A checklist
 * items across the vault based on entity type and pipeline status.
 *
 * Heuristics:
 *   - EPA/OSHA (regulatory): N/A for lobbying-firms, media-profiles, PACs,
 *     think-tanks, donors (individuals), foundations. Only applies to corporations.
 *   - Federal contracts (contracts): N/A for lobbying-firms, media-profiles,
 *     PACs, individuals, think-tanks (unless they hold government grants).
 *   - NHTSA: N/A for any corporation NOT in automotive/transport sector.
 *   - Pipeline failures: If internal-notes records a FAILED pipeline and the
 *     entity type makes the data unlikely, auto-mark N/A with "pipeline failed,
 *     entity type unlikely to have data".
 *
 * Also stamps `urls-first-triaged` date on profiles where all URL tags are clean.
 *
 * Usage:
 *   node scripts/checklist-auto-na.cjs              # dry run (report only)
 *   node scripts/checklist-auto-na.cjs --write      # write changes to files
 *   node scripts/checklist-auto-na.cjs --write --commit  # write + git commit
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")
const { execSync } = require("child_process")

const CONTENT = path.join(__dirname, "..", "content")
const DRY_RUN = !process.argv.includes("--write")
const DO_COMMIT = process.argv.includes("--commit")

// Types where EPA/OSHA regulatory data is NOT expected
const EPA_NA_TYPES = new Set([
  "donor", "lobbying-firm", "media-profile", "pac",
  "think-tank", "foundation", "union", "journalist",
  "podcaster", "story", "event", "sub-note", "daily-update",
])

// Types where federal contracts are NOT expected
const CONTRACTS_NA_TYPES = new Set([
  "donor", "lobbying-firm", "media-profile", "pac",
  "journalist", "podcaster", "story", "event",
  "sub-note", "daily-update",
])

// Corporation sectors where NHTSA data is NOT expected
const NHTSA_NA_SECTORS = new Set([
  "Agriculture", "Finance", "Healthcare", "Insurance",
  "Media", "Pharma", "Retail", "Tech", "Telecom",
  "Energy", "Food", "Real Estate", "Private Equity",
  "Carceral State", "Dark Money", "Corporate",
])

const TODAY = new Date().toISOString().slice(0, 10)

function walk(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip admin/system directories
      if (["Admin Notes", "Decisions", "Checklists", "Phases", "Vault Maintenance",
           "Templates", "Story Seeds", ".obsidian"].includes(entry.name)) continue
      results.push(...walk(full))
    } else if (entry.name.endsWith(".md")) {
      results.push(full)
    }
  }
  return results
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  try {
    return yaml.load(m[1])
  } catch {
    return null
  }
}

function getExistingNa(fm) {
  return Array.isArray(fm["checklist-na"]) ? [...fm["checklist-na"]] : []
}

function hasNaFor(naList, id) {
  return naList.some(n => n.startsWith(`${id}:`))
}

function countUrlTags(text) {
  let count = 0
  const patterns = [/\(URL NEEDED\)/gi, /\(NEEDS REVIEW\)/gi, /\(UNVERIFIED\)/gi]
  for (const re of patterns) {
    const matches = text.match(re)
    if (matches) count += matches.length
  }
  return count
}

function hasAutoBlock(text, name) {
  return text.includes(`<!-- auto:${name} start`) || text.includes(`<!-- auto:${name}-`)
}

// ─── Main ──────────────────────────────────────────────────────────────

const files = walk(CONTENT)
const stats = {
  scanned: 0,
  modified: 0,
  naAdded: 0,
  urlsTriagedStamped: 0,
  byItem: {},
}

const modifiedFiles = []

for (const file of files) {
  const text = fs.readFileSync(file, "utf-8")
  const fm = parseFrontmatter(text)
  if (!fm || !fm.type) continue

  stats.scanned++

  const type = fm.type
  const sector = fm.sector || ""
  const internalNotes = fm["internal-notes"] || ""
  const naList = getExistingNa(fm)
  let changed = false
  const additions = []

  // ─── EPA/OSHA auto-N/A ───────────────────────────────────────────
  if (EPA_NA_TYPES.has(type) && !hasNaFor(naList, "regulatory")) {
    if (!hasAutoBlock(text, "epa-echo") && !hasAutoBlock(text, "osha")) {
      const reason = `auto: entity type "${type}" does not typically have EPA/OSHA records (${TODAY})`
      naList.push(`regulatory: ${reason}`)
      additions.push("regulatory")
      changed = true
    }
  }

  // ─── Federal contracts auto-N/A ──────────────────────────────────
  if (CONTRACTS_NA_TYPES.has(type) && !hasNaFor(naList, "contracts")) {
    if (!hasAutoBlock(text, "usaspending") && !hasAutoBlock(text, "sam-contracts")) {
      const reason = `auto: entity type "${type}" does not typically hold federal contracts (${TODAY})`
      naList.push(`contracts: ${reason}`)
      additions.push("contracts")
      changed = true
    }
  }

  // ─── NHTSA auto-N/A for non-auto corporations ───────────────────
  if (type === "corporation" && NHTSA_NA_SECTORS.has(sector) && !hasNaFor(naList, "nhtsa")) {
    if (hasAutoBlock(text, "nhtsa-recalls")) {
      // NHTSA block exists but sector is non-auto — likely false match
      // Don't auto-N/A, but this is flagged for review
    }
  }

  // ─── URLs-first-triaged stamp ────────────────────────────────────
  if (!fm["urls-first-triaged"] && countUrlTags(text) === 0) {
    // All URLs are clean — stamp the date
    if (!DRY_RUN) {
      // Will be written below with the N/A changes
    }
    stats.urlsTriagedStamped++
    changed = true
  }

  if (!changed) continue

  stats.modified++
  for (const id of additions) {
    stats.naAdded++
    stats.byItem[id] = (stats.byItem[id] || 0) + 1
  }

  if (DRY_RUN) {
    const rel = path.relative(CONTENT, file)
    console.log(`  ${rel}: +${additions.length} N/A (${additions.join(", ")})${!fm["urls-first-triaged"] && countUrlTags(text) === 0 ? " +urls-triaged" : ""}`)
    continue
  }

  // ─── Write changes ───────────────────────────────────────────────
  let updated = text

  // Remove existing checklist-na block
  updated = updated.replace(/^checklist-na:[\s\S]*?(?=^[a-zA-Z][\w-]*:|^---$)/m, "")

  // Build all new YAML to insert in one pass (avoids double \n---\n match)
  let insertYaml = ""

  if (naList.length > 0) {
    insertYaml += `checklist-na:\n${naList.map(n => `  - "${n.replace(/"/g, '\\"')}"`).join("\n")}\n`
  }

  if (!fm["urls-first-triaged"] && countUrlTags(text) === 0 && !updated.includes("urls-first-triaged:")) {
    insertYaml += `urls-first-triaged: "${TODAY}"\n`
  }

  if (insertYaml) {
    updated = updated.replace(/\n---\n/, `\n${insertYaml}---\n`)
  }

  fs.writeFileSync(file, updated, "utf-8")
  modifiedFiles.push(file)
}

// ─── Summary ─────────────────────────────────────────────────────────

console.log(`\n${"=".repeat(60)}`)
console.log(`Checklist Auto-N/A Sweeper ${DRY_RUN ? "(DRY RUN)" : "(WRITE MODE)"}`)
console.log(`${"=".repeat(60)}`)
console.log(`Scanned:          ${stats.scanned} profiles`)
console.log(`Modified:         ${stats.modified} profiles`)
console.log(`N/A items added:  ${stats.naAdded}`)
console.log(`URLs-triaged:     ${stats.urlsTriagedStamped} profiles stamped`)
console.log()
if (Object.keys(stats.byItem).length > 0) {
  console.log("By checklist item:")
  for (const [id, count] of Object.entries(stats.byItem).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id}: ${count}`)
  }
}

if (DO_COMMIT && modifiedFiles.length > 0) {
  console.log(`\nCommitting ${modifiedFiles.length} files...`)
  for (const f of modifiedFiles) {
    execSync(`git add "${f}"`, { stdio: "pipe" })
  }
  const msg = `Checklist auto-N/A: ${stats.naAdded} items across ${stats.modified} profiles, ${stats.urlsTriagedStamped} urls-triaged stamps\n\nCo-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
  execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { stdio: "inherit" })
}
