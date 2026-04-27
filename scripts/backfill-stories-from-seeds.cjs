#!/usr/bin/env node
/**
 * backfill-stories-from-seeds.cjs — one-time migration
 *
 * Reads all files in content/Story Seeds/*.md, parses their
 * frontmatter, and mints a canonical record in data/stories.jsonl
 * for each. Idempotent: re-running skips seeds that already have a
 * matching slug in the store.
 *
 * After this runs, the markdown seed files are effectively superseded
 * by the JSONL records. The markdown files are NOT deleted by this
 * script — David can clean them up manually or leave them in place.
 * Contradiction-miner will no longer write new markdown seeds after
 * this migration.
 *
 * Usage:
 *   node scripts/backfill-stories-from-seeds.cjs
 *   node scripts/backfill-stories-from-seeds.cjs --dry-run
 */

const fs = require("fs")
const path = require("path")
const { addOrFindStory, loadStories } = require("./lib/stories-store.cjs")

const DRY_RUN = process.argv.includes("--dry-run")
const SEEDS_DIR = path.join(__dirname, "..", "content", "Story Seeds")

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
  if (!m) return { data: {}, body: text }
  const data = {}
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([^:]+):\s*(.*)$/)
    if (!kv) continue
    const key = kv[1].trim()
    let val = kv[2].trim().replace(/^'(.*)'$/, "$1").replace(/^"(.*)"$/, "$1")
    if (val === "true") val = true
    else if (val === "false") val = false
    else if (/^\d+$/.test(val)) val = parseInt(val, 10)
    data[key] = val
  }
  return { data, body: m[2] || "" }
}

function extractSection(body, heading) {
  const re = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`)
  const m = body.match(re)
  return m ? m[1].trim() : ""
}

/**
 * Parse linked entities from the Evidence section.
 * Looks for [[Wikilink]] patterns and plain "Entity:" lines.
 */
function extractLinkedEntities(body, seedType) {
  const entities = []
  const evidenceSection = extractSection(body, "Evidence from the vault")

  // Seed files use bold-with-colon-inside pattern: **Profile:** [[Name]]
  // Primary subject
  const subjectMatch = evidenceSection.match(/\*\*(?:Profile|Politician|Donor):\*\*\s*\[\[([^\]]+)\]\]/)
  if (subjectMatch) {
    entities.push({ ref: `[[${subjectMatch[1]}]]`, role: "subject" })
  }

  // Counterparty: "- **Entity appearing in both donors and opposes:** Fairshake PAC"
  const counterpartyMatch = evidenceSection.match(/\*\*Entity appearing in both donors and opposes:\*\*\s*(.+)/)
  if (counterpartyMatch) {
    entities.push({ ref: counterpartyMatch[1].trim(), role: "counterparty" })
  }

  // For committee-capture: donor is the subject, members are counterparties
  if (seedType === "committee-capture") {
    const donorMatch = evidenceSection.match(/\*\*Donor:\*\*\s*(.+)/)
    if (donorMatch && entities.length === 0) {
      entities.push({ ref: donorMatch[1].trim(), role: "subject" })
    }
    const membersMatch = evidenceSection.match(/\*\*Members:\*\*\s*(.+)/)
    if (membersMatch) {
      const memberRefs = [...membersMatch[1].matchAll(/\[\[([^\]]+)\]\]/g)]
      for (const m of memberRefs.slice(0, 5)) {
        entities.push({ ref: `[[${m[1]}]]`, role: "mentioned" })
      }
    }
  }

  // For issue-contradiction: contradicting donors listed
  if (seedType === "issue-contradiction") {
    const donorsMatch = evidenceSection.match(/\*\*Contradicting donors:\*\*\s*(.+)/)
    if (donorsMatch) {
      const names = donorsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
      for (const name of names.slice(0, 3)) {
        entities.push({ ref: name, role: "counterparty" })
      }
    }
  }

  return entities
}

function backfill() {
  if (!fs.existsSync(SEEDS_DIR)) {
    console.log("No Story Seeds directory found — nothing to backfill.")
    return
  }

  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".md") && f !== "README.md")
  console.log(`Found ${files.length} seed files to process.`)

  loadStories() // warm cache

  let created = 0
  let skipped = 0
  let errors = 0

  for (const filename of files) {
    const filePath = path.join(SEEDS_DIR, filename)
    const text = fs.readFileSync(filePath, "utf-8")
    const { data, body } = parseFrontmatter(text)

    const headline = data.title || filename.replace(/\.md$/, "")
    const seedType = data["seed-type"] || "other"
    const confidence = typeof data.confidence === "number" ? data.confidence : 3
    const isHumanEdited = !data["auto-generated"]
    const state = isHumanEdited ? "draft" : "candidate"

    const summary = extractSection(body, "The angle")
    const linked_entities = extractLinkedEntities(body, seedType)

    const partial = {
      headline,
      detector: "contradiction-miner",
      detector_type: seedType,
      confidence,
      state,
      linked_entities,
      summary,
      first_detected: data["last-updated"]
        ? new Date(data["last-updated"]).toISOString()
        : new Date().toISOString(),
    }

    if (DRY_RUN) {
      console.log(`  [DRY] would create: ${headline.slice(0, 70)}`)
      created++
      continue
    }

    try {
      const rec = addOrFindStory(partial)
      if (rec.first_detected !== partial.first_detected) {
        skipped++
        // Already existed — story slug matched
      } else {
        created++
      }
    } catch (e) {
      console.error(`  ERROR on ${filename}: ${e.message}`)
      errors++
    }
  }

  console.log(`\nBackfill complete:`)
  console.log(`  Created: ${created}`)
  console.log(`  Skipped (already existed): ${skipped}`)
  console.log(`  Errors: ${errors}`)
  if (DRY_RUN) console.log(`  (dry run — no writes)`)
}

backfill()
