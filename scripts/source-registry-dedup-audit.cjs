#!/usr/bin/env node
// source-registry-dedup-audit.cjs — find dedup gaps in sources.jsonl
//
// Purpose: sources.jsonl was populated by the Phase 1 extractor, which
// uses `normalizeUrl()` to dedupe on write. But the normalizer has
// limits — some URL variants slip through:
//
//   1. Different hosts for the same content (host aliases): e.g.
//      congress.gov vs www.congress.gov/billtext — normalizer strips
//      www, but this catches only exact host duplicates.
//   2. Different case in the path (FEC uses C00234120 vs c00234120)
//   3. /data/ prefixed paths on FEC (/data/candidate/H0FL03175 vs
//      /candidate/H0FL03175)
//   4. Trailing noise: `#section` anchors, `?cycle=2024` cycle filters
//   5. Sub-resource URLs for the same entity (e.g. /committee/CXX/
//      vs /committee/CXX/receipts)
//   6. Archive.org URLs pointing to the same original URL
//
// This audit groups sources by LOOSER normalization and reports
// groups with >1 source as probable duplicates.
//
// Output: content/Admin Notes/source-registry-dedup-audit.md

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "source-registry-dedup-audit.md")

const WRITE = process.argv.includes("--write")

// ─── Load sources ──────────────────────────────────────────────────────

function loadSources() {
  const sources = []
  const lines = fs
    .readFileSync(path.join(DATA_DIR, "sources.jsonl"), "utf-8")
    .split(/\r?\n/)
    .filter(Boolean)
  for (const line of lines) {
    try {
      sources.push(JSON.parse(line))
    } catch {}
  }
  return sources
}

// ─── Looser normalization for dedup detection ────────────────────────
//
// Strategies:
//   - loose:   lowercase + strip trailing slash + drop fragment +
//              strip archive.org prefix + lowercase path
//   - entity:  for FEC committee/candidate URLs, extract the ID and
//              use that as the dedup key (all pages for the same ID
//              collapse together)

// Hosts that use hash-based SPA routing where #/record/XXX is the
// actual entity identifier, not a fragment. Do NOT strip the hash on
// these hosts.
const HASH_ROUTING_HOSTS = new Set(["search.gleif.org", "gleif.org"])

function looseNormalize(url) {
  if (!url) return ""
  try {
    const u = new URL(url)
    const hostLower = u.hostname.toLowerCase().replace(/^www\./, "")
    // Only strip the hash if the host doesn't use SPA hash routing
    if (!HASH_ROUTING_HOSTS.has(hostLower)) {
      u.hash = ""
    }
    u.hostname = hostLower
    u.pathname = u.pathname.toLowerCase().replace(/\/+$/, "")
    // Strip archive.org prefix if present
    if (u.hostname === "web.archive.org") {
      const m = u.pathname.match(/\/web\/\d+\/(https?:\/\/.+)$/)
      if (m) {
        try {
          return looseNormalize(m[1])
        } catch {}
      }
    }
    return `${u.protocol}//${u.hostname}${u.pathname}${u.search}${u.hash}`
  } catch {
    return url.toLowerCase().replace(/\/+$/, "")
  }
}

