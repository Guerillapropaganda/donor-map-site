/**
 * ask-golden-snapshot.cjs — Snapshot Ask responses for 15 canonical
 * profiles spanning edge cases. Run before + after any Ask engine
 * change; diff the two JSON blobs to catch regressions.
 *
 * The 15 profiles are chosen to cover:
 *   - Senator with no presidential run (Chris Murphy, Josh Hawley)
 *   - Senator with presidential runs (Bernie, Warren, Cruz)
 *   - Mega-donor individual (Harlan Crow)
 *   - Mega-donor via network (Leonard Leo, Koch Network)
 *   - Super PAC with heavy IE (American Crossroads)
 *   - Corp PAC (Google)
 *   - Think-tank receiving grants (AEI)
 *   - 501(c)(4) dark money (Rule of Law Trust)
 *   - Trump (everything at max scale)
 *   - Defeated incumbent with IE-oppose (Bowman)
 *   - AOC (progressive with cross-donor sensitivities)
 *
 * Usage:
 *   node scripts/ask-golden-snapshot.cjs --out snapshots/before.json
 *   # ... make changes ...
 *   node scripts/ask-golden-snapshot.cjs --out snapshots/after.json
 *   node scripts/ask-golden-snapshot.cjs --diff snapshots/before.json snapshots/after.json
 */

const fs = require("node:fs")
const path = require("node:path")

const PROFILES = [
  "Bernie Sanders",
  "Alexandria Ocasio-Cortez",
  "Chris Murphy",
  "Josh Hawley",
  "Elizabeth Warren",
  "Ted Cruz",
  "Donald Trump",
  "Jamaal Bowman",
  "Harlan Crow",
  "Leonard Leo",
  "Koch Network - Charles Koch",
  "American Crossroads",
  "Google",
  "American Enterprise Institute",
  "Rule of Law Trust",
]

const QUESTIONS_PER_PROFILE = (name) => [
  `tell me about ${name}`,
  `who funds ${name}`,
  `what does ${name} fund`,
]

const ASK_URL = process.env.ASK_URL || "http://localhost:3333/api/ask"

function parseArgs() {
  const args = process.argv.slice(2)
  const out = { out: null, diff: null }
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") out.out = args[++i]
    else if (args[i] === "--diff") {
      out.diff = [args[++i], args[++i]]
    }
  }
  return out
}

async function fetchAsk(question) {
  const res = await fetch(ASK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} on "${question}"`)
  return await res.json()
}

function summarize(resp) {
  // Extract the *stable* parts of the response that we care about
  // diffing. Skip timestamps, row-level IDs, and other churn.
  return {
    intent: resp.intent,
    resolved_title: resp.resolved_title,
    total: resp.total,
    answer: resp.answer,
    plain_english: resp.plain_english,
    bullets: resp.bullets,
    breakdown: resp.breakdown,
    raise_reconciliation: resp.raise_reconciliation,
    top_rows: (resp.rows || []).slice(0, 5).map((r) => ({
      kind: r.kind,
      from: r.from,
      to: r.to,
      amount: r.amount,
      cycle: r.cycle,
      role: r.role,
      source: r.source,
    })),
  }
}

async function captureAll(outPath) {
  const snapshot = { captured_at: new Date().toISOString(), profiles: {} }
  for (const profile of PROFILES) {
    const questions = QUESTIONS_PER_PROFILE(profile)
    const results = {}
    for (const q of questions) {
      try {
        const r = await fetchAsk(q)
        results[q] = summarize(r)
        process.stdout.write(".")
      } catch (err) {
        results[q] = { error: err.message }
        process.stdout.write("x")
      }
    }
    snapshot.profiles[profile] = results
  }
  console.log()
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2))
  console.log(`Wrote ${outPath}`)
}

function diff(beforePath, afterPath) {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf-8"))
  const after = JSON.parse(fs.readFileSync(afterPath, "utf-8"))
  const changes = []
  for (const profile of Object.keys(before.profiles)) {
    const bp = before.profiles[profile]
    const ap = after.profiles[profile] || {}
    for (const q of Object.keys(bp)) {
      const b = JSON.stringify(bp[q], null, 2)
      const a = JSON.stringify(ap[q] || null, null, 2)
      if (b !== a) {
        changes.push({ profile, question: q, before: bp[q], after: ap[q] })
      }
    }
  }
  console.log(`\n=== DIFF: ${changes.length} / ${Object.keys(before.profiles).length * 3} questions changed ===\n`)
  for (const c of changes) {
    console.log(`━━━ ${c.profile} — "${c.question}" ━━━`)
    const keys = new Set([...Object.keys(c.before || {}), ...Object.keys(c.after || {})])
    for (const k of keys) {
      const bv = JSON.stringify(c.before?.[k])
      const av = JSON.stringify(c.after?.[k])
      if (bv !== av) {
        console.log(`  ${k}:`)
        console.log(`    BEFORE: ${(bv || "").slice(0, 300)}`)
        console.log(`    AFTER:  ${(av || "").slice(0, 300)}`)
      }
    }
    console.log()
  }
}

;(async () => {
  const args = parseArgs()
  if (args.diff) diff(args.diff[0], args.diff[1])
  else if (args.out) await captureAll(args.out)
  else {
    console.error("Usage: --out <path>  OR  --diff <before> <after>")
    process.exit(1)
  }
})()
