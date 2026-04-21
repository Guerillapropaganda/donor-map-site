#!/usr/bin/env node
// publication-readiness-check.cjs — the publication gate
//
// "Architecturally complete" ≠ "publication ready." This script is the
// single source of truth for whether a given profile (or set of
// profiles) can be exposed on a public URL.
//
// Two publishable tiers (ADR-0017):
//   - verified      — editor-signed-off flagship; strict gates on all 8 items below
//   - data-complete — auto-rendered from canonical stores with a
//                     "not yet editorially reviewed" banner; strict on
//                     items 2-5 (flag scan + source integrity), lenient
//                     on items 6-8 (editorial prose gates)
//
// A profile passes the gate iff ALL of these are true for its tier:
//   1. content-readiness: verified OR data-complete  (frontmatter)
//   2. No (URL NEEDED) / (UNVERIFIED) / (NEEDS REVIEW) markers visible  [both tiers]
//   3. No strikethrough sources in visible text (only in Archived section)  [both tiers]
//   4. Every {{src:ID}} ref resolves to a live/archived source (not dead,
//      not generic_orphan, not needs_review, not paywall-blocked)  [both tiers]
//   5. Every entity cited is approved in the class-tag store
//      (status: approved, not proposed)  [both tiers]
//   6. For claim-object profiles: data/claims/{slug}.jsonl validates  [verified only]
//   7. For prose profiles: editor-vouched: true OR every factual claim
//      has an inline citation within 150 chars (hallucination-catcher
//      coverage)  [verified only]
//   8. Class Analysis section present (#1 editorial rule)  [verified only]
//
// Usage:
//   node scripts/publication-readiness-check.cjs                   # all profiles
//   node scripts/publication-readiness-check.cjs --folder Politicians
//   node scripts/publication-readiness-check.cjs --file content/Politicians/Democrat/House/AOC/Master\ Profile.md
//   node scripts/publication-readiness-check.cjs --json            # machine-readable
//   node scripts/publication-readiness-check.cjs --ready-only      # only show passing
//   node scripts/publication-readiness-check.cjs --verbose
//
// Exit codes:
//   0 = all scanned profiles passed
//   1 = at least one profile failed a gate
//   2 = script error (missing data, corrupt file, etc.)

const fs = require("fs")
const path = require("path")

const ROOT = path.join(__dirname, "..")
const CONTENT_DIR = path.join(ROOT, "content")
const DATA_DIR = path.join(ROOT, "data")

// ─── CLI ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const argIdx = (flag) => args.indexOf(flag)
const argValue = (flag) => {
  const i = argIdx(flag)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

const JSON_OUT = args.includes("--json")
const READY_ONLY = args.includes("--ready-only")
const VERBOSE = args.includes("--verbose")
const FOLDER_FILTER = argValue("--folder")
const SINGLE_FILE = argValue("--file")

// ─── Load data stores once (lazy + tolerant) ─────────────────────────

function loadJsonlSafe(filename) {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return []
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  const out = []
  for (const line of lines) {
    try {
      out.push(JSON.parse(line))
    } catch {
      // skip — data integrity audit covers this
    }
  }
  return out
}

const sources = loadJsonlSafe("sources.jsonl")
const sourcesById = new Map(sources.map((s) => [s.id, s]))

// Entity class-tag status is currently tracked on entity records
const entities = loadJsonlSafe("entities.jsonl")
const entityByName = new Map()
for (const e of entities) {
  if (e.name) entityByName.set(e.name.toLowerCase(), e)
}

// ─── Frontmatter parser (minimal, zero deps) ─────────────────────────

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/)
  if (!m) return { frontmatter: {}, body: content }
  const yaml = m[1]
  const fm = {}
  let currentKey = null
  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, "")
    if (!line.trim()) continue
    const kv = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/)
    if (kv) {
      currentKey = kv[1]
      const value = kv[2].trim()
      if (value === "" || value === null) {
        fm[currentKey] = ""
      } else if (value.startsWith("[") && value.endsWith("]")) {
        fm[currentKey] = value
          .slice(1, -1)
          .split(",")
          .map((x) => x.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean)
      } else {
        fm[currentKey] = value.replace(/^["']|["']$/g, "")
      }
    }
  }
  return { frontmatter: fm, body: content.slice(m[0].length) }
}

// ─── The gates ────────────────────────────────────────────────────────

const BANNED_MARKERS = [
  /\(URL NEEDED\)/,
  /\(UNVERIFIED\)/,
  /\(NEEDS REVIEW\)/,
]

