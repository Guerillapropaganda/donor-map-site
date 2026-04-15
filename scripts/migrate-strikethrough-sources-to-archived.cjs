#!/usr/bin/env node
// migrate-strikethrough-sources-to-archived.cjs — move strikethrough
// sources out of visible text and into ## Archived sections
//
// Purpose: publication-readiness-check.cjs flags 629 profiles with
// strikethrough sources (`~~[title](url)~~`) in visible text. Per
// Vault Rules, dead/broken sources should be preserved in a dedicated
// "## Archived" section at the bottom of the profile, not struck
// through inline. This script does the migration mechanically.
//
// Behavior:
//   1. For each .md file in content/Politicians, content/Donors, etc.
//      (editorial content only — skip Admin Notes, Checklists, Phases)
//   2. Find every strikethrough markdown link: ~~[title](url)~~
//   3. If the link is inside a "## Archived" section already, skip it
//   4. If the link is in a bullet-list context, remove the whole bullet
//      line and add the link to the Archived section
//   5. If the link is inline inside prose, remove the strikethrough
//      markers (the prose keeps its link shape) — this case is rare
//      per vault convention; flag it for manual review instead of
//      auto-migrating
//   6. Ensure a "## Archived" section exists at the bottom; append
//      the archived links there
//
// Safety:
//   * DRY-RUN by default — writes nothing, just prints a preview
//   * `--write` required to actually modify files
//   * `--verbose` shows every file touched
//   * Per-file backup not needed — git tracks the changes
//
// Usage:
//   node scripts/migrate-strikethrough-sources-to-archived.cjs            # dry run
//   node scripts/migrate-strikethrough-sources-to-archived.cjs --write
//   node scripts/migrate-strikethrough-sources-to-archived.cjs --verbose
//   node scripts/migrate-strikethrough-sources-to-archived.cjs --report   # write report only

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const REPORT_FILE = path.join(ROOT, "content", "Admin Notes", "strikethrough-migration-report.md")

const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")
const REPORT_ONLY = process.argv.includes("--report")

const SKIP_DIRS = [
  "Admin Notes",
  "Checklists",
  "Phases",
  "Decisions",
  "Assets",
  "Excalidraw",
  "Session State.md",
  "Build Phases.md",
]

// ─── File discovery ──────────────────────────────────────────────────

function walk(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (SKIP_DIRS.includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name.startsWith(".")) continue
      walk(p, out)
    } else if (e.name.endsWith(".md")) {
      out.push(p)
    }
  }
  return out
}

// ─── Migration logic ──────────────────────────────────────────────────

const STRIKETHROUGH_LINK_RE = /~~\[([^\]]+)\]\(([^)]+)\)~~/g
const BULLET_LINE_RE = /^(\s*-\s.*)$/

