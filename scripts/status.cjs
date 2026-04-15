#!/usr/bin/env node
// status.cjs — one-glance system health dashboard
//
// Purpose: run `node scripts/status.cjs` and get a single-screen
// summary of the current state of every engine in the system:
//
//   - 8 canonical data stores (record counts)
//   - regression test status (20 + 20 = 40 tests)
//   - data integrity audit status
//   - publication readiness (how close to public launch)
//   - class tag approval progress
//   - source registry health (status distribution)
//   - policy page readiness per-policy
//   - pre-commit sentinel count
//
// No writes, no side effects — pure read-only inspection. Safe to run
// anytime, takes <5 seconds.
//
// Usage:
//   node scripts/status.cjs              # full dashboard
//   node scripts/status.cjs --json       # machine-readable
//   node scripts/status.cjs --compact    # one-line summary

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")

const JSON_OUT = process.argv.includes("--json")
const COMPACT = process.argv.includes("--compact")

// ─── Helpers ──────────────────────────────────────────────────────────

function jsonlCount(filename) {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return 0
  const content = fs.readFileSync(p, "utf-8")
  return content.split(/\r?\n/).filter(Boolean).length
}

function loadJsonl(filename) {
  const records = []
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return records
  const lines = fs.readFileSync(p, "utf-8").split(/\r?\n/).filter(Boolean)
  for (const line of lines) {
    try {
      records.push(JSON.parse(line))
    } catch {}
  }
  return records
}

function runSilent(cmd) {
  try {
    execSync(cmd, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] })
    return { ok: true }
  } catch (err) {
    return { ok: false, stderr: (err.stderr || "").toString() }
  }
}

// ─── Gather stats ─────────────────────────────────────────────────────

