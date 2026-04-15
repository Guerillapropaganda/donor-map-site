#!/usr/bin/env node
// class-tag-priority-queue.cjs — rank pending class tag proposals by citation count
//
// Purpose: David has pending heuristic-v1 proposals in
// data/entity-class-tags-proposed.jsonl. Approving them one-at-a-time
// is slow. This script reports WHICH pending entities are cited by the
// most profiles, so David can approve them in priority order —
// maximum profile-unblocking per approval.
//
// Output: content/Admin Notes/class-tag-priority-queue.md
//
// Algorithm:
//   1. Load data/entity-class-tags-proposed.jsonl. Filter to status: "pending".
//   2. Load data/entities.jsonl for profile_path + display name.
//   3. Walk content/ for every [[wikilink]] and count occurrences by
//      entity name (case-insensitive).
//   4. For each pending proposal, report:
//      - total citation count in the vault
//      - which folders cite it most (Politicians / Donors / Stories / Policies)
//      - proposed tag values (capital_type, class_position, ideological_function)
//      - special flag if cited by any Policies page (Rule 11 blocker)
//   5. Sort by: Policies-cited DESC, then stories DESC, then total citations DESC
//
// Usage:
//   node scripts/class-tag-priority-queue.cjs            # dry run, prints top 30
//   node scripts/class-tag-priority-queue.cjs --write    # writes the report

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const CONTENT_DIR = path.join(ROOT, "content")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "class-tag-priority-queue.md")

const WRITE = process.argv.includes("--write")

// ─── Load entities + proposals ─────────────────────────────────────────

function loadJsonl(filename) {
  const records = []
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return records
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      records.push(JSON.parse(line))
    } catch {
      // skip
    }
  }
  return records
}

function loadEntities() {
  return loadJsonl("entities.jsonl")
}

function loadProposals() {
  return loadJsonl("entity-class-tags-proposed.jsonl")
}

// ─── Walk vault for wikilinks ─────────────────────────────────────────

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

function citationsFromVault() {
  const files = walk(CONTENT_DIR)
  // Map: entityName(lowercased) -> { total, byFolder: { Politicians: N, ... } }
  const citations = new Map()

  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/")
    const topFolder = rel.split("/")[1] || "root" // content/TOP/...
    let content
    try {
      content = fs.readFileSync(f, "utf-8")
    } catch {
      continue
    }

    // Strip the Archived section so archived citations don't inflate counts
    const visible = content.split(/^##+\s*Archived/im)[0] || content

    for (const match of visible.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      const name = match[1].trim()
      const key = name.toLowerCase()
      if (!citations.has(key)) {
        citations.set(key, { display: name, total: 0, byFolder: {} })
      }
      const rec = citations.get(key)
      rec.total++
      rec.byFolder[topFolder] = (rec.byFolder[topFolder] || 0) + 1
    }
  }

  return citations
}

