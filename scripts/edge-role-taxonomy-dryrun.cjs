/**
 * edge-role-taxonomy-dryrun.cjs — classify every edge in the store,
 * report distribution, spot unknowns. Go/no-go gate before any UI
 * surface starts consuming the classifier.
 *
 * Run: node scripts/edge-role-taxonomy-dryrun.cjs
 *
 * Exit: 0 if every edge classifies cleanly, 1 if any throw.
 */

const { loadEdges } = require("./lib/relationships-store.cjs")
const { classifyEdge } = require("./lib/edge-role-taxonomy.cjs")

const edges = loadEdges()
console.log(`Total edges: ${edges.length.toLocaleString()}`)

const byCategory = new Map()
const byBucket = new Map()
const dollarsByCategory = new Map()
const errors = []

for (let i = 0; i < edges.length; i++) {
  const e = edges[i]
  try {
    const r = classifyEdge(e)
    byCategory.set(r.category, (byCategory.get(r.category) || 0) + 1)
    byBucket.set(r.bucket, (byBucket.get(r.bucket) || 0) + 1)
    if (typeof e.amount === "number" && !Number.isNaN(e.amount)) {
      dollarsByCategory.set(r.category, (dollarsByCategory.get(r.category) || 0) + e.amount)
    }
  } catch (err) {
    errors.push({ idx: i, error: err.message, edge: {
      type: e.type, role: e.role, source: e.source,
      from: e.from, to: e.to, amount: e.amount,
    }})
    if (errors.length >= 20) break
  }
}

if (errors.length > 0) {
  console.log(`\n✗ ${errors.length} edges failed to classify`)
  for (const err of errors.slice(0, 10)) {
    console.log(`  ${err.error}`)
    console.log(`  sample: ${JSON.stringify(err.edge)}`)
  }
  process.exit(1)
}

function fmt(n) { return n.toLocaleString() }
function fmtUSD(n) {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B"
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M"
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K"
  return "$" + n.toFixed(0)
}

console.log("\n=== BY CATEGORY ===")
const sortedCat = [...byCategory.entries()].sort((a, b) => b[1] - a[1])
for (const [cat, count] of sortedCat) {
  const dollars = dollarsByCategory.get(cat) || 0
  console.log(`  ${fmt(count).padStart(10)}  ${cat.padEnd(24)} ${fmtUSD(dollars).padStart(10)}`)
}

console.log("\n=== BY UI BUCKET ===")
const sortedBucket = [...byBucket.entries()].sort((a, b) => b[1] - a[1])
for (const [bucket, count] of sortedBucket) {
  console.log(`  ${fmt(count).padStart(10)}  ${bucket}`)
}

console.log(`\n✓ all ${edges.length.toLocaleString()} edges classified cleanly`)
