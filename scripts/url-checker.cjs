#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — URL Checker
// Scans all vault markdown files, extracts URLs, verifies via
// HEAD requests. Replaces SEO tools and Chrome-based verification.
//
// Usage:
//   node scripts/url-checker.cjs                     # dry-run, scan all
//   node scripts/url-checker.cjs --write             # remove (UNVERIFIED) on valid URLs
//   node scripts/url-checker.cjs --verbose           # show each URL being checked
//   node scripts/url-checker.cjs --limit=200         # check first N URLs only
//   node scripts/url-checker.cjs --concurrency=5     # parallel requests (default: 5)
//   node scripts/url-checker.cjs --cache-ttl=72      # hours before re-check (default: 72)
//   node scripts/url-checker.cjs --only-unverified   # only check (UNVERIFIED) tagged URLs
//   node scripts/url-checker.cjs --only-needed       # only report files with (URL NEEDED)
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const { parseArgs, walkMarkdown, fetchHead, FileCache, ReportWriter,
        CONTENT_DIR, sleep } = require("./lib/shared.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const LIMIT = parseInt(args.limit) || Infinity
const CONCURRENCY = parseInt(args.concurrency) || 5
const CACHE_TTL = parseInt(args["cache-ttl"]) || 72 // hours
const ONLY_UNVERIFIED = !!args["only-unverified"]
const ONLY_NEEDED = !!args["only-needed"]

// ── URL Extraction ────────────────────────────────────
function extractUrlsFromFile(content, filePath) {
  const urls = []
  const lines = content.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Markdown links: [text](url)
    const mdRe = /\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g
    let m
    while ((m = mdRe.exec(line)) !== null) {
      const url = m[2].trim()
      const isUnverified = line.includes("(UNVERIFIED)")
      const isUrlNeeded = line.includes("(URL NEEDED)") || line.includes("(URL needed)")
      urls.push({
        url,
        file: filePath,
        line: i + 1,
        linkText: m[1],
        isUnverified,
        isUrlNeeded,
        fullLine: line.trim(),
      })
    }
  }

  return urls
}

function findUrlNeededTags(content, filePath) {
  const tags = []
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("(URL NEEDED)") || lines[i].includes("(URL needed)")) {
      tags.push({
        file: filePath,
        line: i + 1,
        context: lines[i].trim().slice(0, 200),
      })
    }
  }
  return tags
}

// ── Batch URL Checking ────────────────────────────────
async function checkUrlBatch(urls, concurrency) {
  const results = []
  let checked = 0

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(async (entry) => {
        const result = await fetchHead(entry.url)
        checked++
        const status = result.error === "timeout" ? "timeout"
          : result.status === 0 ? "error"
          : result.status >= 200 && result.status < 400 ? "alive"
          : result.status === 403 || result.status === 503 ? "bot-blocked"
          : result.status === 404 ? "dead"
          : result.status >= 400 ? "dead"
          : "unknown"

        if (VERBOSE) {
          const icon = status === "alive" ? "✓" : status === "dead" ? "✗" : status === "bot-blocked" ? "⊘" : "?"
          process.stdout.write(`\r  [${checked}/${urls.length}] ${icon} ${result.status || status} ${entry.url.slice(0, 80)}`)
          process.stdout.write(" ".repeat(40) + "\r")
        } else {
          process.stdout.write(`\r  Checking URLs: ${checked}/${urls.length}`)
        }

        return {
          ...entry,
          status,
          httpStatus: result.status,
          redirected: result.redirected,
          finalUrl: result.finalUrl,
          error: result.error,
        }
      })
    )
    results.push(...batchResults)

    // Small delay between batches to be polite
    if (i + concurrency < urls.length) {
      await sleep(200)
    }
  }

  process.stdout.write("\r" + " ".repeat(120) + "\r")
  return results
}

