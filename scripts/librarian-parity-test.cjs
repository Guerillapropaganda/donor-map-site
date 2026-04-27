#!/usr/bin/env node
/**
 * librarian-parity-test.cjs — keep TS librarian + CJS twin in lockstep.
 *
 * The TS librarian (lib/donor-map/resolver.ts) is the source of truth
 * for how raw names get resolved to canonical entities. The CJS twin
 * (scripts/lib/canonical-name-resolver.cjs) implements the same
 * derivation rules so CJS scripts (query engine, cache rebuilders,
 * audit scripts) can get the librarian's alias-unification benefit
 * without spawning tsx.
 *
 * Both files cite a "MUST stay in lockstep" contract in their docs.
 * NOTHING enforced this until now. If someone changes one file's
 * name-form rules and not the other, queries silently diverge and
 * we get reproducible-but-wrong answers in production.
 *
 * What this test does:
 *   1. Pick a representative sample of 30 names spanning every
 *      resolution path (legislator forms, FEC committee aliases,
 *      entity primary names, ambiguous aliases, unresolvable).
 *   2. Resolve each via both the TS librarian and the CJS twin.
 *   3. Assert: same canonical name back, OR both unresolvable.
 *      Diverging answers fail the test.
 *
 * Failure modes this catches:
 *   - One side adds a new name form (e.g., "first+nickname") and the
 *     other doesn't.
 *   - One side changes ambiguity-resolution priority (path-having
 *     wins) and the other doesn't.
 *   - One side adds case-insensitive matching and the other doesn't.
 *
 * Run via:
 *   node scripts/librarian-parity-test.cjs
 *
 * Wired into pre-commit (see .husky/pre-commit).
 *
 * Cost: ~3s per run (one Graph.load via tsx subprocess + 30 lookups).
 */

const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const ROOT = path.resolve(__dirname, "..")
const SAMPLE_NAMES = [
  // Legislator name forms — registry-driven aliases
  "Nancy Pelosi",
  "Bernie Sanders",
  "Mitch McConnell",
  "Donald Trump",
  "Alexandria Ocasio-Cortez",
  "JD Vance",
  "Bill Hagerty",
  "RICHARD BLUMENTHAL", // case variant
  "Hon. Marjorie Taylor Greene",
  "Tommy Tuberville",
  // FEC committee aliases — should fold onto candidate
  "KAMALA HARRIS FOR SENATE",
  "NANCY PELOSI FOR CONGRESS",
  "BERNARD SANDERS",
  "ANDY BARR FOR SENATE, INC.",
  "MOORE FOR WEST VIRGINIA, INC.",
  // Real donor entities
  "AIPAC",
  "Goldman Sachs",
  "Koch Network - Charles Koch",
  "Apollo Global Management",
  "Lockheed Martin",
  // Ambiguous / edge cases
  "Robert Menendez", // both Sr (M000639) and Jr (M001226) — ambiguous
  "Jim Himes",
  "Edward J. Markey",
  // Genuinely unresolvable
  "this name does not exist anywhere in the canonical store xyzzy",
  "another fake name 12345",
  // Case + whitespace variants
  "  Nancy Pelosi  ",
  "NANCY PELOSI",
  "kamala harris",
  // Empty / null
  "",
  "   ",
]

console.log("librarian-parity-test")
console.log("─────────────────────")
console.log(`Sampling ${SAMPLE_NAMES.length} names against both resolvers.`)
console.log("")

// ─── Resolve via TS librarian (Graph.resolver.tryResolve) ──────────────
const tsScript = `
  import { Graph } from "./lib/donor-map/index"
  const g = Graph.load()
  const NAMES = ${JSON.stringify(SAMPLE_NAMES)}
  const out = []
  for (const raw of NAMES) {
    const node = g.resolver.tryResolve({ kind: "name", value: raw })
    out.push({ raw, canonical: node ? node.name : null })
  }
  process.stdout.write(JSON.stringify(out))
`
const tmp = path.join(ROOT, ".tmp-librarian-parity.ts")
fs.writeFileSync(tmp, tsScript)
let tsResults
try {
  const res = spawnSync("npx", ["tsx", tmp], {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
    shell: true,
  })
  if (res.status !== 0) {
    console.error("TS librarian load failed:")
    console.error(res.stderr)
    process.exit(1)
  }
  tsResults = JSON.parse(res.stdout)
} finally {
  fs.unlinkSync(tmp)
}

// ─── Resolve via CJS twin ──────────────────────────────────────────────
const { createCanonicalNameResolver } = require("./lib/canonical-name-resolver.cjs")
const cjs = createCanonicalNameResolver()
const cjsResults = SAMPLE_NAMES.map((raw) => {
  const canonical = cjs.resolveOrNull(raw)
  return { raw, canonical }
})

// ─── Documented expected divergences ───────────────────────────────
// Entries here are cases where TS + CJS disagree by design and the
// disagreement is acceptable. Adding to this set requires a comment
// explaining WHY the divergence is intentional.
const EXPECTED_DIVERGENCE = new Map([
  // Both Sr (bioguide M000639, name_nickname "Bob") and Jr (M001226)
  // resolve to "Robert Menendez". TS picks the first-registered (Jr,
  // by iteration order). CJS treats as ambiguous and returns null —
  // architecturally more correct since the name IS genuinely ambiguous.
  // Living with the divergence: callers needing the full disambiguation
  // should pass kind:"bioguide" instead of kind:"name".
  ["Robert Menendez", { ts: "Robert Menendez", cjs: null, reason: "Sr/Jr ambiguity — TS picks first-registered, CJS returns null" }],
])

// ─── Compare ─────────────────────────────────────────────────────────
let agree = 0
let disagree = 0
let expected = 0
const mismatches = []
for (let i = 0; i < SAMPLE_NAMES.length; i++) {
  const raw = SAMPLE_NAMES[i]
  const ts = tsResults[i].canonical
  const cj = cjsResults[i].canonical
  if (ts === cj) {
    agree += 1
    continue
  }
  const expectedEntry = EXPECTED_DIVERGENCE.get(raw)
  if (expectedEntry && expectedEntry.ts === ts && expectedEntry.cjs === cj) {
    expected += 1
    continue
  }
  disagree += 1
  mismatches.push({ raw, ts, cjs: cj })
}

console.log(`agree:               ${agree} / ${SAMPLE_NAMES.length}`)
console.log(`expected divergence: ${expected} / ${SAMPLE_NAMES.length}`)
console.log(`unexpected disagree: ${disagree} / ${SAMPLE_NAMES.length}`)
console.log("")

if (disagree === 0) {
  console.log("✓ TS librarian and CJS twin agree on all sample names (or diverge in documented ways).")
  process.exit(0)
}

console.log("MISMATCHES:")
for (const m of mismatches) {
  console.log(`  raw="${m.raw}"`)
  console.log(`    TS  → ${JSON.stringify(m.ts)}`)
  console.log(`    CJS → ${JSON.stringify(m.cjs)}`)
}
console.log("")
console.log("These resolvers are required to stay in lockstep (per the docstring")
console.log("contract in lib/donor-map/resolver.ts and scripts/lib/canonical-name-")
console.log("resolver.cjs). Update both files together.")
process.exit(1)
