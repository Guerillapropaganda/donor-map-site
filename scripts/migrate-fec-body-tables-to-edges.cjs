#!/usr/bin/env node
/**
 * migrate-fec-body-tables-to-edges.cjs — extract "Top outside spenders"
 * tables from politician profile bodies and upsert them as monetary
 * edges into data/relationships.jsonl.
 *
 * Pillar 2b core migration.
 *
 * The FEC summary pipeline (fec-summary) writes per-politician blocks
 * to profile bodies between `<!-- auto:fec-politician start/end -->` or
 * `<!-- auto:fec-politician pending-merge ... -->` markers. Inside each
 * block is:
 *
 *   | Metric | Value |
 *   | Election Cycle | 2026 |
 *   ...
 *
 *   **Top outside spenders:**
 *
 *   | Committee | Support | Oppose |
 *   | NARAL | $0 | $48,944 |
 *   | SUSAN B ANTHONY LIST INC | $0 | $39,906 |
 *   ...
 *
 * These rows ARE the amount data. None of it has ever been in
 * data/relationships.jsonl — the monetary edges there (from the
 * frontmatter migration) have amount=null, cycle=null. This script
 * parses the committee tables, resolves committee names against the
 * vault title index (respecting aliases), and writes cycle-tagged
 * monetary edges via upsertEdges().
 *
 * Unmatched committees are written to
 *   content/Admin Notes/fec-unmatched-committees.md
 * so David can decide: add an alias to the parent profile, create a
 * stub, or skip.
 *
 * Safety:
 *   - Dry-run by default
 *   - Uses upsertEdges() — validates each edge, skips invalid, reports
 *   - Role distinguishes ie-support from ie-oppose; both can coexist
 *   - Orchestrates its own atomic write via relationships-store
 *
 * Usage:
 *   node scripts/migrate-fec-body-tables-to-edges.cjs          # dry-run
 *   node scripts/migrate-fec-body-tables-to-edges.cjs --write  # apply
 */

