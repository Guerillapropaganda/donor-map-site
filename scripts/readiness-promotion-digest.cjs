#!/usr/bin/env node
// readiness-promotion-digest.cjs — prep David's next review session
//
// Purpose: David wants to spend his next session on manual review. The
// highest-leverage review work is promoting `ready`-tier profiles to
// `verified`. This script finds every profile that is close to
// passing publication-readiness-check and produces a single review
// digest with each profile's:
//
//   - current readiness tier
//   - exactly which gates it's failing
//   - content stats (class tags, source tier distribution, citation count)
//   - one-click promotion path if the only failure is the readiness flag
//
// Target: profiles with ≤ 2 failures, sorted by "closest to ready first".
//
// Output: content/Admin Notes/readiness-promotion-digest.md
//
// Usage:
//   node scripts/readiness-promotion-digest.cjs              # dry run
//   node scripts/readiness-promotion-digest.cjs --write      # write digest

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const ROOT = path.join(__dirname, "..")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "readiness-promotion-digest.md")

const WRITE = process.argv.includes("--write")

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ readiness-promotion-digest ═══")
  console.log("")

  // Run the readiness check as JSON and parse
  const readinessScript = path.join(__dirname, "publication-readiness-check.cjs")
  let readinessJson
  try {
    const out = execSync(`node "${readinessScript}" --json`, {
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    })
    readinessJson = JSON.parse(out)
  } catch (err) {
    // Script exits 1 if profiles fail — that's expected. Parse from stdout.
    if (err.stdout) {
      try {
        readinessJson = JSON.parse(err.stdout)
      } catch (e) {
        console.error("Failed to parse readiness output:", e.message)
        process.exit(2)
      }
    } else {
      console.error("readiness-check crashed:", err.message)
      process.exit(2)
    }
  }

  console.log(`  ${readinessJson.total} profiles scanned`)
  console.log(`  ${readinessJson.passed} already passing`)
  console.log(`  ${readinessJson.failed} blocked`)
  console.log("")

  const results = readinessJson.results || []
  const failed = results.filter((r) => !r.ready)

  // Classify by distance-to-ready
  const oneFailure = failed.filter((r) => r.failures.length === 1)
  const twoFailures = failed.filter((r) => r.failures.length === 2)

  console.log(`  ${oneFailure.length} profiles one failure away`)
  console.log(`  ${twoFailures.length} profiles two failures away`)
  console.log("")

  // Sort by failure-shape priority:
  //   1. Only issue is content-readiness ready→verified (trivial)
  //   2. Only issue is content-readiness draft→verified (human review)
  //   3. Other single failures
  //   4. Two failures
  function failureRank(r) {
    if (r.failures.length === 1) {
      const f = r.failures[0]
      if (/content-readiness is "ready"/.test(f)) return 1
      if (/content-readiness is "draft"/.test(f)) return 2
      if (/content-readiness/.test(f)) return 3
      return 4
    }
    return 5 + r.failures.length
  }

  oneFailure.sort((a, b) => failureRank(a) - failureRank(b))

  // Categorize
  const readyToVerifiedTrivial = oneFailure.filter((r) =>
    r.failures.some((f) => /content-readiness is "ready"/.test(f)),
  )
  const draftToVerified = oneFailure.filter((r) =>
    r.failures.some((f) => /content-readiness is "draft"/.test(f)),
  )
  const missingFlag = oneFailure.filter((r) =>
    r.failures.some((f) => /content-readiness is "\(missing\)"/.test(f)),
  )
  const otherSingleFailures = oneFailure.filter(
    (r) =>
      !r.failures.some((f) => /content-readiness/.test(f)),
  )

  console.log("  breakdown of 1-failure profiles:")
  console.log(`    ${readyToVerifiedTrivial.length} ready→verified (trivial promotion, read + flip)`)
  console.log(`    ${draftToVerified.length} draft→verified (2-step read + promote)`)
  console.log(`    ${missingFlag.length} no readiness flag at all`)
  console.log(`    ${otherSingleFailures.length} other (class-analysis / markers / refs)`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to generate the digest")
    return
  }

  // ─── Build digest ──────────────────────────────────────────────────
  const lines = []
  lines.push("---")
  lines.push('title: "Readiness Promotion Digest — Next Review Session"')
  lines.push("type: admin-note")
  lines.push("note-type: code")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/readiness-promotion-digest.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Readiness Promotion Digest")
  lines.push("")
  lines.push(
    "Prep sheet for David's next manual review session. Profiles are ranked by distance-to-ready — the profiles at the top are ONE edit away from passing the publication-readiness gate. Work through them in order.",
  )
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- **Total profiles scanned:** ${readinessJson.total}`)
  lines.push(`- **Already passing the gate:** ${readinessJson.passed}`)
  lines.push(`- **One failure away:** ${oneFailure.length}`)
  lines.push(`- **Two failures away:** ${twoFailures.length}`)
  lines.push("")

  // ─── Section 1: ready → verified (trivial) ────────────────────
  if (readyToVerifiedTrivial.length) {
    lines.push(`## 🟢 ready → verified promotion (${readyToVerifiedTrivial.length})`)
    lines.push("")
    lines.push(
      "These profiles have passed every automated quality gate and are currently flagged `content-readiness: ready`. They need one thing: a human read-through, then a flag flip to `verified`. **Workflow:** open the profile in Ops, read the body end-to-end, check the Class Analysis section matches the editorial tone, then in the ops /readiness UI (or directly in frontmatter) change the flag. The next publication-readiness check will mark the profile as READY.",
    )
    lines.push("")
    lines.push("| Profile | Current flag |")
    lines.push("|---|---|")
    for (const r of readyToVerifiedTrivial) {
      const name = r.file.split("/").pop().replace(/\.md$/, "").replace(/^_/, "")
      lines.push(`| [${name}](/${r.file}) | ready |`)
    }
    lines.push("")
  }

  // ─── Section 2: draft → verified ──────────────────────────────
  if (draftToVerified.length) {
    lines.push(`## 🟡 draft → verified promotion (${draftToVerified.length})`)
    lines.push("")
    lines.push(
      "These passed every other gate BUT are still marked `draft`. Skipping the `ready` intermediate tier is technically allowed if the content is solid. Still requires a full read.",
    )
    lines.push("")
    lines.push("| Profile |")
    lines.push("|---|")
    for (const r of draftToVerified) {
      const name = r.file.split("/").pop().replace(/\.md$/, "").replace(/^_/, "")
      lines.push(`| [${name}](/${r.file}) |`)
    }
    lines.push("")
  }

  // ─── Section 3: missing flag ──────────────────────────────────
  if (missingFlag.length) {
    lines.push(`## ⚪ Missing flag (${missingFlag.length})`)
    lines.push("")
    lines.push(
      "Profiles that have NO `content-readiness` frontmatter at all and passed every other gate. These are almost certainly auto-generated pages (policy pages, index pages). Adding `content-readiness: draft` is a one-line fix; promotion to `verified` needs a human read.",
    )
    lines.push("")
    lines.push("| Profile |")
    lines.push("|---|")
    for (const r of missingFlag) {
      lines.push(`| [${r.file.split("/").pop()}](/${r.file}) |`)
    }
    lines.push("")
  }

  // ─── Section 4: other single failures ─────────────────────────
  if (otherSingleFailures.length) {
    lines.push(`## 🔧 Single non-flag failures (${otherSingleFailures.length})`)
    lines.push("")
    lines.push(
      "These have exactly one thing wrong and it's NOT the readiness flag. Usually missing Class Analysis section, visible URL markers, or strikethrough sources in the wrong place. Fix the one thing, then promote.",
    )
    lines.push("")
    lines.push("| Profile | Failure |")
    lines.push("|---|---|")
    for (const r of otherSingleFailures.slice(0, 50)) {
      const name = r.file.split("/").pop().replace(/\.md$/, "")
      const f = r.failures[0].replace(/\|/g, "\\|").slice(0, 80)
      lines.push(`| [${name}](/${r.file}) | ${f} |`)
    }
    if (otherSingleFailures.length > 50) {
      lines.push(`| … +${otherSingleFailures.length - 50} more | |`)
    }
    lines.push("")
  }

  // ─── Section 5: two-failure profiles ──────────────────────────
  if (twoFailures.length) {
    lines.push(`## 📋 Two failures (${twoFailures.length})`)
    lines.push("")
    lines.push(
      "Profiles with exactly two failures. Often the readiness flag PLUS one content issue. Two fixes away from ready.",
    )
    lines.push("")
    // Group by failure pattern for summary
    const byPattern = {}
    for (const r of twoFailures) {
      const pattern = r.failures
        .map((f) => f.split(":")[0].replace(/"[^"]*"/g, "X").slice(0, 50))
        .sort()
        .join(" + ")
      if (!byPattern[pattern]) byPattern[pattern] = 0
      byPattern[pattern]++
    }
    lines.push("Top failure-pair patterns:")
    lines.push("")
    const sorted = Object.entries(byPattern).sort((a, b) => b[1] - a[1])
    for (const [p, c] of sorted.slice(0, 10)) {
      lines.push(`- **${c}×** ${p}`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    `*Regenerate: \`node scripts/readiness-promotion-digest.cjs --write\`. Re-run after each review batch to see updated numbers.*`,
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
}

main()