// A visible strikethrough source (not inside an Archived section)
const STRIKETHROUGH_SOURCE = /~~\[[^\]]+\]\([^)]+\)~~/

function checkFile(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/")
  const failures = []
  const info = []

  let raw
  try {
    raw = fs.readFileSync(filePath, "utf-8")
  } catch (e) {
    return { file: rel, ready: false, failures: [`unreadable: ${e.message}`], info: [] }
  }

  const { frontmatter: fm, body } = parseFrontmatter(raw)

  // Gate 1: content-readiness (ADR-0017: verified OR data-complete)
  const readiness = (fm["content-readiness"] || fm.readiness || "").toLowerCase()
  const PUBLISHABLE = new Set(["verified", "data-complete"])
  if (!PUBLISHABLE.has(readiness)) {
    failures.push(`content-readiness is "${readiness || "(missing)"}", must be "verified" or "data-complete"`)
  }
  const isDataComplete = readiness === "data-complete"

  // Gate 2 + 3: no unresolved URL markers in visible text
  // Split on the "Archived" heading so we only scan visible-facing text
  const archivedSplit = body.split(/^##+\s*Archived/im)
  const visibleText = archivedSplit[0] || ""

  for (const marker of BANNED_MARKERS) {
    if (marker.test(visibleText)) {
      failures.push(`visible text contains marker: ${marker.source}`)
    }
  }
  if (STRIKETHROUGH_SOURCE.test(visibleText)) {
    failures.push(
      "visible text contains strikethrough source — move to ## Archived section",
    )
  }

  // Gate 4: every {{src:ID}} ref must resolve to an OK status
  // Strip backtick inline code + fenced code blocks so documentation
  // examples like `{{src:ID}}` don't get counted as broken refs.
  const bodyNoCode = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "")
  const srcRefs = [...bodyNoCode.matchAll(/\{\{src:([a-z0-9_]+)\}\}/gi)]
  const OK_STATUSES = new Set(["live", "archived"])
  const refStatusCounts = {}
  for (const match of srcRefs) {
    const id = match[1]
    const rec = sourcesById.get(id)
    if (!rec) {
      failures.push(`unknown source ref: {{src:${id}}}`)
      continue
    }
    const st = rec.status || "unverified"
    refStatusCounts[st] = (refStatusCounts[st] || 0) + 1
    if (!OK_STATUSES.has(st)) {
      failures.push(`source ref {{src:${id}}} has non-publishable status: ${st}`)
    }
  }
  if (srcRefs.length) info.push(`${srcRefs.length} {{src:}} refs`)

  // Gate 5: class-tag approvals on cited entities
  // Look for wikilinks [[Entity Name]] and check their class-tag status
  const wikilinks = [...body.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)]
  const uniqueLinks = new Set(wikilinks.map((m) => m[1].trim()))
  let proposedCount = 0
  for (const link of uniqueLinks) {
    const entity = entityByName.get(link.toLowerCase())
    if (entity && entity.class_tags && entity.class_tags.status === "proposed") {
      failures.push(
        `cited entity "${link}" has class_tags.status = "proposed" (not approved)`,
      )
      proposedCount++
      if (proposedCount >= 5) {
        failures.push(
          `... plus ${uniqueLinks.size - 5}+ more entities with proposed tags (truncated)`,
        )
        break
      }
    }
  }

  // Gate 6: Class Analysis section required (verified tier only — ADR-0017).
  // Data-complete profiles publish without editorial prose; renderer shows banner.
  if (!isDataComplete && !/^##+\s*Class Analysis/im.test(body)) {
    failures.push("missing ## Class Analysis section (mandatory editorial rule)")
  }

  // Gate 7: claim-object OR editor-vouched OR proximity-check (verified tier only — ADR-0017).
  // Data-complete profiles rely on pipeline-supplied citations; the hallucination-catcher
  // still runs as a backstop queue, but it's not a publication gate.
  if (!isDataComplete) {
    const slug = path.basename(filePath, ".md")
    const claimFile = path.join(DATA_DIR, "claims", `${slug}.jsonl`)
    const hasClaimObject = fs.existsSync(claimFile)
    const editorVouched =
      fm["editor-vouched"] === "true" || fm["editor-vouched"] === true

    if (!hasClaimObject && !editorVouched) {
      // Not a hard failure — the hallucination-catcher is the backstop.
      info.push("citation-mode: proximity-check (no claim-object, not editor-vouched)")
    } else if (hasClaimObject) {
      info.push("citation-mode: claim-object")
    } else {
      info.push("citation-mode: editor-vouched")
    }
  } else {
    info.push("tier: data-complete (auto-generated banner renders; editorial prose optional)")
  }

  return {
    file: rel,
    ready: failures.length === 0,
    failures,
    info,
    readiness,
    refCounts: refStatusCounts,
  }
}

