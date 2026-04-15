#!/usr/bin/env node
/**
 * apply-fec-committee-registry.cjs — sync the FEC committee registry
 * to vault profile aliases.
 *
 * Reads data/fec-committee-registry.json. For every record with a
 * `vault_profile` and `status: mapped`, ensures the profile's
 * frontmatter `aliases:` field contains every alias in the registry
 * record. Idempotent — a re-run is a no-op if nothing changed.
 *
 * For records with `status: unmapped-needs-stub`, prints the total
 * count and recommends the `--propose-stubs` flag (future work) to
 * emit stub profile drafts.
 *
 * This script is the "apply" counterpart to the registry. The
 * resolver (fec-committee-resolver.cjs) writes authoritative FEC
 * metadata to the registry; this script propagates the mapping
 * decisions from the registry into the vault so `buildTitleIndex`
 * picks up the aliases and the next FEC body-table migration run
 * resolves more rows.
 *
 * Safety:
 *   - Dry-run by default
 *   - Only touches frontmatter `aliases:` field; preserves everything
 *     else byte-for-byte
 *   - Never creates or deletes profiles
 *   - Skips any profile whose frontmatter is unparseable
 *
 * Usage:
 *   node scripts/apply-fec-committee-registry.cjs          # dry-run
 *   node scripts/apply-fec-committee-registry.cjs --write  # apply
 */

const fs = require("fs")
const path = require("path")
const registry = require("./lib/fec-committee-registry.cjs")
const { buildTitleIndex } = require("./lib/relationship-edge-validator.cjs")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const WRITE = process.argv.includes("--write")

// Reuse the alias-block serializer logic from add-fec-pac-aliases.cjs
function parseFrontmatter(content) {
  const m = content.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/)
  if (!m) return null
  return { head: m[1], body: m[2], tail: m[3], endIndex: m[0].length }
}

function extractExistingAliases(fmBody) {
  const inline = fmBody.match(/^aliases:\s*\[([\s\S]*?)\]\s*$/m)
  if (inline) {
    const items = []
    const re = /"([^"]+)"|'([^']+)'/g
    let mm
    while ((mm = re.exec(inline[1])) !== null) items.push(mm[1] || mm[2])
    return { found: true, items, raw: inline[0] }
  }
  const blockStart = fmBody.match(/^aliases:\s*\n/m)
  if (blockStart) {
    const start = fmBody.indexOf(blockStart[0])
    const after = fmBody.slice(start + blockStart[0].length)
    const lines = []
    const entries = []
    for (const line of after.split("\n")) {
      if (/^\s*-\s+/.test(line)) {
        lines.push(line)
        const mm = line.match(/^\s*-\s+"([^"]+)"|^\s*-\s+'([^']+)'|^\s*-\s+(.+)$/)
        if (mm) entries.push(mm[1] || mm[2] || mm[3].trim())
      } else {
        break
      }
    }
    return { found: true, items: entries, raw: blockStart[0] + lines.join("\n") }
  }
  return { found: false, items: [], raw: null }
}

function serializeBlockAliases(items) {
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
  const finalList = [...merged].sort()
  const newAliasBlock = serializeBlockAliases(finalList)
  let newBody
  if (existing.found) newBody = fm.body.replace(existing.raw, newAliasBlock)
  else newBody = fm.body.trimEnd() + "\n" + newAliasBlock
  return {
    ok: true,
    changed: true,
    added,
    newContent: fm.head + newBody + fm.tail + content.slice(fm.endIndex),
  }
}

// ─── Main ────────────────────────────────────────────────────────
function main() {
  console.log("")
  console.log("═══ apply-fec-committee-registry ═══")
  console.log(`  mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  console.log("")

  registry.load()
  const s = registry.stats()
  console.log("  registry stats:")
  console.log(`    total:                 ${s.total}`)
  console.log(`    mapped:                ${s.mapped || 0}`)
  console.log(`    unmapped-needs-stub:   ${s["unmapped-needs-stub"] || 0}`)
  console.log(`    unmapped-needs-review: ${s["unmapped-needs-review"] || 0}`)
  console.log("")

  console.log("  building title index...")
  const idx = buildTitleIndex(CONTENT_DIR)
  console.log(`    ${idx.size} titles`)
  console.log("")

  const mapped = registry.all().filter((r) => r.status === "mapped" && r.vault_profile)
  console.log(`  ${mapped.length} mapped records to sync`)

  let profilesTouched = 0
  let aliasesAdded = 0
  const misses = []
  const changes = []

  // Group by vault_profile so a profile is only touched once per run
  const byProfile = new Map()
  for (const rec of mapped) {
    const key = rec.vault_profile
    if (!byProfile.has(key)) byProfile.set(key, new Set())
    for (const a of rec.aliases || []) byProfile.get(key).add(a)
    // Also add fec_name explicitly
    if (rec.fec_name) byProfile.get(key).add(rec.fec_name)
  }

  for (const [profileTitle, aliasSet] of byProfile.entries()) {
    const entry = idx.get(profileTitle)
    if (!entry) {
      misses.push(profileTitle)
      continue
    }
    const picked = Array.isArray(entry) ? entry[0] : entry
    if (picked.aliasOf) {
      misses.push(`${profileTitle} (is itself an alias → skipped)`)
      continue
    }
    const filePath = picked.path
    const content = fs.readFileSync(filePath, "utf-8")
    const result = updateAliases(content, [...aliasSet])
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
  for (const c of changes) {
    console.log(`    +${c.added}  ${path.relative(ROOT, c.filePath)}`)
  }
  if (misses.length) {
    console.log("")
    console.log("  Misses:")
    for (const m of misses.slice(0, 20)) console.log(`    ${m}`)
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
  if (s["unmapped-needs-stub"] > 0) {
    console.log(
      `  NOTE: ${s["unmapped-needs-stub"]} committees still need stub profiles.`
    )
    console.log("  Review data/fec-committee-registry.json entries with status: unmapped-needs-stub.")
  }
}

main()
