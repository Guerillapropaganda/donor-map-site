#!/usr/bin/env node
// policy-class-tag-gap-report.cjs — which entities block WHICH policy pages?
//
// Purpose: CLAUDE.md Rule 11 says a profile can't be promoted to
// `content-readiness: verified` if any cited entity has class tags in
// `status: pending`. For POLICY pages specifically, this is the
// blocker between the policy page existing and it being publishable.
//
// This script answers: "for each of the 5 v1 policy pages, exactly
// which entities are cited that need tag approval?"
//
// Output: content/Admin Notes/policy-class-tag-gap-report.md
//
// Input sources:
//   - data/entity-class-tags-proposed.jsonl (status: pending|approved|rejected)
//   - data/entities.jsonl (entity records with profile_path)
//   - content/Policies/*.md (walk for [[wikilinks]])
//
// The gap report sorts: per-policy, which pending entities are cited,
// and how many citations each represents. Fewer blockers = closer to
// publication readiness.
//
// Usage:
//   node scripts/policy-class-tag-gap-report.cjs              # dry run
//   node scripts/policy-class-tag-gap-report.cjs --write      # write report

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const POLICIES_DIR = path.join(ROOT, "content", "Policies")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "policy-class-tag-gap-report.md")

const WRITE = process.argv.includes("--write")

// ─── Load canonical stores ───────────────────────────────────────────

function loadJsonl(filename) {
  const records = []
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return records
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      records.push(JSON.parse(line))
    } catch {
      /* skip */
    }
  }
  return records
}

function loadEntities() {
  const entities = loadJsonl("entities.jsonl")
  const byName = new Map()
  for (const e of entities) {
    if (e.name) byName.set(e.name.toLowerCase(), e)
  }
  return { list: entities, byName }
}

function loadProposals() {
  const proposals = loadJsonl("entity-class-tags-proposed.jsonl")
  const byEntityId = new Map()
  for (const p of proposals) {
    byEntityId.set(p.entity_id, p)
  }
  return byEntityId
}

// ─── Walk policy pages for entity citations ──────────────────────────
//
// Policy pages cite entities three ways:
//   1. [[Wikilinks]] — rare, usually just meta-navigation
//   2. Markdown table rows under "Top opposition donors" header — the
//      main citation path. First cell of each row is an entity name.
//   3. Narrative prose — these are already flagged separately by
//      publication-readiness-check and hallucination-catcher.
//
// This script targets #2 specifically — the structured donor tables
// rendered by build-policy-pages.cjs from the query engine. These are
// the REAL entities that trigger Rule 11 on policy pages.

function citationsFromPolicyPages() {
  const citations = new Map()

  let entries
  try {
    entries = fs.readdirSync(POLICIES_DIR, { withFileTypes: true })
  } catch {
    return citations
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const slug = entry.name.replace(/\.md$/, "")
    const p = path.join(POLICIES_DIR, entry.name)
    let content
    try {
      content = fs.readFileSync(p, "utf-8")
    } catch {
      continue
    }
    const visible = content.split(/^##+\s*Archived/im)[0] || content
    const lines = visible.split(/\r?\n/)

    // Walk table sections. A table row looks like:
    //   | Entity Name | value | value |
    // Skip separator rows (| --- | --- |) and header rows (| Donor | ... |)
    let inTable = false
    let tableHeader = null
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Detect a markdown table header row followed by a separator line
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s|:-]+\|\s*$/.test(lines[i + 1])) {
        inTable = true
        tableHeader = line
        continue
      }
      // Skip separator
      if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue
      // End of table (blank line or non-table content)
      if (inTable && !/^\s*\|.*\|\s*$/.test(line)) {
        inTable = false
        tableHeader = null
        continue
      }
      if (inTable && /^\s*\|.*\|\s*$/.test(line)) {
        // First cell is the entity name — but only in "Donor" / "Entity" columns
        if (
          tableHeader &&
          /\|\s*(donor|entity|top donors?|name)\b/i.test(tableHeader)
        ) {
          const cells = line.split("|").map((c) => c.trim()).filter(Boolean)
          if (cells.length >= 1) {
            // Strip any markdown link syntax from the first cell: [Name](url) → Name
            const name = cells[0].replace(/^\[(.+?)\]\(.+?\)$/, "$1").trim()
            if (name && name !== "—") {
              const key = name.toLowerCase()
              if (!citations.has(key)) {
                citations.set(key, { display: name, total: 0, byPolicy: {} })
              }
              const rec = citations.get(key)
              rec.total++
              rec.byPolicy[slug] = (rec.byPolicy[slug] || 0) + 1
            }
          }
        }
      }
    }
  }

  return citations
}

