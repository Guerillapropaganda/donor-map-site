#!/usr/bin/env node
/**
 * profile-template-generator.cjs — reshape a profile into the 9-section template
 *
 * Additive only. Does NOT destroy existing editorial content.
 *
 * Behavior:
 *   1. Split body into heading-delimited blocks (each H2 starts a new block)
 *   2. Classify each block: matches a required section (ordinal 2-9) or supplementary
 *   3. Output in canonical order: required sections in ordinal order, with
 *      supplementary sections preserved near their original positions
 *   4. Insert stubs for any MISSING required sections at the correct position
 *   5. Keep existing heading text when it matches a variant (don't rename "Who He Is")
 *
 * Auto-section stubs include a generator tag so the later auto-populator
 * can replace them with fresh canonical-store data:
 *   <!-- template:auto:money --> ... <!-- template:auto:money:end -->
 *
 * Editorial-section stubs include a TODO comment for Research Claude.
 *
 * Usage:
 *   node scripts/profile-template-generator.cjs <path>                # dry run, print diff
 *   node scripts/profile-template-generator.cjs <path> --write        # apply
 *   node scripts/profile-template-generator.cjs --launch-50           # run on all launch-50 profiles (dry)
 *   node scripts/profile-template-generator.cjs --launch-50 --write   # apply to all launch-50
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT = path.resolve(__dirname, "..")

const VERIFIED_TYPES = new Set([
  "politician", "state-politician", "local-politician",
  "donor", "corporation", "pac", "think-tank", "lobbying-firm",
])

// ─── Required section spec (matches validator) ──────────────────────

function getRequiredSections(profileType) {
  const typeSpecific =
    profileType === "politician" || profileType === "state-politician" || profileType === "local-politician"
      ? { canonical: "Key Votes", variants: ["Key Votes", "Key Votes + Actions", "Key Votes and Actions", "Voting Record"] }
      : profileType === "donor" || profileType === "pac"
      ? { canonical: "Politicians Funded", variants: ["Politicians Funded", "Allied Donors + Politicians Funded"] }
      : profileType === "corporation"
      ? { canonical: "Contracts + Lobbying", variants: ["Contracts + Lobbying", "Contracts and Lobbying"] }
      : profileType === "think-tank"
      ? { canonical: "Policy Positions", variants: ["Policy Positions", "Influence"] }
      : profileType === "lobbying-firm"
      ? { canonical: "Clients + Issues", variants: ["Clients + Issues", "Clients and Issues"] }
      : { canonical: "Type-Specific", variants: [] }

  return [
    { pos: 2, canonical: "Who They Are", variants: ["Who They Are", "Who He Is", "Who She Is", "Who We Are", "Bio", "Biography", "Background", "About"], kind: "editorial" },
    { pos: 3, canonical: "The Money", variants: ["The Money", "Money", "Funding", "The Donor Class Map", "The Donors", "Campaign Finance"], kind: "auto" },
    { pos: 4, canonical: typeSpecific.canonical, variants: typeSpecific.variants, kind: "auto" },
    { pos: 5, canonical: "Class Analysis", variants: ["Class Analysis"], kind: "editorial" },
    { pos: 6, canonical: "The Contradictions", variants: ["The Contradictions", "Contradictions", "The Core Contradiction", "Contradictions + Conflicts"], kind: "editorial" },
    { pos: 7, canonical: "Timeline", variants: ["Timeline", "Chronology", "History"], kind: "auto" },
    { pos: 8, canonical: "Related Figures", variants: ["Related Figures", "Related", "Related Profiles", "Connections", "Network"], kind: "auto" },
    { pos: 9, canonical: "Sources", variants: ["Sources", "References", "Citations", "Bibliography"], kind: "auto" },
  ]
}

// ─── Block parser ───────────────────────────────────────────────────

/**
 * Split body into blocks. Each block = one H2 heading + content until next H2 or EOF.
 * "Preamble" = anything before the first H2 (frontmatter-adjacent content, data panels, tags).
 *
 * Returns:
 *   { preamble: string, blocks: Array<{ heading: string, content: string, raw: string }> }
 */
