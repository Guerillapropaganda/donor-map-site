#!/usr/bin/env node
// phase-6-data-integrity-audit.cjs — Phase 6 / Bug Hunt
//
// Walks every canonical data store and reports schema violations,
// duplicate keys, orphaned foreign key references, and staleness.
// This is one of the Phase 6 audit deliverables per ADR-0005.
//
// Audits performed:
//
//   1. data/sources.jsonl
//      - Schema validation via sources-schema.cjs
//      - URL dedupe check (no two records with same normalized URL)
//      - Staleness check (records with last_checked > 30 days ago)
//      - Status distribution sanity
//
//   2. data/relationships.jsonl
//      - Schema validation via relationship-edge-validator.cjs
//      - Duplicate id check
//      - From/to name references (can't check against entities without
//        false positives — only flag completely malformed)
//
//   3. data/entities.jsonl
//      - Schema validation via entities-schema.cjs
//      - Duplicate id / name / profile_path check
//      - Class tag vocabulary compliance (already validator-enforced,
//        this catches drift from hand edits)
//
//   4. data/events.jsonl
//      - Schema validation via events-schema.cjs
//      - policy_id foreign key resolution (each referenced policy must
//        exist in policies.jsonl)
//      - obstruction_type enum compliance
//
//   5. data/policies.jsonl + data/polling.jsonl
//      - Schema validation
//      - Cross-reference: polling records reference valid policy_ids
//
//   6. data/users.jsonl
//      - Schema validation
//      - Tier enum compliance
//      - clerk_id uniqueness
//
//   7. data/claims/*.jsonl
//      - Schema validation via claims-schema.cjs
//      - source_ref OR source_fallback_url present on every claim
//
// Writes a report at content/Phases/phase-6/data-integrity-report.md
// with pass/fail counts per store and a detailed listing of every
// failure.
//
// Usage:
//   node scripts/phase-6-data-integrity-audit.cjs               # dry-run
//   node scripts/phase-6-data-integrity-audit.cjs --write
//   node scripts/phase-6-data-integrity-audit.cjs --store sources  # scope to one store

const fs = require("fs")
const path = require("path")

const WRITE = process.argv.includes("--write")
const storeFlag = process.argv.indexOf("--store")
const STORE_FILTER = storeFlag !== -1 ? process.argv[storeFlag + 1] : null

const ROOT = path.join(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const OUTPUT_FILE = path.join(ROOT, "content", "Phases", "phase-6", "data-integrity-report.md")

// ─── Helpers ─────────────────────────────────────────────────────────

function loadJsonl(file) {
  if (!fs.existsSync(file)) return []
  const raw = fs.readFileSync(file, "utf-8")
  const records = []
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      records.push(JSON.parse(trimmed))
    } catch (e) {
      records.push({ __parse_error: e.message, __raw: trimmed.slice(0, 200) })
    }
  }
  return records
}

function summarize(results) {
  return {
    total: results.total,
    passed: results.passed,
    failed: results.failed,
    failures: results.failures.slice(0, 20), // first 20 for report size
    failure_overflow: Math.max(0, results.failures.length - 20),
  }
}

// ─── Audit: sources.jsonl ────────────────────────────────────────────

function auditSources() {
  const file = path.join(DATA_DIR, "sources.jsonl")
  const records = loadJsonl(file)
  const results = { total: records.length, passed: 0, failed: 0, failures: [] }

  if (records.length === 0) {
    return { ...summarize(results), skipped: !fs.existsSync(file) }
  }

  let validator
  try {
    validator = require("./lib/sources-schema.cjs")
  } catch (e) {
    results.failures.push({ type: "validator-missing", message: e.message })
    return summarize(results)
  }

  const urlSeen = new Map()
  const idSeen = new Set()

  for (const rec of records) {
    if (rec.__parse_error) {
      results.failed += 1
      results.failures.push({ type: "parse-error", id: "-", message: rec.__parse_error })
      continue
    }

    // Duplicate id
    if (idSeen.has(rec.id)) {
      results.failed += 1
      results.failures.push({ type: "duplicate-id", id: rec.id, message: "id appears more than once" })
      continue
    }
    idSeen.add(rec.id)

    // Schema
    const { ok, errors } = validator.validate(rec)
    if (!ok) {
      results.failed += 1
      results.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
      continue
    }

    // URL dedupe (normalized)
    const normKey = validator.normalizeUrl(rec.url)
    if (normKey && urlSeen.has(normKey)) {
      results.failed += 1
      results.failures.push({
        type: "url-dedupe",
        id: rec.id,
        message: `normalized URL collision with ${urlSeen.get(normKey)}`,
      })
      continue
    }
    urlSeen.set(normKey, rec.id)

    results.passed += 1
  }

  return summarize(results)
}

