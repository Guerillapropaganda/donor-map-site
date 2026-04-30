/**
 * audit-unresolved-edges.ts
 *
 * Diagnostic: load the canonical-store graph and report edges whose
 * endpoints couldn't be resolved to any node. These edges are silently
 * dropped from queries — they exist on disk but don't participate in
 * neighbors / paths / aggregate / thesis-layer reads.
 *
 * Surfaced 2026-04-30 (cc_p3_207). Initial run found 61,538 dropped
 * edges (18% of total). Adding fec-oppexp + usaspending-bulk to
 * PERMISSIVE_EDGE_SOURCES recovered 44,716 of them via auto-stub
 * (campaign-committee → vendor and federal-agency → contractor edges
 * where one side has no vault profile by construction).
 *
 * Remaining ~17k unresolved are editorial cruft — wikilinks to
 * navigation indexes ("Donors & Power Networks Index"), retired
 * profiles, orphan stubs from pre-2026 migrations. Surfaced for
 * editorial triage in attention queue, not auto-fixable.
 *
 * Usage:
 *   npx tsx scripts/audit-unresolved-edges.ts
 */
import * as path from "node:path"
import * as fs from "node:fs"
import { Graph } from "../lib/donor-map/graph"

const t0 = Date.now()
const g = Graph.load({ data_dir: path.resolve(process.cwd(), "data") })
const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
const stats = g.stats()
const unresolved = g.unresolved_edges

console.log(`Graph loaded in ${elapsed}s`)
console.log(`  nodes: ${stats.nodes.toLocaleString()}`)
console.log(`  edges: ${stats.edges.toLocaleString()}`)
console.log(`  unresolved: ${unresolved.length.toLocaleString()} (${(unresolved.length * 100 / (unresolved.length + stats.edges)).toFixed(2)}%)`)

const byMissing: Record<string, number> = { from: 0, to: 0, both: 0 }
const bySource = new Map<string, number>()
const byMissingSource = new Map<string, number>() // "from-{source}" / "to-{source}" / "both-{source}"
const sampleByCategory = new Map<string, any[]>()

for (const u of unresolved) {
  byMissing[u.missing]++
  const src = u.edge.source ?? "unknown"
  bySource.set(src, (bySource.get(src) ?? 0) + 1)
  const key = `${u.missing}:${src}`
  byMissingSource.set(key, (byMissingSource.get(key) ?? 0) + 1)
  if (!sampleByCategory.has(key)) sampleByCategory.set(key, [])
  const arr = sampleByCategory.get(key)!
  if (arr.length < 3) {
    arr.push({ from: u.edge.from, to: u.edge.to, type: u.edge.type, source: src })
  }
}

console.log(`\n  by missing side: from=${byMissing.from}, to=${byMissing.to}, both=${byMissing.both}`)
console.log(`\n  top 10 sources by unresolved count:`)
for (const [src, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`    ${src}: ${n.toLocaleString()}`)
}

console.log(`\n  category breakdown (missing-side : source) — top 15:`)
for (const [key, n] of [...byMissingSource.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`    ${key}: ${n.toLocaleString()}`)
  const samples = sampleByCategory.get(key) ?? []
  for (const s of samples.slice(0, 2)) {
    console.log(`      "${s.from}" -[${s.type}]-> "${s.to}"`)
  }
}

// Persist a JSON for downstream
const out = {
  generated: new Date().toISOString(),
  graph: stats,
  unresolved_total: unresolved.length,
  by_missing: byMissing,
  by_source: Object.fromEntries(bySource),
  by_missing_source: Object.fromEntries(byMissingSource),
}
fs.writeFileSync("data/_unresolved-edges-summary.json", JSON.stringify(out, null, 2))
console.log("\n  wrote data/_unresolved-edges-summary.json")
