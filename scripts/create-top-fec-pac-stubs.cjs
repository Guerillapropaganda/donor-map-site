#!/usr/bin/env node
/**
 * create-top-fec-pac-stubs.cjs
 *
 * Creates frontmatter-only stub profiles for the top N super PACs sorted by
 * dollar volume in content/Admin Notes/fec-unmatched-committees.md that are
 * currently status=unmapped-needs-stub in data/fec-committee-registry.json.
 *
 * Output:
 *   - Stub profile at content/Donors & Power Networks/Super PACs/{title}.md
 *     with frontmatter title, aliases, fec-committee-id, source-tier,
 *     editorial-status=stub, content-readiness=raw.
 *   - Updates registry entry: vault_profile, vault_slug, status=mapped.
 *
 * Safe to re-run. Skips existing files.
 *
 * Usage:
 *   node scripts/create-top-fec-pac-stubs.cjs            # dry run (top 30)
 *   node scripts/create-top-fec-pac-stubs.cjs --write
 *   node scripts/create-top-fec-pac-stubs.cjs --write --top 40
 */

const fs = require("fs")
const path = require("path")

const argv = process.argv.slice(2)
const WRITE = argv.includes("--write")
const topIdx = argv.indexOf("--top")
const TOP_N = topIdx >= 0 ? parseInt(argv[topIdx + 1], 10) : 30

const REPO = path.resolve(__dirname, "..")
const SUPER_PACS_DIR = path.join(REPO, "content", "Donors & Power Networks", "Super PACs")
const REGISTRY_PATH = path.join(REPO, "data", "fec-committee-registry.json")
const UNMATCHED_PATH = path.join(REPO, "content", "Admin Notes", "fec-unmatched-committees.md")

// ─── Title Case helper ───────────────────────────────────────────────────
// FEC committee names are ALL-CAPS in source data. Strategy:
//   - Connectors stay lowercase (except when first token)
//   - Known acronyms/initialisms stay ALL-CAPS (explicit allowlist)
//   - Everything else → Title Case
const CONNECTORS = new Set(["of", "for", "the", "and", "a", "in", "on", "to", "or", "by", "as", "at"])
// Acronyms common in FEC/political committee names. Matched case-insensitively
// against each whitespace/hyphen-separated token.
const ACRONYMS = new Set([
  // Committee types
  "PAC", "PACs", "SPAC", "LLC", "INC", "LP", "LLP", "CO", "USA", "US",
  // Party committees
  "DCCC", "NRCC", "DSCC", "NRSC", "DNC", "RNC", "GOP", "DFL",
  // Labor
  "SEIU", "AFL", "CIO", "COPE", "AFT", "UFCW", "IBEW", "UAW", "NEA", "AFSCME", "UA",
  // Advocacy / ideological
  "NRA", "AIPAC", "UDP", "WFP", "CREW", "ACLU", "ADL", "NAACP", "NARAL",
  "LGBTQ", "LGBT", "CHC", "CBC", "CAPAC", "CHCI",
  // Known FEC committee shorts found in our data
  "VIGOP", "SLF", "AFCS", "AFP", "FOP", "BOLD", "SMART", "AFGE", "UFW",
  // Economic/industry
  "FEC", "SEC", "IRS", "DOJ", "DOD",
  // State abbreviations (2-letter USPS codes) - covers "PA", "WV", "NY", etc.
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
  "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
  "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
  "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
])
function titleCase(s) {
  return s
    .split(/(\s+|-)/)
    .map((tok, i) => {
      if (/^\s+$/.test(tok) || tok === "-") return tok
      const lower = tok.toLowerCase()
      const upper = tok.toUpperCase()
      // Connector: lowercase unless it's the first token
      if (CONNECTORS.has(lower) && i > 0) return lower
      // Known acronym (case-insensitive match)
      if (ACRONYMS.has(upper)) return upper
      // Digit-containing: keep digits, title-case letters around them
      if (/\d/.test(tok)) return tok.charAt(0) + tok.slice(1).toLowerCase()
      // Default: Title Case
      return tok.charAt(0).toUpperCase() + tok.slice(1).toLowerCase()
    })
    .join("")
}

function safeFilename(t) {
  // Strip Windows-forbidden chars, collapse whitespace, cap length at 100
  // to stay well under the 260-char PATH limit.
  const cleaned = t.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim()
  if (cleaned.length <= 100) return cleaned
  return cleaned.slice(0, 97).trimEnd() + "..."
}

