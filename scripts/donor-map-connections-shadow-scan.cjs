#!/usr/bin/env node
/**
 * donor-map-connections-shadow-scan — offline scanner for the
 * /api/connections shadow harness.
 *
 * Computes both rollups standalone (no Next.js, no dev server) and
 * prints either the librarian side alone or a full cache-vs-librarian
 * diff. Mirrors the live route's logic exactly so the diff payload is
 * the same shape ops/src/lib/donor-map-connections-shadow.ts produces
 * inside the route.
 *
 * Usage:
 *   node scripts/donor-map-connections-shadow-scan.cjs           # librarian summary only
 *   node scripts/donor-map-connections-shadow-scan.cjs --diff    # full A/B diff
 *   node scripts/donor-map-connections-shadow-scan.cjs --diff --json  # diff + top-25 JSON dump
 */
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { spawnSync } = require('child_process')
const { loadEdges } = require(path.join(__dirname, 'lib', 'relationships-store.cjs'))

const ROOT = path.join(__dirname, '..')
const PRINT_JSON = process.argv.includes('--json')
const DIFF = process.argv.includes('--diff')

const tsScript = `
  import { Graph } from "./lib/donor-map/index"
  import type { Edge, EdgeType } from "./lib/donor-map/types"

  type LegacyType = "related" | "donors" | "opposes" | "stories" | "contracts"
  function mapToLegacyType(t: EdgeType): LegacyType | null {
    switch (t) {
      case "related": return "related"
      case "monetary": return "donors"
      case "political-opposition": return "opposes"
      case "story-link": return "stories"
      case "government-contract": return "contracts"
      default: return null
    }
  }
  // NB: source/target use the librarian's CANONICAL NAME (resolved via
  // from_id/to_id), not the raw edge string. Without this, aliased
  // committee names like "ANDY BARR FOR SENATE, INC." get phantom
  // perProfile keys instead of folding onto "Andy Barr". The same
  // class of bug the librarian was built to prevent on the cache side.
  function flipForLegacy(edge: Edge, canonicalNameById: Map<string, string>): { source: string; target: string; sourceId: string; targetId: string } {
    const fromName = canonicalNameById.get(edge.from_id) ?? edge.from_raw
    const toName = canonicalNameById.get(edge.to_id) ?? edge.to_raw
    if (edge.type === "monetary") {
      return { source: toName, target: fromName, sourceId: edge.to_id, targetId: edge.from_id }
    }
    return { source: fromName, target: toName, sourceId: edge.from_id, targetId: edge.to_id }
  }

  const t0 = Date.now()
  const g = Graph.load()
  const stats = g.stats()
  process.stderr.write(\`librarian loaded: \${stats.nodes} nodes, \${stats.edges} edges (\${((Date.now()-t0)/1000).toFixed(2)}s)\\n\`)

  // Canonical-name lookup for ALL nodes — flipForLegacy needs it to
  // translate raw edge strings to the librarian's canonical name even
  // for non-profile counterparties.
  const canonicalNameById = new Map<string, string>()
  for (const n of g.resolver.allNodes()) canonicalNameById.set(n.id, n.name)

  const profileNodeIds = new Set<string>()
  const titleByNodeId = new Map<string, string>()
  const perProfile = new Map<string, number>()
  for (const n of g.resolver.allNodes()) {
    if (!n.profile_path) continue
    profileNodeIds.add(n.id)
    titleByNodeId.set(n.id, n.name)
    perProfile.set(n.name, 0)
  }

  const seenEdgeIds = new Set<string>()
  let totalConnections = 0
  let totalAmount = 0
  let skippedSourceNotProfile = 0
  let skippedNonLegacyType = 0
  const breakdown = { related: 0, donors: 0, opposes: 0, stories: 0 }
  const bucketSets = new Map<string, { related: Set<string>; donors: Set<string>; opposes: Set<string>; stories: Set<string> }>()
  function bucketsFor(title: string) {
    let b = bucketSets.get(title)
    if (!b) { b = { related: new Set(), donors: new Set(), opposes: new Set(), stories: new Set() }; bucketSets.set(title, b) }
    return b
  }

  for (const nodeId of profileNodeIds) {
    const edges = g.neighbors(nodeId, { direction: "out", status: "active" })
    for (const edge of edges) {
      if (seenEdgeIds.has(edge.id)) continue
      seenEdgeIds.add(edge.id)
      const legacy = mapToLegacyType(edge.type)
      if (!legacy || legacy === "contracts") { skippedNonLegacyType++; continue }
      const { source, target, sourceId, targetId } = flipForLegacy(edge, canonicalNameById)
      if (!profileNodeIds.has(sourceId)) { skippedSourceNotProfile++; continue }
      breakdown[legacy] += 1
      totalConnections += 1
      const srcB = bucketsFor(source)
      if (!srcB[legacy].has(target)) {
        srcB[legacy].add(target)
        perProfile.set(source, (perProfile.get(source) ?? 0) + 1)
      }
      const amt = typeof edge.amount === "number" && Number.isFinite(edge.amount) ? edge.amount : 0
      if (amt > 0 && (edge.type === "monetary" || edge.type === "government-contract")) totalAmount += amt
      if (legacy === "stories" || legacy === "opposes" || legacy === "related") {
        const targetTitle = titleByNodeId.get(targetId)
        if (targetTitle) {
          const tgtB = bucketsFor(targetTitle)
          if (!tgtB[legacy].has(source)) {
            tgtB[legacy].add(source)
            perProfile.set(targetTitle, (perProfile.get(targetTitle) ?? 0) + 1)
          }
        }
      }
    }
  }

  const sortedProfiles = [...perProfile.entries()].sort((a, b) => b[1] - a[1])
  const top20 = sortedProfiles.slice(0, 20).map(([title, count]) => ({ title, count }))
  const unconnected = sortedProfiles.filter(([, c]) => c === 0).length

  const elapsed_s = (Date.now() - t0) / 1000
  process.stderr.write(JSON.stringify({
    elapsed_s,
    nodes: stats.nodes,
    edges: stats.edges,
    librarianUnresolvedEdges: g.unresolved_edges.length,
    totalProfiles: profileNodeIds.size,
    totalConnections,
    totalAmount,
    breakdown,
    unconnected,
    skippedSourceNotProfile,
    skippedNonLegacyType,
  }) + "\\n")

  process.stdout.write(JSON.stringify({
    totals: { profiles: profileNodeIds.size, connections: totalConnections, totalAmount, unconnected },
    breakdown,
    top20,
    perProfile: Object.fromEntries(perProfile),
  }))
`