function gather() {
  const stats = {}

  // Canonical store record counts
  stats.stores = {
    sources: jsonlCount("sources.jsonl"),
    relationships: jsonlCount("relationships.jsonl"),
    entities: jsonlCount("entities.jsonl"),
    events: jsonlCount("events.jsonl"),
    policies: jsonlCount("policies.jsonl"),
    polling: jsonlCount("polling.jsonl"),
    users: jsonlCount("users.jsonl"),
    claims_aoc: jsonlCount("claims/aoc.jsonl"),
  }
  stats.total_records = Object.values(stats.stores).reduce((s, n) => s + n, 0)

  // Source status distribution
  const sources = loadJsonl("sources.jsonl")
  stats.source_status = {}
  for (const s of sources) {
    const key = s.status || "unverified"
    stats.source_status[key] = (stats.source_status[key] || 0) + 1
  }

  // Class tag proposal progress
  const proposals = loadJsonl("entity-class-tags-proposed.jsonl")
  stats.class_tags = {
    total_proposals: proposals.length,
    pending: proposals.filter((p) => p.status === "pending").length,
    approved: proposals.filter((p) => p.status === "approved").length,
    rejected: proposals.filter((p) => p.status === "rejected").length,
  }

  // Entity coverage
  const entities = loadJsonl("entities.jsonl")
  stats.entities = {
    total: entities.length,
    donors: entities.filter((e) => e.entity_type === "donor").length,
    politicians: entities.filter((e) => e.entity_type === "politician").length,
    tags_approved: entities.filter((e) => e.tags_approved).length,
  }

  // Policy page readiness
  const policies = loadJsonl("policies.jsonl")
  stats.policies = {
    total: policies.length,
    draft: policies.filter((p) => (p.content_readiness || "draft") === "draft").length,
    ready: policies.filter((p) => p.content_readiness === "ready").length,
    verified: policies.filter((p) => p.content_readiness === "verified").length,
  }

  // Regression test status (quick run)
  const regressionResult = runSilent(`node --test "${path.join(__dirname, "phase-6-regression-tests.cjs")}"`)
  stats.regression_tests = regressionResult.ok ? "pass" : "fail"

  const contractResult = runSilent(`node --test "${path.join(__dirname, "query-engine-contract-tests.cjs")}"`)
  stats.contract_tests = contractResult.ok ? "pass" : "fail"

  // Data integrity audit (quick run)
  const integrityResult = runSilent(`node "${path.join(__dirname, "phase-6-data-integrity-audit.cjs")}"`)
  stats.data_integrity = integrityResult.ok ? "pass" : "fail"

  // Pre-commit sentinel count
  try {
    const hook = fs.readFileSync(path.join(ROOT, ".husky", "pre-commit"), "utf-8")
    stats.pre_commit_sentinels = (hook.match(/echo\s+"\s*->/g) || []).length
  } catch {
    stats.pre_commit_sentinels = 0
  }

  // Users + tier distribution
  const users = loadJsonl("users.jsonl")
  stats.users = {
    total: users.length,
    admin: users.filter((u) => u.is_admin).length,
  }

  return stats
}

// ─── Render ────────────────────────────────────────────────────────────

function renderFull(s) {
  const lines = []
  const sep = "─".repeat(60)
  lines.push("")
  lines.push("═".repeat(60))
  lines.push("  THE DONOR MAP — SYSTEM STATUS")
  lines.push(`  ${new Date().toISOString()}`)
  lines.push("═".repeat(60))
  lines.push("")

  // ─ Data stores
  lines.push("  CANONICAL DATA STORES")
  lines.push(sep)
  lines.push(`    sources.jsonl          ${String(s.stores.sources).padStart(8)}`)
  lines.push(`    relationships.jsonl    ${String(s.stores.relationships).padStart(8)}`)
  lines.push(`    entities.jsonl         ${String(s.stores.entities).padStart(8)}`)
  lines.push(`    events.jsonl           ${String(s.stores.events).padStart(8)}`)
  lines.push(`    policies.jsonl         ${String(s.stores.policies).padStart(8)}`)
  lines.push(`    polling.jsonl          ${String(s.stores.polling).padStart(8)}`)
  lines.push(`    users.jsonl            ${String(s.stores.users).padStart(8)}`)
  lines.push(`    claims/aoc.jsonl       ${String(s.stores.claims_aoc).padStart(8)}`)
  lines.push(`    ${"TOTAL".padEnd(22)} ${String(s.total_records).padStart(8)}`)
  lines.push("")

  // ─ Source registry health
  lines.push("  SOURCE REGISTRY HEALTH")
  lines.push(sep)
  const statusOrder = ["live", "archived", "needs_review", "dead", "paywall", "redirected", "generic_orphan", "unverified"]
  for (const status of statusOrder) {
    const count = s.source_status[status] || 0
    if (count > 0) {
      const pct = ((count / s.stores.sources) * 100).toFixed(1)
      lines.push(`    ${status.padEnd(22)} ${String(count).padStart(8)}   ${pct.padStart(5)}%`)
    }
  }
  lines.push("")

  // ─ Class tag progress
  lines.push("  CLASS TAG PROGRESS")
  lines.push(sep)
  lines.push(`    proposals total        ${String(s.class_tags.total_proposals).padStart(8)}`)
  lines.push(`    ✓ approved             ${String(s.class_tags.approved).padStart(8)}`)
  lines.push(`    ⏳ pending              ${String(s.class_tags.pending).padStart(8)}  ← review queue`)
  lines.push(`    ✗ rejected             ${String(s.class_tags.rejected).padStart(8)}`)
  const approvalRate = s.class_tags.total_proposals
    ? ((s.class_tags.approved / s.class_tags.total_proposals) * 100).toFixed(1)
    : "0.0"
  lines.push(`    approval rate          ${approvalRate.padStart(7)}%`)
  lines.push("")

  // ─ Entity coverage
  lines.push("  ENTITY COVERAGE")
  lines.push(sep)
  lines.push(`    total entities         ${String(s.entities.total).padStart(8)}`)
  lines.push(`      donors               ${String(s.entities.donors).padStart(8)}`)
  lines.push(`      politicians          ${String(s.entities.politicians).padStart(8)}`)
  lines.push(`    tags approved          ${String(s.entities.tags_approved).padStart(8)}`)
  lines.push("")

  // ─ Policy readiness
  lines.push("  POLICY PAGE READINESS")
  lines.push(sep)
  lines.push(`    total v1 policies      ${String(s.policies.total).padStart(8)}`)
  lines.push(`      draft                ${String(s.policies.draft).padStart(8)}`)
  lines.push(`      ready                ${String(s.policies.ready).padStart(8)}`)
  lines.push(`      verified             ${String(s.policies.verified).padStart(8)}  ← publishable`)
  lines.push("")

  // ─ Test + audit health
  lines.push("  TEST + AUDIT HEALTH")
  lines.push(sep)
  lines.push(`    regression tests       ${s.regression_tests === "pass" ? "✓ pass" : "✗ FAIL"}`)
  lines.push(`    contract tests         ${s.contract_tests === "pass" ? "✓ pass" : "✗ FAIL"}`)
  lines.push(`    data integrity audit   ${s.data_integrity === "pass" ? "✓ pass" : "✗ FAIL"}`)
  lines.push(`    pre-commit sentinels   ${s.pre_commit_sentinels}`)
  lines.push("")

  // ─ User/auth
  lines.push("  AUTH + USERS")
  lines.push(sep)
  lines.push(`    total users            ${String(s.users.total).padStart(8)}`)
  lines.push(`      admins               ${String(s.users.admin).padStart(8)}`)
  lines.push("")

  lines.push("═".repeat(60))
  lines.push("")

  return lines.join("\n")
}

function renderCompact(s) {
  const parts = [
    `${s.total_records} records`,
    `${s.class_tags.pending}/${s.class_tags.total_proposals} tags pending`,
    `${s.policies.verified}/${s.policies.total} policies verified`,
    `tests: ${s.regression_tests === "pass" && s.contract_tests === "pass" ? "✓" : "✗"}`,
    `integrity: ${s.data_integrity === "pass" ? "✓" : "✗"}`,
    `sentinels: ${s.pre_commit_sentinels}`,
  ]
  return parts.join(" · ")
}

// ─── Main ──────────────────────────────────────────────────────────────

function main() {
  const stats = gather()

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(stats, null, 2))
    process.stdout.write("\n")
    return
  }

  if (COMPACT) {
    console.log(renderCompact(stats))
    return
  }

  console.log(renderFull(stats))
}

main()
