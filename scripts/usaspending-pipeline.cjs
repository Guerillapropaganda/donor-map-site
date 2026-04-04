#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// THE DONOR MAP — USASpending.gov Pipeline
// Pulls federal award data (contracts, grants, loans) by recipient.
// Broader than SAM.gov — covers grants and financial assistance too.
//
// Usage:
//   node scripts/usaspending-pipeline.cjs                    # dry run
//   node scripts/usaspending-pipeline.cjs --write --verbose
//   node scripts/usaspending-pipeline.cjs --profile="Raytheon"
//   node scripts/usaspending-pipeline.cjs --write --limit=20
// ═══════════════════════════════════════════════════════════════

const fs = require("fs")
const path = require("path")
const https = require("https")

const {
  parseArgs, loadProfiles, extractName, RateLimiter, FileCache, today,
} = require("./lib/shared.cjs")

// ── Config ──
const args = parseArgs()
const WRITE = args.write
const VERBOSE = args.verbose
const PROFILE_FILTER = args.profile || null
const LIMIT = args.limit ? parseInt(args.limit) : null
const CACHE_TTL = parseInt(args["cache-ttl"]) || 168

const BASE_URL = "https://api.usaspending.gov/api/v2"
const limiter = new RateLimiter(60) // No documented limit, be polite

// ── HTTP ──

function postJson(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`)
    const payload = JSON.stringify(body)
    if (VERBOSE) console.log(`    POST ${url.pathname}`)

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "DonorMap/1.0",
        "Content-Length": Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = ""
      res.on("data", (c) => (data += c))
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`))
        }
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
    })
    req.on("error", reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")) })
    req.write(payload)
    req.end()
  })
}

// ── USASpending Functions ──

async function searchRecipient(name) {
  await limiter.wait()
  return postJson("/recipient/", {
    keyword: name,
    order: "desc",
    sort: "amount",
    limit: 10,
    page: 1,
  })
}

async function getContractAwards(name) {
  await limiter.wait()
  const currentYear = new Date().getFullYear()
  return postJson("/search/spending_by_award/", {
    filters: {
      recipient_search_text: [name],
      award_type_codes: ["A", "B", "C", "D"],
      time_period: [{ start_date: `${currentYear - 3}-01-01`, end_date: `${currentYear}-12-31` }],
    },
    fields: ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
      "Awarding Sub Agency", "Start Date", "End Date", "Description"],
    limit: 25,
    page: 1,
    sort: "Award Amount",
    order: "desc",
  })
}

async function getGrantAwards(name) {
  await limiter.wait()
  const currentYear = new Date().getFullYear()
  return postJson("/search/spending_by_award/", {
    filters: {
      recipient_search_text: [name],
      award_type_codes: ["02", "03", "04", "05"],
      time_period: [{ start_date: `${currentYear - 3}-01-01`, end_date: `${currentYear}-12-31` }],
    },
    fields: ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency",
      "Awarding Sub Agency", "Start Date", "End Date", "Description"],
    limit: 25,
    page: 1,
    sort: "Award Amount",
    order: "desc",
  })
}

