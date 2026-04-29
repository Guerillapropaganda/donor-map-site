#!/usr/bin/env node
// canonical-store-sentinel.cjs — pre-commit gate
//
// Enforces the "canonical store write path" rule: for relationship data,
// the write path is data/relationships.jsonl. Frontmatter fields named
// `related`, `donors`, `top-donors`, `politicians-funded`, `opposes`,
// `stories` (and their `-generated` cache twins) are READ-CACHES during
// the Phase 3 migration window — no hand-edits allowed.
//
// This sentinel blocks commits that touch any of those frontmatter
// fields UNLESS the same commit also touches:
//   - data/relationships.jsonl
//   - scripts/rebuild-relationship-caches.cjs
//   - scripts/lib/relationships-store.cjs
//   - scripts/lib/relationship-edge-validator.cjs
//   - any file matching scripts/*cache*.cjs (rebuilders)
//
// The point: force every relationship edit through the canonical store,
// and make cache rebuilds traceable.
//
// Bypass (emergency): SKIP_HOOKS=1 git commit ...
//
// Exit codes:
//   0 = safe
//   1 = blocked — a staged .md frontmatter relationship field edit
//       is not accompanied by a canonical store / rebuilder change
//   2 = script error

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// ─── CLI helpers ──────────────────────────────────────────────────────

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8" }).trim()
  } catch {
    return ""
  }
}

function getStagedFiles() {
  const out = git("diff --cached --name-only")
  return out ? out.split(/\r?\n/).filter(Boolean) : []
}

function getStagedDiff(file) {
  try {
    return execSync(`git diff --cached -- "${file}"`, { encoding: "utf-8" })
  } catch {
    return ""
  }
}

// ─── The rule ─────────────────────────────────────────────────────────

const GUARDED_FIELDS = [
  "related",
  "donors",
  "top-donors",
  "politicians-funded",
  "politicians-opposed",
  "opposes",
  "stories",
  "top_donors",  // snake_case variant
]

const CANONICAL_WRITE_PATHS = [
  /^data\/relationships\.jsonl$/,
  /^scripts\/rebuild-relationship-caches\.cjs$/,
  /^scripts\/lib\/relationships-store\.cjs$/,
  /^scripts\/lib\/relationship-edge-validator\.cjs$/,
  /^scripts\/.*relationship.*\.cjs$/i,
  /^scripts\/.*cache.*\.cjs$/i,
  /^ops\/src\/lib\/relationships-store\.ts$/,
]

function isCanonicalWrite(file) {
  return CANONICAL_WRITE_PATHS.some((re) => re.test(file))
}