function splitIntoBlocks(body) {
  const lines = body.split("\n")
  const blocks = []
  let preambleLines = []
  let current = null
  let inFence = false
  let fenceMarker = ""

  for (const line of lines) {
    // Track fenced code blocks so we don't treat "## something" inside them as headings
    const fenceMatch = line.match(/^(\s*)(```+|~~~+)/)
    if (fenceMatch) {
      const marker = fenceMatch[2]
      if (!inFence) { inFence = true; fenceMarker = marker }
      else if (line.trim().startsWith(fenceMarker)) { inFence = false }
    }

    const h2Match = !inFence && line.match(/^##\s+(.+?)\s*$/)
    if (h2Match) {
      // Save previous block
      if (current) blocks.push(current)
      current = { heading: h2Match[1].trim(), content: "", raw: line + "\n" }
    } else if (current) {
      current.content += line + "\n"
      current.raw += line + "\n"
    } else {
      preambleLines.push(line)
    }
  }
  if (current) blocks.push(current)
  return { preamble: preambleLines.join("\n"), blocks }
}

// ─── Classify blocks against required sections ──────────────────────

function headingMatchesVariant(heading, variant) {
  const h = heading.toLowerCase().trim()
  const v = variant.toLowerCase().trim()
  // Exact match
  if (h === v) return true
  // Prefix match with separator after (e.g. "The Donor Class Map, 2024" matches "The Donor Class Map")
  if (h.length > v.length) {
    const next = h[v.length]
    if (h.startsWith(v) && (next === "," || next === ":" || next === " " || next === "—" || next === "-" || next === ".")) {
      return true
    }
  }
  return false
}

function classifyBlocks(blocks, spec) {
  return blocks.map((block) => {
    for (const section of spec) {
      if (section.variants.some((v) => headingMatchesVariant(block.heading, v))) {
        return { ...block, required: true, section }
      }
    }
    return { ...block, required: false, section: null }
  })
}

// ─── Stubs for missing sections ─────────────────────────────────────

function stubForSection(section, profileType) {
  const h = `## ${section.canonical}`
  if (section.kind === "editorial") {
    const prompts = {
      "Who They Are": "Draft the 2-3 paragraph lede. Who are they, why should readers care. Max 250 words. Punchy, direct, no em dashes.",
      "Class Analysis": `300-500 words. Anchor on the data above. Focus on: capital fraction, ideological function, cross-party spending if any, position in capital-to-politician pipeline. Vocabulary locked by ADR-0001.`,
      "The Contradictions": "Framing paragraph for auto-detected contradictions. What does the both-sides pattern reveal about their actual class interests vs stated positions.",
    }
    const prompt = prompts[section.canonical] || "Research Claude: write this section per content/Profile Template.md."
    return `${h}\n\n<!-- RESEARCH CLAUDE: ${prompt} -->\n\n_[Editorial section to be written]_\n\n`
  }
  // Auto section — insert a generator tag
  const autoKey = section.canonical.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "")
  const autoPrompts = {
    "the-money": "Top donors table + sector breakdown + cycle chart. Generated from data/relationships.jsonl filtered by this entity.",
    "key-votes": "Top 20 floor votes in current cycle with bill title + outcome + donor alignment. Generated from GovTrack.",
    "politicians-funded": "Auto table: politician name, total given, cycles, party breakdown. Generated from data/relationships.jsonl.",
    "contracts-lobbying": "Top federal contracts by agency + lobbying spend by year + revolving-door personnel. Generated from USASpending + LDA.",
    "timeline": "Reverse-chronological events from data/events.jsonl + FEC cycles + executive actions.",
    "related-figures": "Funds / Funded by / Allies / Opposes — from data/relationships.jsonl, not frontmatter.",
    "sources": "Aggregated from source registry. Grouped by tier. All {{src:ID}} refs resolve here at build time.",
  }
  const autoPrompt = autoPrompts[autoKey] || "Auto-populated from canonical stores."
  return `${h}\n\n<!-- template:auto:${autoKey} -->\n<!-- Auto-populated at build time. ${autoPrompt} -->\n_[Auto-generated content will appear here]_\n<!-- template:auto:${autoKey}:end -->\n\n`
}

// ─── The core transform ─────────────────────────────────────────────

function reshape(body, profileType) {
  const spec = getRequiredSections(profileType)
  const { preamble, blocks } = splitIntoBlocks(body)
  const classified = classifyBlocks(blocks, spec)

  // Classify blocks: required (with ordinal) vs supplementary
  const requiredBlocks = new Map() // ordinal -> block
  const supplementary = []

  for (let i = 0; i < classified.length; i++) {
    const b = { ...classified[i], originalIndex: i }
    if (b.required && !requiredBlocks.has(b.section.pos)) {
      requiredBlocks.set(b.section.pos, b)
    } else {
      // Either a supplementary, or a duplicate of a required section
      supplementary.push(b)
    }
  }

  // For each supplementary block, assign it to the "anchor" — the required
  // section ordinal it should appear BEFORE. Based on source order: pick the
  // next required section (by ordinal) that appeared in the source AFTER this
  // supp. If no required section comes after it in the source, it goes at the end.
  //
  // Example: if supp at origIdx 5 appears, and required section ordinal=6 exists
  // at origIdx 2 (before the supp) and ordinal=3 exists at origIdx 8 (after),
  // the supp goes "before ordinal 3" in the output.
  //
  // Subtlety: we want supps to stay close to editorial content that anchored
  // them. So "next required AFTER this supp in source" is the right anchor.
  const suppAnchor = new Map() // ordinal -> array of supp blocks to emit before that ordinal
  const trailingSupps = []

  for (const supp of supplementary) {
    // Find the next required section in SOURCE order whose originalIndex > supp.originalIndex
    let nextRequired = null
    for (const [, rb] of requiredBlocks) {
      if (rb.originalIndex > supp.originalIndex) {
        if (!nextRequired || rb.originalIndex < nextRequired.originalIndex) {
          nextRequired = rb
        }
      }
    }
    if (nextRequired) {
      const ord = nextRequired.section.pos
      if (!suppAnchor.has(ord)) suppAnchor.set(ord, [])
      suppAnchor.get(ord).push(supp)
    } else {
      trailingSupps.push(supp)
    }
  }

  // Emit in canonical order: for each ordinal 2-9, emit its anchored supps first,
  // then the required section (existing or stub).
  const out = []
  for (const section of spec) {
    // Anchored supps first (sorted by original order)
    const anchored = (suppAnchor.get(section.pos) || []).sort((a, b) => a.originalIndex - b.originalIndex)
    for (const s of anchored) {
      out.push(s.raw.trimEnd() + "\n")
    }
    // Then the required section
    const existing = requiredBlocks.get(section.pos)
    if (existing) {
      out.push(existing.raw.trimEnd() + "\n")
    } else {
      out.push(stubForSection(section, profileType))
    }
  }

  // Trailing supplementaries at the end
  trailingSupps.sort((a, b) => a.originalIndex - b.originalIndex)
  for (const s of trailingSupps) {
    out.push(s.raw.trimEnd() + "\n")
  }

  // Final body
  const newBody = preamble.trimEnd() + "\n\n" + out.join("\n").trimEnd() + "\n"
  return newBody
}

// ─── Parse profile + roundtrip ──────────────────────────────────────

function parseProfile(filePath) {
  const text = fs.readFileSync(filePath, "utf-8")
  const m = text.match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/)
  if (!m) return { err: "no frontmatter" }
  const fmText = m[1]
  const fmBody = text.slice(fmText.length - text.indexOf("---\n---") /* unused */)
  // Simpler: split on first "---\n" after the opening
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!fmMatch) return { err: "no frontmatter" }
  let fm
  try { fm = yaml.load(fmMatch[1]) || {} } catch (e) { return { err: `yaml: ${e.message.split("\n")[0]}` } }
  return { frontmatterText: `---\n${fmMatch[1]}\n---\n`, fm, body: fmMatch[2], raw: text }
}