const tmp = path.join(ROOT, '.tmp-connections-shadow-scan.ts')
fs.writeFileSync(tmp, tsScript)
let stdoutJson
let summary
try {
  const res = spawnSync('npx', ['tsx', tmp], { encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024, shell: true })
  if (res.status !== 0) {
    console.error('tsx run failed:')
    console.error(res.stderr)
    process.exit(1)
  }
  const stderrLines = res.stderr.trim().split('\n')
  summary = JSON.parse(stderrLines[stderrLines.length - 1])
  for (const line of stderrLines.slice(0, -1)) console.log(line)
  stdoutJson = res.stdout
} finally {
  fs.unlinkSync(tmp)
}

console.log('')
console.log('--- librarian-side connections rollup ---')
console.log(`nodes:                        ${summary.nodes.toLocaleString()}`)
console.log(`edges:                        ${summary.edges.toLocaleString()}`)
console.log(`profile nodes (in vault):     ${summary.totalProfiles.toLocaleString()}`)
console.log(`unconnected profiles:         ${summary.unconnected.toLocaleString()}`)
console.log(`total connections:            ${summary.totalConnections.toLocaleString()}`)
console.log(`  related:                    ${summary.breakdown.related.toLocaleString()}`)
console.log(`  donors:                     ${summary.breakdown.donors.toLocaleString()}`)
console.log(`  opposes:                    ${summary.breakdown.opposes.toLocaleString()}`)
console.log(`  stories:                    ${summary.breakdown.stories.toLocaleString()}`)
console.log(`total monetary amount:        $${Math.round(summary.totalAmount).toLocaleString()}`)
console.log(`librarian unresolved edges:   ${summary.librarianUnresolvedEdges.toLocaleString()}`)
console.log(`skipped (source not profile): ${summary.skippedSourceNotProfile.toLocaleString()}`)
console.log(`skipped (non-legacy type):    ${summary.skippedNonLegacyType.toLocaleString()}`)
console.log(`elapsed:                      ${summary.elapsed_s.toFixed(2)}s`)

if (PRINT_JSON && !DIFF) {
  console.log('')
  console.log('--- top 20 profiles by connection count ---')
  console.log(stdoutJson)
}

// ─── A/B diff mode ─────────────────────────────────────────────────────
// Mirrors the legacy /api/connections route logic: walk content/ for
// profile metadata (title → folder-derived type), load all active edges,
// map Phase 3 type → legacy 4-value, flip monetary direction, bucket
// each edge into the source profile's bucket, reflect bidirectional
// types onto target. Result is the same `perProfile` count distribution
// the live route would produce.

if (!DIFF) process.exit(0)

console.log('')
console.log('--- cache-side rollup (mirrors /api/connections legacy logic) ---')

