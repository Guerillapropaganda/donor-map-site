#!/usr/bin/env node
// relationship-cache-drift-audit.cjs — verify frontmatter caches match canonical
//
// Purpose: CLAUDE.md Rule 10 says `data/relationships.jsonl` is the
// canonical source for relationship data. Frontmatter fields like
// `related`, `donors`, `top-donors`, `politicians-funded`, `opposes`,
// `stories` (and their `-generated` twins) are READ-CACHES rebuilt
// from the canonical store.
//
// Over time these can drift:
//   1. Canonical store updated but cache rebuilder not run (cache
//      stale — profile shows outdated edges)
//   2. Hand-edits to frontmatter (blocked by canonical-store-sentinel
//      at commit time, but old hand-edits may already be in the
//      vault)
//   3. Entity renames in relationships.jsonl not reflected in cache
//
// This audit samples profiles, extracts their frontmatter relationship
// fields, cross-checks against the canonical store, and reports drift.
//
// Output: content/Admin Notes/relationship-cache-drift-audit.md

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const CONTENT_DIR = path.join(ROOT, "content")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "relationship-cache-drift-audit.md")

const WRITE = process.argv.includes("--write")
const VERBOSE = process.argv.includes("--verbose")

// ─── Load canonical edges ─────────────────────────────────────────────

// Uses the relationships-store library which reads canonical + derived/.
// Previously read only data/relationships.jsonl, so "drift" in the ~162k
// monetary edges (donors / politicians-funded / top-donors frontmatter
// caches) was silently undetectable — the audit reported "no drift" while
// hundreds of profiles had stale FEC-derived caches.
const { loadEdges: loadAllEdges } = require('./lib/relationships-store.cjs')

function loadEdges() {
  return loadAllEdges()
}

// Build from-index for fast lookup
function buildFromIndex(edges) {
  const byFrom = new Map()
  for (const e of edges) {
    if (e.status && e.status !== "active") continue
    const key = (e.from || "").toLowerCase()
    if (!byFrom.has(key)) byFrom.set(key, [])
    byFrom.get(key).push(e)
  }
  return byFrom
}

// Also index by "to" for reverse lookup
function buildToIndex(edges) {
  const byTo = new Map()
  for (const e of edges) {
    if (e.status && e.status !== "active") continue
    const key = (e.to || "").toLowerCase()
    if (!byTo.has(key)) byTo.set(key, [])
    byTo.get(key).push(e)
  }
  return byTo
}

// ─── Frontmatter parsing ──────────────────────────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/)
  if (!m) return {}
  const yaml = m[1]
  const fm = {}
  const lines = yaml.split(/\r?\n/)
  let currentKey = null
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    const line = rawLine.replace(/\r$/, "")
    if (!line.trim()) continue
    const kv = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      const value = kv[2].trim()
      fm[currentKey] = value
    }
  }
  return fm
}

// Extract wikilinks from a frontmatter string like:
//   "[[Donor 1]] · [[Donor 2|Display]] · [[Donor 3]]"
function extractWikilinks(fieldValue) {
  if (!fieldValue || typeof fieldValue !== "string") return []
  const links = []
  for (const m of fieldValue.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    links.push(m[1].trim())
  }
  return links
}

// ─── Walk vault ───────────────────────────────────────────────────────

function walk(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (
        e.name.startsWith(".") ||
        e.name === "Assets" ||
        e.name === "Excalidraw" ||
        e.name === "Admin Notes" ||
        e.name === "Checklists" ||
        e.name === "Phases" ||
        e.name === "Decisions"
      )
        continue
      walk(p, out)
    } else if (e.name.endsWith(".md") && !e.name.startsWith("_README")) {
      out.push(p)
    }
  }
  return out
}

// ─── Audit logic ──────────────────────────────────────────────────────

const GUARDED_FIELDS = [
  "related",
  "donors",
  "top-donors",
  "politicians-funded",
  "politicians-opposed",
  "opposes",
  "stories",
]

