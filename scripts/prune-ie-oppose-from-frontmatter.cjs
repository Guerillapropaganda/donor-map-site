#!/usr/bin/env node
/**
 * prune-ie-oppose-from-frontmatter.cjs
 *
 * Removes names from each profile's frontmatter `donors` / `top-donors`
 * fields that only appear in the canonical edge store as role='ie-oppose'
 * (independent-expenditure OPPOSITION — super-PACs that spent AGAINST
 * the profile, not for it). These names were mis-classified into `donors`
 * by earlier runs of rebuild-relationship-caches.cjs before the role
 * filter was added.
 *
 * Safety:
 *   - If an entity has ANY non-ie-oppose monetary edge toward the profile
 *     (e.g. a small direct contribution in addition to the attack-ad
 *     spend), it is LEFT ALONE. We only prune names that are purely
 *     opposition.
 *   - Dry-run by default. Pass --write to apply.
 *
 * Usage:
 *   node scripts/prune-ie-oppose-from-frontmatter.cjs             # preview
 *   node scripts/prune-ie-oppose-from-frontmatter.cjs --write
 *   node scripts/prune-ie-oppose-from-frontmatter.cjs --profile "Donald Trump"
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const EDGES = path.join(ROOT, "data", "relationships.jsonl")
const CONTENT_DIR = path.join(ROOT, "content")

const WRITE = process.argv.includes("--write")
const profileArg = (() => {
  const i = process.argv.indexOf("--profile")
  return i >= 0 ? process.argv[i + 1] : null
})()

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    let stat
    try { stat = fs.statSync(full) } catch { continue }
    if (stat.isDirectory()) walk(full, acc)
    else if (name.endsWith(".md")) acc.push(full)
  }
  return acc
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const lines = m[1].split("\n")
  const fm = {}
  for (const line of lines) {
    const colonIdx = line.indexOf(":")
    if (colonIdx < 0) continue
    const key = line.slice(0, colonIdx).trim()
    let val = line.slice(colonIdx + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    fm[key] = val
  }
  return { fm, raw: m[1], headerLen: m[0].length }
}

function extractWikilinks(fieldValue) {
  if (!fieldValue || typeof fieldValue !== "string") return []
  const names = []
  const re = /\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]/g
  let m
  while ((m = re.exec(fieldValue)) !== null) names.push(m[1].trim())
  return names
}

function main() {
  console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}`)
  if (profileArg) console.log(`Filter: profile title contains "${profileArg}"`)
  console.log("")

  // Build per-target indices of monetary edges.
  //   legitByTarget: target-title-lower -> Set<from> that has >=1 non-ie-oppose monetary edge
  //   iAbsolutely only counts ie-oppose; intersection with legit below gives us the prune set.
  const raw = fs.readFileSync(EDGES, "utf-8").split("\n").filter(Boolean)
  const legitByTarget = new Map()
  const iOpposeByTarget = new Map()
  for (const line of raw) {
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.status !== "active") continue
    if (e.type !== "monetary") continue
    if (!e.from || !e.to) continue
    const key = e.to.toLowerCase()
    if (e.role === "ie-oppose") {
      if (!iOpposeByTarget.has(key)) iOpposeByTarget.set(key, new Set())
      iOpposeByTarget.get(key).add(e.from)
    } else {
      if (!legitByTarget.has(key)) legitByTarget.set(key, new Set())
      legitByTarget.get(key).add(e.from)
    }
  }

  // Walk profiles.
  const files = walk(CONTENT_DIR, [])
  let scanned = 0
  let touched = 0
  const changes = [] // [{ file, profile, removed: [...] }]

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8")
    const parsed = parseFrontmatter(content)
    if (!parsed) continue
    const { fm } = parsed
    const title = fm.title
    if (!title) continue
    if (profileArg && !title.toLowerCase().includes(profileArg.toLowerCase())) continue
    scanned++

    const titleLower = title.replace(/^_/, "").replace(/\s+Master Profile.*/i, "").trim().toLowerCase()
    const iOppose = iOpposeByTarget.get(titleLower)
    const legit = legitByTarget.get(titleLower) || new Set()
    if (!iOppose || iOppose.size === 0) continue

    const pruneSet = new Set([...iOppose].filter((name) => !legit.has(name)))
    if (pruneSet.size === 0) continue

    // Which frontmatter fields have wikilinks to these names?
    const fieldsToRewrite = []
    for (const field of ["donors", "top-donors"]) {
      const val = fm[field]
      if (!val) continue
      const names = extractWikilinks(val)
      const keep = names.filter((n) => !pruneSet.has(n))
      if (keep.length === names.length) continue
      fieldsToRewrite.push({ field, before: names, after: keep })
    }
    if (fieldsToRewrite.length === 0) continue

    touched++
    const removedNames = [...new Set(fieldsToRewrite.flatMap((f) => f.before.filter((n) => !f.after.includes(n))))]
    changes.push({
      file: path.relative(ROOT, file),
      profile: title,
      fields: fieldsToRewrite.map((f) => f.field),
      removed: removedNames,
    })

    if (!WRITE) continue

    // Rewrite the frontmatter in place — preserve the original line format.
    let newContent = content
    for (const { field, after } of fieldsToRewrite) {
      const newValue = after.map((n) => `[[${n}]]`).join(" · ")
      // Replace the line. Match the key at start of line, optional quotes, rest to newline.
      const re = new RegExp(`^(${field.replace(/-/g, "\\-")}:\\s*)(.*)\$`, "m")
      newContent = newContent.replace(re, (_match, prefix) => `${prefix}"${newValue}"`)
    }
    fs.writeFileSync(file, newContent, "utf-8")
  }

  console.log(`Scanned: ${scanned} profile${scanned === 1 ? "" : "s"}`)
  console.log(`Would prune: ${touched} profile${touched === 1 ? "" : "s"}`)
  console.log("")
  for (const c of changes.slice(0, 30)) {
    console.log(`  ${c.profile}`)
    console.log(`    fields: ${c.fields.join(", ")}`)
    console.log(`    removing: ${c.removed.join(", ")}`)
  }
  if (changes.length > 30) console.log(`  ... and ${changes.length - 30} more`)
  if (!WRITE) console.log(`\nDRY RUN — rerun with --write to apply.`)
  else console.log(`\nWrote changes to ${touched} file${touched === 1 ? "" : "s"}.`)
}

main()