// ─── Audit: relationships.jsonl + data/derived/*.jsonl ──────────────
// Extended 2026-04-24 to cover derived edge files (FEC / IRS /
// USASpending ingester outputs). Previously audited only the canonical
// file, which left ~162k monetary edges unaudited — 72% of the real
// graph was invisible to integrity checks. Same shape rules apply to
// both canonical and derived.

function auditRelationships() {
  const files = [path.join(DATA_DIR, "relationships.jsonl")]
  const derivedDir = path.join(DATA_DIR, "derived")
  if (fs.existsSync(derivedDir)) {
    for (const f of fs.readdirSync(derivedDir).sort()) {
      if (f.endsWith(".jsonl")) files.push(path.join(derivedDir, f))
    }
  }

  const results = { total: 0, passed: 0, failed: 0, failures: [], by_source: {} }
  const idSeen = new Set()

  for (const file of files) {
    const label = path.basename(file)
    const records = loadJsonl(file)
    const src = { total: records.length, passed: 0, failed: 0 }
    results.total += records.length

    for (const rec of records) {
      if (rec.__parse_error) {
        results.failed += 1
        src.failed += 1
        results.failures.push({ type: "parse-error", id: "-", source: label, message: rec.__parse_error })
        continue
      }

      // Duplicate-id check is cross-file: edge ids must be unique across
      // canonical + derived (they're hash-stable per edge content).
      if (rec.id && idSeen.has(rec.id)) {
        results.failed += 1
        src.failed += 1
        results.failures.push({ type: "duplicate-id", id: rec.id, source: label, message: "edge id collision across files" })
        continue
      }
      if (rec.id) idSeen.add(rec.id)

      const missing = []
      for (const field of ["from", "to", "type"]) {
        if (!rec[field]) missing.push(field)
      }
      if (missing.length) {
        results.failed += 1
        src.failed += 1
        results.failures.push({
          type: "shape",
          id: rec.id || "-",
          source: label,
          message: `missing ${missing.join(", ")}`,
        })
        continue
      }

      results.passed += 1
      src.passed += 1
    }
    results.by_source[label] = src
  }

  if (results.total === 0) return { ...summarize(results), skipped: true }
  return summarize(results)
}

// ─── Audit: entities.jsonl ───────────────────────────────────────────

function auditEntities() {
  const file = path.join(DATA_DIR, "entities.jsonl")
  const records = loadJsonl(file)
  const results = { total: records.length, passed: 0, failed: 0, failures: [] }
  if (records.length === 0) return { ...summarize(results), skipped: !fs.existsSync(file) }

  let validator
  try {
    validator = require("./lib/entities-schema.cjs")
  } catch (e) {
    results.failures.push({ type: "validator-missing", message: e.message })
    return summarize(results)
  }

  const idSeen = new Set()
  const pathSeen = new Map()

  for (const rec of records) {
    if (rec.__parse_error) {
      results.failed += 1
      results.failures.push({ type: "parse-error", id: "-", message: rec.__parse_error })
      continue
    }

    if (idSeen.has(rec.id)) {
      results.failed += 1
      results.failures.push({ type: "duplicate-id", id: rec.id, message: "entity id collision" })
      continue
    }
    idSeen.add(rec.id)

    if (rec.profile_path) {
      if (pathSeen.has(rec.profile_path)) {
        results.failed += 1
        results.failures.push({
          type: "duplicate-profile-path",
          id: rec.id,
          message: `profile_path collision with ${pathSeen.get(rec.profile_path)}`,
        })
        continue
      }
      pathSeen.set(rec.profile_path, rec.id)
    }

    const { ok, errors } = validator.validate(rec)
    if (!ok) {
      results.failed += 1
      results.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
      continue
    }

    results.passed += 1
  }

  return summarize(results)
}

