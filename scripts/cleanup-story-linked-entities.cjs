#!/usr/bin/env node
/**
 * cleanup-story-linked-entities.cjs — strip "Master Profile" suffix and
 * leading underscore from `linked_entities[].ref` in data/stories.jsonl.
 *
 * Same problem the 2026-04-28 frontmatter cleanup solved, except this
 * one targets the stories store. The original Story Seeds backfill
 * extracted entity refs from the seed markdown files; many of those
 * had "Master Profile" suffix in their wikilinks (legacy data
 * hygiene issue), and that suffix carried into stories.jsonl.
 *
 * Result: integrity check flags these stories with "broken-ref" because
 * `[[Bill Cassidy Master Profile]]` doesn't resolve to a profile (the
 * actual profile is at `[[Bill Cassidy]]`).
 *
 * Usage:
 *   node scripts/cleanup-story-linked-entities.cjs            # dry-run
 *   node scripts/cleanup-story-linked-entities.cjs --write    # apply
 *
 * Idempotent: re-running with no dirty refs left = no-op.
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

/**
 * Clean a single ref. Returns the cleaned ref (string) — same value if
 * nothing to clean, with suffix/underscore stripped if present.
 */
function cleanRef(ref) {
  if (typeof ref !== "string") return ref
  const orig = ref
  // Wikilink-wrapped or plain — handle both
  const wikiMatch = ref.match(/^\[\[(.+?)\]\]$/)
  let inner = wikiMatch ? wikiMatch[1] : ref
  let changed = false

  if (inner.startsWith("_")) {
    inner = inner.slice(1).trim()
    changed = true
  }
  const suffixMatch = inner.match(/^(.+?)\s+Master Profile$/i)
  if (suffixMatch) {
    inner = suffixMatch[1].trim()
    changed = true
  }
  if (!changed) return orig
  return wikiMatch ? `[[${inner}]]` : inner
}

function main() {
  const stories = loadStories()
  let storiesTouched = 0
  let refsRewritten = 0
  const samples = []
  const now = new Date().toISOString()

  for (const story of stories) {
    if (!Array.isArray(story.linked_entities) || story.linked_entities.length === 0) continue
    let dirty = false
    const newEntities = []
    for (const entity of story.linked_entities) {
      if (!entity || typeof entity.ref !== "string") {
        newEntities.push(entity)
        continue
      }
      const cleaned = cleanRef(entity.ref)
      if (cleaned !== entity.ref) {
        refsRewritten++
        if (samples.length < 12) samples.push({ story: story.headline.slice(0, 60), before: entity.ref, after: cleaned })
        dirty = true
        newEntities.push({ ...entity, ref: cleaned })
      } else {
        newEntities.push(entity)
      }
    }
    if (dirty) {
      story.linked_entities = newEntities
      story.last_updated = now
      storiesTouched++
    }
  }

  console.log(`Stories examined: ${stories.length}`)
  console.log(`Stories touched: ${storiesTouched}`)
  console.log(`Refs rewritten: ${refsRewritten}`)
  if (samples.length > 0) {
    console.log("\nSamples:")
    for (const s of samples) {
      console.log(`  [${s.story}]`)
      console.log(`    BEFORE: ${s.before}`)
      console.log(`    AFTER:  ${s.after}`)
    }
  }

  if (WRITE && storiesTouched > 0) {
    persistStories(stories)
    console.log("\n✓ Wrote data/stories.jsonl")
  } else if (!WRITE) {
    console.log("\n  (dry-run — re-run with --write)")
  }
}

main()