function main() {
  console.log("")
  console.log("═══ relationship-cache-drift-audit ═══")
  console.log("")

  const edges = loadEdges()
  console.log(`  ${edges.length} canonical edges loaded`)

  const byFrom = buildFromIndex(edges)
  const byTo = buildToIndex(edges)
  console.log(`  ${byFrom.size} unique from-names indexed`)
  console.log(`  ${byTo.size} unique to-names indexed`)
  console.log("")

  const files = walk(CONTENT_DIR)
  console.log(`  ${files.length} profile files to audit`)
  console.log("")

  // For each profile: extract frontmatter relationship fields,
  // compare against canonical edges indexed by the profile's own
  // name (derived from filename).
  const drift = []
  let withFields = 0
  let fullyAligned = 0

  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/")
    let content
    try {
      content = fs.readFileSync(f, "utf-8")
    } catch {
      continue
    }
    const fm = parseFrontmatter(content)
    const name = fm.title || path.basename(f, ".md").replace(/^_/, "").replace(/\s+Master Profile$/i, "")
    const nameLower = name.toLowerCase()

    // Collect all wikilinks from guarded fields
    const frontmatterLinks = new Set()
    let hasAnyField = false
    for (const field of GUARDED_FIELDS) {
      if (fm[field]) {
        hasAnyField = true
        for (const link of extractWikilinks(fm[field])) {
          frontmatterLinks.add(link.toLowerCase())
        }
      }
    }
    if (!hasAnyField) continue
    withFields++

    // Canonical edges: all active edges where this profile is the `from`
    const canonicalOutgoing = byFrom.get(nameLower) || []
    const canonicalTargets = new Set()
    for (const e of canonicalOutgoing) {
      if (e.to) canonicalTargets.add(e.to.toLowerCase())
    }

    // Drift categories:
    //   in_frontmatter_not_canonical: link is in frontmatter but not
    //     in canonical edges from this profile — stale or hand-edit
    //   in_canonical_not_frontmatter: link is in canonical edges but
    //     not in frontmatter — cache needs rebuild
    const staleInFrontmatter = [...frontmatterLinks].filter((l) => !canonicalTargets.has(l))
    const missingFromCache = [...canonicalTargets].filter((l) => !frontmatterLinks.has(l))

    if (staleInFrontmatter.length === 0 && missingFromCache.length === 0) {
      fullyAligned++
      continue
    }

    drift.push({
      file: rel,
      name,
      frontmatter_count: frontmatterLinks.size,
      canonical_count: canonicalTargets.size,
      stale_in_frontmatter: staleInFrontmatter,
      missing_from_cache: missingFromCache,
    })
  }

  drift.sort(
    (a, b) =>
      b.stale_in_frontmatter.length +
      b.missing_from_cache.length -
      (a.stale_in_frontmatter.length + a.missing_from_cache.length),
  )

  console.log(`  ${withFields} profiles have any frontmatter relationship field`)
  console.log(`  ${fullyAligned} fully aligned with canonical store`)
  console.log(`  ${drift.length} drifted profiles`)
  console.log("")

  if (drift.length === 0) {
    console.log("  ✓ no drift detected")
  } else {
    const totalStale = drift.reduce((s, d) => s + d.stale_in_frontmatter.length, 0)
    const totalMissing = drift.reduce((s, d) => s + d.missing_from_cache.length, 0)
    console.log(`  ${totalStale} stale links in frontmatter (not in canonical)`)
    console.log(`  ${totalMissing} canonical links missing from cache`)
  }
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to generate the report")
    return
  }

  // ─── Write report ──────────────────────────────────────────────────
  const lines = []
  lines.push("---")
  lines.push('title: "Relationship Cache Drift Audit"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/relationship-cache-drift-audit.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Relationship Cache Drift Audit")
  lines.push("")
  lines.push(
    "CLAUDE.md Rule 10 says `data/relationships.jsonl` is canonical; frontmatter fields (`related`, `donors`, `top-donors`, `politicians-funded`, `politicians-opposed`, `opposes`, `stories`) are READ-CACHES. This audit compares each profile's frontmatter to the canonical store and reports drift.",
  )
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- **Canonical edges loaded:** ${edges.length}`)
  lines.push(`- **Profiles with guarded frontmatter fields:** ${withFields}`)
  lines.push(`- **Fully aligned (no drift):** ${fullyAligned}`)
  lines.push(`- **Drifted profiles:** ${drift.length}`)
  {
    const totalStale = drift.reduce((s, d) => s + d.stale_in_frontmatter.length, 0)
    const totalMissing = drift.reduce((s, d) => s + d.missing_from_cache.length, 0)
    lines.push(`- **In frontmatter but NOT in canonical:** ${totalStale}`)
    lines.push(`- **In canonical but NOT in frontmatter cache:** ${totalMissing}`)
  }
  lines.push("")

  // Heuristic: if "stale in frontmatter" >> "missing from cache" across
  // the whole dataset, the bigger story is canonical-store coverage gaps,
  // not cache drift. Call that out explicitly.
  const totalStale = drift.reduce((s, d) => s + d.stale_in_frontmatter.length, 0)
  const totalMissing = drift.reduce((s, d) => s + d.missing_from_cache.length, 0)
  const coverageGap = totalStale > totalMissing * 5

  if (drift.length === 0) {
    lines.push("✓ **No drift detected.** Every profile's frontmatter aligns with the canonical store.")
    lines.push("")
  } else {
    if (coverageGap) {
      lines.push("## Finding: canonical store has coverage gaps (not drift)")
      lines.push("")
      lines.push(
        `Stale-in-frontmatter (${totalStale}) is ${Math.round(totalStale / Math.max(totalMissing, 1))}× larger than missing-from-cache (${totalMissing}). This pattern means **the canonical store \`data/relationships.jsonl\` is sparser than the frontmatter caches** — not that the caches are drifting. Frontmatter was populated by years of prior pipeline runs and manual edits; the canonical store was populated more recently via migration and is still catching up.`,
      )
      lines.push("")
      lines.push("**Implications:**")
      lines.push("")
      lines.push(
        "- Queries against `data/relationships.jsonl` will **under-report** relationships for most entities.",
      )
      lines.push(
        "- The query-engine composers (`top_opposition_donors`, `cross_party_donors`, `timing_proximity`) will miss edges that exist in profiles but not in the canonical store.",
      )
      lines.push(
        "- Running `scripts/rebuild-relationship-caches.cjs` right now would REDUCE the data in frontmatter rather than reconciling it — a regression.",
      )
      lines.push("")
      lines.push("**Recommended fix path (next session):**")
      lines.push("")
      lines.push(
        "1. Run a new migration pass: `scripts/migrate-frontmatter-to-canonical.cjs` (to be built) that walks every profile, extracts wikilinks from guarded frontmatter fields, and appends missing edges to `data/relationships.jsonl` via `relationships-store.cjs`.",
      )
      lines.push(
        "2. Verify with `data/relationships.jsonl` edge count climbing from current 27,504 toward ~42,000 (27,504 + 15,023 missing - some overlap).",
      )
      lines.push(
        "3. Re-run this audit. `stale_in_frontmatter` should drop dramatically once canonical catches up.",
      )
      lines.push(
        "4. Only after step 3 shows alignment should `rebuild-relationship-caches.cjs` be run.",
      )
      lines.push("")
      lines.push("## Top drifted profiles (by gap count)")
      lines.push("")
    } else {
      lines.push("## Top drifted profiles")
      lines.push("")
      lines.push(
        "Ranked by total drift count (stale + missing). **Fix:** run `scripts/rebuild-relationship-caches.cjs` (or the equivalent rebuilder) to regenerate frontmatter from `data/relationships.jsonl`. That eliminates the drift in one pass. Manual-edit drift is usually a hint the canonical-store-sentinel pre-commit hook was bypassed at some point.",
      )
      lines.push("")
    }
    lines.push("| Profile | Stale in frontmatter | Missing from cache |")
    lines.push("|---|---:|---:|")
    for (const d of drift.slice(0, 100)) {
      lines.push(
        `| [${d.name}](/${d.file}) | ${d.stale_in_frontmatter.length} | ${d.missing_from_cache.length} |`,
      )
    }
    if (drift.length > 100) {
      lines.push(`| … +${drift.length - 100} more drifted profiles | | |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/relationship-cache-drift-audit.cjs --write`. Re-run after every cache rebuild to confirm drift closes to zero.*",
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
}

main()
