#!/usr/bin/env node
// broken-source-refs-report.cjs — triage the {{src:ID}} refs that don't resolve
//
// Purpose: publication-readiness-check.cjs flagged ~100 profiles with
// {{src:ID}} refs that don't resolve to a record in data/sources.jsonl.
// These are either:
//   A) Typos in the ID (fixable — find the nearest valid ID)
//   B) References to sources that were deleted from the registry
//   C) Never-registered sources (migration gap)
//
// This script walks the vault, finds every {{src:ID}} ref, and for each
// that doesn't resolve, categorizes it and proposes a fix where possible.
//
// Output: content/Admin Notes/broken-source-refs-report.md
//
// Usage:
//   node scripts/broken-source-refs-report.cjs                    # dry-run summary
//   node scripts/broken-source-refs-report.cjs --write            # writes report

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const CONTENT_DIR = path.join(ROOT, "content")
const OUTPUT_FILE = path.join(ROOT, "content", "Admin Notes", "broken-source-refs-report.md")

const WRITE = process.argv.includes("--write")

// ─── Load sources ──────────────────────────────────────────────────────

function loadSources() {
  const sources = new Map()
  const p = path.join(DATA_DIR, "sources.jsonl")
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      const s = JSON.parse(line)
      sources.set(s.id, s)
    } catch {}
  }
  return sources
}

// ─── Walk vault for {{src:ID}} refs ────────────────────────────────────

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

// Strip backtick inline code + fenced code blocks so we don't pick up
// documentation examples like `{{src:ID}}` in admin notes / checklists.
function stripCodeBlocks(content) {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
}

function findRefs() {
  const files = walk(CONTENT_DIR)
  const refs = []
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/")
    // Skip admin docs — these contain {{src:ID}} literal examples
    if (
      rel.startsWith("content/Admin Notes/") ||
      rel.startsWith("content/Checklists/") ||
      rel === "content/Session State.md" ||
      rel.startsWith("content/Phases/") ||
      rel.startsWith("content/Decisions/")
    ) {
      continue
    }
    let content
    try {
      content = fs.readFileSync(f, "utf-8")
    } catch {
      continue
    }
    const clean = stripCodeBlocks(content)
    for (const m of clean.matchAll(/\{\{src:([a-z0-9_]+)\}\}/gi)) {
      refs.push({ file: rel, id: m[1], raw: m[0] })
    }
  }
  return refs
}

// ─── Categorize broken refs ────────────────────────────────────────────

