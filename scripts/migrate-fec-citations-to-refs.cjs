#!/usr/bin/env node
/**
 * migrate-fec-citations-to-refs.cjs — Phase 1 / Source Registry
 *
 * First real pipeline migration: converts existing FEC citation lines in
 * profile bodies into {{src:ID}} refs via the source registry.
 *
 * Why FEC and why this shape: the FEC summary pipeline (in the separate
 * donor-map-engine repo) writes citation lines like:
 *
 *   - [Source: FEC.gov](https://www.fec.gov/data/candidate/S0GA00559/) (Tier 1)
 *
 * These lines embed a raw URL into the profile body. This script walks the
 * vault, finds every matching line, registers the URL in data/sources.jsonl
 * (dedupes via sources-store.addOrFindSource), and rewrites the line to use
 * a compact {{src:ID}} reference that the Quartz SourceRefs plugin resolves
 * at build time.
 *
 * Net effect:
 *   - Each FEC citation URL is registered once in the canonical store
 *   - Profiles reference by ID, so fixing a broken FEC URL later is a
 *     single-source-of-truth operation
 *   - Future engine-repo FEC pipeline runs can adopt the same pattern:
 *     instead of writing raw URLs, call sources-store.addOrFindSource and
 *     emit {{src:ID}} refs
 *
 * Usage:
 *   node scripts/migrate-fec-citations-to-refs.cjs                # dry-run
 *   node scripts/migrate-fec-citations-to-refs.cjs --write
 *   node scripts/migrate-fec-citations-to-refs.cjs --write --verbose
 *
 * Safety:
 *   - Dry-run by default, --write required to persist
 *   - Only modifies lines that match the exact FEC citation regex
 *   - Skips lines that already use {{src:ID}} ref syntax
 *   - Reports every profile touched and every new source ID minted
 */

const fs = require("fs")
const path = require("path")
const store = require("./lib/sources-store.cjs")

// ─── CLI args ───────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const WRITE = argv.includes("--write")
const VERBOSE = argv.includes("--verbose")
const dirFlag = argv.indexOf("--dir")
const CONTENT_DIR =
  dirFlag !== -1 && argv[dirFlag + 1]
    ? path.resolve(argv[dirFlag + 1])
    : path.join(__dirname, "..", "content")

// ─── Citation line patterns ────────────────────────────────────────────

// Widened pattern: match ANY markdown link whose URL points at an FEC
// candidate or committee page, regardless of link text. All FEC URLs are
// already registered from Phase 1 extraction, so the stored title wins
// over whatever text was embedded in the original citation line.
//
// Captures: (1) the link text, (2) the URL.
const FEC_CITATION_RE =
  /\[([^\]]+)\]\((https:\/\/(?:www\.)?fec\.gov\/data\/(?:candidate|committee)\/[A-Z0-9]+\/?(?:\?[^)\s]*)?)\)/g

// Kept as an alias for clarity even though the widened RE covers both
// patterns from the v1. The second pass is a no-op on already-rewritten
// profiles because {{src:}} refs don't match the regex.
const FEC_ALT_RE = FEC_CITATION_RE

// ─── Walker ─────────────────────────────────────────────────────────────

function walkMarkdownFiles(rootDir, onFile) {
  const stack = [rootDir]
  while (stack.length) {
    const dir = stack.pop()
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch (_) {
      continue
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile() && entry.name.endsWith(".md")) onFile(full)
    }
  }
}

// ─── Entity extraction from profile ────────────────────────────────────

function getEntityRef(filePath, fileText) {
  const m = fileText.match(/^---\s*\n([\s\S]*?)\n---/)
  if (m) {
    const titleMatch = m[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)
    if (titleMatch) return titleMatch[1].trim()
  }
  return path.basename(filePath, ".md")
}

// ─── Migration logic per file ──────────────────────────────────────────

function migrateFile(filePath, stats) {
  let text
  try {
    text = fs.readFileSync(filePath, "utf-8")
  } catch (_) {
    return false
  }

  // Skip files that already contain {{src:ID}} refs AND no raw FEC citations
  // (already migrated). Fast path.
  const hasRawFec = text.includes("fec.gov/data/candidate") || text.includes("fec.gov/data/committee")
  if (!hasRawFec) return false

  const entityRef = getEntityRef(filePath, text)
  let fileChanged = false
  let fileNewRegs = 0
  let fileDedupes = 0

  const replaceCitation = (linkText, url) => {
    // Preserve query params / fragments: none expected in FEC candidate URLs.
    const cleanUrl = url.replace(/\/+$/, "/")

    const existing = store.findByUrl(cleanUrl)
    let rec
    if (existing) {
      rec = existing
      fileDedupes += 1
    } else {
      try {
        rec = store.addOrFindSource({
          url: cleanUrl,
          tier: 1,
          source_type: "government_primary",
          entity_ref: entityRef,
          title: linkText.replace(/^Source:\s*/i, "").trim() || "FEC Candidate Filing",
        })
        fileNewRegs += 1
      } catch (e) {
        if (VERBOSE) console.warn(`  ! ${filePath}: ${e.message}`)
        return null
      }
    }
    return `{{src:${rec.id}}}`
  }

  // Pass 1: "[Source: FEC.gov](url)" style
  let newText = text.replace(FEC_CITATION_RE, (match, linkText, url) => {
    const ref = replaceCitation(linkText, url)
    if (!ref) return match
    fileChanged = true
    return ref
  })

  // Pass 2: "[FEC Candidate: X](url)" style
  newText = newText.replace(FEC_ALT_RE, (match, linkText, url) => {
    const ref = replaceCitation(linkText, url)
    if (!ref) return match
    fileChanged = true
    return ref
  })

  if (fileChanged) {
    stats.filesChanged += 1
    stats.newRegistered += fileNewRegs
    stats.alreadyRegistered += fileDedupes
    if (WRITE) {
      fs.writeFileSync(filePath, newText, "utf-8")
    }
    if (VERBOSE) {
      const rel = path.relative(CONTENT_DIR, filePath)
      console.log(`  ${rel}: +${fileNewRegs} new, ${fileDedupes} deduped`)
    }
    return true
  }
  return false
}

// ─── Main ───────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ migrate-fec-citations-to-refs ═══")
  console.log(`  mode:    ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log(`  target:  ${CONTENT_DIR}`)
  console.log("")

  store.loadSources()
  const startingCount = store.countSources()

  const stats = {
    filesScanned: 0,
    filesChanged: 0,
    newRegistered: 0,
    alreadyRegistered: 0,
  }

  walkMarkdownFiles(CONTENT_DIR, (filePath) => {
    stats.filesScanned += 1
    migrateFile(filePath, stats)
  })

  const endingCount = store.countSources()

  console.log("")
  console.log("═══ results ═══")
  console.log(`  files scanned:        ${stats.filesScanned}`)
  console.log(`  files changed:        ${stats.filesChanged}`)
  console.log(`  new sources:          ${stats.newRegistered}`)
  console.log(`  deduped (already in): ${stats.alreadyRegistered}`)
  console.log(`  store size:           ${startingCount} → ${endingCount}  (Δ ${endingCount - startingCount})`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — no profile writes. Re-run with --write to persist.")
    console.log("")
  }
}

main()