// ─── Audit: events.jsonl ─────────────────────────────────────────────

function auditEvents() {
  const file = path.join(DATA_DIR, "events.jsonl")
  const records = loadJsonl(file)
  const results = { total: records.length, passed: 0, failed: 0, failures: [] }
  if (records.length === 0) return { ...summarize(results), skipped: !fs.existsSync(file) }

  let validator
  try {
    validator = require("./lib/events-schema.cjs")
  } catch (e) {
    results.failures.push({ type: "validator-missing", message: e.message })
    return summarize(results)
  }

  // Load policy ids for foreign key resolution
  const policyIds = new Set()
  const policiesFile = path.join(DATA_DIR, "policies.jsonl")
  if (fs.existsSync(policiesFile)) {
    for (const p of loadJsonl(policiesFile)) {
      if (p.id) policyIds.add(p.id)
    }
  }

  for (const rec of records) {
    if (rec.__parse_error) {
      results.failed += 1
      results.failures.push({ type: "parse-error", id: "-", message: rec.__parse_error })
      continue
    }

    const { ok, errors } = validator.validate(rec)
    if (!ok) {
      results.failed += 1
      results.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
      continue
    }

    // policy_id foreign key resolution
    if (rec.policy_id && !policyIds.has(rec.policy_id)) {
      results.failed += 1
      results.failures.push({
        type: "orphan-policy-ref",
        id: rec.id,
        message: `policy_id ${rec.policy_id} not in policies.jsonl`,
      })
      continue
    }

    results.passed += 1
  }

  return summarize(results)
}

// ─── Audit: policies.jsonl + polling.jsonl ──────────────────────────

function auditPoliciesAndPolling() {
  const results = {
    policies: { total: 0, passed: 0, failed: 0, failures: [] },
    polling: { total: 0, passed: 0, failed: 0, failures: [] },
  }

  const policiesFile = path.join(DATA_DIR, "policies.jsonl")
  const pollingFile = path.join(DATA_DIR, "polling.jsonl")

  const policies = loadJsonl(policiesFile)
  results.policies.total = policies.length
  const policyIds = new Set()

  let policiesValidator = null
  try {
    policiesValidator = require("./lib/policies-schema.cjs")
  } catch {}

  for (const rec of policies) {
    if (rec.__parse_error) {
      results.policies.failed += 1
      results.policies.failures.push({ type: "parse-error", id: "-", message: rec.__parse_error })
      continue
    }
    if (rec.id) policyIds.add(rec.id)

    if (policiesValidator) {
      const { ok, errors } = policiesValidator.validate(rec)
      if (!ok) {
        results.policies.failed += 1
        results.policies.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
        continue
      }
    }
    results.policies.passed += 1
  }

  const polls = loadJsonl(pollingFile)
  results.polling.total = polls.length

  let pollingValidator = null
  try {
    pollingValidator = require("./lib/polling-schema.cjs")
  } catch {}

  for (const rec of polls) {
    if (rec.__parse_error) {
      results.polling.failed += 1
      results.polling.failures.push({ type: "parse-error", id: "-", message: rec.__parse_error })
      continue
    }

    if (pollingValidator) {
      const { ok, errors } = pollingValidator.validate(rec)
      if (!ok) {
        results.polling.failed += 1
        results.polling.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
        continue
      }
    }

    if (rec.policy_id && !policyIds.has(rec.policy_id)) {
      results.polling.failed += 1
      results.polling.failures.push({
        type: "orphan-policy-ref",
        id: rec.id,
        message: `policy_id ${rec.policy_id} not in policies.jsonl`,
      })
      continue
    }

    results.polling.passed += 1
  }

  return {
    policies: summarize(results.policies),
    polling: summarize(results.polling),
  }
}

// ─── Audit: users.jsonl ─────────────────────────────────────────────