function categorize(brokenId, sources) {
  // Format check: valid source IDs are src_NNNNNN (6 digits)
  const formatOk = /^src_\d{6}$/.test(brokenId)

  if (!formatOk) {
    return { category: "malformed-id", hint: "ID doesn't match /^src_\\d{6}$/ pattern" }
  }

  // Is it close to an existing ID (off-by-one)?
  const num = parseInt(brokenId.slice(4), 10)
  const nearby = []
  for (const delta of [-2, -1, 1, 2]) {
    const candidate = `src_${String(num + delta).padStart(6, "0")}`
    if (sources.has(candidate)) nearby.push(candidate)
  }
  if (nearby.length) {
    return {
      category: "possible-typo",
      hint: `nearby valid IDs: ${nearby.join(", ")}`,
      suggestion: nearby[0],
    }
  }

  // Out of range? (Registry has 14,681 so anything above src_015000 is clearly wrong)
  if (num > 15000) {
    return { category: "out-of-range", hint: `ID ${brokenId} exceeds highest valid ID` }
  }

  // In range but missing — source was deleted or never registered
  return { category: "never-registered", hint: "ID format valid but not in sources.jsonl" }
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ broken-source-refs-report ═══")
  console.log("")

  const sources = loadSources()
  console.log(`  ${sources.size} sources loaded from registry`)

  const refs = findRefs()
  console.log(`  ${refs.length} total {{src:ID}} refs found in vault`)

  const broken = refs.filter((r) => !sources.has(r.id))
  console.log(`  ${broken.length} broken refs (ID doesn't resolve)`)
  console.log("")

  // Group unique broken IDs (one fix resolves many refs)
  const byId = new Map()
  for (const r of broken) {
    if (!byId.has(r.id)) {
      byId.set(r.id, { id: r.id, files: [], ...categorize(r.id, sources) })
    }
    byId.get(r.id).files.push(r.file)
  }

  const uniqueBroken = [...byId.values()]
  uniqueBroken.sort((a, b) => b.files.length - a.files.length)

  // Category counts
  const byCategory = {}
  for (const b of uniqueBroken) {
    byCategory[b.category] = (byCategory[b.category] || 0) + 1
  }
  console.log(`  ${uniqueBroken.length} unique broken IDs`)
  console.log(`  by category:`)
  for (const [k, v] of Object.entries(byCategory)) {
    console.log(`    ${v.toString().padStart(4)} × ${k}`)
  }
  console.log("")

  // Top 10 by file count
  console.log(`  TOP BROKEN IDs (by file count):`)
  for (const b of uniqueBroken.slice(0, 10)) {
    console.log(`    ${b.files.length.toString().padStart(4)}× ${b.id}  [${b.category}]`)
  }

  if (!WRITE) {
    console.log("")
    console.log("  DRY RUN — re-run with --write to generate the report")
    return
  }

  const lines = []
  lines.push("---")
  lines.push('title: "Broken Source Refs Report"')
  lines.push("type: admin-note")
  lines.push("note-type: data")
  lines.push("status: open")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/broken-source-refs-report.cjs")
  lines.push("---")
  lines.push("")
  lines.push("# Broken Source Refs Report")
  lines.push("")
  lines.push(
    `Every \`{{src:ID}}\` ref in the vault that doesn't resolve to a record in \`data/sources.jsonl\`. These are blockers for the publication-readiness gate (CLAUDE.md rule 9) — any profile containing a broken ref can't pass the gate.`,
  )
  lines.push("")
  lines.push(`**Total broken refs:** ${broken.length} across ${uniqueBroken.length} unique IDs`)
  lines.push("")
  lines.push("## Category breakdown")
  lines.push("")
  for (const [k, v] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${k}**: ${v}`)
  }
  lines.push("")

  const categories = [
    {
      key: "possible-typo",
      title: "Possible typos (one-character ID drift)",
      desc: "These IDs have a neighboring valid ID. Highest-confidence fix: replace with the suggestion. Usually safe, but spot-check a few before bulk-replacing.",
    },
    {
      key: "out-of-range",
      title: "Out of range (ID exceeds registered max)",
      desc: "These IDs exceed the highest valid source ID. Almost certainly typos or refs from before a registry truncation. Needs manual lookup.",
    },
    {
      key: "never-registered",
      title: "Never registered (format valid, not in registry)",
      desc: "Source was either deleted from the registry or never registered in the first place. Likely a migration gap — the citation exists in profile body but the source was never added via `addOrFindSource()`. Re-register the original URL to fix.",
    },
    {
      key: "malformed-id",
      title: "Malformed IDs (don't match src_NNNNNN pattern)",
      desc: "Ref syntax is broken. Needs a manual read to determine intent.",
    },
  ]

  for (const c of categories) {
    const items = uniqueBroken.filter((b) => b.category === c.key)
    if (!items.length) continue
    lines.push(`## ${c.title} (${items.length})`)
    lines.push("")
    lines.push(`${c.desc}`)
    lines.push("")
    lines.push("| Broken ID | Files | Hint | Suggestion |")
    lines.push("|---|---:|---|---|")
    for (const b of items) {
      const fileList = b.files.length <= 2 ? b.files.join(", ") : `${b.files[0]} +${b.files.length - 1}`
      lines.push(
        `| \`${b.id}\` | ${b.files.length} | ${b.hint} | ${b.suggestion ? `\`${b.suggestion}\`` : "—"} |`,
      )
    }
    lines.push("")
  }

  lines.push("## How to fix")
  lines.push("")
  lines.push(
    "For **possible-typo**: bulk-replace with the suggestion after spot-checking 2-3. Fast win.",
  )
  lines.push(
    "For **never-registered**: open the profile, find the original URL, register it via `addOrFindSource()` through `scripts/lib/sources-store.cjs`, then the ref will resolve on next publication-readiness check.",
  )
  lines.push(
    "For **malformed-id**: open the profile, determine intent from context, fix the ref manually.",
  )
  lines.push("")
  lines.push("---")
  lines.push("")
  lines.push(
    `*Regenerate: \`node scripts/broken-source-refs-report.cjs --write\`. Re-run after each fix batch to see progress.*`,
  )
  lines.push("")

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf-8")
  console.log("")
  console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
}

main()
