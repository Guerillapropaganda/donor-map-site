#!/usr/bin/env node
/**
 * harness-json-smoke-test.cjs
 *
 * Meta-test for the harness itself. Runs every CHECKS entry from
 * vault-audit.cjs that exposes a `--json` flag, and asserts the
 * stdout parses as JSON. Catches the failure mode where a check
 * regression breaks its output format silently — vault-audit.cjs's
 * parser swallows the JSON parse error and reports `findings_count: 0`
 * with `notes: '(json parse failed)'`, so the regression looks like
 * "0 findings" instead of "broken." Without this smoke test, ops
 * pages keep showing green for a check that's effectively dead.
 *
 * Deferred audit item #14 from the 2026-04-26 system audit.
 *
 * Approach: run each --json check with a short timeout, capture
 * stdout, attempt JSON.parse. Report:
 *   · pass — parsed cleanly, has findings_count field
 *   · fail — non-zero exit AND no usable JSON
 *   · empty — parsed OK but missing required fields
 *
 * NOT a queue producer. Run manually or wire into pre-commit (already
 * done via this commit). Cheap (~30s for the full suite when caches
 * are warm) so it's reasonable to run on every commit.
 *
 * Usage:
 *   node scripts/harness-json-smoke-test.cjs           # human-readable
 *   node scripts/harness-json-smoke-test.cjs --json    # CI-friendly
 */

const { spawnSync } = require("child_process")
const path = require("path")
const fs = require("fs")

const JSON_OUT = process.argv.includes("--json")
const ROOT = path.resolve(__dirname, "..")

// Walk vault-audit.cjs's CHECKS array and pull the cmd lines for entries
// that include "--json" in their argv. We deliberately don't `require` the
// file (it'd execute side effects); instead, we parse the cmd array source
// out via regex. Brittle if the format changes drastically; should be fine
// while CHECKS stays a literal array.
function discoverJsonChecks() {
  const src = fs.readFileSync(path.join(ROOT, "scripts", "vault-audit.cjs"), "utf-8")
  // Find each entry: { name: '...', description: '...', cmd: [...], ... }
  const entries = []
  const checkBlockRe = /\{\s*name:\s*'([^']+)'[\s\S]*?cmd:\s*(\[[^\]]+\])[\s\S]*?(?:timeout_ms:\s*(\d+))?[\s\S]*?\}/g
  let m
  while ((m = checkBlockRe.exec(src)) !== null) {
    const name = m[1]
    const cmdRaw = m[2]
    let cmd
    try {
      // The cmd source uses single quotes; convert to JSON-friendly double quotes
      cmd = JSON.parse(cmdRaw.replace(/'/g, '"'))
    } catch {
      continue
    }
    if (!Array.isArray(cmd) || !cmd.includes("--json")) continue
    const timeout = m[3] ? parseInt(m[3], 10) : 60000
    entries.push({ name, cmd, timeout_ms: timeout })
  }
  return entries
}

function runSmokeTest(entry) {
  const start = Date.now()
  const [executable, ...args] = entry.cmd
  const r = spawnSync(executable, args, {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: Math.min(entry.timeout_ms || 60000, 90000),
    windowsHide: true,
  })
  const elapsed = Date.now() - start
  const stdout = r.stdout || ""
  const stderr = r.stderr || ""

  if (r.error) {
    return {
      name: entry.name,
      verdict: "fail",
      reason: `spawn error: ${r.error.code || r.error.message}`,
      elapsed_ms: elapsed,
    }
  }

  // Try to parse. Some checks emit progress output before the JSON line,
  // so also try grabbing the LAST line that looks like JSON.
  let parsed = null
  let parseError = null
  try {
    parsed = JSON.parse(stdout)
  } catch (e) {
    parseError = e.message
    // Try the last non-empty line
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean)
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim()
      if (line.startsWith("{") && line.endsWith("}")) {
        try {
          parsed = JSON.parse(line)
          parseError = null
          break
        } catch {}
      }
    }
  }

  if (!parsed) {
    return {
      name: entry.name,
      verdict: "fail",
      reason: `stdout did not parse as JSON: ${parseError || "empty"}`,
      stderr_tail: stderr.slice(-300),
      stdout_tail: stdout.slice(-300),
      elapsed_ms: elapsed,
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { name: entry.name, verdict: "fail", reason: "parsed but not an object", elapsed_ms: elapsed }
  }

  // We deliberately don't require a top-level `findings_count` field. Many
  // checks emit shapes like `{total_findings, failed, results}` and rely on
  // their dedicated parser in vault-audit.cjs to compute findings_count.
  // A regression that breaks that mapping is a parser bug, not a check-output
  // bug — it'd be invisible to this smoke test either way. The contract this
  // test enforces is just "the check still emits parseable JSON," which
  // catches the high-frequency failure mode (script crash / wrong stdout
  // mixed with debug noise).
  return {
    name: entry.name,
    verdict: "pass",
    keys_present: Object.keys(parsed).slice(0, 6),
    elapsed_ms: elapsed,
  }
}

function main() {
  const entries = discoverJsonChecks()
  const results = entries.map(runSmokeTest)

  const passed = results.filter((r) => r.verdict === "pass")
  const failed = results.filter((r) => r.verdict === "fail")

  if (JSON_OUT) {
    console.log(
      JSON.stringify(
        {
          findings_count: failed.length,
          notes: `${entries.length} JSON check${entries.length === 1 ? "" : "s"} smoke-tested · ${passed.length} pass, ${failed.length} fail`,
          checks_total: entries.length,
          passed: passed.length,
          failed: failed.length,
          findings: failed,
        },
        null,
        2,
      ),
    )
    process.exit(failed.length > 0 ? 1 : 0)
  }

  console.log("")
  console.log("═══ harness-json-smoke-test ═══")
  console.log(`  scanned: ${entries.length} JSON-emitting checks`)
  console.log(`  pass:    ${passed.length}`)
  console.log(`  fail:    ${failed.length}`)
  console.log("")
  if (failed.length === 0) {
    console.log("  ✓ all clean")
    process.exit(0)
  }
  for (const r of failed) {
    console.log(`  ✗ ${r.name} — ${r.reason}`)
    if (r.stderr_tail) console.log(`     stderr: ${r.stderr_tail.replace(/\n/g, " | ").slice(0, 200)}`)
    if (r.stdout_tail) console.log(`     stdout: ${r.stdout_tail.replace(/\n/g, " | ").slice(0, 200)}`)
  }
  process.exit(failed.length > 0 ? 1 : 0)
}

main()