function migrate(content) {
  // Split into visible + archived sections
  const archivedMatch = content.match(/^(##+\s*Archived[\s\S]*)$/im)
  const archivedIdx = archivedMatch ? archivedMatch.index : -1
  const visiblePart = archivedIdx >= 0 ? content.slice(0, archivedIdx) : content
  const archivedPart = archivedIdx >= 0 ? content.slice(archivedIdx) : ""

  const removedLinks = [] // { title, url, context }
  const flaggedInline = [] // inline prose cases that need manual review

  const lines = visiblePart.split(/\r?\n/)
  const newLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!STRIKETHROUGH_LINK_RE.test(line)) {
      newLines.push(line)
      STRIKETHROUGH_LINK_RE.lastIndex = 0
      continue
    }
    STRIKETHROUGH_LINK_RE.lastIndex = 0

    // Is this a bullet-list line? If so, check whether it's a
    // dedicated "archived source" line and migrate the whole thing.
    //
    // Vault convention:
    //   - ~~[Title](url)~~ (was Tier 1 — URL broken, archived by Ops) (Tier 1)
    //
    // Heuristic: after removing the bullet marker, strikethrough link,
    // and all parenthetical metadata like "(was Tier 1 — URL broken)",
    // there should be nothing meaningful left.
    if (BULLET_LINE_RE.test(line)) {
      const matches = [...line.matchAll(STRIKETHROUGH_LINK_RE)]
      // Also require the bullet to START with ~~ (otherwise it's a
      // prose bullet with a strikethrough mixed in)
      const startsWithStrike = /^\s*-\s*~~\[/.test(line)
      const stripped = line
        .replace(STRIKETHROUGH_LINK_RE, "") // remove strikethrough links
        .replace(/\([^)]*\)/g, "") // remove parenthetical metadata
        .replace(/^[\s-,·•]+|[\s,·•]+$/g, "") // trim bullet markers + separators
        .trim()
      if (startsWithStrike && (stripped === "" || stripped.length < 15)) {
        // Pure strikethrough line — remove it entirely. Preserve the
        // whole original line (with metadata suffix) for the Archived
        // section instead of just the bare link.
        for (const m of matches) {
          removedLinks.push({ title: m[1], url: m[2], context: "bullet", fullLine: line })
        }
        continue
      } else {
        // Bullet has real content mixed with strikethrough — just
        // remove the strikethrough markers, keep the link inline.
        // This means the link becomes a regular link, which isn't
        // right either, so flag it for manual review.
        for (const m of matches) {
          flaggedInline.push({ title: m[1], url: m[2], line: line.slice(0, 120) })
        }
        newLines.push(line) // leave unchanged
        continue
      }
    }

    // Inline prose case — flag for manual review
    const matches = [...line.matchAll(STRIKETHROUGH_LINK_RE)]
    for (const m of matches) {
      flaggedInline.push({ title: m[1], url: m[2], line: line.slice(0, 120) })
    }
    newLines.push(line)
  }

  if (removedLinks.length === 0 && flaggedInline.length === 0) {
    return { changed: false, newContent: content, removed: [], flagged: [] }
  }

  let newVisible = newLines.join("\n")

  // Append archived links to the archived section (create if needed)
  if (removedLinks.length > 0) {
    const archiveLines = []
    if (archivedIdx < 0) {
      // No archived section exists — create one
      if (!newVisible.endsWith("\n")) newVisible += "\n"
      archiveLines.push("")
      archiveLines.push("## Archived")
      archiveLines.push("")
      archiveLines.push(
        "Sources below were broken, redirected, or bot-blocked as of their last fingerprint check. Preserved here for audit trail — not used as active citations.",
      )
      archiveLines.push("")
    }
    for (const r of removedLinks) {
      // Use the preserved original line (with metadata) when we have
      // it, otherwise reconstruct a minimal bullet.
      if (r.fullLine) {
        archiveLines.push(r.fullLine.trim().startsWith("-") ? r.fullLine.trim() : `- ${r.fullLine.trim()}`)
      } else {
        archiveLines.push(`- ~~[${r.title}](${r.url})~~`)
      }
    }
    if (archivedIdx >= 0) {
      // Insert the new archived links after the existing ## Archived heading + any intro prose.
      // Simplest: append to the very end of archivedPart
      const newArchived = archivedPart.replace(/\s*$/, "") + "\n" + archiveLines.join("\n") + "\n"
      return {
        changed: true,
        newContent: newVisible + newArchived,
        removed: removedLinks,
        flagged: flaggedInline,
      }
    } else {
      return {
        changed: true,
        newContent: newVisible + archiveLines.join("\n") + "\n",
        removed: removedLinks,
        flagged: flaggedInline,
      }
    }
  }

  return { changed: false, newContent: content, removed: [], flagged: flaggedInline }
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ migrate-strikethrough-sources-to-archived ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  report-only: ${REPORT_ONLY}`)
  console.log("")

  const files = walk(CONTENT_DIR)
  console.log(`  ${files.length} markdown files to scan`)
  console.log("")

  let filesChanged = 0
  let totalRemoved = 0
  let totalFlagged = 0
  const fileReports = []

  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/")
    let content
    try {
      content = fs.readFileSync(f, "utf-8")
    } catch {
      continue
    }

    // Cheap skip: no strikethrough at all
    if (!content.includes("~~")) continue

    const result = migrate(content)
    if (result.changed) filesChanged++
    totalRemoved += result.removed.length
    totalFlagged += result.flagged.length

    if (result.changed || result.flagged.length) {
      fileReports.push({
        file: rel,
        removed: result.removed.length,
        flagged: result.flagged.length,
        changed: result.changed,
      })
    }

    if (VERBOSE && result.changed) {
      console.log(
        `    ${rel} — ${result.removed.length} moved to Archived, ${result.flagged.length} flagged`,
      )
    }

    if (WRITE && result.changed) {
      fs.writeFileSync(f, result.newContent, "utf-8")
    }
  }

  console.log(`  ${filesChanged} files would be changed`)
  console.log(`  ${totalRemoved} strikethrough links would be moved to Archived sections`)
  console.log(`  ${totalFlagged} inline-prose strikethrough links flagged for manual review`)
  console.log("")

  // Write a report for David's triage
  if (WRITE || REPORT_ONLY) {
    const lines = []
    lines.push("---")
    lines.push('title: "Strikethrough Source Migration Report"')
    lines.push("type: admin-note")
    lines.push("note-type: data")
    lines.push("status: open")
    lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
    lines.push("generator: scripts/migrate-strikethrough-sources-to-archived.cjs")
    lines.push("---")
    lines.push("")
    lines.push("# Strikethrough Source Migration Report")
    lines.push("")
    lines.push(
      `Automatic migration of strikethrough sources (\`~~[title](url)~~\`) from visible text into \`## Archived\` sections, per Vault Rules. ${WRITE ? "**Applied.**" : "**DRY RUN — no files were changed.**"}`,
    )
    lines.push("")
    lines.push(`**Files that would be / were changed:** ${filesChanged}`)
    lines.push(`**Strikethrough links auto-migrated:** ${totalRemoved} (bullet-list cases)`)
    lines.push(`**Inline-prose links flagged for manual review:** ${totalFlagged}`)
    lines.push("")
    lines.push("## Auto-migrated files")
    lines.push("")
    lines.push("These had strikethrough bullet-list entries that the script moved cleanly to the Archived section.")
    lines.push("")
    const clean = fileReports.filter((r) => r.changed && r.flagged === 0)
    lines.push(`Total: ${clean.length}`)
    if (clean.length <= 100) {
      for (const r of clean) lines.push(`- [${r.file.split("/").pop()}](/${r.file}) — ${r.removed} links`)
    } else {
      for (const r of clean.slice(0, 50)) lines.push(`- [${r.file.split("/").pop()}](/${r.file}) — ${r.removed} links`)
      lines.push(`- … +${clean.length - 50} more`)
    }
    lines.push("")

    const flaggedFiles = fileReports.filter((r) => r.flagged > 0)
    if (flaggedFiles.length) {
      lines.push("## Manual-review files (inline prose)")
      lines.push("")
      lines.push(
        "These had strikethrough links inside prose paragraphs, not clean bullet-list entries. The script left them unchanged. Research Claude should read each one and decide whether to: (a) remove the link entirely and preserve the surrounding prose, (b) move it to the Archived section and rewrite the prose without the link, or (c) restore the link without strikethrough if the source is actually live.",
      )
      lines.push("")
      for (const r of flaggedFiles) {
        lines.push(`- [${r.file.split("/").pop()}](/${r.file}) — ${r.flagged} inline ref(s)`)
      }
      lines.push("")
    }

    lines.push("---")
    lines.push("")
    lines.push(
      `*Regenerate: \`node scripts/migrate-strikethrough-sources-to-archived.cjs --report\` (dry run) or \`--write\` (apply). Re-run after each migration batch.*`,
    )
    lines.push("")

    fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true })
    fs.writeFileSync(REPORT_FILE, lines.join("\n"), "utf-8")
    console.log(`  wrote ${path.relative(ROOT, REPORT_FILE)}`)
  }
}

main()
