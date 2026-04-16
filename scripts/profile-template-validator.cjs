#!/usr/bin/env node
/**
 * profile-template-validator.cjs — enforce the 9-section profile template
 *
 * Per content/Profile Template.md. Only validates profiles at
 * `content-readiness: verified`. Lower tiers are work-in-progress.
 *
 * Checks:
 *   1. Frontmatter has required fields for the profile type
 *   2. Body has the required section headings (H2) in the correct order
 *   3. No defamation-sanitized placeholder words left unreviewed
 *   4. `last-enriched` date is less than 90 days old (freshness stamp)
 *
 * Exit codes:
 *   0 — all staged verified profiles pass
 *   1 — one or more profiles fail validation (pre-commit blocks)
 *   2 — script error
 *
 * Usage:
 *   node scripts/profile-template-validator.cjs                   # check all verified profiles
 *   node scripts/profile-template-validator.cjs --staged          # pre-commit mode
 *   node scripts/profile-template-validator.cjs <path>            # check single profile
 *   node scripts/profile-template-validator.cjs --report          # write content/Admin Notes/template-validation-report.md
 *
 * Exceptions (skip template check):
 *   - profiles with `claim-object: true` (ADR-0007 claim-object pattern)
 *   - profiles with `editor-vouched: true` (long-form stories with aggregated Sources)
 *   - profiles with `type: redirect`, `type: sub-note`, `type: system`, `type: admin-note`,
 *     `type: index`, `type: methodology`, `type: reference`, `type: story`, `type: event`,
 *     `type: digest`, `type: story-seed`, `type: decision`, `type: daily-update`
 *     (these aren't primary entity profiles subject to the 9-section template)
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")
const { execSync } = require("child_process")

const ROOT = path.resolve(__dirname, "..")
const VERIFIED_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

// ─── The 9-section contract (H2 headings in required order) ────────

// Sections 1 (Summary Infobox) rendered by SummaryInfobox.tsx component
// from frontmatter — no heading in markdown.
// Sections 2-9 are H2 headings in this order:

function getRequiredSections(profileType, fm) {
  // Section 5 varies by type + chamber (presidents/cabinet use Executive Actions)
  const isPresidential =
    profileType === "politician" &&
    (fm?.chamber === "Presidential" || fm?.chamber === "Cabinet" ||
     String(fm?.["current-office"] || "").match(/president|cabinet|secretary of/i))

  const typeSpecific =
    isPresidential
      ? ["Executive Actions", "Executive Orders", "Key Executive Actions"]
      : profileType === "politician" || profileType === "state-politician" || profileType === "local-politician"
      ? ["Key Votes", "Key Votes + Actions", "Key Votes and Actions", "Voting Record"]
      : profileType === "donor"
      ? ["Politicians Funded", "Allied Donors + Politicians Funded"]
      : profileType === "pac"
      ? ["Politicians Funded", "Allied Donors + Politicians Funded"]
      : profileType === "corporation"
      ? ["Contracts + Lobbying", "Contracts and Lobbying"]
      : profileType === "think-tank"
      ? ["Policy Positions", "Influence"]
      : profileType === "lobbying-firm"
      ? ["Clients + Issues", "Clients and Issues"]
      : []

  return [
    { pos: 2, canonical: "Who They Are", variants: ["Who They Are", "Who He Is", "Who She Is", "Who We Are", "Bio", "Biography", "Background", "About"] },
    { pos: 3, canonical: "Class Analysis", variants: ["Class Analysis"] },
    { pos: 4, canonical: "The Money", variants: ["The Money", "Money", "Funding", "The Donor Class Map", "The Donors", "Campaign Finance"] },
    { pos: 5, canonical: typeSpecific[0] || "Type-Specific", variants: typeSpecific },
    { pos: 6, canonical: "The Contradictions", variants: ["The Contradictions", "Contradictions", "The Core Contradiction", "Contradictions + Conflicts"] },
    { pos: 7, canonical: "Timeline", variants: ["Timeline", "Chronology", "History"] },
    { pos: 8, canonical: "Related Figures", variants: ["Related Figures", "Related", "Related Profiles", "Connections", "Network"] },
    { pos: 9, canonical: "Sources", variants: ["Sources", "References", "Citations", "Bibliography"] },
  ]
}

// ─── Required frontmatter per type ─────────────────────────────────

function getRequiredFrontmatter(profileType) {
  const base = ["title", "type", "content-readiness", "last-updated", "last-enriched"]

  if (["politician", "state-politician", "local-politician"].includes(profileType)) {
    return [...base, "party", "state"]
  }
  if (["donor", "pac", "corporation", "think-tank", "lobbying-firm"].includes(profileType)) {
    return [...base, "sector", "entity-type"]
  }
  return base
}

// ─── Parse profile ─────────────────────────────────────────────────

function parseProfile(filePath) {
  if (!fs.existsSync(filePath)) return { err: "file not found" }
  const text = fs.readFileSync(filePath, "utf-8")
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { err: "no frontmatter" }
  let fm
  try { fm = yaml.load(m[1]) || {} } catch (e) { return { err: `yaml: ${e.message.split("\n")[0]}` } }
  return { fm, body: m[2], raw: text }
}

function extractH2Headings(body) {
  const headings = []
  const lines = body.split("\n")
  let inCode = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^```/.test(line)) inCode = !inCode
    if (inCode) continue
    const match = line.match(/^##\s+(.+?)\s*$/)
    if (match) {
      headings.push({ line: i + 1, text: match[1].trim() })
    }
  }
  return headings
}

// ─── The check ─────────────────────────────────────────────────────

function validateProfile(filePath, fm, body) {
  const errors = []
  const warnings = []

  // Skip non-entity types
  const type = fm.type
  if (!VERIFIED_TYPES.has(type)) {
    return { skipped: true, reason: `type "${type}" not subject to 9-section template` }
  }

  // Skip claim-object / editor-vouched
  if (fm["claim-object"] === true) {
    return { skipped: true, reason: "claim-object profile (ADR-0007)" }
  }
  if (fm["editor-vouched"] === true) {
    return { skipped: true, reason: "editor-vouched profile (long-form story format)" }
  }

  // Only enforce on verified
  if (fm["content-readiness"] !== "verified") {
    return { skipped: true, reason: `readiness "${fm["content-readiness"]}" (only enforced on verified)` }
  }

  // Required frontmatter
  const required = getRequiredFrontmatter(type)
  for (const key of required) {
    if (fm[key] === undefined || fm[key] === null || fm[key] === "") {
      errors.push(`frontmatter missing required field: ${key}`)
    }
  }

  // Freshness: last-enriched within 90 days
  if (fm["last-enriched"]) {
    const enrichedDate = new Date(fm["last-enriched"])
    if (!isNaN(enrichedDate.getTime())) {
      const ageDays = Math.floor((Date.now() - enrichedDate.getTime()) / 86400000)
      if (ageDays > 90) {
        errors.push(`last-enriched is ${ageDays} days old (>90d stale). Re-enrich before verified promotion.`)
      }
    }
  }

  // Section contract
  const headings = extractH2Headings(body)
  const sections = getRequiredSections(type, fm)

  // Heading matches a variant as exact OR prefix-with-separator
  // (so "The Donor Class Map, 2024" matches variant "The Donor Class Map")
  const matchesVariant = (heading, variant) => {
    const h = heading.toLowerCase().trim()
    const v = variant.toLowerCase().trim()
    if (h === v) return true
    if (h.length > v.length) {
      const next = h[v.length]
      if (h.startsWith(v) && (next === "," || next === ":" || next === " " || next === "—" || next === "-" || next === ".")) {
        return true
      }
    }
    return false
  }

  // Map each required section to the first matching heading
  const sectionPositions = sections.map((s) => {
    const foundAt = headings.findIndex((h) => s.variants.some((v) => matchesVariant(h.text, v)))
    return { ...s, foundAt, found: foundAt >= 0 ? headings[foundAt] : null }
  })

  // Missing sections
  for (const sp of sectionPositions) {
    if (sp.foundAt === -1) {
      errors.push(`section ${sp.pos} missing: expected "## ${sp.canonical}" (accepted variants: ${sp.variants.join(", ")})`)
    }
  }

  // Order check — found sections must be in increasing heading-index order
  const foundSections = sectionPositions.filter((sp) => sp.foundAt >= 0)
  for (let i = 1; i < foundSections.length; i++) {
    if (foundSections[i].foundAt <= foundSections[i - 1].foundAt) {
      errors.push(
        `section order wrong: "## ${foundSections[i].canonical}" (line ${foundSections[i].found.line}) ` +
        `appears before "## ${foundSections[i - 1].canonical}" (line ${foundSections[i - 1].found.line})`
      )
    }
  }

  // Defamation-sanitized placeholder warning (soft check)
  const sanitizedPatterns = [
    /\bbillionaire populist misconduct\b/i, // Trump profile case study
  ]
  for (const re of sanitizedPatterns) {
    if (re.test(body)) {
      warnings.push(`possible defamation-sanitized placeholder detected: ${re.source}. Editorial review needed.`)
    }
  }

  // Unresolved roadmap markers — informational, not blocking
  const urlNeeded = (body.match(/\(URL NEEDED\)/g) || []).length
  const unverified = (body.match(/\(UNVERIFIED\)/g) || []).length
  const needsReview = (body.match(/\(NEEDS REVIEW\)/g) || []).length
  if (urlNeeded + unverified + needsReview > 0) {
    errors.push(`unresolved roadmap markers: ${urlNeeded} URL NEEDED, ${unverified} UNVERIFIED, ${needsReview} NEEDS REVIEW. Clear before verified promotion (or archive sources explicitly).`)
  }

  return { skipped: false, errors, warnings }
}

// ─── File discovery ────────────────────────────────────────────────

function findStagedMarkdownFiles() {
  try {
    const raw = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf-8", cwd: ROOT })
    return raw.split("\n")
      .filter((f) => f.startsWith("content/") && f.endsWith(".md"))
      .filter((f) => !f.startsWith("content/Drafts/"))
      .filter((f) => !f.startsWith("content/Decisions/"))
      .filter((f) => !f.startsWith("content/Admin Notes/"))
      .filter((f) => !f.startsWith("content/Events/"))
      .filter((f) => !f.startsWith("content/Checklists/"))
      .filter((f) => !f.startsWith("content/Story Seeds/"))
      .filter((f) => f.trim().length > 0)
  } catch {
    return []
  }
}

function findAllProfileFiles() {
  const results = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (["Drafts", "Decisions", "Admin Notes", "Events", "Checklists", "Story Seeds", "Vault Maintenance", "Archive", "Phases", "Assets", "Interactive", "Policies", "Daily Updates", "Internal", "_templates", "templates"].includes(entry.name)) continue
        walk(full)
      } else if (entry.name.endsWith(".md")) {
        results.push(full)
      }
    }
  }
  walk(path.join(ROOT, "content"))
  return results
}

// ─── Main ──────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const staged = args.includes("--staged")
  const report = args.includes("--report")
  const singlePath = args.find((a) => !a.startsWith("--"))

  let files = []
  if (singlePath) {
    files = [path.isAbsolute(singlePath) ? singlePath : path.join(ROOT, singlePath)]
  } else if (staged) {
    files = findStagedMarkdownFiles().map((f) => path.join(ROOT, f))
  } else {
    files = findAllProfileFiles()
  }

  let passCount = 0
  let skipCount = 0
  let failCount = 0
  const failures = []

  for (const filePath of files) {
    const parsed = parseProfile(filePath)
    if (parsed.err) {
      if (staged) continue
      failures.push({ file: filePath, errors: [parsed.err], warnings: [] })
      failCount++
      continue
    }
    const result = validateProfile(filePath, parsed.fm, parsed.body)
    if (result.skipped) {
      skipCount++
      continue
    }
    if (result.errors.length > 0) {
      failures.push({ file: filePath, errors: result.errors, warnings: result.warnings })
      failCount++
    } else {
      passCount++
      if (result.warnings.length > 0) {
        console.log(`  ⚠ ${path.relative(ROOT, filePath)}: ${result.warnings.length} warning(s)`)
      }
    }
  }

  // Output
  if (failCount === 0) {
    console.log(`[template-validator] ${passCount} verified profile(s) pass, ${skipCount} skipped (not verified / exempt type / claim-object / editor-vouched)`)
    process.exit(0)
  }

  console.log()
  console.log(`[template-validator] ${failCount} profile(s) fail:`)
  for (const f of failures.slice(0, 20)) {
    console.log()
    console.log(`  ${path.relative(ROOT, f.file)}`)
    for (const e of f.errors) {
      console.log(`    ✗ ${e}`)
    }
    for (const w of f.warnings) {
      console.log(`    ⚠ ${w}`)
    }
  }
  if (failures.length > 20) console.log(`\n  ... and ${failures.length - 20} more`)

  // Optional report
  if (report) {
    const REPORT_PATH = path.join(ROOT, "content/Admin Notes/template-validation-report.md")
    const now = new Date().toISOString().split("T")[0]
    const lines = [
      "---",
      "title: Profile Template Validation Report",
      "type: admin-note",
      "note-type: code",
      `priority: ${failCount > 0 ? "urgent" : "normal"}`,
      "status: open",
      `last-updated: '${now}'`,
      "generated-by: scripts/profile-template-validator.cjs",
      "---",
      "",
      "# Profile Template Validation Report",
      "",
      `**Scan date:** ${now}`,
      `**Pass:** ${passCount} | **Fail:** ${failCount} | **Skipped:** ${skipCount}`,
      "",
    ]
    if (failCount > 0) {
      lines.push("## Failures")
      lines.push("")
      for (const f of failures) {
        lines.push(`### ${path.relative(ROOT, f.file).replace(/\\/g, "/")}`)
        lines.push("")
        for (const e of f.errors) lines.push(`- ✗ ${e}`)
        for (const w of f.warnings) lines.push(`- ⚠ ${w}`)
        lines.push("")
      }
    } else {
      lines.push("All verified profiles pass template validation.")
    }
    fs.writeFileSync(REPORT_PATH, lines.join("\n"))
    console.log(`\nReport written to: ${REPORT_PATH}`)
  }

  console.log()
  console.log(`To bypass (emergency): SKIP_HOOKS=1 git commit ...`)
  console.log(`Spec: content/Profile Template.md`)
  process.exit(1)
}

main()
