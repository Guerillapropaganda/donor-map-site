#!/usr/bin/env node
/**
 * identity-audit.cjs — Surface personal identity exposure in the repo
 *
 * Scans the entire repo for patterns that could expose the operator's
 * personal identity: real names, email addresses, phone numbers, home
 * addresses, and git commit author identities.
 *
 * This is a REVIEW tool. It flags candidates for David to evaluate.
 * It does NOT auto-redact anything.
 *
 * Usage:
 *   node scripts/security/identity-audit.cjs
 *
 * Output:
 *   content/Admin Notes/identity-audit-report.md
 */

const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "../..")
const REPORT = path.join(ROOT, "content/Admin Notes/identity-audit-report.md")

// ── Patterns to scan for ────────────────────────────────────────────

// Phone numbers (US formats)
const PHONE_RE = /\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g

// Email addresses (excluding known project/service emails)
const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
const KNOWN_EMAILS = new Set([
  "guerillapropaganda@proton.me",
  "noreply@anthropic.com",
  "noreply@github.com",
  "action@github.com",
  "41898282+github-actions[bot]@users.noreply.github.com",
])

// Street address patterns (number + street name + suffix)
const ADDRESS_RE = /\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:St|Ave|Blvd|Dr|Ln|Rd|Way|Ct|Pl|Ter|Cir|Loop)\b/gi

// ZIP codes in suspicious context (not inside data files)
const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/g

// Social Security Number pattern
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g

// ── File walking ────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "public", ".obsidian",
  ".quartz-cache", ".security", ".claude",
])
const SKIP_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
  ".ttf", ".eot", ".mp4", ".mp3", ".pdf", ".zip", ".tar", ".gz",
  ".lock", ".map",
])

function walkFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkFiles(full))
    } else {
      const ext = path.extname(entry.name).toLowerCase()
      if (!SKIP_EXTENSIONS.has(ext)) results.push(full)
    }
  }
  return results
}

// ── Scanning ────────────────────────────────────────────────────────

function scanFile(filePath) {
  const findings = []
  let content
  try {
    content = fs.readFileSync(filePath, "utf-8")
  } catch {
    return findings
  }

  const relPath = path.relative(ROOT, filePath)
  const lines = content.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Emails (excluding known)
    for (const m of line.matchAll(EMAIL_RE)) {
      const email = m[0].toLowerCase()
      if (!KNOWN_EMAILS.has(email)) {
        findings.push({ type: "email", value: email, file: relPath, line: lineNum, severity: "high" })
      }
    }

    // Phone numbers
    for (const m of line.matchAll(PHONE_RE)) {
      // Skip if inside a data file that legitimately contains phone numbers
      if (relPath.startsWith("data/")) continue
      findings.push({ type: "phone", value: m[0], file: relPath, line: lineNum, severity: "high" })
    }

    // Street addresses
    for (const m of line.matchAll(ADDRESS_RE)) {
      findings.push({ type: "address", value: m[0], file: relPath, line: lineNum, severity: "high" })
    }

    // SSN
    for (const m of line.matchAll(SSN_RE)) {
      findings.push({ type: "ssn", value: "[REDACTED]", file: relPath, line: lineNum, severity: "critical" })
    }
  }

  return findings
}

// ── Git author audit ────────────────────────────────────────────────

function auditGitAuthors() {
  const findings = []
  try {
    const raw = execSync("git log --all --format=\"%an <%ae>\"", {
      encoding: "utf-8",
      cwd: ROOT,
      maxBuffer: 50 * 1024 * 1024,
    })
    const authors = new Map()
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue
      authors.set(line.trim(), (authors.get(line.trim()) || 0) + 1)
    }
    for (const [author, count] of authors) {
      findings.push({ type: "git-author", value: author, count, severity: "review" })
    }
  } catch (e) {
    findings.push({ type: "git-error", value: e.message, severity: "review" })
  }
  return findings
}

// ── Metadata file checks ────────────────────────────────────────────

function auditMetadataFiles() {
  const findings = []
  const checks = [
    "package.json",
    "ops/package.json",
    "CNAME",
    ".mailmap",
  ]
  for (const rel of checks) {
    const full = path.join(ROOT, rel)
    if (!fs.existsSync(full)) continue
    const content = fs.readFileSync(full, "utf-8")
    // Check for "author" fields
    if (rel.endsWith("package.json")) {
      try {
        const pkg = JSON.parse(content)
        if (pkg.author && typeof pkg.author === "string" && pkg.author.length > 0) {
          findings.push({ type: "pkg-author", value: pkg.author, file: rel, severity: "review" })
        }
        if (pkg.author && typeof pkg.author === "object" && pkg.author.name) {
          findings.push({ type: "pkg-author", value: pkg.author.name, file: rel, severity: "review" })
        }
      } catch {}
    }
  }
  return findings
}