function frontmatterFieldTouched(diffText, field) {
  // Match lines being ADDED ("+") that look like frontmatter field edits.
  // Exclude the diff header "+++ b/file" with the leading "+++ ".
  // Two shapes to catch:
  //   +field: value                          (scalar)
  //   +field:                                (start of block)
  //   +field-generated:                      (cache field, also guarded)
  const addLineRe = new RegExp(
    `^\\+(?!\\+\\+)(${field}(?:-generated)?)\\s*:`,
    "m",
  )
  return addLineRe.test(diffText)
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  if (process.env.SKIP_HOOKS === "1") {
    console.log("[canonical-store] SKIP_HOOKS=1 — bypassing")
    process.exit(0)
  }

  const staged = getStagedFiles()
  if (staged.length === 0) process.exit(0)

  // Exempt paths that are explicitly docs/workshop (not real profiles):
  //   - content/Drafts/    — work-in-progress docs being drafted before replacing live files
  //   - content/Decisions/ — ADRs routinely show YAML example values
  //   - content/Checklists/ — process docs with example frontmatter
  //   - CLAUDE.md, Vault Rules.md, Profile Template.md, CSV Data Sources.md,
  //     Pipeline Guide.md — system docs that catalog frontmatter fields
  const EXEMPT_PATHS = [
    /^content\/Drafts\//,
    /^content\/Decisions\//,
    /^content\/Checklists\//,
    /^content\/CLAUDE\.md$/,
    /^content\/Vault Rules\.md$/,
    /^content\/Profile Template\.md$/,
    /^content\/CSV Data Sources\.md$/,
    /^content\/Pipeline Guide\.md$/,
    /^CLAUDE\.md$/,
  ]
  const isExempt = (f) => EXEMPT_PATHS.some((re) => re.test(f))

  const stagedMd = staged.filter((f) => f.endsWith(".md") && f.startsWith("content/") && !isExempt(f))
  if (stagedMd.length === 0) process.exit(0)

  const hasCanonicalWrite = staged.some(isCanonicalWrite)

  const offenders = []
  for (const file of stagedMd) {
    const diff = getStagedDiff(file)
    if (!diff) continue
    const touched = GUARDED_FIELDS.filter((f) => frontmatterFieldTouched(diff, f))
    if (touched.length > 0) {
      offenders.push({ file, fields: touched })
    }
  }

  // ─── ADR-0027 + ADR-0029: orphan-candidates store guard ──────────
  //
  // data/frontmatter-orphan-candidates.jsonl is itself a canonical store
  // (Rule 1 applies). It MUST be edited only via:
  //   - scripts/rebuild-relationship-caches.cjs (--report-orphans / --apply-approved)
  //   - scripts/lib/frontmatter-orphan-candidates-store.cjs (the helper)
  //   - scripts/lib/editorial-decision-pipeline.cjs (ADR-0029 pipeline)
  //   - scripts/classes/frontmatter-orphan-prunes.cjs (pipeline class registration)
  //   - scripts/migrate-pre-adr-0029-provenance.cjs (one-time backfill)
  //   - ops/src/app/api/relationships/orphans/* (P2 ops API, not yet built)
  // Any other commit touching this file is blocked.
  const ORPHAN_STORE = "data/frontmatter-orphan-candidates.jsonl"
  const ORPHAN_AUTHORITY_PATHS = [
    /^scripts\/rebuild-relationship-caches\.cjs$/,
    /^scripts\/lib\/frontmatter-orphan-candidates-store\.cjs$/,
    /^scripts\/frontmatter-orphan-check\.cjs$/,
    /^scripts\/lib\/editorial-decision-pipeline\.cjs$/,
    /^scripts\/classes\/frontmatter-orphan-prunes\.cjs$/,
    /^scripts\/migrate-pre-adr-0029-provenance\.cjs$/,
    /^scripts\/calibration-auto-revert\.cjs$/,
    /^ops\/src\/app\/api\/relationships\/orphans\//,
    /^ops\/src\/app\/relationships\/orphans\//,
  ]
  if (staged.includes(ORPHAN_STORE)) {
    const hasAuthority = staged.some((f) => ORPHAN_AUTHORITY_PATHS.some((re) => re.test(f)))
    if (!hasAuthority) {
      console.log("")
      console.log("[x] canonical-store-sentinel blocked the commit")
      console.log("")
      console.log(`  You edited ${ORPHAN_STORE} but did not stage an authorized writer.`)
      console.log("  Authorized writers (per ADR-0027 + ADR-0029):")
      console.log("    scripts/rebuild-relationship-caches.cjs (--report-orphans / --apply-approved)")
      console.log("    scripts/lib/frontmatter-orphan-candidates-store.cjs")
      console.log("    scripts/lib/editorial-decision-pipeline.cjs (ADR-0029 pipeline)")
      console.log("    scripts/classes/frontmatter-orphan-prunes.cjs (pipeline class)")
      console.log("    scripts/migrate-pre-adr-0029-provenance.cjs (one-time)")
      console.log("    scripts/calibration-auto-revert.cjs (auto-revert hook)")
      console.log("    ops/src/app/api/relationships/orphans/* (P2)")
      console.log("")
      console.log("  Emergency bypass: SKIP_HOOKS=1 git commit ...")
      console.log("")
      process.exit(1)
    }
  }

  // ─── ADR-0029: librarian-gap-decisions store guard ───────────────
  //
  // data/librarian-gap-decisions.jsonl is a canonical store. Authorized
  // writers all live in the ADR-0029 editorial-decision-pipeline.
  const LIBRARIAN_GAP_STORE = "data/librarian-gap-decisions.jsonl"
  const LIBRARIAN_GAP_AUTHORITY_PATHS = [
    /^scripts\/librarian-gap-propose\.cjs$/,
    /^scripts\/lib\/librarian-gap-decisions-store\.cjs$/,
    /^scripts\/lib\/editorial-decision-pipeline\.cjs$/,
    /^scripts\/classes\/librarian-gap-aliases\.cjs$/,
    /^scripts\/calibration-auto-revert\.cjs$/,
    /^scripts\/migrate-pre-adr-0029-provenance\.cjs$/,
  ]
  if (staged.includes(LIBRARIAN_GAP_STORE)) {
    const hasAuthority = staged.some((f) => LIBRARIAN_GAP_AUTHORITY_PATHS.some((re) => re.test(f)))
    if (!hasAuthority) {
      console.log("")
      console.log("[x] canonical-store-sentinel blocked the commit")
      console.log("")
      console.log(`  You edited ${LIBRARIAN_GAP_STORE} but did not stage an authorized writer.`)
      console.log("  Authorized writers (per ADR-0029):")
      console.log("    scripts/librarian-gap-propose.cjs (the propose pipeline)")
      console.log("    scripts/lib/librarian-gap-decisions-store.cjs")
      console.log("    scripts/lib/editorial-decision-pipeline.cjs")
      console.log("    scripts/classes/librarian-gap-aliases.cjs")
      console.log("    scripts/calibration-auto-revert.cjs")
      console.log("")
      console.log("  Emergency bypass: SKIP_HOOKS=1 git commit ...")
      console.log("")
      process.exit(1)
    }
  }

  // ─── ADR-0029: editorial-pipeline-freeze.json guard ──────────────
  //
  // data/editorial-pipeline-freeze.json controls Tier 1 auto-apply.
  // Hand-edits would silently re-enable runaway predicates; only the
  // pipeline lib + freeze CLI may write.
  const FREEZE_STORE = "data/editorial-pipeline-freeze.json"
  const FREEZE_AUTHORITY_PATHS = [
    /^scripts\/lib\/editorial-decision-pipeline\.cjs$/,
    /^scripts\/editorial-pipeline-freeze\.cjs$/,
    /^scripts\/claude-decision-volume-check\.cjs$/,  // auto-freeze on hard limit
  ]
  if (staged.includes(FREEZE_STORE)) {
    const hasAuthority = staged.some((f) => FREEZE_AUTHORITY_PATHS.some((re) => re.test(f)))
    if (!hasAuthority) {
      console.log("")
      console.log("[x] canonical-store-sentinel blocked the commit")
      console.log("")
      console.log(`  You edited ${FREEZE_STORE} but did not stage an authorized writer.`)
      console.log("  Authorized writers (per ADR-0029):")
      console.log("    scripts/lib/editorial-decision-pipeline.cjs")
      console.log("    scripts/editorial-pipeline-freeze.cjs (CLI)")
      console.log("    scripts/claude-decision-volume-check.cjs (auto-freeze on hard limit)")
      console.log("")
      console.log("  Emergency bypass: SKIP_HOOKS=1 git commit ...")
      console.log("")
      process.exit(1)
    }
  }

  if (offenders.length === 0) {
    process.exit(0)
  }

  if (hasCanonicalWrite) {
    console.log(
      `[canonical-store] ${offenders.length} profile relationship edits, but canonical store is also touched — allowed`,
    )
    process.exit(0)
  }

  // Blocked
  console.log("")
  console.log("[x] canonical-store-sentinel blocked the commit")
  console.log("")
  console.log("  You edited frontmatter relationship fields in these files:")
  for (const o of offenders.slice(0, 10)) {
    console.log(`    ${o.file}`)
    console.log(`      fields: ${o.fields.join(", ")}`)
  }
  if (offenders.length > 10) console.log(`    ... +${offenders.length - 10} more`)
  console.log("")
  console.log(
    "  Relationship data is canonical in data/relationships.jsonl (Phase 3).",
  )
  console.log("  Frontmatter fields are READ-CACHES — do not hand-edit them.")
  console.log("")
  console.log("  To fix:")
  console.log("    1. Revert the frontmatter edits (git checkout -- <file>)")
  console.log("    2. Edit data/relationships.jsonl through relationships-store.cjs")
  console.log("       (or the Ops /relationships page)")
  console.log("    3. Run scripts/rebuild-relationship-caches.cjs to refresh")
  console.log("       the frontmatter caches")
  console.log("")
  console.log("  Emergency bypass: SKIP_HOOKS=1 git commit ...")
  console.log("")
  process.exit(1)
}

try {
  main()
} catch (err) {
  console.error("canonical-store-sentinel crashed:", err)
  process.exit(2)
}
