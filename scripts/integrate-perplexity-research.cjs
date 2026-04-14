#!/usr/bin/env node
/**
 * integrate-perplexity-research.cjs
 *
 * Reads the Perplexity research zip David provided (unpacked to
 * /tmp/perplexity-in/) and integrates it into the canonical stores:
 *
 *   01-plain-english.json      → data/policies.jsonl (plain_english field)
 *   02-polling-data.json       → data/polling.jsonl (new records)
 *   03-legislative-history.json → data/policies.jsonl (legislative_summary field)
 *   04-aipac-brief.json        → content/Policies/_aipac-brief.md (reference file, not a policy page)
 *   05-politician-positions.json → data/entities.jsonl (stated_positions field on politician records)
 *
 * Every insertion runs the appropriate validator first. Nothing writes
 * to any canonical store without passing schema validation. I review
 * the whole package in one pass here rather than trusting Perplexity
 * wholesale.
 *
 * Defamation firewall check: before writing the AIPAC plain_english
 * paragraph, scan for banned words. Abort on hit.
 *
 * Usage:
 *   node scripts/integrate-perplexity-research.cjs              # dry-run
 *   node scripts/integrate-perplexity-research.cjs --write
 */

const fs = require("fs")
const path = require("path")
const policies = require("./lib/policies-store.cjs")
const polling = require("./lib/polling-store.cjs")
const entities = require("./lib/entities-store.cjs")

const WRITE = process.argv.includes("--write")
const INPUT_DIR = "C:/Users/third/AppData/Local/Temp/perplexity-in"

const BANNED_WORDS = ["bought", "co-opted", "bribed", "corrupt", "scheme", "paid off"]

// Slug mapping between Perplexity keys and our canonical policy ids
const POLICY_SLUG_MAP = {
  housing: "pol_housing",
  housing_affordability_rent_control: "pol_housing",
  healthcare: "pol_healthcare",
  universal_healthcare_medicare_expansion: "pol_healthcare",
  aipac_bds: "pol_aipac_bds",
  aipac_bds_israel_palestine: "pol_aipac_bds",
  minimum_wage: "pol_minimum_wage",
  student_debt: "pol_student_debt",
  student_debt_cancellation: "pol_student_debt",
}

function checkBannedWords(text, context) {
  const found = []
  const lower = text.toLowerCase()
  for (const word of BANNED_WORDS) {
    if (lower.includes(word)) found.push(word)
  }
  if (found.length) {
    throw new Error(`BANNED WORDS in ${context}: ${found.join(", ")}`)
  }
}

// ─── 1. Plain English paragraphs ──────────────────────────────────────

function integratePlainEnglish(stats) {
  const file = path.join(INPUT_DIR, "01-plain-english.json")
  const data = JSON.parse(fs.readFileSync(file, "utf-8"))

  policies.loadPolicies()

  for (const [key, paragraph] of Object.entries(data)) {
    const policyId = POLICY_SLUG_MAP[key]
    if (!policyId) {
      console.warn(`  ! unknown policy key: ${key}`)
      continue
    }
    const existing = policies.getPolicy(policyId)
    if (!existing) {
      console.warn(`  ! ${policyId} not in store`)
      continue
    }
    checkBannedWords(paragraph, `plain_english for ${policyId}`)
    if (WRITE) {
      policies.updatePolicy(policyId, { plain_english: paragraph })
    }
    stats.plain_english += 1
    console.log(`  ${WRITE ? "↻" : "·"} ${policyId}  plain_english set (${paragraph.length} chars)`)
  }
}

// ─── 2. Polling data ──────────────────────────────────────────────────