// ─── Main ─────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ class-tag-priority-queue ═══")
  console.log("")

  const entities = loadEntities()
  const entityById = new Map(entities.map((e) => [e.id, e]))
  console.log(`  ${entities.length} entities loaded`)

  const proposals = loadProposals()
  console.log(`  ${proposals.length} total proposals`)

  const pending = proposals.filter((p) => p.status === "pending")
  const approved = proposals.filter((p) => p.status === "approved")
  const rejected = proposals.filter((p) => p.status === "rejected")
  console.log(`  ${pending.length} pending`)
  console.log(`  ${approved.length} approved`)
  console.log(`  ${rejected.length} rejected`)
  console.log("")

  const citations = citationsFromVault()
  console.log(`  ${citations.size} unique wikilinks in visible vault text`)
  console.log("")

  // Cross-reference: each pending proposal with its citation count
  const ranked = []
  for (const p of pending) {
    const entity = entityById.get(p.entity_id) || {}
    const name = p.entity_name || entity.name || "(unknown)"
    const key = name.toLowerCase()
    const cit = citations.get(key) || { total: 0, byFolder: {} }
    ranked.push({
      name,
      id: p.entity_id,
      profile_path: entity.profile_path,
      capital_type: p.tags?.capital_type,
      class_position: p.tags?.class_position,
      ideological_function: p.tags?.ideological_function || [],
      confidence: p.confidence,
      reasoning: p.reasoning,
      total_citations: cit.total,
      byFolder: cit.byFolder,
      cited_by_policies: (cit.byFolder["Policies"] || 0) > 0,
      cited_by_stories: (cit.byFolder["Stories"] || 0) > 0,
    })
  }

  // Sort: policies-cited first (they're Rule 11 blockers), then stories, then total
  ranked.sort((a, b) => {
    if (a.cited_by_policies !== b.cited_by_policies) return a.cited_by_policies ? -1 : 1
    if (a.cited_by_stories !== b.cited_by_stories) return a.cited_by_stories ? -1 : 1
    return b.total_citations - a.total_citations
  })

  // Summary
  const policyBlockers = ranked.filter((r) => r.cited_by_policies).length
  const storyBlockers = ranked.filter((r) => r.cited_by_stories && !r.cited_by_policies).length
  const widelyLinked = ranked.filter((r) => !r.cited_by_policies && !r.cited_by_stories && r.total_citations >= 10).length
  const orphans = ranked.filter((r) => r.total_citations === 0).length

  console.log(`  POLICY BLOCKERS (Rule 11): ${policyBlockers}`)
  console.log(`  Story blockers: ${storyBlockers}`)
  console.log(`  Widely linked (10+ citations): ${widelyLinked}`)
  console.log(`  Orphaned (0 citations): ${orphans}`)
  console.log("")

  // Preview top 15
  console.log("  TOP 15 PRIORITY:")
  for (const r of ranked.slice(0, 15)) {
    const flag = r.cited_by_policies ? "🔴" : r.cited_by_stories ? "🟡" : "⚪"
    console.log(
      `    ${flag} ${r.total_citations.toString().padStart(4)}× ${r.name}  [${r.capital_type || "—"} / ${r.class_position || "—"}]`,
    )
  }

  if (!WRITE) {
    console.log("")
    console.log("  DRY RUN — re-run with --write to generate content/Admin Notes/class-tag-priority-queue.md")
    return
  }

  // Generate markdown report
  const lines = []
  lines.push("---")
  lines.push('title: "Class Tag Priority Queue"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/class-tag-priority-queue.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Class Tag Priority Queue")
  lines.push("")
  lines.push(
    `Generated from \`data/entities.jsonl\` cross-referenced against every \`[[wikilink]]\` in visible vault text (Archived sections excluded). Sorted by: policies-cited first (CLAUDE.md Rule 11 blockers), then stories-cited, then total citation count. **Approve entities in this order for maximum profile-unblocking per review minute.**`,
  )
  lines.push("")
  lines.push(`**Total unapproved with heuristic proposals:** ${ranked.length}`)
  lines.push(`**🔴 Policy blockers (Rule 11):** ${policyBlockers} — block at least one policy page from publication`)
  lines.push(`**🟡 Story blockers:** ${storyBlockers} — block at least one published story from verified promotion`)
  lines.push(`**⚪ Widely linked (10+):** ${widelyLinked} — cited by many profiles, high leverage`)
  lines.push(`**Orphans (0 citations):** ${orphans} — low priority, can defer indefinitely`)
  lines.push("")
  lines.push("## How to use this")
  lines.push("")
  lines.push(
    "Open `/class-tags` in Ops. Work through the list below in order. For each entity, approve or reject the proposed tags. Approving a 🔴 entity can unblock multiple policy pages; approving a ⚪ entity unblocks one or zero. Start at the top.",
  )
  lines.push("")
  lines.push("Keyboard shortcuts in Ops `/class-tags`: **A** approve, **R** reject, **E** edit before approving.")
  lines.push("")

  // Sections
  const sections = [
    { emoji: "🔴", title: "Policy Blockers (Rule 11)", filter: (r) => r.cited_by_policies },
    { emoji: "🟡", title: "Story Blockers", filter: (r) => !r.cited_by_policies && r.cited_by_stories },
    { emoji: "⚪", title: "Widely Linked (10+ citations)", filter: (r) => !r.cited_by_policies && !r.cited_by_stories && r.total_citations >= 10 },
    { emoji: "·", title: "Moderate (3-9 citations)", filter: (r) => !r.cited_by_policies && !r.cited_by_stories && r.total_citations >= 3 && r.total_citations < 10 },
    { emoji: "·", title: "Low (1-2 citations)", filter: (r) => !r.cited_by_policies && !r.cited_by_stories && r.total_citations >= 1 && r.total_citations < 3 },
    { emoji: "·", title: "Orphans (0 citations — defer)", filter: (r) => r.total_citations === 0 },
  ]

  for (const s of sections) {
    const items = ranked.filter(s.filter)
    if (!items.length) continue
    lines.push(`## ${s.emoji} ${s.title} (${items.length})`)
    lines.push("")
    lines.push("| Entity | Citations | By Folder | Proposed Tags |")
    lines.push("|---|---:|---|---|")
    for (const r of items) {
      const byFolder = Object.entries(r.byFolder)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${v}`)
        .join(" ")
      const tags = [
        r.capital_type ? `capital:${r.capital_type}` : null,
        r.class_position ? `position:${r.class_position}` : null,
        r.ideological_function.length ? `fn:${r.ideological_function.slice(0, 3).join(",")}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
      const name = r.profile_path
        ? `[${r.name}](/${r.profile_path.replace(/\\/g, "/")})`
        : r.name
      lines.push(`| ${name} | ${r.total_citations} | ${byFolder} | ${tags || "(none)"} |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    `*Regenerate: \`node scripts/class-tag-priority-queue.cjs --write\`. Re-run after each approval batch to see updated priorities.*`,
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log("")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
  console.log("")
}

main()
