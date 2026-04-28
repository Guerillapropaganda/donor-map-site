#!/usr/bin/env node
/**
 * backfill-story-subjects.cjs — one-time fix for stories missing
 * a `linked_entities` subject entry.
 *
 * The original Story Seeds backfill (2026-04-27) handled both-sides,
 * cross-party, issue-contradiction, and committee-capture types.
 * It did NOT handle offshore-exposure or policy-capture-sponsorship,
 * so 39 of the 195 stories landed with empty linked_entities.
 *
 * Without subject entries, the integrity check can't cluster these
 * stories properly (and was wrongly grouping all empty-subject stories
 * of the same detector_type as duplicates of each other).
 *
 * This script extracts the subject from the story headline using
 * type-specific regexes, mints a `linked_entities[].subject` entry,
 * and writes back to data/stories.jsonl.
 *
 * Usage:
 *   node scripts/backfill-story-subjects.cjs            # dry-run
 *   node scripts/backfill-story-subjects.cjs --write    # apply
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const STORIES_FILE = path.join(ROOT, "data", "stories.jsonl")
const WRITE = process.argv.includes("--write")

function loadStories() {
  return fs.readFileSync(STORIES_FILE, "utf-8").split(/\r?\n/).filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function persistStories(stories) {
  const tmp = STORIES_FILE + ".tmp"
  const lines = stories.map((r) => JSON.stringify(r))
  fs.writeFileSync(tmp, lines.join("\n") + (lines.length ? "\n" : ""), "utf-8")
  fs.renameSync(tmp, STORIES_FILE)
}

function extractSubject(story) {
  const h = story.headline || ""
  if (story.detector_type === "offshore-exposure") {
    // "Adam Smith appears in ICIJ Offshore Leaks (6 records, 2 leaks)"
    const m = h.match(/^(.+?) appears in ICIJ Offshore Leaks/)
    if (m) return m[1].trim()
  }
  if (story.detector_type === "policy-capture-sponsorship") {
    // "Adam Smith sponsored 25 'Armed Forces and National Security' bills"
    const m = h.match(/^(.+?) sponsored \d+/)
    if (m) return m[1].trim()
  }
  if (story.detector_type === "cross-party") {
    // "X funds both major parties" — already extracted, but defensive
    const m = h.match(/^(.+?) funds both major parties/)
    if (m) return m[1].trim()
  }
  return null
}

function main() {
  const stories = loadStories()
  let updated = 0
  let skipped = 0
  const samples = []

  for (const story of stories) {
    if (!story.linked_entities) story.linked_entities = []
    const hasSubject = story.linked_entities.some((e) => e.role === "subject")
    if (hasSubject) continue

    const subj = extractSubject(story)
    if (!subj) {
      skipped++
      continue
    }
    // Wikilink wrap if not already wrapped
    const ref = /^\[\[.+?\]\]$/.test(subj) ? subj : `[[${subj}]]`
    story.linked_entities.unshift({ ref, role: "subject" })
    story.last_updated = new Date().toISOString()
    updated++
    if (samples.length < 8) samples.push({ headline: story.headline.slice(0, 70), subject: subj })
  }

  console.log(`Stories examined: ${stories.length}`)
  console.log(`Subject backfilled: ${updated}`)
  console.log(`Skipped (no extractable subject): ${skipped}`)
  console.log("\nSamples:")
  for (const s of samples) console.log(`  [${s.subject}]  ${s.headline}`)

  if (WRITE && updated > 0) {
    persistStories(stories)
    console.log(`\n✓ Wrote data/stories.jsonl`)
  } else if (!WRITE) {
    console.log(`\n  (dry-run — re-run with --write)`)
  }
}

main()
