#!/usr/bin/env node
/**
 * resolve-story-aliases.cjs — fuzzy-resolve broken wikilinks in stories.jsonl
 *
 * For each story whose linked_entities contains a wikilink that doesn't
 * resolve to any vault profile, try to fuzzy-match against the profile
 * index. Auto-rewrites the ref to the canonical profile name when:
 *
 *   1. Exactly one profile matches (no ambiguity), AND
 *   2. The distance is "small" — Levenshtein <= 3 OR substring containment
 *      where the broken ref starts/ends with the profile name.
 *
 * When multiple profiles could match, leaves the ref alone and logs the
 * candidates for manual editorial review.
 *
 * Usage:
 *   node scripts/resolve-story-aliases.cjs            # dry-run
 *   node scripts/resolve-story-aliases.cjs --write    # apply
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const STORIES_FILE = path.join(ROOT, "data", "stories.jsonl")
const CONTENT_DIR = path.join(ROOT, "content")
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

// Build profile-name index keyed by canonical name
function buildProfileIndex() {
  const idx = new Map()  // lowercase canonical name → canonical name
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue
        walk(full)
      } else if (e.name.endsWith(".md")) {
        const stem = e.name
          .replace(/\.md$/, "")
          .replace(/^_/, "")
          .replace(/ Master Profile$/, "")
        if (!idx.has(stem.toLowerCase())) idx.set(stem.toLowerCase(), stem)
      }
    }
  }
  walk(CONTENT_DIR)
  return idx
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[a.length][b.length]
}

/**
 * Find candidate matches for a broken ref against the profile index.
 * Returns { match, candidates } where match is a single best canonical
 * name (or null if ambiguous/none) and candidates lists possibilities
 * for logging.
 */
function findMatch(brokenRef, profileIndex) {
  const target = brokenRef.toLowerCase().trim()
  const candidates = []

  for (const [key, canonical] of profileIndex) {
    // Substring containment: profile name is contained in broken ref
    // (e.g. "GEO Group" inside "GEO Group - Private Prison Industrial Complex")
    if (target.includes(key) && key.length >= 4) {
      candidates.push({ canonical, distance: 0, kind: "substring-of" })
      continue
    }
    // Or broken ref is contained in profile name
    if (key.includes(target) && target.length >= 4) {
      candidates.push({ canonical, distance: 0, kind: "supercontains" })
      continue
    }
    // Levenshtein distance ≤ 3 for shortish names
    if (target.length <= 25 && key.length <= 25) {
      const d = levenshtein(target, key)
      if (d <= 3) candidates.push({ canonical, distance: d, kind: "edit-distance" })
    }
  }

  // Sort: smaller distance first, then shorter canonical name (prefer base over decorated)
  candidates.sort((a, b) =>
    a.distance - b.distance || a.canonical.length - b.canonical.length,
  )

  // Pick the BEST match if there's a clear winner: top candidate must be
  // strictly better than the second (different distance OR different kind).
  if (candidates.length === 0) return { match: null, candidates: [] }
  if (candidates.length === 1) return { match: candidates[0].canonical, candidates }

  const best = candidates[0]
  const second = candidates[1]
  // Require best is strictly better than second by some margin
  if (best.distance < second.distance) return { match: best.canonical, candidates }
  if (best.kind !== second.kind && best.distance === 0) return { match: best.canonical, candidates }
  // Ambiguous — don't auto-resolve
  return { match: null, candidates }
}

function main() {
  const profileIndex = buildProfileIndex()
  const stories = loadStories()
  const now = new Date().toISOString()

  let storiesTouched = 0
  let resolved = 0
  let ambiguous = 0
  let notFound = 0
  const samples = { resolved: [], ambiguous: [], notFound: [] }

  for (const story of stories) {
    if (!Array.isArray(story.linked_entities)) continue
    let dirty = false
    const newEntities = []
    for (const entity of story.linked_entities) {
      if (!entity || typeof entity.ref !== "string") {
        newEntities.push(entity)
        continue
      }
      const wikiMatch = entity.ref.match(/^\[\[(.+?)\]\]$/)
      if (!wikiMatch) {
        newEntities.push(entity)
        continue
      }
      const inner = wikiMatch[1].trim()
      // Only attempt if it doesn't already resolve
      if (profileIndex.has(inner.toLowerCase())) {
        newEntities.push(entity)
        continue
      }
      const { match, candidates } = findMatch(inner, profileIndex)
      if (match) {
        resolved++
        if (samples.resolved.length < 8) samples.resolved.push({ story: story.headline.slice(0, 60), before: inner, after: match })
        newEntities.push({ ...entity, ref: `[[${match}]]` })
        dirty = true
      } else if (candidates.length > 0) {
        ambiguous++
        if (samples.ambiguous.length < 5) samples.ambiguous.push({ story: story.headline.slice(0, 60), broken: inner, candidates: candidates.slice(0, 3).map((c) => `${c.canonical} (d=${c.distance})`) })
        newEntities.push(entity)
      } else {
        notFound++
        if (samples.notFound.length < 5) samples.notFound.push({ story: story.headline.slice(0, 60), broken: inner })
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
  console.log(`Profiles indexed: ${profileIndex.size}`)
  console.log()
  console.log(`Refs resolved (auto-rewritten): ${resolved}`)
  console.log(`Refs ambiguous (multiple candidates): ${ambiguous}`)
  console.log(`Refs not found (no candidates):       ${notFound}`)
  console.log(`Stories touched: ${storiesTouched}`)

  if (samples.resolved.length > 0) {
    console.log("\nResolved samples:")
    for (const s of samples.resolved) {
      console.log(`  [${s.story}]`)
      console.log(`    BEFORE: [[${s.before}]]`)
      console.log(`    AFTER:  [[${s.after}]]`)
    }
  }
  if (samples.ambiguous.length > 0) {
    console.log("\nAmbiguous (need editorial review):")
    for (const s of samples.ambiguous) {
      console.log(`  [${s.story}]`)
      console.log(`    broken: [[${s.broken}]]`)
      console.log(`    candidates: ${s.candidates.join(", ")}`)
    }
  }
  if (samples.notFound.length > 0) {
    console.log("\nNot found (no profile to match):")
    for (const s of samples.notFound) {
      console.log(`  [${s.story}]  broken: [[${s.broken}]]`)
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
