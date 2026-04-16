#!/usr/bin/env node
/**
 * launch-50-prepare.cjs , Prep launch 50 for editorial sign-off
 *
 * Two jobs:
 *   1. Flag profiles with low auto-block counts for pipeline re-enrichment
 *      (sets needs-reenrichment: true in frontmatter)
 *   2. Insert Class Analysis heading skeleton for profiles missing one
 *      (Research Claude fills in the prose)
 *
 * Reads: content/Admin Notes/launch-50-audit.json
 * Dry-run by default. Pass --write to apply.
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")
const AUDIT = path.join(ROOT, "content/Admin Notes/launch-50-audit.json")
const DRY_RUN = !process.argv.includes("--write")

if (!fs.existsSync(AUDIT)) {
  console.error("Audit file not found. Run: node scripts/launch-50-audit.cjs")
  process.exit(1)
}

const audit = JSON.parse(fs.readFileSync(AUDIT, "utf-8"))
const allRows = [...audit.politicians, ...audit.donors, ...audit.corporations]
  .filter(r => !r.missing && !r.err && r.file)

console.log(`Processing ${allRows.length} launch-50 profiles (${DRY_RUN ? "DRY RUN" : "WRITE MODE"})`)
console.log()

const actions = { needsReenrich: [], addedCA: [], alreadyOk: [] }

// Class Analysis skeleton template
const CA_TEMPLATE_POLITICIAN = `
## Class Analysis

<!-- RESEARCH CLAUDE: Draft the class analysis section here.
     Anchor on the donor/contribution data above. Focus on:
     1. Who funds them and what that reveals about material interests
     2. How voting record aligns (or doesn't) with funder priorities
     3. The "both sides" / cross-party structure if applicable
     4. Position in the broader capital-to-politician pipeline
     Remove this comment block when done. ~300-500 words. -->

`

const CA_TEMPLATE_DONOR = `
## Class Analysis

<!-- RESEARCH CLAUDE: Draft the class analysis section here.
     Anchor on this donor's actual contribution pattern. Focus on:
     1. What fraction of capital , finance, tech, fossil, carceral, etc.
     2. Ideological function , which policy demands track to the money
     3. Cross-party spending if any, and what it reveals
     4. Relationship to the broader donor network / dark money flows
     Remove this comment block when done. ~300-500 words. -->

`

const CA_TEMPLATE_CORP = `
## Class Analysis

<!-- RESEARCH CLAUDE: Draft the class analysis section here.
     Anchor on contracts, lobbying, and politicians funded. Focus on:
     1. What state function this corp captures (defense, surveillance, carceral, pharma regulation, etc.)
     2. The revolving door , board members cycling through government
     3. Material interest in maintaining current policy
     4. How class position shapes lobbying priorities
     Remove this comment block when done. ~300-500 words. -->

`

function getCATemplate(type) {
  if (type === "politician" || type === "state-politician" || type === "local-politician") return CA_TEMPLATE_POLITICIAN
  if (type === "corporation") return CA_TEMPLATE_CORP
  return CA_TEMPLATE_DONOR
}

// Where to insert Class Analysis , prefer before "## Sources" or at end of body
function insertClassAnalysis(body, template) {
  // Try inserting before "## Sources" (case insensitive, matches various "Sources" headings)
  const sourcesMatch = body.match(/^(##+ +Sources)/m)
  if (sourcesMatch) {
    const idx = body.indexOf(sourcesMatch[0])
    return body.slice(0, idx) + template + body.slice(idx)
  }
  // Try inserting before "## References" or "## Citations"
  const refMatch = body.match(/^(##+ +(References|Citations|Bibliography))/m)
  if (refMatch) {
    const idx = body.indexOf(refMatch[0])
    return body.slice(0, idx) + template + body.slice(idx)
  }
  // Append to end
  return body.trimEnd() + "\n" + template
}

// Textual frontmatter patch — preserves byte-for-byte all fields we don't touch.
// Adds/updates only the specific key-value we need. Does NOT round-trip through yaml.dump
// (that would reformat relationship cache fields and trip canonical-store-sentinel).
function patchFrontmatter(fmText, key, value) {
  // If key exists, replace its line (only for simple scalar values)
  const keyRegex = new RegExp(`^${key}:.*$`, "m")
  const newLine = `${key}: ${value}`
  if (keyRegex.test(fmText)) {
    return fmText.replace(keyRegex, newLine)
  }
  // Else, append to end of frontmatter block
  return fmText.trimEnd() + "\n" + newLine
}

for (const row of allRows) {
  const fullPath = path.join(ROOT, row.file)
  if (!fs.existsSync(fullPath)) {
    console.log(`  [skip] file not found: ${row.file}`)
    continue
  }

  let text = fs.readFileSync(fullPath, "utf-8")
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) {
    console.log(`  [skip] no frontmatter: ${row.name}`)
    continue
  }

  let fm
  try { fm = yaml.load(m[1]) } catch (e) {
    console.log(`  [skip] YAML parse error: ${row.name}`)
    continue
  }

  const originalFmText = m[1]
  const body = m[2]
  let changed = false
  let newFmText = originalFmText
  let newBody = body

  // Action 1: Flag for re-enrichment if auto-block count is suspiciously low
  const needsReenrichThreshold =
    row.type === "politician" ? 5 :
    row.type === "corporation" ? 10 : 5

  if ((row.autoBlocks || 0) < needsReenrichThreshold && !fm["needs-reenrichment"]) {
    newFmText = patchFrontmatter(newFmText, "needs-reenrichment", "true")
    newFmText = patchFrontmatter(newFmText, "reenrich-reason",
      `"launch-50 audit: only ${row.autoBlocks || 0} auto-blocks (threshold: ${needsReenrichThreshold})"`)
    changed = true
    actions.needsReenrich.push({ name: row.name, blocks: row.autoBlocks || 0 })
  }

  // Action 2: Insert Class Analysis skeleton if missing
  if (!row.hasClassAnalysis && !/^##\s+Class Analysis/m.test(body)) {
    const template = getCATemplate(row.type)
    newBody = insertClassAnalysis(body, template)
    changed = true
    actions.addedCA.push({ name: row.name, type: row.type })
  }

  if (!changed) {
    actions.alreadyOk.push(row.name)
    continue
  }

  if (!DRY_RUN) {
    const newText = `---\n${newFmText}\n---\n${newBody}`
    fs.writeFileSync(fullPath, newText)
  }
}

console.log()
console.log("=".repeat(80))
console.log("SUMMARY")
console.log("=".repeat(80))
console.log()
console.log(`Flagged for re-enrichment: ${actions.needsReenrich.length}`)
for (const r of actions.needsReenrich) console.log(`  - ${r.name} (${r.blocks} blocks)`)
console.log()
console.log(`Class Analysis skeleton added: ${actions.addedCA.length}`)
for (const r of actions.addedCA) console.log(`  - ${r.name} (${r.type})`)
console.log()
console.log(`Already OK (no changes needed): ${actions.alreadyOk.length}`)
console.log()
if (DRY_RUN) console.log("DRY RUN , no files modified. Pass --write to apply.")
else console.log("WRITE MODE , files updated.")
