#!/usr/bin/env node
/**
 * source-corroboration-audit.cjs — Flag single-source relationship edges
 *
 * For every edge in data/relationships.jsonl, counts how many distinct
 * source records back it. Flags:
 * - Edges with only a single source
 * - Edges where all sources come from the same domain
 *
 * Output: content/Admin Notes/source-corroboration-audit.md
 *
 * This does NOT fix anything. It surfaces candidates for manual review.
 *
 * Usage:
 *   node scripts/security/source-corroboration-audit.cjs
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "../..")
const EDGES_FILE = path.join(ROOT, "data/relationships.jsonl")
const SOURCES_FILE = path.join(ROOT, "data/sources.jsonl")
const REPORT = path.join(ROOT, "content/Admin Notes/source-corroboration-audit.md")

// ── Load data ───────────────────────────────────────────────────────

function loadJsonl(filePath) {
  if (!fs.existsSync(filePath)) return []
  return fs.readFileSync(filePath, "utf-8")
    .split("\n")
    .filter(l => l.trim())
    .map(l => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return "unknown"
  }
}

// ── Main ────────────────────────────────────────────────────────────

console.log("Loading edges and sources...")
const edges = loadJsonl(EDGES_FILE)
const sources = loadJsonl(SOURCES_FILE)

// Index sources by ID
const sourceById = new Map()
for (const s of sources) {
  if (s.id) sourceById.set(s.id, s)
}

console.log(`Edges: ${edges.length}, Sources: ${sources.length}`)

// For each edge, count backing sources
const singleSource = []
const sameDomain = []
const noSource = []

for (const edge of edges) {
  const srcIds = []
  // Check edge.source (string or array)
  if (edge.source) {
    if (Array.isArray(edge.source)) srcIds.push(...edge.source)
    else srcIds.push(edge.source)
  }
  // Check edge.sources array
  if (Array.isArray(edge.sources)) srcIds.push(...edge.sources)

  const uniqueIds = [...new Set(srcIds)]

  if (uniqueIds.length === 0) {
    noSource.push(edge)
    continue
  }

  if (uniqueIds.length === 1) {
    const src = sourceById.get(uniqueIds[0])
    singleSource.push({
      edge,
      source: src || { id: uniqueIds[0] },
      domain: src && src.url ? getDomain(src.url) : "unknown",
    })
    continue
  }

  // Multiple sources — check if they're all from the same domain
  const domains = new Set()
  for (const id of uniqueIds) {
    const src = sourceById.get(id)
    if (src && src.url) domains.add(getDomain(src.url))
    else domains.add("unknown")
  }

  if (domains.size === 1) {
    sameDomain.push({
      edge,
      sourceCount: uniqueIds.length,
      domain: [...domains][0],
    })
  }
}

// ── Report ──────────────────────────────────────────────────────────

const now = new Date().toISOString().split("T")[0]
const lines = []
lines.push(`---`)
lines.push(`title: Source Corroboration Audit`)
lines.push(`type: admin-note`)
lines.push(`note-type: data`)
lines.push(`priority: normal`)
lines.push(`status: open`)
lines.push(`last-updated: '${now}'`)
lines.push(`generated-by: scripts/security/source-corroboration-audit.cjs`)
lines.push(`---`)
lines.push(``)
lines.push(`# Source Corroboration Audit`)
lines.push(``)
lines.push(`**Scan date:** ${now}`)
lines.push(`**Total edges:** ${edges.length}`)
lines.push(``)
lines.push(`| Category | Count | % of total |`)
lines.push(`|----------|------:|----------:|`)
lines.push(`| No source at all | ${noSource.length} | ${(noSource.length / edges.length * 100).toFixed(1)}% |`)
lines.push(`| Single source only | ${singleSource.length} | ${(singleSource.length / edges.length * 100).toFixed(1)}% |`)
lines.push(`| Multiple sources, same domain | ${sameDomain.length} | ${(sameDomain.length / edges.length * 100).toFixed(1)}% |`)
lines.push(`| Well-corroborated (2+ domains) | ${edges.length - noSource.length - singleSource.length - sameDomain.length} | ${((edges.length - noSource.length - singleSource.length - sameDomain.length) / edges.length * 100).toFixed(1)}% |`)
lines.push(``)

if (noSource.length > 0) {
  lines.push(`## Edges with no source (${noSource.length})`)
  lines.push(``)
  lines.push(`These edges have no source ID. They cannot be verified and are the highest priority for source registration.`)
  lines.push(``)
  // Show top 30 by amount (monetary edges are highest priority)
  const byAmount = noSource
    .filter(e => e.type === "monetary" && typeof e.amount === "number")
    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
    .slice(0, 30)

  if (byAmount.length > 0) {
    lines.push(`### Top unsourced monetary edges by dollar volume`)
    lines.push(``)
    for (const e of byAmount) {
      lines.push(`- ${e.from} -> ${e.to} | $${(e.amount || 0).toLocaleString()} | ${e.type || "unknown"} | cycle: ${e.cycle || "?"}`)
    }
    lines.push(``)
  }
}

if (singleSource.length > 0) {
  lines.push(`## Single-source edges (${singleSource.length})`)
  lines.push(``)
  lines.push(`These edges have exactly one backing source. Single-source data is vulnerable to source corruption.`)
  lines.push(``)

  // Group by domain
  const byDomain = {}
  for (const item of singleSource) {
    if (!byDomain[item.domain]) byDomain[item.domain] = 0
    byDomain[item.domain]++
  }
  lines.push(`| Domain | Single-source edges |`)
  lines.push(`|--------|-------------------:|`)
  for (const [domain, count] of Object.entries(byDomain).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    lines.push(`| ${domain} | ${count} |`)
  }
  lines.push(``)
}

if (sameDomain.length > 0) {
  lines.push(`## Same-domain edges (${sameDomain.length})`)
  lines.push(``)
  lines.push(`These edges have multiple sources, but all from the same domain. Not truly independent corroboration.`)
  lines.push(``)
  const byDomain = {}
  for (const item of sameDomain) {
    if (!byDomain[item.domain]) byDomain[item.domain] = 0
    byDomain[item.domain]++
  }
  lines.push(`| Domain | Same-domain edges |`)
  lines.push(`|--------|----------------:|`)
  for (const [domain, count] of Object.entries(byDomain).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    lines.push(`| ${domain} | ${count} |`)
  }
  lines.push(``)
}

lines.push(`## Recommendations`)
lines.push(``)
lines.push(`1. Prioritize adding a second independent source to high-dollar monetary edges`)
lines.push(`2. FEC-sourced edges should be cross-referenced with state campaign finance databases`)
lines.push(`3. No-source edges should be registered through the source registry before any public launch`)

fs.writeFileSync(REPORT, lines.join("\n"))
console.log(`Report: ${REPORT}`)
console.log(`  No source: ${noSource.length}`)
console.log(`  Single source: ${singleSource.length}`)
console.log(`  Same domain: ${sameDomain.length}`)
console.log(`  Well-corroborated: ${edges.length - noSource.length - singleSource.length - sameDomain.length}`)
