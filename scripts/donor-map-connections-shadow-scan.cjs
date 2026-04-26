#!/usr/bin/env node
/**
 * donor-map-connections-shadow-scan — offline scanner for the
 * /api/connections shadow harness.
 *
 * Runs the librarian-backed rollup that ops/src/lib/donor-map-connections-shadow.ts
 * computes inside the route, but standalone — no Next.js, no dev server.
 * Useful as a smoke check that the shadow code path loads cleanly, and
 * for capturing a baseline rollup we can compare against future changes.
 *
 * Usage:
 *   node scripts/donor-map-connections-shadow-scan.cjs            # summary only
 *   node scripts/donor-map-connections-shadow-scan.cjs --json     # full rollup as JSON
 *
 * This is a stepping stone toward a full A/B diff scanner; for now it
 * just dumps the librarian side. The cache side comes from /api/connections
 * (or the `data/relationships.jsonl` direct read in the existing route),
 * and we'll add the comparator once we've eyeballed the librarian numbers.
 */
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const PRINT_JSON = process.argv.includes('--json')

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
  function flipForLegacy(edge: Edge): { source: string; target: string; sourceId: string; targetId: string } {
    if (edge.type === "monetary") {
      return { source: edge.to_raw, target: edge.from_raw, sourceId: edge.to_id, targetId: edge.from_id }
    }
    return { source: edge.from_raw, target: edge.to_raw, sourceId: edge.from_id, targetId: edge.to_id }
  }

  const t0 = Date.now()
  const g = Graph.load()
  const stats = g.stats()
  process.stderr.write(\`librarian loaded: \${stats.nodes} nodes, \${stats.edges} edges (\${((Date.now()-t0)/1000).toFixed(2)}s)\\n\`)

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
      const { source, target, sourceId, targetId } = flipForLegacy(edge)
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

if (PRINT_JSON) {
  console.log('')
  console.log('--- top 20 profiles by connection count ---')
  console.log(stdoutJson)
}