function processFile(filePath, { write = false } = {}) {
  const parsed = parseProfile(filePath)
  if (parsed.err) return { file: filePath, err: parsed.err }

  const type = String(parsed.fm.type ?? "")
  if (!VERIFIED_TYPES.has(type)) {
    return { file: filePath, skipped: true, reason: `type "${type}" not subject to template` }
  }
  if (parsed.fm["claim-object"] === true || parsed.fm["editor-vouched"] === true) {
    return { file: filePath, skipped: true, reason: "claim-object or editor-vouched (exempt)" }
  }

  const newBody = reshape(parsed.body, type)
  const newText = parsed.frontmatterText + newBody

  if (newText === parsed.raw) {
    return { file: filePath, unchanged: true }
  }

  if (write) {
    // Write a .before backup first
    const backupDir = path.join(path.dirname(filePath), ".template-backup")
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    const backupPath = path.join(backupDir, path.basename(filePath) + ".before")
    fs.writeFileSync(backupPath, parsed.raw)
    fs.writeFileSync(filePath, newText)
  }

  // Count what changed: how many sections exist before vs after
  const { blocks: beforeBlocks } = splitIntoBlocks(parsed.body)
  const { blocks: afterBlocks } = splitIntoBlocks(newBody)
  const sectionsAdded = afterBlocks.length - beforeBlocks.length

  return {
    file: filePath,
    changed: true,
    sectionsBefore: beforeBlocks.length,
    sectionsAfter: afterBlocks.length,
    sectionsAdded,
  }
}