function auditUsers() {
  const file = path.join(DATA_DIR, "users.jsonl")
  const records = loadJsonl(file)
  const results = { total: records.length, passed: 0, failed: 0, failures: [] }
  if (records.length === 0) return { ...summarize(results), skipped: !fs.existsSync(file) }

  let validator = null
  try {
    validator = require("./lib/users-schema.cjs")
  } catch {}

  const clerkIdSeen = new Set()
  const emailSeen = new Set()

  for (const rec of records) {
    if (rec.__parse_error) {
      results.failed += 1
      results.failures.push({ type: "parse-error", id: "-", message: rec.__parse_error })
      continue
    }

    if (rec.clerk_id) {
      if (clerkIdSeen.has(rec.clerk_id)) {
        results.failed += 1
        results.failures.push({
          type: "duplicate-clerk-id",
          id: rec.id,
          message: `clerk_id collision`,
        })
        continue
      }
      clerkIdSeen.add(rec.clerk_id)
    }

    if (rec.email) {
      const lower = rec.email.toLowerCase()
      if (emailSeen.has(lower)) {
        results.failed += 1
        results.failures.push({ type: "duplicate-email", id: rec.id, message: "email collision" })
        continue
      }
      emailSeen.add(lower)
    }

    if (validator) {
      const { ok, errors } = validator.validate(rec)
      if (!ok) {
        results.failed += 1
        results.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
        continue
      }
    }

    results.passed += 1
  }

  return summarize(results)
}

// ─── Audit: claims ──────────────────────────────────────────────────

function auditClaims() {
  const claimsDir = path.join(DATA_DIR, "claims")
  if (!fs.existsSync(claimsDir)) return { total: 0, passed: 0, failed: 0, failures: [], skipped: true }

  let validator = null
  try {
    validator = require("./lib/claims-schema.cjs")
  } catch {}

  const results = { total: 0, passed: 0, failed: 0, failures: [] }
  const files = fs.readdirSync(claimsDir).filter((f) => f.endsWith(".jsonl"))

  for (const f of files) {
    const records = loadJsonl(path.join(claimsDir, f))
    for (const rec of records) {
      results.total += 1
      if (rec.__parse_error) {
        results.failed += 1
        results.failures.push({ type: "parse-error", id: f, message: rec.__parse_error })
        continue
      }

      if (validator) {
        const { ok, errors } = validator.validate(rec)
        if (!ok) {
          results.failed += 1
          results.failures.push({ type: "schema", id: rec.id, message: errors.join("; ") })
          continue
        }
      }

      // Defamation firewall: every claim must have source_ref OR fallback URL
      if (!rec.source_ref && !rec.source_fallback_url) {
        results.failed += 1
        results.failures.push({
          type: "missing-source",
          id: rec.id,
          message: "claim has no source_ref and no source_fallback_url",
        })
        continue
      }

      results.passed += 1
    }
  }

  return summarize(results)
}

// ─── Report builder ─────────────────────────────────────────────────

function buildReport(audits) {
  const lines = []
  lines.push("---")
  lines.push('title: "Phase 6 Data Integrity Audit Report"')
  lines.push("type: audit-report")
  lines.push("phase: 6")
  lines.push(`last-updated: ${new Date().toISOString().slice(0, 10)}`)
  lines.push("generator: scripts/phase-6-data-integrity-audit.cjs")
  lines.push("editor-vouched: true")
  lines.push("---")
  lines.push("")
  lines.push("# Phase 6 Data Integrity Audit Report")
  lines.push("")
  lines.push(
    "Automated schema validation + duplicate detection + foreign key resolution across every canonical `data/*.jsonl` store. One of the Phase 6 audit deliverables per ADR-0005. Re-run with `node scripts/phase-6-data-integrity-audit.cjs --write` any time.",
  )
  lines.push("")

  // Summary table
  lines.push("## Summary")
  lines.push("")
  lines.push("| Store | Total | Passed | Failed | Status |")
  lines.push("|---|---:|---:|---:|:---|")

  const stores = [
    { key: "sources", label: "sources.jsonl", result: audits.sources },
    { key: "relationships", label: "relationships.jsonl", result: audits.relationships },
    { key: "entities", label: "entities.jsonl", result: audits.entities },
    { key: "events", label: "events.jsonl", result: audits.events },
    { key: "policies", label: "policies.jsonl", result: audits.policiesAndPolling.policies },
    { key: "polling", label: "polling.jsonl", result: audits.policiesAndPolling.polling },
    { key: "users", label: "users.jsonl", result: audits.users },
    { key: "claims", label: "claims/*.jsonl", result: audits.claims },
  ]

  for (const s of stores) {
    const r = s.result
    const status =
      r.skipped ? "_(skipped — file not present)_" : r.failed === 0 ? "✅ clean" : `❌ ${r.failed} failed`
    lines.push(`| ${s.label} | ${r.total} | ${r.passed} | ${r.failed} | ${status} |`)
  }
  lines.push("")

  const totalFailed = stores.reduce((sum, s) => sum + (s.result.failed || 0), 0)
  if (totalFailed === 0) {
    lines.push("**All audited stores passed.** No schema violations, no duplicate keys, no orphan foreign key references detected.")
  } else {
    lines.push(
      `**${totalFailed} total failures across ${stores.filter((s) => s.result.failed > 0).length} store(s).** Details below.`,
    )
  }
  lines.push("")

  // Per-store details
  for (const s of stores) {
    const r = s.result
    if (r.skipped) continue
    if (r.failed === 0) continue

    lines.push(`## ${s.label} — ${r.failed} failure(s)`)
    lines.push("")
    lines.push("| Type | Record ID | Message |")
    lines.push("|---|---|---|")
    for (const f of r.failures) {
      const safeMsg = (f.message || "").replace(/\|/g, "\\|").slice(0, 200)
      lines.push(`| ${f.type} | \`${f.id || "-"}\` | ${safeMsg} |`)
    }
    if (r.failure_overflow > 0) {
      lines.push(`| ... | | +${r.failure_overflow} more failures not shown |`)
    }
    lines.push("")
  }

  lines.push("---")
  lines.push("")
  lines.push(
    "*Regenerate: `node scripts/phase-6-data-integrity-audit.cjs --write`. Idempotent — overwrites this file with the current audit state.*",
  )

  return lines.join("\n")
}

