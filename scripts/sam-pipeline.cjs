#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — SAM.gov Federal Contracts Pipeline
// Pulls federal contract award data for corporations and donors.
// Shows which companies win government contracts after donating.
//
// Usage:
//   node scripts/sam-pipeline.cjs                           # dry run
//   node scripts/sam-pipeline.cjs --write                   # update vault
//   node scripts/sam-pipeline.cjs --write --verbose
//   node scripts/sam-pipeline.cjs --profile="Lockheed Martin"
//   node scripts/sam-pipeline.cjs --write --limit=20
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const https = require("https")

const {
  parseArgs, loadProfiles, extractName, RateLimiter, FileCache,
  ReportWriter, today,
} = require("./lib/shared.cjs")
const apiConfig = require("./lib/api-config.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const LIMIT = args.limit ? parseInt(args.limit) : null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168 // 7 days

const SAM_KEY = apiConfig.sam.apiKey
const CONTRACT_URL = "https://api.sam.gov/contract-awards/v1/search"
const ENTITY_URL = "https://api.sam.gov/entity-information/v3/entities"
const limiter = new RateLimiter(800) // conservative — 1000/day limit

// ── HTTP Fetch ──────────────────────────────────────────

function fetchSamJson(url, useHeader = false) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "DonorMap/1.0",
      Accept: "application/json",
    }
    // Entity API uses x-api-key header; Contract API uses query param
    if (useHeader && SAM_KEY) {
      headers["x-api-key"] = SAM_KEY
    }

    const req = https.get(url, { headers }, (res) => {
      if (res.statusCode === 404) return resolve(null)
      if (res.statusCode === 429) {
        console.log("    ⚠ Rate limited (429). Waiting 60s...")
        return setTimeout(() => fetchSamJson(url, useHeader).then(resolve).catch(reject), 60000)
      }
      if (res.statusCode === 403) {
        console.log(`    ⚠ 403 Forbidden — API key may be invalid or expired`)
        return resolve(null)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
      }
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on("error", reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error("Timeout")) })
  })
}

// ── SAM.gov API Functions ──────────────────────────────

/**
 * Search for contract awards by company name.
 * Returns summary of contracts.
 */
async function searchContracts(companyName) {
  await limiter.wait()
  const params = new URLSearchParams({
    api_key: SAM_KEY,
    awardeeLegalBusinessName: companyName,
    limit: "25",
  })
  const url = `${CONTRACT_URL}?${params}`
  if (VERBOSE) console.log(`    [SAM] Contract search: ${companyName}`)

  try {
    const data = await fetchSamJson(url)
    if (!data) return null
    return data
  } catch (err) {
    if (VERBOSE) console.log(`    [SAM] Contract search failed: ${err.message}`)
    return null
  }
}

/**
 * Search for entity registration by name.
 */
async function searchEntity(companyName) {
  await limiter.wait()
  const params = new URLSearchParams({
    api_key: SAM_KEY,
    legalBusinessName: companyName,
    registrationStatus: "A", // Active only
    includeSections: "entityRegistration,coreData",
  })
  const url = `${ENTITY_URL}?${params}`
  if (VERBOSE) console.log(`    [SAM] Entity search: ${companyName}`)

  try {
    const data = await fetchSamJson(url, true) // Entity API uses header auth
    if (!data) return null
    return data
  } catch (err) {
    if (VERBOSE) console.log(`    [SAM] Entity search failed: ${err.message}`)
    return null
  }
}

/**
 * Extract contract summary from SAM response.
 * SAM.gov response structure:
 *   { awardSummary: [...], totalRecords, limit, offset }
 * Each award: { contractId, coreData, awardDetails }
 * Dollar values are STRINGS, not numbers.
 */
function summarizeContracts(data) {
  if (!data || !data.awardSummary || data.awardSummary.length === 0) return null

  const contracts = data.awardSummary
  const totalCount = data.totalRecords || contracts.length
  let totalDollars = 0
  const agencies = new Set()
  const years = new Set()
  const topContracts = []

  for (const c of contracts) {
    const award = c.awardDetails || {}
    const dollars = award.dollars || {}
    const totalDollarFields = award.totalContractDollars || {}

    // Use totalActionObligation (cumulative) if available, else baseDollarsObligated
    const amount = parseFloat(totalDollarFields.totalActionObligation || dollars.baseDollarsObligated || "0")
    if (!isNaN(amount)) totalDollars += amount

    // Agency info is nested under coreData.federalOrganization
    const fed = c.coreData?.federalOrganization || {}
    const contractingDept = fed.contractingInformation?.contractingDepartment?.name
    const fundingDept = fed.fundingInformation?.fundingDepartment?.name
    const dept = contractingDept || fundingDept
    if (dept) agencies.add(dept.trim())

    const dates = award.dates || {}
    const year = dates.fiscalYear || (dates.dateSigned ? dates.dateSigned.slice(0, 4) : null)
    if (year) years.add(String(year))

    // Description from product/service info
    const prodInfo = c.coreData?.productOrServiceInformation || {}
    const description = prodInfo.productOrServiceDescription ||
      prodInfo.principalNaicsDescription || "Federal contract"

    if (topContracts.length < 5) {
      topContracts.push({
        description,
        amount: isNaN(amount) ? 0 : amount,
        agency: dept ? dept.trim() : "Unknown",
        date: dates.dateSigned || "Unknown",
        piid: c.contractId?.piid || null,
      })
    }
  }

  // Sort top contracts by amount descending
  topContracts.sort((a, b) => b.amount - a.amount)

  const sortedYears = [...years].sort()

  return {
    totalContracts: totalCount,
    sampleSize: contracts.length,
    totalDollarsInSample: totalDollars,
    agencies: [...agencies].sort(),
    yearRange: sortedYears.length > 0
      ? `${sortedYears[0]}-${sortedYears[sortedYears.length - 1]}`
      : "unknown",
    topContracts,
  }
}