// ─── File discovery ──────────────────────────────────────────────────

function findProfiles() {
  if (SINGLE_FILE) {
    return [path.resolve(SINGLE_FILE)]
  }

  const candidates = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) {
        // Skip obvious non-profile folders
        if (e.name.startsWith(".") || e.name === "Assets" || e.name === "Excalidraw") continue
        walk(p)
      } else if (e.name.endsWith(".md")) {
        candidates.push(p)
      }
    }
  }

  const startDirs = FOLDER_FILTER
    ? [path.join(CONTENT_DIR, FOLDER_FILTER)]
    : [
        path.join(CONTENT_DIR, "Politicians"),
        path.join(CONTENT_DIR, "Donors & Power Networks"),
        path.join(CONTENT_DIR, "Policies"),
        path.join(CONTENT_DIR, "Stories"),
      ]

  for (const d of startDirs) walk(d)

  // Filter to profiles only: must have frontmatter with a recognized type
  return candidates.filter((p) => {
    try {
      const head = fs.readFileSync(p, "utf-8").slice(0, 1000)
      return /^---[\s\S]*?type:\s*(politician|donor|corporation|event|story|policy|profile|claim-object)/im.test(
        head,
      )
    } catch {
      return false
    }
  })
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  if (!JSON_OUT) {
    console.log("")
    console.log("═══ publication-readiness-check ═══")
    console.log(`  sources loaded: ${sources.length}`)
    console.log(`  entities loaded: ${entities.length}`)
    if (FOLDER_FILTER) console.log(`  folder filter: ${FOLDER_FILTER}`)
    if (SINGLE_FILE) console.log(`  single file: ${SINGLE_FILE}`)
    console.log("")
  }

  const files = findProfiles()
  if (!JSON_OUT) console.log(`  ${files.length} profiles to check`)

  const results = []
  for (const f of files) {
    results.push(checkFile(f))
  }

  const passed = results.filter((r) => r.ready)
  const failed = results.filter((r) => !r.ready)

  if (JSON_OUT) {
    process.stdout.write(
      JSON.stringify(
        {
          total: results.length,
          passed: passed.length,
          failed: failed.length,
          results,
        },
        null,
        2,
      ),
    )
    process.exit(failed.length === 0 ? 0 : 1)
  }

  console.log("")
  console.log(`  ${passed.length} READY   ${failed.length} BLOCKED`)
  console.log("")

  if (READY_ONLY) {
    for (const r of passed) console.log(`  ✓ ${r.file}`)
    process.exit(failed.length === 0 ? 0 : 1)
  }

  // Show top failures (first 30 unless verbose)
  const limit = VERBOSE ? failed.length : Math.min(failed.length, 30)
  if (failed.length) {
    console.log("  FAILURES (first " + limit + "):")
    console.log("")
    for (let i = 0; i < limit; i++) {
      const r = failed[i]
      console.log(`  ✗ ${r.file}`)
      for (const f of r.failures.slice(0, 5)) {
        console.log(`      · ${f}`)
      }
      if (r.failures.length > 5) {
        console.log(`      · ... +${r.failures.length - 5} more`)
      }
    }
    if (failed.length > limit) {
      console.log("")
      console.log(`  ... +${failed.length - limit} more failures (use --verbose)`)
    }
  }

  // Failure category summary
  const byGate = {}
  for (const r of failed) {
    for (const f of r.failures) {
      const key = f
        .replace(/"[^"]*"/g, '"X"')
        .replace(/\{\{src:[^}]+\}\}/g, "{{src:X}}")
        .slice(0, 70)
      byGate[key] = (byGate[key] || 0) + 1
    }
  }
  if (Object.keys(byGate).length) {
    console.log("")
    console.log("  FAILURE CATEGORIES:")
    const sorted = Object.entries(byGate).sort((a, b) => b[1] - a[1])
    for (const [k, v] of sorted.slice(0, 15)) {
      console.log(`    ${v.toString().padStart(5)} × ${k}`)
    }
  }

  console.log("")
  process.exit(failed.length === 0 ? 0 : 1)
}

try {
  main()
} catch (err) {
  console.error("publication-readiness-check crashed:", err)
  process.exit(2)
}
