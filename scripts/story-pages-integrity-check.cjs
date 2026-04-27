#!/usr/bin/env node
/**
 * story-pages-integrity-check.cjs
 *
 * Harness check (ADR-0021) for the auto-generated story candidates
 * in data/stories.jsonl. Pairs with contradiction-miner.cjs (and
 * future detector graduations).
 *
 * For each story (candidate, draft, or ready — published + archived
 * skip), runs four integrity checks and writes the result back to the
 * story record's integrity_status / integrity_note / integrity_checked_at
 * fields:
 *
 *   1. broken-ref     — a linked_entities[].ref that's a [[wikilink]]
 *                       points at a profile that doesn't exist.
 *   2. stale          — for both-sides type: re-read the source profile
 *                       and check the counterparty STILL appears in
 *                       both donors+opposes. If editorial removed it,
 *                       the candidate is stale and should be archived.
 *   3. duplicate      — same subject + counterparty + detector_type
 *                       pair appears in multiple records (only one of
 *                       the duplicates should remain).
 *   4. ok             — all checks pass.
 *
 * Stories that change status get integrity_checked_at stamped to the
 * current ISO timestamp. Status downgrades from ok → flagged are written;
 * status upgrades from flagged → ok also written (auto-clears stale
 * flags after editorial fix).
 *
 * Findings get a severity weight:
 *   - broken-ref: 2 (low — alias mismatch is common, fixable)
 *   - stale:      3 (medium — pattern no longer holds; archive candidate)
 *   - duplicate:  4 (high — exact duplicate, one should go)
 *
 * Usage:
 *   node scripts/story-pages-integrity-check.cjs           # human-readable report
 *   node scripts/story-pages-integrity-check.cjs --json    # for harness
 *   node scripts/story-pages-integrity-check.cjs --write   # also persist integrity_status fields
 *
 * Without --write the check is read-only (just reports counts). The
 * dispatcher runs it with --write so the UI surfaces fresh flags.
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const STORIES_FILE = path.join(ROOT, "data", "stories.jsonl")
const CONTENT_DIR = path.join(ROOT, "content")

const JSON_OUT = process.argv.includes("--json")
const WRITE = process.argv.includes("--write")

function loadStories() {
  if (!fs.existsSync(STORIES_FILE)) return []
  return fs
    .readFileSync(STORIES_FILE, "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
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
 * Find a profile markdown file by title. Walks content/ recursively
 * and matches on filename or frontmatter title. Cached per-process.
 */
let _profileIndex = null
function buildProfileIndex() {
  if (_profileIndex) return _profileIndex
  _profileIndex = new Map()
  function walk(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
    catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue
        walk(full)
      } else if (entry.name.endsWith(".md")) {
        // Index by stem (filename without extension, no leading underscore,
        // no " Master Profile" suffix) — same approach as the rest of the vault.
        const stem = entry.name
          .replace(/\.md$/, "")
          .replace(/^_/, "")
          .replace(/ Master Profile$/, "")
        if (!_profileIndex.has(stem.toLowerCase())) {
          _profileIndex.set(stem.toLowerCase(), full)
        }
      }
    }
  }
  walk(CONTENT_DIR)
  return _profileIndex
}

function resolveProfile(ref) {
  // ref can be "[[Wikilink]]", a plain name, or "ent_xxx".
  // We only resolve wikilinks + plain names here (entity refs are
  // resolved separately if needed; for the integrity check, we just
  // care that something exists for that reference).
  if (typeof ref !== "string" || !ref.trim()) return null
  let cleaned = ref.trim()
  const wikiMatch = cleaned.match(/^\[\[(.+?)\]\]$/)
  if (wikiMatch) cleaned = wikiMatch[1]
  // Skip ent_xxx — we don't resolve those here
  if (/^ent_[a-z0-9_]+$/i.test(cleaned)) return "entity-ref-skipped"
  const idx = buildProfileIndex()
  return idx.get(cleaned.toLowerCase()) || null
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/)
  if (!m) return null
  // Lazy-load js-yaml only if we have something to parse
  let yaml
  try { yaml = require("js-yaml") } catch { return null }
  try { return yaml.load(m[1]) } catch { return null }
}

/**
 * Re-validate a both-sides finding against the current profile data.
 * Returns true if the counterparty still appears in BOTH donors+opposes.
 */
function bothSidesStillHolds(story) {
  // subject is wikilinked; counterparty is plain name (per backfill format)
  const subjectEntry = (story.linked_entities || []).find((e) => e.role === "subject")
  const counterpartyEntry = (story.linked_entities || []).find((e) => e.role === "counterparty")
  if (!subjectEntry || !counterpartyEntry) return null  // can't check

  const profilePath = resolveProfile(subjectEntry.ref)
  if (!profilePath || profilePath === "entity-ref-skipped") return null  // can't check

  let text
  try { text = fs.readFileSync(profilePath, "utf-8") } catch { return null }
  const data = parseFrontmatter(text)
  if (!data) return null

  // Normalize: lowercase + trim + collapse whitespace
  const normalize = (s) => String(s).toLowerCase().trim().replace(/\s+/g, " ")
  const target = normalize(counterpartyEntry.ref)

  const donors = new Set([
    ...extractEntityList(data.donors),
    ...extractEntityList(data["top-donors"]),
  ].map(normalize))
  const opposes = new Set(extractEntityList(data.opposes).map(normalize))

  return donors.has(target) && opposes.has(target)
}