// ── Report generation ───────────────────────────────────────────────

function generateReport(fileFindings, gitFindings, metaFindings) {
  const now = new Date().toISOString().split("T")[0]
  const allFindings = [...fileFindings, ...gitFindings, ...metaFindings]
  const critical = allFindings.filter(f => f.severity === "critical")
  const high = allFindings.filter(f => f.severity === "high")

  const lines = []
  lines.push(`---`)
  lines.push(`title: Identity Audit Report`)
  lines.push(`type: admin-note`)
  lines.push(`note-type: code`)
  lines.push(`priority: ${critical.length > 0 ? "urgent" : "normal"}`)
  lines.push(`status: open`)
  lines.push(`last-updated: '${now}'`)
  lines.push(`generated-by: scripts/security/identity-audit.cjs`)
  lines.push(`---`)
  lines.push(``)
  lines.push(`# Identity Audit Report`)
  lines.push(``)
  lines.push(`**Scan date:** ${now}`)
  lines.push(`**Total findings:** ${allFindings.length}`)
  lines.push(`**Critical:** ${critical.length} | **High:** ${high.length} | **Review:** ${allFindings.length - critical.length - high.length}`)
  lines.push(``)
  lines.push(`David: review each finding below and decide what stays and what needs scrubbing. This script flags candidates. It cannot decide what is sensitive.`)
  lines.push(``)

  // Git authors
  lines.push(`## Git commit authors`)
  lines.push(``)
  lines.push(`All unique author identities across the full git history:`)
  lines.push(``)
  lines.push(`| Author | Commit count |`)
  lines.push(`|--------|------------:|`)
  for (const f of gitFindings.filter(f => f.type === "git-author").sort((a, b) => b.count - a.count)) {
    lines.push(`| ${f.value} | ${f.count} |`)
  }
  lines.push(``)
  lines.push(`If any of these expose a real name you want hidden, you will need to rewrite git history with \`git-filter-repo --mailmap\`.`)
  lines.push(``)

  // Package metadata
  if (metaFindings.length > 0) {
    lines.push(`## Package/metadata files`)
    lines.push(``)
    for (const f of metaFindings) {
      lines.push(`- **${f.file}** \`${f.type}\`: \`${f.value}\``)
    }
    lines.push(``)
  }

  // File findings by type
  if (fileFindings.length > 0) {
    lines.push(`## File scan findings`)
    lines.push(``)
    const byType = {}
    for (const f of fileFindings) {
      if (!byType[f.type]) byType[f.type] = []
      byType[f.type].push(f)
    }
    for (const [type, items] of Object.entries(byType)) {
      lines.push(`### ${type} (${items.length} finding${items.length > 1 ? "s" : ""})`)
      lines.push(``)
      for (const f of items.slice(0, 30)) {
        const val = f.type === "ssn" ? "[REDACTED]" : f.value
        lines.push(`- \`${f.file}:${f.line}\` ${val} [${f.severity}]`)
      }
      if (items.length > 30) lines.push(`  ... and ${items.length - 30} more`)
      lines.push(``)
    }
  }

  if (fileFindings.length === 0 && metaFindings.length === 0) {
    lines.push(`## File scan`)
    lines.push(``)
    lines.push(`No personal emails, phone numbers, addresses, or SSNs found in repo files.`)
    lines.push(``)
  }

  lines.push(`## Recommendations`)
  lines.push(``)
  lines.push(`1. Review git author names. Rewrite with \`git-filter-repo --mailmap\` if needed.`)
  lines.push(`2. Check WHOIS privacy on domain registrar.`)
  lines.push(`3. Any email addresses flagged above that are personal (not project) should be removed or replaced.`)
  lines.push(`4. Re-run this audit after any cleanup to confirm.`)

  fs.writeFileSync(REPORT, lines.join("\n"))
  console.log(`Report: ${REPORT}`)
  return allFindings.length
}

// ── Main ────────────────────────────────────────────────────────────

console.log("Scanning repo for personal identity exposure...")

const files = walkFiles(ROOT)
console.log(`Scanning ${files.length} files...`)

const fileFindings = []
for (const f of files) {
  fileFindings.push(...scanFile(f))
}

console.log("Auditing git commit authors...")
const gitFindings = auditGitAuthors()

console.log("Checking metadata files...")
const metaFindings = auditMetadataFiles()

const total = generateReport(fileFindings, gitFindings, metaFindings)
console.log(`Done. ${total} finding(s) written to report.`)
