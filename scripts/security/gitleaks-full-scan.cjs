#!/usr/bin/env node
/**
 * gitleaks-full-scan.cjs — Scan full git history for leaked secrets
 *
 * Runs gitleaks against the entire commit history and produces:
 * 1. A JSON report at .security/gitleaks-report.json (gitignored)
 * 2. A human-readable summary at content/Admin Notes/gitleaks-scan-report.md
 *    (redacted — never contains actual secret values)
 *
 * Install gitleaks first:
 *   Windows: scoop install gitleaks
 *   Mac:     brew install gitleaks
 *   Linux:   https://github.com/gitleaks/gitleaks/releases
 *
 * Usage:
 *   node scripts/security/gitleaks-full-scan.cjs
 *   node scripts/security/gitleaks-full-scan.cjs --ci   # exit 1 on findings
 */

const { execSync, spawnSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "../..")
const SECURITY_DIR = path.join(ROOT, ".security")
const REPORT_JSON = path.join(SECURITY_DIR, "gitleaks-report.json")
const REPORT_MD = path.join(ROOT, "content/Admin Notes/gitleaks-scan-report.md")
const isCI = process.argv.includes("--ci")

// ── Preflight: check gitleaks is installed ──────────────────────────

function checkGitleaks() {
  const result = spawnSync("gitleaks", ["version"], { encoding: "utf-8", shell: true })
  if (result.status !== 0) {
    console.error("ERROR: gitleaks is not installed or not in PATH.")
    console.error("Install:")
    console.error("  Windows: scoop install gitleaks")
    console.error("  Mac:     brew install gitleaks")
    console.error("  Linux:   https://github.com/gitleaks/gitleaks/releases")
    process.exit(2)
  }
  return result.stdout.trim()
}

// ── Run the scan ────────────────────────────────────────────────────

function runScan() {
  fs.mkdirSync(SECURITY_DIR, { recursive: true })

  console.log("Running gitleaks full-history scan (this may take a few minutes)...")
  const result = spawnSync(
    "gitleaks",
    [
      "detect",
      "--source", ROOT,
      "--log-opts=--all",
      "--report-format", "json",
      "--report-path", REPORT_JSON,
      "--exit-code", "1",
    ],
    { encoding: "utf-8", shell: true, cwd: ROOT, timeout: 600000 }
  )

  // gitleaks exit codes: 0 = no leaks, 1 = leaks found, other = error
  if (result.status !== 0 && result.status !== 1) {
    console.error("gitleaks crashed:", result.stderr)
    process.exit(2)
  }

  return result.status === 1
}

// ── Parse + summarize ───────────────────────────────────────────────

function generateReport(hasFindings) {
  const now = new Date().toISOString().split("T")[0]

  if (!hasFindings || !fs.existsSync(REPORT_JSON)) {
    const md = `---
title: Gitleaks Scan Report
type: admin-note
note-type: code
priority: normal
status: done
last-updated: '${now}'
generated-by: scripts/security/gitleaks-full-scan.cjs
---

# Gitleaks Scan Report

**Scan date:** ${now}
**Result:** No secrets detected in full git history.

This is a clean bill of health. Re-run periodically or before any public launch.
`
    fs.writeFileSync(REPORT_MD, md)
    console.log("No secrets found. Clean scan.")
    return
  }

  const findings = JSON.parse(fs.readFileSync(REPORT_JSON, "utf-8"))
  if (!Array.isArray(findings) || findings.length === 0) {
    console.log("No findings in report.")
    return
  }

  // Group by rule
  const byRule = {}
  for (const f of findings) {
    const rule = f.RuleID || f.ruleID || "unknown"
    if (!byRule[rule]) byRule[rule] = []
    byRule[rule].push(f)
  }

  // Build markdown (REDACTED — no secret values)
  const lines = []
  lines.push(`---`)
  lines.push(`title: Gitleaks Scan Report`)
  lines.push(`type: admin-note`)
  lines.push(`note-type: code`)
  lines.push(`priority: urgent`)
  lines.push(`status: open`)
  lines.push(`last-updated: '${now}'`)
  lines.push(`generated-by: scripts/security/gitleaks-full-scan.cjs`)
  lines.push(`---`)
  lines.push(``)
  lines.push(`# Gitleaks Scan Report`)
  lines.push(``)
  lines.push(`**Scan date:** ${now}`)
  lines.push(`**Total findings:** ${findings.length}`)
  lines.push(`**Rules triggered:** ${Object.keys(byRule).length}`)
  lines.push(``)
  lines.push(`## Summary by rule`)
  lines.push(``)
  lines.push(`| Rule | Count | Severity |`)
  lines.push(`|------|------:|----------|`)

  for (const [rule, items] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`| ${rule} | ${items.length} | ${items[0].Entropy > 4 ? "HIGH" : "MEDIUM"} |`)
  }

  lines.push(``)
  lines.push(`## Detailed findings (values redacted)`)
  lines.push(``)

  for (const [rule, items] of Object.entries(byRule).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`### ${rule} (${items.length} finding${items.length > 1 ? "s" : ""})`)
    lines.push(``)
    for (const f of items.slice(0, 10)) {
      const file = f.File || f.file || "unknown"
      const commit = (f.Commit || f.commit || "unknown").slice(0, 8)
      const date = f.Date || f.date || "unknown"
      const author = f.Author || f.author || "unknown"
      // Redact the actual secret — show only first 4 chars + length
      const secret = f.Secret || f.secret || ""
      const redacted = secret.length > 4
        ? `${secret.slice(0, 4)}...[${secret.length} chars]`
        : "[short]"
      lines.push(`- **File:** \`${file}\``)
      lines.push(`  - Commit: \`${commit}\` (${date}) by ${author}`)
      lines.push(`  - Match: \`${redacted}\``)
      lines.push(`  - **Remediation:** Rotate this credential immediately, then purge from history with \`git-filter-repo\``)
      lines.push(``)
    }
    if (items.length > 10) {
      lines.push(`  ... and ${items.length - 10} more findings for this rule`)
      lines.push(``)
    }
  }

  lines.push(`## Next steps`)
  lines.push(``)
  lines.push(`1. **Rotate** every credential found above. Assume they are compromised.`)
  lines.push(`2. **Purge** from git history using \`git-filter-repo\` (NOT \`git filter-branch\`).`)
  lines.push(`3. **Re-scan** after purge to confirm clean.`)
  lines.push(`4. **Enable** GitHub secret scanning to catch future commits.`)
  lines.push(``)
  lines.push(`Full JSON report: \`.security/gitleaks-report.json\` (gitignored, local only).`)

  fs.writeFileSync(REPORT_MD, lines.join("\n"))
  console.log(`Found ${findings.length} potential secret(s) across ${Object.keys(byRule).length} rule(s).`)
  console.log(`Report: ${REPORT_MD}`)
  console.log(`JSON:   ${REPORT_JSON}`)
}

// ── Main ────────────────────────────────────────────────────────────

const version = checkGitleaks()
console.log(`gitleaks ${version}`)

const hasFindings = runScan()
generateReport(hasFindings)

if (hasFindings && isCI) {
  console.error("FAIL: secrets detected in git history. See report above.")
  process.exit(1)
}