/**
 * Pull entity names out of a frontmatter field that may be either a
 * YAML array OR a single delimited string. Vault schema inconsistency:
 *   - Some profiles: donors: ["Name A", "Name B"]
 *   - Some profiles: donors: "[[Name A]] · [[Name B]]"
 * Strips wikilink brackets.
 */
function extractEntityList(field) {
  if (!field) return []
  if (Array.isArray(field)) {
    return field
      .filter((x) => typeof x === "string")
      .map(stripWikilink)
      .filter((s) => s.trim().length > 0)
  }
  if (typeof field === "string") {
    return field
      .split(/\s+[·,;|]\s+/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map(stripWikilink)
  }
  return []
}

function stripWikilink(s) {
  const m = s.match(/^\[\[(.+?)\]\]$/)
  return m ? m[1].trim() : s.trim()
}

function dedupKey(story) {
  // Used for duplicate detection — same subject + counterparty + type = duplicate
  const subj = (story.linked_entities || []).find((e) => e.role === "subject")?.ref || ""
  const cp = (story.linked_entities || []).find((e) => e.role === "counterparty")?.ref || ""
  return `${story.detector_type}|${subj.toLowerCase()}|${cp.toLowerCase()}`
}

function checkStory(story, dedupCounts) {
  // Skip published + archived
  if (story.state === "published" || story.state === "archived") {
    return { status: "ok", note: null, skipped: true }
  }

  // Check duplicate first (cheap, deterministic)
  const key = dedupKey(story)
  if (key && dedupCounts.get(key) > 1) {
    return {
      status: "duplicate",
      note: `Same subject+counterparty+type as ${dedupCounts.get(key) - 1} other story candidate(s). Archive duplicates.`,
    }
  }

  // Check broken-ref: any wikilinked entity that doesn't resolve
  const brokenRefs = []
  for (const e of (story.linked_entities || [])) {
    if (typeof e.ref !== "string") continue
    if (!/^\[\[.+?\]\]$/.test(e.ref)) continue  // only check wikilinks
    const resolved = resolveProfile(e.ref)
    if (!resolved) brokenRefs.push(e.ref)
  }
  if (brokenRefs.length > 0) {
    return {
      status: "broken-ref",
      note: `Wikilink(s) don't resolve to a known profile: ${brokenRefs.join(", ")}. Likely an alias mismatch or the profile was renamed.`,
    }
  }

  // Check stale: only meaningful for both-sides today
  if (story.detector_type === "both-sides") {
    const holds = bothSidesStillHolds(story)
    if (holds === false) {
      return {
        status: "stale",
        note: "Counterparty no longer appears in both donors and opposes of the source profile. The pattern that triggered this candidate has been edited away.",
      }
    }
  }

  return { status: "ok", note: null }
}

function main() {
  const stories = loadStories()
  const dedupCounts = new Map()
  for (const s of stories) {
    if (s.state === "archived") continue  // archived doesn't compete for dedup
    const k = dedupKey(s)
    dedupCounts.set(k, (dedupCounts.get(k) || 0) + 1)
  }

  const now = new Date().toISOString()
  const findings = []
  const counts = { ok: 0, "broken-ref": 0, stale: 0, duplicate: 0, skipped: 0 }
  let written = 0

  for (const story of stories) {
    const result = checkStory(story, dedupCounts)
    if (result.skipped) { counts.skipped++; continue }
    counts[result.status]++

    const changed =
      story.integrity_status !== result.status ||
      (story.integrity_note || null) !== (result.note || null)

    if (changed) {
      story.integrity_status = result.status
      story.integrity_note = result.note
      story.integrity_checked_at = now
      written++
    }

    if (result.status !== "ok") {
      findings.push({
        story_id: story.id,
        slug: story.slug,
        headline: story.headline,
        status: result.status,
        note: result.note,
      })
    }
  }

  if (WRITE && written > 0) {
    persistStories(stories)
  }

  const findings_count = findings.length

  if (JSON_OUT) {
    console.log(JSON.stringify({
      findings_count,
      stories_scanned: stories.length,
      stories_checked: stories.length - counts.skipped,
      counts,
      written,
      findings: findings.slice(0, 50),
      notes: findings_count === 0
        ? `${stories.length - counts.skipped} stories all integrity-clean`
        : `${findings_count} integrity issue(s): ${counts["broken-ref"]} broken-ref, ${counts.stale} stale, ${counts.duplicate} duplicate`,
    }))
    return
  }

  console.log(`Stories integrity check — scanned ${stories.length}, checked ${stories.length - counts.skipped} (skipped ${counts.skipped} published/archived)`)
  console.log(`  ok:         ${counts.ok}`)
  console.log(`  broken-ref: ${counts["broken-ref"]}`)
  console.log(`  stale:      ${counts.stale}`)
  console.log(`  duplicate:  ${counts.duplicate}`)
  if (WRITE) console.log(`  ${written} record(s) updated in data/stories.jsonl`)
  else console.log(`  (read-only: re-run with --write to persist integrity_status flags)`)

  for (const f of findings.slice(0, 20)) {
    console.log(`\n  [${f.status}] ${f.headline}`)
    console.log(`    ${f.note}`)
  }
  if (findings.length > 20) {
    console.log(`\n  ... and ${findings.length - 20} more (use --json for the full list)`)
  }
}

main()
