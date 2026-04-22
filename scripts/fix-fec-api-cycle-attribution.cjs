#!/usr/bin/env node
/**
 * fix-fec-api-cycle-attribution.cjs
 *
 * The fec-api source populates IE-support / IE-oppose edges parsed
 * from FEC candidate-page "Top outside spenders" tables. Those tables
 * report LIFETIME CUMULATIVE amounts per (committee → candidate) —
 * not per-cycle. But the original migration stamped each edge with
 * the profile's then-current election cycle (e.g. Hawley's 5 fec-api
 * edges all got cycle="2030" since that's his next Senate race).
 *
 * That mis-attribution:
 *   - puts 2030-spend-that-hasn't-happened on a politician who isn't
 *     even on the 2030 ballot yet
 *   - double-counts against fec-pas2 (transaction-level, correctly-
 *     cycled data) when cycle-scoped queries run
 *   - silently inflates IE-oppose/support totals in any per-cycle
 *     narrative (known blocker for the raise-reconciliation feature)
 *
 * Fix: set cycle=null on every fec-api edge and add a
 * metadata.cycle_attribution="lifetime-cumulative" flag so downstream
 * consumers know these are aggregates, not cycle-accurate. Preserves
 * amount/from/to/evidence intact. 565 edges in
 * data/derived/fec-api.jsonl.
 *
 * Usage:
 *   node scripts/fix-fec-api-cycle-attribution.cjs           # dry-run
 *   node scripts/fix-fec-api-cycle-attribution.cjs --write   # apply
 */

const fs = require("node:fs")
const path = require("node:path")

const ROOT = path.resolve(__dirname, "..")
const TARGET = path.join(ROOT, "data", "derived", "fec-api.jsonl")
const WRITE = process.argv.includes("--write")
const NOW = new Date().toISOString()

if (!fs.existsSync(TARGET)) {
  console.error(`ERR: ${TARGET} does not exist`)
  process.exit(1)
}

const raw = fs.readFileSync(TARGET, "utf-8")
const lines = raw.split(/\r?\n/)

let total = 0
let alreadyNull = 0
let wouldChange = 0
const sampleChanges = []
const cyclesSeenBefore = new Map()

const output = []

for (const line of lines) {
  if (!line.trim()) { output.push(line); continue }
  let e
  try { e = JSON.parse(line) } catch { output.push(line); continue }
  total++

  if (e.source !== "fec-api") { output.push(line); continue }

  const beforeCycle = e.cycle
  cyclesSeenBefore.set(beforeCycle, (cyclesSeenBefore.get(beforeCycle) || 0) + 1)

  if (beforeCycle == null) {
    alreadyNull++
    // still add the flag if missing
    if (!e.metadata || e.metadata.cycle_attribution !== "lifetime-cumulative") {
      e.metadata = { ...(e.metadata || {}), cycle_attribution: "lifetime-cumulative" }
      wouldChange++
    }
    output.push(JSON.stringify(e))
    continue
  }

  e.cycle = null
  e.metadata = { ...(e.metadata || {}), cycle_attribution: "lifetime-cumulative", original_cycle: beforeCycle }
  e.updated_at = NOW
  wouldChange++
  if (sampleChanges.length < 5) {
    sampleChanges.push({ from: e.from, to: e.to, beforeCycle, amount: e.amount })
  }
  output.push(JSON.stringify(e))
}

console.log("═══ fec-api cycle attribution fix ═══")
console.log("  mode:", WRITE ? "WRITE" : "DRY-RUN")
console.log("  target:", TARGET)
console.log("  total edges in file:", total)
console.log("  already null-cycle:", alreadyNull)
console.log("  would change:", wouldChange)
console.log()
console.log("  cycles seen before fix (top 10):")
const cycleList = [...cyclesSeenBefore.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
for (const [c, n] of cycleList) console.log("   ", String(c).padEnd(10), n)
console.log()
console.log("  sample changes:")
for (const s of sampleChanges) {
  console.log("    " + s.from + " → " + s.to + " | was cycle=" + s.beforeCycle + " → null | $" + (s.amount || 0).toLocaleString())
}

if (!WRITE) {
  console.log("\n  Re-run with --write to apply.")
  process.exit(0)
}

// Safety: write to a .tmp and rename atomically so a crash can't
// leave a half-written file.
const tmp = TARGET + ".tmp"
fs.writeFileSync(tmp, output.join("\n"), "utf-8")
fs.renameSync(tmp, TARGET)
console.log("\n  ✓ wrote " + wouldChange + " edge update(s)")
