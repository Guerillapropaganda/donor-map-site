#!/usr/bin/env node
/**
 * rotate-session-state.cjs — keep Session State.md from becoming a
 * write-only logfile that nobody can parse.
 *
 * Problem: every session-save appends a new "## HANDOFF — <date>" block
 * to content/Session State.md. After ~6 weeks the file grows past
 * 500KB / 5,000 lines and Read tools start refusing it. I had to read
 * it in fragments today to do preflight.
 *
 * Solution: keep the N most recent HANDOFFs live in Session State.md,
 * archive older ones to content/Admin Notes/Session State Archive/
 * YYYY-MM.md (one file per month, deterministic), prepend a small
 * pointer to the archive at the bottom of Session State.md.
 *
 *   --keep N            — number of HANDOFF blocks to keep live (default 5)
 *   --dry-run           — show what would change, don't write
 *
 * Idempotent: running twice with the same --keep is a no-op.
 *
 * Run via the /session-save skill (or manually as a maintenance task).
 * Not on a schedule — rotation should happen at session boundaries
 * when the file is in a known-clean state.
 *
 * Per the "Recommend new chat at breakpoints" memory rule: if the
 * archive file grows past 1MB, recommend David start a fresh archive
 * file (the script auto-rotates by month, so this is rare).
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const STATE_FILE = path.join(ROOT, "content", "Session State.md")
const ARCHIVE_DIR = path.join(ROOT, "content", "Admin Notes", "Session State Archive")

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes("--dry-run")
const keepArg = argv.find((a) => a.startsWith("--keep="))
const KEEP = keepArg ? Math.max(1, parseInt(keepArg.split("=")[1], 10) || 5) : 5

if (!fs.existsSync(STATE_FILE)) {
  console.error(`Session State not found at ${path.relative(ROOT, STATE_FILE)}`)
  process.exit(1)
}

const original = fs.readFileSync(STATE_FILE, "utf-8")

// Parse: pull out everything before the first HANDOFF as "preamble";
// then split on subsequent ## HANDOFF lines.
const handoffRe = /^## HANDOFF\b.*$/gm
const matches = [...original.matchAll(handoffRe)]

if (matches.length === 0) {
  console.log("No HANDOFF sections found — nothing to rotate.")
  process.exit(0)
}

const preamble = original.slice(0, matches[0].index)

// Sections array: { headline: string, body: string, date: string | null }
const sections = []
for (let i = 0; i < matches.length; i++) {
  const start = matches[i].index
  const end = i + 1 < matches.length ? matches[i + 1].index : original.length
  const block = original.slice(start, end)
  const headline = matches[i][0]
  // Extract date if present: "## HANDOFF — 2026-04-25 afternoon (...)"
  const dateMatch = headline.match(/(\d{4}-\d{2}-\d{2})/)
  sections.push({
    headline,
    body: block,
    date: dateMatch ? dateMatch[1] : null,
  })
}

console.log(`Found ${sections.length} HANDOFF sections; keeping ${KEEP} most recent in-place.`)

if (sections.length <= KEEP) {
  console.log(`Nothing to archive (sections (${sections.length}) <= keep (${KEEP})).`)
  process.exit(0)
}

const live = sections.slice(0, KEEP)
const archivable = sections.slice(KEEP)

// Group archivable by YYYY-MM (from date prefix on headline). Sections
// without a parseable date go to "undated" bucket.
const byMonth = new Map()
for (const s of archivable) {
  const ym = s.date ? s.date.slice(0, 7) : "undated"
  if (!byMonth.has(ym)) byMonth.set(ym, [])
  byMonth.get(ym).push(s)
}

console.log(`Archiving ${archivable.length} sections across ${byMonth.size} month-bucket(s):`)
for (const [ym, list] of byMonth) {
  console.log(`  ${ym}: ${list.length} section(s)`)
}

// Build new live file
const archivePointer = `\n\n---\n\n## Older sessions\n\nArchived to \`content/Admin Notes/Session State Archive/\` by month. Run \`node scripts/rotate-session-state.cjs --keep=${KEEP}\` to re-rotate.\n\nMonths archived so far: ${[...byMonth.keys()].sort().reverse().join(", ")}\n`

const newLive = preamble + live.map((s) => s.body).join("") + archivePointer

if (DRY_RUN) {
  console.log("\n[dry-run] would write:")
  console.log(`  ${path.relative(ROOT, STATE_FILE)}: ${original.length} → ${newLive.length} bytes`)
  for (const [ym, list] of byMonth) {
    const archFile = path.join(ARCHIVE_DIR, `${ym}.md`)
    const merged = list.map((s) => s.body).join("")
    let final = merged
    if (fs.existsSync(archFile)) {
      const existing = fs.readFileSync(archFile, "utf-8")
      final = existing.replace(/\n+$/, "") + "\n\n" + merged
    } else {
      final =
        `---\ntitle: Session State Archive ${ym}\ntype: archive\n---\n\nArchived HANDOFF sections from ${ym}. Newest first.\n\n` + merged
    }
    console.log(`  ${path.relative(ROOT, archFile)}: ${final.length} bytes`)
  }
  process.exit(0)
}

// Ensure archive dir exists
if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true })

// Write archive files (append if they exist, create with frontmatter if not)
for (const [ym, list] of byMonth) {
  const archFile = path.join(ARCHIVE_DIR, `${ym}.md`)
  const merged = list.map((s) => s.body).join("")
  let final
  if (fs.existsSync(archFile)) {
    const existing = fs.readFileSync(archFile, "utf-8")
    final = existing.replace(/\n+$/, "") + "\n\n" + merged
  } else {
    final =
      `---\ntitle: Session State Archive ${ym}\ntype: archive\n---\n\nArchived HANDOFF sections from ${ym}. Newest first.\n\n` + merged
  }
  fs.writeFileSync(archFile, final, "utf-8")
  console.log(`✓ Wrote ${path.relative(ROOT, archFile)}`)
}

// Write new live file
fs.writeFileSync(STATE_FILE, newLive, "utf-8")
console.log(`✓ Wrote ${path.relative(ROOT, STATE_FILE)} (${original.length} → ${newLive.length} bytes)`)