function findMdFiles(dir) {
  const out = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (['Assets', 'node_modules', '.obsidian', 'Admin Notes', 'Vault Maintenance'].includes(entry.name)) continue
        out.push(...findMdFiles(full))
      } else if (entry.name.endsWith('.md') && !entry.name.startsWith('index')) {
        out.push(full)
      }
    }
  } catch {}
  return out
}

function typeFromFolder(folder) {
  if (folder === 'Politicians') return 'politician'
  if (folder === 'Donors & Power Networks') return 'donor'
  if (folder === 'Think Tanks & Policy Groups') return 'think-tank'
  if (folder === 'Lobbying Firms & K Street') return 'lobbying-firm'
  if (folder.includes('Media')) return 'media-profile'
  return 'unknown'
}

const t0 = Date.now()
const contentDir = path.join(ROOT, 'content')
const files = findMdFiles(contentDir)
const cacheByTitle = new Map()
for (const file of files) {
  try {
    const text = fs.readFileSync(file, 'utf-8')
    const m = text.match(/^---\n([\s\S]*?)\n---/)
    let fm = {}
    if (m) {
      try { fm = yaml.load(m[1]) || {} } catch { fm = {} }
    }
    const relPath = path.relative(ROOT, file).replace(/\\/g, '/')
    const folder = relPath.replace('content/', '').split('/')[0]
    const rawTitle = (typeof fm.title === 'string' && fm.title) || path.basename(file, '.md')
    const title = rawTitle.replace(/^_/, '').replace(/\s+Master Profile\s*$/i, '').trim()
    const type = (typeof fm.type === 'string' && fm.type) || typeFromFolder(folder)
    cacheByTitle.set(title, { title, path: relPath, type })
  } catch {}
}

// Walk edges as legacy route does
const edges = loadEdges().filter((e) => e.status === 'active')
function mapToLegacy(t) {
  if (t === 'related') return 'related'
  if (t === 'monetary') return 'donors'
  if (t === 'political-opposition') return 'opposes'
  if (t === 'story-link') return 'stories'
  if (t === 'government-contract') return 'contracts'
  return null
}
function flip(edge) {
  if (edge.type === 'monetary') return { source: edge.to, target: edge.from }
  return { source: edge.from, target: edge.to }
}

// Init per-profile zero counts so unconnected profiles register as 0
const cachePerProfile = new Map()
for (const [title] of cacheByTitle) cachePerProfile.set(title, 0)

const cacheBuckets = new Map()
function getBuckets(title) {
  let b = cacheBuckets.get(title)
  if (!b) { b = { related: new Set(), donors: new Set(), opposes: new Set(), stories: new Set() }; cacheBuckets.set(title, b) }
  return b
}

const cacheBreakdown = { related: 0, donors: 0, opposes: 0, stories: 0 }
let cacheTotalConnections = 0
let cacheTotalAmount = 0

for (const edge of edges) {
  const legacy = mapToLegacy(edge.type)
  if (!legacy || legacy === 'contracts') continue
  const { source, target } = flip(edge)
  if (!cacheByTitle.has(source)) continue
  cacheBreakdown[legacy] += 1
  cacheTotalConnections += 1
  const srcB = getBuckets(source)
  if (!srcB[legacy].has(target)) {
    srcB[legacy].add(target)
    cachePerProfile.set(source, (cachePerProfile.get(source) || 0) + 1)
  }
  const amt = typeof edge.amount === 'number' && Number.isFinite(edge.amount) ? edge.amount : 0
  if (amt > 0 && (edge.type === 'monetary' || edge.type === 'government-contract')) cacheTotalAmount += amt
  if (legacy === 'stories' || legacy === 'opposes' || legacy === 'related') {
    if (cacheByTitle.has(target)) {
      const tgtB = getBuckets(target)
      if (!tgtB[legacy].has(source)) {
        tgtB[legacy].add(source)
        cachePerProfile.set(target, (cachePerProfile.get(target) || 0) + 1)
      }
    }
  }
}

const cacheElapsed = ((Date.now() - t0) / 1000).toFixed(2)
console.log(`profiles walked:              ${cacheByTitle.size.toLocaleString()}`)
console.log(`active edges loaded:          ${edges.length.toLocaleString()}`)
console.log(`total connections:            ${cacheTotalConnections.toLocaleString()}`)
console.log(`  related:                    ${cacheBreakdown.related.toLocaleString()}`)
console.log(`  donors:                     ${cacheBreakdown.donors.toLocaleString()}`)
console.log(`  opposes:                    ${cacheBreakdown.opposes.toLocaleString()}`)
console.log(`  stories:                    ${cacheBreakdown.stories.toLocaleString()}`)
console.log(`total monetary amount:        $${Math.round(cacheTotalAmount).toLocaleString()}`)
console.log(`elapsed:                      ${cacheElapsed}s`)