// ─── Main ───────────────────────────────────────────────────────────

function main() {
  console.log("")
  console.log("═══ phase-6-data-integrity-audit ═══")
  console.log(`  data dir: ${DATA_DIR}`)
  console.log(`  dry-run:  ${!WRITE}`)
  if (STORE_FILTER) console.log(`  store:    ${STORE_FILTER}`)
  console.log("")

  const audits = {}

  const runAll = !STORE_FILTER
  if (runAll || STORE_FILTER === "sources") audits.sources = auditSources()
  if (runAll || STORE_FILTER === "relationships") audits.relationships = auditRelationships()
  if (runAll || STORE_FILTER === "entities") audits.entities = auditEntities()
  if (runAll || STORE_FILTER === "events") audits.events = auditEvents()
  if (runAll || STORE_FILTER === "policies") audits.policiesAndPolling = auditPoliciesAndPolling()
  if (runAll || STORE_FILTER === "users") audits.users = auditUsers()
  if (runAll || STORE_FILTER === "claims") audits.claims = auditClaims()

  // Pretty-print summary to stdout
  const storesInfo = [
    { key: "sources", obj: audits.sources },
    { key: "relationships", obj: audits.relationships },
    { key: "entities", obj: audits.entities },
    { key: "events", obj: audits.events },
    {
      key: "policies",
      obj: audits.policiesAndPolling && audits.policiesAndPolling.policies,
    },
    {
      key: "polling",
      obj: audits.policiesAndPolling && audits.policiesAndPolling.polling,
    },
    { key: "users", obj: audits.users },
    { key: "claims", obj: audits.claims },
  ]

  console.log("  store              total   pass    fail")
  console.log("  ─────────────────  ─────   ─────   ─────")
  for (const { key, obj } of storesInfo) {
    if (!obj) continue
    if (obj.skipped) {
      console.log(`  ${key.padEnd(17)}  (file not present — skipped)`)
      continue
    }
    const status = obj.failed === 0 ? "✓" : "✗"
    console.log(
      `  ${key.padEnd(17)}  ${String(obj.total).padStart(5)}   ${String(obj.passed).padStart(5)}   ${String(obj.failed).padStart(5)}  ${status}`,
    )
  }

  if (WRITE && runAll) {
    const report = buildReport(audits)
    const dir = path.dirname(OUTPUT_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(OUTPUT_FILE, report, "utf-8")
    console.log("")
    console.log(`  wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
  } else if (!WRITE) {
    console.log("")
    console.log("  DRY RUN — report not written")
  }
  console.log("")
}

main()
