#!/usr/bin/env node
/**
 * add-fec-pac-aliases.cjs — add FEC-committee-format aliases to vault
 * profiles so the FEC body-table migration can resolve more donor rows.
 *
 * Pillar 2b.2 fix for the 30% match rate problem.
 *
 * The FEC summary pipeline emits committee names in FEC canonical form
 * (ALL CAPS, with PAC / ACTION FUND / POLITICAL VICTORY FUND suffixes).
 * Our vault profiles carry the parent-organization title in normal case
 * without the PAC suffix. The `buildTitleIndex` walker already reads
 * `aliases:` frontmatter as weaker index entries — this script just
 * populates that field with known FEC committee variants.
 *
 * Mapping is HAND-CURATED below. Rules:
 *   - Only include a committee if we're ≥95% confident it's the parent
 *     organization's own committee (no wild 501(c)(4)/501(c)(3) gray
 *     area — misattribution on dollar amounts is high-cost)
 *   - Prefer multiple variants per committee where the FEC data has
 *     spelling drift (punctuation, DBAs, etc.)
 *   - Don't add an alias if the vault already has the exact string
 *     as its own title or as an existing alias
 *
 * Safety:
 *   - Dry-run by default; --write applies
 *   - Only touches frontmatter's `aliases:` field, preserves everything
 *     else byte-for-byte
 *   - Skips any profile whose frontmatter we can't cleanly parse
 *   - Reports what it would change
 *
 * After running this, re-run migrate-fec-body-tables-to-edges.cjs --write
 * to pick up the new matches.
 */

const fs = require("fs")
const path = require("path")
const { buildTitleIndex } = require("./lib/relationship-edge-validator.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")

const WRITE = process.argv.includes("--write")

// ─── Curated mapping ────────────────────────────────────────────────
// Vault profile title → array of FEC committee aliases to add
const MAPPING = {
  "Club for Growth": ["CLUB FOR GROWTH ACTION"],
  "Americans for Prosperity": [
    "AMERICANS FOR PROSPERITY ACTION, INC. (AFP ACTION) DBA CVA ACTION AND DBA LIBRE ACTION",
    "AMERICANS FOR PROSPERITY ACTION, INC.(AFP ACTION)",
    "AMERICANS FOR PROSPERITY ACTION",
    "AFP ACTION",
  ],
  "Senate Majority PAC": ["SMP"],
  "NRCC - National Republican Congressional Committee": [
    "NRCC",
    "NATIONAL REPUBLICAN CONGRESSIONAL COMMITTEE",
  ],
  "NRSC - National Republican Senatorial Committee": [
    "NRSC",
    "NATIONAL REPUBLICAN SENATORIAL COMMITTEE",
  ],
  "DCCC - Democratic Congressional Campaign Committee": [
    "DCCC",
    "DEMOCRATIC CONGRESSIONAL CAMPAIGN COMMITTEE",
  ],
  "DSCC - Democratic Senatorial Campaign Committee": [
    "DSCC",
    "DEMOCRATIC SENATORIAL CAMPAIGN COMMITTEE",
  ],
  "National Rifle Association": [
    "NATIONAL RIFLE ASSOCIATION OF AMERICA POLITICAL VICTORY FUND",
    "NRA POLITICAL VICTORY FUND",
  ],
  "National Association of Realtors": [
    "NATIONAL ASSOCIATION OF REALTORS POLITICAL ACTION COMMITTEE",
  ],
  "Everytown for Gun Safety": ["EVERYTOWN FOR GUN SAFETY ACTION FUND"],
  "Susan B. Anthony Pro-Life America PAC": [
    "SUSAN B ANTHONY LIST INC",
    "SUSAN B. ANTHONY LIST",
    "SBA LIST",
    "SBA LIST PAC",
  ],
  "League of Conservation Voters": [
    "LEAGUE OF CONSERVATION VOTERS ACTION FUND",
    "LCV VICTORY FUND",
  ],
  "CREW - Citizens for Responsibility and Ethics in Washington": [
    "CREW",
    "CITIZENS FOR RESPONSIBILITY AND ETHICS IN WASHINGTON",
  ],
  "Fairshake PAC": ["FF PAC", "FAIRSHAKE"],
}

// ─── Frontmatter editing ────────────────────────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/)
  if (!m) return null
  return { head: m[1], body: m[2], tail: m[3], endIndex: m[0].length }
}

