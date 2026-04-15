#!/usr/bin/env node
// entity-dedup-orphan-audit.cjs — find duplicates + orphans in entities.jsonl
//
// Purpose: the entity registry (data/entities.jsonl) is the canonical
// store for the Phase 2 class-tagging system. Drift over time produces:
//
//   1. Duplicate entities — "Joe Biden" vs "Joseph Biden", "Goldman
//      Sachs" vs "Goldman Sachs Group Inc", "Koch" vs "Koch Industries"
//   2. Orphan entities — registry records that no profile cites, either
//      because the profile was deleted, the entity was created by
//      mistake, or a name drift broke the link
//   3. Uncovered entities — profiles exist at the profile_path but
//      the entity has no corresponding profile (file deleted or path
//      drifted)
//
// This audit walks entities.jsonl and content/** and produces a
// triage report for each category.
//
// Output: content/Admin Notes/entity-dedup-orphan-audit.md
//
// Usage:
//   node scripts/entity-dedup-orphan-audit.cjs               # dry run
//   node scripts/entity-dedup-orphan-audit.cjs --write       # write report

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const CONTENT_DIR = path.join(ROOT, "content")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "entity-dedup-orphan-audit.md")

const WRITE = process.argv.includes("--write")

// ─── Load + walk ─────────────────────────────────────────────────────

function loadEntities() {
  const entities = []
  const p = path.join(DATA_DIR, "entities.jsonl")
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      entities.push(JSON.parse(line))
    } catch {}
  }
  return entities
}

function walk(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name.startsWith(".") || e.name === "Assets" || e.name === "Excalidraw") continue
      walk(p, out)
    } else if (e.name.endsWith(".md")) {
      out.push(p)
    }
  }
  return out
}