/**
 * Format dollar amount for display.
 */
function fmtMoney(n) {
  if (!n || n === 0) return "$0"
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n).toLocaleString()}`
}

// ── Profile Processing ──────────────────────────────────

async function processOrg(profile, dataCache) {
  const name = extractName(profile.title)
  const cacheKey = `sam:${name.toLowerCase()}`

  const result = {
    name,
    file: profile.filePath,
    status: "skipped",
    contracts: null,
  }

  // Check cache
  const cached = dataCache.get(cacheKey)
  if (cached) {
    console.log(`  → ${name} (cached)`)
    return { ...result, status: "cached", contracts: cached }
  }

  console.log(`  → ${name}`)

  if (!SAM_KEY) {
    console.log("    ✗ No SAM API key configured")
    result.status = "no-key"
    return result
  }

  // Search for contracts
  try {
    const contractData = await searchContracts(name)
    const summary = summarizeContracts(contractData)

    if (!summary) {
      console.log(`    ✗ No federal contracts found`)
      result.status = "not-found"
      return result
    }

    result.contracts = summary
    result.status = "success"

    console.log(`    Contracts:    ${summary.totalContracts} total (${summary.sampleSize} sampled)`)
    console.log(`    Sample $:     ${fmtMoney(summary.totalDollarsInSample)}`)
    console.log(`    Agencies:     ${summary.agencies.slice(0, 3).join(", ")}${summary.agencies.length > 3 ? ` +${summary.agencies.length - 3} more` : ""}`)
    console.log(`    Year Range:   ${summary.yearRange}`)

    if (summary.topContracts.length > 0) {
      console.log(`    Top contract: ${fmtMoney(summary.topContracts[0].amount)} — ${summary.topContracts[0].agency}`)
    }

    dataCache.set(cacheKey, summary, CACHE_TTL)
  } catch (err) {
    console.log(`    ✗ Error: ${err.message}`)
    result.status = "error"
  }

  return result
}

// ── Frontmatter Update ──────────────────────────────────

function updateFrontmatter(filePath, updates) {
  let content = fs.readFileSync(filePath, "utf-8")
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return

  let fm = fmMatch[1]

  for (const [key, val] of Object.entries(updates)) {
    if (val === null || val === undefined) continue
    const regex = new RegExp(`^${key}:.*$`, "m")
    const line = typeof val === "number" ? `${key}: ${val}` : `${key}: "${val}"`
    if (regex.test(fm)) {
      fm = fm.replace(regex, line)
    } else {
      fm += `\n${line}`
    }
  }

  // Update last-updated
  const todayStr = today()
  if (/^last-updated:/.test(fm)) {
    fm = fm.replace(/^last-updated:.*$/m, `last-updated: ${todayStr}`)
  } else {
    fm += `\nlast-updated: ${todayStr}`
  }

  content = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, `---\n${fm}\n---`)
  fs.writeFileSync(filePath, content, "utf-8")
}

// ── Markdown Section Generator ──────────────────────────

function generateContractSection(name, summary) {
  const lines = []
  lines.push(`### Federal Contracts`)
  lines.push(`<!-- auto:sam-contracts start -->`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Contracts Found | ${summary.totalContracts.toLocaleString()} |`)
  lines.push(`| Sample Value (top ${summary.sampleSize}) | ${fmtMoney(summary.totalDollarsInSample)} |`)
  lines.push(`| Year Range | ${summary.yearRange} |`)
  lines.push(`| Federal Agencies | ${summary.agencies.length} |`)
  lines.push(``)

  if (summary.agencies.length > 0) {
    lines.push(`**Contracting agencies:** ${summary.agencies.join(", ")}`)
    lines.push(``)
  }

  if (summary.topContracts.length > 0) {
    lines.push(`**Recent contracts:**`)
    lines.push(``)
    lines.push(`| Amount | Agency | Date |`)
    lines.push(`|--------|--------|------|`)
    for (const c of summary.topContracts) {
      const date = c.date !== "Unknown" ? c.date.slice(0, 10) : "—"
      lines.push(`| ${fmtMoney(c.amount)} | ${c.agency} | ${date} |`)
    }
    lines.push(``)
  }

  lines.push(`- [Source: SAM.gov Contract Awards](https://sam.gov/search/?q=${encodeURIComponent(name)}&page=1&index=opp) (Tier 1)`)
  lines.push(``)
  lines.push(`<!-- auto:sam-contracts end -->`)
  return lines.join("\n")
}

function insertOrUpdateSection(filePath, sectionContent) {
  let content = fs.readFileSync(filePath, "utf-8")

  const autoStart = content.indexOf("<!-- auto:sam-contracts start -->")
  const autoEnd = content.indexOf("<!-- auto:sam-contracts end -->")

  if (autoStart !== -1 && autoEnd !== -1) {
    const beforeAuto = content.lastIndexOf("\n###", autoStart)
    const start = beforeAuto !== -1 ? beforeAuto + 1 : autoStart
    const end = autoEnd + "<!-- auto:sam-contracts end -->".length
    content = content.slice(0, start) + sectionContent + content.slice(end)
  } else {
    // Insert before Sources section if exists
    const sourcesIdx = content.indexOf("\n### Sources")
    if (sourcesIdx !== -1) {
      content = content.slice(0, sourcesIdx) + "\n" + sectionContent + "\n" + content.slice(sourcesIdx)
    } else {
      const propublicaEnd = content.indexOf("<!-- auto:propublica-990 end -->")
      if (propublicaEnd !== -1) {
        const insertAt = propublicaEnd + "<!-- auto:propublica-990 end -->".length
        content = content.slice(0, insertAt) + "\n\n" + sectionContent + content.slice(insertAt)
      } else {
        content += "\n\n" + sectionContent + "\n"
      }
    }
  }

  fs.writeFileSync(filePath, content, "utf-8")
}

// ── Main ────────────────────────────────────────────────

async function main() {
  console.log("\n═══════════════════════════════════════════════════")
  console.log("  THE DONOR MAP — SAM.gov Federal Contracts Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update vault)" : "DRY RUN (preview only)"}`)
  console.log(`  API Key: ${SAM_KEY ? "Configured" : "MISSING — set SAM_API_KEY in .env"}`)
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  if (LIMIT) console.log(`  Limit: ${LIMIT} profiles per run`)
  console.log()

  if (!SAM_KEY) {
    console.log("  ✗ No SAM_API_KEY found. Add it to .env or GitHub Secrets.")
    console.log("  Get a free key at: https://api.data.gov/signup/")
    process.exit(1)
  }

  const dataCache = new FileCache("sam-contracts")

  // Load profiles — target corporations and donors
  console.log("  Loading vault profiles...")
  const { donors } = loadProfiles({
    types: ["corporation", "donor"],
  })

  let targets = donors
  if (PROFILE_FILTER) {
    const filter = PROFILE_FILTER.toLowerCase()
    targets = donors.filter((d) =>
      extractName(d.title).toLowerCase().includes(filter)
    )
  }
  if (LIMIT) {
    targets = targets.slice(0, LIMIT)
  }

  console.log(`  Organizations to scan: ${targets.length}`)
  console.log()

  const results = []
  let successCount = 0
  let errorCount = 0

  for (const profile of targets) {
    try {
      const result = await processOrg(profile, dataCache)
      results.push(result)

      if (result.status === "success" && result.contracts) {
        successCount++

        if (WRITE) {
          const updates = {
            "federal-contracts": result.contracts.totalContracts,
          }
          updateFrontmatter(profile.filePath, updates)

          const section = generateContractSection(result.name, result.contracts)
          insertOrUpdateSection(profile.filePath, section)

          console.log(`    ✓ Written to vault`)
        }
      } else if (result.status !== "cached") {
        errorCount++
      }
    } catch (err) {
      console.log(`    ✗ Error: ${err.message}`)
      errorCount++
    }

    console.log()
  }

  // Summary
  console.log("═══════════════════════════════════════════════════")
  console.log("  RESULTS")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Scanned:    ${results.length}`)
  console.log(`  Found:      ${successCount}`)
  console.log(`  Not found:  ${results.filter((r) => r.status === "not-found").length}`)
  console.log(`  Cached:     ${results.filter((r) => r.status === "cached").length}`)
  console.log(`  Errors:     ${errorCount}`)
  console.log(`  API calls:  ${limiter.requestCount}`)
  console.log()

  if (successCount > 0 && !WRITE) {
    console.log("  Run with --write to update the vault.")
  }

  // Save cache
  dataCache.save()
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