// ── Write Mode: Remove (UNVERIFIED) tags ──────────────
function removeUnverifiedTag(filePath, url) {
  let content = fs.readFileSync(filePath, "utf-8")
  // Match the citation line containing this URL and (UNVERIFIED)
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`(\\[.*?\\]\\(${escaped}\\).*?)\\s*\\(UNVERIFIED\\)`, "g")
  const updated = content.replace(re, "$1")
  if (updated !== content) {
    fs.writeFileSync(filePath, updated, "utf-8")
    return true
  }
  return false
}

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — URL Checker")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update files)" : "DRY RUN (preview only)"}`)
  console.log(`  Concurrency: ${CONCURRENCY}`)
  console.log(`  Cache TTL: ${CACHE_TTL} hours`)
  if (ONLY_UNVERIFIED) console.log("  Filter: Only (UNVERIFIED) tagged URLs")
  if (ONLY_NEEDED) console.log("  Filter: Only files with (URL NEEDED)")
  console.log()

  // Load cache
  const cache = new FileCache("url-check")

  // Scan vault
  console.log("  Scanning vault files...")
  const files = walkMarkdown(CONTENT_DIR)
  console.log(`  Found ${files.length} markdown files`)

  // Extract all URLs
  let allUrls = []
  const allUrlNeeded = []
  let filesWithUnverified = 0
  let filesWithUrlNeeded = 0

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8")
    const urls = extractUrlsFromFile(content, filePath)
    const needed = findUrlNeededTags(content, filePath)

    if (urls.some(u => u.isUnverified)) filesWithUnverified++
    if (needed.length > 0) filesWithUrlNeeded++

    allUrls.push(...urls)
    allUrlNeeded.push(...needed)
  }

  console.log(`  Extracted ${allUrls.length} URLs from vault`)
  console.log(`  Found ${allUrlNeeded.length} (URL NEEDED) tags in ${filesWithUrlNeeded} files`)
  console.log(`  Found ${filesWithUnverified} files with (UNVERIFIED) tags`)

  // Apply filters
  if (ONLY_UNVERIFIED) {
    allUrls = allUrls.filter(u => u.isUnverified)
    console.log(`  After filter: ${allUrls.length} UNVERIFIED URLs to check`)
  }

  if (ONLY_NEEDED) {
    // Just report URL NEEDED tags, don't check URLs
    const report = new ReportWriter("url-check")
    report.addStat("URL NEEDED tags", allUrlNeeded.length)
    report.addStat("Files with URL NEEDED", filesWithUrlNeeded)
    report.setData("url_needed", allUrlNeeded)
    const paths = report.writeBoth()
    console.log(`\n  Report: ${paths.md}`)
    return
  }

  // Deduplicate URLs for checking (check each unique URL once)
  const urlMap = new Map() // url → [entries]
  for (const entry of allUrls) {
    if (!urlMap.has(entry.url)) urlMap.set(entry.url, [])
    urlMap.get(entry.url).push(entry)
  }

  const uniqueUrls = [...urlMap.keys()]
  console.log(`  Unique URLs: ${uniqueUrls.length}`)

  // Filter out cached
  const toCheck = []
  let cachedCount = 0
  for (const url of uniqueUrls) {
    const cached = cache.get(url)
    if (cached) {
      cachedCount++
    } else {
      toCheck.push({ url, entries: urlMap.get(url) })
    }
  }

  console.log(`  Cached (skipping): ${cachedCount}`)
  console.log(`  To check: ${Math.min(toCheck.length, LIMIT)}`)

  if (toCheck.length === 0 && cachedCount > 0) {
    console.log("\n  All URLs cached. Use --cache-ttl=0 to force re-check.")
  }

  // Apply limit
  const checking = toCheck.slice(0, LIMIT)

  // Check URLs
  console.log(`\n  Checking ${checking.length} URLs (${CONCURRENCY} concurrent)...\n`)
  const flatCheck = checking.map(c => ({ ...c.entries[0], url: c.url }))
  const results = await checkUrlBatch(flatCheck, CONCURRENCY)

  // Cache results
  for (const r of results) {
    cache.set(r.url, { status: r.status, httpStatus: r.httpStatus }, CACHE_TTL)
  }
  cache.save()

  // Categorize results
  const alive = results.filter(r => r.status === "alive")
  const dead = results.filter(r => r.status === "dead")
  const botBlocked = results.filter(r => r.status === "bot-blocked")
  const timeouts = results.filter(r => r.status === "timeout")
  const errors = results.filter(r => r.status === "error")

  // Write mode: remove (UNVERIFIED) tags for alive URLs
  let tagsRemoved = 0
  if (WRITE) {
    for (const r of alive) {
      const entries = urlMap.get(r.url) || []
      for (const entry of entries) {
        if (entry.isUnverified) {
          if (removeUnverifiedTag(entry.file, r.url)) {
            tagsRemoved++
            if (VERBOSE) console.log(`  Removed (UNVERIFIED) from: ${path.relative(CONTENT_DIR, entry.file)}`)
          }
        }
      }
    }
  }

  // Build report
  const report = new ReportWriter("url-check")

  report.addStat("Total URLs in vault", allUrls.length)
  report.addStat("Unique URLs", uniqueUrls.length)
  report.addStat("Checked this run", results.length)
  report.addStat("Cached (skipped)", cachedCount)
  report.addStat("Alive (200-399)", alive.length)
  report.addStat("Dead (404+)", dead.length)
  report.addStat("Bot-blocked (403/503)", botBlocked.length)
  report.addStat("Timeout", timeouts.length)
  report.addStat("Error", errors.length)
  report.addStat("URL NEEDED tags", allUrlNeeded.length)
  report.addStat("Files with UNVERIFIED", filesWithUnverified)
  if (WRITE) report.addStat("UNVERIFIED tags removed", tagsRemoved)

  // Dead URLs section (most actionable)
  if (dead.length > 0) {
    const deadDetails = dead.map(r => {
      const files = (urlMap.get(r.url) || []).map(e => path.relative(CONTENT_DIR, e.file))
      return `**${r.httpStatus}** — ${r.url}\n  Files: ${files.join(", ")}`
    })
    report.addSection("Dead URLs (need replacement)", deadDetails.join("\n\n"))
  }

  // Bot-blocked section
  if (botBlocked.length > 0) {
    report.addSection("Bot-Blocked URLs (may need manual check)",
      botBlocked.map(r => `${r.httpStatus} — ${r.url}`))
  }

  // URL NEEDED section
  if (allUrlNeeded.length > 0) {
    const neededByFile = {}
    for (const tag of allUrlNeeded) {
      const rel = path.relative(CONTENT_DIR, tag.file)
      if (!neededByFile[rel]) neededByFile[rel] = []
      neededByFile[rel].push(tag.context)
    }
    const neededDetails = Object.entries(neededByFile).map(([file, contexts]) =>
      `**${file}** (${contexts.length} tags)\n${contexts.map(c => `  - ${c.slice(0, 150)}`).join("\n")}`
    )
    report.addSection("URL NEEDED Tags", neededDetails.join("\n\n"))
  }

  report.setData("dead_urls", dead.map(r => ({
    url: r.url,
    httpStatus: r.httpStatus,
    files: (urlMap.get(r.url) || []).map(e => path.relative(CONTENT_DIR, e.file)),
  })))
  report.setData("bot_blocked", botBlocked.map(r => ({
    url: r.url,
    httpStatus: r.httpStatus,
  })))
  report.setData("url_needed", allUrlNeeded.map(t => ({
    file: path.relative(CONTENT_DIR, t.file),
    line: t.line,
    context: t.context,
  })))

  const paths = report.writeBoth()

  // Print summary
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Checked:       ${results.length} URLs`)
  console.log(`  Alive:         ${alive.length}`)
  console.log(`  Dead:          ${dead.length}`)
  console.log(`  Bot-blocked:   ${botBlocked.length}`)
  console.log(`  Timeout:       ${timeouts.length}`)
  console.log(`  Error:         ${errors.length}`)
  console.log(`  URL NEEDED:    ${allUrlNeeded.length} tags in ${filesWithUrlNeeded} files`)
  if (WRITE) console.log(`  Tags removed:  ${tagsRemoved}`)
  console.log()
  console.log(`  Reports: ${paths.json}`)
  console.log(`           ${paths.md}`)
  console.log("═══════════════════════════════════════════════════\n")

  if (dead.length > 0) {
    console.log("  Top dead URLs:")
    for (const r of dead.slice(0, 10)) {
      console.log(`    ${r.httpStatus} ${r.url.slice(0, 80)}`)
    }
    if (dead.length > 10) console.log(`    ... and ${dead.length - 10} more`)
    console.log()
  }
}

main().catch(err => {
  console.error("\n  FATAL:", err.message)
  process.exit(1)
})