function buildCitationMap() {
  const files = walk(CONTENT_DIR)
  const byName = new Map()
  for (const f of files) {
    let content
    try {
      content = fs.readFileSync(f, "utf-8")
    } catch {
      continue
    }
    const visible = content.split(/^##+\s*Archived/im)[0] || content
    for (const m of visible.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      const key = m[1].trim().toLowerCase()
      byName.set(key, (byName.get(key) || 0) + 1)
    }
  }
  return byName
}

// ─── Name normalization for dedup detection ──────────────────────────
//
// Normalize names to catch common variations:
//   - Remove "Inc", "LLC", "Corp", "Corporation", "Company", "Group"
//   - Strip punctuation
//   - Lowercase
//   - Collapse whitespace
//   - Strip trailing parens and "(Redirect)" markers

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\(redirect\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(inc|llc|corp|corporation|company|group|co|ltd)\b\.?/g, "")
    .replace(/[^\w\s&-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Also generate a "key" that strips even more: just first significant word
function keyFirstWord(name) {
  const n = normalizeName(name)
  const words = n.split(/\s+/).filter((w) => w.length > 2)
  return words.slice(0, 2).join(" ")
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ entity-dedup-orphan-audit ═══")
  console.log("")

  const entities = loadEntities()
  console.log(`  ${entities.length} entities loaded`)

  const citations = buildCitationMap()
  console.log(`  ${citations.size} unique wikilinks across vault`)
  console.log("")

  // ─── Duplicate detection ───────────────────────────────────────────
  const byNormalized = new Map()
  for (const e of entities) {
    if (!e.name) continue
    const key = normalizeName(e.name)
    if (!key) continue
    if (!byNormalized.has(key)) byNormalized.set(key, [])
    byNormalized.get(key).push(e)
  }

  const duplicates = [...byNormalized.entries()].filter(([, arr]) => arr.length > 1)
  duplicates.sort((a, b) => b[1].length - a[1].length)
  console.log(`  ${duplicates.length} duplicate groups (after normalization)`)
  const totalDupes = duplicates.reduce((s, [, arr]) => s + arr.length - 1, 0)
  console.log(`  ${totalDupes} redundant entity records would merge into primaries`)
  console.log("")

  // ─── Orphan detection ──────────────────────────────────────────────
  //
  // An entity is a "true orphan" if NO wikilink anywhere in the vault
  // resolves to it, even after trying common name fixups:
  //
  //   1. Exact name match on lowercased entity name
  //   2. Strip "Master Profile" / "Comprehensive Profile" suffixes
  //   3. Take the profile_path basename (without `_` prefix, .md ext,
  //      and " Master Profile" / " Profile" suffix)
  //
  // If none of those variants appear as a wikilink target, it's a real
  // orphan. If one matches, it's a NAME MISMATCH — the entity exists
  // but its `name` field drifts from how the rest of the vault refers
  // to it. Name mismatches break the class-tag lookup pipeline and
  // should be fixed by updating entities.jsonl.

  function nameVariants(entity) {
    const variants = new Set()
    if (entity.name) {
      variants.add(entity.name.toLowerCase())
      // Strip common suffixes
      variants.add(
        entity.name
          .toLowerCase()
          .replace(/\s+master profile$/i, "")
          .replace(/\s+comprehensive\s+.*profile.*$/i, "")
          .replace(/\s+profile$/i, "")
          .trim(),
      )
    }
    if (entity.profile_path) {
      const base = path
        .basename(entity.profile_path, ".md")
        .replace(/^_/, "")
        .replace(/\s*master profile$/i, "")
        .replace(/\s*profile$/i, "")
        .trim()
      if (base) variants.add(base.toLowerCase())
    }
    variants.delete("")
    return variants
  }

  const trueOrphans = []
  const nameMismatches = []
  for (const e of entities) {
    if (!e.name) continue
    const variants = nameVariants(e)
    let matched = false
    for (const v of variants) {
      if (citations.has(v) && citations.get(v) > 0) {
        matched = true
        break
      }
    }
    if (matched) {
      // Entity is findable via variant → if the primary name doesn't match,
      // it's a name mismatch we should fix
      if (!citations.has(e.name.toLowerCase())) {
        nameMismatches.push({
          id: e.id,
          current_name: e.name,
          matched_variant: [...variants].find((v) => citations.has(v)),
          profile_path: e.profile_path,
        })
      }
    } else {
      trueOrphans.push(e)
    }
  }

  console.log(`  ${nameMismatches.length} name-mismatches (entity findable via variant)`)
  console.log(`  ${trueOrphans.length} true orphans (no wikilink variant matches)`)

  // Separate "redirect" / placeholder entities from true orphans
  const redirectOrphans = trueOrphans.filter(
    (e) => /redirect/i.test(e.name) || /redirect/i.test(e.signals?.body_snippet || ""),
  )
  const genuineOrphans = trueOrphans.filter((e) => !redirectOrphans.includes(e))
  console.log(`    ${redirectOrphans.length} redirect/placeholder orphans (expected)`)
  console.log(`    ${genuineOrphans.length} genuine orphans (worth investigating)`)
  console.log("")

  // ─── Missing profile files ─────────────────────────────────────────
  // entities.jsonl lists profile_path for each. Check which paths exist.
  let missingFiles = 0
  const missingList = []
  for (const e of entities) {
    if (!e.profile_path) continue
    const abs = path.join(ROOT, e.profile_path)
    if (!fs.existsSync(abs)) {
      missingFiles++
      missingList.push({ id: e.id, name: e.name, profile_path: e.profile_path })
    }
  }
  console.log(`  ${missingFiles} entities reference missing profile files`)
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to generate the report")
    return
  }

  // ─── Write report ──────────────────────────────────────────────────
  const lines = []
  lines.push("---")
  lines.push('title: "Entity Dedup + Orphan Audit"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/entity-dedup-orphan-audit.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Entity Dedup + Orphan Audit")
  lines.push("")
  lines.push(
    "Three-way audit of `data/entities.jsonl`: (1) probable duplicate records after name normalization, (2) orphan entities with no inbound wikilinks, (3) entities whose `profile_path` points at a missing file.",
  )
  lines.push("")
  lines.push("## Summary")
  lines.push("")
  lines.push(`- **Total entities:** ${entities.length}`)
  lines.push(`- **Probable duplicate groups:** ${duplicates.length} (${totalDupes} records would merge)`)
  lines.push(`- **Name mismatches:** ${nameMismatches.length} (entity findable via a variant but primary name drifts)`)
  lines.push(`- **True orphans:** ${trueOrphans.length}`)
  lines.push(`  - **Redirect/placeholder:** ${redirectOrphans.length} (expected)`)
  lines.push(`  - **Genuine:** ${genuineOrphans.length} (worth investigating)`)
  lines.push(`- **Missing profile files:** ${missingFiles}`)
  lines.push("")

  // ─── Duplicates section ─────────────────────────────────────────
  if (duplicates.length) {
    lines.push(`## Probable duplicates (${duplicates.length} groups)`)
    lines.push("")
    lines.push(
      "Name normalization strips corporate suffixes (Inc/LLC/Corp/etc.), parenthetical notes, and punctuation. These groups share the same normalized key. False positives happen — review each group before merging. The **dedup action** is: pick a canonical entity, update all inbound wikilinks + relationship edges to reference its name, then delete the redundant records.",
    )
    lines.push("")
    lines.push("| Normalized key | Count | IDs + names |")
    lines.push("|---|---:|---|")
    for (const [key, arr] of duplicates.slice(0, 100)) {
      const label = arr.map((e) => `${e.id}:${e.name}`).join(" / ")
      lines.push(`| \`${key}\` | ${arr.length} | ${label.slice(0, 200)} |`)
    }
    if (duplicates.length > 100) {
      lines.push(`| … +${duplicates.length - 100} more groups | | |`)
    }
    lines.push("")
  }

  // ─── Name mismatches section ────────────────────────────────────
  if (nameMismatches.length) {
    lines.push(`## Name mismatches (${nameMismatches.length})`)
    lines.push("")
    lines.push(
      "Entity's `name` field in `data/entities.jsonl` doesn't match how the rest of the vault refers to it via `[[wikilinks]]`, but a name variant (stripping 'Master Profile', 'Profile', or using the file basename) does match. **These break the class-tag lookup pipeline** — scripts looking up by `e.name` will miss these entities even though they're the right entity.",
    )
    lines.push("")
    lines.push(
      "**Fix:** update `entities.jsonl` to set `name` to the variant that matches wikilinks. A migration script should batch this.",
    )
    lines.push("")
    lines.push("| ID | Current name | Matched variant |")
    lines.push("|---|---|---|")
    for (const m of nameMismatches.slice(0, 100)) {
      lines.push(`| \`${m.id}\` | ${m.current_name} | ${m.matched_variant} |`)
    }
    if (nameMismatches.length > 100) {
      lines.push(`| … +${nameMismatches.length - 100} more | | |`)
    }
    lines.push("")
  }

  // ─── Genuine orphans section ────────────────────────────────────
  if (genuineOrphans.length) {
    lines.push(`## Genuine orphans (${genuineOrphans.length})`)
    lines.push("")
    lines.push(
      "Entities in the registry that no vault file wikilinks to. Either the entity should be deleted, the profile file should be wikilinked from other profiles, or there's a name mismatch between the entity record and the wikilink text.",
    )
    lines.push("")
    lines.push("| Entity | ID | Profile path |")
    lines.push("|---|---|---|")
    for (const e of genuineOrphans.slice(0, 100)) {
      lines.push(`| ${e.name} | \`${e.id}\` | ${e.profile_path || "—"} |`)
    }
    if (genuineOrphans.length > 100) {
      lines.push(`| … +${genuineOrphans.length - 100} more | | |`)
    }
    lines.push("")
  }

  // ─── Missing profile files section ───────────────────────────────
  if (missingList.length) {
    lines.push(`## Missing profile files (${missingList.length})`)
    lines.push("")
    lines.push(
      "Entity records that reference a `profile_path` which doesn't exist on disk. Either the profile was deleted (and the entity should be deleted too), or the profile was renamed (and the entity's profile_path needs updating).",
    )
    lines.push("")
    lines.push("| Entity | ID | Missing path |")
    lines.push("|---|---|---|")
    for (const e of missingList.slice(0, 100)) {
      lines.push(`| ${e.name} | \`${e.id}\` | ${e.profile_path} |`)
    }
    if (missingList.length > 100) {
      lines.push(`| … +${missingList.length - 100} more | | |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/entity-dedup-orphan-audit.cjs --write`. Re-run after each cleanup batch to see progress.*",
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
}

main()