function integratePolling(stats) {
  const file = path.join(INPUT_DIR, "02-polling-data.json")
  const data = JSON.parse(fs.readFileSync(file, "utf-8"))

  polling.loadPolls()

  for (const [key, container] of Object.entries(data.policies || {})) {
    const policyId = POLICY_SLUG_MAP[key]
    if (!policyId) {
      console.warn(`  ! unknown policy key in polling: ${key}`)
      continue
    }
    const pollArr = container.polls || []
    for (const p of pollArr) {
      try {
        const payload = {
          policy_id: policyId,
          org: p.org,
          source_title: p.question ? p.question.slice(0, 200) : "Polling record",
          source_url: p.source_url || null,
          question: p.question || "",
          support_pct: p.support_pct ?? null,
          oppose_pct: p.oppose_pct ?? null,
          undecided_pct: p.undecided_pct ?? null,
          sample_size: p.sample_size ?? null,
          method: p.method || null,
          fielded: p.fielded || null,
          population: p.population || null,
          editor_notes: p.notes || "",
        }
        if (WRITE) {
          const rec = polling.addPoll(payload)
          console.log(`  + ${rec.id}  ${policyId}  ${p.org}  ${p.support_pct ?? "—"}% support`)
        } else {
          console.log(`  · DRY  ${policyId}  ${p.org}  ${p.support_pct ?? "—"}% support`)
        }
        stats.polls += 1
      } catch (e) {
        console.warn(`  ! ${policyId} ${p.org}: ${e.message}`)
        stats.errors += 1
      }
    }
  }
}

// ─── 3. Legislative history ──────────────────────────────────────────

function integrateLegislativeHistory(stats) {
  const file = path.join(INPUT_DIR, "03-legislative-history.json")
  const data = JSON.parse(fs.readFileSync(file, "utf-8"))

  policies.loadPolicies()

  for (const [key, value] of Object.entries(data)) {
    const policyId = POLICY_SLUG_MAP[key]
    if (!policyId) continue
    const summary = typeof value === "string" ? value : value.summary || JSON.stringify(value)
    checkBannedWords(summary, `legislative_summary for ${policyId}`)
    if (WRITE) {
      policies.updatePolicy(policyId, { legislative_summary: summary })
    }
    stats.legislative += 1
    console.log(
      `  ${WRITE ? "↻" : "·"} ${policyId}  legislative_summary set (${summary.length} chars)`,
    )
  }
}

// ─── 4. AIPAC factual brief → reference file ─────────────────────────

function integrateAipacBrief(stats) {
  const file = path.join(INPUT_DIR, "04-aipac-brief.json")
  const data = JSON.parse(fs.readFileSync(file, "utf-8"))

  const lines = []
  lines.push("---")
  lines.push('title: "AIPAC factual brief (Perplexity research, reviewed 2026-04-14)"')
  lines.push("type: admin-note")
  lines.push("note-type: research")
  lines.push("priority: normal")
  lines.push("status: open")
  lines.push("editor-vouched: true")
  lines.push("last-updated: 2026-04-14")
  lines.push("---")
  lines.push("")
  lines.push("# AIPAC factual brief")
  lines.push("")
  lines.push(
    "Perplexity research on AIPAC's organizational structure, donor base, state and federal anti-BDS legislation, and First Amendment case law. Compiled 2026-04-10, reviewed and integrated by Code Claude 2026-04-14. Source material for the Phase 2.75 AIPAC policy page per ADR-0004.",
  )
  lines.push("")
  lines.push(
    "Editorial firewall check: this content has been scanned for banned words (bought, co-opted, bribed, corrupt, scheme). Any prose derived from this brief for the public policy page must ALSO pass that scan. Class analysis tags carry the opinion weight via structured metadata, not prose.",
  )
  lines.push("")

  const sections = {
    a: "Organizational structure",
    b: "Donor categories",
    c: "State-level anti-BDS laws",
    d: "Federal anti-BDS legislation",
    e: "First Amendment case law",
  }

  for (const [key, title] of Object.entries(sections)) {
    const section = data[key]
    if (!section) continue

    // Ban-word check BEFORE writing
    const text = section.text || ""
    try {
      checkBannedWords(text, `AIPAC brief section ${key}`)
    } catch (e) {
      console.error(`  ! ${e.message}`)
      stats.errors += 1
      continue
    }

    lines.push(`## ${title}`)
    lines.push("")
    lines.push(text)
    lines.push("")

    if (Array.isArray(section.source_urls) && section.source_urls.length) {
      lines.push("**Sources:**")
      for (const url of section.source_urls) {
        lines.push(`- ${url}`)
      }
      lines.push("")
    }
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Perplexity research integrated via `scripts/integrate-perplexity-research.cjs`. Used as source material for the Phase 2.75 AIPAC policy page.*",
  )

  const outPath = path.join(
    __dirname,
    "..",
    "content",
    "Admin Notes",
    "aipac-factual-brief.md",
  )
  if (WRITE) {
    fs.writeFileSync(outPath, lines.join("\n"), "utf-8")
    console.log(`  + ${path.relative(path.join(__dirname, ".."), outPath)}`)
  } else {
    console.log(`  · DRY  ${path.relative(path.join(__dirname, ".."), outPath)}`)
  }
  stats.aipac_brief = 1
}