// ─── Cross-reference ──────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ policy-class-tag-gap-report ═══")
  console.log("")

  const { list: entities, byName } = loadEntities()
  console.log(`  ${entities.length} entities loaded`)

  const proposals = loadProposals()
  console.log(`  ${proposals.size} proposals loaded`)

  const citations = citationsFromPolicyPages()
  console.log(`  ${citations.size} unique wikilinks across policy pages`)
  console.log("")

  // For each policy-cited entity, classify:
  //   - approved: tags exist + approved
  //   - pending: tags exist + pending (Rule 11 blocker)
  //   - rejected: tags exist + rejected
  //   - no-proposal: entity has no proposal record yet
  //   - no-entity: wikilink doesn't resolve to any entity in the registry
  const perPolicy = {} // slug -> { total, approved, pending, noProposal, noEntity, pendingList }

  for (const [key, cit] of citations.entries()) {
    const entity = byName.get(key)
    let category
    let proposalInfo = null

    if (!entity) {
      category = "no-entity"
    } else {
      const proposal = proposals.get(entity.id)
      if (!proposal) {
        category = "no-proposal"
      } else {
        category = proposal.status // pending | approved | rejected
        proposalInfo = proposal
      }
    }

    // Aggregate by policy
    for (const [slug, count] of Object.entries(cit.byPolicy)) {
      if (!perPolicy[slug]) {
        perPolicy[slug] = {
          total_citations: 0,
          unique_entities: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          no_proposal: 0,
          no_entity: 0,
          pending_list: [],
          no_proposal_list: [],
          no_entity_list: [],
        }
      }
      const ps = perPolicy[slug]
      ps.total_citations += count
      ps.unique_entities += 1
      if (category === "approved") ps.approved++
      else if (category === "pending") {
        ps.pending++
        ps.pending_list.push({
          name: cit.display,
          entity_id: entity?.id,
          citation_count: count,
          proposal: proposalInfo,
        })
      } else if (category === "rejected") ps.rejected++
      else if (category === "no-proposal") {
        ps.no_proposal++
        ps.no_proposal_list.push({ name: cit.display, entity_id: entity?.id, citation_count: count })
      } else if (category === "no-entity") {
        ps.no_entity++
        ps.no_entity_list.push({ name: cit.display, citation_count: count })
      }
    }
  }

  // Sort pending_list per policy by citation count desc
  for (const slug of Object.keys(perPolicy)) {
    perPolicy[slug].pending_list.sort((a, b) => b.citation_count - a.citation_count)
    perPolicy[slug].no_proposal_list.sort((a, b) => b.citation_count - a.citation_count)
    perPolicy[slug].no_entity_list.sort((a, b) => b.citation_count - a.citation_count)
  }

  // Console preview
  const slugs = Object.keys(perPolicy).sort()
  for (const slug of slugs) {
    const ps = perPolicy[slug]
    console.log(`  ${slug.padEnd(16)}  unique=${ps.unique_entities.toString().padStart(4)}  approved=${ps.approved.toString().padStart(3)}  pending=${ps.pending.toString().padStart(3)}  no-proposal=${ps.no_proposal.toString().padStart(4)}  no-entity=${ps.no_entity.toString().padStart(4)}`)
  }
  console.log("")

  if (!WRITE) {
    console.log("  DRY RUN — re-run with --write to generate the report")
    return
  }

  // ─── Write report ──────────────────────────────────────────────────
  const lines = []
  lines.push("---")
  lines.push('title: "Policy Class-Tag Gap Report"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/policy-class-tag-gap-report.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Policy Class-Tag Gap Report")
  lines.push("")
  lines.push(
    "For each v1 policy page, which class-tag approvals are needed to pass CLAUDE.md Rule 11 (no `content-readiness: verified` promotion if any cited entity has class tags in `status: pending`). This is the MOST targeted unblock list for publication readiness on the /policies soft-launch path.",
  )
  lines.push("")
  lines.push(
    "**Three categories per policy:** `pending` (entity has heuristic proposal awaiting David's review — approve in Ops /class-tags), `no-proposal` (entity exists but was never run through the heuristic pass — needs a re-run or manual tagging), `no-entity` (wikilink doesn't resolve to any entity in the registry — needs entity creation or link fix).",
  )
  lines.push("")
  lines.push("## Summary by policy")
  lines.push("")
  lines.push("| Policy | Unique entities | Approved | Pending (Rule 11 blockers) | No-proposal | No-entity |")
  lines.push("|---|---:|---:|---:|---:|---:|")
  for (const slug of slugs) {
    const ps = perPolicy[slug]
    lines.push(
      `| [${slug}](/content/Policies/${slug}.md) | ${ps.unique_entities} | ${ps.approved} | **${ps.pending}** | ${ps.no_proposal} | ${ps.no_entity} |`,
    )
  }
  lines.push("")
  lines.push(
    "**Interpretation:** a policy page becomes Rule-11-unblocked when the **Pending** column hits 0. The other categories (`no-proposal`, `no-entity`) are data-completeness gaps but don't block Rule 11 specifically — they block the publication-readiness gate through other paths (entity must exist in registry, entity must have approved tags).",
  )
  lines.push("")

  // Per-policy detail
  for (const slug of slugs) {
    const ps = perPolicy[slug]
    if (ps.pending === 0 && ps.no_proposal === 0 && ps.no_entity === 0) continue

    lines.push(`## ${slug}`)
    lines.push("")

    if (ps.pending > 0) {
      lines.push(`### 🔴 Pending approval (${ps.pending}) — approve these in Ops /class-tags first`)
      lines.push("")
      lines.push("| Entity | Citations on this page | Proposed capital_type | Proposed class_position |")
      lines.push("|---|---:|---|---|")
      for (const item of ps.pending_list) {
        const cap = item.proposal?.tags?.capital_type || "—"
        const pos = item.proposal?.tags?.class_position || "—"
        lines.push(`| ${item.name} | ${item.citation_count} | ${cap} | ${pos} |`)
      }
      lines.push("")
    }

    if (ps.no_proposal > 0) {
      lines.push(`### 🟡 No proposal yet (${ps.no_proposal}) — entity exists, heuristic pass hasn't run`)
      lines.push("")
      lines.push(
        "These entities are in `data/entities.jsonl` but don't have a record in `data/entity-class-tags-proposed.jsonl`. Run `node scripts/batch-propose-class-tags-heuristic.cjs --write` to generate proposals for them.",
      )
      lines.push("")
      lines.push("| Entity | Citations on this page |")
      lines.push("|---|---:|")
      for (const item of ps.no_proposal_list.slice(0, 20)) {
        lines.push(`| ${item.name} | ${item.citation_count} |`)
      }
      if (ps.no_proposal_list.length > 20) {
        lines.push(`| … +${ps.no_proposal_list.length - 20} more | |`)
      }
      lines.push("")
    }

    if (ps.no_entity > 0) {
      lines.push(`### ⚪ No entity in registry (${ps.no_entity}) — wikilink doesn't resolve`)
      lines.push("")
      lines.push(
        "These wikilinks on the policy page point to names that don't exist in `data/entities.jsonl`. Either the entity needs to be created (data gap), or the wikilink is a typo (content gap).",
      )
      lines.push("")
      lines.push("| Wikilink target | Citations on this page |")
      lines.push("|---|---:|")
      for (const item of ps.no_entity_list.slice(0, 20)) {
        lines.push(`| ${item.name} | ${item.citation_count} |`)
      }
      if (ps.no_entity_list.length > 20) {
        lines.push(`| … +${ps.no_entity_list.length - 20} more | |`)
      }
      lines.push("")
    }
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/policy-class-tag-gap-report.cjs --write`. Re-run after each approval batch to see updated policy unblock status.*",
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
  console.log("")
}

main()
