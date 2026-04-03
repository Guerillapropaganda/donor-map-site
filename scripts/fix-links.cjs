#!/usr/bin/env node
/**
 * The Donor Map — Link Checker & Fixer
 *
 * Usage:
 *   node scripts/fix-links.cjs                  # Check wikilinks only (no internet)
 *   node scripts/fix-links.cjs --check-urls     # Also verify external URLs
 *   node scripts/fix-links.cjs --fix            # Auto-fix broken wikilinks
 *   node scripts/fix-links.cjs --check-urls --fix  # Both
 *
 * Flags:
 *   --check-urls    Verify external URLs (uses minimal data — HEAD requests only)
 *   --fix           Auto-fix broken wikilinks where a match is found
 *   --limit N       Only check first N external URLs (default: all)
 *   --verbose       Show every link checked, not just broken ones
 */

const fs = require("fs")
const path = require("path")
const http = require("http")
const https = require("https")

// ─── Config ─────────────────────────────────
const CONTENT_DIR = path.resolve(__dirname, "..", "content")
const args = process.argv.slice(2)
const CHECK_URLS = args.includes("--check-urls")
const AUTO_FIX = args.includes("--fix")
const VERBOSE = args.includes("--verbose")
const LIMIT_IDX = args.indexOf("--limit")
const URL_LIMIT = LIMIT_IDX !== -1 ? parseInt(args[LIMIT_IDX + 1], 10) : Infinity

// ─── Live Log (writes to vault as it goes) ──
const LOG_DIR = path.resolve(CONTENT_DIR, "Stories", "Internal", "Research Logs")
const LOG_DATE = new Date().toISOString().split("T")[0]
const LOG_FILE = path.join(LOG_DIR, `${LOG_DATE} Link Audit.md`)

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}

function logInit() {
  ensureLogDir()
  const header =
    `---\ntitle: "${LOG_DATE} Link Audit"\n---\n\n` +
    `# Link Audit — ${LOG_DATE}\n\n` +
    `**Status:** Running...\n` +
    `**Mode:** ${AUTO_FIX ? "Fix" : "Report only"} | URLs: ${CHECK_URLS ? "Yes" : "No"}\n\n` +
    `## Live Log\n\n`
  fs.writeFileSync(LOG_FILE, header, "utf-8")
}

function logAppend(line) {
  fs.appendFileSync(LOG_FILE, line + "\n", "utf-8")
}

function logFinalize(summary) {
  fs.appendFileSync(LOG_FILE, "\n---\n\n" + summary, "utf-8")
  // Update status
  let content = fs.readFileSync(LOG_FILE, "utf-8")
  content = content.replace("**Status:** Running...", "**Status:** Complete")
  fs.writeFileSync(LOG_FILE, content, "utf-8")
}

// ─── Data Tracker ───────────────────────────
let dataTracker = {
  requests: 0,
  bytesSent: 0,
  bytesReceived: 0,
  get total() {
    return this.bytesSent + this.bytesReceived
  },
  format(bytes) {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(2) + " MB"
  },
  log(url, sent, received) {
    this.requests++
    this.bytesSent += sent
    this.bytesReceived += received
    const line =
      `  [DATA] Request #${this.requests}: ` +
      `sent ${this.format(sent)} / recv ${this.format(received)} | ` +
      `TOTAL: ${this.format(this.total)}`
    process.stdout.write("\r" + " ".repeat(120) + "\r")
    process.stdout.write(line)
  },
  summary() {
    console.log("\n\n═══ DATA USAGE SUMMARY ═══")
    console.log(`  Requests made:   ${this.requests}`)
    console.log(`  Data sent:       ${this.format(this.bytesSent)}`)
    console.log(`  Data received:   ${this.format(this.bytesReceived)}`)
    console.log(`  Total data:      ${this.format(this.total)}`)
    console.log("══════════════════════════")
  },
}

// ─── File Scanner ───────────────────────────
function getAllMarkdownFiles(dir) {
  let results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Skip ignored dirs
      if (
        [".obsidian", "_templates", "Assets", "Excalidraw", "Vault Maintenance"].includes(
          entry.name,
        )
      )
        continue
      results = results.concat(getAllMarkdownFiles(full))
    } else if (entry.name.endsWith(".md")) {
      results.push(full)
    }
  }
  return results
}

