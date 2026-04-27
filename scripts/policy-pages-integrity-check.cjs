#!/usr/bin/env node
/**
 * policy-pages-integrity-check.cjs
 *
 * Harness check (ADR-0021) for the auto-generated policy pages.
 * Pairs with build-policy-pages.cjs (scheduled daily 04:15 UTC via the
 * dispatcher). Without this check, a regression in the builder would
 * land silently — pages would render with broken donor tables, empty
 * polling sections, missing headlines, etc., until somebody eyeballed
 * a draft.
 *
 * For each policy in data/policies.jsonl, verifies the corresponding
 * content/Policies/{slug}.md:
 *
 *   1. Exists.
 *   2. Was rebuilt recently (last-updated frontmatter within FRESH_DAYS).
 *   3. Has a non-empty headline lead line — one of the LEAD_LINES voices
 *      (or a custom editorial_headline override).
 *   4. Has a stat line under the lead when polls or events exist for
 *      this policy.
 *   5. Has either a populated donor table OR the honest empty-state
 *      disclosure paragraph.
 *   6. Build provenance footer is wrapped in <!-- ops-only ... --> markers
 *      (regression check on the convention established 2026-04-27).
 *
 * Each issue surfaces a finding to /attention with the policy slug.
 *
 * Usage:
 *   node scripts/policy-pages-integrity-check.cjs           # human-readable
 *   node scripts/policy-pages-integrity-check.cjs --json    # for harness
 */

const fs = require("fs")
const path = require("path")
const policiesStore = require("./lib/policies-store.cjs")
const pollingStore = require("./lib/polling-store.cjs")
const eventsStore = require("./lib/events-store.cjs")

const JSON_OUT = process.argv.includes("--json")
const FRESH_DAYS = 7
const ROOT = path.resolve(__dirname, "..")
const POLICIES_DIR = path.join(ROOT, "content", "Policies")

// Lead-line phrases that the builder emits per legislative_status. Any
// non-empty bold line at the top of the page is acceptable; this list
// is for parity reporting only.
const LEAD_LINE_FRAGMENTS = [
  "The public wants this. Congress doesn't.",
  "Bottled up before a vote.",
  "The public wants this. Congress half-did it.",
  "Public will, eventually translated into law.",
  "Passed despite weak public support.",
  "Public support. Vetoed anyway.",
  "Public support. Never even debated.",
  "Public support meets legislative silence.",
]

function daysAgo(iso) {
  if (!iso || typeof iso !== "string") return Infinity
  const t = Date.parse(iso)
  if (isNaN(t)) return Infinity
  return (Date.now() - t) / 86400000
}