function summarizeAwards(recipientData, contractData, grantData) {
  const summary = {
    totalAmount: 0,
    contractCount: 0,
    contractAmount: 0,
    grantCount: 0,
    grantAmount: 0,
    agencies: new Set(),
    topContracts: [],
    topGrants: [],
  }

  // Recipient-level totals
  if (recipientData && recipientData.results && recipientData.results.length > 0) {
    const best = recipientData.results[0]
    summary.totalAmount = parseFloat(best.amount || "0")
    summary.recipientName = best.name
  }

  // Contract details
  if (contractData && contractData.results) {
    summary.contractCount = contractData.page_metadata?.total || contractData.results.length
    for (const c of contractData.results) {
      const amt = parseFloat(c["Award Amount"] || "0")
      summary.contractAmount += amt
      if (c["Awarding Agency"]) summary.agencies.add(c["Awarding Agency"])
      if (summary.topContracts.length < 5) {
        summary.topContracts.push({
          amount: amt,
          agency: c["Awarding Agency"] || "Unknown",
          description: (c["Description"] || "").slice(0, 100),
          date: c["Start Date"] || "",
        })
      }
    }
  }

  // Grant details
  if (grantData && grantData.results) {
    summary.grantCount = grantData.page_metadata?.total || grantData.results.length
    for (const g of grantData.results) {
      const amt = parseFloat(g["Award Amount"] || "0")
      summary.grantAmount += amt
      if (g["Awarding Agency"]) summary.agencies.add(g["Awarding Agency"])
      if (summary.topGrants.length < 5) {
        summary.topGrants.push({
          amount: amt,
          agency: g["Awarding Agency"] || "Unknown",
          description: (g["Description"] || "").slice(0, 100),
          date: g["Start Date"] || "",
        })
      }
    }
  }

  summary.agencies = [...summary.agencies].sort()

  if (summary.contractCount === 0 && summary.grantCount === 0 && summary.totalAmount === 0) return null
  return summary
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
  const cacheKey = `usa:${name.toLowerCase()}`

  const result = { name, file: profile.filePath, status: "skipped", spending: null }

  const cached = dataCache.get(cacheKey)
  if (cached) {
    console.log(`  → ${name} (cached)`)
    return { ...result, status: "cached", spending: cached }
  }

  console.log(`  → ${name}`)

  try {
    const [recipientData, contractData, grantData] = await Promise.all([
      searchRecipient(name),
      getContractAwards(name),
      getGrantAwards(name),
    ])

    const summary = summarizeAwards(recipientData, contractData, grantData)
    if (!summary) {
      console.log(`    ✗ No federal spending found`)
      result.status = "not-found"
      return result
    }

    result.spending = summary
    result.status = "success"

    console.log(`    Total:        ${fmtMoney(summary.totalAmount)}`)
    console.log(`    Contracts:    ${summary.contractCount} (${fmtMoney(summary.contractAmount)} sampled)`)
    console.log(`    Grants:       ${summary.grantCount} (${fmtMoney(summary.grantAmount)} sampled)`)
    console.log(`    Agencies:     ${summary.agencies.slice(0, 3).join(", ")}`)

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

function generateSpendingSection(name, summary) {
  const lines = []
  lines.push(`### Federal Spending (USASpending)`)
  lines.push(`<!-- auto:usaspending start -->`)
  lines.push(``)
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  if (summary.totalAmount > 0) lines.push(`| All-Time Federal Awards | ${fmtMoney(summary.totalAmount)} |`)
  lines.push(`| Contracts (recent 3yr) | ${summary.contractCount.toLocaleString()} (${fmtMoney(summary.contractAmount)} sampled) |`)
  lines.push(`| Grants (recent 3yr) | ${summary.grantCount.toLocaleString()} (${fmtMoney(summary.grantAmount)} sampled) |`)
  lines.push(`| Federal Agencies | ${summary.agencies.length} |`)
  lines.push(``)

  if (summary.topContracts.length > 0) {
    lines.push(`**Top contracts:**`)
    lines.push(``)
    lines.push(`| Amount | Agency | Description |`)
    lines.push(`|--------|--------|-------------|`)
    for (const c of summary.topContracts) {
      lines.push(`| ${fmtMoney(c.amount)} | ${c.agency} | ${c.description || "—"} |`)
    }
    lines.push(``)
  }

  if (summary.topGrants.length > 0) {
    lines.push(`**Top grants:**`)
    lines.push(``)
    lines.push(`| Amount | Agency | Description |`)
    lines.push(`|--------|--------|-------------|`)
    for (const g of summary.topGrants) {
      lines.push(`| ${fmtMoney(g.amount)} | ${g.agency} | ${g.description || "—"} |`)
    }
    lines.push(``)
  }

  lines.push(`- [Source: USASpending.gov](https://www.usaspending.gov/search/?hash=recipient-${encodeURIComponent(name)}) (Tier 1)`)
  lines.push(``)
  lines.push(`<!-- auto:usaspending end -->`)
  return lines.join("\n")
}

function insertOrUpdateSection(filePath, sectionContent) {
  let content = fs.readFileSync(filePath, "utf-8")
  const autoStart = content.indexOf("<!-- auto:usaspending start -->")
  const autoEnd = content.indexOf("<!-- auto:usaspending end -->")

  if (autoStart !== -1 && autoEnd !== -1) {
    const beforeAuto = content.lastIndexOf("\n###", autoStart)
    const start = beforeAuto !== -1 ? beforeAuto + 1 : autoStart
    const end = autoEnd + "<!-- auto:usaspending end -->".length
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
  console.log("  THE DONOR MAP — USASpending.gov Pipeline")
  console.log("═══════════════════════════════════════════════════")
  console.log(`  Mode: ${WRITE ? "WRITE (will update vault)" : "DRY RUN (preview only)"}`)
  console.log(`  API: USASpending.gov (no key needed)`)
  if (PROFILE_FILTER) console.log(`  Filter: "${PROFILE_FILTER}"`)
  if (LIMIT) console.log(`  Limit: ${LIMIT}`)
  console.log()

  const dataCache = new FileCache("usaspending")

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

  for (const profile of targets) {
    const result = await processOrg(profile, dataCache)
    results.push(result)

    if (result.status === "success" && result.spending && WRITE) {
      const s = result.spending
      updateFrontmatter(profile.filePath, {
        "federal-awards-total": Math.round(s.totalAmount),
        "federal-contracts-count": s.contractCount,
        "federal-grants-count": s.grantCount,
      })
      const section = generateSpendingSection(result.name, s)
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

  if (!WRITE) console.log("  Run with --write to update the vault.")
  dataCache.save()
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1) })