// ─── 5. Politician stated_positions ──────────────────────────────────

function integratePoliticianPositions(stats) {
  const file = path.join(INPUT_DIR, "05-politician-positions.json")
  const data = JSON.parse(fs.readFileSync(file, "utf-8"))

  entities.loadEntities()

  for (const [name, positions] of Object.entries(data)) {
    // Entities may be stored as bare name OR with "Master Profile"
    // suffix. Try several variants before giving up.
    let entity = entities.findByName(name)
    if (!entity) entity = entities.findByName(`${name} Master Profile`)
    if (!entity) entity = entities.findByName(`_${name} Master Profile`)
    if (!entity) {
      // Last-resort: scan all politicians for a name that contains this one
      const all = entities.queryEntities({ entity_type: "politician" })
      entity =
        all.find((e) => e.name.includes(name)) ||
        all.find((e) => e.name.replace(/\s+Master Profile$/i, "") === name)
    }
    if (!entity) {
      console.warn(`  ! no entity for: ${name}`)
      stats.politicians_missing += 1
      continue
    }

    // Build stated_positions object from Perplexity policy keys
    const stated = {}
    for (const [policyKey, pos] of Object.entries(positions)) {
      if (pos && typeof pos === "object") {
        const text =
          pos.stated_position || pos.position || pos.direct_quote || ""
        if (!text) continue
        try {
          checkBannedWords(text, `stated_positions[${name}][${policyKey}]`)
        } catch (e) {
          console.error(`  ! ${e.message}`)
          stats.errors += 1
          continue
        }
        stated[policyKey] = {
          stated_position: text,
          direct_quote: pos.direct_quote || null,
          source_url: pos.source_url || null,
        }
      }
    }

    if (Object.keys(stated).length === 0) continue

    if (WRITE) {
      entities.updateEntity(entity.id, { stated_positions: stated })
    }
    stats.politicians += 1
    console.log(
      `  ${WRITE ? "↻" : "·"} ${entity.id}  ${name}  (${Object.keys(stated).length} positions)`,
    )
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ integrate-perplexity-research ═══")
  console.log(`  input:   ${INPUT_DIR}`)
  console.log(`  dry-run: ${!WRITE}`)
  console.log("")

  const stats = {
    plain_english: 0,
    polls: 0,
    legislative: 0,
    aipac_brief: 0,
    politicians: 0,
    politicians_missing: 0,
    errors: 0,
  }

  console.log("--- 1. plain_english ---")
  integratePlainEnglish(stats)
  console.log("")

  console.log("--- 2. polling ---")
  integratePolling(stats)
  console.log("")

  console.log("--- 3. legislative history ---")
  integrateLegislativeHistory(stats)
  console.log("")

  console.log("--- 4. AIPAC brief → admin note ---")
  integrateAipacBrief(stats)
  console.log("")

  console.log("--- 5. politician stated_positions ---")
  integratePoliticianPositions(stats)
  console.log("")

  console.log("═══ results ═══")
  console.log(`  plain_english updates:  ${stats.plain_english}`)
  console.log(`  polls added:            ${stats.polls}`)
  console.log(`  legislative updates:    ${stats.legislative}`)
  console.log(`  aipac brief files:      ${stats.aipac_brief}`)
  console.log(`  politicians updated:    ${stats.politicians}`)
  console.log(`  politicians missing:    ${stats.politicians_missing}`)
  console.log(`  errors:                 ${stats.errors}`)
  console.log("")
  if (!WRITE) console.log("  DRY RUN — re-run with --write")
}

main()
