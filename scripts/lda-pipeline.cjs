#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — Senate LDA Lobbying Pipeline
// Pulls lobbying disclosure filings for donors/corporations.
// Shows who lobbies, how much they spend, and on what issues.
//
// Usage:
//   node scripts/lda-pipeline.cjs                           # dry run
//   node scripts/lda-pipeline.cjs --write --verbose
//   node scripts/lda-pipeline.cjs --profile="Koch Industries"
//   node scripts/lda-pipeline.cjs --write --limit=20
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const https = require("https")

const {
  parseArgs, loadProfiles, extractName, RateLimiter, FileCache,
  today, sleep,
} = require("./lib/shared.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const LIMIT = args.limit ? parseInt(args.limit) : null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168

const apiConfig = require("./lib/api-config.cjs")
const LDA_KEY = apiConfig.lda.apiKey || ""
const BASE_URL = apiConfig.lda.baseUrl
const limiter = new RateLimiter(100) // 120/min limit, stay conservative

// ── HTTP ──

function fetchLda(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString()
    const url = `${BASE_URL}${endpoint}?${qs}`
    if (VERBOSE) console.log(`    GET ${url.replace(LDA_KEY, "***")}`)

    const req = https.get(url, {
      headers: {
        Authorization: `Token ${LDA_KEY}`,
        Accept: "application/json",
        "User-Agent": "DonorMap/1.0",
      },
    }, (res) => {
      if (res.statusCode === 429) {
        const retry = parseInt(res.headers["retry-after"] || "30")
        console.log(`    ⚠ Rate limited. Waiting ${retry}s...`)
        return setTimeout(() => fetchLda(endpoint, params).then(resolve).catch(reject), retry * 1000)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on("error", reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

// ── Lobbying Data Functions ──

async function searchFilings(name, year, searchField) {
  await limiter.wait()
  const params = {
    [searchField]: name,
    filing_year: year || new Date().getFullYear(),
    page_size: 25,
  }
  return fetchLda("/filings/", params)
}

async function getMultiYearFilings(name, years) {
  const allFilings = []
  const seenUuids = new Set()

  for (const year of years) {
    // Search both as client AND as registrant (in-house lobbying)
    for (const field of ["client_name", "registrant_name"]) {
      try {
        const data = await searchFilings(name, year, field)
        if (data && data.results) {
          for (const f of data.results) {
            // Dedupe by filing UUID
            const uuid = f.filing_uuid || `${f.registrant?.name}-${f.filing_year}-${f.filing_period}`
            if (seenUuids.has(uuid)) continue
            seenUuids.add(uuid)

            // Match check — client or registrant name should contain our search term
            const cn = (f.client?.name || "").toLowerCase()
            const rn = (f.registrant?.name || "").toLowerCase()
            const search = name.toLowerCase()
            if (cn.includes(search) || rn.includes(search) ||
                search.includes(cn) || search.includes(rn)) {
              allFilings.push(f)
            }
          }
        }
      } catch (err) {
        if (VERBOSE) console.log(`    ⚠ ${year} (${field}): ${err.message}`)
      }
    }
  }
  return allFilings
}

function summarizeFilings(filings, name) {
  if (!filings || filings.length === 0) return null

  let totalIncome = 0
  let totalExpenses = 0
  const issues = new Set()
  const agencies = new Set()
  const registrants = new Set()
  const lobbyists = new Set()
  const years = new Set()

  for (const f of filings) {
    const income = parseFloat(f.income || "0")
    const expenses = parseFloat(f.expenses || "0")
    if (!isNaN(income)) totalIncome += income
    if (!isNaN(expenses)) totalExpenses += expenses

    if (f.filing_year) years.add(String(f.filing_year))
    if (f.registrant?.name) registrants.add(f.registrant.name)

    const activities = f.lobbying_activities || []
    for (const act of activities) {
      if (act.general_issue_code_display) issues.add(act.general_issue_code_display)
      const govEntities = act.government_entities || []
      for (const ge of govEntities) {
        if (ge.name) agencies.add(ge.name)
      }
      const lobbyistList = act.lobbyists || []
      for (const l of lobbyistList) {
        if (l.lobbyist?.name) lobbyists.add(l.lobbyist.name)
      }
    }
  }

  const totalSpend = totalIncome + totalExpenses
  const sortedYears = [...years].sort()

  return {
    totalFilings: filings.length,
    totalSpend,
    totalIncome,
    totalExpenses,
    issues: [...issues].sort(),
    agencies: [...agencies].sort(),
    registrants: [...registrants].sort(),
    lobbyistCount: lobbyists.size,
    yearRange: sortedYears.length > 0
      ? `${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}`
      : "unknown",
  }
}

function fmtMoney(n) {
  if (!n || n === 0) return "$0"
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString()}`
}

// ── Profile Processing ──

async function processOrg(profile, dataCache) {
  const name = extractName(profile.title)
  const cacheKey = `lda:${name.toLowerCase()}`

  const result = { name, file: profile.filePath, status: "skipped", lobbying: null }

  const cached = dataCache.get(cacheKey)
  if (cached) {
    console.log(`  → ${name} (cached)`)
    return { ...result, status: "cached", lobbying: cached }
  }

  console.log(`  → ${name}`)

  const currentYear = new Date().getFullYear()
  const years = [currentYear, currentYear - 1, currentYear - 2]

  // Use shortest meaningful search term for fuzzy LDA matching
  // "Koch Industries" → "Koch", "AIPAC - American Israel..." → "AIPAC"
  // "Lockheed Martin" → "Lockheed", "ExxonMobil" → "ExxonMobil"
  const baseName = name.split(/\s*[-–—]\s*/)[0].trim()
  const words = baseName.split(/\s+/)
  const searchName = words.length > 1 ? words[0] : baseName
  if (VERBOSE) console.log(`    Search term: "${searchName}"`)

  try {
    const filings = await getMultiYearFilings(searchName, years)
    const summary = summarizeFilings(filings, name)

    if (!summary) {
      console.log(`    ✗ No lobbying filings found`)
      result.status = "not-found"
      return result
    }

    result.lobbying = summary
    result.status = "success"

    console.log(`    Filings:      ${summary.totalFilings} (${summary.yearRange})`)
    console.log(`    Total spend:  ${fmtMoney(summary.totalSpend)}`)
    console.log(`    Issues:       ${summary.issues.slice(0, 4).join(", ")}${summary.issues.length > 4 ? ` +${summary.issues.length - 4} more` : ""}`)
    console.log(`    Firms:        ${summary.registrants.slice(0, 3).join(", ")}`)
    console.log(`    Lobbyists:    ${summary.lobbyistCount}`)

    dataCache.set(cacheKey, summary, CACHE_TTL)
  } catch (err) {
    console.log(`    ✗ Error: ${err.message}`)
    result.status = "error"
  }

  return result
}

// ── Vault Update ──

function updateFrontmatter(filePath, updates) {
  let content = fs.readFileSync(filePath, "utf-8")
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return

  let fm = fmMatch[1]
  for (const [key, val] of Object.entries(updates)) {
    if (val === null || val === undefined) continue
    const regex = new RegExp(`^${key}:.*$`, "m")
    const line = typeof val === "number" ? `${key}: ${val}` : `${key}: "${val}"`
    if (regex.test(fm)) fm = fm.replace(regex, line)
    else fm += `\n${line}`
  }

  const todayStr = today()
  if (/^last-updated:/.test(fm)) fm = fm.replace(/^last-updated:.*$/m, `last-updated: ${todayStr}`)
  else fm += `\nlast-updated: ${todayStr}`

  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${fm}\n---`)
  fs.writeFileSync(filePath, content, "utf-8")
}

function generateLobbyingSection(name, summary) {
  const lines = []
  lines.push(`### Lobbying Activity`)
  lines.push(`<!-- auto:lda-lobbying start -->`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Lobbying Spend | ${fmtMoney(summary.totalSpend)} |`)
  lines.push(`| Quarterly Filings | ${summary.totalFilings} |`)
  lines.push(`| Year Range | ${summary.yearRange} |`)
  lines.push(`| Lobbying Firms | ${summary.registrants.length} |`)
  lines.push(`| Individual Lobbyists | ${summary.lobbyistCount} |`)
  lines.push(``)

  if (summary.issues.length > 0) {
    lines.push(`**Issues lobbied:** ${summary.issues.join(", ")}`)
    lines.push(``)
  }
  if (summary.registrants.length > 0) {
    lines.push(`**Lobbying firms:** ${summary.registrants.join(", ")}`)
    lines.push(``)
  }
  if (summary.agencies.length > 0) {
    lines.push(`**Agencies contacted:** ${summary.agencies.slice(0, 10).join(", ")}${summary.agencies.length > 10 ? ` +${summary.agencies.length - 10} more` : ""}`)
    lines.push(``)
  }

  lines.push(`- [Source: Senate Lobbying Disclosures](https://lda.senate.gov/filings/public/filing/search/?client_name=${encodeURIComponent(name)}) (Tier 1)`)
  lines.push(``)
  lines.push(`<!-- auto:lda-lobbying end -->`)
  return lines.join("\n")
}

function insertOrUpdateSection(filePath, sectionContent) {
  let content = fs.readFileSync(filePath, "utf-8")
  const autoStart = content.indexOf("<!-- auto:lda-lobbying start -->")
  const autoEnd = content.indexOf("<!-- auto:lda-lobbying end -->")

  if (autoStart !== -1 && autoEnd !== -1) {
    const beforeAuto = content.lastIndexOf("\n###", autoStart)
    const start = beforeAuto !== -1 ? beforeAuto + 1 : autoStart
    const end = autoEnd + "<!-- auto:lda-lobbying end -->".length
    content = content.slice(0, start) + sectionContent + content.slice(end)
  } else {
    const sourcesIdx = content.indexOf("\n### Sources")
    if (sourcesIdx !== -1) {
      content = content.slice(0, sourcesIdx) + "\n" + sectionContent + "\n" + content.slice(sourcesIdx)
    } else {
      content += "\n\n" + sectionContent + "\n"
    }
  }
  fs.writeFileSync(filePath, content, "utf-8")
}

// ── Main ──

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — Senate LDA Lobbying Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update vault)" : "DRY RUN (preview only)"}`)
  console.log(`  API: Senate LDA (Token auth)`)
  console.log(`  Key: ${LDA_KEY ? "Configured" : "MISSING — set LDA_API_KEY in .env"}`)
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  if (LIMIT) console.log(`  Limit: ${LIMIT}`)
  console.log()

  if (!LDA_KEY) {
    console.log("  ✗ No LDA_API_KEY found. Add it to .env")
    process.exit(1)
  }

  const dataCache = new FileCache("lda-lobbying")

  console.log("  Loading vault profiles...")
  const { donors } = loadProfiles({ types: ["corporation", "donor"] })

  let targets = donors
  if (PROFILE_FILTER) {
    const filter = PROFILE_FILTER.toLowerCase()
    targets = donors.filter((d) => extractName(d.title).toLowerCase().includes(filter))
  }
  if (LIMIT) targets = targets.slice(0, LIMIT)

  console.log(`  Organizations to scan: ${targets.length}`)
  console.log()

  const results = []
  let successCount = 0

  for (const profile of targets) {
    const result = await processOrg(profile, dataCache)
    results.push(result)

    if (result.status === "success" && result.lobbying && WRITE) {
      updateFrontmatter(profile.filePath, {
        "lobbying-spend": Math.round(result.lobbying.totalSpend),
        "lobbying-filings": result.lobbying.totalFilings,
      })
      const section = generateLobbyingSection(result.name, result.lobbying)
      insertOrUpdateSection(profile.filePath, section)
      console.log(`    ✓ Written to vault`)
    }
    console.log()
  }

  console.log("═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Scanned:    ${results.length}`)
  console.log(`  Found:      ${results.filter((r) => r.status === "success").length}`)
  console.log(`  Not found:  ${results.filter((r) => r.status === "not-found").length}`)
  console.log(`  Cached:     ${results.filter((r) => r.status === "cached").length}`)
  console.log(`  Errors:     ${results.filter((r) => r.status === "error").length}`)
  console.log(`  API calls:  ${limiter.requestCount}`)
  console.log()

  if (successCount > 0 && !WRITE) console.log("  Run with --write to update the vault.")

  dataCache.save()
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1) })