const fs = require("fs")
const path = require("path")
const crypto = require("crypto")
const { walkDir } = require("./lib/shared.cjs")
const { buildTitleIndex, computeEdgeId } = require("./lib/relationship-edge-validator.cjs")
const { upsertEdges } = require("./lib/relationships-store.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const POL_DIR = path.join(CONTENT_DIR, "Politicians")
const UNMATCHED_REPORT = path.join(
  CONTENT_DIR,
  "Admin Notes",
  "fec-unmatched-committees.md"
)

const WRITE = process.argv.includes("--write")
const NOW = new Date().toISOString()

// ─── Row parsing ──────────────────────────────────────────────────────

// Committee | $support | $oppose
const ROW_RE = /\|\s*([^|\n]+?)\s*\|\s*\$([\d,]+(?:\.\d+)?)\s*\|\s*\$([\d,]+(?:\.\d+)?)\s*\|/g

function isCandidateDonorRow(donor) {
  if (/^(donor|committee|name|total|source|receipt|amount)$/i.test(donor)) return false
  if (/^-+$/.test(donor)) return false
  if (/^\d{4}(-\d{2,4})?$/.test(donor)) return false
  if (/^~?\$/.test(donor)) return false
  if (/^cycle$/i.test(donor)) return false
  if ((donor.match(/[A-Za-z]/g) || []).length < 2) return false
  return true
}

// ─── Extraction ───────────────────────────────────────────────────────

/**
 * From a profile's full markdown, extract all fec-politician blocks
 * (both the "start/end" and "pending-merge" forms). For each block,
 * return { cycle, rows: [{donor, support, oppose}] }.
 */
function extractFecBlocks(body) {
  const blocks = []
  // Either form: `<!-- auto:fec-politician start -->` ... `<!-- auto:fec-politician end -->`
  // or          `<!-- auto:fec-politician pending-merge YYYY-MM-DD -->` ... `<!-- auto:fec-politician pending-merge end -->`
  const re =
    /<!--\s*auto:fec-politician(?:\s+(?:start|pending-merge(?:\s+[\d-]+)?))\s*-->([\s\S]*?)<!--\s*auto:fec-politician(?:\s+pending-merge)?\s+end\s*-->/g
  let m
  while ((m = re.exec(body)) !== null) {
    const inner = m[1]
    // Cycle from metric table: `| Election Cycle | 2026 |`
    const cycleMatch = inner.match(/\|\s*Election Cycle\s*\|\s*(\d{4})\s*\|/i)
    const cycle = cycleMatch ? cycleMatch[1] : null

    // Find the "Top outside spenders" table section — look for
    // committee | support | oppose style rows.
    const rows = []
    let rm
    ROW_RE.lastIndex = 0
    while ((rm = ROW_RE.exec(inner)) !== null) {
      const donor = rm[1].trim()
      if (!isCandidateDonorRow(donor)) continue
      const support = parseInt(rm[2].replace(/,/g, ""))
      const oppose = parseInt(rm[3].replace(/,/g, ""))
      if (support === 0 && oppose === 0) continue
      rows.push({ donor, support, oppose, raw: rm[0].trim() })
    }
    if (rows.length > 0) {
      blocks.push({ cycle, rows })
    }
  }
  return blocks
}

// ─── Donor → profile resolution ───────────────────────────────────────

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function stripFecSuffixes(s) {
  return s
    .replace(/,?\s*INC\.?$/i, "")
    .replace(/,?\s*LLC\.?$/i, "")
    .replace(/\s+PAC$/i, "")
    .replace(/\s+COMMITTEE$/i, "")
    .replace(/\s+ACTION$/i, "")
    .replace(/\s+FUND$/i, "")
    .trim()
}

function resolve(title, idx) {
  const tryKey = (k, method) => {
    if (idx.has(k)) {
      const entry = idx.get(k)
      const picked = Array.isArray(entry) ? entry[0] : entry
      return { method, entry: picked, matchedKey: k }
    }
    return null
  }

  let r
  if ((r = tryKey(title, "exact"))) return r
  if ((r = tryKey(titleCase(title), "titlecase"))) return r
  const stripped = stripFecSuffixes(title)
  if (stripped !== title) {
    if ((r = tryKey(stripped, "stripped"))) return r
    if ((r = tryKey(titleCase(stripped), "stripped-tc"))) return r
  }
  const paren = title.match(/^(.+?)\s+\((.+?)\)/)
  if (paren) {
    const outer = paren[1].trim()
    const inner = paren[2].trim()
    if ((r = tryKey(outer, "paren-outer"))) return r
    if ((r = tryKey(titleCase(outer), "paren-outer-tc"))) return r
    if ((r = tryKey(inner, "paren-inner"))) return r
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ migrate-fec-body-tables-to-edges ═══")
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")
  console.log("  building title index...")
  const idx = buildTitleIndex(CONTENT_DIR)
  console.log(`    ${idx.size} titles`)
  console.log("")

  const files = walkDir(POL_DIR, ".md")
  const newEdges = []
  const unmatched = new Map() // committee → { count, examples: [politician titles], totalSupport, totalOppose }
  let profilesWithBlocks = 0
  let blocksSeen = 0
  let rowsSeen = 0
  let rowsMatched = 0
  let supportEdges = 0
  let opposeEdges = 0
  const methodStats = {}

  for (const f of files) {
    const body = fs.readFileSync(f, "utf-8")
    const fmMatch = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!fmMatch) continue
    const titleMatch = fmMatch[1].match(/^title:\s*["']?(.+?)["']?\s*$/m)
    if (!titleMatch) continue
    const polTitle = titleMatch[1].replace(/^["']|["']$/g, "").trim()

    // Only process politician profiles
    if (!/^type:\s*politician\b/m.test(fmMatch[1])) continue

    const polEntry = idx.get(polTitle)
    if (!polEntry) continue
    const polPicked = Array.isArray(polEntry) ? polEntry[0] : polEntry

    const blocks = extractFecBlocks(body)
    if (blocks.length === 0) continue
    profilesWithBlocks++
    blocksSeen += blocks.length

    for (const block of blocks) {
      for (const row of block.rows) {
        rowsSeen++
        const res = resolve(row.donor, idx)
        if (!res) {
          const ex = unmatched.get(row.donor) || {
            count: 0,
            totalSupport: 0,
            totalOppose: 0,
            examples: [],
          }
          ex.count++
          ex.totalSupport += row.support
          ex.totalOppose += row.oppose
          if (ex.examples.length < 3) ex.examples.push(polTitle)
          unmatched.set(row.donor, ex)
          continue
        }
        rowsMatched++
        methodStats[res.method] = (methodStats[res.method] || 0) + 1

        const donorTitle = res.matchedKey
        const donorEntry = res.entry

        // Build support and/or oppose edges. Role is stored in `role`;
        // separate edges because the hash key doesn't include role but
        // we want to track support + oppose separately when both are
        // non-zero. In practice this is rare — one column is usually 0.
        const makeEdge = (amount, role) => {
          if (amount <= 0) return null
          const edge = {
            from: donorTitle,
            from_slug: donorEntry.slug || null,
            from_type: donorEntry.type || "entity",
            from_subcategory: donorEntry.subcategory || null,
            to: polTitle,
            to_slug: polPicked.slug || null,
            to_type: "politician",
            to_subcategory: polPicked.subcategory || null,
            type: "monetary",
            direction: "directed",
            confidence: 0.85, // FEC body data is high-confidence
            source: "fec-api",
            source_url: null,
            evidence: [
              `fec-body-table: ${row.raw}`,
              `role=${role}, cycle=${block.cycle || "unknown"}`,
            ],
            amount,
            cycle: block.cycle || null,
            date_range: null,
            role,
            first_seen: NOW,
            last_verified: NOW,
            status: "active",
          }
          edge.id = computeEdgeId(edge)
          return edge
        }

        const supEdge = makeEdge(row.support, "ie-support")
        const oppEdge = makeEdge(row.oppose, "ie-oppose")
        if (supEdge) {
          newEdges.push(supEdge)
          supportEdges++
        }
        if (oppEdge) {
          newEdges.push(oppEdge)
          opposeEdges++
        }
      }
    }
  }

  console.log("  parse results:")
  console.log(`    profiles with fec blocks: ${profilesWithBlocks}`)
  console.log(`    blocks parsed:            ${blocksSeen}`)
  console.log(`    donor rows:               ${rowsSeen}`)
  console.log(`    matched:                  ${rowsMatched}`)
  console.log(`    unmatched:                ${rowsSeen - rowsMatched}`)
  console.log("")
  console.log("  edges built:")
  console.log(`    ie-support: ${supportEdges}`)
  console.log(`    ie-oppose:  ${opposeEdges}`)
  console.log(`    total new:  ${newEdges.length}`)
  console.log("")
  console.log("  match methods:")
  for (const [k, v] of Object.entries(methodStats).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(v).padStart(4)}  ${k}`)
  }
  console.log("")

  // ─── Unmatched report ─────────────────────────────────────────────
  const sorted = [...unmatched.entries()].sort(
    (a, b) => b[1].totalSupport + b[1].totalOppose - (a[1].totalSupport + a[1].totalOppose)
  )
  const report = [
    "---",
    'title: "FEC Unmatched Committees"',
    "type: admin-note",
    "note-type: data",
    "status: active",
    `last-updated: ${NOW.slice(0, 10)}`,
    "authority: Pillar 2b migration",
    "---",
    "",
    "# FEC Unmatched Committees",
    "",
    `Committees found in \`auto:fec-politician\` body tables that could not be resolved to a vault profile via title, alias, or simple suffix strip. Total: **${unmatched.size}** unique committees / **${rowsSeen - rowsMatched}** rows.`,
    "",
    "**Fix**: add an `aliases:` entry to the parent profile's frontmatter (the `buildTitleIndex` walker reads it), or create a stub profile for the committee. Re-run `migrate-fec-body-tables-to-edges.cjs --write` to pick up the new mapping.",
    "",
    "Sorted by total dollar volume (support + oppose).",
    "",
    "| Committee | Count | Support $ | Oppose $ | Example politicians |",
    "|-----------|-------|-----------|----------|---------------------|",
  ]
  for (const [committee, data] of sorted) {
    report.push(
      `| ${committee} | ${data.count} | $${data.totalSupport.toLocaleString()} | $${data.totalOppose.toLocaleString()} | ${data.examples.slice(0, 3).join(", ")} |`
    )
  }
  report.push("")

  if (WRITE) {
    fs.writeFileSync(UNMATCHED_REPORT, report.join("\n"), "utf-8")
    console.log(`  ✓ wrote unmatched report → ${path.relative(ROOT, UNMATCHED_REPORT)}`)
    console.log("")
    console.log("  upserting edges...")
    const result = upsertEdges(newEdges)
    console.log(`    added:   ${result.added}`)
    console.log(`    updated: ${result.updated}`)
    console.log(`    skipped: ${result.skipped}`)
    console.log(`    invalid: ${result.invalid}`)
    if (result.errors && result.errors.length) {
      console.log("    sample errors:")
      for (const e of result.errors.slice(0, 5)) {
        console.log(`      ${e.id} ${e.from} → ${e.to}: ${e.error}`)
      }
    }
    console.log("")
  } else {
    console.log("  DRY RUN — re-run with --write to apply")
    console.log(`  would write unmatched report → ${path.relative(ROOT, UNMATCHED_REPORT)}`)
    console.log("")
  }
}

main()
