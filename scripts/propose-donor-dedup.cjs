#!/usr/bin/env node
/**
 * propose-donor-dedup.cjs
 *
 * Scans data/relationships.jsonl for likely-duplicate donor/entity names
 * and writes a CSV proposal to content/Admin Notes/donor-dedup-mapping.csv
 * for David to review.
 *
 * Dedup signals (in confidence order):
 *   1. Identical after lowercase + punctuation strip (e.g. "AB PAC" / "Ab Pac")
 *   2. Identical after normalizing common suffix variants (INC, INC., LLC)
 *   3. FEC committee-name match across different spellings (via fec-committee-registry.json)
 *
 * The CSV is REVIEW-ONLY output. A second pass script (not written yet)
 * will apply approved merges to data/relationships.jsonl via the
 * canonical store helpers.
 *
 * Usage:
 *   node scripts/propose-donor-dedup.cjs
 */
const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const EDGES = path.join(ROOT, "data", "relationships.jsonl")
const REGISTRY = path.join(ROOT, "data", "fec-committee-registry.json")
const OUT = path.join(ROOT, "content", "Admin Notes", "donor-dedup-mapping.csv")

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/[.,'"!?]/g, "")
    .replace(/\b(inc|llc|corp|corporation|company|co|ltd)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function main() {
  const lines = fs.readFileSync(EDGES, "utf-8").split("\n").filter(Boolean)
  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf-8"))

  // Count occurrences + dollar totals per raw name on the `from` side of
  // monetary edges (the donor). Only look at donor-shaped entries.
  const rawByName = new Map() // raw name -> { count, total, types: Set }
  for (const line of lines) {
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.status !== "active") continue
    if (e.type !== "monetary") continue
    const name = e.from
    if (!name) continue
    if (!rawByName.has(name)) rawByName.set(name, { count: 0, total: 0 })
    const r = rawByName.get(name)
    r.count += 1
    r.total += Number(e.amount) || 0
  }

  // Group by normalized key
  const groups = new Map() // normalized -> [{ name, count, total }]
  for (const [name, stats] of rawByName) {
    const key = normalize(name)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push({ name, ...stats })
  }

  // Keep only groups with >= 2 variants (actual duplicates)
  const duplicates = []
  for (const [key, members] of groups) {
    if (members.length < 2) continue
    members.sort((a, b) => b.total - a.total)
    duplicates.push({ key, members })
  }

  // Cross-check against FEC registry: see if any of the raw names
  // (uppercased) match an fec_name — if so, that's strong evidence they're
  // the same committee.
  const fecNameToId = new Map()
  for (const cmte of Object.values(registry)) {
    const n = normalize(cmte.fec_name || "")
    if (n) fecNameToId.set(n, cmte.committee_id)
  }

  // Sort groups by total $ involved (biggest first — review priority)
  duplicates.sort((a, b) => {
    const at = a.members.reduce((s, m) => s + m.total, 0)
    const bt = b.members.reduce((s, m) => s + m.total, 0)
    return bt - at
  })

  // Emit CSV
  const rows = []
  rows.push("canonical,variants,total_amount,edge_count,fec_id,evidence,approve_yn")
  for (const g of duplicates) {
    const canonical = g.members[0].name // highest-total variant = proposed canonical
    const variants = g.members.slice(1).map((m) => m.name).join(" | ")
    const total = g.members.reduce((s, m) => s + m.total, 0)
    const count = g.members.reduce((s, m) => s + m.count, 0)
    const fecId = fecNameToId.get(g.key) || ""
    const evidenceBits = []
    const casesDiffer = g.members.some((m, i) => i > 0 && m.name.toLowerCase() === g.members[0].name.toLowerCase())
    if (casesDiffer) evidenceBits.push("casing only")
    if (fecId) evidenceBits.push("FEC ID " + fecId)
    if (!evidenceBits.length) evidenceBits.push("punctuation/suffix normalized")
    const evidence = evidenceBits.join("; ")
    const csvCell = (s) => (String(s).includes(",") || String(s).includes('"')) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s)
    rows.push([csvCell(canonical), csvCell(variants), total, count, csvCell(fecId), csvCell(evidence), ""].join(","))
  }

  fs.writeFileSync(OUT, rows.join("\n") + "\n", "utf-8")
  console.log(`Wrote ${duplicates.length} proposed merges to ${path.relative(ROOT, OUT)}`)
  console.log(`Top 10 by dollar impact:`)
  duplicates.slice(0, 10).forEach((g) => {
    const total = g.members.reduce((s, m) => s + m.total, 0)
    console.log(`  $${total.toLocaleString().padStart(14)}  ${g.members[0].name} <- ${g.members.slice(1).map((m) => m.name).join(" | ")}`)
  })
}

main()