function entityKey(url) {
  try {
    const u = new URL(url)
    // FEC committee pages
    let m = u.pathname.match(/\/committee\/([Cc]\d+)/)
    if (m) return `fec-committee:${m[1].toUpperCase()}`
    // FEC candidate pages
    m = u.pathname.match(/\/candidate\/([HSPhsp]\d[A-Za-z0-9]+)/)
    if (m) return `fec-candidate:${m[1].toUpperCase()}`
    // Congress.gov bill pages
    m = u.pathname.match(/\/bill\/(\d+(?:st|nd|rd|th)?-congress\/[^/]+-bill\/\d+)/i)
    if (m) return `congress-bill:${m[1].toLowerCase()}`
    // Congress.gov member pages
    m = u.pathname.match(/\/member\/([^/]+)/i)
    if (m) return `congress-member:${m[1].toLowerCase()}`
    return null
  } catch {
    return null
  }
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ source-registry-dedup-audit ═══")
  console.log("")

  const sources = loadSources()
  console.log(`  ${sources.length} sources loaded`)

  // Group by loose normalization
  const byLoose = new Map()
  for (const s of sources) {
    const key = looseNormalize(s.url || "")
    if (!key) continue
    if (!byLoose.has(key)) byLoose.set(key, [])
    byLoose.get(key).push(s)
  }
  const looseDupes = [...byLoose.values()].filter((g) => g.length > 1)

  // Group by entity key (same entity, different URL shapes)
  const byEntity = new Map()
  for (const s of sources) {
    const key = entityKey(s.url || "")
    if (!key) continue
    if (!byEntity.has(key)) byEntity.set(key, [])
    byEntity.get(key).push(s)
  }
  const entityDupes = [...byEntity.entries()].filter(([, g]) => g.length > 1)
  entityDupes.sort((a, b) => b[1].length - a[1].length)

  // Same normalized URL, multiple IDs (this shouldn't happen — it's a
  // normalizer bug if it does)
  const normalizerBugs = looseDupes.filter((g) => {
    const urls = new Set(g.map((s) => s.url))
    return urls.size === 1 && g.length > 1
  })

  console.log(`  ${looseDupes.length} loose-duplicate groups (post-host/case/fragment normalization)`)
  console.log(`    ${normalizerBugs.length} normalizer bugs (exact duplicate URL, multiple IDs)`)
  console.log(`  ${entityDupes.length} entity-duplicate groups (same FEC/Congress entity, multiple URL shapes)`)

  const totalLooseDupes = looseDupes.reduce((s, g) => s + g.length - 1, 0)
  const totalEntityDupes = entityDupes.reduce((s, [, g]) => s + g.length - 1, 0)
  console.log(`  ${totalLooseDupes} redundant records would collapse under loose normalization`)
  console.log(`  ${totalEntityDupes} redundant records would collapse under entity keying`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to generate the report")
    return
  }

  // ─── Write report ────────────────────────────────────────────────
  const lines = []
  lines.push("---")
  lines.push('title: "Source Registry Dedup Audit"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/source-registry-dedup-audit.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Source Registry Dedup Audit")
  lines.push("")
  lines.push(
    "The source registry's `normalizeUrl()` in `scripts/lib/sources-schema.cjs` dedupes on write using: lowercase host, strip `www.`, force `https://`, strip tracking params (utm/fbclid/etc.), strip trailing slash. This catches ~90% of duplicates but misses several categories that need a second pass.",
  )
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- **Total sources:** ${sources.length}`)
  lines.push(`- **Loose-duplicate groups:** ${looseDupes.length} (${totalLooseDupes} redundant records)`)
  lines.push(`- **Entity-duplicate groups:** ${entityDupes.length} (${totalEntityDupes} redundant records)`)
  lines.push(`- **Normalizer bugs:** ${normalizerBugs.length} (exact same URL, different source IDs — these are outright dedup failures on the write path)`)
  lines.push("")

  // ─── Normalizer bugs section ──────────────────────────────────────
  if (normalizerBugs.length) {
    lines.push(`## 🔴 Normalizer bugs (${normalizerBugs.length})`)
    lines.push("")
    lines.push(
      "These are outright `addOrFindSource()` failures — the same URL was registered twice, producing two source IDs. This indicates a race condition in the extractor pipeline OR a fall-through case in `normalizeUrl()`. **Fix:** pick a canonical ID (lower number wins), update all references in profile markdown + relationship edges, delete the duplicates.",
    )
    lines.push("")
    lines.push("| URL | Source IDs |")
    lines.push("|---|---|")
    for (const g of normalizerBugs.slice(0, 50)) {
      lines.push(`| ${g[0].url.slice(0, 100)} | ${g.map((s) => s.id).join(", ")} |`)
    }
    if (normalizerBugs.length > 50) {
      lines.push(`| … +${normalizerBugs.length - 50} more | |`)
    }
    lines.push("")
  }

  // ─── Entity-key dupes ───────────────────────────────────────────
  if (entityDupes.length) {
    lines.push(`## Entity-duplicate groups (${entityDupes.length})`)
    lines.push("")
    lines.push(
      "Same FEC committee / FEC candidate / Congress.gov bill / Congress.gov member, registered multiple times with different URL shapes (e.g. `/data/committee/C00123` vs `/committee/C00123` vs `/committee/C00123/receipts`). Consolidating these is a larger effort — pick one canonical URL per entity and migrate all citations.",
    )
    lines.push("")
    lines.push("| Entity key | Count | URL variants |")
    lines.push("|---|---:|---|")
    for (const [key, g] of entityDupes.slice(0, 100)) {
      const urls = g.map((s) => s.url.slice(0, 80)).slice(0, 3).join(" · ")
      lines.push(`| \`${key}\` | ${g.length} | ${urls}${g.length > 3 ? " …" : ""} |`)
    }
    if (entityDupes.length > 100) {
      lines.push(`| … +${entityDupes.length - 100} more | | |`)
    }
    lines.push("")
  }

  // ─── Loose dupes (subset — top 30) ──────────────────────────────
  if (looseDupes.length) {
    const topLoose = looseDupes.slice(0, 30)
    lines.push(`## Loose-duplicate groups (top 30 of ${looseDupes.length})`)
    lines.push("")
    lines.push(
      "These groups share the same loosely-normalized URL (host lowercased, trailing slash stripped, fragment removed, archive.org prefix unwrapped). Candidates for a future extension to `normalizeUrl()`.",
    )
    lines.push("")
    lines.push("| Loose key | Count | Sample URLs |")
    lines.push("|---|---:|---|")
    for (const g of topLoose) {
      const sample = g
        .slice(0, 2)
        .map((s) => s.url.slice(0, 80))
        .join(" · ")
      const loose = looseNormalize(g[0].url || "").slice(0, 80)
      lines.push(`| \`${loose}\` | ${g.length} | ${sample} |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/source-registry-dedup-audit.cjs --write`. Re-run after each dedup pass.*",
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
}

main()