// Pull the date from `last-updated:` frontmatter (YAML), or null.
function extractLastUpdated(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const fmLine = m[1].split("\n").find((l) => l.startsWith("last-updated:"))
  if (!fmLine) return null
  return fmLine.replace(/^last-updated:\s*/, "").trim().replace(/^["']|["']$/g, "")
}

function checkPolicy(policy) {
  const issues = []
  const slug = policy.slug
  const file = path.join(POLICIES_DIR, `${slug}.md`)

  // 1. File exists?
  if (!fs.existsSync(file)) {
    issues.push({
      slug,
      kind: "missing-file",
      detail: `content/Policies/${slug}.md does not exist`,
      fix: "run `node scripts/build-policy-pages.cjs --write`",
    })
    return issues
  }

  const md = fs.readFileSync(file, "utf-8")

  // 2. Freshness — was it rebuilt within FRESH_DAYS?
  const lastUpdated = extractLastUpdated(md)
  const age = daysAgo(lastUpdated)
  if (age > FRESH_DAYS) {
    issues.push({
      slug,
      kind: "stale-build",
      detail: `last-updated=${lastUpdated || "(missing)"} — ${Math.floor(age)} days old, threshold ${FRESH_DAYS}`,
      fix: "run `node scripts/build-policy-pages.cjs --write`, or check the dispatcher producer is alive",
    })
  }

  // Body without frontmatter, for content checks
  const bodyStart = md.indexOf("---", 4) + 3
  const body = md.slice(bodyStart)

  // 3. Headline lead line — any of the known lines OR a non-empty bold line
  // immediately after the H1. The high-risk-editorial firewall HTML comment
  // (banned words / ADR-0004) can sit between frontmatter and H1, so we
  // anchor on the H1 itself rather than the start-of-body.
  const titleIdx = body.indexOf("\n# ")
  const headerLineEnd = titleIdx >= 0 ? body.indexOf("\n", titleIdx + 1) : -1
  const titleMatch =
    headerLineEnd >= 0
      ? body.slice(headerLineEnd).match(/^\n+\s*(\*\*[^*\n]+\*\*)/)
      : null
  if (!titleMatch) {
    issues.push({
      slug,
      kind: "missing-headline",
      detail: "no bold lead line found immediately under the H1",
      fix: "the build script's computeGapHeadline emits this — check policy.legislative_status is set",
    })
  } else {
    // Soft signal — flag if it doesn't match a known voice (a custom
    // editorial_headline is fine; this just notes when something looks off)
    const lead = titleMatch[1]
    const knownVoice = LEAD_LINE_FRAGMENTS.some((frag) => lead.includes(frag))
    if (!knownVoice && !policy.editorial_headline) {
      issues.push({
        slug,
        kind: "unknown-headline-voice",
        detail: `lead line "${lead}" doesn't match any LEAD_LINES voice and no editorial_headline override is set`,
        fix: "regenerate, OR set policy.editorial_headline if the off-pattern voice was intentional",
      })
    }
  }

  // 4. Stat line — when this policy has polls or events, the build script
  // emits a sentence like "X% support across N polls. Y federal bills..."
  // immediately after the lead. Check for it.
  const polls = pollingStore.getPollsForPolicy(policy.id)
  const evs = eventsStore.queryEvents({ policy_id: policy.id })
  if (polls.length || evs.length) {
    // The lead is followed by the stat sentence. Look for either "% support"
    // or "federal bill" as a marker that the stat line emitted.
    const hasStatLine =
      /\d+%\s+support\s+across/.test(body) ||
      /\d+\s+federal\s+bills?\s+introduced/.test(body)
    if (!hasStatLine) {
      issues.push({
        slug,
        kind: "missing-stat-line",
        detail: `policy has ${polls.length} poll(s) and ${evs.length} event(s) but no computed stat line in the page`,
        fix: "regenerate; check polling/events data is reachable from the build script",
      })
    }
  }

  // 5. Donor table OR honest empty-state. Either:
  //   - "### Top opposition donors" present (table emitted), or
  //   - "No entities in `data/entities.jsonl` are currently tagged" (empty disclosure)
  const hasDonorTable = /### Top opposition donors/.test(body)
  const hasEmptyDisclosure = /No entities in `data\/entities\.jsonl` are currently tagged/.test(body)
  if (!hasDonorTable && !hasEmptyDisclosure) {
    issues.push({
      slug,
      kind: "missing-donor-section",
      detail: "neither the donor table nor the empty-state disclosure is present",
      fix: "regenerate; check engine.topPolicyOppositionDonors is callable",
    })
  }

  // 6. Build provenance footer wrapped in ops-only markers (regression check
  // on the 2026-04-27 convention). The footer line "Policy page generated"
  // should appear ONLY inside an <!-- ops-only ... --> block.
  const footerLine = "Policy page generated from canonical data stores"
  const footerIdx = body.indexOf(footerLine)
  if (footerIdx === -1) {
    issues.push({
      slug,
      kind: "missing-provenance-footer",
      detail: "build provenance footer text not found at all",
      fix: "regenerate",
    })
  } else {
    // Look backward for the nearest <!-- ops-only and forward for the nearest -->
    // Footer must be inside that comment block.
    const before = body.slice(0, footerIdx)
    const after = body.slice(footerIdx)
    const lastOpenIdx = before.lastIndexOf("<!-- ops-only")
    const nextCloseIdx = after.indexOf("-->")
    // Also check there's no intervening --> between the open and the footer
    const interveningClose = lastOpenIdx >= 0 ? before.slice(lastOpenIdx).indexOf("-->") : -1
    const inOpsOnlyBlock =
      lastOpenIdx >= 0 && nextCloseIdx >= 0 && interveningClose === -1
    if (!inOpsOnlyBlock) {
      issues.push({
        slug,
        kind: "footer-not-ops-only",
        detail: 'build provenance footer is rendered to public — should be wrapped in <!-- ops-only ... --> markers',
        fix: "regenerate against the latest build-policy-pages.cjs (ops-only wrap added 2026-04-27)",
      })
    }
  }

  return issues
}

function main() {
  policiesStore.loadPolicies()
  pollingStore.loadPolls()
  eventsStore.loadEvents()

  const all = policiesStore.queryPolicies({})
  const allIssues = []
  for (const policy of all) {
    const issues = checkPolicy(policy)
    allIssues.push(...issues)
  }

  if (JSON_OUT) {
    const byKind = {}
    for (const i of allIssues) byKind[i.kind] = (byKind[i.kind] || 0) + 1
    const noteParts = []
    for (const [k, n] of Object.entries(byKind)) noteParts.push(`${n} ${k}`)
    const notes = allIssues.length
      ? `${all.length} polic${all.length === 1 ? "y" : "ies"} scanned · ${noteParts.join(", ")}`
      : `${all.length} polic${all.length === 1 ? "y" : "ies"} scanned · clean`
    console.log(
      JSON.stringify({
        findings_count: allIssues.length,
        notes,
        policies_scanned: all.length,
        findings: allIssues,
      }),
    )
    process.exit(allIssues.length ? 1 : 0)
  }

  // Human-readable
  console.log("")
  console.log("═══ policy-pages-integrity ═══")
  console.log(`  scanned: ${all.length} policies`)
  console.log(`  issues:  ${allIssues.length}`)
  console.log("")
  if (allIssues.length === 0) {
    console.log("  ✓ all clean")
    process.exit(0)
  }
  for (const i of allIssues) {
    console.log(`  · ${i.slug} [${i.kind}]`)
    console.log(`      ${i.detail}`)
    console.log(`      fix: ${i.fix}`)
  }
  process.exit(1)
}

main()