// ─── Scan vault for existing fec-committee-id + alias claims ────────────
function scanExistingClaims() {
  const CONTENT = path.join(REPO, "content")
  const idClaims = new Map() // committee_id → profile path
  const aliasClaims = new Map() // UPPERCASE alias → profile path
  const titleClaims = new Map() // UPPERCASE title → profile path

  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name)
      if (e.isDirectory()) {
        walk(f)
        continue
      }
      if (!e.name.endsWith(".md")) continue
      const t = fs.readFileSync(f, "utf-8")
      const fmMatch = t.match(/^---\n([\s\S]*?)\n---/)
      if (!fmMatch) continue
      const fm = fmMatch[1]
      const rel = path.relative(REPO, f).replace(/\\/g, "/")

      const idM = fm.match(/^fec-committee-id:\s*"?([^"\n]+?)"?\s*$/m)
      if (idM) idClaims.set(idM[1].trim(), rel)

      const titleM = fm.match(/^title:\s*"?([^"\n]+?)"?\s*$/m)
      if (titleM) titleClaims.set(titleM[1].trim().toUpperCase(), rel)

      // Parse aliases list: "aliases:\n  - foo\n  - bar"
      const aliasBlock = fm.match(/^aliases:\s*\n((?:[ \t]+-.*\n?)+)/m)
      if (aliasBlock) {
        for (const line of aliasBlock[1].split("\n")) {
          const a = line.match(/^[ \t]+-\s*"?([^"\n]+?)"?\s*$/)
          if (a) aliasClaims.set(a[1].trim().toUpperCase(), rel)
        }
      }
    }
  }
  walk(CONTENT)
  return { idClaims, aliasClaims, titleClaims }
}

// ─── Parse unmatched committees markdown → dollar-sorted list ────────────
function parseUnmatched() {
  const md = fs.readFileSync(UNMATCHED_PATH, "utf-8")
  const rows = []
  for (const line of md.split("\n")) {
    if (!line.startsWith("|")) continue
    if (line.startsWith("|---")) continue
    if (line.includes("Committee |")) continue
    const parts = line.split("|").map((s) => s.trim())
    if (parts.length < 6) continue
    const name = parts[1]
    if (!name) continue
    const support = parseInt(parts[3].replace(/[^0-9]/g, ""), 10) || 0
    const oppose = parseInt(parts[4].replace(/[^0-9]/g, ""), 10) || 0
    const total = support + oppose
    if (total === 0) continue
    rows.push({ name, support, oppose, total })
  }
  rows.sort((a, b) => b.total - a.total)
  return rows
}

// ─── Build FEC name → registry record index ──────────────────────────────
function buildRegistryIndex(registry) {
  const byName = new Map()
  for (const rec of Object.values(registry)) {
    const names = new Set([rec.fec_name, ...(rec.aliases || [])])
    for (const n of names) {
      if (!n) continue
      byName.set(n.toUpperCase().trim(), rec)
    }
  }
  return byName
}

// ─── Stub body template (no em dashes, no banned AI vocab) ───────────────
function stubBody({ title, fecName, committeeId, committeeTypeFull, cycles }) {
  const today = new Date().toISOString().split("T")[0]
  const cyclesStr = cycles && cycles.length ? cycles.join(", ") : "unknown"
  return `---
title: ${JSON.stringify(title)}
type: donor
content-readiness: raw
editorial-status: stub
sector: "Political Committees"
entity-type: "PAC"
last-updated: ${today}
source-tier: 1
fec-committee-id: ${committeeId}
aliases:
  - ${JSON.stringify(fecName)}
known-gaps:
  - "Auto-created stub for FEC monetary edge resolution. Full editorial content is pending. Research Claude will fill in donors, politicians funded, ideology, and class analysis."
---

## Auto-Created Stub

This profile was created by \`scripts/create-top-fec-pac-stubs.cjs\` on ${today}
so that independent-expenditure records from the FEC API referencing committee
"${fecName}" can resolve to a canonical vault profile.

It is a data placeholder only. Full editorial content including class analysis,
donor network, politicians funded, ideology, and transparency score is pending
from Research Claude.

### FEC committee record

- **FEC committee ID**: [${committeeId}](https://www.fec.gov/data/committee/${committeeId}/)
- **Committee type**: ${committeeTypeFull || "unknown"}
- **Active cycles**: ${cyclesStr}

### FEC aliases

This profile absorbs the following FEC-format committee name(s):

- \`${fecName}\`
`
}