// ─── Launch 50 runner ───────────────────────────────────────────────

function findLaunch50Paths() {
  const auditPath = path.join(ROOT, "content/Admin Notes/launch-50-audit.json")
  if (!fs.existsSync(auditPath)) return []
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf-8"))
  const all = [...audit.politicians, ...audit.donors, ...audit.corporations]
  return all.filter((r) => r.file && !r.missing && !r.err).map((r) => path.join(ROOT, r.file))
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const write = args.includes("--write")
  const launch50 = args.includes("--launch-50")
  const target = args.find((a) => !a.startsWith("--"))

  let files = []
  if (launch50) {
    files = findLaunch50Paths()
  } else if (target) {
    files = [path.isAbsolute(target) ? target : path.join(ROOT, target)]
  } else {
    console.error("Usage:")
    console.error("  node scripts/profile-template-generator.cjs <path> [--write]")
    console.error("  node scripts/profile-template-generator.cjs --launch-50 [--write]")
    process.exit(1)
  }

  let changed = 0, unchanged = 0, skipped = 0, errors = 0
  const changes = []

  for (const f of files) {
    const result = processFile(f, { write })
    if (result.err) {
      console.log(`✗ ${path.relative(ROOT, f)}: ${result.err}`)
      errors++
    } else if (result.skipped) {
      skipped++
    } else if (result.unchanged) {
      unchanged++
    } else {
      changes.push(result)
      changed++
    }
  }

  console.log()
  console.log("─".repeat(80))
  console.log(`${write ? "WRITE MODE" : "DRY RUN"} — ${files.length} files processed`)
  console.log(`  Changed:   ${changed}`)
  console.log(`  Unchanged: ${unchanged}`)
  console.log(`  Skipped:   ${skipped}`)
  console.log(`  Errors:    ${errors}`)
  console.log()
  if (changes.length > 0) {
    console.log("Per-file changes:")
    for (const c of changes) {
      console.log(`  ${path.relative(ROOT, c.file).replace(/\\/g, "/")} — ${c.sectionsBefore} sections → ${c.sectionsAfter} (+${c.sectionsAdded})`)
    }
  }
  if (write && changed > 0) {
    console.log()
    console.log(`Backups in: <profile-dir>/.template-backup/`)
  } else if (!write && changed > 0) {
    console.log()
    console.log("Re-run with --write to apply changes.")
  }
}

main()
