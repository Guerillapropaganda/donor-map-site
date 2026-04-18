#!/usr/bin/env node
/**
 * apply-donor-dedup.cjs
 *
 * Reads content/Admin Notes/donor-dedup-mapping.csv. For every row where
 * approve_yn = y, rewrites all matching `from` / `to` name occurrences in
 * data/relationships.jsonl to the canonical name. Writes atomically.
 *
 * Collapses rule:
 *   - Edge IDs stay intact — this is a name normalization, not a content
 *     merge. If two edges end up with identical (from, to, type, cycle)
 *     after rename, the one with the larger amount wins and the other is
 *     marked status='deprecated' (preserved for audit trail per the
 *     deprecate-don't-delete pattern used elsewhere in the store).
 *
 * Usage:
 *   node scripts/apply-donor-dedup.cjs           # dry run
 *   node scripts/apply-donor-dedup.cjs --write   # apply
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const EDGES = path.join(ROOT, "data", "relationships.jsonl")
const MAPPING = path.join(ROOT, "content", "Admin Notes", "donor-dedup-mapping.csv")
const WRITE = process.argv.includes("--write")

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuote = false
      else cur += c
    } else {
      if (c === ',') { out.push(cur); cur = "" }
      else if (c === '"') inQuote = true
      else cur += c
    }
  }
  out.push(cur)
  return out
}

function main() {
  const csvLines = fs.readFileSync(MAPPING, "utf-8").split("\n").filter((l) => l.trim())
  const header = parseCsvLine(csvLines[0])
  const col = (name) => header.indexOf(name)
  const iCanonical = col("canonical")
  const iVariants = col("variants")
  const iApprove = col("approve_yn")

  // Build variant-to-canonical rename map from approved rows only.
  const renameMap = new Map()
  let approvedCount = 0
  for (let i = 1; i < csvLines.length; i++) {
    const row = parseCsvLine(csvLines[i])
    if (row[iApprove] !== "y") continue
    approvedCount++
    const canonical = row[iCanonical]
    const variants = row[iVariants].split(" | ").map((s) => s.trim()).filter(Boolean)
    for (const v of variants) {
      if (v === canonical) continue
      if (renameMap.has(v) && renameMap.get(v) !== canonical) {
        console.warn(`  WARN: variant "${v}" maps to both "${renameMap.get(v)}" and "${canonical}" — keeping first`)
        continue
      }
      renameMap.set(v, canonical)
    }
  }
  console.log(`Approved rows: ${approvedCount}`)
  console.log(`Rename entries: ${renameMap.size}`)

  // Load edges, apply renames, detect post-rename duplicates.
  const rawLines = fs.readFileSync(EDGES, "utf-8").split("\n").filter(Boolean)
  const edges = rawLines.map((l) => JSON.parse(l))
  let renamedFrom = 0
  let renamedTo = 0
  for (const e of edges) {
    if (renameMap.has(e.from)) { e.from = renameMap.get(e.from); renamedFrom++ }
    if (renameMap.has(e.to))   { e.to   = renameMap.get(e.to);   renamedTo++ }
  }

  // Dupe detection: group active edges by (from, to, type, cycle). Within
  // a group, keep the max-amount edge active and deprecate the rest.
  const groupKey = (e) => [e.from, e.to, e.type, e.cycle || ""].join("|")
  const groups = new Map()
  for (const e of edges) {
    if (e.status !== "active") continue
    const k = groupKey(e)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(e)
  }
  let deprecatedDupes = 0
  const nowIso = new Date().toISOString()
  for (const [k, group] of groups) {
    if (group.length < 2) continue
    group.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
    // Sum dropped amounts into the winner so no money is lost.
    const winner = group[0]
    const extra = group.slice(1).reduce((s, g) => s + (Number(g.amount) || 0), 0)
    if (extra > 0) winner.amount = (Number(winner.amount) || 0) + extra
    for (const loser of group.slice(1)) {
      loser.status = "deprecated"
      loser.last_verified = nowIso
      loser.evidence = [...(loser.evidence || []), `deprecated: merged into winning edge ${winner.id} after donor-dedup rename on ${nowIso}`]
      deprecatedDupes++
    }
  }

  console.log(`Renamed \`from\` fields: ${renamedFrom}`)
  console.log(`Renamed \`to\` fields: ${renamedTo}`)
  console.log(`Deprecated duplicate edges after rename: ${deprecatedDupes}`)

  if (!WRITE) {
    console.log(`\nDRY RUN — rerun with --write to apply.`)
    return
  }

  // Sort by id for stable git diff, write atomically.
  edges.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const body = edges.map((e) => JSON.stringify(e)).join("\n") + "\n"
  const tmp = `${EDGES}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, body, "utf-8")
  fs.renameSync(tmp, EDGES)
  console.log(`\nWrote ${edges.length} edges to ${path.relative(ROOT, EDGES)}`)
}

main()