// ─── Main ────────────────────────────────────────────────────────────────
function main() {
  console.log("")
  console.log("═══ create-top-fec-pac-stubs ═══")
  console.log(`  dry-run: ${!WRITE}`)
  console.log(`  top-N:   ${TOP_N}`)
  console.log("")

  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"))
  const byName = buildRegistryIndex(registry)
  const unmatched = parseUnmatched()
  const claims = scanExistingClaims()
  console.log(`  existing claims: ${claims.idClaims.size} committee-ids, ${claims.aliasClaims.size} aliases, ${claims.titleClaims.size} titles`)

  // Pick top N that map to unmapped-needs-stub records with a committee_id,
  // skipping any committee already claimed by an existing profile.
  const picks = []
  const registryHeals = [] // already-claimed committees that need registry status fix
  for (const row of unmatched) {
    const rec = byName.get(row.name.toUpperCase().trim())
    if (!rec) continue
    if (rec.status !== "unmapped-needs-stub") continue
    if (!rec.committee_id || rec.committee_id.startsWith("UNRESOLVED:")) continue

    // Collision check: id, FEC name as alias, or FEC name as title.
    const upperName = row.name.toUpperCase().trim()
    const idHit = claims.idClaims.get(rec.committee_id)
    const aliasHit = claims.aliasClaims.get(upperName)
    const titleHit = claims.titleClaims.get(upperName)
    const existing = idHit || aliasHit || titleHit
    if (existing) {
      registryHeals.push({ committee_id: rec.committee_id, vault_profile: existing, reason: idHit ? "id" : aliasHit ? "alias" : "title" })
      continue
    }

    picks.push({ row, rec })
    if (picks.length >= TOP_N) break
  }

  if (registryHeals.length) {
    console.log("")
    console.log(`  ${registryHeals.length} committees already have a profile (registry heal):`)
    for (const h of registryHeals) console.log(`    ~ ${h.committee_id} (${h.reason}) → ${h.vault_profile}`)
  }

  console.log(`  ${picks.length} committees selected for stub creation`)
  console.log("")

  let created = 0
  let skipped = 0
  const registryUpdates = []

  for (const { row, rec } of picks) {
    const fecName = row.name
    // Strip trailing parenthetical alias for cleaner title.
    const stripped = fecName.replace(/\s*\([^)]+\)\s*$/, "").trim()
    const title = titleCase(stripped)
    const filename = safeFilename(title) + ".md"
    const filePath = path.join(SUPER_PACS_DIR, filename)

    if (fs.existsSync(filePath)) {
      skipped++
      console.log(`  SKIP (exists) ${filename}`)
      continue
    }

    const body = stubBody({
      title,
      fecName,
      committeeId: rec.committee_id,
      committeeTypeFull: rec.committee_type_full,
      cycles: rec.cycles,
    })

    if (WRITE) {
      fs.writeFileSync(filePath, body, "utf-8")
      created++
      console.log(`  + ${filename}  [${rec.committee_id}]  $${row.total.toLocaleString()}`)
      registryUpdates.push({
        committee_id: rec.committee_id,
        vault_profile: path.relative(REPO, filePath).replace(/\\/g, "/"),
        vault_slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      })
    } else {
      console.log(`  [dry] ${filename}  [${rec.committee_id}]  $${row.total.toLocaleString()}`)
      created++
    }
  }

  // Update the registry with vault_profile + status=mapped for the ones we wrote
  // AND heal any pre-existing profile records the registry was out of sync on.
  if (WRITE) {
    const allUpdates = [
      ...registryUpdates,
      ...registryHeals.map((h) => ({
        committee_id: h.committee_id,
        vault_profile: h.vault_profile,
        vault_slug: path.basename(h.vault_profile, ".md").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      })),
    ]
    if (allUpdates.length) {
      for (const u of allUpdates) {
        const rec = registry[u.committee_id]
        if (!rec) continue
        rec.vault_profile = u.vault_profile
        rec.vault_slug = u.vault_slug
        rec.status = "mapped"
        rec.updated = new Date().toISOString()
      }
      fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf-8")
      console.log("")
      console.log(`  registry: ${registryUpdates.length} new mapped, ${registryHeals.length} healed → status=mapped`)
    }
  }

  console.log("")
  console.log(`═══ done — created: ${created}  skipped: ${skipped} ═══`)
  if (!WRITE) console.log("  DRY RUN — re-run with --write to persist.")
}

main()