function extractExistingAliases(fmBody) {
  // Find the aliases: line/block
  // Two forms:
  //   aliases: ["foo", "bar"]      (inline)
  //   aliases:
  //     - "foo"
  //     - "bar"                    (block)
  const inline = fmBody.match(/^aliases:\s*\[([\s\S]*?)\]\s*$/m)
  if (inline) {
    const inner = inline[1]
    const items = []
    const re = /"([^"]+)"|'([^']+)'/g
    let mm
    while ((mm = re.exec(inner)) !== null) {
      items.push(mm[1] || mm[2])
    }
    return { found: true, kind: "inline", items, raw: inline[0] }
  }
  const blockStart = fmBody.match(/^aliases:\s*\n/m)
  if (blockStart) {
    const start = fmBody.indexOf(blockStart[0])
    const after = fmBody.slice(start + blockStart[0].length)
    const lines = []
    const entries = []
    let consumed = 0
    for (const line of after.split("\n")) {
      if (/^\s*-\s+/.test(line)) {
        lines.push(line)
        consumed += line.length + 1
        const mm = line.match(/^\s*-\s+"([^"]+)"|^\s*-\s+'([^']+)'|^\s*-\s+(.+)$/)
        if (mm) entries.push(mm[1] || mm[2] || mm[3].trim())
      } else {
        break
      }
    }
    return {
      found: true,
      kind: "block",
      items: entries,
      raw: blockStart[0] + lines.join("\n"),
    }
  }
  return { found: false, kind: null, items: [], raw: null }
}

function serializeBlockAliases(items) {
  // Always emit as block form for consistency with the rest of the vault
  const lines = items.map((a) => `  - "${a.replace(/"/g, '\\"')}"`)
  return "aliases:\n" + lines.join("\n")
}

function updateAliases(content, newAliases) {
  const fm = parseFrontmatter(content)
  if (!fm) return { ok: false, reason: "no-frontmatter" }
  const existing = extractExistingAliases(fm.body)
  const merged = new Set(existing.items)
  let added = 0
  for (const a of newAliases) {
    if (!merged.has(a)) {
      merged.add(a)
      added++
    }
  }
  if (added === 0) return { ok: true, changed: false, added: 0 }
  const finalList = [...merged]
  const newAliasBlock = serializeBlockAliases(finalList)

  let newBody
  if (existing.found) {
    newBody = fm.body.replace(existing.raw, newAliasBlock)
  } else {
    // Append right before the closing ---
    newBody = fm.body.trimEnd() + "\n" + newAliasBlock
  }
  const newFrontmatter = fm.head + newBody + fm.tail
  const rest = content.slice(fm.endIndex)
  return {
    ok: true,
    changed: true,
    added,
    newContent: newFrontmatter + rest,
  }
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ add-fec-pac-aliases ═══")
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")

  console.log("  building title index...")
  const idx = buildTitleIndex(CONTENT_DIR)
  console.log(`    ${idx.size} titles`)
  console.log("")

  let profilesTouched = 0
  let aliasesAdded = 0
  const misses = []
  const changes = []

  for (const [profileTitle, aliases] of Object.entries(MAPPING)) {
    const entry = idx.get(profileTitle)
    if (!entry) {
      misses.push(profileTitle)
      continue
    }
    const picked = Array.isArray(entry) ? entry[0] : entry
    if (picked.aliasOf) {
      // the index hit was itself an alias, not a real profile — skip
      misses.push(`${profileTitle} (index entry is alias to ${picked.aliasOf})`)
      continue
    }
    const filePath = picked.path
    const content = fs.readFileSync(filePath, "utf-8")
    const result = updateAliases(content, aliases)
    if (!result.ok) {
      misses.push(`${profileTitle}: ${result.reason}`)
      continue
    }
    if (!result.changed) continue
    profilesTouched++
    aliasesAdded += result.added
    changes.push({ filePath, profileTitle, added: result.added, newContent: result.newContent })
  }

  console.log(`  profiles touched:  ${profilesTouched}`)
  console.log(`  aliases to add:    ${aliasesAdded}`)
  console.log(`  misses:            ${misses.length}`)
  console.log("")
  console.log("  Changes:")
  for (const c of changes) {
    console.log(`    +${c.added}  ${path.relative(ROOT, c.filePath)}`)
  }
  if (misses.length) {
    console.log("")
    console.log("  Misses (profile title not found in vault index):")
    for (const m of misses) console.log(`    ${m}`)
  }
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to apply")
    return
  }

  for (const c of changes) {
    fs.writeFileSync(c.filePath, c.newContent, "utf-8")
  }
  console.log(`  ✓ wrote ${changes.length} profiles`)
  console.log("")
}

main()