// ─── Diff ──────────────────────────────────────────────────────────────
const lib = JSON.parse(stdoutJson)
const libPerProfile = new Map(Object.entries(lib.perProfile))

const allTitles = new Set([...cachePerProfile.keys(), ...libPerProfile.keys()])
const dist = { same: 0, librarian_higher: 0, cache_higher: 0, only_in_cache: 0, only_in_librarian: 0 }
const allDiffs = []
for (const title of allTitles) {
  const c = cachePerProfile.get(title)
  const l = libPerProfile.get(title)
  if (c === undefined && l !== undefined) { dist.only_in_librarian++; if (l > 0) allDiffs.push({ title, cache: 0, librarian: l, delta: l, in: 'only_librarian' }); continue }
  if (l === undefined && c !== undefined) { dist.only_in_cache++; if (c > 0) allDiffs.push({ title, cache: c, librarian: 0, delta: -c, in: 'only_cache' }); continue }
  if (c === l) { dist.same++; continue }
  if ((l ?? 0) > (c ?? 0)) dist.librarian_higher++
  else dist.cache_higher++
  allDiffs.push({ title, cache: c ?? 0, librarian: l ?? 0, delta: (l ?? 0) - (c ?? 0), in: 'both' })
}
allDiffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

const breakdownDelta = {
  related: lib.breakdown.related - cacheBreakdown.related,
  donors: lib.breakdown.donors - cacheBreakdown.donors,
  opposes: lib.breakdown.opposes - cacheBreakdown.opposes,
  stories: lib.breakdown.stories - cacheBreakdown.stories,
}

console.log('')
console.log('--- diff (librarian − cache) ───────────────────────────────')
console.log(`profiles:        cache=${cacheByTitle.size.toLocaleString()}   librarian=${lib.totals.profiles.toLocaleString()}   delta=${(lib.totals.profiles - cacheByTitle.size).toLocaleString()}`)
console.log(`connections:     cache=${cacheTotalConnections.toLocaleString()}   librarian=${lib.totals.connections.toLocaleString()}   delta=${(lib.totals.connections - cacheTotalConnections).toLocaleString()}`)
console.log(`monetary $:      cache=$${Math.round(cacheTotalAmount).toLocaleString()}   librarian=$${Math.round(lib.totals.totalAmount).toLocaleString()}   delta=$${Math.round(lib.totals.totalAmount - cacheTotalAmount).toLocaleString()}`)
console.log('')
console.log('breakdown delta (librarian − cache):')
console.log(`  related:       ${breakdownDelta.related >= 0 ? '+' : ''}${breakdownDelta.related.toLocaleString()}`)
console.log(`  donors:        ${breakdownDelta.donors >= 0 ? '+' : ''}${breakdownDelta.donors.toLocaleString()}`)
console.log(`  opposes:       ${breakdownDelta.opposes >= 0 ? '+' : ''}${breakdownDelta.opposes.toLocaleString()}`)
console.log(`  stories:       ${breakdownDelta.stories >= 0 ? '+' : ''}${breakdownDelta.stories.toLocaleString()}`)
console.log('')
console.log('per-profile count agreement:')
console.log(`  same count:           ${dist.same.toLocaleString()}`)
console.log(`  librarian higher:     ${dist.librarian_higher.toLocaleString()}`)
console.log(`  cache higher:         ${dist.cache_higher.toLocaleString()}`)
console.log(`  only in cache:        ${dist.only_in_cache.toLocaleString()}`)
console.log(`  only in librarian:    ${dist.only_in_librarian.toLocaleString()}`)
console.log('')
console.log('top 25 disagreements (by abs delta):')
for (const d of allDiffs.slice(0, 25)) {
  const arrow = d.delta > 0 ? '↑' : d.delta < 0 ? '↓' : '='
  const tag = d.in === 'only_cache' ? '[cache only]' : d.in === 'only_librarian' ? '[lib only]' : ''
  console.log(`  ${arrow} ${(d.delta >= 0 ? '+' : '') + d.delta}  cache=${d.cache}  lib=${d.librarian}  ${d.title}  ${tag}`)
}

if (PRINT_JSON) {
  console.log('')
  console.log('--- full diff JSON ---')
  console.log(JSON.stringify({
    totals: {
      cache: { profiles: cacheByTitle.size, connections: cacheTotalConnections, totalAmount: cacheTotalAmount },
      librarian: lib.totals,
    },
    breakdown: { cache: cacheBreakdown, librarian: lib.breakdown, delta: breakdownDelta },
    profile_distribution: dist,
    top_count_diffs: allDiffs.slice(0, 50),
  }, null, 2))
}