// Build a filename index: name (no ext, lowercased) → full path(s)
function buildFileIndex(files) {
  const index = new Map()
  for (const f of files) {
    const name = path.basename(f, ".md").toLowerCase()
    if (!index.has(name)) index.set(name, [])
    index.get(name).push(f)
  }
  return index
}

// ─── Wikilink Extraction ────────────────────
function extractWikilinks(content) {
  const links = []
  const re = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = re.exec(content)) !== null) {
    const raw = m[1]
    const target = raw.split("|")[0].trim() // Handle [[Name|Display]]
    const display = raw.includes("|") ? raw.split("|")[1].trim() : null
    links.push({ target, display, raw, index: m.index })
  }
  return links
}

// ─── External URL Extraction ────────────────
function extractUrls(content) {
  const urls = []
  // Match markdown links [text](url) and bare https:// urls
  const re = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)|(?<!\()(https?:\/\/[^\s\)>\]]+)/g
  let m
  while ((m = re.exec(content)) !== null) {
    const url = m[2] || m[3]
    if (url) urls.push(url)
  }
  return urls
}

// ─── Fuzzy Match ────────────────────────────
function fuzzyMatch(target, fileIndex) {
  const lower = target.toLowerCase()
  const candidates = []

  for (const [name, paths] of fileIndex) {
    // Exact match
    if (name === lower) return { match: paths[0], score: 1.0 }

    // Contains match
    if (name.includes(lower) || lower.includes(name)) {
      const score = Math.min(lower.length, name.length) / Math.max(lower.length, name.length)
      candidates.push({ match: paths[0], score, name })
    }
  }

  // Slug-based match: "Ted Cruz" → "ted-cruz" or "_ted-cruz-master-profile"
  const slugified = lower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
  for (const [name, paths] of fileIndex) {
    const nameSlug = name.replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "")
    if (nameSlug.includes(slugified) || slugified.includes(nameSlug)) {
      const score =
        Math.min(slugified.length, nameSlug.length) /
        Math.max(slugified.length, nameSlug.length) *
        0.9
      candidates.push({ match: paths[0], score, name })
    }
  }

  // Return best match above threshold
  candidates.sort((a, b) => b.score - a.score)
  if (candidates.length > 0 && candidates[0].score > 0.5) {
    return candidates[0]
  }
  return null
}

// ─── URL Checker (HEAD request) ─────────────
function checkUrl(url, timeout = 10000) {
  return new Promise((resolve) => {
    const proto = url.startsWith("https") ? https : http
    const reqStr = `HEAD ${new URL(url).pathname} HTTP/1.1\r\nHost: ${new URL(url).hostname}\r\n\r\n`
    const estimatedSent = Buffer.byteLength(reqStr)

    const req = proto.request(
      url,
      {
        method: "HEAD",
        timeout,
        headers: {
          "User-Agent": "DonorMap-LinkChecker/1.0",
          Accept: "*/*",
        },
      },
      (res) => {
        // Estimate received bytes from headers
        const headerStr = Object.entries(res.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n")
        const estimatedRecv = Buffer.byteLength(headerStr) + 40 // status line

        dataTracker.log(url, estimatedSent, estimatedRecv)

        // Follow redirects
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          resolve({ status: res.statusCode, redirect: res.headers.location, ok: true })
        } else {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 400 })
        }
        res.resume()
      },
    )

    req.on("error", (err) => {
      dataTracker.log(url, estimatedSent, 0)
      resolve({ status: 0, ok: false, error: err.message })
    })

    req.on("timeout", () => {
      dataTracker.log(url, estimatedSent, 0)
      req.destroy()
      resolve({ status: 0, ok: false, error: "timeout" })
    })

    req.end()
  })
}

// ─── Wayback Machine Lookup ─────────────────
function getWaybackUrl(deadUrl, timeout = 10000) {
  return new Promise((resolve) => {
    const apiUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(deadUrl)}`
    const estimatedSent = Buffer.byteLength(apiUrl) + 80

    https.get(apiUrl, { timeout, headers: { "User-Agent": "DonorMap-LinkChecker/1.0" } }, (res) => {
      let body = ""
      res.on("data", (chunk) => { body += chunk })
      res.on("end", () => {
        dataTracker.log(apiUrl, estimatedSent, Buffer.byteLength(body))
        try {
          const data = JSON.parse(body)
          if (data.archived_snapshots && data.archived_snapshots.closest && data.archived_snapshots.closest.available) {
            resolve(data.archived_snapshots.closest.url)
          } else {
            resolve(null)
          }
        } catch (e) {
          resolve(null)
        }
      })
    }).on("error", () => {
      resolve(null)
    }).on("timeout", function() {
      this.destroy()
      resolve(null)
    })
  })
}

// ─── Main ───────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════")
  console.log("  THE DONOR MAP — Link Checker & Fixer")
  console.log("═══════════════════════════════════════════")
  console.log(`  Content dir: ${CONTENT_DIR}`)
  console.log(`  Check URLs:  ${CHECK_URLS ? "YES (HEAD requests)" : "NO (local only)"}`)
  console.log(`  Auto-fix:    ${AUTO_FIX ? "YES" : "NO (report only)"}`)
  if (CHECK_URLS && URL_LIMIT < Infinity) console.log(`  URL limit:   ${URL_LIMIT}`)
  console.log("")

  // Initialize live log in vault
  logInit()
  logAppend(`Started at ${new Date().toLocaleTimeString()}`)
  logAppend("")

  // 1. Scan files
  console.log("Scanning content directory...")
  const files = getAllMarkdownFiles(CONTENT_DIR)
  console.log(`  Found ${files.length} markdown files\n`)
  logAppend(`Scanned **${files.length}** markdown files`)

  const fileIndex = buildFileIndex(files)
  console.log(`  Built index: ${fileIndex.size} unique filenames`)
  // Count duplicates
  let dupes = 0
  for (const [name, paths] of fileIndex) {
    if (paths.length > 1) dupes++
  }
  if (dupes > 0) console.log(`  ⚠ ${dupes} duplicate filenames detected`)
  console.log("")

  // 2. Check wikilinks
  console.log("─── WIKILINK CHECK ────────────────────────")
  let totalWikilinks = 0
  let brokenWikilinks = []
  let fixedCount = 0

  for (const file of files) {
    const relPath = path.relative(CONTENT_DIR, file)
    let content = fs.readFileSync(file, "utf-8")
    const links = extractWikilinks(content)
    totalWikilinks += links.length

    for (const link of links) {
      const targetLower = link.target.toLowerCase()

      // Skip tags (they start with #)
      if (link.target.startsWith("#")) continue

      // Skip heading anchors
      if (link.target.includes("#")) {
        const baseName = link.target.split("#")[0].trim().toLowerCase()
        if (baseName === "" || fileIndex.has(baseName)) continue
      }

      // Check if target exists
      if (fileIndex.has(targetLower)) {
        if (VERBOSE) console.log(`  ✓ ${relPath} → [[${link.target}]]`)
        continue
      }

      // Broken — try to find a fix
      const suggestion = fuzzyMatch(link.target, fileIndex)

      if (suggestion) {
        const suggestedName = path.basename(suggestion.match, ".md")
        brokenWikilinks.push({
          file: relPath,
          target: link.target,
          suggestion: suggestedName,
          score: suggestion.score,
        })

        if (AUTO_FIX && suggestion.score > 0.7) {
          // Replace in content
          const oldLink = link.display
            ? `[[${link.target}|${link.display}]]`
            : `[[${link.target}]]`
          const newLink = link.display
            ? `[[${suggestedName}|${link.display}]]`
            : `[[${suggestedName}]]`
          content = content.replace(oldLink, newLink)
          fixedCount++
          console.log(`  🔧 FIXED: ${relPath}`)
          console.log(`     [[${link.target}]] → [[${suggestedName}]] (${Math.round(suggestion.score * 100)}% match)`)
          logAppend(`- **FIXED** in \`${relPath}\`: \`[[${link.target}]]\` → \`[[${suggestedName}]]\` (${Math.round(suggestion.score * 100)}%)`)
        } else {
          console.log(`  ✗ BROKEN: ${relPath}`)
          console.log(`     [[${link.target}]] → suggestion: [[${suggestedName}]] (${Math.round(suggestion.score * 100)}% match)`)
          logAppend(`- **BROKEN** in \`${relPath}\`: \`[[${link.target}]]\` — suggestion: \`[[${suggestedName}]]\` (${Math.round(suggestion.score * 100)}%)`)
        }
      } else {
        brokenWikilinks.push({ file: relPath, target: link.target, suggestion: null, score: 0 })
        console.log(`  ✗ BROKEN: ${relPath}`)
        console.log(`     [[${link.target}]] — no match found`)
        logAppend(`- **BROKEN** in \`${relPath}\`: \`[[${link.target}]]\` — no match found`)
      }
    }

    // Write fixed content back
    if (AUTO_FIX) {
      const original = fs.readFileSync(file, "utf-8")
      if (content !== original) {
        fs.writeFileSync(file, content, "utf-8")
      }
    }
  }

  console.log("")
  console.log(`  Total wikilinks scanned: ${totalWikilinks}`)
  console.log(`  Broken wikilinks:        ${brokenWikilinks.length}`)
  if (AUTO_FIX) console.log(`  Auto-fixed:              ${fixedCount}`)
  console.log("")

  logAppend("")
  logAppend(`### Wikilink Summary`)
  logAppend(`- Scanned: ${totalWikilinks}`)
  logAppend(`- Broken: ${brokenWikilinks.length}`)
  if (AUTO_FIX) logAppend(`- Auto-fixed: ${fixedCount}`)
  logAppend("")

  // 3. Check external URLs (if enabled)
  let brokenUrls = []
  let urlsCheckedCount = 0
  if (CHECK_URLS) {
    console.log("─── EXTERNAL URL CHECK ────────────────────")
    console.log("  Using HEAD requests only (minimal data)")
    console.log("  Data usage tracked in real-time:\n")

    // Collect all unique URLs
    const urlMap = new Map() // url → [files]
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8")
      const urls = extractUrls(content)
      for (const url of urls) {
        if (!urlMap.has(url)) urlMap.set(url, [])
        urlMap.get(url).push(path.relative(CONTENT_DIR, file))
      }
    }

    const uniqueUrls = [...urlMap.keys()]
    const checkCount = Math.min(uniqueUrls.length, URL_LIMIT)
    urlsCheckedCount = checkCount
    console.log(`  Found ${uniqueUrls.length} unique URLs across all files`)
    if (URL_LIMIT < Infinity) console.log(`  Checking first ${checkCount} (--limit ${URL_LIMIT})`)
    console.log("")

    for (let i = 0; i < checkCount; i++) {
      const url = uniqueUrls[i]
      const result = await checkUrl(url)

      // Only flag 404s as broken — 403/503/timeout are usually bot-blocking, not dead links
      if (result.status === 404) {
        process.stdout.write("\r" + " ".repeat(120) + "\r")
        console.log(`  ✗ 404 ${url}`)
        console.log(`    └─ in: ${urlMap.get(url).slice(0, 3).join(", ")}${urlMap.get(url).length > 3 ? " +" + (urlMap.get(url).length - 3) + " more" : ""}`)

        // Try Wayback Machine for an archived version
        let archiveUrl = null
        if (AUTO_FIX) {
          archiveUrl = await getWaybackUrl(url)
          if (archiveUrl) {
            // Replace the dead URL in every file that contains it
            for (const relFile of urlMap.get(url)) {
              const fullPath = path.join(CONTENT_DIR, relFile)
              let fileContent = fs.readFileSync(fullPath, "utf-8")
              if (fileContent.includes(url)) {
                fileContent = fileContent.split(url).join(archiveUrl)
                fs.writeFileSync(fullPath, fileContent, "utf-8")
              }
            }
            console.log(`    ✓ FIXED → ${archiveUrl}`)
            logAppend(`- **FIXED (404→archive)**: ${url} → ${archiveUrl}`)
          } else {
            console.log(`    ⚠ No Wayback archive found`)
            logAppend(`- **DEAD LINK (404, no archive)**: ${url} — in ${urlMap.get(url).slice(0, 2).join(", ")}`)
          }
        } else {
          logAppend(`- **DEAD LINK (404)**: ${url} — in ${urlMap.get(url).slice(0, 2).join(", ")}`)
        }

        brokenUrls.push({
          url,
          status: result.status,
          error: result.error,
          files: urlMap.get(url),
          archiveUrl,
        })
      } else if (!result.ok && VERBOSE) {
        process.stdout.write("\r" + " ".repeat(120) + "\r")
        console.log(`  ~ ${result.status || result.error} ${url} (likely bot-blocking, skipped)`)
      }

      // Rate limit: 100ms between requests
      await new Promise((r) => setTimeout(r, 100))
    }

    dataTracker.summary()
  }

  // 4. Write report
  const reportPath = path.resolve(__dirname, "..", "link-report.md")
  let report = `---\ntitle: Link Audit Report\n---\n\n`
  report += `# Link Audit Report\n\n`
  report += `**Date:** ${new Date().toISOString().split("T")[0]}\n`
  report += `**Files scanned:** ${files.length}\n`
  report += `**Wikilinks checked:** ${totalWikilinks}\n\n`

  if (brokenWikilinks.length > 0) {
    report += `## Broken Wikilinks (${brokenWikilinks.length})\n\n`
    report += `| File | Broken Link | Suggested Fix | Match % |\n`
    report += `|------|-------------|---------------|--------|\n`
    for (const b of brokenWikilinks) {
      report += `| ${b.file} | \`[[${b.target}]]\` | ${b.suggestion ? `\`[[${b.suggestion}]]\`` : "No match"} | ${b.score ? Math.round(b.score * 100) + "%" : "—"} |\n`
    }
    report += "\n"
  }

  if (brokenUrls.length > 0) {
    const fixed = brokenUrls.filter((b) => b.archiveUrl)
    const unfixed = brokenUrls.filter((b) => !b.archiveUrl)
    if (fixed.length > 0) {
      report += `## Fixed URLs — Replaced with Wayback Archive (${fixed.length})\n\n`
      report += `| Dead URL | Archive URL | Files |\n`
      report += `|----------|-------------|-------|\n`
      for (const b of fixed) {
        report += `| ${b.url} | ${b.archiveUrl} | ${b.files.slice(0, 2).join(", ")} |\n`
      }
      report += "\n"
    }
    if (unfixed.length > 0) {
      report += `## Still Broken — No Archive Found (${unfixed.length})\n\n`
      report += `| URL | Files |\n`
      report += `|-----|-------|\n`
      for (const b of unfixed) {
        report += `| ${b.url} | ${b.files.slice(0, 2).join(", ")} |\n`
      }
      report += "\n"
    }
  }

  if (CHECK_URLS) {
    report += `## Data Usage\n\n`
    report += `- Requests: ${dataTracker.requests}\n`
    report += `- Sent: ${dataTracker.format(dataTracker.bytesSent)}\n`
    report += `- Received: ${dataTracker.format(dataTracker.bytesReceived)}\n`
    report += `- **Total: ${dataTracker.format(dataTracker.total)}**\n`
  }

  fs.writeFileSync(reportPath, report, "utf-8")

  // 5. Final summary
  console.log("\n═══ FINAL SUMMARY ═════════════════════════")
  console.log(`  Files scanned:        ${files.length}`)
  console.log(`  Wikilinks checked:    ${totalWikilinks}`)
  console.log(`  Broken wikilinks:     ${brokenWikilinks.length}`)
  if (AUTO_FIX) console.log(`  Auto-fixed:           ${fixedCount}`)
  if (CHECK_URLS) {
    console.log(`  URLs checked:         ${urlsCheckedCount}`)
    console.log(`  Broken URLs:          ${brokenUrls.length}`)
    console.log(`  Data used:            ${dataTracker.format(dataTracker.total)}`)
  }
  console.log(`  Report saved:         ${reportPath}`)
  console.log("════════════════════════════════════════════\n")

  // Finalize live log in vault
  let finalSummary = `## Final Summary\n\n`
  finalSummary += `- **Files scanned:** ${files.length}\n`
  finalSummary += `- **Wikilinks checked:** ${totalWikilinks}\n`
  finalSummary += `- **Broken wikilinks:** ${brokenWikilinks.length}\n`
  if (AUTO_FIX) finalSummary += `- **Auto-fixed:** ${fixedCount}\n`
  if (CHECK_URLS) {
    finalSummary += `- **URLs checked:** ${urlsCheckedCount}\n`
    finalSummary += `- **Broken URLs:** ${brokenUrls.length}\n`
    finalSummary += `- **Data used:** ${dataTracker.format(dataTracker.total)}\n`
  }
  finalSummary += `\nCompleted at ${new Date().toLocaleTimeString()}`
  logFinalize(finalSummary)
}

main().catch((err) => {
  console.error("Fatal error:", err)
  try { logAppend(`\n**FATAL ERROR:** ${err.message}`) } catch (_) {}
  process.exit(1)
})
